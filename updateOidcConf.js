import {
  LOCALIZE_PROCESS_TARGET,
} from '@/utils/credentialMetadataUtils';

import {
  getLocalizedCredentialMetadataByIssuer,
} from '@/utils/credentialIssuerMetadataUtils';

import {
  getLocalizedCredentialMetadataByVerifier,
} from '@/utils/credentialVerifierMetadataUtils';

/**
 * issuer + type の metadata key を作成する関数
 *
 * @param {object} cert 証明書データ
 * @returns {string} metadata key
 */
const createIssuerCertMetadataKey = (cert = {}) => {
  console.debug('*** createIssuerCertMetadataKey ***');
  console.debug('cert:', cert);

  const result = JSON.stringify({
    issuer: cert.issuer || '',
    type: cert.type || '',
  });

  console.debug('return:', result);
  return result;
};

/**
 * verifierSiteUrl + type の metadata key を作成する関数
 *
 * @param {object} cert 証明書データ
 * @returns {string} metadata key
 */
const createVerifierCertMetadataKey = (cert = {}) => {
  console.debug('*** createVerifierCertMetadataKey ***');
  console.debug('cert:', cert);

  const result = JSON.stringify({
    verifierSiteUrl: cert.verifierSiteUrl || '',
    type: cert.type || '',
  });

  console.debug('return:', result);
  return result;
};

/**
 * metadata key を parse する関数
 *
 * @param {string} key metadata key
 * @returns {object} parse 後の object
 */
const parseCertMetadataKey = (key = '') => {
  console.debug('*** parseCertMetadataKey ***');
  console.debug('key:', key);

  try {
    const result = JSON.parse(key);

    console.debug('return:', result);
    return result;
  } catch (error) {
    console.error('error.message:', error.message);
    console.error('error.stack:', error.stack);

    console.debug('return:', {});
    return {};
  }
};

/**
 * 証明書一覧に issuer metadata の display / claims 情報を付与する関数
 *
 * @param {Array<object>} certList 証明書一覧
 * @param {string} processTarget 処理対象。all / display / claims
 * @returns {Promise<Array<object>>} display / claims を付与した証明書一覧
 */
export const enrichCredentialListByIssuer = async (
  certList = [],
  processTarget = LOCALIZE_PROCESS_TARGET.ALL
) => {
  console.debug('*** enrichCredentialListByIssuer ***');
  console.debug('certList:', certList);
  console.debug('processTarget:', processTarget);

  if (!Array.isArray(certList) || certList.length === 0) {
    console.debug('return:', []);
    return [];
  }

  const metadataMap = new Map();
  const uniqueMetadataKeys = new Set();

  for (const cert of certList) {
    if (!cert?.issuer || !cert?.type) {
      continue;
    }

    uniqueMetadataKeys.add(createIssuerCertMetadataKey(cert));
  }

  await Promise.all(
    [...uniqueMetadataKeys].map(async (key) => {
      const { issuer, type } = parseCertMetadataKey(key);

      if (!issuer || !type) {
        metadataMap.set(key, {});
        return;
      }

      const credentialMetadata = await getLocalizedCredentialMetadataByIssuer(
        issuer,
        type,
        processTarget
      );

      metadataMap.set(key, credentialMetadata || {});
    })
  );

  const result = certList.map((cert) => {
    const key = createIssuerCertMetadataKey(cert);
    const credentialMetadata = metadataMap.get(key) || {};

    return {
      ...cert,
      typeDisplay: credentialMetadata.display || [],
      claims: credentialMetadata.claims || [],
    };
  });

  console.debug('return:', result);
  return result;
};

/**
 * 証明書一覧に verifier metadata の display / claims 情報を付与する関数
 *
 * certList 自体は去重しない。
 * verifierSiteUrl + type の metadata 取得のみ去重し、取得後に元の certList に回填する。
 *
 * @param {Array<object>} certList 証明書一覧
 * @param {string} processTarget 処理対象。all / display / claims
 * @returns {Promise<Array<object>>} display / claims を付与した証明書一覧
 */
export const enrichCredentialListByVerifier = async (
  certList = [],
  processTarget = LOCALIZE_PROCESS_TARGET.ALL
) => {
  console.debug('*** enrichCredentialListByVerifier ***');
  console.debug('certList:', certList);
  console.debug('processTarget:', processTarget);

  if (!Array.isArray(certList) || certList.length === 0) {
    console.debug('return:', []);
    return [];
  }

  const metadataMap = new Map();
  const uniqueMetadataKeys = new Set();

  for (const cert of certList) {
    if (!cert?.verifierSiteUrl || !cert?.type) {
      continue;
    }

    uniqueMetadataKeys.add(createVerifierCertMetadataKey(cert));
  }

  await Promise.all(
    [...uniqueMetadataKeys].map(async (key) => {
      const { verifierSiteUrl, type } = parseCertMetadataKey(key);

      if (!verifierSiteUrl || !type) {
        metadataMap.set(key, {});
        return;
      }

      const credentialMetadata = await getLocalizedCredentialMetadataByVerifier(
        verifierSiteUrl,
        type,
        processTarget
      );

      metadataMap.set(key, credentialMetadata || {});
    })
  );

  const result = certList.map((cert) => {
    const key = createVerifierCertMetadataKey(cert);
    const credentialMetadata = metadataMap.get(key) || {};

    return {
      ...cert,
      typeDisplay: credentialMetadata.display || [],
      claims: credentialMetadata.claims || [],
    };
  });

  console.debug('return:', result);
  return result;
};
