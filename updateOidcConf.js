
/**
 * credentialVerifierMetadataUtils.js
 */

import axios from 'axios';

import {
  LOCALIZE_PROCESS_TARGET,
  localizeSupportedCredentialTypes,
} from '@/utils/credentialMetadataUtils';

/**
 * verifier metadata の取得先 path
 */
const VERIFIER_METADATA_PATH = '/.well-known/openid-credential-verifier';

/**
 * verifier metadata の取得結果を保持するキャッシュ
 */
const verifierMetadataCache = new Map();

/**
 * 処理中の verifier metadata request を保持する Map
 */
const pendingVerifierMetadataRequestMap = new Map();

/**
 * locale 処理後の credential_metadata を保持するキャッシュ
 */
const localizedVerifierCredentialMetadataCache = new Map();

/**
 * GET リクエストを実行する共通関数
 *
 * @param {string} url 取得対象 URL
 * @returns {Promise<object>} status と data を含むレスポンス object
 */
const handleGet = async (url = '') => {
  console.debug('*** verifier handleGet ***');
  console.debug('url:', url);

  if (!url) {
    const result = {
      status: 400,
      data: null,
    };

    console.debug('return:', result);
    return result;
  }

  try {
    const response = await axios.get(url, {
      timeout: 10000,
      validateStatus: () => true,
      headers: {
        Accept: 'application/json',
      },
    });

    const result = {
      status: response.status,
      data: response.data,
    };

    console.debug('return:', result);
    return result;
  } catch (error) {
    console.error('error.message:', error.message);
    console.error('error.stack:', error.stack);

    const result = {
      status: error.response?.status || 500,
      data: error.response?.data || null,
      error,
    };

    console.debug('return:', result);
    return result;
  }
};

/**
 * verifierSiteUrl を正規化する関数
 *
 * @param {string} verifierSiteUrl verifier の Web サイト URL
 * @returns {string} 末尾の slash を除外した verifierSiteUrl
 */
const normalizeVerifierSiteUrl = (verifierSiteUrl = '') => {
  console.debug('*** normalizeVerifierSiteUrl ***');
  console.debug('verifierSiteUrl:', verifierSiteUrl);

  if (!verifierSiteUrl || typeof verifierSiteUrl !== 'string') {
    console.debug('return:', '');
    return '';
  }

  const result = verifierSiteUrl.replace(/\/+$/, '');

  console.debug('return:', result);
  return result;
};

/**
 * verifier metadata URL を作成する関数
 *
 * @param {string} verifierSiteUrl verifier の Web サイト URL
 * @returns {string} verifier metadata URL
 */
const createVerifierMetadataUrl = (verifierSiteUrl = '') => {
  console.debug('*** createVerifierMetadataUrl ***');
  console.debug('verifierSiteUrl:', verifierSiteUrl);

  const normalizedVerifierSiteUrl = normalizeVerifierSiteUrl(verifierSiteUrl);

  if (!normalizedVerifierSiteUrl) {
    console.debug('return:', '');
    return '';
  }

  const result = `${normalizedVerifierSiteUrl}${VERIFIER_METADATA_PATH}`;

  console.debug('return:', result);
  return result;
};

/**
 * verifierSiteUrl から metadata cache key を作成する関数
 *
 * @param {string} verifierSiteUrl verifier の Web サイト URL
 * @returns {string} cache key
 */
const createVerifierMetadataCacheKey = (verifierSiteUrl = '') => {
  console.debug('*** createVerifierMetadataCacheKey ***');
  console.debug('verifierSiteUrl:', verifierSiteUrl);

  const result = normalizeVerifierSiteUrl(verifierSiteUrl);

  console.debug('return:', result);
  return result;
};

/**
 * locale 処理後の credential metadata cache key を作成する関数
 *
 * @param {string} verifierSiteUrl verifier の Web サイト URL
 * @param {string} type 証明書 type
 * @param {string} processTarget 処理対象
 * @returns {string} cache key
 */
