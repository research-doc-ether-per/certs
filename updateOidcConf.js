/**
 * path から値を取得する
 *
 * @param {Object} target 対象 object
 * @param {string[]} path 取得対象 path
 * @returns {*} 取得値
 */
const getValueByPath = (target = {}, path = []) => {
  if (!target || !Array.isArray(path) || path.length === 0) {
    return undefined
  }

  return path.reduce((current, key) => {
    if (current === null || current === undefined) {
      return undefined
    }

    return current[key]
  }, target)
}

/**
 * path に従って object に値を設定する
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

  path.forEach((key, index) => {
    const isLast = index === path.length - 1

    if (isLast) {
      current[key] = value
      return
    }

    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {}
    }

    current = current[key]
  })
}

/**
 * metadata claims から指定 key の path を取得する
 *
 * @param {Object[]} claims Credential Metadata claims
 * @param {string} targetKey 取得対象 key
 * @returns {string[]|null} path
 */
const getClaimPathByKey = (claims = [], targetKey) => {
  if (!Array.isArray(claims) || !targetKey) {
    return null
  }

  const claim = claims.find((item) => {
    const path = item?.path

    if (!Array.isArray(path) || path.length === 0) {
      return false
    }

    return path[path.length - 1] === targetKey
  })

  return claim?.path || null
}

const credentialMetadata =
  supportedCredentialTypes?.[credentialConfigurationId]?.credential_metadata

const claims = credentialMetadata?.claims || []

const expirationDatePath = getClaimPathByKey(claims, 'expirationDate')
const issuanceDatePath = getClaimPathByKey(claims, 'issuanceDate')

const inputExpirationDate = getValueByPath(
  credentialData,
  expirationDatePath
)

const { issuanceDate, expirationDate } = prepareCredentialDates(
  inputExpirationDate
)
