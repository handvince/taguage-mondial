# Taguage Mondial 2027 — installation

Appli web installable (iPhone, Android, Mac, PC) pour répartir le taguage vidéo des matchs du Mondial 2027 entre les membres de la cellule vidéo, avec notifications.

- **Hébergement** : GitHub Pages → `https://handvince.github.io/taguage-mondial/`
- **Données, mot de passe, notifications** : Firebase (Google)
- **Durée totale de l'installation** : environ 30 minutes, une seule fois.

## Contenu du dossier

| Fichier | Rôle |
|---|---|
| `index.html` | L'appli |
| `firebase-config.js` | **Le seul fichier à compléter** (étape 3) |
| `sw.js` | Fonctionnement hors connexion + réception des notifications |
| `manifest.webmanifest`, `icons/` | Installation sur l'écran d'accueil |
| `competition.js` | Export du modèle Excel de compétition et lecture du fichier rempli |
| `calendrier.json` | Les 112 matchs du Mondial 2027, installés au premier lancement |
| `firestore.rules` | Règles de sécurité de la base |
| `functions/` | La fonction qui envoie les notifications |
| `firebase.json` | Réglages de déploiement Firebase |
| `FICHE-COLLABORATEURS.md` | La fiche à envoyer aux collègues |

---

## Étape 1 — Créer le projet Firebase (5 min)

1. Va sur **console.firebase.google.com** avec ton compte Google.
2. **Créer un projet** → nom : `taguage-mondial` → désactive Google Analytics (inutile ici) → Créer.
3. Dans le menu de gauche : **Créer › Firestore Database** → **Créer une base de données**.
   - Emplacement : **`europe-west1 (Belgique)`**. Ce choix est important et définitif : la fonction de notification est réglée sur cette région.
   - Mode : **production** (les vraies règles seront envoyées à l'étape 6).

## Étape 2 — Créer les deux mots de passe (3 min)

1. Menu de gauche : **Créer › Authentication** → **Commencer**.
2. Onglet **Mode de connexion** → **Adresse e-mail/Mot de passe** → active la première option → Enregistrer.
3. Onglet **Utilisateurs** → **Ajouter un utilisateur**, deux fois :

| Adresse e-mail (à recopier exactement) | Mot de passe |
|---|---|
| `cellule@taguage-mondial.app` | Le mot de passe **commun** que tu donneras aux collègues (6 caractères minimum, ex. `Bleus2027!`) |
| `admin@taguage-mondial.app` | **Ton** mot de passe, que tu gardes pour toi |

Ces adresses ne reçoivent aucun mail, elles servent juste d'identifiants. Dans l'appli, on ne tape que le mot de passe :
- avec le mot de passe commun, on peut tout faire sur les matchs ;
- avec le tien, on peut en plus gérer la liste des collaborateurs, le logo et l'installation du calendrier.

4. Onglet **Paramètres** → **Domaines autorisés** → **Ajouter un domaine** → `handvince.github.io`.

## Étape 3 — Récupérer la configuration (5 min)

1. Roue dentée en haut à gauche → **Paramètres du projet** → onglet **Général**.
2. En bas, **Vos applications** → icône **`</>`** (Web) → surnom `Taguage` → **ne coche pas** Firebase Hosting → Enregistrer l'application.
3. Firebase affiche un bloc `const firebaseConfig = { apiKey: "...", ... }`. Ouvre **`firebase-config.js`** dans le Bloc-notes et remplace les six valeurs `A_REMPLACER` du bloc `firebase:` par les tiennes.
4. Toujours dans les paramètres du projet : onglet **Cloud Messaging** → section **Configuration Web › Certificats Web Push** → **Générer une paire de clés**. Copie la clé affichée dans `vapidKey`.
5. Enregistre le fichier.

> Ces valeurs ne sont pas secrètes : toute appli web Firebase les expose. La protection repose sur le mot de passe et sur les règles de l'étape 6.

## Étape 4 — Passer au forfait Blaze (3 min)

L'envoi automatique des notifications utilise une « Cloud Function », qui n'est disponible qu'avec le forfait Blaze (paiement à l'usage).

1. En bas du menu de gauche : **Spark › Mettre à niveau** → **Blaze** → associe une carte bancaire.
2. **Fixe une alerte de budget** quand Firebase le propose (sinon : console.cloud.google.com › Facturation › Budgets et alertes). Mets-la à **1 €**.

Pour 6 personnes et une centaine de matchs, l'usage reste largement dans la part gratuite incluse : la facture attendue est de 0 €. L'alerte te préviendrait du contraire.

## Étape 5 — Mettre l'appli sur GitHub Pages (5 min)

