let pdData = {}

switch (format) {
  case 'jwt_vc_json': // JWT-VC の場合
    pdData = {
      vc_policies: [...common_policies, ...jwt_vc_policies],
      // 簡易指定は消去し、input_descriptor 形式のみを配置
      request_credentials: [
        {
          input_descriptor: {
            id: type, // 識別子としてタイプ名を設定
            format: {
              jwt_vc_json: {
                alg: ["EdDSA"] // 必要に応じて鍵アルゴリズムを指定
              }
            },
            constraints: {
              fields: [
                {
                  path: ["$.vc.type"],
                  filter: {
                    type: "array",
                    contains: {
                      type: "string",
                      const: type // const で完全一致を強制
                    }
                  }
                }
              ]
            }
          }
        }
      ],
    }
    break

  case 'vc+sd-jwt': // SD-JWT の場合
    const vctValue = credentialsPresentation?.[category].vct;
    pdData = {
      vc_policies: [...common_policies, ...sd_jwt_vc_policies],
      vp_policies: sd_jwt_vp_policies,
      // 簡易指定は消去し、input_descriptor 形式のみを配置
      request_credentials: [
        {
          input_descriptor: {
            id: vctValue, // 識別子として VCT の値を設定
            format: {
              "vc+sd-jwt": {}
            },
            constraints: {
              fields: [
                {
                  path: ["$.vct"],
                  filter: {
                    type: "string",
                    const: vctValue // const で完全一致を強制
                  }
                }
              ]
            }
          }
        }
      ],
    }
    break

  default:
    break
}

// OID4VP 検証セッションを作成
const presentation_request_url = await createPresentationOffer(pdData)
