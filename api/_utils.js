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
  // Le token est typiquement valide 1 heure
  const payload = {
    iss: 'enablebanking.com',
    aud: 'api.enablebanking.com',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  };

  // Enable Banking requiert que le "kid" (key ID) soit l'App ID si aucune key string n'est fournie, 
  // mais la spec de base utilise l'App ID pour l'authentification
  return jwt.sign(payload, privateKeyStr, {
    algorithm: 'RS256',
    keyid: appId
  });
}
