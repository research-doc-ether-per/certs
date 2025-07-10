// src/routes/index.js
const express = require('express');
const router = express.Router();

// —— Personal Wallet Management —— //
const { getPersonalWallet } = require('../controllers/personal-wallet/management/getPersonalWallet');
const { createPersonalWallet } = require('../controllers/personal-wallet/management/createPersonalWallet');
const { deletePersonalWallet } = require('../controllers/personal-wallet/management/deletePersonalWallet');

// GET 个人钱包
router.get(
    '/personal-wallet/management',
    getPersonalWallet
);

// POST 创建个人钱包
router.post(
    '/personal-wallet/management',
    createPersonalWallet
);

// DELETE 删除个人钱包
router.delete(
    '/personal-wallet/management',
    deletePersonalWallet
);

// —— Personal DID Management —— //
const { listPersonalDIDs } = require('../controllers/personal-wallet/did/listPersonalDIDs');
const { getPersonalDID } = require('../controllers/personal-wallet/did/getPersonalDID');
const { addPersonalDID } = require('../controllers/personal-wallet/did/addPersonalDID');
const { updatePersonalDID } = require('../controllers/personal-wallet/did/updatePersonalDID');
const { setDefaultPersonalDID } = require('../controllers/personal-wallet/did/setDefaultPersonalDID');
const { deletePersonalDID } = require('../controllers/personal-wallet/did/deletePersonalDID');

// GET 个人 DID 列表
router.get(
    '/personal-wallet/did',
    listPersonalDIDs
);

// GET 指定个人 DID
router.get(
    '/personal-wallet/did/:id',
    getPersonalDID
);

// POST 新增个人 DID
router.post(
    '/personal-wallet/did',
    addPersonalDID
);

// POST 更新个人 DID
router.post(
    '/personal-wallet/did/:id',
    updatePersonalDID
);

// POST 设置默认个人 DID
router.post(
    '/personal-wallet/did/:id/default',
    setDefaultPersonalDID
);

// DELETE 删除个人 DID
router.delete(
    '/personal-wallet/did/:id',
    deletePersonalDID
);

// —— Organization Wallet Rule Management —— //
const { listOrgWalletRules } = require('../controllers/organization-wallet/rule-management/listOrgWalletRules');
const { addOrgWalletRule } = require('../controllers/organization-wallet/rule-management/addOrgWalletRule');
const { updateOrgWalletRule } = require('../controllers/organization-wallet/rule-management/updateOrgWalletRule');
const { deleteOrgWalletRule } = require('../controllers/organization-wallet/rule-management/deleteOrgWalletRule');

// GET 组织钱包规则列表
router.get(
    '/organization-wallet/rule-management',
    listOrgWalletRules
);

// POST 新增组织钱包规则
router.post(
    '/organization-wallet/rule-management',
    addOrgWalletRule
);

// POST 更新组织钱包规则
router.post(
    '/organization-wallet/rule-management/:id',
    updateOrgWalletRule
);

// DELETE 删除组织钱包规则
router.delete(
    '/organization-wallet/rule-management/:id',
    deleteOrgWalletRule
);

// —— Organization Wallet Management —— //
const { listOrgWallets } = require('../controllers/organization-wallet/management/listOrgWallets');
const { addOrgWallet } = require('../controllers/organization-wallet/management/addOrgWallet');
const { deleteOrgWallet } = require('../controllers/organization-wallet/management/deleteOrgWallet');

// GET 组织钱包列表
router.get(
    '/organization-wallet/management',
    listOrgWallets
);

// POST 新增组织钱包
router.post(
    '/organization-wallet/management',
    addOrgWallet
);

// DELETE 删除组织钱包
router.delete(
    '/organization-wallet/management/:id',
    deleteOrgWallet
);

// —— Organization DID Management —— //
const { listOrgDIDs } = require('../controllers/organization-wallet/did/listOrgDIDs');
const { getOrgDID } = require('../controllers/organization-wallet/did/getOrgDID');
const { addOrgDID } = require('../controllers/organization-wallet/did/addOrgDID');
const { updateOrgDID } = require('../controllers/organization-wallet/did/updateOrgDID');
const { setDefaultOrgDID } = require('../controllers/organization-wallet/did/setDefaultOrgDID');
const { deleteOrgDID } = require('../controllers/organization-wallet/did/deleteOrgDID');

