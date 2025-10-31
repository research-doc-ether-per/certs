import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject

private suspend fun processListW3C(
    data: JsonElement,
    attribute: W3CStatusPolicyListArguments
): Result<Unit> = runCatching {

    val array = (data as? JsonArray)
        ?: throw IllegalArgumentException("credentialStatus must be a JSON array, got ${data::class.simpleName}")

  
    array.forEachIndexed { idx, el ->
        require(el is JsonObject) {
            "credentialStatus[$idx] must be a JSON object, got ${el::class.simpleName}"
        }
    }


    val statusEntries = array.map { el -> w3cListEntryContentParser.parse(el as JsonObject) }

    require(statusEntries.size >= attribute.list.size) {
        "Arguments list size mismatch: ${statusEntries.size} expecting ${attribute.list.size}"
    }

    val sortedEntries = statusEntries.sortedBy { it.purpose }
    val sortedAttributes = attribute.list.sortedBy { it.purpose }
    val validationResults = sortedEntries.zip(sortedAttributes) { entry, attr ->
        w3cStatusValidator.validate(entry, attr)
    }

    if (validationResults.isEmpty()) throw IllegalArgumentException(emptyResultMessage(attribute))
    if (validationResults.any { it.isFailure }) throw IllegalArgumentException(failResultMessage(validationResults))
}

