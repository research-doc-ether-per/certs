## 2. 確認結果

表彰 JWT / 資格 JWT / 表彰 SD-JWT の提示結果

```json
{}
```

基本4情報の提示結果

```json
{}
```

検証結果は、`credential-status` 以外すべて `true` となることを確認した。

### 2.1 `credential-status` について

`credential-status` は以下の理由により `false` となる。

1. `vc-registry-api` の VC データ取得 API を修正していないため。
2. v0.15.1 と v1.0.0 で使用している環境が異なり、`vc-registry-api` の DB データを移行していないため。
