
# Cloud Wallet Migration

Cloud WalletのPostgreSQLデータに対し、`format`と`auth_type`の値を移行するツールです。`vc_info`、`vp_info`、`fields`については、今後の仕様確定に備えて取得・JSON解析・更新処理の枠組みを用意しています。

## 構成

```text
cloud-wallet-migration-v7/
├── ddl/
│   └── ddl.sql
├── config/
│   ├── config.json
│   └── db.json
├── services/
│   ├── postgres_service.js
│   └── json_migration_service.js
├── migrate_format.js
├── migrate_authType.js
├── migrate_vc_info.js
├── migrate_vp_info.js
├── migrate_fields.js
├── package.json
└── README.md
```

| ファイル | 内容 |
| --- | --- |
| `ddl/ddl.sql` | 参考DDL。画面上の情報から再構成したものであり、完全な原本ではありません。実行対象ではありません。 |
| `config/config.json` | 更新・調査対象のテーブル名、列名、値の変換対応表を定義します。 |
| `config/db.json` | PostgreSQLの接続先を定義します。 |
| `services/postgres_service.js` | DB接続、SQL実行、トランザクション、通常列の値の更新と件数集計、JSON列の取得・更新を扱います。 |
| `services/json_migration_service.js` | JSON/TEXT列の値の解析、変更判定、必要時の更新を扱います。 |
| `migrate_format.js` | `format`列の移行を行います。 |
| `migrate_authType.js` | `auth_type`列の移行を行います。 |
| `migrate_vc_info.js` | `vc_info`の取得・解析と将来の変換処理を扱います。 |
| `migrate_vp_info.js` | `vp_info`の取得・解析と将来の変換処理を扱います。 |
| `migrate_fields.js` | `credential_formats.fields`等の取得・解析と将来の変換処理を扱います。 |
| `package.json` | Node.jsの依存パッケージと実行スクリプトを定義します。 |

## 設定

### `config/db.json`

PostgreSQLの接続情報を指定します。

```json
{
  "host": "localhost",
  "port": 5432,
  "database": "",
  "user": "",
  "password": "",
  "ssl": false
}
```

必要に応じて `PGHOST`、`PGPORT`、`PGDATABASE`、`PGUSER`、`PGPASSWORD`、`DATABASE_URL` の環境変数でも接続先を指定できます。接続情報を記載したファイルは公開リポジトリに登録しないでください。

### `config/config.json` の共通項目

各処理の `tables` にテーブル名と列名を指定します。

```json
{
  "tables": [
    { "name": "add_cert", "column": "format" }
  ]
}
```

- `name`：対象テーブル名。実DBに存在する名前を指定します。
- `column`：対象列名。実DBに存在する名前を指定します。
- `tables`：複数の対象を定義できます。記載した順序で処理します。
- `values`：`format`、`authType`で使用する変換元と変換先の対応表です。既に新しい値になっているものを設定する必要はありません。

通常列の移行では、指定したテーブルまたは列が存在しない場合はエラーになります。JSON系の処理では対象列が存在しない場合は `SKIP` と表示します。

### `format`

`format.tables`に、形式を更新するテーブルと列を設定します。

```json
"format": {
  "tables": [
    { "name": "credential_formats", "column": "format" },
    { "name": "add_cert", "column": "format" },
    { "name": "org_add_cert", "column": "format" }
  ],
  "values": {
    "vc+sd-jwt": "dc+sd-jwt"
  }
}
```

- **変換元の値は大文字小文字を区別し、完全一致した場合のみ変換します。** `vc+sd-jwt`は`dc+sd-jwt`に変換しますが、`VC+SD-JWT`などは変換しません。
- `jwt_vc_json`、`dc+sd-jwt`など、変換表にない値はそのまま保持します。
- `null`、空文字、`all`（大文字小文字の違いを含む）は保持します。
- 本ツールは通常列の値のみを変更し、列のDEFAULT定義は変更しません。
- `credential_formats`は主キーに`format`を含むため、更新後に主キーが重複するとエラーになり、その実行のトランザクションはロールバックされます。

### `authType`

`authType.tables`に、認証方式を更新するテーブルと列を設定します。

