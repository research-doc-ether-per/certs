
'use strict'

const fs = require('fs')
const path = require('path')
const { Client } = require('pg')
const log4js = require('log4js')
const dbConfig = require('./config/db.json')
const log4jsConfig = require('./config/log4js.json')

const fileName = 'migrate_wallet_data'
fs.mkdirSync(path.join(__dirname, 'logs'), { recursive: true })
log4jsConfig.appenders.file.filename =
    path.join(__dirname, 'logs', `${fileName}.log`)
log4js.configure(log4jsConfig)

const logger = log4js.getLogger(fileName)
const cloudWallet = new Client(dbConfig.cloudWallet)
const waltId = new Client(dbConfig.waltId)

const command = process.argv[2]
const apply = process.argv.includes('--apply')
const dryRun = !apply
const printData = process.argv.includes('--print-data')

const sourceSchemaName = dbConfig.waltId.schema || 'public'
const targetSchemaName = dbConfig.cloudWallet.schema || 'public'

/**
 * SQL識別子を検証してクォートする。
 *
 * @param {string} value - SQL識別子。
 * @returns {string} クォート済み識別子。
 */
const quoteId = (value) => {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
        throw new Error(`Invalid SQL identifier: ${value}`)
    }
    return `"${value}"`
}

const sourceSchema = quoteId(sourceSchemaName)
const targetSchema = quoteId(targetSchemaName)

/**
 * 指定時のみデータを表示する。
 *
 * @param {string} label - 表示名。
 * @param {*} value - 表示データ。
 * @returns {void}
 */
const showData = (label, value) => {
    if (printData) {
        console.log(
            `[DATA] ${label}: ${JSON.stringify(value, null, 2)}`
        )
    }
}

/**
 * 行データから文字列を取得する。
 *
 * @param {Object} row - 行データ。
 * @param {...string} names - カラム名。
 * @returns {string|null} 文字列またはnull。
 */
const getText = (row, ...names) => {
    for (const name of names) {
        if (row[name] !== null && row[name] !== undefined) {
            return String(row[name])
        }
    }
    return null
}

/**
 * 移行元テーブルのカラム一覧を取得する。
 *
 * @param {string} table - テーブル名。
 * @returns {Promise<Set<string>>} カラム名一覧。
 */
const getSourceColumns = async (table) => {
    logger.debug('*** getSourceColumns start ***')
    try {
        const result = await waltId.query(
            `
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = $1
              AND table_name = $2
            `,
            [sourceSchemaName, table]
        )
        return new Set(result.rows.map(row => row.column_name))
    } catch (error) {
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** getSourceColumns end ***')
    }
}

/**
 * 移行元カラムのデータ型を取得する。
 *
 * @param {string} table - テーブル名。
 * @param {string} column - カラム名。
 * @returns {Promise<Object|null>} データ型情報。
 */
const getSourceColumnType = async (table, column) => {
    logger.debug('*** getSourceColumnType start ***')
    try {
        const result = await waltId.query(
            `
            SELECT data_type, udt_name
            FROM information_schema.columns
            WHERE table_schema = $1
              AND table_name = $2
              AND column_name = $3
            `,
            [sourceSchemaName, table, column]
        )
        return result.rows[0] || null
    } catch (error) {
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** getSourceColumnType end ***')
    }
}

/**
 * 移行元のSELECT句を生成する。
 * 日時は文字列として取得し、Node.js側での変換を防ぐ。
 *
 * @param {string} table - テーブル名。
 * @param {string[]} columns - カラム名一覧。
 * @returns {Promise<string>} SELECT句。
 */
const createSourceSelect = async (table, columns) => {
    logger.debug('*** createSourceSelect start ***')
    try {
        const selected = []
        const timestamps = ['created_on', 'createdOn']

        for (const column of columns) {
            const quoted = quoteId(column)

            if (timestamps.includes(column)) {
                const type = await getSourceColumnType(table, column)

                if (!type ||
                    type.data_type !== 'timestamp without time zone') {
                    throw new Error(
                        `Unsupported timestamp type: ${table}.${column}`
                    )
                }
                selected.push(`${quoted}::text AS ${quoted}`)
            } else {
                selected.push(quoted)
            }
        }
        return selected.join(', ')
    } catch (error) {
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** createSourceSelect end ***')
    }
}

