import { db } from './_utils.js';
import { FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Expecting the user's uid and the Enable Banking keys
  const { uid, appId, privateKey } = req.body;
  
  if (!uid || !appId || !privateKey) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const encryptionKey = process.env.ENCRYPTION_SECRET;
  if (!encryptionKey || encryptionKey.length !== 32) {
    return res.status(500).json({ error: 'Server misconfiguration: ENCRYPTION_SECRET must be 32 characters long' });
  }

  if (!db) {
    return res.status(500).json({ error: 'Database not initialized (missing Firebase config)' });
  }

  try {
    // Encrypt the Enable Banking App ID and Private Key
    const cipherId = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey), Buffer.alloc(16, 0));
    let encryptedAppId = cipherId.update(appId, 'utf8', 'hex');
    encryptedAppId += cipherId.final('hex');

    const cipherKey = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey), Buffer.alloc(16, 0));
    let encryptedPrivateKey = cipherKey.update(privateKey, 'utf8', 'hex');
    encryptedPrivateKey += cipherKey.final('hex');

    // Save to Firestore
    await db.collection('users').doc(uid).set({
      enablebanking_app_id_encrypted: encryptedAppId,
      enablebanking_private_key_encrypted: encryptedPrivateKey,
      enablebanking_configured: true,
      updated_at: FieldValue.serverTimestamp()
    }, { merge: true });

    return res.status(200).json({ success: true, message: 'Keys encrypted and saved successfully.' });
  } catch (error) {
    console.error('Encryption or DB Error:', error);
    return res.status(500).json({ error: 'Failed to process keys.' });
  }
}
