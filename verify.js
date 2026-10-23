const { Client } = require('pg')
const log4js = require('log4js')
let log4jsConfig = require('../config/log4js.json')
const { db } = require('../config/config.json')

const fileName = 'migrate'
log4jsConfig.appenders.file.filename = `./logs/${fileName}.log`
log4js.configure(log4jsConfig)
const logger = log4js.getLogger(fileName)

const SOURCE_SCHEMA = db.source_schema || 'public'
const TARGET_SCHEMA = db.target_schema || 'wallet_app'

const MIGRATION_TABLES = [
    'accounts',
    'oidclogins',
    'account_wallet_mapping',
    'wallet_dids',
]

const REQUIRED_SOURCE_TABLES = [
    'accounts',
    'oidclogins',
    'account_wallet_mapping',
    'wallets',
    'wallet_dids',
]

const command = process.argv[2]
const dryRun = process.argv.includes('--dry-run')

// PostgreSQL 識別子の検証
const quoteId = (value) => {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
        throw new Error(`Invalid SQL identifier: ${value}`)
    }

    return `"${value}"`
}

const qs = quoteId(SOURCE_SCHEMA)
const qt = quoteId(TARGET_SCHEMA)

const source = new Client({
    connectionString: db.source_database_url,
})

const target = new Client({
    connectionString: db.target_database_url,
})

// エラーログ
const logError = (error) => {
    logger.error('error.message: ', error.message)
    logger.error('error.stack: ', error.stack)
}

// カラム値の取得
const getTextField = (row, ...names) => {
    for (const name of names) {
        if (Object.hasOwn(row, name)) {
            const value = row[name]
            return value === null || value === undefined
                ? null
                : String(value)
        }
    }

    return null
}

// テーブル作成
const createSchema = async () => {
    logger.debug('*** createSchema start ***')

    try {
        await target.query(`
            CREATE SCHEMA IF NOT EXISTS ${qt}
        `)

        // アカウント情報
        await target.query(`
            CREATE TABLE IF NOT EXISTS ${qt}.accounts (
                account_id TEXT PRIMARY KEY,
                name TEXT,
                email TEXT,
                password_hash TEXT,
                created_on TEXT
            )
        `)

        // アカウントと Wallet の関連情報
        await target.query(`
            CREATE TABLE IF NOT EXISTS ${qt}.account_wallets (
                account_id TEXT NOT NULL,
                wallet_id TEXT NOT NULL,
                wallet_name TEXT,
                added_on TEXT,
                PRIMARY KEY (account_id, wallet_id)
            )
        `)

        // OIDC ログイン情報
        await target.query(`
            CREATE TABLE IF NOT EXISTS ${qt}.account_oidc_logins (
                account_id TEXT NOT NULL,
                oidc_id TEXT NOT NULL,
                PRIMARY KEY (account_id, oidc_id)
            )
        `)

        // DID Alias 情報
        await target.query(`
            CREATE TABLE IF NOT EXISTS ${qt}.did_aliases (
                wallet_id TEXT NOT NULL,
                did TEXT NOT NULL,
                alias TEXT NOT NULL,
                created_on TEXT,
                PRIMARY KEY (wallet_id, did)
            )
        `)

        // 検索用インデックス
        await target.query(`
            CREATE INDEX IF NOT EXISTS idx_walt_custom_accounts_email
            ON ${qt}.accounts (email)
        `)

        await target.query(`
            CREATE INDEX IF NOT EXISTS idx_walt_custom_wallet_id
            ON ${qt}.account_wallets (wallet_id)
        `)

        await target.query(`
            CREATE INDEX IF NOT EXISTS idx_walt_custom_oidc_id
            ON ${qt}.account_oidc_logins (oidc_id)
        `)

        await target.query(`
            CREATE INDEX IF NOT EXISTS idx_walt_custom_did_alias_wallet
            ON ${qt}.did_aliases (wallet_id)
        `)

        await target.query(`
            CREATE INDEX IF NOT EXISTS idx_walt_custom_did_alias_did
            ON ${qt}.did_aliases (did)
        `)

        const result = {
            schema: TARGET_SCHEMA,
            initialized: true,
        }

        logger.debug('result : ', result)

        return result
    } catch (error) {
        logError(error)
        throw error
    } finally {
        logger.debug('*** createSchema end ***')
    }
}

// 移行元テーブルの取得
const getSourceTables = async () => {
    logger.debug('*** getSourceTables start ***')

    try {
        const sql = `
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = $1
              AND table_type = 'BASE TABLE'
        `

        const response = await source.query(
            sql,
            [SOURCE_SCHEMA]
        )

        const result = new Set(
            response.rows.map((row) => row.table_name)
        )

        logger.debug('result : ', {
            tableCount: result.size,
        })

        return result
    } catch (error) {
        logError(error)
        throw error
    } finally {
        logger.debug('*** getSourceTables end ***')
    }
}

