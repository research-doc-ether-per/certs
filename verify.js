/**
 * Verifier2 の verificationResult から policy の検証結果のみを抽出する。
 */
const extractPolicyResults = (verificationResult) => {
  console.debug("*** extractPolicyResults start ***");

  try {
    const policyResults = verificationResult?.policy_results;

    const credentials =
      verificationResult?.setup?.core_flow?.dcql_query?.credentials ?? [];

    if (!policyResults) {
      return {
        vp: {},
        vc: {},
      };
    }

    const result = {
      vp: extractVpPolicyResults(
        policyResults.vp_policies
      ),
      vc: extractVcPolicyResults(
        policyResults.vc_policies,
        policyResults.specific_vc_policies,
        credentials
      ),
    };

    console.debug("Extracted Policy Result : ");
    console.debug(JSON.stringify(result, null, 2));

    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** extractPolicyResults end ***");
  }
};

/**
 * VP policy の検証結果を抽出する。
 *
 * policy ID は format を含めてそのまま使用する。
 *
 * 例:
 * jwt_vc_json/audience-check
 * dc+sd-jwt/kb-jwt-signature
 */
const extractVpPolicyResults = (vpPolicies) => {
  const result = {};

  if (!vpPolicies) {
    return result;
  }

  for (const presentationPolicies of Object.values(vpPolicies)) {
    if (!presentationPolicies) {
      continue;
    }

    for (const policyResult of Object.values(presentationPolicies)) {
      const policyId = policyResult?.policy_executed?.id;

      if (!policyId) {
        continue;
      }

      result[policyId] =
        policyResult.success === true;
    }
  }

  return result;
};

/**
 * VC policy / specific VC policy の検証結果を抽出する。
 */
const extractVcPolicyResults = (
  vcPolicies,
  specificVcPolicies,
  credentials
) => {
  const result = {};

  // 共通 VC policy
  addVcPolicyResults(
    result,
    vcPolicies,
    credentials
  );

  // Credential ごとの specific VC policy
  if (specificVcPolicies) {
    for (const policyResults of Object.values(specificVcPolicies)) {
      addVcPolicyResults(
        result,
        policyResults,
        credentials
      );
    }
  }

  return result;
};

/**
 * VC policy の検証結果を追加する。
 */
const addVcPolicyResults = (
  result,
  policyResults,
  credentials
) => {
  if (!Array.isArray(policyResults)) {
    return;
  }

  for (const policyResult of policyResults) {
    const queryId = policyResult?.query_id;

    if (!queryId) {
      continue;
    }

    const credentialType = getCredentialType(
      queryId,
      credentials
    );

    if (!credentialType) {
      continue;
    }

    if (!result[credentialType]) {
      result[credentialType] = {};
    }

    const policyKey =
      getVcPolicyKey(policyResult);

    if (!policyKey) {
      continue;
    }

    result[credentialType][policyKey] =
      policyResult.success === true;
  }
};

/**
 * VC policy の識別キーを生成する。
 *
 * regex は複数設定できるため、
 * path を付与して区別する。
 *
 * 例:
 * regex + $.credentialSubject.category
 *   -> regex:credentialSubject.category
 */
const getVcPolicyKey = (policyResult) => {
  const policy = policyResult?.policy;

  if (!policy) {
    return null;
  }

  const policyId =
    policy.id ??
    policy.policy ??
    policy.type;

  if (!policyId) {
    return null;
  }

  if (policyId === "regex" && policy.path) {
    return `regex:${normalizeJsonPath(policy.path)}`;
  }

  return policyId;
};

/**
 * JSONPath の先頭 "$." を除去する。
 *
 * 例:
 * $.credentialSubject.category
 *   -> credentialSubject.category
 */
const normalizeJsonPath = (path) => {
  return path.replace(/^\$\./, "");
};

/**
 * query_id に対応する DCQL Credential から
 * Credential type を取得する。
 *
 * jwt_vc_json:
 *   meta.type_values から取得
 *
 * dc+sd-jwt:
 *   meta.vct_values の URI 末尾から取得
 */
const getCredentialType = (
  queryId,
  credentials
) => {
  if (!queryId || !Array.isArray(credentials)) {
    return null;
  }

  const credential = credentials.find(
    (item) => item.id === queryId
  );

  // 対応する Credential が見つからない場合
  if (!credential) {
    return queryId;
  }

  // JWT VC
  //
  // 例:
  // meta: {
  //   type_values: [
  //     ["Awards"]
  //   ]
  // }
  const typeValue =
    credential.meta?.type_values?.[0]?.[0];

  if (typeValue) {
    return typeValue;
  }

  // SD-JWT VC
  //
  // 例:
  // meta: {
  //   vct_values: [
  //     "http://10.0.2.15:7005/openid4vci/Career"
  //   ]
  // }
  const vct =
    credential.meta?.vct_values?.[0];

  if (vct) {
    return vct.substring(
      vct.lastIndexOf("/") + 1
    );
  }

  // Credential type を特定できない場合
  return queryId;
};
