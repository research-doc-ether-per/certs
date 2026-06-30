**type**  
証明書種別  
Presentation Request URL の発行対象となる証明書種別を指定する。

例：  
・Career：職歴  
・Awards：表彰  
・Qualifications：資格  
・b4d：基本4情報

**category**  
追加可能証明書カテゴリ  
証明書種別（type）と同じ値を指定する。

例：  
・Career：職歴  
・Awards：表彰  
・Qualifications：資格  
・b4d：基本4情報

**format**  
証明書フォーマット種別  
証明書のフォーマット種別を指定する。

例：  
・jwt_vc_json  
・vc+sd-jwt

**targets**  
提示可能な対象者のユーザ名リスト  
対象者がウォレットにサインインする際、認証認可サーバで払い出されたアクセストークンの `preferred_username` と一致する文字列を指定する。複数指定できる。
