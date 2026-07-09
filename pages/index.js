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

// ── i18n strings ──────────────────────────────────────────────────────────────
const I18N = {
  fr: {
    title: 'Diagnostic organisationnel',
    selectOrg: 'Sélectionner une organisation',
    selectPlaceholder: 'Sélectionner une organisation',
    loading: 'Chargement des données...',
    noEval: 'Aucune évaluation trouvée pour cette organisation.',
    selectPrompt: 'Sélectionnez une organisation pour afficher son diagnostic.',
    scoresSection: 'Scores par section',
    detailSection: 'Détail par section',
    clickToExpand: '— cliquer pour développer',
    accompagnement: 'Demandes d\'accompagnement',
    accompagnementRequested: 'Accompagnement demandé',
    show: 'Afficher',
    all: 'Toutes',
    observation: 'Observation',
    groups: {
      1: 'Non mis en place',
      2: 'Partiellement mis en place',
      3: 'Documenté et opérationnel',
      99: 'Non répondu / Non applicable',
    },
    question: 'question',
    questions: 'questions',
  },
  en: {
    title: 'Organisational Diagnostic',
    selectOrg: 'Select an organisation',
    selectPlaceholder: 'Select an organisation',
    loading: 'Loading data...',
    noEval: 'No evaluation found for this organisation.',
    selectPrompt: 'Select an organisation to display its diagnostic.',
    scoresSection: 'Section scores',
    detailSection: 'Section detail',
    clickToExpand: '— click to expand',
    accompagnement: 'Support requests',
    accompagnementRequested: 'Support requested',
    show: 'Show',
    all: 'All',
    observation: 'Observation',
    groups: {
      1: 'Not in place',
      2: 'Partially in place',
      3: 'Documented and operational',
      99: 'Not answered / Not applicable',
    },
    question: 'question',
    questions: 'questions',
  },
};

// ── Design tokens ─────────────────────────────────────────────────────────────
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
  1:  { color: C.red,    bg: '#FEF2F2', border: '#FECACA' },
  2:  { color: C.orange, bg: '#FFFBEB', border: '#FDE68A' },
  3:  { color: C.green,  bg: '#F0FDF4', border: '#BBF7D0' },
  99: { color: C.muted,  bg: C.bg,      border: C.rule    },
};

// ── Micro-components ──────────────────────────────────────────────────────────
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
      fontSize: 11, fontWeight: 700,
    }}>{label}</span>
  );
}

function Tag({ children, color = C.muted, bg = C.bg, border = C.rule }) {
  return (
    <span style={{
      display: 'inline-block', padding: '1px 7px', borderRadius: 3,
      background: bg, color, border: `1px solid ${border}`,
      fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase',
    }}>{children}</span>
  );
}

function Card({ children, style, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: C.white, borderRadius: 10,
      border: `1px solid ${C.rule}`, ...style,
    }}>{children}</div>
  );
}

function UpperLabel({ children, style }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: 1,
      textTransform: 'uppercase', color: C.muted, ...style,
    }}>{children}</span>
  );
}

