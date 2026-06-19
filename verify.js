const axios = require('axios');
const log4js = require('log4js');

// cookie 自动管理（用于 Session 认证模式）
const axiosInstance = axios.create({
    withCredentials: true // 允许跨域及自动携带 cookie / session
});

// =========================================================================
// FIXME: 根據環境修改以下參數
// =========================================================================
const FIXME_VM_IP = "192.x.x.x";                
const FIXME_TEST_EMAIL = "test-user@example.com";       
const FIXME_TEST_PASSWORD = "Password123!";            
const FIXME_KEYCLOAK_USERNAME = "Max_Mustermann";      // Keycloak 登录需要 username
const FIXME_KEYCLOAK_PASSWORD = "password";           

// =========================================================================
// 設定情報 (Config)
// =========================================================================
const config = {
    walletApiUrl: `http://${FIXME_VM_IP}:2424` 
};

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
        // 1. 先尝试注册（新版本 walt.id 注册和登录分开）
        try {
            logger.info("ユーザー登録を試みます...");
            await request('POST', '/wallet-api/wallet-api/register', {
                type: "email",
                email: credentials.email,
                password: credentials.password
            });
            logger.info("新規登録に成功しました");
        } catch (e) {
            logger.info("登録スキップ（既にユーザーが存在する可能性があります）");
        }

        // 2. 这里的 Email+Password 模式主要是建立 Session，因此通过 user-info 验证会话
        // 注意：新版 Swagger 中并没有单独的 /auth/login 接口用于 Email，通常注册后会话即建立，或者依靠外部 Session。
        const userInfo = await request('GET', '/wallet-api/auth/user-info');
        logger.info(`Session 認証確認。ユーザーID: ${userInfo}`);
        return null; // Email 方式走 Session，不需要 Token

    } else if (type === "Keycloak") {
        // Keycloak 注册
        try {
            logger.info("Keycloak ユーザー登録を試みます...");
            await request('POST', '/wallet-api/wallet-api/create', {
                username: credentials.username,
                email: credentials.email,
                password: credentials.password
            });
        } catch (e) {
            logger.info("Keycloak 登録スキップ（既に存在するか外部管理されています）");
        }

        // Keycloak 登录获取状态
        await request('POST', '/wallet-api/wallet-api/login', {
            type: "keycloak",
            username: credentials.username,
            password: credentials.password
        });

        // 获取 Keycloak Access Token
        const tokenData = await request('GET', '/wallet-api/auth/keycloak/token');
        return tokenData; // 返回真正的 Access Token 字符串
    } else {
        throw new Error("未対応の認証方式が指定されました");
    }
}

/**
 * コア業務フロー（ウォレット取得、DID操作など）
 */
async function runIdentityWorkflow(token, identifierType) {
    logger.info(`アイデンティティ管理フロー開始: ${identifierType}`);

    // 1. 关联钱包列表的取得 (新版必需：通过此接口获取 {wallet} ID)
    logger.info("手順1. アカウントに関連付けられたウォレット一覧を取得します");
    const wallets = await request('GET', '/wallet-api/wallet/accounts/wallets', null, token);
    logger.info("ウォレット一覧を取得しました:", JSON.stringify(wallets, null, 2));
    
    // 取出第一个钱包ID (通常格式为 UUID 或 字符串)
    if (!wallets || wallets.length === 0) {
        throw new Error("利用可能なウォレットが見つかりません");
    }
    const walletId = wallets[0].id || wallets[0]; 
    logger.info(`操作対象のウォレットID: ${walletId}`);
    
    // 2. 新しいDIDの作成 (路径变更为 /wallet-api/wallet/{wallet}/dids/create/jwk)
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
        // token 为 null，依靠 axiosInstance 自动带上 session cookie
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
