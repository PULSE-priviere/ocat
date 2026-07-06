// API route — appelle Airtable côté serveur (token jamais exposé au client)
export default async function handler(req, res) {
  const { osc } = req.query;
  
  const BASE_ID = 'appi5FTnHDJYAqFOm';
  const TABLE_ID = 'tblwEY5bGzB3mZyZ7';
  const TOKEN = process.env.AIRTABLE_TOKEN;

  if (!TOKEN) {
    return res.status(500).json({ error: 'AIRTABLE_TOKEN non configuré' });
  }

  let url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?pageSize=100`;
  if (osc) {
    url += `&filterByFormula=${encodeURIComponent(`{Nom de l'OSC}="${osc}"`)}`;
  }

  const allRecords = [];
  let offset = null;

  do {
    const fetchUrl = offset ? `${url}&offset=${offset}` : url;
    const resp = await fetch(fetchUrl, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    const data = await resp.json();
    if (data.error) return res.status(500).json(data);
    allRecords.push(...data.records);
    offset = data.offset || null;
  } while (offset);

  res.status(200).json({ records: allRecords });
}
