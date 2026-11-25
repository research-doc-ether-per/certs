# Cloud Wallet DB 初期データ生成ツール

設定ファイル（JSON）からCloud Wallet DBの初期データ登録用SQLを生成する。

※データベースへの接続およびSQLの実行は行わない。

## ディレクトリ構成

```text
cloud-wallet-db-generate-initial-data/
├── config/
│   ├── fields.json
│   └── vp_definitions.json
├── output/
├── init-credential_formats.js
├── init-vp_definitions.js
└── README.md
```

## 1. 証明書フォーマット定義初期データ生成

`config/fields.json` を読み込み、証明書フォーマット定義管理テーブル（`credential_formats`）への初期データ登録用SQLを生成する。

### 実行方法

```bash
node init-credential_formats.js
```

### 出力ファイル

```text
output/credential_formats_init.sql
```

## 2. VP定義初期データ生成

`config/vp_definitions.json` を読み込み、VP定義管理テーブル（`vp_definitions`）への初期データ登録用SQLを生成する。

### 実行方法

```bash
node init-vp_definitions.js
```

### 出力ファイル

```text
output/vp_definitions_init.sql
```

## 注意事項

- 設定内容を変更する場合は、対象のJSONファイルを修正する。
- 生成されたSQLの内容を確認してから、対象のデータベースで実行する。
- 既存データを変更する場合は、別途UPDATE SQLを実行する。
