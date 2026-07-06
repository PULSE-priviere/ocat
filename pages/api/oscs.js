// Liste toutes les OSC uniques
export default async function handler(req, res) {
  const BASE_ID = 'appi5FTnHDJYAqFOm';
  const TABLE_ID = 'tblwEY5bGzB3mZyZ7';
  const TOKEN = process.env.AIRTABLE_TOKEN;

  if (!TOKEN) return res.status(500).json({ error: 'AIRTABLE_TOKEN non configuré' });

  const allRecords = [];
  let offset = null;

  do {
    const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?pageSize=100&fields[]=Nom de l'OSC&fields[]=Projet${offset ? `&offset=${offset}` : ''}`;
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
    const data = await resp.json();
    if (data.error) return res.status(500).json(data);
    allRecords.push(...data.records);
    offset = data.offset || null;
  } while (offset);

  const oscs = [...new Set(allRecords.map(r => r.fields["Nom de l'OSC"]).filter(Boolean))].sort();
  res.status(200).json({ oscs });
}
