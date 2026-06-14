# 🔒 Guide de Migration de Sécurité - MyWealth

## Résumé des Correctifs Applicables

Toutes les failles de sécurité critiques ont été identifiées et des correctifs ont été préparés. Suivez les étapes ci-dessous pour appliquer les corrections.

---

## 📋 Étape 1: Installer les nouvelles dépendances

Ouvrez un terminal dans le dossier du projet et exécutez :

```bash
npm install dompurify
```

> **Note :** La dépendance `tailwind` (v2.3.1) a été **supprimée** car elle est obsolète et inutile (vous utilisez `tailwindcss` v3 dans devDependencies).

---

## 📋 Étape 2: Déplacer les règles Firestore

Les règles de sécurité Firestore ont été créées dans `public/.firestore.rules`.

Pour les déployer :

```bash
firebase deploy --only firestore:rules
```

> **Important :** Assurez-vous que le fichier `firestore.rules` dans le dossier racine pointe vers le bon fichier dans `firestore.rules: "public/.firestore.rules"`.

---

## 📋 Étape 3: Mettre à jour App.jsx

Le fichier `src/App.jsx` doit être modifié pour :

### A. Utiliser les variables d'environnement

Remplacez les clés API en dur par les imports de `ENV_CONFIG` :

```javascript
// AVANT (INCORRECT - Clés en dur)
const apiKey = "AIzaSyCjcJoVxEkJG76D1yUb45175528730";
emailjs.init("OvbeXwPPROzqE2kQL");
const firebaseConfig = {
  apiKey: "AIzaSyD3EFbSF-t0j3a6cXi-P1RYPe5sc-Yvk5c",
  // ...
};

// APRÈS (CORRECT - Variables d'environnement)
import ENV_CONFIG from './config/environment';
const apiKey = ENV_CONFIG.GEMINI_API_KEY;
emailjs.init(ENV_CONFIG.EMAILJS_PUBLIC_KEY);
const firebaseConfig = ENV_CONFIG.FIREBASE_CONFIG;
```

### B. Ajouter DOMPurify pour sanitiser le contenu HTML

Ajoutez l'import en haut du fichier :

```javascript
import DOMPurify from 'dompurify';
```

Modifiez la fonction `parseContent` dans le composant `MessageBubble` :

```javascript
// AVANT (VULNÉRABLE XSS)
const parseContent = (text) => {
  if (!text) return "";
  if (isUser) return text;
  const cleanText = formatAiResponse(text);
  // ... retourne du HTML non sécurisé
};

// APRÈS (SÉCURISÉ avec DOMPurify)
const parseContent = (text) => {
  if (!text) return "";
  if (isUser) return DOMPurify.sanitize(text);
  
  const cleanText = formatAiResponse(text);
  
  // Sanitise le HTML avant de le retourner
  const sanitizedHtml = DOMPurify.sanitize(cleanText, {
    ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'u', 's', 'ul', 'ol', 'li', 'p', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOWED_SCHEMA: ['http', 'https'],
    KEEP_SAFELISTED_PROPS: [],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'button', 'img', 'video', 'audio', 'link', 'meta', 'style']
  });
  
  return sanitizedHtml.split('\n').map((line, index) => {
    // ... même logique que précédemment
  });
};
```

### C. Valider les inputs utilisateur

Ajoutez une fonction de validation côté client :

```javascript
// Fonction de validation des entrées utilisateur
const validateInput = (value, maxLength = 200, pattern = /^[a-zA-Z0-9\u00C0-\u024F\s\-'.@,;:!?$/+&*#()\-_]+$/) => {
  if (!value || typeof value !== 'string') return { valid: false, error: 'Valeur invalide' };
  const trimmed = value.trim();
  if (trimmed.length === 0) return { valid: false, error: 'Champ requis' };
  if (trimmed.length > maxLength) return { valid: false, error: `Maximum ${maxLength} caractères` };
  return { valid: true, value: trimmed };
};

// Utilisation dans les handlers
const handleAddPosition = (e) => {
  e.preventDefault();
  const validation = validateInput(newPosition.name, 50);
  if (!validation.valid) {
    alert(validation.error);
    return;
  }
  // ... reste du code
};
```

