
val finalVcJson = buildJsonObject {
    injectedStatusVc.forEach { (key, value) ->
        put(key, value)
    }
    if (display != null && display.isNotEmpty()) {
        put("display", display)
    }
}
log.info { "finalVcJson = $finalVcJson" }
