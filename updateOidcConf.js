
import {
  LOCALIZE_PROCESS_TARGET,
} from '@/utils/credentialMetadataUtils';

import {
  getLocalizedCredentialMetadataByIssuer,
} from '@/utils/credentialIssuerMetadataUtils';

/**
 * issuer + type の metadata key を作成する関数
 *
 * @param {object} cert 証明書データ
 * @returns {string} metadata key
 */
const createCertMetadataKey = (cert = {}) => {
  console.debug('*** createCertMetadataKey ***');
  console.debug('cert:', cert);

  const result = JSON.stringify({
    issuer: cert.issuer || '',
    type: cert.type || '',
  });

  console.debug('return:', result);
  return result;
};

/**
 * metadata key から issuer / type を取得する関数
 *
 * @param {string} key metadata key
 * @returns {object} issuer / type を含む object
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

    const result = {
      issuer: '',
      type: '',
    };

    console.debug('return:', result);
    return result;
  }
};

/**
 * 証明書一覧に issuer metadata の display / claims 情報を付与する関数
 *
 * certList 自体は去重しない。
 * issuer + type の metadata 取得のみ去重し、取得後に元の certList に回填する。
 *
 * @param {Array<object>} certList 証明書一覧
 * @returns {Promise<Array<object>>} display / claims を付与した証明書一覧
 */
export const enrichCredentialList = async (certList = []) => {
  console.debug('*** enrichCredentialList ***');
  console.debug('certList:', certList);

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

    uniqueMetadataKeys.add(createCertMetadataKey(cert));
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
        LOCALIZE_PROCESS_TARGET.ALL
      );

      metadataMap.set(key, credentialMetadata || {});
    })
  );

  const result = certList.map((cert) => {
    const key = createCertMetadataKey(cert);
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
