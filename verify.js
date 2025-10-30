// proofs.ts
import canonicalize from 'json-canonicalize';
import { webcrypto as _webcrypto } from 'crypto';
import config from '../config/index.js';
import * as keyUtils from './keyUtils.js';
import { ed25519, secp256k1 } from './sig.js';

const crypto = _webcrypto as unknown as Crypto;

type MultibaseEncoding = 'm' | 'z';
const Base64UrlNoPad = 'm' satisfies MultibaseEncoding;
const Base58Btc = 'z' satisfies MultibaseEncoding;

export type KeyType = 'eddsa' | 'ecdsa';
export type Alg = 'ES256' | 'Ed25519';
export type JWK = { kty: string; crv?: string; x?: string; y?: string; d?: string; kid?: string };
export type JwkEc = { kty: 'EC'; crv: 'P-256'; x: string; y: string; d?: string; kid?: string };
export type IssuerEntryRaw =
  | {
      issuer_did: string;
      verificationMethodId?: string;
      issuerKey: { type: 'jwk'; jwk: JwkEc | JWK };
      keyType: 'secp256r1' | 'ed25519';
    }
  | {
      issuer_did: string;
      publicKeyMultibase: string;
      secretKeyMultibase: string;
    };

export type IssuerCryptoJwk = {
  mode: 'jwk';
  keyType: KeyType;
  alg: Alg;
  verificationMethodId?: string;
  publicJwk: JWK;
  privateJwk: JWK;
};
export type IssuerCryptoMultibase = {
  mode: 'multibase';
  publicKeyMultibase: string;
  secretKeyMultibase: string;
};
export type IssuerCrypto = IssuerCryptoJwk | IssuerCryptoMultibase;

function b64urlEncode(u8: Uint8Array): string {
  return Buffer.from(u8).toString('base64url');
}
function b64urlDecode(s: string): Uint8Array {
  return new Uint8Array(Buffer.from(s, 'base64url'));
}

function decodeBase64Url(s: string): Uint8Array {
  return b64urlDecode(s);
}
function encodeBase64Url(u8: Uint8Array): string {
  return b64urlEncode(u8);
}

export function multibaseDecode(str: string): { bytes: Uint8Array; encoding: MultibaseEncoding } {
  if (!str || str.length < 2) {
    throw new Error('Invalid multibase string: too short');
  }
  const prefix = str[0] as MultibaseEncoding;
  const encoded = str.slice(1);
  let bytes: Uint8Array;
  switch (prefix) {
    case Base64UrlNoPad:
      bytes = decodeBase64Url(encoded);
      break;
    case Base58Btc:
      throw new Error('BASE58btc not implemented in this file');
    default:
      throw new Error(`Unsupported multibase encoding prefix: ${prefix}`);
  }
  return { bytes, encoding: prefix };
}

export function multibaseEncode(bytes: Uint8Array, encoding: MultibaseEncoding = Base64UrlNoPad): string {
  switch (encoding) {
    case Base64UrlNoPad:
      return `${encoding}${encodeBase64Url(bytes)}`;
    default:
      throw new Error(`Unsupported multibase encoding: ${encoding}`);
  }
}

function toBufferSource(u8: Uint8Array | ArrayBufferLike): ArrayBuffer {
  if (u8 instanceof Uint8Array) {
    return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
  }
  return u8 as ArrayBuffer;
}

function toSignableUint8Array(obj: object): Uint8Array {
  const canonicalized = canonicalize(obj);
  return new TextEncoder().encode(canonicalized);
}

function isJwkEntry(entry: IssuerEntryRaw): entry is Extract<IssuerEntryRaw, { issuerKey: any }> {
  // @ts-ignore
  return !!(entry as any).issuerKey;
}
function isMultibaseEntry(entry: IssuerEntryRaw): entry is Extract<IssuerEntryRaw, { publicKeyMultibase: string }> {
  // @ts-ignore
  return !!(entry as any).publicKeyMultibase && !!(entry as any).secretKeyMultibase;
}

export function loadKeyPairByIssuerDid(issuerDid: string): IssuerCrypto {
  const entry = config.issuers.find((i: IssuerEntryRaw) => i.issuer_did === issuerDid);
  if (!entry) {
    const error = new Error(`Unknown issuerDid: ${issuerDid}`);
    (error as any).status = 404;
    throw error;
  }

  if (isJwkEntry(entry)) {
    const jwk = entry.issuerKey.jwk as JWK;
    const pubRest = { ...jwk };
    delete (pubRest as any).d;
    const publicJwk = pubRest as JWK;

    const keyType: KeyType = entry.keyType === 'secp256r1' ? 'ecdsa' : 'eddsa';
    const alg: Alg = entry.keyType === 'secp256r1' ? 'ES256' : 'Ed25519';
    const verificationMethodId =
      entry.verificationMethodId ?? (jwk.kid ? `${entry.issuer_did}#${jwk.kid}` : `${entry.issuer_did}#key-1`);

    return {
      mode: 'jwk',
      keyType,
      alg,
      verificationMethodId,
      publicJwk,
      privateJwk: jwk,
    };
  }

  if (isMultibaseEntry(entry)) {
    return {
      mode: 'multibase',
      publicKeyMultibase: (entry as any).publicKeyMultibase,
      secretKeyMultibase: (entry as any).secretKeyMultibase,
    };
  }

  const error = new Error(`Issuer config incomplete for ${issuerDid}`);
  (error as any).status = 400;
  throw error;
}

function removeProof<T extends { proof?: unknown }>(vc: T): Omit<T, 'proof'> {
  const { proof, ...vcWithoutProof } = vc as any;
  return vcWithoutProof as any;
}

