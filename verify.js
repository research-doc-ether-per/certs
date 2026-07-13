@JvmBlocking
@JvmAsync
@JsPromise
@JsExport.Ignore
suspend fun PolicyRequest.runPolicyRequest(dataToVerify: JsonElement, context: Map<String, Any>): Result<Any> {
    println("--- [runPolicyRequest] Starting policy: ${policy::class.simpleName} ---")
    println("--- [runPolicyRequest] policy.args: $args")
    
    val result = when (policy) {
        is JwtVerificationPolicy -> {
            check(dataToVerify is JsonPrimitive) { "Tried to apply JwtVerificationPolicy to non-jwt data: $policy" }
            policy.verify(dataToVerify.content, args, context)
        }
        is CredentialDataValidatorPolicy -> {
            check(dataToVerify is JsonObject) { "Tried to apply CredentialDataValidatorPolicy to non-credential data: $policy" }
            val credentialData = when {
                dataToVerify["vc"] != null -> dataToVerify["vc"]!!.jsonObject
                else -> dataToVerify
            }
            policy.verify(credentialData, args, context)
        }
        is CredentialWrapperValidatorPolicy -> {
            check(dataToVerify is JsonObject) { "Tried to apply CredentialWrapperValidatorPolicy to non-credential data: $policy" }
            policy.verify(dataToVerify, args, context)
        }
        else -> throw IllegalArgumentException("Unsupported policy type: ${policy::class.simpleName}")
    }

    println("--- [runPolicyRequest] Finished policy: ${policy::class.simpleName} | Result: ${if (result.isSuccess) "SUCCESS" else "FAILURE (" + result.exceptionOrNull()?.message + ")"}")
    return result
}


@JvmBlocking
@JvmAsync
@JsPromise
@JsExport.Ignore
suspend fun verifyW3CPresentation(
    format: VCFormat,
    vpToken: String,
    vpPolicies: List<PolicyRequest>,
    globalVcPolicies: List<PolicyRequest>,
    specificCredentialPolicies: Map<String, List<PolicyRequest>>,
    presentationContext: Map<String, Any> = emptyMap(),
): PresentationVerificationResponse {
    val providedJws = vpToken.decodeJws() // usually VP
    val payload = providedJws.payload
    
    println("=== [verifyW3CPresentation] Incoming VP Token Payload ===")
    println(payload)

    val vpType = when (payload.contains("vp")) {
        true -> payload.getW3CType()
        else -> "" // else is IdToken
    }

    val verifiableCredentialJwts = when (payload.contains("vp")) {
        true -> (payload["vp"]?.jsonObject?.get("verifiableCredential") ?: payload["verifiableCredential"] ?: TODO("Provided data does not have `verifiableCredential` array.")).jsonArray.map { it.jsonPrimitive.content }
        else -> emptyList()
    }
    
    println("=== [verifyW3CPresentation] Extracted ${verifiableCredentialJwts.size} VCs from presentation ===")

    val results = ArrayList<PresentationResultEntry>()
    val resultMutex = Mutex()
    var policiesRun = 0
    val time = measureTime {
        coroutineScope {
            fun addResultEntryFor(type: String): Int {
                results.add(PresentationResultEntry(type))
                return results.size - 1
            }

            suspend fun runPolicyRequests(idx: Int, jwt: String, policies: List<PolicyRequest>) = runPolicyRequests(
                jwt = jwt,
                policyRequests = policies,
                context = presentationContext,
                onSuccess = { policyResult ->
                    resultMutex.withLock {
                        policiesRun++
                        results[idx].policyResults.add(policyResult)
                        println("      >> Policy [${policyResult.request.policy::class.simpleName}] PASSED for type: ${results[idx].type}")
                    }
                },
                onError = { policyResult, exception ->
                    resultMutex.withLock {
                        policiesRun++
                        results[idx].policyResults.add(policyResult)
                        println("      !! Policy [${policyResult.request.policy::class.simpleName}] FAILED for type: ${results[idx].type}")
                        println("      !! Exception details: ${exception.stackTraceToString()}")
                    }
                }
            )

            /* VP Policies */
            when (payload.contains("vp")) {
                true -> {
                    val vpIdx = addResultEntryFor(vpType)
                    println("=== [verifyW3CPresentation] Running VP-level policies (Count: ${vpPolicies.size}) ===")
                    runPolicyRequests(idx = vpIdx, jwt = vpToken, policies = vpPolicies)
                }
                else -> {
                    val vpIdx = 0
                    results.add(PresentationResultEntry(vpToken))
                    runPolicyRequests(idx = vpIdx, jwt = vpToken, policies = vpPolicies)
                }
            }

            /* VCs Policies */
            verifiableCredentialJwts.forEach { credentialJwt ->
                val credentialType = credentialJwt.substringBefore("~").decodeJws().payload.getAnyType()
                val vcIdx = addResultEntryFor(credentialType)
                
                println("=== [verifyW3CPresentation] Running VC-level policies for type: $credentialType ===")
                
                /* Global VC Policies */
                runPolicyRequests(idx = vcIdx, jwt = credentialJwt, policies = globalVcPolicies)

                /* Specific Credential Policies */
                specificCredentialPolicies[credentialType]?.let { specificPolicyRequests ->
                    runPolicyRequests(idx = vcIdx, jwt = credentialJwt, policies = specificPolicyRequests)
                }
            }
        }
    }
    
    println("=== [verifyW3CPresentation] Verification finished in ${time}. Total policies run: $policiesRun ===")
    return PresentationVerificationResponse(results = results, time = time, policiesRun = policiesRun)
}
