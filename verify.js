
/**
 * 発行可能なCredential Profile一覧を取得する。
 */
const getCredentialProfiles = async (accessToken = null) => {
    logger.debug('*** getCredentialProfiles start ***')

    try {
        const response = await fetchService.handleGet(
            fetchService.issuerApi2,
            '/issuer2/profiles',
            accessToken
        )

        return response.data || {}
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** getCredentialProfiles end ***')
    }
}

/**
 * Credential Issuer Metadataを取得する。
 */
const getCredentialIssuerMetadata = async (accessToken = null) => {
    logger.debug('*** getCredentialIssuerMetadata start ***')

    try {
        const response = await fetchService.handleGet(
            fetchService.issuerApi2,
            '/.well-known/openid-credential-issuer/openid4vci',
            accessToken
        )

        return response.data || {}
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** getCredentialIssuerMetadata end ***')
    }
}

/**
 * 発行可能なCredential一覧とMetadata情報を取得する。
 */
const getIssuableCredentials = async (accessToken = null) => {
    logger.debug('*** getIssuableCredentials start ***')

    try {
        // Profile一覧とIssuer Metadataを取得する。
        const [profilesResponse, metadata] = await Promise.all([
            getCredentialProfiles(accessToken),
            getCredentialIssuerMetadata(accessToken)
        ])

        // Profile一覧を配列に変換する。
        const profiles = Array.isArray(profilesResponse)
            ? profilesResponse
            : Object.entries(profilesResponse).map(
                ([profileId, profile]) => ({
                    ...profile,
                    profileId
                })
            )

        // Credential Configuration一覧を取得する。
        const configurations =
            metadata.credential_configurations_supported || {}

        // credentialConfigurationIdでProfileとMetadataを紐付ける。
        const result = profiles.map(profile => {
            const configuration =
                configurations[profile.credentialConfigurationId] || {}

            return {
                profileId: profile.profileId,
                name: profile.name,
                credentialConfigurationId:
                    profile.credentialConfigurationId,
                format: configuration.format || null,
                claims: configuration.credential_metadata?.claims || [],
                credentialData: profile.credentialData || {},
                selectiveDisclosure: profile.selectiveDisclosure || null,
                mapping: profile.mapping || null
            }
        })

        return result
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** getIssuableCredentials end ***')
    }
}

module.exports = {
    getCredentialProfiles,
    getCredentialIssuerMetadata,
    getIssuableCredentials
}
