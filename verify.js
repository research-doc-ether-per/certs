
// claims の path を見て、フォーム項目 key -> 表示名 を作る
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
      fieldMap[key] = name
    }

    continue
  }

  if (path[1] !== 'credentialInformation') {
    const key = path[1]

    if (!SYSTEM_RESERVED_KEYS.includes(key)) {
      fieldMap[key] = name
    }
  }
}


const fields = result.data?.fields || []

const fieldsMap = fields.reduce((obj, field) => {
  if (field?.key) {
    obj[field.key] = field
  }

  return obj
}, {})

const filtered = Object.entries(fieldMap)
  .map(([key, label]) => {
    const field = fieldsMap[key]

    if (!field) {
      return null
    }

    return {
      ...field,
      label,
    }
  })
  .filter(Boolean)
