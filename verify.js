import canonicalize from 'json-canonicalize';

export function toSignableUint8Array(obj: object): Uint8Array {
  const canonicalized = canonicalize(obj);
  return new TextEncoder().encode(canonicalized);
}


// signing.ts
import { IssuerCrypto } from './types';
import * as ed25519 from '@noble/ed25519';
import * as secp256k1 from '@noble/secp256k1';

// base64url 无填充
const b64u = {
  encode: (u8: Uint8Array) =>
    Buffer.from(u8).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_'),
  decode: (str: string) =>
    new Uint8Array(Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64')),
};

function toBufferSource(u8: Uint8Array | ArrayBufferLike): ArrayBuffer {
  return u8 instanceof Uint8Array ? u8.buffer : (u8 as ArrayBuffer);
}

export async function sign(dataToSign: Uint8Array | ArrayBufferLike, issuerCrypto: IssuerCrypto): Promise<string> {
  if (issuerCrypto.mode === 'jwk') {
    const { privateJwk, alg } = issuerCrypto;
    if (!privateJwk?.d) {
      const e: any = new Error('Missing private JWK (d)');
      e.status = 400;
      throw e;
    }
    const key = await crypto.subtle.importKey(
      'jwk',
      privateJwk as JsonWebKey,
      {
        name: alg === 'ES256' ? 'ECDSA' : 'Ed25519',
        namedCurve: privateJwk.crv as any, // 'P-256' or 'Ed25519'
      },
      false,
      ['sign']
    );

    const sig = await crypto.subtle.sign(
      alg === 'ES256' ? { name: 'ECDSA', hash: 'SHA-256' } : { name: 'Ed25519' },
      key,
      toBufferSource(dataToSign)
    );
    return b64u.encode(new Uint8Array(sig));
  }

  // multibase 分支
  const { keyType, secretKeyMultibase } = issuerCrypto;
  if (!secretKeyMultibase) {
    const e: any = new Error('Missing secretKeyMultibase');
    e.status = 400;
    throw e;
  }
  // multibase 内容是 base64url，无前缀时直接按 b64url 处理
  const skBytes = b64u.decode(secretKeyMultibase);
  const msg = dataToSign instanceof Uint8Array ? dataToSign : new Uint8Array(dataToSign);

  if (keyType === 'eddsa') {
    const sig = await ed25519.sign(msg, skBytes.slice(2)); // 兼容你之前 slice(2) 的约定
    return b64u.encode(sig);
  } else {
    const sig = await secp256k1.sign(msg, skBytes.slice(2), { der: false });
    return b64u.encode(sig);
  }
}

export async function verify(signatureB64u: string, message: Uint8Array | ArrayBufferLike, issuerCrypto: IssuerCrypto): Promise<boolean> {
  if (issuerCrypto.mode === 'jwk') {
    const { publicJwk, alg } = issuerCrypto;
    const key = await crypto.subtle.importKey(
      'jwk',
      publicJwk as JsonWebKey,
      {
        name: alg === 'ES256' ? 'ECDSA' : 'Ed25519',
        namedCurve: publicJwk.crv as any,
      },
      false,
      ['verify']
    );
    const sig = b64u.decode(signatureB64u);
    return await crypto.subtle.verify(
      alg === 'ES256' ? { name: 'ECDSA', hash: 'SHA-256' } : { name: 'Ed25519' },
      key,
      sig,
      toBufferSource(message)
    );
  }

  // multibase
  const { keyType, publicKeyMultibase } = issuerCrypto;
  const pkBytes = b64u.decode(publicKeyMultibase);
  const msg = message instanceof Uint8Array ? message : new Uint8Array(message);
  const sig = b64u.decode(signatureB64u);

  if (keyType === 'eddsa') {
    return await ed25519.verify(sig, msg, pkBytes.slice(2));
  } else {
    return secp256k1.verify(sig, msg, pkBytes.slice(2));
  }
}


// proofs.ts
import { loadKeyPairByIssuerDid } from './load';
import { toSignableUint8Array } from './canon';
import { sign, verify } from './signing';
import { IssuerCrypto } from './types';

function removeProof<T extends { proof?: unknown }>(vc: T): Omit<T, 'proof'> {
  const { proof, ...rest } = vc as any;
  return rest as any;
}

export async function addProof(
  vc: any,
  issuerDid: string,
  controllerDid: string
): Promise<any> {
  const issuerCrypto: IssuerCrypto = loadKeyPairByIssuerDid(issuerDid);

  const proofType = issuerCrypto.keyType; // 'ecdsa' | 'eddsa'
  const verificationMethod =
    issuerCrypto.verificationMethodId ?? `${issuerDid}#key-1`;

  const proof: any = {
    type: proofType,
    created: new Date().toISOString(),
    verificationMethod,
    proofPurpose: 'assertionMethod',
    controller: controllerDid,
  };

  const vcWithoutProof = removeProof(vc);
  const dataToSign = toSignableUint8Array(vcWithoutProof);   // ← 仍然 json-canonicalize

  const proofValue = await sign(dataToSign, issuerCrypto);

  return {
    ...vcWithoutProof,
    proof: { ...proof, proofValue },
  };
}

export async function verifyBSL(vc: any, issuerDid: string): Promise<boolean> {
  const { proof, ...document } = vc;
  if (!proof) {
    const e: any = new Error('Proof is missing');
    e.status = 400;
    throw e;
  }
  const { proofValue } = proof;

  const dataToVerify = toSignableUint8Array(document); // ← 仍然 json-canonicalize
  const issuerCrypto: IssuerCrypto = loadKeyPairByIssuerDid(issuerDid);

  return await verify(proofValue, dataToVerify, issuerCrypto);
}
