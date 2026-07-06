import { useState, useEffect } from 'react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, ResponsiveContainer, Tooltip } from 'recharts';
import { SEC_NAMES, SCORE_FIELDS, QUESTIONS, EVAL_ORDER, EVAL_COLORS, EVAL_SHORT } from '../config';

// ── Safe value helpers ────────────────────────────────────────────────────────
function safeNum(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'object') return null; // guard against Airtable returning {error:...}
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function safeStr(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') return ''; // guard against objects
  return String(val);
}

function getScoreNum(val) {
  const s = safeStr(val);
  if (s.startsWith('1')) return 1;
  if (s.startsWith('2')) return 2;
  if (s.startsWith('3')) return 3;
  return null;
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  navy:    '#1B3A5C',
  ink:     '#0F172A',
  mid:     '#475569',
  muted:   '#94A3B8',
  rule:    '#E2E8F0',
  bg:      '#F8FAFC',
  white:   '#FFFFFF',
  red:     '#DC2626',
  orange:  '#D97706',
  green:   '#16A34A',
  blue:    '#2563EB',
};

const SCORE_STYLE = {
  1: { color: T.red,    bg: '#FEF2F2', border: '#FECACA', label: '1 — Non mis en place' },
  2: { color: T.orange, bg: '#FFFBEB', border: '#FDE68A', label: '2 — Partiellement mis en place' },
  3: { color: T.green,  bg: '#F0FDF4', border: '#BBF7D0', label: '3 — Documenté et opérationnel' },
  99:{ color: T.muted,  bg: T.bg,      border: T.rule,    label: 'Non répondu / Non applicable' },
};

// ── Sub-components ────────────────────────────────────────────────────────────
function ScoreChip({ val }) {
  const s = getScoreNum(val);
  const st = s ? SCORE_STYLE[s] : SCORE_STYLE[99];
  const label = s ? String(s) : (safeStr(val).includes('N/A') ? 'N/A' : '—');
  return (
    <span style={{
      display: 'inline-block', minWidth: 32, textAlign: 'center',
      padding: '3px 8px', borderRadius: 4,
      background: st.bg, color: st.color,
      border: `1px solid ${st.border}`,
      fontSize: 12, fontWeight: 700, letterSpacing: 0.3,
      lineHeight: '18px',
    }}>{label}</span>
  );
}

function EvalPill({ evalType, active, onClick }) {
  const color = EVAL_COLORS[evalType];
  return (
    <button onClick={onClick} style={{
      padding: '5px 16px', borderRadius: 20,
      border: `1.5px solid ${active ? color : T.rule}`,
      background: active ? color : T.white,
      color: active ? T.white : T.mid,
      fontSize: 12, fontWeight: 600, cursor: 'pointer',
      letterSpacing: 0.3, transition: 'all 0.15s',
    }}>{EVAL_SHORT[evalType]}</button>
  );
}

