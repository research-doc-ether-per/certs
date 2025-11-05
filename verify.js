function buildExactLikeYouWant(base, issuerDid, bslVcUrl) {

  const trimRight = (s) => String(s).replace(/\/+$/g, "");

  const trimLeft = (s) => String(s).replace(/^\/+/g, "");

  const escapePercentOnly = (s) => String(s).replace(/%/g, "%25");

  const baseClean = trimRight(base);
  const issuerEscaped = escapePercentOnly(issuerDid);
  const bslClean = trimLeft(bslVcUrl);


  return `${baseClean}/issuers/${issuerEscaped}/bsl/vcUrls/${bslClean}//credential`;
}

