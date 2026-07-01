import { db, decryptKey, getGoCardlessToken } from './_utils.js';
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { uid, institutionId, redirectUrl } = req.body;
  
  if (!uid || !institutionId || !redirectUrl) {
    return res.status(400).json({ error: 'Missing uid, institutionId, or redirectUrl' });
  }

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
    
    // 1. Create an End User Agreement
    const ref = crypto.randomUUID();
    const agreementRes = await fetch('https://bankaccountdata.gocardless.com/api/v2/agreements/enduser/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        institution_id: institutionId,
        max_historical_days: 180,
        access_valid_for_days: 90,
        access_scope: ["balances", "details", "transactions"]
      })
    });
    
    const agreement = await agreementRes.json();
    if (!agreementRes.ok) throw new Error(agreement.detail || 'Failed to create agreement');

    // 2. Create the Requisition
    const reqRes = await fetch('https://bankaccountdata.gocardless.com/api/v2/requisitions/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        redirect: redirectUrl,
        institution_id: institutionId,
        reference: ref,
        agreement: agreement.id,
        user_language: "FR"
      })
    });
    
    const requisition = await reqRes.json();
    if (!reqRes.ok) throw new Error(requisition.detail || 'Failed to create requisition');
    
    // 3. Save requisition link in Firestore for this user
    await db.collection('bank_accounts').doc(requisition.id).set({
      uid: uid,
      institution_id: institutionId,
      reference: ref,
      status: requisition.status,
      created_at: new Date().toISOString()
    });
    
    return res.status(200).json({ link: requisition.link });
  } catch (err) {
    console.error('Create requisition error:', err);
    return res.status(500).json({ error: err.message });
  }
}
