/**
 * Grant Type に応じてトークン取得用リクエストデータを生成する
 *
 * @param {Object} params パラメータ
 * @param {string} params.grantType Grant Type
 * @param {string} params.clientId Client ID
 * @param {string} params.state State
 * @param {string} params.code Authorization Code
 * @param {string} params.preAuthorizedCode Pre Authorized Code
 * @returns {Object} トークン取得用リクエストデータ
 */
const createTokenRequestData = ({
  grantType,
  clientId,
  state,
  code,
  preAuthorizedCode,
}) => {
  switch (grantType) {
    case GRANT_TYPES.PRE_AUTH:
      return {
        grant_type: grantType,
        'pre-authorized_code': preAuthorizedCode,
      }

    case GRANT_TYPES.AUTH_CODE:
      return {
        grant_type: grantType,
        client_id: clientId,
        state,
        code,
      }

    default: {
      const error = new Error(`Unsupported grant type. grantType: ${grantType}`)
      error.code = 'InvalidParamsError'
      error.params = [grantType]

      throw error
    }
  }
}

const tokenRequestData = createTokenRequestData({
  grantType,
  clientId,
  state,
  code,
  preAuthorizedCode,
})


const CREDENTIAL_OFFER_URL_EXPIRED_DESCRIPTION =
  'No authorization session found for given authorization code, or session expired.'

/**
 * Credential Offer URL 期限切れエラーか判定し、必要に応じてエラーコードを設定する
 *
 * @param {Error} error エラー
 * @returns {Error} エラー
 */
const setCredentialOfferUrlExpiredErrorCode = (error) => {
  if (
    String(error.status) === '400' &&
    error.response?.data?.error_description ===
      CREDENTIAL_OFFER_URL_EXPIRED_DESCRIPTION
  ) {
    error.code = 'CredentialOfferUrlExpiredError'
  }

  return error
}

// } catch (error) {
//   throw setCredentialOfferUrlExpiredErrorCode(error)
// }

/**
 * VC 発行用リクエストデータを生成する
 *
 * @param {Object} params パラメータ
 * @param {string} params.format VC フォーマット
 * @param {Object} params.credentialDefinition Credential Definition
 * @param {string} params.vct VCT
 * @param {string} params.jwt Proof JWT
 * @returns {Object} VC 発行用リクエストデータ
 */
const createCredentialRequestData = ({
  format,
  credentialDefinition,
  vct,
  jwt,
}) => {
  return {
    format,
    ...(format === FORMAT_TYPES.VC_SD_JWT
      ? { vct }
      : { credential_definition: credentialDefinition }),
    proof: {
      proof_type: 'jwt',
      jwt,
    },
  }
}

const credentialRequestData = createCredentialRequestData({
  format,
  credentialDefinition,
  vct,
  jwt,
})

/**
 * VC JWT を検証し、デコード結果を取得する
 *
 * @param {string} credential VC JWT
 * @returns {Object} デコード結果
 */
const decodeCredential = (credential) => {
  try {
    return validateAndDecodeVcJwt(credential)
  } catch (error) {
    error.code = 'CertificateAddFailedError'
    throw error
  }
}

const decodedResult = decodeCredential(credential)
const { document, disclosures, payload } = decodedResult


/**
 * VC payload から Status List 情報を取得する
 *
 * @param {Object} payload VC payload
 * @returns {Object} Status List 情報
 */
const getStatusListInfoFromPayload = (payload = {}) => {
  const revocationStatus = payload?.credentialStatus?.[0]
  const statusListCredential = revocationStatus?.statusListCredential

  const splitted =
    statusListCredential?.split('/vcUrls/')[1]?.split(/\?credential\b/)[0] ||
    null

  const statusListUrl =
    splitted?.replace(/%25([0-9A-Fa-f]{2})/g, '%$1') || null

  const matched = statusListUrl?.match(/\/([^/]+)\/revocation\/\d+(?:\/|$)/)
  const type = matched ? matched[1] : null

  return {
    revocationStatus,
    statusListCredential,
    statusListUrl,
    type,
  }
}

const {
  revocationStatus,
  statusListUrl,
  type,
} = getStatusListInfoFromPayload(payload)

/**
 * Issuer DID からグループIDを取得する
 *
 * @param {string} issuerDid Issuer DID
 * @param {string} userId ユーザID
 * @returns {Promise<string>} グループID
 */
const getGroupIdByIssuerDid = async (issuerDid, userId) => {
  const issuerData = await walletDBService.select('issuer', {
    did: issuerDid,
  })

  logger.debug('issuerData: ', issuerData)

  const groupId = issuerData?.[0]?.groupId || null

  if (!groupId) {
    const error = new Error(`User does not have a groupId. userId: ${userId}`)
    error.code = 'ResourceNotFoundError'
    error.params = [userId]

    throw error
  }

  return groupId
}

const groupId = await getGroupIdByIssuerDid(payload?.issuer, userId)
