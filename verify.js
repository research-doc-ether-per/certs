
-- ============================================================
-- walt.id v0.15.1 → v1.0.0
-- Custom Migration Tool 用データベース定義
--
-- 既存の wallet2_* テーブルは変更しない。
-- 未移行データは wallet_app スキーマに保存する。
-- ============================================================

-- 1. カスタムスキーマ
CREATE SCHEMA IF NOT EXISTS wallet_app;


-- 2. 旧バージョンの全テーブルデータを保存
CREATE TABLE IF NOT EXISTS wallet_app.legacy_rows (
    source_table TEXT NOT NULL,
    source_key TEXT NOT NULL,
    payload JSONB NOT NULL,
    migrated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (source_table, source_key)
);


-- 3. アカウント情報
-- メール・パスワード認証および OIDC 認証の共通アカウント
CREATE TABLE IF NOT EXISTS wallet_app.accounts (
    tenant TEXT NOT NULL DEFAULT '',
    account_id TEXT NOT NULL,
    name TEXT,
    email TEXT,
    password_hash TEXT,
    created_on TEXT,
    raw JSONB NOT NULL,

    PRIMARY KEY (tenant, account_id)
);


-- 4. アカウントと Wallet の権限情報
CREATE TABLE IF NOT EXISTS wallet_app.account_wallet_permissions (
    tenant TEXT NOT NULL DEFAULT '',
    account_id TEXT NOT NULL,
    wallet_id TEXT NOT NULL,
    permissions TEXT,
    added_on TEXT,
    raw JSONB NOT NULL,

    PRIMARY KEY (tenant, account_id, wallet_id)
);


-- 5. OIDC ログイン情報
-- 旧バージョンの oidclogins テーブルから移行する。
-- 元の account_id と oidc_id の関連を保持する。
CREATE TABLE IF NOT EXISTS wallet_app.account_oidc_logins (
    tenant TEXT NOT NULL DEFAULT '',
    account_id TEXT NOT NULL,
    oidc_id TEXT NOT NULL,
    raw JSONB NOT NULL,

    PRIMARY KEY (tenant, account_id, oidc_id)
);


-- 6. 検索用インデックス
-- メールアドレスによるアカウント検索
CREATE INDEX IF NOT EXISTS idx_wallet_app_accounts_email
    ON wallet_app.accounts (email);

-- Wallet ID による権限情報検索
CREATE INDEX IF NOT EXISTS idx_wallet_app_permissions_wallet
    ON wallet_app.account_wallet_permissions (wallet_id);

-- OIDC 識別子によるアカウント検索
CREATE INDEX IF NOT EXISTS idx_wallet_app_oidc_logins_oidc_id
    ON wallet_app.account_oidc_logins (tenant, oidc_id);



# ローカル環境の例。実際の認証情報に変更してください。
SOURCE_DATABASE_URL=postgresql://waltid:waltid@127.0.0.1:5432/waltid_v0151_source
TARGET_DATABASE_URL=postgresql://waltid:waltid@127.0.0.1:5432/waltid
# データコピー元スキーマ
SOURCE_SCHEMA=public
# 独立した移行先スキーマ
TARGET_SCHEMA=wallet_app




require("dotenv").config();

const { Client } = require("pg");

/** v0.15.1 の移行・保管対象テーブル（全17テーブル）。 */
const LEGACY_TABLES = [
  'account_wallet_mapping',
  'accounts',
  'category',
  'credential_category',
  'credentials',
  'entity_name_resolution_cache',
  'events',
  'notifications',
  'oidclogins',
  'wallet_dids',
  'wallet_issuers',
  'wallet_keys',
  'wallet_operation_histories',
  'wallet_settings',
  'wallets',
  'web3wallets',
  'x5clogins',
];

const SOURCE_SCHEMA = process.env.SOURCE_SCHEMA || 'public';
const TARGET_SCHEMA = process.env.TARGET_SCHEMA || 'wallet_app';
const command = process.argv[2];
const dryRun = process.argv.includes('--dry-run');

