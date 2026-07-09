import { useState, useEffect } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Legend, ResponsiveContainer, Tooltip
} from 'recharts';
import {
  SEC_NAMES, SEC_NAMES_EN, SCORE_FIELDS, QUESTIONS,
  EVAL_ORDER, EVAL_COLORS, EVAL_SHORT, FC_LIST
} from '../config';
import { C, SCORE_STYLE, CARD, FONT_WEIGHT } from '../theme';

// ── Safe extractors ───────────────────────────────────────────────────────────
function safeNum(v) {
  if (v === null || v === undefined || typeof v === 'object') return null;
  const n = Number(v); return isNaN(n) ? null : n;
}
function safeStr(v) {
  if (v === null || v === undefined || typeof v === 'object') return '';
  return String(v);
}
function getScoreNum(v) {
  const s = safeStr(v);
  if (s.startsWith('1')) return 1;
  if (s.startsWith('2')) return 2;
  if (s.startsWith('3')) return 3;
  return null;
}

const EVAL_KEY = {
  "Baseline (début d'accompagnement)": 'baseline',
  'Suivi intermédiaire': 'suivi',
  "Endline (fin d'accompagnement)": 'endline',
};

const SCORE_LABELS = {
  fr: { 1: 'Non mis en place', 2: 'Partiellement mis en place', 3: 'Documenté et opérationnel', 99: 'Non répondu / Non applicable' },
  en: { 1: 'Not in place', 2: 'Partially in place', 3: 'Documented and operational', 99: 'Not answered / Not applicable' },
};

const RADAR_LABELS = {
  '1': { fr: 'Gouvernance', en: 'Governance' },
  '2': { fr: 'Finances',    en: 'Finances' },
  '3': { fr: 'Stratégie',   en: 'Strategy' },
  '4': { fr: 'RH',          en: 'HR' },
  '5': { fr: 'Opérations',  en: 'Operations' },
  '6': { fr: 'MEAL',        en: 'MEAL' },
  '7': { fr: 'Comm.',       en: 'Comm.' },
  '8': { fr: 'Culture',     en: 'Culture' },
  '9': { fr: 'Relations',   en: 'Relations' },
};

const COMMENT_FIELDS = {
  '1': 'Commentaire_S1_Gouvernance', '2': 'Commentaire_S2_Finances',
  '3': 'Commentaire_S3_Strategie',  '4': 'Commentaire_S4_RH',
  '5': 'Commentaire_S5_Operations', '6': 'Commentaire_S6_MEAL',
  '7': 'Commentaire_S7_Communication', '8': 'Commentaire_S8_Culture',
  '9': 'Commentaire_S9_Relations',
};


const COUNTRY_TRANS = {
  'Maroc': 'Morocco', 'Algerie': 'Algeria', 'Tunisie': 'Tunisia',
  'Libye': 'Libya', 'Egypte': 'Egypt', 'Mauritanie': 'Mauritania',
  'Afrique du Sud': 'South Africa', 'Autre': 'Other',
};
function displayCountry(val, lang) {
  return lang === 'en' ? (COUNTRY_TRANS[val] || val) : val;
}

