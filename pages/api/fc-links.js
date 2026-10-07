// Route sécurisée — retourne les liens FC uniquement pour les chefs de projet
export default function handler(req, res) {
  const { key } = req.query;

  const PROJECT_TOKENS = {};
  for (const [env, p] of [
    ['TOKEN_SAMIM2', 'SAMIM2'], ['TOKEN_EUREACH', 'EU REACH CSO'],
    ['TOKEN_BUNYAN', 'BUNYAN'], ['TOKEN_SEEED', 'SEEED'],
  ]) { if (process.env[env]) PROJECT_TOKENS[process.env[env]] = p; }

  const projet = key ? PROJECT_TOKENS[key] : null;
  if (!projet) return res.status(403).json({ error: 'Accès refusé' });

  const BASE_URL = process.env.APP_URL || 'https://ocat-red.vercel.app';

  const FC_CONFIG = {
    'EU REACH CSO': [
      { name: 'A village at a time',     token: process.env.TOKEN_FC_AVILLAGE },
      { name: 'Agripremium',             token: process.env.TOKEN_FC_AGRIPREMIUM },
      { name: 'Angels Resources Centre', token: process.env.TOKEN_FC_ANGELS },
      { name: 'Esisipho K',              token: process.env.TOKEN_FC_ESISIPHO },
      { name: 'Luhnyezi',                token: process.env.TOKEN_FC_LUHNYEZI },
      { name: 'Power of Well',           token: process.env.TOKEN_FC_POWEROFWELL },
      { name: 'Sothaba',                 token: process.env.TOKEN_FC_SOTHABA },
      { name: 'Unnati',                  token: process.env.TOKEN_FC_UNNATI },
    ],
    'SAMIM2': [
      { name: 'ECODEV',                          token: process.env.TOKEN_FC_SA1 },
      { name: 'MCISE',                           token: process.env.TOKEN_FC_SA2 },
      { name: 'Jordan Youth Innovation Forum',   token: process.env.TOKEN_FC_SA3 },
      { name: "Lab'ess",                         token: process.env.TOKEN_FC_SA4 },
    ],
    'BUNYAN': [
      { name: 'Souhail Boukraa',   token: process.env.TOKEN_FC_SOUHAIL },
      { name: 'Youness Boudohay',  token: process.env.TOKEN_FC_YOUNESS },
      { name: 'Najlaa Fathi',      token: process.env.TOKEN_FC_NAJLAA },
      { name: 'Abdeljalil Amzil',  token: process.env.TOKEN_FC_ABDELJALIL },
    ],
    'SEEED': [
      { name: 'Maya', token: process.env.TOKEN_FC_MAYA },
      { name: 'Nax',  token: process.env.TOKEN_FC_NAX },
      { name: 'Fara', token: process.env.TOKEN_FC_FARA },
      { name: 'Hery', token: process.env.TOKEN_FC_HERY },
      { name: 'Anja', token: process.env.TOKEN_FC_ANJA },
    ],
  };

  const fcs = (FC_CONFIG[projet] || []).map(fc => ({
    name: fc.name,
    url: fc.token ? `${BASE_URL}/project?key=${fc.token}` : null,
  }));

  res.status(200).json({ projet, fcs });
}
