import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

private fun resolveMdocNamespaceElement(document: JsonObject, path: String): JsonElement? {
    val regex = Regex(
        """^\$\['issuerSigned']\['nameSpaces']\['([^']+)']\[\?\(@\.elementIdentifier == '([^']+)'\)]\.elementValue$"""
    )

    val match = regex.matchEntire(path) ?: return null

    val namespace = match.groupValues[1]
    val elementIdentifier = match.groupValues[2]

    val issuerSignedElement = document["issuerSigned"] ?: return null
    val issuerSignedObject = issuerSignedElement.jsonObject

    val nameSpacesElement = issuerSignedObject["nameSpaces"] ?: return null
    val nameSpacesObject = nameSpacesElement.jsonObject

    val namespaceElement = nameSpacesObject[namespace] ?: return null
    val items: JsonArray = namespaceElement.jsonArray

    val matchedItem = items.firstOrNull { item: JsonElement ->
        val obj = item.jsonObject
        obj["elementIdentifier"]?.jsonPrimitive?.contentOrNull == elementIdentifier
    } ?: return null

    return matchedItem.jsonObject["elementValue"]
}

val resolvedPath = field.path.firstNotNullOfOrNull { path: String ->
    resolveMdocNamespaceElement(document, path)
        ?: document.resolveOrNull(getJsonPath(path))
}
