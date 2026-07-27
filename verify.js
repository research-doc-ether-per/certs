
/**
 * Presentation 対象の Credential 情報を生成する
 *
 * @param {Object[]} matchedCredentials Presentation Definition に一致した Credential 一覧
 * @returns {Promise<Object>} Presentation 対象 Credential 情報
 */
const createMatchedCredentialInfo = async (matchedCredentials = []) => {
  const selectedCredentials = []
  const rsIds = []
  const disclosures = {}

  for (const credential of matchedCredentials) {
    selectedCredentials.push(credential.id)

    if (credential.disclosures) {
      disclosures[credential.id] = Array.isArray(credential.disclosures)
        ? credential.disclosures
        : [credential.disclosures]
    }

    const datas = await walletDBService.select('vc_wallets', {
      waltid_credential_id: credential.id,
    })

    rsIds.push(datas[0]?.rsId)
  }

  return {
    selectedCredentials,
    disclosures,
    rsIds,
  }
}

const {
  selectedCredentials,
  disclosures,
  rsIds,
} = await createMatchedCredentialInfo(matchedCredentials)