```json
"authType": {
  "tables": [
    { "name": "credential_formats", "column": "auth_type" },
    { "name": "add_cert", "column": "auth_type" },
    { "name": "org_add_cert", "column": "auth_type" }
  ],
  "values": {
    "pre_authorized": "PRE_AUTHORIZED",
    "pre_authorize": "PRE_AUTHORIZED",
    "pwd": "AUTHORIZED"
  }
}
```

- **認証方式の変換のみ、大文字小文字を区別しません。** `pre_authorized`、`PRE_AUTHORIZED`、`Pre_Authorized`などは`PRE_AUTHORIZED`に統一します。
- `pre_authorize`の大文字小文字の違いも`PRE_AUTHORIZED`に変換します。
- `pwd`、`PWD`、`Pwd`などは`AUTHORIZED`に変換します。
- `authorized`、`AUTHORIZED`、`Authorized`など、新しい認証方式と同じ文字列で大文字小文字だけ異なる場合も`AUTHORIZED`に統一します。
- `null`、空文字、`all`（大文字小文字の違いを含む）は変更しません。
- 対応表にも変換先にも一致しない値は変更せず、集計の`other`に表示します。
- `PWD`から`AUTHORIZED`への変換は業務上の取り決めを確認したうえで実行してください。両者の認証方式がプロトコル上同一であることを意味しません。

### `vc_info`、`vp_info`、`fields`

JSON/TEXT列の調査・将来の移行対象は、それぞれの`tables`に設定します。変換ルールが未確定のため`values`は設定しません。

```json
"vc_info": {
  "tables": [
    { "name": "vc_wallets", "column": "vc_info" },
    { "name": "add_cert", "column": "vc_info" },
    { "name": "org_add_cert", "column": "vc_info" }
  ]
},
"vp_info": {
  "tables": [
    { "name": "presentation_request_url", "column": "vp_info" },
    { "name": "org_presentation_request_url", "column": "vp_info" }
  ]
},
"fields": {
  "tables": [
    { "name": "credential_formats", "column": "fields" }
  ]
}
```

処理の流れ：

1. `tables`に定義された列の値と行のPRIMARY KEYをDBから取得します。
2. 取得値をJSONとして解析します。`null`、空文字、JSONとして解析できない値は変換・更新の対象から除外します。
3. 各`migrate_*.js`が解析済みの値を受け取り、Debugログに表示します。
4. 各ファイルの`TODO`に、今後確定する仕様に応じた変換処理を追加します。
5. **変換前と変換後のJSON値が異なる場合のみ、`JSON.stringify`した値をDBにUPDATEします。同一の場合は更新しません。**

現在は各`TODO`が元の値をそのまま返却するため、`--apply`を指定しても更新件数は0件です。後日、変換処理を実装した場合は、差分のあるレコードだけ更新対象になります。

更新条件には実DBのPRIMARY KEYを使用します。複合PRIMARY KEYにも対応しています。更新対象テーブルにPRIMARY KEYがない場合はエラーになります。

**補足：** `vc_wallets.vc_info`は指定された構成に含めていますが、現在の参考DDLでは確認できません。実DBに列がない場合は`SKIP`します。JSON解析のDebugログには個人情報が含まれる可能性があるため、ログの管理に注意してください。

## 実行

最初にプロジェクトのディレクトリで依存パッケージをインストールします。

```bash
npm install
```

**内容確認（DRY RUN）**：`--apply`なし。変更後の結果を表示しますが、最後にROLLBACKするためDBには保存しません。

```bash
node migrate_format.js
node migrate_authType.js
node migrate_vc_info.js
node migrate_vp_info.js
node migrate_fields.js
```

**DB更新（APPLY）**：`--apply`あり。処理が正常終了した場合にCOMMITします。

```bash
node migrate_format.js --apply
node migrate_authType.js --apply
node migrate_vc_info.js --apply
node migrate_vp_info.js --apply
node migrate_fields.js --apply
```

`format`と`authType`は、各テーブルの変換前後の値・件数および更新後集計をコンソールに表示します。集計は`format`の場合`jwt_vc_json`、`dc+sd-jwt`、空、その他、`authType`の場合`PRE_AUTHORIZED`、`AUTHORIZED`、空、`all`、その他の区分で表示します。