function SectionDetail({ sec, questions, presentEvals, getRecordForEval }) {
  const qRows = questions.map(q => {
    const scores = {};
    const appuis = {};
    let minScore = 99;
    for (const evalType of presentEvals) {
      const rec = getRecordForEval(evalType);
      const qKey = rec ? Object.keys(rec.fields).find(k => k.startsWith(`[${q.id}]`)) : null;
      const val = qKey ? safeStr(rec.fields[qKey]) : '';
      const appui = rec ? safeStr(rec.fields[`Appui structure — ${q.id}`]) : '';
      scores[evalType] = val;
      appuis[evalType] = appui === 'Oui';
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

  // Section comments
  const sectionComments = presentEvals.map(evalType => {
    const rec = getRecordForEval(evalType);
    if (!rec) return null;
    const entry = Object.entries(rec.fields).find(([k]) => k.startsWith(`Commentaire_S${sec}_`));
    const comment = entry ? safeStr(entry[1]) : '';
    return comment ? { evalType, comment } : null;
  }).filter(Boolean);

  return (
    <div style={{ marginTop: 16 }}>
      {/* Section observations */}
      {sectionComments.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          {sectionComments.map(({ evalType, comment }) => (
            <div key={evalType} style={{
              padding: '12px 16px', borderRadius: 6, marginBottom: 8,
              background: T.white,
              borderLeft: `3px solid ${EVAL_COLORS[evalType]}`,
              border: `1px solid ${T.rule}`,
              borderLeftWidth: 3, borderLeftColor: EVAL_COLORS[evalType], borderLeftStyle: 'solid',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: EVAL_COLORS[evalType], marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
                Observation — {EVAL_SHORT[evalType]}
              </div>
              <div style={{ fontSize: 13, color: T.mid, lineHeight: 1.6, fontStyle: 'italic' }}>{comment}</div>
            </div>
          ))}
        </div>
      )}

      {/* Question groups */}
      {[1, 2, 3, 99].map(scoreGroup => {
        const groupRows = qRows.filter(r => r.minScore === scoreGroup);
        if (groupRows.length === 0) return null;
        const st = SCORE_STYLE[scoreGroup];
        return (
          <div key={scoreGroup} style={{ marginBottom: 20 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '6px 14px', borderRadius: 6, marginBottom: 8,
              background: st.bg, borderLeft: `3px solid ${st.color}`,
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: st.color }}>{scoreGroup === 99 ? '—' : scoreGroup}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: st.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>{st.label}</span>
              <span style={{ fontSize: 11, color: st.color, opacity: 0.6 }}>· {groupRows.length} question{groupRows.length > 1 ? 's' : ''}</span>
            </div>
            {groupRows.map(row => (
              <div key={row.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '10px 14px', marginBottom: 4, borderRadius: 6,
                background: row.hasAppui ? '#FFF5F5' : T.white,
                border: `1px solid ${row.hasAppui ? '#FECACA' : T.rule}`,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {row.hasAppui && (
                    <span style={{
                      display: 'inline-block', marginRight: 8, marginBottom: 2,
                      padding: '1px 7px', borderRadius: 3,
                      background: '#FEE2E2', color: T.red,
                      fontSize: 9, fontWeight: 700, letterSpacing: 0.8,
                      textTransform: 'uppercase', verticalAlign: 'middle',
                    }}>Appui demandé</span>
                  )}
                  <span style={{ fontSize: 13, color: T.ink, lineHeight: 1.55 }}>{row.label}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                  {presentEvals.map(evalType => (
                    <div key={evalType} style={{ textAlign: 'center', minWidth: 40 }}>
                      <div style={{ fontSize: 9, color: EVAL_COLORS[evalType], fontWeight: 600, marginBottom: 3, letterSpacing: 0.3 }}>
                        {EVAL_SHORT[evalType].charAt(0)}
                      </div>
                      <ScoreChip val={row.scores[evalType]} />
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

function AppuiSummary({ presentEvals, getRecordForEval }) {
  const allAppui = [];
  for (const [sec, secName] of Object.entries(SEC_NAMES)) {
    for (const q of QUESTIONS.filter(q => q.sec === sec)) {
      const evals = presentEvals.filter(evalType => {
        const rec = getRecordForEval(evalType);
        return rec && safeStr(rec.fields[`Appui structure — ${q.id}`]) === 'Oui';
      });
      if (evals.length > 0) allAppui.push({ sec, secName, id: q.id, label: q.label, evals });
    }
  }
  if (allAppui.length === 0) return null;

  return (
    <div style={{ background: T.white, borderRadius: 8, padding: '20px 24px', border: `1px solid #FECACA`, marginBottom: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.red, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
        Demandes d'accompagnement
      </div>
      <div style={{ fontSize: 13, color: T.mid, marginBottom: 16 }}>
        {allAppui.length} point{allAppui.length > 1 ? 's' : ''} identifié{allAppui.length > 1 ? 's' : ''}
      </div>
      {allAppui.map((item, i) => (
        <div key={i} style={{
          display: 'flex', gap: 12, alignItems: 'flex-start',
          padding: '8px 12px', borderRadius: 5,
          background: '#FFF5F5', border: `1px solid #FECACA`, marginBottom: 5,
        }}>
          <span style={{ flexShrink: 0, padding: '2px 7px', borderRadius: 3, background: '#FEE2E2', color: T.red, fontSize: 11, fontWeight: 700 }}>
            S{item.sec}
          </span>
          <div style={{ flex: 1, fontSize: 12, color: T.ink, lineHeight: 1.5 }}>[{item.id}] {item.label}</div>
          <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
            {item.evals.map(ev => (
              <span key={ev} style={{ background: EVAL_COLORS[ev], color: T.white, fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3, letterSpacing: 0.5 }}>
                {EVAL_SHORT[ev].charAt(0)}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
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
          if (d.records && d.records.length > 0) {
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

  const allPresentEvals = EVAL_ORDER.filter(e => records.some(r => safeStr(r.fields["Type d'évaluation"]) === e));
  const presentEvals = selectedEval ? allPresentEvals.filter(e => e === selectedEval) : allPresentEvals;
  const getRecordForEval = (evalType) => records.find(r => safeStr(r.fields["Type d'évaluation"]) === evalType);

  const radarData = Object.entries(SCORE_FIELDS).map(([sec, field]) => {
    const entry = { section: SEC_NAMES[sec].split('&')[0].trim().split(' ').slice(-1)[0] };
    for (const evalType of allPresentEvals) {
      const rec = getRecordForEval(evalType);
      entry[evalType] = rec ? (safeNum(rec.fields[field]) || 0) : 0;
    }
    return entry;
  });

  const globalComment = records.find(r => r.fields['Commentaire global'])?.fields['Commentaire global'];

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: T.bg, minHeight: '100vh' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');`}</style>

      {/* Top bar */}
      <div style={{ background: T.navy, padding: '0 40px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <img src="https://images.fillout.com/orgid-732662/flowpublicid-p3BgAaYgGLus/widgetid-mMJS/kXtZ75Zg8QSTBDfjg3Vcwb/PULSE_LOGO_COULEUR.svg?a=rtAAwtQK1rtQfYt7rqMdQS"
          style={{ height: 28, filter: 'brightness(0) invert(1)' }} alt="PULSE" />
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.5 }}>Diagnostic organisationnel</span>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 40px' }}>

        {/* OSC selector — hidden when accessed via ?id= */}
        {!directId && (
          <div style={{ marginBottom: 32 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
              Organisation
            </label>
            <select value={selectedOSC} onChange={e => { setSelectedOSC(e.target.value); setOpenSection(null); setSelectedEval(null); }}
              style={{ padding: '10px 14px', borderRadius: 6, border: `1.5px solid ${T.rule}`, background: T.white, fontSize: 14, color: T.ink, minWidth: 320, cursor: 'pointer', outline: 'none' }}>
              <option value="">Sélectionner une organisation</option>
              {oscs.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: 80, color: T.muted, fontSize: 14 }}>Chargement...</div>
        )}

        {!loading && selectedOSC && records.length > 0 && (
          <>
            {/* OSC name — large header */}
            <div style={{ marginBottom: 32, paddingBottom: 24, borderBottom: `1px solid ${T.rule}` }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                {safeStr(records[0]?.fields?.Projet)} · {safeStr(records[0]?.fields?.Pays)}
              </div>
              <h1 style={{ fontSize: 32, fontWeight: 800, color: T.ink, margin: 0, letterSpacing: -0.5 }}>
                {selectedOSC}
              </h1>
              {globalComment && (
                <p style={{ marginTop: 12, fontSize: 14, color: T.mid, lineHeight: 1.7, maxWidth: 720, fontStyle: 'italic' }}>
                  {safeStr(globalComment)}
                </p>
              )}
            </div>

            {/* Evaluation score cards */}
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${allPresentEvals.length}, minmax(160px, 200px))`, gap: 12, marginBottom: 24 }}>
              {allPresentEvals.map(evalType => {
                const rec = getRecordForEval(evalType);
                const score = safeNum(rec?.fields?.Score_Global);
                const niveau = safeStr(rec?.fields?.Niveau_Global);
                const date = safeStr(rec?.fields?.['Date de soumission']);
                const scoreColor = score !== null ? (score >= 7 ? T.green : score >= 5 ? T.orange : T.red) : T.muted;
                return (
                  <div key={evalType} style={{
                    background: T.white, borderRadius: 8, padding: '16px 20px',
                    borderTop: `3px solid ${EVAL_COLORS[evalType]}`,
                    border: `1px solid ${T.rule}`, borderTopWidth: 3, borderTopColor: EVAL_COLORS[evalType],
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: EVAL_COLORS[evalType], textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
                      {EVAL_SHORT[evalType]}
                    </div>
                    <div style={{ fontSize: 30, fontWeight: 800, color: scoreColor, lineHeight: 1, marginBottom: 4 }}>
                      {score !== null ? score.toFixed(1) : '—'}
                      <span style={{ fontSize: 14, fontWeight: 400, color: T.muted }}> /10</span>
                    </div>
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{niveau}</div>
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{date}</div>
                  </div>
                );
              })}
            </div>

            {/* Eval filter pills */}
            {allPresentEvals.length > 1 && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 24 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginRight: 4 }}>Afficher</span>
                <button onClick={() => setSelectedEval(null)} style={{
                  padding: '5px 16px', borderRadius: 20, border: `1.5px solid ${selectedEval === null ? T.ink : T.rule}`,
                  background: selectedEval === null ? T.ink : T.white, color: selectedEval === null ? T.white : T.mid,
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', letterSpacing: 0.3,
                }}>Toutes</button>
                {allPresentEvals.map(evalType => (
                  <EvalPill key={evalType} evalType={evalType} active={selectedEval === evalType} onClick={() => setSelectedEval(selectedEval === evalType ? null : evalType)} />
                ))}
              </div>
            )}

            {/* Radar chart */}
            <div style={{ background: T.white, borderRadius: 8, padding: '24px', marginBottom: 16, border: `1px solid ${T.rule}` }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
                Scores par section
              </div>
              <ResponsiveContainer width="100%" height={360}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke={T.rule} />
                  <PolarAngleAxis dataKey="section" tick={{ fill: T.mid, fontSize: 11, fontWeight: 500 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fill: T.muted, fontSize: 10 }} tickCount={6} />
                  {presentEvals.map(evalType => (
                    <Radar key={evalType} name={EVAL_SHORT[evalType]} dataKey={evalType}
                      stroke={EVAL_COLORS[evalType]} fill={EVAL_COLORS[evalType]} fillOpacity={0.1} strokeWidth={2} />
                  ))}
                  <Tooltip contentStyle={{ background: T.white, border: `1px solid ${T.rule}`, borderRadius: 6, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                  <Legend wrapperStyle={{ paddingTop: 12, fontSize: 12 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Section grid */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                Détail par section
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 10, marginBottom: 24 }}>
              {Object.entries(SEC_NAMES).map(([sec, secName]) => {
                const isOpen = openSection === sec;
                const secQs = QUESTIONS.filter(q => q.sec === sec);

                let appuiCount = 0;
                secQs.forEach(q => {
                  for (const evalType of presentEvals) {
                    const rec = getRecordForEval(evalType);
                    if (rec && safeStr(rec.fields[`Appui structure — ${q.id}`]) === 'Oui') appuiCount++;
                  }
                });

                return (
                  <div key={sec}
                    style={{
                      background: T.white, borderRadius: 8,
                      border: isOpen ? `1.5px solid ${T.navy}` : `1px solid ${T.rule}`,
                      overflow: 'hidden',
                      gridColumn: isOpen ? '1 / -1' : undefined,
                      cursor: 'pointer',
                    }}
                    onClick={() => setOpenSection(isOpen ? null : sec)}
                  >
                    <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <span style={{ background: '#EFF6FF', color: T.blue, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, letterSpacing: 0.5 }}>
                            S{sec}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{secName}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          {presentEvals.map(evalType => {
                            const rec = getRecordForEval(evalType);
                            const score = safeNum(rec?.fields?.[SCORE_FIELDS[sec]]);
                            const c = score !== null ? (score >= 7 ? T.green : score >= 5 ? T.orange : T.red) : T.muted;
                            return (
                              <div key={evalType} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: EVAL_COLORS[evalType] }} />
                                <span style={{ fontSize: 13, fontWeight: 700, color: c }}>
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
                            background: '#FEE2E2', color: T.red,
                            fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4,
                            border: `1px solid #FECACA`, letterSpacing: 0.3,
                          }}>
                            {appuiCount} appui{appuiCount > 1 ? 's' : ''}
                          </span>
                        )}
                        <span style={{ fontSize: 14, color: T.muted, transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', display: 'inline-block' }}>›</span>
                      </div>
                    </div>

                    {isOpen && (
                      <div style={{ padding: '0 18px 20px', borderTop: `1px solid ${T.rule}` }} onClick={e => e.stopPropagation()}>
                        <SectionDetail sec={sec} questions={secQs} presentEvals={presentEvals} getRecordForEval={getRecordForEval} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Appui summary */}
            <AppuiSummary presentEvals={presentEvals} getRecordForEval={getRecordForEval} />
          </>
        )}

        {!loading && selectedOSC && records.length === 0 && (
          <div style={{ background: T.white, borderRadius: 8, padding: 48, textAlign: 'center', color: T.muted, border: `1px solid ${T.rule}`, fontSize: 14 }}>
            Aucune évaluation trouvée pour cette organisation.
          </div>
        )}
        {!loading && !selectedOSC && !directId && (
          <div style={{ background: T.white, borderRadius: 8, padding: 48, textAlign: 'center', color: T.muted, border: `1px solid ${T.rule}`, fontSize: 14 }}>
            Sélectionnez une organisation pour afficher son diagnostic.
          </div>
        )}

      </div>
    </div>
  );
}