/**
 * 移行元データを取得する。
 *
 * @param {string} table - テーブル名。
 * @param {string[]} columns - カラム名一覧。
 * @returns {Promise<Object[]>} 取得データ。
 */
const readSource = async (table, columns) => {
    logger.debug('*** readSource start ***')
    try {
        const allowed = {
            wallets: [
                'id', 'name', 'created_on', 'createdOn'
            ],
            wallet_dids: [
                'wallet', 'did', 'alias', 'keyId', 'default',
                'created_on', 'createdOn'
            ]
        }

        if (!allowed[table] ||
            columns.some(c => !allowed[table].includes(c))) {
            throw new Error(`Unsupported source selection: ${table}`)
        }

        const selected = await createSourceSelect(table, columns)
        const result = await waltId.query(
            `SELECT ${selected} FROM ${sourceSchema}.${quoteId(table)}`
        )

        logger.debug('result.length: ', result.rows.length)
        showData(`readSource ${table}`, result.rows)
        return result.rows
    } catch (error) {
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** readSource end ***')
    }
}

/**
 * 必須カラムと日時カラムを確認して取得する。
 *
 * @param {string} table - テーブル名。
 * @param {string[]} required - 必須カラム。
 * @param {string[][]} alternatives - 代替カラム候補。
 * @param {string[]} optional - 任意カラム。
 * @returns {Promise<Object[]>} 取得データ。
 */
const selectColumns = async (
    table, required, alternatives = [], optional = []
) => {
    logger.debug('*** selectColumns start ***')
    try {
        const columns = await getSourceColumns(table)

        for (const column of required) {
            if (!columns.has(column)) {
                throw new Error(
                    `Missing source column: ${table}.${column}`
                )
            }
        }

        const extra = []
        for (const group of alternatives) {
            const found = group.find(c => columns.has(c))
            if (!found) {
                throw new Error(
                    `Missing source column: ${table}.${group.join('/')}`
                )
            }
            extra.push(found)
        }

        return await readSource(table, [
            ...required,
            ...extra,
            ...optional.filter(c => columns.has(c))
        ])
    } catch (error) {
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** selectColumns end ***')
    }
}

/**
 * WalletおよびDIDの移行元データを準備する。
 * DIDのKey IDとdefaultはDID単位で保持する。
 *
 * @returns {Promise<Object>} 移行元データ。
 */
const prepareSource = async () => {
    logger.debug('*** prepareSource start ***')
    try {
        const wallets = await selectColumns(
            'wallets',
            ['id', 'name'],
            [],
            ['created_on', 'createdOn']
        )

        const didRows = await selectColumns(
            'wallet_dids',
            ['wallet', 'did', 'alias', 'keyId', 'default'],
            [],
            ['created_on', 'createdOn']
        )

        const walletIds = new Set()
        const didKeys = new Set()
        const walletAliases = []
        const didAliases = []

        for (const row of wallets) {
            const walletId = getText(row, 'id')
            const walletName = getText(row, 'name')
            const createdOn = getText(row, 'created_on', 'createdOn')

            if (!walletId || walletIds.has(walletId)) {
                throw new Error(
                    `Invalid or duplicate wallet ID: ${walletId}`
                )
            }

            walletIds.add(walletId)
            walletAliases.push({
                walletId,
                walletName,
                createdOn
            })
        }

        for (const row of didRows) {
            const walletId = getText(row, 'wallet')
            const did = getText(row, 'did')
            const alias = getText(row, 'alias')
            const keyId = getText(row, 'keyId')
            const defaultValue = row.default
            const createdOn = getText(row, 'created_on', 'createdOn')

            if (!walletId || !did || !keyId || alias === null) {
                throw new Error(
                    'wallet_dids.wallet/did/alias/keyId is missing'
                )
            }

            if (typeof defaultValue !== 'boolean') {
                throw new Error(
                    `Invalid wallet_dids.default: ${walletId}, ${did}`
                )
            }

            if (!walletIds.has(walletId)) {
                throw new Error(
                    `DID wallet not found: ${walletId}`
                )
            }

            const key = JSON.stringify([walletId, did])
            if (didKeys.has(key)) {
                throw new Error(
                    `Duplicate wallet_dids: ${key}`
                )
            }

            didKeys.add(key)
            didAliases.push({
                walletId,
                did,
                alias,
                keyId,
                default: defaultValue,
                createdOn
            })
        }

        showData('wallets -> wallet_aliases', walletAliases)
        showData('wallet_dids -> did_aliases', didAliases)

        console.log(
            `SOURCE: wallets=${walletAliases.length}, ` +
            `DID aliases=${didAliases.length}`
        )

        return { walletIds, walletAliases, didAliases }
    } catch (error) {
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** prepareSource end ***')
    }
}