function UpperLabel({ children, style }) {
  return <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: C.muted, ...style }}>{children}</span>;
}
function Card({ children, style, onClick }) {
  return <div onClick={onClick} style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.rule}`, ...style }}>{children}</div>;
}
function ScoreChip({ val }) {
  const s = getScoreNum(val);
  const st = SCORE_STYLE[s] || SCORE_STYLE[99];
  const label = s ? String(s) : (safeStr(val).includes('N/A') ? 'N/A' : '—');
  return <span style={{ display: 'inline-block', minWidth: 32, textAlign: 'center', padding: '2px 8px', borderRadius: 4, background: st.bg, color: st.color, border: `1px solid ${st.border}`, fontSize: 11, fontWeight: 700 }}>{label}</span>;
}

// ── Section detail (same as index.js) ─────────────────────────────────────────
function SectionDetail({ sec, questions, presentEvals, getRecordForEval, lang }) {
  const qRows = questions.map(q => {
    const scores = {}, appuis = {};
    let minScore = 99;
    for (const e of presentEvals) {
      const rec = getRecordForEval(e);
      const qKey = rec ? Object.keys(rec.fields).find(k => k.startsWith(`[${q.id}]`)) : null;
      const val = qKey ? safeStr(rec.fields[qKey]) : '';
      const appui = rec ? safeStr(rec.fields[`Appui structure — ${q.id}`]) : '';
      scores[e] = val; appuis[e] = appui === 'Oui';
      const s = getScoreNum(val); if (s) minScore = Math.min(minScore, s);
    }
    const hasAppui = Object.values(appuis).some(Boolean);
    const label = lang === 'en' ? q.en : q.fr;
    return { ...q, label, scores, appuis, hasAppui, minScore };
  }).sort((a, b) => {
    if (a.minScore !== b.minScore) return a.minScore - b.minScore;
    if (a.hasAppui !== b.hasAppui) return a.hasAppui ? -1 : 1;
    return 0;
  });

  const comments = presentEvals.map(e => {
    const rec = getRecordForEval(e);
    if (!rec) return null;
    const c = COMMENT_FIELDS[sec] ? safeStr(rec.fields[COMMENT_FIELDS[sec]]) : '';
    return c ? { evalType: e, comment: c } : null;
  }).filter(Boolean);

  return (
    <div style={{ paddingTop: 20, marginTop: 4 }}>
      {comments.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {comments.map(({ evalType, comment }) => (
            <div key={evalType} style={{ padding: '12px 16px', borderRadius: 6, marginBottom: 8, background: '#FAFBFC', borderLeft: `3px solid ${EVAL_COLORS[evalType]}` }}>
              <UpperLabel style={{ color: EVAL_COLORS[evalType], display: 'block', marginBottom: 4 }}>
                Observation — {EVAL_SHORT[evalType]}
              </UpperLabel>
              <p style={{ margin: 0, fontSize: 13, color: C.mid, lineHeight: 1.65, fontStyle: 'italic' }}>{comment}</p>
            </div>
          ))}
        </div>
      )}
      {[1, 2, 3, 99].map(sg => {
        const group = qRows.filter(r => r.minScore === sg);
        if (!group.length) return null;
        const st = SCORE_STYLE[sg];
        return (
          <div key={sg} style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 14px', borderRadius: 5, marginBottom: 10, background: st.bg, borderLeft: `3px solid ${st.color}` }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: st.color }}>{sg === 99 ? '—' : sg}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: st.color, textTransform: 'uppercase', letterSpacing: 0.4 }}>{SCORE_LABELS[lang]?.[sg] || SCORE_LABELS.fr[sg]}</span>
              <span style={{ fontSize: 11, color: st.color, opacity: 0.55, marginLeft: 'auto' }}>{group.length} question{group.length > 1 ? 's' : ''}</span>
            </div>
            {group.map(row => (
              <div key={row.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '11px 14px', marginBottom: 4, borderRadius: 6, background: row.hasAppui ? '#FFF8F8' : C.white, border: `1px solid ${row.hasAppui ? '#FECACA' : C.rule}` }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {row.hasAppui && <span style={{ display: 'inline-block', marginRight: 8, marginBottom: 3, padding: '1px 6px', borderRadius: 3, background: '#FEE2E2', color: C.red, fontSize: 9, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', verticalAlign: 'middle' }}>{lang === 'en' ? 'Support requested' : 'Accompagnement demandé'}</span>}
                  <span style={{ fontSize: 13, color: C.ink, lineHeight: 1.6 }}>{row.label}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center', paddingTop: 2 }}>
                  {presentEvals.map(e => (
                    <div key={e} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 9, color: EVAL_COLORS[e], fontWeight: 600, marginBottom: 3 }}>{EVAL_SHORT[e].charAt(0)}</div>
                      <ScoreChip val={row.scores[e]} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ── Collapsible appui summary ─────────────────────────────────────────────────
function AppuiSummary({ presentEvals, getRecordForEval, lang }) {
  const [open, setOpen] = useState(false);
  const items = [];
  for (const [sec] of Object.entries(SEC_NAMES)) {
    for (const q of QUESTIONS.filter(q => q.sec === sec)) {
      const evals = presentEvals.filter(e => {
        const rec = getRecordForEval(e);
        return rec && safeStr(rec.fields[`Appui structure — ${q.id}`]) === 'Oui';
      });
      if (evals.length) items.push({ sec, id: q.id, label: lang === 'en' ? q.en : q.fr, evals });
    }
  }
  if (!items.length) return null;
  const secNames = lang === 'en' ? SEC_NAMES_EN : SEC_NAMES;

  return (
    <Card style={{ marginBottom: 24, overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', borderBottom: open ? `1px solid ${C.rule}` : 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <UpperLabel style={{ color: C.red }}>{lang === 'en' ? 'Support requests' : "Demandes d'accompagnement"}</UpperLabel>
          <span style={{ background: '#FEE2E2', color: C.red, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>{items.length}</span>
        </div>
        <span style={{ fontSize: 18, color: C.muted, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', display: 'inline-block' }}>›</span>
      </button>
      {open && (
        <div style={{ padding: '16px 20px' }}>
          {Object.entries(secNames).map(([sec, secName]) => {
            const secItems = items.filter(i => i.sec === sec);
            if (!secItems.length) return null;
            return (
              <div key={sec} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.navy, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>S{sec} — {secName}</div>
                {secItems.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '9px 12px', borderRadius: 5, background: '#FFF8F8', border: `1px solid #FECACA`, marginBottom: 4 }}>
                    <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, color: C.muted, paddingTop: 1 }}>{item.id}</span>
                    <div style={{ flex: 1, fontSize: 12, color: C.ink, lineHeight: 1.5 }}>{item.label}</div>
                    <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                      {item.evals.map(e => <span key={e} style={{ background: EVAL_COLORS[e], color: C.white, fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 3 }}>{EVAL_SHORT[e].charAt(0)}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ── OSC detail view (embedded) ────────────────────────────────────────────────
function OSCDetail({ oscName, oscRecords, lang }) {
  const [openSection, setOpenSection] = useState(null);
  const [selectedEval, setSelectedEval] = useState(null);
  const secNames = lang === 'en' ? SEC_NAMES_EN : SEC_NAMES;

  const allPresentEvals = EVAL_ORDER.filter(e => oscRecords.some(r => safeStr(r.fields["Type d'évaluation"]) === e));
  const presentEvals = selectedEval ? allPresentEvals.filter(e => e === selectedEval) : allPresentEvals;
  const getRecordForEval = (e) => oscRecords.find(r => safeStr(r.fields["Type d'évaluation"]) === e);

  const radarData = Object.entries(SCORE_FIELDS).map(([sec, field]) => {
    const entry = { section: RADAR_LABELS[sec]?.[lang] || `S${sec}` };
    for (const e of allPresentEvals) {
      const rec = getRecordForEval(e);
      entry[EVAL_KEY[e]] = rec ? (safeNum(rec.fields[field]) || 0) : 0;
    }
    return entry;
  });

  const globalComments = presentEvals.map(e => {
    const rec = getRecordForEval(e);
    const c = rec ? safeStr(rec.fields['Commentaire global']) : '';
    return c ? { evalType: e, comment: c } : null;
  }).filter(Boolean);

  return (
    <div>
      {/* Eval cards */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${allPresentEvals.length}, minmax(150px, 200px))`, gap: 12, marginBottom: 24 }}>
        {allPresentEvals.map(evalType => {
          const rec = getRecordForEval(evalType);
          const score = safeNum(rec?.fields?.Score_Global);
          const niveau = safeStr(rec?.fields?.Niveau_Global);
          const date = safeStr(rec?.fields?.['Date de soumission']);
          const sc = score !== null ? (score >= 7 ? C.green : score >= 5 ? C.orange : C.red) : C.muted;
          const isActive = selectedEval === evalType;
          return (
            <Card key={evalType}
              onClick={() => allPresentEvals.length > 1 && setSelectedEval(isActive ? null : evalType)}
              style={{ padding: '16px 18px', borderTop: `3px solid ${EVAL_COLORS[evalType]}`, cursor: allPresentEvals.length > 1 ? 'pointer' : 'default', outline: isActive ? `2px solid ${EVAL_COLORS[evalType]}` : 'none', outlineOffset: 2 }}
            >
              <UpperLabel style={{ color: EVAL_COLORS[evalType], display: 'block', marginBottom: 10 }}>{EVAL_SHORT[evalType]}</UpperLabel>
              <div style={{ fontSize: 30, fontWeight: 800, color: sc, lineHeight: 1, marginBottom: 6 }}>
                {score !== null ? score.toFixed(1) : '—'}<span style={{ fontSize: 13, fontWeight: 400, color: C.muted }}> / 10</span>
              </div>
              {niveau && <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>{niveau}</div>}
              {date && <div style={{ fontSize: 11, color: C.muted }}>{date}</div>}
            </Card>
          );
        })}
      </div>

      {/* Filter pills */}
      {allPresentEvals.length > 1 && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 24 }}>
          <UpperLabel style={{ marginRight: 4 }}>{lang === 'en' ? 'Show' : 'Afficher'}</UpperLabel>
          {[null, ...allPresentEvals].map((e, i) => {
            const active = selectedEval === e;
            const color = e ? EVAL_COLORS[e] : C.ink;
            const label = e ? EVAL_SHORT[e] : (lang === 'en' ? 'All' : 'Toutes');
            return <button key={i} onClick={() => setSelectedEval(e)} style={{ padding: '5px 16px', borderRadius: 20, border: `1.5px solid ${active ? color : C.rule}`, background: active ? color : C.white, color: active ? C.white : C.mid, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}>{label}</button>;
          })}
        </div>
      )}

      {/* Radar */}
      <Card style={{ padding: '24px 24px 16px', marginBottom: 14 }}>
        <UpperLabel style={{ display: 'block', marginBottom: 20 }}>{lang === 'en' ? 'Scores by section' : 'Scores par section'}</UpperLabel>
        <ResponsiveContainer width="100%" height={340}>
          <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData}>
            <PolarGrid stroke={C.rule} />
            <PolarAngleAxis dataKey="section" tick={{ fill: C.mid, fontSize: 11, fontWeight: 500 }} />
            <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fill: C.muted, fontSize: 10 }} tickCount={6} />
            {allPresentEvals.map(e => (
              <Radar key={e} name={EVAL_SHORT[e]} dataKey={EVAL_KEY[e]}
                stroke={EVAL_COLORS[e]} fill={EVAL_COLORS[e]}
                fillOpacity={selectedEval && selectedEval !== e ? 0.03 : 0.13}
                strokeWidth={selectedEval && selectedEval !== e ? 1 : 2.5}
                strokeDasharray={selectedEval && selectedEval !== e ? '4 4' : undefined}
              />
            ))}
            <Tooltip contentStyle={{ background: C.white, border: `1px solid ${C.rule}`, borderRadius: 8, fontSize: 12 }} />
            <Legend wrapperStyle={{ paddingTop: 14, fontSize: 12 }} />
          </RadarChart>
        </ResponsiveContainer>
      </Card>

      {/* Scores table */}
      <Card style={{ padding: '20px 24px', marginBottom: 14 }}>
        <UpperLabel style={{ display: 'block', marginBottom: 16 }}>{lang === 'en' ? 'Scores by section' : 'Scores par section'}</UpperLabel>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${C.rule}` }}>
              <th style={{ textAlign: 'left', padding: '8px 12px', color: C.mid, fontWeight: 600 }}>Section</th>
              {allPresentEvals.map(e => <th key={e} style={{ textAlign: 'center', padding: '8px 12px', color: EVAL_COLORS[e], fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>{EVAL_SHORT[e]}</th>)}
            </tr>
          </thead>
          <tbody>
            {Object.entries(lang === 'en' ? SEC_NAMES_EN : SEC_NAMES).map(([sec, secName]) => (
              <tr key={sec} style={{ borderBottom: `1px solid ${C.rule}` }}>
                <td style={{ padding: '9px 12px', color: C.ink }}><strong style={{ color: C.blue, marginRight: 6 }}>S{sec}</strong>{secName}</td>
                {allPresentEvals.map(e => {
                  const rec = getRecordForEval(e);
                  const score = safeNum(rec?.fields?.[SCORE_FIELDS[sec]]);
                  const sc = score !== null ? (score >= 7 ? C.green : score >= 5 ? C.orange : C.red) : C.muted;
                  return <td key={e} style={{ textAlign: 'center', padding: '9px 12px', fontWeight: 700, color: sc, fontSize: 14 }}>{score !== null ? score.toFixed(1) : '—'}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Global comments */}
      {globalComments.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {globalComments.map(({ evalType, comment }) => (
            <div key={evalType} style={{ padding: '14px 20px', borderRadius: 8, marginBottom: 8, background: C.white, border: `1px solid ${C.rule}`, borderLeft: `3px solid ${EVAL_COLORS[evalType]}` }}>
              <UpperLabel style={{ color: EVAL_COLORS[evalType], display: 'block', marginBottom: 6 }}>{lang === 'en' ? 'General observation' : 'Observation générale'} — {EVAL_SHORT[evalType]}</UpperLabel>
              <p style={{ margin: 0, fontSize: 13, color: C.mid, lineHeight: 1.75, fontStyle: 'italic' }}>{comment}</p>
            </div>
          ))}
        </div>
      )}

      {/* Section cards */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
        <UpperLabel>{lang === 'en' ? 'Section detail' : 'Détail par section'}</UpperLabel>
        <span style={{ fontSize: 12, color: C.muted }}>{lang === 'en' ? '— click to expand' : '— cliquer pour développer'}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 8, marginBottom: 24 }}>
        {Object.entries(secNames).map(([sec, secName]) => {
          const isOpen = openSection === sec;
          const secQs = QUESTIONS.filter(q => q.sec === sec);
          let appuiCount = 0;
          secQs.forEach(q => {
            for (const e of presentEvals) {
              const rec = getRecordForEval(e);
              if (rec && safeStr(rec.fields[`Appui structure — ${q.id}`]) === 'Oui') appuiCount++;
            }
          });
          return (
            <div key={sec}
              onClick={() => setOpenSection(isOpen ? null : sec)}
              style={{ background: C.white, borderRadius: 10, overflow: 'hidden', gridColumn: isOpen ? '1 / -1' : undefined, cursor: 'pointer', border: isOpen ? `1.5px solid ${C.navy}` : `1px solid ${C.rule}` }}
            >
              <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ background: '#EFF6FF', color: C.blue, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4 }}>S{sec}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{secName}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {presentEvals.map(e => {
                      const rec = getRecordForEval(e);
                      const score = safeNum(rec?.fields?.[SCORE_FIELDS[sec]]);
                      const sc = score !== null ? (score >= 7 ? C.green : score >= 5 ? C.orange : C.red) : C.muted;
                      return <div key={e} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: EVAL_COLORS[e], flexShrink: 0 }} />
                        <span style={{ fontSize: 14, fontWeight: 700, color: sc }}>{score !== null ? score.toFixed(1) : '—'}</span>
                      </div>;
                    })}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  {appuiCount > 0 && <span style={{ background: '#FEE2E2', color: C.red, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4, border: `1px solid #FECACA` }}>{appuiCount}</span>}
                  <span style={{ fontSize: 18, color: C.muted, transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', display: 'inline-block' }}>›</span>
                </div>
              </div>
              {isOpen && (
                <div style={{ padding: '0 18px 20px', borderTop: `1px solid ${C.rule}` }} onClick={e => e.stopPropagation()}>
                  <SectionDetail sec={sec} questions={secQs} presentEvals={presentEvals} getRecordForEval={getRecordForEval} lang={lang} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <AppuiSummary presentEvals={presentEvals} getRecordForEval={getRecordForEval} lang={lang} />
    </div>
  );
}

// ── Main project page ─────────────────────────────────────────────────────────
export default function ProjectPage() {
  const [records, setRecords] = useState([]);
  const [projet, setProjet] = useState('');
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState(null);
  const [fcLinks, setFcLinks] = useState([]);
  const [copiedFC, setCopiedFC] = useState(null);
  const [copiedOSCLink, setCopiedOSCLink] = useState(null);  
  const [error, setError] = useState('');
  const [selectedOSC, setSelectedOSC] = useState('');
  const [selectedFCs, setSelectedFCs] = useState(new Set()); // multi-select
  const [search, setSearch] = useState('');
  const [lang, setLang] = useState('fr');
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, name }
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const k = params.get('key');
    if (!k) { setError('invalid_link'); setLoading(false); return; }
    fetch(`/api/records?key=${k}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setLoading(false); return; }
        setRecords(d.records || []);
        setProjet(d.projet || '');
        setMeta({ type: d.type, facilitateur: d.facilitateur });
        // Load FC share links (only for project managers)
        if (d.type === 'project') {
          fetch(`/api/fc-links?key=${k}`)
            .then(r => r.json())
            .then(fl => setFcLinks(fl.fcs || []));
        }
        setLoading(false);
      })
    .catch(() => { setError('load_error'); setLoading(false); });
  }, []);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const params = new URLSearchParams(window.location.search);
    try {
      const resp = await fetch(`/api/records?key=${params.get('key')}&deleteId=${deleteTarget.id}`, { method: 'DELETE' });
      const data = await resp.json();
      if (data.deleted) {
        setRecords(prev => prev.filter(r => r.id !== deleteTarget.id));
        if (selectedOSC) {
          // Si plus aucun record pour cette OSC, désélectionner
          const remaining = records.filter(r => r.id !== deleteTarget.id && safeStr(r.fields["Nom de l'OSC"]) === selectedOSC);
          if (!remaining.length) setSelectedOSC('');
        }
      }
    } catch (e) { console.error(e); }
    setDeleting(false);
    setDeleteTarget(null);
  }

  const oscNames = [...new Set(records.map(r => safeStr(r.fields["Nom de l'OSC"])).filter(Boolean))].sort();
  const facilitateurs = meta?.type === 'project'
    ? FC_LIST
    : [...new Set(records.map(r => safeStr(r.fields["Facilitateur"])).filter(Boolean))].sort();
  const filteredRecords = selectedFCs.size > 0 ? records.filter(r => selectedFCs.has(safeStr(r.fields["Facilitateur"]))) : records;
  const filteredOscNames = [...new Set(filteredRecords.map(r => safeStr(r.fields["Nom de l'OSC"])).filter(Boolean))].sort();
  const filteredOSCs = filteredOscNames.filter(n => n.toLowerCase().includes(search.toLowerCase()));
  const oscRecords = selectedOSC ? filteredRecords.filter(r => safeStr(r.fields["Nom de l'OSC"]) === selectedOSC) : [];

  // Quick stats
  const stats = filteredOscNames.map(name => {
    const recs = filteredRecords.filter(r => safeStr(r.fields["Nom de l'OSC"]) === name);
    const latest = EVAL_ORDER.slice().reverse().find(e => recs.some(r => safeStr(r.fields["Type d'évaluation"]) === e));
    const latestRec = recs.find(r => safeStr(r.fields["Type d'évaluation"]) === latest);
    const score = safeNum(latestRec?.fields?.Score_Global);
    return { name, score, latest, evalCount: recs.length, recId: latestRec?.id || recs[0]?.id };
  });

  if (loading) return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted }}>
      {lang === 'en' ? 'Loading...' : 'Chargement...'}
    </div>
  );

  const ERROR_LABELS = { invalid_link: { fr: 'Lien invalide', en: 'Invalid link' }, load_error: { fr: 'Erreur de chargement', en: 'Loading error' } };
  if (error) return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.red, fontSize: 14 }}>
      {ERROR_LABELS[error]?.[lang] || error}
    </div>
  );

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", background: C.bg, minHeight: '100vh' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'); * { box-sizing: border-box; } button { font-family: inherit; }`}</style>
     
      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => !deleting && setDeleteTarget(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.white, borderRadius: 12, padding: '28px 32px', maxWidth: 400, width: '90%', boxShadow: '0 8px 30px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.ink, marginBottom: 12 }}>
              {lang === 'en' ? 'Delete this assessment?' : 'Supprimer cette évaluation ?'}
            </div>
            <p style={{ fontSize: 13, color: C.mid, lineHeight: 1.6, margin: '0 0 20px' }}>
              {lang === 'en'
                ? `You are about to permanently delete the assessment for "${deleteTarget.name}". This action is irreversible.`
                : `Vous êtes sur le point de supprimer définitivement l'évaluation de « ${deleteTarget.name} ». Cette action est irréversible.`}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteTarget(null)} disabled={deleting}
                style={{ padding: '8px 18px', borderRadius: 6, border: `1px solid ${C.rule}`, background: C.white, color: C.ink, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                {lang === 'en' ? 'Cancel' : 'Annuler'}
              </button>
              <button onClick={handleDelete} disabled={deleting}
                style={{ padding: '8px 18px', borderRadius: 6, border: 'none', background: C.red, color: C.white, fontSize: 13, fontWeight: 700, cursor: deleting ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: deleting ? 0.6 : 1 }}>
                {deleting
                  ? (lang === 'en' ? 'Deleting…' : 'Suppression…')
                  : (lang === 'en' ? 'Delete permanently' : 'Supprimer définitivement')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navbar */}
      <nav style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px', position: 'sticky', top: 0, zIndex: 100, borderBottom: `1px solid ${C.rule}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: 1200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <img src="https://images.fillout.com/orgid-732662/flowpublicid-p3BgAaYgGLus/widgetid-mMJS/kXtZ75Zg8QSTBDfjg3Vcwb/PULSE_LOGO_COULEUR.svg?a=rtAAwtQK1rtQfYt7rqMdQS" style={{ height: 32 }} alt="PULSE" />
            <div style={{ width: 1, height: 24, background: C.rule }} />
            <span style={{ fontSize: 15, fontWeight: 500, color: C.ink }}>
              {meta?.type === 'fc'
                ? `${meta.facilitateur}`
                : `${lang === 'en' ? 'Project Dashboard' : 'Dashboard projet'} — ${projet}`}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 2, background: C.bg, borderRadius: 20, padding: 3 }}>
            {['fr', 'en'].map(l => (
              <button key={l} onClick={() => setLang(l)} style={{ padding: '4px 14px', borderRadius: 16, border: 'none', cursor: 'pointer', background: lang === l ? C.white : 'transparent', color: lang === l ? C.ink : C.muted, fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', transition: 'all 0.15s' }}>{l}</button>
            ))}
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 40px 80px' }}>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 32 }}>
          {[
            { label: lang === 'en' ? 'OSCs followed' : 'OSC suivies', value: filteredOscNames.length },
            { label: lang === 'en' ? 'Assessments' : 'Évaluations', value: filteredRecords.length },
            { label: lang === 'en' ? 'Avg. global score' : 'Score moyen', value: (() => {
              const scores = stats.map(s => s.score).filter(s => s !== null);
              return scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) + ' / 10' : '—';
            })() },
          ].map((kpi, i) => (
            <Card key={i} style={{ padding: '16px 20px' }}>
              <UpperLabel style={{ display: 'block', marginBottom: 8 }}>{kpi.label}</UpperLabel>
              <div style={{ fontSize: 28, fontWeight: 800, color: C.ink }}>{kpi.value}</div>
            </Card>
          ))}
        </div>

        {/* FC Cards — multi-select filter + copy link */}
        {meta?.type === 'project' && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <UpperLabel>{lang === 'en' ? 'Field catalysts' : 'Facilitateurs'}</UpperLabel>
              {selectedFCs.size > 0 && (
                <button onClick={() => { setSelectedFCs(new Set()); setSelectedOSC(''); }}
                  style={{ fontSize: 10, color: C.muted, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0, fontFamily: 'inherit' }}>
                  {lang === 'en' ? 'Clear filter' : 'Tout afficher'}
                </button>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
              {facilitateurs.map(fc => {
                const isSelected = selectedFCs.has(fc);
                const fcLink = fcLinks.find(f => f.name === fc);
                const isCopied = copiedFC === fc;
                // Stats for this FC
                const fcRecs = records.filter(r => safeStr(r.fields['Facilitateur']) === fc);
                const fcOscs = [...new Set(fcRecs.map(r => safeStr(r.fields["Nom de l'OSC"])).filter(Boolean))];
                const fcScores = fcOscs.map(name => {
                  const recs = fcRecs.filter(r => safeStr(r.fields["Nom de l'OSC"]) === name);
                  const latest = EVAL_ORDER.slice().reverse().find(e => recs.some(r => safeStr(r.fields["Type d'évaluation"]) === e));
                  const latestRec = recs.find(r => safeStr(r.fields["Type d'évaluation"]) === latest);
                  return safeNum(latestRec?.fields?.Score_Global);
                }).filter(s => s !== null);
                const avgScore = fcScores.length ? (fcScores.reduce((a,b) => a+b, 0) / fcScores.length).toFixed(1) : null;
                const sc = avgScore ? (Number(avgScore) >= 7 ? C.green : Number(avgScore) >= 5 ? C.orange : C.red) : C.muted;

                return (
                  <div key={fc} style={{
                    borderRadius: 8, overflow: 'hidden',
                    border: `1.5px solid ${isSelected ? C.navy : C.rule}`,
                    background: isSelected ? '#F0F7FF' : C.white,
                    transition: 'all 0.15s',
                  }}>
                    {/* Clickable card header */}
                    <div onClick={() => {
                        const next = new Set(selectedFCs);
                        if (next.has(fc)) next.delete(fc); else next.add(fc);
                        setSelectedFCs(next);
                        setSelectedOSC('');
                      }}
                      style={{ padding: '12px 14px', cursor: 'pointer' }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, marginBottom: 6 }}>{fc}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 11, color: C.muted }}>{fcOscs.length} OSC</span>
                        {avgScore && <span style={{ fontSize: 13, fontWeight: 700, color: sc }}>{avgScore}<span style={{ fontSize: 10, color: C.muted }}>/10</span></span>}
                        <span style={{ marginLeft: 'auto', width: 16, height: 16, borderRadius: '50%', border: `2px solid ${isSelected ? C.navy : C.rule}`, background: isSelected ? C.navy : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {isSelected && <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.white }} />}
                        </span>
                      </div>
                    </div>
                    {/* Copy link button */}
                    {fcLink?.url && (
                      <div style={{ borderTop: `1px solid ${C.rule}`, padding: '6px 14px' }}>
                        <button onClick={() => {
                            navigator.clipboard.writeText(fcLink.url);
                            setCopiedFC(fc);
                            setTimeout(() => setCopiedFC(null), 2000);
                          }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700, color: isCopied ? C.green : C.blue, padding: 0, fontFamily: 'inherit', letterSpacing: 0.3 }}>
                          {isCopied ? (lang === 'en' ? 'Copied!' : 'Copié !') : (lang === 'en' ? 'Copy facilitator link' : 'Copier le lien')}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: selectedOSC ? '280px 1fr' : '1fr', gap: 20, alignItems: 'start' }}>

          {/* Left panel — OSC list */}
          <div>
            <Card style={{ overflow: 'hidden' }}>
              <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.rule}` }}>

                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={lang === 'en' ? 'Search an organisation...' : 'Rechercher une organisation...'}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: `1px solid ${C.rule}`, fontSize: 13, color: C.ink, outline: 'none', fontFamily: 'inherit' }}
                />
              </div>
              <div style={{ maxHeight: selectedOSC ? '70vh' : undefined, overflowY: selectedOSC ? 'auto' : undefined }}>
                {filteredOSCs.map(name => {
                  const stat = stats.find(s => s.name === name);
                  const sc = stat?.score !== null ? (stat.score >= 7 ? C.green : stat.score >= 5 ? C.orange : C.red) : C.muted;
                  const isSelected = selectedOSC === name;
                  return (
                    <div key={name}
                      onClick={() => setSelectedOSC(isSelected ? '' : name)}
                      style={{ padding: '12px 14px', cursor: 'pointer', background: isSelected ? '#EFF6FF' : 'transparent', borderBottom: `1px solid ${C.rule}`, borderLeft: isSelected ? `3px solid ${C.blue}` : '3px solid transparent', transition: 'all 0.1s' }}
                    >
                      <div style={{ fontSize: 13, fontWeight: isSelected ? 700 : 500, color: C.ink, marginBottom: 3 }}>{name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: sc }}>{stat?.score !== null ? stat.score.toFixed(1) : '—'}</span>
                        <span style={{ fontSize: 10, color: C.muted, marginLeft: 'auto' }}>{stat?.evalCount} {lang === 'en' ? 'assess.' : 'éval.'}</span>
                        <span style={{ fontSize: 10, color: C.muted, marginLeft: 'auto' }}>{stat?.evalCount} éval.</span>
                        {stat?.recId && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              const url = `${window.location.origin}/?id=${stat.recId}`;
                              navigator.clipboard.writeText(url);
                              setCopiedOSCLink(stat.recId);
                              setTimeout(() => setCopiedOSCLink(null), 2000);
                            }}
                            title={lang === 'en' ? 'Copy OSC link' : "Copier le lien de l'OSC"}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', fontSize: 13, color: copiedOSCLink === stat.recId ? C.green : C.blue, fontFamily: 'inherit', lineHeight: 1 }}
                          >
                            {copiedOSCLink === stat.recId
                              ? (lang === 'en' ? 'Link copied ✓' : 'Lien copié ✓')
                              : (lang === 'en' ? 'Copy CSO link 🔗' : "Copier le lien OSC 🔗")}                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {filteredOSCs.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: C.muted, fontSize: 13 }}>{lang === 'en' ? 'No results' : 'Aucun résultat'}</div>}
              </div>
            </Card>
          </div>

          {/* Right panel — OSC detail */}
          {selectedOSC && oscRecords.length > 0 && (
            <div>
              <div style={{ marginBottom: 24 }}>
                <UpperLabel style={{ display: 'block', marginBottom: 6 }}>
                  {displayCountry(safeStr(oscRecords[0]?.fields?.Pays), lang)}
                </UpperLabel>
                <h2 style={{ fontSize: 28, fontWeight: 900, color: C.ink, margin: '0 0 12px', letterSpacing: -0.5 }}>{selectedOSC}</h2>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      className="no-print"
                      onClick={() => {
                        const rec = oscRecords[0];
                        const recId = rec?.id;
                        if (recId) window.open(`/?id=${recId}&print=1`, '_blank');
                      }}
                      style={{
                        padding: '7px 16px', borderRadius: 6, border: `1px solid ${C.rule}`,
                        background: C.white, color: C.navy, fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                        fontFamily: 'inherit',
                      }}
                    >
                      <span style={{ fontSize: 14 }}>⬇</span> {lang === 'en' ? 'Download PDF' : 'Télécharger PDF'}
                    </button>
                    {oscRecords.map(rec => (
                      <button key={rec.id}
                        className="no-print"
                        onClick={() => setDeleteTarget({ id: rec.id, name: `${selectedOSC} — ${EVAL_SHORT[safeStr(rec.fields["Type d'évaluation"])] || '?'}` })}
                        style={{
                          padding: '7px 12px', borderRadius: 6, border: `1px solid #FECACA`,
                          background: '#FEF2F2', color: C.red, fontSize: 12, fontWeight: 600,
                          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
                          fontFamily: 'inherit',
                        }}
                      >
                        <span style={{ fontSize: 13 }}>🗑</span> {EVAL_SHORT[safeStr(rec.fields["Type d'évaluation"])] || (lang === 'en' ? 'Delete' : 'Supprimer')}
                      </button>
                    ))}
                  </div>
              </div>
              <OSCDetail oscName={selectedOSC} oscRecords={oscRecords} lang={lang} />
            </div>
          )}

          {/* No OSC selected — show all as grid */}
          {!selectedOSC && (
            <div style={{ gridColumn: '1 / -1' }}>
              <UpperLabel style={{ display: 'block', marginBottom: 14 }}>
                {lang === 'en' ? 'All organisations' : 'Toutes les organisations'}
              </UpperLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                {stats.map(s => {
                  const sc = s.score !== null ? (s.score >= 7 ? C.green : s.score >= 5 ? C.orange : C.red) : C.muted;
                  return (
                    <Card key={s.name}
                      onClick={() => setSelectedOSC(s.name)}
                      style={{ padding: '14px 16px', cursor: 'pointer' }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 6 }}>{s.name}</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: sc, lineHeight: 1, marginBottom: 4 }}>
                        {s.score !== null ? s.score.toFixed(1) : '—'}<span style={{ fontSize: 11, fontWeight: 400, color: C.muted }}> / 10</span>
                      </div>
                      <div style={{ fontSize: 11, color: C.muted }}>{s.latest ? EVAL_SHORT[s.latest] : (lang === 'en' ? 'No assessment' : 'Aucune évaluation')}</div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}