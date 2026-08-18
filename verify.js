// /**
//  * fieldsFormat を key 単位の Map に変換する
//  *
//  * @param {Object[]} fieldsFormat フィールド定義
//  * @returns {Object} フィールド定義 Map
//  */
// const createFieldsFormatMap = (fieldsFormat = []) => {
//   return fieldsFormat.reduce((result, field) => {
//     if (field?.key) {
//       result[field.key] = field
//     }

//     return result
//   }, {})
// }

// /**
//  * metadata claims と fieldsFormat から表示用フィールド一覧を生成する
//  *
//  * metadata claims と fieldsFormat の両方に存在する項目のみを対象とする。
//  * 表示順は metadata claims の定義順に従う。
//  *
//  * @param {Object[]} claims Credential Metadata の claims
//  * @param {Object[]} fieldsFormat フィールド定義
//  * @returns {Object[]} 表示用フィールド一覧
//  */
// export const createDisplayFields = (claims = [], fieldsFormat = []) => {
//   const fieldsFormatMap = createFieldsFormatMap(fieldsFormat)

//   return claims
//     .map((claim) => {
//       const path = claim?.path
//       const display = claim?.display
//       const label = display?.[0]?.name

//       if (!Array.isArray(path) || path.length === 0 || !label) {
//         return null
//       }

//       const key = path[path.length - 1]

//       if (!key || DISPLAY_EXCLUDE_KEYS.includes(key)) {
//         return null
//       }

//       const fieldFormat = fieldsFormatMap[key]

//       if (!fieldFormat) {
//         return null
//       }

//       return {
//         key,
//         label,
//         path,
//         fieldFormat,
//       }
//     })
//     .filter(Boolean)
// }


// // const displayFields = createDisplayFields(
// //   credentialMetadataClaims,
// //   fieldsFormat
// // )


// /**
//  * path から値を取得する
//  *
//  * @param {Object} target 対象 object
//  * @param {string[]} path 取得対象 path
//  * @returns {*} 取得値
//  */
// const getValueByPath = (target = {}, path = []) => {
//   return path.reduce((current, key) => {
//     if (current === null || current === undefined) {
//       return undefined
//     }

//     return current[key]
//   }, target)
// }

// /**
//  * 表示用証明書内容を生成する
//  *
//  * @param {Object} params パラメータ
//  * @param {Object} params.credential Credential payload
//  * @param {Object[]} params.displayFields 表示用フィールド一覧
//  * @returns {Object[]} 表示用証明書内容
//  */
// export const createDisplayContents = ({ credential = {}, displayFields = [] }) => {
//   return displayFields
//     .map((field) => {
//       const value = getValueByPath(credential, field.path)

//       if (value === null || value === undefined || value === '') {
//         return null
//       }

//       return {
//         key: field.key,
//         label: field.label,
//         value,
//         fieldFormat: field.fieldFormat,
//       }
//     })
//     .filter(Boolean)
// }



// /**
//  * object に path 指定で値を設定する
//  *
//  * @param {Object} target 設定対象 object
//  * @param {string[]} path 設定対象 path
//  * @param {*} value 設定値
//  */
// const setValueByPath = (target, path = [], value) => {
//   let current = target

//   path.forEach((key, index) => {
//     const isLast = index === path.length - 1

//     if (isLast) {
//       current[key] = value
//       return
//     }

//     if (!current[key] || typeof current[key] !== 'object') {
//       current[key] = {}
//     }

//     current = current[key]
//   })
// }

// /**
//  * metadata claims と入力データから Credential 登録用 object を生成する
//  *
//  * metadata claims の path に従って階層構造を生成する。
//  * fieldsFormat に存在しない項目、および除外対象 key は設定しない。
//  *
//  * @param {Object} params パラメータ
//  * @param {Object} params.formData 入力データ
//  * @param {Object[]} params.claims Credential Metadata の claims
//  * @param {Object[]} params.fieldsFormat フィールド定義
//  * @returns {Object} Credential 登録用 object
//  */
// export const createCredentialSubjectPayload = ({
//   formData = {},
//   claims = [],
//   fieldsFormat = [],
// }) => {
//   const payload = {}
//   const fieldsFormatMap = createFieldsFormatMap(fieldsFormat)

