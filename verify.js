@JvmBlocking
@JvmAsync
@JsPromise
@JsExport.Ignore
override suspend fun verify(data: JsonObject, args: Any?, context: Map<String, Any>): Result<Any> {
    // 1. Print all incoming raw parameters
    println("==== HolderBindingPolicy Verification Started ====")
    println("Parameter [data]: $data")
    println("Parameter [args]: $args")
    println("Parameter [context]: $context")

    // 2. Extract and print the VP signer (Presenter DID)
    val presenterDid = data[JwsOption.ISSUER]!!.jsonPrimitive.content
    println("Parsed [presenterDid] (VP Signer): $presenterDid")

    // 3. Extract and print the internal VP structure
    val vp = data["vp"]?.jsonObject ?: throw IllegalArgumentException("No \"vp\" field in VP!")
    println("Parsed [vp] object: $vp")

    // 4. Extract and print the contained credentials array
    val credentials =
        vp["verifiableCredential"]?.jsonArray ?: throw IllegalArgumentException("No \"verifiableCredential\" field in \"vp\"!")
    println("Contained [verifiableCredential] array (RAW): $credentials")

    // 5. Iterate and print each internal VC's subject DID
    val credentialSubjects = credentials.map {
        val rawJwt = it.jsonPrimitive.content
        val subjectDid = rawJwt.decodeJws().payload["sub"]!!.jsonPrimitive.content.split("#").first()
        println("  - Extracted VC [subjectDid]: $subjectDid")
        subjectDid
    }
    println("All extracted [credentialSubjects]: $credentialSubjects")

    // 6. Print the evaluation result
    val isMatch = credentialSubjects.all { it == presenterDid }
    println("Comparison result (Does presenterDid match all credentialSubjects?): $isMatch")
    println("==================================================")

    return when {
        isMatch -> Result.success(presenterDid)
        else -> Result.failure(
          id.walt.policies.HolderBindingException(
            presenterDid = presenterDid,
            credentialDids = credentialSubjects
          )
        )
    }
}
