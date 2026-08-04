/**
 * 基本情報と詳細情報を組み立てる
 *
 * credentialDetailsInfo は metadata claims の順序に従って生成する。
 *
 * @param {Object} params パラメータ
 * @param {Object} params.fieldMap 表示用フィールド Map
 * @param {string} params.expirationDate 有効期限
 * @param {string} params.issuanceDate 発行日時
 * @param {string} params.typeDisplayName 証明書種類表示名
 * @param {string} params.certName 証明書名
 * @param {boolean} params.isBase4Info 基本4情報かどうか
 * @param {Object} params.credentialInfo 証明書詳細情報
 * @param {Array} params.disclosedClaims 開示済み Claim
 * @returns {Object} 証明書表示情報
 */
export const buildCredentialDisplayInfo = ({
  fieldMap,
  expirationDate,
  issuanceDate,
  typeDisplayName,
  certName,
  isBase4Info = false,
  credentialInfo = {},
  disclosedClaims = [],
}) => {
  const credentialSubjectMap = fieldMap?.credentialSubject || {}
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

  Object.entries(credentialSubjectMap).forEach(([key, field]) => {
    const normalValue = credentialInfo?.[key]
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

  const credentialBasicInfo = {
    certName: {
      label: credentialSubjectMap?.certName?.name || '証明書名',
      value:
        certName ||
        credentialInfo?.certName ||
        (isBase4Info ? '基本4情報' : ''),
    },
    type: {
      label: credentialSubjectMap?.type?.name || '証明書種別',
      value: typeDisplayName || '',
    },
    docId: {
      label: credentialInfo?.docId?.name || 'ドキュメントID',
      value: credentialInfo?.docId || '',
    },
    imgUrl: {
      label: fieldMap?.image?.name || '証明書画像',
      value: isBase4Info
        ? credentialDetailsInfo?.image?.value
        : credentialInfo?.image || '',
    },
    expirationDate: {
      label: fieldMap?.expirationDate?.name || '有効期限',
      value: expirationDate ? dayjs(expirationDate).format(DATE_FORMAT) : '',
    },
    issuanceDate: {
      label: fieldMap?.issuanceDate?.name || '発行日時',
      value: issuanceDate ? dayjs(issuanceDate).format(DATE_FORMAT) : '',
    },
  }

  return {
    credentialBasicInfo,
    credentialDetailsInfo,
    isBase4Info,
  }
}
