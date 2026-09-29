/**
 * リクエストボディから VC 情報を取得する
 */
const getVcFromRequest = (req) => {
  console.debug("*** getVcFromRequest start ***");

  try {
    const body = req.body || {};

    console.debug("request body : ", JSON.stringify(body, null, 2));

    const result =
      body.vc ||
      body.credential ||
      body.verifiableCredential ||
      body.presentedCredential ||
      body.presentedCredentials?.[0] ||
      body.credentialData ||
      body.data?.vc ||
      body.data?.credential ||
      body.data?.verifiableCredential ||
      body.data?.presentedCredential ||
      body.data?.presentedCredentials?.[0] ||
      body.data?.credentialData ||
      body;

    console.debug("vc : ", JSON.stringify(result, null, 2));

    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** getVcFromRequest end ***");
  }
};

/**
 * VC から credentialSubject を取得する
 */
const getCredentialSubject = (vc) => {
  console.debug("*** getCredentialSubject start ***");

  try {
    const result =
      vc.credentialSubject ||
      vc.vc?.credentialSubject ||
      vc.credential?.credentialSubject ||
      vc.verifiableCredential?.credentialSubject ||
      vc.presentedCredential?.credentialSubject ||
      vc.presentedCredentials?.[0]?.credentialSubject ||
      vc.credentialData?.credentialSubject ||
      vc.data?.credentialSubject ||
      vc.data?.vc?.credentialSubject ||
      vc.data?.credential?.credentialSubject ||
      vc.data?.verifiableCredential?.credentialSubject ||
      vc.data?.presentedCredential?.credentialSubject ||
      vc.data?.presentedCredentials?.[0]?.credentialSubject ||
      vc.data?.credentialData?.credentialSubject ||
      {};

    console.debug("credentialSubject : ", JSON.stringify(result, null, 2));

    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** getCredentialSubject end ***");
  }
};

module.exports = {
  getVcFromRequest,
  getCredentialSubject,
};
