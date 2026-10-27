/**
 * Presentation Requestの有効期限を確認する。
 */
const validatePresentationRequest = async (sessionId, accessToken = null) => {
    logger.debug('*** validatePresentationRequest start ***')

    try {
        if (!sessionId) {
            throw new Error('Session ID is required.')
        }

        let session

        try {
            session = await getVerificationSession(sessionId, accessToken)
        } catch (error) {
            const status = error.response?.status

            if (status === 404) {
                throw new Error('Verification Session not found or expired.')
            }

            throw error
        }

        // Sessionが取得できた場合
        if (session.status === 'EXPIRED') {
            throw new Error('Presentation URL has expired.')
        }

        return session

    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** validatePresentationRequest end ***')
    }
}
