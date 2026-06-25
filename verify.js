1. 前提条件通りに実施したこと

2. 処理の流れ（TODO:）

   1. Issuer情報取得：発行元（Issuer）のDIDやエンドポイント情報を取得する

   2. Holder情報取得：証明書を受け取る側（Holder）のDIDおよび鍵情報を取得する

   3. 検証対象取得：発行対象ファイルから、提示する証明書の種類やフォーマット情報を読み込む

      1. 検証対象リストをループし、各証明書を1件ずつ検証する

      2. 異なる format かつ異なる種類の証明書を組み合わせて検証する

   4. Verifier2検証実行：Verifier2を使用して検証を行う

      1. Verifier2で Verification Session を作成し、Presentation Request URL を取得する

      2. Holder が Wallet にログインする

      3. Wallet が Presentation Request URL から Presentation Request 情報を取得する

      4. Wallet 内の VC から、提示条件に一致する証明書を抽出する

      5. 抽出した VC を Verifier2 に提示する

      6. Verifier2 の Verification Session 情報取得 API から検証結果を取得する

      7. 検証結果をファイルに出力する
