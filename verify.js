    // Credential Profileの存在及び発行パラメータを確認する。
        for (const [credentialConfigurationId, credential] of Object.entries(credentials)) {
            await validateCredentialProfile(
                credentialConfigurationId,
                credential.format,
                accessToken
            )
        }
