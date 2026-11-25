[
  {
    "id": "awards-and-b4d",
    "group_id": "all",
    "name": "表彰＋基本4情報",
    "description": "表彰（JWT）と本人の基本4情報（SD-JWT）の提示を求める。",
    "credential_types": [
      "Awards",
      "B4D"
    ],
    "vc_policies": [
      "signature",
      "expiration",
      "not-before"
    ],
    "vp_policies": {
      "jwt_vc_json": [
        "jwt_vc_json/audience-check",
        "jwt_vc_json/nonce-check",
        "jwt_vc_json/envelope_signature"
      ],
      "dc+sd-jwt": [
        "dc+sd-jwt/audience-check",
        "dc+sd-jwt/nonce-check",
        "dc+sd-jwt/kb-jwt_signature",
        "dc+sd-jwt/sd_hash-check"
      ]
    },
    "specific_vc_policies": {
      "awards": [
        "credential-status"
      ]
    },
    "dcql": {
      "credentials": [
        {
          "id": "awards",
          "format": "jwt_vc_json",
          "meta": {
            "type_values": [
              ["VerifiableCredential", "Awards"]
            ]
          }
        },
        {
          "id": "b4d",
          "format": "dc+sd-jwt",
          "meta": {
            "vct_values": ["B4D"]
          },
          "claims": [
            {
              "path": ["credentialSubject", "name"]
            },
            {
              "path": ["credentialSubject", "address"]
            },
            {
              "path": ["credentialSubject", "birthdate"]
            },
            {
              "path": ["credentialSubject", "gender"]
            }
          ]
        }
      ],
      "credential_sets": [
        {
          "options": [
            ["awards", "b4d"]
          ],
          "required": true
        }
      ]
    },
    "is_public": true
  },
  {
    "id": "qualifications-and-b4d",
    "group_id": "all",
    "name": "資格＋基本4情報",
    "description": "資格（JWT）と本人の基本4情報（SD-JWT）の提示を求める。",
    "credential_types": [
      "Qualifications",
      "B4D"
    ],
    "vc_policies": [
      "signature",
      "expiration",
      "not-before"
    ],
    "vp_policies": {
      "jwt_vc_json": [
        "jwt_vc_json/audience-check",
        "jwt_vc_json/nonce-check",
        "jwt_vc_json/envelope_signature"
      ],
      "dc+sd-jwt": [
        "dc+sd-jwt/audience-check",
        "dc+sd-jwt/nonce-check",
        "dc+sd-jwt/kb-jwt_signature",
        "dc+sd-jwt/sd_hash-check"
      ]
    },
    "specific_vc_policies": {
      "qualifications": [
        "credential-status"
      ]
    },
    "dcql": {
      "credentials": [
        {
          "id": "qualifications",
          "format": "jwt_vc_json",
          "meta": {
            "type_values": [
              ["VerifiableCredential", "Qualifications"]
            ]
          }
        },
        {
          "id": "b4d",
          "format": "dc+sd-jwt",
          "meta": {
            "vct_values": ["B4D"]
          },
          "claims": [
            {
              "path": ["credentialSubject", "name"]
            },
            {
              "path": ["credentialSubject", "address"]
            },
            {
              "path": ["credentialSubject", "birthdate"]
            },
            {
              "path": ["credentialSubject", "gender"]
            }
          ]
        }
      ],
      "credential_sets": [
        {
          "options": [
            ["qualifications", "b4d"]
          ],
          "required": true
        }
      ]
    },
    "is_public": true
  },
  {
    "id": "career-and-b4d",
    "group_id": "all",
    "name": "職歴＋基本4情報",
    "description": "職歴（JWT）と本人の基本4情報（SD-JWT）の提示を求める。",
    "credential_types": [
      "Career",
      "B4D"
    ],
    "vc_policies": [
      "signature",
      "expiration",
      "not-before"
    ],
    "vp_policies": {
      "jwt_vc_json": [
        "jwt_vc_json/audience-check",
        "jwt_vc_json/nonce-check",
        "jwt_vc_json/envelope_signature"
      ],
      "dc+sd-jwt": [
        "dc+sd-jwt/audience-check",
        "dc+sd-jwt/nonce-check",
        "dc+sd-jwt/kb-jwt_signature",
        "dc+sd-jwt/sd_hash-check"
      ]
    },
    "specific_vc_policies": {
      "career": [
        "credential-status"
      ]
    },
    "dcql": {
      "credentials": [
        {
          "id": "career",
          "format": "jwt_vc_json",
          "meta": {
            "type_values": [
              ["VerifiableCredential", "Career"]
            ]
          }
        },
        {
          "id": "b4d",
          "format": "dc+sd-jwt",
          "meta": {
            "vct_values": ["B4D"]
          },
          "claims": [
            {
              "path": ["credentialSubject", "name"]
            },
            {
              "path": ["credentialSubject", "address"]
            },
            {
              "path": ["credentialSubject", "birthdate"]
            },
            {
              "path": ["credentialSubject", "gender"]
            }
          ]
        }
      ],
      "credential_sets": [
        {
          "options": [
            ["career", "b4d"]
          ],
          "required": true
        }
      ]
    },
    "is_public": true
  },
  {
    "id": "awards",
    "group_id": "all",
    "name": "表彰",
    "description": "表彰（JWT）の提示を求める。",
    "credential_types": [
      "Awards"
    ],
    "vc_policies": [
      "signature",
      "expiration",
      "not-before",
      "credential-status"
    ],
    "vp_policies": {
      "jwt_vc_json": [
        "jwt_vc_json/audience-check",
        "jwt_vc_json/nonce-check",
        "jwt_vc_json/envelope_signature"
      ]
    },
    "specific_vc_policies": {},
    "dcql": {
      "credentials": [
        {
          "id": "awards",
          "format": "jwt_vc_json",
          "meta": {
            "type_values": [
              ["VerifiableCredential", "Awards"]
            ]
          }
        }
      ]
    },
    "is_public": true
  },
  {
    "id": "qualifications",
    "group_id": "all",
    "name": "資格",
    "description": "資格（JWT）の提示を求める。",
    "credential_types": [
      "Qualifications"
    ],
    "vc_policies": [
      "signature",
      "expiration",
      "not-before",
      "credential-status"
    ],
    "vp_policies": {
      "jwt_vc_json": [
        "jwt_vc_json/audience-check",
        "jwt_vc_json/nonce-check",
        "jwt_vc_json/envelope_signature"
      ]
    },
    "specific_vc_policies": {},
    "dcql": {
      "credentials": [
        {
          "id": "qualifications",
          "format": "jwt_vc_json",
          "meta": {
            "type_values": [
              ["VerifiableCredential", "Qualifications"]
            ]
          }
        }
      ]
    },
    "is_public": true
  },
  {
    "id": "career",
    "group_id": "all",
    "name": "職歴",
    "description": "職歴（JWT）の提示を求める。",
    "credential_types": [
      "Career"
    ],
    "vc_policies": [
      "signature",
      "expiration",
      "not-before",
      "credential-status"
    ],
    "vp_policies": {
      "jwt_vc_json": [
        "jwt_vc_json/audience-check",
        "jwt_vc_json/nonce-check",
        "jwt_vc_json/envelope_signature"
      ]
    },
    "specific_vc_policies": {},
    "dcql": {
      "credentials": [
        {
          "id": "career",
          "format": "jwt_vc_json",
          "meta": {
            "type_values": [
              ["VerifiableCredential", "Career"]
            ]
          }
        }
      ]
    },
    "is_public": true
  },
  {
    "id": "b4d",
    "group_id": "all",
    "name": "基本4情報",
    "description": "本人の基本4情報（SD-JWT）の提示を求める。",
    "credential_types": [
      "B4D"
    ],
    "vc_policies": [
      "signature",
      "expiration",
      "not-before"
    ],
    "vp_policies": {
      "dc+sd-jwt": [
        "dc+sd-jwt/audience-check",
        "dc+sd-jwt/nonce-check",
        "dc+sd-jwt/kb-jwt_signature",
        "dc+sd-jwt/sd_hash-check"
      ]
    },
    "specific_vc_policies": {},
    "dcql": {
      "credentials": [
        {
          "id": "b4d",
          "format": "dc+sd-jwt",
          "meta": {
            "vct_values": ["B4D"]
          },
          "claims": [
            {
              "path": ["credentialSubject", "name"]
            },
            {
              "path": ["credentialSubject", "address"]
            },
            {
              "path": ["credentialSubject", "birthdate"]
            },
            {
              "path": ["credentialSubject", "gender"]
            }
          ]
        }
      ]
    },
    "is_public": true
  }
]


