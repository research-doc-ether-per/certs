
# VC Status API デモ（ファイル保存・認証なし・自動ローテ対応可）

- 発行側は **状態リスト（StatusList）** を作成し、各 VC に **statusListIndex** を割り当てて `credentialStatus` を埋め込みます。
- 検証側は公開 JSON（StatusListCredential）から `encodedList` を取得・展開し、該当ビットを参照して有効/無効を判定します。
- 本デモの状態管理は **ファイル保存方式** です。**実運用では DB 管理を推奨** します。

## エンドポイント一覧

### 公開（だれでも参照可）

- `GET /status/:id.json`  
  指定 ID の **StatusListCredential（JSON）** を返します（検証者が参照）。

### 管理（発行側が利用）

- `POST /lists`  
  **状態リストを新規作成**（初期は全ビット 0）し、公開 JSON を生成します。
- `POST /lists/:id/index`  
  **VC 署名前**に、指定リストから **空き index（statusListIndex）** を 1 つ払い出し、VC にそのまま貼れる `credentialStatus` 片を返します。
  - 自動ローテーション版コントローラでは、**使用率しきい値（例：80%）以上**で**新リストを自動作成して切替**します。
- `POST /lists/:id/revoke`  
  指定 VC を **無効化**（ビット = 1）し、公開 JSON を再生成・上書きします。
- `POST /lists/:id/restore`  
  指定 VC を **再有効化**（ビット = 0）し、公開 JSON を再生成・上書きします。

---

## 使い方

### 1. 状態リストを作成（初回／用途ごとに 1 回）

```bash
curl -s -X POST http://localhost:10010/lists \
  -H "Content-Type: application/json" \
  -d '{"purpose":"revocation","size":65536}'
```

- **purpose**（string）  
  リストの用途。例：`"revocation"`（撤回・失効）、`"suspension"`（一時停止）。用途を分けたい場合は**用途ごとに別リスト**を作成します。
- **size**（number）  
  **このリストが同時に管理できる VC の最大数**（＝ビット列のビット数。**1 VC = 1 ビット**）。  
  例：`65536` → 最大 65,536 枚を 1 ファイルで管理。

**レスポンス例**

```json
{
  "ok": true,
  "publicUrl": "http://localhost:10010/status/1.json",
  "list": {
    "id": 1,
    "purpose": "revocation",
    "size": 65536,
    "url": "http://localhost:10010/status/1.json",
    "object_key": "status/1.json",
    "version": 1,
    "created_at": "2025-10-09T03:21:00.000Z"
  }
}
```

---

### 2. VC 発行前：index を割り当てて `credentialStatus` を取得（VC へ埋め込み）

- **必ず署名前に実行**し、返ってきた `credentialStatus` を **VC 本体に挿入してから署名**します。
- `vcId` は状態管理側の **一意キー**。VC の `id`（JSON-LD）や JWT の `jti` と合わせた **UUID** を**事前生成**して使うのが一般的です。

```bash
VCID=$(uuidgen)  # 例：b1c1b0b4-...（VC の id/jti にも同じ値を採用）

curl -s -X POST http://localhost:10010/lists/1/index \
  -H "Content-Type: application/json" \
  -d "{\"vcId\":\"$VCID\"}"
```

**レスポンス例（このまま VC の `credentialStatus` に貼り付け）**

```json
{
  "credentialStatus": {
    "id": "http://localhost:10010/status/1.json#123",
    "type": "BitstringStatusListEntry",
    "statusPurpose": "revocation",
    "statusListIndex": "123",
    "statusListCredential": "http://localhost:10010/status/1.json"
  }
}
```

**VC への埋め込み例（JSON-LD 風）**

```json
{
  "@context": ["https://www.w3.org/ns/credentials/v2"],
  "type": ["VerifiableCredential"],
  "id": "urn:uuid:b1c1b0b4-...",
  "issuer": "did:example:issuer",
  "credentialSubject": {
    /* ... */
  },
  "credentialStatus": [
    {
      "id": "http://localhost:10010/status/1.json#123",
      "type": "BitstringStatusListEntry",
      "statusPurpose": "revocation",
      "statusListIndex": "123",
      "statusListCredential": "http://localhost:10010/status/1.json"
    }
  ]
  /* ← この状態で署名 */
}
```

---

### 3. VC を無効化（撤回・失効・一時停止）

- 該当 VC のビットを **1（無効）** にし、`encodedList` を再生成して `status/:id.json` を原子的に更新します。

```bash
curl -s -X POST http://localhost:10010/lists/1/revoke \
  -H "Content-Type: application/json" \
  -d "{\"vcId\":\"$VCID\"}"
```

**レスポンス例**

```json
{ "ok": true }
```

---

### 4. VC を再有効化（無効解除）

- 該当 VC のビットを **0（有効）** に戻し、`encodedList` を再生成して `status/:id.json` を原子的に更新します。

```bash
curl -s -X POST http://localhost:10010/lists/1/restore \
  -H "Content-Type: application/json" \
  -d "{\"vcId\":\"$VCID\"}"
```

**レスポンス例**

```json
{ "ok": true }
```

---

## 公開エンドポイント（検証側）

**取得（curl）**

```bash
curl -s http://localhost:10010/status/1.json | jq .
```

**レスポンス例（抜粋）**

```json
{
  "@context": ["https://www.w3.org/ns/credentials/v2"],
  "id": "http://localhost:10010/status/1.json",
  "type": ["VerifiableCredential", "BitstringStatusListCredential"],
  "issuer": "did:example:issuer",
  "validFrom": "2025-10-09T03:21:00.000Z",
  "credentialSubject": {
    "id": "http://localhost:10010/status/1.json#list",
    "type": "BitstringStatusList",
    "statusPurpose": "revocation",
    "encodedList": "<GZIP+Base64>"
  }
}
```

---

## まとめ：エンドツーエンドの curl デモ

```bash
# 0) 下準備：BASE_PUBLIC_URL 等を .env に設定し、サーバを起動しておく

# 1) 状態リストを作成（用途：revocation、容量：65536 ビット）
curl -s -X POST http://localhost:10010/lists \
  -H "Content-Type: application/json" \
  -d '{"purpose":"revocation","size":65536}' | jq .

# 2) VC 用の一意キー（vcId）を作る（例：UUID）
VCID=$(uuidgen); echo "vcId=$VCID"

# 3) 発行前に index を割り当て、credentialStatus 片を取得
curl -s -X POST http://localhost:10010/lists/1/index \
  -H "Content-Type: application/json" \
  -d "{\"vcId\":\"$VCID\"}" | jq .

# 4) 取得した credentialStatus を VC 本体に埋め込んで署名（署名手順は発行実装に依存）

# 5) 撤回する場合（ビット=1）
curl -s -X POST http://localhost:10010/lists/1/revoke \
  -H "Content-Type: application/json" \
  -d "{\"vcId\":\"$VCID\"}" | jq .

# 6) 公開 JSON（StatusListCredential）を確認
curl -s http://localhost:10010/status/1.json | jq .

# 7) 再有効化する場合（ビット=0）
curl -s -X POST http://localhost:10010/lists/1/restore \
  -H "Content-Type: application/json" \
  -d "{\"vcId\":\"$VCID\"}" | jq .
```

---

**© VC Status API Demo**