/**
 * priv_walletsのWallet IDと移行元データを照合する。
 *
 * @param {Set<string>} walletIds - Wallet ID一覧。
 * @returns {Promise<Object[]>} 検証済みデータ。
 */
const verifyPrivateWalletsBeforeMigration = async (walletIds) => {
    logger.debug('*** verifyPrivateWalletsBeforeMigration start ***')
    try {
        const result = await cloudWallet.query(
            `
            SELECT user_id, waltid_wallet
            FROM ${targetSchema}.priv_wallets
            ORDER BY user_id
            `
        )

        const validated = []

        for (const row of result.rows) {
            const userId = getText(row, 'user_id')
            const walletId = getText(row, 'waltid_wallet')

            if (!userId || !walletId) {
                throw new Error(
                    'Missing user_id or waltid_wallet'
                )
            }

            if (!walletIds.has(walletId)) {
                throw new Error(
                    `Wallet not found in walt.id source: ${walletId}`
                )
            }

            validated.push({ userId, walletId })
        }

        showData('priv_wallets validation', validated)
        return validated
    } catch (error) {
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** verifyPrivateWalletsBeforeMigration end ***')
    }
}

/**
 * 移行先テーブルを作成・更新する。
 * 既存テーブルの不足カラムも自動的に追加する。
 *
 * @returns {Promise<void>}
 */
const createTargetTables = async () => {
    logger.debug('*** createTargetTables start ***')
    try {
        await cloudWallet.query(
            `
            CREATE TABLE IF NOT EXISTS ${targetSchema}.wallet_aliases (
                waltid_wallet_id VARCHAR(128) NOT NULL,
                wallet_name VARCHAR(128),
                created_on TIMESTAMP WITH TIME ZONE
                    DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (waltid_wallet_id)
            )
            `
        )

        await cloudWallet.query(
            `
            CREATE TABLE IF NOT EXISTS ${targetSchema}.did_aliases (
                waltid_wallet_id VARCHAR(128) NOT NULL,
                did VARCHAR(1024) NOT NULL,
                alias VARCHAR(1024) NOT NULL,
                key_id VARCHAR(512) NOT NULL,
                "default" BOOLEAN DEFAULT FALSE NOT NULL,
                created_on TIMESTAMP WITH TIME ZONE
                    DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (waltid_wallet_id, did)
            )
            `
        )

        // 既存テーブルにKey IDを追加する。
        await cloudWallet.query(
            `
            ALTER TABLE ${targetSchema}.did_aliases
            ADD COLUMN IF NOT EXISTS key_id VARCHAR(512)
            `
        )

        // Key IDの最大長を512文字に統一する。
        await cloudWallet.query(
            `
            ALTER TABLE ${targetSchema}.did_aliases
            ALTER COLUMN key_id TYPE VARCHAR(512)
            `
        )

        // DID単位のデフォルトフラグを追加する。
        await cloudWallet.query(
            `
            ALTER TABLE ${targetSchema}.did_aliases
            ADD COLUMN IF NOT EXISTS "default"
                BOOLEAN DEFAULT FALSE NOT NULL
            `
        )

        // 以前のWallet単位のdefaultカラムは削除する。
        await cloudWallet.query(
            `
            ALTER TABLE ${targetSchema}.wallet_aliases
            DROP COLUMN IF EXISTS "default"
            `
        )

        // 作成日時をタイムゾーン付きに統一する。
        await cloudWallet.query(
            `
            ALTER TABLE ${targetSchema}.wallet_aliases
            ALTER COLUMN created_on TYPE TIMESTAMP WITH TIME ZONE,
            ALTER COLUMN created_on SET DEFAULT CURRENT_TIMESTAMP
            `
        )

        await cloudWallet.query(
            `
            ALTER TABLE ${targetSchema}.did_aliases
            ALTER COLUMN created_on TYPE TIMESTAMP WITH TIME ZONE,
            ALTER COLUMN created_on SET DEFAULT CURRENT_TIMESTAMP
            `
        )
    } catch (error) {
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** createTargetTables end ***')
    }
}

