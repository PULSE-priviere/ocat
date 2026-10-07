import { QUESTIONS, ANSWER_OPTIONS, COMMENT_FIELDS as EDITABLE_COMMENT_FIELDS } from '../../config';

// Tables de tokens — une seule source pour GET / DELETE / PATCH
function getTokenMaps() {
  const P = [
    ['TOKEN_SAMIM2', 'SAMIM2'], ['TOKEN_EUREACH', 'EU REACH CSO'],
    ['TOKEN_BUNYAN', 'BUNYAN'], ['TOKEN_SEEED', 'SEEED'],
  ];
  const F = [
    ['TOKEN_FC_AVILLAGE', 'A village at a time', 'EU REACH CSO'],
    ['TOKEN_FC_AGRIPREMIUM', 'Agripremium', 'EU REACH CSO'],
    ['TOKEN_FC_ANGELS', 'Angels Resources Centre', 'EU REACH CSO'],
    ['TOKEN_FC_ESISIPHO', 'Esisipho K', 'EU REACH CSO'],
    ['TOKEN_FC_LUHNYEZI', 'Luhnyezi', 'EU REACH CSO'],
    ['TOKEN_FC_POWEROFWELL', 'Power of Well', 'EU REACH CSO'],
    ['TOKEN_FC_SOTHABA', 'Sothaba', 'EU REACH CSO'],
    ['TOKEN_FC_UNNATI', 'Unnati', 'EU REACH CSO'],
    ['TOKEN_FC_SA1', 'ECODEV', 'SAMIM2'],
    ['TOKEN_FC_SA2', 'MCISE', 'SAMIM2'],
    ['TOKEN_FC_SA3', 'Jordan Youth Innovation Forum', 'SAMIM2'],
    ['TOKEN_FC_SA4', "Lab'ess", 'SAMIM2'],
    ['TOKEN_FC_SOUHAIL', 'Souhail Boukraa', 'BUNYAN'],
    ['TOKEN_FC_YOUNESS', 'Youness Boudohay', 'BUNYAN'],
    ['TOKEN_FC_NAJLAA', 'Najlaa Fathi', 'BUNYAN'],
    ['TOKEN_FC_ABDELJALIL', 'Abdeljalil Amzil', 'BUNYAN'],
    ['TOKEN_FC_MAYA', 'Maya', 'SEEED'], ['TOKEN_FC_NAX', 'Nax', 'SEEED'],
    ['TOKEN_FC_FARA', 'Fara', 'SEEED'], ['TOKEN_FC_HERY', 'Hery', 'SEEED'],
    ['TOKEN_FC_ANJA', 'Anja', 'SEEED'],
  ];
  const PROJECT_TOKENS = {}, FC_TOKENS = {};
  // On ignore toute variable absente ou vide → plus de clé "undefined"
  for (const [env, projet] of P) { const v = process.env[env]; if (v) PROJECT_TOKENS[v] = { type: 'project', projet }; }
  for (const [env, name, projet] of F) { const v = process.env[env]; if (v) FC_TOKENS[v] = { name, projet }; }
  return { PROJECT_TOKENS, FC_TOKENS };
}

// Validation des champs modifiables
const QUESTION_IDS = new Set(QUESTIONS.map(q => q.id));
const COMMENT_SET = new Set(EDITABLE_COMMENT_FIELDS);
function sanitizeUpdate(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { error: 'Body invalide' };
  const out = {};
  for (const [k, v] of Object.entries(input)) {
    const qm = /^\[(\d+\.\d+)\] /.exec(k);
    const am = /^Appui structure — (\d+\.\d+)$/.exec(k);
    if (qm && QUESTION_IDS.has(qm[1])) {
      if (v !== null && !ANSWER_OPTIONS.includes(v)) return { error: `Valeur invalide : ${k}` };
      out[k] = v;
    } else if (am && QUESTION_IDS.has(am[1])) {
      if (v !== null && v !== 'Oui' && v !== 'Non') return { error: `Valeur invalide : ${k}` };
      out[k] = v;
    } else if (COMMENT_SET.has(k)) {
      if (v !== null && typeof v !== 'string') return { error: `Valeur invalide : ${k}` };
      if (typeof v === 'string' && v.length > 5000) return { error: `Trop long : ${k}` };
      out[k] = v ?? '';
    } else {
      return { error: `Champ non modifiable : ${k}` }; // scores, Facilitateur, Projet, nom OSC… refusés
    }
  }
  if (!Object.keys(out).length) return { error: 'Aucun champ à modifier' };
  return { fields: out };
}

