import { useState, useEffect } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Legend, ResponsiveContainer, Tooltip
} from 'recharts';
import { SEC_NAMES, SCORE_FIELDS, QUESTIONS, EVAL_ORDER, EVAL_COLORS, EVAL_SHORT } from '../config';

// ── Safe value extractors ─────────────────────────────────────────────────────
function safeNum(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'object') return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}
function safeStr(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') return '';
  return String(val);
}
function getScoreNum(val) {
  const s = safeStr(val);
  if (s.startsWith('1')) return 1;
  if (s.startsWith('2')) return 2;
  if (s.startsWith('3')) return 3;
  return null;
}

// ── Palette & tokens ──────────────────────────────────────────────────────────
const C = {
  navy:   '#1B3A5C',
  ink:    '#0F172A',
  mid:    '#475569',
  muted:  '#94A3B8',
  rule:   '#E2E8F0',
  bg:     '#F1F5F9',
  white:  '#FFFFFF',
  red:    '#DC2626',
  orange: '#D97706',
  green:  '#16A34A',
  blue:   '#2563EB',
};

const SCORE_STYLE = {
  1:  { color: C.red,    bg: '#FEF2F2', border: '#FECACA', label: 'Non mis en place' },
  2:  { color: C.orange, bg: '#FFFBEB', border: '#FDE68A', label: 'Partiellement mis en place' },
  3:  { color: C.green,  bg: '#F0FDF4', border: '#BBF7D0', label: 'Documenté et opérationnel' },
  99: { color: C.muted,  bg: C.bg,      border: C.rule,    label: 'Non répondu / Non applicable' },
};

// ── Shared micro-components ───────────────────────────────────────────────────
function ScoreChip({ val }) {
  const s = getScoreNum(val);
  const st = SCORE_STYLE[s] || SCORE_STYLE[99];
  const label = s ? String(s) : (safeStr(val).includes('N/A') ? 'N/A' : '—');
  return (
    <span style={{
      display: 'inline-block', minWidth: 32, textAlign: 'center',
      padding: '2px 8px', borderRadius: 4,
      background: st.bg, color: st.color,
      border: `1px solid ${st.border}`,
      fontSize: 11, fontWeight: 700, letterSpacing: 0.2,
    }}>{label}</span>
  );
}

function Label({ children, style }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: 1,
      textTransform: 'uppercase', color: C.muted, ...style
    }}>{children}</span>
  );
}

function Card({ children, style }) {
  return (
    <div style={{
      background: C.white, borderRadius: 10,
      border: `1px solid ${C.rule}`,
      ...style
    }}>{children}</div>
  );
}

