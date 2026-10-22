-- ============================================================
-- walt.id v0.15.1 → v1.0.0 Custom Migration
-- PostgreSQL 拡張スキーマ
--
-- tenant は旧システムで未使用のため、正規化テーブルには保存しない。
-- ただし、legacy_rows.payload および各 raw カラムには保持する。
-- 公式 wallet2_* テーブルの定義・データは変更しない。
-- ============================================================

CREATE SCHEMA IF NOT EXISTS wallet_app;

-- 全 17 旧テーブルの元データを JSONB で保管する。
CREATE TABLE IF NOT EXISTS wallet_app.legacy_rows (
    source_table TEXT NOT NULL,
    source_key TEXT NOT NULL,
    payload JSONB NOT NULL,
    migrated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (source_table, source_key)
);

-- メール認証・OIDC 認証共通のアカウント。
-- NULL: name / email / password_hash / created_on は未設定可能。
CREATE TABLE IF NOT EXISTS wallet_app.accounts (
    account_id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT,
    password_hash TEXT,
    created_on TEXT,
    raw JSONB NOT NULL
);

-- 旧 account_wallet_mapping.permissions を保持する。
-- NULL: permissions / added_on は未設定可能。
CREATE TABLE IF NOT EXISTS wallet_app.account_wallet_permissions (
    account_id TEXT NOT NULL,
    wallet_id TEXT NOT NULL,
    permissions TEXT,
    added_on TEXT,
    raw JSONB NOT NULL,
    PRIMARY KEY (account_id, wallet_id)
);

-- OIDC ログインと元の account_id の関連を保持する。
CREATE TABLE IF NOT EXISTS wallet_app.account_oidc_logins (
    account_id TEXT NOT NULL,
    oidc_id TEXT NOT NULL,
    raw JSONB NOT NULL,
    PRIMARY KEY (account_id, oidc_id)
);

CREATE INDEX IF NOT EXISTS idx_walt_custom_accounts_email
    ON wallet_app.accounts (email);
CREATE INDEX IF NOT EXISTS idx_walt_custom_perm_wallet
    ON wallet_app.account_wallet_permissions (wallet_id);
CREATE INDEX IF NOT EXISTS idx_walt_custom_oidc_id
    ON wallet_app.account_oidc_logins (oidc_id);

'use strict';

require('dotenv').config();
const { Client } = require('pg');

/** v0.15.1 の移行元テーブル一覧。元データは JSONB 形式で全件保管する。 */
const LEGACY_TABLES = [
  'account_wallet_mapping', 'accounts', 'category', 'credential_category',
  'credentials', 'entity_name_resolution_cache', 'events', 'notifications',
  'oidclogins', 'wallet_dids', 'wallet_issuers', 'wallet_keys',
  'wallet_operation_histories', 'wallet_settings', 'wallets',
  'web3wallets', 'x5clogins',
];

const SOURCE_SCHEMA = process.env.SOURCE_SCHEMA || 'public';
const TARGET_SCHEMA = process.env.TARGET_SCHEMA || 'wallet_app';
const command = process.argv[2];
const dryRun = process.argv.includes('--dry-run');

/** SQL 識別子を安全に引用する。 */
const quoteId = (value) => {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
    throw new Error(`Invalid SQL identifier: ${value}`);
  }
  return `"${value}"`;
};

const qs = quoteId(SOURCE_SCHEMA);
const qt = quoteId(TARGET_SCHEMA);

/** DB 接続設定を環境変数から取得する。 */
const getDbConfig = (name) => {
  const connectionString = process.env[name];
  if (!connectionString) {
    throw new Error(`Missing ${name}. Please configure .env.`);
  }
  return { connectionString };
};

const source = new Client(getDbConfig('SOURCE_DATABASE_URL'));
const target = new Client(getDbConfig('TARGET_DATABASE_URL'));

/** 個人情報やパスワードをログに出力せず、例外情報のみ記録する。 */
const logError = (error) => {
  console.error('error.message: ', error.message);
  console.error('error.stack: ', error.stack);
};

