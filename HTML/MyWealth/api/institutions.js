import { db, decryptKey, getGoCardlessToken } from './_utils.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const uid = req.query.uid;
  if (!uid) return res.status(400).json({ error: 'Missing uid parameter' });

  try {
    if (!db) throw new Error('Database not initialized');
    
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists || !userDoc.data().gocardless_secret_id_encrypted) {
      return res.status(400).json({ error: 'GoCardless keys not configured for this user' });
    }
    
    const data = userDoc.data();
    const secretId = decryptKey(data.gocardless_secret_id_encrypted);
    const secretKey = decryptKey(data.gocardless_secret_key_encrypted);
    
    const token = await getGoCardlessToken(secretId, secretKey);
    
    // Fetch institutions (FR by default, can be dynamic later)
    const response = await fetch('https://bankaccountdata.gocardless.com/api/v2/institutions/?country=FR', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    
    const instData = await response.json();
    if (!response.ok) {
      throw new Error(instData.detail || 'Failed to fetch institutions');
    }
    
    return res.status(200).json(instData);
  } catch (err) {
    console.error('Error in institutions:', err);
    return res.status(500).json({ error: err.message });
  }
}
