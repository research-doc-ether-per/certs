
/**
 * fieldsの変換処理。
 */
const transform = async (value, context) => {
    logger.debug('*** transform start ***')

    try {
        logger.debug('target : ', context)
        logger.debug('value : ', value)

        const config = migrationConfig.fields.values

        // 元のデータを複製する
        const result = JSON.parse(JSON.stringify(value))

        // credentialSubjectの各項目に表示設定を追加する
        const credentialSubject = result.credentialSubject

        if (
            credentialSubject &&
            typeof credentialSubject === 'object' &&
            !Array.isArray(credentialSubject)
        ) {
            for (const [key, field] of Object.entries(credentialSubject)) {
                if (
                    !field ||
                    typeof field !== 'object' ||
                    Array.isArray(field)
                ) {
                    continue
                }

                credentialSubject[key] = {
                    ...config.credentialSubject,
                    ...field
                }
            }
        }

        // issuanceDateとexpirationDateを追加する
        for (const key of ['issuanceDate', 'expirationDate']) {
            if (!Object.prototype.hasOwnProperty.call(result, key)) {
                result[key] = JSON.parse(JSON.stringify(config[key]))
            }
        }

        logger.debug('result : ', result)

        return result
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** transform end ***')
    }
}
