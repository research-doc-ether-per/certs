/**
 * locale を正規化する関数
 *
 * @param {string} locale
 * 比較対象の locale 文字列
 *
 * @returns {string}
 * 正規化後の locale
 * locale が未設定の場合は空文字を返す
 */
const normalizeLocale = (locale) => {
  if (!locale) {
    return '';
  }

  return locale.toLowerCase().split('-')[0];
};

/**
 * locale 配列を正規化し、重複を除外する共通関数
 *
 * @param {string[]} locales
 * 正規化対象の locale 配列
 *
 * @returns {string[]}
 * 正規化および重複除外後の locale 配列
 */
const normalizeLocales = (locales = []) => {
  if (!Array.isArray(locales)) {
    return [];
  }

  return [
    ...new Set(
      locales
        .map((locale) => normalizeLocale(locale))
        .filter(Boolean)
    ),
  ];
};

/**
 * ブラウザで設定されている言語一覧を取得する関数
 *
 * @returns {string[]}
 * ブラウザの言語優先順位を正規化した locale 配列
 * ブラウザ環境ではない場合は空配列を返す
 */
const getBrowserLocales = () => {
  if (typeof window === 'undefined') {
    return [];
  }

  return normalizeLocales(navigator.languages || []);
};

/**
 * display 配列から、指定された locale 優先順位に一致する display を取得する共通関数
 *
 * 仕様：
 * 1. locales の優先順位に従って、先頭から順番に display.locale を検索する
 * 2. 第一優先順位の locale が一致しない場合は、次の優先順位の locale を検索する
 * 3. 一致する display が見つかった時点で、その display を返す
 * 4. すべての locale が一致しない場合は null を返す
 *
 * @param {Array<object>} displayList
 * metadata の display 配列
 *
 * @param {string[]} locales
 * 優先順位付きの locale 配列
 *
 * @returns {object|null}
 * locale に一致した display オブジェクト
 * 一致するものがない場合は null を返す
 */
const getDisplayByLocales = (displayList = [], locales = []) => {
  if (!Array.isArray(displayList) || displayList.length === 0) {
    return null;
  }

  if (!Array.isArray(locales) || locales.length === 0) {
    return null;
  }

  for (const locale of locales) {
    const matchedDisplay = displayList.find((display) => {
      return normalizeLocale(display.locale) === locale;
    });

    if (matchedDisplay) {
      return matchedDisplay;
    }
  }

  return null;
};

/**
 * credential type のベース名を取得する関数
 *
 * @param {string} credentialType
 * supportedCredentialTypes の key
 *
 * @returns {string}
 * format 部分を除外した credential type 名
 */
const getCredentialBaseType = (credentialType = '') => {
  return credentialType
    .replace(/_jwt_vc_json$/, '')
    .replace(/_vc\+sd-jwt$/, '');
};

/**
 * 指定された credential type と一致するか判定する関数
 *
 * targetCredentialType が指定されていない場合は、すべて true とする
 *
 * @param {string} credentialType
 * 判定対象の credential type
 *
 * @param {string} targetCredentialType
 * 絞り込み対象の credential type
 *
 * @returns {boolean}
 * 指定された credential type と一致する場合は true
 */
const isTargetCredentialType = (credentialType, targetCredentialType) => {
  if (!targetCredentialType) {
    return true;
  }

  return getCredentialBaseType(credentialType) === targetCredentialType;
};

/**
 * credential type ごとにグルーピングする関数
 *
 * 同じ credential type で format だけが異なるものを同じグループにまとめる
 *
 * @param {object} supportedCredentialTypes
 * metadata API から取得した supportedCredentialTypes
 *
 * @returns {object}
 * credential type のベース名を key としてグルーピングした object
 */
const groupByCredentialBaseType = (supportedCredentialTypes = {}) => {
  return Object.entries(supportedCredentialTypes).reduce(
    (result, [credentialType, credentialConfig]) => {
      const baseType = getCredentialBaseType(credentialType);

      if (!result[baseType]) {
        result[baseType] = [];
      }

      result[baseType].push([credentialType, credentialConfig]);

      return result;
    },
    {}
  );
};

