
"policies": {
  // 1. 提示（Presentation）全体、またはフォーマットごとのメタデータ検証
  "vp_policies": {
    "jwt_vc_json": [
      // 💡 必要に応じて、純粋なJWT用のポリシー（"jwt_vc_json/audience-check" など）を配列内に定義します
    ],
    "dc+sd-jwt": [
      "dc+sd-jwt/audience-check",     // SD-JWTのAudience（検証者識別子）が正しいかを検証
      "dc+sd-jwt/kb-jwt_signature",   // ホルダー公開鍵によるキーバインディング署名を検証
      "dc+sd-jwt/nonce-check",        // リプレイアタック防止用のNonceが一致するかを検証
      "dc+sd-jwt/sd_hash-check"       // 開示されたクローキング（選択的開示）のハッシュ値が正しいかを検証
    ],
    "mso_mdoc": []
  },
  
  // 2. 個々の資格情報（VC）自体の有効性や発行元に対する検証
  "vc_policies": {
    "jwt_vc_json": [
      "jwt_vc_json/signature",        // 発行者の署名検証
      "jwt_vc_json/expiration",       // 有効期限の検証
      "jwt_vc_json/not-before"        // 発効日の検証
    ],
    "dc+sd-jwt": [
      "dc+sd-jwt/signature",
      "dc+sd-jwt/expiration",
      "dc+sd-jwt/revoked-status-list" // 失効状態のチェック
    ],
    "mso_mdoc": []
  }
}
