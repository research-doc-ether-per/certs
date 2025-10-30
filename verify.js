import { webcrypto as nodeWebcrypto } from 'crypto';

const cryptoSubtle: SubtleCrypto =
  (globalThis.crypto?.subtle as SubtleCrypto) ?? (nodeWebcrypto.subtle as SubtleCrypto);

function toBufferSource(u8: Uint8Array | ArrayBufferLike): ArrayBuffer {
  return u8 instanceof Uint8Array ? u8.buffer : u8 as ArrayBuffer;
}


export async function sign(
  dataToSign: Uint8Array | ArrayBufferLike,
  issuerCrypto: IssuerCrypto,
): Promise<string> {
  if (issuerCrypto.mode === 'jwk') {
    const { privateJwk, alg } = issuerCrypto;
    if (!privateJwk?.d) throw new Error('Missing private JWK (no d)');

    const keyAlgo =
      alg === 'ES256'
        ? { name: 'ECDSA', hash: 'SHA-256' }
        : { name: 'Ed25519' as const };

    const key = await cryptoSubtle.importKey(
      'jwk',
      privateJwk as JsonWebKey,
      alg === 'ES256' ? { name: 'ECDSA', namedCurve: 'P-256' } : { name: 'Ed25519' },
      false,
      ['sign'],
    );

    const sig = await cryptoSubtle.sign(
      keyAlgo as any,
      key,
      toBufferSource(dataToSign),
    );
    return multibaseEncode(new Uint8Array(sig), 'base64url');
  }

  const raw = multibaseDecode(issuerCrypto.secretKeyMultibase).bytes;
  const sk = raw.slice(2);
  let signature: Uint8Array;

  if (issuerCrypto.keyType === 'eddsa') {
    signature = await ed25519.sign(dataToSign as Uint8Array, sk);
  } else {
    signature = await secp256k1.sign(dataToSign as Uint8Array, sk);
  }
  return multibaseEncode(signature, 'base64url');
}

export async function verify(
  signatureB64u: string,
  message: Uint8Array | ArrayBufferLike,
  issuerCrypto: IssuerCrypto,
): Promise<boolean> {
  if (issuerCrypto.mode === 'jwk') {
    const { publicJwk, alg } = issuerCrypto;

    const key = await cryptoSubtle.importKey(
      'jwk',
      publicJwk as JsonWebKey,
      alg === 'ES256' ? { name: 'ECDSA', namedCurve: 'P-256' } : { name: 'Ed25519' },
      false,
      ['verify'],
    );

    const sig = multibaseDecode(signatureB64u).bytes;
    const ok = await cryptoSubtle.verify(
      alg === 'ES256' ? { name: 'ECDSA', hash: 'SHA-256' } : { name: 'Ed25519' as const },
      key,
      sig,
      toBufferSource(message),
    );
    return ok;
  }

  const pk = multibaseDecode(issuerCrypto.publicKeyMultibase).bytes.slice(2);
  const sig = multibaseDecode(signatureB64u).bytes;

  if (issuerCrypto.keyType === 'eddsa') {
    return ed25519.verify(sig, message as Uint8Array, pk);
  } else {
    return secp256k1.verify(sig, message as Uint8Array, pk);
  }
}


