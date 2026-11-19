// ============================================================
//  Modèle Excel de compétition : export (à remplir) et import (lecture + contrôle)
//  Formats acceptés à l'import :
//   1. le modèle exporté par l'appli (feuilles « Compétition », « Matchs », « Équipes »)
//   2. un simple tableau CSV/Excel avec les colonnes du modèle (Date, Heure, Équipe 1, Équipe 2…)
//   3. l'ancien fichier « positionnement_matchs.xlsx » (lignes de dates, « SER URU », groupe, heure, croix)
// ============================================================

const LIBS = {
  XLSX: "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js",
  JSZip: "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"
};
function loadScript(src) {
  return new Promise((ok, ko) => {
    const s = document.createElement("script");
    s.src = src; s.onload = ok; s.onerror = () => ko(new Error("Bibliothèque introuvable (réseau ?)"));
    document.head.append(s);
  });
}
export async function loadLibs() {
  if (!self.XLSX) await loadScript(LIBS.XLSX);
  if (!self.JSZip) await loadScript(LIBS.JSZip);
}

export const PHASES = { prep: "Préparation", prelim: "Tour préliminaire", main: "Tour principal", pres: "Coupe du Président", ko: "Phase finale" };
export const STATUTS = { todo: "À faire", run: "En cours", ok: "Tagué", done: "Livré", skip: "Pas à taguer" };

// Codes équipes courants (IHF / EHF) proposés dans la feuille « Équipes »
export const CODES = {
  ALG: "Algérie", ANG: "Angola", ARG: "Argentine", AUT: "Autriche", BEL: "Belgique", BIH: "Bosnie-Herzégovine", BRA: "Brésil",
  BRN: "Bahreïn", CAN: "Canada", CHI: "Chili", CHN: "Chine", CPV: "Cap-Vert", CRO: "Croatie", CUB: "Cuba", CZE: "Tchéquie",
  DEN: "Danemark", EGY: "Égypte", ESP: "Espagne", FAR: "Îles Féroé", FIN: "Finlande", FRA: "France", GBR: "Grande-Bretagne",
  GEO: "Géorgie", GER: "Allemagne", GRE: "Grèce", GUI: "Guinée", HUN: "Hongrie", IRI: "Iran", ISL: "Islande", ISR: "Israël",
  ITA: "Italie", JPN: "Japon", KOR: "Corée du Sud", KOS: "Kosovo", KSA: "Arabie saoudite", KUW: "Koweït", LAT: "Lettonie",
  LTU: "Lituanie", LUX: "Luxembourg", MAR: "Maroc", MKD: "Macédoine du Nord", MNE: "Monténégro", NED: "Pays-Bas",
  NOR: "Norvège", POL: "Pologne", POR: "Portugal", QAT: "Qatar", ROU: "Roumanie", RSA: "Afrique du Sud", SRB: "Serbie",
  SER: "Serbie", SLO: "Slovénie", SUE: "Suède", SVK: "Slovaquie", SUI: "Suisse", SWE: "Suède", TUN: "Tunisie", TUR: "Turquie",
  UKR: "Ukraine", URU: "Uruguay", USA: "États-Unis"
};

const norm = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
const MOIS = { janvier: 1, janv: 1, fevrier: 2, fevr: 2, fev: 2, mars: 3, avril: 4, avr: 4, mai: 5, juin: 6, juillet: 7, juil: 7, aout: 8, septembre: 9, sept: 9, octobre: 10, oct: 10, novembre: 11, nov: 11, decembre: 12, dec: 12 };
const pad = (n) => String(n).padStart(2, "0");
const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

