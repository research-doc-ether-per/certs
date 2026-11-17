
require('dotenv').config()

const log4js = require('log4js')
const zlib = require('zlib')
const { importJWK, compactVerify } = require('jose')

const walletDBService = require('../postgres/walletDBService')
const wallet2Service = require('../waltid/wallet2Service')
const { hasPersonalWallet } = require('../wallet/managementService')
const { validateDatetime, isExpiredUTC } = require('../dateService')
const { handleGet } = require('./fetchService')

const {
    sha256,
    getIssuerInfo,
    getCredentialFormat,
    getRequestUserInfoFromOwnerId,
    extractCredentialType,
    safeParseCredential,
} = require('./commonService')

const { WALTID_FORMAT_TYPES } = require('../../constants/credentialConstants')

const logger = log4js.getLogger('usageService')

/**
 * ローカルまたはプライベートネットワークのホストかどうかを判定する
 * @param {string} host ホスト名
 * @returns {boolean} 判定結果
 */
const isLocalHost = (host = '') => {
    if (!host || typeof host !== 'string') return false

    const normalizedHost = host.toLowerCase()

    return (
        normalizedHost === 'localhost' ||
        normalizedHost === '127.0.0.1' ||
        normalizedHost === '0.0.0.0' ||
        normalizedHost === '::1' ||
        normalizedHost === 'host.docker.internal' ||
        normalizedHost.endsWith('.local') ||
        normalizedHost.startsWith('10.') ||
        normalizedHost.startsWith('192.168.') ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(normalizedHost)
    )
}

/**
 * Base64URL文字列をBufferに変換する
 * @param {string} value Base64URL文字列
 * @returns {Buffer} 変換結果
 */
const b64urlToBuf = (value) => {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
    return Buffer.from(normalized, 'base64')
}

/**
 * エンコード済みステータスリストをデコードする
 * @param {string} encodedList エンコード済みステータスリスト
 * @returns {Buffer} デコード結果
 */
const decodeEncodedList = (encodedList) => {
    if (!encodedList) {
        throw new Error('encodedList is empty.')
    }

    const base64url = encodedList.startsWith('u')
        ? encodedList.slice(1)
        : encodedList

    const gz = b64urlToBuf(base64url)

    try {
        return zlib.gunzipSync(gz)
    } catch {
        throw new Error('encodedList must be gzip-compressed base64url.')
    }
}

/**
 * VCペイロード中の日時型をチェックする
 * @param {Object} payload VCペイロード
 * @returns {boolean} 検証結果
 */
const validateDatetimeInPayload = (payload) => {
    logger.debug('*** validateDatetimeInPayload start ***')

    const targets = [
        payload?.issuanceDate,
        payload?.expirationDate,
    ]

    let result = true

    for (const target of targets) {
        if (!validateDatetime(target)) {
            result = false
        }
    }

    logger.debug('result: ', result)
    logger.debug('*** validateDatetimeInPayload end ***')

    return result
}

/**
 * VCペイロード中の必須属性の存在をチェックする
 * @param {Object} payload VCペイロード
 * @returns {boolean} 検証結果
 */
const validateRequiredPayloadField = (payload) => {
    logger.debug('*** validateRequiredPayloadField start ***')

    const hasOwn = (obj, key) =>
        obj !== null &&
        typeof obj === 'object' &&
        Object.prototype.hasOwnProperty.call(obj, key)

    const result =
        hasOwn(payload, 'issuanceDate') &&
        hasOwn(payload, 'issuer') &&
        hasOwn(payload, 'credentialSubject') &&
        hasOwn(payload.credentialSubject, 'id')

    logger.debug('result: ', result)
    logger.debug('*** validateRequiredPayloadField end ***')

    return result
}

/**
 * Issuer DIDからDID Documentの接続先を取得する
 * @param {Object} params パラメータ
 * @returns {Object} 接続先情報
 */
