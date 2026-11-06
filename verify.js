
/**
 * vc_infoの変換処理。
 * @param {object} value 変換対象のJSONデータ
 * @param {object} context 移行対象情報
 * @param {object} row DBから取得したレコード情報
 * @returns {Promise<object>} 変換後のJSONデータ
 */
const transform = async (value, context, row) => {
    logger.debug('*** transform start ***')

    try {
        logger.debug('target : ', context)
        logger.debug('value : ', JSON.stringify(value, null, 2))
        logger.debug('row : ', JSON.stringify(row, null, 2))
