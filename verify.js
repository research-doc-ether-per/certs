@JvmBlocking
    @JvmAsync
    @JsPromise
    @JsExport.Ignore
    suspend fun runPolicyRequests(
        jwt: String,
        policyRequests: List<PolicyRequest>,
        context: Map<String, Any> = emptyMap(),
        onSuccess: suspend (PolicyResult) -> Unit,
        onError: suspend (PolicyResult, Throwable) -> Unit,
    ) {
        println("--> [runPolicyRequests] Triggered with ${policyRequests.size} policies.")
        coroutineScope {
            policyRequests.forEach { policyRequest ->
                launch {
                    runCatching {
                        val policyName = policyRequest.policy::class.simpleName
                        println("  --> [runPolicyRequests] Launching policy: $policyName")
                        
                        val dataForPolicy: JsonElement = when (policyRequest.policy) {
                            is JwtVerificationPolicy -> JsonPrimitive(jwt)

                            is CredentialDataValidatorPolicy, is CredentialWrapperValidatorPolicy -> SDJwt.parse(jwt).fullPayload

                            else -> throw IllegalArgumentException("Unsupported policy type: $policyName")
                        }
                        
                        val runResult = policyRequest.runPolicyRequest(dataForPolicy, context)
                        println("  <-- [runPolicyRequests] Policy $policyName executed. Result success: ${runResult.isSuccess}")
                        
                        val policyResult = PolicyResult(policyRequest, runResult)
                        onSuccess(policyResult)
                    }.onFailure { exception ->
                        val policyName = policyRequest.policy::class.simpleName
                        println("  !!! [runPolicyRequests] Policy $policyName threw an exception: ${exception.message}")
                        onError(PolicyResult(policyRequest, Result.failure(exception)), exception)
                    }
                }
            }
        }
    }

    @JvmBlocking
    @JvmAsync
    @JsPromise
    @JsExport.Ignore
    suspend fun verifyPresentation(
        format: VCFormat,
        vpToken: String,
        vpPolicies: List<PolicyRequest>,
        globalVcPolicies: List<PolicyRequest>,
        specificCredentialPolicies: Map<String, List<PolicyRequest>>,
        presentationContext: Map<String, Any> = emptyMap(),
    ): PresentationVerificationResponse {
        val isW3CVp = runCatching { vpToken.decodeJws().payload.contains("vp") }.getOrElse { false }
        log.trace { "Verifying presentation with format $format (is w3cvp=$isW3CVp): $vpToken" }
        
        println("=== [verifyPresentation] Routing presentation verification (format=$format, isW3CVp=$isW3CVp) ===")

        return when {
            isW3CVp -> verifyW3CPresentation(
                format = format,
                vpToken = vpToken,
                vpPolicies = vpPolicies,
                globalVcPolicies = globalVcPolicies,
                specificCredentialPolicies = specificCredentialPolicies,
                presentationContext = presentationContext
            )

            format == VCFormat.mso_mdoc -> TODO("mdoc presentations are not yet supported")
            format == VCFormat.sd_jwt_vc -> verifySDJwtVCPresentation(
                vpToken = vpToken,
                vpPolicies = vpPolicies,
                globalVcPolicies = globalVcPolicies,
                specificCredentialPolicies = specificCredentialPolicies,
                presentationContext = presentationContext
            )

            else -> verifyW3CPresentation(
                format = format,
                vpToken = vpToken,
                vpPolicies = vpPolicies,
                globalVcPolicies = globalVcPolicies,
                specificCredentialPolicies = specificCredentialPolicies,
                presentationContext = presentationContext
            )
        }
    }

    /**
     * "W3C" in this case refers to the Verifiable *Presentation* (which in itself is a special
     * kind of credential). The VP can contain SD-JWT VC etc., but itself it is still W3C.
     */
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
        println("=== [verifyW3CPresentation] Processing W3C Presentation ===")
        val providedJws = vpToken.decodeJws() // usually VP
        val payload = providedJws.payload
        
        println("  -> VP Payload claims: ${payload.keys}")
        
        val vpType = when (payload.contains("vp")) {
            true -> payload.getW3CType()
            else -> "" // else is IdToken
        }
        println("  -> Extracted VP Type: $vpType")

        val verifiableCredentialJwts = when (payload.contains("vp")) {
            true -> (payload["vp"]?.jsonObject?.get("verifiableCredential") ?: payload["verifiableCredential"]
            ?: TODO("Provided data does not have `verifiableCredential` array.")).jsonArray.map { it.jsonPrimitive.content }

            else -> emptyList()
        }
        println("  -> Found ${verifiableCredentialJwts.size} nested VC(s) inside this presentation.")

        val results = ArrayList<PresentationResultEntry>()

        val resultMutex = Mutex()
        var policiesRun = 0

        val time = measureTime {
            coroutineScope {
                fun addResultEntryFor(type: String): Int {
                    results.add(PresentationResultEntry(type))
                    return results.size - 1
                }

                suspend fun runPolicyRequests(idx: Int, jwt: String, policies: List<PolicyRequest>) =
                    runPolicyRequests(
                        jwt = jwt,
                        policyRequests = policies,
                        context = presentationContext,
                        onSuccess = { policyResult ->
                            resultMutex.withLock {
                                policiesRun++
                                results[idx].policyResults.add(policyResult)
                                println("    [Policy Success] Type: ${results[idx].type} | Policy: ${policyResult.request.policy::class.simpleName}")
                            }
                        },
                        onError = { policyResult, exception ->
                            resultMutex.withLock {
                                policiesRun++
                                results[idx].policyResults.add(policyResult)
                                println("    [Policy Failure caught in list] Type: ${results[idx].type} | Policy: ${policyResult.request.policy::class.simpleName} | Error: ${exception.message}")
                            }
                        }
                    )

                /* VP Policies */
                when (payload.contains("vp")) {
                    true -> {
                        val vpIdx = addResultEntryFor(vpType)
                        println("  -> Running ${vpPolicies.size} VP-level policies for nested structure...")
                        runPolicyRequests(
                            idx = vpIdx,
                            jwt = vpToken,
                            policies = vpPolicies
                        )
                    }

                    else -> {
                        val vpIdx = 0
                        results.add(PresentationResultEntry(vpToken))
                        println("  -> Running ${vpPolicies.size} VP-level policies for flattened structure...")
                        runPolicyRequests(
                            idx = vpIdx,
                            jwt = vpToken,
                            policies = vpPolicies
                        )
                    }
                }

                // VCs
                verifiableCredentialJwts.forEach { credentialJwt ->
                    val credentialType = credentialJwt.substringBefore("~").decodeJws().payload.getAnyType()
                    val vcIdx = addResultEntryFor(credentialType)
                    
                    println("  -> Running VC-level policies for embedded VC type: $credentialType")

                    /* Global VC Policies */
                    runPolicyRequests(
                        idx = vcIdx,
                        jwt = credentialJwt,
                        policies = globalVcPolicies
                    )

                    /* Specific Credential Policies */
                    specificCredentialPolicies[credentialType]?.let { specificPolicyRequests ->
                        println("  -> Running specific credential policies for type: $credentialType")
                        runPolicyRequests(
                            idx = vcIdx,
                            jwt = credentialJwt,
                            policies = specificPolicyRequests
                        )
                    }
                }
            }
        }

        println("=== [verifyW3CPresentation] Finished. Total policies run: $policiesRun, Execution time: $time ===")
        return PresentationVerificationResponse(
            results = results,
            time = time,
            policiesRun = policiesRun
        )
    }

    @JvmBlocking
    @JvmAsync
    @JsPromise
    @JsExport.Ignore
    suspend fun verifySDJwtVCPresentation(
        vpToken: String,
        vpPolicies: List<PolicyRequest>,
        globalVcPolicies: List<PolicyRequest>,
        specificCredentialPolicies: Map<String, List<PolicyRequest>>,
        presentationContext: Map<String, Any> = emptyMap(),
    ): PresentationVerificationResponse {
        println("=== [verifySDJwtVCPresentation] Processing SD-JWT VC Presentation ===")
        log.trace { "Verifying SD-JWT VC Presentation, vp_token: $vpToken" }
        val sdJwtVC = SDJwtVC.parse(vpToken)
        val payload = sdJwtVC.fullPayload
        val vpType = sdJwtVC.type ?: sdJwtVC.vct ?: ""
        log.trace { "SD-JWT VC Presentation vpType: $vpType" }
        println("  -> SD-JWT VC parsed type: $vpType")

        val results = ArrayList<PresentationResultEntry>()

        val resultMutex = Mutex()
        var policiesRun = 0

        val time = measureTime {
            coroutineScope {
                suspend fun runPolicyRequests(idx: Int, jwt: String, policies: List<PolicyRequest>) =
                    runPolicyRequests(
                        jwt = jwt,
                        policyRequests = policies,
                        context = presentationContext,
                        onSuccess = { policyResult ->
                            resultMutex.withLock {
                                policiesRun++
                                results[idx].policyResults.add(policyResult)
                                println("    [SD-JWT Policy Success] Index: $idx | Policy: ${policyResult.request.policy::class.simpleName}")
                            }
                        },
                        onError = { policyResult, exception ->
                            resultMutex.withLock {
                                policiesRun++
                                results[idx].policyResults.add(policyResult)
                                println("    [SD-JWT Policy Failure caught in list] Index: $idx | Policy: ${policyResult.request.policy::class.simpleName} | Error: ${exception.message}")
                            }
                        })

                /* VP Policies */
                results.add(PresentationResultEntry(vpToken))
                println("  -> Running ${vpPolicies.size} VP-level policies for SD-JWT presentation wrapper...")
                runPolicyRequests(
                    idx = 0,
                    jwt = vpToken,
                    policies = vpPolicies
                )

                // VCs
                if (globalVcPolicies.size > 0 || specificCredentialPolicies.containsKey(vpType)) {
                    results.add(PresentationResultEntry(vpType))
                    println("  -> Running VC-level policies for SD-JWT payload...")

                    /* Global VC Policies */
                    runPolicyRequests(
                        idx = 1,
                        jwt = vpToken,
                        policies = globalVcPolicies
                    )

                    /* Specific Credential Policies */
                    specificCredentialPolicies[vpType]?.let { specificPolicyRequests ->
                        println("  -> Running specific credential policies for SD-JWT type: $vpType")
                        runPolicyRequests(
                            idx = 1,
                            jwt = vpToken,
                            policies = specificPolicyRequests
                        )
                    }
                }
            }
        }

        println("=== [verifySDJwtVCPresentation] Finished. Total policies run: $policiesRun, Execution time: $time ===")
        return PresentationVerificationResponse(
            results = results,
            time = time,
            policiesRun = policiesRun
        )
    }