DRY RUNでもトランザクション内でUPDATEを実行してからROLLBACKするため、実行中はDBロックが発生する場合があります。事前にDBバックアップを取得してください。各スクリプトは個別のトランザクションです。


{
  "format": {
    "tables": [
      { "name": "credential_formats", "column": "format" },
      { "name": "add_cert", "column": "format" },
      { "name": "org_add_cert", "column": "format" }
    ],
    "values": { "vc+sd-jwt": "dc+sd-jwt" }
  },
  "authType": {
    "tables": [
      { "name": "credential_formats", "column": "auth_type" },
      { "name": "add_cert", "column": "auth_type" },
      { "name": "org_add_cert", "column": "auth_type" }
    ],
    "values": {
      "pre_authorized": "PRE_AUTHORIZED",
      "pre_authorize": "PRE_AUTHORIZED",
      "pwd": "AUTHORIZED"
    }
  },
  "vc_info": {
    "tables": [
      { "name": "vc_wallets", "column": "vc_info" },
      { "name": "add_cert", "column": "vc_info" },
      { "name": "org_add_cert", "column": "vc_info" }
    ]
  },
  "vp_info": {
    "tables": [
      { "name": "presentation_request_url", "column": "vp_info" },
      { "name": "org_presentation_request_url", "column": "vp_info" }
    ]
  },
  "fields": {
    "tables": [
      { "name": "credential_formats", "column": "fields" }
    ]
  }
}

{
  "host": "localhost",
  "port": 5432,
  "database": "",
  "user": "",
  "password": "",
  "ssl": false
}


'use strict'

const config = require('../config/config.json')
const {
    connectPostgres,
    executeSql,
    getJsonRows,
    updateJsonRow,
    parseOptions
} = require('./postgres_service')

/** JSON/TEXTを解析する。解析できない値は更新対象外とする。 */
const parseJsonValue = (raw) => {
    if (raw === null || raw === undefined) return { state: 'null', value: null }
    if (raw === '') return { state: 'empty', value: '' }
    try {
        const result = typeof raw === 'string' ? JSON.parse(raw) : raw
        return { state: 'parsed', value: result }
    } catch (error) {
        return { state: 'invalid_json', value: raw }
    }
}

/** JSON/TEXTを検査し、変更があればDBを更新する。 */
const runJsonMigration = async (kind, transform, args = process.argv.slice(2)) => {
    console.debug('*** runJsonMigration start ***')

    let client
    let inTransaction = false
    try {
        const options = parseOptions(args)
        if (options.help) {
            console.log(`Usage: node migrate_${kind}.js [--dry-run] [--apply]`)
            return 0
        }
        const settings = config[kind]
        if (!settings || !Array.isArray(settings.tables)) {
            throw new Error(`Unknown migration config: ${kind}`)
        }

        client = await connectPostgres()
        await executeSql(client, 'BEGIN')
        inTransaction = true
        await executeSql(client, `SET LOCAL lock_timeout = '5s'`)
        await executeSql(client, `SET LOCAL statement_timeout = '60s'`)
        console.log(`MODE: ${options.apply ? 'APPLY' : 'DRY RUN (ROLLBACK)'}`)

        let total = 0
        for (const target of settings.tables) {
            const queried = await getJsonRows(client, target)
            if (queried.skipped) continue
            console.log(`TABLE ${target.name}.${target.column}: ${queried.rows.length} rows`)

            for (const row of queried.rows) {
                const identifier = Object.fromEntries(
                    queried.primaryKeys.map(key => [key, row[key]]))
                const raw = row[target.column]
                const parsed = parseJsonValue(raw)
                console.debug('primaryKey : ', identifier)
                console.debug('state : ', parsed.state)
                console.debug('value : ', parsed.value)

                if (parsed.state !== 'parsed') continue
                const modified = await transform(parsed.value, {
                    table: target.name,
                    column: target.column,
                    primaryKey: identifier
                })
                // 変更のない値は更新しない。TEXT/JSONBの型差は文字列化して比較する。
                if (JSON.stringify(modified) === JSON.stringify(parsed.value)) continue
                total += await updateJsonRow(
                    client, target, queried.primaryKeys, row, modified)
            }
        }
        if (options.apply) {
            await executeSql(client, 'COMMIT')
            inTransaction = false
            console.log(`COMMITTED: ${total} rows updated`)
        } else {
            await executeSql(client, 'ROLLBACK')
            inTransaction = false
            console.log(`DRY RUN: ${total} rows would be updated`)
        }
        console.debug('result : ', total)
        return total
    } catch (error) {
        if (client && inTransaction) {
            try {
                await client.query('ROLLBACK')
            } catch (rollbackError) {
                console.error('rollback error: ', rollbackError.message)
            }
        }
        console.error('error.message: ', error.message)
        console.error('error.stack: ', error.stack)
        throw error
    } finally {
        if (client) await client.end()
        console.debug('*** runJsonMigration end ***')
    }
}

