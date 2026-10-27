
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

        const configurations =
            metadata.credential_configurations_supported || {}

        // credentialConfigurationIdをキーとして情報を統合する。
        const result = Object.fromEntries(
            profiles.map(profile => {
                const configurationId = profile.credentialConfigurationId
                const configuration = configurations[configurationId] || {}

                return [
                    configurationId,
                    {
                        ...configuration,
                        profileId: profile.profileId,
                        name: profile.name,
                        credentialData: profile.credentialData || {},
                        selectiveDisclosure: profile.selectiveDisclosure || null,
                        mapping: profile.mapping || null
                    }
                ]
            })
        )

        return result
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** getIssuableCredentials end ***')
    }
}