/**
 * Walletエイリアスを登録・更新する。
 *
 * @param {Object[]} items - Wallet一覧。
 * @returns {Promise<number>} 処理件数。
 */
const migrateWalletAliases = async (items) => {
    logger.debug('*** migrateWalletAliases start ***')
    try {
        let count = 0

        for (const item of items) {
            await cloudWallet.query(
                `
                INSERT INTO ${targetSchema}.wallet_aliases
                    (waltid_wallet_id, wallet_name, created_on)
                VALUES ($1, $2, $3)
                ON CONFLICT (waltid_wallet_id)
                DO UPDATE SET
                    wallet_name = EXCLUDED.wallet_name,
                    created_on = EXCLUDED.created_on
                `,
                [item.walletId, item.walletName, item.createdOn]
            )
            count++
        }

        logger.debug('result: ', count)
        return count
    } catch (error) {
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** migrateWalletAliases end ***')
    }
}

/**
 * DIDエイリアス、Key ID、defaultを登録・更新する。
 *
 * @param {Object[]} items - DID一覧。
 * @returns {Promise<number>} 処理件数。
 */
const migrateDidAliases = async (items) => {
    logger.debug('*** migrateDidAliases start ***')
    try {
        let count = 0

        for (const item of items) {
            await cloudWallet.query(
                `
                INSERT INTO ${targetSchema}.did_aliases
                    (
                        waltid_wallet_id,
                        did,
                        alias,
                        key_id,
                        "default",
                        created_on
                    )
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (waltid_wallet_id, did)
                DO UPDATE SET
                    alias = EXCLUDED.alias,
                    key_id = EXCLUDED.key_id,
                    "default" = EXCLUDED."default",
                    created_on = EXCLUDED.created_on
                `,
                [
                    item.walletId,
                    item.did,
                    item.alias,
                    item.keyId,
                    item.default,
                    item.createdOn
                ]
            )
            count++
        }

        logger.debug('result: ', count)
        return count
    } catch (error) {
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** migrateDidAliases end ***')
    }
}

/**
 * 移行先のカラム定義と主キーを検証する。
 *
 * @returns {Promise<void>}
 */
const verifyTargetTableDefinitions = async () => {
    logger.debug('*** verifyTargetTableDefinitions start ***')
    try {
        const definitions = {
            priv_wallets: {
                waltid_wallet: ['character varying', 128, 'NO']
            },
            wallet_aliases: {
                waltid_wallet_id: ['character varying', 128, 'NO'],
                wallet_name: ['character varying', 128, 'YES'],
                created_on: ['timestamp with time zone', null, 'YES']
            },
            did_aliases: {
                waltid_wallet_id: ['character varying', 128, 'NO'],
                did: ['character varying', 1024, 'NO'],
                alias: ['character varying', 1024, 'NO'],
                key_id: ['character varying', 512, 'NO'],
                default: ['boolean', null, 'NO'],
                created_on: ['timestamp with time zone', null, 'YES']
            }
        }

        for (const [table, expected] of Object.entries(definitions)) {
            const result = await cloudWallet.query(
                `
                SELECT
                    column_name,
                    data_type,
                    character_maximum_length,
                    is_nullable
                FROM information_schema.columns
                WHERE table_schema = $1
                  AND table_name = $2
                `,
                [targetSchemaName, table]
            )

            const actual = Object.fromEntries(
                result.rows.map(row => [row.column_name, row])
            )

            for (const [column, definition] of Object.entries(expected)) {
                const row = actual[column]

                if (!row ||
                    row.data_type !== definition[0] ||
                    row.character_maximum_length !== definition[1] ||
                    row.is_nullable !== definition[2]) {
                    logger.error(
                        'expected: ',
                        JSON.stringify({ table, column, definition })
                    )
                    logger.error(
                        'actual: ',
                        JSON.stringify(row || null)
                    )
                    throw new Error(
                        `${table}.${column} definition mismatch`
                    )
                }
            }
        }

        const primaryKeys = {
            wallet_aliases: ['waltid_wallet_id'],
            did_aliases: ['waltid_wallet_id', 'did']
        }

        for (const [table, expected] of Object.entries(primaryKeys)) {
            const result = await cloudWallet.query(
                `
                SELECT json_agg(a.attname ORDER BY k.ord) AS columns
                FROM pg_constraint c
                JOIN pg_class t ON t.oid = c.conrelid
                JOIN pg_namespace n ON n.oid = t.relnamespace
                JOIN unnest(c.conkey)
                    WITH ORDINALITY k(attnum, ord) ON TRUE
                JOIN pg_attribute a
                    ON a.attrelid = t.oid
                   AND a.attnum = k.attnum
                WHERE n.nspname = $1
                  AND t.relname = $2
                  AND c.contype = 'p'
                GROUP BY c.oid
                `,
                [targetSchemaName, table]
            )

            if (result.rows.length !== 1 ||
                JSON.stringify(result.rows[0].columns) !==
                JSON.stringify(expected)) {
                throw new Error(`${table} primary key mismatch`)
            }
        }

        logger.debug('result: target table definitions are valid')
    } catch (error) {
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** verifyTargetTableDefinitions end ***')
    }
}

