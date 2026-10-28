
[
    {
        "groupId": "all",
        "type": "Awards",
        "fields": {
            "credentialSubject": {
                "certExplanation": {
                    "type": "text",
                    "required": false,
                    "showInDetail": true,
                    "showInIssue": true,
                    "length": {
                        "min": 0,
                        "max": 100
                    }
                },
                "organization": {
                    "type": "text",
                    "required": true,
                    "showInDetail": true,
                    "showInIssue": true,
                    "length": {
                        "min": 1,
                        "max": 100
                    }
                },
                "issuedAt": {
                    "type": "datetime",
                    "required": true,
                    "showInDetail": true,
                    "showInIssue": true,
                    "format": "YYYY/MM/DD"
                }
            },
            "issuanceDate": {
                "type": "datetime",
                "required": false,
                "showInDetail": true,
                "showInIssue": true,
                "issueFormat": "YYYY/MM/DD",
                "format": "YYYY/MM/DD HH:mm:ss"
            },
            "expirationDate": {
                "type": "datetime",
                "required": false,
                "showInDetail": true,
                "showInIssue": true,
                "issueFormat": "YYYY/MM/DD",
                "format": "YYYY/MM/DD HH:mm:ss"
            }
        },
        "formats": [
            {
                "format": "jwt_vc_json",
                "authType": "pre_authorized",
                "disclosurePaths": []
            },
            {
                "format": "vc+sd-jwt",
                "authType": "pwd",
                "disclosurePaths": [
                    "credentialSubject.organization",
                    "credentialSubject.issuedAt"
                ]
            }
        ]
    },
    {
        "groupId": "all",
        "type": "Career",
        "fields": {},
        "formats": [
            {
                "format": "jwt_vc_json",
                "authType": "pre_authorized",
                "disclosurePaths": []
            },
            {
                "format": "vc+sd-jwt",
                "authType": "pwd",
                "disclosurePaths": []
            }
        ]
    },
    {
        "groupId": "all",
        "type": "Qualifications",
        "fields": {},
        "formats": [
            {
                "format": "jwt_vc_json",
                "authType": "pre_authorized",
                "disclosurePaths": []
            },
            {
                "format": "vc+sd-jwt",
                "authType": "pwd",
                "disclosurePaths": []
            }
        ]
    }
]




const fs = require('fs')
const path = require('path')

const configPath = path.join(
    __dirname,
    'credential-formats.config.json'
)

const outputPath = path.join(
    __dirname,
    'credential_formats_init.sql'
)

/**
 * SQL文字列をエスケープする。
 */
const escapeSql = (value) => {
    return String(value).replace(/'/g, "''")
}

/**
 * フィールド定義を生成する。
 */
const createFields = (definition, disclosurePaths = []) => {
    const fields = structuredClone(definition)

    // 開示対象の項目のみisDisclosureを設定する。
    for (const fieldPath of disclosurePaths) {
        const keys = fieldPath.split('.')
        let current = fields

        for (const key of keys) {
            current = current?.[key]
        }

        if (!current || typeof current !== 'object') {
            throw new Error(
                `Disclosure field not found: ${fieldPath}`
            )
        }

        current.isDisclosure = true
    }

    return { fields }
}

/**
 * INSERT文を生成する。
 */
const createInsertSql = (credential, formatConfig) => {
    const fields = createFields(
        credential.fields,
        formatConfig.disclosurePaths || []
    )

    const values = [
        credential.groupId || 'all',
        credential.type,
        formatConfig.format,
        formatConfig.authType
    ].map(value => `'${escapeSql(value)}'`)

    const fieldsJson = escapeSql(
        JSON.stringify(fields, null, 4)
    )

    return `-- ${credential.type} (${formatConfig.format})
INSERT INTO credential_formats (
    group_id,
    type,
    format,
    auth_type,
    fields
) VALUES (
    ${values.join(',\n    ')},
    '${fieldsJson}'::jsonb
)
ON CONFLICT (group_id, type, format)
DO UPDATE SET
    auth_type = EXCLUDED.auth_type,
    fields = EXCLUDED.fields,
    update_date = CURRENT_TIMESTAMP;`
}

/**
 * 証明書フォーマット定義の初期SQLを生成する。
 */
const generateSql = () => {
    const credentials = JSON.parse(
        fs.readFileSync(configPath, 'utf8')
    )

    const statements = []

    for (const credential of credentials) {
        const fields = credential.fields || {}

        if (Object.keys(fields).length === 0) {
            console.warn(
                `フィールド定義が未設定のためスキップ: ${credential.type}`
            )
            continue
        }

        for (const formatConfig of credential.formats || []) {
            statements.push(
                createInsertSql(credential, formatConfig)
            )
        }
    }

    const sql = [
        '-- 証明書フォーマット定義 初期データ設定',
        'BEGIN;',
        ...statements,
        'COMMIT;'
    ].join('\n\n')

    fs.writeFileSync(outputPath, sql + '\n', 'utf8')

    console.log(`SQL生成完了: ${outputPath}`)
    console.log(`生成件数: ${statements.length}`)
}

generateSql()
