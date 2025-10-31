import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject

// 假设 parser 产出的元素类型为 W3CEntry（含 .purpose）
// 假设 attribute.list 的元素类型为 W3CStatusPolicyArgument（含 .purpose）

private suspend fun processListW3C(
    data: JsonElement,
    attribute: W3CStatusPolicyListArguments
): Result<Unit> = runCatching {
    // 1) 顶层必须是 JsonArray
    val array: JsonArray = data as? JsonArray
        ?: throw IllegalArgumentException("credentialStatus must be a JSON array, got ${data::class.simpleName}")

    // 2) 每个元素必须是 JsonObject
    array.forEachIndexed { idx: Int, el: JsonElement ->
        require(el is JsonObject) {
            "credentialStatus[$idx] must be a JSON object, got ${el::class.simpleName}"
        }
    }

    // 3) 解析并展开（parse 返回 List<W3CEntry>，所以用 flatMap）
    val statusEntries: List<W3CEntry> = array.flatMap { el: JsonElement ->
        @Suppress("UNCHECKED_CAST")
        w3cListEntryContentParser.parse(el as JsonObject) as List<W3CEntry>
    }

    // 4) 数量校验（原逻辑保留）
    require(statusEntries.size >= attribute.list.size) {
        "Arguments list size mismatch: ${statusEntries.size} expecting ${attribute.list.size}"
    }

    // 5) 对齐并校验（给 lambda 显式类型，避免推断失败）
    val sortedEntries: List<W3CEntry> =
        statusEntries.sortedBy { e: W3CEntry -> e.purpose }

    val sortedAttributes: List<W3CStatusPolicyArgument> =
        attribute.list.sortedBy { a: W3CStatusPolicyArgument -> a.purpose }

    val validationResults: List<Result<Unit>> =
        sortedEntries.zip(sortedAttributes).map { pair: Pair<W3CEntry, W3CStatusPolicyArgument> ->
            val (entry, attr) = pair
            w3cStatusValidator.validate(entry, attr)
        }

    if (validationResults.isEmpty()) {
        throw IllegalArgumentException(emptyResultMessage(attribute))
    }
    if (validationResults.any { it.isFailure }) {
        throw IllegalArgumentException(failResultMessage(validationResults))
    }
}