// GET 组织 DID 列表
router.get(
    '/organization-wallet/did',
    listOrgDIDs
);

// GET 指定组织 DID
router.get(
    '/organization-wallet/did/:id',
    getOrgDID
);

// POST 新增组织 DID
router.post(
    '/organization-wallet/did',
    addOrgDID
);

// POST 更新组织 DID
router.post(
    '/organization-wallet/did/:id',
    updateOrgDID
);

// POST 设置默认组织 DID
router.post(
    '/organization-wallet/did/:id/default',
    setDefaultOrgDID
);

// DELETE 删除组织 DID
router.delete(
    '/organization-wallet/did/:id',
    deleteOrgDID
);

// —— VC Management —— //
const { listAllCredentials } = require('../controllers/vc/management/listAllCredentials');
const { getCredentialInfo } = require('../controllers/vc/management/getCredentialInfo');
const { addCredential } = require('../controllers/vc/management/addCredential');
const { updateCredentialAttributes } = require('../controllers/vc/management/updateCredentialAttributes');
const { deleteCredential } = require('../controllers/vc/management/deleteCredential');

// GET 所有证书
router.get(
    '/vc/management',
    listAllCredentials
);

// GET 指定证书信息
router.get(
    '/vc/management/:id',
    getCredentialInfo
);

// POST 新增证书
router.post(
    '/vc/management',
    addCredential
);

// POST 更新证书属性
router.post(
    '/vc/management/:id',
    updateCredentialAttributes
);

// DELETE 删除证书
router.delete(
    '/vc/management/:id',
    deleteCredential
);

// —— VC Usage —— //
const { getCredential } = require('../controllers/vc/usage/getCredential');
const { verifyCredential } = require('../controllers/vc/usage/verifyCredential');
const { verifyCredentialFile } = require('../controllers/vc/usage/verifyCredentialFile');

// GET 获取证书
router.get(
    '/vc/usage/:id',
    getCredential
);

// GET 验证证书
router.get(
    '/vc/usage/:id/verify',
    verifyCredential
);

// POST 验证证书文件
router.post(
    '/vc/usage/verify-file',
    verifyCredentialFile
);

// —— VC OIDC APIs —— //
const { listAddableCredentials } = require('../controllers/vc/oidc/listAddableCredentials');
const { getCredentialOffer } = require('../controllers/vc/oidc/getCredentialOffer');
const { requestCredentialIssuance } = require('../controllers/vc/oidc/requestCredentialIssuance');
const { getPresentationRequestURL } = require('../controllers/vc/oidc/getPresentationRequestURL');
const { parsePresentationRequest } = require('../controllers/vc/oidc/parsePresentationRequest');
const { presentCredential } = require('../controllers/vc/oidc/presentCredential');

// GET 可添加的证书列表
router.get(
    '/vc/oidc/addable-credentials',
    listAddableCredentials
);

// GET 获取凭证 Offer
router.get(
    '/vc/oidc/credential-offer',
    getCredentialOffer
);

// POST 请求凭证发行
router.post(
    '/vc/oidc/credential-issuance',
    requestCredentialIssuance
);

// GET 获取演示请求 URL
router.get(
    '/vc/oidc/presentation-request-url',
    getPresentationRequestURL
);

// POST 解析演示请求
router.post(
    '/vc/oidc/parse-presentation-request',
    parsePresentationRequest
);

// POST 提交凭证展示
router.post(
    '/vc/oidc/present-credential',
    presentCredential
);

// —— VC Special VC —— //
const { requestBasicInfoVC } = require('../controllers/vc/special/requestBasicInfoVC');

// POST 基本 4 信息 VC 发行请求
router.post(
    '/vc/special/request-basic-info-vc',
    requestBasicInfoVC
);

module.exports = router;

