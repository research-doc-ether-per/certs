"jwt_vc_json": [
  "jwt_vc_json/audience-check",     // オーディエンス（送信先が自分であるか）を検証
  "jwt_vc_json/nonce-check",        // リプレイアタック防止用のNonceが一致するかを検証
  "jwt_vc_json/envelope_signature"  // ウォレットが作成したエンベロープ（器）の署名を検証
]
