'use strict'

const fs = require('fs')
const path = require('path')
const { Client } = require('pg')
const log4js = require('log4js')
const dbConfig = require('./config/db.json')
const log4jsConfig = require('./config/log4js.json')

const fileName = 'migrate_wallet_data'
fs.mkdirSync(path.join(__dirname, 'logs'), { recursive: true })
log4jsConfig.appenders.file.filename = path.join(__dirname, 'logs', `${fileName}.log`)
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

const quoteId = (value) => {
    logger.debug('*** quoteId start ***')

    try {
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
            throw new Error(`Invalid SQL identifier: ${value}`)
        }

        const result = `"${value}"`
        logger.debug('result : ', result)

        return result
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

const showData = (label, value) => {
    logger.debug('*** showData start ***')

    try {
        logger.debug('label : ', label)
        logger.debug('printData : ', printData)

        if (printData) {
            console.log(`[DATA] ${label}: ${JSON.stringify(value, null, 2)}`)
        }
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** showData end ***')
    }
}

const getText = (row, ...names) => {
    logger.debug('*** getText start ***')

    try {
        logger.debug('names : ', JSON.stringify(names))

        for (const name of names) {
            if (!Object.prototype.hasOwnProperty.call(row, name)) {
                continue
            }

            const value = row[name]

            if (value === null || value === undefined) {
                continue
            }

            logger.debug('matched column : ', name)

            return String(value)
        }

        logger.debug('matched column : none')

        return null
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** getText end ***')
    }
}

const getSourceColumns = async (table) => {
    logger.debug('*** getSourceColumns start ***')

    try {
        logger.debug('sourceSchemaName : ', sourceSchemaName)
        logger.debug('table : ', table)

        const response = await waltId.query(
            `
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = $1
              AND table_name = $2
            `,
            [sourceSchemaName, table]
        )

        logger.debug('response.rows : ', JSON.stringify(response.rows, null, 2))

        const result = new Set(response.rows.map((row) => row.column_name))

        logger.debug('result : ', JSON.stringify([...result], null, 2))

        return result
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** getSourceColumns end ***')
    }
}

const getSourceColumnType = async (table, column) => {
    logger.debug('*** getSourceColumnType start ***')

    try {
        logger.debug('table : ', table)
        logger.debug('column : ', column)

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

        const result = response.rows[0] || null

        logger.debug('result : ', JSON.stringify(result, null, 2))

        return result
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** getSourceColumnType end ***')
    }
}

const createSourceSelect = async (table, columns) => {
    logger.debug('*** createSourceSelect start ***')

    try {
        logger.debug('table : ', table)
        logger.debug('columns : ', JSON.stringify(columns))

        const timestampColumns = {
            wallets: ['added_on', 'addedOn'],
            wallet_dids: ['created_on', 'createdOn']
        }

        const selected = []

        for (const column of columns) {
            const quoted = quoteId(column)

            if (timestampColumns[table]?.includes(column)) {
                const type = await getSourceColumnType(table, column)

                if (!type) {
                    throw new Error(
                        `Source column type not found: ${table}.${column}`
                    )
                }

                if (type.data_type !== 'timestamp without time zone') {
                    throw new Error(
                        `Unsupported timestamp type: ${table}.${column}=${type.data_type}`
                    )
                }

                selected.push(`${quoted}::text AS ${quoted}`)
            } else {
                selected.push(quoted)
            }
        }

        const result = selected.join(', ')

        logger.debug('result : ', result)

        return result
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** createSourceSelect end ***')
    }
}

const readSource = async (table, columns) => {
    logger.debug('*** readSource start ***')

    try {
        const allowed = {
            wallets: ['id', 'name', 'added_on', 'addedOn'],
            wallet_dids: [
                'wallet',
                'did',
                'alias',
                'created_on',
                'createdOn'
            ]
        }

        if (
            !allowed[table] ||
            columns.some((column) => !allowed[table].includes(column))
        ) {
            throw new Error(`Unsupported source selection: ${table}`)
        }

        logger.debug('table : ', table)
        logger.debug('columns : ', JSON.stringify(columns))

        const selected = await createSourceSelect(table, columns)

        const response = await waltId.query(
            `SELECT ${selected} FROM ${sourceSchema}.${quoteId(table)}`
        )

        const result = response.rows

        logger.debug('result.length : ', result.length)
        showData(`readSource ${table}`, result)

        return result
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** readSource end ***')
    }
}

const selectColumns = async (
    table,
    required,
    alternatives = [],
    optional = []
) => {
    logger.debug('*** selectColumns start ***')

    try {
        logger.debug('table : ', table)
        logger.debug('required : ', JSON.stringify(required))
        logger.debug('alternatives : ', JSON.stringify(alternatives))
        logger.debug('optional : ', JSON.stringify(optional))

        const columns = await getSourceColumns(table)

        logger.debug('columns : ', JSON.stringify([...columns], null, 2))

        for (const column of required) {
            if (!columns.has(column)) {
                throw new Error(`Missing source column: ${table}.${column}`)
            }
        }

        const extra = []

        for (const group of alternatives) {
            const found = group.find((column) => columns.has(column))

            if (!found) {
                throw new Error(
                    `Missing source column: ${table}.${group.join(' / ')}`
                )
            }

            extra.push(found)
        }

        const selectedColumns = [
            ...required,
            ...extra,
            ...optional.filter((name) => columns.has(name))
        ]

        logger.debug(
            'selectedColumns : ',
            JSON.stringify(selectedColumns, null, 2)
        )

        const result = await readSource(table, selectedColumns)

        logger.debug('result.length : ', result.length)

        return result
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** selectColumns end ***')
    }
}

const prepareSource = async () => {
    logger.debug('*** prepareSource start ***')

    try {
        const wallets = await selectColumns(
            'wallets',
            ['id', 'name'],
            [],
            ['added_on', 'addedOn']
        )

        const didRows = await selectColumns(
            'wallet_dids',
            ['wallet', 'did', 'alias'],
            [],
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

            if (!walletId) {
                throw new Error('wallets.id is missing')
            }

            if (walletIds.has(walletId)) {
                throw new Error(`Duplicate wallet ID: ${walletId}`)
            }

            walletIds.add(walletId)

            walletAliases.push({
                walletId,
                walletName,
                addedOn
            })
        }

        for (const row of didRows) {
            const walletId = getText(row, 'wallet')
            const did = getText(row, 'did')
            const alias = getText(row, 'alias')
            const createdOn = getText(row, 'created_on', 'createdOn')

            if (!walletId || !did || alias === null) {
                throw new Error(
                    'wallet_dids.wallet/did/alias is missing'
                )
            }

            if (!walletIds.has(walletId)) {
                throw new Error(`DID wallet not found: ${walletId}`)
            }

            const key = JSON.stringify([walletId, did])

            if (didKeys.has(key)) {
                throw new Error(`Duplicate wallet_dids: ${key}`)
            }

            didKeys.add(key)

            didAliases.push({
                walletId,
                did,
                alias,
                createdOn
            })
        }

        logger.debug('walletAliases.length : ', walletAliases.length)
        logger.debug('didAliases.length : ', didAliases.length)

        showData('wallets -> wallet_aliases', walletAliases)
        showData('wallet_dids -> did_aliases', didAliases)

        console.log(
            `SOURCE: wallets=${walletAliases.length}, DID aliases=${didAliases.length}`
        )

        return {
            walletIds,
            walletAliases,
            didAliases
        }
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** prepareSource end ***')
    }
}

const verifyPrivateWalletsBeforeMigration = async (sourceWalletIds) => {
    logger.debug(
        '*** verifyPrivateWalletsBeforeMigration start ***'
    )

    try {
        const response = await cloudWallet.query(
            `
            SELECT user_id, waltid_wallet
            FROM ${targetSchema}.priv_wallets
            ORDER BY user_id
            `
        )

        logger.debug('response.rows.length : ', response.rows.length)

        const result = []

        for (const row of response.rows) {
            const userId = getText(row, 'user_id')
            const walletId = getText(row, 'waltid_wallet')

            if (!userId || !walletId) {
                throw new Error(
                    `Missing user_id or waltid_wallet: user_id=${userId}`
                )
            }

            if (!sourceWalletIds.has(walletId)) {
                throw new Error(
                    `Wallet not found in walt.id source: user_id=${userId}, wallet=${walletId}`
                )
            }

            result.push({
                userId,
                walletId
            })
        }

        showData('priv_wallets validation', result)

        logger.debug('result.length : ', result.length)

        return result
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug(
            '*** verifyPrivateWalletsBeforeMigration end ***'
        )
    }
}

const createTargetTables = async () => {
    logger.debug('*** createTargetTables start ***')

    try {
        await cloudWallet.query(
            `
            CREATE TABLE IF NOT EXISTS ${targetSchema}.wallet_aliases (
                wallet_id VARCHAR(128) NOT NULL,
                wallet_name VARCHAR(128),
                added_on TIMESTAMP,
                PRIMARY KEY (wallet_id)
            )
            `
        )

        await cloudWallet.query(
            `
            CREATE TABLE IF NOT EXISTS ${targetSchema}.did_aliases (
                wallet_id VARCHAR(128) NOT NULL,
                did VARCHAR(1024) NOT NULL,
                alias VARCHAR(1024) NOT NULL,
                created_on TIMESTAMP,
                PRIMARY KEY (wallet_id, did)
            )
            `
        )

        logger.debug('result : target tables created')
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** createTargetTables end ***')
    }
}

const migrateWalletAliases = async (walletAliases) => {
    logger.debug('*** migrateWalletAliases start ***')

    try {
        let count = 0

        for (const item of walletAliases) {
            logger.debug('item : ', JSON.stringify(item, null, 2))

            await cloudWallet.query(
                `
                INSERT INTO ${targetSchema}.wallet_aliases
                    (wallet_id, wallet_name, added_on)
                VALUES ($1, $2, $3)
                ON CONFLICT (wallet_id)
                DO UPDATE SET
                    wallet_name = EXCLUDED.wallet_name,
                    added_on = EXCLUDED.added_on
                `,
                [
                    item.walletId,
                    item.walletName,
                    item.addedOn
                ]
            )

            count++
        }

        logger.debug('result : ', count)

        return count
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** migrateWalletAliases end ***')
    }
}

const migrateDidAliases = async (didAliases) => {
    logger.debug('*** migrateDidAliases start ***')

    try {
        let count = 0

        for (const item of didAliases) {
            logger.debug('item : ', JSON.stringify(item, null, 2))

            await cloudWallet.query(
                `
                INSERT INTO ${targetSchema}.did_aliases
                    (wallet_id, did, alias, created_on)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (wallet_id, did)
                DO UPDATE SET
                    alias = EXCLUDED.alias,
                    created_on = EXCLUDED.created_on
                `,
                [
                    item.walletId,
                    item.did,
                    item.alias,
                    item.createdOn
                ]
            )

            count++
        }

        logger.debug('result : ', count)

        return count
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** migrateDidAliases end ***')
    }
}

const verifyTargetTableDefinitions = async () => {
    logger.debug('*** verifyTargetTableDefinitions start ***')

    try {
        const walletAliasesColumns = await cloudWallet.query(
            `
            SELECT
                column_name,
                data_type,
                character_maximum_length,
                is_nullable
            FROM information_schema.columns
            WHERE table_schema = $1
              AND table_name = 'wallet_aliases'
            ORDER BY ordinal_position
            `,
            [targetSchemaName]
        )

        const didAliasesColumns = await cloudWallet.query(
            `
            SELECT
                column_name,
                data_type,
                character_maximum_length,
                is_nullable
            FROM information_schema.columns
            WHERE table_schema = $1
              AND table_name = 'did_aliases'
            ORDER BY ordinal_position
            `,
            [targetSchemaName]
        )

        const walletColumns = Object.fromEntries(
            walletAliasesColumns.rows.map(
                (row) => [row.column_name, row]
            )
        )

        const didColumns = Object.fromEntries(
            didAliasesColumns.rows.map(
                (row) => [row.column_name, row]
            )
        )

        if (
            walletColumns.wallet_id?.data_type !==
                'character varying' ||
            walletColumns.wallet_id?.character_maximum_length !== 128 ||
            walletColumns.wallet_id?.is_nullable !== 'NO'
        ) {
            throw new Error(
                'wallet_aliases.wallet_id definition mismatch'
            )
        }

        if (
            walletColumns.wallet_name?.data_type !==
                'character varying' ||
            walletColumns.wallet_name?.character_maximum_length !== 128
        ) {
            throw new Error(
                'wallet_aliases.wallet_name definition mismatch'
            )
        }

        if (
            walletColumns.added_on?.data_type !==
                'timestamp without time zone'
        ) {
            throw new Error(
                'wallet_aliases.added_on definition mismatch'
            )
        }

        if (
            didColumns.wallet_id?.data_type !==
                'character varying' ||
            didColumns.wallet_id?.character_maximum_length !== 128 ||
            didColumns.wallet_id?.is_nullable !== 'NO'
        ) {
            throw new Error(
                'did_aliases.wallet_id definition mismatch'
            )
        }

        if (
            didColumns.did?.data_type !== 'character varying' ||
            didColumns.did?.character_maximum_length !== 1024 ||
            didColumns.did?.is_nullable !== 'NO'
        ) {
            throw new Error(
                'did_aliases.did definition mismatch'
            )
        }

        if (
            didColumns.alias?.data_type !== 'character varying' ||
            didColumns.alias?.character_maximum_length !== 1024 ||
            didColumns.alias?.is_nullable !== 'NO'
        ) {
            throw new Error(
                'did_aliases.alias definition mismatch'
            )
        }

        if (
            didColumns.created_on?.data_type !==
                'timestamp without time zone'
        ) {
            throw new Error(
                'did_aliases.created_on definition mismatch'
            )
        }

        const walletPk = await cloudWallet.query(
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
              AND t.relname = 'wallet_aliases'
              AND c.contype = 'p'
            GROUP BY c.oid
            `,
            [targetSchemaName]
        )

        if (
            walletPk.rows.length !== 1 ||
            JSON.stringify(walletPk.rows[0].columns) !==
                JSON.stringify(['wallet_id'])
        ) {
            throw new Error(
                'wallet_aliases primary key mismatch'
            )
        }

        const didPk = await cloudWallet.query(
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
              AND t.relname = 'did_aliases'
              AND c.contype = 'p'
            GROUP BY c.oid
            `,
            [targetSchemaName]
        )

        if (
            didPk.rows.length !== 1 ||
            JSON.stringify(didPk.rows[0].columns) !==
                JSON.stringify(['wallet_id', 'did'])
        ) {
            throw new Error(
                'did_aliases primary key mismatch'
            )
        }

        logger.debug(
            'result : target table definitions are valid'
        )
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug(
            '*** verifyTargetTableDefinitions end ***'
        )
    }
}

const verifyMigratedData = async (source) => {
    logger.debug('*** verifyMigratedData start ***')

    try {
        for (const item of source.walletAliases) {
            const response = await cloudWallet.query(
                `
                SELECT
                    wallet_id,
                    wallet_name,
                    added_on::text AS added_on
                FROM ${targetSchema}.wallet_aliases
                WHERE wallet_id = $1
                `,
                [item.walletId]
            )

            if (response.rowCount !== 1) {
                throw new Error(
                    `wallet_aliases not found: wallet_id=${item.walletId}`
                )
            }

            const row = response.rows[0]

            if (
                getText(row, 'wallet_name') !== item.walletName ||
                getText(row, 'added_on') !== item.addedOn
            ) {
                throw new Error(
                    `wallet_aliases mismatch: wallet_id=${item.walletId}`
                )
            }
        }

        for (const item of source.didAliases) {
            const response = await cloudWallet.query(
                `
                SELECT
                    wallet_id,
                    did,
                    alias,
                    created_on::text AS created_on
                FROM ${targetSchema}.did_aliases
                WHERE wallet_id = $1
                  AND did = $2
                `,
                [item.walletId, item.did]
            )

            if (response.rowCount !== 1) {
                throw new Error(
                    `did_aliases not found: wallet_id=${item.walletId}, did=${item.did}`
                )
            }

            const row = response.rows[0]

            if (
                getText(row, 'alias') !== item.alias ||
                getText(row, 'created_on') !== item.createdOn
            ) {
                throw new Error(
                    `did_aliases mismatch: wallet_id=${item.walletId}, did=${item.did}`
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

const migrate = async () => {
    logger.debug('*** migrate start ***')

    let transactionStarted = false

    try {
        const source = await prepareSource()

        await cloudWallet.query('BEGIN')
        transactionStarted = true

        await cloudWallet.query(
            "SET LOCAL lock_timeout = '5s'"
        )

        await cloudWallet.query(
            "SET LOCAL statement_timeout = '120s'"
        )

        await verifyPrivateWalletsBeforeMigration(
            source.walletIds
        )

        await createTargetTables()

        const walletAliases =
            await migrateWalletAliases(
                source.walletAliases
            )

        const didAliases =
            await migrateDidAliases(
                source.didAliases
            )

        await verifyTargetTableDefinitions()
        await verifyMigratedData(source)

        const summary = {
            walletAliases,
            didAliases
        }

        logger.debug(
            'summary : ',
            JSON.stringify(summary, null, 2)
        )

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
                    'error.message: ',
                    rollbackError.message
                )

                logger.error(
                    'error.stack: ',
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

        const invalidPrivateWallets =
            await cloudWallet.query(
                `
                SELECT
                    p.user_id,
                    p.waltid_wallet
                FROM ${targetSchema}.priv_wallets p
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM ${targetSchema}.wallet_aliases wa
                    WHERE wa.wallet_id = p.waltid_wallet::text
                )
                LIMIT 10
                `
            )

        logger.debug(
            'invalidPrivateWallets.length : ',
            invalidPrivateWallets.rows.length
        )

        if (invalidPrivateWallets.rows.length > 0) {
            showData(
                'invalid priv_wallets',
                invalidPrivateWallets.rows
            )

            throw new Error(
                `priv_wallets references missing wallet_aliases: ${invalidPrivateWallets.rows.length} sample rows`
            )
        }

        console.log(
            `VERIFY wallet_aliases: ${walletCount.rows[0].count} rows`
        )

        console.log(
            `VERIFY did_aliases: ${didCount.rows[0].count} rows`
        )

        console.log(
            'Migration verification: SUCCESS'
        )
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** verify end ***')
    }
}

const main = async () => {
    logger.debug('*** main start ***')

    let waltIdConnected = false
    let cloudWalletConnected = false

    try {
        const flags = process.argv.slice(3)

        logger.debug('command : ', command)
        logger.debug('apply : ', apply)
        logger.debug('dryRun : ', dryRun)
        logger.debug('printData : ', printData)

        if (
            !['migrate', 'verify'].includes(command) ||
            flags.some(
                (flag) =>
                    ![
                        '--apply',
                        '--dry-run',
                        '--print-data'
                    ].includes(flag)
            ) ||
            (
                apply &&
                process.argv.includes('--dry-run')
            ) ||
            (
                command === 'verify' &&
                (
                    apply ||
                    process.argv.includes('--dry-run')
                )
            )
        ) {
            throw new Error(
                'Usage: node migrate_wallet_data.js migrate [--dry-run | --apply] [--print-data] | verify [--print-data]'
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

        console.error(
            `Migration failed: ${error.message}`
        )

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
