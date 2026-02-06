const maskDisclosedClaims = (claims) => {
  if (!Array.isArray(claims)) return claims;

  return claims.map((item) => {
    // 想定外フォーマットの場合はそのまま返す
    if (!Array.isArray(item) || item.length < 3) {
      return item;
    }

    // [sd, key, value] の value を空文字に置換
    return [
      item[0], // sd
      item[1], // key
      "",      // value（マスキング）
    ];
  });
};
