import { db, decryptKey, getEnableBankingToken } from './_utils.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { uid, accountUids } = req.body;
  
  if (!uid || !Array.isArray(accountUids)) {
    return res.status(400).json({ error: 'Missing uid or accountUids array' });
  }

  if (accountUids.length === 0) {
    return res.status(200).json({ success: true, accounts: [] });
  }

  try {
    if (!db) throw new Error('Database not initialized');

    const appId = process.env.ENABLEBANKING_APP_ID;
    const privateKey = process.env.ENABLEBANKING_PRIVATE_KEY;
    
    if (!appId || !privateKey) {
      return res.status(500).json({ error: 'Global Enable Banking keys not configured on the server' });
    }
    
    const token = getEnableBankingToken(appId, privateKey);

    const syncedData = [];

    // Fetch balances and transactions for each account
    for (const accountUid of accountUids) {
      try {
        // Get balances
        const balRes = await fetch(`https://api.enablebanking.com/accounts/${accountUid}/balances`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!balRes.ok) {
          if (balRes.status === 401 || balRes.status === 403) {
             syncedData.push({ accountId: accountUid, error: 'Unauthorized or session expired', expired: true });
             continue;
          }
          throw new Error(`Failed to fetch balances: ${balRes.status}`);
        }
        const balances = await balRes.json();

        // Get transactions
        const txRes = await fetch(`https://api.enablebanking.com/accounts/${accountUid}/transactions`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!txRes.ok) {
           throw new Error(`Failed to fetch transactions: ${txRes.status}`);
        }
        const transactions = await txRes.json();

        syncedData.push({
          accountId: accountUid,
          balances: balances.balances || [],
          transactions: transactions.transactions || []
        });
      } catch (err) {
        console.error(`Error syncing account ${accountUid}:`, err);
        syncedData.push({ accountId: accountUid, error: err.message, expired: false });
      }
    }

    return res.status(200).json({ success: true, accounts: syncedData });
  } catch (err) {
    console.error('Background sync error:', err);
    return res.status(500).json({ error: err.message });
  }
}
