export default async function handler(req, res) {
  const { id, key } = req.query;
  const BASE_ID = 'appi5FTnHDJYAqFOm';
  const TABLE_ID = 'tblwEY5bGzB3mZyZ7';
  const TOKEN = process.env.AIRTABLE_TOKEN;

  if (!TOKEN) return res.status(500).json({ error: 'Token non configuré' });

  // Mode OSC individuelle — accès par record ID
  if (id) {
    const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?filterByFormula=RECORD_ID()="${id}"`;
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
    const data = await resp.json();
    if (data.error) return res.status(500).json(data);

    // Trouve tous les records de cette OSC (baseline + suivi + endline)
    if (!data.records || data.records.length === 0) {
      return res.status(404).json({ error: 'Record introuvable' });
    }
    const nomOSC = data.records[0].fields["Nom de l'OSC"];
    if (!nomOSC) return res.status(404).json({ error: 'OSC introuvable' });

    // Charge tous les records de cette OSC
    const allUrl = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?filterByFormula=${encodeURIComponent(`{Nom de l'OSC}="${nomOSC}"`)}`;
    const allResp = await fetch(allUrl, { headers: { Authorization: `Bearer ${TOKEN}` } });
    const allData = await allResp.json();
    return res.status(200).json({ records: allData.records || [], oscName: nomOSC });
  }

  // Mode chef de projet — accès par token projet
  if (key) {
    const PROJECT_TOKENS = {
      [process.env.TOKEN_SAMIM2]: 'SAMIM2',
      [process.env.TOKEN_EUREACH]: 'EU REACH CSO',
    };
    const projet = PROJECT_TOKENS[key];
    if (!projet) return res.status(403).json({ error: 'Accès refusé' });

    const allRecords = [];
    let offset = null;
    do {
      const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?pageSize=100&filterByFormula=${encodeURIComponent(`{Projet}="${projet}"`)}${offset ? `&offset=${offset}` : ''}`;
      const resp = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
      const data = await resp.json();
      if (data.error) return res.status(500).json(data);
      allRecords.push(...(data.records || []));
      offset = data.offset || null;
    } while (offset);

    return res.status(200).json({ records: allRecords, projet });
  }

  return res.status(400).json({ error: 'Paramètre id ou key requis' });
}