const fs = require('fs')
const path = require('path')

const INPUT_FILE = path.join(
  __dirname,
  'vp_definitions.json'
)

const OUTPUT_FILE = path.join(
  __dirname,
  'vp_definitions_init.sql'
)

/**
 * オブジェクトかどうかを判定する
 *
 * @param {*} value 判定対象
 * @returns {boolean} 判定結果
 */
const isObject = (value) => {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  )
}

/**
 * 有効な文字列かどうかを判定する
 *
 * @param {*} value 判定対象
 * @param {number} maxLength 最大文字数
 * @returns {boolean} 判定結果
 */
const isValidString = (
  value,
  maxLength = Infinity
) => {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= maxLength
  )
}

/**
 * 文字列をSQL用の文字列リテラルに変換する
 *
 * @param {string|null} value 変換対象
 * @returns {string} SQL用文字列
 */
const toSqlString = (value) => {
  if (value === null || value === undefined) {
    return 'NULL'
  }

  return `'${String(value).replace(/'/g, "''")}'`
}

/**
 * JSONデータをJSONB型のSQL文字列に変換する
 *
 * @param {Object|Array} value JSONデータ
 * @returns {string} JSONB型のSQL文字列
 */
const toSqlJsonb = (value) => {
  return `${toSqlString(JSON.stringify(value))}::JSONB`
}

