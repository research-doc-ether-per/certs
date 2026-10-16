"webhook-json" to {
    val url = it.args!!
    val response = webDataFetcher.fetch<JsonElement>(url)
    val result = response.body

    println("Webhook URL: $url")
    println("Webhook Status: ${response.status}")
    println("Webhook Result: $result")

    result
},



