/**
 * Status List情報を登録する
 *
 * @param {Object} params パラメーター
 * @param {Object} params.client PostgreSQLクライアント
 * @param {Object} params.walletDBService Wallet DBサービス
 * @param {string} params.groupId グループID
 * @param {string} params.type 証明書タイプ
 * @param {string} params.statusListUrl Status List URL
 * @returns {Promise<void>}
 */
const registerStatusList = async ({
  client,
  walletDBService,
  groupId,
  type,
  statusListUrl,
}) => {
  await walletDBService._insertWithConflictHandling(
    client,
    'status_list',
    {
      group_id: groupId,
      type,
      status_list_credential_url: statusListUrl,
    },
    [
      'group_id',
      'type',
      'status_list_credential_url',
    ]
  )
}


 await registerStatusList({
    client,
    walletDBService,
    groupId,
    type,
    statusListUrl,
  })
