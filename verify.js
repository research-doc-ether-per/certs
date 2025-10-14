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
    coroutineScope {
        policyRequests.forEach { policyRequest ->
            launch {
                val policy = policyRequest.policy
                val policyName = policy::class.qualifiedName ?: policy::class.simpleName ?: "UnknownPolicy"
                val isRevokedLike =
                    policy::class.simpleName?.contains("Revoked", ignoreCase = true) == true ||
                    policy.toString().contains("revoked-status-list", ignoreCase = true)
                
                println("[Policy/START] $policyName  raw=$policy  (revoked-like=$isRevokedLike)")

                runCatching {
                    val dataForPolicy: JsonElement = when (policy) {
                        is JwtVerificationPolicy -> {
                            
                            println("[Policy/Input] $policyName <- JsonPrimitive(jwt)  (JWT verification branch)")
                            JsonPrimitive(jwt)
                        }

                        is CredentialDataValidatorPolicy, is CredentialWrapperValidatorPolicy -> {

                            val full = SDJwt.parse(jwt).fullPayload.also {
                                val keys = it.jsonObject.keys.joinToString()
                                println("[Policy/Input] $policyName <- SDJwt.fullPayload  keys=[$keys]")
    
                                println("[Policy/Input] $policyName  has(status)=${"status" in it.jsonObject}  has(credentialStatus)=${"credentialStatus" in it.jsonObject}")
                            }
                            full
                        }

                        else -> {

                            println("[Policy/UNSUPPORTED] $policyName  -> throwing IllegalArgumentException")
                            throw IllegalArgumentException("Unsupported policy type: ${policy::class.simpleName}")
                        }
                    }

                    val runResult = policyRequest.runPolicyRequest(dataForPolicy, context)
                    val policyResult = PolicyResult(policyRequest, runResult)

                    println("[Policy/DONE]  $policyName  result.isSuccess=${runResult.isSuccess}")
                    onSuccess(policyResult)
                }.onFailure { t ->
                    println("[Policy/ERROR] $policyName  ${t::class.simpleName}: ${t.message}")
                    onError(PolicyResult(policyRequest, Result.failure(t)), t)
                }
            }
        }
    }
}

