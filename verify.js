import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement

private suspend fun processStatusEntry(data: JsonElement, args: StatusPolicyArgument) = when (args) {
    is IETFStatusPolicyAttribute -> processIETF(data, args)
    is W3CStatusPolicyAttribute ->
        if (data is JsonArray) {
            processListW3C(
                data,
                W3CStatusPolicyListArguments(list = listOf(args))
            )
        } else {
            processW3C(data, args)
        }
    is W3CStatusPolicyListArguments -> processListW3C(data, args)
}

