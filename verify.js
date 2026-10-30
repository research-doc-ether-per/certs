// Issuerの存在を確認する。
await checkIssuerExists(groupId)

// 設定ファイルからIssuer情報を取得する。
const {
    issuerKey = null,
    issuerDid = null
} = defaultIssuerInfo || {}