/**
 * 移行元と移行先のデータを照合する。
 * Key IDとdefaultも検証対象とする。
 *
 * @param {Object} source - 移行元データ。
 * @returns {Promise<void>}
 */
const verifyMigratedData = async (source) => {
    logger.debug('*** verifyMigratedData start ***')
    try {
        for (const item of source.walletAliases) {
            const result = await cloudWallet.query(
                `
                SELECT
                    wallet_name,
                    (
                        created_on AT TIME ZONE
                        current_setting('TimeZone')
                    ) IS NOT DISTINCT FROM $2::timestamp
                        AS created_on_matches
                FROM ${targetSchema}.wallet_aliases
                WHERE waltid_wallet_id = $1
                `,
                [item.walletId, item.createdOn]
            )

            if (result.rowCount !== 1 ||
                getText(result.rows[0], 'wallet_name') !== item.walletName ||
                result.rows[0].created_on_matches !== true) {
                throw new Error(
                    `wallet_aliases mismatch: ${item.walletId}`
                )
            }
        }

        for (const item of source.didAliases) {
            const result = await cloudWallet.query(
                `
                SELECT
                    alias,
                    key_id,
                    "default" AS is_default,
                    (
                        created_on AT TIME ZONE
                        current_setting('TimeZone')
                    ) IS NOT DISTINCT FROM $3::timestamp
                        AS created_on_matches
                FROM ${targetSchema}.did_aliases
                WHERE waltid_wallet_id = $1
                  AND did = $2
                `,
                [item.walletId, item.did, item.createdOn]
            )

            if (result.rowCount !== 1 ||
                getText(result.rows[0], 'alias') !== item.alias ||
                getText(result.rows[0], 'key_id') !== item.keyId ||
                result.rows[0].is_default !== item.default ||
                result.rows[0].created_on_matches !== true) {
                throw new Error(
                    `did_aliases mismatch: ${item.walletId}, ${item.did}`
                )
            }
        }

        logger.debug('result: migrated data is valid')
    } catch (error) {
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** verifyMigratedData end ***')
    }
}

/**
 * Wallet/DIDデータを移行する。
 * Dry RunはROLLBACK、ApplyはCOMMITする。
 *
 * @returns {Promise<Object>} 移行件数。
 */
const migrate = async () => {
    logger.debug('*** migrate start ***')
    let transactionStarted = false

    try {
        const source = await prepareSource()

        await cloudWallet.query('BEGIN')
        transactionStarted = true

        await cloudWallet.query("SET LOCAL lock_timeout = '5s'")
        await cloudWallet.query("SET LOCAL statement_timeout = '120s'")

        await verifyPrivateWalletsBeforeMigration(source.walletIds)
        await createTargetTables()

        const walletAliases =
            await migrateWalletAliases(source.walletAliases)
        const didAliases =
            await migrateDidAliases(source.didAliases)

        // データ登録後にKey IDの必須制約を設定する。
        await cloudWallet.query(
            `
            ALTER TABLE ${targetSchema}.did_aliases
            ALTER COLUMN key_id SET NOT NULL
            `
        )

        await verifyTargetTableDefinitions()
        await verifyMigratedData(source)

        const summary = { walletAliases, didAliases }
        showData('migration summary', summary)

        if (dryRun) {
            await cloudWallet.query('ROLLBACK')
            transactionStarted = false
            console.log(
                'DRY RUN: all Cloud Wallet changes rolled back',
                summary
            )
        } else {
            await cloudWallet.query('COMMIT')
            transactionStarted = false
            console.log(
                'APPLY: Cloud Wallet migration committed',
                summary
            )
        }

        return summary
    } catch (error) {
        if (transactionStarted) {
            try {
                await cloudWallet.query('ROLLBACK')
            } catch (rollbackError) {
                logger.error(
                    'rollback error: ',
                    rollbackError.stack
                )
            }
        }

        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** migrate end ***')
    }
}

