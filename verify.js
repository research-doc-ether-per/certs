waltid-custom-migration/
├── src/
│   ├── migrate.js
│   ├── login-auth.js
│   ├── postgres-client.js
│   └── wallet-account.js
├── sql/
│   └── schema.sql
├── .env
├── package.json
└── README.md




require("dotenv").config();

const { Pool } = require("pg");

const DATABASE_URL = process.env.TARGET_DATABASE_URL;
const TARGET_SCHEMA = process.env.TARGET_SCHEMA || "wallet_app";

if (!DATABASE_URL) {
  throw new Error("Missing TARGET_DATABASE_URL in .env");
}

// PostgreSQL 識別子の検証
const quoteId = (value) => {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
    throw new Error(`Invalid SQL identifier: ${value}`);
  }

  return `"${value}"`;
};

const qt = quoteId(TARGET_SCHEMA);

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// PostgreSQL クエリの実行
const executeQuery = async (sql, params = []) => {
  console.debug("*** executeQuery start ***");

  try {
    const response = await pool.query(sql, params);

    const result = response.rows || [];

    console.debug("result : ", {
      rowCount: response.rowCount,
    });

    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** executeQuery end ***");
  }
};

// データベース接続確認
const checkConnection = async () => {
  console.debug("*** checkConnection start ***");

  try {
    const result = await executeQuery(
      "SELECT current_database() AS database_name"
    );

    console.debug("result : ", result);

    return result[0];
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** checkConnection end ***");
  }
};

// データベース接続終了
const closeConnection = async () => {
  console.debug("*** closeConnection start ***");

  try {
    await pool.end();

    console.debug("result : ", {
      closed: true,
    });
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** closeConnection end ***");
  }
};

module.exports = {
  executeQuery,
  checkConnection,
  closeConnection,
  qt,
};



const { executeQuery, qt } = require("./postgres-client");

// アカウント ID による検索
const getAccountById = async (accountId) => {
  console.debug("*** getAccountById start ***");

  try {
    if (!accountId) {
      throw new Error("accountId is required");
    }

    const response = await executeQuery(
      `
      SELECT
        account_id,
        name,
        email
      FROM ${qt}.accounts
      WHERE account_id = $1
      `,
      [accountId]
    );

    const result = response[0] || null;

    console.debug("result : ", {
      found: result !== null,
    });

    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** getAccountById end ***");
  }
};

// メールアドレスによるアカウント検索
const getAccountByEmail = async (email) => {
  console.debug("*** getAccountByEmail start ***");

  try {
    if (typeof email !== "string" || !email.trim()) {
      throw new Error("email is required");
    }

    const response = await executeQuery(
      `
      SELECT
        account_id,
        name,
        email,
        password_hash
      FROM ${qt}.accounts
      WHERE email = $1
      LIMIT 2
      `,
      [email]
    );

    if (response.length > 1) {
      throw new Error("Duplicate account email");
    }

    const result = response[0] || null;

    console.debug("result : ", {
      found: result !== null,
    });

    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** getAccountByEmail end ***");
  }
};

// OIDC 識別子によるアカウント検索
const getAccountByOidcId = async (oidcId) => {
  console.debug("*** getAccountByOidcId start ***");

  try {
    if (!oidcId) {
      throw new Error("oidcId is required");
    }

    const response = await executeQuery(
      `
      SELECT
        a.account_id,
        a.name,
        a.email
      FROM ${qt}.account_oidc_logins o
      INNER JOIN ${qt}.accounts a
        ON a.account_id = o.account_id
      WHERE o.oidc_id = $1
      LIMIT 2
      `,
      [oidcId]
    );

    if (response.length > 1) {
      throw new Error("Ambiguous OIDC account mapping");
    }

    const result = response[0] || null;

    console.debug("result : ", {
      found: result !== null,
    });

    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** getAccountByOidcId end ***");
  }
};

// アカウントに関連する Wallet を取得
const getWalletsByAccountId = async (accountId) => {
  console.debug("*** getWalletsByAccountId start ***");

  try {
    if (!accountId) {
      throw new Error("accountId is required");
    }

    const response = await executeQuery(
      `
      SELECT
        w.wallet_id,
        p.permissions,
        p.added_on
      FROM public.wallet2_account_wallets w
      LEFT JOIN ${qt}.account_wallet_permissions p
        ON p.account_id = w.account_id
       AND p.wallet_id = w.wallet_id
      WHERE w.account_id = $1
      ORDER BY w.wallet_id
      `,
      [accountId]
    );

    const result = response;

    console.debug("result : ", {
      walletCount: result.length,
    });

    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** getWalletsByAccountId end ***");
  }
};

// Wallet とアカウントの関連確認
const hasWalletAccess = async (accountId, walletId) => {
  console.debug("*** hasWalletAccess start ***");

  try {
    if (!accountId || !walletId) {
      throw new Error("accountId and walletId are required");
    }

    const response = await executeQuery(
      `
      SELECT EXISTS (
        SELECT 1
        FROM public.wallet2_account_wallets
        WHERE account_id = $1
          AND wallet_id = $2
      ) AS allowed
      `,
      [accountId, walletId]
    );

    const result = response[0]?.allowed === true;

    console.debug("result : ", {
      allowed: result,
    });

    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** hasWalletAccess end ***");
  }
};

module.exports = {
  getAccountById,
  getAccountByEmail,
  getAccountByOidcId,
  getWalletsByAccountId,
  hasWalletAccess,
};



require("dotenv").config();

const argon2 = require("argon2");
const {
  createRemoteJWKSet,
  jwtVerify,
} = require("jose");

