/**
 * Presentation Request URL から state を取得する
 *
 * @param {string} presentationRequestUrl Presentation Request URL
 * @returns {string} state
 */
const getStateFromPresentationRequestUrl = (presentationRequestUrl) => {
  const urlObj = new URL(presentationRequestUrl)
  const state = urlObj.searchParams.get('state')

  if (!state) {
    const error = new Error(
      'Presentation request URL missing state parameter'
    )
    error.code = 'ResourceNotFoundError'
    error.params = []

    throw error
  }

  return state
}

const state = getStateFromPresentationRequestUrl(_url)


/**
 * Verifier API を呼び出して Presentation Request URL を発行する
 *
 * @param {Object} params パラメータ
 * @param {string} params.realmName Realm 名
 * @param {string} params.groupId グループID
 * @param {string} params.id Presentation Request ID
 * @param {string} params.userName ユーザ名
 * @returns {Promise<string>} Presentation Request URL
 */
const issuePresentationRequestUrl = async ({
  realmName,
  groupId,
  id,
  userName,
}) => {
  const accessToken = await getWalletApiPatToken({ realmName })

  const targetVerifier = verifiers?.[groupId]
  const api = targetVerifier.apis.presentationRequestURL.replace(
    ':groupId',
    groupId
  )
  const requestUrl = targetVerifier.url + api

  logger.debug('requestUrl: ', requestUrl)

  const response = await handlePost(requestUrl, accessToken, {
    id,
    userName,
  })

  const status = response?.status ?? 500

  logger.debug('response.status: ', status)

  if (status !== 201) {
    const error = new Error('Failed to get presentation request url.')
    error.code = 'InternalServerError'

    throw error
  }

  return response.data.url
}

if (!url) {
  url = await issuePresentationRequestUrl({
    realmName,
    groupId,
    id,
    userName: kcUser?.preferred_username,
  })
}


/**
 * Presentation Request 情報を取得する
 *
 * @param {Object} params パラメータ
 * @param {string} params.userId リクエスト用ユーザID
 * @param {string} [params.url] Presentation Request URL
 * @param {string} [params.id] Presentation Request ID
 * @returns {Promise<Object>} Presentation Request 情報
 */
const getPresentationRequestInfo = async ({ userId, url, id }) => {
  let sql = ''
  let values = []

  if (url) {
    const state = getStateFromPresentationRequestUrl(url)

    sql += 'SELECT a.* '
    sql += 'FROM presentation_request_url a '
    sql += 'INNER JOIN presentation_request_url_user b ON b.request_id = a.id '
    sql += 'WHERE a.state = $1 AND b.user_id = $2 '

    values = [state, userId]
  } else {
    sql += 'SELECT a.*, '
    sql += 'b.name, '
    sql += 'c.user_id '
    sql += 'FROM presentation_request_url a '
    sql += 'INNER JOIN verifier b ON b.group_id = a.group_id '
    sql += 'INNER JOIN presentation_request_url_user c ON c.request_id = a.id '
    sql += 'WHERE a.presentation_request_url IS NULL '
    sql += 'AND a.id = $1 '
    sql += 'AND c.user_id = $2 '

    values = [id, userId]
  }

  logger.debug('sql: ', sql)

  const { rows } = await walletDBService.walletDBPool.query(sql, values)

  if (rows.length === 0) {
    const error = new Error(
      url
        ? `Does not have a presentation request info. url: ${url}`
        : `Presentation request does not exist. id: ${id}`
    )
    error.code = url ? 'ResourceNotFoundError' : 'InvalidParamsError'
    error.params = url ? [url] : [id]

    throw error
  }

  return mapRow(rows[0])
}

const presentationRequestInfo = await getPresentationRequestInfo({
  userId: requestUserId,
  url: _url,
  id,
})

let groupId = presentationRequestInfo.groupId || null
let url = _url || presentationRequestInfo.presentationRequestUrl

