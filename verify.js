
/**
 * Presentation Request の input_descriptor を生成する
 *
 * @param {Object} params
 * input_descriptor 生成用パラメータ
 *
 * @param {string} params.id
 * input_descriptor の識別子
 *
 * @param {string} params.format
 * VC フォーマット
 *
 * @param {string} params.path
 * 検証対象の JSONPath
 *
 * @param {string} params.filterType
 * filter の type
 *
 * @param {string} params.constValue
 * 完全一致させる値
 *
 * @returns {Object}
 * input_descriptor
 */
const createInputDescriptor = ({
  id,
  format,
  path,
  filterType,
  constValue,
}) => {
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
            filter: {
              type: filterType,
              const: constValue,
            },
          },
        ],
      },
    },
  }
}

/**
 * Presentation Request 用のリクエストデータを生成する
 *
 * @param {Object} params
 * Presentation Request 生成用パラメータ
 *
 * @param {string} params.format
 * VC フォーマット
 *
 * @param {string} params.type
 * JWT VC の type
 *
 * @param {string} params.category
 * Credential Presentation のカテゴリ
 *
 * @param {Object} params.credentialsPresentation
 * Credential Presentation 定義
 *
 * @param {Array} params.commonPolicies
 * 共通 VC Policy
 *
 * @param {Array} params.jwtVcPolicies
 * JWT VC 用 Policy
 *
 * @param {Array} params.sdJwtVcPolicies
 * SD-JWT VC 用 Policy
 *
 * @param {Array} params.sdJwtVpPolicies
 * SD-JWT VP 用 Policy
 *
 * @returns {Object}
 * Presentation Request 用のリクエストデータ
 */
const createPresentationRequestData = ({
  format,
  type,
  category,
  credentialsPresentation,
  commonPolicies,
  jwtVcPolicies,
  sdJwtVcPolicies,
  sdJwtVpPolicies,
}) => {
  switch (format) {
    case 'jwt_vc_json':
      return {
        vc_policies: [...commonPolicies, ...jwtVcPolicies],
        request_credentials: [
          createInputDescriptor({
            id: type,
            format: 'jwt_vc_json',
            path: '$.vc.type',
            filterType: 'array',
            constValue: type,
          }),
        ],
      }

    case 'vc+sd-jwt': {
      const vctValue = credentialsPresentation?.[category]?.vct

      return {
        vc_policies: [...commonPolicies, ...sdJwtVcPolicies],
        vp_policies: sdJwtVpPolicies,
        request_credentials: [
          createInputDescriptor({
            id: vctValue,
            format: 'vc+sd-jwt',
            path: '$.vct',
            filterType: 'string',
            constValue: vctValue,
          }),
        ],
      }
    }

    default: {
      const error = new Error(`Unsupported credential format. format: ${format}`)
      error.code = 'InvalidParamsError'
      error.params = [format]

      throw error
    }
  }
}