const {
  getAccountByEmail,
  getAccountByOidcId,
  getWalletsByAccountId,
} = require("./wallet-account");

const OIDC_ISSUER = process.env.OIDC_ISSUER;
const OIDC_CLIENT_ID = process.env.OIDC_CLIENT_ID;
const OIDC_JWKS_URI = process.env.OIDC_JWKS_URI;
const OIDC_LEGACY_ID_CLAIM =
  process.env.OIDC_LEGACY_ID_CLAIM;

let jwks = null;

// 認証結果の生成
const createAuthResult = async (account) => {
  console.debug("*** createAuthResult start ***");

  try {
    const wallets = await getWalletsByAccountId(
      account.account_id
    );

    const result = {
      accountId: account.account_id,
      name: account.name,
      email: account.email,
      wallets,
    };

    console.debug("result : ", {
      accountId: result.accountId,
      walletCount: wallets.length,
    });

    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** createAuthResult end ***");
  }
};

// メール・パスワード認証
const authenticateEmailPassword = async (email, password) => {
  console.debug("*** authenticateEmailPassword start ***");

  try {
    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      throw new Error("Invalid credentials");
    }

    const account = await getAccountByEmail(email);

    if (!account || !account.password_hash) {
      throw new Error("Invalid credentials");
    }

    let verified = false;

    try {
      verified = await argon2.verify(
        account.password_hash,
        password
      );
    } catch (error) {
      console.error(
        "Password hash verification failed"
      );
      throw new Error("Invalid credentials");
    }

    if (!verified) {
      throw new Error("Invalid credentials");
    }

    const result = await createAuthResult(account);

    console.debug("result : ", {
      authenticated: true,
      accountId: result.accountId,
    });

    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** authenticateEmailPassword end ***");
  }
};

// OIDC 設定の確認
const validateOidcConfig = () => {
  if (
    !OIDC_ISSUER ||
    !OIDC_CLIENT_ID ||
    !OIDC_JWKS_URI ||
    !OIDC_LEGACY_ID_CLAIM
  ) {
    throw new Error(
      "Missing OIDC_ISSUER, OIDC_CLIENT_ID, " +
      "OIDC_JWKS_URI or OIDC_LEGACY_ID_CLAIM"
    );
  }

  if (
    !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(
      OIDC_LEGACY_ID_CLAIM
    )
  ) {
    throw new Error("Invalid OIDC_LEGACY_ID_CLAIM");
  }

  const issuerUrl = new URL(OIDC_ISSUER);
  const jwksUrl = new URL(OIDC_JWKS_URI);

  if (
    issuerUrl.protocol !== "https:" ||
    jwksUrl.protocol !== "https:"
  ) {
    throw new Error("OIDC endpoints must use HTTPS");
  }
};

// OIDC ID Token の検証
const verifyOidcIdToken = async (idToken) => {
  console.debug("*** verifyOidcIdToken start ***");

  try {
    validateOidcConfig();

    if (typeof idToken !== "string" || !idToken) {
      throw new Error("Invalid OIDC ID Token");
    }

    if (!jwks) {
      jwks = createRemoteJWKSet(
        new URL(OIDC_JWKS_URI)
      );
    }

    const response = await jwtVerify(idToken, jwks, {
      issuer: OIDC_ISSUER,
      audience: OIDC_CLIENT_ID,
      algorithms: ["RS256", "ES256"],
    });

    const result = response.payload;

    if (!result.sub) {
      throw new Error("OIDC subject is missing");
    }

    console.debug("result : ", {
      verified: true,
      issuer: result.iss,
    });

    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** verifyOidcIdToken end ***");
  }
};

// OIDC 認証
const authenticateOidc = async (idToken) => {
  console.debug("*** authenticateOidc start ***");

  try {
    const claims = await verifyOidcIdToken(idToken);

    const oidcId = claims[OIDC_LEGACY_ID_CLAIM];

    if (
      typeof oidcId !== "string" ||
      !oidcId
    ) {
      throw new Error(
        "OIDC legacy identifier is missing"
      );
    }

    const account = await getAccountByOidcId(
      oidcId
    );

    if (!account) {
      throw new Error("OIDC account not found");
    }

    const result = await createAuthResult(account);

    console.debug("result : ", {
      authenticated: true,
      accountId: result.accountId,
    });

    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** authenticateOidc end ***");
  }
};

module.exports = {
  authenticateEmailPassword,
  authenticateOidc,
  verifyOidcIdToken,
};




{
  "name": "waltid-custom-migration",
  "version": "1.0.0",
  "private": true,
  "type": "commonjs",
  "scripts": {
    "db:init": "node src/migrate.js init",
    "migrate:dry-run": "node src/migrate.js migrate --dry-run",
    "migrate": "node src/migrate.js migrate",
    "verify": "node src/migrate.js verify",
    "check": "node --check src/migrate.js && node --check src/login-auth.js && node --check src/postgres-client.js && node --check src/wallet-account.js"
  },
  "engines": {
    "node": ">=22.0.0"
  },
  "dependencies": {
    "dotenv": "^16.4.5",
    "pg": "^8.13.1",
    "argon2": "^0.41.1",
    "jose": "^5.10.0"
  }
}



TARGET_DATABASE_URL=postgresql://waltid:YOUR_PASSWORD@localhost:5432/waltid
TARGET_SCHEMA=wallet_app

OIDC_ISSUER=https://your-keycloak.example.com/realms/your-realm
OIDC_CLIENT_ID=your-wallet-client
OIDC_JWKS_URI=https://your-keycloak.example.com/realms/your-realm/protocol/openid-connect/certs

OIDC_LEGACY_ID_CLAIM=sub



