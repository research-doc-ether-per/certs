/**
 * 値が存在しない場合は null に変換する
 *
 * @param {*} value
 * 変換対象の値
 *
 * @returns {*}
 * 値が存在する場合は元の値を返却し、存在しない場合は null を返却する
 */
const toNullIfEmpty = (value) => {
  if (value === undefined || value === null || value === '') {
    return null
  }

  return value
}

/**
 * DB 取得データをレスポンス用に変換する
 *
 * createDate / updateDate は UTC Unix 形式に変換する。
 * 値が存在しない場合は null を設定する。
 *
 * @param {Object} data
 * DB 取得データ
 *
 * @returns {Object}
 * 変換後のデータ
 */
const convertResponseData = (data = {}) => {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => {
      const convertedValue = toNullIfEmpty(value)

      if (key === 'createDate' || key === 'updateDate') {
        return [
          key,
          convertedValue ? convertToUtcUnix(convertedValue) : null,
        ]
      }

      return [key, convertedValue]
    })
  )
}
