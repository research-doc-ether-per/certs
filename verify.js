function buildActualCredentialUrl(vcRegistryBaseUrl, issuerDid, bslVcUrl) {
  const u = new URL(vcRegistryBaseUrl);
  const segs = ['issuers', issuerDid, 'bsl', 'vcUrls', bslVcUrl, 'credential']
    .map(s => encodeURIComponent(String(s)));

  // 去掉现有 pathname 末尾的斜杠，安全拼接
  u.pathname = [u.pathname.replace(/\/+$/, ''), ...segs].join('/');
  return u.toString();
}



const actualCredentialUrl =
  `${vcRegistryBaseUrl.replace(/\/+$/, '')}/admin/issuers/${encodeURIComponent(issuerDid)}/bsl/vcUrls/${encodeURIComponent(bslVcUrl)}/credential`;