const createLocalizedVerifierCredentialMetadataCacheKey = (
  verifierSiteUrl = '',
  type = '',
  processTarget = LOCALIZE_PROCESS_TARGET.ALL
) => {
  console.debug('*** createLocalizedVerifierCredentialMetadataCacheKey ***');
  console.debug('verifierSiteUrl:', verifierSiteUrl);
  console.debug('type:', type);
  console.debug('processTarget:', processTarget);

  const result = JSON.stringify({
    verifierSiteUrl: normalizeVerifierSiteUrl(verifierSiteUrl),
    type,
    processTarget,
  });

  console.debug('return:', result);
  return result;
};

/**
 * cache を使用せず verifier metadata を取得する関数
 *
 * @param {string} verifierSiteUrl verifier の Web サイト URL
 * @returns {Promise<object>} supportedCredentialTypes 形式の metadata object
 */
const fetchVerifierSupportedCredentialTypesWithoutCache = async (
  verifierSiteUrl = ''
) => {
  console.debug('*** fetchVerifierSupportedCredentialTypesWithoutCache ***');
  console.debug('verifierSiteUrl:', verifierSiteUrl);

  const url = createVerifierMetadataUrl(verifierSiteUrl);

  if (!url) {
    console.debug('url is empty');
    console.debug('return:', {});
    return {};
  }

  try {
    const res = await handleGet(url);

    console.debug('verifier metadata response:', res);

    if (res?.status !== 200) {
      throw new Error('not found verifier credential configurations');
    }

    const result = res.data?.credential_configurations_supported || {};

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
 * verifier metadata を取得する関数
 *
 * @param {string} verifierSiteUrl verifier の Web サイト URL
 * @returns {Promise<object>} supportedCredentialTypes 形式の metadata object
 */
const fetchVerifierSupportedCredentialTypes = async (verifierSiteUrl = '') => {
  console.debug('*** fetchVerifierSupportedCredentialTypes ***');
  console.debug('verifierSiteUrl:', verifierSiteUrl);

  if (!verifierSiteUrl) {
    console.debug('invalid params');
    console.debug('return:', {});
    return {};
  }

  const cacheKey = createVerifierMetadataCacheKey(verifierSiteUrl);

  if (verifierMetadataCache.has(cacheKey)) {
    const cachedResult = verifierMetadataCache.get(cacheKey);

    console.debug('verifier metadata cache hit');
    console.debug('cacheKey:', cacheKey);
    console.debug('return:', cachedResult);

    return cachedResult;
  }

  if (pendingVerifierMetadataRequestMap.has(cacheKey)) {
    const pendingRequest = pendingVerifierMetadataRequestMap.get(cacheKey);

    console.debug('pending verifier request hit');
    console.debug('cacheKey:', cacheKey);

    return pendingRequest;
  }

  const request = fetchVerifierSupportedCredentialTypesWithoutCache(
    verifierSiteUrl
  ).finally(() => {
    pendingVerifierMetadataRequestMap.delete(cacheKey);
  });

  pendingVerifierMetadataRequestMap.set(cacheKey, request);

  const result = await request;

  if (Object.keys(result || {}).length > 0) {
    verifierMetadataCache.set(cacheKey, result);
  }

  console.debug('verifier metadata cache set');
  console.debug('cacheKey:', cacheKey);
  console.debug('return:', result);

  return result;
};

/**
 * credential type のベース名を取得する関数
 *
 * @param {string} credentialType supportedCredentialTypes の key
 * @returns {string} format 部分を除外した credential type 名
 */
const getCredentialBaseType = (credentialType = '') => {
  console.debug('*** verifier getCredentialBaseType ***');
  console.debug('credentialType:', credentialType);

  if (!credentialType || typeof credentialType !== 'string') {
    console.debug('return:', '');
    return '';
  }

  const result = credentialType
    .replace(/_jwt_vc_json$/, '')
    .replace(/_vc\+sd-jwt$/, '')
    .replace(/_vc_sd_jwt$/, '')
    .replace(/_sd_jwt$/, '')
    .replace(/_jwt$/, '');

  console.debug('return:', result);
  return result;
};

/**
 * localizedSupportedCredentialTypes から指定 type の credential_metadata を取得する関数
 *
 * @param {object} localizedSupportedCredentialTypes locale 処理後の supportedCredentialTypes
 * @param {string} targetType 証明書一覧に含まれる type
 * @returns {object|null} 対象 credential type の credential_metadata
 */
const getCredentialMetadataByType = (
  localizedSupportedCredentialTypes = {},
  targetType = ''
) => {
  console.debug('*** verifier getCredentialMetadataByType ***');
  console.debug(
    'localizedSupportedCredentialTypes:',
    localizedSupportedCredentialTypes
  );
  console.debug('targetType:', targetType);

  for (const [credentialType, credentialConfig] of Object.entries(
    localizedSupportedCredentialTypes || {}
  )) {
    const baseType = getCredentialBaseType(credentialType);

    console.debug('credentialType:', credentialType);
    console.debug('baseType:', baseType);

    if (baseType === targetType) {
      const result = credentialConfig?.credential_metadata || null;

      console.debug('return:', result);
      return result;
    }
  }

  console.debug('return:', null);
  return null;
};

/**
 * verifierSiteUrl と type から metadata を取得し、locale 優先順位に従って display / claims を処理する共通関数
 *
 * @param {string} verifierSiteUrl verifier の Web サイト URL
 * @param {string} type 証明書 type
 * @param {string} processTarget 処理対象。all / display / claims
 * @returns {Promise<object>} locale 処理後の credential_metadata。取得できない場合は空 object
 */
export const getLocalizedCredentialMetadataByVerifier = async (
  verifierSiteUrl = '',
  type = '',
  processTarget = LOCALIZE_PROCESS_TARGET.ALL
) => {
  console.debug('*** getLocalizedCredentialMetadataByVerifier ***');
  console.debug('verifierSiteUrl:', verifierSiteUrl);
  console.debug('type:', type);
  console.debug('processTarget:', processTarget);

  const localizedCacheKey = createLocalizedVerifierCredentialMetadataCacheKey(
    verifierSiteUrl,
    type,
    processTarget
  );

  try {
    if (!verifierSiteUrl || !type) {
      console.debug('invalid params');
      console.debug('return:', {});
      return {};
    }

    if (localizedVerifierCredentialMetadataCache.has(localizedCacheKey)) {
      const cachedResult =
        localizedVerifierCredentialMetadataCache.get(localizedCacheKey);

      console.debug('localized verifier credential metadata cache hit');
      console.debug('cacheKey:', localizedCacheKey);
      console.debug('return:', cachedResult);

      return cachedResult;
    }

    const supportedCredentialTypes =
      await fetchVerifierSupportedCredentialTypes(verifierSiteUrl);

    console.debug('supportedCredentialTypes:', supportedCredentialTypes);

    if (Object.keys(supportedCredentialTypes || {}).length === 0) {
      console.debug('supportedCredentialTypes is empty');
      console.debug('return:', {});
      return {};
    }

    const localizedSupportedCredentialTypes = localizeSupportedCredentialTypes(
      supportedCredentialTypes,
      type,
      processTarget
    );

    console.debug(
      'localizedSupportedCredentialTypes:',
      localizedSupportedCredentialTypes
    );

    const result =
      getCredentialMetadataByType(localizedSupportedCredentialTypes, type) || {};

    if (Object.keys(result || {}).length > 0) {
      localizedVerifierCredentialMetadataCache.set(localizedCacheKey, result);
    }

    console.debug('localized verifier credential metadata cache set');
    console.debug('cacheKey:', localizedCacheKey);
    console.debug('return:', result);

    return result;
  } catch (error) {
    console.error(
      'getLocalizedCredentialMetadataByVerifier error.message:',
      error.message
    );
    console.error(
      'getLocalizedCredentialMetadataByVerifier error.stack:',
      error.stack
    );

    console.debug('return:', {});
    return {};
  } finally {
    console.debug('*** getLocalizedCredentialMetadataByVerifier finally ***');
  }
};

/**
 * verifier metadata cache をクリアする関数
 *
 * @returns {void}
 */
export const clearVerifierMetadataCache = () => {
  console.debug('*** clearVerifierMetadataCache ***');

  verifierMetadataCache.clear();
  pendingVerifierMetadataRequestMap.clear();
  localizedVerifierCredentialMetadataCache.clear();

  console.debug('verifier metadata cache cleared');
};
