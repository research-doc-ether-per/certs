
const credentialInformation =
  credentialSubject?.credentialInformation || {}

const {
  issuanceDate,
  expirationDate,
} =
  prepareCredentialDates(
    credentialInformation.expirationDate
  )
/**
 * 有効期限を確認し、発行日時を取得する
 *
 * 有効期限が指定されている場合は、
 * 有効期限のフォーマットに合わせて発行日時を生成する。
 *
 * 有効期限が発行日時以前の場合はエラーとする。
 *
 * @param {string|null|undefined} expirationDate 有効期限
 * @returns {{
 *   issuanceDate: string,
 *   expirationDate: string|null
 * }} 発行日時および有効期限
 */
const prepareCredentialDates = (
  expirationDate
) => {
  // 有効期限が指定されていない場合
  if (!expirationDate) {
    return {
      issuanceDate: getCurrentISODate(),
      expirationDate: null,
    }
  }

  // 有効期限のフォーマットを取得する
  const formats = getFormatByDate(expirationDate)

  // 有効期限のフォーマットに合わせて発行日時を取得する
  const issuanceDate =
    getCurrentISODate(formats)

  // 有効期限が発行日時以前の場合はエラーとする
  if (
    isDateSameOrBefore(
      expirationDate,
      issuanceDate
    )
  ) {
    const error = new Error(
      `Invalid expirationDate: ${expirationDate}`
    )

    error.code = 'InvalidParamsError'
    error.params = [expirationDate]

    throw error
  }

  return {
    issuanceDate,
    expirationDate,
  }
}

/**
 * Status List URLを準備する
 *
 * Status Listが未作成の場合は新規作成する。
 *
 * @param {Object} params パラメーター
 * @param {Object} params.walletDBService Wallet DBサービス
 * @param {string} params.groupId グループID
 * @param {string} params.type 証明書タイプ
 * @param {Function} params.createBSL Status List作成処理
 * @returns {Promise<{
 *   exists: boolean,
 *   statusListUrl: string|null
 * }>} Status List情報
 */
const prepareStatusListUrl = async ({
  walletDBService,
  groupId,
  type,
  createBSL,
}) => {
  // Status Listが作成済みか確認する
  const exists = await walletDBService.exists(
    'status_list',
    {
      group_id: groupId,
      type,
    }
  )

  // 作成済みの場合は新規作成しない
  if (exists) {
    return {
      exists: true,
      statusListUrl: null,
    }
  }

  // Status Listを新規作成する
  const statusListUrl = await createBSL(type)

  return {
    exists: false,
    statusListUrl,
  }
}