// 移行元テーブルの確認
const assertSourceTables = async () => {
    logger.debug('*** assertSourceTables start ***')

    try {
        const actual = await getSourceTables()

        const missing = REQUIRED_SOURCE_TABLES.filter(
            (table) => !actual.has(table)
        )

        if (missing.length > 0) {
            throw new Error(
                `Missing source tables: ${missing.join(', ')}`
            )
        }

        const result = {
            checked: REQUIRED_SOURCE_TABLES.length,
        }

        logger.debug('result : ', result)

        return result
    } catch (error) {
        logError(error)
        throw error
    } finally {
        logger.debug('*** assertSourceTables end ***')
    }
}

// 移行先テーブル構造の確認
const assertTargetSchema = async () => {
    logger.debug('*** assertTargetSchema start ***')

    try {
        const definitions = {
            accounts: [
                'account_id',
                'name',
                'email',
                'password_hash',
                'created_on',
            ],
            account_wallets: [
                'account_id',
                'wallet_id',
                'wallet_name',
                'added_on',
            ],
            account_oidc_logins: [
                'account_id',
                'oidc_id',
            ],
            did_aliases: [
                'wallet_id',
                'did',
                'alias',
                'created_on',
            ],
        }

        for (const [table, requiredColumns] of Object.entries(definitions)) {
            const response = await target.query(
                `
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = $1
                  AND table_name = $2
                `,
                [
                    TARGET_SCHEMA,
                    table,
                ]
            )

            const columns = new Set(
                response.rows.map(
                    (row) => row.column_name
                )
            )

            const missing = requiredColumns.filter(
                (column) => !columns.has(column)
            )

            if (missing.length > 0) {
                throw new Error(
                    `${TARGET_SCHEMA}.${table} missing columns: ${missing.join(', ')}`
                )
            }
        }

        const result = {
            schemaValidated: true,
        }

        logger.debug('result : ', result)

        return result
    } catch (error) {
        logError(error)
        throw error
    } finally {
        logger.debug('*** assertTargetSchema end ***')
    }
}

// 移行元データの取得
const extractRows = async (table) => {
    logger.debug('*** extractRows start ***')

    try {
        if (!MIGRATION_TABLES.includes(table)) {
            throw new Error(
                `Unexpected migration table: ${table}`
            )
        }

        const sql = `
            SELECT to_jsonb(t) AS payload
            FROM ${qs}.${quoteId(table)} t
        `

        const response = await source.query(sql)

        const result = response.rows.map(
            (row) => row.payload
        )

        logger.debug('result : ', {
            table,
            rowCount: result.length,
        })

        return result
    } catch (error) {
        logError(error)
        throw error
    } finally {
        logger.debug('*** extractRows end ***')
    }
}

// アカウント情報の移行
const migrateAccount = async (row) => {
    logger.debug('*** migrateAccount start ***')

    try {
        const accountId = getTextField(row, 'id')

        if (!accountId) {
            throw new Error(
                'accounts.id is missing'
            )
        }

        const sql = `
            INSERT INTO ${qt}.accounts (
                account_id,
                name,
                email,
                password_hash,
                created_on
            )
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (account_id)
            DO UPDATE SET
                name = EXCLUDED.name,
                email = EXCLUDED.email,
                password_hash = EXCLUDED.password_hash,
                created_on = EXCLUDED.created_on
        `

        const response = await target.query(
            sql,
            [
                accountId,
                getTextField(row, 'name'),
                getTextField(row, 'email'),
                getTextField(row, 'password'),
                getTextField(
                    row,
                    'createdOn',
                    'created_on'
                ),
            ]
        )

        const result = {
            accountId,
            migrated: response.rowCount === 1,
        }

        logger.debug('result : ', result)

        return result
    } catch (error) {
        logError(error)
        throw error
    } finally {
        logger.debug('*** migrateAccount end ***')
    }
}

