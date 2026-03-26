private fun resolveMdocNamespaceElement(document: JsonObject, path: String): JsonElement? {
    val regex = Regex(
        """^\$\['issuerSigned']\['nameSpaces']\['([^']+)']\[\?\(@\.elementIdentifier == '([^']+)'\)]\.elementValue$"""
    )

    val match = regex.matchEntire(path) ?: return null

    val namespace = match.groupValues[1]
    val elementIdentifier = match.groupValues[2]

    val items = document["issuerSigned"]
        ?.jsonObject
        ?.get("nameSpaces")
        ?.jsonObject
        ?.get(namespace)
        ?.jsonArray
        ?: return null

    val matchedItem = items.firstOrNull { item ->
        val obj = item.jsonObject
        obj["elementIdentifier"]?.jsonPrimitive?.contentOrNull == elementIdentifier
    } ?: return null

    return matchedItem.jsonObject["elementValue"]
}

fun filterConstraint(document: JsonObject, field: Field): Boolean {
    log.trace { "Processing constraint field: ${field.name ?: field.id ?: field}" }

    val resolvedPath = field.path.firstNotNullOfOrNull { path ->
        resolveMdocNamespaceElement(document, path)
            ?: document.resolveOrNull(getJsonPath(path))
    }

    log.trace { "Result of resolving ${field.path}: $resolvedPath" }

    return if (resolvedPath == null) {
        log.trace { "Unresolved field, failing constraint (Path ${field.path} not found in document $document)." }
        false
    } else {
        log.trace { "Processing field filter: ${field.filter}" }
        if (field.filter != null) {
            val schema = JsonSchema.fromJsonElement(field.filter)
            when {
                field.filter["type"]?.jsonPrimitive?.contentOrNull?.lowercase() == "string" && resolvedPath is JsonArray ->
                    resolvedPath.any { schema.validate(it, OutputCollector.flag()).valid }

                else -> schema.validate(resolvedPath, OutputCollector.flag()).valid
            }
        } else true
    }
}