// ---------- conversions de cellules
function serialToISO(n) { const d = new Date(Math.round((n - 25569) * 86400000)); return iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()); }
function toDate(v, yearHint) {
  if (v == null || v === "") return null;
  if (typeof v === "number") return v > 20000 ? serialToISO(Math.floor(v)) : null;
  if (v instanceof Date) return iso(v.getFullYear(), v.getMonth() + 1, v.getDate());
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return iso(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{2,4}))?$/);
  if (m) { let y = m[3] ? +m[3] : yearHint; if (y && y < 100) y += 2000; return y ? iso(y, +m[2], +m[1]) : null; }
  // « jeudi 22 janvier 2027 », « 22 janv. »
  m = s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").match(/(\d{1,2})\s*(?:er)?\s+([a-z]+)\.?\s*(\d{4})?/);
  if (m && MOIS[m[2]]) { const y = m[3] ? +m[3] : yearHint; return y ? iso(y, MOIS[m[2]], +m[1]) : null; }
  return null;
}
function toTime(v) {
  if (v == null || v === "") return "";
  if (typeof v === "number") { const x = v % 1 === 0 && v < 24 ? v / 24 : v % 1; const mn = Math.round(x * 1440); return `${pad(Math.floor(mn / 60) % 24)}:${pad(mn % 60)}`; }
  if (v instanceof Date) return `${pad(v.getHours())}:${pad(v.getMinutes())}`;
  const m = String(v).trim().match(/^(\d{1,2})\s*[:hH]\s*(\d{2})?/);
  return m ? `${pad(+m[1])}:${pad(+(m[2] || 0))}` : "";
}
const oui = (v) => ["oui", "o", "x", "yes", "y", "1", "vrai", "true"].includes(norm(v));
function phaseOf(v) {
  const n = norm(v); if (!n) return "";
  for (const [k, lab] of Object.entries(PHASES)) if (n === norm(lab) || n === k) return k;
  if (/prepa|amical|test/.test(n)) return "prep";
  if (/prelim|poule|groupe/.test(n)) return "prelim";
  if (/principal|main|deuxieme/.test(n)) return "main";
  if (/president|classement2/.test(n)) return "pres";
  if (/final|demi|quart|place|sf|qf|medaille/.test(n)) return "ko";
  return "";
}
function statutOf(v) { const n = norm(v); for (const [k, lab] of Object.entries(STATUTS)) if (n === norm(lab) || n === k) return k; return "todo"; }
function whoOf(v, roster) {
  if (!v) return [];
  return String(v).split(/[,;/+]| et /).map((x) => norm(x)).filter(Boolean).map((x) =>
    (roster.find((r) => norm(r.name) === x) || roster.find((r) => norm(r.name).slice(0, 3) === x.slice(0, 3)) || {}).id
  ).filter(Boolean);
}

// ---------- logo collé dans le classeur (xl/media/imageN.png|jpg)
async function logoFromXlsx(buf) {
  try {
    const zip = await self.JSZip.loadAsync(buf);
    const f = Object.keys(zip.files).filter((p) => /^xl\/media\/[^/]+\.(png|jpe?g|gif|webp)$/i.test(p)).sort()[0];
    if (!f) return null;
    const ext = f.split(".").pop().toLowerCase();
    const blob = new Blob([await zip.file(f).async("uint8array")], { type: "image/" + (ext === "jpg" ? "jpeg" : ext) });
    return await resizeImage(blob);
  } catch (e) { return null; }
}
export function resizeImage(blob, max = 320) {
  return new Promise((ok, ko) => {
    const img = new Image(), url = URL.createObjectURL(blob);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      ok(c.toDataURL("image/png"));
    };
    img.onerror = () => ko(new Error("Image illisible")); img.src = url;
  });
}

