import settings from '@/config/mapping_settings.yaml'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import { logger } from '@/lib/default-logger'

dayjs.extend(customParseFormat)

const { SYSTEM_RESERVED_KEYS } = settings

const DATE_FORMAT = 'YYYY/MM/DD HH:mm:ss'

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

  if (field.type === 'dateTime' && field.format) {
    const formatted = dayjs(value, field.format)
    return formatted.isValid() ? formatted.format(field.format) : ''
  }

  if (field.type === 'select' && Array.isArray(field.item)) {
    const item = field.item.find((i) => i.value === String(value))
    return item ? item.disp : value
  }

  return value
}

/**
 * disclosedClaims から、開示対象の項目のみを抽出する
 *
 * @param {Object} fieldMap 表示用フィールド Map
 * @param {Array} disclosedClaims 開示済み Claim
 * @returns {Array} 開示項目
 */
export const extractDisclosureFields = (fieldMap = {}, disclosedClaims = []) => {
  logger.debug('*** extractDisclosureFields ***')

  return disclosedClaims
    .map(([hash, key, rawValue]) => {
      const item = fieldMap[key]

      if (
        !item ||
        item.isDisclosure !== true ||
        rawValue === undefined ||
        rawValue === null ||
        rawValue === ''
      ) {
        return null
      }

      const label = item.name ?? ''
      const displayValue = formatValueByField(rawValue, item)

      return [hash, key, rawValue, label, displayValue]
    })
    .filter(Boolean)
}

/**
 * metadata claims と fieldsFormat から表示用フィールド Map を生成する
 *
 * metadata claims と fieldsFormat の両方に存在する項目のみを対象とする。
 * 表示順は metadata claims の定義順に従う。
 * 値の取得位置は metadata claims の path に従う。
 *
 * @param {Array} displayClaims Credential Metadata の claims
 * @param {Array} fieldsFormat フィールド定義
 * @returns {Object} 表示用フィールド Map
 */
export const createFieldMap = (displayClaims = [], fieldsFormat = []) => {
  logger.debug('*** createFieldMap ***')

  const fieldMap = {}

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

    // metadata claims の path の最後を field key として扱う
    const key = path[path.length - 1]

    if (!key) {
      return
    }

    const fieldFormat = fieldsFormatMap[key]

    // metadata claims と fieldsFormat の両方に存在する項目のみ対象とする
    if (!fieldFormat) {
      return
    }

    const { name: _name, ...restFieldFormat } = fieldFormat

    fieldMap[key] = {
      name,
      path,
      ...restFieldFormat,
    }
  })

  return fieldMap
}

/**
 * 基本情報と詳細情報を組み立てる
 *
 * credentialDetailsInfo は metadata claims の順序に従って生成する。
 * 各項目の値は metadata claims の path に従って取得する。
 *
 * @param {Object} fieldMap 表示用フィールド Map
 * @param {string} expirationDate 有効期限
 * @param {string} issuanceDate 発行日時
 * @param {string} typeDisplayName 証明書種類表示名
 * @param {string} certName 証明書名
 * @param {boolean} isBase4Info 基本4情報かどうか
 * @param {Object} credentialData Credential Data
 * @param {Array} disclosedClaims 開示済み Claim
 * @returns {Object} 証明書表示情報
 */