const resolveIssuerUrl = (params) => {
    logger.debug('*** resolveIssuerUrl start ***')
    logger.debug('params: ', JSON.stringify(params, null, 2))

    try {
        let { did, kid } = params

        if (!did || !did.startsWith('did:web:')) {
            if (!kid || !kid.startsWith('did:web:')) {
                throw new Error('not did:web')
            }

            did = kid.split('#')[0]
        }

        const name = decodeURIComponent(did.substring(8))
        const parts = name.split(':')

        let host = parts[0]
        let idx = 1

        if (parts.length > 1 && /^\d+$/.test(parts[1])) {
            host += ':' + parts[1]
            idx = 2
        }

        const pathParts = parts.slice(idx)

        const scheme =
            process.env.NODE_ENV === 'development' && isLocalHost(host)
                ? 'http'
                : 'https'

        return {
            scheme,
            host,
            pathParts,
        }
    } catch (error) {
        logger.error('error.message: ', error.message)
        throw error
    } finally {
        logger.debug('*** resolveIssuerUrl end ***')
    }
}

/**
 * Issuerの公開鍵JWKを取得する
 * @param {Object} params パラメータ
 * @returns {Promise<Object>} 公開鍵JWK
 */
const resolveIssuerJwk = async (params) => {
    logger.debug('*** resolveIssuerJwk start ***')
    logger.debug('params: ', JSON.stringify(params, null, 2))

    try {
        const { did, kid } = params

        const { scheme, host, pathParts } = resolveIssuerUrl(params)

        const url = pathParts.length === 0
            ? `${scheme}://${host}/.well-known/did.json`
            : `${scheme}://${host}/${pathParts.join('/')}/did.json`

        logger.debug('url: ', url)

        const res = await handleGet(url)

        if (res.status !== 200) {
            throw new Error('not found issuer did info')
        }

        const didInfo = res.data

        logger.debug('didInfo: ', didInfo)

        if (
            !didInfo ||
            typeof didInfo !== 'object' ||
            didInfo.id !== did
        ) {
            throw new Error('cannot resolve did from did:web')
        }

        if (didInfo?.verificationMethod?.[0]?.id !== kid) {
            throw new Error('not valid did.')
        }

        const publicKeyJwk =
            didInfo?.verificationMethod?.[0]?.publicKeyJwk

        if (!publicKeyJwk) {
            throw new Error('cannot resolve publicKeyJwk from did:web')
        }

        publicKeyJwk.alg =
            wallet2Service.getAlgFromCrv(publicKeyJwk.crv)

        logger.debug('publicKeyJwk: ', publicKeyJwk)

        return publicKeyJwk
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** resolveIssuerJwk end ***')
    }
}

/**
 * Issuer署名を検証する
 * @param {Object} params パラメータ
 * @returns {Promise<boolean>} 検証結果
 */
const verifyIssuerSignature = async (params) => {
    logger.debug('*** verifyIssuerSignature start ***')
    logger.debug('params: ', JSON.stringify(params, null, 2))

    let result = true

    try {
        const { document } = params

        const publicKeyJwk = await resolveIssuerJwk(params)

        const key = await importJWK(
            publicKeyJwk,
            publicKeyJwk.alg
        )

        await compactVerify(document, key)

        return result
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)

        result = false
        return result
    } finally {
        logger.debug('result: ', result)
        logger.debug('*** verifyIssuerSignature end ***')
    }
}

/**
 * Credential StatusからVCの失効状態を確認する
 * @param {Object} params Credential Status情報
 * @returns {Promise<boolean>} 失効している場合はtrue
 */
