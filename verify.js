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
const dryRun = process.argv.includes('--dry-run') || !apply
const printData = process.argv.includes('--print-data')

const sourceSchemaName = dbConfig.waltId.schema || 'public'
const targetSchemaName = dbConfig.cloudWallet.schema || 'public'

/**
 * SQL 識別子を検証し、ダブルクォートで囲んで返す。
 *
 * @param {string} value - SQL 識別子。
 * @returns {string} クォート済みの SQL 識別子。
 * @throws {Error} SQL 識別子が不正な場合。
 */
const quoteId = (value) => {
    logger.debug('*** quoteId start ***')
    try {
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
            throw new Error(`Invalid SQL identifier: ${value}`)
        }
        return `"${value}"`
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** quoteId end ***')
    }
}

const sourceSchema = quoteId(sourceSchemaName)
const targetSchema = quoteId(targetSchemaName)

/**
 * --print-data 指定時にデータを標準出力へ表示する。
 *
 * @param {string} label - データの識別名。
 * @param {*} value - 表示対象データ。
 * @returns {void}
 */
const showData = (label, value) => {
    logger.debug('*** showData start ***')
    try {
        if (printData) {
            console.log(
                `[DATA] ${label}: ${JSON.stringify(value, null, 2)}`
            )
        }
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** showData end ***')
    }
}

/**
 * 行データから指定カラムの値を文字列として取得する。
 * 複数のカラム名が指定された場合、最初の非 null 値を返す。
 *
 * @param {Object} row - DB の行データ。
 * @param {...string} names - 取得対象カラム名。
 * @returns {string|null} 取得した文字列。
 */
const getText = (row, ...names) => {
    logger.debug('*** getText start ***')
    try {
        for (const name of names) {
            if (!Object.prototype.hasOwnProperty.call(row, name)) {
                continue
            }
            const value = row[name]
            if (value !== null && value !== undefined) {
                return String(value)
            }
        }
        return null
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** getText end ***')
    }
}

/**
 * walt.id DB の指定テーブルからカラム名一覧を取得する。
 *
 * @param {string} table - 対象テーブル名。
 * @returns {Promise<Set<string>>} カラム名の集合。
 * @throws {Error} DB からの取得に失敗した場合。
 */
const getSourceColumns = async (table) => {
    logger.debug('*** getSourceColumns start ***')
    try {
        const response = await waltId.query(
            `
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = $1
              AND table_name = $2
            `,
            [sourceSchemaName, table]
        )
        return new Set(response.rows.map(row => row.column_name))
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** getSourceColumns end ***')
    }
}

/**
 * walt.id DB の指定カラムのデータ型を取得する。
 *
 * @param {string} table - 対象テーブル名。
 * @param {string} column - 対象カラム名。
 * @returns {Promise<Object|null>} カラムの型情報。
 * @throws {Error} DB からの取得に失敗した場合。
 */
const getSourceColumnType = async (table, column) => {
    logger.debug('*** getSourceColumnType start ***')
    try {
        const response = await waltId.query(
            `
            SELECT data_type, udt_name
            FROM information_schema.columns
            WHERE table_schema = $1
              AND table_name = $2
              AND column_name = $3
            `,
            [sourceSchemaName, table, column]
        )
        return response.rows[0] || null
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** getSourceColumnType end ***')
    }
}

/**
 * 移行元データを取得するための SELECT 句を生成する。
 * 日時カラムは文字列に変換し、タイムゾーン変換を防止する。
 *
 * @param {string} table - 対象テーブル名。
 * @param {string[]} columns - 取得対象カラム名。
 * @returns {Promise<string>} SELECT 句。
 * @throws {Error} 未対応の日時型が存在する場合。
 */
