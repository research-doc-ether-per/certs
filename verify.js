
require("dotenv").config();

const { Client } = require("pg");

const SOURCE_SCHEMA = process.env.SOURCE_SCHEMA || "public";
const TARGET_SCHEMA = process.env.TARGET_SCHEMA || "wallet_app";

const SOURCE_DATABASE_URL = process.env.SOURCE_DATABASE_URL;
const TARGET_DATABASE_URL = process.env.TARGET_DATABASE_URL;

const MIGRATION_TABLES = [
  "accounts",
  "oidclogins",
  "account_wallet_mapping",
];

const command = process.argv[2];
const dryRun = process.argv.includes("--dry-run");

// PostgreSQL 識別子の検証
const quoteId = (value) => {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
    throw new Error(`Invalid SQL identifier: ${value}`);
  }

  return `"${value}"`;
};

const qs = quoteId(SOURCE_SCHEMA);
const qt = quoteId(TARGET_SCHEMA);

const createClient = (connectionString, name) => {
  if (!connectionString) {
    throw new Error(`Missing ${name} in .env`);
  }

  return new Client({ connectionString });
};

const source = createClient(
  SOURCE_DATABASE_URL,
  "SOURCE_DATABASE_URL"
);

const target = createClient(
  TARGET_DATABASE_URL,
  "TARGET_DATABASE_URL"
);

// エラーログ出力
const logError = (error) => {
  console.error("error.message: ", error.message);
  console.error("error.stack: ", error.stack);
};

// カラム値の文字列変換
const getTextField = (row, ...names) => {
  for (const name of names) {
    if (
      Object.prototype.hasOwnProperty.call(row, name) &&
      row[name] !== null &&
      row[name] !== undefined
    ) {
      return String(row[name]);
    }
  }

  return null;
};

// JSON データの比較
const deepEqual = (a, b) => {
  if (a === b) {
    return true;
  }

  if (
    a === null ||
    b === null ||
    typeof a !== typeof b
  ) {
    return false;
  }

  if (typeof a !== "object") {
    return false;
  }

  if (Array.isArray(a) || Array.isArray(b)) {
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((value, index) => deepEqual(value, b[index]))
    );
  }

  const keysA = Object.keys(a).sort();
  const keysB = Object.keys(b).sort();

  return (
    keysA.length === keysB.length &&
    keysA.every(
      (key, index) =>
        key === keysB[index] &&
        deepEqual(a[key], b[key])
    )
  );
};

// テーブル存在確認
const tableExists = async (client, schema, table) => {
  console.debug("*** tableExists start ***");

  try {
    const response = await client.query(
      `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = $1
          AND table_name = $2
          AND table_type = 'BASE TABLE'
      ) AS exists
      `,
      [schema, table]
    );

    const result = response.rows[0].exists;

    console.debug("result : ", {
      table,
      exists: result,
    });

    return result;
  } catch (error) {
    logError(error);
    throw error;
  } finally {
    console.debug("*** tableExists end ***");
  }
};

// 移行元テーブルの確認
const validateSourceTables = async () => {
  console.debug("*** validateSourceTables start ***");

  try {
    for (const table of MIGRATION_TABLES) {
      const exists = await tableExists(
        source,
        SOURCE_SCHEMA,
        table
      );

      if (!exists) {
        throw new Error(
          `Source table not found: ${SOURCE_SCHEMA}.${table}`
        );
      }
    }

    console.debug("result : ", {
      validatedTables: MIGRATION_TABLES,
    });
  } catch (error) {
    logError(error);
    throw error;
  } finally {
    console.debug("*** validateSourceTables end ***");
  }
};

