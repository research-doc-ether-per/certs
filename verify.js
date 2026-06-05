
let pdData = {}

switch (format) {
  case 'jwt_vc_json': // JWT-VC の場合
    pdData = {
      vc_policies: [...common_policies, ...jwt_vc_policies],
      request_credentials: [
        { 
          format: format, 
          type: type,
          // 完全一致（const）の条件を追加
          constraints: {
            fields: [
              {
                path: ["$.vc.type"],
                filter: {
                  type: "array",
                  contains: {
                    type: "string",
                    const: type // 指定されたタイプ名と完全一致
                  }
                }
              }
            ]
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
      request_credentials: [
        {
          format: format,
          vct: vctValue,
          // 完全一致（const）の条件を追加
          constraints: {
            fields: [
              {
                path: ["$.vct"],
                filter: {
                  type: "string",
                  const: vctValue // 指定されたVCT文字列と完全一致
                }
              }
            ]
          }
        }
      ],
    }
    break

  default:
    break
}