/**
 * Boolean値をSQL用の文字列に変換する
 *
 * @param {boolean} value Boolean値
 * @returns {string} SQL用文字列
 */
const toSqlBoolean = (value) => {
  return value ? 'TRUE' : 'FALSE'
}

/**
 * Policy配列の内容をチェックする
 *
 * @param {Array} policies Policy配列
 * @param {string} fieldName 項目名
 * @param {string} id VP定義ID
 */
const validatePolicies = (
  policies,
  fieldName,
  id
) => {
  if (!Array.isArray(policies)) {
    throw new Error(
      `Invalid ${fieldName}. id: ${id}`
    )
  }

  for (const policy of policies) {
    // 文字列形式のPolicy
    if (isValidString(policy)) {
      continue
    }

    // オブジェクト形式のPolicy
    if (
      isObject(policy) &&
      isValidString(policy.policy)
    ) {
      continue
    }

    throw new Error(
      `Invalid policy in ${fieldName}. id: ${id}`
    )
  }
}

/**
 * DCQL定義情報をチェックする
 *
 * @param {Object} dcql DCQL定義情報
 * @param {string} id VP定義ID
 * @returns {Object} Credential Query ID及びFormat情報
 */
const validateDcql = (dcql, id) => {
  if (!isObject(dcql)) {
    throw new Error(
      `Invalid dcql. id: ${id}`
    )
  }

  if (
    !Array.isArray(dcql.credentials) ||
    dcql.credentials.length === 0
  ) {
    throw new Error(
      `Invalid dcql.credentials. id: ${id}`
    )
  }

  const credentialIds = new Set()
  const credentialFormats = new Set()

  // Credential Query情報をチェックする
  for (const credential of dcql.credentials) {
    if (!isObject(credential)) {
      throw new Error(
        `Invalid credential query. id: ${id}`
      )
    }

    if (!isValidString(credential.id)) {
      throw new Error(
        `Credential query ID is required. id: ${id}`
      )
    }

    if (!isValidString(credential.format)) {
      throw new Error(
        `Credential format is required. id: ${id}`
      )
    }

    // Credential Query IDの重複チェック
    if (credentialIds.has(credential.id)) {
      throw new Error(
        `Duplicate credential query ID: ${credential.id}. id: ${id}`
      )
    }

    credentialIds.add(credential.id)
    credentialFormats.add(credential.format)
  }

  // Credential Set情報をチェックする
  if (dcql.credential_sets !== undefined) {
    if (
      !Array.isArray(dcql.credential_sets) ||
      dcql.credential_sets.length === 0
    ) {
      throw new Error(
        `Invalid credential_sets. id: ${id}`
      )
    }

    for (const credentialSet of dcql.credential_sets) {
      if (
        !isObject(credentialSet) ||
        !Array.isArray(credentialSet.options) ||
        credentialSet.options.length === 0
      ) {
        throw new Error(
          `Invalid credential set. id: ${id}`
        )
      }

      if (
        credentialSet.required !== undefined &&
        typeof credentialSet.required !== 'boolean'
      ) {
        throw new Error(
          `Invalid credential set required flag. id: ${id}`
        )
      }

      for (const option of credentialSet.options) {
        if (
          !Array.isArray(option) ||
          option.length === 0
        ) {
          throw new Error(
            `Invalid credential set option. id: ${id}`
          )
        }

        for (const credentialId of option) {
          if (!credentialIds.has(credentialId)) {
            throw new Error(
              `Unknown credential query ID: ${credentialId}. id: ${id}`
            )
          }
        }
      }
    }
  }

  return {
    credentialIds,
    credentialFormats,
  }
}

