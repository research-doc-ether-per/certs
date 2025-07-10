#!/usr/bin/env bash
set -e

BASE="src/controllers"

declare -A structure=(
  ["personal-wallet/management"]="getPersonalWallet.js createPersonalWallet.js deletePersonalWallet.js"
  ["personal-wallet/did"]="listPersonalDIDs.js getPersonalDID.js addPersonalDID.js updatePersonalDID.js setDefaultPersonalDID.js deletePersonalDID.js"
  ["organization-wallet/rule-management"]="listOrgWalletRules.js addOrgWalletRule.js updateOrgWalletRule.js deleteOrgWalletRule.js"
  ["organization-wallet/management"]="listOrgWallets.js addOrgWallet.js deleteOrgWallet.js"
  ["organization-wallet/did"]="listOrgDIDs.js getOrgDID.js addOrgDID.js updateOrgDID.js setDefaultOrgDID.js deleteOrgDID.js"
  ["vc/management"]="listAllCredentials.js getCredentialInfo.js addCredential.js updateCredentialAttributes.js deleteCredential.js"
  ["vc/usage"]="getCredential.js verifyCredential.js verifyCredentialFile.js"
  ["vc/oidc"]="listAddableCredentials.js getCredentialOffer.js requestCredentialIssuance.js getPresentationRequestURL.js parsePresentationRequest.js presentCredential.js"
  ["vc/special"]="requestBasicInfoVC.js"
)

for subdir in "${!structure[@]}"; do
  for file in ${structure[$subdir]}; do
    filePath="$BASE/$subdir/$file"
    mkdir -p "$(dirname "$filePath")"
    handler="${file%.js}"

    cat > "$filePath" <<EOF
const log4js = require('log4js');
const logger = log4js.getLogger('${handler}');
const { handleErrorMsg } = require('../services/message-service');

/**
 * ${handler} コントローラー
 * @param {Object} req - リクエストオブジェクト
 * @param {Object} res - レスポンスオブジェクト
 */
exports.${handler} = async (req, res) => {
  logger.info('*** ${handler} start ***');
  let result;
  try {
    // logger.debug('req.params:', JSON.stringify(req.params));
    // logger.debug('req.body:', JSON.stringify(req.body));

    result = {};
    res.status(200).json(result);
  } catch (error) {
    logger.error('error.message:', error.message);
    result = handleErrorMsg(error.code || 'E400200', error.params);
    res.status(result.status).json(result.data);
  } finally {
    logger.info('response.data:', JSON.stringify(result));
    logger.info('*** ${handler} end ***');
  }
};
EOF

  done
done

echo "create success."
