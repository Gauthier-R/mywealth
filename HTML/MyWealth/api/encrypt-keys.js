import * as admin from 'firebase-admin';
import crypto from 'crypto';

// Initialize Firebase Admin (requires FIREBASE_SERVICE_ACCOUNT_KEY env var in Vercel)
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

const db = admin.apps.length ? admin.firestore() : null;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Expecting the user's uid and the GoCardless keys
  const { uid, secretId, secretKey } = req.body;
  
  if (!uid || !secretId || !secretKey) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const encryptionKey = process.env.ENCRYPTION_SECRET;
  if (!encryptionKey || encryptionKey.length !== 32) {
    return res.status(500).json({ error: 'Server misconfiguration: ENCRYPTION_SECRET must be 32 characters long' });
  }

  try {
    // Encrypt the GoCardless Secret ID and Secret Key
    const cipherId = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey), Buffer.alloc(16, 0));
    let encryptedId = cipherId.update(secretId, 'utf8', 'hex');
    encryptedId += cipherId.final('hex');

    const cipherKey = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey), Buffer.alloc(16, 0));
    let encryptedKey = cipherKey.update(secretKey, 'utf8', 'hex');
    encryptedKey += cipherKey.final('hex');

    // Save to Firestore
    await db.collection('users').doc(uid).set({
      gocardless_secret_id_encrypted: encryptedId,
      gocardless_secret_key_encrypted: encryptedKey,
      gocardless_configured: true,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return res.status(200).json({ success: true, message: 'Keys encrypted and saved successfully.' });
  } catch (error) {
    console.error('Encryption or DB Error:', error);
    return res.status(500).json({ error: 'Failed to process keys.' });
  }
}
