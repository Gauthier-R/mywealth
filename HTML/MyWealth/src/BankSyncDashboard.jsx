import React, { useState, useEffect } from 'react';
import { Building, Link as LinkIcon, RefreshCw, PlusCircle, AlertTriangle, ExternalLink } from 'lucide-react';

export default function BankSyncDashboard({ userId }) {
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedBank, setSelectedBank] = useState('');
  const [isConfigured, setIsConfigured] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchInstitutions();
    }
  }, [userId]);

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
      // Revenir sur l'app MyWealth après validation
      const redirectUrl = window.location.origin + '/?sync=success';
      
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
    return null; // Si GoCardless n'est pas configuré dans le profil, on ne montre rien
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
    </div>
  );
}
