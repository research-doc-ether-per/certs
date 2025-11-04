  array.forEachIndexed  val statusEntries: List<W3CEntry> = try {
        w3cListEntryContentParser.parse(array)
    } catch (e: Exception) {
        throw IllegalArgumentException(
            "Failed to parse credentialStatus array into List<W3CEntry>: ${e.message}", e
        )
    }
