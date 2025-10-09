package your.pkg.fetch

import id.walt.policies.policies.status.CredentialFetcher
import io.ktor.client.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import kotlinx.serialization.json.Json

/**
 * CredentialFetcher への拡張関数：
 * - Bitstring/W3C 用（JSON 期待）
 * - GET に Content-Type を付けない
 * - Accept は application/json
 * - body を「一度だけ」読み、非空を保証して返す
 */
suspend fun CredentialFetcher.fetchJson(
    httpClient: HttpClient, // 既存の HttpClient を渡す
    url: String
): Result<String> = runCatching {
    val resp: HttpResponse = httpClient.get(url) {
        header(HttpHeaders.Accept, "application/json")
        // Content-Type は GET なので付けない
    }
    require(resp.status.isSuccess()) { "HTTP ${resp.status} for $url" }

    val text = resp.bodyAsText()              // ★ 一度だけ読む
    // ログしたい場合は長さのみ推奨
    // println("[fetchJson] url=$url len=${text.length}")
    require(text.isNotBlank()) { "Empty body for $url" }

    // Bitstring ルートでは JSON を期待（念のため先頭確認）
    require(text.first() == '{') {
        "Unexpected content for $url: expected JSON starting with '{'"
    }
    text
}


val statusListContent: String = fetcher.fetchJson(httpClient, entry.uri)
    .getOrElse { throw StatusRetrievalError(it.message ?: "Status credential download error") }