const isRevokedByCredentialStatus = async (params) => {
    logger.debug('*** isRevokedByCredentialStatus start ***')
    logger.debug('params: ', JSON.stringify(params, null, 2))

    let result = true

    try {
        const {
            statusListCredential,
            statusListIndex,
            statusPurpose,
        } = params

        const index = Number(statusListIndex)

        if (!Number.isInteger(index) || index < 0) {
            throw new Error(
                'statusListIndex must be a non-negative integer.'
            )
        }

        const response = await handleGet(statusListCredential)

        const data = response?.data ?? {}
        const status = response?.status ?? 500

        logger.debug('response?.data: ', data)
        logger.debug('response?.status: ', status)

        if (
            status !== 200 ||
            !data ||
            typeof data !== 'object' ||
            Object.keys(data).length === 0
        ) {
            throw new Error('not found status info')
        }

        const credentialSubject = data?.credentialSubject

        if (
            statusPurpose !== credentialSubject?.statusPurpose &&
            statusPurpose !== 'revocation'
        ) {
            throw new Error('statusPurpose must be "revocation".')
        }

        const encodedList = credentialSubject?.encodedList
        const raw = decodeEncodedList(encodedList)

        const bitLen = raw.length * 8

        if (index >= bitLen) {
            throw new Error(
                `statusListIndex out of range (max=${bitLen - 1}, got=${index}, bytes=${raw.length}).`
            )
        }

        const byteIdx = Math.floor(index / 8)
        const bitIdx = index % 8
        const b = raw[byteIdx]

        result = (b & (1 << (7 - bitIdx))) !== 0

        return result
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)

        result = true
        return result
    } finally {
        logger.debug('result: ', result)
        logger.debug('*** isRevokedByCredentialStatus end ***')
    }
}

/**
 * 証明書検証の共通処理
 * @param {Object} params パラメータ
 * @returns {Promise<Object>} 検証結果
 */
const verifyCredentialJWT = async (params) => {
    logger.debug('*** verifyCredentialJWT start ***')
    logger.debug('params: ', JSON.stringify(params, null, 2))

    const {
        decodedResult,
        hash,
        certName = null,
        existCert = false,
    } = params

    let result = {
        certName: certName,
        issuerName: null,
        certData: {},
        fields: [],
        disclosedClaims: null,
        isCorrectFormat: false,
        credentialExists: false,
        isNotRevoked: false,
        issuerSignatureValid: false,
        isNotExpired: false,
    }

    try {
        const {
            disclosures,
            payload,
            header,
            signed,
            format,
        } = decodedResult

        const credential = payload?.vc || payload

        const credentialSubject = credential?.credentialSubject
        const credentialStatus =
            credential?.credentialStatus?.[0] || null

        const vct = credential?.vct
        const credentialDefinitionType = credential?.type
        const issuer = credential?.issuer || null
        const expirationDate = credential?.expirationDate || null

        // Issuer DIDをもとに、グループIDを取得
        const { groupId } = await getIssuerInfo(issuer)

        // クレデンシャルのフォーマットに応じて、クレデンシャルタイプを取得
        const type = extractCredentialType(
            credentialDefinitionType,
            vct,
            format
        )

        try {
            const formatResult = await getCredentialFormat({
                groupId,
                type,
                format,
            })

            result.fields = formatResult?.fields || []
        } catch (error) {
            logger.warn(
                'Failed to get credential format:',
                error.message
            )
        }

        result.certData = payload || {}
        result.disclosedClaims = disclosures || null

        // フォーマット検証結果
        const isValidDatetime =
            validateDatetimeInPayload(credential)

        const hasRequired =
            validateRequiredPayloadField(credential)

        if (isValidDatetime && hasRequired) {
            result.isCorrectFormat = true
        }

        // credentialSubjectのハッシュ値を検証する
        // walt.idに証明書が存在することも確認する
        if (hash && existCert) {
            const sha256CredentialSubject =
                sha256(JSON.stringify(credentialSubject))

            result.credentialExists =
                hash === `0x${sha256CredentialSubject}`
        } else {
            result.credentialExists = false
        }

        // credentialStatusが存在する場合のみ失効状態を確認する
        // 存在しない場合はtrueとする
        result.isNotRevoked = credentialStatus
            ? !(await isRevokedByCredentialStatus(credentialStatus))
            : true

        // Issuer署名検証結果
        const isValidIssuer = await verifyIssuerSignature({
            did: issuer,
            kid: header?.kid,
            document: signed,
        })

        if (isValidIssuer) {
            result.issuerSignatureValid = true
        }

        // 有効期限検証結果
        const isExpired = isExpiredUTC(expirationDate)

        if (!isExpired) {
            result.isNotExpired = true
        }

        logger.debug('result: ', JSON.stringify(result, null, 2))

        return result
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** verifyCredentialJWT end ***')
    }
}

/**
 * 証明書検証サービス
 * @param {Object} params パラメータ
 * @returns {Promise<Object>} 検証結果
 */