/** SQL 識別子を検証・引用符で囲み、意図しない SQL の混入を防ぐ。 */
const quoteId = (value) => {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
    throw new Error(`Invalid SQL identifier: ${value}`);
  }
  return `"${value}"`;
};

const qs = quoteId(SOURCE_SCHEMA);
const qt = quoteId(TARGET_SCHEMA);

/** 環境変数から PostgreSQL 接続設定を取得する。 */
const getDbConfig = (name) => {
  const connectionString = process.env[name];
  if (!connectionString) {
    throw new Error(`Missing ${name}; copy .env.example to .env`);
  }
  return { connectionString };
};

const source = new Client(getDbConfig('SOURCE_DATABASE_URL'));
const target = new Client(getDbConfig('TARGET_DATABASE_URL'));

/** エラー本文・スタックを統一形式で出力する。 */
const logError = (error) => {
  console.error('error.message: ', error.message);
  console.error('error.stack: ', error.stack);
};

/**
 * 移行先の独自スキーマ・テーブルを初期化する。
 * 公式の wallet2_* テーブルは変更しない。
 */
const createSchema = async () => {
  console.debug('*** createSchema start ***');
  try {
    await target.query(`CREATE SCHEMA IF NOT EXISTS ${qt}`);
    await target.query(`CREATE TABLE IF NOT EXISTS ${qt}.legacy_rows (
      source_table text NOT NULL,
      source_key text NOT NULL,
      payload jsonb NOT NULL,
      migrated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (source_table, source_key)
    )`);
    await target.query(`CREATE TABLE IF NOT EXISTS ${qt}.accounts (
      tenant text NOT NULL DEFAULT '',
      account_id text NOT NULL,
      name text,
      email text,
      password_hash text,
      created_on text,
      raw jsonb NOT NULL,
      PRIMARY KEY (tenant, account_id)
    )`);
    await target.query(`CREATE TABLE IF NOT EXISTS ${qt}.account_wallet_permissions (
      tenant text NOT NULL DEFAULT '',
      account_id text NOT NULL,
      wallet_id text NOT NULL,
      permissions text,
      added_on text,
      raw jsonb NOT NULL,
      PRIMARY KEY (tenant, account_id, wallet_id)
    )`);
    // OIDC 認証ユーザーと旧アカウントの紐付けを保持する。
    // provider / issuer が旧テーブルに存在しない場合は、後で認証設定との照合が必要。
    await target.query(`CREATE TABLE IF NOT EXISTS ${qt}.account_oidc_logins (
      tenant text NOT NULL DEFAULT '',
      account_id text NOT NULL,
      oidc_id text NOT NULL,
      raw jsonb NOT NULL,
      PRIMARY KEY (tenant, account_id, oidc_id)
    )`);
    console.debug('result : ', `schema=${TARGET_SCHEMA}`);
  } catch (error) {
    logError(error);
    throw error;
  } finally {
    console.debug('*** createSchema end ***');
  }
};

