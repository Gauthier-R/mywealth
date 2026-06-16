import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, AreaChart, Area,
  LineChart, Line, Treemap, ComposedChart, ReferenceLine, Sector
} from 'recharts';
import { 
  LayoutDashboard, Wallet, ArrowRightLeft, TrendingUp, PieChart as PieIcon,
  PlusCircle, Trash2, Building, DollarSign, 
  ArrowUpRight, ArrowDownRight, Sparkles, MessageSquare, Send,
  Bot, Loader2, Calendar, X, Eye, EyeOff, ShieldCheck, Activity,
  ChevronLeft, History, List, Save, Grid, Circle, TrendingDown, Edit, Search,
  LogOut, User, Lock, Mail, AlertCircle, ArrowRight, Cloud,
  Globe, PiggyBank, Wand2, Calculator, Info, AlertTriangle, Clock,
  Utensils, Home, Car, Gamepad2, Heart, ShoppingBag, Zap, Briefcase,
  CheckCircle, LogIn, UserPlus, KeyRound, Target, Scale, Menu,
  BarChart2, LineChart as LineChartIcon, CalendarDays, ChevronRight
} from 'lucide-react';

import emailjs from '@emailjs/browser';
import Joyride, { STATUS } from 'react-joyride';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { getAnalytics } from "firebase/analytics";
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect, 
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';

// --- CONFIGURATION ENVIRONNEMENT ---
import ENV_CONFIG from './config/environment';

// --- API CONFIGURATION (via variables d'environnement) ---
const apiKey = ENV_CONFIG.GEMINI_API_KEY;
emailjs.init(ENV_CONFIG.EMAILJS_PUBLIC_KEY);

// --- FIREBASE CONFIGURATION (via variables d'environnement) ---
const firebaseConfig = ENV_CONFIG.FIREBASE_CONFIG;

// Initialize Firebase
let app;
try {
  if (!firebaseConfig || !firebaseConfig.apiKey) {
    console.error("⚠️ ERREUR : La clé API Firebase est manquante. Vérifiez votre fichier .env.local ou lancez 'vercel env pull'.");
  }
  app = initializeApp(firebaseConfig);
} catch (e) {
  console.error("Erreur lors de l'initialisation de Firebase :", e);
}

const auth = getAuth(app);
const db = getFirestore(app);

// Utilisation de l'ID dynamique pour garantir l'accès aux bonnes données
const appId = typeof __app_id !== 'undefined' ? __app_id : 'my-wealth-app-default';

// --- CONFIGURATION & UTILS ---

const COLORS = {
  liquidite: '#3b82f6', // blue-500
  investissement: '#10b981', // emerald-500
  immobilier: '#f59e0b', // amber-500
  epargne_salariale: '#06b6d4', // cyan-500
  crypto: '#8b5cf6', // violet-500
  autre: '#64748b' // slate-500
};

// Nouvelle palette pour les dépenses
const EXPENSE_CATEGORIES = {
  'Alimentation': { color: '#f59e0b', icon: Utensils },       // Amber
  'Logement': { color: '#3b82f6', icon: Home },              // Blue
  'Transport': { color: '#ef4444', icon: Car },              // Red
  'Loisirs': { color: '#8b5cf6', icon: Gamepad2 },           // Purple
  'Santé': { color: '#10b981', icon: Heart },                // Emerald
  'Shopping': { color: '#ec4899', icon: ShoppingBag },       // Pink
  'Services': { color: '#6366f1', icon: Zap },               // Indigo
  'Autre': { color: '#94a3b8', icon: Circle }                // Slate
};

const CATEGORY_LABELS = {
  liquidite: 'Liquidités & Livrets',
  investissement: 'Bourse (PEA/CTO)',
  epargne_salariale: 'Épargne Salariale (PEE)',
  immobilier: 'Immobilier (Physique/SCPI)',
  crypto: 'Crypto-monnaies',
  autre: 'Autres (Montres, Or...)'
};

// --- OPTIONS D'ICÔNES POUR LES COMPTES ---
const ASSET_ICON_OPTIONS = {
  building: { icon: Building, label: 'Banque' },
  wallet: { icon: Wallet, label: 'Portefeuille' },
  piggy: { icon: PiggyBank, label: 'Épargne' },
  trending: { icon: TrendingUp, label: 'Bourse' },
  shield: { icon: ShieldCheck, label: 'Assurance' },
  home: { icon: Home, label: 'Immo' },
  zap: { icon: Zap, label: 'Crypto' },
  briefcase: { icon: Briefcase, label: 'Pro' }
};

const INITIAL_ASSETS = [];
const INITIAL_TRANSACTIONS = [];

// --- FORMATTING HELPERS ---

// Fonction universelle pour formater les devises avec 2 décimales
const formatCurrency = (value) => {
  if (value === undefined || value === null || isNaN(value)) return "0,00 €";
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

// --- FONCTION DE NETTOYAGE IA ---
const formatAiResponse = (text) => {
  if (!text) return "";
  // Supprime les résidus de Markdown pour ne garder que le texte ou le HTML simple
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1') // Enlever les ** (gras markdown)
    .replace(/\*(.*?)\*/g, '$1')     // Enlever les * (italique markdown)
    .replace(/#{1,6}\s?/g, '');      // Enlever les # (titres markdown)
};

const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000); // Disparaît après 5s
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 z-[300] animate-in slide-in-from-right duration-300">
      <div className="bg-slate-900 text-white p-4 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-3 min-w-[300px]">
        <div className="bg-green-500/20 p-2 rounded-full text-green-400">
          <CheckCircle size={20} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-blue-400 uppercase tracking-wider">MyWealth.io</p>
          <p className="text-sm text-slate-200">{message}</p>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white p-1">
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

// --- DATA PROCESSING HELPERS ---

const processHistoryData = (timeRange, currentAssets) => {
  if (!currentAssets || currentAssets.length === 0) return [];

  const monthsBack = timeRange === '6M' ? 6 : timeRange === '1Y' ? 12 : timeRange === '5Y' ? 60 : 120;
  const data = [];
  const now = new Date();

  for (let i = monthsBack; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const endOfMonthDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const monthName = date.toLocaleDateString('fr-FR', { month: 'short', year: i > 12 ? '2-digit' : undefined });
    
    let breakdown = { liquidite: 0, investissement: 0, immobilier: 0, crypto: 0, autre: 0, epargne_salariale: 0 };
    let totalNet = 0;

    currentAssets.forEach(asset => {
      let valueAtDate = 0;
      if (i === 0) {
        valueAtDate = asset.value;
      } else {
        if (asset.history && asset.history.length > 0) {
          const sortedHistory = [...asset.history].sort((a, b) => new Date(a.date) - new Date(b.date));
          const record = sortedHistory.filter(h => new Date(h.date) <= endOfMonthDate).pop();
          if (record) valueAtDate = record.value;
          else valueAtDate = 0; 
        } else {
          valueAtDate = asset.value;
        }
      }
      if (breakdown[asset.type] !== undefined) breakdown[asset.type] += valueAtDate;
      totalNet += valueAtDate;
    });
    
    data.push({ month: monthName, ...breakdown, totalNet: totalNet });
  }
  return data;
};

const processFlowData = (timeRange, transactions) => {
  const safeTransactions = transactions || [];
  const monthsBack = timeRange === '6M' ? 6 : timeRange === '1Y' ? 12 : timeRange === '5Y' ? 60 : 120;
  const data = [];
  const now = new Date();

  for (let i = monthsBack; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const monthKey = `${year}-${month}`; 
    
    const monthName = date.toLocaleDateString('fr-FR', { month: 'short', year: i > 12 ? '2-digit' : undefined });
    const monthTrans = safeTransactions.filter(t => t.date.startsWith(monthKey));
    
    const revenus = monthTrans.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const depenses = monthTrans.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const solde = revenus - depenses;

    data.push({ month: monthName, rawDate: monthKey, revenus, depenses, solde });
  }
  return data;
};

// --- API HELPER ---
async function callGeminiAPI(systemPrompt, chatHistory, userPrompt, imageBase64 = null) {
  try {
    // 1. On convertit l'historique local vers le format attendu par Gemini
    const contents = (chatHistory || []).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // 2. On prépare le tout nouveau message
    const currentParts = [{ text: userPrompt }];
    
    // Ajout de l'image si elle existe
    if (imageBase64) {
      currentParts.push({
        inline_data: {
          mime_type: imageBase64.split(';')[0].split(':')[1],
          data: imageBase64.split(',')[1]
        }
      });
    }
    
    // 3. On ajoute ce nouveau message à la fin de l'historique
    contents.push({ role: "user", parts: currentParts });

    // APPEL DIRECT À GOOGLE (Sans passer par un backend Vercel)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: contents,
          tools: [{ googleSearch: {} }] 
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Erreur ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Désolé, je n'ai pas pu analyser les données.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return `Une erreur est survenue : ${error.message}`;
  }
}


// --- UI COMPONENTS ---

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full border border-slate-100 transform scale-100 transition-all">
        <div className="flex items-center gap-3 text-red-600 mb-3">
          <div className="p-2 bg-red-50 rounded-full"><AlertTriangle size={24} /></div>
          <h3 className="text-lg font-bold text-slate-900">{title || "Confirmer"}</h3>
        </div>
        <p className="text-slate-600 mb-6 text-sm leading-relaxed">{message || "Êtes-vous sûr de vouloir supprimer cet élément ?"}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-slate-700 hover:bg-slate-100 font-medium transition-colors text-sm">Annuler</button>
          <button onClick={() => { onConfirm(); onClose(); }} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium transition-colors shadow-sm text-sm">Oui, supprimer</button>
        </div>
      </div>
    </div>
  );
};

const ProfileModal = ({ isOpen, onClose, userProfile, onUpdate, assets, transactions, onRestore }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    birthDate: '',
    monthlyIncome: '',
    financialGoal: 'freedom',
    riskProfile: 'balanced',
    emailReports: false
  });
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  // --- NOUVELLE LOGIQUE D'ANIMATION (Sans conflits) ---
  const [isClosing, setIsClosing] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [startY, setStartY] = useState(null);
  const [currentY, setCurrentY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Déclenche l'animation fluide à l'ouverture
  useEffect(() => {
    if (isOpen) {
      setIsOpening(true);
      // Un très court délai permet au navigateur de placer la modale en bas (100vh) avant de l'animer vers sa place (0px)
      const timer = setTimeout(() => setIsOpening(false), 10);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      setCurrentY(0);
      onClose();
    }, 300); // Doit correspondre à la durée de la transition CSS
  }, [onClose]);

  const handleTouchStart = (e) => {
    if (isClosing) return;
    setStartY(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!startY || isClosing) return;
    const y = e.touches[0].clientY;
    const diff = y - startY;
    if (diff > 0) {
      setCurrentY(diff);
    }
  };

  const handleTouchEnd = () => {
    if (isClosing) return;
    setIsDragging(false);
    if (currentY > 100) { // Seuil pour déclencher la fermeture
      handleClose();
    } else {
      setCurrentY(0); // Retour élastique fluide si on lâche trop tôt
    }
    setStartY(null);
  };
  // ------------------------------------------

  // Blocage du scroll de l'arrière-plan quand la modale est ouverte
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    // Nettoyage de sécurité en cas de démontage soudain du composant
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && userProfile) {
      setFormData({
        firstName: userProfile.firstName || '',
        lastName: userProfile.lastName || '',
        birthDate: userProfile.birthDate || '',
        monthlyIncome: userProfile.monthlyIncome || '',
        financialGoal: userProfile.financialGoal || 'freedom',
        riskProfile: userProfile.riskProfile || 'balanced',
        emailReports: userProfile.emailReports || false
      });
    }
  }, [isOpen, userProfile]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleExport = () => {
    const dataToExport = {
      version: "1.0",
      exportDate: new Date().toISOString(),
      profile: userProfile,
      assets: assets,
      transactions: transactions
    };
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_wealth_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (window.confirm("Voulez-vous vraiment restaurer ces données ? Cela remplacera votre patrimoine et vos transactions actuels.")) {
          onRestore(json);
        }
      } catch (err) {
        alert("Fichier invalide.");
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  // Animation du fond sombre
  const overlayAnimation = isClosing ? "animate-out fade-out duration-300" : "animate-in fade-in duration-300";
  
  // On retire l'animation d'entrée de Tailwind pour l'axe Y pour éviter le conflit avec notre transformation manuelle
  const modalAnimation = "md:animate-in md:zoom-in-95 duration-300";

  // Logique de transformation 100% contrôlée (Ouverture, Drag, Fermeture)
  let translateY = "0px";
  if (isOpening || isClosing) {
    translateY = "100vh"; // Départ (ouverture) ou Fin (fermeture) caché tout en bas
  } else if (currentY > 0) {
    translateY = `${currentY}px`; // Suivi du doigt
  }

  // Transition dynamique : on sépare les temps d'ouverture et de fermeture
  let transitionStyle;
  if (isDragging) {
    transitionStyle = "none"; // Mouvement collé au doigt, sans latence
  } else if (isClosing) {
    // La fermeture reste à 0.3s (doit TOUJOURS correspondre au setTimeout(..., 300) de handleClose)
    transitionStyle = "transform 0.4s ease-in, opacity 0.4s ease-out"; 
  } else {
    // L'ouverture est allongée à 0.6s avec une courbe d'accélération plus douce
    transitionStyle = "transform 0.9s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.9s ease-out"; 
  }

  return (
    <div 
      className={`fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-sm ${overlayAnimation}`} 
      onMouseDown={handleClose}
    >
      <div 
        className={`bg-white rounded-t-3xl md:rounded-2xl shadow-2xl p-6 md:p-8 w-full max-w-lg border border-slate-100 max-h-[90vh] overflow-y-auto relative ${modalAnimation} ${isClosing ? 'opacity-0' : 'opacity-100'}`} 
        onMouseDown={(e) => e.stopPropagation()}
        style={{ 
          transform: translateY !== "0px" ? `translateY(${translateY})` : undefined,
          transition: transitionStyle
        }}
      >
        {/* Zone de drag limitée à l'en-tête */}
        <div 
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="pb-2 cursor-grab active:cursor-grabbing"
        >
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 md:hidden"></div>
          <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2"><User size={24} className="text-blue-600"/> Mon Profil</h3>
              <button type="button" onClick={handleClose} className="text-slate-400 hover:text-slate-600 p-1 bg-slate-50 rounded-full z-10 relative"><X size={20}/></button>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onUpdate(formData); handleClose(); }} className="space-y-5">
            {/* IDENTITÉ */}
            <div className="tour-profile-identity grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Prénom</label>
                    <input type="text" name="firstName" className="w-full p-2.5 rounded-lg border border-slate-300 outline-none" value={formData.firstName} onChange={handleChange} required />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Nom</label>
                    <input type="text" name="lastName" className="w-full p-2.5 rounded-lg border border-slate-300 outline-none" value={formData.lastName} onChange={handleChange} required />
                </div>
            </div>

            {/* DONNÉES FINANCIÈRES */}
            <div className="tour-profile-financial border-t border-slate-100 pt-4">
                <h4 className="text-sm font-bold text-indigo-900 mb-3 flex items-center gap-2"><Activity size={16}/> Données Financières</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Date de naissance</label>
                        <input type="date" name="birthDate" className="w-full p-2.5 rounded-lg border border-slate-300 outline-none" value={formData.birthDate} onChange={handleChange} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Revenu Mensuel Net (€)</label>
                        <input type="number" name="monthlyIncome" className="w-full p-2.5 rounded-lg border border-slate-300 outline-none" value={formData.monthlyIncome} onChange={handleChange} />
                    </div>
                </div>
                
                <div className="mb-4">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Objectif Principal</label>
                    <div className="space-y-1">
                      <select name="financialGoal" className="w-full p-2.5 rounded-lg border border-slate-300 outline-none bg-white font-medium" value={formData.financialGoal} onChange={handleChange}>
                          <option value="freedom">Liberté Financière</option>
                          <option value="retirement">Préparer ma Retraite</option>
                          <option value="real_estate">Projet Immobilier</option>
                          <option value="safety">Sécurité Financière</option>
                          <option value="growth">Croissance du Capital</option>
                          <option value="other">Autre</option>
                      </select>
                      <p className="text-[10px] text-slate-500 italic px-1">
                        {formData.financialGoal === 'freedom' && "L'IA priorisera la génération de revenus passifs."}
                        {formData.financialGoal === 'retirement' && "L'IA favorisera une projection sur le long terme."}
                        {formData.financialGoal === 'real_estate' && "L'IA surveillera votre apport et la liquidité de vos fonds."}
                        {formData.financialGoal === 'safety' && "L'IA vous alertera si votre épargne de secours est trop faible."}
                        {formData.financialGoal === 'growth' && "L'IA vous aidera à faire fructifier vos actifs."}
                      </p>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Profil de Risque</label>
                    <div className="space-y-1">
                      <select name="riskProfile" className="w-full p-2.5 rounded-lg border border-slate-300 outline-none bg-white font-medium" value={formData.riskProfile} onChange={handleChange}>
                          <option value="prudent">Prudent </option>
                          <option value="balanced">Équilibré </option>
                          <option value="dynamic">Dynamique </option>
                      </select>
                      <p className="text-[10px] text-slate-500 italic px-1">
                        {formData.riskProfile === 'prudent' && "Priorité à la sécurité. Perte tolérée : 0% à -2%."}
                        {formData.riskProfile === 'balanced' && "Mix entre livrets et bourse. Perte tolérée : -5% à -10%."}
                        {formData.riskProfile === 'dynamic' && "Majorité en actions/crypto. Perte tolérée : -20% ou plus."}
                      </p>
                    </div>
                </div>
            </div>

            {/* SÉCURITÉ & BACKUP */}
            <div className="tour-profile-security border-t border-slate-100 pt-4">
                <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2"><ShieldCheck size={18} className="text-green-600"/> Sécurité & Sauvegarde</h4>
                
                <div className="flex items-start gap-3 mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <input type="checkbox" id="emailReports" name="emailReports" checked={formData.emailReports} onChange={handleChange} className="mt-1 w-4 h-4 text-blue-600 rounded" />
                    <label htmlFor="emailReports" className="text-[11px] text-blue-900 font-medium leading-tight">
                        Recevoir un rapport d'analyse mensuel (inclut une sauvegarde automatique de vos données).
                    </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={handleExport} className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all group">
                        <Save size={20} className="text-blue-500 group-hover:scale-110 transition-transform mb-1"/>
                        <span className="text-[10px] font-bold uppercase text-blue-600">Exporter Sauvegarde</span>
                    </button>
                    <button type="button" onClick={() => fileInputRef.current.click()} className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-200 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-all group">
                        <Cloud size={20} className="text-slate-400 group-hover:text-indigo-600 mb-1"/>
                        <span className="text-[10px] font-bold uppercase text-slate-500">Importer Sauvegarde</span>
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileChange} />
                </div>
            </div>

            <div className="flex gap-3 justify-end mt-4 border-t border-slate-100 pt-4">
              <Button variant="secondary" onClick={handleClose} type="button">Annuler</Button>
              <Button type="submit" disabled={loading}>Enregistrer</Button>
            </div>
        </form>
      </div>
    </div>
  );
};

const InactivityModal = ({ isOpen, onStayConnected }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full border border-slate-200 text-center">
        <div className="mx-auto w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
          <Clock size={32} />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">Êtes-vous toujours là ?</h3>
        <p className="text-slate-600 mb-6">
          Pour votre sécurité, vous serez déconnecté automatiquement dans moins de 5 minutes en raison d'inactivité.
        </p>
        <button 
          onClick={onStayConnected} 
          className="w-full px-6 py-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-bold transition-all shadow-lg hover:shadow-indigo-200"
        >
          Rester connecté
        </button>
      </div>
    </div>
  );
};

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-300 hover:shadow-md transition-all duration-300 p-4 md:p-6 ${className}`}>
    {children}
  </div>
);

const Button = ({ onClick, children, variant = "primary", className = "", disabled = false, type="button" }) => {
  const baseStyle = "px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 justify-center";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300",
    secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 disabled:bg-slate-100",
    danger: "text-red-600 hover:bg-red-50",
    magic: "bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:opacity-90 shadow-md",
    ghost: "bg-transparent text-slate-500 hover:bg-slate-100",
    icon: "p-2 hover:bg-slate-100 rounded-full",
    google: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
  };
  return (
    <button onClick={onClick} type={type} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

const SparklineCard = ({ title, value, data, dataKey, color, icon: Icon, percentage }) => {
  // On crée un ID unique et valide (sans espaces) pour le dégradé SVG
  const gradientId = `grad-${title.replace(/\s+/g, '-')}`;
  const hasData = data && data.length > 0 && data.some(d => d.value > 0);

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-300 hover:shadow-md transition-all duration-300 overflow-hidden relative flex flex-col justify-between h-32 md:h-40 hover:border-indigo-200 bg-slate-50/50`}>
      <div className="p-4 md:p-5 relative z-10">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
            <h3 className="text-xl md:text-2xl font-extrabold text-slate-900">{value}</h3>
          </div>
          <div className="p-2 rounded-lg bg-white border border-slate-100 shadow-sm">
            <Icon size={20} style={{ color: color }} />
          </div>
        </div>
        {percentage && hasData && (
          <div className="mt-2 flex items-center">
             <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${parseFloat(percentage) >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {parseFloat(percentage) >= 0 ? '+' : ''}{percentage}%
             </span>
             <span className="text-[10px] text-slate-400 ml-2 hidden sm:inline">vs fin mois dernier</span>
          </div>
        )}
      </div>

      {/* ZONE DU GRAPHIQUE */}
      <div className="absolute bottom-0 left-0 right-0 h-16 opacity-30">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.6}/>
                  <stop offset="100%" stopColor={color} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area 
                type="monotone" 
                dataKey={dataKey} 
                stroke={color} 
                strokeWidth={2} 
                fill={`url(#${gradientId})`} // Utilisation de l'ID nettoyé
                isAnimationActive={true}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-end justify-center pb-2 opacity-50">
            <div className="w-full h-1 bg-slate-100"></div>
          </div>
        )}
      </div>
    </div>
  );
};

