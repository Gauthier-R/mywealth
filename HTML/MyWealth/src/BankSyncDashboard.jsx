import React, { useState, useEffect } from 'react';
import { Building, Link as LinkIcon, RefreshCw, PlusCircle, AlertTriangle, ExternalLink } from 'lucide-react';

export default function BankSyncDashboard({ userId, onSyncComplete, existingAssets = [] }) {
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedBank, setSelectedBank] = useState('');
  const [isConfigured, setIsConfigured] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [status, setStatus] = useState(null);
  const [fetchedAccounts, setFetchedAccounts] = useState(null);
  const [selectedAccountIds, setSelectedAccountIds] = useState([]);

  useEffect(() => {
    if (userId) {
      fetchInstitutions();
      
      // Check for Enable Banking callback
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      if (code && !isSyncing) {
        handleCallbackSync(code);
      }
    }
  }, [userId]);

  const handleCallbackSync = async (code) => {
    setIsSyncing(true);
    setStatus({ type: 'info', message: 'Finalisation de la connexion bancaire...' });
    
    // Nettoyer l'URL
    window.history.replaceState({}, document.title, window.location.pathname);

    try {
      const res = await fetch('/api/sync-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: userId, code })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        setStatus({ type: 'success', message: 'Comptes récupérés, veuillez sélectionner ceux à importer :' });
        
        const newAccounts = data.accounts || [];
        setFetchedAccounts(newAccounts);
        
        // Présélectionner les comptes qui ne sont pas déjà dans existingAssets
        const preselected = newAccounts
          .filter(acc => !existingAssets.some(asset => asset.id === `enablebanking_${acc.accountId}`))
          .map(acc => acc.accountId);
        setSelectedAccountIds(preselected);
      } else {
        setStatus({ type: 'error', message: data.error || 'Erreur lors de la synchronisation.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Erreur réseau lors de la synchronisation.' });
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchInstitutions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/institutions?uid=${userId}`);
      const data = await res.json();
      
      if (res.ok) {
        setInstitutions(data);
      } else {
        if (data.error && data.error.includes('not configured')) {
          setIsConfigured(false);
        } else {
          setError(data.error || 'Erreur lors de la récupération des banques.');
        }
      }
    } catch (err) {
      setError("Erreur de connexion au serveur.");
    } finally {
      setLoading(false);
    }
  };

  const handleLinkBank = async () => {
    if (!selectedBank) return;
    setIsSyncing(true);
    setError(null);

    try {
      // Revenir sur l'app MyWealth après validation (Enable Banking ajoutera ?code=...)
      const redirectUrl = window.location.origin + '/';
      
      const res = await fetch('/api/create-requisition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: userId,
          institutionId: selectedBank,
          redirectUrl: redirectUrl
        })
      });

      const data = await res.json();
      if (res.ok && data.link) {
        // Redirection vers le portail de la banque
        window.location.href = data.link;
      } else {
        setError(data.error || 'Erreur lors de la création du lien.');
        setIsSyncing(false);
      }
    } catch (err) {
      setError("Erreur de connexion lors de la requête.");
      setIsSyncing(false);
    }
  };

  if (!isConfigured) {
    return null; // Si Enable Banking n'est pas configuré dans le profil, on ne montre rien
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-indigo-100 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <Building size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Synchronisation Bancaire</h3>
            <p className="text-sm text-slate-500">Liez vos comptes pour automatiser MyWealth.</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 text-sm rounded-lg mb-4">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {status && (
        <div className={`flex items-center gap-2 p-3 text-sm rounded-lg mb-4 ${
          status.type === 'success' ? 'bg-green-50 text-green-700' :
          status.type === 'error' ? 'bg-red-50 text-red-700' :
          'bg-blue-50 text-blue-700'
        }`}>
          {status.type === 'error' ? <AlertTriangle size={16} /> : <RefreshCw size={16} className={status.type === 'info' ? 'animate-spin' : ''} />}
          {status.message}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-3">
        <select 
          className="flex-1 p-3 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
          value={selectedBank}
          onChange={(e) => setSelectedBank(e.target.value)}
          disabled={loading || isSyncing}
        >
          <option value="">-- Sélectionnez votre banque --</option>
          {institutions.map(inst => (
            <option key={inst.id} value={inst.id}>{inst.name}</option>
          ))}
        </select>

        <button
          onClick={handleLinkBank}
          disabled={!selectedBank || isSyncing}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
        >
          {isSyncing ? (
            <><RefreshCw size={18} className="animate-spin" /> Connexion...</>
          ) : (
            <><LinkIcon size={18} /> Connecter de manière sécurisée</>
          )}
        </button>
      </div>

      {fetchedAccounts && (
        <div className="mt-6 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
          <h4 className="font-semibold text-slate-800 mb-3">Comptes détectés</h4>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
            {fetchedAccounts.map(acc => {
              const assetId = `enablebanking_${acc.accountId}`;
              const isAlreadyAdded = existingAssets.some(a => a.id === assetId);
              const isSelected = selectedAccountIds.includes(acc.accountId);
              
              const currency = acc.details?.currency || 'EUR';
              const name = acc.details?.name || acc.details?.product || 'Compte Bancaire';
              const balance = acc.balances?.[0]?.balance_amount?.amount || 0;

              return (
                <label key={acc.accountId} className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${isAlreadyAdded ? 'bg-slate-50 border-slate-200 opacity-75' : isSelected ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                  <input
                    type="checkbox"
                    className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 disabled:opacity-50"
                    disabled={isAlreadyAdded}
                    checked={isAlreadyAdded || isSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedAccountIds(prev => [...prev, acc.accountId]);
                      } else {
                        setSelectedAccountIds(prev => prev.filter(id => id !== acc.accountId));
                      }
                    }}
                  />
                  <div className="ml-3 flex-1 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-slate-800 flex items-center gap-2">
                        {name} 
                        {isAlreadyAdded && <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">Déjà importé</span>}
                      </p>
                      <p className="text-sm text-slate-500">{acc.details?.bank_name || 'Banque'} • {acc.details?.iban || acc.accountId.substring(0, 8) + '...'}</p>
                    </div>
                    <div className="font-semibold text-slate-900">
                      {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currency }).format(balance)}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
          
          <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={() => {
                if (onSyncComplete) {
                  const accountsToImport = fetchedAccounts.filter(acc => selectedAccountIds.includes(acc.accountId));
                  onSyncComplete(accountsToImport);
                  setFetchedAccounts(null); // hide list
                  setStatus({ type: 'success', message: `${accountsToImport.length} compte(s) importé(s) avec succès !` });
                  // Nettoyer l'URL
                  window.history.replaceState({}, document.title, window.location.pathname);
                }
              }}
              disabled={selectedAccountIds.length === 0}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <PlusCircle size={18} /> Importer {selectedAccountIds.length} compte(s)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
