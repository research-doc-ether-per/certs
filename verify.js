import kotlinx.serialization.json.*
import id.walt.policies.policies.status.model.W3CStatusPolicyListArguments
import id.walt.policies.policies.status.Values.BITSTRING_STATUS_LIST

private suspend fun processListW3C(
    data: JsonElement,
    attribute: W3CStatusPolicyListArguments
): Result<Unit> = runCatching {
    // 1) 兼容对象或数组
    val parsedEntries: List<W3CListEntry> = when (data) {
        is JsonArray  -> data.map { w3cListEntryContentParser.parse(it) }
        is JsonObject -> listOf(w3cListEntryContentParser.parse(data))
        else          -> emptyList()
    }
    require(parsedEntries.isNotEmpty()) { emptyResultMessage(attribute) }

    // 2) 仅保留我们要校验的 Bitstring 条目（并可选按 purpose 预筛）
    val neededPurposes = attribute.list.map { it.purpose }.toSet()
    val candidateEntries = parsedEntries.filter { e ->
        e.type == BITSTRING_STATUS_LIST && (e.purpose in neededPurposes)
    }

    // 3) 检查数量是否足够（按目的聚合更准确）
    val countsByPurpose = candidateEntries.groupBy { it.purpose }.mapValues { it.value.size }
    attribute.list.forEach { a ->
        require((countsByPurpose[a.purpose] ?: 0) >= 1) {
            "No matching status entry for purpose='${a.purpose}' and type='$BITSTRING_STATUS_LIST' (have=$countsByPurpose)"
        }
    }

    // 4) 逐项匹配：对每个 attribute 找到一个相同 purpose+type 的 entry 进行校验
    //    如果一个 purpose 下有多个 entry，可加进一步策略（例如按 URL、id 选取）
    val validationResults: List<Result<Unit>> = attribute.list.map { attr ->
        val entry = candidateEntries.firstOrNull { it.purpose == attr.purpose /* && 其它匹配条件 */ }
            ?: return@map Result.failure(IllegalArgumentException(
                "No entry found for purpose='${attr.purpose}' type='$BITSTRING_STATUS_LIST'"
            ))
        w3cStatusValidator.validate(entry, attr)
    }

    if (validationResults.isEmpty()) {
        throw IllegalArgumentException(emptyResultMessage(attribute))
    }

    val failures = validationResults.withIndex().filter { !it.value.isSuccess }
    if (failures.isNotEmpty()) {
        val detail = failures.joinToString("; ") { (i, r) ->
            "arg#$i failed: ${r.exceptionOrNull()?.message}"
        }
        throw IllegalArgumentException("One or more status validations failed: $detail")
    }
}
