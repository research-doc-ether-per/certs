# Swagger(OpenAPI) 自動生成ツール

- 各 API の OpenAPI（Swagger）定義ファイルを 自動生成・更新 するためのツールです

## ディレクトリ構成

```
tools/swagger/
├─ config/
│  └─ *-api.json          # Swagger 生成用設定ファイル
├─ input/
│  └─ *-apis.csv          # API 設計CSV
├─ output/
│  └─ *-api/
│     ├─ openapi_auto.yaml     # 自動生成された OpenAPI
│     ├─ api_design.json       # CSV から生成された中間JSON
│     └─ openapi_updated.yaml  # 設計反映後の OpenAPI
└─ scripts/
   ├─ gen-openapi-auto.js
   ├─ design-csv-to-json.js
   ├─ patch-openapi-from-design.js
   └─ build-openapi.js
```

## 使用方法

### Step 1. OpenAPI を自動生成（API 実装ベース）

```bash
node scripts/gen-openapi-auto.js
```

- 生成されるファイル：`output/*-api/openapi_auto.yaml`

### Step 2. API 設計 CSV を JSON に変換

- API 設計書（CSV）を Swagger 更新用の JSON に変換します

```bash
node scripts/design-csv-to-json.js
```

- 生成されるファイル：`output/*-api/api_design.json`

### Step 3. 設計内容を OpenAPI に反映

- Step1 で生成した OpenAPI に、CSV 設計（description / requestBody / responseBody）を反映します

```bash
node scripts/patch-openapi-from-design.js
```

- 生成されるファイル：`output/*-api/openapi_updated.yaml`

### Step 4. 一括実行（任意）

- すべての処理をまとめて実行する場合：

```bash
node scripts/build-openapi.js
```