/**
 * VP標準ポリシーをチェックする
 *
 * @param {Object} vpPolicies VP標準ポリシー
 * @param {Set} credentialFormats Credential Format一覧
 * @param {string} id VP定義ID
 */
const validateVpPolicies = (
  vpPolicies,
  credentialFormats,
  id
) => {
  if (!isObject(vpPolicies)) {
    throw new Error(
      `Invalid vp_policies. id: ${id}`
    )
  }

  for (const [format, policies] of Object.entries(vpPolicies)) {
    // DCQLに定義されているFormatか確認する
    if (!credentialFormats.has(format)) {
      throw new Error(
        `Unknown VP policy format: ${format}. id: ${id}`
      )
    }

    validatePolicies(
      policies,
      `vp_policies.${format}`,
      id
    )
  }
}

/**
 * 個別VCポリシーをチェックする
 *
 * @param {Object} specificVcPolicies 個別VCポリシー
 * @param {Set} credentialIds Credential Query ID一覧
 * @param {string} id VP定義ID
 */
const validateSpecificVcPolicies = (
  specificVcPolicies,
  credentialIds,
  id
) => {
  if (!isObject(specificVcPolicies)) {
    throw new Error(
      `Invalid specific_vc_policies. id: ${id}`
    )
  }

  for (const [credentialId, policies] of Object.entries(specificVcPolicies)) {
    // DCQLに定義されているCredential Query IDか確認する
    if (!credentialIds.has(credentialId)) {
      throw new Error(
        `Unknown specific VC policy credential ID: ${credentialId}. id: ${id}`
      )
    }

    validatePolicies(
      policies,
      `specific_vc_policies.${credentialId}`,
      id
    )
  }
}

/**
 * VP定義情報の入力内容をチェックする
 *
 * @param {Object} data VP定義情報
 */
const validateVpDefinition = (data) => {
  if (!isObject(data)) {
    throw new Error('Invalid VP definition.')
  }

  const {
    id,
    group_id,
    name,
    description,
    credential_types,
    vc_policies,
    vp_policies,
    specific_vc_policies,
    dcql,
    is_public,
  } = data

  // VP定義ID
  if (!isValidString(id, 128)) {
    throw new Error('Invalid VP definition ID.')
  }

  // グループID
  if (!isValidString(group_id, 128)) {
    throw new Error(
      `Invalid group_id. id: ${id}`
    )
  }

  // VP定義名
  if (!isValidString(name, 256)) {
    throw new Error(
      `Invalid name. id: ${id}`
    )
  }

  // 説明
  if (
    description != null &&
    typeof description !== 'string'
  ) {
    throw new Error(
      `Invalid description. id: ${id}`
    )
  }

  // 対象証明書タイプ
  if (
    !Array.isArray(credential_types) ||
    credential_types.length === 0 ||
    !credential_types.every(
      (type) => isValidString(type)
    )
  ) {
    throw new Error(
      `Invalid credential_types. id: ${id}`
    )
  }

  // DCQL定義
  const {
    credentialIds,
    credentialFormats,
  } = validateDcql(dcql, id)

  // VC標準ポリシー
  validatePolicies(
    vc_policies,
    'vc_policies',
    id
  )

  // VP標準ポリシー
  validateVpPolicies(
    vp_policies,
    credentialFormats,
    id
  )

  // 個別VCポリシー
  validateSpecificVcPolicies(
    specific_vc_policies,
    credentialIds,
    id
  )

  // 公開フラグ
  if (typeof is_public !== 'boolean') {
    throw new Error(
      `Invalid is_public. id: ${id}`
    )
  }
}

