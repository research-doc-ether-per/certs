const axios = require('axios');
const log4js = require('log4js');

// =========================================================================
// FIXME: 環境に合わせて以下のパラメータを修正してください
// =========================================================================
const FIXME_VM_IP = "192.x.x.x";                // FIXME: 仮想マシンの実際のIPアドレスを設定してください
const FIXME_TEST_EMAIL = "test-user@example.com";       // FIXME: テスト用のメールアドレス
const FIXME_TEST_PASSWORD = "Password123!";            // FIXME: テスト用のパスワード
const FIXME_KEYCLOAK_TOKEN = "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6... "; // FIXME: 実際のKeycloak AccessTokenを設定してください

// =========================================================================
// 設定情報 (Config)
// =========================================================================
const config = {
    walletApiUrl: `http://${FIXME_VM_IP}:2424` // 直接公開したwallet-apiのポートに接続
};

// Log4js の初期化設定
log4js.configure({
    appenders: { console: { type: 'console' } },
    categories: { default: { appenders: ['console'], level: 'info' } }
});
const logger = log4js.getLogger('ScenarioIdentityManagement');

/**
 * 共通のAPIリクエスト送信関数
 */
async function request(method, url, data = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    try {
        const response = await axios({
            method,
            url: `${config.walletApiUrl}${url}`,
            data,
            headers
        });
        return response.data;
    } catch (error) {
        logger.error(`リクエスト失敗 [${method} ${url}]:`, error.response?.data || error.message);
        throw error;
    }
}

/**
 * ウォレットを作成、またはログインしてアクセストークンを取得する関数
 */
async function createUserWallet(type, credentials) {
    logger.info(`ウォレット作成処理を開始します。方式: ${type}`);
    
    if (type === "EmailPassword") {
        // メールアドレスとパスワードによる認証（新規ユーザーの場合はバックエンドで自動的にウォレットが作成されます）
        const authData = await request('POST', '/wallet-api/auth/login', {
            email: credentials.email,
            password: credentials.password
        });
        return authData.token;
    } else if (type === "Keycloak") {
        // Keycloak OIDCトークンによる認証（同様に未登録時は自動的にウォレットが作成されます）
        const authData = await request('POST', '/wallet-api/auth/oidc-login', {
            token: credentials.token
        });
        return authData.token;
    } else {
        throw new Error("未対応の認証方式が指定されました");
    }
}

/**
 * コア業務フロー（ウォレット取得、DID操作、ウォレット削除など）
 */
async function runIdentityWorkflow(token, identifierType) {
    logger.info(`アイデンティティ管理フロー開始: ${identifierType}`);

    // 1. ウォレット情報の取得
    logger.info("手順1. 現在のログインユーザーのウォレットを取得します");
    const walletInfo = await request('GET', '/wallet-api/wallet', null, token);
    logger.info("ウォレット情報を取得しました:", JSON.stringify(walletInfo, null, 2));
    
    // 2. 新しいDIDの作成
    logger.info("手順2. 新しいDIDを作成します (jwkキーおよびjwkメソッドを使用)");
    const newDidRes = await request('POST', '/wallet-api/dids/create', {
        method: "jwk",
        config: {}
    }, token);
    const createdDid = typeof newDidRes === 'string' ? newDidRes : newDidRes.did;
    logger.info(`DIDの作成に成功しました: ${createdDid}`);

    // 3. DID一覧の取得
    logger.info("手順3. すべてのDID一覧を取得します");
    const didList = await request('GET', '/wallet-api/dids', null, token);
    logger.info("DID一覧を取得しました:", JSON.stringify(didList, null, 2));

    // 4. 特定のDID情報の取得
    logger.info(`手順4. 作成したDID (${createdDid}) の詳細情報を確認します`);
    logger.info(`取得した一覧から対象 of DIDデータを確認してください`);

    // 5. 作成したDIDをデフォルトDIDに設定
    logger.info(`手順5. 作成したDIDをデフォルトDIDに設定します`);
    await request('POST', `/wallet-api/dids/default?did=${encodeURIComponent(createdDid)}`, null, token);
    logger.info("デフォルトDIDの設定に成功しました");

    // 6. 作成したDIDの削除
    logger.info(`手順6. 作成したDID (${createdDid}) を削除します`);
    await request('DELETE', `/wallet-api/dids/${encodeURIComponent(createdDid)}`, null, token);
    logger.info("DIDの削除に成功しました");

    // 7. ウォレット全体の削除（クリーンアップ）
    logger.info("手順7. 現在のウォレットアカウントを削除してクリーンアップします");
    try {
        await request('DELETE', '/wallet-api/wallet', null, token);
        logger.info("ウォレットのクリーンアップに成功しました");
    } catch (e) {
        logger.warn("注意: 現在のAPI構成ではウォレットの直接削除が制限されている可能性があります");
    }
}

/**
 * シナリオ 1: メールアドレスとパスワードによる認証
 */
async function scenarioEmailPassword() {
    logger.info(`シナリオ1: メールアドレスとパスワードによるウォレット作成と認証を開始します`);
    try {
        const token = await createUserWallet("EmailPassword", {
            email: FIXME_TEST_EMAIL,
            password: FIXME_TEST_PASSWORD
        });
        logger.info("ログイン成功。アクセストークンを取得しました");

        await runIdentityWorkflow(token, "Email/Password方式");
    } catch (error) {
        logger.error("シナリオ1の実行中にエラーが発生しました");
    }
}

/**
 * シナリオ 2: Keycloak の AccessToken による認証
 */
async function scenarioKeycloak() {
    logger.info(`シナリオ2: Keycloakトークンによるウォレット作成と認証を開始します`);
    try {
        const token = await createUserWallet("Keycloak", {
            token: FIXME_KEYCLOAK_TOKEN
        });
        logger.info("Keycloak認証成功。内部トークンに交換しました");

        await runIdentityWorkflow(token, "Keycloak/OIDC方式");
    } catch (error) {
        logger.error("シナリオ2の実行中にエラーが発生しました。トークンの有効期限等を確認してください");
    }
}

// =========================================================================
// メイン実行
// =========================================================================
async function main() {
    logger.info("Walt.id アイデンティティ管理デモを開始します");
    logger.info(`接続先: ${config.walletApiUrl}`);

    // シナリオ 1 の実行
    await scenarioEmailPassword();

    // シナリオ 2 の実行
    if (FIXME_KEYCLOAK_TOKEN && !FIXME_KEYCLOAK_TOKEN.includes("...")) {
        await scenarioKeycloak();
    } else {
        logger.info("情報: シナリオ2はスキップされました。テストするにはFIXME_KEYCLOAK_TOKENを設定してください");
    }

    logger.info("すべてのデモシナリオが終了しました");
}

main();
