
/**
 * DB 取得行データをレスポンス用 object に変換する
 *
 * DB の snake_case キーを camelCase に変換する。
 * createDate / updateDate は UTC Unix 形式に変換する。
 * 値が存在しない場合は null を設定する。
 *
 * @param {Object} row
 * DB 取得行データ
 *
 * @returns {Object}
 * レスポンス用に変換した object
 */
const mapRow = (row) => {
  const result = {}

  for (const key in row) {
    const camelKey = toCamel(key)
    const value = toNullIfEmpty(row[key])

    if (camelKey === 'createDate' || camelKey === 'updateDate') {
      result[camelKey] = value ? convertToUtcUnix(value) : null
      continue
    }

    result[camelKey] = value
  }

  return result
}

然后这
