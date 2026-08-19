
const DATE_INPUT_FORMATS = [
  'YYYY-MM-DD',
  'YYYY/MM/DD',
  'YYYYMMDD',
  'YYYY-MM-DDTHH:mm:ssZ',
  'YYYY-MM-DDTHH:mm:ss.SSSZ',
]

/**
 * 値をフィールド定義に応じて変換する
 *
 * @param {*} value 変換対象値
 * @param {Object} field フィールド定義
 * @returns {string} 変換後の表示値
 */
const formatValueByField = (value, field) => {
  logger.debug('*** formatValueByField ***')

  if (!field || value === null || value === undefined || value === '') {
    return value || ''
  }

  const fieldType = String(field.type || '').toLowerCase()

  if ((fieldType === 'datetime' || fieldType === 'date') && field.format) {
    const stringValue = String(value)

    const formatted = dayjs(stringValue, DATE_INPUT_FORMATS, true)

    if (formatted.isValid()) {
      return formatted.format(field.format)
    }

    const fallbackFormatted = dayjs(stringValue)

    return fallbackFormatted.isValid()
      ? fallbackFormatted.format(field.format)
      : stringValue
  }

  if (field.type === 'select' && Array.isArray(field.item)) {
    const item = field.item.find((i) => i.value === String(value))
    return item ? item.disp : value
  }

  return value
}