const MessageBubble = ({ message }) => {
  const isUser = message.role === 'user';
  
  const parseContent = (text) => {
    // Sécurité : si le texte est vide ou null
    if (!text) return "";
    if (isUser) return text;
    
    // On utilise la fonction de nettoyage définie plus haut
    const cleanText = formatAiResponse(text);
    
    return cleanText.split('\n').map((line, index) => {
      let content = line;
      let isHeader2 = line.startsWith('## ');
      let isHeader3 = line.startsWith('### ');
      let isList = line.trim().match(/^[-*]\s/);

      if (isHeader2) content = line.replace('## ', '');
      if (isHeader3) content = line.replace('### ', '');
      
      // Amélioration de la détection des listes (gère les espaces au début)
      const listMatch = line.match(/^(\s*)[-*]\s(.*)/);
      let indentLevel = 0;
      if (listMatch) {
        isList = true;
        indentLevel = listMatch[1].length; // Compte les espaces pour l'indentation
        content = listMatch[2]; // Garde uniquement le texte
      }

      // Logique pour transformer les <b> en vrais éléments HTML gras
      const parts = content.split(/(<b>.*?<\/b>)/g);
      const renderedLine = parts.map((part, i) => {
        if (part.startsWith('<b>') && part.endsWith('</b>')) {
          return <strong key={i} className="font-bold text-slate-900">{part.replace(/<\/?b>/g, '')}</strong>;
        }
        return part;
      });

      if (isHeader2) return <h3 key={index} className="text-lg font-bold text-indigo-700 mt-4 mb-2">{renderedLine}</h3>;
      if (isHeader3) return <h4 key={index} className="text-base font-bold text-indigo-900 mt-3 mb-1">{renderedLine}</h4>;
      if (isList) return (
        <div key={index} className={`flex gap-2 mb-1`} style={{ marginLeft: `${(indentLevel * 0.5) + 0.25}rem` }}>
          <span className="text-indigo-400 mt-1.5 w-1.5 h-1.5 bg-indigo-400 rounded-full flex-shrink-0 block"></span>
          <span className="text-slate-700">{renderedLine}</span>
        </div>
      );
      if (!line.trim()) return <div key={index} className="h-2"></div>;
      return <p key={index} className="mb-1 text-slate-700 leading-relaxed">{renderedLine}</p>;
    });
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[90%] md:max-w-[85%] p-4 rounded-2xl text-sm shadow-sm ${isUser ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-slate-200 rounded-bl-none'}`}>
        {parseContent(message.content)}
      </div>
    </div>
  );
};

const EmptyState = ({ title, description, actionLabel, onAction, icon: Icon, actionClassName = "" }) => (
  <div className="flex flex-col items-center justify-center p-10 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
    <div className="p-4 bg-white rounded-full shadow-sm mb-4"><Icon size={32} className="text-slate-400" /></div>
    <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
    <p className="text-slate-500 mb-6 max-w-xs">{description}</p>
    {actionLabel && <Button onClick={onAction} className={actionClassName}>{actionLabel}</Button>}
  </div>
);

// --- INTERACTIVE CHART COMPONENT ---
const InteractiveBudgetChart = ({ cashflowData, transactions, hasFlowData, onMonthSelect, onCategorySelect }) => {
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [activeIndex, setActiveIndex] = useState(-1);

// Gère le clic sur une barre (Mois)
const handleExpenseBarClick = (data) => {
  if (data && data.payload) {
    const monthKey = data.payload.rawDate;
    setSelectedMonth(data.payload);
    setActiveIndex(-1); // On réinitialise la catégorie
    if (onMonthSelect) onMonthSelect(monthKey);
    if (onCategorySelect) onCategorySelect(null);
  }
};

// Gère le clic sur une part du camembert (Catégorie + Dé-sélection)
const handlePieClick = (data, index) => {
  const isDeselecting = activeIndex === index;
  const newIndex = isDeselecting ? -1 : index;
  setActiveIndex(newIndex);
  
  if (onCategorySelect) {
    onCategorySelect(isDeselecting ? null : data.name);
  }
};

// Gère le bouton retour (Reset total)
const handleBack = () => {
  setSelectedMonth(null);
  setActiveIndex(-1);
  if (onMonthSelect) onMonthSelect(null);
  if (onCategorySelect) onCategorySelect(null);
};

  const onPieEnter = useCallback((_, index) => setActiveIndex(index), []);
  const onPieLeave = useCallback(() => setActiveIndex(-1), []);

  const pieData = useMemo(() => {
    if (!selectedMonth || !transactions) return [];
    const monthKey = selectedMonth.rawDate;
    const monthTransactions = transactions.filter(t => 
      t.date.startsWith(monthKey) && t.type === 'expense'
    );
    const categoryTotals = {};
    monthTransactions.forEach(t => {
      const cat = t.category || 'Autre';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + t.amount;
    });
    return Object.keys(categoryTotals).map(cat => ({ name: cat, value: categoryTotals[cat] })).sort((a,b) => b.value - a.value);
  }, [selectedMonth, transactions]);

  const totalExpenses = useMemo(() => pieData.reduce((sum, item) => sum + item.value, 0), [pieData]);
  const activeItem = activeIndex !== -1 ? pieData[activeIndex] : null;
  const centerLabel = activeItem ? activeItem.name : "Dépensé";
  const centerValue = activeItem ? activeItem.value : totalExpenses;
  const centerColor = activeItem && EXPENSE_CATEGORIES[activeItem.name] ? EXPENSE_CATEGORIES[activeItem.name].color : '#1e293b'; 
  const centerSubLabel = activeItem ? `${((activeItem.value / totalExpenses) * 100).toFixed(1)}%` : "Total";

  const renderCustomizedLabel = useCallback(({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, payload }) => {
    if (percent < 0.02) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const CategoryIcon = EXPENSE_CATEGORIES[payload.name]?.icon || Circle;
    return (
      <g pointerEvents="none">
        <foreignObject x={x - 12} y={y - 12} width={24} height={24}>
          <div className="flex items-center justify-center w-full h-full text-white drop-shadow-md">
             <CategoryIcon size={16} strokeWidth={2.5} />
          </div>
        </foreignObject>
      </g>
    );
  }, []);

  return (
    <div className="h-96 w-full relative transition-all duration-300 flex flex-col min-h-[384px] min-w-[300px]">
      {!hasFlowData && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-[1px]">
          <p className="text-slate-400 text-sm font-medium">Aucune donnée</p>
        </div>
      )}
      {selectedMonth ? (
        <div className="h-full w-full flex flex-col animate-in fade-in zoom-in-95 duration-200">
           <div className="flex justify-between items-center mb-1 px-2">
             <div className="flex items-center gap-2">
                <button onClick={handleBack} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-500 transition-colors" title="Retour au graphique global">
                  <ChevronLeft size={24}/>
                </button>
                <div>
                    <h4 className="font-bold text-slate-800 text-lg leading-tight">{selectedMonth.month} {selectedMonth.rawDate?.split('-')[0]}</h4>
                    <p className="text-xs text-slate-500">Détail des dépenses</p>
                </div>
             </div>
           </div>
           <div className="flex-1 relative min-h-[260px]">
            {pieData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">Aucune dépense ce mois-ci</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <Pie 
                    data={pieData} 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={70} 
                    outerRadius={105} 
                    paddingAngle={4} 
                    dataKey="value" 
                    label={renderCustomizedLabel} 
                    labelLine={false} 
                    animationDuration={800}
                  >
                    {pieData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={EXPENSE_CATEGORIES[entry.name]?.color || EXPENSE_CATEGORIES['Autre'].color} 
                          stroke="none"
                          onClick={() => handlePieClick(entry, index)} // Ajout du clic
                          className="cursor-pointer"
                          opacity={activeIndex === -1 || activeIndex === index ? 1 : 0.3} 
                          style={{ transition: 'opacity 0.2s ease', outline: 'none' }}
                        />
                      ))}
                    </Pie>
                 </PieChart>
               </ResponsiveContainer>
             )}
             {pieData.length > 0 && (
               <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0" style={{top: '0'}}>
                 <span className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-1">{centerSubLabel}</span>
                 <span className="text-3xl font-extrabold transition-colors duration-200" style={{ color: centerColor }}>{formatCurrency(centerValue)}</span>
                 <span className="text-sm font-bold text-slate-600 mt-1 px-3 py-1 rounded-full bg-slate-50 border border-slate-100 shadow-sm">{centerLabel}</span>
               </div>
             )}
           </div>
           <div className="mt-4 flex flex-wrap justify-center gap-2 px-2 overflow-y-auto max-h-24 no-scrollbar">
                  {pieData.map((entry, index) => {
                      const CatIcon = EXPENSE_CATEGORIES[entry.name]?.icon || Circle;
                      const color = EXPENSE_CATEGORIES[entry.name]?.color || '#94a3b8';
                      const isSelected = activeIndex === index;
                      return (
                        <div 
                          key={entry.name} 
                          onClick={() => handlePieClick(entry, index)} // Ajout du clic pour filtrer
                          className={`flex items-center gap-1.5 px-2 py-1 rounded-md border transition-all cursor-pointer flex-shrink-0 ${isSelected ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-100 scale-105' : 'bg-white border-slate-100'}`}
                        >
                        <div className="p-1 rounded-full" style={{ backgroundColor: color + '20', color: color }}><CatIcon size={10} /></div>
                        <span className="text-[10px] font-semibold text-slate-700">{entry.name}</span>
                        <span className="text-[10px] text-slate-500">{totalExpenses > 0 ? Math.round((entry.value / totalExpenses) * 100) : 0}%</span>
                    </div>
                  );
              })}
           </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={cashflowData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
            <RechartsTooltip 
              cursor={{fill: '#f1f5f9'}} 
              contentStyle={{ 
                borderRadius: '12px', 
                border: 'none', 
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(4px)',
                padding: '8px 12px',
                fontSize: '12px'
              }} 
              offset={25}
              allowEscapeViewBox={{ x: false, y: true }}
              formatter={(value) => formatCurrency(value)} 
              wrapperStyle={{ pointerEvents: 'none' }} 
            />
            <Bar dataKey="revenus" name="Revenus" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={16} className="cursor-pointer hover:opacity-80 transition-opacity" onClick={handleExpenseBarClick}/>
            <Bar dataKey="depenses" name="Dépenses" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={16} className="cursor-pointer hover:opacity-80 transition-opacity" onClick={handleExpenseBarClick} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};


// --- COMPOSANTS VUES & DETAILS ---

const AssetDetailOverlay = ({ asset, onClose, onUpdate, transactions }) => {
  const isComposite = ['investissement', 'crypto', 'immobilier', 'autre', 'epargne_salariale'].includes(asset.type);
  const [activeTab, setActiveTab] = useState(isComposite ? 'composition' : 'history'); 
  const [viewMode, setViewMode] = useState('asset'); 
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [newPosition, setNewPosition] = useState({ name: '', value: '' });
  const [newAssetHistoryPoint, setNewAssetHistoryPoint] = useState({ date: new Date().toISOString().split('T')[0], value: asset.value });
  const [currentBalanceUpdate, setCurrentBalanceUpdate] = useState(Number(asset.value || 0).toFixed(2));
  const [newPosHistoryPoint, setNewPosHistoryPoint] = useState({ date: new Date().toISOString().split('T')[0], value: '' });
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [deleteConfig, setDeleteConfig] = useState(null); 
  const [focusedPosId, setFocusedPosId] = useState(null);
  const [movementConfig, setMovementConfig] = useState(null); 
  const [movementData, setMovementData] = useState({ positionId: '', amount: '' });
  const [showPrimaryModal, setShowPrimaryModal] = useState(false);

  // Nouveaux états pour l'édition de l'en-tête (Nom, Icône, Banque, Type)
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(asset.name);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [isEditingInstitution, setIsEditingInstitution] = useState(false);
  const [editedInstitution, setEditedInstitution] = useState(asset.institution || '');
  const [isEditingType, setIsEditingType] = useState(false);
  
  // États pour l'édition du nom de la position
  const [isEditingPosName, setIsEditingPosName] = useState(false);
  const [editedPosName, setEditedPosName] = useState('');

  // Blocage du scroll de l'arrière-plan quand la vue détail est ouverte
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    // Restauration du scroll à la fermeture de la vue
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Met à jour les états édités si l'actif change
  useEffect(() => { 
    setEditedName(asset.name); 
    setEditedInstitution(asset.institution || '');
  }, [asset.name, asset.institution]);

  useEffect(() => {
    if (selectedPosition) setEditedPosName(selectedPosition.name);
  }, [selectedPosition]);

  const handleSavePosName = () => {
    setIsEditingPosName(false);
    if (editedPosName.trim() && editedPosName !== selectedPosition.name) {
       const updatedPositions = asset.positions.map(p =>
          p.id === selectedPosition.id ? { ...p, name: editedPosName.trim() } : p
       );
       onUpdate({ ...asset, positions: updatedPositions });
       setSelectedPosition({ ...selectedPosition, name: editedPosName.trim() });
    } else {
       setEditedPosName(selectedPosition.name);
    }
  };

  const handleKeyDownPosName = (e) => {
    if (e.key === 'Enter') handleSavePosName();
    if (e.key === 'Escape') { setIsEditingPosName(false); setEditedPosName(selectedPosition.name); }
  };

  // Fermeture du détail de l'actif avec la touche "Échap"
  useEffect(() => {
    const handleEsc = (e) => {
      // On ferme uniquement si on n'est pas en train d'éditer un champ de l'en-tête
      if (e.key === 'Escape' && !isEditingName && !isEditingInstitution && !isEditingType && !showIconPicker) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose, isEditingName, isEditingInstitution, isEditingType, showIconPicker]);

  const handleSaveName = () => {
     setIsEditingName(false);
     if (editedName.trim() && editedName !== asset.name) {
         onUpdate({ ...asset, name: editedName.trim() });
     } else {
         setEditedName(asset.name); // Annule si vide
     }
  };

  const handleSaveInstitution = () => {
     setIsEditingInstitution(false);
     if (editedInstitution.trim() !== asset.institution) {
         onUpdate({ ...asset, institution: editedInstitution.trim() });
     } else {
         setEditedInstitution(asset.institution || '');
     }
  };

  const handleKeyDownName = (e) => {
     if (e.key === 'Enter') handleSaveName();
     if (e.key === 'Escape') { setIsEditingName(false); setEditedName(asset.name); }
  };

  const handleKeyDownInstitution = (e) => {
     if (e.key === 'Enter') handleSaveInstitution();
     if (e.key === 'Escape') { setIsEditingInstitution(false); setEditedInstitution(asset.institution || ''); }
  };

  const handleIconChange = (iconKey) => {
     onUpdate({ ...asset, icon: iconKey });
     setShowIconPicker(false);
  };
  
  const handleTypeChange = (newType) => {
     onUpdate({ ...asset, type: newType });
     setIsEditingType(false);
  };

  const handleExecuteMovement = (e) => {
    e.preventDefault();
    const amount = parseFloat(movementData.amount);
    if (isNaN(amount) || amount <= 0 || !movementData.positionId) return;

    const today = new Date().toISOString().split('T')[0];
    const movementType = movementConfig.type; // 'buy' ou 'sell'

    const updatedPositions = asset.positions.map(p => {
      // 1. Mise à jour de la poche Cash (Valeur ET Historique)
      if (p.isCash) {
        const delta = movementType === 'buy' ? -amount : amount;
        const newValue = parseFloat((p.value + delta).toFixed(2));
        
        let updatedHistory = [...(p.history || [])];
        const existingIdx = updatedHistory.findIndex(h => h.date === today);
        
        if (existingIdx >= 0) {
          updatedHistory[existingIdx] = { ...updatedHistory[existingIdx], value: newValue };
        } else {
          updatedHistory.push({ date: today, value: newValue });
        }
        updatedHistory.sort((a, b) => new Date(a.date) - new Date(b.date));

        return { ...p, value: newValue, history: updatedHistory };
      }

      // 2. Mise à jour du support et fusion dans son historique
      if (p.id.toString() === movementData.positionId.toString()) {
        const currentInvested = (typeof p.totalInvested === 'number') ? p.totalInvested : 0;
        const delta = movementType === 'buy' ? amount : -amount;
        const newValue = parseFloat((p.value + delta).toFixed(2));
        
        // Nouveau calcul du PRU (Total Investi) pour éviter qu'il ne devienne négatif
        let newInvested = currentInvested;
        if (movementType === 'buy') {
            newInvested += amount;
        } else {
            // En cas de vente, on réduit le PRU proportionnellement (ex: si je vends 50% de ma ligne, le PRU baisse de 50%)
            // Sécurité : on évite la division par zéro au cas où la ligne vaudrait 0€
            const ratio = p.value > 0 ? (amount / p.value) : 1;
            newInvested = currentInvested - (currentInvested * ratio);
            if (newInvested < 0) newInvested = 0; // Sécurité anti-négatif
        }
        
        // On ajoute TOUJOURS le nouveau point d'historique (avec un timestamp caché pour le différencier)
        let updatedHistory = [...(p.history || [])];
        const timestampMs = Date.now();
        updatedHistory.push({ 
          id: timestampMs, // Permet de distinguer plusieurs actions le même jour
          date: today, 
          value: newValue, 
          movementTag: movementType,
          movementAmount: amount // On sauvegarde le montant de l'achat/vente
        });

        return { 
          ...p, 
          value: newValue,
          totalInvested: parseFloat(newInvested.toFixed(2)),
          history: updatedHistory
        };
      }
      return p;
    });

    onUpdate({ ...asset, positions: updatedPositions });
    setMovementConfig(null);
    setMovementData({ positionId: '', amount: '' });
  };

  // Calculs avancés pour PEA/CTO
  const metrics = useMemo(() => {
    const cashPos = (asset.positions || []).find(p => p.isCash);
    const cashValue = cashPos ? cashPos.value : 0;
    
    if (!isComposite) return { totalInvested: asset.value, plusValue: 0, plusValuePct: 0, cash: cashValue };
    
    const supports = (asset.positions || []).filter(p => !p.isCash);
    const totalInvestedInSupports = supports.reduce((acc, pos) => acc + (pos.totalInvested || 0), 0);
    const currentSupportsValue = supports.reduce((acc, pos) => acc + pos.value, 0);

    const plusValue = currentSupportsValue - totalInvestedInSupports;
    const plusValuePct = totalInvestedInSupports > 0 ? (plusValue / totalInvestedInSupports) * 100 : 0;

    return { totalInvested: totalInvestedInSupports, plusValue, plusValuePct, cash: cashValue };
  }, [asset, isComposite]);

  const { totalInvested, plusValue, plusValuePct, cash } = metrics;

  // --- NOUVEAU : Historique Unifié des Opérations ---
  const unifiedHistory = useMemo(() => {
    if (!isComposite) return [];
    let events = [];
    
    // 1. Transactions externes (Virements entrants/sortants)
    if (transactions) {
      transactions.forEach(t => {
        if (t.linkedAssetId === asset.id || t.fromId === asset.id || t.toId === asset.id) {
          let type = 'in';
          let amount = t.amount;
          if (t.type === 'expense' || (t.type === 'transfer' && t.fromId === asset.id)) type = 'out';
          events.push({ id: t.id, date: t.date, type, label: t.label || 'Virement', amount, isExternal: true });
        }
      });
    }

    // 2. Mouvements internes (Achat/Vente sur les supports)
    if (asset.positions) {
      asset.positions.filter(p => !p.isCash).forEach(pos => {
        (pos.history || []).forEach(h => {
          if (h.movementTag === 'buy' || h.movementTag === 'sell') {
            events.push({ id: h.id, date: h.date, type: h.movementTag, label: pos.name, amount: h.movementAmount || 0, isExternal: false });
          }
        });
      });
    }
    
    // Tri chronologique décroissant
    return events.sort((a, b) => {
      const dateDiff = new Date(b.date) - new Date(a.date);
      if (dateDiff === 0 && b.id && a.id) return b.id - a.id;
      return dateDiff;
    });
  }, [asset, transactions, isComposite]);

  useEffect(() => {
    if (selectedPosition) {
      const updatedPos = asset.positions?.find(p => p.id === selectedPosition.id);
      if (updatedPos) setSelectedPosition(updatedPos);
    }
  }, [asset, selectedPosition]);

  const getChartData = (history, currentValue, currentInvested) => {
    const uniqueHistoryMap = new Map();
    (history || []).forEach(item => uniqueHistoryMap.set(item.date, item));
    const today = new Date().toISOString().split('T')[0];
    // On ajoute la valeur investie au point d'aujourd'hui
    uniqueHistoryMap.set(today, { 
      date: today, 
      value: currentValue, 
      investedValue: currentInvested 
    });
    return Array.from(uniqueHistoryMap.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
  };
  

  const rebuildGlobalHistory = (currentPositions) => {
    const allDates = new Set();
    currentPositions.forEach(pos => { if (pos.history) pos.history.forEach(h => allDates.add(h.date)); });
    const sortedDates = Array.from(allDates).sort((a, b) => new Date(a) - new Date(b));
    return sortedDates.map(date => {
      const totalAtDate = currentPositions.reduce((sum, pos) => {
        const sortedPosHistory = [...(pos.history || [])].sort((a,b) => new Date(a.date) - new Date(b.date));
        // On filtre pour trouver tous les points de ce jour précis
        const exactMatches = sortedPosHistory.filter(h => h.date === date);
        // S'il y en a plusieurs, on prend le tout dernier enregistré
        const exactMatch = exactMatches.length > 0 ? exactMatches[exactMatches.length - 1] : null;
        
        if (exactMatch) return sum + exactMatch.value;
        const previousEntries = sortedPosHistory.filter(h => h.date < date);
        const lastEntry = previousEntries.length > 0 ? previousEntries[previousEntries.length - 1] : null;
        return sum + (lastEntry ? lastEntry.value : 0);
      }, 0);
      return { date, value: totalAtDate };
    });
  };

  const assetChartData = useMemo(() => 
    getChartData(asset.history, asset.value, totalInvested), 
    [asset, totalInvested]
  );

  const positionChartData = useMemo(() => selectedPosition ? getChartData(selectedPosition.history, selectedPosition.value) : [], [selectedPosition]);

  const handleUpdateBalance = (e) => {
    e.preventDefault();
    const newValue = Math.round(parseFloat(currentBalanceUpdate) * 100) / 100;
    if (isNaN(newValue)) return;
    const today = new Date().toISOString().split('T')[0];
    const historyWithoutToday = (asset.history || []).filter(h => h.date !== today);
    const updatedHistory = [...historyWithoutToday, { date: today, value: newValue }];
    onUpdate({ ...asset, value: newValue, history: updatedHistory });
  };

  const handleAddPosition = (e) => {
    e.preventDefault();
    if (!newPosition.name) return;
    const today = new Date().toISOString().split('T')[0];
    
    // Création d'un support vide (valeur 0) avec un PRU (totalInvested) à 0
    const newPos = { 
      id: Date.now(), 
      name: newPosition.name, 
      value: 0, 
      totalInvested: 0, 
      // On lui donne un ID volontairement plus vieux de 1000ms pour qu'il reste en bas du tri
      history: [{ id: Date.now() - 1000, date: today, value: 0, movementTag: 'creation' }] 
    };

    const updatedPositions = [...(asset.positions || []), newPos];
    // La valorisation totale du PEA inclut désormais ce nouveau support (à 0€) + le Cash
    const newTotal = updatedPositions.reduce((acc, p) => acc + p.value, 0);
    const newAssetHistory = rebuildGlobalHistory(updatedPositions);
    
    onUpdate({ ...asset, positions: updatedPositions, value: newTotal, history: newAssetHistory });
    setNewPosition({ name: '', value: '' });
  };

  const handleDeletePosition = (posId) => {
    const posToDelete = asset.positions.find(p => p.id === posId);
    if (!posToDelete) return;

    const today = new Date().toISOString().split('T')[0];

    // 1. On retire la position
    let updatedPositions = asset.positions.filter(p => p.id !== posId);

    // 2. Si c'est une ligne investie, on "rembourse" sa valeur actuelle dans la poche espèces
    // Cela évite que le graphique global du compte ne s'effondre lors d'une suppression.
    if (!posToDelete.isCash) {
      updatedPositions = updatedPositions.map(p => {
        if (p.isCash) {
          const refundAmount = posToDelete.value;
          const newValue = parseFloat((p.value + refundAmount).toFixed(2));
          
          let updatedHistory = [...(p.history || [])];
          const existingIdx = updatedHistory.findIndex(h => h.date === today);
          if (existingIdx >= 0) {
            updatedHistory[existingIdx] = { ...updatedHistory[existingIdx], value: newValue };
          } else {
            updatedHistory.push({ date: today, value: newValue });
          }
          updatedHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
          
          return { ...p, value: newValue, history: updatedHistory };
        }
        return p;
      });
    }

    const newTotal = updatedPositions.reduce((acc, p) => acc + p.value, 0);
    const newAssetHistory = rebuildGlobalHistory(updatedPositions);
    onUpdate({ ...asset, positions: updatedPositions, value: newTotal, history: newAssetHistory });
  };

    const handleAddAssetHistory = (e) => {
    e.preventDefault();
    if (!newAssetHistoryPoint.date || !newAssetHistoryPoint.value) return;
    const newValue = Math.round(parseFloat(newAssetHistoryPoint.value) * 100) / 100;
    const date = newAssetHistoryPoint.date;
    const historyWithoutDate = (asset.history || []).filter(h => h.date !== date);
    const updatedHistory = [...historyWithoutDate, { date: date, value: newValue }];
    updatedHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
    const today = new Date().toISOString().split('T')[0];
    const latestPastEntry = [...updatedHistory].reverse().find(h => h.date <= today);
    const newCurrentValue = latestPastEntry ? latestPastEntry.value : asset.value;
    onUpdate({ ...asset, history: updatedHistory, value: newCurrentValue });
    setNewAssetHistoryPoint({ ...newAssetHistoryPoint, value: '' }); 
  };

  const handleDeleteAssetHistory = (idx) => {
    const sortedHistory = [...(asset.history || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
    const itemToDelete = sortedHistory[idx];
    const updatedHistory = asset.history.filter(h => h !== itemToDelete);
    updatedHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
    const today = new Date().toISOString().split('T')[0];
    const latestPastEntry = [...updatedHistory].reverse().find(h => h.date <= today);
    const newCurrentValue = latestPastEntry ? latestPastEntry.value : (updatedHistory.length === 0 ? 0 : asset.value);
    onUpdate({ ...asset, history: updatedHistory, value: newCurrentValue });
  };

  const handleAddPositionHistory = (e) => {
    e.preventDefault();
    if (!newPosHistoryPoint.date || !newPosHistoryPoint.value) return;
    const newValue = parseFloat(newPosHistoryPoint.value);
    const date = newPosHistoryPoint.date;
    
    let updatedHistory = [...(selectedPosition.history || [])];
    
    // Calcul de la variation (delta) par rapport à la dernière valeur connue
    const sortedForPrev = [...updatedHistory].sort((a, b) => {
      const dateDiff = new Date(a.date) - new Date(b.date);
      if (dateDiff === 0 && a.id && b.id) return a.id - b.id;
      return dateDiff;
    });
    const previousEntry = sortedForPrev.reverse().find(h => h.date <= date);
    const previousValue = previousEntry ? previousEntry.value : 0;
    const delta = newValue - previousValue;

    updatedHistory.push({ 
      id: Date.now(), 
      date: date, 
      value: newValue,
      movementTag: 'evolution',
      movementAmount: delta
    });
    
    updatedHistory.sort((a, b) => {
      const dateDiff = new Date(a.date) - new Date(b.date);
      if (dateDiff === 0 && a.id && b.id) return a.id - b.id;
      return dateDiff;
    });
    
    const today = new Date().toISOString().split('T')[0];
    const latestPastEntry = [...updatedHistory].reverse().find(h => h.date <= today);
    const newPosValue = latestPastEntry ? latestPastEntry.value : selectedPosition.value;

    const updatedPositions = asset.positions.map(p => {
      if (p.id === selectedPosition.id) {
        // LOGIQUE : Si le total investi est à 0, on considère que la première 
        // valeur renseignée est l'investissement de départ (PRU).
        const newTotalInvested = (p.totalInvested || 0) === 0 ? newPosValue : p.totalInvested;
        return { ...p, history: updatedHistory, value: newPosValue, totalInvested: newTotalInvested };
      }
      return p;
    });

    const newAssetTotal = updatedPositions.reduce((sum, p) => sum + p.value, 0);
    const newAssetHistory = rebuildGlobalHistory(updatedPositions);
    onUpdate({ ...asset, positions: updatedPositions, value: newAssetTotal, history: newAssetHistory });
    setNewPosHistoryPoint({ ...newPosHistoryPoint, value: '' });
  };

  const handleDeletePositionHistory = (idx) => {
    // 1. On applique EXACTEMENT le même tri descendant que dans l'affichage visuel
    const sortedHistory = [...(selectedPosition.history || [])].sort((a, b) => {
      const dateDiff = new Date(b.date) - new Date(a.date);
      if (dateDiff === 0 && b.id && a.id) return b.id - a.id;
      return dateDiff;
    });
    
    // 2. On cible le bon élément et on le retire
    const itemToDelete = sortedHistory[idx];
    const updatedHistory = selectedPosition.history.filter(h => h !== itemToDelete);
    
    // 3. On retrie correctement l'historique mis à jour en ordre ascendant (chronologique)
    updatedHistory.sort((a, b) => {
      const dateDiff = new Date(a.date) - new Date(b.date);
      if (dateDiff === 0 && a.id && b.id) return a.id - b.id;
      return dateDiff;
    });

    // 4. RECALCUL DU PRU (Total Investi) en rejouant l'historique restant
    let newTotalInvested = 0;
    updatedHistory.forEach(point => {
      if (point.movementTag === 'buy' && point.movementAmount) {
        newTotalInvested += point.movementAmount;
      } else if (point.movementTag === 'sell' && point.movementAmount) {
        const prevValue = point.value + point.movementAmount;
        if (prevValue > 0) {
          const ratio = point.movementAmount / prevValue;
          newTotalInvested -= (newTotalInvested * ratio);
        }
      } else if (point.movementTag === 'creation') {
        newTotalInvested = 0;
      }
    });
    if (newTotalInvested < 0) newTotalInvested = 0;
    
    const today = new Date().toISOString().split('T')[0];
    const latestPastEntry = [...updatedHistory].reverse().find(h => h.date <= today);
    const newPosValue = latestPastEntry ? latestPastEntry.value : (updatedHistory.length === 0 ? 0 : selectedPosition.value);
    
    // 5. Mise à jour de la position ET annulation du mouvement sur la poche Cash
    const updatedPositions = asset.positions.map(p => {
      if (p.id === selectedPosition.id) {
        return { ...p, history: updatedHistory, value: newPosValue, totalInvested: parseFloat(newTotalInvested.toFixed(2)) };
      }
      
      // Restitution/Débit sur la poche espèces si c'était un achat/vente
      if (p.isCash && (itemToDelete.movementTag === 'buy' || itemToDelete.movementTag === 'sell') && itemToDelete.movementAmount) {
        // Annuler un Achat = Recréditer le cash (+). Annuler une Vente = Redébiter le cash (-)
        const delta = itemToDelete.movementTag === 'buy' ? itemToDelete.movementAmount : -itemToDelete.movementAmount;
        
        // On propage la correction sur tout l'historique du Cash à partir de la date du mouvement annulé
        let updatedCashHistory = (p.history || []).map(h => {
           if (h.date >= itemToDelete.date) {
               return { ...h, value: parseFloat((h.value + delta).toFixed(2)) };
           }
           return h;
        });
        
        const latestCash = [...updatedCashHistory].sort((a, b) => a.date.localeCompare(b.date)).reverse().find(h => h.date <= today);
        const currentCashValue = latestCash ? latestCash.value : parseFloat((p.value + delta).toFixed(2));
        
        return { ...p, value: currentCashValue, history: updatedCashHistory };
      }
      return p;
    });
    
    const newAssetTotal = updatedPositions.reduce((sum, p) => sum + p.value, 0);
    const newAssetHistory = rebuildGlobalHistory(updatedPositions);
    onUpdate({ ...asset, positions: updatedPositions, value: newAssetTotal, history: newAssetHistory });
  };

  const executeDelete = () => {
    if (!deleteConfig) return;
    const { type, id } = deleteConfig;
    if (type === 'position') handleDeletePosition(id);
    if (type === 'assetHistory') handleDeleteAssetHistory(id);
    if (type === 'posHistory') handleDeletePositionHistory(id);
    setDeleteConfig(null);
  };

  const handleAnalyzeAsset = async () => {
    setIsAnalyzing(true);
    const context = `Analyse l'actif: ${asset.name} (${asset.type}). Markdown.`;
    try {
        const result = await callGeminiAPI("Expert Bourse. Utilise ## pour les titres, - pour les listes, et <b> pour mettre en gras les mots importants. Interdiction d'utiliser les caractères * ou **.", [], context);
        setAiAnalysis(result);
    } catch (e) { setAiAnalysis("Erreur."); }
    setIsAnalyzing(false);
  };

return (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200 text-slate-900" onMouseDown={onClose}>
    {/* Modale standard pour les suppressions */}
    <ConfirmationModal 
      isOpen={!!deleteConfig} 
      onClose={() => setDeleteConfig(null)} 
      onConfirm={executeDelete} 
    />
    
    {/* NOUVELLE Modale Bespoke pour le Compte Principal (Design Coordonné, pas de rouge) */}
    {showPrimaryModal && (
      <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-200" onMouseDown={(e) => { e.stopPropagation(); setShowPrimaryModal(false); }}>
        {/* On peut remettre un backdrop ici ou gérer z-index de la fenêtre de detail */}
        <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm"></div>
        
        <div className="bg-white rounded-t-3xl md:rounded-3xl p-6 md:p-8 shadow-2xl w-full max-w-sm animate-in slide-in-from-bottom-1/2 md:slide-in-from-bottom-0 md:zoom-in-95 duration-300 flex flex-col items-center text-center relative z-10 pb-8 md:pb-8" onMouseDown={e => e.stopPropagation()}>
          {/* Petite barre de drag (visuelle) pour mobile */}
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 md:hidden"></div>
          
          {/* Icône Appropriée : Grosse Étoile Amber */}
          <div className="p-4 bg-amber-50 rounded-full text-amber-400 mb-6 shadow-inner border border-amber-100">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-3">Compte principal</h2>
          <p className="text-sm text-slate-600 mb-8 leading-relaxed">Voulez-vous définir <span className="font-semibold text-slate-800">{asset.name}</span> comme compte principal de paiement ?<br/><br/>Il sera sélectionné par défaut lors de vos ajouts de dépenses rapides (Saisie IA).</p>
          
          <div className="flex gap-4 w-full">
            <button 
              onClick={() => setShowPrimaryModal(false)}
              className="flex-1 py-3.5 px-6 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"
            >
              Annuler
            </button>
            <button 
              onClick={() => {
                onUpdate({ ...asset, isPrimary: true });
                setShowPrimaryModal(false);
              }}
              className="flex-1 py-3.5 px-6 rounded-2xl bg-amber-400 hover:bg-amber-500 text-white font-bold transition-colors shadow-sm"
            >
              Confirmer
            </button>
          </div>
        </div>
      </div>
    )}
    
    <div className="bg-white md:rounded-2xl shadow-2xl w-full max-w-4xl h-full md:h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300 relative z-10" onMouseDown={(e) => e.stopPropagation()}>
      
      {/* --- VUE DÉTAIL DE L'ACTIF --- */}
      {viewMode === 'asset' && (
        <>
          {/* EN-TÊTE */}
          <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10">
            <div>
              <button onClick={onClose} className="flex items-center gap-1 text-slate-500 hover:text-slate-800 mb-2 text-sm font-medium">
                <ChevronLeft size={16} /> Retour
              </button>
              
              <div className="flex items-center gap-3 relative z-50">
                {/* SELECTEUR D'ICÔNE */}
                <div className="relative">
                  <button 
                    onClick={() => setShowIconPicker(!showIconPicker)} 
                    className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center text-blue-600 cursor-pointer"
                    title="Changer l'icône"
                  >
                    {(() => {
                      const IconComp = (ASSET_ICON_OPTIONS[asset.icon] || ASSET_ICON_OPTIONS['building']).icon;
                      return <IconComp size={24} />;
                    })()}
                  </button>
                  {showIconPicker && (
                    <>
                      {/* Overlay invisible pour fermer le menu en cliquant à côté */}
                      <div className="fixed inset-0 z-40" onClick={() => setShowIconPicker(false)}></div>
                      <div className="absolute top-full left-0 mt-2 p-2 bg-white rounded-xl shadow-xl border border-slate-200 grid grid-cols-4 gap-2 z-50 w-64">
                        {Object.keys(ASSET_ICON_OPTIONS).map(key => {
                          const OptionIcon = ASSET_ICON_OPTIONS[key].icon;
                          return (
                            <button 
                              key={key} 
                              onClick={() => handleIconChange(key)}
                              className={`flex flex-col items-center p-2 rounded-lg hover:bg-blue-50 transition-colors ${asset.icon === key ? 'bg-blue-100 text-blue-700' : 'text-slate-600'}`}
                            >
                              <OptionIcon size={20} className="mb-1" />
                              <span className="text-[9px] font-medium">{ASSET_ICON_OPTIONS[key].label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                {/* CHAMP NOM EDITABLE */}
                {isEditingName ? (
                  <input 
                    type="text" 
                    value={editedName} 
                    onChange={(e) => setEditedName(e.target.value)}
                    onBlur={handleSaveName}
                    onKeyDown={handleKeyDownName}
                    autoFocus
                    className="text-xl md:text-2xl font-bold text-slate-800 bg-white border-b-2 border-blue-500 outline-none w-full max-w-[250px] px-1 bg-transparent"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 
                      onClick={() => setIsEditingName(true)}
                      className="tour-asset-name text-xl md:text-2xl font-bold text-slate-800 hover:text-blue-600 cursor-text transition-colors border-b-2 border-transparent hover:border-blue-200 border-dashed"
                      title="Modifier le nom"
                    >
                      {asset.name}
                    </h2>
                    {/* ETOILE COMPTE PRINCIPAL */}
                    <button 
                      onClick={() => {
                        if (asset.isPrimary) {
                          onUpdate({ ...asset, isPrimary: false });
                        } else {
                          setShowPrimaryModal(true);
                        }
                      }}
                      className={`tour-asset-primary p-1.5 rounded-full transition-all ${asset.isPrimary ? 'text-amber-400 bg-amber-50 hover:bg-amber-100 shadow-sm' : 'text-slate-300 hover:text-amber-400 hover:bg-slate-50'}`}
                      title={asset.isPrimary ? "Compte principal" : "Définir comme compte principal"}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill={asset.isPrimary ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5 mt-2 text-slate-500 text-xs md:text-sm">
                {/* INSTITUTION EDITABLE */}
                {isEditingInstitution ? (
                  <input
                    type="text"
                    value={editedInstitution}
                    onChange={(e) => setEditedInstitution(e.target.value)}
                    onBlur={handleSaveInstitution}
                    onKeyDown={handleKeyDownInstitution}
                    autoFocus
                    placeholder="Banque..."
                    className="bg-transparent border-b-2 border-blue-500 outline-none w-24 md:w-32 text-slate-800 px-1 font-medium"
                  />
                ) : (
                  <span
                    onClick={() => setIsEditingInstitution(true)}
                    className="hover:text-blue-600 cursor-text transition-colors border-b-2 border-transparent hover:border-blue-200 border-dashed truncate max-w-[120px]"
                    title="Modifier la banque"
                  >
                    {asset.institution || 'Sans banque'}
                  </span>
                )}
                
                <span>•</span>

                {/* TYPE EDITABLE */}
                {isEditingType ? (
                  <select
                    value={asset.type}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    onBlur={() => setIsEditingType(false)}
                    autoFocus
                    className="bg-white border border-slate-300 rounded text-slate-800 outline-none p-0.5 text-xs font-medium"
                  >
                    {Object.keys(CATEGORY_LABELS).map(key => (
                      <option key={key} value={key}>{CATEGORY_LABELS[key]}</option>
                    ))}
                  </select>
                ) : (
                  <span
                    onClick={() => setIsEditingType(true)}
                    className="hover:text-blue-600 cursor-pointer transition-colors border-b-2 border-transparent hover:border-blue-200 border-dashed"
                    title="Modifier le type"
                  >
                    {CATEGORY_LABELS[asset.type]}
                  </span>
                )}
              </div>
            </div>
            <div className="tour-asset-value text-right">
              <p className="text-xs md:text-sm text-slate-500">Valorisation Actuelle</p>
              <p className="text-xl md:text-3xl font-bold text-blue-600">{formatCurrency(asset.value)}</p>
            </div>
          </div>

          {/* NAVIGATION PAR ONGLETS */}
          <div className="flex border-b border-slate-100 bg-white px-4 md:px-6">
            {isComposite && (
              <button 
                onClick={() => setActiveTab('composition')}
                className={`px-4 py-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'composition' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}
              >
                Composition
              </button>
            )}
            <button 
              onClick={() => setActiveTab('history')}
              className={`tour-asset-history-tab px-4 py-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}
            >
              Historique
            </button>
            <button 
              onClick={() => setActiveTab('analysis')}
              className={`tour-asset-ai-tab px-4 py-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'analysis' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}
            >
              Analyse IA ✨
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            
            {/* CONTENU ONGLET : COMPOSITION */}
            {activeTab === 'composition' && isComposite && (
              <>
                {['investissement', 'epargne_salariale', 'crypto'].includes(asset.type) && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="tour-asset-cash p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                      <p className="text-[10px] uppercase font-bold text-indigo-600 mb-1">Cash Disponible</p>
                      <p className="text-sm font-bold text-indigo-700">
                        {formatCurrency(asset.positions?.find(p => p.isCash)?.value || 0)}
                      </p>
                    </div>
                    <div className="tour-asset-pru p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Total Versé (PRU)</p>
                      <p className="text-sm font-bold text-slate-700">{formatCurrency(totalInvested)}</p>
                    </div>
                    <div className="tour-asset-pv p-3 bg-slate-50 rounded-xl border border-slate-100 col-span-2 md:col-span-1">
                      <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Plus-Value Latente</p>
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-bold ${plusValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {plusValue >= 0 ? '+' : ''}{formatCurrency(plusValue)}
                        </p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${plusValue >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {plusValuePct.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="space-y-6">
                    <Card className="tour-asset-movement h-fit bg-slate-50/50 border-slate-200 shadow-sm">
                      <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <ArrowRightLeft size={18} className="text-blue-600"/> Mouvement Interne
                      </h3>
                      {!movementConfig ? (
                        <>
                          <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
                            Déplacez vos fonds entre vos <b>espèces</b> et vos <b>supports</b>.
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setMovementConfig({type: 'buy'})} className="flex flex-col items-center justify-center p-3 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all group">
                              <PlusCircle size={18} className="mb-1 text-blue-600 group-hover:scale-110 transition-transform"/>
                              <span className="text-[10px] font-bold uppercase tracking-wider">Acheter</span>
                            </button>
                            <button onClick={() => setMovementConfig({type: 'sell'})} className="flex flex-col items-center justify-center p-3 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all group">
                              <ArrowRightLeft size={18} className="mb-1 text-blue-600 group-hover:rotate-180 transition-transform duration-500"/>
                              <span className="text-[10px] font-bold uppercase tracking-wider">Vendre</span>
                            </button>
                          </div>
                        </>
                      ) : (
                        <form onSubmit={handleExecuteMovement} className="space-y-3 animate-in fade-in zoom-in-95">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold uppercase text-indigo-600">{movementConfig.type === 'buy' ? 'Achat de support' : 'Vente de support'}</span>
                            <button onClick={() => setMovementConfig(null)} className="text-indigo-400 hover:text-indigo-600"><X size={14}/></button>
                          </div>
                          <select className="w-full p-2 text-xs rounded-lg border border-indigo-200" value={movementData.positionId} onChange={(e) => setMovementData({...movementData, positionId: e.target.value})} required>
                            <option value="">Sélectionner un support...</option>
                            {asset.positions.filter(p => !p.isCash).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                          <input type="number" placeholder="Montant (€)" className="w-full p-2 text-xs rounded-lg border border-indigo-200" value={movementData.amount} onChange={(e) => setMovementData({...movementData, amount: e.target.value})} required />
                          <Button type="submit" className="w-full text-xs py-2 bg-indigo-600 text-white">Confirmer</Button>
                        </form>
                      )}
                    </Card>

                    <Card className="tour-asset-add-line h-fit bg-slate-50/50 border-slate-200">
                      <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><PlusCircle size={20} className="text-blue-600"/> Ajouter une ligne</h3>
                      <form onSubmit={handleAddPosition} className="space-y-4">
                        <input type="text" className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: ETF S&P 500" value={newPosition.name} onChange={(e) => setNewPosition({...newPosition, name: e.target.value})} />
                        <Button type="submit" className="w-full justify-center" disabled={!newPosition.name}>Créer la ligne</Button>
                      </form>
                    </Card>
                  </div>

                  <Card className="tour-asset-lines lg:col-span-2 overflow-hidden flex flex-col border-slate-200 p-0">
                    <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="font-bold text-slate-700 flex items-center gap-2">Lignes détenues</h3>
                    </div>
                    <div className="divide-y divide-slate-100 overflow-y-auto max-h-[400px]">
                      {(!asset.positions || asset.positions.filter(p => !p.isCash).length === 0) ? (
                        <div className="p-10 text-center text-slate-400">Aucune ligne investie.</div>
                      ) : (
                        asset.positions.filter(p => !p.isCash).map(pos => {
                          // Calcul de la performance de la ligne
                          const posPerf = pos.value - (pos.totalInvested || 0);
                          const posPct = pos.totalInvested > 0 ? (posPerf / pos.totalInvested) * 100 : 0;
                          
                          return (
                            <div 
                              key={pos.id} 
                              className="p-4 flex items-center justify-between hover:bg-slate-50 transition group cursor-pointer" 
                              onClick={() => { setSelectedPosition(pos); setViewMode('position'); }}
                            >
                              {/* À GAUCHE : Nom et PRU */}
                              <div className="flex flex-col min-w-0">
                                <span className="font-medium text-slate-700 truncate">{pos.name}</span>
                              </div>
                              
                              {/* À DROITE : Valeur et Indicateur de Performance */}
                              <div className="flex items-center gap-4 flex-shrink-0">
                                <div className="text-right flex flex-col items-end">
                                  <span className="font-bold text-slate-900">{formatCurrency(pos.value)}</span>
                                  
                                  {/* Tag de performance (Montant + Pourcentage) */}
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${posPerf >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                      {posPerf >= 0 ? '+' : ''}{posPct.toFixed(1)}%
                                    </span>
                                  </div>
                                </div>
                                
                                {/* Bouton de suppression */}
                                {!pos.isCash && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setDeleteConfig({ type: 'position', id: pos.id }); }} 
                                  className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 size={16} />
                                </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </Card>
                </div>
              </>
            )}

            {/* CONTENU ONGLET : HISTORIQUE */}
            {activeTab === 'history' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
                <div className="tour-asset-update space-y-6">
                  {isComposite ? (
                    <Card className="h-fit bg-indigo-50 border-indigo-100">
                      <h3 className="font-bold text-indigo-900 mb-2 flex items-center gap-2"><Info size={20} /> Mode Synchronisé</h3>
                      <p className="text-sm text-indigo-800 leading-relaxed">L'historique est calculé automatiquement en additionnant l'historique de chaque ligne.</p>
                    </Card>
                  ) : (
                    <Card className="h-fit border-blue-200 bg-blue-50">
                      <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2"><Edit size={20}/> Mettre à jour</h3>
                      <form onSubmit={handleUpdateBalance} className="space-y-4">
                        <input type="number" step="0.01" className="w-full p-3 rounded-lg border border-blue-200" value={currentBalanceUpdate} onChange={(e) => setCurrentBalanceUpdate(e.target.value)} />
                        <Button type="submit" className="w-full">Valider</Button>
                      </form>
                    </Card>
                  )}
                  {!isComposite && (
                    <Card className="h-fit bg-slate-50/50 border-slate-200">
                      <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><History size={20}/> Point passé</h3>
                      <form onSubmit={handleAddAssetHistory} className="space-y-4">
                        <input type="date" className="w-full p-2 rounded-lg border border-slate-300" value={newAssetHistoryPoint.date} onChange={(e) => setNewAssetHistoryPoint({...newAssetHistoryPoint, date: e.target.value})} />
                        <input type="number" step="0.01" className="w-full p-2 rounded-lg border border-slate-300" value={newAssetHistoryPoint.value} onChange={(e) => setNewAssetHistoryPoint({...newAssetHistoryPoint, value: e.target.value})} />
                        <Button type="submit" className="w-full" variant="secondary">Enregistrer</Button>
                      </form>
                    </Card>
                  )}
                </div>
                <div className="lg:col-span-2 space-y-6">
                  <Card className="tour-asset-chart border-slate-200">
                    <h3 className="font-bold text-slate-800 mb-4">Évolution du solde</h3>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={assetChartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                          <RechartsTooltip formatter={(val) => formatCurrency(val)} />
                          <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeWidth={3} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                  <Card className="tour-asset-history overflow-hidden border-slate-200 p-0">
                    <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="font-bold text-slate-700">{isComposite ? "Journal des Opérations" : "Historique Global"}</h3>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-100">
                      {isComposite ? (
                        unifiedHistory.length === 0 ? <div className="p-4 text-center text-slate-400">Aucune opération enregistrée.</div> : unifiedHistory.map((event, idx) => (
                          <div key={idx} className="p-3 flex justify-between items-center hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-full flex-shrink-0 ${event.isExternal ? (event.type === 'in' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600') : (event.type === 'buy' ? 'bg-indigo-100 text-indigo-600' : 'bg-orange-100 text-orange-600')}`}>
                                {event.isExternal ? (event.type === 'in' ? <ArrowDownRight size={14}/> : <ArrowUpRight size={14}/>) : (event.type === 'buy' ? <PlusCircle size={14}/> : <ArrowRightLeft size={14}/>)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-800 truncate max-w-[150px] md:max-w-[250px]">{event.label}</p>
                                <p className="text-[10px] text-slate-500">{new Date(event.date).toLocaleDateString()} • {event.isExternal ? (event.type === 'in' ? 'Virement Entrant' : 'Virement Sortant') : (event.type === 'buy' ? 'Achat Support' : 'Vente Support')}</p>
                              </div>
                            </div>
                            <span className={`font-bold text-sm flex-shrink-0 ${event.isExternal ? (event.type === 'in' ? 'text-green-600' : 'text-red-600') : (event.type === 'buy' ? 'text-indigo-600' : 'text-orange-600')}`}>
                              {event.type === 'in' || event.type === 'buy' ? '+' : '-'}{formatCurrency(event.amount)}
                            </span>
                          </div>
                        ))
                      ) : (
                        (!asset.history || asset.history.length === 0) ? <div className="p-4 text-center text-slate-400">Aucun historique.</div> : [...asset.history].sort((a,b) => new Date(b.date) - new Date(a.date)).map((point, idx) => (
                          <div key={idx} className="p-3 flex justify-between items-center group hover:bg-slate-50">
                            <span className="text-sm text-slate-600 flex items-center gap-2">
                              {new Date(point.date).toLocaleDateString()}
                              {new Date(point.date) > new Date() && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-bold">Prév.</span>}
                            </span>
                            <div className="flex items-center gap-4">
                              <span className="font-bold text-slate-900">{formatCurrency(point.value)}</span>
                              <button onClick={() => setDeleteConfig({ type: 'assetHistory', id: idx })} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {/* CONTENU ONGLET : ANALYSE */}
            {activeTab === 'analysis' && (
              <div className="flex flex-col h-full animate-in fade-in duration-300">
                <Button onClick={handleAnalyzeAsset} disabled={isAnalyzing} className="mx-auto mb-6 bg-indigo-600 text-white">
                  {isAnalyzing ? <Loader2 className="animate-spin" size={18} /> : <Sparkles className="mr-2" size={18} />} Lancer l'analyse
                </Button>
                {aiAnalysis && <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 overflow-y-auto max-h-[400px]"><MessageBubble message={{ role: 'assistant', content: aiAnalysis }} /></div>}
              </div>
            )}
          </div>
        </>
      )}

      {/* --- VUE DÉTAIL D'UNE POSITION --- */}
      {viewMode === 'position' && selectedPosition && (
        <>
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-blue-50/50">
            <div>
              <button onClick={() => setViewMode('asset')} className="flex items-center gap-1 text-slate-500 hover:text-slate-800 mb-2 text-sm font-medium"><ChevronLeft size={16} /> Retour</button>
              <div className="flex items-center gap-2">
                <TrendingDown size={24} className="text-purple-600"/>
                {isEditingPosName ? (
                  <input 
                    type="text" 
                    value={editedPosName} 
                    onChange={(e) => setEditedPosName(e.target.value)}
                    onBlur={handleSavePosName}
                    onKeyDown={handleKeyDownPosName}
                    autoFocus
                    className="text-2xl font-bold text-slate-800 bg-transparent border-b-2 border-purple-500 outline-none w-full max-w-[250px]"
                  />
                ) : (
                  <h2 
                    onClick={() => setIsEditingPosName(true)}
                    className="text-2xl font-bold text-slate-800 hover:text-purple-600 cursor-text transition-colors border-b-2 border-transparent hover:border-purple-200 border-dashed"
                    title="Modifier le nom"
                  >
                    {selectedPosition.name}
                  </h2>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">Valeur Actuelle (Marché)</p>
              <p className="text-3xl font-bold text-purple-600">{formatCurrency(selectedPosition.value)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 py-4 bg-white border-b border-slate-100">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Total Versé</p>
              <p className="text-sm font-bold text-slate-700">{formatCurrency(selectedPosition.totalInvested || 0)}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Performance</p>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${(selectedPosition.value - (selectedPosition.totalInvested || 0)) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(selectedPosition.value - (selectedPosition.totalInvested || 0))}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${(selectedPosition.value - (selectedPosition.totalInvested || 0)) >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{selectedPosition.totalInvested > 0 ? (((selectedPosition.value - selectedPosition.totalInvested) / selectedPosition.totalInvested) * 100).toFixed(2) : 0}%</span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="h-fit bg-slate-50/50 border-slate-200">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><History size={20} className="text-purple-600"/> Évolution</h3>
                <form onSubmit={handleAddPositionHistory} className="space-y-4">
                  <input type="date" className="w-full p-2 rounded-lg border border-slate-300" value={newPosHistoryPoint.date} onChange={(e) => setNewPosHistoryPoint({...newPosHistoryPoint, date: e.target.value})} />
                  <input type="number" className="w-full p-2 rounded-lg border border-slate-300" placeholder="0.00" value={newPosHistoryPoint.value} onChange={(e) => setNewPosHistoryPoint({...newPosHistoryPoint, value: e.target.value})} />
                  <Button type="submit" className="w-full justify-center bg-purple-600 hover:bg-purple-700 text-white">Enregistrer</Button>
                </form>
              </Card>

              <div className="lg:col-span-2 space-y-6">
                <Card className="border-slate-200">
                  <h3 className="font-bold text-slate-800 mb-4">Performance Historique</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={positionChartData}>
                        <defs>
                          <linearGradient id="colorPos" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#9333ea" stopOpacity={0.4}/>
                            <stop offset="90%" stopColor="#9333ea" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{fontSize: 12}} />
                        <YAxis tick={{fontSize: 12}} />
                        <RechartsTooltip formatter={(val) => formatCurrency(val)} />
                        <Area type="monotone" dataKey="value" stroke="#9333ea" fillOpacity={1} fill="url(#colorPos)" />
                        
                        {/* AJOUT : Lignes verticales pour les achats (vert) et ventes (rouge) */}
                        {(selectedPosition.history || [])
                          .filter(h => h.movementTag)
                          .map((h, idx) => (
                            <ReferenceLine 
                              key={idx} 
                              x={h.date} 
                              stroke={h.movementTag === 'buy' ? '#22c55e' : '#ef4444'} 
                              strokeWidth={2}
                              strokeDasharray="3 3"
                            />
                        ))}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
                <Card className="overflow-hidden border-slate-200 p-0">
                  <div className="bg-slate-50 p-4 border-b border-slate-100 font-bold">Historique de la ligne</div>
                  <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-100">
                    {[...(selectedPosition.history || [])]
                      .sort((a, b) => {
                        const dateDiff = new Date(b.date) - new Date(a.date);
                        if (dateDiff === 0 && b.id && a.id) return b.id - a.id;
                        return dateDiff;
                      })
                      .map((point, idx) => (
                        <div key={idx} className="p-3 flex justify-between items-center hover:bg-slate-50 group">
                          <span className="text-sm text-slate-600 flex items-center gap-2">
                            {new Date(point.date).toLocaleDateString()}
                            
                            {/* AFFICHAGE DU TAG SI MOUVEMENT */}
                            {point.movementTag && point.movementTag !== 'creation' && (
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${point.movementTag === 'buy' ? 'bg-green-100 text-green-700' : point.movementTag === 'sell' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                {point.movementTag === 'buy' ? 'ACHAT' : point.movementTag === 'sell' ? 'VENTE' : 'ÉVOLUTION'}
                              </span>
                            )}
                            
                            {!point.movementTag && new Date(point.date) > new Date() && (
                              <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-bold">Prév.</span>
                            )}
                          </span>
                          
                          <div className="flex items-center gap-4">
                            <div className="text-right flex flex-col items-end">
                               {point.movementAmount !== undefined && point.movementTag !== 'creation' && (
                                  <span className={`text-xs font-bold ${
                                    point.movementTag === 'buy' ? 'text-green-600' : 
                                    point.movementTag === 'sell' ? 'text-red-600' : 
                                    point.movementAmount > 0 ? 'text-blue-600' : 
                                    point.movementAmount < 0 ? 'text-orange-500' : 'text-slate-500'
                                  }`}>
                                    {point.movementTag === 'buy' ? '+' : point.movementTag === 'sell' ? '-' : point.movementAmount > 0 ? '+' : ''}{formatCurrency(point.movementTag === 'sell' ? point.movementAmount : point.movementAmount)}
                                  </span>
                               )}
                               <span className={(point.movementTag && point.movementTag !== 'creation') ? "text-[10px] text-slate-500" : "font-bold text-slate-900"}>
                                  {(point.movementTag && point.movementTag !== 'creation') ? `Solde: ${formatCurrency(point.value)}` : formatCurrency(point.value)}
                               </span>
                            </div>
                            <button 
                              onClick={() => setDeleteConfig({ type: 'posHistory', id: idx })} 
                              className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                            >
                              <Trash2 size={14}/>
                            </button>
                          </div>
                        </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  </div>
);
};

const TransactionCalendar = ({ transactions, filterMonth, onDayClick }) => {
  const [displayDate, setDisplayDate] = useState(new Date());

  // Aligne le calendrier si un mois est cliqué sur le graphique
  useEffect(() => {
    if (filterMonth) {
      const [year, month] = filterMonth.split('-');
      setDisplayDate(new Date(year, month - 1, 1));
    } else {
      setDisplayDate(new Date());
    }
  }, [filterMonth]);

  const year = displayDate.getFullYear();
  const month = displayDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  // Ajustement pour démarrer la semaine le Lundi (au lieu de Dimanche en JS)
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  // Calcul des totaux par jour
  const dailyData = {};
  transactions.forEach(t => {
     const tDate = new Date(t.date);
     if (tDate.getFullYear() === year && tDate.getMonth() === month) {
        const day = tDate.getDate();
        if (!dailyData[day]) dailyData[day] = { income: 0, expense: 0 };
        if (t.type === 'income') dailyData[day].income += t.amount;
        if (t.type === 'expense') dailyData[day].expense += t.amount;
     }
  });

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: startOffset }, (_, i) => i);
  const monthName = displayDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <div className="p-2 sm:p-4 bg-slate-50/50 rounded-xl h-full flex flex-col animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-4 px-2">
         <h4 className="font-bold text-slate-700 capitalize text-lg">{monthName}</h4>
         {/* Navigation permise seulement si aucun mois n'est imposé par le graphique */}
         {!filterMonth && (
           <div className="flex gap-2">
             <button onClick={() => setDisplayDate(new Date(year, month - 1, 1))} className="p-1.5 hover:bg-slate-200 text-slate-500 rounded-lg transition-colors"><ChevronLeft size={18}/></button>
             <button onClick={() => setDisplayDate(new Date(year, month + 1, 1))} className="p-1.5 hover:bg-slate-200 text-slate-500 rounded-lg transition-colors"><ChevronRight size={18}/></button>
           </div>
         )}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => <div key={d} className="text-[10px] md:text-xs font-bold text-slate-400 uppercase">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1 md:gap-2 auto-rows-[minmax(50px,_1fr)] md:auto-rows-[minmax(70px,_1fr)]">
         {blanks.map(b => <div key={`blank-${b}`} className="bg-transparent rounded-lg" />)}
         {daysArray.map(day => {
            const data = dailyData[day];
            const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
            const hasData = data?.income > 0 || data?.expense > 0;
            const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            return (
              <div 
                key={day} 
                onClick={() => onDayClick && onDayClick(formattedDate)}
                className={`relative flex flex-col items-center p-1 md:p-2 rounded-lg border shadow-sm cursor-pointer ${isToday ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200' : 'bg-white border-slate-100 hover:border-blue-300'} transition-colors`}
              >
                 <span className={`text-xs md:text-sm font-semibold ${isToday ? 'text-blue-700' : hasData ? 'text-slate-900' : 'text-slate-400'}`}>{day}</span>
                 <div className="flex flex-col items-center mt-auto w-full px-0.5 space-y-0.5">
                   {data?.income > 0 && <span className="text-[9px] md:text-[10px] font-bold text-green-600 leading-none truncate w-full text-center">+{Math.round(data.income)}€</span>}
                   {data?.expense > 0 && <span className="text-[9px] md:text-[10px] font-bold text-red-500 leading-none truncate w-full text-center">-{Math.round(data.expense)}€</span>}
                 </div>
              </div>
            )
         })}
      </div>
    </div>
  )
};

const DashboardView = ({ assets, transactions, setActiveTab, onDeleteTransaction, userProfile }) => {
  const [timeRange, setTimeRange] = useState('6M');
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [chartMode, setChartMode] = useState('global'); // 'global' (Area) or 'detailed' (StackedBar)
  const [forecast, setForecast] = useState(null);
  const [isForecasting, setIsForecasting] = useState(false);
  const [txAnalysis, setTxAnalysis] = useState(null);
  const [isTxAnalyzing, setIsTxAnalyzing] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [focusedTxId, setFocusedTxId] = useState(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const onPieEnter = (_, index) => setActiveIndex(index);
  const onPieLeave = () => setActiveIndex(-1);
  const [filterMonth, setFilterMonth] = useState(null);
  const [filterCategory, setFilterCategory] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(20); // État pour la pagination
  const [txViewMode, setTxViewMode] = useState('list'); // 'list' ou 'calendar'

  // 1. Filtrage et Tri complet
  const allFilteredTransactions = useMemo(() => {
    let result = [...(transactions || [])];
    if (filterMonth) result = result.filter(t => t.date.startsWith(filterMonth));
    if (filterCategory) result = result.filter(t => t.category === filterCategory);
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t => 
        t.label.toLowerCase().includes(query) || 
        t.date.includes(query)
      );
    }
    result.sort((a, b) => b.date.localeCompare(a.date));
    return result;
  }, [transactions, filterMonth, filterCategory, searchQuery]);

  // 2. Tronquage pour l'affichage selon visibleCount
  const displayTransactions = useMemo(() => {
    return allFilteredTransactions.slice(0, visibleCount);
  }, [allFilteredTransactions, visibleCount]);

  // Réinitialise le compteur si les filtres changent pour revenir en haut de liste
  useEffect(() => { setVisibleCount(20); }, [filterMonth, filterCategory, searchQuery]);

  // Mapping des icônes pour le patrimoine
  const ASSET_ICONS = {
    liquidite: PiggyBank,
    investissement: TrendingUp,
    epargne_salariale: Briefcase,
    immobilier: Home,
    crypto: Zap,
    autre: Circle
  };

  const renderAssetLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, payload }) => {
    if (percent < 0.05) return null; // On n'affiche pas l'icône si la part est trop petite
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const Icon = ASSET_ICONS[payload.type] || Circle;
    return (
      <g pointerEvents="none">
        <foreignObject x={x - 10} y={y - 10} width={20} height={20}>
          <div className="flex items-center justify-center w-full h-full text-white drop-shadow-md">
            <Icon size={14} strokeWidth={2.5} />
          </div>
        </foreignObject>
      </g>
    );
  };

  const evolutionData = useMemo(() => processHistoryData(timeRange, assets), [timeRange, assets]);
  const cashflowHistoryData = useMemo(() => processFlowData(timeRange, transactions), [timeRange, transactions]);

  const netWorth = assets ? assets.reduce((acc, item) => acc + item.value, 0) : 0;
   
  const liquidities = assets ? assets.filter(a => a.type === 'liquidite').reduce((acc, a) => acc + a.value, 0) : 0;
  const investments = assets ? assets.filter(a => ['investissement', 'crypto', 'immobilier', 'epargne_salariale'].includes(a.type)).reduce((acc, a) => acc + a.value, 0) : 0;

  const netWorthHistory = evolutionData.map(d => ({ date: d.month, value: d.totalNet }));
  const liquidityHistory = evolutionData.map(d => ({ date: d.month, value: d.liquidite }));
  const investmentHistory = evolutionData.map(d => ({ date: d.month, value: d.investissement + d.crypto + d.immobilier + d.epargne_salariale }));

  const allocationData = assets && assets.length > 0 ? Object.keys(COLORS).map(type => {
    const value = assets.filter(a => a.type === type).reduce((sum, a) => sum + a.value, 0);
    return { name: CATEGORY_LABELS[type], value, type };
  }).filter(d => d.value > 0) : [];

  const getGrowth = (data, keys) => {
    if (!data || data.length < 2) return "0.0";
    const current = keys.reduce((sum, k) => sum + (data[data.length - 1][k] || 0), 0);
    const previous = keys.reduce((sum, k) => sum + (data[data.length - 2][k] || 0), 0);
    if (previous === 0) return current === 0 ? "0.0" : "100.0";
    return ((current - previous) / Math.abs(previous) * 100).toFixed(1);
  };

  const netWorthGrowth = getGrowth(evolutionData, ['totalNet']);
  const investmentsGrowth = getGrowth(evolutionData, ['investissement', 'crypto', 'immobilier', 'epargne_salariale']);
  const liquiditiesGrowth = getGrowth(evolutionData, ['liquidite']);

  const handleAnalyzeDashboard = async () => {
    setIsAnalyzing(true);
    const context = `Analyse le patrimoine: ${netWorth}€. Evolution: ${netWorthGrowth}%.`;
    try {
      const result = await callGeminiAPI("Expert finance. Utilise ## pour les titres, - pour les listes, et <b> pour mettre en gras les mots importants. Interdiction d'utiliser les caractères * ou **.", [], context);
      setAiAnalysis(result);
    } catch (e) { setAiAnalysis("Erreur."); }
    setIsAnalyzing(false);
  };

  const handleForecast = async () => {
    setIsForecasting(true);
    try {
      const resultText = await callGeminiAPI("Expert prévision. Utilise ## pour les titres, - pour les listes, et <b> pour mettre en gras les mots importants. Interdiction d'utiliser les caractères * ou **.", [], `Flux: ${JSON.stringify(cashflowHistoryData.slice(-3))}. JSON: {revenus, depenses, solde, conseil}`);
      const jsonStr = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
      setForecast(JSON.parse(jsonStr));
    } catch (e) { setForecast({ revenus: 0, depenses: 0, solde: 0, conseil: "Erreur." }); }
    setIsForecasting(false);
  };

  const handleTxAnalysis = async () => {
    setIsTxAnalyzing(true);
    try {
      const result = await callGeminiAPI("Analyste budget. Utilise ## pour les titres, - pour les listes, et <b> pour mettre en gras les mots importants. Interdiction d'utiliser les caractères * ou **.", [], `Transac: ${JSON.stringify(transactions.slice(0, 5))}`);
      setTxAnalysis(result);
    } catch (e) { setTxAnalysis("Erreur."); }
    setIsTxAnalyzing(false);
  };

  const formatWealth = (value) => {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(2) + ' M€';
    } else if (value >= 10000) {
       return (value / 1000).toFixed(0) + ' k€';
    }
    return formatCurrency(value);
  };

  const hasFlowData = useMemo(() => cashflowHistoryData.some(d => d.revenus > 0 || d.depenses > 0), [cashflowHistoryData]);

  // --- ÉTAPE A : Chargement initial ---
  // Si assets est strictement null, on affiche le loader pour éviter le clignotement
  if (assets === null || transactions === null) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  // --- ÉTAPE B : Compte réellement vide ---
  // Si assets est un tableau vide [], c'est que Firebase a répondu "rien trouvé"
  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-6 animate-in fade-in">
        <div className="p-6 bg-white rounded-full shadow-lg text-blue-600 mb-2"><TrendingUp size={48} /></div>
        <h2 className="text-2xl font-bold text-slate-800">Bienvenue {userProfile?.firstName || ''} sur votre Tableau de Bord</h2>
        <Button onClick={() => { setActiveTab('assets'); window.dispatchEvent(new Event('close-tour')); }} className="tour-start-btn shadow-lg hover:scale-105 transition-transform">Commencer maintenant <ArrowRight size={18} /></Button>
      </div>
    );
  }

  // Configuration du graphique "Global"
  const renderGlobalChart = () => (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={evolutionData}>
        <defs>
          <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.5}/>
            <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10}/>
        <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val} />
        <RechartsTooltip 
          cursor={{stroke: '#cbd5e1', strokeWidth: 1}} 
          contentStyle={{ 
            borderRadius: '12px', 
            border: 'none', 
            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
            backgroundColor: 'rgba(255, 255, 255, 0.8)', // Fond transparent
            backdropFilter: 'blur(4px)',               // Effet de flou
            padding: '8px 12px',
            fontSize: '12px'
          }} 
          offset={25}                                  // Décale la bulle du doigt
          allowEscapeViewBox={{ x: false, y: true }}
          wrapperStyle={{ pointerEvents: 'none' }}
          formatter={(value) => [formatCurrency(value), 'Patrimoine Net']}
        />
        <Area type="monotone" dataKey="totalNet" stroke="#2563eb" strokeWidth={3} fill="url(#gradTotal)" />
      </AreaChart>
    </ResponsiveContainer>
  );

  // Configuration du graphique "Détail"
  const renderDetailedChart = () => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={evolutionData} barSize={20}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10}/>
        <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val} />
        <RechartsTooltip 
          cursor={{fill: '#f8fafc'}} 
          contentStyle={{ 
            borderRadius: '12px', 
            border: 'none', 
            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(4px)',
            padding: '8px 12px',
            fontSize: '11px' // Un peu plus petit car il y a beaucoup de lignes
          }}
          offset={25}
          allowEscapeViewBox={{ x: false, y: true }}
          wrapperStyle={{ pointerEvents: 'none' }}
          formatter={(value, name) => [formatCurrency(value), CATEGORY_LABELS[name] || name]}
          itemSorter={(item) => -item.value}
        />
        <Bar dataKey="liquidite" name={CATEGORY_LABELS.liquidite} stackId="a" fill={COLORS.liquidite} radius={[0, 0, 4, 4]} />
        <Bar dataKey="investissement" name={CATEGORY_LABELS.investissement} stackId="a" fill={COLORS.investissement} />
        <Bar dataKey="epargne_salariale" name={CATEGORY_LABELS.epargne_salariale} stackId="a" fill={COLORS.epargne_salariale} />
        <Bar dataKey="immobilier" name={CATEGORY_LABELS.immobilier} stackId="a" fill={COLORS.immobilier} />
        <Bar dataKey="crypto" name={CATEGORY_LABELS.crypto} stackId="a" fill={COLORS.crypto} />
        <Bar dataKey="autre" name={CATEGORY_LABELS.autre} stackId="a" fill={COLORS.autre} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
   
  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-slate-900 bg-slate-100 min-h-screen p-4 pb-24 md:pb-8">
      <ConfirmationModal isOpen={!!transactionToDelete} onClose={() => setTransactionToDelete(null)} onConfirm={() => { onDeleteTransaction(transactionToDelete); setTransactionToDelete(null); }} message="Supprimer cette opération ?" />
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
        <div>
            {userProfile?.firstName && <h1 className="text-2xl font-bold text-slate-800">Bonjour, {userProfile.firstName} 👋</h1>}
        </div>
        <div className="flex gap-2"><Button variant="magic" onClick={handleAnalyzeDashboard} disabled={isAnalyzing} className="text-xs px-3 py-1.5">{isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}{isAnalyzing ? "..." : "Analyser"}</Button><div className="bg-white p-1 rounded-lg border border-slate-300 shadow-sm flex">{['6M', '1Y', '5Y', 'ALL'].map(range => (<button key={range} onClick={() => setTimeRange(range)} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${timeRange === range ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>{range === 'ALL' ? 'Tout' : range}</button>))}</div></div>
      </div>
      {aiAnalysis && <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 relative mb-4"><button onClick={() => setAiAnalysis(null)} className="absolute top-2 right-2 text-indigo-400"><X size={16} /></button><div className="flex gap-3"><div className="bg-white p-2 rounded-full h-fit text-indigo-600"><Bot size={20} /></div><div className="text-sm text-indigo-900 whitespace-pre-line">{aiAnalysis}</div></div></div>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SparklineCard title="Patrimoine Net" value={`${formatCurrency(netWorth)}`} data={netWorthHistory} dataKey="value" color="#3b82f6" icon={Wallet} percentage={netWorthGrowth} />
        <SparklineCard title="Actifs Financiers" value={`${formatCurrency(investments)}`} data={investmentHistory} dataKey="value" color="#10b981" icon={TrendingUp} percentage={investmentsGrowth} />
        <SparklineCard title="Liquidités" value={`${formatCurrency(liquidities)}`} data={liquidityHistory} dataKey="value" color="#f59e0b" icon={PiggyBank} percentage={liquiditiesGrowth} /></div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <Card className="lg:col-span-2 flex flex-col border-slate-300 min-h-[400px]">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp size={20} className="text-blue-600 shrink-0"/> 
              <span className="leading-tight">Évolution du Patrimoine</span>
            </h3>
            
            <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200 w-full sm:w-auto justify-center">
                <button 
                  onClick={() => setChartMode('global')} 
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${chartMode === 'global' ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <LineChartIcon size={14} /> Global
                </button>
                <button 
                  onClick={() => setChartMode('detailed')} 
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${chartMode === 'detailed' ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <BarChart2 size={14} /> Détail
                </button>
            </div>
          </div>
          <div className="flex-1 w-full min-h-[300px]">
             {chartMode === 'global' ? renderGlobalChart() : renderDetailedChart()}
          </div>
        </Card>
        
        <Card className="border-slate-300 flex flex-col relative min-h-[400px]">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 absolute top-6 left-6 z-10">
            <PieIcon size={20} className="text-blue-600"/> Répartition
          </h3>
          
          <div className="flex-1 w-full relative mt-12 min-h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                      <Pie 
                        data={allocationData} 
                        innerRadius={70} 
                        outerRadius={105}
                        paddingAngle={4} 
                        dataKey="value"
                        label={renderAssetLabel}
                        labelLine={false}
                        onMouseEnter={onPieEnter}
                        onMouseLeave={onPieLeave}
                        animationDuration={800}
                        tabIndex={-1}
                        style={{ outline: 'none' }}
                      >
                          {allocationData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={COLORS[entry.type] || '#cbd5e1'} 
                              stroke="none"
                              opacity={activeIndex === -1 || activeIndex === index ? 1 : 0.4}
                              style={{ transition: 'opacity 0.2s ease', outline: 'none' }}
                            />
                          ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(4px)', fontSize: '12px', padding: '8px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        offset={20}
                        wrapperStyle={{ pointerEvents: 'none' }}
                        formatter={(value) => [formatCurrency(value), 'Valeur']}
                        allowEscapeViewBox={{ x: false, y: true }} 
                      />
                  </PieChart>
              </ResponsiveContainer>

              {/* Texte Central Dynamique */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0" style={{top: '0'}}>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    {activeIndex !== -1 ? `${((allocationData[activeIndex].value / netWorth) * 100).toFixed(1)}%` : "Total"}
                  </span>
                  <span className="text-2xl font-extrabold transition-colors duration-200" style={{ color: activeIndex !== -1 ? COLORS[allocationData[activeIndex].type] : '#1e293b' }}>
                    {formatWealth(activeIndex !== -1 ? allocationData[activeIndex].value : netWorth)}
                  </span>
                  <span className="text-[10px] font-bold text-slate-600 mt-1 px-2 py-0.5 rounded-full bg-slate-50 border border-slate-100 shadow-sm">
                    {activeIndex !== -1 ? allocationData[activeIndex].name : "Patrimoine"}
                  </span>
              </div>
          </div>

          {/* Légende Interactive */}
          <div className="mt-4 flex flex-wrap justify-center gap-2 px-2 overflow-y-auto max-h-24 no-scrollbar pb-2">
              {allocationData.map((entry, index) => (
                  <div 
                    key={entry.type} 
                    onClick={() => {
                        // Logique de dé-sélection pour le patrimoine
                        const newIndex = activeIndex === index ? -1 : index;
                        setActiveIndex(newIndex);
                    }}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-md border transition-all cursor-pointer ${activeIndex === index ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-100 scale-105' : 'bg-white border-slate-100'}`}
                  >
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[entry.type] }} />
                      <span className="text-[10px] font-bold text-slate-700">{entry.name}</span>
                  </div>
              ))}
          </div>
      </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card className="relative border-slate-300">
          <div className="mb-6">
            {/* En-tête : Empilé sur mobile, aligné sur desktop */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <ArrowRightLeft size={20} className="text-purple-600 shrink-0"/> 
                <span className="leading-tight">Revenus & Dépenses</span>
              </h3>
              
              <Button 
                variant="magic" 
                onClick={handleForecast} 
                disabled={isForecasting} 
                className="text-xs px-4 py-2 h-9 w-full sm:w-auto shadow-sm"
              >
                {isForecasting ? <Loader2 size={14} className="animate-spin" /> : <Calculator size={14} />}
                <span>Prévision</span>
              </Button>
            </div>
            
            {/* Encadré d'information plus aéré */}
            <div className="flex items-start gap-2 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
              <div className="bg-blue-100 p-1.5 rounded-full text-blue-600 shrink-0 mt-0.5">
                <Info size={9} />
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Cliquez sur les barres de <strong className="text-slate-900">dépenses</strong> pour voir le détail par catégorie.
              </p>
            </div>
          </div>
            {forecast && <div className="absolute top-16 left-6 right-6 z-20 bg-white/90 backdrop-blur-md p-4 rounded-xl border border-indigo-100 shadow-lg"><div className="flex justify-between"><h4 className="font-bold text-indigo-900">Prévision IA</h4><button onClick={() => setForecast(null)}><X size={16}/></button></div><div className="grid grid-cols-3 gap-4 mb-3 text-center"><div className="p-2 bg-green-50 rounded-lg"><p className="text-xs text-green-700">Revenus</p><p className="font-bold">{formatCurrency(forecast.revenus)}</p></div><div className="p-2 bg-red-50 rounded-lg"><p className="text-xs text-red-700">Dépenses</p><p className="font-bold">{formatCurrency(forecast.depenses)}</p></div></div><p className="text-xs text-slate-600 italic">{forecast.conseil}</p></div>}
            
            <InteractiveBudgetChart 
              cashflowData={cashflowHistoryData} 
              transactions={transactions} 
              hasFlowData={hasFlowData}
              onMonthSelect={setFilterMonth}      // Connexion au filtre de mois
              onCategorySelect={setFilterCategory} // Connexion au filtre de catégorie
          />
        </Card>
        <Card className="flex flex-col relative border-slate-300 h-[560px]"> {/* Hauteur fixe pour éviter l'étirement */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 shrink-0">
            <div className="flex items-center gap-2 flex-1">
              <List size={20} className="text-blue-600 shrink-0"/> 
              <span className="leading-tight text-lg font-bold text-slate-800">Dernières Opérations</span>
              {(filterMonth || filterCategory || searchQuery) && (
                <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md border border-indigo-100">
                  Filtré
                </span>
              )}
              
              <div className="ml-auto flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button 
                  onClick={() => setTxViewMode('list')} 
                  className={`p-1.5 rounded-md transition-all flex items-center justify-center ${txViewMode === 'list' ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'}`}
                  title="Vue Liste"
                >
                  <List size={14} />
                </button>
                <button 
                  onClick={() => { setTxViewMode('calendar'); window.dispatchEvent(new Event('close-tour')); }} 
                  className={`tour-calendar-btn p-1.5 rounded-md transition-all flex items-center justify-center ${txViewMode === 'calendar' ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'}`}
                  title="Vue Calendrier"
                >
                  <CalendarDays size={14} />
                </button>
              </div>

              <button 
                onClick={() => { setIsSearchOpen(!isSearchOpen); if(isSearchOpen) setSearchQuery(''); }}
                className={`ml-2 p-1.5 rounded-lg transition-all border ${isSearchOpen ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-blue-600'}`}
              >
                <Search size={16} />
              </button>
            </div>
            <Button variant="magic" onClick={handleTxAnalysis} disabled={isTxAnalyzing} className="text-xs px-4 py-2 h-9 w-full sm:w-auto">
              {isTxAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Analyser
            </Button>
          </div>

          {/* Barre de recherche animée */}
          {isSearchOpen && (
            <div className="mb-4 animate-in slide-in-from-top duration-200">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Rechercher par nom ou date YYYY-MM-DD..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Zone de contenu défilante */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            {txViewMode === 'calendar' ? (
              <TransactionCalendar 
                transactions={allFilteredTransactions} 
                filterMonth={filterMonth} 
                onDayClick={(dateStr) => {
                  setSearchQuery(dateStr);
                  setIsSearchOpen(true);
                  setTxViewMode('list');
                }}
              />
            ) : (
              <div className="space-y-2">
              {(!displayTransactions || displayTransactions.length === 0) ? (
                <div className="p-10 text-center text-slate-400 italic text-sm">Aucune opération trouvée</div>
              ) : (
                <>
                  {displayTransactions.map(t => (
                    <div 
                      key={t.id} 
                      className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-200 group cursor-pointer"
                      onClick={() => setFocusedTxId(focusedTxId === t.id ? null : t.id)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-full shrink-0 ${t.type === 'income' ? 'bg-green-100 text-green-600' : t.type === 'transfer' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                          {t.type === 'income' ? <ArrowUpRight size={14} /> : t.type === 'transfer' ? <ArrowRight size={14} /> : <ArrowDownRight size={14} />}
                        </div>
                        <div className="min-w-0 truncate">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <p className="font-bold text-slate-800 text-sm truncate">{t.label}</p>
                            {(() => {
                              const asset = assets?.find(a => a.id.toString() === (t.linkedAssetId || t.fromId || t.toId)?.toString());
                              if (asset) {
                                return (
                                  <span className="flex items-center gap-1 text-[8px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-tight shrink-0">
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[asset.type] || '#cbd5e1' }} />
                                    {asset.name}
                                  </span>
                                );
                              }
                              return (
                                <div title="Vous n'avez pas défini de compte pour cette opération." className="flex items-center gap-1 text-red-500 cursor-help shrink-0">
                                  <AlertCircle size={14} />
                                  <span className="text-[9px] font-bold uppercase md:hidden">Aucun compte</span>
                                </div>
                              );
                            })()}
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] text-slate-500">{new Date(t.date).toLocaleDateString()}</p>
                            {new Date(t.date) > new Date() && (
                              <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-bold">Prév.</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-bold text-sm ${t.type === 'income' ? 'text-green-600' : t.type === 'transfer' ? 'text-blue-600' : 'text-slate-800'}`}>
                          {t.type === 'income' ? '+' : t.type === 'transfer' ? '' : '-'}{formatCurrency(t.amount)}
                        </p>
                        {t.category && <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">{t.category}</p>}
                      </div>
                    </div>
                  ))}

                  {/* Bouton Charger plus - Apparaît si il reste des transactions cachées */}
                  {allFilteredTransactions.length > visibleCount && (
                    <div className="py-4 flex justify-center">
                      <Button 
                        variant="secondary" 
                        onClick={() => setVisibleCount(prev => prev + 20)}
                        className="text-xs font-bold w-full sm:w-auto border-slate-200"
                      >
                        Charger plus d'opérations
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

// ... AssetsView, BudgetView, AiAdvisorView remain largely the same, skipped for brevity but would be here ...

const AssetsView = ({ assets, setAssets, transactions, onDeleteAsset }) => {
  // Ajoutez ceci au tout début :
  if (assets === null) {
    return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-600" /></div>;
  }
  const [newAsset, setNewAsset] = useState({ name: '', institution: '', value: '', type: 'liquidite' });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [assetToDelete, setAssetToDelete] = useState(null);
  const [focusedAssetId, setFocusedAssetId] = useState(null);

  const isCompositeType = (type) => type !== 'liquidite';

  const handleAdd = (e) => {
    e.preventDefault();
    // On vérifie que le nom est bien saisi
    if (!newAsset.name) return;

    const isComposite = isCompositeType(newAsset.type);
    const today = new Date().toISOString().split('T')[0];
    
    // Si c'est un compte Bourse/Investissement, on crée la poche Cash (Espèces)
    // Elle aura 'isCash: true' pour être identifiée par nos nouveaux KPI et filtres
    const initialPositions = isComposite ? [
      { 
        id: 'cash_pouch', 
        name: '💰 Espèces', 
        value: 0, 
        isCash: true, 
        history: [{ date: today, value: 0 }] 
      }
    ] : [];

    // La valeur initiale globale est 0 pour un PEA (car elle dépend des positions/cash)
    // Pour un Livret, on prend la valeur saisie dans le formulaire
    const initialValue = isComposite ? 0 : (parseFloat(newAsset.value) || 0);

    const newAssetObj = { 
      ...newAsset, 
      id: Date.now(), 
      value: initialValue, 
      positions: initialPositions,
      history: [{ date: today, value: initialValue }] 
    };

    // Mise à jour de l'état local et sauvegarde en base de données
    const updatedAssets = [...(assets || []), newAssetObj];
    setAssets(updatedAssets);
    
    // Réinitialisation du formulaire
    setNewAsset({ name: '', institution: '', value: '', type: 'liquidite' });
    setIsFormOpen(false);

    // Clôture le tutoriel du formulaire et lance celui de l'œil si c'est le premier compte
    window.dispatchEvent(new Event('close-tour'));
    if (!assets || assets.length === 0) {
      setTimeout(() => window.dispatchEvent(new Event('tour-asset-created')), 500);
    }
  };

  const handleDelete = (id) => {
    if (onDeleteAsset) {
      onDeleteAsset(id);
    } else {
      setAssets(assets.filter(a => a.id !== id));
    }
  };
  const handleUpdateAsset = (updatedAsset) => {
    // Si ce n'est pas un livret, on s'assure qu'il y a une poche espèces
    if (updatedAsset.type !== 'liquidite') {
      const hasCash = updatedAsset.positions?.some(p => p.isCash);
      if (!hasCash) {
        updatedAsset.positions = [
          { id: 'cash_pouch', name: '💰 Espèces non investies', value: 0, isCash: true, history: [] },
          ...(updatedAsset.positions || [])
        ];
      }
    }
    
    // NOUVEAU : Exclusivité du compte principal
    let newAssets = [...assets];
    if (updatedAsset.isPrimary) {
       newAssets = newAssets.map(a => ({ ...a, isPrimary: false }));
    }
    
    setAssets(newAssets.map(a => a.id === updatedAsset.id ? updatedAsset : a));
    setSelectedAsset(updatedAsset);
  };
  const groupedAssets = useMemo(() => { const groups = {}; assets.forEach(asset => { if (!groups[asset.type]) groups[asset.type] = []; groups[asset.type].push(asset); }); return groups; }, [assets]);

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-300 text-slate-900 pb-24 md:pb-8">
      <ConfirmationModal isOpen={!!assetToDelete} onClose={() => setAssetToDelete(null)} onConfirm={() => { handleDelete(assetToDelete); setAssetToDelete(null); }} message="Supprimer ce compte ?" />
      {selectedAsset && (<AssetDetailOverlay key={selectedAsset.id} asset={selectedAsset} onClose={() => setSelectedAsset(null)} onUpdate={handleUpdateAsset} transactions={transactions} />)}
      {(!assets || assets.length === 0) ? (<EmptyState title="Aucun actif" description="Ajoutez votre premier compte." actionLabel="Ajouter" onAction={() => { setIsFormOpen(true); window.dispatchEvent(new Event('close-tour')); setTimeout(() => window.dispatchEvent(new Event('tour-asset-form-open')), 500); }} icon={Wallet} actionClassName={!isFormOpen ? "tour-add-asset" : ""} />) : (<div className="flex justify-between items-center"><h2 className="text-2xl font-bold text-slate-800">Mes Actifs</h2><Button onClick={() => { setIsFormOpen(!isFormOpen); if(!isFormOpen) { window.dispatchEvent(new Event('close-tour')); setTimeout(() => window.dispatchEvent(new Event('tour-asset-form-open')), 500); } }} variant={isFormOpen ? "secondary" : "primary"} className={`${!isFormOpen ? 'tour-add-asset' : ''} transition-all duration-300 min-w-[120px]`}>{isFormOpen ? <><X size={20} /> Annuler</> : <><PlusCircle size={20} /> Ajouter</>}</Button></div>)}
      {isFormOpen && (
        <Card className="bg-blue-50 border-blue-100 animate-in slide-in-from-top-4 fade-in duration-300 origin-top">
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end"><div className="lg:col-span-1"><label className="block text-xs font-semibold text-slate-600 mb-1">Type</label><select className="tour-asset-form-type w-full p-2 rounded-lg border border-slate-300" value={newAsset.type} onChange={(e) => setNewAsset({...newAsset, type: e.target.value})}>{Object.keys(CATEGORY_LABELS).map(key => (<option key={key} value={key}>{CATEGORY_LABELS[key]}</option>))}</select></div><div className="lg:col-span-1"><label className="block text-xs font-semibold text-slate-600 mb-1">Nom</label><input type="text" autoFocus className="w-full p-2 rounded-lg border border-slate-300" value={newAsset.name} onChange={(e) => setNewAsset({...newAsset, name: e.target.value})} /></div><div className="lg:col-span-1"><label className="block text-xs font-semibold text-slate-600 mb-1">Banque</label><input type="text" className="w-full p-2 rounded-lg border border-slate-300" value={newAsset.institution} onChange={(e) => setNewAsset({...newAsset, institution: e.target.value})} /></div>{isCompositeType(newAsset.type) ? <div className="lg:col-span-1 pb-2 text-center text-xs text-slate-500 italic">Valeur auto</div> : <div className="lg:col-span-1"><label className="block text-xs font-semibold text-slate-600 mb-1">Valeur</label><input type="number" className="w-full p-2 rounded-lg border border-slate-300" value={newAsset.value} onChange={(e) => setNewAsset({...newAsset, value: e.target.value})} /></div>}<Button type="submit" className="tour-asset-form-submit w-full">Ajouter</Button></form>
        </Card>
      )}
      <div className="grid gap-6">{Object.keys(groupedAssets).map(type => (<Card key={type} className="overflow-hidden border-slate-200 p-0 md:p-0"><div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center"><h3 className="font-bold text-slate-700 flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[type] }}></span>{CATEGORY_LABELS[type]}</h3><span className="font-bold text-slate-900">{formatCurrency(groupedAssets[type].reduce((sum, a) => sum + a.value, 0))}</span></div><div className="divide-y divide-slate-100">{groupedAssets[type].map(asset => (
        <div 
              key={asset.id} 
              className="p-5 md:p-4 flex justify-between items-center hover:bg-slate-50 transition group border-b border-slate-50 last:border-0 cursor-pointer"
              onClick={() => setFocusedAssetId(focusedAssetId === asset.id ? null : asset.id)}
            >
              <div className="flex items-center gap-4 overflow-hidden min-w-0">
                <div className="bg-slate-100 p-2 rounded-lg text-slate-500 flex-shrink-0">
                  {(() => {
                    const IconComponent = (ASSET_ICON_OPTIONS[asset.icon] || ASSET_ICON_OPTIONS['building']).icon;
                    return <IconComponent size={20} />;
                  })()}
                </div>
                <div className="min-w-0 truncate">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p className="font-semibold text-slate-800 truncate">{asset.name}</p>
                    {asset.isPrimary && (
                      <div className="text-amber-400 shrink-0" title="Compte principal">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 truncate">{asset.institution}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0"><span className="font-bold text-slate-700">{formatCurrency(asset.value)}</span>
              <div className={`tour-asset-row-actions ${focusedAssetId === asset.id ? 'flex' : 'hidden md:group-hover:flex'} gap-1 transition-all`}>
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setSelectedAsset(asset); 
                    window.dispatchEvent(new CustomEvent('tour-asset-detail', { detail: { isComposite: isCompositeType(asset.type) } })); 
                    window.dispatchEvent(new Event('close-tour'));
                  }} 
                  className="tour-asset-eye bg-blue-50 text-blue-600 p-2 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Eye size={18} />
                </button>
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setAssetToDelete(asset.id); 
                  }} 
                  className="bg-red-50 text-red-600 p-2 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div></div>
            </div>
      ))}</div></Card>))}</div>
    </div>
  );
};

const BudgetView = ({ transactions, assets, onAddTransaction, onDeleteTransaction, onUpdateTransaction }) => {
  if (transactions === null || assets === null) {
    return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-600" /></div>;
  }

  const [filterMonth, setFilterMonth] = useState(null);
  const [filterCategory, setFilterCategory] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(20);
  const [txViewMode, setTxViewMode] = useState('list'); // État ajouté ici

  const allFilteredTransactions = useMemo(() => {
    let result = [...(transactions || [])];
    if (filterMonth) result = result.filter(t => t.date.startsWith(filterMonth));
    if (filterCategory) result = result.filter(t => t.category === filterCategory);
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t => 
        t.label.toLowerCase().includes(query) || 
        t.date.includes(query)
      );
    }
    result.sort((a, b) => b.date.localeCompare(a.date));
    return result;
  }, [transactions, filterMonth, filterCategory, searchQuery]);

  const displayTransactions = useMemo(() => {
    return allFilteredTransactions.slice(0, visibleCount);
  }, [allFilteredTransactions, visibleCount]);

  useEffect(() => { setVisibleCount(20); }, [filterMonth, filterCategory, searchQuery]);

  const [newTrans, setNewTrans] = useState({ date: new Date().toISOString().split('T')[0], label: '', amount: '', type: 'expense', category: 'Autre' });
  const [selectedAccount, setSelectedAccount] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [aiInput, setAiInput] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [editId, setEditId] = useState(null);
  const [timeRange, setTimeRange] = useState('6M');
  const [focusedTxId, setFocusedTxId] = useState(null);

  const cashflowHistoryData = useMemo(() => processFlowData(timeRange, transactions), [timeRange, transactions]);
  
  const selectableAccounts = useMemo(() => 
    assets ? assets.filter(a => ['liquidite', 'investissement', 'epargne_salariale', 'crypto'].includes(a.type)) : [], 
    [assets]
  );
  const hasFlowData = useMemo(() => cashflowHistoryData.some(d => d.revenus > 0 || d.depenses > 0), [cashflowHistoryData]);

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newTrans.label || !newTrans.amount) return;
    
    const finalDate = newTrans.date ? newTrans.date : new Date().toISOString().split('T')[0];

    const transaction = { 
      ...newTrans, 
      date: finalDate, 
      id: editId || Date.now(), 
      amount: parseFloat(newTrans.amount) 
    };

    if (newTrans.type === 'transfer') {
      transaction.fromId = selectedAccount;
      transaction.toId = transferTo;
      if (!transaction.fromId || !transaction.toId || transaction.fromId === transaction.toId) return;
    } else {
      transaction.linkedAssetId = selectedAccount;
    }

    if (editId) {
        onUpdateTransaction(transaction);
        setEditId(null);
    } else {
        onAddTransaction(transaction, selectedAccount);
    }
    
    setNewTrans({ date: new Date().toISOString().split('T')[0], label: '', amount: '', type: 'expense', category: 'Autre' });
    setSelectedAccount('');
    setTransferTo('');
  };

  const startEdit = (t) => {
      setEditId(t.id);
      setNewTrans({ date: t.date, label: t.label, amount: t.amount, type: t.type, category: t.category });
      if (t.type === 'transfer') {
          setSelectedAccount(t.fromId || '');
          setTransferTo(t.toId || '');
      } else {
          setSelectedAccount(t.linkedAssetId || '');
          setTransferTo('');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
      setEditId(null);
      setNewTrans({ date: new Date().toISOString().split('T')[0], label: '', amount: '', type: 'expense', category: 'Autre' });
      setSelectedAccount('');
      setTransferTo('');
  };

  const handleAiParse = async () => {
    if (!aiInput) return;
    setIsAiProcessing(true);
    const accountNames = selectableAccounts.map(a => a.name).join(', ');
    
    // NOUVEAU : Identification du compte principal
    const primaryAccount = selectableAccounts.find(a => a.isPrimary);
    const primaryAccountInfo = primaryAccount ? `\n    - Compte principal par défaut : "${primaryAccount.name}". Si l'utilisateur ne précise AUCUN compte dans sa phrase, tu DOIS obligatoirement renvoyer "accountName": "${primaryAccount.name}".` : '';

    const userPrompt = `CONTEXTE :
    - Comptes disponibles : ${accountNames}.${primaryAccountInfo}
    - Catégories autorisées : ${Object.keys(EXPENSE_CATEGORIES).join(', ')}.
    - Date d'aujourd'hui : ${new Date().toLocaleDateString('fr-FR')}.
    - Analyse l'entrée utilisateur suivante : "${aiInput}"

    RÈGLES CRITIQUES DE NETTOYAGE :
    1. CALCUL DU MONTANT : Si l'utilisateur donne un calcul (ex: 5+8), effectue TOUJOURS l'opération et renvoie le résultat final (ex: 13) dans "amount".
    2. LIBELLÉ PROPRE : Tu dois impérativement RETIRER du "label" les montants, les devises (€, euros) et les opérations mathématiques (ex: retire "5+8" ou "13e" du nom). Le champ "label" doit contenir le nom du marchand ou la description ce qui correspond à TOUT CE QUI N'EST PAS considéré comme un montant, une devise ou une opération mathématique. Mets la première lettre du libellé en majuscule même si l'utilisateur renseigne tout en minuscule.

    GUIDE DE CLASSIFICATION :
    - Alimentation : Supermarchés, restaurants, UberEats.
    - Logement : Loyer, charges, électricité, Leroy Merlin.
    - Transport : Essence, SNCF, Uber, parking.
    - Loisirs : Cinéma, Netflix, Spotify, sorties.
    - Santé : Pharmacie, médecin.
    - Shopping : Amazon, vêtements, high-tech.
    - Services : Téléphone, assurance, frais bancaires.

    INSTRUCTIONS DE SORTIE (JSON UNIQUEMENT) :
    - "label" : Nom nettoyé (sans prix/calcul).
    - "date" : YYYY-MM-DD.
    - "amount" : Résultat mathématique final (nombre pur).
    - "type" : 'expense', 'income' ou 'transfer'.
    - "category" : Selon le guide ci-dessus.
    - Si type='transfer' : extrais "accountFrom" et "accountTo".
    - Si type='expense' ou 'income' : extrais "accountName" (utilise le compte par défaut si applicable).

    Réponds uniquement avec le JSON.
  `;
    try {
      const resultText = await callGeminiAPI("Extraction transaction JSON.", [], userPrompt);
      
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        alert("L'assistant n'a pas pu créer la transaction. Message : " + resultText);
        setIsAiProcessing(false);
        return;
      }

      const data = JSON.parse(jsonMatch[0]);
      setNewTrans({ 
        date: data.date || new Date().toISOString().split('T')[0], 
        label: data.label || '', 
        amount: data.amount || '', 
        type: data.type || 'expense', 
        category: data.category || 'Autre' 
      });
      
      if (data.type === 'transfer') {
        if (data.accountFrom) {
          const foundFrom = selectableAccounts.find(a => a.name.toLowerCase() === data.accountFrom.toLowerCase());
          if (foundFrom) setSelectedAccount(foundFrom.id);
        }
        if (data.accountTo) {
          const foundTo = selectableAccounts.find(a => a.name.toLowerCase() === data.accountTo.toLowerCase());
          if (foundTo) setTransferTo(foundTo.id);
        }
      } else {
        if (data.accountName) {
          const found = selectableAccounts.find(a => a.name.toLowerCase() === data.accountName.toLowerCase());
          if (found) setSelectedAccount(found.id);
        } else if (primaryAccount) {
          // Sécurité supplémentaire : Si l'IA n'a rien renvoyé, l'application force le compte principal
          setSelectedAccount(primaryAccount.id);
        }
      }
      setAiInput('');
    } catch (e) { alert("Erreur IA: " + e.message); } finally { setIsAiProcessing(false); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-right duration-300 text-slate-900 pb-24 md:pb-8">
      <div className="lg:col-span-1 space-y-6">
        <Card className="tour-ai-input bg-slate-50/50 border-indigo-200"><h3 className="font-bold text-indigo-900 mb-2 flex items-center gap-2"><Sparkles size={18} className="text-indigo-600" /> Saisie Rapide IA</h3><p className="text-xs text-indigo-700 mb-3">Ex: "Virement de 100€ du Livret A vers Compte Courant hier" ou "McDo 15€"</p><div className="flex gap-2"><input type="text" className="flex-1 p-2 text-sm rounded-lg border border-indigo-200" value={aiInput} onChange={(e) => setAiInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAiParse()} /><button onClick={handleAiParse} disabled={isAiProcessing || !aiInput} className="bg-indigo-600 text-white p-2 rounded-lg">{isAiProcessing ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}</button></div></Card>
        <Card className="tour-budget-manual-form sticky top-6 bg-slate-50/50 border-slate-200"><h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">{editId ? <Edit size={20} className="text-blue-600"/> : <PlusCircle size={20} />} {editId ? "Modifier l'opération" : "Nouvelle Opération"}</h3><form onSubmit={handleAdd} className="space-y-4"><div><label className="block text-xs font-semibold text-slate-600 mb-1">Type</label><div className="grid grid-cols-3 gap-2"><button type="button" onClick={() => setNewTrans({...newTrans, type: 'expense'})} className={`py-2 rounded-lg text-xs font-medium ${newTrans.type === 'expense' ? 'bg-red-100 text-red-700' : 'bg-white border border-slate-200'}`}>Dépense</button><button type="button" onClick={() => setNewTrans({...newTrans, type: 'income'})} className={`py-2 rounded-lg text-xs font-medium ${newTrans.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-white border border-slate-200'}`}>Revenu</button><button type="button" onClick={() => setNewTrans({...newTrans, type: 'transfer'})} className={`py-2 rounded-lg text-xs font-medium ${newTrans.type === 'transfer' ? 'bg-blue-100 text-blue-700' : 'bg-white border border-slate-200'}`}>Virement</button></div></div>
        
        <div><label className="block text-xs font-semibold text-slate-600 mb-1">{newTrans.type === 'transfer' ? "Compte Débité (Source)" : "Compte (Optionnel)"}</label><select className="w-full p-2 rounded-lg border border-slate-300" value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)}><option value="">-- Aucun --</option>{selectableAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
        
        {newTrans.type === 'transfer' && (
          <div><label className="block text-xs font-semibold text-slate-600 mb-1">Compte Crédité (Destination)</label><select className="w-full p-2 rounded-lg border border-slate-300" value={transferTo} onChange={(e) => setTransferTo(e.target.value)}><option value="">-- Aucun --</option>{selectableAccounts.filter(a => a.id != selectedAccount).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
        )}
        
        <div><label className="block text-xs font-semibold text-slate-600 mb-1">Montant</label><input type="number" className="w-full p-2 rounded-lg border border-slate-300" value={newTrans.amount} onChange={(e) => setNewTrans({...newTrans, amount: e.target.value})} /></div><div><label className="block text-xs font-semibold text-slate-600 mb-1">Libellé</label><input type="text" className="w-full p-2 rounded-lg border border-slate-300" value={newTrans.label} onChange={(e) => setNewTrans({...newTrans, label: e.target.value})} /></div>
        
        {/* CATEGORY SELECTOR FOR EXPENSES */}
        {newTrans.type === 'expense' && (
            <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Catégorie</label>
                <select 
                    className="w-full p-2 rounded-lg border border-slate-300" 
                    value={newTrans.category || 'Autre'} 
                    onChange={(e) => setNewTrans({...newTrans, category: e.target.value})}
                >
                    {Object.keys(EXPENSE_CATEGORIES).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
            </div>
        )}
        
        <div><label className="block text-xs font-semibold text-slate-600 mb-1">Date</label><input type="date" className="w-full p-2 rounded-lg border border-slate-300" value={newTrans.date} onChange={(e) => setNewTrans({...newTrans, date: e.target.value})} /></div>
        <div className="flex gap-2">
            {editId && <Button type="button" variant="secondary" className="flex-1" onClick={cancelEdit}>Annuler</Button>}
            <Button className="flex-1" type="submit">{editId ? "Modifier" : "Enregistrer"}</Button>
        </div>
        </form></Card>
      </div>
      <div className="lg:col-span-2 space-y-6">
        <ConfirmationModal isOpen={!!transactionToDelete} onClose={() => setTransactionToDelete(null)} onConfirm={() => { onDeleteTransaction(transactionToDelete); setTransactionToDelete(null); }} message="Supprimer cette opération ?" />
        
        <Card className="tour-budget-chart relative border-slate-200">
          <div className="mb-6">
            {/* En-tête : Empilé sur mobile, aligné sur desktop */}
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><ArrowRightLeft size={20} className="text-purple-600"/> Revenus & Dépenses</h3>
            <div className="flex items-start gap-2 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
              <div className="bg-blue-100 p-1.5 rounded-full text-blue-600 shrink-0 mt-0.5">
                <Info size={9} />
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Cliquez sur les barres de <strong className="text-slate-900">dépenses</strong> pour voir le détail par catégorie.
              </p>
            </div>
          </div>
             <InteractiveBudgetChart 
                cashflowData={cashflowHistoryData} 
                transactions={transactions} 
                hasFlowData={hasFlowData}
                onMonthSelect={setFilterMonth}      // Connexion au filtre de mois
                onCategorySelect={setFilterCategory} // Connexion au filtre de catégorie
            />
        </Card>

        <Card className="tour-budget-list flex flex-col relative border-slate-300">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 shrink-0">
            <div className="flex items-center gap-2 flex-1">
              <List size={20} className="text-blue-600 shrink-0"/> 
              <span className="leading-tight text-lg font-bold text-slate-800">Dernières Opérations</span>
              {(filterMonth || filterCategory || searchQuery) && (
                <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md border border-indigo-100">
                  Filtré
                </span>
              )}
              
              <div className="ml-auto flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button 
                  onClick={() => setTxViewMode('list')} 
                  className={`p-1.5 rounded-md transition-all flex items-center justify-center ${txViewMode === 'list' ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'}`}
                  title="Vue Liste"
                >
                  <List size={14} />
                </button>
                <button 
                  onClick={() => { setTxViewMode('calendar'); window.dispatchEvent(new Event('close-tour')); }} 
                  className={`tour-calendar-btn p-1.5 rounded-md transition-all flex items-center justify-center ${txViewMode === 'calendar' ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'}`}
                  title="Vue Calendrier"
                >
                  <CalendarDays size={14} />
                </button>
              </div>

              {/* Bouton Loupe */}
              <button 
                onClick={() => { setIsSearchOpen(!isSearchOpen); if(isSearchOpen) setSearchQuery(''); }}
                className={`ml-2 p-1.5 rounded-lg transition-all border ${isSearchOpen ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-blue-600'}`}
              >
                <Search size={16} />
              </button>
            </div>
          </div>

          {/* Zone de recherche conditionnelle */}
          {isSearchOpen && (
            <div className="mb-6 animate-in slide-in-from-top duration-200 px-1">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Rechercher par nom ou date YYYY-MM-DD..."
                  className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-slate-200 hover:bg-slate-300 rounded-full p-0.5 transition-colors">
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          )}
          
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
            {txViewMode === 'calendar' ? (
              <TransactionCalendar 
                transactions={allFilteredTransactions} 
                filterMonth={filterMonth} 
                onDayClick={(dateStr) => {
                  setSearchQuery(dateStr);
                  setIsSearchOpen(true);
                  setTxViewMode('list');
                }}
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {displayTransactions.length === 0 ? (
              <div className="p-10 text-center text-slate-400 italic">
                Aucune transaction pour les filtres sélectionnés.
              </div>
            ) : (
              <>
                {displayTransactions.map(t => (
                  <div 
                    key={t.id} 
                    className={`p-4 md:p-3 flex items-center justify-between hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 cursor-pointer group ${editId === t.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''}`}
                    onClick={() => setFocusedTxId(focusedTxId === t.id ? null : t.id)}
                  >
                    <div className="flex items-center gap-3 overflow-hidden min-w-0">
                      <div className={`p-2 rounded-full flex-shrink-0 ${t.type === 'income' ? 'bg-green-100 text-green-600' : t.type === 'transfer' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                        {t.type === 'income' ? <ArrowUpRight size={14} /> : t.type === 'transfer' ? <ArrowRight size={14} /> : <ArrowDownRight size={14} />}
                      </div>
                      <div className="min-w-0 truncate">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="font-bold text-slate-800 text-sm truncate">{t.label}</p>
                        {(() => {
                          const asset = assets?.find(a => a.id.toString() === (t.linkedAssetId || t.fromId || t.toId)?.toString());
                          if (asset) {
                            return (
                              <span className="flex items-center gap-1 text-[8px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-tight shrink-0">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[asset.type] || '#cbd5e1' }} />
                                {asset.name}
                              </span>
                            );
                          }
                          return (
                            <div title="Vous n'avez pas défini de compte pour cette opération" className="flex items-center gap-1 text-red-500 cursor-help shrink-0" >
                              <AlertCircle size={14} />
                              <span className="text-[9px] font-bold uppercase md:hidden">Aucun compte</span>
                            </div>
                          );
                        })()}
                      </div>
                      <div className="flex gap-2 items-center">
                        <p className="text-[10px] text-slate-500">{new Date(t.date).toLocaleDateString()}</p>
                        {new Date(t.date) > new Date() && (
                          <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-bold">Prév.</span>
                        )}
                      </div>
                    </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right flex flex-col items-end">
                        <p className={`font-bold text-sm ${t.type === 'income' ? 'text-green-600' : t.type === 'transfer' ? 'text-blue-600' : 'text-slate-800'}`}>
                          {t.type === 'income' ? '+' : t.type === 'transfer' ? '' : '-'}{formatCurrency(t.amount)}
                        </p>
                        {t.category && <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">{t.category}</p>}
                      </div>
                      <div className={`${focusedTxId === t.id ? 'flex' : 'hidden md:group-hover:flex'} gap-1 transition-all`}>
                        <button onClick={(e) => { e.stopPropagation(); startEdit(t); }} className="p-1 text-slate-400 hover:text-blue-600 transition-colors"><Edit size={16} /></button>
                        <button onClick={(e) => { e.stopPropagation(); setTransactionToDelete(t.id); }} className="p-1 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  </div>
                ))}

                {allFilteredTransactions.length > visibleCount && (
                  <div className="py-6 flex justify-center">
                    <Button 
                      variant="secondary" 
                      onClick={() => setVisibleCount(prev => prev + 20)}
                      className="text-xs font-bold w-full border-slate-200"
                    >
                      Charger plus d'opérations
                    </Button>
                  </div>
                )}
              </>
            )}
            </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

const AiAdvisorView = ({ assets, transactions, userProfile, messages, setMessages }) => {
  if (assets === null || transactions === null) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-600" /></div>;
  
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async (customPrompt = null, label = null) => {
    const userMessage = customPrompt || input;
    if (!userMessage.trim() && !selectedImage) return;

    const displayMessage = label || userMessage;
    const newMessages = [...messages, { role: 'user', content: displayMessage, image: selectedImage }];
    
    setMessages(newMessages); 
    setInput(''); 
    const currentImage = selectedImage;
    setSelectedImage(null);
    setIsLoading(true);

    // SYNTHÈSE PATRIMONIALE DÉTAILLÉE (Connaissance des supports & KPIs)
    const totalPatrimoine = assets.reduce((acc, item) => acc + item.value, 0);
    const liquidites = assets.filter(a => a.type === 'liquidite').reduce((acc, a) => acc + a.value, 0);
    const investissements = assets.filter(a => ['investissement', 'crypto', 'immobilier', 'epargne_salariale'].includes(a.type)).reduce((acc, a) => acc + a.value, 0);

    const age = userProfile?.birthDate ? (new Date().getFullYear() - new Date(userProfile.birthDate).getFullYear()) : 'Non précisé';
    const revenuMensuel = userProfile?.monthlyIncome ? formatCurrency(Number(userProfile.monthlyIncome)) : 'Non précisé';
    
    const detailActifs = assets.map(a => {
      let line = `- ${a.name}: ${formatCurrency(a.value)} (${CATEGORY_LABELS[a.type]})`;
      
      // Calcul des plus-values et PRU pour les comptes d'investissement
      if (a.positions && a.positions.length > 0) {
        const supports = a.positions.filter(p => !p.isCash);
        const totalInvestiActif = supports.reduce((sum, p) => sum + (p.totalInvested || 0), 0);
        const valeurSupportsActif = supports.reduce((sum, p) => sum + p.value, 0);
        const pvActif = valeurSupportsActif - totalInvestiActif;
        const pvPctActif = totalInvestiActif > 0 ? (pvActif / totalInvestiActif) * 100 : 0;
        
        if (totalInvestiActif > 0) {
           line += ` | Total investi: ${formatCurrency(totalInvestiActif)} | Plus-value latente: ${pvActif >= 0 ? '+' : ''}${formatCurrency(pvActif)} (${pvPctActif.toFixed(2)}%)`;
        }

        const posDetail = a.positions
          .filter(p => p.value > 0 || p.totalInvested > 0)
          .map(p => {
            if (p.isCash) return `  └─ ${p.name}: ${formatCurrency(p.value)}`;
            const pv = p.value - (p.totalInvested || 0);
            const pct = p.totalInvested > 0 ? (pv / p.totalInvested) * 100 : 0;
            return `  └─ ${p.name}: ${formatCurrency(p.value)} (PRU: ${formatCurrency(p.totalInvested || 0)} | PV: ${pv >= 0 ? '+' : ''}${pv.toFixed(2)}€ / ${pv >= 0 ? '+' : ''}${pct.toFixed(2)}%)`;
          })
          .join('\n');
        if (posDetail) line += `\n${posDetail}`;
      }
      return line;
    }).join('\n');

    const fluxRecents = transactions.slice(0, 15).map(t => `- ${t.date}: ${t.label} (${t.amount}€) [Catégorie: ${t.category || t.type}]`).join('\n');

    // NOUVEAU : Extraction des 10 derniers mouvements internes (Achats/Ventes sur supports)
    const allInternalMovements = [];
    assets.forEach(a => {
      (a.positions || []).forEach(p => {
        if (!p.isCash && p.history) {
          p.history.forEach(h => {
            if (h.movementTag === 'buy' || h.movementTag === 'sell') {
               allInternalMovements.push({
                 id: h.id || 0,
                 date: h.date,
                 assetName: a.name,
                 posName: p.name,
                 type: h.movementTag,
                 amount: h.movementAmount || 0
               });
            }
          });
        }
      });
    });
    
    // Tri par date décroissante puis par ID pour avoir l'ordre chronologique exact
    allInternalMovements.sort((a, b) => {
      const dateDiff = new Date(b.date) - new Date(a.date);
      if (dateDiff === 0 && b.id && a.id) return b.id - a.id;
      return dateDiff;
    });

    const mouvementsInternesRecents = allInternalMovements.slice(0, 10).map(m => 
      `- ${m.date} : ${m.type === 'buy' ? 'ACHAT' : 'VENTE'} de ${m.amount}€ sur ${m.posName} (Compte: ${m.assetName})`
    ).join('\n');

    const systemPrompt = `
      Tu es l'Expert en Stratégie Patrimoniale de MyWealth.io.
      
      CONTEXTE FINANCIER GLOBAL :
      - Patrimoine Net : ${formatCurrency(totalPatrimoine)}
      - Liquidités (Sécurité) : ${formatCurrency(liquidites)}
      - Actifs Investis (Croissance) : ${formatCurrency(investissements)}
      - Profil Utilisateur : ${userProfile?.firstName}, ${age} ans. Revenu Mensuel : ${revenuMensuel}.
      - Risque : ${userProfile?.riskProfile || 'Equilibré'} (Objectif: ${userProfile?.financialGoal || 'Indépendance'})
      
      DÉTAIL DES ACTIFS ET SUPPORTS (avec Plus-values latentes) : 
      ${detailActifs}
      
      FLUX RÉCENTS (Dépenses/Revenus) :
      ${fluxRecents}

      RÈGLES D'OR :
      1. RÉPONSE CIBLÉE : Si l'utilisateur pose une question sur un support spécifique, n'analyse QUE ce support. Ne lance pas de recherches globales inutiles.
      2. CONSEIL STRATÉGIQUE : Utilise les données fournies (Plus-values, PRU, répartition Cash/Investi) pour donner des conseils précis (ex: "Ton ETF S&P500 est à +15%").
      3. RECHERCHE WEB SUR MESURE : Tu AS ACCÈS à Google. Utilise-le silencieusement pour vérifier les cours ou l'actualité macro-économique SEULEMENT si la question de l'utilisateur le nécessite.
      4. GESTION DES SALUTATIONS & HORS-SUJET : Si l'utilisateur envoie un simple "Salut", "Ça va ?" ou un message sans contexte, réponds brièvement avec le sourire. Liste-lui ensuite rapidement ce que tu peux faire pour lui (bilan patrimonial, analyse de dépenses, optimisation d'arbitrage, lecture de documents) et demande-lui comment tu peux l'aider aujourd'hui.
      5. STYLE DIRECT & IMAGE : Va droit au but, sois jovial et professionnel. Ne redis pas "Bonjour" ou autre tournure du même genre si tu l'as déjà dit précédement. Si une image est jointe, compare-la au contexte patrimonial. Termine TOUJOURS par une question ouverte pour creuser la stratégie de l'utilisateur si pertinentre ou simplement lancer l'échange.

      FORMATTAGE :
      - ## pour les titres.
      - - pour les listes.
      - <b>texte</b> pour mettre en gras les chiffres clés ou tickers.
      - JAMAIS de symboles * ou # standards.
    `;

    try {
        // On ajoute ton excellente règle dynamiquement au prompt système existant
        const finalSystemPrompt = systemPrompt + "\n6. CONTINUITÉ : Ne redis pas 'Bonjour' ou de formules de politesse similaires si tu l'as déjà dit dans l'historique. Garde un ton naturel et direct dans la continuité de l'échange.";
        
        // On passe 'messages' (l'historique actuel AVANT le nouveau message) à l'API
        const aiResponse = await callGeminiAPI(finalSystemPrompt, messages, userMessage, currentImage);
        
        setMessages([...newMessages, { role: 'assistant', content: aiResponse }]);
    } catch (e) { 
        setMessages([...newMessages, { role: 'assistant', content: "Erreur technique. Vérifiez votre connexion." }]); 
    }
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-3 lg:gap-6 h-[calc(100vh-190px)] md:h-[calc(100vh-140px)] animate-in fade-in w-full">
      {/* Sidebar - Actions Rapides (Scroll horizontal sur mobile) */}
      <div className="w-full lg:w-1/4 flex-shrink-0 flex flex-col gap-4">
        <div className="tour-ai-flash bg-indigo-50 border border-indigo-100 p-3 md:p-4 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-2 md:mb-4 text-indigo-800 font-bold">
            <Sparkles size={16} md:size={18} />
            <span className="text-sm md:text-base">Analyses Flash</span>
          </div>
          
          <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
            <button onClick={() => handleSend("Fais un bilan de santé global de mon patrimoine.", "📊 Bilan de santé global")} 
                    className="flex-shrink-0 lg:w-full text-left p-2.5 md:p-3 rounded-xl bg-white text-xs font-semibold text-slate-700 hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-indigo-100 flex items-center gap-2">
              <Activity size={14} /> Bilan de santé
            </button>

            <button onClick={() => handleSend("Analyse mes dépenses récentes et identifie des économies possibles.", "💸 Analyse des dépenses")} 
                    className="flex-shrink-0 lg:w-full text-left p-2.5 md:p-3 rounded-xl bg-white text-xs font-semibold text-slate-700 hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-indigo-100 flex items-center gap-2">
              <ArrowDownRight size={14} /> Analyse dépenses
            </button>

            <button onClick={() => handleSend("Calcule si mon épargne de précaution (liquidités) couvre au moins 4 mois de mes dépenses moyennes.", "🛡️ Sécurité & Précaution")} 
                    className="flex-shrink-0 lg:w-full text-left p-2.5 md:p-3 rounded-xl bg-white text-xs font-semibold text-slate-700 hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-indigo-100 flex items-center gap-2">
              <ShieldCheck size={14} /> Épargne de précaution
            </button>

            <button onClick={() => handleSend("En fonction de mon profil de risque, suggère une meilleure répartition de mon patrimoine.", "📈 Optimiser l'allocation")} 
                    className="flex-shrink-0 lg:w-full text-left p-2.5 md:p-3 rounded-xl bg-white text-xs font-semibold text-slate-700 hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-indigo-100 flex items-center gap-2">
              <Scale size={14} /> Arbitrage & Risque
            </button>

            <button onClick={() => handleSend("Estime ma capacité d'apport pour un projet immobilier sans vider mes comptes d'investissement.", "🏠 Projet Immobilier")} 
                    className="flex-shrink-0 lg:w-full text-left p-2.5 md:p-3 rounded-xl bg-white text-xs font-semibold text-slate-700 hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-indigo-100 flex items-center gap-2">
              <Home size={14} /> Capacité Immobilière
            </button>
          </div>
        </div>

        <div className="hidden lg:block p-4 bg-blue-50 rounded-xl border border-blue-100">
           <p className="text-[10px] text-blue-700 font-bold uppercase mb-1">Status API</p>
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-xs text-blue-900 font-medium">Assistant prêt à l'emploi</span>
           </div>
        </div>
      </div>

      {/* Zone de Chat */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-bold text-slate-700 flex items-center gap-2"><Bot size={20} className="text-indigo-600"/> Conseiller MyWealth</h3>
          <span className="text-[10px] bg-slate-200 px-2 py-1 rounded-full text-slate-600 font-bold">MODE EXPERT</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30" ref={scrollRef}>
          {messages.map((msg, idx) => (<MessageBubble key={idx} message={msg} />))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-indigo-600" />
                <span className="text-sm text-slate-500 italic">Analyse en cours...</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-white border-t border-slate-100">
          {selectedImage && (
            <div className="mb-2 relative inline-block">
              {selectedImage.startsWith('data:application/pdf') ? (
                <div className="h-20 w-20 flex flex-col items-center justify-center bg-blue-50 border border-blue-200 rounded-lg text-blue-600">
                  <Cloud size={24} />
                  <span className="text-[10px] font-bold mt-1">PDF</span>
                </div>
              ) : (
                <img src={selectedImage} alt="Preview" className="h-20 w-20 object-cover rounded-lg border border-slate-200" />
              )}
              <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm"><X size={12}/></button>
            </div>
          )}
          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center gap-2 w-full">
            <input 
              type="file" 
              accept="image/*,application/pdf" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleImageChange} 
            />
            <button 
              type="button" 
              onClick={() => fileInputRef.current.click()}
              className="tour-ai-upload shrink-0 p-3 text-slate-500 hover:text-indigo-600 bg-slate-50 rounded-xl border border-slate-200 transition-all"
            >
              <Cloud size={20} />
            </button>
            <input 
              type="text" 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              placeholder="Posez une question..."
              className="tour-ai-chat-input flex-1 min-w-0 p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm md:text-base"
              disabled={isLoading} 
            />
            <Button variant="magic" disabled={isLoading || (!input.trim() && !selectedImage)} type="submit" className="shrink-0 px-3 py-3 md:px-4 flex items-center justify-center">
              <Send size={18} />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

// --- AUTHENTICATION COMPONENTS ---

const LoginScreen = ({ onLogin, onEmailLogin, onEmailRegister, onGoogleLogin, onForgotPassword }) => {
  const [view, setView] = useState('login'); // 'login', 'register', 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  
  // Nouveaux champs pour inscription
  const [birthDate, setBirthDate] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [financialGoal, setFinancialGoal] = useState('freedom');
  const [riskProfile, setRiskProfile] = useState('balanced');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetEmail, setResetEmail] = useState('');

  const handleGoogleClick = async () => {
    setError('');
    setSuccess('');
    try {
      await onGoogleLogin();
    } catch (e) {
      console.error("Erreur Google Auth:", e);
      let msg = e.message;
      if (msg.includes('auth/popup-closed-by-user')) {
        msg = "La fenêtre de connexion a été fermée.";
      } else if (msg.includes('auth/unauthorized-domain')) {
        msg = "DOMAINE NON AUTORISÉ : Ajoutez ce domaine dans la Console Firebase > Authentication > Settings > Authorized domains.";
      } else if (msg.includes('auth/popup-blocked')) {
        msg = "Pop-up bloquée par le navigateur. Veuillez l'autoriser.";
      } else if (msg.includes('auth/cancelled-popup-request')) {
        msg = "Trop de pop-ups. Réessayez.";
      }
      setError(msg);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); 
    setError('');
    setSuccess('');
    
    try {
      if (view === 'register') {
        if (!firstName || !lastName) {
          setError("Nom et Prénom requis");
          return;
        }
          // Validation de la complexité du mot de passe
          const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;
          if (!passwordRegex.test(password)) {
            setError("Le mot de passe doit contenir au moins 8 caractères, incluant des lettres et des chiffres.");
            return;
          }
        await onEmailRegister(email, password, { 
            firstName, 
            lastName,
            birthDate,
            monthlyIncome,
            financialGoal,
            riskProfile
        });
      } else if (view === 'login') {
        await onEmailLogin(email, password);
      } else if (view === 'forgot') {
        await onForgotPassword(resetEmail);
        setSuccess("Email de réinitialisation envoyé ! Vérifiez vos spams.");
      }
    } catch (e) {
      let msg = e.message;
      if (msg.includes('auth/invalid-email')) msg = "Email invalide.";
      // Message d'erreur générique pour contrer l'énumération d'utilisateurs
      else if (msg.includes('auth/user-not-found') || msg.includes('auth/wrong-password') || msg.includes('auth/invalid-credential')) {
        msg = "Identifiants incorrects.";
      }
      else if (msg.includes('auth/email-already-in-use')) msg = "Cet email est déjà utilisé.";
      else if (msg.includes('auth/weak-password')) msg = "Le mot de passe doit faire au moins 6 caractères.";
      // Gestion explicite de la protection anti brute-force de Firebase
      else if (msg.includes('auth/too-many-requests')) msg = "Trop de tentatives échouées. Veuillez réessayer plus tard.";
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans text-slate-900">
      <Card className="w-full max-w-lg p-8 shadow-xl border-0">
        <div className="text-center mb-8">
          <div className="inline-flex p-4 bg-blue-100 rounded-full text-blue-600 mb-4"><TrendingUp size={40} /></div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">MyWealth.io</h1>
          <p className="text-slate-500">
            {view === 'register' ? "Créez votre compte sécurisé" : view === 'forgot' ? "Récupération de compte" : "Gérez votre patrimoine intelligemment"}
          </p>
        </div>

        {view !== 'forgot' && (
          <div className="mb-6">
            <Button variant="google" className="w-full mb-4 flex items-center justify-center gap-3 py-3" onClick={handleGoogleClick}>
              <Globe size={18} className="text-blue-600" />
              Continuer avec Google
            </Button>
            {error && error.includes("Pop-up") && (
                <div className="text-xs text-center text-slate-500 mb-2">
                    Si le pop-up reste blanc, essayez de désactiver vos extensions (AdBlock) ou utilisez un autre navigateur.
                </div>
            )}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
              <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-slate-500">Ou avec email</span></div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {view === 'register' && (
            <div className="space-y-4 animate-in slide-in-from-left">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Prénom *</label>
                    <input type="text" className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Nom *</label>
                    <input type="text" className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                  </div>
                </div>
                
                {/* Optional Financial Profile Fields during Registration */}
                <div className="border-t border-slate-100 pt-3">
                    <p className="text-xs font-bold text-indigo-600 mb-3 flex items-center gap-1"><Sparkles size={12}/> Personnaliser mon profil (Optionnel)</p>
                    <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Date Naissance</label>
                            <input type="date" className="w-full p-2 rounded-lg border border-slate-300 text-sm" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Revenu Mensuel</label>
                            <input type="number" className="w-full p-2 rounded-lg border border-slate-300 text-sm" placeholder="€" value={monthlyIncome} onChange={(e) => setMonthlyIncome(e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Objectif Principal</label>
                        <select className="w-full p-2 rounded-lg border border-slate-300 text-sm bg-white" value={financialGoal} onChange={(e) => setFinancialGoal(e.target.value)}>
                            <option value="freedom">Liberté Financière</option>
                            <option value="retirement">Préparer ma Retraite</option>
                            <option value="real_estate">Projet Immobilier</option>
                            <option value="safety">Sécurité Financière</option>
                            <option value="growth">Croissance du capital</option>
                            <option value="other">Autre</option>
                        </select>
                    </div>
                </div>
            </div>
          )}

          {view !== 'forgot' ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Email *</label>
                <input type="email" className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none transition" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Mot de passe *</label>
                <input type="password" className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none transition" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
            </>
          ) : (
            <div className="animate-in fade-in">
              <label className="block text-sm font-medium text-slate-700 mb-1">Votre email</label>
              <input type="email" className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none transition" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="exemple@email.com" required />
            </div>
          )}

          {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg flex items-center gap-2 font-medium border border-red-200"><AlertCircle size={16} className="shrink-0"/> <span>{error}</span></div>}
          {success && <div className="text-green-600 text-sm bg-green-50 p-3 rounded-lg flex items-center gap-2"><CheckCircle size={16}/> {success}</div>}

          <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">
            {view === 'register' ? "Créer un compte" : view === 'forgot' ? "Envoyer le lien" : "Se connecter"}
          </button>
        </form>

        <div className="mt-6 flex flex-col gap-3 text-center text-sm">
          {view === 'login' && (
            <>
              <button onClick={() => setView('forgot')} className="text-slate-500 hover:text-blue-600 transition-colors">Mot de passe oublié ?</button>
              <div className="text-slate-600">Pas encore de compte ? <button onClick={() => setView('register')} className="font-bold text-blue-600 hover:underline">S'inscrire</button></div>
            </>
          )}
          
          {(view === 'register' || view === 'forgot') && (
            <button onClick={() => setView('login')} className="text-blue-600 hover:underline flex items-center justify-center gap-1">
              <ChevronLeft size={14} /> Retour à la connexion
            </button>
          )}
        </div>
      </Card>
    </div>
  );
};

const CustomTooltip = ({ continuous, index, step, backProps, closeProps, primaryProps, tooltipProps, isLastStep }) => (
  <div {...tooltipProps} className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-5 sm:p-6 w-[90vw] sm:w-full max-w-sm animate-in zoom-in-95 duration-200 relative">
    <div className="flex items-center gap-3 mb-3">
      {step.icon || <Info size={24} className="text-blue-600" />}
      <h3 className="text-lg font-bold text-slate-800">{step.title}</h3>
    </div>
    <p className="text-sm text-slate-600 mb-6 leading-relaxed">{step.content}</p>
    
    {/* On masque le footer si l'étape force l'utilisateur à cliquer sur un élément de l'interface */}
    {!step.hideFooter && (
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold text-slate-400">Étape {index + 1}</span>
        <div className="flex gap-2">
          {index > 0 && <Button variant="secondary" className="text-xs px-3 py-1.5 h-auto" {...backProps}>Retour</Button>}
          {continuous && <Button variant="primary" className="text-xs px-3 py-1.5 h-auto" {...primaryProps}>{isLastStep ? 'Terminer' : 'Suivant'}</Button>}
        </div>
      </div>
    )}
    <button {...closeProps} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"><X size={16} /></button>
  </div>
);

// On éclate le tutoriel en plusieurs petites séquences contextuelles
const TOURS = {
  intro: [
    { target: 'body', placement: 'center', title: 'Bienvenue sur MyWealth ! 🎉', content: "Faisons le tour du propriétaire pour bien démarrer. Pas d'inquiétude, vous serez libre d'explorer ensuite !", disableBeacon: true, icon: <TrendingUp size={24} className="text-blue-600" /> },
    { target: '.tour-tab-dashboard', placement: 'bottom', title: '1. Le Tableau de bord', content: "C'est votre centre de contrôle. Il résumera votre patrimoine global une fois vos comptes ajoutés.", disableBeacon: true },
    { target: '.tour-tab-assets', placement: 'bottom', title: '2. Les Actifs', content: "C'est ici que vous pourrez ajouter et gérer vos comptes (Banque, Bourse...).", disableBeacon: true },
    { target: '.tour-tab-budget', placement: 'bottom', title: '3. Le Budget', content: "L'onglet pour suivre vos revenus et dépenses mois par mois.", disableBeacon: true },
    { target: '.tour-tab-advisor', placement: 'bottom', title: '4. Le Conseiller IA', content: "Votre assistant personnel pour optimiser vos finances en un clic.", disableBeacon: true },
    { target: '.tour-profile', placement: 'bottom-end', title: 'Votre Profil', content: "Plus tard, pensez à configurer vos objectifs ici pour obtenir des conseils sur-mesure !", disableBeacon: true, icon: <User size={24} className="text-indigo-600"/> },
    { target: '.tour-start-btn', placement: 'bottom', title: 'Passons à la pratique !', content: "Nous allons maintenant ajouter votre premier compte. Cliquez sur ce bouton pour commencer.", disableBeacon: true, spotlightClicks: true, hideFooter: true, icon: <Wallet size={24} className="text-blue-600"/> }
  ],
  assets_add: [
    { target: '.tour-add-asset', placement: 'bottom', title: 'À vous de jouer !', content: "Créez votre premier compte. Cliquez directement sur ce bouton pour ouvrir le formulaire.", disableBeacon: true, spotlightClicks: true, hideFooter: true, icon: <PlusCircle size={24} className="text-emerald-500"/> }
  ],
  assets_form: [
    { target: '.tour-asset-form-type', placement: 'bottom', title: 'Le type de compte', content: "Choisissez 'Liquidités' pour vos livrets ou comptes courants. Pour la Bourse ou l'Immobilier, l'application calculera automatiquement vos plus-values !", disableBeacon: true },
    { target: '.tour-asset-form-submit', placement: 'top', title: 'Validez la création', content: "Renseignez un nom, une banque et une valeur de départ, puis cliquez ici pour l'ajouter.", disableBeacon: true, spotlightClicks: true, hideFooter: true }
  ],
  assets_eye: [
    { target: '.tour-asset-eye', placement: 'left', title: 'Voir le détail', content: "Votre compte est créé ! Cliquez sur cet œil pour découvrir comment modifier ses informations ou gérer ses lignes.", disableBeacon: true, spotlightClicks: true, hideFooter: true, icon: <Eye size={24} className="text-blue-500"/> }
  ],
  detail: [
    { target: '.tour-asset-name', placement: 'bottom-start', title: 'Modifiez à la volée', content: "Cliquez directement sur le nom ou la banque pour les renommer. C'est magique !", disableBeacon: true, icon: <Edit size={24} className="text-purple-600"/> },
    { target: '.tour-asset-primary', placement: 'bottom', title: 'Compte Principal', content: "Cliquez sur cette étoile pour définir ce compte par défaut lors de vos saisies rapides de dépenses.", disableBeacon: true },
    { target: '.tour-asset-value', placement: 'left', title: 'Valorisation Actuelle', content: "Voici le solde total de votre compte en temps réel.", disableBeacon: true, icon: <DollarSign size={24} className="text-emerald-500"/> },
    { target: '.tour-asset-chart', placement: 'bottom', title: 'Évolution du solde', content: "Suivez visuellement la courbe de croissance de votre actif au fil du temps.", disableBeacon: true, icon: <TrendingUp size={24} className="text-indigo-500"/> },
    { target: '.tour-asset-update', placement: 'top', title: 'Mise à jour & Historique', content: "Actualisez votre solde en un clic, ou ajoutez un point dans le passé pour recréer l'historique oublié.", disableBeacon: true, icon: <History size={24} className="text-blue-500"/> },
    { target: '.tour-asset-history', placement: 'top', title: 'Historique Global', content: "Retrouvez ici toutes les transactions et variations de solde de ce compte.", disableBeacon: true, icon: <List size={24} className="text-slate-600"/> },
    { target: '.tour-asset-ai-tab', placement: 'bottom', title: 'Analyse IA ✨', content: "Basculez sur cet onglet pour obtenir une analyse poussée et des conseils personnalisés sur ce compte précis.", disableBeacon: true, icon: <Sparkles size={24} className="text-amber-500"/> }
  ],
  detail_composite: [
    { target: '.tour-asset-name', placement: 'bottom-start', title: 'Modifiez à la volée', content: "Cliquez directement sur le nom ou la banque pour les renommer. C'est magique !", disableBeacon: true, icon: <Edit size={24} className="text-purple-600"/> },
    { target: '.tour-asset-value', placement: 'left', title: 'Valorisation Actuelle', content: "Voici le solde total de votre compte, incluant vos espèces et vos lignes investies.", disableBeacon: true, icon: <DollarSign size={24} className="text-emerald-500"/> },
    { target: '.tour-asset-cash', placement: 'bottom', title: 'Cash Disponible', content: "C'est la poche espèces de votre compte, l'argent qui dort et qui est prêt à être investi.", disableBeacon: true, icon: <PiggyBank size={24} className="text-blue-500"/> },
    { target: '.tour-asset-pru', placement: 'bottom', title: 'Total Versé (PRU)', content: "C'est le montant total que vous avez réellement sorti de votre poche pour investir.", disableBeacon: true, icon: <ArrowDownRight size={24} className="text-slate-500"/> },
    { target: '.tour-asset-pv', placement: 'bottom', title: 'Plus-Value Latente', content: "Vos gains ou pertes en temps réel par rapport à votre investissement de départ.", disableBeacon: true, icon: <TrendingUp size={24} className="text-green-500"/> },
    { target: '.tour-asset-add-line', placement: 'right', title: 'Ajouter une ligne', content: "Commencez par créer vos différents supports (actions, ETF, cryptos, biens...).", disableBeacon: true, icon: <PlusCircle size={24} className="text-blue-600"/> },
    { target: '.tour-asset-movement', placement: 'right', title: 'Mouvement Interne', content: "Une fois vos lignes créées, simulez des achats ou ventes pour déplacer les fonds depuis la poche espèces.", disableBeacon: true, icon: <ArrowRightLeft size={24} className="text-indigo-500"/> },
    { target: '.tour-asset-lines', placement: 'top', title: 'Lignes Détenues', content: "La liste de tous vos investissements actuels. Cliquez dessus pour voir leur détail complet !", disableBeacon: true, icon: <List size={24} className="text-slate-600"/> },
    { target: '.tour-asset-history-tab', placement: 'bottom', title: 'Historique', content: "Retrouvez ici le journal de vos opérations et la courbe d'évolution globale du compte.", disableBeacon: true, icon: <History size={24} className="text-blue-500"/> },
    { target: '.tour-asset-ai-tab', placement: 'bottom', title: 'Analyse IA ✨', content: "L'IA peut analyser vos positions et vous suggérer des arbitrages sur ce compte.", disableBeacon: true, icon: <Sparkles size={24} className="text-amber-500"/> }
  ],
  budget: [
    { target: 'body', placement: 'center', title: 'Votre Budget & Flux 💸', content: "Bienvenue dans le centre névralgique de vos finances. C'est ici que vous allez suivre l'évolution de chaque euro gagné ou dépensé.", disableBeacon: true, icon: <ArrowRightLeft size={24} className="text-blue-600"/> },
    { target: '.tour-budget-manual-form', placement: 'right', title: 'Saisie Manuelle', content: "Ajoutez vos dépenses, revenus ou virements entre comptes en remplissant ce formulaire classique.", disableBeacon: true, icon: <PlusCircle size={24} className="text-emerald-500"/> },
    { target: '.tour-ai-input', placement: 'bottom', title: 'La Saisie Magique IA 🪄', content: "Encore plus rapide : écrivez simplement 'Courses 50€' ou 'Virement 100€' et l'IA s'occupe de remplir le formulaire pour vous !", disableBeacon: true, icon: <Wand2 size={24} className="text-indigo-600"/> },
    { target: '.tour-budget-chart', placement: 'left', title: 'Analyse Visuelle', content: "Suivez l'évolution de vos flux. Astuce : cliquez sur une barre rouge pour voir la répartition détaillée de vos dépenses du mois !", disableBeacon: true, icon: <PieIcon size={24} className="text-purple-500"/> },
    { target: '.tour-budget-list', placement: 'left', title: 'Le Journal', content: "Retrouvez ici tout l'historique de vos opérations avec la possibilité de rechercher, filtrer ou modifier une ligne.", disableBeacon: true, icon: <List size={24} className="text-slate-600"/> },
    { target: '.tour-calendar-btn', placement: 'left', title: 'La Vue Calendrier 📅', content: "Basculez sur cette vue pour visualiser vos mouvements jour par jour sur un mois entier. Cliquez dessus pour essayer et terminer !", disableBeacon: true, spotlightClicks: true, hideFooter: true, icon: <CalendarDays size={24} className="text-blue-500"/> }
  ],
  advisor: [
    { target: 'body', placement: 'center', title: 'Votre Conseiller Personnel', content: "L'IA a connaissance de l'intégralité de votre patrimoine, de vos revenus et de vos objectifs. Elle est là pour vous guider sur mesure.", disableBeacon: true, icon: <Bot size={24} className="text-indigo-600"/> },
    { target: '.tour-ai-flash', placement: 'right', title: 'Analyses Flash', content: "Pas d'inspiration ? Cliquez sur l'un de ces boutons pour lancer une analyse financière complète en un clin d'œil.", disableBeacon: true, icon: <Zap size={24} className="text-amber-500"/> },
    { target: '.tour-ai-upload', placement: 'top-start', title: 'Analyse de Documents', content: "La vraie magie est ici : envoyez un relevé bancaire, une fiche de paie ou un document SCPI (PDF/Image) pour que l'IA le décrypte pour vous !", disableBeacon: true, icon: <Cloud size={24} className="text-blue-500"/> },
    { target: '.tour-ai-chat-input', placement: 'top', title: 'À vous de jouer !', content: "Posez votre première question. Par exemple : 'Comment investir 500€ ce mois-ci ?'. C'est à vous !", disableBeacon: true, icon: <MessageSquare size={24} className="text-indigo-600"/> }
  ],
  profile: [
    { target: '.tour-profile-identity', placement: 'bottom', title: 'Votre Identité', content: "Vos informations de base pour une expérience plus personnalisée sur votre tableau de bord.", disableBeacon: true, icon: <User size={24} className="text-blue-600"/> },
    { target: '.tour-profile-financial', placement: 'top', title: 'Données Financières', content: "Ces informations sont cruciales ! Elles permettent à l'IA de comprendre votre situation et d'adapter ses conseils (ex: tolérance au risque).", disableBeacon: true, icon: <Activity size={24} className="text-indigo-600"/> },
    { target: '.tour-profile-security', placement: 'top', title: 'Sécurité & Sauvegarde', content: "Activez les rapports mensuels par email, ou exportez manuellement vos données pour créer une sauvegarde de sécurité.", disableBeacon: true, icon: <ShieldCheck size={24} className="text-green-600"/> }
  ]
};

export default function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [assets, setAssets] = useState(null);
  const [transactions, setTransactions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [toast, setToast] = useState(null);
  
  // Remonte en haut de la page automatiquement à chaque changement d'onglet
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  // État persistant du chat
  const [chatMessages, setChatMessages] = useState(() => {
    const saved = localStorage.getItem(`myWealth_chat_${user?.uid}`);
    return saved ? JSON.parse(saved) : [{ role: 'assistant', content: "Bonjour ! Je suis votre conseiller MyWealth. \nJe connais votre patrimoine et je peux analyser vos documents. Comment puis-je vous aider ?" }];
  });

  // Sauvegarde automatique quand les messages changent
  useEffect(() => {
    if (user) {
      localStorage.setItem(`myWealth_chat_${user.uid}`, JSON.stringify(chatMessages));
    }
  }, [chatMessages, user]);

  // --- LOGIQUE ONBOARDING CONTEXTUEL (BASE DE DONNÉES) ---
  const [tourState, setTourState] = useState({ run: false, steps: [], stepIndex: 0, key: '' });

  const startTour = useCallback((tourKey) => {
    if (!user || !userProfile) return;
    
    const completedTours = userProfile.completedTours || [];
    
    if (!completedTours.includes(tourKey)) {
      // --- FIX MATHÉMATIQUE JOYRIDE ---
      // Si on lance un tutoriel dans une modale fixée (comme le profil), 
      // on remet l'arrière plan tout en haut pour éviter que Joyride 
      // ne fausse ses calculs en ajoutant le scroll de la page cachée.
      if (tourKey === 'profile') {
        window.scrollTo(0, 0);
      }

      setTimeout(() => {
        const isMobile = window.innerWidth < 768;
        const responsiveSteps = TOURS[tourKey].map(step => {
          let newTarget = step.target;
          if (newTarget.startsWith('.tour-tab-')) {
             newTarget = `.tour-tab-${isMobile ? 'mobile' : 'desktop'}-${newTarget.replace('.tour-tab-', '')}`;
          } else if (newTarget === '.tour-profile') {
             newTarget = `.tour-profile-${isMobile ? 'mobile' : 'desktop'}`;
          }

          // Réduction chirurgicale de la cible sur mobile
          if (isMobile) {
            // Vues Détail Actif
            if (newTarget === '.tour-asset-update') newTarget = '.tour-asset-update h3';
            if (newTarget === '.tour-asset-history') newTarget = '.tour-asset-history h3';
            if (newTarget === '.tour-asset-lines') newTarget = '.tour-asset-lines h3';
            
            // Vues Modale Profil
            if (newTarget === '.tour-profile-identity') newTarget = '.tour-profile-identity label';
            if (newTarget === '.tour-profile-financial') newTarget = '.tour-profile-financial h4';
            if (newTarget === '.tour-profile-security') newTarget = '.tour-profile-security h4';
          }
          
          return { ...step, target: newTarget };
        });
        
        setTourState({ run: true, steps: responsiveSteps, stepIndex: 0, key: tourKey });
      }, 800);
    }
  }, [user, userProfile]);

  // Déclencheurs basés sur la navigation de l'utilisateur
  useEffect(() => {
    if (!user || loading || !userProfile) return;
    if (activeTab === 'dashboard') startTour('intro');
    else if (activeTab === 'assets' && assets && assets.length === 0) startTour('assets_add');
    else if (activeTab === 'budget') startTour('budget');
    else if (activeTab === 'advisor') startTour('advisor');
  }, [activeTab, user, loading, assets, userProfile, startTour]);

  // Déclencheur à l'ouverture de la modale Profil
  useEffect(() => {
    if (isProfileModalOpen) {
      startTour('profile');
    }
  }, [isProfileModalOpen, startTour]);

  // Déclencheurs et fermetures via Événements Custom
  useEffect(() => {
    const handleDetailOpen = (e) => startTour(e.detail?.isComposite ? 'detail_composite' : 'detail');
    const handleFormOpen = () => startTour('assets_form');
    const handleAssetCreated = () => startTour('assets_eye');
    
    // NOUVEAU : Récepteur pour forcer la fermeture d'un tutoriel validé par l'action
    const handleCloseTour = () => {
      setTourState(prev => {
        // Sauvegarde silencieuse en base de données si le tour était actif
        if (prev.run && prev.key && user && userProfile) {
          const completedTours = userProfile.completedTours || [];
          if (!completedTours.includes(prev.key)) {
            const newCompleted = [...completedTours, prev.key];
            setUserProfile(p => ({ ...p, completedTours: newCompleted }));
            const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'info');
            setDoc(profileRef, { completedTours: newCompleted }, { merge: true }).catch(console.error);
          }
        }
        // Force l'arrêt de Joyride
        return { ...prev, run: false };
      });
    };

    window.addEventListener('tour-asset-detail', handleDetailOpen);
    window.addEventListener('tour-asset-form-open', handleFormOpen);
    window.addEventListener('tour-asset-created', handleAssetCreated);
    window.addEventListener('close-tour', handleCloseTour);
    return () => {
      window.removeEventListener('tour-asset-detail', handleDetailOpen);
      window.removeEventListener('tour-asset-form-open', handleFormOpen);
      window.removeEventListener('tour-asset-created', handleAssetCreated);
      window.removeEventListener('close-tour', handleCloseTour);
    };
  }, [startTour, user, userProfile]);

  // --- AUTO-SCROLL POUR LE TUTORIEL (MOBILE & DESKTOP) ---
  useEffect(() => {
    if (tourState.run && tourState.steps[tourState.stepIndex]) {
      // Un délai très court suffit maintenant
      const timer = setTimeout(() => {
        const currentStep = tourState.steps[tourState.stepIndex];
        const currentTarget = currentStep.target;
        
        if (typeof currentTarget === 'string' && currentTarget !== 'body') {
          const el = document.querySelector(currentTarget);
          if (el) {
            // --- SCROLL INSTANTANÉ (AUTO) ---
            // Évite la latence de l'animation smooth qui désynchronise Joyride.
            // L'élément est centré d'un coup sec, puis Joyride dessine la lumière par-dessus.
            el.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'center' });

            // On force un recalcul unique juste après le "snap"
            setTimeout(() => {
              window.dispatchEvent(new Event('resize'));
            }, 50);
          }
        }
      }, 150); 
      return () => clearTimeout(timer);
    }
  }, [tourState.run, tourState.stepIndex, tourState.steps]);

  // Fonction asynchrone pour sauvegarder en base
  const handleJoyrideCallback = async (data) => {
    const { action, index, status, type } = data;
    
    // Ajout de "action === 'close'" pour intercepter le clic sur la croix
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status) || type === 'target:notFound' || action === 'close') {
      setTourState(prev => ({ ...prev, run: false }));
      
      if (user && userProfile && tourState.key) {
        const completedTours = userProfile.completedTours || [];
        
        // Si ce tutoriel n'est pas encore marqué comme terminé
        if (!completedTours.includes(tourState.key)) {
          const newCompleted = [...completedTours, tourState.key];
          
          // 1. Mise à jour immédiate de l'état local (pour éviter qu'il ne se relance à la seconde)
          setUserProfile(prev => ({ ...prev, completedTours: newCompleted }));
          
          // 2. Sauvegarde silencieuse dans Firestore
          try {
            const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'info');
            await setDoc(profileRef, { completedTours: newCompleted }, { merge: true });
          } catch (error) {
            console.error("Erreur lors de la sauvegarde du tutoriel en base :", error);
          }
        }
      }
    } else if (type === 'step:after') {
      setTourState(prev => ({ ...prev, stepIndex: index + (action === 'prev' ? -1 : 1) }));
    }
  };

// Message envoie auto mail
const showToast = (msg) => setToast({ message: msg });


 // --- AUTO LOGOUT LOGIC (VERSION PERSISTANTE) ---
  const [showAutoLogoutModal, setShowAutoLogoutModal] = useState(false);
  const logoutTimerRef = useRef(null);
  const warningTimerRef = useRef(null);

  // Seuils de sécurité
  const WARNING_THRESHOLD = 5 * 60 * 1000; // Alerte à 5 minutes
  const LOGOUT_THRESHOLD = 10 * 60 * 1000; // Déconnexion à 10 minutes

  // Fonction pour vérifier si le temps est écoulé (même après un refresh)
  const checkInactivity = useCallback(() => {
    if (!user) return;

    const lastActivity = parseInt(localStorage.getItem('lastActivity') || Date.now());
    const elapsed = Date.now() - lastActivity;

    if (elapsed >= LOGOUT_THRESHOLD) {
      handleLogout();
      setShowAutoLogoutModal(false);
      localStorage.removeItem('lastActivity');
    } else if (elapsed >= WARNING_THRESHOLD) {
      setShowAutoLogoutModal(true);
    }
  }, [user]);

  const startTimers = () => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);

    const lastActivity = parseInt(localStorage.getItem('lastActivity') || Date.now());
    const elapsed = Date.now() - lastActivity;

    // Timer pour l'affichage de la modale d'alerte
    if (elapsed < WARNING_THRESHOLD) {
      warningTimerRef.current = setTimeout(() => {
        setShowAutoLogoutModal(true);
      }, WARNING_THRESHOLD - elapsed);
    } else {
      setShowAutoLogoutModal(true);
    }

    // Timer pour la déconnexion automatique
    logoutTimerRef.current = setTimeout(() => {
      handleLogout();
      setShowAutoLogoutModal(false);
      localStorage.removeItem('lastActivity');
    }, LOGOUT_THRESHOLD - elapsed);
  };

  const resetActivity = () => {
    // Sauvegarde de l'instant T dans la mémoire physique du navigateur
    localStorage.setItem('lastActivity', Date.now().toString());
    if (showAutoLogoutModal) setShowAutoLogoutModal(false);
    startTimers();
  };

  const confirmPresence = () => {
    resetActivity(); // Met à jour le localStorage et relance les compteurs
  };

  useEffect(() => {
    if (!user) return;

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    let lastRun = Date.now();

    const handleUserActivity = () => {
      // On limite l'écriture en mémoire à une fois toutes les 2 secondes pour les performances
      if (Date.now() - lastRun > 2000) {
        resetActivity();
        lastRun = Date.now();
      }
    };

    // Vérification immédiate au chargement/re-chargement de la page
    checkInactivity();
    startTimers();

    events.forEach(event => window.addEventListener(event, handleUserActivity));
    
    // Détection du retour sur l'onglet (crucial pour le verrouillage mobile)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkInactivity();
        startTimers();
      }
    };
    window.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      events.forEach(event => window.removeEventListener(event, handleUserActivity));
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    };
  }, [user, checkInactivity]);

  // --- AUTH STATE & DATA FETCHING ---

  useEffect(() => { 
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => { 
      setUser(currentUser); 
      if (currentUser) {
         // Load User Profile Data (Name/Surname)
         try {
         const profileDoc = await getDoc(doc(db, 'artifacts', appId, 'users', currentUser.uid, 'profile', 'info'));
         if (profileDoc.exists()) {
             const data = profileDoc.data();
             setUserProfile(data);
         } else {
                 // Try to init profile from Auth provider data (e.g. Google)
                 if (currentUser.displayName) {
                     const names = currentUser.displayName.split(' ');
                     const newProfile = { 
                         firstName: names[0], 
                         lastName: names.length > 1 ? names.slice(1).join(' ') : '',
                         email: currentUser.email 
                     };
                     await setDoc(doc(db, 'artifacts', appId, 'users', currentUser.uid, 'profile', 'info'), newProfile);
                     setUserProfile(newProfile);
                 }
             }
         } catch(e) { 
             console.error("Error fetching profile", e); 
             // Silent fail for profile load, not critical
         }
      } else {
          setUserProfile(null);
      }
      setLoading(false); 
    }); 
    return () => unsubAuth(); 
  }, []);

  // --- DÉCLENCHEUR DE RAPPORT MENSUEL AUTOMATIQUE ---
  const isProcessingReport = useRef(false); 

  useEffect(() => {
      if (user && userProfile && assets !== null && transactions !== null && !isProcessingReport.current) {
          const today = new Date();
          const currentMonthKey = `${today.getFullYear()}-${today.getMonth() + 1}`;
          const lastReport = userProfile.lastMonthlyReportDate;

          if (userProfile.emailReports && lastReport !== currentMonthKey) {
              isProcessingReport.current = true; // On verrouille
              triggerMonthlyProcess(user, userProfile, currentMonthKey, false)
                  .finally(() => { isProcessingReport.current = false; });
          }
      }
  }, [user, userProfile, assets, transactions]);

  useEffect(() => {
    if (!user) return;
    
    // Ajout d'une gestion d'erreur robuste pour les listeners Firestore
    const unsubAssets = onSnapshot(
      doc(db, 'artifacts', appId, 'users', user.uid, 'data', 'assets'), 
      (docSnapshot) => { 
        if (docSnapshot.exists()) {setAssets(docSnapshot.data().items || []); 
      }
	  else {
        setAssets([]); 
      }
    },
      (error) => {
        console.error("Erreur lecture Assets:", error);
        alert("Erreur de connexion aux données (Assets). Vérifiez vos droits d'accès.");
      }
    );

    const unsubTrans = onSnapshot(
      doc(db, 'artifacts', appId, 'users', user.uid, 'data', 'transactions'), 
      (docSnapshot) => { 
        if (docSnapshot.exists()) setTransactions(docSnapshot.data().items || []); 
        else setTransactions([]); 
      },
      (error) => {
        console.error("Erreur lecture Transactions:", error);
      }
    );

    return () => { unsubAssets(); unsubTrans(); };
  }, [user]);

  const saveAssets = async (newAssets) => { 
    if (!user) return; 
    try { 
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'data', 'assets'), { items: newAssets }); 
    } catch (e) { 
      console.error("Erreur sauvegarde Assets:", e);
      alert("Impossible d'enregistrer : " + e.message); // Feedback utilisateur
    } 
  };

  const saveTransactions = async (newTransactions) => { 
    if (!user) return; 
    try { 
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'data', 'transactions'), { items: newTransactions }); 
    } catch (e) { 
      console.error("Erreur sauvegarde Transactions:", e); 
      alert("Impossible d'enregistrer la transaction : " + e.message);
    } 
  };

  const handleSetAssets = (newAssets) => { setAssets(newAssets); saveAssets(newAssets); };
  const handleSetTransactions = (newTransactions) => { setTransactions(newTransactions); saveTransactions(newTransactions); };

  // --- AUTH ACTIONS ---

  const handleLogin = async () => signInAnonymously(auth);
  
  const handleEmailLogin = async (email, password) => {
      await signInWithEmailAndPassword(auth, email, password);
  };

  const handleEmailRegister = async (email, password, profileData) => {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Create user profile in Firestore immediately
      await setDoc(doc(db, 'artifacts', appId, 'users', userCredential.user.uid, 'profile', 'info'), {
          ...profileData,
          email,
          createdAt: new Date().toISOString()
      });
  };

  const handleGoogleLogin = async () => {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' }); 
      auth.useDeviceLanguage(); 
      await signInWithPopup(auth, provider);
  };

  const handleForgotPassword = async (email) => {
      await sendPasswordResetEmail(auth, email);
  };

  const handleLogout = () => signOut(auth);

  const handleUpdateProfile = async (formData) => {
    if (!user) return;
    try {
        const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'info');
        await setDoc(profileRef, formData, { merge: true });
        setUserProfile(prev => ({ ...prev, ...formData }));
    } catch (e) {
        console.error("Error updating profile:", e);
        alert("Erreur lors de la mise à jour du profil.");
    }
  };


  // --- TRANSACTION HELPERS (Keep existing logic) ---
  
  const updateAssetHistoryWithDelta = (asset, date, delta) => {
    const prevHistory = asset.history || [];
    let updatedHistory = prevHistory.map(h => { 
      if (new Date(h.date) >= new Date(date)) { 
        // Si c'est un investissement et que le delta est positif (virement entrant), 
        // on augmente aussi la valeur investie
        const isInvestedCompte = asset.type !== 'liquidite';
        const investedDelta = isInvestedCompte ? delta : 0;
        return { 
          ...h, 
          value: parseFloat((h.value + delta).toFixed(2)),
          investedValue: (h.investedValue || h.value) + investedDelta
        }; 
      } 
      return h; 
    });
    
    const exists = updatedHistory.some(h => h.date === date);
    if (!exists) {
      const sorted = [...updatedHistory].sort((a,b) => new Date(a.date) - new Date(b.date));
      const previousEntry = [...sorted].reverse().find(h => new Date(h.date) < new Date(date));
      // FIX : Si aucun point d'historique n'est trouvé avant la date, on utilise la valeur
      // actuelle de l'actif (asset.value) comme base au lieu de 0. Cela garantit que le Cash
      // s'accumule correctement même si l'historique est vide ou désynchronisé.
      const baseValue = previousEntry ? previousEntry.value : (typeof asset.value === 'number' ? asset.value : 0); 
      const baseInvested = previousEntry ? (previousEntry.investedValue || previousEntry.value) : (typeof asset.value === 'number' ? asset.value : 0);
      const isInvestedCompte = asset.type !== 'liquidite';
      const investedDelta = isInvestedCompte ? delta : 0;
      
      updatedHistory.push({ 
        date: date, 
        value: parseFloat((baseValue + delta).toFixed(2)),
        investedValue: baseInvested + investedDelta
      });
    }
    updatedHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
    return updatedHistory;
  };

  // --- GESTIONNAIRES DE TRANSACTIONS (VERSION PROJETÉE) ---

  // --- GESTIONNAIRES DE TRANSACTIONS (VERSION TEMPS RÉEL) ---

  const handleCreateTransaction = (transaction, impactedAssetId) => {
    let currentAssets = [...assets];

    const applyTransactionToAsset = (assetId, date, delta) => {
      const idx = currentAssets.findIndex(a => a.id.toString() === assetId.toString());
      if (idx === -1) return;

      const asset = currentAssets[idx];
      const updatedHistory = updateAssetHistoryWithDelta(asset, date, delta);
      
      // LOGIQUE : On cherche le point le plus récent qui n'est pas dans le futur
      const today = new Date().toISOString().split('T')[0];
      const sortedHistory = [...updatedHistory].sort((a, b) => a.date.localeCompare(b.date));
      const latestPastOrPresent = [...sortedHistory].reverse().find(h => h.date <= today);
      
      const currentRealValue = latestPastOrPresent 
        ? latestPastOrPresent.value 
        : parseFloat((asset.value + (date <= today ? delta : 0)).toFixed(2));

      // Mise à jour de la poche Cash pour les comptes composites
      const isComposite = asset.type !== 'liquidite';
      let positions = asset.positions || [];
      
      if (isComposite) {
        if (!positions.some(p => p.isCash)) {
          positions.push({ id: 'cash_pouch', name: '💰 Espèces', value: 0, isCash: true, history: [] });
        }
        
        positions = positions.map(p => {
          if (p.isCash) {
            // FIX : Synchronisation de l'historique du Cash avec sa valeur actuelle.
            // Si l'historique est vide ou si le dernier point ne reflète pas p.value,
            // on ajoute un point de correction AVANT d'appliquer le delta.
            // Cela évite que le Cash soit "remplacé" par le montant du versement
            // au lieu de s'accumuler (ex: Cash=500, versement=300 → résultat attendu: 800, pas 300).
            let cashHistory = [...(p.history || [])];
            if (cashHistory.length === 0) {
              // Historique vide : on initialise avec la valeur actuelle du Cash
              cashHistory.push({ date: date, value: p.value });
            } else {
              // Vérifier que le dernier point reflète la valeur actuelle
              const sortedForCheck = [...cashHistory].sort((a, b) => a.date.localeCompare(b.date));
              const latestPoint = sortedForCheck[sortedForCheck.length - 1];
              if (Math.abs(latestPoint.value - p.value) > 0.01) {
                // Désynchronisation détectée : le Cash a été modifié par un mouvement interne
                // (achat/vente) sans que l'historique ne soit à jour pour ce contexte.
                // On ajoute ou met à jour un point pour refléter la valeur actuelle.
                const todayStr = new Date().toISOString().split('T')[0];
                const existingTodayIdx = cashHistory.findIndex(h => h.date === todayStr);
                if (existingTodayIdx >= 0) {
                  cashHistory[existingTodayIdx] = { ...cashHistory[existingTodayIdx], value: p.value };
                } else {
                  cashHistory.push({ date: todayStr, value: p.value });
                  cashHistory.sort((a, b) => a.date.localeCompare(b.date));
                }
              }
            }

            // On applique le delta sur l'historique synchronisé
            const cashPosWithSyncedHistory = { ...p, history: cashHistory };
            const newCashHistory = updateAssetHistoryWithDelta(cashPosWithSyncedHistory, date, delta);
            const sortedCashHistory = [...newCashHistory].sort((a, b) => a.date.localeCompare(b.date));
            const latestCash = [...sortedCashHistory].reverse().find(h => h.date <= today);
            const currentCashValue = latestCash ? latestCash.value : parseFloat((p.value + (date <= today ? delta : 0)).toFixed(2));
            return { ...p, value: currentCashValue, history: newCashHistory };
          }
          return p;
        });
      }

      currentAssets[idx] = { 
        ...asset, 
        value: currentRealValue, 
        positions: positions, 
        history: updatedHistory 
      };
    };

    if (transaction.type === 'transfer') {
      if (transaction.fromId) applyTransactionToAsset(transaction.fromId, transaction.date, -transaction.amount);
      if (transaction.toId) applyTransactionToAsset(transaction.toId, transaction.date, transaction.amount);
    } else if (impactedAssetId) {
      const delta = transaction.type === 'expense' ? -transaction.amount : transaction.amount;
      applyTransactionToAsset(impactedAssetId, transaction.date, delta);
    }

    const newTransactions = [transaction, ...transactions];
    setTransactions(newTransactions);
    saveTransactions(newTransactions);
    setAssets(currentAssets);
    saveAssets(currentAssets);
  };

  const handleUpdateTransaction = (updatedTransaction) => {
    const originalTransaction = transactions.find(t => t.id === updatedTransaction.id);
    if (!originalTransaction) return;

    let currentAssets = [...assets];
    const today = new Date().toISOString().split('T')[0];

    const applyDeltaToAsset = (assetId, date, delta) => {
      const idx = currentAssets.findIndex(a => a.id.toString() === assetId.toString());
      if (idx === -1) return;
      const asset = currentAssets[idx];
      
      const updatedHistory = updateAssetHistoryWithDelta(asset, date, delta);
      const sortedHistory = [...updatedHistory].sort((a, b) => a.date.localeCompare(b.date));
      const latestPastOrPresent = [...sortedHistory].reverse().find(h => h.date <= today);
      const currentRealValue = latestPastOrPresent ? latestPastOrPresent.value : asset.value;

      const isComposite = asset.type !== 'liquidite';
      let positions = asset.positions || [];
      
      if (isComposite) {
        if (!positions.some(p => p.isCash)) {
          positions.push({ id: 'cash_pouch', name: '💰 Espèces', value: 0, isCash: true, history: [] });
        }
        positions = positions.map(p => {
          if (p.isCash) {
            // FIX : Synchronisation de l'historique du Cash (même logique que handleCreateTransaction)
            let cashHistory = [...(p.history || [])];
            if (cashHistory.length === 0) {
              cashHistory.push({ date: date, value: p.value });
            } else {
              const sortedForCheck = [...cashHistory].sort((a, b) => a.date.localeCompare(b.date));
              const latestPoint = sortedForCheck[sortedForCheck.length - 1];
              if (Math.abs(latestPoint.value - p.value) > 0.01) {
                const todayStr = new Date().toISOString().split('T')[0];
                const existingTodayIdx = cashHistory.findIndex(h => h.date === todayStr);
                if (existingTodayIdx >= 0) {
                  cashHistory[existingTodayIdx] = { ...cashHistory[existingTodayIdx], value: p.value };
                } else {
                  cashHistory.push({ date: todayStr, value: p.value });
                  cashHistory.sort((a, b) => a.date.localeCompare(b.date));
                }
              }
            }
            const cashPosWithSyncedHistory = { ...p, history: cashHistory };
            const newCashHistory = updateAssetHistoryWithDelta(cashPosWithSyncedHistory, date, delta);
            const sortedCashHistory = [...newCashHistory].sort((a, b) => a.date.localeCompare(b.date));
            const latestCash = [...sortedCashHistory].reverse().find(h => h.date <= today);
            const currentCashValue = latestCash ? latestCash.value : parseFloat((p.value + (date <= today ? delta : 0)).toFixed(2));
            return { ...p, value: currentCashValue, history: newCashHistory };
          }
          return p;
        });
      }

      currentAssets[idx] = { ...asset, value: currentRealValue, positions, history: updatedHistory };
    };

    if (originalTransaction.type === 'transfer') {
      if (originalTransaction.fromId) applyDeltaToAsset(originalTransaction.fromId, originalTransaction.date, originalTransaction.amount);
      if (originalTransaction.toId) applyDeltaToAsset(originalTransaction.toId, originalTransaction.date, -originalTransaction.amount);
    } else if (originalTransaction.linkedAssetId) {
      let revDelta = originalTransaction.type === 'expense' ? originalTransaction.amount : -originalTransaction.amount;
      applyDeltaToAsset(originalTransaction.linkedAssetId, originalTransaction.date, revDelta);
    }

    if (updatedTransaction.type === 'transfer') {
      if (updatedTransaction.fromId) applyDeltaToAsset(updatedTransaction.fromId, updatedTransaction.date, -updatedTransaction.amount);
      if (updatedTransaction.toId) applyDeltaToAsset(updatedTransaction.toId, updatedTransaction.date, updatedTransaction.amount);
    } else if (updatedTransaction.linkedAssetId) {
      let delta = updatedTransaction.type === 'expense' ? -updatedTransaction.amount : updatedTransaction.amount;
      applyDeltaToAsset(updatedTransaction.linkedAssetId, updatedTransaction.date, delta);
    }

    setAssets(currentAssets);
    saveAssets(currentAssets);
    const newTxList = transactions.map(t => t.id === updatedTransaction.id ? updatedTransaction : t);
    setTransactions(newTxList);
    saveTransactions(newTxList);
  };

  const handleDeleteTransaction = (transactionId) => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return;
    
    let currentAssets = [...assets];
    const today = new Date().toISOString().split('T')[0];

    const applyDeltaToAsset = (assetId, date, delta) => {
      const idx = currentAssets.findIndex(a => a.id.toString() === assetId.toString());
      if (idx === -1) return;
      const asset = currentAssets[idx];
      
      const updatedHistory = updateAssetHistoryWithDelta(asset, date, delta);
      const sortedHistory = [...updatedHistory].sort((a, b) => a.date.localeCompare(b.date));
      const latestPastOrPresent = [...sortedHistory].reverse().find(h => h.date <= today);
      const currentRealValue = latestPastOrPresent ? latestPastOrPresent.value : asset.value;

      const isComposite = asset.type !== 'liquidite';
      let positions = asset.positions || [];
      
      if (isComposite) {
        if (!positions.some(p => p.isCash)) {
          positions.push({ id: 'cash_pouch', name: '💰 Espèces', value: 0, isCash: true, history: [] });
        }
        positions = positions.map(p => {
          if (p.isCash) {
            // FIX : Synchronisation de l'historique du Cash (même logique que handleCreateTransaction)
            let cashHistory = [...(p.history || [])];
            if (cashHistory.length === 0) {
              cashHistory.push({ date: date, value: p.value });
            } else {
              const sortedForCheck = [...cashHistory].sort((a, b) => a.date.localeCompare(b.date));
              const latestPoint = sortedForCheck[sortedForCheck.length - 1];
              if (Math.abs(latestPoint.value - p.value) > 0.01) {
                const todayStr = new Date().toISOString().split('T')[0];
                const existingTodayIdx = cashHistory.findIndex(h => h.date === todayStr);
                if (existingTodayIdx >= 0) {
                  cashHistory[existingTodayIdx] = { ...cashHistory[existingTodayIdx], value: p.value };
                } else {
                  cashHistory.push({ date: todayStr, value: p.value });
                  cashHistory.sort((a, b) => a.date.localeCompare(b.date));
                }
              }
            }
            const cashPosWithSyncedHistory = { ...p, history: cashHistory };
            const newCashHistory = updateAssetHistoryWithDelta(cashPosWithSyncedHistory, date, delta);
            const sortedCashHistory = [...newCashHistory].sort((a, b) => a.date.localeCompare(b.date));
            const latestCash = [...sortedCashHistory].reverse().find(h => h.date <= today);
            const currentCashValue = latestCash ? latestCash.value : parseFloat((p.value + (date <= today ? delta : 0)).toFixed(2));
            return { ...p, value: currentCashValue, history: newCashHistory };
          }
          return p;
        });
      }

      currentAssets[idx] = { ...asset, value: currentRealValue, positions, history: updatedHistory };
    };

    if (transaction.type === 'transfer') {
        if (transaction.fromId) applyDeltaToAsset(transaction.fromId, transaction.date, transaction.amount);
        if (transaction.toId) applyDeltaToAsset(transaction.toId, transaction.date, -transaction.amount);
    } else if (transaction.linkedAssetId) {
       let reverseDelta = transaction.type === 'expense' ? transaction.amount : -transaction.amount;
       applyDeltaToAsset(transaction.linkedAssetId, transaction.date, reverseDelta);
    }

    const newTransactions = transactions.filter(t => t.id !== transactionId);
    setTransactions(newTransactions);
    saveTransactions(newTransactions);
    setAssets(currentAssets);
    saveAssets(currentAssets);
  };

  const handleDeleteAsset = (assetId) => {
    if (!user) return;
    
    // 1. Supprimer l'actif
    const newAssets = assets.filter(a => a.id !== assetId);
    setAssets(newAssets);
    saveAssets(newAssets);

    // 2. Supprimer TOUTES les transactions liées en cascade
    const newTransactions = transactions.filter(t => 
      t.linkedAssetId !== assetId && 
      t.fromId !== assetId && 
      t.toId !== assetId
    );
    
    if (newTransactions.length !== transactions.length) {
      setTransactions(newTransactions);
      saveTransactions(newTransactions);
    }
  };

  const handleRestoreBackup = async (backupData) => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Restaurer les Assets [cite: 412]
      if (backupData.assets) {
        await handleSetAssets(backupData.assets);
      }
      // 2. Restaurer les Transactions [cite: 412]
      if (backupData.transactions) {
        await handleSetTransactions(backupData.transactions);
      }
      // 3. Restaurer le profil si présent 
      if (backupData.profile) {
        await handleUpdateProfile(backupData.profile);
      }
      alert("Restauration terminée avec succès !");
    } catch (error) {
      console.error("Erreur lors de la restauration:", error);
      alert("Une erreur est survenue lors de la restauration.");
    } finally {
      setLoading(false);
    }
  };

  const triggerMonthlyProcess = async (currentUser, profile, monthKey, isManual = false) => {
    if (!assets || !transactions) return;

    // --- 1. CALCUL DES KPIs DU MOIS ---
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const monthLabel = startOfMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

    // Patrimoine global
    const totalPatrimoine = assets.reduce((acc, a) => acc + a.value, 0);
    const liquidites = assets.filter(a => a.type === 'liquidite').reduce((acc, a) => acc + a.value, 0);
    const investissements = assets.filter(a => ['investissement', 'crypto', 'immobilier', 'epargne_salariale'].includes(a.type)).reduce((acc, a) => acc + a.value, 0);

    // Évolution mois par mois (via processHistoryData sur 2 mois)
    const evoData = processHistoryData('6M', assets);
    let variationPct = '0.0';
    let variationAbs = 0;
    if (evoData.length >= 2) {
      const current = evoData[evoData.length - 1].totalNet;
      const previous = evoData[evoData.length - 2].totalNet;
      variationAbs = current - previous;
      variationPct = previous !== 0 ? ((variationAbs / Math.abs(previous)) * 100).toFixed(1) : '0.0';
    }

    // Répartition par catégorie
    const repartition = Object.keys(CATEGORY_LABELS).map(type => {
      const val = assets.filter(a => a.type === type).reduce((sum, a) => sum + a.value, 0);
      return { label: CATEGORY_LABELS[type], value: val, pct: totalPatrimoine > 0 ? ((val / totalPatrimoine) * 100).toFixed(1) : '0' };
    }).filter(r => r.value > 0);

    // Top 5 actifs par valeur
    const topActifs = [...assets].sort((a, b) => b.value - a.value).slice(0, 5);

    // Plus-values latentes (comptes d'investissement)
    let totalInvested = 0;
    let totalCurrentValue = 0;
    const pvDetails = [];
    assets.forEach(a => {
      if (a.positions && a.positions.length > 0) {
        const supports = a.positions.filter(p => !p.isCash);
        supports.forEach(p => {
          if (p.totalInvested && p.totalInvested > 0) {
            const pv = p.value - p.totalInvested;
            const pvPct = ((pv / p.totalInvested) * 100).toFixed(1);
            pvDetails.push({ name: p.name, account: a.name, pv, pvPct, value: p.value, invested: p.totalInvested });
            totalInvested += p.totalInvested;
            totalCurrentValue += p.value;
          }
        });
      }
    });
    const totalPV = totalCurrentValue - totalInvested;
    const totalPVPct = totalInvested > 0 ? ((totalPV / totalInvested) * 100).toFixed(1) : '0.0';

    // Budget du mois (revenus vs dépenses)
    const monthTransactions = transactions.filter(t => {
      const d = new Date(t.date);
      return d >= startOfMonth && d <= endOfMonth;
    });
    const revenus = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const depenses = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const epargne = revenus - depenses;
    const tauxEpargne = revenus > 0 ? ((epargne / revenus) * 100).toFixed(0) : '0';

    // Top catégories de dépenses
    const depensesByCategory = {};
    monthTransactions.filter(t => t.type === 'expense').forEach(t => {
      const cat = t.category || 'Autre';
      depensesByCategory[cat] = (depensesByCategory[cat] || 0) + t.amount;
    });
    const topDepenses = Object.entries(depensesByCategory).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // --- 2. CONSTRUCTION DU CONTEXTE POUR L'IA ---
    const dataContext = `
BILAN FINANCIER DU MOIS DE ${monthLabel.toUpperCase()} :

PATRIMOINE :
- Patrimoine Net : ${formatCurrency(totalPatrimoine)}
- Variation mensuelle : ${parseFloat(variationPct) >= 0 ? '+' : ''}${variationPct}% (${variationAbs >= 0 ? '+' : ''}${formatCurrency(variationAbs)})
- Liquidités : ${formatCurrency(liquidites)}
- Actifs investis : ${formatCurrency(investissements)}

RÉPARTITION :
${repartition.map(r => `- ${r.label} : ${formatCurrency(r.value)} (${r.pct}%)`).join('\n')}

TOP 5 ACTIFS :
${topActifs.map(a => `- ${a.name} (${a.institution || 'N/A'}) : ${formatCurrency(a.value)}`).join('\n')}

PLUS-VALUES LATENTES (si investissements) :
- Total investi : ${formatCurrency(totalInvested)}
- Valeur actuelle : ${formatCurrency(totalCurrentValue)}
- Plus-value globale : ${totalPV >= 0 ? '+' : ''}${formatCurrency(totalPV)} (${totalPVPct}%)
${pvDetails.length > 0 ? pvDetails.map(p => `  └─ ${p.name} (${p.account}) : ${p.pv >= 0 ? '+' : ''}${formatCurrency(p.pv)} (${p.pvPct}%)`).join('\n') : '  Aucun support en portefeuille.'}

BUDGET DU MOIS :
- Revenus : ${formatCurrency(revenus)}
- Dépenses : ${formatCurrency(depenses)}
- Épargne nette : ${formatCurrency(epargne)} (Taux d'épargne : ${tauxEpargne}%)
${topDepenses.length > 0 ? 'Top dépenses :\n' + topDepenses.map(([cat, val]) => `  - ${cat} : ${formatCurrency(val)}`).join('\n') : '  Aucune dépense enregistrée.'}

PROFIL :
- ${profile.firstName || 'Utilisateur'}, Risque : ${profile.riskProfile || 'Equilibré'}, Objectif : ${profile.financialGoal || 'Indépendance'}
- Revenu mensuel déclaré : ${profile.monthlyIncome ? formatCurrency(Number(profile.monthlyIncome)) : 'Non précisé'}
`;

    const systemPrompt = `Tu es le Conseiller Patrimonial IA de MyWealth.io. Tu rédiges un rapport mensuel envoyé par email.

OBJECTIF : Rédiger une analyse personnalisée du mois écoulé. Le rapport doit être clair, structuré, et apporter une vraie valeur ajoutée à l'utilisateur.

STRUCTURE OBLIGATOIRE DU RAPPORT (respecte cet ordre) :
1. RÉSUMÉ DU MOIS (2-3 phrases synthétiques : patrimoine, tendance, fait marquant)
2. ANALYSE DU PATRIMOINE (variation, ce qui a bougé et pourquoi)
3. FOCUS INVESTISSEMENTS (plus-values, performances des supports, recommandation si pertinent)
4. BUDGET & DÉPENSES (revenus vs dépenses, taux d'épargne, postes principaux, alerte si dérapage)
5. CONSEIL DU MOIS (1 action concrète et personnalisée à réaliser avant le mois prochain)

RÈGLES DE FORMAT :
- HTML UNIQUEMENT pour l'email. Utilise <b>, <br/>, <ul>/<li>, <span style="color:...">.
- JAMAIS de Markdown (pas de **, ##, -, etc.)
- Utilise <span style="color:#10b981"> pour les chiffres positifs et <span style="color:#ef4444"> pour les négatifs.
- Sois concis : 15-20 lignes max au total.
- Tutoie l'utilisateur, sois direct et bienveillant.
- N'invente aucun chiffre. Utilise uniquement les données fournies.`;

    let aiSummary;
    try {
      aiSummary = await callGeminiAPI(systemPrompt, [], dataContext);
    } catch (e) {
      aiSummary = `Une erreur est survenue : ${e.message}`;
    }

    // --- 3. CONSTRUCTION DU CONTENU HTML DU RAPPORT ---
    const reportHTML = `
<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 10px;">
  
  <div style="text-align: center; margin-bottom: 25px;">
    <h2 style="margin: 0; color: #0f172a; font-size: 22px;">Bilan Patrimonial</h2>
    <p style="margin: 5px 0 0 0; font-size: 32px; font-weight: 800; color: #2563eb;">${formatCurrency(totalPatrimoine)}</p>
    <p style="margin: 5px 0 0 0; font-size: 14px; font-weight: 600; color: ${parseFloat(variationPct) >= 0 ? '#10b981' : '#ef4444'};">
      ${parseFloat(variationPct) >= 0 ? '▲' : '▼'} ${parseFloat(variationPct) >= 0 ? '+' : ''}${variationPct}% ce mois (${variationAbs >= 0 ? '+' : ''}${formatCurrency(variationAbs)})
    </p>
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 25px; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
    <tr>
      <td width="33%" align="center" style="padding: 15px 5px; border-right: 1px solid #e2e8f0;">
        <p style="margin: 0; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Liquidités</p>
        <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: 700; color: #0f172a;">${formatCurrency(liquidites)}</p>
      </td>
      <td width="33%" align="center" style="padding: 15px 5px; border-right: 1px solid #e2e8f0;">
        <p style="margin: 0; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Investis</p>
        <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: 700; color: #0f172a;">${formatCurrency(investissements)}</p>
      </td>
      <td width="33%" align="center" style="padding: 15px 5px;">
        <p style="margin: 0; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Plus-value</p>
        <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: 700; color: ${totalPV >= 0 ? '#10b981' : '#ef4444'};">${totalPV >= 0 ? '+' : ''}${formatCurrency(totalPV)}</p>
      </td>
    </tr>
  </table>

  ${revenus > 0 || depenses > 0 ? `
  <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
    <h3 style="margin: 0 0 10px 0; font-size: 13px; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">Flux du mois</h3>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="50%" style="padding-bottom: 8px;">
          <span style="font-size: 13px; color: #64748b;">Revenus</span><br/>
          <strong style="font-size: 14px; color: #10b981;">${formatCurrency(revenus)}</strong>
        </td>
        <td width="50%" style="padding-bottom: 8px;">
          <span style="font-size: 13px; color: #64748b;">Dépenses</span><br/>
          <strong style="font-size: 14px; color: #ef4444;">${formatCurrency(depenses)}</strong>
        </td>
      </tr>
      <tr>
        <td colspan="2" style="padding-top: 8px; border-top: 1px dashed #cbd5e1;">
          <span style="font-size: 13px; color: #64748b;">Épargne générée :</span> 
          <strong style="font-size: 14px; color: #0f172a;">${formatCurrency(epargne)}</strong> 
          <span style="font-size: 12px; color: #94a3b8;">(${tauxEpargne}%)</span>
        </td>
      </tr>
    </table>
    ${topDepenses.length > 0 ? `<p style="margin: 10px 0 0 0; font-size: 12px; color: #64748b;"><strong>Top dépenses :</strong> ${topDepenses.map(([cat, val]) => `${cat} (${formatCurrency(val)})`).join(', ')}</p>` : ''}
  </div>` : ''}

  <div style="margin-top: 25px;">
    <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #0f172a; border-bottom: 2px solid #2563eb; display: inline-block; padding-bottom: 4px;">Analyse & Conseils</h3>
    <div style="font-size: 14px; line-height: 1.6; color: #334155;">
      ${aiSummary}
    </div>
  </div>

</div>`;

    const backupJSON = JSON.stringify({ assets, transactions, profile, date: monthKey });

    try {
      await emailjs.send("service_htd01wn", "template_ac5mdxf", {
        to_email: profile.email || currentUser.email,
        user_name: profile.firstName,
        month: monthLabel,
        report_content: reportHTML,
        backup_data: backupJSON
      });

      if (!isManual) {
        const profileRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'profile', 'info');
        await setDoc(profileRef, { lastMonthlyReportDate: monthKey }, { merge: true });
        setUserProfile(prev => ({ ...prev, lastMonthlyReportDate: monthKey }));
      }

      showToast(isManual ? "Votre rapport a été envoyé par mail !" : "Nouveau bilan mensuel généré et envoyé !");
    } catch (error) {
      console.error("Erreur lors du processus :", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 bg-slate-50">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <LoginScreen
        onLogin={handleLogin}
        onEmailLogin={handleEmailLogin}
        onEmailRegister={handleEmailRegister}
        onGoogleLogin={handleGoogleLogin}
        onForgotPassword={handleForgotPassword}
      />
    );
  }

  return (
    <div className={`min-h-screen bg-slate-100 text-slate-900 font-sans pb-20 md:pb-0 ${tourState.run ? `tour-${tourState.key}-step-${tourState.stepIndex}` : ''}`}>
      <Joyride
        steps={tourState.steps}
        run={tourState.run}
        stepIndex={tourState.stepIndex}
        continuous={true}
        showSkipButton={true}
        callback={handleJoyrideCallback}
        tooltipComponent={CustomTooltip}
        disableOverlayClose={true}
        disableScrolling={false}
        spotlightPadding={8}
        floaterProps={{ 
          disableAnimation: true,
          preventOverflow: { boundariesElement: 'window' }
        }}
        styles={{
          options: {
            zIndex: 10000,
            overlayColor: 'rgba(15, 23, 42, 0.75)', /* Voile adouci pour laisser deviner l'application derrière */
          },
          spotlight: {
            backgroundColor: 'rgba(255, 255, 255, 0.3)', /* Effet "lampe torche" pour illuminer l'élément assombri par le navigateur */
            border: '2px solid rgba(255, 255, 255, 0.9)', /* Bordure blanche physique */
            borderRadius: '16px',
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.8)' /* Lueur bleue intense tout autour */
          }
        }}
      />
      <style>{`
        /* Animation lumineuse (Glow) renforcée pour forcer l'affichage */
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 1); }
          70% { box-shadow: 0 0 0 15px rgba(255, 255, 255, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
        }
        .tour-intro-step-6 .tour-start-btn,
        .tour-assets_add-step-0 .tour-add-asset,
        .tour-assets_form-step-1 .tour-asset-form-submit,
        .tour-assets_eye-step-0 .tour-asset-eye,
        .tour-budget-step-5 .tour-calendar-btn {
          animation: pulse-ring 1.5s cubic-bezier(0.2, 0, 0.2, 1) infinite !important;
          /* Protection extrême contre l'assombrissement forcé (ex: Samsung Internet) */
          background-color: #2563eb !important; 
          color: #ffffff !important;
          color-scheme: light only !important; /* Interdit au navigateur d'appliquer son mode sombre ici */
          -webkit-filter: none !important;
          filter: none !important;
          position: relative !important;
          z-index: 10001 !important;
          outline: 2px solid #93c5fd !important;
          outline-offset: 2px;
        }

        /* Force l'affichage de la barre d'action (Oeil) pendant l'étape correspondante */
        .tour-assets_eye-step-0 .tour-asset-row-actions {
          display: flex !important;
        }

        /* Barre de défilement personnalisée pour toute l'app */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1; /* slate-300 */
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8; /* slate-400 */
        }

        /* Masquer la barre de défilement pour les éléments épurés */
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        /* Amélioration du défilement global */
        * {
          scrollbar-color: #cbd5e1 transparent;
          scrollbar-width: thin;
        }
      `}</style>
      <InactivityModal isOpen={showAutoLogoutModal} onStayConnected={confirmPresence} />

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userProfile={userProfile}
        onUpdate={handleUpdateProfile}
        assets={assets}
        transactions={transactions}
        onRestore={handleRestoreBackup}
        onSendReport={() => {
          const today = new Date();
          const monthKey = `${today.getFullYear()}-${today.getMonth() + 1}`;
          triggerMonthlyProcess(user, userProfile, monthKey + " (Manuel)", true);
        }}
      />

      {/* TOP NAVIGATION (DESKTOP) */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-20 px-4 md:px-8 hidden md:block">
        <div className="max-w-7xl mx-auto h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg text-white"><TrendingUp size={20} /></div>
            <span className="font-bold text-xl tracking-tight text-slate-800">MyWealth<span className="text-blue-600">.io</span></span>
          </div>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg overflow-x-auto">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'assets', label: 'Patrimoine', icon: Wallet },
              { id: 'budget', label: 'Budget & Flux', icon: ArrowRightLeft },
              { id: 'advisor', label: 'Conseiller IA ✨', icon: Sparkles, magic: true }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tour-tab-desktop-${tab.id} flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm' : tab.magic ? 'text-indigo-600 hover:bg-indigo-50' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <tab.icon size={16} className={tab.magic ? "text-indigo-500" : ""} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {userProfile ? (
              <button onClick={() => setIsProfileModalOpen(true)} className="tour-profile-desktop flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-full font-medium border border-slate-200 hover:bg-slate-100 transition-colors">
                <User size={12} className="text-blue-500" /> {userProfile.firstName}
              </button>
            ) : (
              <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full font-medium"><Cloud size={12} /> Sauvegardé</div>
            )}
            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Déconnexion"><LogOut size={20} /></button>
          </div>
        </div>
      </nav>

      {/* MOBILE TOP BAR */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-20 px-4 h-14 flex items-center justify-between md:hidden">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-1.5 rounded-lg text-white"><TrendingUp size={18} /></div>
          <span className="font-bold text-lg text-slate-800">MyWealth</span>
        </div>
        <div className="flex items-center gap-2">
          {userProfile && (
            <button onClick={() => setIsProfileModalOpen(true)} className="tour-profile-mobile p-2 bg-slate-50 rounded-full text-blue-600">
              <User size={18} />
            </button>
          )}
          <button onClick={handleLogout} className="p-2 text-slate-400"><LogOut size={18} /></button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">
        {activeTab === 'dashboard' && <DashboardView assets={assets} transactions={transactions} setActiveTab={setActiveTab} onDeleteTransaction={handleDeleteTransaction} userProfile={userProfile} />}
        {activeTab === 'assets' && <AssetsView assets={assets} setAssets={handleSetAssets} transactions={transactions} onDeleteAsset={handleDeleteAsset} />}
        {activeTab === 'budget' && (
          <BudgetView
            transactions={transactions}
            assets={assets}
            onAddTransaction={handleCreateTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onUpdateTransaction={handleUpdateTransaction}
          />
        )}
        {activeTab === 'advisor' && (
          <AiAdvisorView 
            assets={assets} 
            transactions={transactions} 
            userProfile={userProfile} 
            messages={chatMessages} 
            setMessages={setChatMessages} 
          />
        )}
      </main>

      {/* BOTTOM NAVIGATION (MOBILE) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around items-center h-[72px] pb-1">
          {[
            { id: 'dashboard', label: 'Accueil', icon: LayoutDashboard },
            { id: 'assets', label: 'Actifs', icon: Wallet },
            { id: 'budget', label: 'Budget', icon: ArrowRightLeft },
            { id: 'advisor', label: 'Conseil', icon: Sparkles, magic: true }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tour-tab-mobile-${tab.id} flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === tab.id ? 'text-blue-600' : 'text-slate-400'}`}
            >
              <tab.icon size={20} className={activeTab === tab.id ? (tab.magic ? "text-indigo-500" : "text-blue-600") : ""} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
      {toast && <Toast message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}