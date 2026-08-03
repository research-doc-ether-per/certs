/**
 * metadata claims と fieldsFormat から表示用フィールド Map を生成する
 *
 * metadata claims と fieldsFormat の両方に存在する項目のみを対象とする。
 * 表示順は metadata claims の定義順に従う。
 *
 * @param {Array} displayClaims Credential Metadata の claims
 * @param {Array} fieldsFormat フィールド定義
 * @returns {Object} 表示用フィールド Map
 */
export const createFieldMap = (displayClaims = [], fieldsFormat = []) => {
  const fieldMap = {}
  const credentialSubjectMap = {}

  const fieldsFormatMap = fieldsFormat.reduce((result, item) => {
    if (item?.key) {
      result[item.key] = item
    }

    return result
  }, {})

  displayClaims.forEach(({ path, display }) => {
    if (
      !Array.isArray(path) ||
      path.length === 0 ||
      !Array.isArray(display) ||
      display.length === 0
    ) {
      return
    }

    const name = display?.[0]?.name

    if (!name) {
      return
    }

    // credentialSubject 配下
    if (path[0] === 'credentialSubject') {
      let key = null

      if (path[1] === 'credentialInformation' && path.length > 2) {
        key = path[2]
      } else if (path[1] !== 'credentialInformation') {
        key = path[1]
      }

      if (!key || SYSTEM_RESERVED_KEYS.includes(key)) {
        return
      }

      const fieldFormat = fieldsFormatMap[key]

      if (!fieldFormat) {
        return
      }

      const { name: _name, ...restFieldFormat } = fieldFormat

      credentialSubjectMap[key] = {
        name,
        ...restFieldFormat,
      }

      return
    }

    // credentialSubject 以外
    const key = path[0]

    if (!key || SYSTEM_RESERVED_KEYS.includes(key)) {
      return
    }

    const fieldFormat = fieldsFormatMap[key]

    if (!fieldFormat) {
      return
    }

    const { name: _name, ...restFieldFormat } = fieldFormat

    fieldMap[key] = {
      name,
      ...restFieldFormat,
    }
  })

  fieldMap.credentialSubject =
    Object.keys(credentialSubjectMap).length > 0 ? credentialSubjectMap : {}

  return fieldMap
}