// アカウントと Wallet の関連情報の移行
const migrateAccountWallet = async (row) => {
    logger.debug('*** migrateAccountWallet start ***')

    try {
        const accountId = getTextField(row, 'id')
        const walletId = getTextField(row, 'wallet')

        if (!accountId || !walletId) {
            throw new Error(
                'account_wallet_mapping.id or wallet is missing'
            )
        }

        const walletResponse = await source.query(
            `
            SELECT name
            FROM ${qs}.wallets
            WHERE id = $1
            `,
            [walletId]
        )

        const walletName =
            walletResponse.rows[0]?.name ?? null

        const sql = `
            INSERT INTO ${qt}.account_wallets (
                account_id,
                wallet_id,
                wallet_name,
                added_on
            )
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (account_id, wallet_id)
            DO UPDATE SET
                wallet_name = EXCLUDED.wallet_name,
                added_on = EXCLUDED.added_on
        `

        const response = await target.query(
            sql,
            [
                accountId,
                walletId,
                walletName,
                getTextField(
                    row,
                    'added_on',
                    'addedOn'
                ),
            ]
        )

        const result = {
            accountId,
            walletId,
            walletName,
            migrated: response.rowCount === 1,
        }

        logger.debug('result : ', result)

        return result
    } catch (error) {
        logError(error)
        throw error
    } finally {
        logger.debug('*** migrateAccountWallet end ***')
    }
}

// OIDC ログイン情報の移行
const migrateOidcLogin = async (row) => {
    logger.debug('*** migrateOidcLogin start ***')

    try {
        const accountId = getTextField(
            row,
            'accountId',
            'account_id'
        )

        const oidcId = getTextField(
            row,
            'oidcId',
            'oidc_id'
        )

        if (!accountId || !oidcId) {
            throw new Error(
                'oidclogins.accountId or oidcId is missing'
            )
        }

        const sql = `
            INSERT INTO ${qt}.account_oidc_logins (
                account_id,
                oidc_id
            )
            VALUES ($1, $2)
            ON CONFLICT (account_id, oidc_id)
            DO NOTHING
        `

        const response = await target.query(
            sql,
            [
                accountId,
                oidcId,
            ]
        )

        const result = {
            accountId,
            oidcId,
            migrated: response.rowCount === 1,
        }

        logger.debug('result : ', result)

        return result
    } catch (error) {
        logError(error)
        throw error
    } finally {
        logger.debug('*** migrateOidcLogin end ***')
    }
}

// DID Alias 情報の移行
const migrateDidAlias = async (row) => {
    logger.debug('*** migrateDidAlias start ***')

    try {
        const walletId = getTextField(
            row,
            'wallet'
        )

        const did = getTextField(
            row,
            'did'
        )

        const alias = getTextField(
            row,
            'alias'
        )

        if (!walletId || !did) {
            throw new Error(
                'wallet_dids.wallet or did is missing'
            )
        }

        if (alias === null) {
            throw new Error(
                'wallet_dids.alias is missing'
            )
        }

        const sql = `
            INSERT INTO ${qt}.did_aliases (
                wallet_id,
                did,
                alias,
                created_on
            )
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (wallet_id, did)
            DO UPDATE SET
                alias = EXCLUDED.alias,
                created_on = EXCLUDED.created_on
        `

        const response = await target.query(
            sql,
            [
                walletId,
                did,
                alias,
                getTextField(
                    row,
                    'createdOn',
                    'created_on'
                ),
            ]
        )

        const result = {
            walletId,
            did,
            alias,
            migrated: response.rowCount === 1,
        }

        logger.debug('result : ', result)

        return result
    } catch (error) {
        logError(error)
        throw error
    } finally {
        logger.debug('*** migrateDidAlias end ***')
    }
}

// テーブル単位の移行
const migrateTable = async (table) => {
    logger.debug('*** migrateTable start ***')

    try {
        const rows = await extractRows(table)
        let migratedCount = 0

        for (const row of rows) {
            switch (table) {
                case 'accounts':
                    await migrateAccount(row)
                    break

                case 'oidclogins':
                    await migrateOidcLogin(row)
                    break

                case 'account_wallet_mapping':
                    await migrateAccountWallet(row)
                    break

                case 'wallet_dids':
                    await migrateDidAlias(row)
                    break

                default:
                    throw new Error(
                        `Unsupported table: ${table}`
                    )
            }

            migratedCount++
        }

        const result = {
            table,
            sourceCount: rows.length,
            migratedCount,
        }

        logger.debug('result : ', result)

        return result
    } catch (error) {
        logError(error)
        throw error
    } finally {
        logger.debug('*** migrateTable end ***')
    }
}

