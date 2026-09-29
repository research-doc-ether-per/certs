# Custom Verification Webhook Server

VC のカスタム検証を行うための、Node.js / Express ベースの簡易 webhook server です。

Verifier API 2 の webhook policy から呼び出されることを想定しています。
通常の VC 検証ではなく、プロジェクト固有の業務条件を検証するために使用します。

## フォルダ構成

```text
custom-verification-webhook-server/
├── app.js
├── package.json
├── README.md
└── src/
    ├── services/
    │   ├── AwardsService.js  # Awards VC の検証処理
    │   └── CareerService.js  # Career VC の検証処理
    └── utils/
        ├── dateUtils.js
        ├── paramUtils.js
        └── vcUtils.js
```


## Endpoint 一覧


### Awards VC の表彰日が指定年数以内であることを検証する

Awards VC の `issuedAt` が、現在日から指定年数以内であるかを検証します。
```text
POST /webhook/awards/issued-at/within-:years-years
```


```text
例：
POST /webhook/awards/issued-at/within-3-years
POST /webhook/awards/issued-at/within-5-years
```

```bash
# 確認用 curl：
curl -X POST http://localhost:3000/webhook/awards/issued-at/within-5-years \
  -H "Content-Type: application/json" \
  -d '{
    "vc": {
      "credentialSubject": {
        "issuedAt": "2022-09-01"
      }
    }
  }'
```


### Career VC の在職期間が指定年数以上であることを検証する

Career VC の `from` と `to` をもとに、在職期間が指定年数以上であるかを検証します。
```text
POST /webhook/career/employment-period/at-least-:years-years
```


```text
例：
POST /webhook/career/employment-period/at-least-3-years
POST /webhook/career/employment-period/at-least-5-years
```

```bash
# 確認用 curl：
curl -X POST http://localhost:3000/webhook/career/employment-period/at-least-3-years \
  -H "Content-Type: application/json" \
  -d '{
    "vc": {
      "credentialSubject": {
        "from": "2020-04-01",
        "to": "2024-03-31"
      }
    }
  }'
```



## Verifier API 2 の policy 指定例

Presentation Request / Verification Session を作成する際に、webhook policy の URL として対象の endpoint を指定します。


Awards VC の表彰日が5年以内であることを検証する場合：

```json
{
  "policy": "webhook",
  "url": "http://localhost:3000/webhook/awards/issued-at/within-5-years"
}
```

Career VC の在職期間が3年以上であることを検証する場合：

```json
{
  "policy": "webhook",
  "url": "http://localhost:3000/webhook/career/employment-period/at-least-3-years"
}
```

## 注意事項

- webhook policy からの呼び出しは POST を想定しています。
- Verifier 側は HTTP status code により検証結果を判定する想定のため、成功時は `200`、失敗時は `400` を返却します。