// ── Section detail ────────────────────────────────────────────────────────────
function SectionDetail({ sec, questions, presentEvals, getRecordForEval }) {
  const qRows = questions.map(q => {
    const scores = {}, appuis = {};
    let minScore = 99;
    for (const e of presentEvals) {
      const rec = getRecordForEval(e);
      const qKey = rec ? Object.keys(rec.fields).find(k => k.startsWith(`[${q.id}]`)) : null;
      const val = qKey ? safeStr(rec.fields[qKey]) : '';
      const appui = rec ? safeStr(rec.fields[`Appui structure — ${q.id}`]) : '';
      scores[e] = val;
      appuis[e] = appui === 'Oui';
      const s = getScoreNum(val);
      if (s) minScore = Math.min(minScore, s);
    }
    const hasAppui = Object.values(appuis).some(Boolean);
    return { ...q, scores, appuis, hasAppui, minScore };
  }).sort((a, b) => {
    if (a.minScore !== b.minScore) return a.minScore - b.minScore;
    if (a.hasAppui !== b.hasAppui) return a.hasAppui ? -1 : 1;
    return 0;
  });

  const comments = presentEvals.map(e => {
    const rec = getRecordForEval(e);
    if (!rec) return null;
    const entry = Object.entries(rec.fields).find(([k]) => k.startsWith(`Commentaire_S${sec}_`));
    const c = entry ? safeStr(entry[1]) : '';
    return c ? { evalType: e, comment: c } : null;
  }).filter(Boolean);

  return (
    <div style={{ marginTop: 20, paddingTop: 20, borderTop: `1px solid ${C.rule}` }}>
      {comments.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {comments.map(({ evalType, comment }) => (
            <div key={evalType} style={{
              padding: '12px 16px', borderRadius: 6, marginBottom: 8,
              background: '#FAFBFC',
              borderLeft: `3px solid ${EVAL_COLORS[evalType]}`,
            }}>
              <Label style={{ color: EVAL_COLORS[evalType], display: 'block', marginBottom: 4 }}>
                Observation — {EVAL_SHORT[evalType]}
              </Label>
              <p style={{ margin: 0, fontSize: 13, color: C.mid, lineHeight: 1.65, fontStyle: 'italic' }}>
                {comment}
              </p>
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
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '5px 12px', borderRadius: 5, marginBottom: 8,
              background: st.bg, borderLeft: `3px solid ${st.color}`,
            }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: st.color }}>
                {sg === 99 ? '—' : sg}
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, color: st.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {st.label}
              </span>
              <span style={{ fontSize: 11, color: st.color, opacity: 0.55, marginLeft: 'auto' }}>
                {group.length} question{group.length > 1 ? 's' : ''}
              </span>
            </div>
            {group.map(row => (
              <div key={row.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '10px 14px', marginBottom: 3, borderRadius: 6,
                background: row.hasAppui ? '#FFF8F8' : C.white,
                border: `1px solid ${row.hasAppui ? '#FECACA' : C.rule}`,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {row.hasAppui && (
                    <span style={{
                      display: 'inline-block', marginRight: 8, marginBottom: 2,
                      padding: '1px 6px', borderRadius: 3,
                      background: '#FEE2E2', color: C.red,
                      fontSize: 9, fontWeight: 700, letterSpacing: 0.8,
                      textTransform: 'uppercase', verticalAlign: 'middle',
                    }}>Accompagnement demandé</span>
                  )}
                  <span style={{ fontSize: 13, color: C.ink, lineHeight: 1.55 }}>{row.label}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center', paddingTop: 2 }}>
                  {presentEvals.map(e => (
                    <div key={e} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 9, color: EVAL_COLORS[e], fontWeight: 600, marginBottom: 3, letterSpacing: 0.2 }}>
                        {EVAL_SHORT[e].charAt(0)}
                      </div>
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

// ── Accompagnement summary (collapsible) ──────────────────────────────────────
function AppuiSummary({ presentEvals, getRecordForEval }) {
  const [open, setOpen] = useState(false);

  const items = [];
  for (const [sec] of Object.entries(SEC_NAMES)) {
    for (const q of QUESTIONS.filter(q => q.sec === sec)) {
      const evals = presentEvals.filter(e => {
        const rec = getRecordForEval(e);
        return rec && safeStr(rec.fields[`Appui structure — ${q.id}`]) === 'Oui';
      });
      if (evals.length) items.push({ sec, id: q.id, label: q.label, evals });
    }
  }
  if (!items.length) return null;

  return (
    <Card style={{ marginBottom: 24, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '16px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'none', border: 'none', cursor: 'pointer',
          borderBottom: open ? `1px solid ${C.rule}` : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Label style={{ color: C.red }}>Demandes d'accompagnement</Label>
          <span style={{ background: '#FEE2E2', color: C.red, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>
            {items.length}
          </span>
        </div>
        <span style={{ fontSize: 18, color: C.muted, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', display: 'inline-block' }}>›</span>
      </button>

      {open && (
        <div style={{ padding: '16px 20px' }}>
          {Object.entries(SEC_NAMES).map(([sec, secName]) => {
            const secItems = items.filter(i => i.sec === sec);
            if (!secItems.length) return null;
            return (
              <div key={sec} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.navy, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  S{sec} — {secName}
                </div>
                {secItems.map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                    padding: '8px 12px', borderRadius: 5,
                    background: '#FFF8F8', border: `1px solid #FECACA`, marginBottom: 4,
                  }}>
                    <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, color: C.muted, paddingTop: 2 }}>{item.id}</span>
                    <div style={{ flex: 1, fontSize: 12, color: C.ink, lineHeight: 1.5 }}>{item.label}</div>
                    <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                      {item.evals.map(e => (
                        <span key={e} style={{ background: EVAL_COLORS[e], color: C.white, fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 3, letterSpacing: 0.3 }}>
                          {EVAL_SHORT[e].charAt(0)}
                        </span>
                      ))}
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

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [oscs, setOscs] = useState([]);
  const [selectedOSC, setSelectedOSC] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openSection, setOpenSection] = useState(null);
  const [directId, setDirectId] = useState(null);
  const [selectedEval, setSelectedEval] = useState(null);

  useEffect(() => {
    fetch('/api/oscs').then(r => r.json()).then(d => setOscs(d.oscs || []));
    const params = new URLSearchParams(window.location.search);
    const recordId = params.get('id');
    if (recordId) {
      setDirectId(recordId);
      setLoading(true);
      fetch(`/api/records?id=${encodeURIComponent(recordId)}`)
        .then(r => r.json())
        .then(d => {
          if (d.records?.length) {
            setRecords(d.records);
            setSelectedOSC(safeStr(d.oscName || d.records[0].fields["Nom de l'OSC"]));
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, []);

  useEffect(() => {
    if (!selectedOSC || directId) return;
    setLoading(true);
    fetch(`/api/records?osc=${encodeURIComponent(selectedOSC)}`)
      .then(r => r.json())
      .then(d => { setRecords(d.records || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedOSC]);

  const allPresentEvals = EVAL_ORDER.filter(e =>
    records.some(r => safeStr(r.fields["Type d'évaluation"]) === e)
  );
  const presentEvals = selectedEval
    ? allPresentEvals.filter(e => e === selectedEval)
    : allPresentEvals;

  const getRecordForEval = (evalType) =>
    records.find(r => safeStr(r.fields["Type d'évaluation"]) === evalType);

  // Radar — always show all evals regardless of filter for context
  const radarData = Object.entries(SCORE_FIELDS).map(([sec, field]) => {
    const entry = { section: SEC_NAMES[sec].split('&')[0].trim().split(',')[0].trim().split(' ').slice(0, 2).join(' ') };
    for (const e of allPresentEvals) {
      const rec = getRecordForEval(e);
      entry[e] = rec ? (safeNum(rec.fields[field]) || 0) : 0;
    }
    return entry;
  });

  const globalComment = safeStr(
    records.find(r => r.fields['Commentaire global'])?.fields?.['Commentaire global']
  );

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: C.bg, minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        button { font-family: inherit; }
      `}</style>

      {/* Top navigation */}
      <nav style={{
        background: C.navy, height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 48px', position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <img
            src="https://images.fillout.com/orgid-732662/flowpublicid-p3BgAaYgGLus/widgetid-mMJS/kXtZ75Zg8QSTBDfjg3Vcwb/PULSE_LOGO_COULEUR.svg?a=rtAAwtQK1rtQfYt7rqMdQS"
            style={{ height: 36, filter: 'brightness(0) invert(1)' }}
            alt="PULSE"
          />
          <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.15)' }} />
          <span style={{
            fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.90)',
            letterSpacing: 0.3,
          }}>Diagnostic organisationnel</span>
        </div>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: 0.5, textTransform: 'uppercase' }}>
          PULSE / PPI
        </span>
      </nav>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 40px 80px' }}>

        {/* OSC selector */}
        {!directId && (
          <div style={{ marginBottom: 36 }}>
            <Label style={{ display: 'block', marginBottom: 8 }}>Organisation</Label>
            <select
              value={selectedOSC}
              onChange={e => { setSelectedOSC(e.target.value); setOpenSection(null); setSelectedEval(null); }}
              style={{
                padding: '10px 14px', borderRadius: 6,
                border: `1.5px solid ${C.rule}`, background: C.white,
                fontSize: 14, color: C.ink, minWidth: 340, cursor: 'pointer',
                outline: 'none', appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' fill='none'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2394A3B8' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
                paddingRight: 36,
              }}
            >
              <option value="">Sélectionner une organisation</option>
              {oscs.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: 80, color: C.muted, fontSize: 14 }}>
            Chargement des données...
          </div>
        )}

        {!loading && selectedOSC && records.length > 0 && (
          <>
            {/* OSC header */}
            <div style={{ marginBottom: 36 }}>
              <Label style={{ display: 'block', marginBottom: 6 }}>
                {safeStr(records[0]?.fields?.Projet)} · {safeStr(records[0]?.fields?.Pays)}
              </Label>
              <h1 style={{
                fontSize: 36, fontWeight: 900, color: C.ink,
                margin: '0 0 12px', letterSpacing: -0.8, lineHeight: 1.1,
              }}>{selectedOSC}</h1>
              {globalComment && (
                <p style={{
                  margin: 0, fontSize: 14, color: C.mid, lineHeight: 1.7,
                  maxWidth: 680, fontStyle: 'italic',
                  paddingLeft: 14, borderLeft: `3px solid ${C.rule}`,
                }}>{globalComment}</p>
              )}
            </div>

            {/* Score cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${allPresentEvals.length}, minmax(150px, 200px))`,
              gap: 12, marginBottom: 28,
            }}>
              {allPresentEvals.map(evalType => {
                const rec = getRecordForEval(evalType);
                const score = safeNum(rec?.fields?.Score_Global);
                const niveau = safeStr(rec?.fields?.Niveau_Global);
                const date = safeStr(rec?.fields?.['Date de soumission']);
                const sc = score !== null ? (score >= 7 ? C.green : score >= 5 ? C.orange : C.red) : C.muted;
                const isFiltered = selectedEval === evalType;
                return (
                  <Card key={evalType} style={{
                    padding: '18px 20px',
                    borderTop: `3px solid ${EVAL_COLORS[evalType]}`,
                    cursor: allPresentEvals.length > 1 ? 'pointer' : 'default',
                    outline: isFiltered ? `2px solid ${EVAL_COLORS[evalType]}` : 'none',
                    outlineOffset: 2,
                    transition: 'box-shadow 0.15s',
                  }}
                    onClick={() => allPresentEvals.length > 1 && setSelectedEval(isFiltered ? null : evalType)}
                  >
                    <Label style={{ color: EVAL_COLORS[evalType], display: 'block', marginBottom: 10 }}>
                      {EVAL_SHORT[evalType]}
                    </Label>
                    <div style={{ fontSize: 32, fontWeight: 800, color: sc, lineHeight: 1, marginBottom: 6 }}>
                      {score !== null ? score.toFixed(1) : '—'}
                      <span style={{ fontSize: 14, fontWeight: 400, color: C.muted }}> / 10</span>
                    </div>
                    {niveau && <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>{niveau}</div>}
                    {date && <div style={{ fontSize: 11, color: C.muted }}>{date}</div>}
                  </Card>
                );
              })}
            </div>

            {/* Eval filter pills — only when multiple evals and none filtered via card click */}
            {allPresentEvals.length > 1 && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 28 }}>
                <Label style={{ marginRight: 4 }}>Afficher</Label>
                {[null, ...allPresentEvals].map((e, i) => {
                  const active = selectedEval === e;
                  const color = e ? EVAL_COLORS[e] : C.ink;
                  const label = e ? EVAL_SHORT[e] : 'Toutes';
                  return (
                    <button key={i} onClick={() => setSelectedEval(e)} style={{
                      padding: '5px 16px', borderRadius: 20,
                      border: `1.5px solid ${active ? color : C.rule}`,
                      background: active ? color : C.white,
                      color: active ? C.white : C.mid,
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      letterSpacing: 0.2, transition: 'all 0.15s',
                    }}>{label}</button>
                  );
                })}
              </div>
            )}

            {/* Radar */}
            <Card style={{ padding: '24px 24px 16px', marginBottom: 16 }}>
              <Label style={{ display: 'block', marginBottom: 20 }}>Scores par section</Label>
              <ResponsiveContainer width="100%" height={360}>
                <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData}>
                  <PolarGrid stroke={C.rule} />
                  <PolarAngleAxis
                    dataKey="section"
                    tick={{ fill: C.mid, fontSize: 11, fontWeight: 500 }}
                  />
                  <PolarRadiusAxis
                    angle={90} domain={[0, 10]}
                    tick={{ fill: C.muted, fontSize: 10 }}
                    tickCount={6}
                  />
                  {allPresentEvals.map(e => (
                    <Radar
                      key={e}
                      name={EVAL_SHORT[e]}
                      dataKey={e}
                      stroke={EVAL_COLORS[e]}
                      fill={EVAL_COLORS[e]}
                      fillOpacity={selectedEval && selectedEval !== e ? 0.03 : 0.12}
                      strokeWidth={selectedEval && selectedEval !== e ? 1 : 2.5}
                      strokeDasharray={selectedEval && selectedEval !== e ? '4 4' : undefined}
                    />
                  ))}
                  <Tooltip
                    contentStyle={{
                      background: C.white, border: `1px solid ${C.rule}`,
                      borderRadius: 8, fontSize: 12,
                      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: 16, fontSize: 12 }} />
                </RadarChart>
              </ResponsiveContainer>
            </Card>

            {/* Section cards */}
            <div style={{ marginBottom: 12 }}>
              <Label>Détail par section</Label>
              <span style={{ fontSize: 12, color: C.muted, marginLeft: 8 }}>— cliquez pour développer</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 8, marginBottom: 24 }}>
              {Object.entries(SEC_NAMES).map(([sec, secName]) => {
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
                  <Card key={sec}
                    style={{
                      overflow: 'hidden',
                      gridColumn: isOpen ? '1 / -1' : undefined,
                      cursor: 'pointer',
                      border: isOpen ? `1.5px solid ${C.navy}` : `1px solid ${C.rule}`,
                    }}
                    onClick={() => setOpenSection(isOpen ? null : sec)}
                  >
                    <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <span style={{
                            background: '#EFF6FF', color: C.blue,
                            fontSize: 10, fontWeight: 700, padding: '2px 7px',
                            borderRadius: 4, letterSpacing: 0.5,
                          }}>S{sec}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{secName}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          {presentEvals.map(e => {
                            const rec = getRecordForEval(e);
                            const score = safeNum(rec?.fields?.[SCORE_FIELDS[sec]]);
                            const sc = score !== null ? (score >= 7 ? C.green : score >= 5 ? C.orange : C.red) : C.muted;
                            return (
                              <div key={e} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: EVAL_COLORS[e], flexShrink: 0 }} />
                                <span style={{ fontSize: 13, fontWeight: 700, color: sc }}>
                                  {score !== null ? score.toFixed(1) : '—'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        {appuiCount > 0 && (
                          <span style={{
                            background: '#FEE2E2', color: C.red,
                            fontSize: 10, fontWeight: 700, padding: '3px 8px',
                            borderRadius: 4, border: `1px solid #FECACA`, letterSpacing: 0.2,
                          }}>{appuiCount} accompagnement{appuiCount > 1 ? 's' : ''}</span>
                        )}
                        <span style={{
                          fontSize: 16, color: C.muted, lineHeight: 1,
                          transform: isOpen ? 'rotate(90deg)' : 'none',
                          transition: 'transform 0.15s', display: 'inline-block',
                        }}>›</span>
                      </div>
                    </div>

                    {isOpen && (
                      <div style={{ padding: '0 18px 20px' }} onClick={e => e.stopPropagation()}>
                        <SectionDetail
                          sec={sec} questions={secQs}
                          presentEvals={presentEvals}
                          getRecordForEval={getRecordForEval}
                        />
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>

            <AppuiSummary presentEvals={presentEvals} getRecordForEval={getRecordForEval} />
          </>
        )}

        {!loading && selectedOSC && records.length === 0 && (
          <Card style={{ padding: 48, textAlign: 'center', color: C.muted, fontSize: 14 }}>
            Aucune évaluation trouvée pour cette organisation.
          </Card>
        )}
        {!loading && !selectedOSC && !directId && (
          <Card style={{ padding: 48, textAlign: 'center', color: C.muted, fontSize: 14 }}>
            Sélectionnez une organisation pour afficher son diagnostic.
          </Card>
        )}
      </div>
    </div>
  );
}