// ---------- lecture d'un fichier
export async function parseFile(file, roster) {
  await loadLibs();
  const buf = await file.arrayBuffer();
  const X = self.XLSX;
  const wb = X.read(buf, { type: "array", cellDates: false, cellFormula: true });
  const sheets = Object.fromEntries(wb.SheetNames.map((n) => [norm(n), wb.Sheets[n]]));
  const rows = (ws) => X.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });
  const out = { meta: { name: "", sub: "", url: "" }, teams: {}, matches: [], warnings: [], logo: null, format: "" };

  // Feuille « Compétition » : couples libellé / valeur
  const cws = sheets.competition;
  if (cws) for (const r of rows(cws)) {
    const k = norm(r[0]), v = String(r[1] ?? "").trim(); if (!v) continue;
    if (k.startsWith("nom")) out.meta.name = v;
    else if (k.startsWith("sous")) out.meta.sub = v;
    else if (k.startsWith("lien") || k.startsWith("site") || k.startsWith("url")) out.meta.url = v;
  }
  // Feuille « Équipes » : code / nom complet
  const ews = sheets.equipes;
  if (ews) for (const r of rows(ews).slice(1)) { const c = String(r[0] ?? "").trim().toUpperCase(), n = String(r[1] ?? "").trim(); if (c && n) out.teams[c] = n; }

  // Feuille des matchs : « Matchs », sinon la première feuille qui a un en-tête Date + Équipe
  let mws = sheets.matchs || sheets.matches, table = null, hdr = -1;
  const candidates = mws ? [mws] : wb.SheetNames.map((n) => wb.Sheets[n]);
  for (const ws of candidates) {
    const rs = rows(ws);
    const i = rs.findIndex((r) => r.some((c) => norm(c) === "date") && r.some((c) => /^equipe1|^equipea|^domicile/.test(norm(c))));
    if (i >= 0) { table = rs; hdr = i; break; }
  }
  const years = [];
  if (table) {
    out.format = "modele";
    const H = table[hdr].map(norm);
    const col = (...keys) => H.findIndex((h) => keys.some((k) => h.startsWith(k)));
    const C = { d: col("date"), t: col("heure", "horaire", "time"), a: col("equipe1", "equipea", "domicile"), b: col("equipe2", "equipeb", "exterieur"),
      ph: col("phase"), g: col("groupe", "tour"), v: col("lieu", "ville", "salle"), prov: col("horaireaconfirmer", "aconfirmer", "provisoire"),
      note: col("consigne", "note"), who: col("attribue", "tagueur", "collaborateur"), st: col("statut") };
    if (C.prov === C.t) C.prov = -1;
    for (const r of table.slice(hdr + 1)) { const d = toDate(r[C.d]); if (d) years.push(+d.slice(0, 4)); }
    const yh = years[0] || new Date().getFullYear();
    table.slice(hdr + 1).forEach((r, i) => {
      const line = hdr + i + 2, get = (k) => (C[k] >= 0 ? r[C[k]] : "");
      if (r.every((c) => c === "" || c == null)) return;
      const d = toDate(get("d"), yh), a = String(get("a")).trim(), b = String(get("b")).trim();
      if (!d) { out.warnings.push(`Ligne ${line} ignorée : date illisible (« ${get("d")} »)`); return; }
      if (!a) { out.warnings.push(`Ligne ${line} ignorée : équipe 1 vide`); return; }
      const ph = phaseOf(get("ph"));
      if (get("ph") && !ph) out.warnings.push(`Ligne ${line} : phase « ${get("ph")} » inconnue, classée en Tour préliminaire`);
      out.matches.push({ d, t: toTime(get("t")), a: a.toUpperCase(), b: (b || "match").toUpperCase(), ph: ph || "prelim", g: String(get("g")).trim(),
        v: String(get("v")).trim(), prov: oui(get("prov")), note: String(get("note")).trim(), who: whoOf(get("who"), roster), st: statutOf(get("st")) });
    });
  } else {
    // Ancien format « positionnement_matchs »
    out.format = "positionnement";
    const ws = wb.Sheets[wb.SheetNames[0]];
    const range = X.utils.decode_range(ws["!ref"] || "A1");
    const cell = (r, c) => ws[X.utils.encode_cell({ r, c })];
    const val = (r, c) => { const x = cell(r, c); return x ? (x.v ?? (x.f ? "=" + x.f : "")) : ""; };
    const names = []; for (let c = 3; c <= range.e.c; c++) { const n = String(val(0, c)).trim(); if (n) names[c] = n; }
    let cur = null, yh = null, o = 0;
    for (let r = 0; r <= range.e.r; r++) { const v = val(r, 0); if (typeof v === "number" && v > 20000) { yh = +serialToISO(v).slice(0, 4); break; } }
    yh = yh || new Date().getFullYear();
    for (let r = 1; r <= range.e.r; r++) {
      const v0 = val(r, 0), v1 = val(r, 1), v2 = val(r, 2);
      let d = null;
      if (typeof v0 === "number" && v0 > 20000) d = serialToISO(v0);
      else if (typeof v0 === "string" && /^=?[A-Z]+\d+\+(\d+)$/i.test(v0) && cur) { const n = +v0.match(/\+(\d+)$/)[1]; const x = new Date(cur + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + n); d = x.toISOString().slice(0, 10); }
      else if (typeof v0 === "string" && !/\d{1,2}[:h]\d{2}/.test(v0)) d = toDate(v0, yh);
      if (d) { cur = d; continue; }
      const label = String(v0).trim(); if (!label || !cur) continue;
      const time = toTime(v2), codes = label.match(/^([A-Z]{2,4})\s*[-–]?\s*([A-Z]{2,4})$/);
      if (!time && !codes && !/final|sf|qf|place|demi|quart/i.test(label)) continue;
      const who = []; for (let c = 3; c <= range.e.c; c++) if (names[c] && norm(val(r, c)) === "x") who.push(...whoOf(names[c], roster));
      const g = String(v1).trim();
      out.matches.push({ d: cur, t: time, a: codes ? codes[1] : label.toUpperCase(), b: codes ? codes[2] : "", ph: g ? "prelim" : phaseOf(label) || "main",
        g: g ? "Gr. " + g : "", v: "", prov: false, note: "", who, st: "todo", o: o++ });
    }
    if (!out.matches.length) out.warnings.push("Aucun match reconnu : utilise le modèle exporté par l'appli.");
  }
  out.matches.forEach((m, i) => { if (m.o == null) m.o = i; if (!m.b) m.b = "match"; });
  if (file.name.toLowerCase().endsWith(".xlsx")) out.logo = await logoFromXlsx(buf);
  return out;
}

