
const { URL } = require('url')
const { v4: uuid } = require('uuid')

/**
 * JSONデータをコピーする。
 */
const cloneJson = (value) => {
    if (value === undefined) {
        return undefined
    }

    return JSON.parse(JSON.stringify(value))
}

/**
 * オブジェクトかどうかを確認する。
 */
const isPlainObject = (value) => {
    return value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value)
}

/**
 * Credential Dataを再帰的に統合する。
 */
const mergeCredentialData = (base = {}, overrides = {}) => {
    const result = cloneJson(base || {})

    Object.entries(overrides || {}).forEach(([key, value]) => {
        if (value === undefined) {
            return
        }

        if (
            isPlainObject(value) &&
            isPlainObject(result[key])
        ) {
            result[key] = mergeCredentialData(
                result[key],
                value
            )
        } else {
            result[key] = cloneJson(value)
        }
    })

    return result
}

/**
 * Credential Status Webhook用のMappingを設定する。
 */
const prepareCredentialStatusMapping = ({
    type,
    mapping,
    issuerDid
}) => {
    logger.debug('*** prepareCredentialStatusMapping start ***')

    try {
        // Credential IDを生成する。
        const credentialId = `urn:uuid:${uuid()}`

        // ConfigからWebhook URLを取得する。
        const webhookUrl = new URL(
            config.credentialStatusWebhookUrl
        )

        webhookUrl.searchParams.set('type', type)
        webhookUrl.searchParams.set('issuerDid', issuerDid)
        webhookUrl.searchParams.set('credentialId', credentialId)

        // ProfileのMappingを保持してStatus情報を設定する。
        const result = {
            ...mapping,
            id: credentialId,
            credentialStatus:
                `<webhook-json:${webhookUrl.toString()}>`
        }

        return result
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** prepareCredentialStatusMapping end ***')
    }
}

/**
 * Credential Offer用のPayloadを準備する。
 *
 * @param {object} params パラメータ
 * @returns {object} Credential Offer用Payload
 */
const prepareCredentialOfferPayload = ({
    profile,
    credentialMetadata,
    authMethod,
    offerData,
    issuanceDate = null,
    expirationDate = null,
    expirationDateSpecified = false,
    docId = null,
    type = null,
    issuerDid = null,
    issuerKey = null
}) => {
    logger.debug('*** prepareCredentialOfferPayload start ***')

    try {
        // Credential MetadataからClaimsを取得する。
        const claims = credentialMetadata?.claims || []

        // Claimsから各項目のPathを取得する。
        const typePath = getClaimPathByKey(claims, 'type')
        const docIdPath = getClaimPathByKey(claims, 'docId')
        const issuanceDatePath = getClaimPathByKey(
            claims,
            'issuanceDate'
        )
        const expirationDatePath = getClaimPathByKey(
            claims,
            'expirationDate'
        )
        const imagePath = getClaimPathByKey(claims, 'image')

        // Profileと入力データを統合する。
        const credentialData = mergeCredentialData(
            profile.credentialData || {},
            offerData.credentialData || {}
        )

        // ProfileのMappingを取得する。
        let mapping = cloneJson(profile.mapping || {})

        // 発行日時を設定する。
        if (
            issuanceDate != null &&
            Array.isArray(issuanceDatePath) &&
            issuanceDatePath.length > 0
        ) {
            setValueByPath(
                credentialData,
                issuanceDatePath,
                issuanceDate
            )

            // 発行日時の動的Mappingを削除する。
            delete mapping.issuanceDate
        }

        // 有効期限が明示的に指定された場合のみ変更する。
        if (
            expirationDateSpecified &&
            Array.isArray(expirationDatePath) &&
            expirationDatePath.length > 0
        ) {
            if (expirationDate != null && expirationDate !== '') {
                // 有効期限を設定する。
                setValueByPath(
                    credentialData,
                    expirationDatePath,
                    expirationDate
                )
            } else {
                // 無期限の場合は有効期限を削除する。
                deleteValueByPath(
                    credentialData,
                    expirationDatePath
                )
            }

            // 有効期限の動的Mappingを削除する。
            delete mapping.expirationDate
        }

        // docIdを設定する。
        if (
            docId != null &&
            Array.isArray(docIdPath) &&
            docIdPath.length > 0
        ) {
            setValueByPath(
                credentialData,
                docIdPath,
                docId
            )
        }

        // 証明書種別を設定する。
        if (
            type != null &&
            Array.isArray(typePath) &&
            typePath.length > 0 &&
            !(typePath.length === 1 && typePath[0] === 'type')
        ) {
            setValueByPath(
                credentialData,
                typePath,
                categories[type] || type
            )
        }

        // 証明書画像を設定する。
        if (
            Array.isArray(imagePath) &&
            imagePath.length > 0
        ) {
            const inputImage = getValueByPath(
                offerData.credentialData || {},
                imagePath
            )

            const profileImage = getValueByPath(
                profile.credentialData || {},
                imagePath
            )

            const imageData =
                inputImage ||
                profileImage ||
                images?.default ||
                null

            if (imageData) {
                setValueByPath(
                    credentialData,
                    imagePath,
                    imageData
                )
            }
        }

        // Credential Status WebhookをMappingに設定する。
        if (config.useCredentialStatusWebhook) {
            mapping = prepareCredentialStatusMapping({
                type,
                mapping,
                issuerDid: issuerDid || profile.issuerDid
            })
        }

        // Credential Offer用のPayloadを生成する。
        const payload = {
            profileId: profile.profileId,
            authMethod,
            valueMode: 'BY_REFERENCE',
            credentialData,
            mapping
        }

        // Selective Disclosureを設定する。
        if (profile.selectiveDisclosure != null) {
            payload.selectiveDisclosure =
                cloneJson(profile.selectiveDisclosure)
        }

        // Issuer DIDが指定された場合は上書きする。
        if (issuerDid != null) {
            payload.issuerDid = issuerDid
        }

        // Issuer Keyが指定された場合は上書きする。
        if (issuerKey != null) {
            payload.issuerKey = issuerKey
        }

        logger.debug(
            'credential_offer payload: ',
            JSON.stringify(payload, null, 2)
        )

        return payload
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** prepareCredentialOfferPayload end ***')
    }
}


// ————————————————————————————————
/**
 * walt.idのFormatをCloud Wallet形式に変換する。
 */
const convertToCloudWalletFormat = (format) => {
    logger.debug('*** convertToCloudWalletFormat start ***')

    try {
        switch (format) {
            case WALTID_FORMAT_TYPES.JWT_VC_JSON:
                return FORMAT_TYPES.VC_JWT

            case WALTID_FORMAT_TYPES.SD_JWT_VC:
                return FORMAT_TYPES.VC_SD_JWT

            default:
                throw new Error(`Unsupported Credential format: ${format}`)
        }
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** convertToCloudWalletFormat end ***')
    }
}

// ——————————————————————————
// walt.idのFormatをCloud Wallet形式に変換する。
const cloudWalletFormat =
    issuer2Service.convertToCloudWalletFormat(format)