// データ移行
const migrate = async () => {
    logger.debug('*** migrate start ***')

    let transactionStarted = false

    try {
        await assertSourceTables()

        await target.query('BEGIN')
        transactionStarted = true

        await createSchema()
        await assertTargetSchema()

        let total = 0
        const tableCounts = {}

        for (const table of MIGRATION_TABLES) {
            const result = await migrateTable(table)

            tableCounts[table] =
                result.migratedCount

            total +=
                result.migratedCount

            console.log(
                `${table}: ${result.migratedCount} rows`
            )
        }

        if (dryRun) {
            await target.query('ROLLBACK')
            transactionStarted = false

            console.log(
                `DRY RUN: ${total} rows processed. All changes rolled back.`
            )
        } else {
            await target.query('COMMIT')
            transactionStarted = false

            console.log(
                `Migration complete: ${total} rows migrated.`
            )
        }

        const result = {
            dryRun,
            total,
            tableCounts,
        }

        logger.debug('result : ', result)

        return result
    } catch (error) {
        if (transactionStarted) {
            try {
                await target.query('ROLLBACK')
            } catch (rollbackError) {
                logError(rollbackError)
            }
        }

        logError(error)
        throw error
    } finally {
        logger.debug('*** migrate end ***')
    }
}

// 移行結果確認
const verify = async () => {
    logger.debug('*** verify start ***')

    try {
        await assertSourceTables()
        await assertTargetSchema()

        let failed = false

        const checks = [
            {
                sourceTable: 'accounts',
                targetTable: 'accounts',
            },
            {
                sourceTable: 'account_wallet_mapping',
                targetTable: 'account_wallets',
            },
            {
                sourceTable: 'oidclogins',
                targetTable: 'account_oidc_logins',
            },
            {
                sourceTable: 'wallet_dids',
                targetTable: 'did_aliases',
            },
        ]

        for (const check of checks) {
            const sourceResponse = await source.query(
                `
                SELECT COUNT(*)::int AS count
                FROM ${qs}.${quoteId(check.sourceTable)}
                `
            )

            const targetResponse = await target.query(
                `
                SELECT COUNT(*)::int AS count
                FROM ${qt}.${quoteId(check.targetTable)}
                `
            )

            const sourceCount =
                sourceResponse.rows[0].count

            const targetCount =
                targetResponse.rows[0].count

            const ok =
                sourceCount === targetCount

            console.log(
                `${ok ? 'OK' : 'NG'} ${check.targetTable}: source=${sourceCount}, target=${targetCount}`
            )

            if (!ok) {
                failed = true
            }
        }

        // Wallet 名の確認
        const walletNameResponse = await target.query(`
            SELECT COUNT(*)::int AS count
            FROM ${qt}.account_wallets
            WHERE wallet_name IS NULL
        `)

        if (walletNameResponse.rows[0].count > 0) {
            console.error(
                `NG account_wallets: ${walletNameResponse.rows[0].count} wallet_name is NULL`
            )

            failed = true
        }

        // Account 関連整合性の確認
        const accountWalletResponse = await target.query(`
            SELECT COUNT(*)::int AS count
            FROM ${qt}.account_wallets aw
            LEFT JOIN ${qt}.accounts a
              ON a.account_id = aw.account_id
            WHERE a.account_id IS NULL
        `)

        if (accountWalletResponse.rows[0].count > 0) {
            console.error(
                `NG account_wallets: ${accountWalletResponse.rows[0].count} references to missing accounts`
            )

            failed = true
        }

        const oidcResponse = await target.query(`
            SELECT COUNT(*)::int AS count
            FROM ${qt}.account_oidc_logins o
            LEFT JOIN ${qt}.accounts a
              ON a.account_id = o.account_id
            WHERE a.account_id IS NULL
        `)

        if (oidcResponse.rows[0].count > 0) {
            console.error(
                `NG account_oidc_logins: ${oidcResponse.rows[0].count} references to missing accounts`
            )

            failed = true
        }

        if (failed) {
            throw new Error(
                'Migration verification failed'
            )
        }

        console.log(
            'Migration verification: SUCCESS'
        )

        const result = {
            verified: true,
        }

        logger.debug('result : ', result)

        return result
    } catch (error) {
        logError(error)
        throw error
    } finally {
        logger.debug('*** verify end ***')
    }
}

// DB 接続終了
const close = async () => {
    logger.debug('*** close start ***')

    try {
        await source.end()
        await target.end()
    } catch (error) {
        logError(error)
        throw error
    } finally {
        logger.debug('*** close end ***')
    }
}

// Main
const main = async () => {
    logger.debug('*** main start ***')

    try {
        await source.connect()
        await target.connect()

        switch (command) {
            case 'init':
                await createSchema()
                await assertTargetSchema()
                break

            case 'migrate':
                await migrate()
                break

            case 'verify':
                await verify()
                break

            default:
                throw new Error(
                    'Usage: node src/migrate.js init | migrate [--dry-run] | verify'
                )
        }
    } catch (error) {
        logError(error)
        process.exitCode = 1
    } finally {
        await close()
        logger.debug('*** main end ***')
    }
}

main()
