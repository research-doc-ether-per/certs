import fetchService from "../fetch-service.js";

/**
 * Wallet を作成します。
 */
const createWallet = async (accessToken = null) => {
  console.debug("*** createWallet start ***");

  try {
    const response = await fetchService.handlePost(
      fetchService.walletApi2,
      "/wallet",
      accessToken,
      {}
    );

    const result = response.data || {};
    console.debug("result : ", result);

    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** createWallet end ***");
  }
};

/**
 * Wallet 一覧を取得します。
 */
const getWallets = async (accessToken = null) => {
  console.debug("*** getWallets start ***");

  try {
    const response = await fetchService.handleGet(
      fetchService.walletApi2,
      "/wallet",
      accessToken
    );

    const result = response.data || {};
    console.debug("result : ", result);

    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** getWallets end ***");
  }
};

/**
 * 指定した Wallet の詳細情報を取得します。
 */
const getWallet = async (walletId, accessToken = null) => {
  console.debug("*** getWallet start ***");

  try {
    const response = await fetchService.handleGet(
      fetchService.walletApi2,
      `/wallet/${walletId}`,
      accessToken
    );

    const result = response.data || {};
    console.debug("result : ", result);

    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** getWallet end ***");
  }
};

/**
 * 指定した Wallet を削除します。
 */
const deleteWallet = async (walletId, accessToken = null) => {
  console.debug("*** deleteWallet start ***");

  try {
    const response = await fetchService.handleDelete(
      fetchService.walletApi2,
      `/wallet/${walletId}`,
      accessToken
    );

    const result = response.data || {};
    console.debug("result : ", result);

    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** deleteWallet end ***");
  }
};

/**
 * Wallet に Key を生成します。
 *
 * デフォルトでは JWK Backend を使用して、
 * secp256r1(P-256) Key を生成します。
 */
const generateKey = async (
  walletId,
  accessToken = null,
  keyType = "secp256r1"
) => {
  console.debug("*** generateKey start ***");

  try {
    const params = {
      backend: "jwk",
      keyType,
    };

    const response = await fetchService.handlePost(
      fetchService.walletApi2,
      `/wallet/${walletId}/keys/generate`,
      accessToken,
      params
    );

    const result = response.data || {};
    console.debug("result : ", result);

    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** generateKey end ***");
  }
};

/**
 * Wallet に登録されている Key 一覧を取得します。
 */
const getKeys = async (walletId, accessToken = null) => {
  console.debug("*** getKeys start ***");

  try {
    const response = await fetchService.handleGet(
      fetchService.walletApi2,
      `/wallet/${walletId}/keys`,
      accessToken
    );

    const result = response.data || {};
    console.debug("result : ", result);

    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** getKeys end ***");
  }
};

/**
 * 指定した Key の情報を取得します。
 */
const getKey = async (
  walletId,
  keyId,
  accessToken = null
) => {
  console.debug("*** getKey start ***");

  try {
    const response = await fetchService.handleGet(
      fetchService.walletApi2,
      `/wallet/${walletId}/keys/${encodeURIComponent(keyId)}`,
      accessToken
    );

    const result = response.data || {};
    console.debug("result : ", result);

    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** getKey end ***");
  }
};

/**
 * 指定した Key を Wallet の Default Key に設定します。
 */
const setDefaultKey = async (
  walletId,
  keyId,
  accessToken = null
) => {
  console.debug("*** setDefaultKey start ***");

  try {
    const response = await fetchService.handlePut(
      fetchService.walletApi2,
      `/wallet/${walletId}/keys/${encodeURIComponent(keyId)}/set-default`,
      accessToken,
      {}
    );

    const result = response.data || {};
    console.debug("result : ", result);

    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** setDefaultKey end ***");
  }
};

/**
 * 指定した Key を削除します。
 */
const deleteKey = async (
  walletId,
  keyId,
  accessToken = null
) => {
  console.debug("*** deleteKey start ***");

  try {
    const response = await fetchService.handleDelete(
      fetchService.walletApi2,
      `/wallet/${walletId}/keys/${encodeURIComponent(keyId)}`,
      accessToken
    );

    const result = response.data || {};
    console.debug("result : ", result);

    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** deleteKey end ***");
  }
};

/**
 * Wallet に DID を作成します。
 *
 * デフォルトでは did:key を作成します。
 */
const createDid = async (
  walletId,
  keyId,
  accessToken = null,
  method = "key",
  options = {}
) => {
  console.debug("*** createDid start ***");

  try {
    const params = {
      method,
      keyId,
      options,
    };

    const response = await fetchService.handlePost(
      fetchService.walletApi2,
      `/wallet/${walletId}/dids/create`,
      accessToken,
      params
    );

    const result = response.data || {};
    console.debug("result : ", result);

    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** createDid end ***");
  }
};

/**
 * Wallet に登録されている DID 一覧を取得します。
 */
const getDids = async (walletId, accessToken = null) => {
  console.debug("*** getDids start ***");

  try {
    const response = await fetchService.handleGet(
      fetchService.walletApi2,
      `/wallet/${walletId}/dids`,
      accessToken
    );

    const result = response.data || {};
    console.debug("result : ", result);

    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** getDids end ***");
  }
};

export default {
  createWallet,
  getWallets,
  getWallet,
  deleteWallet,

  generateKey,
  getKeys,
  getKey,
  setDefaultKey,
  deleteKey,

  createDid,
  getDids,
};
