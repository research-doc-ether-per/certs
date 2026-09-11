
import wallet2Services from "../services/wallet2-services.js";

/**
 * Wallet2 Wallet / Key / DID 作成確認
 *
 * Wallet をデフォルト設定で作成し、
 * Key、DID を順番に作成して一連の動作を確認します。
 */
const main = async () => {
  console.debug("*** wallet2-wallet-create start ***");

  try {
    const accessToken = process.env.WALLET2_ACCESS_TOKEN || null;

    // 1. Wallet 作成
    console.log("\n===== 1. Wallet 作成 =====");

    const wallet = await wallet2Services.createWallet(
      accessToken
    );

    const walletId = wallet.walletId;

    if (!walletId) {
      throw new Error("walletId is not found.");
    }

    console.log("walletId : ", walletId);

    // 2. Wallet 詳細確認
    console.log("\n===== 2. Wallet 詳細確認 =====");

    const walletInfoBefore = await wallet2Services.getWallet(
      walletId,
      accessToken
    );

    console.log("walletInfoBefore : ", walletInfoBefore);

    // 3. Key 作成
    console.log("\n===== 3. Key 作成 =====");

    const key = await wallet2Services.generateKey(
      walletId,
      accessToken
    );

    const keyId = key.keyId;

    if (!keyId) {
      throw new Error("keyId is not found.");
    }

    console.log("keyId : ", keyId);

    // 4. Key 一覧確認
    console.log("\n===== 4. Key 一覧確認 =====");

    const keys = await wallet2Services.getKeys(
      walletId,
      accessToken
    );

    console.log("keys : ", keys);

    // 5. Key 詳細確認
    console.log("\n===== 5. Key 詳細確認 =====");

    const keyInfo = await wallet2Services.getKey(
      walletId,
      keyId,
      accessToken
    );

    console.log("keyInfo : ", keyInfo);

    // 6. Default Key 設定
    console.log("\n===== 6. Default Key 設定 =====");

    const defaultKeyResult =
      await wallet2Services.setDefaultKey(
        walletId,
        keyId,
        accessToken
      );

    console.log(
      "defaultKeyResult : ",
      defaultKeyResult
    );

    // 7. DID 作成
    console.log("\n===== 7. DID 作成 =====");

    const did = await wallet2Services.createDid(
      walletId,
      keyId,
      accessToken
    );

    console.log("did : ", did);

    // 8. DID 一覧確認
    console.log("\n===== 8. DID 一覧確認 =====");

    const dids = await wallet2Services.getDids(
      walletId,
      accessToken
    );

    console.log("dids : ", dids);

    // 9. Wallet 最終確認
    console.log("\n===== 9. Wallet 最終確認 =====");

    const walletInfoAfter =
      await wallet2Services.getWallet(
        walletId,
        accessToken
      );

    console.log(
      "walletInfoAfter : ",
      walletInfoAfter
    );

    // 10. Wallet 一覧確認
    console.log("\n===== 10. Wallet 一覧確認 =====");

    const wallets = await wallet2Services.getWallets(
      accessToken
    );

    console.log("wallets : ", wallets);

    // 11. 確認結果
    const result = {
      walletId,
      keyId,
      wallet,
      walletInfoBefore,
      key,
      keys,
      keyInfo,
      defaultKeyResult,
      did,
      dids,
      walletInfoAfter,
      wallets,
    };

    console.log(
      "\n===== Wallet / Key / DID 作成確認結果 ====="
    );
    console.log("result : ", result);

    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** wallet2-wallet-create end ***");
  }
};

main().catch((error) => {
  console.error("error.message: ", error.message);
  console.error("error.stack: ", error.stack);
  process.exit(1);
});