// ── Section detail ────────────────────────────────────────────────────────────
function SectionDetail({ sec, questions, presentEvals, getRecordForEval, lang }) {
  const t = I18N[lang];
  const secNames = lang === 'en' ? SEC_NAMES_EN : SEC_NAMES;

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
    const label = lang === 'en' ? q.en : q.fr;
    return { ...q, label, scores, appuis, hasAppui, minScore };
  }).sort((a, b) => {
    if (a.minScore !== b.minScore) return a.minScore - b.minScore;
    if (a.hasAppui !== b.hasAppui) return a.hasAppui ? -1 : 1;
    return 0;
  });

  const COMMENT_FIELDS = {
    '1': 'Commentaire_S1_Gouvernance',
    '2': 'Commentaire_S2_Finances',
    '3': 'Commentaire_S3_Strategie',
    '4': 'Commentaire_S4_RH',
    '5': 'Commentaire_S5_Operations',
    '6': 'Commentaire_S6_MEAL',
    '7': 'Commentaire_S7_Communication',
    '8': 'Commentaire_S8_Culture',
    '9': 'Commentaire_S9_Relations',
  };
  const comments = presentEvals.map(e => {
    const rec = getRecordForEval(e);
    if (!rec) return null;
    const fieldName = COMMENT_FIELDS[sec];
    const c = fieldName ? safeStr(rec.fields[fieldName]) : '';
    return c ? { evalType: e, comment: c } : null;
  }).filter(Boolean);

  return (
    <div style={{ paddingTop: 20, marginTop: 4 }}>
      {comments.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {comments.map(({ evalType, comment }) => (
            <div key={evalType} style={{
              padding: '12px 16px', borderRadius: 6, marginBottom: 8,
              background: '#FAFBFC',
              borderLeft: `3px solid ${EVAL_COLORS[evalType]}`,
            }}>
              <UpperLabel style={{ color: EVAL_COLORS[evalType], display: 'block', marginBottom: 4 }}>
                {t.observation} — {EVAL_SHORT[evalType]}
              </UpperLabel>
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
        const qty = group.length;
        return (
          <div key={sg} style={{ marginBottom: 24 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '6px 14px', borderRadius: 5, marginBottom: 10,
              background: st.bg, borderLeft: `3px solid ${st.color}`,
            }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: st.color }}>{sg === 99 ? '—' : sg}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: st.color, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                {t.groups[sg]}
              </span>
              <span style={{ fontSize: 11, color: st.color, opacity: 0.55, marginLeft: 'auto' }}>
                {qty} {qty > 1 ? t.questions : t.question}
              </span>
            </div>
            {group.map(row => (
              <div key={row.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '11px 14px', marginBottom: 4, borderRadius: 6,
                background: row.hasAppui ? '#FFF8F8' : C.white,
                border: `1px solid ${row.hasAppui ? '#FECACA' : C.rule}`,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {row.hasAppui && (
                    <Tag color={C.red} bg="#FEE2E2" border="#FECACA"
                      style={{ marginRight: 8, marginBottom: 3, verticalAlign: 'middle', display: 'inline-block' }}>
                      {t.accompagnementRequested}
                    </Tag>
                  )}
                  <span style={{ fontSize: 13, color: C.ink, lineHeight: 1.6 }}>{row.label}</span>
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

// ── Collapsible support summary ───────────────────────────────────────────────
function AppuiSummary({ presentEvals, getRecordForEval, lang }) {
  const [open, setOpen] = useState(false);
  const t = I18N[lang];
  const secNames = lang === 'en' ? SEC_NAMES_EN : SEC_NAMES;

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
          <UpperLabel style={{ color: C.red }}>{t.accompagnement}</UpperLabel>
          <span style={{ background: '#FEE2E2', color: C.red, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>
            {items.length}
          </span>
        </div>
        <span style={{
          fontSize: 18, color: C.muted, lineHeight: 1,
          transform: open ? 'rotate(90deg)' : 'none',
          transition: 'transform 0.15s', display: 'inline-block',
        }}>›</span>
      </button>

      {open && (
        <div style={{ padding: '16px 20px' }}>
          {Object.entries(secNames).map(([sec, secName]) => {
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
                    padding: '9px 12px', borderRadius: 5,
                    background: '#FFF8F8', border: `1px solid #FECACA`, marginBottom: 4,
                  }}>
                    <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, color: C.muted, paddingTop: 1 }}>{item.id}</span>
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

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Home() {
  const [oscs, setOscs] = useState([]);
  const [selectedOSC, setSelectedOSC] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openSection, setOpenSection] = useState(null);
  const [directId, setDirectId] = useState(null);
  const [selectedEval, setSelectedEval] = useState(null);
  const [lang, setLang] = useState('fr');

  const t = I18N[lang];
  const secNames = lang === 'en' ? SEC_NAMES_EN : SEC_NAMES;

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
          if (new URLSearchParams(window.location.search).get('print') === '1') {
            setTimeout(() => {
              setOpenSection('__all__');
              setTimeout(() => window.print(), 500);
            }, 800);
          }
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
  const presentEvals = selectedEval ? allPresentEvals.filter(e => e === selectedEval) : allPresentEvals;
  const getRecordForEval = (e) => records.find(r => safeStr(r.fields["Type d'évaluation"]) === e);

  // Use short keys for radar to avoid Recharts issues with special chars
  const EVAL_KEY = {
    "Baseline (début d'accompagnement)": 'baseline',
    'Suivi intermédiaire': 'suivi',
    "Endline (fin d'accompagnement)": 'endline',
  };

  // Short section labels for radar axes
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

  const radarData = Object.entries(SCORE_FIELDS).map(([sec, field]) => {
    const entry = { section: RADAR_LABELS[sec]?.[lang] || `S${sec}` };
    for (const e of allPresentEvals) {
      const rec = getRecordForEval(e);
      entry[EVAL_KEY[e]] = rec ? (safeNum(rec.fields[field]) || 0) : 0;
    }
    return entry;
  });

  // Global comments per evaluation (filtered by selectedEval)
  const globalComments = presentEvals.map(e => {
    const rec = getRecordForEval(e);
    const c = rec ? safeStr(rec.fields['Commentaire global']) : '';
    return c ? { evalType: e, comment: c } : null;
  }).filter(Boolean);

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: C.bg, minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        button { font-family: inherit; }
        select { font-family: inherit; }
        @media print {
          nav, .no-print { display: none !important; }
          body, html { background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          div[style*="minHeight"] { min-height: auto !important; background: #fff !important; }
          .recharts-responsive-container { page-break-inside: avoid; }
          table { page-break-inside: avoid; }
          div[style*="gridTemplateColumns"] { display: flex !important; flex-wrap: wrap !important; gap: 12px !important; }
          @page { size: A4 portrait; margin: 15mm 12mm; }
        }
      `}</style>

      {/* Navbar */}
      <nav style={{
        background: C.navy, height: 68,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 48px', position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 2px 16px rgba(0,0,0,0.18)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <img
            src="https://images.fillout.com/orgid-732662/flowpublicid-p3BgAaYgGLus/widgetid-mMJS/kXtZ75Zg8QSTBDfjg3Vcwb/PULSE_LOGO_COULEUR.svg?a=rtAAwtQK1rtQfYt7rqMdQS"
            style={{ height: 38, filter: 'brightness(0) invert(1)' }}
            alt="PULSE"
          />
          <div style={{ width: 1, height: 30, background: 'rgba(255,255,255,0.2)' }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.95)', letterSpacing: 0.2 }}>
            {t.title}
          </span>
        </div>
        {/* Language switcher */}
        <div className="no-print" style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: 3 }}>
          {['fr', 'en'].map(l => (
            <button key={l} onClick={() => setLang(l)} style={{
              padding: '4px 14px', borderRadius: 16, border: 'none', cursor: 'pointer',
              background: lang === l ? C.white : 'transparent',
              color: lang === l ? C.navy : 'rgba(255,255,255,0.7)',
              fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
              transition: 'all 0.15s',
            }}>{l}</button>
          ))}
        </div>
      </nav>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '48px 40px 80px' }}>

        {/* Homepage sans ?id= : page neutre */}
        {!directId && !selectedOSC && !loading && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', minHeight: '60vh', textAlign: 'center',
          }}>
            <img
              src="https://images.fillout.com/orgid-732662/flowpublicid-p3BgAaYgGLus/widgetid-mMJS/kXtZ75Zg8QSTBDfjg3Vcwb/PULSE_LOGO_COULEUR.svg?a=rtAAwtQK1rtQfYt7rqMdQS"
              style={{ height: 48, marginBottom: 32 }} alt="PULSE"
            />
            <h2 style={{ fontSize: 20, fontWeight: 700, color: C.ink, margin: '0 0 12px' }}>
              {lang === 'en' ? 'Organisational Diagnostic' : 'Diagnostic organisationnel'}
            </h2>
            <p style={{ fontSize: 14, color: C.muted, maxWidth: 360, lineHeight: 1.6, margin: 0 }}>
              {lang === 'en'
                ? 'This page is accessible via a unique link sent by your PULSE facilitator.'
                : 'Cette page est accessible via un lien unique envoyé par votre facilitateur PULSE.'
              }
            </p>
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: 80, color: C.muted, fontSize: 14 }}>
            {t.loading}
          </div>
        )}

        {!loading && selectedOSC && records.length > 0 && (
          <>
            {/* Header */}
            <div style={{ marginBottom: 40 }}>
              <UpperLabel style={{ display: 'block', marginBottom: 6 }}>
                {safeStr(records[0]?.fields?.Projet)} · {safeStr(records[0]?.fields?.Pays)}
              </UpperLabel>
              <h1 style={{
                fontSize: 40, fontWeight: 900, color: C.ink,
                margin: '0 0 16px', letterSpacing: -1, lineHeight: 1.08,
              }}>{selectedOSC}</h1>
              <button
                className="no-print"
                onClick={() => {
                  const prev = openSection;
                  setOpenSection('__all__');
                  setTimeout(() => { window.print(); setOpenSection(prev); }, 400);
                }}
                style={{
                  padding: '8px 20px', borderRadius: 6, border: `1px solid ${C.rule}`,
                  background: C.white, color: C.navy, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7,
                }}
              >
                <span style={{ fontSize: 15 }}>⬇</span> {lang === 'en' ? 'Download PDF' : 'Télécharger PDF'}
              </button>
            </div>

            {/* Score cards — also act as filter on click */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${allPresentEvals.length}, minmax(160px, 210px))`,
              gap: 14, marginBottom: 32,
            }}>
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
                    style={{
                      padding: '20px 22px',
                      borderTop: `3px solid ${EVAL_COLORS[evalType]}`,
                      cursor: allPresentEvals.length > 1 ? 'pointer' : 'default',
                      outline: isActive ? `2px solid ${EVAL_COLORS[evalType]}` : 'none',
                      outlineOffset: 2,
                    }}
                  >
                    <UpperLabel style={{ color: EVAL_COLORS[evalType], display: 'block', marginBottom: 12 }}>
                      {EVAL_SHORT[evalType]}
                    </UpperLabel>
                    <div style={{ fontSize: 36, fontWeight: 800, color: sc, lineHeight: 1, marginBottom: 8 }}>
                      {score !== null ? score.toFixed(1) : '—'}
                      <span style={{ fontSize: 15, fontWeight: 400, color: C.muted }}> / 10</span>
                    </div>
                    {niveau && <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>{niveau}</div>}
                    {date && <div style={{ fontSize: 11, color: C.muted }}>{date}</div>}
                  </Card>
                );
              })}
            </div>

            {/* Filter pills */}
            {allPresentEvals.length > 1 && (
              <div className="no-print" style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 32 }}>
                <UpperLabel style={{ marginRight: 4 }}>{t.show}</UpperLabel>
                {[null, ...allPresentEvals].map((e, i) => {
                  const active = selectedEval === e;
                  const color = e ? EVAL_COLORS[e] : C.ink;
                  const label = e ? EVAL_SHORT[e] : t.all;
                  return (
                    <button key={i} onClick={() => setSelectedEval(e)} style={{
                      padding: '5px 16px', borderRadius: 20,
                      border: `1.5px solid ${active ? color : C.rule}`,
                      background: active ? color : C.white,
                      color: active ? C.white : C.mid,
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}>{label}</button>
                  );
                })}
              </div>
            )}

            {/* Radar */}
            <Card style={{ padding: '28px 28px 16px', marginBottom: 14 }}>
              <UpperLabel style={{ display: 'block', marginBottom: 22 }}>{t.scoresSection}</UpperLabel>
              <ResponsiveContainer width="100%" height={370}>
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
                  <Tooltip contentStyle={{ background: C.white, border: `1px solid ${C.rule}`, borderRadius: 8, fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }} />
                  <Legend wrapperStyle={{ paddingTop: 16, fontSize: 12 }} />
                </RadarChart>
              </ResponsiveContainer>
            </Card>

            {/* Scores table — after radar */}
            <Card style={{ padding: '20px 24px', marginBottom: 14 }}>
              <UpperLabel style={{ display: 'block', marginBottom: 16 }}>
                {lang === 'en' ? 'Scores by section' : 'Scores par section'}
              </UpperLabel>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${C.rule}` }}>
                    <th style={{ textAlign: 'left', padding: '8px 12px', color: C.mid, fontWeight: 600 }}>Section</th>
                    {allPresentEvals.map(e => (
                      <th key={e} style={{ textAlign: 'center', padding: '8px 12px', color: EVAL_COLORS[e], fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {EVAL_SHORT[e]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(lang === 'en' ? SEC_NAMES_EN : SEC_NAMES).map(([sec, secName]) => (
                    <tr key={sec} style={{ borderBottom: `1px solid ${C.rule}` }}>
                      <td style={{ padding: '9px 12px', color: C.ink }}>
                        <strong style={{ color: C.blue, marginRight: 6 }}>S{sec}</strong>{secName}
                      </td>
                      {allPresentEvals.map(e => {
                        const rec = getRecordForEval(e);
                        const score = safeNum(rec?.fields?.[SCORE_FIELDS[sec]]);
                        const sc = score !== null ? (score >= 7 ? C.green : score >= 5 ? C.orange : C.red) : C.muted;
                        return (
                          <td key={e} style={{ textAlign: 'center', padding: '9px 12px', fontWeight: 700, color: sc, fontSize: 14 }}>
                            {score !== null ? score.toFixed(1) : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            {/* Global comments — after radar, before sections, one per eval */}
            {globalComments.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                {globalComments.map(({ evalType, comment }) => (
                  <div key={evalType} style={{
                    padding: '14px 20px', borderRadius: 8, marginBottom: 8,
                    background: C.white, border: `1px solid ${C.rule}`,
                    borderLeft: `3px solid ${EVAL_COLORS[evalType]}`,
                  }}>
                    <UpperLabel style={{ color: EVAL_COLORS[evalType], display: 'block', marginBottom: 6 }}>
                      {lang === 'en' ? 'General observation' : 'Observation générale'} — {EVAL_SHORT[evalType]}
                    </UpperLabel>
                    <p style={{ margin: 0, fontSize: 13, color: C.mid, lineHeight: 1.75, fontStyle: 'italic' }}>
                      {comment}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Section cards */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 14 }}>
              <UpperLabel>{t.detailSection}</UpperLabel>
              <span style={{ fontSize: 12, color: C.muted }}>{t.clickToExpand}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 8, marginBottom: 24 }}>
              {Object.entries(secNames).map(([sec, secName]) => {
                const isOpen = openSection === sec || openSection === '__all__';
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
                    style={{
                      background: C.white, borderRadius: 10, overflow: 'hidden',
                      gridColumn: isOpen ? '1 / -1' : undefined,
                      cursor: 'pointer',
                      border: isOpen ? `1.5px solid ${C.navy}` : `1px solid ${C.rule}`,
                      transition: 'border-color 0.15s',
                    }}
                  >
                    <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <span style={{ background: '#EFF6FF', color: C.blue, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, letterSpacing: 0.5 }}>
                            S{sec}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{secName}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                          {presentEvals.map(e => {
                            const rec = getRecordForEval(e);
                            const score = safeNum(rec?.fields?.[SCORE_FIELDS[sec]]);
                            const sc = score !== null ? (score >= 7 ? C.green : score >= 5 ? C.orange : C.red) : C.muted;
                            return (
                              <div key={e} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: EVAL_COLORS[e], flexShrink: 0 }} />
                                <span style={{ fontSize: 14, fontWeight: 700, color: sc }}>
                                  {score !== null ? score.toFixed(1) : '—'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, paddingTop: 2 }}>
                        {appuiCount > 0 && (
                          <span style={{ background: '#FEE2E2', color: C.red, fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 4, border: `1px solid #FECACA` }}>
                            {appuiCount}
                          </span>
                        )}
                        <span style={{
                          fontSize: 18, color: C.muted, lineHeight: 1,
                          transform: isOpen ? 'rotate(90deg)' : 'none',
                          transition: 'transform 0.15s', display: 'inline-block',
                        }}>›</span>
                      </div>
                    </div>

                    {isOpen && (
                      <div
                        style={{ padding: '0 20px 24px', borderTop: `1px solid ${C.rule}` }}
                        onClick={e => e.stopPropagation()}
                      >
                        <SectionDetail
                          sec={sec} questions={secQs}
                          presentEvals={presentEvals}
                          getRecordForEval={getRecordForEval}
                          lang={lang}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <AppuiSummary presentEvals={presentEvals} getRecordForEval={getRecordForEval} lang={lang} />
          </>
        )}

        {!loading && selectedOSC && records.length === 0 && (
          <Card style={{ padding: 56, textAlign: 'center', color: C.muted, fontSize: 14 }}>
            {t.noEval}
          </Card>
        )}
        {!loading && !selectedOSC && !directId && (
          <Card style={{ padding: 56, textAlign: 'center', color: C.muted, fontSize: 14 }}>
            {t.selectPrompt}
          </Card>
        )}
      </div>
    </div>
  );
}