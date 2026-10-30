const { v4: uuid } = require('uuid')
const { URL } = require('url')

/**
 * オブジェクトかどうかを確認する。
 */
const isPlainObject = (value) => {
    return value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value)
}

/**
 * JSONオブジェクトをコピーする。
 */
const cloneJson = (value) => {
    if (value === undefined) {
        return undefined
    }

    return JSON.parse(JSON.stringify(value))
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
            result[key] = mergeCredentialData(result[key], value)
        } else {
            result[key] = cloneJson(value)
        }
    })

    return result
}

/**
 * Credential Dataを統合する。
 */
const mergeCredentialData = (base = {}, overrides = {}) => {
    const result = structuredClone(base)

    Object.entries(overrides).forEach(([key, value]) => {
        if (value === undefined) {
            return
        }

        if (
            isPlainObject(value) &&
            isPlainObject(result[key])
        ) {
            result[key] = mergeCredentialData(result[key], value)
        } else {
            result[key] = structuredClone(value)
        }
    })

    return result
}

/**
 * Cloud Walletの認証方式をwalt.id形式に変換する。
 */
const convertToWaltidAuthMethod = (authenticationMethod) => {
    switch (authenticationMethod?.toUpperCase()) {
        case AUTH_METHOD_TYPES.PRE_AUTHORIZED:
            return WALTID_AUTH_METHOD_TYPES.PRE_AUTHORIZED

        case WALTID_AUTH_METHOD_TYPES.AUTHORIZATION_CODE:
            return WALTID_AUTH_METHOD_TYPES.AUTHORIZATION_CODE

        default:
            throw new Error('Unsupported authentication method.')
    }
}

/**
 * Credential Status Webhook用のMappingを設定する。
 */
const prepareCredentialStatusMapping = ({
    profile,
    mapping,
    webhookBaseUrl,
    issuerDid = null
}) => {
    logger.debug('*** prepareCredentialStatusMapping start ***')

    try {
        // Credential IDを生成する。
        const credentialId = `urn:uuid:${uuid()}`

        const type = profile.name
        const targetIssuerDid = issuerDid || profile.issuerDid

        // Webhook URLを生成する。
        const webhookUrl = new URL(webhookBaseUrl)

        webhookUrl.searchParams.set('type', type)
        webhookUrl.searchParams.set('issuerDid', targetIssuerDid)
        webhookUrl.searchParams.set('credentialId', credentialId)

        // Credential Status用Mappingを設定する。
        const result = {
            ...mapping,
            id: credentialId,
            credentialStatus: `<webhook-json:${webhookUrl.toString()}>`
        }

        logger.debug(
            'credentialStatus mapping: ',
            JSON.stringify(result, null, 2)
        )

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
 */
const prepareCredentialOfferPayload = ({
    profile,
    offerData,
    issuanceDate = null,
    expirationDate = null,
    expirationDateSpecified = false,
    image = null,
    issuerDid = null,
    issuerKey = null,
    useCredentialStatusWebhook = false,
    webhookBaseUrl = null,
    expiresInSeconds = null
}) => {
    logger.debug('*** prepareCredentialOfferPayload start ***')

    try {
        const {
            credentialData: inputCredentialData = {},
            authenticationMethod
        } = offerData

        // 認証方式を変換する。
        const authMethod = convertToWaltidAuthMethod(
            authenticationMethod
        )

        // Profileと入力されたCredential Dataを統合する。
        const credentialData = mergeCredentialData(
            profile.credentialData || {},
            inputCredentialData || {}
        )

        // ProfileのMappingを取得する。
        let mapping = structuredClone(profile.mapping || {})

        // 発行日時を設定する。
        if (issuanceDate != null) {
            credentialData.issuanceDate = issuanceDate
            delete mapping.issuanceDate
        }

        // 有効期限を設定する。
        if (expirationDateSpecified) {
            if (expirationDate != null && expirationDate !== '') {
                credentialData.expirationDate = expirationDate
            } else {
                delete credentialData.expirationDate
            }

            delete mapping.expirationDate
        }

        // 証明書画像を設定する。
        if (image != null && image !== '') {
            if (!isPlainObject(credentialData.credentialSubject)) {
                credentialData.credentialSubject = {}
            }

            credentialData.credentialSubject.image = image
        }

        // Credential Status Webhookを設定する。
        if (useCredentialStatusWebhook) {
            mapping = prepareCredentialStatusMapping({
                profile,
                mapping,
                webhookBaseUrl,
                issuerDid
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
                structuredClone(profile.selectiveDisclosure)
        }

        // Offer URLの有効期限を設定する。
        if (expiresInSeconds != null) {
            payload.expiresInSeconds = expiresInSeconds
        }

        // Issuer DIDを設定する。
        if (issuerDid != null) {
            payload.issuerDid = issuerDid
        }

        // Issuer Keyを設定する。
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









// Credential Profileの存在及び発行パラメータを確認する。
const profile = await issuer2Service.validateCredentialProfile(
    credentialConfigurationId,
    format
)

// 入力された有効期限を取得する。
const inputExpirationDate =
    offerData.credentialData?.expirationDate

// 発行日時と有効期限を準備する。
const { issuanceDate, expirationDate } =
    prepareCredentialDates(inputExpirationDate)

// Credential Offer用のPayloadを準備する。
const payload = prepareCredentialOfferPayload({
    profile,
    offerData,
    issuanceDate,
    expirationDate,
    expirationDateSpecified:
        Object.hasOwn(
            offerData.credentialData || {},
            'expirationDate'
        ),
    image,
    issuerDid,
    issuerKey,
    useCredentialStatusWebhook,
    webhookBaseUrl: credentialStatusWebhookUrl
})

// Credential Offerを作成する。
const offerResult =
    await issuer2Service.createCredentialOffer(payload)

// Credential Offer URLを取得する。
credential_offer_url = offerResult.credentialOffer

logger.debug('credential_offer_url: ', credential_offer_url)

