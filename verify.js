export async function createStatusListJwt(
  vc: any,
  issuerDid: string
): Promise<string> {
  const issuerCrypto = loadKeyPairByIssuerDid(issuerDid);

  const alg = isJwkCrypto(issuerCrypto)
    ? issuerCrypto.alg
    : issuerCrypto.keyType === 'eddsa'
      ? 'EdDSA'
      : 'ES256';

  const kid = isJwkCrypto(issuerCrypto)
    ? issuerCrypto.verificationMethodId
    : `${issuerDid}#key-1`;

  const header = {
    alg,
    kid,
    typ: 'JWT',
  };

  const payload = {
    iss: issuerDid,
    sub: vc.id,
    vc,
  };

  const encodedHeader = uint8ToBase64url(
    new TextEncoder().encode(JSON.stringify(header))
  );

  const encodedPayload = uint8ToBase64url(
    new TextEncoder().encode(JSON.stringify(payload))
  );

  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signature = await sign(
    new TextEncoder().encode(signingInput),
    issuerCrypto
  );

  return `${signingInput}.${signature}`;
}
