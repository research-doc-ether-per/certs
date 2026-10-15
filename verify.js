# custom-issuer-data-function-webhook-server

walt.id Issuer API2 の Data Functions で使用する Webhook の動作確認用サンプルサーバです。

`<webhook:...>` および `<webhook-json:...>` から呼び出される API を提供し、Credential Type に応じて固定値を返します。

## Data Functions

### webhook

```text
<webhook:URL>
```

Webhook の Response を String として Credential に設定します。

### webhook-json

```text
<webhook-json:URL>
```

Webhook の Response を JSON として解析し、Credential に設定します。



## Issuer API2 での使用例

### Awards

```json
{
  "additionalInfo": "<webhook:http://10.0.2.15:5105/webhook/Awards/string>",
  "awardDetails": "<webhook-json:http://10.0.2.15:5105/webhook/Awards/json>"
}
```

### Career

```json
{
  "departmentName": "<webhook:http://10.0.2.15:5105/webhook/Career/string>",
  "employmentDetails": "<webhook-json:http://10.0.2.15:5105/webhook/Career/json>"
}
```

### Qualifications

```json
{
  "qualificationLevel": "<webhook:http://10.0.2.15:5105/webhook/Qualifications/string>",
  "qualificationDetails": "<webhook-json:http://10.0.2.15:5105/webhook/Qualifications/json>"
}
```

## runtimeOverrides での使用例

Offer 発行時に `runtimeOverrides.mapping` から指定できます。

例：

```json
{
  "runtimeOverrides": {
    "mapping": {
      "id": "<uuid>",
      "issuer": {
        "id": "<issuerDid>"
      },
      "credentialSubject": {
        "id": "<subjectDid>",
        "additionalInfo": "<webhook:http://10.0.2.15:5105/webhook/Awards/string>",
        "awardDetails": "<webhook-json:http://10.0.2.15:5105/webhook/Awards/json>"
      },
      "issuanceDate": "<timestamp>",
      "expirationDate": "<timestamp-in:365d>"
    }
  }
}
```



## Health Check

```http
GET /health
```

Response：

```json
{
  "status": "ok",
  "service": "custom-issuer-data-function-webhook-server"
}
```

## Endpoint 一覧

| Method | Endpoint | Data Function | Credential Type | Response |
|---|---|---|---|---|
| GET | `/webhook/Awards/string` | `webhook` | Awards | `Excellent Performance` |
| GET | `/webhook/Awards/json` | `webhook-json` | Awards | JSON |
| GET | `/webhook/Career/string` | `webhook` | Career | `Engineering` |
| GET | `/webhook/Career/json` | `webhook-json` | Career | JSON |
| GET | `/webhook/Qualifications/string` | `webhook` | Qualifications | `Advanced` |
| GET | `/webhook/Qualifications/json` | `webhook-json` | Qualifications | JSON |

### Response 例

#### Awards

`GET /webhook/Awards/json`

```json
{
  "category": "Performance",
  "year": 2026,
  "rank": "Gold"
}
```

#### Career

`GET /webhook/Career/json`

```json
{
  "employmentType": "Full-time",
  "yearsOfExperience": 7
}
```

#### Qualifications

`GET /webhook/Qualifications/json`

```json
{
  "issuerName": "Example Certification Authority",
  "issuedYear": 2024,
  "valid": true
}
```


## 構成

```text
custom-issuer-data-function-webhook-server/
├─ src/
│  ├─ app.js
│  └─ credentialService.js
├─ package.json
└─ README.md
```
