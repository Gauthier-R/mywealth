import { db, decryptKey, getEnableBankingToken } from './_utils.js';
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { uid, institutionId, redirectUrl } = req.body;
  
  if (!uid || !institutionId || !redirectUrl) {
    return res.status(400).json({ error: 'Missing uid, institutionId, or redirectUrl' });
  }

  try {
    if (!db) throw new Error('Database not initialized');
    
    const appId = process.env.ENABLEBANKING_APP_ID;
    const privateKey = process.env.ENABLEBANKING_PRIVATE_KEY;
    
    if (!appId || !privateKey) {
      return res.status(500).json({ error: 'Global Enable Banking keys not configured on the server' });
    }
    
    const token = getEnableBankingToken(appId, privateKey);
    
    // 1. Create the Auth session (equivalent to Requisition in GoCardless)
    const stateId = crypto.randomUUID();
    
    // Calculate a valid_until date (e.g. 90 days from now)
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 89);

    const authRes = await fetch('https://api.enablebanking.com/auth', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        access: {
          valid_until: validUntil.toISOString(),
          balances: true,
          transactions: true
        },
        aspsp: {
          name: institutionId,
          country: 'FR'
        },
        state: stateId,
        redirect_url: redirectUrl
      })
    });
    
    const authData = await authRes.json();
    if (!authRes.ok) throw new Error(authData.error || 'Failed to create auth session');
    
    // 2. Save auth state in Firestore to verify later and link to this user
    await db.collection('bank_accounts').doc(stateId).set({
      uid: uid,
      institution_id: institutionId,
      status: 'INITIATED',
      created_at: new Date().toISOString()
    });
    
    // L'API Enable Banking retourne l'URL de redirection dans authData.url
    return res.status(200).json({ link: authData.url });
  } catch (err) {
    console.error('Create requisition error:', err);
    return res.status(500).json({ error: err.message });
  }
}