// ---------- création du modèle Excel (vide ou rempli avec la compétition actuelle)
export async function downloadTemplate({ meta = {}, teams = {}, matches = [], roster = [] } = {}, filename = "competition-modele.xlsx") {
  await loadLibs();
  const X = self.XLSX, wb = X.utils.book_new();
  const fr = (d) => (d ? d.split("-").reverse().join("/") : "");
  const sheet = (aoa, widths) => { const ws = X.utils.aoa_to_sheet(aoa); ws["!cols"] = widths.map((w) => ({ wch: w })); return ws; };

  X.utils.book_append_sheet(wb, sheet([
    ["MODE D'EMPLOI — modèle de compétition (Taguage)"], [""],
    ["1. Feuille « Compétition » : nom, sous-titre, lien du site officiel."],
    ["   Pour le logo : copie l'image et colle-la (Ctrl+V) n'importe où dans la feuille « Compétition »."],
    ["2. Feuille « Matchs » : une ligne par match. Seules les colonnes Date et Équipe 1 sont obligatoires."],
    ["   Date : 14/01/2027   ·   Heure : 18:00   ·   Équipe : code à 3 lettres (FRA) ou créneau (1A, Vainqueur QF1…)"],
    ["   Phase : " + Object.values(PHASES).join(" / ")],
    ["   Horaire à confirmer : oui / non   ·   Statut : " + Object.values(STATUTS).join(" / ")],
    ["   Attribué à : prénoms séparés par une virgule (ex. Anto, Léo) — laisser vide si pas encore décidé"],
    ["3. Feuille « Équipes » : code → nom complet affiché sous l'affiche. Ajoute les codes manquants."],
    ["4. Dans l'appli : roue dentée › Compétition › Importer le fichier rempli. Un aperçu s'affiche avant de basculer."],
    ["   L'ancienne compétition est archivée, pas effacée."], [""],
    ["Exemple de ligne Matchs :", "14/01/2027", "20:30", "FRA", "KUW", "Tour préliminaire", "Gr. D", "Stuttgart", "oui", "Focus défense", "Anto", "À faire"]
  ], [34, 12, 8, 8, 8, 18, 10, 12, 8, 16, 10, 10]), "Mode d'emploi");

  X.utils.book_append_sheet(wb, sheet([
    ["Champ", "Valeur"],
    ["Nom de la compétition", meta.name || ""],
    ["Sous-titre (pays, dates)", meta.sub || ""],
    ["Lien du site officiel", meta.url || ""],
    ["Logo", "Colle l'image du logo dans cette feuille (Ctrl+V)"]
  ], [28, 60]), "Compétition");

  const name = (id) => (roster.find((r) => r.id === id) || {}).name || "";
  X.utils.book_append_sheet(wb, sheet([
    ["Date", "Heure", "Équipe 1", "Équipe 2", "Phase", "Groupe / tour", "Lieu", "Horaire à confirmer", "Consignes", "Attribué à", "Statut"],
    ...matches.map((m) => [fr(m.d), m.t || "", m.a, String(m.b).toUpperCase() === "MATCH" ? "" : m.b, PHASES[m.ph] || "", m.g || "", m.v || "", m.prov ? "oui" : "", m.note || "",
      (m.who || []).map(name).filter(Boolean).join(", "), m.st && m.st !== "todo" ? STATUTS[m.st] : ""])
  ], [12, 8, 10, 10, 18, 18, 14, 10, 30, 18, 12]), "Matchs");

  const all = { ...CODES, ...teams }; delete all.SER;
  X.utils.book_append_sheet(wb, sheet([["Code", "Nom complet"], ...Object.entries(all).sort((a, b) => a[0].localeCompare(b[0]))], [8, 26]), "Équipes");
  X.writeFile(wb, filename);
}
