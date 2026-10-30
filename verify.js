/**
 * Cloud WalletのCredential Formatをwalt.id形式に変換する。
 */
const convertToWaltidFormat = (format) => {
    switch (format) {
        case FORMAT_TYPES.VC_JWT:
            return WALTID_FORMAT_TYPES.JWT_VC_JSON

        case FORMAT_TYPES.VC_SD_JWT:
            return WALTID_FORMAT_TYPES.SD_JWT_VC

        case WALTID_FORMAT_TYPES.JWT_VC_JSON:
        case WALTID_FORMAT_TYPES.SD_JWT_VC:
            return format

        default:
            throw new Error('Unsupported Credential format.')
    }
}




/**
 * Credential Profileの存在及び発行パラメータを確認する。
 */
const validateCredentialProfile = async (
    credentialConfigurationId,
    format = null,
    accessToken = null
) => {
    logger.debug('*** validateCredentialProfile start ***')

    try {
        if (!credentialConfigurationId) {
            throw new Error('Required issuance parameters are missing.')
        }

        // Credential ProfileとIssuer Metadataを取得する。
        const [profile, metadata] = await Promise.all([
            getCredentialProfileByConfigurationId(
                credentialConfigurationId,
                accessToken
            ),
            getCredentialIssuerMetadata(accessToken)
        ])

        // Credential Configurationを取得する。
        const configuration =
            metadata?.credential_configurations_supported?.[credentialConfigurationId]

        if (!configuration) {
            throw new Error('Credential Configuration not found.')
        }

        // フォーマットが指定された場合のみ検証する。
        if (format !== null && format !== undefined && format !== '') {
            // Cloud WalletのFormatをwalt.id形式に変換する。
            const waltidFormat = convertToWaltidFormat(format)

            // Credential Configuration IDを確認する。
            if (profile.credentialConfigurationId !== credentialConfigurationId) {
                throw new Error('Credential Configuration ID does not match.')
            }

            // Credentialフォーマットを確認する。
            if (configuration.format !== waltidFormat) {
                throw new Error('Credential format does not match.')
            }

            // Credentialタイプを確認する。
            switch (waltidFormat) {
                case WALTID_FORMAT_TYPES.JWT_VC_JSON: {
                    const suffix = `_${WALTID_FORMAT_TYPES.JWT_VC_JSON}`

                    if (!credentialConfigurationId.endsWith(suffix)) {
                        throw new Error('Invalid Credential Configuration ID.')
                    }

                    // Credential Configuration IDからタイプを取得する。
                    const type = credentialConfigurationId.slice(0, -suffix.length)

                    // MetadataとProfileからタイプを取得する。
                    const metadataTypes =
                        configuration.credential_definition?.type

                    const profileTypes =
                        profile.credentialData?.type

                    // タイプ配列の最後の要素と比較する。
                    if (
                        !type ||
                        !Array.isArray(metadataTypes) ||
                        !Array.isArray(profileTypes) ||
                        metadataTypes.length === 0 ||
                        profileTypes.length === 0 ||
                        metadataTypes.at(-1) !== type ||
                        profileTypes.at(-1) !== type
                    ) {
                        throw new Error('Credential type does not match.')
                    }

                    break
                }

                case WALTID_FORMAT_TYPES.SD_JWT_VC: {
                    const suffix = `_${WALTID_FORMAT_TYPES.SD_JWT_VC}`

                    if (!credentialConfigurationId.endsWith(suffix)) {
                        throw new Error('Invalid Credential Configuration ID.')
                    }

                    // Credential Configuration IDからタイプを取得する。
                    const type = credentialConfigurationId.slice(0, -suffix.length)

                    // VCTからタイプを取得する。
                    const vct = configuration.vct

                    if (typeof vct !== 'string' || !vct) {
                        throw new Error('Credential VCT is missing.')
                    }

                    const vctType =
                        vct.substring(vct.lastIndexOf('/') + 1)

                    // Credentialタイプを比較する。
                    if (!type || !vctType || type !== vctType) {
                        throw new Error('Credential type does not match.')
                    }

                    break
                }

                default:
                    throw new Error('Unsupported Credential format.')
            }
        }

        // ProfileにフォーマットとCredential Metadataを追加する。
        return {
            ...profile,
            format: configuration.format,
            credentialMetadata: configuration.credential_metadata || null
        }
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** validateCredentialProfile end ***')
    }
}
