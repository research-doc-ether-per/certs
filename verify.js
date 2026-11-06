

const fields = value.fields || []
const subjectConfig = config.fields.values.credentialSubject || {}

// 既に変換済みの場合は処理しない
if (!Array.isArray(fields)) {
    return value
}

// credentialSubjectの子項目を取得する
const childKey = Object.keys(subjectConfig).find(key =>
    subjectConfig[key] !== null &&
    typeof subjectConfig[key] === 'object' &&
    !Array.isArray(subjectConfig[key])
)

// 各フィールドに表示設定を追加する
const credentialFields = {}

for (const item of fields) {
    logger.debug('item : ', item)

    const { key, ...fieldInfo } = item

    if (!key) {
        throw new Error('fields item key is missing')
    }

    const displayConfig = childKey
        ? subjectConfig[childKey]
        : subjectConfig

    credentialFields[key] = {
        ...fieldInfo,
        ...displayConfig
    }
}

// credentialSubjectを生成する
const credentialSubject = childKey
    ? { [childKey]: credentialFields }
    : credentialFields

// 変換後のfieldsを生成する
const tempFields = {
    credentialSubject,
    issuanceDate: config.fields.values.issuanceDate,
    expirationDate: config.fields.values.expirationDate
}

logger.debug('tempFields : ', tempFields)

const result = {
    ...value,
    fields: tempFields
}

logger.debug('result : ', result)

return result



### `fields`

`fields.tables` に、証明書フィールド定義の移行対象となるテーブルと列を指定します。

`fields.values` に、`credentialSubject` の各項目へ追加する表示設定、および `issuanceDate`、`expirationDate` の定義を指定します。

**変換ルール**

- 取得したJSONデータの`fields`配列を、オブジェクト形式に変換します。
- `fields`配列の各項目について、`key`をフィールド名として使用し、`key`以外の属性を保持します。
- `fields.values.credentialSubject`の設定に応じて、以下の処理を行います。
  - 子項目（例：`credentialInformation`）が定義されている場合は、その子項目の配下にすべてのフィールドを設定します。
  - 子項目が定義されていない場合は、`credentialSubject`の直下にすべてのフィールドを設定します。
- 各フィールドに、設定ファイルで指定された`showInDetail`と`showInIssue`を追加します。
- `credentialSubject`と同じ階層に、`fields.values`で定義された`issuanceDate`と`expirationDate`を追加します。
- 変換後のデータを`fields`に設定します。
- 変換前後のJSONデータに変更がある場合のみDBを更新します。変更がない場合は更新しません。

**変換後の構造例**

`credentialSubject`に`credentialInformation`が定義されている場合：

```json
{
    "credentialSubject": {
        "credentialInformation": {
            "name": {
                "type": "string",
                "required": true,
                "showInDetail": true,
                "showInIssue": true
            },
            "address": {
                "type": "string",
                "required": false,
                "showInDetail": true,
                "showInIssue": true
            }
        }
    },
    "issuanceDate": {
        "type": "datetime",
        "required": false,
        "showInDetail": true,
        "showInIssue": false,
        "issueFormat": "YYYY/MM/DD",
        "format": "YYYY/MM/DD HH:mm:ss"
    },
    "expirationDate": {
        "type": "datetime",
        "required": false,
        "showInDetail": true,
        "showInIssue": true,
        "issueFormat": "YYYY/MM/DD",
        "format": "YYYY/MM/DD HH:mm:ss"
    }
}
```

`credentialSubject`に子項目が定義されていない場合は、`name`や`address`などのフィールドを`credentialSubject`の直下に設定します。

**注意事項**

- `showInDetail`と`showInIssue`は、`credentialSubject`や`credentialInformation`自体ではなく、各フィールドに設定します。
- 各フィールドに同名の属性が存在する場合は、設定ファイルの値で上書きします。
- 子項目が複数定義されている場合は、最初の子項目を変換対象とします。
- `fields`が既にオブジェクト形式に変換されている場合は、再変換せずに元のデータを返却します。
