// ============================================================
//  CONFIGURATION — le seul fichier à compléter (voir LISEZMOI.md, étape 3)
// ============================================================
self.FIREBASE_CONFIG = {
  // Copié depuis la console Firebase : Paramètres du projet › Vos applications › Config
  firebase: {
    apiKey: "AIzaSyCOwIVr0Bm3zcdBI9uwhuSx3iRVBd1bGgY",
    authDomain: "taguage-mondial.firebaseapp.com",
    projectId: "taguage-mondial",
    storageBucket: "taguage-mondial.firebasestorage.app",
    messagingSenderId: "844654305127",
    appId: "1:844654305127:web:6c20b9be44f35d270619c2"
  },
  // Console Firebase : Paramètres du projet › Cloud Messaging › Certificats Web Push › « Paire de clés »
  vapidKey: "BP_bx5XZWmpmOUYK63o_u_5O0qtRu3qyRVLQ2lLd30B9KQkyD2JosOm0xpwVt541IJyX6um_MRZzfpOhI85dyKE",

  // Les deux comptes créés à l'étape 2 (Authentication). Ne changer que si tu as choisi d'autres adresses.
  // Si tu changes emailAdmin, change-le aussi dans firestore.rules.
  emailCellule: "cellule@taguage-mondial.app",
  emailAdmin: "admin@taguage-mondial.app"
};