module.exports = { parseJsonValue, runJsonMigration }


'use strict'

/**
 * PostgreSQL共通サービス
 * Migrationはconfigに定義した通常列のみを更新する。
 * JSON/TEXT列の検査は別ツールで読み取り専用で行う。
 */
const { Client } = require('pg')
const config = require('../config/config.json')
const dbConfig = require('../config/db.json')

const quoteIdent = (name) => {
    if (typeof name !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
        throw new Error(`Invalid SQL identifier: ${name}`)
    }
    return `"${name}"`
}

// NULL、空文字、allは変換対象外とする。
// formatは完全一致、authTypeは大文字小文字を区別せずに変換する。
const convertValue = (value, mapping, kind) => {
    if (typeof value !== 'string' || value.trim() === '' || value.toLowerCase() === 'all') {
        return value
    }

    if (kind === 'format') {
        return Object.prototype.hasOwnProperty.call(mapping, value)
            ? mapping[value]
            : value
    }

    if (kind === 'authType') {
        const normalized = value.toLowerCase()
        const match = Object.entries(mapping).find(
            ([oldValue]) => oldValue.toLowerCase() === normalized
        )
        if (match) return match[1]

        // 変換後の認証方式が小文字で保存されている場合も大文字に統一する。
        const target = Object.values(mapping).find(
            item => item.toLowerCase() === normalized
        )
        return target || value
    }

    throw new Error(`Unsupported migration kind: ${kind}`)
}

const parseOptions = (args = []) => {
    const options = { apply: false, help: false }
    for (const arg of args) {
        if (arg === '--apply') options.apply = true
        else if (arg === '--dry-run') options.apply = false
        else if (arg === '--help' || arg === '-h') options.help = true
        else throw new Error(`Unknown option: ${arg}`)
    }
    return options
}

/** PostgreSQLに接続する。 */
const connectPostgres = async () => {
    console.debug('*** connectPostgres start ***')
    try {
        const connection = process.env.DATABASE_URL
            ? { connectionString: process.env.DATABASE_URL }
            : {
                host: process.env.PGHOST || dbConfig.host,
                port: Number(process.env.PGPORT || dbConfig.port || 5432),
                database: process.env.PGDATABASE || dbConfig.database,
                user: process.env.PGUSER || dbConfig.user,
                password: process.env.PGPASSWORD || dbConfig.password,
                ssl: dbConfig.ssl
            }
        const client = new Client({ ...connection, application_name: 'cloud-wallet-migration' })
        await client.connect()
        console.debug('result : ', 'connected')
        return client
    } catch (error) {
        console.error('error.message: ', error.message)
        console.error('error.stack: ', error.stack)
        throw error
    } finally {
        console.debug('*** connectPostgres end ***')
    }
}

/** SQLを実行する。 */
const executeSql = async (client, sql, params = []) => {
    console.debug('*** executeSql start ***')
    try {
        const response = await client.query(sql, params)
        const result = response
        console.debug('result : ', { rowCount: result.rowCount })
        return result
    } catch (error) {
        console.error('error.message: ', error.message)
        console.error('error.stack: ', error.stack)
        throw error
    } finally {
        console.debug('*** executeSql end ***')
    }
}

