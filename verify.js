/**
 * Presentation Request URL 一覧レスポンスを生成する
 *
 * @param {Object[]} datas DB 取得データ
 * @param {Object} options オプション
 * @param {string} options.targetKey targets に設定する項目名
 * @param {string[]} [options.additionalKeys=[]] 追加でレスポンスに含める項目名
 * @returns {Object} Presentation Request URL 一覧レスポンス
 */
const createPresentationRequestUrlListResponse = (
  datas = [],
  { targetKey, additionalKeys = [] } = {}
) => {
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
      updateDate,
      createDate,
    } = data

    const targetValue = data[targetKey]

    if (!tempObj.has(id)) {
      const baseInfo = {
        id,
        groupId,
        presentationRequestUrl,
        state,
        type,
        format,
        name,
        targets: [],
        updateDate,
        createDate,
        _targetSet: new Set(),
      }

      for (const key of additionalKeys) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          baseInfo[key] = data[key]
        }
      }

      tempObj.set(id, baseInfo)
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
