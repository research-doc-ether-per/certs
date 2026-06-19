const axios = require('axios');
const log4js = require('log4js');

// Cookie の自動管理（Session 認証モードで必要）
const axiosInstance = axios.create({
    withCredentials: true // クロスドメイン環境やセッション Cookie を自動でやり取りするための設定
});

// =========================================================================
// FIXME: 環境に合わせて以下のパラメータを修正してください
// =========================================================================
const FIXME_VM_IP = "192.x.x.x";                // FIXME: 仮想マシンの実際のIPアドレスを設定してください
const FIXME_TEST_EMAIL = "test-user@example.com";       // FIXME: テスト用のメールアドレス
const FIXME_TEST_PASSWORD = "Password123!";            // FIXME: テスト用のパスワード
const FIXME_KEYCLOAK_USERNAME = "Max_Mustermann";      // FIXME: Keycloak ログイン用のユーザー名
const FIXME_KEYCLOAK_PASSWORD = "password";            // FIXME: Keycloak ログイン用のパスワード

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
        const response = await axiosInstance({
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
 * ウォレットを作成、またはログインしてアクセストークン（またはセッション）を取得する関数
 */
async function createUserWallet(type, credentials) {
    logger.info(`ウォレット作成・ログイン処理を開始します。方式: ${type}`);
    
    if (type === "EmailPassword") {
        // 1. まずはユーザー登録（新規登録）を試みる
        try {
            logger.info("ユーザー登録を試みます...");
            await request('POST', '/wallet-api/wallet-api/register', {
                type: "email",
                email: credentials.email,
                password: credentials.password
            });
            logger.info("新規登録に成功しました");
        } catch (e) {
            logger.info("登録をスキップします（既にユーザーが存在する可能性があります）");
        }

        // 2. Email+Password 認証ではセッションが作成されるため、user-info を呼び出してセッション確立を確認する
        const userInfo = await request('GET', '/wallet-api/auth/user-info');
        logger.info(`Session 認証確認。ユーザーID: ${userInfo}`);
        return null; // Email方式は Cookie (Session) を使用するため Token は不要

    } else if (type === "Keycloak") {
        // 1. Keycloak ユーザー登録
        try {
            logger.info("Keycloak ユーザー登録を試みます...");
            await request('POST', '/wallet-api/wallet-api/create', {
                username: credentials.username,
                email: credentials.email,
                password: credentials.password
            });
        } catch (e) {
            logger.info("Keycloak 登録をスキップします（既にユーザーが存在するか外部管理されています）");
        }

        // 2. Keycloak ログインを実行
        await request('POST', '/wallet-api/wallet-api/login', {
            type: "keycloak",
            username: credentials.username,
            password: credentials.password
        });

        // 3. ログイン完了後、Keycloak の Access Token を取得して返す
        const tokenData = await request('GET', '/wallet-api/auth/keycloak/token');
        return tokenData; 
    } else {
        throw new Error("未対応の認証方式が指定されました");
    }
}

/**
 * コア業務フロー（ウォレット取得、DID操作など）
 */
async function runIdentityWorkflow(token, identifierType) {
    logger.info(`アイデンティティ管理フロー開始: ${identifierType}`);

    // 1. アカウントに関連付けられたウォレット一覧の取得（最新版では {wallet} ID の指定が必須）
    logger.info("手順1. アカウントに関連付けられたウォレット一覧を取得します");
    const wallets = await request('GET', '/wallet-api/wallet/accounts/wallets', null, token);
    logger.info("ウォレット一覧を取得しました:", JSON.stringify(wallets, null, 2));
    
    if (!wallets || wallets.length === 0) {
        throw new Error("利用可能なウォレットが見つかりません");
    }
    // 最初のウォレットIDを抽出
    const walletId = wallets[0].id || wallets[0]; 
    logger.info(`操作対象のウォレットID: ${walletId}`);
    
    // 2. 新しいDIDの作成 (パスが /wallet-api/wallet/{wallet}/dids/create/jwk に変更)
    logger.info("手順2. 新しいDIDを作成します (did:jwk メソッドを使用)");
    const newDidRes = await request('POST', `/wallet-api/wallet/${walletId}/dids/create/jwk`, {}, token);
    const createdDid = typeof newDidRes === 'string' ? newDidRes : newDidRes.did;
    logger.info(`DIDの作成に成功しました: ${createdDid}`);

    // 3. DID一覧の取得
    logger.info("手順3. すべてのDID一覧を取得します");
    const didList = await request('GET', `/wallet-api/wallet/${walletId}/dids`, null, token);
    logger.info("DID一覧を取得しました:", JSON.stringify(didList, null, 2));

    // 4. 特定のDID情報の取得
    logger.info(`手順4. 作成したDID (${createdDid}) の詳細情報を確認します`);
    const didDetail = await request('GET', `/wallet-api/wallet/${walletId}/dids/${encodeURIComponent(createdDid)}`, null, token);
    logger.info("DID詳細:", JSON.stringify(didDetail, null, 2));

    // 5. 作成したDIDをデフォルトDIDに設定
    logger.info(`手順5. 作成したDIDをデフォルトDIDに設定します`);
    await request('POST', `/wallet-api/wallet/${walletId}/dids/default`, { did: createdDid }, token);
    logger.info("デフォルトDIDの設定に成功しました");

    // 6. 作成したDIDの削除
    logger.info(`手順6. 作成したDID (${createdDid}) を削除します`);
    await request('DELETE', `/wallet-api/wallet/${walletId}/dids/${encodeURIComponent(createdDid)}`, null, token);
    logger.info("DIDの削除に成功しました");
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
        // token は null になりますが、axiosInstance が自動で Session Cookie を送信します
        await runIdentityWorkflow(token, "Email/Password方式");
    } catch (error) {
        logger.error("シナリオ1の実行中にエラーが発生しました");
    }
}

/**
 * シナリオ 2: Keycloak による認証
 */
async function scenarioKeycloak() {
    logger.info(`シナリオ2: Keycloakによるウォレット作成と認証を開始します`);
    try {
        const token = await createUserWallet("Keycloak", {
            username: FIXME_KEYCLOAK_USERNAME,
            email: FIXME_TEST_EMAIL,
            password: FIXME_KEYCLOAK_PASSWORD
        });
        logger.info("Keycloak認証成功。アクセストークンを取得しました");

        await runIdentityWorkflow(token, "Keycloak/OIDC方式");
    } catch (error) {
        logger.error("シナリオ2の実行中にエラーが発生しました。");
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
    if (FIXME_KEYCLOAK_USERNAME && FIXME_KEYCLOAK_USERNAME !== "Max_Mustermann") {
        await scenarioKeycloak();
    } else {
        logger.info("情報: シナリオ2はスキップされました。");
    }

    logger.info("すべてのデモシナリオが終了しました");
}

main();
