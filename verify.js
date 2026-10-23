
CREATE TABLE wallet_app.account_wallet_permissions (
    account_id TEXT NOT NULL,
    wallet_id TEXT NOT NULL,
    wallet_name TEXT,
    permissions TEXT,
    added_on TEXT,
    PRIMARY KEY (account_id, wallet_id)
);


// const rows = await sourceClient.query(`
//     SELECT id, wallet, permissions, added_on
//     FROM account_wallet_mapping
// `);


const rows = await sourceClient.query(`
    SELECT
        awm.id,
        awm.wallet,
        w.name AS wallet_name,
        awm.permissions,
        awm.added_on
    FROM account_wallet_mapping awm
    LEFT JOIN wallets w ON w.id = awm.wallet
`);

await targetClient.query(
    `
    INSERT INTO ${targetSchema}.account_wallet_permissions
        (account_id, wallet_id, wallet_name, permissions, added_on)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (account_id, wallet_id)
    DO UPDATE SET
        wallet_name = EXCLUDED.wallet_name,
        permissions = EXCLUDED.permissions,
        added_on = EXCLUDED.added_on
    `,
    [
        row.id,
        row.wallet,
        row.wallet_name,
        row.permissions,
        row.added_on
    ]
);