export default async function handler(req, res) {
  const BASE_ID = 'appi5FTnHDJYAqFOm';
  const TABLE_ID = 'tblwEY5bGzB3mZyZ7';
  const TOKEN = process.env.AIRTABLE_TOKEN;

  if (!TOKEN) return res.status(500).json({ error: 'Token non configuré' });

  // ── DELETE — suppression d'un record (AVANT tout autre traitement) ──────────
  if (req.method === 'DELETE') {
    try {
      const { key, deleteId } = req.query;
      if (!key || !deleteId) return res.status(400).json({ error: 'key et deleteId requis' });

      const { PROJECT_TOKENS, FC_TOKENS } = getTokenMaps();

      const projMatch = PROJECT_TOKENS[key];
      const fcMatch = FC_TOKENS[key];
      if (!projMatch && !fcMatch) return res.status(403).json({ error: 'Accès refusé' });

      // Vérifier le record
      const recUrl = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}/${deleteId}`;
      const checkResp = await fetch(recUrl, { headers: { Authorization: `Bearer ${TOKEN}` } });
      const checkBody = await checkResp.json();
      if (!checkResp.ok) return res.status(404).json({ error: 'Record introuvable', detail: checkBody });

      const recProjet = checkBody.fields?.Projet || '';
      const recFC = checkBody.fields?.Facilitateur || '';

      if (projMatch && recProjet !== projMatch.projet) {
        return res.status(403).json({ error: 'Hors périmètre projet' });
      }
      if (fcMatch && (recProjet !== fcMatch.projet || recFC !== fcMatch.name)) {
        return res.status(403).json({ error: 'Hors périmètre facilitateur' });
      }

      // Soft delete : marquer comme Supprimé
      const patchResp = await fetch(recUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            Statut_Record: 'deleted',
            Supprime_par: fcMatch ? fcMatch.name : `Chef de projet (${projMatch.projet})`,
            Supprime_le: new Date().toISOString().slice(0, 10),
          },
        }),
      });
      const patchBody = await patchResp.json();
      if (!patchResp.ok) return res.status(500).json({ error: 'Échec mise à jour', detail: patchBody });

      return res.status(200).json({ deleted: true, id: deleteId });

    } catch (err) {
      return res.status(500).json({ error: 'Exception serveur', message: err.message });
    }
  }

    // ── PATCH — modification d'une évaluation par FC / Chef de projet ───────────
  if (req.method === 'PATCH') {
    try {
      const { key, updateId } = req.query;
      if (!key || !updateId) return res.status(400).json({ error: 'key et updateId requis' });

      const { PROJECT_TOKENS, FC_TOKENS } = getTokenMaps();
      const projMatch = PROJECT_TOKENS[key];
      const fcMatch = FC_TOKENS[key];
      if (!projMatch && !fcMatch) return res.status(403).json({ error: 'Accès refusé' });

      const { fields, error } = sanitizeUpdate(req.body?.fields);
      if (error) return res.status(400).json({ error });

      // Vérifier le périmètre (même logique que DELETE)
      const recUrl = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}/${updateId}`;
      const checkResp = await fetch(recUrl, { headers: { Authorization: `Bearer ${TOKEN}` } });
      const checkBody = await checkResp.json();
      if (!checkResp.ok) return res.status(404).json({ error: 'Record introuvable' });
      if (checkBody.fields?.Statut_Record === 'deleted') return res.status(404).json({ error: 'Record supprimé' });

      const recProjet = checkBody.fields?.Projet || '';
      const recFC = checkBody.fields?.Facilitateur || '';
      if (projMatch && recProjet !== projMatch.projet) return res.status(403).json({ error: 'Hors périmètre projet' });
      if (fcMatch && (recProjet !== fcMatch.projet || recFC !== fcMatch.name)) return res.status(403).json({ error: 'Hors périmètre facilitateur' });

      // Écriture
      const patchResp = await fetch(recUrl, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          typecast: false,
          fields: {
            ...fields,
            'Modifié par': fcMatch ? fcMatch.name : `Chef de projet (${projMatch.projet})`,
            'Date de modification': new Date().toISOString(),
          },
        }),
      });
      const patchBody = await patchResp.json();
      if (!patchResp.ok) return res.status(500).json({ error: 'Échec mise à jour', detail: patchBody?.error?.message || '' });

      return res.status(200).json({ record: patchBody }); // scores déjà recalculés par les formules
    } catch (err) {
      return res.status(500).json({ error: 'Exception serveur', message: err.message });
    }
  }

  // ── GET — le reste inchangé ────────────────────────────────────────────────
  const { id, key } = req.query;

  if (id) {
    const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?filterByFormula=${encodeURIComponent(`AND(RECORD_ID()="${id}",{Statut_Record}!="deleted")`)}`;    const resp = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
    const data = await resp.json();
    if (data.error) return res.status(500).json(data);
    if (!data.records?.length) return res.status(404).json({ error: 'Record introuvable' });

    const nomOSC = data.records[0].fields["Nom de l'OSC"];
    if (!nomOSC) return res.status(404).json({ error: 'OSC introuvable' });

    const allUrl = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?filterByFormula=${encodeURIComponent(`AND({Nom de l'OSC}="${nomOSC}",{Statut_Record}!="deleted")`)}`;
    const allResp = await fetch(allUrl, { headers: { Authorization: `Bearer ${TOKEN}` } });
    const allData = await allResp.json();
    return res.status(200).json({ records: allData.records || [], oscName: nomOSC });
  }


  if (key) {                     
    const { PROJECT_TOKENS, FC_TOKENS } = getTokenMaps();
    const projectMatch = PROJECT_TOKENS[key];
    const fcMatch = FC_TOKENS[key];
    if (!projectMatch && !fcMatch) return res.status(403).json({ error: 'Accès refusé' });

    let filter, meta;
    if (projectMatch) {
    filter = `AND({Projet}="${projectMatch.projet}",{Statut_Record}!="deleted")`;
      meta = { type: 'project', projet: projectMatch.projet };
    } else {
      filter = `AND({Projet}="${fcMatch.projet}",{Facilitateur}="${fcMatch.name}",{Statut_Record}!="deleted")`;
      meta = { type: 'fc', projet: fcMatch.projet, facilitateur: fcMatch.name };
    }

    const allRecords = [];
    let offset = null;
    do {
      const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?pageSize=100&filterByFormula=${encodeURIComponent(filter)}${offset ? `&offset=${offset}` : ''}`;
      const resp = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
      const data = await resp.json();
      if (data.error) return res.status(500).json(data);
      allRecords.push(...(data.records || []));
      offset = data.offset || null;
    } while (offset);

    return res.status(200).json({ records: allRecords, ...meta });
  }

  return res.status(400).json({ error: 'Paramètre id ou key requis' });
  }