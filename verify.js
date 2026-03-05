mdoc（MDoc）の構造
MDoc
 ├─ docType
 ├─ issuerSigned
 │   ├─ namespaces
 │   └─ issuerAuth
 └─ deviceSigned
     ├─ namespaces
     └─ deviceAuth
 - deviceSigned
   - Issuer から発行される credential には通常 `issuerSigned` のみが含まれ、  `deviceSigned` は Holder による credential 提示時に生成される。