const verifyCredential = async (params) => {
    logger.debug('*** verifyCredential start ***')
    logger.debug('params: ', JSON.stringify(params, null, 2))

    const {
        rsId,
        realmName,
        kcUser,
        kcToken,
    } = params

    let result = {}

    try {
        // VCウォレットテーブルからVC情報を取得
        const certs = await walletDBService.select(
            'vc_wallets',
            {
                rs_id: rsId,
            }
        )

        if (certs.length === 0) {
            const error = new Error(
                `User does not have a VC. rsId: ${rsId}`
            )

            error.code = 'CertificateNotFoundError'
            error.params = [rsId]

            throw error
        }

        const {
            ownerId,
            waltidCredentialId,
            hash,
            certName,
        } = certs[0]

        // Realm名に応じてリクエスト用ユーザー情報を取得
        const { userId } = getRequestUserInfoFromOwnerId({
            realmName,
            kcUser,
            kcToken,
            ownerId,
        })

        // 個人ウォレットを取得
        const { wallet } = await hasPersonalWallet(userId, true)
        const walletId = wallet.waltidWallet

        // walt.idから証明書情報を取得
        const credentialDetail = await wallet2Service.getCredential(
            walletId,
            waltidCredentialId
        )

        const { credential } = credentialDetail
        const format = credential.format

        const jwt =
            WALTID_FORMAT_TYPES.SD_JWT_VC === format
                ? credential.signedWithDisclosures
                : credential.signed

        // VC JWTを検証・デコードする
        const decodedResult = safeParseCredential(jwt)

        // 証明書を検証する
        result = await verifyCredentialJWT({
            decodedResult,
            hash,
            certName,
            existCert: true,
        })

        return result
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** verifyCredential end ***')
    }
}

/**
 * 証明書ファイル検証サービス
 * @param {Object} params パラメータ
 * @returns {Promise<Object>} 検証結果
 */
const verifyCredentialFile = async (params) => {
    logger.debug('*** verifyCredentialFile start ***')
    logger.debug('params: ', JSON.stringify(params, null, 2))

    const {
        certJwt,
        realmName,
        kcUser,
        kcToken,
    } = params

    let result = {}

    try {
        // VC JWTを検証・デコードする
        const decodedResult = safeParseCredential(certJwt)
        const { payload } = decodedResult

        const credential = payload?.vc || payload
        const credentialSubject = credential?.credentialSubject

        let certName = null
        let hash
        let existCert = false

        if (JSON.stringify(credentialSubject)) {
            // credentialSubjectのハッシュ値を取得
            const sha256CredentialSubject =
                sha256(JSON.stringify(credentialSubject))

            // VCウォレットテーブルからVC情報を取得
            const certs = await walletDBService.select(
                'vc_wallets',
                {
                    hash: `0x${sha256CredentialSubject}`,
                },
                'update_date DESC',
                1
            )

            if (certs.length > 0) {
                hash = certs[0].hash
                certName = certs[0].certName

                const {
                    ownerId,
                    waltidCredentialId,
                } = certs[0]

                // Realm名に応じてユーザー情報を取得
                const { userId } = getRequestUserInfoFromOwnerId({
                    realmName,
                    kcUser,
                    kcToken,
                    ownerId,
                })

                // 個人ウォレットを取得
                const { wallet } = await hasPersonalWallet(
                    userId,
                    true
                )

                const walletId = wallet.waltidWallet

                // walt.idに証明書が存在するか確認
                try {
                    const existingCredential =
                        await wallet2Service.getCredential(
                            walletId,
                            waltidCredentialId
                        )

                    existCert = !!existingCredential
                } catch (error) {
                    if (String(error.status) === '404') {
                        logger.debug(
                            'Credential not found in walt.id.'
                        )
                    } else {
                        throw error
                    }
                }
            }
        }

        // 証明書を検証する
        result = await verifyCredentialJWT({
            decodedResult,
            hash,
            certName,
            existCert,
        })

        return result
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** verifyCredentialFile end ***')
    }
}

module.exports = {
    verifyCredential,
    verifyCredentialFile,
}
