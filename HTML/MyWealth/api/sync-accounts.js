import { db, decryptKey, getEnableBankingToken } from './_utils.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  // The frontend needs to pass the 'code' received from the callback redirect
  const { uid, code } = req.body;
  
  if (!uid || !code) {
    return res.status(400).json({ error: 'Missing uid or code' });
  }

  try {
    if (!db) throw new Error('Database not initialized');

    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists || !userDoc.data().enablebanking_app_id_encrypted) {
      return res.status(400).json({ error: 'Enable Banking keys not configured for this user' });
    }
    
    const data = userDoc.data();
    const appId = decryptKey(data.enablebanking_app_id_encrypted);
    const privateKey = decryptKey(data.enablebanking_private_key_encrypted);
    const token = getEnableBankingToken(appId, privateKey);

    // 1. Create a session by exchanging the auth code
    const sessionRes = await fetch('https://api.enablebanking.com/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code })
    });
    
    const session = await sessionRes.json();
    if (!sessionRes.ok) throw new Error(session.error || 'Failed to create session from code');

    const accounts = session.accounts || [];
    const syncedData = [];

    // 2. For each account, fetch balances and transactions
    for (const account of accounts) {
      const accountUid = account.uid;
      
      // Get balances
      const balRes = await fetch(`https://api.enablebanking.com/accounts/${accountUid}/balances`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const balances = await balRes.ok ? await balRes.json() : {};

      // Get transactions
      const txRes = await fetch(`https://api.enablebanking.com/accounts/${accountUid}/transactions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const transactions = await txRes.ok ? await txRes.json() : {};

      syncedData.push({
        accountId: accountUid,
        details: account,
        balances: balances.balances || [],
        transactions: transactions.transactions || []
      });
    }

    // Save session reference in Firestore
    const sessionIdToSave = session.session_id || `session_${Date.now()}`;
    await db.collection('bank_accounts').doc(sessionIdToSave).set({
      uid: uid,
      session_id: sessionIdToSave,
      status: session.status || 'ACTIVE',
      created_at: new Date().toISOString()
    });

    // Return the data back to the client
    return res.status(200).json({ 
      success: true, 
      session_id: sessionIdToSave,
      valid_until: session.valid_until || null,
      accounts: syncedData 
    });
  } catch (err) {
    console.error('Sync accounts error:', err);
    return res.status(500).json({ error: err.message });
  }
}
