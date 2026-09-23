import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

if (!getApps().length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      initializeApp({
        credential: cert(serviceAccount)
      });
    }
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

export const db = getApps().length ? getFirestore() : null;

export function decryptKey(encryptedHex) {
  const encryptionKey = process.env.ENCRYPTION_SECRET;
  if (!encryptionKey || encryptionKey.length !== 32) {
    throw new Error('Server misconfiguration: ENCRYPTION_SECRET must be 32 characters long');
  }
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(encryptionKey), Buffer.alloc(16, 0));
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Génère un JWT pour l'API Enable Banking
export function getEnableBankingToken(appId, privateKeyStr) {
  // Fix potentially mangled private keys from Vercel environment variables
  let formattedKey = privateKeyStr || '';
  
  // 1. Handle literal "\n" strings
  formattedKey = formattedKey.replace(/\\n/g, '\n');
  
  // 2. Handle missing newlines (Vercel sometimes replaces newlines with spaces)
  if (!formattedKey.includes('\n')) {
    const match = formattedKey.match(/-----BEGIN PRIVATE KEY-----(.*?)-----END PRIVATE KEY-----/s);
    if (match) {
      const body = match[1].replace(/\s+/g, ''); // remove all spaces
      const newBody = body.match(/.{1,64}/g).join('\n'); // chunk every 64 chars
      formattedKey = `-----BEGIN PRIVATE KEY-----\n${newBody}\n-----END PRIVATE KEY-----`;
    }
  }

  // Le token est typiquement valide 1 heure
  const payload = {
    iss: 'enablebanking.com',
    aud: 'api.enablebanking.com',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  };

  return jwt.sign(payload, formattedKey, {
    algorithm: 'RS256',
    keyid: appId
  });
}
