package id.walt.did.dids.registrar.local.web

import id.walt.crypto2.keys.Key
import id.walt.did.dids.document.DidDocument
import id.walt.did.dids.document.DidWebDocument
import id.walt.did.dids.registrar.Crypto2DidRegistrar
import id.walt.did.dids.registrar.DidResult
import id.walt.did.dids.registrar.dids.DidCreateOptions
import id.walt.did.dids.registrar.exportPublicJwkObject
import id.walt.did.utils.ExtensionMethods.ensurePrefix
import kotlinx.serialization.json.jsonPrimitive
import net.thauvin.erik.urlencoder.UrlEncoderUtil

class Crypto2DidWebRegistrar : Crypto2DidRegistrar {

    override suspend fun createByKey(key: Key, options: DidCreateOptions): DidResult {
        val domain = options.get<String>("domain")
            ?.takeIf { it.isNotEmpty() }
            ?.let { UrlEncoderUtil.encode(it) }
            ?: throw IllegalArgumentException("Option \"domain\" not found.")

        val path = options.get<String>("path")
            ?.takeIf { it.isNotEmpty() }
            ?.let {
                it.ensurePrefix("/")
                    .split("/")
                    .joinToString(":") { part -> UrlEncoderUtil.encode(part) }
            }
            ?: ""

        val did = "did:web:$domain$path"
        val publicJwk = key.exportPublicJwkObject()
        val keyId = publicJwk["kid"]?.jsonPrimitive?.content ?: "key-1"

        return DidResult(
            did = did,
            didDocument = DidDocument(
                DidWebDocument(
                    did = did,
                    keyId = keyId,
                    didKey = publicJwk,
                ).toMap()
            ),
        )
    }
}
