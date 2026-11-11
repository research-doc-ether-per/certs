// 現在の主キー構成を取得する
const getPrimaryKey = async () => {
    const response = await cloudWallet.query(
        `
        SELECT
            c.conname,
            json_agg(a.attname ORDER BY k.ord) AS columns
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        JOIN unnest(c.conkey) WITH ORDINALITY k(attnum, ord) ON TRUE
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
        WHERE n.nspname = $1
          AND t.relname = 'priv_wallets'
          AND c.contype = 'p'
        GROUP BY c.conname
        `,
        [targetSchemaName]
    )

    if (response.rows.length !== 1) {
        throw new Error('priv_wallets PRIMARY KEY not found')
    }

    logger.debug('response.rows: ', JSON.stringify(response.rows, null, 2))

    return response.rows[0]
}

// 一度移行済みのテーブルには旧Migrationを再適用しない
const assertOldStructure = async () => {
    const pk = await getPrimaryKey()

    logger.debug('pk: ', JSON.stringify(pk, null, 2))

    if (!Array.isArray(pk.columns) ||
        JSON.stringify(pk.columns) !== JSON.stringify(['user_id'])) {
        throw new Error(
            'priv_wallets is not in old 1:1 schema. This migration is for initial migration only'
        )
    }

    return pk.conname
}
