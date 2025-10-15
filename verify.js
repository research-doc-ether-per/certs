
package id.walt.policies.policies.status.reader

import id.walt.policies.policies.status.content.ContentParser
import id.walt.policies.policies.status.model.W3CStatusContent
import io.github.oshai.kotlinlogging.KotlinLogging
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.parseToJsonElement

/**
 * W3C のステータスリスト読取り
 * - JSON(LD) がそのまま返ってくる場合: ここで credentialSubject を直接 decode
 * - JWT(VC-JWT) が返ってくる場合: 親クラス JwtStatusValueReaderBase に委譲
 */
class W3CStatusValueReader(
    parser: ContentParser<String, JsonObject>,
) : JwtStatusValueReaderBase<W3CStatusContent>(parser) {

    private val log = KotlinLogging.logger {}
    // 親クラスでも Json を持っているが、ここでも使うので同じ設定で用意
    private val jsonModule = Json {
        ignoreUnknownKeys = true
        isLenient = true
    }

    /**
     * 入口: レスポンスが JSON なら直読、そうでなければ JWT とみなして親に委譲
     */
    override fun read(response: String) =
        runCatching {
            val body = response.trim()
            if (body.startsWith("{")) {
                // ---- JSON 直読ルート ----
                log.debug { "W3CStatusValueReader: detected JSON response" }
                val jsonObj = jsonModule.parseToJsonElement(body).jsonObject
                val credentialSubject = jsonObj["credentialSubject"]?.jsonObject
                    ?: error("Missing 'credentialSubject' in status list JSON")
                jsonModule.decodeFromJsonElement<W3CStatusContent>(credentialSubject)
            } else {
                // ---- JWT ルート（従来通り親クラスに委譲）----
                log.debug { "W3CStatusValueReader: detected JWT response" }
                super.read(response).getOrThrow()
            }
        }

    /**
     * 親クラス（JWT ルート）から呼ばれる: payload(JSON) -> credentialSubject を decode
     * ここは「JWT の中の vc.credentialSubject を読む」処理に限定。
     */
    override fun parseStatusList(payload: JsonObject): W3CStatusContent {
        val credentialSubject = payload["vc"]!!
            .jsonObject["credentialSubject"]
            ?.jsonObject
            ?: error("Missing 'vc.credentialSubject' in JWT payload")
        return jsonModule.decodeFromJsonElement(credentialSubject)
    }
}
