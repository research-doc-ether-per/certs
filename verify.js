val statusEntries = when (data) {
    is JsonArray -> data.map { w3cListEntryContentParser.parse(it) } // 支持数组
    is JsonObject -> listOf(w3cListEntryContentParser.parse(data))   // 单一对象
    else -> emptyList()
}