/** 対象テーブルの列を確認する。 */
const checkColumns = async (client, table, columnNames) => {
    console.debug('*** checkColumns start ***')
    try {
        const response = await executeSql(client,
            `SELECT column_name FROM information_schema.columns
             WHERE table_schema = current_schema() AND table_name = $1`, [table])
        const found = new Set(response.rows.map(row => row.column_name))
        for (const column of columnNames) {
            if (!found.has(column)) throw new Error(`Missing table/column: ${table}.${column}`)
        }
        const result = true
        console.debug('result : ', result)
        return result
    } catch (error) {
        console.error('error.message: ', error.message)
        console.error('error.stack: ', error.stack)
        throw error
    } finally {
        console.debug('*** checkColumns end ***')
    }
}

/** 列の値ごとの件数を取得する。 */
const getValueCounts = async (client, table, column) => {
    console.debug('*** getValueCounts start ***')
    try {
        const t = quoteIdent(table)
        const c = quoteIdent(column)
        const response = await executeSql(client,
            `SELECT ${c} AS value, COUNT(*)::bigint::text AS count FROM ${t} GROUP BY ${c} ORDER BY ${c} NULLS FIRST`)
        const result = response.rows.map(row => ({ value: row.value, count: Number(row.count) }))
        console.debug('result : ', result)
        return result
    } catch (error) {
        console.error('error.message: ', error.message)
        console.error('error.stack: ', error.stack)
        throw error
    } finally {
        console.debug('*** getValueCounts end ***')
    }
}

/** 更新後の集計を表示する。 */
const printSummary = async (client, target, kind) => {
    console.debug('*** printSummary start ***')
    try {
        const rows = await getValueCounts(client, target.name, target.column)
        const summary = kind === 'format'
            ? { jwt_vc_json: 0, 'dc+sd-jwt': 0, empty: 0, other: 0 }
            : { PRE_AUTHORIZED: 0, AUTHORIZED: 0, empty: 0, all: 0, other: 0 }
        const otherValues = []
        for (const { value, count } of rows) {
            const key = value == null || value.trim() === '' ? 'empty' : value
            if (Object.prototype.hasOwnProperty.call(summary, key)) summary[key] += count
            else if (kind === 'authType' && key.toLowerCase() === 'all') summary.all += count
            else {
                summary.other += count
                otherValues.push({ value, count })
            }
        }
        console.log(`\nTABLE ${target.name} / ${target.column}`)
        for (const [key, count] of Object.entries(summary)) console.log(`  ${key}: ${count}`)
        for (const item of otherValues) console.log(`  OTHER ${JSON.stringify(item.value)}: ${item.count}`)
        console.debug('result : ', summary)
        return summary
    } catch (error) {
        console.error('error.message: ', error.message)
        console.error('error.stack: ', error.stack)
        throw error
    } finally {
        console.debug('*** printSummary end ***')
    }
}

/** 通常列の値を更新する。 */
const migrateColumn = async (client, target, values, kind) => {
    console.debug('*** migrateColumn start ***')
    try {
        const { name, column } = target
        if (!['format', 'auth_type'].includes(column)) throw new Error(`Unsupported column: ${column}`)
        await checkColumns(client, name, [column])
        const found = await getValueCounts(client, name, column)
        let result = 0
        for (const { value, count } of found) {
            const mapped = convertValue(value, values, kind)
            if (mapped === value) continue
            console.log(`${name}.${column}: ${JSON.stringify(value)} -> ${JSON.stringify(mapped)} (${count} rows)`)
            const response = await executeSql(client,
                `UPDATE ${quoteIdent(name)} SET ${quoteIdent(column)} = $1 WHERE ${quoteIdent(column)} = $2`,
                [mapped, value])
            result += response.rowCount
        }
        console.debug('result : ', result)
        return result
    } catch (error) {
        console.error('error.message: ', error.message)
        console.error('error.stack: ', error.stack)
        throw error
    } finally {
        console.debug('*** migrateColumn end ***')
    }
}

