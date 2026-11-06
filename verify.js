### `fields`

`fields.tables` に、証明書フィールド定義の移行対象となるテーブルと列を指定します。


**変換ルール**

- 取得したJSONデータの`fields`配列を、オブジェクト形式に変換します。
- `fields`配列の各項目について、`name`を`credentialSubject`のキーとして設定します。
- 各項目の`name`以外の属性を保持し、`fields.values.credentialSubject`に定義された`showInDetail`と`showInIssue`を追加します。
- `credentialSubject`と同じ階層に、`fields.values`で定義された`issuanceDate`と`expirationDate`を追加します。
- 変換後のデータを`fields`に設定します。
- 変換前後のJSONデータに変更がある場合のみ、DBを更新します。変更がない場合は更新しません。

**変換後の構造例**

```json
{
    "credentialSubject": {
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

**注意事項**

- `showInDetail`と`showInIssue`は、`credentialSubject`自体ではなく、配下の各項目に設定します。
- 各項目に同名の属性が存在する場合は、設定ファイルの値で上書きします。
- `fields`が既にオブジェクト形式に変換されている場合は、再変換せずに元のデータを返却します。