/**
 * 移行先のテーブル定義、件数、参照整合性を検証する。
 *
 * @returns {Promise<void>}
 */
const verify = async () => {
    logger.debug('*** verify start ***')
    try {
        await verifyTargetTableDefinitions()

        const walletCount = await cloudWallet.query(
            `
            SELECT COUNT(*)::int AS count
            FROM ${targetSchema}.wallet_aliases
            `
        )

        const didCount = await cloudWallet.query(
            `
            SELECT COUNT(*)::int AS count
            FROM ${targetSchema}.did_aliases
            `
        )

        const invalidPrivateWallets = await cloudWallet.query(
            `
            SELECT p.user_id, p.waltid_wallet
            FROM ${targetSchema}.priv_wallets p
            WHERE NOT EXISTS (
                SELECT 1
                FROM ${targetSchema}.wallet_aliases wa
                WHERE wa.waltid_wallet_id = p.waltid_wallet
            )
            LIMIT 10
            `
        )

        if (invalidPrivateWallets.rows.length > 0) {
            showData(
                'invalid priv_wallets',
                invalidPrivateWallets.rows
            )
            throw new Error(
                'priv_wallets references missing wallet_aliases'
            )
        }

        console.log(
            `VERIFY wallet_aliases: ${walletCount.rows[0].count} rows`
        )
        console.log(
            `VERIFY did_aliases: ${didCount.rows[0].count} rows`
        )
        console.log('Migration verification: SUCCESS')
    } catch (error) {
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** verify end ***')
    }
}

/**
 * 引数を検証して移行または検証を実行する。
 *
 * @returns {Promise<void>}
 */
const main = async () => {
    logger.debug('*** main start ***')

    let waltIdConnected = false
    let cloudWalletConnected = false

    try {
        const flags = process.argv.slice(3)

        if (
            !['migrate', 'verify'].includes(command) ||
            flags.some(flag =>
                !['--apply', '--dry-run', '--print-data'].includes(flag)
            ) ||
            (apply && process.argv.includes('--dry-run')) ||
            (command === 'verify' &&
                (apply || process.argv.includes('--dry-run')))
        ) {
            throw new Error(
                'Usage: node migrate_wallet_data.js migrate ' +
                '[--dry-run | --apply] [--print-data] | ' +
                'verify [--print-data]'
            )
        }

        await cloudWallet.connect()
        cloudWalletConnected = true

        if (command === 'migrate') {
            await waltId.connect()
            waltIdConnected = true
            await migrate()
        } else {
            await verify()
        }
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        console.error(`Migration failed: ${error.message}`)
        process.exitCode = 1
    } finally {
        if (cloudWalletConnected) {
            await cloudWallet.end()
        }
        if (waltIdConnected) {
            await waltId.end()
        }
        logger.debug('*** main end ***')
    }
}

main()


// ### did_aliases

// | カラム | データ型 | 説明 |
// |---|---|---|
// | `waltid_wallet_id` | VARCHAR(128) NOT NULL | walt.id の Wallet ID（複合主キー） |
// | `did` | VARCHAR(1024) NOT NULL | DID（複合主キー） |
// | `alias` | VARCHAR(1024) NOT NULL | DID エイリアス |
// |`key_id`	|VARCHAR(512) NOT NULL|	DID に関連付けられた Key ID|
// |`default`|	BOOLEAN DEFAULT FALSE NOT NULL|	デフォルト DID フラグ|
// | `created_on` | TIMESTAMP | 作成日時 |