export const buildCredentialDisplayInfo = (
  fieldMap,
  expirationDate,
  issuanceDate,
  typeDisplayName,
  certName,
  isBase4Info = false,
  credentialData = {},
  disclosedClaims = []
) => {
  logger.debug('*** buildCredentialDisplayInfo ***')

  const credentialDetailsInfo = {}
  const disclosedClaimMap = {}

  if (Array.isArray(disclosedClaims) && disclosedClaims.length > 0) {
    disclosedClaims.forEach(([, key, value]) => {
      if (!key) {
        return
      }

      disclosedClaimMap[key] = {
        value,
        star: true,
      }
    })
  }

  Object.entries(fieldMap).forEach(([key, field]) => {
    // 基本情報として表示する項目は詳細情報には表示しない
    if (SYSTEM_RESERVED_KEYS.includes(key)) {
      return
    }

    const normalValue = getValueByPath(credentialData, field.path)
    const disclosedClaim = disclosedClaimMap[key]

    const value =
      disclosedClaim?.value !== undefined ? disclosedClaim.value : normalValue

    const star = disclosedClaim?.star || false

    if (value === null || value === undefined || value === '') {
      return
    }

    credentialDetailsInfo[key] = {
      label: field?.name || key,
      value: formatValueByField(value, field),
      ...(star ? { star: true } : {}),
    }
  })

  const certNameValue =
    certName ||
    getValueByPath(credentialData, fieldMap?.certName?.path) ||
    (isBase4Info ? '基本4情報' : '')

  const docIdValue = getValueByPath(credentialData, fieldMap?.docId?.path)

  const imageValue = getValueByPath(credentialData, fieldMap?.image?.path)

  const expirationDateValue =
    expirationDate ||
    getValueByPath(credentialData, fieldMap?.expirationDate?.path)

  const issuanceDateValue =
    issuanceDate ||
    getValueByPath(credentialData, fieldMap?.issuanceDate?.path)

  const credentialBasicInfo = {
    certName: {
      label: fieldMap?.certName?.name || '証明書名',
      value: certNameValue,
    },
    type: {
      label: fieldMap?.type?.name || '証明書種別',
      value: typeDisplayName || '',
    },
    docId: {
      label: fieldMap?.docId?.name || 'ドキュメントID',
      value: docIdValue || '',
    },
    imgUrl: {
      label: fieldMap?.image?.name || '証明書画像',
      value: imageValue || '',
    },
    expirationDate: {
      label: fieldMap?.expirationDate?.name || '有効期限',
      value: expirationDateValue
        ? dayjs(expirationDateValue).format(DATE_FORMAT)
        : '',
    },
    issuanceDate: {
      label: fieldMap?.issuanceDate?.name || '発行日時',
      value: issuanceDateValue
        ? dayjs(issuanceDateValue).format(DATE_FORMAT)
        : '',
    },
  }

  return {
    credentialBasicInfo,
    credentialDetailsInfo,
    isBase4Info,
  }
}

/**
 * 証明書情報抽出の共通処理
 *
 * metadata claims の path に従って証明書データから表示対象値を取得する。
 *
 * @param {Object} params パラメータ
 * @returns {Object} 証明書表示情報
 */
export const extractCertificateInfoBase = ({
  certName,
  certType,
  issuerDid,
  issuerName,
  credentialMetadata = {},
  certData,
  disclosedClaims = [],
  verifyResults = {},
  fieldsFormat = [],
  isSdJwt = false,
}) => {
  try {
    if (!certData) {
      return {
        success: false,
        error: {
          title: 'データエラー',
          message: '証明書データが提供されていません。',
        },
      }
    }

    const vc = isSdJwt ? certData : certData.vc

    if (!vc) {
      return {
        success: false,
        error: {
          title: 'フォーマットエラー',
          message: '証明書の形式が正しくありません。',
        },
      }
    }

    const issuer = {
      name: issuerName || '不明',
      did: issuerDid || vc?.issuer || certData?.issuer || '不明',
    }

    const displayClaims = credentialMetadata?.claims || []
    const typeDisplayName = credentialMetadata?.display?.[0]?.name || certType
    const fieldMap = createFieldMap(displayClaims, fieldsFormat)

    const isBase4Info = isSdJwt ? certType === 'b4d' : false

    // credentialInformation を固定取得しない
    // 証明書全体を対象に、metadata claims の path に従って値を取得する
    const credentialData = isSdJwt ? certData : vc

    // 有効期限・発行日時も metadata claims の path に従って取得する
    const expirationDate = getValueByPath(
      credentialData,
      fieldMap?.expirationDate?.path
    )

    const issuanceDate = getValueByPath(
      credentialData,
      fieldMap?.issuanceDate?.path
    )

    const displayInfo = buildCredentialDisplayInfo(
      fieldMap,
      expirationDate,
      issuanceDate,
      typeDisplayName,
      certName,
      isBase4Info,
      credentialData,
      disclosedClaims
    )

    return {
      success: true,
      data: {
        issuer,
        ...displayInfo,
        verifyResults: [
          {
            key: 'isCorrectFormat',
            label: 'フォーマット',
            value: verifyResults.isCorrectFormat ?? null,
          },
          {
            key: 'credentialExists',
            label: '真正性',
            value: verifyResults.credentialExists ?? null,
          },
          {
            key: 'isNotRevoked',
            label: '有効状態',
            value: verifyResults.isNotRevoked ?? null,
          },
          {
            key: 'issuerSignatureValid',
            label: '署名',
            value: verifyResults.issuerSignatureValid ?? null,
          },
          {
            key: 'isNotExpired',
            label: '有効期限切れ',
            value: verifyResults.isNotExpired ?? null,
          },
        ],
      },
    }
  } catch (error) {
    logger.error('extractCertificateInfoBase error.message: ', error.message)
    logger.error('extractCertificateInfoBase error.stack: ', error.stack)

    return {
      success: false,
      error: {
        title: '処理エラー',
        message: '証明書情報の取得に失敗しました。',
      },
    }
  }
}
