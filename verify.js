
require("dotenv").config();

const {
  authenticateEmailPassword,
  authenticateOidc,
} = require("./login-auth");

const { closeConnection } = require("./postgres-client");

// FIXME: テストする認証方式を指定する（email / oidc）
const AUTH_TYPE = "email";

// FIXME: メール認証用のテストアカウントを設定する
const EMAIL = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;

// FIXME: OIDC 認証用の ID Token を設定する
const OIDC_ID_TOKEN = process.env.TEST_OIDC_ID_TOKEN;

// ログイン認証テスト
const testLoginAuth = async () => {
  console.debug("*** testLoginAuth start ***");

  try {
    let result;

    switch (AUTH_TYPE) {
      case "email":
        if (!EMAIL || !PASSWORD) {
          throw new Error("TEST_EMAIL or TEST_PASSWORD is missing");
        }

        result = await authenticateEmailPassword(
          EMAIL,
          PASSWORD
        );
        break;

      case "oidc":
        if (!OIDC_ID_TOKEN) {
          throw new Error("TEST_OIDC_ID_TOKEN is missing");
        }

        result = await authenticateOidc(
          OIDC_ID_TOKEN
        );
        break;

      default:
        throw new Error(`Unsupported AUTH_TYPE: ${AUTH_TYPE}`);
    }

    console.debug("result : ", {
      authenticated: true,
      accountId: result.accountId,
      walletCount: result.wallets.length,
    });

    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** testLoginAuth end ***");
  }
};

// メイン処理
const main = async () => {
  console.debug("*** main start ***");

  try {
    await testLoginAuth();

    console.log("Login authentication test: SUCCESS");
  } catch (error) {
    console.error("Login authentication test: FAILED");
    process.exitCode = 1;
  } finally {
    try {
      await closeConnection();
    } catch (error) {
      console.error("error.message: ", error.message);
      console.error("error.stack: ", error.stack);
      process.exitCode = 1;
    }

    console.debug("*** main end ***");
  }
};

main();