/** Migrationを実行する。デフォルトはROLLBACKする。 */
const runMigration = async (kind, args = process.argv.slice(2)) => {
    console.debug('*** runMigration start ***')
    let client
    let inTransaction = false
    try {
        const opts = parseOptions(args)
        if (opts.help) {
            console.log('Usage: node migrate_format.js|migrate_authType.js [--dry-run] [--apply]')
            return
        }
        const settings = config[kind]
        if (!settings) throw new Error(`Unknown migration: ${kind}`)
        client = await connectPostgres()
        await executeSql(client, 'BEGIN')
        inTransaction = true
        await executeSql(client, `SET LOCAL lock_timeout = '5s'`)
        await executeSql(client, `SET LOCAL statement_timeout = '60s'`)
        console.log(`MODE: ${opts.apply ? 'APPLY' : 'DRY RUN (ROLLBACK)'}`)
        let total = 0
        for (const target of settings.tables) {
            total += await migrateColumn(client, target, settings.values, kind)
            await printSummary(client, target, kind)
        }
        if (opts.apply) {
            await executeSql(client, 'COMMIT')
            inTransaction = false
            console.log(`COMMITTED: ${total} updated rows`)
        } else {
            await executeSql(client, 'ROLLBACK')
            inTransaction = false
            console.log(`DRY RUN: ${total} would-be updated rows; rolled back`)
        }
        const result = total
        console.debug('result : ', result)
        return result
    } catch (error) {
        if (client && inTransaction) {
            try { await client.query('ROLLBACK') } catch (rollbackError) {
                console.error('rollback error: ', rollbackError.message)
            }
        }
        console.error('error.message: ', error.message)
        console.error('error.stack: ', error.stack)
        throw error
    } finally {
        if (client) await client.end()
        console.debug('*** runMigration end ***')
    }
}

/** 対象テーブルの主キー列を取得する。 */
const getPrimaryKeys = async (client, table) => {
    console.debug('*** getPrimaryKeys start ***')

    try {
        const response = await executeSql(client, `
            SELECT a.attname AS column_name
            FROM pg_index i
            JOIN pg_class t ON t.oid = i.indrelid
            JOIN pg_namespace n ON n.oid = t.relnamespace
            JOIN unnest(i.indkey) WITH ORDINALITY AS k(attnum, position) ON TRUE
            JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
            WHERE n.nspname = current_schema()
              AND t.relname = $1
              AND i.indisprimary
            ORDER BY k.position
        `, [table])

        const result = response.rows.map(row => row.column_name)
        console.debug('result : ', result)
        return result
    } catch (error) {
        console.error('error.message: ', error.message)
        console.error('error.stack: ', error.stack)
        throw error
    } finally {
        console.debug('*** getPrimaryKeys end ***')
    }
}

/** JSON/TEXT列から行と主キーを取得する。DBの値は変更しない。 */
const getJsonRows = async (client, target) => {
    console.debug('*** getJsonRows start ***')

    try {
        const { name, column } = target
        const response = await executeSql(client, `
            SELECT column_name FROM information_schema.columns
            WHERE table_schema = current_schema() AND table_name = $1
        `, [name])
        const availableColumns = new Set(response.rows.map(row => row.column_name))

        if (!availableColumns.has(column)) {
            console.log(`SKIP ${name}.${column}: table or column does not exist`)
            return { target, primaryKeys: [], rows: [], skipped: true }
        }

        const primaryKeys = await getPrimaryKeys(client, name)
        if (!primaryKeys.length) {
            throw new Error(`Primary key is required for safe UPDATE: ${name}`)
        }
        const selected = [...new Set([...primaryKeys, column])].map(quoteIdent).join(', ')
        const orderBy = primaryKeys.map(quoteIdent).join(', ')
        const query = await executeSql(client,
            `SELECT ${selected} FROM ${quoteIdent(name)} ORDER BY ${orderBy}`)

        const result = { target, primaryKeys, rows: query.rows, skipped: false }
        console.debug('result : ', { table: name, column, count: result.rows.length, primaryKeys })
        return result
    } catch (error) {
        console.error('error.message: ', error.message)
        console.error('error.stack: ', error.stack)
        throw error
    } finally {
        console.debug('*** getJsonRows end ***')
    }
}