/** NULL / 未定義値を除き、値を文字列として取得する。 */
const textField = (row, ...names) => {
  for (const name of names) {
    if (Object.hasOwn(row, name)) {
      const value = row[name];
      return value === null || value === undefined ? null : String(value);
    }
  }
  return null;
};

/**
 * カスタム保存先スキーマとテーブルを作成する。
 * tenant は業務上未使用なので正規化テーブルに含めない。
 * 旧 tenant の値は raw / legacy_rows にそのまま残す。
 * 注意: CREATE TABLE IF NOT EXISTS は既存の主キーを変更しない。
 */
const createSchema = async () => {
  console.debug('*** createSchema start ***');
  try {
    await target.query(`CREATE SCHEMA IF NOT EXISTS ${qt}`);
    await target.query(`
      CREATE TABLE IF NOT EXISTS ${qt}.legacy_rows (
        source_table TEXT NOT NULL,
        source_key TEXT NOT NULL,
        payload JSONB NOT NULL,
        migrated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (source_table, source_key)
      )
    `);
    await target.query(`
      CREATE TABLE IF NOT EXISTS ${qt}.accounts (
        account_id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT,
        password_hash TEXT,
        created_on TEXT,
        raw JSONB NOT NULL
      )
    `);
    await target.query(`
      CREATE TABLE IF NOT EXISTS ${qt}.account_wallet_permissions (
        account_id TEXT NOT NULL,
        wallet_id TEXT NOT NULL,
        permissions TEXT,
        added_on TEXT,
        raw JSONB NOT NULL,
        PRIMARY KEY (account_id, wallet_id)
      )
    `);
    await target.query(`
      CREATE TABLE IF NOT EXISTS ${qt}.account_oidc_logins (
        account_id TEXT NOT NULL,
        oidc_id TEXT NOT NULL,
        raw JSONB NOT NULL,
        PRIMARY KEY (account_id, oidc_id)
      )
    `);
    await target.query(`CREATE INDEX IF NOT EXISTS idx_walt_custom_accounts_email ON ${qt}.accounts (email)`);
    await target.query(`CREATE INDEX IF NOT EXISTS idx_walt_custom_perm_wallet ON ${qt}.account_wallet_permissions (wallet_id)`);
    await target.query(`CREATE INDEX IF NOT EXISTS idx_walt_custom_oidc_id ON ${qt}.account_oidc_logins (oidc_id)`);
    console.debug('result : ', { schema: TARGET_SCHEMA, initialized: true });
  } catch (error) {
    logError(error);
    throw error;
  } finally {
    console.debug('*** createSchema end ***');
  }
};

/**
 * 旧 tenant 付きの主キーを利用した既存構造を検出する。
 * 旧バージョンの schema.sql から作成した表は、自動変更しない。
 */
