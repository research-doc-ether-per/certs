
/**
 * 証明書および Issuer 情報を取得する
 *
 * @param {Object} params パラメータ
 * @param {string} params.userId ユーザID
 * @param {string} [params.docId] 証明書ID
 * @param {string} [params.credentialOfferUrl] Credential Offer URL
 * @returns {Promise<Object>} 証明書および Issuer 情報
 */
const getCredentialIssuerInfo = async ({
  userId,
  docId,
  credentialOfferUrl,
}) => {
  let sql = ''
  const values = [userId]

  sql += 'SELECT a.*, '
  sql += 'b.name, '
  sql += 'b.did, '
  sql += 'c.user_id '
  sql += 'FROM add_cert a '
  sql += 'INNER JOIN issuer b ON b.group_id = a.group_id '
  sql += 'INNER JOIN add_cert_user c ON c.doc_id = a.doc_id AND c.group_id = a.group_id '
  sql += 'WHERE c.user_id = $1 '

  if (credentialOfferUrl) {
    sql += 'AND a.credential_offer_url = $2 '
    values.push(credentialOfferUrl)
  } else if (docId) {
    sql += 'AND a.doc_id = $2 '
    values.push(docId)
  } else {
    const error = new Error('Either docId or credentialOfferUrl is required.')
    error.code = 'InvalidParamsError'
    error.params = []

    throw error
  }

  logger.debug('sql: ', sql)

  const { rows } = await walletDBService.walletDBPool.query(sql, values)
  const datas = rows.map(mapRow)

  logger.debug('credential issuer datas: ', JSON.stringify(datas, null, 2))

  if (datas.length === 0) {
    const error = new Error(
      `Does not have issuer info. docId: ${docId}, credentialOfferUrl: ${credentialOfferUrl}`
    )
    error.code = 'ResourceNotFoundError'
    error.params = [docId, credentialOfferUrl]

    throw error
  }

  return datas[0]
}

/**
 * Issuer API を呼び出して Credential Offer URL を発行する
 *
 * @param {Object} params パラメータ
 * @param {string} params.groupId グループID
 * @param {string} params.docId 証明書ID
 * @param {Object} params.kcUser Keycloak ユーザ情報
 * @returns {Promise<string>} Credential Offer URL
 */
const issueCredentialOfferUrl = async ({ groupId, docId, kcUser }) => {
  const accessToken = await getPatToken(kcUser?.iss)

  const targetIssuer = issuers?.[groupId]
  const api = targetIssuer.apis.credentialOfferUrl.replace(':groupId', groupId)
  const url = targetIssuer.url + api

  logger.debug('url: ', url)

  const response = await handlePost(url, accessToken, {
    docId,
    userName: kcUser?.preferred_username,
  })

  const status = response?.status ?? 500

  logger.debug('response.status: ', status)

  if (status !== 201) {
    const error = new Error('Failed to get credential offer url.')
    error.code = 'InternalServerError'
    throw error
  }

  return response.data.url
}

const credentialIssuerInfo = await getCredentialIssuerInfo({
  userId: kcUser?.preferred_username,
  docId: _docId,
  credentialOfferUrl: _credential_offer_url,
})

const {
  certName,
  docId,
  imageUrl,
  name,
  did: issuerDid,
  groupId,
} = credentialIssuerInfo

let credential_offer_url = credentialIssuerInfo.credentialOfferUrl

if (!credential_offer_url) {
  credential_offer_url = await issueCredentialOfferUrl({
    groupId,
    docId,
    kcUser,
  })
}

const {
  credentialIssuer,
  grants,
  credentialConfigurationIds,
  credentialDefinition,
  vct,
  format,
} = await getCredentialOfferDetails(credential_offer_url)


