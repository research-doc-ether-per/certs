const vcStatusConfig = {
  url: "http://YOUR-VC-REGISTRY-HOST",
  apis: {
    createBSL: "/issuers/:issuerDid/bsl",
    assignIndex: "/issuers/:issuerDid/bsl/assignIndex",
  },
};


app.get(
  "/webhook/credential-status",
  credentialService.getCredentialStatus
);

/**
 * Credential Statusを取得する。
 */
const getCredentialStatus = async (req, res) => {
  logger.debug("*** getCredentialStatus start ***");

  try {
    logger.debug("method : ", req.method);
    logger.debug("url : ", req.originalUrl);
    logger.debug("params : ", req.params);
    logger.debug("query : ", req.query);
    logger.debug("headers : ", req.headers);

    const { type, issuerDid, credentialId } = req.query;

    if (
      typeof type !== "string" ||
      typeof issuerDid !== "string" ||
      typeof credentialId !== "string" ||
      !type.trim() ||
      !issuerDid.trim() ||
      !credentialId.trim()
    ) {
      return res.status(400).json({
        error: "type, issuerDid and credentialId are required.",
      });
    }

    const assignResults = await assignBSLIndex(
      type,
      issuerDid,
      credentialId
    );

    const result = await createCredentialStatus(
      issuerDid,
      assignResults
    );

    logger.debug("result : ", result);

    return res.json(result);
  } catch (error) {
    logger.error("error.message: ", error.message);
    logger.error("error.stack: ", error.stack);

    return res.status(500).json({
      error: "Failed to create credential status.",
    });
  } finally {
    logger.debug("*** getCredentialStatus end ***");
  }
};


module.exports = {
  getCredentialString,
  getCredentialJson,
  getCredentialStatus,
};


/**
 * VC Registry API経由でBSLのIndexを取得する。
 * @param {string} type Credential Type
 * @param {string} issuerDid Issuer DID
 * @param {string} credentialId Credential ID
 * @returns {Array} Index割当結果
 */
const assignBSLIndex = async (type, issuerDid, credentialId) => {
  logger.debug("*** assignBSLIndex start ***");
  logger.debug("type: ", type);
  logger.debug("issuerDid: ", issuerDid);
  logger.debug("credentialId: ", credentialId);

  try {
    // VC Registry APIのトークンを取得
    const access_token = await keycloakService.getVcRegistryApiToken();

    // Indexを割り当てる
    const api = vcStatusConfig.apis.assignIndex.replace(
      ":issuerDid",
      encodeURIComponent(issuerDid)
    );
    const url = vcStatusConfig.url + api;

    const response = await fetchService.handlePost(
      vcStatusApi,
      url,
      access_token,
      {
        vc_type: type,
        vc_id: credentialId,
      }
    );

    const data = response?.data ?? [];
    const status = response?.status ?? 500;

    logger.debug("response?.data : ", data);
    logger.debug("response?.status : ", status);

    if (status !== 200 || !Array.isArray(data) || data.length === 0) {
      const error = new Error("No BSL index information found.");
      error.status = status;
      throw error;
    }

    return data;
  } catch (error) {
    logger.error("error.message: ", error.message);
    logger.error("error.stack: ", error.stack);
    throw error;
  } finally {
    logger.debug("*** assignBSLIndex end ***");
  }
};


/**
 * Index割当結果からcredentialStatusを生成する。
 * @param {string} issuerDid Issuer DID
 * @param {Array} assignResults Index割当結果
 * @returns {Array} credentialStatus
 */
const createCredentialStatus = async (issuerDid, assignResults) => {
  logger.debug("*** createCredentialStatus start ***");

  try {
    const result = assignResults
      .filter((item) => item.statusPurpose === "revocation")
      .map((item) => {
        if (!item.bslVcUrl || item.index === undefined || item.index === null) {
          throw new Error("Invalid assignIndex response.");
        }

        const statusListCredential = [
          vcStatusConfig.url.replace(/\/$/, ""),
          "issuers",
          encodeURIComponent(issuerDid),
          "bsl",
          "vcUrls",
          encodeURIComponent(item.bslVcUrl),
          "credential",
          "jwt",
        ].join("/");

        const statusListIndex = String(item.index);

        return {
          id: `${statusListCredential}#${statusListIndex}`,
          type: "BitstringStatusListEntry",
          statusPurpose: item.statusPurpose,
          statusListIndex,
          statusListCredential,
          statusSize: 1,
        };
      });

    if (result.length === 0) {
      throw new Error("No revocation status entry returned from assignIndex.");
    }

    logger.debug("result : ", result);

    return result;
  } catch (error) {
    logger.error("error.message: ", error.message);
    logger.error("error.stack: ", error.stack);
    throw error;
  } finally {
    logger.debug("*** createCredentialStatus end ***");
  }
};

const { randomUUID } = require("crypto");

const credentialId = `urn:uuid:${randomUUID()}`;
const type = "Career";
const issuerDid = "did:web:10.0.2.15%3A6102:dids:issuer01";

const params = new URLSearchParams({
  type,
  issuerDid,
  credentialId,
});

const webhookUrl = `http://10.0.2.15:5105/webhook/credential-status?${params.toString()}`;

const mapping = {
  id: credentialId,
  issuer: {
    id: "<issuerDid>",
  },
  credentialSubject: {
    id: "<subjectDid>",
  },
  credentialStatus: `<webhook-json:${webhookUrl}>`,
  issuanceDate: "<timestamp>",
  expirationDate: "<timestamp-in:365d>",
};
