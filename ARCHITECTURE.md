# Architecture de MyWealth

## Infrastructure Actuelle
- **Frontend :** React + Vite
- **Hébergement Frontend :** Vercel (Production sur la branche `main`, Recette sur les branches secondaires via les Previews).
- **Backend / Base de données :** Firebase (Authentication + Firestore)
- **Environnements Firebase :**
  - Production : `nodejsfinary`
  - Recette : `nodejsfinary-staging`

## Choix Techniques & Sécurité
- Les variables d'environnement (`VITE_FIREBASE_*`) sont gérées publiquement par Vercel, tandis que les clés d'API sensibles (ex: clés bancaires) doivent rester invisibles côté frontend.
- **Sécurité Base de Données :** L'accès à Firestore est conditionné par des `firestore.rules` strictes (un utilisateur ne peut lire/écrire que dans `/users/{userId}`).

## Connecteur Bancaire (En cours de décision)
- Objectif : Récupération automatisée et gratuite des transactions et des soldes.
- Intégration prévue via une API "Headless" (ex: GoCardless) avec appels S2S (Server-to-Server) pour protéger les clés.
