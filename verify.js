
/**
 * Presentation Request の input_descriptor を生成する
 *
 * @param {Object} params パラメータ
 * @param {string} params.id input_descriptor の識別子
 * @param {string} params.format VC フォーマット
 * @param {string} params.path 検証対象の JSONPath
 * @param {Object} params.filter filter 定義
 * @returns {Object} input_descriptor
 */
const createInputDescriptor = ({ id, format, path, filter }) => {
  return {
    input_descriptor: {
      id,
      format: {
        [format]: {},
      },
      constraints: {
        fields: [
          {
            path: [path],
            filter,
          },
        ],
      },
    },
  }
}



createInputDescriptor({
  id: type,
  format: 'jwt_vc_json',
  path: '$.vc.type',
  filter: {
    type: 'array',
    contains: {
      type: 'string',
      const: type,
    },
  },
})


createInputDescriptor({
  id: vctValue,
  format: 'vc+sd-jwt',
  path: '$.vct',
  filter: {
    type: 'string',
    const: vctValue,
  },
})