/**
 * 同じ credential type 内で、共通で使用する display を取得する関数
 *
 * 同じ credential type で format が異なる場合でも、
 * 最終的に同じ display を使用するための共通 display を取得する
 *
 * 仕様：
 * 1. locales の優先順位に従って検索する
 * 2. 同一 credential type 内の各 format の display を確認する
 * 3. いずれかの format で一致する display が見つかった場合、その display を返す
 * 4. すべての format で見つからない場合は null を返す
 *
 * @param {Array<Array>} credentialEntries
 * 同じ credential type に属する credential config の配列
 *
 * @param {string[]} locales
 * 優先順位付きの locale 配列
 *
 * @returns {object|null}
 * 同じ credential type 内で共通使用する display
 * 取得できない場合は null を返す
 */
const getSharedCredentialDisplay = (credentialEntries = [], locales = []) => {
  for (const locale of locales) {
    for (const [, credentialConfig] of credentialEntries) {
      const credentialMetadata = credentialConfig.credential_metadata || {};
      const display = getDisplayByLocales(credentialMetadata.display, [locale]);

      if (display) {
        return display;
      }
    }
  }

  return null;
};

/**
 * 同じ credential type 内で、同じ path の claim に共通で使用する display を取得する関数
 *
 * @param {Array<Array>} credentialEntries
 * 同じ credential type に属する credential config の配列
 *
 * @param {string[]} targetPath
 * 対象 claim の path
 *
 * @param {string[]} locales
 * 優先順位付きの locale 配列
 *
 * @returns {object|null}
 * 同じ path の claim に共通使用する display
 * 取得できない場合は null を返す
 */
const getSharedClaimDisplay = (credentialEntries = [], targetPath = [], locales = []) => {
  for (const locale of locales) {
    for (const [, credentialConfig] of credentialEntries) {
      const claims = credentialConfig.credential_metadata?.claims || [];

      const matchedClaim = claims.find((claim) => {
        return JSON.stringify(claim.path) === JSON.stringify(targetPath);
      });

      const display = getDisplayByLocales(matchedClaim?.display, [locale]);

      if (display) {
        return display;
      }
    }
  }

  return null;
};

/**
 * claim 情報の display を locale 判定後の display に変換する関数
 *
 * @param {object} claim
 * credential_metadata.claims 内の claim object
 *
 * @param {string[]} locales
 * 優先順位付きの locale 配列
 *
 * @param {Array<Array>} credentialEntries
 * 同じ credential type に属する credential config の配列
 *
 * @returns {object}
 * display が locale 判定後の display に置き換えられた claim object
 * 一致する display がない場合、display は null になる
 */
const localizeClaim = (claim = {}, locales = [], credentialEntries = []) => {
  const display =
    getDisplayByLocales(claim.display, locales) ||
    getSharedClaimDisplay(credentialEntries, claim.path, locales);

  return {
    ...claim,
    display,
  };
};

/**
 * claims 配列全体の display を変換する関数
 *
 * @param {Array<object>} claims
 * credential_metadata.claims 配列
 *
 * @param {string[]} locales
 * 優先順位付きの locale 配列
 *
 * @param {Array<Array>} credentialEntries
 * 同じ credential type に属する credential config の配列
 *
 * @returns {Array<object>}
 * 各 claim の display が変換された claims 配列
 * claims が配列ではない場合は空配列を返す
 */
const localizeClaims = (claims = [], locales = [], credentialEntries = []) => {
  if (!Array.isArray(claims)) {
    return [];
  }

  return claims.map((claim) => localizeClaim(claim, locales, credentialEntries));
};

