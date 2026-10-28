
/**
 * Credential Configuration IDからCredential Profileを取得する。
 */
const getCredentialProfileByConfigurationId = async (
    credentialConfigurationId,
    accessToken = null
) => {
    logger.debug('*** getCredentialProfileByConfigurationId start ***')

    try {
        if (!credentialConfigurationId) {
            throw new Error('Credential Configuration ID is required.')
        }

        // Credential Profile一覧を取得する。
        const profilesResponse = await getCredentialProfiles(accessToken)

        // Profile一覧を配列に変換する。
        const profiles = Array.isArray(profilesResponse)
            ? profilesResponse
            : Object.entries(profilesResponse).map(
                ([profileId, profile]) => ({
                    ...profile,
                    profileId
                })
            )

        // Credential Configuration IDで検索する。
        const matchedProfiles = profiles.filter(
            profile =>
                profile.credentialConfigurationId === credentialConfigurationId
        )

        if (matchedProfiles.length === 0) {
            throw new Error('Credential Profile not found.')
        }

        if (matchedProfiles.length > 1) {
            throw new Error('Multiple Credential Profiles found.')
        }

        return matchedProfiles[0]
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** getCredentialProfileByConfigurationId end ***')
    }
}
