基本4情報以外の検証結果では、`credential-status` が以下の理由により `false` となる。

1. `vc-registry-api` の VC データ取得 API を修正していないため。
2. v0.15.1 と v1.0.0 で使用している環境が異なり、`vc-registry-api` の DB データを移行していないため。
