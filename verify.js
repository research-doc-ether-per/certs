/**
 * Presentation Request URL 詳細レスポンスを生成する
 *
 * @param {Object[]} datas DB 取得データ
 * @param {Object} options オプション
 * @param {string} options.targetKey targets に設定する項目名
 * @param {string[]} [options.additionalKeys=[]] 追加でレスポンスに含める項目名
 * @returns {Object} Presentation Request URL 詳細レスポンス
 */
const createPresentationRequestUrlInfoResponse = (
  datas = [],
  { targetKey, additionalKeys = [] } = {}
) => {
  const targetSet = new Set()
  const targets = []
  let baseInfo = null

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

    if (!baseInfo) {
      baseInfo = {
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
      }

      for (const key of additionalKeys) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          baseInfo[key] = data[key]
        }
      }
    }

    if (targetValue && !targetSet.has(targetValue)) {
      targetSet.add(targetValue)
      targets.push(targetValue)
    }
  }

  if (!baseInfo) {
    return {}
  }

  baseInfo.targets = targets

  return baseInfo
}
