/**
 * Verifier2 の verificationResult から policy の検証結果のみを抽出する。
 */
const extractPolicyResults = (verificationResult) => {
  console.debug("*** extractPolicyResults start ***");

  try {
    const policyResults = verificationResult?.policy_results;

    if (!policyResults) {
      return {
        vp: {},
        vc: {},
      };
    }

    const result = {
      vp: extractVpPolicyResults(policyResults.vp_policies),
      vc: extractVcPolicyResults(
        policyResults.vc_policies,
        policyResults.specific_vc_policies
      ),
    };

    console.debug("result : ", result);

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

      // format を含む policy ID をそのまま使用する
      result[policyId] = policyResult.success === true;
    }
  }

  return result;
};

/**
 * VC policy / specific VC policy の検証結果を抽出する。
 */
const extractVcPolicyResults = (vcPolicies, specificVcPolicies) => {
  const result = {};

  // 共通 VC policy
  addVcPolicyResults(result, vcPolicies);

  // Credential ごとの specific VC policy
  if (specificVcPolicies) {
    for (const policyResults of Object.values(specificVcPolicies)) {
      addVcPolicyResults(result, policyResults);
    }
  }

  return result;
};

/**
 * VC policy の検証結果を追加する。
 */
const addVcPolicyResults = (result, policyResults) => {
  if (!Array.isArray(policyResults)) {
    return;
  }

  for (const policyResult of policyResults) {
    const queryId = policyResult?.query_id;

    if (!queryId) {
      continue;
    }

    const credentialType = getCredentialType(queryId);

    if (!credentialType) {
      continue;
    }

    if (!result[credentialType]) {
      result[credentialType] = {};
    }

    const policyKey = getVcPolicyKey(policyResult);

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
 * $.credentialSubject.category
 *   -> credentialSubject.category
 */
const normalizeJsonPath = (path) => {
  return path.replace(/^\$\./, "");
};

/**
 * query_id から Credential type を取得する。
 *
 * 例:
 * Awards_jwt_vc_json -> Awards
 * Career_dc+sd-jwt   -> Career
 */
const getCredentialType = (queryId) => {
  if (!queryId) {
    return null;
  }

  const formatSuffixes = [
    "_jwt_vc_json",
    "_dc+sd-jwt",
  ];

  for (const suffix of formatSuffixes) {
    if (queryId.endsWith(suffix)) {
      return queryId.slice(0, -suffix.length);
    }
  }

  // 想定外の query_id の場合はそのまま使用する
  return queryId;
};