async function jwkImportPublic(jwk: JWK, alg: Alg): Promise<CryptoKey> {
  if (alg === 'ES256') {
    return crypto.subtle.importKey(
      'jwk',
      jwk as JsonWebKey,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    );
  }
  if (alg === 'Ed25519') {
    return crypto.subtle.importKey('jwk', jwk as JsonWebKey, { name: 'Ed25519' }, false, ['verify']);
  }
  throw new Error(`Unsupported alg: ${alg}`);
}

async function jwkImportPrivate(jwk: JWK, alg: Alg): Promise<CryptoKey> {
  if (alg === 'ES256') {
    return crypto.subtle.importKey(
      'jwk',
      jwk as JsonWebKey,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );
  }
  if (alg === 'Ed25519') {
    return crypto.subtle.importKey('jwk', jwk as JsonWebKey, { name: 'Ed25519' }, false, ['sign']);
  }
  throw new Error(`Unsupported alg: ${alg}`);
}

async function sign(
  dataToSign: Uint8Array | ArrayBufferLike,
  issuerCrypto: IssuerCrypto
): Promise<string> {
  if (issuerCrypto.mode === 'jwk') {
    const { privateJwk, alg } = issuerCrypto;
    const key = await jwkImportPrivate(privateJwk, alg);
    const algo: AlgorithmIdentifier | EcKeyAlgorithm | any =
      alg === 'ES256' ? { name: 'ECDSA', hash: 'SHA-256' } : { name: 'Ed25519' };
    const sig = await crypto.subtle.sign(algo, key, toBufferSource(dataToSign));
    return Buffer.from(new Uint8Array(sig)).toString('base64url');
  }

  const keyType = keyUtils.getKeyTypeFromSecretKeyMultibase(issuerCrypto.secretKeyMultibase);
  const secretKey = multibaseDecode(issuerCrypto.secretKeyMultibase).bytes;
  let signature: Uint8Array;
  if (keyType === 'eddsa') {
    signature = await ed25519.sign(dataToSign as Uint8Array, secretKey.slice(2));
  } else if (keyType === 'ecdsa') {
    signature = secp256k1.sign(dataToSign as Uint8Array, secretKey.slice(2));
  } else {
    throw new Error('unsupported key format');
  }
  return b64urlEncode(signature);
}

async function verify(
  signature: string,
  message: Uint8Array,
  issuerCrypto: IssuerCrypto
): Promise<boolean> {
  try {
    if (issuerCrypto.mode === 'jwk') {
      const { publicJwk, alg } = issuerCrypto;
      const key = await jwkImportPublic(publicJwk, alg);
      const algo: AlgorithmIdentifier | EcKeyAlgorithm | any =
        alg === 'ES256' ? { name: 'ECDSA', hash: 'SHA-256' } : { name: 'Ed25519' };
      const sigBytes = Uint8Array.from(Buffer.from(signature, 'base64url'));
      return await crypto.subtle.verify(algo, key, sigBytes, toBufferSource(message));
    }

    const keyType = keyUtils.getKeyTypeFromPublicKeyMultibase(issuerCrypto.publicKeyMultibase);
    const publicKey = multibaseDecode(issuerCrypto.publicKeyMultibase).bytes;
    const sigBytes =
      typeof signature === 'string' ? multibaseDecode(signature).bytes : (signature as unknown as Uint8Array);
    if (keyType === 'eddsa') {
      return ed25519.verify(sigBytes, message, publicKey.slice(2));
    }
    if (keyType === 'ecdsa') {
      return secp256k1.verify(sigBytes, message, publicKey.slice(2));
    }
    throw new Error('unsupported key format');
  } catch {
    return false;
  }
}

export async function addProof(
  vc: any,
  issuerDid: string,
  controllerDid: string
): Promise<any> {
  const issuerCrypto = loadKeyPairByIssuerDid(issuerDid);

  const proofType: KeyType =
    issuerCrypto.mode === 'jwk' ? (issuerCrypto.keyType as KeyType) : keyUtils.getKeyTypeFromPublicKeyMultibase(
      (issuerCrypto as IssuerCryptoMultibase).publicKeyMultibase
    );

  const verificationMethod =
    issuerCrypto.mode === 'jwk'
      ? (issuerCrypto as IssuerCryptoJwk).verificationMethodId!
      : `${issuerDid}#key-1`;

  const proof = {
    type: proofType === 'ecdsa' ? 'ecdsa' : 'eddsa',
    created: new Date().toISOString(),
    verificationMethod,
    proofPurpose: 'assertionMethod',
  };

  const vcWithoutProof = removeProof(vc);
  const dataToSign = toSignableUint8Array(vcWithoutProof);
  const proofValue = await sign(dataToSign, issuerCrypto);

  const proofWithSignature = { ...proof, proofValue };
  return { ...vcWithoutProof, proof: proofWithSignature };
}

export async function verifyBSL(vc: any, issuerDid: string): Promise<boolean> {
  const { proof, ...document } = vc;
  if (!proof) {
    const error = new Error('Proof is missing');
    (error as any).status = 400;
    throw error;
  }
  const { proofValue, ..._proofMeta } = proof;
  const vcWithoutProof = removeProof(vc);
  const canonicalized = canonicalize(vcWithoutProof);
  const dataToVerify = new TextEncoder().encode(canonicalized);

  const issuerCrypto = loadKeyPairByIssuerDid(issuerDid);
  return await verify(proofValue, dataToVerify, issuerCrypto);
}