// 移行先スキーマ・テーブル作成
const createSchema = async () => {
  console.debug("*** createSchema start ***");

  try {
    await target.query(`
      CREATE SCHEMA IF NOT EXISTS ${qt}
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

    await target.query(`
      CREATE INDEX IF NOT EXISTS idx_walt_custom_accounts_email
      ON ${qt}.accounts (email)
    `);

    await target.query(`
      CREATE INDEX IF NOT EXISTS idx_walt_custom_perm_wallet
      ON ${qt}.account_wallet_permissions (wallet_id)
    `);

    await target.query(`
      CREATE INDEX IF NOT EXISTS idx_walt_custom_oidc_id
      ON ${qt}.account_oidc_logins (oidc_id)
    `);

    console.debug("result : ", {
      schema: TARGET_SCHEMA,
      initialized: true,
    });
  } catch (error) {
    logError(error);
    throw error;
  } finally {
    console.debug("*** createSchema end ***");
  }
};

// 移行先テーブル構造の確認
const validateTargetSchema = async () => {
  console.debug("*** validateTargetSchema start ***");

  try {
    const definitions = {
      accounts: {
        columns: [
          "account_id",
          "name",
          "email",
          "password_hash",
          "created_on",
          "raw",
        ],
        primaryKey: ["account_id"],
      },
      account_wallet_permissions: {
        columns: [
          "account_id",
          "wallet_id",
          "permissions",
          "added_on",
          "raw",
        ],
        primaryKey: ["account_id", "wallet_id"],
      },
      account_oidc_logins: {
        columns: [
          "account_id",
          "oidc_id",
          "raw",
        ],
        primaryKey: ["account_id", "oidc_id"],
      },
    };

    for (const [table, definition] of Object.entries(definitions)) {
      const response = await target.query(
        `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = $1
          AND table_name = $2
        `,
        [TARGET_SCHEMA, table]
      );

      const columns = new Set(
        response.rows.map((row) => row.column_name)
      );

      const missing = definition.columns.filter(
        (column) => !columns.has(column)
      );

      if (missing.length > 0) {
        throw new Error(
          `Invalid target table ${table}. Missing: ${missing.join(", ")}`
        );
      }

      const pkResponse = await target.query(
        `
        SELECT a.attname AS column_name
        FROM pg_constraint c
        JOIN pg_class t
          ON t.oid = c.conrelid
        JOIN pg_namespace n
          ON n.oid = t.relnamespace
        JOIN unnest(c.conkey) WITH ORDINALITY AS k(attnum, position)
          ON TRUE
        JOIN pg_attribute a
          ON a.attrelid = t.oid
         AND a.attnum = k.attnum
        WHERE n.nspname = $1
          AND t.relname = $2
          AND c.contype = 'p'
        ORDER BY k.position
        `,
        [TARGET_SCHEMA, table]
      );

      const actualPrimaryKey = pkResponse.rows.map(
        (row) => row.column_name
      );

      if (!deepEqual(actualPrimaryKey, definition.primaryKey)) {
        throw new Error(
          `Invalid primary key in ${table}: ${actualPrimaryKey.join(", ")}`
        );
      }
    }

    console.debug("result : ", {
      schema: TARGET_SCHEMA,
      valid: true,
    });

    return true;
  } catch (error) {
    logError(error);
    throw error;
  } finally {
    console.debug("*** validateTargetSchema end ***");
  }
};

// 移行元データ取得
const extractRows = async (table) => {
  console.debug("*** extractRows start ***");

  try {
    if (!MIGRATION_TABLES.includes(table)) {
      throw new Error(`Unsupported source table: ${table}`);
    }

    const response = await source.query(`
      SELECT to_jsonb(t) AS payload
      FROM ${qs}.${quoteId(table)} t
    `);

    const result = response.rows.map(
      (row) => row.payload
    );

    console.debug("result : ", {
      table,
      count: result.length,
    });

    return result;
  } catch (error) {
    logError(error);
    throw error;
  } finally {
    console.debug("*** extractRows end ***");
  }
};

// アカウント情報の移行
const migrateAccount = async (row) => {
  console.debug("*** migrateAccount start ***");

  try {
    const accountId = getTextField(row, "id");

    if (!accountId) {
      throw new Error("accounts.id is missing");
    }

    const response = await target.query(
      `
      INSERT INTO ${qt}.accounts (
        account_id,
        name,
        email,
        password_hash,
        created_on,
        raw
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb)
      ON CONFLICT (account_id)
      DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        password_hash = EXCLUDED.password_hash,
        created_on = EXCLUDED.created_on,
        raw = EXCLUDED.raw
      `,
      [
        accountId,
        getTextField(row, "name"),
        getTextField(row, "email"),
        getTextField(row, "password"),
        getTextField(row, "createdOn", "created_on"),
        JSON.stringify(row),
      ]
    );

    const result = {
      accountId,
      migrated: response.rowCount === 1,
    };

    console.debug("result : ", result);

    return result;
  } catch (error) {
    logError(error);
    throw error;
  } finally {
    console.debug("*** migrateAccount end ***");
  }
};

// Wallet 権限情報の移行
const migratePermissions = async (row) => {
  console.debug("*** migratePermissions start ***");

  try {
    const accountId = getTextField(row, "id");
    const walletId = getTextField(row, "wallet");

    if (!accountId || !walletId) {
      throw new Error(
        "account_wallet_mapping.id or wallet is missing"
      );
    }

    const response = await target.query(
      `
      INSERT INTO ${qt}.account_wallet_permissions (
        account_id,
        wallet_id,
        permissions,
        added_on,
        raw
      )
      VALUES ($1, $2, $3, $4, $5::jsonb)
      ON CONFLICT (account_id, wallet_id)
      DO UPDATE SET
        permissions = EXCLUDED.permissions,
        added_on = EXCLUDED.added_on,
        raw = EXCLUDED.raw
      `,
      [
        accountId,
        walletId,
        getTextField(row, "permissions"),
        getTextField(row, "added_on", "addedOn"),
        JSON.stringify(row),
      ]
    );

    const result = {
      accountId,
      walletId,
      migrated: response.rowCount === 1,
    };

    console.debug("result : ", result);

    return result;
  } catch (error) {
    logError(error);
    throw error;
  } finally {
    console.debug("*** migratePermissions end ***");
  }
};

// OIDC ログイン情報の移行
const migrateOidcLogin = async (row) => {
  console.debug("*** migrateOidcLogin start ***");

  try {
    const accountId = getTextField(
      row,
      "accountId",
      "account_id"
    );

    const oidcId = getTextField(
      row,
      "oidcId",
      "oidc_id"
    );

    if (!accountId || !oidcId) {
      throw new Error(
        "oidclogins.accountId or oidcId is missing"
      );
    }

    const response = await target.query(
      `
      INSERT INTO ${qt}.account_oidc_logins (
        account_id,
        oidc_id,
        raw
      )
      VALUES ($1, $2, $3::jsonb)
      ON CONFLICT (account_id, oidc_id)
      DO UPDATE SET
        raw = EXCLUDED.raw
      `,
      [
        accountId,
        oidcId,
        JSON.stringify(row),
      ]
    );

    const result = {
      accountId,
      migrated: response.rowCount === 1,
    };

    console.debug("result : ", result);

    return result;
  } catch (error) {
    logError(error);
    throw error;
  } finally {
    console.debug("*** migrateOidcLogin end ***");
  }
};

// 各テーブルの移行処理
const migrateTable = async (table) => {
  console.debug("*** migrateTable start ***");

  try {
    const rows = await extractRows(table);

    let migratedCount = 0;

    for (const row of rows) {
      switch (table) {
        case "accounts":
          await migrateAccount(row);
          break;

        case "oidclogins":
          await migrateOidcLogin(row);
          break;

        case "account_wallet_mapping":
          await migratePermissions(row);
          break;

        default:
          throw new Error(`Unsupported table: ${table}`);
      }

      migratedCount++;
    }

    const result = {
      table,
      sourceCount: rows.length,
      migratedCount,
    };

    console.debug("result : ", result);

    return result;
  } catch (error) {
    logError(error);
    throw error;
  } finally {
    console.debug("*** migrateTable end ***");
  }
};

// 移行処理
const migrate = async () => {
  console.debug("*** migrate start ***");

  let transactionStarted = false;

  try {
    await validateSourceTables();

    await target.query("BEGIN");
    transactionStarted = true;

    await createSchema();
    await validateTargetSchema();

    const results = [];

    for (const table of MIGRATION_TABLES) {
      const result = await migrateTable(table);
      results.push(result);
    }

    const total = results.reduce(
      (sum, item) => sum + item.migratedCount,
      0
    );

    if (dryRun) {
      await target.query("ROLLBACK");
      transactionStarted = false;

      console.log("====================================");
      console.log("Migration DRY RUN complete");
      console.log("====================================");
    } else {
      await target.query("COMMIT");
      transactionStarted = false;

      console.log("====================================");
      console.log("Migration complete");
      console.log("====================================");
    }

    for (const result of results) {
      console.log(
        `${result.table}: ${result.migratedCount}`
      );
    }

    console.log(`Total: ${total}`);
    console.log("Errors: 0");
    console.log("====================================");

    console.debug("result : ", {
      dryRun,
      total,
      tables: results,
    });

    return results;
  } catch (error) {
    if (transactionStarted) {
      try {
        await target.query("ROLLBACK");
      } catch (rollbackError) {
        logError(rollbackError);
      }
    }

    logError(error);
    throw error;
  } finally {
    console.debug("*** migrate end ***");
  }
};

// 移行元レコードのキー生成
const getRecordKey = (table, row) => {
  switch (table) {
    case "accounts":
      return getTextField(row, "id");

    case "oidclogins": {
      const accountId = getTextField(
        row,
        "accountId",
        "account_id"
      );
      const oidcId = getTextField(
        row,
        "oidcId",
        "oidc_id"
      );

      return accountId && oidcId
        ? JSON.stringify([accountId, oidcId])
        : null;
    }

    case "account_wallet_mapping": {
      const accountId = getTextField(row, "id");
      const walletId = getTextField(row, "wallet");

      return accountId && walletId
        ? JSON.stringify([accountId, walletId])
        : null;
    }

    default:
      throw new Error(`Unsupported table: ${table}`);
  }
};

// 移行元と移行先のフィールド比較
const compareMigratedRow = (table, sourceRow, targetRow) => {
  if (!targetRow) {
    return false;
  }

  if (!deepEqual(sourceRow, targetRow.raw)) {
    return false;
  }

  switch (table) {
    case "accounts":
      return (
        targetRow.account_id === getTextField(sourceRow, "id") &&
        targetRow.name === getTextField(sourceRow, "name") &&
        targetRow.email === getTextField(sourceRow, "email") &&
        targetRow.password_hash === getTextField(sourceRow, "password") &&
        targetRow.created_on ===
          getTextField(sourceRow, "createdOn", "created_on")
      );

    case "oidclogins":
      return (
        targetRow.account_id ===
          getTextField(sourceRow, "accountId", "account_id") &&
        targetRow.oidc_id ===
          getTextField(sourceRow, "oidcId", "oidc_id")
      );

    case "account_wallet_mapping":
      return (
        targetRow.account_id === getTextField(sourceRow, "id") &&
        targetRow.wallet_id === getTextField(sourceRow, "wallet") &&
        targetRow.permissions ===
          getTextField(sourceRow, "permissions") &&
        targetRow.added_on ===
          getTextField(sourceRow, "added_on", "addedOn")
      );

    default:
      return false;
  }
};

// 移行先テーブル名の取得
const getTargetTableName = (table) => {
  switch (table) {
    case "accounts":
      return "accounts";

    case "oidclogins":
      return "account_oidc_logins";

    case "account_wallet_mapping":
      return "account_wallet_permissions";

    default:
      throw new Error(`Unsupported table: ${table}`);
  }
};

// テーブル単位の移行検証
const verifyTable = async (table) => {
  console.debug("*** verifyTable start ***");

  try {
    const sourceRows = await extractRows(table);
    const targetTable = getTargetTableName(table);

    const response = await target.query(`
      SELECT *
      FROM ${qt}.${quoteId(targetTable)}
    `);

    const targetRows = response.rows;

    const targetMap = new Map();
    let duplicateTargetKeys = false;

    for (const row of targetRows) {
      let key;

      if (table === "accounts") {
        key = row.account_id;
      } else if (table === "oidclogins") {
        key = JSON.stringify([
          row.account_id,
          row.oidc_id,
        ]);
      } else {
        key = JSON.stringify([
          row.account_id,
          row.wallet_id,
        ]);
      }

      if (targetMap.has(key)) {
        duplicateTargetKeys = true;
      }

      targetMap.set(key, row);
    }

    const sourceKeys = new Set();
    let duplicateSourceKeys = false;
    let matchedCount = 0;

    for (const row of sourceRows) {
      const key = getRecordKey(table, row);

      if (!key) {
        continue;
      }

      if (sourceKeys.has(key)) {
        duplicateSourceKeys = true;
      }

      sourceKeys.add(key);

      const targetRow = targetMap.get(key);

      if (compareMigratedRow(table, row, targetRow)) {
        matchedCount++;
      }
    }

    const ok =
      !duplicateSourceKeys &&
      !duplicateTargetKeys &&
      sourceRows.length === targetRows.length &&
      matchedCount === sourceRows.length;

    const result = {
      table,
      sourceCount: sourceRows.length,
      targetCount: targetRows.length,
      matchedCount,
      ok,
    };

    console.log(
      `${ok ? "OK" : "NG"} ${table}: ` +
      `source=${result.sourceCount}, ` +
      `target=${result.targetCount}, ` +
      `matched=${result.matchedCount}`
    );

    console.debug("result : ", result);

    return result;
  } catch (error) {
    logError(error);
    throw error;
  } finally {
    console.debug("*** verifyTable end ***");
  }
};

// アカウントと Wallet の関連確認
const verifyAccountWalletRelations = async () => {
  console.debug("*** verifyAccountWalletRelations start ***");

  try {
    const accountResponse = await target.query(`
      SELECT COUNT(*)::int AS count
      FROM ${qt}.account_wallet_permissions p
      LEFT JOIN ${qt}.accounts a
        ON a.account_id = p.account_id
      WHERE a.account_id IS NULL
    `);

    const missingAccounts = accountResponse.rows[0].count;

    const wallet2Exists = await tableExists(
      target,
      "public",
      "wallet2_account_wallets"
    );

    let missingWalletMappings = null;

    if (wallet2Exists) {
      const walletResponse = await target.query(`
        SELECT COUNT(*)::int AS count
        FROM ${qt}.account_wallet_permissions p
        LEFT JOIN public.wallet2_account_wallets w
          ON w.account_id = p.account_id
         AND w.wallet_id = p.wallet_id
        WHERE w.account_id IS NULL
      `);

      missingWalletMappings = walletResponse.rows[0].count;
    }

    const oidcResponse = await target.query(`
      SELECT COUNT(*)::int AS count
      FROM ${qt}.account_oidc_logins o
      LEFT JOIN ${qt}.accounts a
        ON a.account_id = o.account_id
      WHERE a.account_id IS NULL
    `);

    const missingOidcAccounts = oidcResponse.rows[0].count;

    const ok =
      missingAccounts === 0 &&
      missingOidcAccounts === 0 &&
      missingWalletMappings === 0;

    const result = {
      missingAccounts,
      missingOidcAccounts,
      missingWalletMappings,
      wallet2Exists,
      ok,
    };

    console.log(
      `${ok ? "OK" : "NG"} Account-Wallet relations`
    );

    console.log(
      `Missing accounts: ${missingAccounts}`
    );

    console.log(
      `Missing OIDC accounts: ${missingOidcAccounts}`
    );

    console.log(
      `Missing wallet2 mappings: ${
        missingWalletMappings === null
          ? "NOT CHECKED"
          : missingWalletMappings
      }`
    );

    console.debug("result : ", result);

    return result;
  } catch (error) {
    logError(error);
    throw error;
  } finally {
    console.debug("*** verifyAccountWalletRelations end ***");
  }
};

// 移行結果の検証
const verify = async () => {
  console.debug("*** verify start ***");

  try {
    await validateSourceTables();
    await validateTargetSchema();

    console.log("====================================");
    console.log("Migration verification");
    console.log("====================================");

    const results = [];

    for (const table of MIGRATION_TABLES) {
      const result = await verifyTable(table);
      results.push(result);
    }

    const relations = await verifyAccountWalletRelations();

    const ok =
      results.every((result) => result.ok) &&
      relations.ok;

    console.log("====================================");
    console.log(
      `Verification: ${ok ? "SUCCESS" : "FAILED"}`
    );
    console.log("====================================");

    if (!ok) {
      process.exitCode = 1;
    }

    console.debug("result : ", {
      ok,
      tables: results,
      relations,
    });

    return ok;
  } catch (error) {
    logError(error);
    throw error;
  } finally {
    console.debug("*** verify end ***");
  }
};

// メイン処理
const main = async () => {
  console.debug("*** main start ***");

  let sourceConnected = false;
  let targetConnected = false;

  try {
    if (!["init", "migrate", "verify"].includes(command)) {
      console.log(
        "Usage: node src/index.js init | migrate [--dry-run] | verify"
      );

      process.exitCode = 2;
      return;
    }

    if (command !== "init") {
      await source.connect();
      sourceConnected = true;
    }

    await target.connect();
    targetConnected = true;

    switch (command) {
      case "init":
        await createSchema();
        await validateTargetSchema();

        console.log(
          `Initialized schema: ${TARGET_SCHEMA}`
        );
        break;

      case "migrate":
        await migrate();
        break;

      case "verify":
        await verify();
        break;
    }

    console.debug("result : ", {
      command,
      dryRun,
    });
  } catch (error) {
    logError(error);
    process.exitCode = 1;
  } finally {
    const connections = [];

    if (sourceConnected) {
      connections.push(source.end());
    }

    if (targetConnected) {
      connections.push(target.end());
    }

    await Promise.allSettled(connections);

    console.debug("*** main end ***");
  }
};

main().catch((error) => {
  logError(error);
  process.exitCode = 1;
});
