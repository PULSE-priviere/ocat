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

        const PROJECT_TOKENS = {
          [process.env.TOKEN_SAMIM2]:   { type: 'project', projet: 'SAMIM2' },
          [process.env.TOKEN_EUREACH]:  { type: 'project', projet: 'EU REACH CSO' },
        };
        const FC_TOKENS = {
          [process.env.TOKEN_FC_AVILLAGE]:   { name: 'A village at a time',    projet: 'EU REACH CSO' },
          [process.env.TOKEN_FC_AGRIPREMIUM]:{ name: 'Agripremium',            projet: 'EU REACH CSO' },
          [process.env.TOKEN_FC_ANGELS]:     { name: 'Angels Resources Centre', projet: 'EU REACH CSO' },
          [process.env.TOKEN_FC_ESISIPHO]:   { name: 'Esisipho K',             projet: 'EU REACH CSO' },
          [process.env.TOKEN_FC_LUHNYEZI]:   { name: 'Luhnyezi',               projet: 'EU REACH CSO' },
          [process.env.TOKEN_FC_POWEROFWELL]:{ name: 'Power of Well',          projet: 'EU REACH CSO' },
          [process.env.TOKEN_FC_SOTHABA]:    { name: 'Sothaba',                projet: 'EU REACH CSO' },
          [process.env.TOKEN_FC_UNNATI]:     { name: 'Unnati',                 projet: 'EU REACH CSO' },
        };

        const projMatch = PROJECT_TOKENS[key];
        const fcMatch = FC_TOKENS[key];
        if (!projMatch && !fcMatch) return res.status(403).json({ error: 'Accès refusé' });

        // Step 1 — vérifier le record
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

        // Step 2 — supprimer
        const delResp = await fetch(recUrl, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${TOKEN}` },
        });
        const delBody = await delResp.json();
        if (!delResp.ok) return res.status(500).json({ error: 'Échec Airtable', detail: delBody });

        return res.status(200).json({ deleted: true, id: deleteId });

      } catch (err) {
        return res.status(500).json({ error: 'Exception serveur', message: err.message });
      }
    }

  // ── GET — le reste inchangé ────────────────────────────────────────────────
  const { id, key } = req.query;

  if (id) {
    const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?filterByFormula=${encodeURIComponent(`RECORD_ID()="${id}"`)}`;
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
    const data = await resp.json();
    if (data.error) return res.status(500).json(data);
    if (!data.records?.length) return res.status(404).json({ error: 'Record introuvable' });

    const nomOSC = data.records[0].fields["Nom de l'OSC"];
    if (!nomOSC) return res.status(404).json({ error: 'OSC introuvable' });

    const allUrl = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?filterByFormula=${encodeURIComponent(`{Nom de l'OSC}="${nomOSC}"`)}`;
    const allResp = await fetch(allUrl, { headers: { Authorization: `Bearer ${TOKEN}` } });
    const allData = await allResp.json();
    return res.status(200).json({ records: allData.records || [], oscName: nomOSC });
  }

  if (key) {
    const PROJECT_TOKENS = {
      [process.env.TOKEN_SAMIM2]:   { type: 'project', projet: 'SAMIM2' },
      [process.env.TOKEN_EUREACH]:  { type: 'project', projet: 'EU REACH CSO' },
    };
    const FC_TOKENS = {
      [process.env.TOKEN_FC_AVILLAGE]:   { name: 'A village at a time',    projet: 'EU REACH CSO' },
      [process.env.TOKEN_FC_AGRIPREMIUM]:{ name: 'Agripremium',            projet: 'EU REACH CSO' },
      [process.env.TOKEN_FC_ANGELS]:     { name: 'Angels Resources Centre', projet: 'EU REACH CSO' },
      [process.env.TOKEN_FC_ESISIPHO]:   { name: 'Esisipho K',             projet: 'EU REACH CSO' },
      [process.env.TOKEN_FC_LUHNYEZI]:   { name: 'Luhnyezi',               projet: 'EU REACH CSO' },
      [process.env.TOKEN_FC_POWEROFWELL]:{ name: 'Power of Well',          projet: 'EU REACH CSO' },
      [process.env.TOKEN_FC_SOTHABA]:    { name: 'Sothaba',                projet: 'EU REACH CSO' },
      [process.env.TOKEN_FC_UNNATI]:     { name: 'Unnati',                 projet: 'EU REACH CSO' },
    };

    const projectMatch = PROJECT_TOKENS[key];
    const fcMatch = FC_TOKENS[key];
    if (!projectMatch && !fcMatch) return res.status(403).json({ error: 'Accès refusé' });

    let filter, meta;
    if (projectMatch) {
      filter = `{Projet}="${projectMatch.projet}"`;
      meta = { type: 'project', projet: projectMatch.projet };
    } else {
      filter = `AND({Projet}="${fcMatch.projet}", {Facilitateur}="${fcMatch.name}")`;
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