/** 移行元に存在する通常テーブルを取得する。 */
const getSourceTables = async () => {
  console.debug('*** getSourceTables start ***');
  try {
    const response = await source.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = $1 AND table_type = 'BASE TABLE'
    `, [SOURCE_SCHEMA]);
    const result = new Set(response.rows.map((row) => row.table_name));
    console.debug('result : ', { tableCount: result.size });
    return result;
  } catch (error) {
    logError(error);
    throw error;
  } finally {
    console.debug('*** getSourceTables end ***');
  }
};

/**
 * 旧テーブルの全行を JSONB 形式で取得する。
 * UUID・日時なども PostgreSQL の JSONB 表現で保持する。
 * MD5 は行識別用の補助値であり、セキュリティ目的には使用しない。
 */
const extractRows = async (table) => {
  console.debug('*** extractRows start ***');
  try {
    const sql = `
      SELECT payload,
             md5(payload::text) AS fingerprint,
             row_number() OVER (
               PARTITION BY payload ORDER BY payload::text
             ) AS occurrence
      FROM (
        SELECT to_jsonb(t) AS payload
        FROM ${qs}.${quoteId(table)} t
      ) x
      ORDER BY fingerprint, occurrence
    `;
    const response = await source.query(sql);
    const result = response.rows.map((row) => ({
      ...row,
      source_key: `${row.fingerprint}:${row.occurrence}`,
    }));
    console.debug('result : ', { table, rowCount: result.length });
    return result;
  } catch (error) {
    logError(error);
    throw error;
  } finally {
    console.debug('*** extractRows end ***');
  }
};

/** NULL・undefined を維持し、その他の値を文字列に変換する。 */
const valueAsText = (row, field) => {
  const value = row[field];
  return value === undefined || value === null ? null : String(value);
};

/** 指定候補のうち最初に存在する旧カラム値を取得する。 */
const textField = (row, ...names) => {
  for (const name of names) {
    if (Object.hasOwn(row, name)) return valueAsText(row, name);
  }
  return null;
};

/** 元テーブルの行を JSONB アーカイブに UPSERT する。 */
const upsertArchive = async (table, item) => {
  console.debug('*** upsertArchive start ***');
  try {
    const sql = `
      INSERT INTO ${qt}.legacy_rows (source_table, source_key, payload)
      VALUES ($1, $2, $3::jsonb)
      ON CONFLICT (source_table, source_key)
      DO UPDATE SET payload = EXCLUDED.payload
    `;
    await target.query(sql, [table, item.source_key, JSON.stringify(item.payload)]);
    // 個人情報や秘密鍵を含む payload はログに出力しない。
  } catch (error) {
    logError(error);
    throw error;
  } finally {
    console.debug('*** upsertArchive end ***');
  }
};

/** 旧アカウントの ID とパスワードハッシュを維持して移行する。 */
const migrateAccount = async (row) => {
  console.debug('*** migrateAccount start ***');
  try {
    const tenant = textField(row, 'tenant') ?? '';
    const accountId = textField(row, 'id');
    if (!accountId) throw new Error('accounts.id is missing');

    const sql = `
      INSERT INTO ${qt}.accounts
        (tenant, account_id, name, email, password_hash, created_on, raw)
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
      ON CONFLICT (tenant, account_id)
      DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        password_hash = EXCLUDED.password_hash,
        created_on = EXCLUDED.created_on,
        raw = EXCLUDED.raw
    `;
    await target.query(sql, [
      tenant,
      accountId,
      textField(row, 'name'),
      textField(row, 'email'),
      textField(row, 'password'),
      textField(row, 'createdOn', 'created_on'),
      JSON.stringify(row),
    ]);
    console.debug('result : ', { migrated: true });
  } catch (error) {
    logError(error);
    throw error;
  } finally {
    console.debug('*** migrateAccount end ***');
  }
};

/** 旧アカウントと Wallet の紐付け、権限、tenant を保存する。 */
const migratePermissions = async (row) => {
  console.debug('*** migratePermissions start ***');
  try {
    const tenant = textField(row, 'tenant') ?? '';
    const accountId = textField(row, 'id');
    const walletId = textField(row, 'wallet');
    if (!accountId || !walletId) {
      throw new Error('account_wallet_mapping id/wallet is missing');
    }

    const sql = `
      INSERT INTO ${qt}.account_wallet_permissions
        (tenant, account_id, wallet_id, permissions, added_on, raw)
      VALUES ($1, $2, $3, $4, $5, $6::jsonb)
      ON CONFLICT (tenant, account_id, wallet_id)
      DO UPDATE SET
        permissions = EXCLUDED.permissions,
        added_on = EXCLUDED.added_on,
        raw = EXCLUDED.raw
    `;
    await target.query(sql, [
      tenant,
      accountId,
      walletId,
      textField(row, 'permissions'),
      textField(row, 'added_on'),
      JSON.stringify(row),
    ]);
    console.debug('result : ', { migrated: true });
  } catch (error) {
    logError(error);
    throw error;
  } finally {
    console.debug('*** migratePermissions end ***');
  }
};

/**
 * OIDC ログイン識別子を旧アカウント ID に関連付けて保管する。
 * 注: oidcId の仕様（issuer/sub の構成）は旧 API の実装で要確認。
 * 外部 IdP のパスワードや認証トークンは取得・移行しない。
 */
const migrateOidcLogin = async (row) => {
  console.debug('*** migrateOidcLogin start ***');

  try {
    const tenant = textField(row, 'tenant') ?? '';
    const accountId = textField(row, 'accountId', 'account_id');
    const oidcId = textField(row, 'oidcId', 'oidc_id');

    if (!accountId || !oidcId) {
      throw new Error('oidclogins.accountId / oidcId is missing');
    }

    const response = await target.query(`
      INSERT INTO ${qt}.account_oidc_logins
        (tenant, account_id, oidc_id, raw)
      VALUES ($1, $2, $3, $4::jsonb)
      ON CONFLICT (tenant, account_id, oidc_id)
      DO UPDATE SET raw = EXCLUDED.raw
    `, [tenant, accountId, oidcId, JSON.stringify(row)]);

    // ID や raw データには個人情報が含まれるためログへ出力しない。
    const result = { migrated: response.rowCount === 1 };
    console.debug('result : ', result);
    return result;
  } catch (error) {
    console.error('error.message: ', error.message);
    console.error('error.stack: ', error.stack);
    throw error;
  } finally {
    console.debug('*** migrateOidcLogin end ***');
  }
};

/**
 * 旧データを全件保管し、アカウントと権限を専用テーブルへ移行する。
 * --dry-run の場合は最後に ROLLBACK して書き込みを残さない。
 */
const migrate = async () => {
  console.debug('*** migrate start ***');
  let transactionStarted = false;
  try {
    const tables = await getSourceTables();
    const missing = LEGACY_TABLES.filter((table) => !tables.has(table));
    if (missing.length > 0) {
      throw new Error(`Missing source tables: ${missing.join(', ')}. No changes made.`);
    }

    await target.query('BEGIN');
    transactionStarted = true;
    await createSchema();

    let total = 0;
    for (const name of LEGACY_TABLES) {
      const rows = await extractRows(name);
      for (const item of rows) {
        await upsertArchive(name, item);
        if (name === 'accounts') await migrateAccount(item.payload);
        if (name === 'account_wallet_mapping') await migratePermissions(item.payload);
        if (name === 'oidclogins') await migrateOidcLogin(item.payload);
      }
      total += rows.length;
      console.log(`${name}: ${rows.length} rows`);
    }

    if (dryRun) {
      await target.query('ROLLBACK');
      transactionStarted = false;
      console.log(`DRY RUN: ${total} rows processed, all target operations rolled back.`);
    } else {
      await target.query('COMMIT');
      transactionStarted = false;
      console.log(`Migration complete: ${total} source rows archived. Existing wallet2_* unchanged.`);
    }
    console.debug('result : ', { total, dryRun });
  } catch (error) {
    if (transactionStarted) {
      try {
        await target.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('rollback error.message: ', rollbackError.message);
        console.error('rollback error.stack: ', rollbackError.stack);
      }
    }
    logError(error);
    throw error;
  } finally {
    console.debug('*** migrate end ***');
  }
};

/** JSON のオブジェクトキー順に依存せず、値を再帰的に比較する。 */
const deepEqual = (a, b) => {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b)
      && a.length === b.length
      && a.every((value, index) => deepEqual(value, b[index]));
  }
  const keysA = Object.keys(a).sort();
  const keysB = Object.keys(b).sort();
  return keysA.length === keysB.length
    && keysA.every((key, index) => key === keysB[index] && deepEqual(a[key], b[key]));
};

/** 全17テーブルの保管件数および JSONB データ内容を検証する。 */
const verify = async () => {
  console.debug('*** verify start ***');
  try {
    const tables = await getSourceTables();
    let failed = false;

    for (const name of LEGACY_TABLES) {
      if (!tables.has(name)) {
        console.error(`${name}: missing source`);
        failed = true;
        continue;
      }
      const original = await extractRows(name);
      const response = await target.query(
        `SELECT source_key, payload FROM ${qt}.legacy_rows WHERE source_table = $1`,
        [name],
      );
      const storedRows = new Map(response.rows.map((row) => [row.source_key, row.payload]));
      const matches = original.every((row) => {
        const stored = storedRows.get(row.source_key);
        return stored !== undefined && deepEqual(stored, row.payload);
      });
      const ok = matches && original.length === storedRows.size;
      console.log(`${ok ? 'OK' : 'NG'} ${name}: source=${original.length} archive=${storedRows.size}`);
      if (!ok) failed = true;
    }

    const accountResponse = await target.query(`SELECT count(*)::int AS n FROM ${qt}.accounts`);
    const permissionResponse = await target.query(
      `SELECT count(*)::int AS n FROM ${qt}.account_wallet_permissions`,
    );
    // OIDC 連携データは件数と原レコードの内容を別途照合する。
    const sourceOidc = await extractRows('oidclogins');
    const oidcResponse = await target.query(`
      SELECT tenant, account_id, oidc_id, raw
      FROM ${qt}.account_oidc_logins
    `);
    const oidcKey = (tenant, accountId, oidcId) => JSON.stringify([tenant, accountId, oidcId]);
    const actualOidc = new Map(oidcResponse.rows.map((row) => [
      oidcKey(row.tenant, row.account_id, row.oidc_id), row.raw,
    ]));
    const oidcMatches = sourceOidc.every(({ payload }) => {
      const tenant = textField(payload, 'tenant') ?? '';
      const accountId = textField(payload, 'accountId', 'account_id');
      const oidcId = textField(payload, 'oidcId', 'oidc_id');
      if (!accountId || !oidcId) return false;
      return deepEqual(actualOidc.get(oidcKey(tenant, accountId, oidcId)), payload);
    });
    const oidcOk = oidcMatches && sourceOidc.length === actualOidc.size;
    console.log(`${oidcOk ? 'OK' : 'NG'} oidc mappings: source=${sourceOidc.length} target=${actualOidc.size}`);
    if (!oidcOk) failed = true;

    const result = {
      accounts: accountResponse.rows[0].n,
      permissions: permissionResponse.rows[0].n,
      oidcMappings: actualOidc.size,
      verified: !failed,
    };
    console.debug('result : ', result);
    if (failed) process.exitCode = 1;
    return result;
  } catch (error) {
    logError(error);
    throw error;
  } finally {
    console.debug('*** verify end ***');
  }
};

/** CLI コマンドを実行し、終了時には DB 接続を必ず閉じる。 */
const main = async () => {
  console.debug('*** main start ***');
  let sourceConnected = false;
  let targetConnected = false;
  try {
    if (!['init', 'migrate', 'verify'].includes(command)) {
      console.log('Usage: node src/index.js init | migrate [--dry-run] | verify');
      process.exitCode = 2;
      return;
    }

    await source.connect();
    sourceConnected = true;
    await target.connect();
    targetConnected = true;

    if (command === 'init') {
      await createSchema();
      console.log(`Initialized ${TARGET_SCHEMA}`);
    } else if (command === 'migrate') {
      await migrate();
    } else {
      await verify();
    }
  } catch (error) {
    logError(error);
    throw error;
  } finally {
    const closeActions = [];
    if (sourceConnected) closeActions.push(source.end());
    if (targetConnected) closeActions.push(target.end());
    const settled = await Promise.allSettled(closeActions);
    for (const item of settled) {
      if (item.status === 'rejected') logError(item.reason);
    }
    console.debug('*** main end ***');
  }
};

main().catch((error) => {
  // 詳細ログは各処理の catch で出力済み。終了コードのみ設定する。
  process.exitCode = 1;
});























