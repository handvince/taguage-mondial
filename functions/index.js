// Fonction Firebase : à chaque modification d'un match, prévient les personnes concernées.
//  - un collaborateur ajouté sur un match      → « Nouveau match à taguer »
//  - un collaborateur retiré d'un match        → « Match retiré »
//  - date/heure modifiée ou horaire confirmé   → collaborateurs du match
//  - affiche connue (1A → FRA…)                → collaborateurs du match
//  - consigne ajoutée ou modifiée              → collaborateurs du match
//  - match supprimé                            → collaborateurs du match
//  - changement de statut                      → personnes cochées « Statuts » (Vincent)
// L'auteur de la modification (champ "by") n'est jamais notifié de sa propre action.

const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

// Même région que la base Firestore (voir LISEZMOI, étape 1)
setGlobalOptions({ region: "europe-west1", maxInstances: 3 });
initializeApp();

// Adresse de l'appli : un clic sur la notification l'ouvre
const APP_URL = "https://handvince.github.io/taguage-mondial/";

const ST = { todo: "À faire", run: "En cours", ok: "Tagué", done: "Livré", skip: "Pas à taguer" };

function quand(m) {
  if (!m.d) return "";
  const j = new Date(m.d + "T12:00:00Z").toLocaleDateString("fr-FR", {
    weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Paris",
  });
  return m.t ? `${j} ${m.t}` : j;
}
const affiche = (m) => `${m.a || "?"} – ${m.b || "?"}`;

exports.notifierChangement = onDocumentWritten("matches/{id}", async (event) => {
  const before = event.data.before.exists ? event.data.before.data() : null;
  const after = event.data.after.exists ? event.data.after.data() : null;
  if (!before) return; // création (import du calendrier, nouveau match) : pas de notification

  const db = getFirestore();
  const teamSnap = await db.doc("config/team").get();
  const cfg = (teamSnap.exists && teamSnap.data()) || {};
  const team = cfg.list || [];
  // Pas de notification pour une compétition archivée (ex. suppression d'une ancienne compétition)
  const comp = (after || before).c;
  if (comp && cfg.current && comp !== cfg.current) return;
  const nom = (id) => (team.find((r) => r.id === id) || {}).name || id || "Quelqu'un";

  const auteur = (after || before).by || "";
  const msgs = new Map(); // personne -> {title, body}
  const pour = (p, title, body) => {
    if (!p || p === auteur || msgs.has(p)) return; // un seul message par personne, le plus important d'abord
    msgs.set(p, { title, body });
  };

  if (!after) {
    for (const p of before.who || []) pour(p, "Match supprimé", `${affiche(before)} · ${quand(before)}`);
  } else {
    const avant = new Set(before.who || []);
    const apres = new Set(after.who || []);
    const restent = [...apres].filter((p) => avant.has(p));

    for (const p of apres) if (!avant.has(p)) {
      pour(p, "Nouveau match à taguer", `${affiche(after)} · ${quand(after)}${after.note ? " — " + after.note : ""}`);
    }
    for (const p of avant) if (!apres.has(p)) pour(p, "Match retiré", `${affiche(before)} · ${quand(before)} n'est plus pour toi`);

    if (before.d !== after.d || before.t !== after.t) {
      for (const p of restent) pour(p, "Horaire modifié", `${affiche(after)} : ${quand(after)}${after.prov ? " (à confirmer)" : ""}`);
    } else if (before.prov && !after.prov) {
      for (const p of restent) pour(p, "Horaire confirmé", `${affiche(after)} · ${quand(after)}`);
    }
    if (before.a !== after.a || before.b !== after.b) {
      for (const p of restent) pour(p, "Affiche connue", `${affiche(before)} devient ${affiche(after)} · ${quand(after)}`);
    }
    if ((after.note || "") !== (before.note || "") && after.note) {
      for (const p of restent) pour(p, "Consigne de taguage", `${affiche(after)} : ${after.note}`);
    }
    if ((before.st || "todo") !== (after.st || "todo")) {
      for (const r of team) if (r.statusAlerts) {
        pour(r.id, `${ST[after.st] || after.st} : ${affiche(after)}`, `${nom(auteur)} · ${quand(after)}`);
      }
    }
  }
  if (!msgs.size) return;

  // Envoi à tous les appareils de chaque personne
  const tokensSnap = await db.collection("tokens").where("who", "in", [...msgs.keys()].slice(0, 30)).get();
  const envois = [];
  for (const [p, msg] of msgs) {
    const tokens = tokensSnap.docs.filter((d) => d.data().who === p).map((d) => d.id);
    if (!tokens.length) continue;
    envois.push(
      getMessaging()
        .sendEachForMulticast({
          tokens,
          notification: msg,
          webpush: { fcmOptions: { link: APP_URL }, notification: { icon: APP_URL + "icons/icon-192.png" } },
          data: { match: event.params.id },
        })
        .then((res) =>
          // Nettoyage des appareils qui ont désinstallé l'appli ou retiré l'autorisation
          Promise.all(res.responses.map((r, i) => {
            const code = r.error && r.error.code;
            if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token") {
              return db.collection("tokens").doc(tokens[i]).delete();
            }
            return null;
          }))
        )
    );
  }
  await Promise.all(envois);
});
