is JsonPrimitive -> {
    when {
        v.isTemplate() -> {
            println("[DEBUG] patch key = $k")
            println("[DEBUG] patch mapping value = $v")

            val result = getTemplateData(
                v.content,
                dataFunctions,
                context,
                functionHistory
            )

            println("[DEBUG] Data Function result = $result")
            println("[DEBUG] Result type = ${result::class.simpleName}")

            this[k] = result

            println("[DEBUG] Merged credentialStatus = ${this["credentialStatus"]}")
        }

        else -> this[k] = v
    }
}
