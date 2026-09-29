## テスト手順

### 1. Server 起動

```bash
npm install
npm start
```

### 2. Awards の vct と integrity を取得

```bash
curl http://localhost:3200/vct/awards/info
```

### 3. 取得した値を SD-JWT VC の payload に設定

```json
{
  "vct": "http://localhost:3200/vct/awards",
  "vct#integrity": "sha256-xxxxxxxx"
}
```

### 4. Verifier API 2 の policy に `vct-integrity` を指定して検証

Presentation Request 作成時に、`vct-integrity` policy を指定して動作確認します。

例：

```json
{
  "policies": {
    "vc_policies": [
      "vct-integrity"
    ]
  }
}
```
