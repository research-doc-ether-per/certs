/**
 * locale を正規化する関数
 *
 * 例：
 *   ja-JP → ja
 *   en-US → en
 *   zh-CN → zh
 *
 * @param {string} locale
 * 比較対象の locale 文字列
 *
 * @returns {string}
 * 正規化後の locale
 * locale が未設定の場合は空文字を返す
 */
const normalizeLocale = (locale) => {
  console.debug('*** normalizeLocale ***');
  console.debug('locale:', locale);

  if (!locale || typeof locale !== 'string') {
    console.debug('result:', '');
    return '';
  }

  const result = locale.toLowerCase().split('-')[0];

  console.debug('result:', result);
  return result;
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
  console.debug('*** normalizeLocales ***');
  console.debug('locales:', locales);

  if (!Array.isArray(locales)) {
    console.debug('result:', []);
    return [];
  }

  const result = [];
  const localeSet = new Set();

  for (const locale of locales) {
    const normalizedLocale = normalizeLocale(locale);

    if (!normalizedLocale || localeSet.has(normalizedLocale)) {
      continue;
    }

    localeSet.add(normalizedLocale);
    result.push(normalizedLocale);
  }

  console.debug('result:', result);
  return result;
};

/**
 * ブラウザで設定されている言語一覧を取得する関数
 *
 * @returns {string[]}
 * ブラウザの言語優先順位を正規化した locale 配列
 * ブラウザ環境ではない場合は空配列を返す
 */
const getBrowserLocales = () => {
  console.debug('*** getBrowserLocales ***');

  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    console.debug('browser environment is not available');
    console.debug('result:', []);
    return [];
  }

  console.debug('navigator.languages:', navigator.languages);

  const result = normalizeLocales(navigator.languages || []);

  console.debug('result:', result);
  return result;
};

/**
 * display を配列形式に正規化する関数
 *
 * display は通常配列だが、処理後に object になる場合があるため、
 * 配列・object の両方を扱えるようにする。
 *
 * @param {Array<object>|object|null|undefined} display
 * metadata の display
 *
 * @returns {Array<object>}
 * display object の配列
 */
