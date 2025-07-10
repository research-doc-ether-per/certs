
#!/usr/bin/env bash
set -e

BASE_DIR="src/controllers"

declare -A structure=(
  ["${BASE_DIR}/personal-wallet/management"]="getPersonalWallet.js createPersonalWallet.js deletePersonalWallet.js"
  ["${BASE_DIR}/personal-wallet/did"]="listPersonalDIDs.js getPersonalDID.js addPersonalDID.js updatePersonalDID.js setDefaultPersonalDID.js deletePersonalDID.js"
  ["${BASE_DIR}/organization-wallet/rule-management"]="listOrgWalletRules.js addOrgWalletRule.js updateOrgWalletRule.js deleteOrgWalletRule.js"
  ["${BASE_DIR}/organization-wallet/management"]="listOrgWallets.js addOrgWallet.js deleteOrgWallet.js"
  ["${BASE_DIR}/organization-wallet/did"]="listOrgDIDs.js getOrgDID.js addOrgDID.js updateOrgDID.js setDefaultOrgDID.js deleteOrgDID.js"
  ["${BASE_DIR}/vc/management"]="listAllCredentials.js getCredentialInfo.js addCredential.js updateCredentialAttributes.js deleteCredential.js"
  ["${BASE_DIR}/vc/usage"]="getCredential.js verifyCredential.js verifyCredentialFile.js"
  ["${BASE_DIR}/vc/oidc"]="listAddableCredentials.js getCredentialOffer.js requestCredentialIssuance.js getPresentationRequestURL.js parsePresentationRequest.js presentCredential.js"
  ["${BASE_DIR}/vc/special"]="requestBasicInfoVC.js"
)

for dir in "${!structure[@]}"; do
  mkdir -p "$dir"
  for file in ${structure[$dir]}; do
    touch "$dir/$file"
  done
done