/**
 * credential_metadata の display と claims[].display を変換する関数
 *
 * claims[].display:
 * - 自身の display を locale 優先順位に従って取得する
 * - 取得できない場合、同じ credential type の別 format 側の同じ path の claim.display を確認する
 * - それでも取得できない場合は null を設定する
 *
 * @param {object} credentialMetadata
 * credential_metadata object
 *
 * @param {string[]} locales
 * 優先順位付きの locale 配列
 *
 * @param {Array<Array>} credentialEntries
 * 同じ credential type に属する credential config の配列
 *
 * @param {object|null} sharedCredentialDisplay
 * 同じ credential type 内で共通使用する credential display
 *
 * @returns {object}
 * display と claims[].display が変換された credential_metadata
 */
const localizeCredentialMetadata = (
  credentialMetadata = {},
  locales = [],
  credentialEntries = [],
  sharedCredentialDisplay = null
) => {
  return {
    ...credentialMetadata,

    // credential 全体の display は、同じ credential type 内で共通の値を使用する
    display: sharedCredentialDisplay,

    // 各 claim の display を locale 判定後の display に変換する
    claims: localizeClaims(credentialMetadata.claims, locales, credentialEntries),
  };
};

/**
 * 同じ credential type グループ内の各 credential config を変換する関数
 *
 * @param {Array<Array>} credentialEntries
 * 同じ credential type に属する credential config の配列
 *
 * @param {string[]} locales
 * 優先順位付きの locale 配列
 *
 * @returns {object}
 * display が変換された credential config object
 */
const localizeCredentialGroup = (credentialEntries = [], locales = []) => {
  const sharedCredentialDisplay = getSharedCredentialDisplay(
    credentialEntries,
    locales
  );

  return credentialEntries.reduce((result, [credentialType, credentialConfig]) => {
    const credentialMetadata = credentialConfig.credential_metadata || {};

    result[credentialType] = {
      ...credentialConfig,
      credential_metadata: localizeCredentialMetadata(
        credentialMetadata,
        locales,
        credentialEntries,
        sharedCredentialDisplay
      ),
    };

    return result;
  }, {});
};

/**
 * supportedCredentialTypes 全体を locale に合わせて変換する関数
 *
 * 仕様：
 * 1. targetCredentialType が指定されている場合
 *    - 指定された credential type のみ返す
 *
 * 2. targetCredentialType が指定されていない場合
 *    - supportedCredentialTypes 全体を返す
 *
 * 3. display の処理
 *    - browserLocales の第一優先順位から順番に display.locale と一致判定する
 *    - 第一優先順位で一致しない場合は、次の優先順位を確認する
 *    - すべて一致しない場合は null を返す
 *
 * 4. 同じ credential type で format が異なる場合
 *    - credential_metadata.display は、同じ credential type 内で常に同じ値にする
 *    - 同一 type 内のいずれかの format で display が取得できる場合、その display を共通で使用する
 *    - 同一 type 内のどの format からも display が取得できない場合は null を設定する
 *
 * @param {object} supportedCredentialTypes
 * metadata API から取得した supportedCredentialTypes
 *
 * @param {string} targetCredentialType
 * 取得対象の credential type
 * 未指定の場合はすべての credential type を返す
 *
 * @returns {object}
 * display が locale 判定後の値に置き換えられた supportedCredentialTypes
 */
export const localizeSupportedCredentialTypes = (
  supportedCredentialTypes = {},
  targetCredentialType = ''
) => {
  const browserLocales = getBrowserLocales();

  const filteredCredentialTypes = Object.entries(supportedCredentialTypes).reduce(
    (result, [credentialType, credentialConfig]) => {
      if (isTargetCredentialType(credentialType, targetCredentialType)) {
        result[credentialType] = credentialConfig;
      }

      return result;
    },
    {}
  );

  const groupedCredentialTypes = groupByCredentialBaseType(filteredCredentialTypes);

  return Object.values(groupedCredentialTypes).reduce((result, credentialEntries) => {
    return {
      ...result,
      ...localizeCredentialGroup(credentialEntries, browserLocales),
    };
  }, {});
};
