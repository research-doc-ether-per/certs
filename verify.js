private suspend fun processListW3C(
    data: JsonElement,
    attribute: W3CStatusPolicyListArguments
): Result<Unit> = runCatching {
    // 类型检查：必须是 JsonArray
    val array = data as? JsonArray
        ?: throw IllegalArgumentException("credentialStatus must be a JSON array, got ${data::class.simpleName}")

    // 每个元素都必须是 JsonObject
    array.forEachIndexed { idx: Int, el: JsonElement ->
        require(el is JsonObject) {
            "credentialStatus[$idx] must be a JSON object, got ${el::class.simpleName}"
        }
    }

    // 解析数组中的每个元素
    val statusEntries: List<W3CStatusEntry> = array.map { el: JsonElement ->
        w3cListEntryContentParser.parse(el as JsonObject)
    }

    // 校验数量
    require(statusEntries.size >= attribute.list.size) {
        "Arguments list size mismatch: ${statusEntries.size} expecting ${attribute.list.size}"
    }

    // 排序并一一验证
    val sortedEntries = statusEntries.sortedBy { it.purpose }
    val sortedAttributes = attribute.list.sortedBy { it.purpose }

    val validationResults: List<Result<Unit>> = sortedEntries.zip(sortedAttributes).map { (entry, attr) ->
        w3cStatusValidator.validate(entry, attr)
    }

    if (validationResults.isEmpty()) {
        throw IllegalArgumentException(emptyResultMessage(attribute))
    }

    if (validationResults.any { it.isFailure }) {
        throw IllegalArgumentException(failResultMessage(validationResults))
    }
}