1. Sur **github.com** : **New repository** → nom **`taguage-mondial`** (exactement, sinon voir l'encadré plus bas) → **Public** → Create.
2. **Add file › Upload files** → glisse **tout le contenu** du dossier (`index.html`, `firebase-config.js` complété, `sw.js`, `icons/`, `functions/`…) → **Commit changes**.
3. **Settings › Pages** → *Source* : **Deploy from a branch** → branche **main**, dossier **/ (root)** → Save.
4. Après 1 à 2 minutes, l'appli est en ligne : **https://handvince.github.io/taguage-mondial/**

> Si tu choisis un autre nom de dépôt, change aussi l'adresse `APP_URL` en haut de `functions/index.js`. C'est la page ouverte quand on touche une notification.

## Étape 6 — Envoyer les règles et la fonction de notification (10 min, depuis ton PC)

Il faut **Node.js** sur ton PC. Tu l'as déjà si tu utilises Capacitor ; sinon, installe la version LTS depuis nodejs.org.

1. Récupère le dépôt sur ton PC, avec GitHub Desktop (*Clone repository*) ou le bouton **Code › Download ZIP**.
2. Dans l'Explorateur, ouvre le dossier `taguage-mondial`, clique dans la barre d'adresse, tape `powershell` puis Entrée.
3. Tape ces commandes **une par une** :

```powershell
npm install -g firebase-tools
firebase login
firebase use --add
```

- `firebase login` ouvre le navigateur : connecte-toi avec le même compte Google que pour Firebase.
- `firebase use --add` : choisis le projet `taguage-mondial`, puis tape `default` comme alias.

```powershell
cd functions
npm install
cd ..
firebase deploy --only firestore:rules,functions
```

- Au premier déploiement, Firebase active quelques services Google (2 à 3 minutes) : réponds **Y** si on te le demande.
- S'il te pose une question sur la *cleanup policy*, réponds **Y** et garde la valeur proposée.
- À la fin : `Deploy complete!`.

## Étape 7 — Premier lancement (toi)

1. Ouvre **https://handvince.github.io/taguage-mondial/** et entre **ton** mot de passe (celui d'admin).
2. Le planning est vide : roue dentée → **Installer le Mondial 2027 (112 matchs)**.
3. L'appli demande *Qui es-tu ?* → **Vinc**.
4. Roue dentée :
   - **Compétition** : ajoute le logo, vérifie le titre et le lien ;
   - **Collaborateurs** : vérifie les noms et les couleurs. La case **Statuts** est cochée pour Vinc : c'est elle qui te fait recevoir les changements de statut.
5. Installe l'appli sur ton iPhone (voir la fiche collaborateurs), puis roue dentée → **Activer les notifications**.

## Étape 8 — Inviter les collègues

Envoie-leur trois choses :
- le lien ;
- le **mot de passe commun** ;
- `FICHE-COLLABORATEURS.md` (ou son contenu dans un message).

---

## Changer de compétition

Tout se fait depuis la roue dentée → **Compétition**, avec ton mot de passe d'admin.

1. **Télécharger le modèle vide** pour une nouvelle compétition. Pour repartir de l'actuelle, choisis plutôt **Exporter la compétition actuelle** : le fichier contient déjà les matchs, attributions, statuts et consignes.
2. Remplis le fichier Excel :
   - **Compétition** : nom, sous-titre, lien du site officiel. Pour le logo, copie l'image et colle-la (Ctrl+V) dans cette feuille.
   - **Matchs** : une ligne par match. Seules la date et l'équipe 1 sont obligatoires ; phase, groupe, lieu, « horaire à confirmer », consignes, « attribué à » et statut sont facultatifs.
   - **Équipes** : code → nom complet. Les codes courants sont déjà remplis.
3. **Importer le fichier rempli** : un aperçu affiche le nombre de matchs, la période, le logo et les lignes ignorées. Tu peux corriger le nom avant de valider.
4. **Créer cette compétition et l'afficher** : tout le monde bascule dessus. L'ancienne est archivée : elle reste dans *Toutes les compétitions*, où tu peux la réafficher ou la supprimer.

L'import accepte aussi ton ancien fichier **positionnement_matchs.xlsx** (lignes de dates, « SER URU », groupe, heure, croix par collaborateur), ainsi qu'un simple CSV qui reprend les colonnes de la feuille Matchs.

> Importer une compétition ne déclenche aucune notification. Les collaborateurs sont prévenus seulement des changements faits ensuite.

## Mettre à jour l'appli plus tard

- **Modifier l'appli** : modifie les fichiers sur GitHub (crayon sur le fichier → Commit). Dans `sw.js`, augmente la version (`taguage-v2` → `taguage-v3`) pour que les téléphones récupèrent la nouvelle version au lancement suivant.
- **Modifier la fonction de notification** : refais seulement `firebase deploy --only functions` depuis PowerShell.
- **Changer le mot de passe commun** : Firebase › Authentication › Utilisateurs › `cellule@…` › menu ⋮ › Réinitialiser le mot de passe.

## À savoir

- **iPhone** : les notifications ne fonctionnent que si l'appli a été **ajoutée à l'écran d'accueil** et ouverte depuis son icône (règle d'Apple, iOS 16.4 minimum). Dans Safari seul, pas de notification.
- **Hors connexion** :
  - le planning reste consultable ;
  - les modifications sont gardées sur l'appareil et partent dès que le réseau revient ;
  - la toute première connexion doit se faire avec du réseau.
- **Pas d'historique** : l'appli garde seulement le nom de la dernière personne qui a modifié un match. Tout le monde a les mêmes droits sur les matchs.
- **Notifications envoyées** :

| Événement | Qui est prévenu |
|---|---|
| Nouvelle attribution | La personne concernée |
| Retrait d'un match | La personne concernée |
| Horaire modifié ou confirmé, affiche connue, consigne ajoutée, match supprimé | Les personnes attribuées au match |
| Changement de statut | Les personnes cochées « Statuts » |

  On ne reçoit jamais de notification pour ses propres modifications.
