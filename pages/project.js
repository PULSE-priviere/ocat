import { useState, useEffect } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Legend, ResponsiveContainer, Tooltip
} from 'recharts';
import {
  SEC_NAMES, SEC_NAMES_EN, SCORE_FIELDS, QUESTIONS,
  EVAL_ORDER, EVAL_COLORS, EVAL_SHORT
} from '../config';

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

const C = {
  navy: '#1B3A5C', ink: '#0F172A', mid: '#475569', muted: '#94A3B8',
  rule: '#E2E8F0', bg: '#F1F5F9', white: '#FFFFFF',
  red: '#DC2626', orange: '#D97706', green: '#16A34A', blue: '#2563EB',
};

const SCORE_STYLE = {
  1:  { color: C.red,    bg: '#FEF2F2', border: '#FECACA', label: 'Non mis en place' },
  2:  { color: C.orange, bg: '#FFFBEB', border: '#FDE68A', label: 'Partiellement mis en place' },
  3:  { color: C.green,  bg: '#F0FDF4', border: '#BBF7D0', label: 'Documenté et opérationnel' },
  99: { color: C.muted,  bg: C.bg,      border: C.rule,    label: 'Non répondu / Non applicable' },
};

const EVAL_KEY = {
  "Baseline (début d'accompagnement)": 'baseline',
  'Suivi intermédiaire': 'suivi',
  "Endline (fin d'accompagnement)": 'endline',
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
              <span style={{ fontSize: 11, fontWeight: 600, color: st.color, textTransform: 'uppercase', letterSpacing: 0.4 }}>{st.label}</span>
              <span style={{ fontSize: 11, color: st.color, opacity: 0.55, marginLeft: 'auto' }}>{group.length} question{group.length > 1 ? 's' : ''}</span>
            </div>
            {group.map(row => (
              <div key={row.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '11px 14px', marginBottom: 4, borderRadius: 6, background: row.hasAppui ? '#FFF8F8' : C.white, border: `1px solid ${row.hasAppui ? '#FECACA' : C.rule}` }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {row.hasAppui && <span style={{ display: 'inline-block', marginRight: 8, marginBottom: 3, padding: '1px 6px', borderRadius: 3, background: '#FEE2E2', color: C.red, fontSize: 9, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', verticalAlign: 'middle' }}>Accompagnement demandé</span>}
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
          <UpperLabel style={{ color: C.red }}>Demandes d'accompagnement</UpperLabel>
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
          <UpperLabel style={{ marginRight: 4 }}>Afficher</UpperLabel>
          {[null, ...allPresentEvals].map((e, i) => {
            const active = selectedEval === e;
            const color = e ? EVAL_COLORS[e] : C.ink;
            const label = e ? EVAL_SHORT[e] : 'Toutes';
            return <button key={i} onClick={() => setSelectedEval(e)} style={{ padding: '5px 16px', borderRadius: 20, border: `1.5px solid ${active ? color : C.rule}`, background: active ? color : C.white, color: active ? C.white : C.mid, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}>{label}</button>;
          })}
        </div>
      )}

      {/* Radar */}
      <Card style={{ padding: '24px 24px 16px', marginBottom: 14 }}>
        <UpperLabel style={{ display: 'block', marginBottom: 20 }}>Scores par section</UpperLabel>
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
        <UpperLabel style={{ display: 'block', marginBottom: 16 }}>Scores par section</UpperLabel>
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
              <UpperLabel style={{ color: EVAL_COLORS[evalType], display: 'block', marginBottom: 6 }}>Observation générale — {EVAL_SHORT[evalType]}</UpperLabel>
              <p style={{ margin: 0, fontSize: 13, color: C.mid, lineHeight: 1.75, fontStyle: 'italic' }}>{comment}</p>
            </div>
          ))}
        </div>
      )}

      {/* Section cards */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
        <UpperLabel>Détail par section</UpperLabel>
        <span style={{ fontSize: 12, color: C.muted }}>— cliquer pour développer</span>
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
  const [error, setError] = useState('');
  const [selectedOSC, setSelectedOSC] = useState('');
  const [filterFC, setFilterFC] = useState('');
  const [search, setSearch] = useState('');
  const [lang, setLang] = useState('fr');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const k = params.get('key');
    if (!k) { setError('Lien invalide'); setLoading(false); return; }
    fetch(`/api/records?key=${k}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setLoading(false); return; }
        setRecords(d.records || []);
        setProjet(d.projet || '');
        setMeta({ type: d.type, facilitateur: d.facilitateur });
        setLoading(false);
      })
      .catch(() => { setError('Erreur de chargement'); setLoading(false); });
  }, []);

  const oscNames = [...new Set(records.map(r => safeStr(r.fields["Nom de l'OSC"])).filter(Boolean))].sort();
  const facilitateurs = [...new Set(records.map(r => safeStr(r.fields["Facilitateur"])).filter(Boolean))].sort();
  const filteredRecords = filterFC ? records.filter(r => safeStr(r.fields["Facilitateur"]) === filterFC) : records;
  const filteredOscNames = [...new Set(filteredRecords.map(r => safeStr(r.fields["Nom de l'OSC"])).filter(Boolean))].sort();
  const filteredOSCs = filteredOscNames.filter(n => n.toLowerCase().includes(search.toLowerCase()));
  const oscRecords = selectedOSC ? filteredRecords.filter(r => safeStr(r.fields["Nom de l'OSC"]) === selectedOSC) : [];

  // Quick stats
  const stats = filteredOscNames.map(name => {
    const recs = filteredRecords.filter(r => safeStr(r.fields["Nom de l'OSC"]) === name);
    const latest = EVAL_ORDER.slice().reverse().find(e => recs.some(r => safeStr(r.fields["Type d'évaluation"]) === e));
    const latestRec = recs.find(r => safeStr(r.fields["Type d'évaluation"]) === latest);
    const score = safeNum(latestRec?.fields?.Score_Global);
    return { name, score, latest, evalCount: recs.length };
  });

  if (loading) return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted }}>
      Chargement...
    </div>
  );

  if (error) return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.red, fontSize: 14 }}>
      {error}
    </div>
  );

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", background: C.bg, minHeight: '100vh' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'); * { box-sizing: border-box; } button { font-family: inherit; }`}</style>

      {/* Navbar */}
      <nav style={{ background: C.navy, height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 48px', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 16px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <img src="https://images.fillout.com/orgid-732662/flowpublicid-p3BgAaYgGLus/widgetid-mMJS/kXtZ75Zg8QSTBDfjg3Vcwb/PULSE_LOGO_COULEUR.svg?a=rtAAwtQK1rtQfYt7rqMdQS" style={{ height: 38, filter: 'brightness(0) invert(1)' }} alt="PULSE" />
          <div style={{ width: 1, height: 30, background: 'rgba(255,255,255,0.2)' }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.95)' }}>
            {meta?.type === 'fc'
              ? `${meta.facilitateur}`
              : `${lang === 'en' ? 'Project Dashboard' : 'Dashboard projet'} — ${projet}`}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: 3 }}>
          {['fr', 'en'].map(l => (
            <button key={l} onClick={() => setLang(l)} style={{ padding: '4px 14px', borderRadius: 16, border: 'none', cursor: 'pointer', background: lang === l ? C.white : 'transparent', color: lang === l ? C.navy : 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', transition: 'all 0.15s' }}>{l}</button>
          ))}
        </div>
      </nav>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 40px 80px' }}>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 32 }}>
          {[
            { label: lang === 'en' ? 'OSCs followed' : 'OSC suivies', value: filteredOscNames.length },
            { label: lang === 'en' ? 'Assessments' : 'Évaluations', value: records.length },
            { label: lang === 'en' ? 'Avg. global score' : 'Score moyen', value: (() => {
              const scores = stats.map(s => s.score).filter(s => s !== null);
              return scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '—';
            })() + (stats.some(s => s.score !== null) ? ' / 10' : '') },
          ].map((kpi, i) => (
            <Card key={i} style={{ padding: '16px 20px' }}>
              <UpperLabel style={{ display: 'block', marginBottom: 8 }}>{kpi.label}</UpperLabel>
              <div style={{ fontSize: 28, fontWeight: 800, color: C.ink }}>{kpi.value}</div>
            </Card>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: selectedOSC ? '280px 1fr' : '1fr', gap: 20, alignItems: 'start' }}>

          {/* Left panel — OSC list */}
          <div>
            <Card style={{ overflow: 'hidden' }}>
              <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.rule}` }}>
                {facilitateurs.length > 1 && meta?.type === 'project' && (
                  <div style={{ marginBottom: 8 }}>
                    <select
                      value={filterFC}
                      onChange={e => { setFilterFC(e.target.value); setSelectedOSC(''); }}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: `1px solid ${C.rule}`, fontSize: 12, color: C.ink, marginBottom: 4, fontFamily: 'inherit', background: filterFC ? '#EFF6FF' : C.white }}
                    >
                      <option value="">{lang === 'en' ? 'All facilitators' : 'Tous les facilitateurs'}</option>
                      {facilitateurs.map(fc => <option key={fc} value={fc}>{fc}</option>)}
                    </select>
                  </div>
                )}
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
                        <span style={{ fontSize: 11, color: C.muted }}>{stat?.latest ? EVAL_SHORT[stat.latest] : ''}</span>
                        <span style={{ fontSize: 10, color: C.muted, marginLeft: 'auto' }}>{stat?.evalCount} éval.</span>
                      </div>
                    </div>
                  );
                })}
                {filteredOSCs.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: C.muted, fontSize: 13 }}>Aucun résultat</div>}
              </div>
            </Card>
          </div>

          {/* Right panel — OSC detail */}
          {selectedOSC && oscRecords.length > 0 && (
            <div>
              <div style={{ marginBottom: 24 }}>
                <UpperLabel style={{ display: 'block', marginBottom: 6 }}>
                  {safeStr(oscRecords[0]?.fields?.Pays)}
                </UpperLabel>
                <h2 style={{ fontSize: 28, fontWeight: 900, color: C.ink, margin: 0, letterSpacing: -0.5 }}>{selectedOSC}</h2>
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
                      <div style={{ fontSize: 11, color: C.muted }}>{s.latest ? EVAL_SHORT[s.latest] : 'Aucune évaluation'}</div>
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
