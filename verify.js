
const wallet2Service = require("./services/wallet2-services");

const DOMAIN = "10.0.2.15:5101";
const DID_PATH = "dids/issuer01";

/**
 * Issuer 用の Wallet、Key、DID を作成する。
 */
const createIssuerDid = async () => {
  console.debug("=== createIssuerDid start ===");

  try {
    // Wallet を作成
    console.log("Wallet を作成します。");

    const wallet = await wallet2Service.createWallet();
    const walletId = wallet.walletId;

    console.log("walletId : ", walletId);

    // secp256r1 Key を生成
    console.log("secp256r1 Key を生成します。");

    const key = await wallet2Service.generateKey(walletId, {
      backend: "jwk",
      keyType: "secp256r1",
    });

    const keyId = key.keyId;

    console.log("keyId : ", keyId);

    // Default Key に設定
    console.log("Default Key に設定します。");

    await wallet2Service.setDefaultKey(walletId, keyId);

    // did:web を作成
    console.log("did:web を作成します。");

    const didResult = await wallet2Service.createDid(walletId, {
      method: "web",
      keyId: keyId,
      options: {
        domain: DOMAIN,
        path: DID_PATH,
      },
    });

    const did = didResult.did;

    console.log("did : ", did);

    // Default DID に設定
    console.log("Default DID に設定します。");

    await wallet2Service.setDefaultDid(walletId, did);

    // Wallet 情報を取得
    console.log("Wallet 情報を確認します。");

    const walletInfo = await wallet2Service.getWallet(walletId);

    // Key 情報を取得
    console.log("Key 情報を確認します。");

    const keyInfo = await wallet2Service.getKey(walletId, keyId);

    // DID 情報を取得
    console.log("DID 情報を確認します。");

    const dids = await wallet2Service.getDids(walletId);

    const result = {
      walletId,
      keyId,
      issuerDid: did,
      defaultKeyId: walletInfo.defaultKeyId,
      defaultDidId: walletInfo.defaultDidId,
      key: keyInfo,
      dids,
    };

    console.log("");
    console.log("========================================");
    console.log("Issuer DID 作成結果");
    console.log("========================================");
    console.log("walletId     : ", result.walletId);
    console.log("keyId        : ", result.keyId);
    console.log("issuerDid    : ", result.issuerDid);
    console.log("defaultKeyId : ", result.defaultKeyId);
    console.log("defaultDidId : ", result.defaultDidId);

    console.log("");
    console.log("result : ");
    console.log(JSON.stringify(result, null, 2));

    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("=== createIssuerDid end ===");
  }
};

createIssuerDid();
