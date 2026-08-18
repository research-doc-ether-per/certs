
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
 * 指定された path に従って object に値を設定する
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

const claimPathMap = {}

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

  if (!fieldKey) {
    continue
  }

  // credentialData 生成用として、reserved key も含めて path を保持する
  claimPathMap[fieldKey] = path

  // 画面表示用 fieldMap には reserved key を含めない
  if (SYSTEM_RESERVED_KEYS.includes(fieldKey)) {
    continue
  }

  fieldMap[fieldKey] = name
  fieldPathMap[fieldKey] = path
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

  const claimPathMap = selectedConfigurations?.claimPathMap || {}

  // 動的フォーム項目を credentialData に設定する
  fetchedCredentialFields.forEach((field) => {
    const value = dynamicFormData?.[field.key]

    if (isEmptyValue(value)) {
      return
    }

    if (!Array.isArray(field.path) || field.path.length === 0) {
      return
    }

    setValueByPath(credentialData, field.path, value)
  })

  // 有効期限が設定されている場合、metadata claims の path に従って設定する
  if (credentialForm.expirationDate && claimPathMap.expirationDate) {
    const expirationDate = dayjs(credentialForm.expirationDate)
      .endOf('day')
      .format('YYYY-MM-DDTHH:mm:ss.SSSZ')

    setValueByPath(credentialData, claimPathMap.expirationDate, expirationDate)
  }

  // 証明書画像が設定されている場合、metadata claims の path に従って設定する
  if (credentialForm.credentialImage && claimPathMap.image) {
    setValueByPath(
      credentialData,
      claimPathMap.image,
      credentialForm.credentialImage
    )
  }

  // 証明書名が metadata claims に定義されている場合、必要に応じて設定する
  if (credentialForm.certName && claimPathMap.certName) {
    setValueByPath(credentialData, claimPathMap.certName, credentialForm.certName)
  }

  return credentialData
}


/**
 * selectiveDisclosure に path 指定で sd 設定を追加する
 *
 * @param {Object} target selectiveDisclosure.fields
 * @param {string[]} path disclosure 対象 path
 */
const setDisclosureByPath = (target, path = []) => {
  if (!target || !Array.isArray(path) || path.length === 0) {
    return
  }

  let currentFields = target

  path.forEach((pathKey, index) => {
    const isLast = index === path.length - 1

    if (isLast) {
      currentFields[pathKey] = {
        sd: true,
      }
      return
    }

    if (!currentFields[pathKey]) {
      currentFields[pathKey] = {
        sd: false,
        children: {
          fields: {},
        },
      }
    }

    if (!currentFields[pathKey].children) {
      currentFields[pathKey].children = {
        fields: {},
      }
    }

    if (!currentFields[pathKey].children.fields) {
      currentFields[pathKey].children.fields = {}
    }

    currentFields = currentFields[pathKey].children.fields
  })
}

/**
 * selectiveDisclosure を生成する
 *
 * disclosure 対象項目の path に従って disclosure 設定を生成する。
 *
 * @returns {Object} selectiveDisclosure
 */
const createSelectiveDisclosure = () => {
  if (selectedConfigurations?.format !== 'vc+sd-jwt') {
    return {}
  }

  const sdFields = fetchedCredentialFields?.filter((field) => {
    return field.isDisclosure && Array.isArray(field.path)
  })

  if (!sdFields || sdFields.length === 0) {
    return {
      fields: {},
    }
  }

  const selectiveDisclosure = {
    fields: {},
  }

  sdFields.forEach((field) => {
    setDisclosureByPath(selectiveDisclosure.fields, field.path)
  })

  return selectiveDisclosure
}


/**
 * プレビュー用データを作成する
 *
 * @returns {Object|null} プレビュー用データ
 */
const buildPreviewData = () => {
  if (!selectedConfigurations) {
    return null
  }

  const credentialData = createCredentialData()
  const selectiveDisclosure = createSelectiveDisclosure()

  return {
    offerData: {
      credentialConfigurationId:
        selectedConfigurations?.credential_configuration_id,
      credentialData,
      selectiveDisclosure,
      authenticationMethod: authType.toUpperCase(),
    },
    category: selectedConfigurations?.type,
    certName: credentialForm.certName,
  }
}