/** JSON/TEXT列の更新。主キーを条件にし、変更された値だけ更新する。 */
const updateJsonRow = async (client, target, primaryKeys, row, value) => {
    console.debug('*** updateJsonRow start ***')

    try {
        const conditions = primaryKeys.map((key, index) =>
            `${quoteIdent(key)} = $${index + 2}`).join(' AND ')
        const params = [JSON.stringify(value), ...primaryKeys.map(key => row[key])]
        const response = await executeSql(client,
            `UPDATE ${quoteIdent(target.name)} SET ${quoteIdent(target.column)} = $1 WHERE ${conditions}`,
            params)
        if (response.rowCount !== 1) {
            throw new Error(`Expected one row to update: ${target.name}, updated=${response.rowCount}`)
        }

        const result = response.rowCount
        console.debug('result : ', result)
        return result
    } catch (error) {
        console.error('error.message: ', error.message)
        console.error('error.stack: ', error.stack)
        throw error
    } finally {
        console.debug('*** updateJsonRow end ***')
    }
}

module.exports = {
    quoteIdent,
    convertValue,
    parseOptions,
    connectPostgres,
    executeSql,
    runMigration,
    getJsonRows,
    updateJsonRow
}

#!/usr/bin/env node
'use strict'
const { runMigration } = require('./services/postgres_service')
runMigration('authType').catch(error => { console.error('MIGRATION FAILED:', error.message); process.exitCode = 1 })

#!/usr/bin/env node
'use strict'

const { runJsonMigration } = require('./services/json_migration_service')

/** fieldsの変換処理。 */
const transform = async (value, context) => {
    console.debug('*** transform start ***')

    try {
        console.debug('target : ', context)
        console.debug('value : ', value)

        // TODO: fieldsの新仕様が確定したら、ここにJSONの変換処理を実装する。
        const result = value
        console.debug('result : ', result)
        return result
    } catch (error) {
        console.error('error.message: ', error.message)
        console.error('error.stack: ', error.stack)
        throw error
    } finally {
        console.debug('*** transform end ***')
    }
}

runJsonMigration('fields', transform).catch(error => {
    console.error('MIGRATION FAILED: ', error.message)
    process.exitCode = 1
})


#!/usr/bin/env node
'use strict'
const { runMigration } = require('./services/postgres_service')
runMigration('format').catch(error => { console.error('MIGRATION FAILED:', error.message); process.exitCode = 1 })

#!/usr/bin/env node
'use strict'

const { runJsonMigration } = require('./services/json_migration_service')

/** vc_infoの変換処理。 */
const transform = async (value, context) => {
    console.debug('*** transform start ***')

    try {
        console.debug('target : ', context)
        console.debug('value : ', value)

        // TODO: vc_infoの新仕様が確定したら、ここにJSONの変換処理を実装する。
        const result = value
        console.debug('result : ', result)
        return result
    } catch (error) {
        console.error('error.message: ', error.message)
        console.error('error.stack: ', error.stack)
        throw error
    } finally {
        console.debug('*** transform end ***')
    }
}

runJsonMigration('vc_info', transform).catch(error => {
    console.error('MIGRATION FAILED: ', error.message)
    process.exitCode = 1
})


#!/usr/bin/env node
'use strict'

const { runJsonMigration } = require('./services/json_migration_service')

/** vp_infoの変換処理。 */
const transform = async (value, context) => {
    console.debug('*** transform start ***')

    try {
        console.debug('target : ', context)
        console.debug('value : ', value)

        // TODO: vp_infoの新仕様が確定したら、ここにJSONの変換処理を実装する。
        const result = value
        console.debug('result : ', result)
        return result
    } catch (error) {
        console.error('error.message: ', error.message)
        console.error('error.stack: ', error.stack)
        throw error
    } finally {
        console.debug('*** transform end ***')
    }
}

runJsonMigration('vp_info', transform).catch(error => {
    console.error('MIGRATION FAILED: ', error.message)
    process.exitCode = 1
})





{
  "name": "cloud-wallet-migration",
  "version": "1.0.0",
  "private": true,
  "description": "PostgreSQL migration tools for Cloud Wallet",
  "engines": {
    "node": ">=18"
  },
  "scripts": {
    "migrate:format": "node migrate_format.js",
    "migrate:auth": "node migrate_authType.js",
    "migrate:vc-info": "node migrate_vc_info.js",
    "migrate:vp-info": "node migrate_vp_info.js",
    "migrate:fields": "node migrate_fields.js"
  },
  "dependencies": {
    "pg": "^8.13.0"
  }
}




