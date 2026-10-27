
/**
 * Verification Sessionを取得する。
 */
const getVerificationSession = async (sessionId, accessToken = null) => {
    logger.debug('*** getVerificationSession start ***')

    try {
        const response = await fetchService.handleGet(
            fetchService.verifierApi2,
            `/verification-session/${encodeURIComponent(sessionId)}/info`,
            accessToken
        )

        const result = response.data || {}

        logger.debug('result : ', result)

        return result
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** getVerificationSession end ***')
    }
}




/**
 * Presentation Requestの有効期限を確認する。
 */
const validatePresentationRequest = async (sessionId, accessToken = null) => {
    logger.debug('*** validatePresentationRequest start ***')

    try {
        if (!sessionId) {
            throw new Error('Session ID is required.')
        }

        // Verification Sessionを取得する。
        const session = await getVerificationSession(
            sessionId,
            accessToken
        )

        // Sessionの有効期限切れを確認する。
        if (session.status === 'EXPIRED') {
            throw new Error('Presentation URL has expired.')
        }

        // 未使用のSessionのみ有効期限を確認する。
        if (['ACTIVE', 'UNUSED', 'IN_USE'].includes(session.status)) {
            if (!session.expirationDate) {
                throw new Error('Presentation expiration time is missing.')
            }

            const expirationTime = Date.parse(session.expirationDate)

            if (!Number.isFinite(expirationTime)) {
                throw new Error('Invalid Presentation expiration time.')
            }

            if (Date.now() >= expirationTime) {
                throw new Error('Presentation URL has expired.')
            }
        }

    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** validatePresentationRequest end ***')
    }
}
