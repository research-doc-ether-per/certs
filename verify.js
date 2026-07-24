
/**
 * Presentation Request URL 一覧レスポンスを生成する
 *
 * @param {Object[]} datas
 * DB 取得データ
 *
 * @param {string} targetKey
 * targets に設定する対象項目の key
 * 例: userId / orgWalletId
 *
 * @returns {Object}
 * Presentation Request URL 一覧レスポンス
 */
const createPresentationRequestUrlListResponse = (datas = [], targetKey) => {
  const tempObj = new Map()

  for (const data of datas) {
    const {
      id,
      groupId,
      presentationRequestUrl,
      state,
      type,
      format,
      name,
      issuedByUserId,
      updateDate,
      createDate,
    } = data

    const targetValue = data[targetKey]

    if (!tempObj.has(id)) {
      tempObj.set(id, {
        id,
        groupId,
        presentationRequestUrl,
        state,
        type,
        format,
        name,
        issuedByUserId,
        targets: [],
        updateDate,
        createDate,
        _targetSet: new Set(),
      })
    }

    const obj = tempObj.get(id)

    if (targetValue && !obj._targetSet.has(targetValue)) {
      obj._targetSet.add(targetValue)
      obj.targets.push(targetValue)
    }
  }

  const list = Array.from(tempObj.values()).map((item) => {
    delete item._targetSet
    return item
  })

  return { list }
}
