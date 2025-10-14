suspend fun verifyWithAttributes(
    data: JsonObject,
    attributes: StatusPolicyArgument
): Result<Any> {
    // ---- debug begin ----
    println("[StatusPolicy] verifyWithAttributes(): attrs=${attributes::class.qualifiedName}")
    println("[StatusPolicy] data.keys=${data.keys}")
    // ---- debug end ----

    val extractor = getStatusEntryElementExtractor(attributes)

    // ---- debug ----
    println("[StatusPolicy] chosen extractor=${extractor::class.qualifiedName}")

    val entry = extractor.extract(data)

    // ---- debug ----
    if (entry == null) {
        println("[StatusPolicy] no status entry found -> policy_available=false")
        return Result.success(JsonObject(mapOf("policy_available" to JsonPrimitive(false))))
    } else {
        println("[StatusPolicy] extracted status entry=$entry")
    }

    val res = processStatusEntry(entry, attributes)

    // ---- debug ----
    println("[StatusPolicy] processStatusEntry result.isSuccess=${res.isSuccess}")
    res.exceptionOrNull()?.let { e ->
        println("[StatusPolicy] processStatusEntry error=${e::class.simpleName}: ${e.message}")
    }

    return res
}

private fun getStatusEntryElementExtractor(args: StatusPolicyArgument) =
    when (args) {
        is IETFStatusPolicyAttribute -> {
            // ---- debug ----
            println("[StatusPolicy] getExtractor: IETFStatusPolicyAttribute -> ietfEntryExtractor (args=$args)")
            ietfEntryExtractor
        }
        is W3CStatusPolicyAttribute, is W3CStatusPolicyListArguments -> {
            // ---- debug ----
            println("[StatusPolicy] getExtractor: W3C* -> w3cEntryExtractor (args=$args)")
            w3cEntryExtractor
        }
    }

    