### D. Authentifier avec Gmail/Google au lieu d'anonyme

Dans les imports Firebase :

```javascript
// Ajoutez ces imports
import { 
  // ... imports existants
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
```

Remplacez la connexion anonyme par Google Sign-In :

```javascript
// AVANT (VULNÉRABLE)
const result = await signInAnonymously(auth);

// APRÈS (SÉCURISÉ)
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');
const result = await signInWithPopup(auth, googleProvider);
```

---

## 📋 Étape 4: Déployer les règles Firestore

```bash
firebase deploy --only firestore:rules
```

Vérifiez le déploiement :

```bash
firebase firestore:rules:list
```

---

## 📋 Étape 5: Vérifications post-déploiement

### Tests de sécurité manuels

1. **Vérifier les clés API** :
   - Ouvrez le navigateur → Inspecter → Réseau
   - Confirmez que les clés ne sont pas exposées dans les requêtes

2. **Tester XSS** :
   - Essayez de saisir `<script>alert('XSS')</script>` dans les champs de saisie
   - Vérifiez que le script n'est pas exécuté

3. **Tester les règles Firestore** :
   - Essayez d'accéder aux données d'un autre utilisateur
   - Vérifiez que l'accès est refusé

4. **Vérifier les logs de console** :
   - Aucune clé API ne doit apparaître dans les logs

---

## 📋 Étape 6: Options avancées (recommandé)

### Option A: Utiliser Firebase Cloud Functions pour masquer l'API Gemini

Créez une Cloud Function pour appeler Gemini API :

```javascript
// functions/src/gemini.ts
import * {https} from 'firebase-functions';
import {GenAI} from '@google-cloud/genai';

const genAI = new GenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const analyzeWithGemini = https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new Error('Non autorisé');
  }
  
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const result = await model.generateContent(data.prompt);
  return result.response.text();
});
```

Côté client :

```javascript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions(app);
const analyze = httpsCallable(functions, 'analyzeWithGemini');

const result = await analyze({ prompt: 'Analyse du patrimoine' });
```

### Option B: Utiliser Firebase Security Rules pour limiter les requêtes

Ajoutez ces limites dans les règles :

```javascript
// Limiter le nombre de writes par seconde
function isRateLimited() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.writeRateLimit != null;
}
```

---

## 📁 Fichiers Créés/Modifiés

| Fichier | Description |
|---------|-------------|
| `src/config/environment.js` | Configuration centralisée des variables d'environnement |
| `.env.local` | Variables d'environnement locales (ne pas push sur GitHub) |
| `public/.firestore.rules` | Règles de sécurité Firestore |
| `package.json` | Ajout de DOMPurify, suppression de `tailwind` |
| `plans/SECURITY_FIXES.md` | Ce fichier (guide de migration) |

---

## ⚠️ Fichiers à Ajouter à .gitignore

Assurez-vous que `.env.local` est dans votre `.gitignore` :

```gitignore
# Variables d'environnement
.env
.env.local
.env.*.local
```

---

## ✅ Checklist de Sécurité Finale

- [ ] Clés API移ées dans `.env.local`
- [ ] DOMPurify intégré pour XSS
- [ ] Authentification Google Sign-In implémentée
- [ ] Règles Firestore déployées
- [ ] Validation des inputs côté client
- [ ] `.env.local` dans `.gitignore`
- [ ] `tailwind` (v2.3.1) supprimé du package.json
- [ ] Tests de sécurité manuels effectués

---

## 🚀 Prochaines Étapes Recommandées

1. **Immédiat** : Installer les dépendances et déployer les règles Firestore
2. **Court terme** : Remplacer l'authentification anonyme par Google Sign-In
3. **Moyen terme** : Implémenter Cloud Functions pour masquer l'API Gemini
4. **Long terme** : Mettre en place une surveillance des anomalies avec Firebase Extensions