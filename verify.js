const getFieldsFormat = (credentialType, fields = [], isB4d = false) => {
  const configuration = credentialConfigurations[credentialType]
  const displayClaims = configuration?.claims || []
  const certName = configuration?.display?.[0]?.name

  const displayFieldList = []

  // metadata claims の順序で表示項目を抽出する
  for (let index = 0; index < displayClaims.length; index++) {
    const { path, display } = displayClaims[index]

    if (
      !Array.isArray(path) ||
      path.length === 0 ||
      !Array.isArray(display) ||
      display.length === 0
    ) {
      continue
    }

    if (path[0] !== 'credentialSubject') {
      continue
    }

    const name = display?.[0]?.name

    if (!name) {
      continue
    }

    if (path[1] === 'credentialInformation' && path.length > 2) {
      const key = path[2]

      if (!SYSTEM_RESERVED_KEYS.includes(key)) {
        displayFieldList.push({
          key,
          name,
        })
      }

      continue
    }

    if (path[1] !== 'credentialInformation') {
      const key = path[1]

      if (!SYSTEM_RESERVED_KEYS.includes(key)) {
        displayFieldList.push({
          key,
          name,
        })
      }
    }
  }

  const fieldsMap = fields.reduce((result, field) => {
    if (field?.key) {
      result[field.key] = field
    }

    return result
  }, {})

  const mergedFields = displayFieldList
    .map(({ key, name }) => {
      const field = fieldsMap[key]

      if (!field) {
        return null
      }

      // 基本4情報以外の場合、image 項目は詳細情報に表示しない
      if (!isB4d && key === 'image') {
        return null
      }

      return {
        ...field,
        name,
      }
    })
    .filter(Boolean)

  return {
    certName,
    fieldsFormat: mergedFields,
  }
}
