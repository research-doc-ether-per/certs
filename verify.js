
1. credential の生成方法
- IssuerSigned オブジェクトを CBOR 形式にシリアライズし、その結果を Base64URL 形式にエンコードして credential として返却する。

IssuerSigned は mdoc credential の主要な構造であり、以下の要素で構成される。
    - namespaces: credential の実データ（証明書の内容）が格納される。
        - 役割: credential の 証明データ本体、Verifier が参照する属性データ
        ```json
        // 例
        {
  "org.iso.18013.5.1": {
    "given_name": "Taro",
    "family_name": "Yamada",
    "birth_date": "1990-01-01"
  }
}
        ```
    
    - issuerAuth: Issuer が IssuerSigned 全体に対して行ったデジタル署名。
        - 役割: credential が Issuer によって発行されたことを証明、credential データの 改ざん検出、Verifier は issuerAuth を検証して credential の正当性を確認する
        ```txt
        // 例
        issuerAuth
         └─ COSE_Sign1
              ├─ protected header
              ├─ payload
              └─ signature
        ```
- mdocの構造は以下となります
    ```txt
    MDoc
     ├─ docType
     ├─ issuerSigned
     │   ├─ namespaces
     │   └─ issuerAuth
     └─ deviceSigned
    ```
