
init {
      println(
          """
          ===== SDJwtVC created =====
          holderDid     = $holderDid
          holderKeyJWK  = $holderKeyJWK
          issuer        = $issuer
          nbf / exp     = $notBefore / $expiration
          vct           = $vct
          status        = $status
          ---------------------------
          undisclosed   = $undisclosedPayload
          digestedHash  = ${sdPayload.digestedDisclosures}
          disclosures   = $disclosures
          ===========================
          """.trimIndent()
      )
  }
