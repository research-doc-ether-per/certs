
package id.walt.policies.policies.status.entry

import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.jsonObject

class W3CEntryExtractor : EntryExtractor {
    override fun extract(data: JsonElement): JsonElement? {
        val obj = data.jsonObject
        // 1) 兼容传统 W3C/JWT-VC：vc.credentialStatus
        obj["vc"]?.jsonObject?.get("credentialStatus")?.let { return it }
        // 2) 兼容根级 credentialStatus（SD-JWT 等扁平化场景）
        return obj["credentialStatus"]
    }
}
