## Keycloak 19.0.3：ユーザーのカスタム属性を ID Token に追加する方法

以下では、`company_name`（会社名）を例として、Keycloak 19.0.3 でユーザーにカスタム属性を追加し、その属性を ID Token に反映する手順を説明します。

### 1. ユーザーにカスタム属性を追加する

Keycloak Admin Console で以下の順に進みます。

```text
Users
→ 対象ユーザーを選択
→ Attributes
```

以下の属性を追加します。

```text
Key: company_name
Value: 株式会社ABC
```

追加後、保存します。

---

### 2. 対象 Client の Dedicated Client Scope を開く

以下の順に進みます。

```text
Clients
→ 対象 Client を選択
→ Client scopes
→ Dedicated scope
```

例：

```text
Clients
→ waltid_issuer-api
→ Client scopes
→ waltid_issuer-api-dedicated
```

Dedicated scope を開いた後、以下を選択します。

```text
Mappers
```

---

### 3. Mapper を新規作成する

`Mappers` 画面で以下をクリックします。

```text
Configure a new mapper
```

次に、Mapper Type として以下を選択します。

```text
User Attribute
```

---

### 4. User Attribute Mapper を設定する

以下のように設定します。

```text
Name:
company_name

User Attribute:
company_name

Token Claim Name:
company_name

Claim JSON Type:
String

Add to ID token:
ON

Add to access token:
必要に応じて設定

Add to userinfo:
必要に応じて設定

Multivalued:
OFF
```

設定完了後、保存します。

---
