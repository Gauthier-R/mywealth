import * as admin from 'firebase-admin';
import crypto from 'crypto';

if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

export const db = admin.apps.length ? admin.firestore() : null;

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

export async function getGoCardlessToken(secretId, secretKey) {
  const response = await fetch('https://bankaccountdata.gocardless.com/api/v2/token/new/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      secret_id: secretId,
      secret_key: secretKey
    })
  });
  
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || data.summary || 'Failed to get GoCardless token');
  }
  return data.access;
}
