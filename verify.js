■フィールドタイプ判定

・DBの証明書フィールド定義にtypeが指定されている場合、指定された値を使用する。
・DBにtypeが指定されていない場合、Credential Profileの値に応じて以下のタイプを設定する。

　・数値：number
　・真偽値：boolean
　・配列：array
　・オブジェクト：object
　・上記以外：text

※datetime、select、imageなどのタイプは、DBの証明書フィールド定義に指定された値を使用する。