//   claims.forEach((claim) => {
//     const path = claim?.path

//     if (!Array.isArray(path) || path.length === 0) {
//       return
//     }

//     const key = path[path.length - 1]

//     if (!key || DISPLAY_EXCLUDE_KEYS.includes(key)) {
//       return
//     }

//     if (!fieldsFormatMap[key]) {
//       return
//     }

//     const value = formData[key]

//     if (value === null || value === undefined || value === '') {
//       return
//     }

//     setValueByPath(payload, path, value)
//   })

//   return payload
// }


// const credentialPayload = createCredentialSubjectPayload({
//   formData,
//   claims,
//   fieldsFormat,
// })



// 証明書設定から、type名・表示名・fieldMap を作成する
const onSelectConfiguration = (key, configurations, typeDisplayNameObj) => {
  const configuration = configurations[key]
  const endsKey = `_${configuration.format}`
  const type = key.replace(endsKey, '')
  const parts = key.endsWith(endsKey) ? key.split(endsKey) : []
  const displayClaims = configuration?.credential_metadata?.claims || []

  const fieldMap = {}
  const fieldPathMap = {}

  // claims の path を見て、フォーム項目 key・表示名・path を作る
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

    const name = display?.[0]?.name

    if (!name) {
      continue
    }

    const fieldKey = path[path.length - 1]

    if (!fieldKey || SYSTEM_RESERVED_KEYS.includes(fieldKey)) {
      continue
    }

    fieldMap[fieldKey] = name
    fieldPathMap[fieldKey] = path
  }

  return {
    format: configuration.format,
    credential_configuration_id: key,
    type: parts[0],
    credentialTypeDispName: typeDisplayNameObj[type],
    fieldMap,
    fieldPathMap,
  }
}

const filtered = Object.entries(fieldMap)
  .map(([key, label]) => {
    const field = fieldsMap[key]

    if (!field) {
      return null
    }

    return {
      ...field,
      label,
      path: selectedConfigurations.fieldPathMap?.[key],
    }
  })
  .filter(Boolean)

/**
 * 指定された path に従って object に値を設定する
 *
 * 例：
 * path が ['credentialSubject', 'credentialInformation', 'organization'] の場合、
 * target.credentialSubject.credentialInformation.organization に value を設定する。
 *
 * @param {Object} target 設定対象 object
 * @param {string[]} path 設定対象 path
 * @param {*} value 設定値
 */
const setValueByPath = (target, path = [], value) => {
  if (!target || !Array.isArray(path) || path.length === 0) {
    return
  }

  let current = target

  path.forEach((pathKey, index) => {
    const isLast = index === path.length - 1

    // 最後の path の場合、値を設定する
    if (isLast) {
      current[pathKey] = value
      return
    }

    // 中間階層が存在しない場合は object を作成する
    if (!current[pathKey] || typeof current[pathKey] !== 'object') {
      current[pathKey] = {}
    }

    current = current[pathKey]
  })
}

/**
 * 空値かどうか判定する
 *
 * @param {*} value 判定対象値
 * @returns {boolean} 空値の場合 true
 */
const isEmptyValue = (value) => {
  return value === null || value === undefined || value === ''
}

/**
 * Credential 発行用の credentialData を生成する
 *
 * metadata claims の path に従って、入力データを credentialData の階層構造に設定する。
 *
 * @returns {Object} Credential 発行用 credentialData
 */
const createCredentialData = () => {
  const credentialData = {
    type: selectedConfigurations?.type,
  }

  fetchedCredentialFields.forEach((field) => {
    const value = dynamicFormData?.[field.key]

    // 未入力項目は credentialData に設定しない
    if (isEmptyValue(value)) {
      return
    }

    // metadata claims の path が存在しない場合は設定しない
    if (!Array.isArray(field.path) || field.path.length === 0) {
      return
    }

    setValueByPath(credentialData, field.path, value)
  })

  return credentialData
}


const credentialData = createCredentialData()
