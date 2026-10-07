export default async function handler(req, res) {
  const { key } = req.query;
  const BASE_ID = 'appi5FTnHDJYAqFOm';
  const TABLE_ID = 'tblwEY5bGzB3mZyZ7';
  const TOKEN = process.env.AIRTABLE_TOKEN;

  if (!TOKEN) return res.status(500).json({ error: 'Token non configuré' });

    const PROJECT_TOKENS = {};
  for (const [env, p] of [
    ['TOKEN_SAMIM2', 'SAMIM2'], ['TOKEN_EUREACH', 'EU REACH CSO'],
    ['TOKEN_BUNYAN', 'BUNYAN'], ['TOKEN_SEEED', 'SEEED'],
  ]) { if (process.env[env]) PROJECT_TOKENS[process.env[env]] = p; }

  const projet = key ? PROJECT_TOKENS[key] : null;
  if (key && !projet) return res.status(403).json({ error: 'Accès refusé' });

  const conds = ['{Statut_Record}!="deleted"'];
  if (projet) conds.push(`{Projet}="${projet}"`);
  const filter = `&filterByFormula=${encodeURIComponent(`AND(${conds.join(',')})`)}`;

  const allRecords = [];
  let offset = null;

  do {
    const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?pageSize=100&fields[]=Nom de l'OSC&fields[]=Projet${filter}${offset ? `&offset=${offset}` : ''}`;
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
    const data = await resp.json();
    if (data.error) return res.status(500).json(data);
    allRecords.push(...(data.records || []));
    offset = data.offset || null;
  } while (offset);

  const oscs = [...new Set(allRecords.map(r => r.fields["Nom de l'OSC"]).filter(Boolean))].sort();
  res.status(200).json({ oscs, projet });
}