const createSourceSelect = async (table, columns) => {
    logger.debug('*** createSourceSelect start ***')
    try {
        const timestampColumns = {
            wallets: ['added_on', 'addedOn'],
            wallet_dids: ['created_on', 'createdOn']
        }

        const selected = []

        for (const column of columns) {
            const quoted = quoteId(column)

            if (timestampColumns[table]?.includes(column)) {
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
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** createSourceSelect end ***')
    }
}

/**
 * walt.id DB から Wallet または DID データを取得する。
 * 許可されたテーブルとカラムのみ参照する。
 *
 * @param {string} table - 対象テーブル名。
 * @param {string[]} columns - 取得対象カラム名。
 * @returns {Promise<Object[]>} 取得した行データ。
 * @throws {Error} 未対応のテーブル・カラムが指定された場合。
 */
const readSource = async (table, columns) => {
    logger.debug('*** readSource start ***')
    try {
        const allowed = {
            wallets: ['id', 'name', 'added_on', 'addedOn'],
            wallet_dids: [
                'wallet', 'did', 'alias',
                'created_on', 'createdOn'
            ]
        }

        if (!allowed[table] ||
            columns.some(c => !allowed[table].includes(c))) {
            throw new Error(`Unsupported source selection: ${table}`)
        }

        const selected = await createSourceSelect(table, columns)
        const response = await waltId.query(
            `SELECT ${selected} FROM ${sourceSchema}.${quoteId(table)}`
        )

        logger.debug('result.length : ', response.rows.length)
        showData(`readSource ${table}`, response.rows)

        return response.rows
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** readSource end ***')
    }
}

/**
 * 必須・代替・任意カラムを確認し、移行元データを取得する。
 *
 * @param {string} table - 対象テーブル名。
 * @param {string[]} required - 必須カラム。
 * @param {string[][]} [alternatives=[]] - 代替カラム候補。
 * @param {string[]} [optional=[]] - 任意カラム。
 * @returns {Promise<Object[]>} 取得した行データ。
 * @throws {Error} 必須カラムが存在しない場合。
 */
const selectColumns = async (
    table, required, alternatives = [], optional = []
) => {
    logger.debug('*** selectColumns start ***')
    try {
        const columns = await getSourceColumns(table)

        for (const column of required) {
            if (!columns.has(column)) {
                throw new Error(`Missing source column: ${table}.${column}`)
            }
        }

        const extra = []
        for (const group of alternatives) {
            const found = group.find(c => columns.has(c))
            if (!found) {
                throw new Error(
                    `Missing source column: ${table}.${group.join(' / ')}`
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
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** selectColumns end ***')
    }
}

/**
 * walt.id DB の Wallet/DID データを読み込み、移行用データを生成する。
 * Wallet ID と DID の重複、および参照整合性を検証する。
 *
 * @returns {Promise<Object>} Wallet ID、Wallet エイリアス、
 * DID エイリアスの移行用データ。
 * @throws {Error} データの欠損・重複・参照不整合がある場合。
 */
const prepareSource = async () => {
    logger.debug('*** prepareSource start ***')
    try {
        const wallets = await selectColumns(
            'wallets', ['id', 'name'], [],
            ['added_on', 'addedOn']
        )
        const didRows = await selectColumns(
            'wallet_dids', ['wallet', 'did', 'alias'], [],
            ['created_on', 'createdOn']
        )

        const walletAliases = []
        const didAliases = []
        const walletIds = new Set()
        const didKeys = new Set()

        for (const row of wallets) {
            const walletId = getText(row, 'id')
            const walletName = getText(row, 'name')
            const addedOn = getText(row, 'added_on', 'addedOn')

            if (!walletId || walletIds.has(walletId)) {
                throw new Error(`Invalid or duplicate wallet ID: ${walletId}`)
            }

            walletIds.add(walletId)
            walletAliases.push({ walletId, walletName, addedOn })
        }

        for (const row of didRows) {
            const walletId = getText(row, 'wallet')
            const did = getText(row, 'did')
            const alias = getText(row, 'alias')
            const createdOn = getText(row, 'created_on', 'createdOn')

            if (!walletId || !did || alias === null) {
                throw new Error('wallet_dids.wallet/did/alias is missing')
            }
            if (!walletIds.has(walletId)) {
                throw new Error(`DID wallet not found: ${walletId}`)
            }

            const key = JSON.stringify([walletId, did])
            if (didKeys.has(key)) {
                throw new Error(`Duplicate wallet_dids: ${key}`)
            }

            didKeys.add(key)
            didAliases.push({ walletId, did, alias, createdOn })
        }

        showData('wallets -> wallet_aliases', walletAliases)
        showData('wallet_dids -> did_aliases', didAliases)

        console.log(
            `SOURCE: wallets=${walletAliases.length}, ` +
            `DID aliases=${didAliases.length}`
        )

        return { walletIds, walletAliases, didAliases }
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** prepareSource end ***')
    }
}

/**
 * Cloud Wallet の priv_wallets と walt.id の Wallet ID を照合する。
 *
 * @param {Set<string>} sourceWalletIds - 移行元 Wallet ID の集合。
 * @returns {Promise<Object[]>} 検証済み Private Wallet データ。
 * @throws {Error} 参照先 Wallet が存在しない場合。
 */
const verifyPrivateWalletsBeforeMigration = async (sourceWalletIds) => {
    logger.debug('*** verifyPrivateWalletsBeforeMigration start ***')
    try {
        const response = await cloudWallet.query(
            `
            SELECT user_id, waltid_wallet
            FROM ${targetSchema}.priv_wallets
            ORDER BY user_id
            `
        )

        const result = []

        for (const row of response.rows) {
            const userId = getText(row, 'user_id')
            const walletId = getText(row, 'waltid_wallet')

            if (!userId || !walletId) {
                throw new Error('Missing user_id or waltid_wallet')
            }
            if (!sourceWalletIds.has(walletId)) {
                throw new Error(
                    `Wallet not found in walt.id source: ${walletId}`
                )
            }
            result.push({ userId, walletId })
        }

        showData('priv_wallets validation', result)
        return result
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** verifyPrivateWalletsBeforeMigration end ***')
    }
}

/**
 * Cloud Wallet DB に移行先テーブルを作成する。
 * 既存テーブルがある場合は変更しない。
 *
 * @returns {Promise<void>}
 * @throws {Error} テーブル作成に失敗した場合。
 */
const createTargetTables = async () => {
    logger.debug('*** createTargetTables start ***')
    try {
        await cloudWallet.query(
            `
            CREATE TABLE IF NOT EXISTS ${targetSchema}.wallet_aliases (
                waltid_wallet_id VARCHAR(128) NOT NULL,
                wallet_name VARCHAR(128),
                added_on TIMESTAMP,
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
                created_on TIMESTAMP,
                PRIMARY KEY (waltid_wallet_id, did)
            )
            `
        )
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** createTargetTables end ***')
    }
}

/**
 * Wallet エイリアスを Cloud Wallet DB に登録・更新する。
 *
 * @param {Object[]} walletAliases - Wallet エイリアス一覧。
 * @returns {Promise<number>} 処理件数。
 * @throws {Error} 登録・更新に失敗した場合。
 */
const migrateWalletAliases = async (walletAliases) => {
    logger.debug('*** migrateWalletAliases start ***')
    try {
        let count = 0

        for (const item of walletAliases) {
            await cloudWallet.query(
                `
                INSERT INTO ${targetSchema}.wallet_aliases
                    (waltid_wallet_id, wallet_name, added_on)
                VALUES ($1, $2, $3)
                ON CONFLICT (waltid_wallet_id)
                DO UPDATE SET
                    wallet_name = EXCLUDED.wallet_name,
                    added_on = EXCLUDED.added_on
                `,
                [item.walletId, item.walletName, item.addedOn]
            )
            count++
        }

        return count
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** migrateWalletAliases end ***')
    }
}

/**
 * DID エイリアスを Cloud Wallet DB に登録・更新する。
 *
 * @param {Object[]} didAliases - DID エイリアス一覧。
 * @returns {Promise<number>} 処理件数。
 * @throws {Error} 登録・更新に失敗した場合。
 */
const migrateDidAliases = async (didAliases) => {
    logger.debug('*** migrateDidAliases start ***')
    try {
        let count = 0

        for (const item of didAliases) {
            await cloudWallet.query(
                `
                INSERT INTO ${targetSchema}.did_aliases
                    (waltid_wallet_id, did, alias, created_on)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (waltid_wallet_id, did)
                DO UPDATE SET
                    alias = EXCLUDED.alias,
                    created_on = EXCLUDED.created_on
                `,
                [
                    item.walletId, item.did,
                    item.alias, item.createdOn
                ]
            )
            count++
        }

        return count
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** migrateDidAliases end ***')
    }
}

/**
 * 移行先テーブルのカラム定義および主キーを検証する。
 * priv_wallets.waltid_wallet の型も検証する。
 *
 * @returns {Promise<void>}
 * @throws {Error} テーブル定義が期待値と異なる場合。
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
                added_on: ['timestamp without time zone', null, 'YES']
            },
            did_aliases: {
                waltid_wallet_id: ['character varying', 128, 'NO'],
                did: ['character varying', 1024, 'NO'],
                alias: ['character varying', 1024, 'NO'],
                created_on: ['timestamp without time zone', null, 'YES']
            }
        }

        for (const [table, expected] of Object.entries(definitions)) {
            const response = await cloudWallet.query(
                `
                SELECT column_name, data_type,
                       character_maximum_length, is_nullable
                FROM information_schema.columns
                WHERE table_schema = $1 AND table_name = $2
                `,
                [targetSchemaName, table]
            )

            const actual = Object.fromEntries(
                response.rows.map(row => [row.column_name, row])
            )

            for (const [column, definition] of Object.entries(expected)) {
                const row = actual[column]

                if (!row ||
                    row.data_type !== definition[0] ||
                    row.character_maximum_length !== definition[1] ||
                    row.is_nullable !== definition[2]) {
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
            const response = await cloudWallet.query(
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

            if (response.rows.length !== 1 ||
                JSON.stringify(response.rows[0].columns) !==
                JSON.stringify(expected)) {
                throw new Error(`${table} primary key mismatch`)
            }
        }

        logger.debug('result : target table definitions are valid')
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** verifyTargetTableDefinitions end ***')
    }
}

/**
 * 移行元と移行先の Wallet/DID エイリアスデータを照合する。
 *
 * @param {Object} source - 移行元データ。
 * @returns {Promise<void>}
 * @throws {Error} 移行データに不一致がある場合。
 */
const verifyMigratedData = async (source) => {
    logger.debug('*** verifyMigratedData start ***')
    try {
        for (const item of source.walletAliases) {
            const response = await cloudWallet.query(
                `
                SELECT wallet_name, added_on::text AS added_on
                FROM ${targetSchema}.wallet_aliases
                WHERE waltid_wallet_id = $1
                `,
                [item.walletId]
            )

            if (response.rowCount !== 1 ||
                getText(response.rows[0], 'wallet_name') !== item.walletName ||
                getText(response.rows[0], 'added_on') !== item.addedOn) {
                throw new Error(
                    `wallet_aliases mismatch: ${item.walletId}`
                )
            }
        }

        for (const item of source.didAliases) {
            const response = await cloudWallet.query(
                `
                SELECT alias, created_on::text AS created_on
                FROM ${targetSchema}.did_aliases
                WHERE waltid_wallet_id = $1 AND did = $2
                `,
                [item.walletId, item.did]
            )

            if (response.rowCount !== 1 ||
                getText(response.rows[0], 'alias') !== item.alias ||
                getText(response.rows[0], 'created_on') !== item.createdOn) {
                throw new Error(
                    `did_aliases mismatch: ${item.walletId}, ${item.did}`
                )
            }
        }

        logger.debug('result : migrated data is valid')
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** verifyMigratedData end ***')
    }
}

/**
 * Wallet/DID エイリアスの移行処理を実行する。
 * Dry Run の場合は ROLLBACK、Apply の場合は COMMIT する。
 *
 * @returns {Promise<Object>} 移行件数。
 * @throws {Error} 移行または検証に失敗した場合。
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
        await verifyTargetTableDefinitions()

        const walletAliases =
            await migrateWalletAliases(source.walletAliases)
        const didAliases =
            await migrateDidAliases(source.didAliases)

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
                logger.error('rollback error: ', rollbackError.stack)
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
 * 移行先テーブルの定義、件数、Wallet 参照整合性を検証する。
 *
 * @returns {Promise<void>}
 * @throws {Error} 検証に失敗した場合。
 */
const verify = async () => {
    logger.debug('*** verify start ***')
    try {
        await verifyTargetTableDefinitions()

        const walletCount = await cloudWallet.query(
            `SELECT COUNT(*)::int AS count
             FROM ${targetSchema}.wallet_aliases`
        )
        const didCount = await cloudWallet.query(
            `SELECT COUNT(*)::int AS count
             FROM ${targetSchema}.did_aliases`
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
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** verify end ***')
    }
}

/**
 * コマンドライン引数を検証し、DB 接続および移行・検証を実行する。
 * 処理終了後、DB 接続を切断する。
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
            flags.some(f =>
                !['--apply', '--dry-run', '--print-data'].includes(f)
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
