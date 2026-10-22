
// アカウントに関連する Wallet と DID の取得
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
        d.did
      FROM public.wallet2_account_wallets w
      LEFT JOIN ${qt}.account_wallet_permissions p
        ON p.account_id = w.account_id
       AND p.wallet_id = w.wallet_id
      LEFT JOIN public.wallet2_wallet_did_stores wds
        ON wds.wallet_id = w.wallet_id
      LEFT JOIN public.wallet2_dids d
        ON d.store_id = wds.store_id
      WHERE w.account_id = $1
      ORDER BY w.wallet_id, d.did
    `;

    const response = await executeQuery(sql, [accountId]);

    const walletMap = new Map();

    for (const row of response) {
      if (!walletMap.has(row.wallet_id)) {
        walletMap.set(row.wallet_id, {
          walletId: row.wallet_id,
          permissions: row.permissions,
          addedOn: row.added_on,
          dids: [],
        });
      }

      const wallet = walletMap.get(row.wallet_id);

      if (row.did && !wallet.dids.includes(row.did)) {
        wallet.dids.push(row.did);
      }
    }

    const result = Array.from(walletMap.values());

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
