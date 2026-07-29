// 基本4情報かどうかの判定
const isB4d = isBase4InfoCredential({
  vct: payload?.vct,
  type: payload?.type,
})