/**
 * VP定義情報のINSERT SQLを生成する
 *
 * @param {Object} data VP定義情報
 * @returns {string} INSERT SQL
 */
const generateInsertSql = (data) => {
  const {
    id,
    group_id,
    name,
    description,
    credential_types,
    vc_policies,
    vp_policies,
    specific_vc_policies,
    dcql,
    is_public,
  } = data

  return `INSERT INTO vp_definitions (
    id,
    group_id,
    name,
    description,
    credential_types,
    vc_policies,
    vp_policies,
    specific_vc_policies,
    dcql,
    is_public
) VALUES (
    ${toSqlString(id)},
    ${toSqlString(group_id)},
    ${toSqlString(name)},
    ${toSqlString(description)},
    ${toSqlJsonb(credential_types)},
    ${toSqlJsonb(vc_policies)},
    ${toSqlJsonb(vp_policies)},
    ${toSqlJsonb(specific_vc_policies)},
    ${toSqlJsonb(dcql)},
    ${toSqlBoolean(is_public)}
)
ON CONFLICT (group_id, id) DO NOTHING;`
}

/**
 * VP定義初期データ登録SQLを生成する
 */
const main = () => {
  console.log(
    '*** init-vp-definitions start ***'
  )

  try {
    // JSONファイルを読み込む
    const jsonData = fs.readFileSync(
      INPUT_FILE,
      'utf8'
    )

    const vpDefinitions = JSON.parse(jsonData)

    // JSONファイルの形式をチェックする
    if (
      !Array.isArray(vpDefinitions) ||
      vpDefinitions.length === 0
    ) {
      throw new Error(
        'Invalid JSON format.'
      )
    }

    // VP定義IDとグループIDの重複チェック用
    const keys = new Set()

    // INSERT SQLを生成する
    const sqlList = vpDefinitions.map((data) => {
      // VP定義情報の入力チェック
      validateVpDefinition(data)

      // VP定義IDとグループIDの重複チェック
      const key = JSON.stringify([
        data.group_id,
        data.id,
      ])

      if (keys.has(key)) {
        throw new Error(
          `Duplicate VP definition. group_id: ${data.group_id}, id: ${data.id}`
        )
      }

      keys.add(key)

      // INSERT SQLを生成する
      return generateInsertSql(data)
    })

    // SQLファイルの内容を生成する
    const sql = [
      '-- VP定義初期データ登録SQL',
      '-- Auto-generated by init-vp-definitions.js',
      '',
      'BEGIN;',
      'SET LOCAL standard_conforming_strings = on;',
      '',
      sqlList.join('\n\n'),
      '',
      'COMMIT;',
      '',
    ].join('\n')

    // SQLファイルを出力する
    fs.writeFileSync(
      OUTPUT_FILE,
      sql,
      'utf8'
    )

    console.log(`Input file : ${INPUT_FILE}`)
    console.log(`Output file: ${OUTPUT_FILE}`)
    console.log(`Total records: ${vpDefinitions.length}`)
    console.log('SQL file generated successfully.')
  } catch (error) {
    console.error('error.message: ', error.message)
    console.error('error.stack: ', error.stack)

    process.exitCode = 1
  } finally {
    console.log(
      '*** init-vp-definitions end ***'
    )
  }
}

main()

