# Cloud Wallet Migration Tool

Cloud Wallet の PostgreSQL に保存されているデータを、walt.id v1.0.0 に対応した形式へ移行するためのツールです。

## 構成

```text
cloud-wallet-migration/
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
|---|---|
| `config/config.json` | 移行対象のテーブル名、列名、および値の変換ルールを定義します。 |
| `config/db.json` | PostgreSQL の接続情報を定義します。 |
| `services/postgres_service.js` | DB 接続、SQL 実行、トランザクション管理、通常列の値の更新・件数集計、JSON/TEXT 列の取得・更新を行います。 |
| `services/json_migration_service.js` | JSON/TEXT 列の値の解析、変換前後の比較、および変更がある場合の更新処理を行います。 |
| `migrate_format.js` | `format` 列の値を移行します。 |
| `migrate_authType.js` | `auth_type` 列の値を移行します。 |
| `migrate_vc_info.js` | `vc_info` 列の値を取得・解析し、必要に応じて移行します。 |
| `migrate_vp_info.js` | `vp_info` 列の値を取得・解析し、必要に応じて移行します。 |
| `migrate_fields.js` | `credential_formats.fields` などの値を取得・解析し、必要に応じて移行します。 |
| `package.json` | プロジェクト情報と必要な依存パッケージを定義します。 |

## 設定

### `config/db.json`

PostgreSQL の接続情報を設定します。

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

### `config/config.json` の共通設定

各移行処理の `tables` に、対象のテーブル名と列名を指定します。

```json
{
    "tables": [
        {
            "name": "add_cert",
            "column": "format"
        }
    ]
}
```

| 項目 | 説明 |
|---|---|
| `tables` | 移行対象のテーブルと列を定義します。複数指定した場合は、定義順に処理します。 |
| `name` | 対象テーブル名を指定します。 |
| `column` | 対象列名を指定します。 |
| `values` | `format` および `authType` の変換前・変換後の値を定義します。 |

`values` には変換が必要な値のみを定義します。すでに移行後の形式になっている値を定義する必要はありません。

通常列の移行処理では、指定したテーブルまたは列が存在しない場合、エラーとします。

JSON/TEXT 列の移行処理では、対象テーブルまたは列が存在しない場合、`SKIP` を表示して処理を継続します。

### `format`

`format.tables` に、Format の移行対象となるテーブルと列を指定します。

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

**変換ルール**

- `vc+sd-jwt` を `dc+sd-jwt` に変換します。
- `format` の変換では大文字・小文字を区別し、`values` に定義された値と完全一致する場合のみ変換します。
- `jwt_vc_json`、`dc+sd-jwt` など、変換対象に該当しない値は変更しません。
- `null`、空文字、`all`（大文字・小文字の違いを含む）は変更しません。
- 本処理では列に保存されているデータのみを更新し、DB の `DEFAULT` 定義は変更しません。

**注意事項**

`credential_formats` テーブルでは、PRIMARY KEY に `format` が含まれています。

変換後の値が既存レコードの PRIMARY KEY と重複する場合、PostgreSQL でエラーが発生し、実行中のトランザクションを ROLLBACK します。

### `authType`

`authType.tables` に、認証方式の移行対象となるテーブルと列を指定します。

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

**変換ルール**

`authType` の変換では大文字・小文字を区別せず、対象の値を指定された形式に統一します。

| 変換前の値 | 変換後の値 |
|---|---|
| `pre_authorized` / `PRE_AUTHORIZED` / `Pre_Authorized` | `PRE_AUTHORIZED` |
| `pre_authorize` / `PRE_AUTHORIZE` / `Pre_Authorize` | `PRE_AUTHORIZED` |
| `pwd` / `PWD` / `Pwd` | `AUTHORIZED` |
| `authorized` / `AUTHORIZED` / `Authorized` | `AUTHORIZED` |

- `null`、空文字、`all`（大文字・小文字の違いを含む）は変更しません。
- 変換ルールおよび変換後の認証方式のいずれにも一致しない値は変更しません。
- 変換対象外の値は、実行結果の `other` に集計します。
- DB の `DEFAULT` 定義は変更しません。

**注意事項**

旧バージョンの `PWD` と、walt.id v1.0.0 の `AUTHORIZED` は認証方式として必ずしも同義ではありません。実行前に、対象となる発行フローが新しい認証方式に対応していることを確認してください。

### `vc_info`、`vp_info`、`fields`

JSON/TEXT 列の移行対象を、それぞれの `tables` に指定します。

変換仕様が未確定のため、現時点では `values` を定義しません。

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

**処理内容**

1. `tables` に定義されたテーブルから、対象列の値とレコードの PRIMARY KEY を取得します。
2. 取得した値を JSON として解析します。`null`、空文字、JSON として解析できない値は変換・更新の対象外とします。
3. 各 `migrate_*.js` で解析後の値を取得し、Debug ログに出力します。
4. 各スクリプトの `TODO` 部分で、移行仕様に応じた JSON の変換処理を行います。
5. 変換前後の JSON データを比較し、内容に変更がある場合のみ `JSON.stringify` で文字列に変換して DB を更新します。
6. 変換前後の内容が同一の場合は、UPDATE を実行しません。

**現在の実装状況**

JSON の変換処理は未実装です。

各スクリプトの `TODO` 部分では、取得した値をそのまま返却します。

そのため、現時点では `--apply` を指定しても JSON/TEXT 列の更新件数は 0 件となります。

今後、移行仕様に応じて `TODO` 部分に変換処理を実装した場合は、変換前後の内容に差分があるレコードのみ更新します。

**注意事項**

- UPDATE 対象レコードの特定には、DB の PRIMARY KEY を使用します。
- 複合 PRIMARY KEY にも対応します。
- PRIMARY KEY が定義されていないテーブルでは、安全性を確保するため更新処理をエラーとします。
- `vc_wallets.vc_info` は現在の参考 DDL では確認できないため、実DBの列構成を確認してください。対象列が存在しない場合は `SKIP` と表示します。

## 実行

### インストール

必要なパッケージをインストールします。

```bash
npm install
```

### 内容確認（DRY RUN）

`--apply` を指定しない場合は DRY RUN として実行します。変更後の結果を確認できますが、処理終了時に ROLLBACK するため、DB への変更は保存されません。

```bash
node migrate_format.js
node migrate_authType.js
node migrate_vc_info.js
node migrate_vp_info.js
node migrate_fields.js
```

### 更新（APPLY）

`--apply` を指定すると、データの更新を実行し、正常終了時に COMMIT します。

```bash
node migrate_format.js --apply
node migrate_authType.js --apply
node migrate_vc_info.js --apply
node migrate_vp_info.js --apply
node migrate_fields.js --apply
```

各スクリプトは個別に実行できます。

エラーが発生した場合は、該当スクリプトのトランザクションを ROLLBACK します。ただし、別のスクリプトですでに COMMIT された更新は取り消されません。

**実行結果**

`format` および `authType` の移行では、対象テーブルごとに変換結果と値の件数を表示します。

- `format`：JWT、SD-JWT、空値、その他
- `authType`：`PRE_AUTHORIZED`、`AUTHORIZED`、空値、`all`、その他

JSON/TEXT 列の移行では、取得・解析した値を Debug ログに出力し、変換処理実装後は変更があったレコードの更新件数も確認できます。
