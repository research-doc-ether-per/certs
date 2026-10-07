
【質問1】
JWT / SD-JWT については、事前認可コードフロー、認可コードフローの両方で確認しています。
Offer 発行から Credential 取得まで、どちらのフローでも問題なく処理できることを確認しました。

【質問2】
Credential Offer URL については、Sample Code を修正して確認しました。
同一 Credential Offer URL を複数 Holder で利用した場合、事前認可コードフロー、認可コードフローのどちらも、複数回利用できないことを確認しています。
Presentation Request URL については、現在 Sample Code を修正して確認中です。
walt.id のコード上では、同一 Verification Session に対する Presentation Response は再利用できない実装になっていることを確認しています。
実際の動作確認ができましたら、改めてご報告します。
