/**
 * credentialIssuerMetadataUtils.js
 */

import axios from 'axios';

import {
  LOCALIZE_PROCESS_TARGET,
  localizeSupportedCredentialTypes,
} from '@/utils/credentialMetadataUtils';

/**
 * issuer metadata の取得結果を保持するキャッシュ
 */
const issuerMetadataCache = new Map();

/**
 * 処理中の issuer metadata request を保持する Map
 */
const pendingIssuerMetadataRequestMap = new Map();

/**
 * issuer DID から生成した endpoint を保持するキャッシュ
 */
const issuerEndpointCache = new Map();

/**
 * locale 処理後の credential_metadata を保持するキャッシュ
 */
const localizedCredentialMetadataCache = new Map();

/**
 * b4d type かどうかを判定する関数
 *
 * @param {string} type 証明書 type
 * @returns {boolean} b4d の場合 true
 */
const isB4dType = (type = '') => {
  console.debug('*** isB4dType ***');
  console.debug('type:', type);

  const result = String(type).toLowerCase() === 'b4d';

  console.debug('return:', result);
  return result;
};

/**
 * local / private network の host かどうかを判定する関数
 *
 * @param {string} host host 名
 * @returns {boolean} local / private network の場合 true
 */
const isLocalHost = (host = '') => {
  console.debug('*** isLocalHost ***');
  console.debug('host:', host);

  if (!host || typeof host !== 'string') {
    console.debug('return:', false);
    return false;
  }

  const normalizedHost = host.toLowerCase();

  const result =
    normalizedHost === 'localhost' ||
    normalizedHost === '127.0.0.1' ||
    normalizedHost === '0.0.0.0' ||
    normalizedHost === '::1' ||
    normalizedHost === 'host.docker.internal' ||
    normalizedHost.endsWith('.local') ||
    normalizedHost.startsWith('10.') ||
    normalizedHost.startsWith('192.168.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(normalizedHost);

  console.debug('return:', result);
  return result;
};

/**
 * GET リクエストを実行する共通関数
 *
 * @param {string} url 取得対象 URL
 * @returns {Promise<object>} status と data を含むレスポンス object
 */
const handleGet = async (url = '') => {
  console.debug('*** handleGet ***');
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
 * issuer DID から metadata 取得用 endpoint cache key を作成する関数
 *
 * @param {string} issuerDid issuer DID
 * @returns {string} cache key
 */
const createIssuerEndpointCacheKey = (issuerDid = '') => {
  console.debug('*** createIssuerEndpointCacheKey ***');
  console.debug('issuerDid:', issuerDid);

  const result = issuerDid;

  console.debug('return:', result);
  return result;
};

/**
 * issuer DID から metadata 取得用 endpoint を作成する関数
 *
 * local / private network の場合は http、それ以外は https を使用する。
 *
 * @param {string} issuerDid 証明書一覧に含まれる issuer DID
 * @returns {object|null} metadata 取得用 endpoint 情報
 */
const parseIssuerDidToEndpoint = (issuerDid = '') => {
  console.debug('*** parseIssuerDidToEndpoint ***');
  console.debug('issuerDid:', issuerDid);

  const cacheKey = createIssuerEndpointCacheKey(issuerDid);

  if (issuerEndpointCache.has(cacheKey)) {
    const cachedResult = issuerEndpointCache.get(cacheKey);

    console.debug('endpoint cache hit');
    console.debug('return:', cachedResult);

    return cachedResult;
  }

  if (!issuerDid || typeof issuerDid !== 'string') {
    console.debug('return:', null);
    return null;
  }

  if (!issuerDid.startsWith('did:web:')) {
    console.debug('unsupported issuer DID');
    console.debug('return:', null);
    return null;
  }

  const didWebValue = issuerDid.replace(/^did:web:/, '');
  const decodedValue = decodeURIComponent(didWebValue);
  const parts = decodedValue.split(':').filter(Boolean);

  if (parts.length === 0) {
    console.debug('invalid did:web value');
    console.debug('return:', null);
    return null;
  }

  const hostName = parts[0];

  /**
   * 例：
   * did:web:10.0.2.15%3A6102:dids:issuer01
   * decode 後：10.0.2.15:6102:dids:issuer01
   *
   * parts[1] が port 番号の場合のみ host:port として扱う。
   */
  const host = /^\d+$/.test(parts[1]) ? `${hostName}:${parts[1]}` : hostName;

  /**
   * local / private network の場合は http、それ以外は https を使用する。
   */
  const scheme = isLocalHost(hostName) ? 'http' : 'https';

  const result = {
    scheme,
    host,
    baseUrl: `${scheme}://${host}`,
  };

  issuerEndpointCache.set(cacheKey, result);

  console.debug('return:', result);
  return result;
};

/**
 * metadata 種別を取得する関数
 *
 * @param {string} type 証明書 type
 * @returns {string} metadata 種別
 */
const getMetadataType = (type = '') => {
  console.debug('*** getMetadataType ***');
  console.debug('type:', type);

  const result = isB4dType(type) ? 'b4d' : 'normal';

  console.debug('return:', result);
  return result;
};

/**
 * issuer DID と type から metadata cache key を作成する関数
 *
 * @param {string} issuerDid issuer DID
 * @param {string} type 証明書 type
 * @returns {string} cache key
 */
const createIssuerMetadataCacheKey = (issuerDid = '', type = '') => {
  console.debug('*** createIssuerMetadataCacheKey ***');
  console.debug('issuerDid:', issuerDid);
  console.debug('type:', type);

  const metadataType = getMetadataType(type);
  const result = `${issuerDid}::${metadataType}`;

  console.debug('return:', result);
  return result;
};

/**
 * locale 処理後の credential metadata cache key を作成する関数
 *
 * @param {string} issuerDid issuer DID
 * @param {string} type 証明書 type
 * @param {string} processTarget 処理対象
 * @returns {string} cache key
 */
const createLocalizedCredentialMetadataCacheKey = (
  issuerDid = '',
  type = '',
  processTarget = LOCALIZE_PROCESS_TARGET.ALL
) => {
  console.debug('*** createLocalizedCredentialMetadataCacheKey ***');
  console.debug('issuerDid:', issuerDid);
  console.debug('type:', type);
  console.debug('processTarget:', processTarget);

  const result = `${issuerDid}::${type}::${processTarget}`;

  console.debug('return:', result);
  return result;
};

/**
 * b4d metadata を localizeSupportedCredentialTypes で処理できる形式に変換する関数
 *
 * @param {object} data base_4_info.json のレスポンスデータ
 * @returns {object} supportedCredentialTypes 形式の object
 */
const convertB4dMetadataToSupportedCredentialTypes = (data = {}) => {
  console.debug('*** convertB4dMetadataToSupportedCredentialTypes ***');
  console.debug('data:', data);

  const { display = [], claims = [] } = data || {};

  const result = {
    b4d: {
      credential_metadata: {
        display,
        claims,
      },
    },
  };

  console.debug('return:', result);
  return result;
};

/**
 * cache を使用せず issuer metadata を取得する関数
 *
 * @param {string} issuerDid 証明書一覧に含まれる issuer DID
 * @param {string} type 証明書 type
 * @returns {Promise<object>} supportedCredentialTypes 形式の metadata object
 */
const fetchIssuerSupportedCredentialTypesWithoutCache = async (
  issuerDid = '',
  type = ''
) => {
  console.debug('*** fetchIssuerSupportedCredentialTypesWithoutCache ***');
  console.debug('issuerDid:', issuerDid);
  console.debug('type:', type);

  const endpoint = parseIssuerDidToEndpoint(issuerDid);

  if (!endpoint) {
    console.debug('endpoint is null');
    console.debug('return:', {});
    return {};
  }

  try {
    if (isB4dType(type)) {
      const url = `${endpoint.baseUrl}/.well-known/base_4_info.json`;

      console.debug('b4d metadata url:', url);

      const res = await handleGet(url);

      console.debug('b4d metadata response:', res);

      if (res?.status !== 200) {
        throw new Error('not found b4d credential configurations');
      }

      const result = convertB4dMetadataToSupportedCredentialTypes(res.data || {});

      console.debug('return:', result);
      return result;
    }

    const url = `${endpoint.baseUrl}/.well-known/openid-credential-issuer`;

    console.debug('normal metadata url:', url);

    const res = await handleGet(url);

    console.debug('normal metadata response:', res);

    if (res?.status !== 200) {
      throw new Error('not found credential configurations');
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
 * issuer metadata を取得する関数
 *
 * @param {string} issuerDid 証明書一覧に含まれる issuer DID
 * @param {string} type 証明書 type
 * @returns {Promise<object>} supportedCredentialTypes 形式の metadata object
 */
const fetchIssuerSupportedCredentialTypes = async (
  issuerDid = '',
  type = ''
) => {
  console.debug('*** fetchIssuerSupportedCredentialTypes ***');
  console.debug('issuerDid:', issuerDid);
  console.debug('type:', type);

  if (!issuerDid || !type) {
    console.debug('invalid params');
    console.debug('return:', {});
    return {};
  }

  const cacheKey = createIssuerMetadataCacheKey(issuerDid, type);

  if (issuerMetadataCache.has(cacheKey)) {
    const cachedResult = issuerMetadataCache.get(cacheKey);

    console.debug('metadata cache hit');
    console.debug('cacheKey:', cacheKey);
    console.debug('return:', cachedResult);

    return cachedResult;
  }

  if (pendingIssuerMetadataRequestMap.has(cacheKey)) {
    const pendingRequest = pendingIssuerMetadataRequestMap.get(cacheKey);

    console.debug('pending request hit');
    console.debug('cacheKey:', cacheKey);

    return pendingRequest;
  }

  const request = fetchIssuerSupportedCredentialTypesWithoutCache(
    issuerDid,
    type
  ).finally(() => {
    pendingIssuerMetadataRequestMap.delete(cacheKey);
  });

  pendingIssuerMetadataRequestMap.set(cacheKey, request);

  const result = await request;

  if (Object.keys(result || {}).length > 0) {
    issuerMetadataCache.set(cacheKey, result);
  }

  console.debug('metadata cache set');
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
  console.debug('*** getCredentialBaseType ***');
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
  console.debug('*** getCredentialMetadataByType ***');
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
 * issuer DID と type から metadata を取得し、locale 優先順位に従って display / claims を処理する共通関数
 *
 * @param {string} issuerDid 証明書一覧に含まれる issuer DID
 * @param {string} type 証明書 type
 * @param {string} processTarget 処理対象。all / display / claims
 * @returns {Promise<object>} locale 処理後の credential_metadata。取得できない場合は空 object
 */
export const getLocalizedCredentialMetadataByIssuer = async (
  issuerDid = '',
  type = '',
  processTarget = LOCALIZE_PROCESS_TARGET.ALL
) => {
  console.debug('*** getLocalizedCredentialMetadataByIssuer ***');
  console.debug('issuerDid:', issuerDid);
  console.debug('type:', type);
  console.debug('processTarget:', processTarget);

  const localizedCacheKey = createLocalizedCredentialMetadataCacheKey(
    issuerDid,
    type,
    processTarget
  );

  try {
    if (!issuerDid || !type) {
      console.debug('invalid params');
      console.debug('return:', {});
      return {};
    }

    if (localizedCredentialMetadataCache.has(localizedCacheKey)) {
      const cachedResult = localizedCredentialMetadataCache.get(localizedCacheKey);

      console.debug('localized credential metadata cache hit');
      console.debug('cacheKey:', localizedCacheKey);
      console.debug('return:', cachedResult);

      return cachedResult;
    }

    const supportedCredentialTypes = await fetchIssuerSupportedCredentialTypes(
      issuerDid,
      type
    );

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
      localizedCredentialMetadataCache.set(localizedCacheKey, result);
    }

    console.debug('localized credential metadata cache set');
    console.debug('cacheKey:', localizedCacheKey);
    console.debug('return:', result);

    return result;
  } catch (error) {
    console.error(
      'getLocalizedCredentialMetadataByIssuer error.message:',
      error.message
    );
    console.error(
      'getLocalizedCredentialMetadataByIssuer error.stack:',
      error.stack
    );

    console.debug('return:', {});
    return {};
  } finally {
    console.debug('*** getLocalizedCredentialMetadataByIssuer finally ***');
  }
};

/**
 * issuer metadata cache をクリアする関数
 *
 * @returns {void}
 */
export const clearIssuerMetadataCache = () => {
  console.debug('*** clearIssuerMetadataCache ***');

  issuerMetadataCache.clear();
  pendingIssuerMetadataRequestMap.clear();
  issuerEndpointCache.clear();
  localizedCredentialMetadataCache.clear();

  console.debug('cache cleared');
};






