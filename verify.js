const { decodeJwt } = require("jose");

// OIDC アカウントと Wallet の移行データ確認
const checkOidcMapping = async (accessToken) => {
  logger.debug("*** checkOidcMapping start ***");

  try {
    if (!accessToken) {
      throw new Error("Access Token is required");
    }

    const claims = decodeJwt(accessToken);
    const oidcId = claims.sub;

    if (!oidcId) {
      throw new Error("OIDC subject is missing");
    }

    const account = await getAccountByOidcId(oidcId);

    if (!account) {
      throw new Error("OIDC account not found");
    }

    const wallets = await getWalletsByAccountId(
      account.account_id
    );

    const result = {
      accountId: account.account_id,
      wallets,
    };

    logger.debug("result : ", {
      accountId: result.accountId,
      walletCount: wallets.length,
      tokenVerified: false,
    });

    return result;
  } catch (error) {
    logger.error("error.message: ", error.message);
    logger.error("error.stack: ", error.stack);
    throw error;
  } finally {
    logger.debug("*** checkOidcMapping end ***");
  }
};