const normalizeDisplayList = (display) => {
  console.debug('*** normalizeDisplayList ***');
  console.debug('display:', display);

  if (Array.isArray(display)) {
    console.debug('result:', display);
    return display;
  }

  if (display && typeof display === 'object') {
    const result = [display];

    console.debug('result:', result);
    return result;
  }

  console.debug('result:', []);
  return [];
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
 * @param {Array<object>|object|null|undefined} displayList
 * metadata の display 配列または display object
 *
 * @param {string[]} locales
 * 優先順位付きの locale 配列
 *
 * @returns {object|null}
 * locale に一致した display オブジェクト
 * 一致するものがない場合は null を返す
 */
const getDisplayByLocales = (displayList = [], locales = []) => {
  console.debug('*** getDisplayByLocales ***');
  console.debug('displayList:', displayList);
  console.debug('locales:', locales);

  const displays = normalizeDisplayList(displayList);

  if (displays.length === 0) {
    console.debug('displays is empty');
    console.debug('result:', null);
    return null;
  }

  if (!Array.isArray(locales) || locales.length === 0) {
    console.debug('locales is empty or not array');
    console.debug('result:', null);
    return null;
  }

  for (const locale of locales) {
    for (const display of displays) {
      const displayLocale = normalizeLocale(display?.locale);
      const isMatched = displayLocale === locale;

      console.debug('checking locale:', locale);
      console.debug('display:', display);
      console.debug('displayLocale:', displayLocale);
      console.debug('isMatched:', isMatched);

      if (isMatched) {
        console.debug('result:', display);
        return display;
      }
    }
  }

  console.debug('result:', null);
  return null;
};

/**
 * credential type のベース名を取得する関数
 *
 * 例：
 *   Awards_jwt_vc_json → Awards
 *   Awards_vc+sd-jwt  → Awards
 *   Awards_vc_sd_jwt  → Awards
 *
 * @param {string} credentialType
 * supportedCredentialTypes の key
 *
 * @returns {string}
 * format 部分を除外した credential type 名
 */
const getCredentialBaseType = (credentialType = '') => {
  console.debug('*** getCredentialBaseType ***');
  console.debug('credentialType:', credentialType);

  if (!credentialType || typeof credentialType !== 'string') {
    console.debug('result:', '');
    return '';
  }

  const result = credentialType
    .replace(/_jwt_vc_json$/, '')
    .replace(/_vc\+sd-jwt$/, '')
    .replace(/_vc_sd_jwt$/, '')
    .replace(/_sd_jwt$/, '')
    .replace(/_jwt$/, '');

  console.debug('result:', result);
  return result;
};

/**
 * 指定された credential type と一致するか判定する関数
 *
 * targetCredentialType が指定されていない場合は、すべて true とする。
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
  console.debug('*** isTargetCredentialType ***');
  console.debug('credentialType:', credentialType);
  console.debug('targetCredentialType:', targetCredentialType);

  if (!targetCredentialType) {
    console.debug('result:', true);
    return true;
  }

  const baseType = getCredentialBaseType(credentialType);
  const result = baseType === targetCredentialType;

  console.debug('baseType:', baseType);
  console.debug('result:', result);
  return result;
};

/**
 * credential type ごとにグルーピングする関数
 *
 * 同じ credential type で format だけが異なるものを同じグループにまとめる。
 *
 * @param {object} supportedCredentialTypes
 * metadata API から取得した supportedCredentialTypes
 *
 * @returns {object}
 * credential type のベース名を key としてグルーピングした object
 */
const groupByCredentialBaseType = (supportedCredentialTypes = {}) => {
  console.debug('*** groupByCredentialBaseType ***');
  console.debug('supportedCredentialTypes:', supportedCredentialTypes);

  const result = {};

  for (const [credentialType, credentialConfig] of Object.entries(
    supportedCredentialTypes
  )) {
    const baseType = getCredentialBaseType(credentialType);

    console.debug('credentialType:', credentialType);
    console.debug('baseType:', baseType);
    console.debug('credentialConfig:', credentialConfig);

    if (!result[baseType]) {
      result[baseType] = [];
    }

    result[baseType].push([credentialType, credentialConfig]);
  }

  console.debug('result:', result);
  return result;
};

/**
 * 同じ credential type 内で、共通で使用する display を取得する関数
 *
 * 同じ credential type で format が異なる場合でも、
 * credential_metadata.display は最終的に同じ値にする。
 *
 * 仕様：
 * 1. locales の優先順位に従って検索する
 * 2. 同一 credential type 内の各 format の credential_metadata.display を確認する
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
  console.debug('*** getSharedCredentialDisplay ***');
  console.debug('credentialEntries:', credentialEntries);
  console.debug('locales:', locales);

  if (!Array.isArray(credentialEntries) || credentialEntries.length === 0) {
    console.debug('credentialEntries is empty or not array');
    console.debug('result:', null);
    return null;
  }

  if (!Array.isArray(locales) || locales.length === 0) {
    console.debug('locales is empty or not array');
    console.debug('result:', null);
    return null;
  }

  for (const locale of locales) {
    for (const [credentialType, credentialConfig] of credentialEntries) {
      const credentialMetadata = credentialConfig?.credential_metadata || {};

      console.debug('checking locale:', locale);
      console.debug('credentialType:', credentialType);
      console.debug('credentialMetadata.display:', credentialMetadata.display);

      const display = getDisplayByLocales(credentialMetadata.display, [locale]);

      console.debug('display:', display);

      if (display) {
        console.debug('result:', display);
        return display;
      }
    }
  }

  console.debug('result:', null);
  return null;
};

/**
 * claim 情報の display を locale 判定後の display に変換する関数
 *
 * 注意：
 * claims は format ごとに保持する。
 * 同じ credential type で format が異なる場合でも、
 * 別 format 側の claims は参照・補完しない。
 *
 * 仕様：
 * 1. 現在の claim.display のみを対象にする
 * 2. locales の優先順位に従って display.locale を検索する
 * 3. 一致する display が見つかった場合、その display を返す
 * 4. 一致する display がない場合は null を設定する
 *
 * @param {object} claim
 * credential_metadata.claims 内の claim object
 *
 * @param {string[]} locales
 * 優先順位付きの locale 配列
 *
 * @returns {object}
 * display が locale 判定後の display に置き換えられた claim object
 * 一致する display がない場合、display は null になる
 */
const localizeClaim = (claim = {}, locales = []) => {
  console.debug('*** localizeClaim ***');
  console.debug('claim:', claim);
  console.debug('locales:', locales);

  const result = {
    ...claim,
    display: getDisplayByLocales(claim?.display, locales),
  };

  console.debug('result:', result);
  return result;
};

/**
 * claims 配列全体の display を変換する関数
 *
 * 注意：
 * claims は現在の credential format に所属するもののみを使用する。
 * 別 format 側の claims は参照しない。
 *
 * @param {Array<object>} claims
 * credential_metadata.claims 配列
 *
 * @param {string[]} locales
 * 優先順位付きの locale 配列
 *
 * @returns {Array<object>}
 * 各 claim の display が変換された claims 配列
 * claims が配列ではない場合は空配列を返す
 */
const localizeClaims = (claims = [], locales = []) => {
  console.debug('*** localizeClaims ***');
  console.debug('claims:', claims);
  console.debug('locales:', locales);

  if (!Array.isArray(claims)) {
    console.debug('claims is not array');
    console.debug('result:', []);
    return [];
  }

  const result = [];

  for (const claim of claims) {
    result.push(localizeClaim(claim, locales));
  }

  console.debug('result:', result);
  return result;
};

/**
 * credential_metadata の display と claims[].display を変換する関数
 *
 * credential_metadata.display:
 * - 同じ credential type 内で共通の display を使用する
 * - format が異なる場合でも、同じ credential type であれば display は同じ値にする
 *
 * claims[].display:
 * - claims は format ごとの定義をそのまま使用する
 * - 別 format 側の claims は参照しない
 * - 現在の format に所属する claims[].display の中から locale に一致する display を取得する
 * - 一致する display がない場合は null を設定する
 *
 * @param {object} credentialMetadata
 * credential_metadata object
 *
 * @param {string[]} locales
 * 優先順位付きの locale 配列
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
  sharedCredentialDisplay = null
) => {
  console.debug('*** localizeCredentialMetadata ***');
  console.debug('credentialMetadata:', credentialMetadata);
  console.debug('locales:', locales);
  console.debug('sharedCredentialDisplay:', sharedCredentialDisplay);

  const result = {
    ...credentialMetadata,

    // credential 全体の display は、同じ credential type 内で共通の値を使用する
    display: sharedCredentialDisplay,

    // claims は format ごとに保持し、現在の claims の display のみ locale 判定する
    claims: localizeClaims(credentialMetadata?.claims, locales),
  };

  console.debug('result:', result);
  return result;
};

/**
 * 同じ credential type グループ内の各 credential config を変換する関数
 *
 * format が異なる場合でも、同じ credential type であれば、
 * credential_metadata.display は常に同じ値になるようにする。
 *
 * 一方で、claims は各 format に所属する定義をそのまま使用し、
 * 別 format 側の claims は参照しない。
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
  console.debug('*** localizeCredentialGroup ***');
  console.debug('credentialEntries:', credentialEntries);
  console.debug('locales:', locales);

  const sharedCredentialDisplay = getSharedCredentialDisplay(
    credentialEntries,
    locales
  );

  console.debug('sharedCredentialDisplay:', sharedCredentialDisplay);

  const result = {};

  for (const [credentialType, credentialConfig] of credentialEntries) {
    const credentialMetadata = credentialConfig?.credential_metadata || {};

    console.debug('credentialType:', credentialType);
    console.debug('credentialConfig:', credentialConfig);
    console.debug('credentialMetadata:', credentialMetadata);

    result[credentialType] = {
      ...credentialConfig,
      credential_metadata: localizeCredentialMetadata(
        credentialMetadata,
        locales,
        sharedCredentialDisplay
      ),
    };
  }

  console.debug('result:', result);
  return result;
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
 * 3. display の locale 判定
 *    - browserLocales の第一優先順位から順番に display.locale と一致判定する
 *    - 第一優先順位で一致しない場合は、次の優先順位を確認する
 *    - すべて一致しない場合は null を返す
 *
 * 4. credential_metadata.display の処理
 *    - 同じ credential type で format が異なる場合でも、display は常に同じ値にする
 *    - 同一 type 内のいずれかの format で display が取得できる場合、その display を共通で使用する
 *    - 同一 type 内のどの format からも display が取得できない場合は null を設定する
 *
 * 5. claims[].display の処理
 *    - claims は format ごとの定義をそのまま使用する
 *    - 別 format 側の claims は参照しない
 *    - 現在の format に所属する claims[].display のみ locale 判定する
 *    - 一致する display がない場合は null を設定する
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
  console.debug('*** localizeSupportedCredentialTypes ***');
  console.debug('supportedCredentialTypes:', supportedCredentialTypes);
  console.debug('targetCredentialType:', targetCredentialType);

  const browserLocales = getBrowserLocales();

  console.debug('browserLocales:', browserLocales);

  const filteredCredentialTypes = {};

  for (const [credentialType, credentialConfig] of Object.entries(
    supportedCredentialTypes || {}
  )) {
    const isTarget = isTargetCredentialType(credentialType, targetCredentialType);

    console.debug('credentialType:', credentialType);
    console.debug('isTarget:', isTarget);

    if (isTarget) {
      filteredCredentialTypes[credentialType] = credentialConfig;
    }
  }

  console.debug('filteredCredentialTypes:', filteredCredentialTypes);

  const groupedCredentialTypes = groupByCredentialBaseType(filteredCredentialTypes);

  console.debug('groupedCredentialTypes:', groupedCredentialTypes);

  const result = {};

  for (const credentialEntries of Object.values(groupedCredentialTypes)) {
    const localizedCredentialGroup = localizeCredentialGroup(
      credentialEntries,
      browserLocales
    );

    Object.assign(result, localizedCredentialGroup);
  }

  console.debug('result:', result);
  return result;
};
