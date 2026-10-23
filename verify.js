
// アカウントに関連する Wallet とデフォルト DID・Key の取得
const getWalletList = async (accountId) => {
  logger.debug("*** getWalletList start ***");

  try {
    const sql = `
      SELECT
        aw.wallet_id,
        w.default_did_id,
        w.default_key_id
      FROM public.wallet2_account_wallets aw
      INNER JOIN public.wallet2_wallets w
        ON w.id = aw.wallet_id
      WHERE aw.account_id = $1
      ORDER BY aw.wallet_id
    `;

    const response = await postgresService.executeQuery(
      sql,
      [accountId]
    );

    logger.debug("result : ", {
      walletCount: response.length,
    });

    return response;
  } catch (error) {
    logger.error("error.message: ", error.message);
    logger.error("error.stack: ", error.stack);
    throw error;
  } finally {
    logger.debug("*** getWalletList end ***");
  }
};

// アカウントと Wallet の権限情報の取得
const getWalletPermissions = async (accountId) => {
  logger.debug("*** getWalletPermissions start ***");

  try {
    const sql = `
      SELECT
        wallet_id,
        permissions,
        added_on
      FROM ${postgresService.qt}.account_wallet_permissions
      WHERE account_id = $1
    `;

    const response = await postgresService.executeQuery(
      sql,
      [accountId]
    );

    logger.debug("result : ", {
      permissionCount: response.length,
    });

    return response;
  } catch (error) {
    logger.error("error.message: ", error.message);
    logger.error("error.stack: ", error.stack);
    throw error;
  } finally {
    logger.debug("*** getWalletPermissions end ***");
  }
};

// Wallet に関連する DID の取得
const getWalletDids = async (walletIds) => {
  logger.debug("*** getWalletDids start ***");

  try {
    if (walletIds.length === 0) {
      return [];
    }

    const sql = `
      SELECT DISTINCT
        wds.wallet_id,
        d.did
      FROM public.wallet2_wallet_did_stores wds
      INNER JOIN public.wallet2_dids d
        ON d.store_id = wds.store_id
      WHERE wds.wallet_id = ANY($1::text[])
      ORDER BY wds.wallet_id, d.did
    `;

    const response = await postgresService.executeQuery(
      sql,
      [walletIds]
    );

    logger.debug("result : ", {
      didCount: response.length,
    });

    return response;
  } catch (error) {
    logger.error("error.message: ", error.message);
    logger.error("error.stack: ", error.stack);
    throw error;
  } finally {
    logger.debug("*** getWalletDids end ***");
  }
};

// Wallet に関連する Key ID の取得
const getWalletKeys = async (walletIds) => {
  logger.debug("*** getWalletKeys start ***");

  try {
    if (walletIds.length === 0) {
      return [];
    }

    const sql = `
      SELECT DISTINCT
        wks.wallet_id,
        k.key_id
      FROM public.wallet2_wallet_key_stores wks
      INNER JOIN public.wallet2_keys k
        ON k.store_id = wks.store_id
      WHERE wks.wallet_id = ANY($1::text[])
      ORDER BY wks.wallet_id, k.key_id
    `;

    const response = await postgresService.executeQuery(
      sql,
      [walletIds]
    );

    logger.debug("result : ", {
      keyCount: response.length,
    });

    return response;
  } catch (error) {
    logger.error("error.message: ", error.message);
    logger.error("error.stack: ", error.stack);
    throw error;
  } finally {
    logger.debug("*** getWalletKeys end ***");
  }
};

// アカウントに関連する Wallet・DID・Key の取得
const getWalletsByAccountId = async (accountId) => {
  logger.debug("*** getWalletsByAccountId start ***");

  try {
    if (!accountId) {
      throw new Error("accountId is required");
    }

    const wallets = await getWalletList(accountId);

    if (wallets.length === 0) {
      return [];
    }

    const walletIds = wallets.map((wallet) => wallet.wallet_id);

    const [permissions, dids, keys] = await Promise.all([
      getWalletPermissions(accountId),
      getWalletDids(walletIds),
      getWalletKeys(walletIds),
    ]);

    const permissionMap = new Map(
      permissions.map((row) => [row.wallet_id, row])
    );

    const didMap = new Map();
    const keyMap = new Map();

    for (const row of dids) {
      if (!didMap.has(row.wallet_id)) {
        didMap.set(row.wallet_id, []);
      }

      didMap.get(row.wallet_id).push(row.did);
    }

    for (const row of keys) {
      if (!keyMap.has(row.wallet_id)) {
        keyMap.set(row.wallet_id, []);
      }

      keyMap.get(row.wallet_id).push(row.key_id);
    }

    const result = wallets.map((wallet) => {
      const permission = permissionMap.get(wallet.wallet_id);

      return {
        walletId: wallet.wallet_id,
        defaultDid: wallet.default_did_id ?? null,
        defaultKeyId: wallet.default_key_id ?? null,
        permissions: permission?.permissions ?? null,
        addedOn: permission?.added_on ?? null,
        dids: didMap.get(wallet.wallet_id) || [],
        keyIds: keyMap.get(wallet.wallet_id) || [],
      };
    });

    logger.debug("result : ", result);

    return result;
  } catch (error) {
    logger.error("error.message: ", error.message);
    logger.error("error.stack: ", error.stack);
    throw error;
  } finally {
    logger.debug("*** getWalletsByAccountId end ***");
  }
};
