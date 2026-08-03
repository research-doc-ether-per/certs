
/**
 * VP 一覧取得 SQL を生成する
 *
 * @param {string} requestUrlTable Presentation Request URL テーブル名
 * @returns {string} SQL
 */
const createVpListSql = (requestUrlTable) => {
  return `
    SELECT
      a.state,
      a.user_id,
      b.type,
      b.format,
      a.create_date,
      a.update_date
    FROM vp a
      INNER JOIN ${requestUrlTable} b
        ON a.group_id = b.group_id
        AND a.state = b.state
    WHERE a.group_id = $1
    ORDER BY a.create_date DESC
  `
}

/**
 * VP 一覧を取得する
 *
 * @param {Object} params パラメータ
 * @param {string} params.groupId グループID
 * @returns {Promise<Object>} VP 一覧
 */
const listVerifiablePresentations = async (params) => {
  logger.debug('*** listVerifiablePresentations start ***')
  logger.debug('params: ', JSON.stringify(params, null, 2))

  const { groupId } = params

  try {
    const values = [groupId]

    const presentationRequestUrlSql = createVpListSql(
      'presentation_request_url'
    )

    const orgPresentationRequestUrlSql = createVpListSql(
      'org_presentation_request_url'
    )

    const { rows: presentationRows } =
      await walletDBService.walletDBPool.query(
        presentationRequestUrlSql,
        values
      )

    logger.debug(
      'presentationRows: ',
      JSON.stringify(presentationRows, null, 2)
    )

    const { rows: orgPresentationRows } =
      await walletDBService.walletDBPool.query(
        orgPresentationRequestUrlSql,
        values
      )

    logger.debug(
      'orgPresentationRows: ',
      JSON.stringify(orgPresentationRows, null, 2)
    )

    const datas = [
      ...presentationRows.map(mapRow),
      ...orgPresentationRows.map(mapRow),
    ].sort((a, b) => {
      return new Date(b.createDate) - new Date(a.createDate)
    })

    return { list: datas }
  } catch (error) {
    logger.error('error.message: ', error.message)
    logger.error('error.stack: ', error.stack)
    throw error
  } finally {
    logger.debug('*** listVerifiablePresentations end ***')
  }
}
