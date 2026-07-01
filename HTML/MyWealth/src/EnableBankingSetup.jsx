import React, { useState } from 'react';
import { Settings, ShieldCheck, ExternalLink, KeyRound, FileText } from 'lucide-react';

export default function EnableBankingSetup({ userId }) {
  const [appId, setAppId] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const handleSaveKeys = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    
    const uid = userId || "USER_ID_PLACEHOLDER"; 

    try {
      const response = await fetch('/api/encrypt-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uid, appId, privateKey }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus({ type: 'success', message: 'Clés Enable Banking sécurisées et enregistrées avec succès !' });
        setAppId('');
        setPrivateKey('');
      } else {
        setStatus({ type: 'error', message: data.error || 'Erreur lors de la sauvegarde.' });
      }
    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', message: 'Erreur de connexion au serveur.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 max-w-2xl mx-auto mt-8">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
          <Settings size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Synchronisation Bancaire</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Liez vos comptes via Enable Banking (Gratuit & Sécurisé)</p>
        </div>
      </div>

      <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-800/30 mb-6">
        <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2 flex items-center">
          <ShieldCheck size={18} className="mr-2" />
          Tutoriel : Comment obtenir vos clés ?
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800 dark:text-blue-200 ml-1">
          <li>
            Inscrivez-vous sur le portail développeur : 
            <a href="https://enablebanking.com/" target="_blank" rel="noreferrer" className="inline-flex items-center ml-1 text-blue-600 hover:underline font-medium">
              Enable Banking <ExternalLink size={14} className="ml-1" />
            </a>
          </li>
          <li>Dans le tableau de bord, créez une nouvelle application en choisissant l'environnement <strong>Restricted Production</strong> (gratuit).</li>
          <li>Copiez l'<strong>Application ID</strong> et générez une <strong>Private Key</strong> (Clé privée, souvent un fichier .pem ou un long texte).</li>
          <li>Collez-les ci-dessous. Elles seront chiffrées de bout-en-bout !</li>
        </ol>
      </div>

      <form onSubmit={handleSaveKeys} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Application ID</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <KeyRound size={16} />
            </div>
            <input
              type="text"
              required
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              className="pl-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              placeholder="Ex: c1d2e3f4-..."
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Private Key (Contenu complet)</label>
          <div className="relative">
             <div className="absolute top-3 left-0 pl-3 flex items-start pointer-events-none text-gray-400">
              <FileText size={16} />
            </div>
            <textarea
              required
              rows={4}
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              className="pl-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow font-mono text-xs"
              placeholder="-----BEGIN PRIVATE KEY-----&#10;MIIEvAIBADANBgkqhkiG9w0BAQEFAASC...&#10;-----END PRIVATE KEY-----"
            />
          </div>
        </div>

        {status && (
          <div className={`p-3 rounded-lg text-sm ${status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {status.message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex justify-center items-center disabled:opacity-50"
        >
          {loading ? 'Sécurisation en cours...' : 'Enregistrer et Sécuriser'}
        </button>
      </form>
    </div>
  );
}
