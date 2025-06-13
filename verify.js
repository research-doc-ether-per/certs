// generateDids.js
// Script to create DID Documents for multiple users (P-256 keys)

import { generateKeyPairSync } from 'crypto';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';

// Configuration parameters (adjust as needed)
const HOST = process.env.DID_HOST || 'host.docker.internal';
const PORT = process.env.DID_PORT || '3000';
const BASE_DID = `did:web:${HOST}%3A${PORT}`;

// List of user IDs
const users = ['test01', 'test02', 'test03', 'test04'];

// Directory to save generated DID JSON files
const configDir = path.resolve('./config');
if (!existsSync(configDir)) mkdirSync(configDir, { recursive: true });

users.forEach((user) => {
  // 1. Generate EC P-256 key pair
  const { publicKey, privateKey } = generateKeyPairSync('ec', {
    namedCurve: 'prime256v1', // secp256r1
  });

  // 2. Export public JWK
  const publicJwk = publicKey.export({ format: 'jwk' });

  // 3. Build DID Document
  const did = `${BASE_DID}:${user}`;
  const keyId = `${did}#key-1`;
  const didDoc = {
    '@context': [
      'https://www.w3.org/ns/did/v1',
      'https://w3id.org/security/suites/jws-2020/v1',
    ],
    id: did,
    verificationMethod: [
      {
        id: keyId,
        type: 'EcdsaSecp256r1VerificationKey2019',
        controller: did,
        publicKeyJwk,
      },
    ],
    authentication: [keyId],
    assertionMethod: [keyId],
  };

  // 4. Write DID Document to file
  const filePath = path.join(configDir, `did.${user}.json`);
  writeFileSync(filePath, JSON.stringify(didDoc, null, 2));
  console.log(`Created DID for ${user}: ${filePath}`);
});
