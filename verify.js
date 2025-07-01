import com.nimbusds.jwt.SignedJWT    
 private val kbJwtString: String? get() = keyBindingJwt        
    private val kbJwtPayloadJson: String? by lazy {
        kbJwtString?.let {
            runCatching {                                        
                val payloadObj = SignedJWT.parse(it).payload.toJSONObject()
                payloadObj.toJSONString()                        
            }.getOrElse { ex -> "!! KB-JWT parse error: ${ex.message}" }
        }
    }

    init {
        println(
            """
            ===== SDJwtVC created =====
            holderDid       = $holderDid
            holderKeyJWK    = $holderKeyJWK
            issuer          = $issuer
            nbf / exp       = $notBefore / $expiration
            vct             = $vct
            status          = $status
            -- undisclosedPayload --
            $undisclosedPayload
            -- digestedHashes --
            ${sdPayload.digestedDisclosures}
            -- disclosures --
            $disclosures
            -- KB-JWT payload --
            $kbJwtPayloadJson
            ==========================
            """.trimIndent()
        )
    }
}
