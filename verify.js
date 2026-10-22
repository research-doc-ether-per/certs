
// アカウントに関連する Wallet・DID・Key の取得
const getWalletsByAccountId = async (accountId) => {
  console.debug("*** getWalletsByAccountId start ***");

  try {
    if (!accountId) {
      throw new Error("accountId is required");
    }

    const sql = `
      SELECT
        w.wallet_id,
        p.permissions,
        p.added_on,
        (
          SELECT COALESCE(
            jsonb_agg(DISTINCT d.did),
            '[]'::jsonb
          )
          FROM public.wallet2_wallet_did_stores wds
          JOIN public.wallet2_dids d
            ON d.store_id = wds.store_id
          WHERE wds.wallet_id = w.wallet_id
        ) AS dids,
        (
          SELECT COALESCE(
            jsonb_agg(DISTINCT k.key_id),
            '[]'::jsonb
          )
          FROM public.wallet2_wallet_key_stores wks
          JOIN public.wallet2_keys k
            ON k.store_id = wks.store_id
          WHERE wks.wallet_id = w.wallet_id
        ) AS key_ids
      FROM public.wallet2_account_wallets w
      LEFT JOIN ${qt}.account_wallet_permissions p
        ON p.account_id = w.account_id
       AND p.wallet_id = w.wallet_id
      WHERE w.account_id = $1
      ORDER BY w.wallet_id
    `;

    const response = await executeQuery(sql, [accountId]);

    const result = response.map((row) => ({
      walletId: row.wallet_id,
      permissions: row.permissions,
      addedOn: row.added_on,
      dids: row.dids || [],
      keyIds: row.key_ids || [],
    }));

    console.debug("result : ", result);

    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** getWalletsByAccountId end ***");
  }
};
