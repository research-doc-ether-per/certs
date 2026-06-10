Issuer から発行されている Credential Offer の一覧を取得する。

---

追加可能証明書一覧

Issuer が発行した Credential Offer の一覧が指定される。

一覧は作成日時の降順でソートされる。
対象の Credential Offer が存在しない場合、空配列が指定される。

---

追加可能証明書ID

Issuer が発行した Credential Offer の URL に対して内部で割り当てられた ID が指定される。

---

証明書カテゴリ

Issuer が発行した Credential Offer の URL のカテゴリが指定される。

例：
・Career：職歴
・Awards：表彰
・Qualifications：資格

---

証明書情報

Issuer が発行した Credential Offer の詳細情報が JSON 文字列として指定される。

---

Credential Offer URL

Issuer が発行した Credential Offer の URL が指定される。

---

発行者DID

Credential Offer を発行した Issuer の DID が指定される。

---

証明書種別

Credential Offer の URL の種別が指定される。

例：
・Career：職歴
・Awards：表彰
・Qualifications：資格

---

証明書フォーマット種別

証明書のフォーマット種別が指定される。

例：
・jwt_vc_json
・vc+sd-jwt

---

認証方式

Credential Offer の認証方式が指定される。

例：
・pwd：認可コードフロー
・pre_authorized：事前認可コードフロー

---

証明書の表示名称

証明書の表示名称が指定される。

---

証明書画像URL

証明書画像の URL が指定される。
証明書画像が設定されていない場合、`null` が指定される。

---

発行者名

証明書を発行した Issuer の表示名が指定される。

Cloud Wallet に対象 Issuer の名前が設定されていない場合、`null` が指定される。

---

証明書を取得可能なユーザID

Credential Offer の取得対象となるユーザIDが指定される。

---

更新日時（unixエポック秒）

対象データの最終更新日時が指定される。

---

作成日時（unixエポック秒）

対象データの作成日時が指定される。
