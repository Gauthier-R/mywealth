import { db, decryptKey, getEnableBankingToken } from './_utils.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const uid = req.query.uid;
  if (!uid) return res.status(400).json({ error: 'Missing uid parameter' });

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
    
    // Fetch ASPSPs (Institutions) - Filtrer pour la France par exemple ou retourner tout
    const response = await fetch('https://api.enablebanking.com/aspsps?country=FR', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const aspsps = await response.json();
    if (!response.ok) {
      throw new Error(aspsps.error || 'Failed to fetch institutions');
    }
    
    // Enable Banking retourne un objet avec aspsps: [...]
    // On mappe pour correspondre au format attendu par notre frontend (id, name)
    const formattedInstitutions = (aspsps.aspsps || []).map(bank => ({
      id: bank.name, // Enable Banking utilise souvent le nom comme identifiant ou un objet complet, ici on garde le nom pour l'auth
      name: bank.title || bank.name,
      logo: bank.logo
    }));

    return res.status(200).json(formattedInstitutions);
  } catch (err) {
    console.error('Error in institutions:', err);
    return res.status(500).json({ error: err.message });
  }
}
