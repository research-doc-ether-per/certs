// Wallet 権限情報の移行
const migratePermissions = async (row) => {
    logger.debug('*** migratePermissions start ***')

    try {
        const accountId = getTextField(row, 'id')
        const walletId = getTextField(row, 'wallet')

        if (!accountId || !walletId) {
            throw new Error('account_wallet_mapping.id or wallet is missing')
        }

        const walletResponse = await source.query(
            `SELECT name FROM public.wallets WHERE id = $1`,
            [walletId]
        )

        const walletName = walletResponse.rows[0]?.name ?? null

        const response = await target.query(
            `
            INSERT INTO ${qt}.account_wallet_permissions (
                account_id,
                wallet_id,
                wallet_name,
                permissions,
                added_on
            )
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (account_id, wallet_id)
            DO UPDATE SET
                wallet_name = EXCLUDED.wallet_name,
                permissions = EXCLUDED.permissions,
                added_on = EXCLUDED.added_on
            `,
            [
                accountId,
                walletId,
                walletName,
                getTextField(row, 'permissions'),
                getTextField(row, 'added_on', 'addedOn'),
            ]
        )

        const result = {
            accountId,
            walletId,
            walletName,
            migrated: response.rowCount === 1,
        }

        logger.debug('result : ', result)

        return result
    } catch (error) {
        logError(error)
        throw error
    } finally {
        logger.debug('*** migratePermissions end ***')
    }
}
