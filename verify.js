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

// PostgreSQL識別子を検証する
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

// 個人情報を含むため、指定時のみ移行対象の明細を表示する
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

            const result = String(value)

            // 個人情報を含む可能性があるため、値自体は出力しない
            logger.debug('matched column : ', name)

            return result
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

// walt.idの移行元データを参照する（パスワード等の不要なカラムは取得しない）
const readSource = async (table, columns) => {
    logger.debug('*** readSource start ***')
    try {
        const allowed = {
            accounts: ['id'],
            oidclogins: ['accountId', 'account_id', 'oidcId', 'oidc_id'],
            account_wallet_mapping: ['id', 'wallet', 'added_on', 'addedOn'],
            wallets: ['id', 'name'],
            wallet_dids: ['wallet', 'did', 'alias', 'createdOn', 'created_on']
        }
        if (!allowed[table] || columns.some((c) => !allowed[table].includes(c))) {
            throw new Error(`Unsupported source selection: ${table}`)
        }
        logger.debug('table : ', table)
        logger.debug('columns : ', JSON.stringify(columns))

        // 日時カラムはDate型に変換せず、PostgreSQLの文字列表現で取得する
        const timestampColumns = {
            account_wallet_mapping: ['added_on', 'addedOn'],
            wallet_dids: ['created_on', 'createdOn']
        }

        // 移行先はTIMESTAMP WITHOUT TIME ZONEのため、時刻の意味が変わる型は拒否する
        const dateColumns = columns.filter(column => timestampColumns[table]?.includes(column))
        if (dateColumns.length > 0) {
            const metadata = await waltId.query(
                `
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_schema = $1 AND table_name = $2 AND column_name = ANY($3::text[])
                `,
                [sourceSchemaName, table, dateColumns]
            )

            for (const row of metadata.rows) {
                if (row.data_type !== 'timestamp without time zone') {
                    throw new Error(`Unsupported timestamp type: ${table}.${row.column_name} (${row.data_type})`)
                }
            }
            if (metadata.rows.length !== dateColumns.length) {
                throw new Error(`Timestamp column metadata not found: ${table}`)
            }
        }

        const selected = columns.map(column => {
            const quoted = quoteId(column)

            if (timestampColumns[table]?.includes(column)) {
                return `${quoted}::text AS ${quoted}`
            }

            return quoted
        }).join(', ')

        const response = await waltId.query(`SELECT ${selected} FROM ${sourceSchema}.${quoteId(table)}`)
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

// 移行元で利用可能なカラム名を取得する
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

        const result = new Set(response.rows.map(row => row.column_name))

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

// カラム名の表記差異（camelCase / snake_case）を吸収する
const selectColumns = async (table, required, alternatives = [], optional = []) => {
    logger.debug('*** selectColumns start ***')

    try {
        logger.debug('table : ', table)
        logger.debug('required : ', JSON.stringify(required))
        logger.debug('alternatives : ', JSON.stringify(alternatives))
        logger.debug('optional : ', JSON.stringify(optional))

        const columns = await getSourceColumns(table)
        logger.debug('columns : ', JSON.stringify([...columns], null, 2))

        for (const column of required) {
            if (!columns.has(column)) throw new Error(`Missing source column: ${table}.${column}`)
        }

        const extra = []
        for (const group of alternatives) {
            const found = group.find((column) => columns.has(column))
            if (!found) throw new Error(`Missing source column: ${table}.${group.join(' / ')}`)
            extra.push(found)
        }

        const selectedColumns = [...required, ...extra, ...optional.filter((name) => columns.has(name))]
        logger.debug('selectedColumns : ', JSON.stringify(selectedColumns, null, 2))

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

// 旧バージョンのAccountとWalletが1対1であることを確認する
const prepareSource = async () => {
    logger.debug('*** prepareSource start ***')
    try {
        const accounts = await selectColumns('accounts', ['id'])
        const mappings = await selectColumns('account_wallet_mapping', ['id', 'wallet'], [['added_on', 'addedOn']])
        const wallets = await selectColumns('wallets', ['id', 'name'])
        const didRows = await selectColumns('wallet_dids', ['wallet', 'did', 'alias'], [['createdOn', 'created_on']])
        const logins = await selectColumns('oidclogins', [], [['accountId', 'account_id'], ['oidcId', 'oidc_id']])

        const accountIds = new Set(accounts.map((row) => getText(row, 'id')))
        const walletNames = new Map(wallets.map((row) => [getText(row, 'id'), getText(row, 'name')]))
        const accountToWallet = new Map()
        const walletToAccount = new Map()
        const accountWallets = []
        const didAliases = []
        const oidcAccounts = new Map()
        const didKeys = new Set()

        if (accountIds.has(null) || accountIds.size !== accounts.length) {
            throw new Error('accounts.id is missing or duplicated')
        }
        if (walletNames.has(null) || walletNames.size !== wallets.length) {
            throw new Error('wallets.id is missing or duplicated')
        }

        for (const row of mappings) {
            const accountId = getText(row, 'id')
            const walletId = getText(row, 'wallet')
            if (!accountId || !walletId) throw new Error('account_wallet_mapping.id/wallet is missing')
            if (!accountIds.has(accountId)) throw new Error(`Account not found: ${accountId}`)
            if (!walletNames.has(walletId)) throw new Error(`Wallet not found: ${walletId}`)
            if (accountToWallet.has(accountId)) {
                throw new Error(`Old 1:1 rule violated: multiple wallet mappings for account=${accountId}`)
            }
            if (walletToAccount.has(walletId)) {
                throw new Error(`Old 1:1 rule violated: multiple account mappings for wallet=${walletId}`)
            }
            accountToWallet.set(accountId, walletId)
            walletToAccount.set(walletId, accountId)
            accountWallets.push({
                accountId,
                walletId,
                walletName: walletNames.get(walletId),
                addedOn: getText(row, 'added_on', 'addedOn')
            })
        }

        for (const row of didRows) {
            const walletId = getText(row, 'wallet')
            const did = getText(row, 'did')
            const alias = getText(row, 'alias')
            if (!walletId || !did || alias === null) throw new Error('wallet_dids.wallet/did/alias is missing')
            if (!walletNames.has(walletId)) throw new Error(`DID wallet not found: ${walletId}`)
            const key = JSON.stringify([walletId, did])
            if (didKeys.has(key)) throw new Error(`Duplicate wallet_dids: ${key}`)
            didKeys.add(key)
            didAliases.push({ walletId, did, alias, createdOn: getText(row, 'createdOn', 'created_on') })
        }

        for (const row of logins) {
            const oidcId = getText(row, 'oidcId', 'oidc_id')
            const accountId = getText(row, 'accountId', 'account_id')
            if (!oidcId || !accountId || !accountIds.has(accountId)) {
                throw new Error('Invalid oidclogins.oidcId/accountId')
            }
            if (!oidcAccounts.has(oidcId)) oidcAccounts.set(oidcId, new Set())
            oidcAccounts.get(oidcId).add(accountId)
        }

        logger.debug('accounts.length : ', accounts.length)
        logger.debug('mappings.length : ', mappings.length)
        logger.debug('wallets.length : ', wallets.length)
        logger.debug('didRows.length : ', didRows.length)
        logger.debug('logins.length : ', logins.length)

        showData('account_wallet_mapping -> account_wallets', accountWallets)
        showData('wallet_dids -> did_aliases', didAliases)
        console.log(`SOURCE: accounts=${accounts.length}, mappings=${accountWallets.length}, DID aliases=${didAliases.length}`)
        return { accountIds, walletToAccount, accountWallets, didAliases, oidcAccounts }
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** prepareSource end ***')
    }
}

// 現在の主キー構成を取得する
const getPrimaryKey = async () => {
    logger.debug('*** getPrimaryKey start ***')

    try {
        logger.debug('targetSchemaName : ', targetSchemaName)

        const response = await cloudWallet.query(
            `
            SELECT
                c.conname,
                json_agg(a.attname ORDER BY k.ord) AS columns
            FROM pg_constraint c
            JOIN pg_class t ON t.oid = c.conrelid
            JOIN pg_namespace n ON n.oid = t.relnamespace
            JOIN unnest(c.conkey) WITH ORDINALITY k(attnum, ord) ON TRUE
            JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
            WHERE n.nspname = $1
              AND t.relname = 'priv_wallets'
              AND c.contype = 'p'
            GROUP BY c.conname
            `,
            [targetSchemaName]
        )

        logger.debug('response.rows : ', JSON.stringify(response.rows, null, 2))

        if (response.rows.length !== 1) {
            throw new Error('priv_wallets PRIMARY KEY not found')
        }

        const result = response.rows[0]
        logger.debug('result : ', JSON.stringify(result, null, 2))

        return result
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** getPrimaryKey end ***')
    }
}

// 一度移行済みのテーブルには旧Migrationを再適用しない
const assertOldStructure = async () => {
    logger.debug('*** assertOldStructure start ***')

    try {
        const pk = await getPrimaryKey()
        logger.debug('pk : ', JSON.stringify(pk, null, 2))

        if (!Array.isArray(pk.columns) ||
            JSON.stringify(pk.columns) !== JSON.stringify(['user_id'])) {
            throw new Error(
                'priv_wallets is not in old 1:1 schema. This migration is for initial migration only'
            )
        }

        const result = pk.conname
        logger.debug('result : ', result)

        return result
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** assertOldStructure end ***')
    }
}

// 既存のWallet IDを使用してAccount IDを確定する
const preparePrivateWallets = async (source) => {
    logger.debug('*** preparePrivateWallets start ***')
    try {
        const response = await cloudWallet.query(`SELECT * FROM ${targetSchema}.priv_wallets ORDER BY user_id`)
        const assignments = []
        for (const row of response.rows) {
            const userId = getText(row, 'user_id')
            const walletId = getText(row, 'waltid_wallet')
            const existingId = getText(row, 'account_id')
            if (!userId || !walletId) throw new Error(`Missing user_id or legacy wallet for user=${userId}`)
            const accountId = source.walletToAccount.get(walletId)
            if (!accountId) throw new Error(`Account not found by legacy wallet: user=${userId}, wallet=${walletId}`)
            if (existingId && existingId !== accountId) throw new Error(`Existing account_id conflict: user=${userId}`)

            // user_idがoidcIdに一致した場合だけ補助チェックを実行する
            const oidcCandidates = source.oidcAccounts.get(userId)
            if (oidcCandidates && !oidcCandidates.has(accountId)) {
                throw new Error(`OIDC account conflict: user=${userId}, wallet=${walletId}`)
            }
            const item = { userId, walletId, accountId, needsUpdate: !existingId }
            assignments.push(item)
            showData('priv_wallets mapping', item)
        }
        logger.debug('assignments.length : ', assignments.length)
        logger.debug('backfill.length : ', assignments.filter((x) => x.needsUpdate).length)
        console.log(`CLOUD WALLET: priv_wallets=${assignments.length}, backfill=${assignments.filter((x) => x.needsUpdate).length}`)
        return assignments
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** preparePrivateWallets end ***')
    }
}

// Cloud Wallet内のDDLとデータ更新をひとつのトランザクションで実行する
const migrate = async () => {
    logger.debug('*** migrate start ***')
    let transactionStarted = false
    try {
        // 対象DBの変更を防ぐため、移行中はアプリケーションの書き込みを停止すること
        await cloudWallet.query('BEGIN')
        transactionStarted = true
        await cloudWallet.query("SET LOCAL lock_timeout = '5s'")
        await cloudWallet.query("SET LOCAL statement_timeout = '120s'")
        await cloudWallet.query(`LOCK TABLE ${targetSchema}.priv_wallets IN ACCESS EXCLUSIVE MODE`)
        const oldPrimaryKeyName = await assertOldStructure()

        // walt.idは旧バージョンの1対1データを参照する
        const source = await prepareSource()
        const assignments = await preparePrivateWallets(source)

        // priv_walletsの構造変更
        await cloudWallet.query(`
            ALTER TABLE ${targetSchema}.priv_wallets
            ALTER COLUMN waltid_wallet TYPE VARCHAR(128)
            USING waltid_wallet::VARCHAR(128)
        `)
        await cloudWallet.query(`ALTER TABLE ${targetSchema}.priv_wallets ALTER COLUMN waltid_wallet DROP NOT NULL`)
        await cloudWallet.query(`ALTER TABLE ${targetSchema}.priv_wallets ADD COLUMN IF NOT EXISTS account_id VARCHAR(128)`)

        for (const item of assignments) {
            if (!item.needsUpdate) continue
            const response = await cloudWallet.query(`
                UPDATE ${targetSchema}.priv_wallets SET account_id = $1
                WHERE user_id = $2 AND account_id IS NULL
            `, [item.accountId, item.userId])
            if (response.rowCount !== 1) throw new Error(`account_id backfill failed for user=${item.userId}`)
        }

        const unmapped = await cloudWallet.query(`
            SELECT COUNT(*)::int AS count FROM ${targetSchema}.priv_wallets
            WHERE account_id IS NULL OR account_id = ''
        `)
        if (unmapped.rows[0].count !== 0) throw new Error('Unmapped priv_wallets.account_id remains')

        await cloudWallet.query(`ALTER TABLE ${targetSchema}.priv_wallets ALTER COLUMN account_id SET NOT NULL`)
        await cloudWallet.query(`ALTER TABLE ${targetSchema}.priv_wallets DROP CONSTRAINT ${quoteId(oldPrimaryKeyName)}`)
        await cloudWallet.query(`
            ALTER TABLE ${targetSchema}.priv_wallets
            ADD CONSTRAINT priv_wallets_pkey PRIMARY KEY (user_id, account_id)
        `)

        // Account-Wallet関連情報テーブルを追加する
        await cloudWallet.query(`
            CREATE TABLE IF NOT EXISTS ${targetSchema}.account_wallets (
                account_id VARCHAR(128) NOT NULL,
                wallet_id VARCHAR(128) NOT NULL,
                wallet_name VARCHAR(128),
                added_on TIMESTAMP,
                PRIMARY KEY (account_id, wallet_id)
            )
        `)

        // DID Alias情報テーブルを追加する
        await cloudWallet.query(`
            CREATE TABLE IF NOT EXISTS ${targetSchema}.did_aliases (
                wallet_id VARCHAR(128) NOT NULL,
                did VARCHAR(1024) NOT NULL,
                alias VARCHAR(1024) NOT NULL,
                created_on TIMESTAMP,
                PRIMARY KEY (wallet_id, did)
            )
        `)

        // walt.idのAccount-Wallet情報をCloud Walletに移行する
        for (const item of source.accountWallets) {
            await cloudWallet.query(`
                INSERT INTO ${targetSchema}.account_wallets
                    (account_id, wallet_id, wallet_name, added_on)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (account_id, wallet_id)
                DO UPDATE SET wallet_name = EXCLUDED.wallet_name, added_on = EXCLUDED.added_on
            `, [item.accountId, item.walletId, item.walletName, item.addedOn])
        }

        // walt.idのDID Alias情報をCloud Walletに移行する
        for (const item of source.didAliases) {
            await cloudWallet.query(`
                INSERT INTO ${targetSchema}.did_aliases
                    (wallet_id, did, alias, created_on)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (wallet_id, did)
                DO UPDATE SET alias = EXCLUDED.alias, created_on = EXCLUDED.created_on
            `, [item.walletId, item.did, item.alias, item.createdOn])
        }

        // COMMIT前に移行後の構造と参照整合性を検証する
        await verify(false)
        console.log('PRE-COMMIT CHECK: SUCCESS')

        const summary = {
            privWallets: assignments.length,
            accountIdBackfilled: assignments.filter((item) => item.needsUpdate).length,
            accountWallets: source.accountWallets.length,
            didAliases: source.didAliases.length
        }
        logger.debug('summary : ', JSON.stringify(summary, null, 2))
        showData('migration summary', summary)
        if (dryRun) {
            await cloudWallet.query('ROLLBACK')
            console.log('DRY RUN: all Cloud Wallet changes rolled back', summary)
        } else {
            await cloudWallet.query('COMMIT')
            console.log('APPLY: Cloud Wallet migration committed', summary)
        }
        transactionStarted = false
        return summary
    } catch (error) {
        if (transactionStarted) {
            try {
                await cloudWallet.query('ROLLBACK')
            } catch (rollbackError) {
                logger.error('error.message: ', rollbackError.message)
                logger.error('error.stack: ', rollbackError.stack)
            }
        }
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** migrate end ***')
    }
}

// 新規テーブルのカラム定義と主キーを確認する
const verifyTableStructure = async (table, expectedColumns, expectedPrimaryKey) => {
    logger.debug('*** verifyTableStructure start ***')

    try {
        logger.debug('table : ', table)

        const response = await cloudWallet.query(
            `
            SELECT column_name, data_type, character_maximum_length, is_nullable
            FROM information_schema.columns
            WHERE table_schema = $1 AND table_name = $2
            `,
            [targetSchemaName, table]
        )

        const columns = Object.fromEntries(response.rows.map(row => [row.column_name, row]))
        logger.debug('columns : ', JSON.stringify(columns, null, 2))

        for (const [name, expected] of Object.entries(expectedColumns)) {
            const actual = columns[name]
            if (!actual ||
                actual.data_type !== expected.dataType ||
                (expected.maxLength !== undefined && actual.character_maximum_length !== expected.maxLength) ||
                actual.is_nullable !== expected.nullable) {
                throw new Error(`${table}.${name} definition mismatch`)
            }
        }

        const pkResponse = await cloudWallet.query(
            `
            SELECT json_agg(a.attname ORDER BY k.ord) AS columns
            FROM pg_constraint c
            JOIN pg_class t ON t.oid = c.conrelid
            JOIN pg_namespace n ON n.oid = t.relnamespace
            JOIN unnest(c.conkey) WITH ORDINALITY k(attnum, ord) ON TRUE
            JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
            WHERE n.nspname = $1 AND t.relname = $2 AND c.contype = 'p'
            GROUP BY c.conname
            `,
            [targetSchemaName, table]
        )

        if (pkResponse.rows.length !== 1 ||
            JSON.stringify(pkResponse.rows[0].columns) !== JSON.stringify(expectedPrimaryKey)) {
            throw new Error(`${table} primary key mismatch`)
        }

        logger.debug('primary key : ', JSON.stringify(pkResponse.rows[0].columns))
        return true
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** verifyTableStructure end ***')
    }
}

// 移行後のテーブル構造とデータを確認する（新仕様の1:Nは拒否しない）
const verify = async (logSuccess = true) => {
    logger.debug('*** verify start ***')
    try {
        const pk = await getPrimaryKey()
        logger.debug('pk : ', JSON.stringify(pk, null, 2))

        if (JSON.stringify(pk.columns) !== JSON.stringify(['user_id', 'account_id'])) {
            throw new Error('priv_wallets primary key mismatch')
        }
        const response = await cloudWallet.query(`
            SELECT column_name, data_type, character_maximum_length, is_nullable
            FROM information_schema.columns WHERE table_schema = $1 AND table_name = 'priv_wallets'
        `, [targetSchemaName])
        const columns = Object.fromEntries(response.rows.map((row) => [row.column_name, row]))
        logger.debug('columns : ', JSON.stringify(columns, null, 2))
        if (columns.waltid_wallet?.data_type !== 'character varying' ||
            columns.waltid_wallet?.character_maximum_length !== 128 ||
            columns.waltid_wallet?.is_nullable !== 'YES') {
            throw new Error('priv_wallets.waltid_wallet definition mismatch')
        }
        if (columns.account_id?.data_type !== 'character varying' ||
            columns.account_id?.character_maximum_length !== 128 ||
            columns.account_id?.is_nullable !== 'NO') {
            throw new Error('priv_wallets.account_id definition mismatch')
        }

        await verifyTableStructure('account_wallets', {
            account_id: { dataType: 'character varying', maxLength: 128, nullable: 'NO' },
            wallet_id: { dataType: 'character varying', maxLength: 128, nullable: 'NO' },
            wallet_name: { dataType: 'character varying', maxLength: 128, nullable: 'YES' },
            added_on: { dataType: 'timestamp without time zone', nullable: 'YES' }
        }, ['account_id', 'wallet_id'])

        await verifyTableStructure('did_aliases', {
            wallet_id: { dataType: 'character varying', maxLength: 128, nullable: 'NO' },
            did: { dataType: 'character varying', maxLength: 1024, nullable: 'NO' },
            alias: { dataType: 'character varying', maxLength: 1024, nullable: 'NO' },
            created_on: { dataType: 'timestamp without time zone', nullable: 'YES' }
        }, ['wallet_id', 'did'])

        // 移行元から既存値を再比較する処理ではなく、移行先の参照整合性を確認する
        const invalid = await cloudWallet.query(`
            SELECT p.user_id, p.account_id, p.waltid_wallet
            FROM ${targetSchema}.priv_wallets p
            WHERE p.waltid_wallet IS NOT NULL
              AND NOT EXISTS (
                SELECT 1 FROM ${targetSchema}.account_wallets aw
                WHERE aw.account_id = p.account_id AND aw.wallet_id = p.waltid_wallet
              )
            LIMIT 10
        `)
        logger.debug('invalid.rows.length : ', invalid.rows.length)
        if (invalid.rows.length > 0) {
            showData('invalid priv_wallets', invalid.rows)
            throw new Error(`priv_wallets references missing account-wallet mappings: ${invalid.rows.length} sample rows`)
        }

        for (const table of ['account_wallets', 'did_aliases']) {
            const count = await cloudWallet.query(`SELECT COUNT(*)::int AS count FROM ${targetSchema}.${quoteId(table)}`)
            logger.debug(`VERIFY ${table} : `, count.rows[0].count)
            console.log(`VERIFY ${table}: ${count.rows[0].count} rows`)
        }
        if (logSuccess) console.log('Migration verification: SUCCESS')
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
        if (!['migrate', 'verify'].includes(command) ||
            flags.some((flag) => !['--apply', '--dry-run', '--print-data'].includes(flag)) ||
            (apply && process.argv.includes('--dry-run')) ||
            (command === 'verify' && (apply || process.argv.includes('--dry-run')))) {
            throw new Error('Usage: node migrate_wallet_data.js migrate [--dry-run | --apply] [--print-data] | verify [--print-data]')
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
        if (cloudWalletConnected) await cloudWallet.end()
        if (waltIdConnected) await waltId.end()
        logger.debug('*** main end ***')
    }
}

main()
