# Assistant de Fiche Terrain — BCECO / PDL-145T

Application web progressive (PWA) de collecte de données terrain, de suivi-évaluation des ouvrages d’infrastructures et de génération automatisée de rapports consolidés pour le programme **BCECO / PDL-145T** en République Démocratique du Congo.

> **AVERTISSEMENT — DONNÉES DE DÉMONSTRATION**
> L’ensemble des chantiers, entreprises, comptes utilisateurs et fiches préchargés dans ce prototype sont **strictement fictifs** (`MODE DÉMONSTRATION`). Aucune donnée contractuelle officielle du BCECO ou du PDL-145T n’a été inventée ni altérée.

---

## 1. Architecture du projet

- **Frontend** : React 19, TypeScript, Vite, Tailwind CSS v4, Recharts, Lucide Icons.
- **PWA & Hors ligne** : `vite-plugin-pwa` (Workbox Service Worker), stockage local persistant **IndexedDB** (`idb`) pour le cache des chantiers affectés, les brouillons locaux, la file de synchronisation, les photographies compressées et le journal de synchronisation.
- **Couche d’accès aux données découplée (Repository Pattern)** :
  - `FirebaseRepository` : Cloud Firestore + Firebase Authentication (Google) protégé par des règles de sécurité RBAC (`firestore.rules`).
  - `DemoApiRepository` : Adaptateur de démonstration isolé (`server.ts` Express sous `/api/demo/*`) avec jetons signés HMAC et contrôle d’accès strict côté serveur (`401`/`403`) pour tester immédiatement les profils Coordonnateur et Agents de Terrain sans exposition de secrets.
- **Moteur d’exportation** : SheetJS (`xlsx`) pour Excel multi-onglets, génération CSV UTF-8 BOM (compatible Excel français), et `jsPDF` + `jspdf-autotable` pour les rapports PDF consolidés et l’Annexe Terrain (Feuille de Route Multi-Chantiers).

---

## 2. Modèle métier à deux rôles exclusifs

1. **AGENT DE TERRAIN** (`AGENT_TERRAIN`) :
   - Accède uniquement à ses chantiers activement affectés.
   - Remplit le questionnaire officiel en 5 sections (Identification verrouillée + GPS, Avancement physique/financier TEP/TEF avec justification obligatoire si `|TEP − TEF| > 10 pts`, Contraintes & Alertes, Réceptions RT/RP/RD + Photos compressées, Signature).
   - Enregistre des brouillons hors ligne, soumet en mode hors ligne (file IndexedDB) et synchronise au retour de la connexion.
   - Corrige et resoumet les fiches retournées par le Coordonnateur (historique de versions conservé).
2. **COORDONNATEUR** (`COORDINATEUR`) :
   - Accède au tableau de bord national (12 KPI dynamiques, filtres multi-critères, graphiques, alertes écarts TEP/TEF > 10 % et contraintes non résolues).
   - Consulte le Registre Officiel des Ouvrages (21 colonnes de la Matrice Unique) et audite tout classeur Excel/CSV avant importation (détection des identifiants manquants, doublons, fiches incomplètes, valeurs incohérentes).
   - Gère les comptes agents et les affectations (`GESTION DES AFFECTATIONS` : affectation multiple, réaffectation et clôture sans suppression des fiches historiques).
   - Contrôle, met en vérification, valide ou retourne les fiches terrain (commentaire obligatoire en cas de retour).
   - Génère et archive les rapports consolidés journaliers, hebdomadaires et mensuels (Excel, CSV, PDF et Annexe Feuille de Route).

---

## 3. Comptes de démonstration (Adaptateur isolé)

| Profil | E-mail | Mot de passe | Périmètre |
| :--- | :--- | :--- | :--- |
| **Coordonnateur National** | `coordinateur.demo@pd145t.test` | `Demo2026!` | Registre national (24 ouvrages), Affectations, Validation, Rapports |
| **Agent de Terrain 1** | `agent1.demo@pd145t.test` | `Demo2026!` | Haut-Katanga & Lualaba (chantiers affectés uniquement) |
| **Agent de Terrain 2** | `agent2.demo@pd145t.test` | `Demo2026!` | Haut-Lomami & Haut-Katanga (chantiers affectés uniquement) |
| **Agent de Terrain 3** | `agent3.demo@pd145t.test` | `Demo2026!` | Tanganyika, Kasaï-Central & Kongo-Central |

---

## 4. Installation et exécution locale

```bash
npm install
npm run dev
```

L’application démarre le serveur Express + Vite sur `http://localhost:3000`.

### Build et production

```bash
npm run build
npm start
```

---

## 5. Configuration Firebase & Règles de sécurité

- La configuration Firebase du projet est stockée dans `firebase-applet-config.json`.
- Le schéma des collections est documenté dans `firebase-blueprint.json` et les règles de sécurité déployées se trouvent dans `firestore.rules`.
- Les règles appliquent le principe du moindre privilège :
  - Un agent ne peut lire que les ouvrages dont son UID figure dans `assignedAgentIds`, et ne peut jamais modifier les champs contractuels d’un ouvrage ni créer des rapports consolidés.
  - Les journaux d’audit sont immuables (écriture seule, aucune modification ni suppression).
- **Recommandation avant déploiement en production élargie** : auditez, testez avec l’émulateur Firebase et renforcez `firestore.rules` selon votre politique interne de gestion des identités (par exemple via des Custom Claims Firebase Auth pour les rôles).

---

## 6. Fonctionnement hors ligne (PWA)

- L’application est installable sur mobile (Android / iOS) et ordinateur grâce au Web App Manifest et au Service Worker Workbox.
- Lorsqu’un agent se connecte en ligne, ses chantiers affectés sont automatiquement mis en cache dans **IndexedDB**.
- En perte de réseau (ou via le bouton **Simuler mode hors ligne** dans l’onglet *Synchronisation*), l’agent peut consulter ses chantiers, rédiger des fiches, joindre des photos compressées et enregistrer en file locale.
- Au retour de la connectivité, la file est transmise automatiquement avec gestion des réessais, détection de doublons potentiels et préservation des données en cas de conflit d’affectation (`CONFLIT_AFFECTATION`).

---

## 7. Limites connues du prototype

- En mode Adaptateur Démo (`/api/demo/*`), les données sont persistées localement dans un fichier JSON temporaire du serveur (`/tmp/bceco-pdl145t-demo-store-v1.json`) pour faciliter les tests immédiats. Pour une persistance cloud multi-utilisateurs, utilisez la connexion **Firebase Authentication (Google)** reliée à Cloud Firestore.
- L’authentification par e-mail/mot de passe en production nécessite l’activation du fournisseur Email/Password dans la console Firebase Auth et l’attribution sécurisée des rôles côté serveur.
