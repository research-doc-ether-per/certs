// ログイン関連データ確認

// テスト方式を指定する（email / oidc）

// OIDC 確認用の Access Token を設定する

// OIDC ユーザ ID（Access Token の sub）

if (!accessToken || !userId) {
    throw new Error('Access Token or User ID is missing')
}

// FIXME: 実行前に以下を確認し、必要に応じて設定してください。
// ==================================================> FIXME: START
// テスト方式を指定する（email / oidc）
const TEST_TYPE = 'email'
// const TEST_TYPE = 'oidc'

// Email 確認用
const EMAIL = '...'

// OIDC 確認用
// Access Token または User ID のどちらか一方を設定する
const OIDC_ACCESS_TOKEN = ''
const OIDC_USER_ID = ''
// ==================================================> FIXME: END