const assertTargetSchema = async () => {
  console.debug('*** assertTargetSchema start ***');
  try {
    const expected = {
      accounts: ['account_id'],
      account_wallet_permissions: ['account_id', 'wallet_id'],
      account_oidc_logins: ['account_id', 'oidc_id'],
    };
    for (const [table, columns] of Object.entries(expected)) {
      const result = await target.query(`
        SELECT array_agg(a.attname ORDER BY k.ordinality)::text[] AS columns
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        JOIN unnest(c.conkey) WITH ORDINALITY AS k(attnum, ordinality) ON TRUE
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
        WHERE n.nspname = $1 AND t.relname = $2 AND c.contype = 'p'
      `, [TARGET_SCHEMA, table]);
      const actual = result.rows[0]?.columns || [];
      if (JSON.stringify(actual) !== JSON.stringify(columns)) {
        throw new Error(`${TARGET_SCHEMA}.${table} primary key mismatch: actual=[${actual}], expected=[${columns}]. Existing tenant-based tables must be migrated explicitly.`);
      }
      const fields = await target.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
      `, [TARGET_SCHEMA, table]);
      const current = new Set(fields.rows.map((r) => r.column_name));
      const required = table === 'accounts'
        ? ['account_id', 'name', 'email', 'password_hash', 'created_on', 'raw']
        : table === 'account_wallet_permissions'
          ? ['account_id', 'wallet_id', 'permissions', 'added_on', 'raw']
          : ['account_id', 'oidc_id', 'raw'];
      if (required.some((name) => !current.has(name)) || current.has('tenant')) {
        throw new Error(`${TARGET_SCHEMA}.${table} is not the expected tenant-free table definition.`);
      }
    }
    console.debug('result : ', { schemaValidated: true });
  } catch (error) {
    logError(error);
    throw error;
  } finally {
    console.debug('*** assertTargetSchema end ***');
  }
};

/** 移行元テーブルを列挙する。 */
const getSourceTables = async () => {
  console.debug('*** getSourceTables start ***');
  try {
    const response = await source.query(`
      SELECT table_name FROM information_schema.tables
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
 * 原本の行を JSONB に変換して取得する。
 * 同一内容が複数存在しても occurrence を追加して個別に保存する。
 * JSONB の同内容行の識別順序には元の物理的な行 ID を使用しないため、
 * 行内容が更新される場合は全件検証して再移行する。
 */
const extractRows = async (table) => {
  console.debug(`*** extractRows start: ${table} ***`);
  try {
    const response = await source.query(`
      SELECT payload,
             md5(payload::text) AS fingerprint,
             row_number() OVER (PARTITION BY payload ORDER BY payload::text) AS occurrence
      FROM (SELECT to_jsonb(t) AS payload FROM ${qs}.${quoteId(table)} t) x
      ORDER BY fingerprint, occurrence
    `);
    const result = response.rows.map((row) => ({
      payload: row.payload,
      source_key: `${row.fingerprint}:${row.occurrence}`,
    }));
    console.debug('result : ', { table, rowCount: result.length });
    return result;
  } catch (error) {
    logError(error);
    throw error;
  } finally {
    console.debug(`*** extractRows end: ${table} ***`);
  }
};

/** 旧データの全カラムを JSONB として保管する。 */
const upsertArchive = async (table, item) => {
  console.debug('*** upsertArchive start ***');
  try {
    await target.query(`
      INSERT INTO ${qt}.legacy_rows (source_table, source_key, payload)
      VALUES ($1, $2, $3::jsonb)
      ON CONFLICT (source_table, source_key)
      DO UPDATE SET payload = EXCLUDED.payload
    `, [table, item.source_key, JSON.stringify(item.payload)]);
  } catch (error) {
    logError(error);
    throw error;
  } finally {
    console.debug('*** upsertArchive end ***');
  }
};

/**
 * メール・パスワード認証と OIDC 認証に共通するアカウントを移行する。
 * パスワードのハッシュ値をそのまま保存し、再ハッシュは行わない。
 */
const migrateAccount = async (row) => {
  console.debug('*** migrateAccount start ***');
  try {
    const accountId = textField(row, 'id');
    if (!accountId) throw new Error('accounts.id is missing');
    await target.query(`
      INSERT INTO ${qt}.accounts (account_id, name, email, password_hash, created_on, raw)
      VALUES ($1, $2, $3, $4, $5, $6::jsonb)
      ON CONFLICT (account_id) DO UPDATE SET
        name = EXCLUDED.name, email = EXCLUDED.email,
        password_hash = EXCLUDED.password_hash, created_on = EXCLUDED.created_on,
        raw = EXCLUDED.raw
    `, [accountId, textField(row, 'name'), textField(row, 'email'),
      textField(row, 'password'), textField(row, 'createdOn', 'created_on'), JSON.stringify(row)]);
    console.debug('result : ', { accountId, migrated: true });
  } catch (error) {
    logError(error);
    throw error;
  } finally {
    console.debug('*** migrateAccount end ***');
  }
};

/** Wallet とアカウントの権限情報を移行する。 */
const migratePermissions = async (row) => {
  console.debug('*** migratePermissions start ***');
  try {
    const accountId = textField(row, 'id');
    const walletId = textField(row, 'wallet');
    if (!accountId || !walletId) throw new Error('account_wallet_mapping id/wallet is missing');
    await target.query(`
      INSERT INTO ${qt}.account_wallet_permissions
        (account_id, wallet_id, permissions, added_on, raw)
      VALUES ($1, $2, $3, $4, $5::jsonb)
      ON CONFLICT (account_id, wallet_id) DO UPDATE SET
        permissions = EXCLUDED.permissions, added_on = EXCLUDED.added_on,
        raw = EXCLUDED.raw
    `, [accountId, walletId, textField(row, 'permissions'),
      textField(row, 'added_on'), JSON.stringify(row)]);
    console.debug('result : ', { accountId, walletId, migrated: true });
  } catch (error) {
    logError(error);
    throw error;
  } finally {
    console.debug('*** migratePermissions end ***');
  }
};

/** 旧 OIDC 識別子を既存アカウント ID に紐づける。 */
const migrateOidcLogin = async (row) => {
  console.debug('*** migrateOidcLogin start ***');
  try {
    const accountId = textField(row, 'accountId', 'account_id');
    const oidcId = textField(row, 'oidcId', 'oidc_id');
    if (!accountId || !oidcId) throw new Error('oidclogins accountId/oidcId is missing');
    await target.query(`
      INSERT INTO ${qt}.account_oidc_logins (account_id, oidc_id, raw)
      VALUES ($1, $2, $3::jsonb)
      ON CONFLICT (account_id, oidc_id) DO UPDATE SET raw = EXCLUDED.raw
    `, [accountId, oidcId, JSON.stringify(row)]);
    console.debug('result : ', { accountId, migrated: true });
  } catch (error) {
    logError(error);
    throw error;
  } finally {
    console.debug('*** migrateOidcLogin end ***');
  }
};

/** 旧スキーマの存在を確認し、不足があれば書き込み前に中断する。 */
const assertSourceTables = async () => {
  console.debug('*** assertSourceTables start ***');
  try {
    const actual = await getSourceTables();
    const missing = LEGACY_TABLES.filter((table) => !actual.has(table));
    if (missing.length) throw new Error(`Missing source tables: ${missing.join(', ')}`);
    console.debug('result : ', { checked: LEGACY_TABLES.length });
  } catch (error) {
    logError(error);
    throw error;
  } finally {
    console.debug('*** assertSourceTables end ***');
  }
};

/**
 * 旧 17 テーブルを保管し、アカウント・権限・OIDC を正規化する。
 * dry-run はすべてのターゲット操作を ROLLBACK する。
 */
const migrate = async () => {
  console.debug('*** migrate start ***');
  let transactionStarted = false;
  try {
    await assertSourceTables();
    await target.query('BEGIN');
    transactionStarted = true;
    await createSchema();
    await assertTargetSchema();

    let total = 0;
    const tableCounts = {};
    for (const name of LEGACY_TABLES) {
      const rows = await extractRows(name);
      for (const item of rows) {
        await upsertArchive(name, item);
        if (name === 'accounts') await migrateAccount(item.payload);
        if (name === 'account_wallet_mapping') await migratePermissions(item.payload);
        if (name === 'oidclogins') await migrateOidcLogin(item.payload);
      }
      total += rows.length;
      tableCounts[name] = rows.length;
      console.log(`${name}: ${rows.length} rows`);
    }

    if (dryRun) {
      await target.query('ROLLBACK');
      transactionStarted = false;
      console.log(`DRY RUN: ${total} rows processed. All target changes rolled back.`);
    } else {
      await target.query('COMMIT');
      transactionStarted = false;
      console.log(`Migration complete: ${total} rows archived. wallet2_* tables untouched.`);
    }
    console.debug('result : ', { dryRun, total, tableCounts });
  } catch (error) {
    if (transactionStarted) {
      try { await target.query('ROLLBACK'); } catch (rollbackError) { logError(rollbackError); }
    }
    logError(error);
    throw error;
  } finally {
    console.debug('*** migrate end ***');
  }
};

/** JSON オブジェクトをキー順序によらず比較する。 */
const deepEqual = (a, b) => {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
  }
  const ak = Object.keys(a).sort();
  const bk = Object.keys(b).sort();
  return ak.length === bk.length && ak.every((key, i) => key === bk[i] && deepEqual(a[key], b[key]));
};

/** 元テーブルと保管データ、及び認証関連の件数を検証する。 */
const verify = async () => {
  console.debug('*** verify start ***');
  try {
    await assertSourceTables();
    await assertTargetSchema();
    let failed = false;
    for (const name of LEGACY_TABLES) {
      const original = await extractRows(name);
      const response = await target.query(`
        SELECT source_key, payload FROM ${qt}.legacy_rows WHERE source_table = $1
      `, [name]);
      const archived = new Map(response.rows.map((row) => [row.source_key, row.payload]));
      const matched = original.every((item) => {
        const stored = archived.get(item.source_key);
        return stored !== undefined && deepEqual(stored, item.payload);
      });
      const ok = matched && original.length === archived.size;
      console.log(`${ok ? 'OK' : 'NG'} ${name}: source=${original.length}, archive=${archived.size}`);
      if (!ok) failed = true;
    }

    const extraTables = [
      ['accounts', 'accounts'],
      ['account_wallet_mapping', 'account_wallet_permissions'],
      ['oidclogins', 'account_oidc_logins'],
    ];
    for (const [oldTable, newTable] of extraTables) {
      const original = await source.query(`SELECT COUNT(*)::int AS n FROM ${qs}.${quoteId(oldTable)}`);
      const current = await target.query(`SELECT COUNT(*)::int AS n FROM ${qt}.${quoteId(newTable)}`);
      const ok = original.rows[0].n === current.rows[0].n;
      console.log(`${ok ? 'OK' : 'NG'} ${newTable}: source=${original.rows[0].n}, target=${current.rows[0].n}`);
      if (!ok) failed = true;
    }

    // OIDC / 権限の参照先アカウントが新 DB に存在することを確認する。
    for (const name of ['account_wallet_permissions', 'account_oidc_logins']) {
      const response = await target.query(`
        SELECT COUNT(*)::int AS n FROM ${qt}.${quoteId(name)} r
        LEFT JOIN ${qt}.accounts a ON a.account_id = r.account_id
        WHERE a.account_id IS NULL
      `);
      if (response.rows[0].n > 0) {
        console.error(`NG ${name}: ${response.rows[0].n} references to missing accounts`);
        failed = true;
      }
    }

    // 同一 oidc_id に異なるアカウントが割り当てられていないか調べる。
    const duplicates = await target.query(`
      SELECT COUNT(*)::int AS n FROM (
        SELECT oidc_id FROM ${qt}.account_oidc_logins
        GROUP BY oidc_id HAVING COUNT(DISTINCT account_id) > 1
      ) duplicates
    `);
    if (duplicates.rows[0].n) {
      console.error(`NG: ${duplicates.rows[0].n} oidc_id values linked to multiple accounts`);
      failed = true;
    }

    if (failed) {
      process.exitCode = 1;
      console.error('Verification FAILED.');
    } else {
      console.log('Verification OK.');
    }
  } catch (error) {
    logError(error);
    throw error;
  } finally {
    console.debug('*** verify end ***');
  }
};

/** CLI コマンドを実行し、接続を確実に閉じる。 */
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
    // init コマンドは移行元 DB に接続しなくても実行できる。
    if (command !== 'init') {
      await source.connect();
      sourceConnected = true;
    }
    await target.connect();
    targetConnected = true;

    if (command === 'init') {
      await target.query('BEGIN');
      try {
        await createSchema();
        await assertTargetSchema();
        await target.query('COMMIT');
      } catch (error) {
        await target.query('ROLLBACK');
        throw error;
      }
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
    const operations = [];
    if (sourceConnected) operations.push(source.end());
    if (targetConnected) operations.push(target.end());
    await Promise.allSettled(operations);
    console.debug('*** main end ***');
  }
};

main().catch((error) => {
  console.error('Migration tool failed:', error.message);
  process.exitCode = 1;
});
