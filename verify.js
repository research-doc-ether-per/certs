# DB削除
docker exec -e PGPASSWORD=wallet wallet-db \
  psql -U wallet -d postgres \
  -c "DROP DATABASE IF EXISTS wallet WITH (FORCE);"

# DB作成
docker exec -e PGPASSWORD=wallet wallet-db \
  psql -U wallet -d postgres \
  -c "CREATE DATABASE wallet OWNER wallet;"

# スキーマ復元
docker exec -i -e PGPASSWORD=wallet wallet-db \
  psql -U wallet -d wallet -v ON_ERROR_STOP=1 \
  < wcloudwallet_schema.sql

# データ復元
docker exec -i -e PGPASSWORD=wallet wallet-db \
  psql -U wallet -d wallet -v ON_ERROR_STOP=1 \
  < cloudwallet_data.sql

# DB内の全テーブルのデータをクリア（テーブル定義は保持）
docker exec -i -e PGPASSWORD=wallet wallet-db \
  psql -U wallet -d wallet -v ON_ERROR_STOP=1 <<'SQL'
DO $$
DECLARE
    tables TEXT;
BEGIN
    SELECT string_agg(format('%I.%I', schemaname, tablename), ', ')
    INTO tables
    FROM pg_tables
    WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
      AND schemaname NOT LIKE 'pg_toast%';

    IF tables IS NOT NULL THEN
        EXECUTE 'TRUNCATE TABLE ' || tables || ' RESTART IDENTITY CASCADE';
    END IF;
END $$;
SQL

# データ復元
docker exec -i -e PGPASSWORD=wallet wallet-db \
  psql -U wallet -d wallet -v ON_ERROR_STOP=1 \
  < cloudwallet_data.sql


# PostgreSQL接続
docker exec -it -e PGPASSWORD=wallet wallet-db \
  psql -U wallet -d wallet

# テーブル一覧確認（psql内で実行）
\dt

# データ件数確認（psql内で実行）
SELECT COUNT(*) FROM credential_formats;

/**
 * Credential Dataと証明書フォーマット定義を統合する。
 *
 * @param {object} credentialData Credentialデータ
 * @param {object|null} selectiveDisclosure 選択的開示設定
 * @param {Array} formatFields DBのフォーマット定義
 * @returns {Array}
 */
const mergeCredentialFields = (
    credentialData = {},
    selectiveDisclosure = null,
    formatFields = []
) => {
    // Credential Subjectを取得する。
    const credentialSubject = credentialData.credentialSubject || {}

    // Selective Disclosure情報を取得する。
    const disclosureFields =
        selectiveDisclosure?.fields
            ?.credentialSubject
            ?.children
            ?.fields || {}

    const fieldsMap = new Map()

    // Credential Dataからfieldsを作成する。
    Object.entries(credentialSubject).forEach(([key, value]) => {
        // IDと画像は入力項目の対象外とする。
        if (key === 'id' || key === 'image') {
            return
        }

        // Credential Dataの値から型を判定する。
        let type = 'text'

        if (typeof value === 'number') {
            type = 'number'
        } else if (typeof value === 'boolean') {
            type = 'boolean'
        } else if (Array.isArray(value)) {
            type = 'array'
        } else if (value !== null && typeof value === 'object') {
            type = 'object'
        }

        // Selective Disclosureを確認する。
        const isDisclosure = disclosureFields[key]?.sd === true

        fieldsMap.set(key, {
            key,
            type,
            required: false,
            isDisclosure
        })
    })

    // DBのフォーマット定義を優先して統合する。
    formatFields.forEach(field => {
        if (!field?.key) {
            return
        }

        // IDと画像は入力項目の対象外とする。
        if (field.key === 'id' || field.key === 'image') {
            return
        }

        const existingField = fieldsMap.get(field.key) || {
            key: field.key,
            type: 'text',
            required: false,
            isDisclosure: disclosureFields[field.key]?.sd === true
        }

        // DB定義にisDisclosureが存在する場合はDBを優先する。
        fieldsMap.set(field.key, {
            ...existingField,
            ...field
        })
    })

    return Array.from(fieldsMap.values())
}

/**
 * 証明書フォーマット定義取得サービス
 *
 * @param {object} params パラメータ
 * @returns {object}
 */
const getCredentialFormat = async (params) => {
    logger.debug('*** getCredentialFormat start ***')
    logger.debug('params: ', JSON.stringify(params, null, 2))

    const { groupId, type, format } = params

    let result = {}

    try {
        let rows = []

        // 指定されたgroupIdで検索（all以外の場合）
        if (
            typeof groupId === 'string' &&
            groupId.trim() &&
            groupId.trim() !== ALL_SETTING
        ) {
            rows = await walletDBService.select('credential_formats', {
                group_id: groupId.trim(),
                type: type,
                format: format
            })
        }

        // 見つからない場合はallで検索する。
        if (!rows || rows.length === 0) {
            rows = await walletDBService.select('credential_formats', {
                group_id: ALL_SETTING,
                type: type,
                format: format
            })
        }

        // DBからフォーマット定義を取得する。
        const formatJson = rows?.[0]?.fields || {}

        const formatFields = Array.isArray(formatJson?.fields)
            ? formatJson.fields
            : []

        // 認証方式一覧を取得する。
        const authType = rows?.[0]?.authType
        const authTypes = createAuthMethodTypeList(authType)

        let fields = formatFields
        let image = images?.default || null

        // typeとformatが指定された場合はProfile情報を取得する。
        if (type && format) {
            // Credential Configuration IDを生成する。
            const configurationFormat =
                format === 'vc+sd-jwt'
                    ? CREDENTIAL_FORMAT.SD_JWT_VC
                    : format

            const credentialConfigurationId =
                `${type}_${configurationFormat}`

            // Credential Profileを取得する。
            const profile = await getCredentialProfileByConfigurationId(
                credentialConfigurationId
            )

            // Credential DataとSelective Disclosureを取得する。
            const credentialData = profile.credentialData || {}
            const selectiveDisclosure =
                profile.selectiveDisclosure || null

            // Credential Dataから画像を取得する。
            image =
                credentialData.credentialSubject?.image ||
                images?.default ||
                null

            // Credential DataとDB定義を統合する。
            fields = mergeCredentialFields(
                credentialData,
                selectiveDisclosure,
                formatFields
            )
        }

        result = {
            fields,
            image,
            authTypes
        }

        return result
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** getCredentialFormat end ***')
    }
}
