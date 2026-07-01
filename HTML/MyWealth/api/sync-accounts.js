import { db, decryptKey, getGoCardlessToken } from './_utils.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { uid, requisitionId } = req.body;
  
  if (!uid || !requisitionId) {
    return res.status(400).json({ error: 'Missing uid or requisitionId' });
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

    // 1. Get requisition details to see connected accounts
    const reqRes = await fetch(`https://bankaccountdata.gocardless.com/api/v2/requisitions/${requisitionId}/`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    
    const requisition = await reqRes.json();
    if (!reqRes.ok) throw new Error(requisition.detail || 'Failed to fetch requisition details');

    // Update status in Firestore
    await db.collection('bank_accounts').doc(requisitionId).set({ status: requisition.status }, { merge: true });

    if (requisition.status !== 'LN' && requisition.status !== 'EX') {
      return res.status(400).json({ error: `Account is not linked yet (status: ${requisition.status})` });
    }

    const accounts = requisition.accounts || [];
    const syncedData = [];

    // 2. For each account, fetch details, balances, and transactions
    for (const accountId of accounts) {
      // Get details (IBAN, owner name, currency)
      const detailRes = await fetch(`https://bankaccountdata.gocardless.com/api/v2/accounts/${accountId}/details/`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      const detail = await detailRes.json();

      // Get balances
      const balRes = await fetch(`https://bankaccountdata.gocardless.com/api/v2/accounts/${accountId}/balances/`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      const balances = await balRes.json();

      // Get transactions
      const txRes = await fetch(`https://bankaccountdata.gocardless.com/api/v2/accounts/${accountId}/transactions/`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      const transactions = await txRes.json();

      syncedData.push({
        accountId,
        details: detail.account || {},
        balances: balances.balances || [],
        transactions: transactions.transactions || { booked: [], pending: [] }
      });
    }

    // Return the data back to the client so that the React app can format it and merge it into its state
    return res.status(200).json({ success: true, accounts: syncedData });
  } catch (err) {
    console.error('Sync accounts error:', err);
    return res.status(500).json({ error: err.message });
  }
}
