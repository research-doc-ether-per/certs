/**
 * 指定した DID を Wallet の Default DID に設定します。
 */
const setDefaultDid = async (
  walletId,
  did,
  accessToken = null
) => {
  console.debug("*** setDefaultDid start ***");

  try {
    const response = await fetchService.handlePut(
      fetchService.walletApi2,
      `/wallet/${walletId}/dids/${encodeURIComponent(did)}/set-default`,
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
    console.debug("*** setDefaultDid end ***");
  }
};

/**
 * 指定した DID を Wallet から削除します。
 */
const deleteDid = async (
  walletId,
  did,
  accessToken = null
) => {
  console.debug("*** deleteDid start ***");

  try {
    const response = await fetchService.handleDelete(
      fetchService.walletApi2,
      `/wallet/${walletId}/dids/${encodeURIComponent(did)}`,
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
    console.debug("*** deleteDid end ***");
  }
};



// 10. Default DID 設定
console.log("\n===== 10. Default DID 設定 =====");

const defaultDidResult =
  await wallet2Services.setDefaultDid(
    walletId,
    didJwk.did,
    accessToken
  );

console.log(
  "defaultDidResult : ",
  defaultDidResult
);

// DID 削除確認
console.log("\n===== DID 削除確認 =====");

const deleteDidResult = await wallet2Services.deleteDid(
  walletId,
  didWeb.did,
  accessToken
);

console.log("deleteDidResult : ", deleteDidResult);
