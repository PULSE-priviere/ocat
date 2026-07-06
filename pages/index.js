import { useState, useEffect } from 'react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, ResponsiveContainer, Tooltip } from 'recharts';
import { SEC_NAMES, SCORE_FIELDS, QUESTIONS, EVAL_ORDER, EVAL_COLORS, EVAL_SHORT } from '../config';

function getScore(val) {
  if (!val) return null;
  if (val.startsWith('1')) return 1;
  if (val.startsWith('2')) return 2;
  if (val.startsWith('3')) return 3;
  return null;
}

function ScoreBadge({ val }) {
  if (!val || val === '—') return <span style={{color:'#94a3b8'}}>—</span>;
  const score = getScore(val);
  const colors = { 1: {bg:'#fef2f2',text:'#dc2626'}, 2: {bg:'#fffbeb',text:'#d97706'}, 3: {bg:'#f0fdf4',text:'#16a34a'} };
  const c = score ? colors[score] : {bg:'#f8fafc',text:'#94a3b8'};
  const label = score || (val.includes('N/A') ? 'N/A' : '—');
  return (
    <span style={{background:c.bg,color:c.text,padding:'2px 8px',borderRadius:6,fontSize:12,fontWeight:700,border:`1px solid ${c.text}30`}}>
      {label}
    </span>
  );
}

export default function Home() {
  const [oscs, setOscs] = useState([]);
  const [selectedOSC, setSelectedOSC] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openSection, setOpenSection] = useState(null);

  useEffect(() => {
    fetch('/api/oscs').then(r => r.json()).then(d => setOscs(d.oscs || []));
  }, []);

  useEffect(() => {
    if (!selectedOSC) return;
    setLoading(true);
    fetch(`/api/records?osc=${encodeURIComponent(selectedOSC)}`)
      .then(r => r.json())
      .then(d => { setRecords(d.records || []); setLoading(false); });
  }, [selectedOSC]);

  const presentEvals = EVAL_ORDER.filter(e => records.some(r => r.fields["Type d'évaluation"] === e));

  const getRecordForEval = (evalType) => records.find(r => r.fields["Type d'évaluation"] === evalType);

  const radarData = Object.entries(SCORE_FIELDS).map(([sec, field]) => {
    const entry = { section: SEC_NAMES[sec].split(' ')[0] };
    for (const evalType of presentEvals) {
      const rec = getRecordForEval(evalType);
      entry[evalType] = rec ? (rec.fields[field] || 0) : 0;
    }
    return entry;
  });

  return (
    <div style={{fontFamily:'Inter,system-ui,sans-serif',background:'#f8fafc',minHeight:'100vh',padding:'24px 32px'}}>
      <div style={{maxWidth:1100,margin:'0 auto'}}>

        {/* Header */}
        <div style={{marginBottom:28}}>
          <img src="https://images.fillout.com/orgid-732662/flowpublicid-p3BgAaYgGLus/widgetid-mMJS/kXtZ75Zg8QSTBDfjg3Vcwb/PULSE_LOGO_COULEUR.svg?a=rtAAwtQK1rtQfYt7rqMdQS" style={{height:40,marginBottom:12}} alt="PULSE" />
          <h1 style={{fontSize:22,fontWeight:800,color:'#0f172a',margin:0}}>Diagnostic organisationnel</h1>
          <p style={{fontSize:13,color:'#94a3b8',margin:'4px 0 0'}}>Suivi des capacités organisationnelles des OSC — PULSE/PPI</p>
        </div>

        {/* OSC Selector */}
        <div style={{marginBottom:28}}>
          <label style={{display:'block',fontSize:12,fontWeight:600,color:'#64748b',marginBottom:6,textTransform:'uppercase',letterSpacing:0.5}}>
            Sélectionner une OSC
          </label>
          <select
            value={selectedOSC}
            onChange={e => { setSelectedOSC(e.target.value); setOpenSection(null); }}
            style={{padding:'10px 14px',borderRadius:8,border:'1.5px solid #e2e8f0',background:'#fff',fontSize:14,color:'#1e293b',minWidth:320,cursor:'pointer'}}
          >
            <option value="">— Choisir une OSC —</option>
            {oscs.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>

        {loading && <div style={{textAlign:'center',padding:40,color:'#94a3b8'}}>Chargement...</div>}

        {!loading && selectedOSC && records.length > 0 && (
          <>
            {/* Eval cards */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12,marginBottom:28}}>
              {presentEvals.map(evalType => {
                const rec = getRecordForEval(evalType);
                const score = rec?.fields['Score_Global'];
                const niveau = rec?.fields['Niveau_Global'] || '';
                const date = rec?.fields['Date de soumission'] || '';
                return (
                  <div key={evalType} style={{background:'#fff',borderRadius:12,padding:'16px 18px',borderTop:`3px solid ${EVAL_COLORS[evalType]}`,border:`1px solid ${EVAL_COLORS[evalType]}30`,borderTopWidth:3,borderTopStyle:'solid',borderTopColor:EVAL_COLORS[evalType]}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                      <span style={{width:10,height:10,borderRadius:'50%',background:EVAL_COLORS[evalType]}}/>
                      <span style={{fontSize:12,fontWeight:700,color:'#374151'}}>{EVAL_SHORT[evalType]}</span>
                    </div>
                    <div style={{fontSize:28,fontWeight:800,color:EVAL_COLORS[evalType],lineHeight:1}}>
                      {score != null ? Number(score).toFixed(1) : '—'}
                      <span style={{fontSize:14,fontWeight:400,color:'#94a3b8'}}> /10</span>
                    </div>
                    <div style={{fontSize:11,color:'#64748b',marginTop:4}}>{niveau}</div>
                    <div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>{date}</div>
                  </div>
                );
              })}
            </div>

            {/* Commentaire global */}
            {(() => {
              const globalComment = records.find(r => r.fields['Commentaire global'])?.fields['Commentaire global'];
              if (!globalComment) return null;
              return (
                <div style={{background:'#fff',borderRadius:12,padding:'16px 20px',marginBottom:24,border:'1px solid #e2e8f0',borderLeft:'4px solid #0f172a'}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#0f172a',marginBottom:6,textTransform:'uppercase',letterSpacing:0.5}}>Commentaire global</div>
                  <div style={{fontSize:14,color:'#334155',lineHeight:1.6,fontStyle:'italic'}}>{globalComment}</div>
                </div>
              );
            })()}

            {/* Radar chart */}
            <div style={{background:'#fff',borderRadius:12,padding:'20px 24px',marginBottom:24,border:'1px solid #e2e8f0'}}>
              <h2 style={{fontSize:15,fontWeight:700,color:'#1e293b',margin:'0 0 16px'}}>Scores par section</h2>
              <ResponsiveContainer width="100%" height={380}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0"/>
                  <PolarAngleAxis dataKey="section" tick={{fill:'#475569',fontSize:12,fontWeight:600}}/>
                  <PolarRadiusAxis angle={90} domain={[0,10]} tick={{fill:'#94a3b8',fontSize:10}} tickCount={6}/>
                  {presentEvals.map(evalType => (
                    <Radar key={evalType} name={EVAL_SHORT[evalType]} dataKey={evalType}
                      stroke={EVAL_COLORS[evalType]} fill={EVAL_COLORS[evalType]} fillOpacity={0.12} strokeWidth={2.5}/>
                  ))}
                  <Tooltip contentStyle={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:8,fontSize:12}}/>
                  <Legend wrapperStyle={{paddingTop:12,fontSize:12}}/>
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Sections */}
            <h2 style={{fontSize:15,fontWeight:700,color:'#1e293b',margin:'0 0 14px'}}>Détail par section — cliquez pour voir les questions</h2>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:12,marginBottom:24}}>
              {Object.entries(SEC_NAMES).map(([sec, secName]) => {
                const isOpen = openSection === sec;
                const scoreField = SCORE_FIELDS[sec];
                const secQs = QUESTIONS.filter(q => q.sec === sec);

                // Count appui
                let appuiCount = 0;
                secQs.forEach(q => {
                  for (const evalType of presentEvals) {
                    const rec = getRecordForEval(evalType);
                    if (rec?.fields[`Appui structure — ${q.id}`] === 'Oui') appuiCount++;
                  }
                });

                return (
                  <div key={sec}
                    style={{background:'#fff',borderRadius:12,border:isOpen?'2px solid #2563eb':'1px solid #e2e8f0',overflow:'hidden',gridColumn:isOpen?'1 / -1':undefined,cursor:'pointer'}}
                    onClick={() => setOpenSection(isOpen ? null : sec)}
                  >
                    <div style={{padding:'14px 18px',display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12}}>
                      <div style={{flex:1}}>
                        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                          <span style={{background:'#eff6ff',color:'#2563eb',fontSize:11,fontWeight:700,padding:'2px 7px',borderRadius:6}}>S{sec}</span>
                          <span style={{fontSize:13,fontWeight:700,color:'#1e293b'}}>{secName}</span>
                        </div>
                        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                          {presentEvals.map(evalType => {
                            const rec = getRecordForEval(evalType);
                            const score = rec?.fields[scoreField];
                            return (
                              <div key={evalType} style={{display:'flex',alignItems:'center',gap:4}}>
                                <span style={{width:7,height:7,borderRadius:'50%',background:EVAL_COLORS[evalType]}}/>
                                <span style={{fontSize:13,fontWeight:700,color:score!=null?EVAL_COLORS[evalType]:'#94a3b8'}}>
                                  {score!=null?Number(score).toFixed(1):'—'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
                        {appuiCount > 0 && (
                          <span style={{background:'#fee2e2',color:'#dc2626',fontSize:11,fontWeight:700,padding:'3px 8px',borderRadius:12,border:'1px solid #fecaca'}}>
                            🤝 {appuiCount}
                          </span>
                        )}
                        <span style={{fontSize:16,color:'#94a3b8',transform:isOpen?'rotate(90deg)':'none',transition:'transform 0.15s'}}>▶</span>
                      </div>
                    </div>

                    {isOpen && (
                      <div style={{padding:'0 18px 18px',borderTop:'1px solid #f1f5f9'}} onClick={e => e.stopPropagation()}>
                        <SectionDetail sec={sec} secName={secName} questions={secQs} presentEvals={presentEvals} getRecordForEval={getRecordForEval} records={records}/>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Appui global summary */}
            <AppuiSummary presentEvals={presentEvals} getRecordForEval={getRecordForEval}/>
          </>
        )}

        {!loading && selectedOSC && records.length === 0 && (
          <div style={{background:'#fff',borderRadius:12,padding:40,textAlign:'center',color:'#94a3b8'}}>Aucune évaluation trouvée.</div>
        )}
        {!selectedOSC && (
          <div style={{background:'#fff',borderRadius:12,padding:40,textAlign:'center',color:'#94a3b8'}}>Sélectionnez une OSC pour afficher son diagnostic.</div>
        )}

      </div>
    </div>
  );
}

function SectionDetail({ sec, secName, questions, presentEvals, getRecordForEval, records }) {
  const SCORE_GROUPS = [
    { score: 1, label: 'Non mis en place', bg: '#fef2f2', border: '#fecaca', color: '#dc2626' },
    { score: 2, label: 'Partiellement mis en place', bg: '#fffbeb', border: '#fde68a', color: '#d97706' },
    { score: 3, label: 'Documenté et opérationnel', bg: '#f0fdf4', border: '#bbf7d0', color: '#16a34a' },
    { score: 99, label: 'Non répondu / N/A', bg: '#f8fafc', border: '#e2e8f0', color: '#94a3b8' },
  ];

  const qRows = questions.map(q => {
    const scores = {};
    const appuis = {};
    let minScore = 99;
    for (const evalType of presentEvals) {
      const rec = getRecordForEval(evalType);
      const val = rec?.fields[Object.keys(rec.fields).find(k => k.startsWith(`[${q.id}]`))] || '';
      const appui = rec?.fields[`Appui structure — ${q.id}`] || '';
      scores[evalType] = val;
      appuis[evalType] = appui === 'Oui';
      const s = getScore(val);
      if (s) minScore = Math.min(minScore, s);
    }
    const hasAppui = Object.values(appuis).some(Boolean);
    return { ...q, scores, appuis, hasAppui, minScore };
  }).sort((a, b) => {
    if (a.minScore !== b.minScore) return a.minScore - b.minScore;
    if (a.hasAppui !== b.hasAppui) return a.hasAppui ? -1 : 1;
    return 0;
  });

  // Collect section comments from all evaluations
  const sectionComments = presentEvals.map(evalType => {
    const rec = getRecordForEval(evalType);
    if (!rec) return null;
    // Find the comment field for this section (Commentaire_SX_...)
    const commentEntry = Object.entries(rec.fields).find(([k]) => k.startsWith(`Commentaire_S${sec}_`));
    const comment = commentEntry ? commentEntry[1] : '';
    return comment ? { evalType, comment } : null;
  }).filter(Boolean);

  return (
    <div style={{marginTop:20}}>
      {/* Section comments */}
      {sectionComments.length > 0 && (
        <div style={{marginBottom:20}}>
          {sectionComments.map(({evalType, comment}) => (
            <div key={evalType} style={{
              padding:'12px 16px', borderRadius:8, marginBottom:8,
              background:'#f8fafc',
              borderLeft:`3px solid ${EVAL_COLORS[evalType]}`,
              border:'1px solid #e2e8f0',
              borderLeftWidth:'3px',
              borderLeftStyle:'solid',
              borderLeftColor:EVAL_COLORS[evalType]
            }}>
              <div style={{fontSize:11,fontWeight:700,color:EVAL_COLORS[evalType],marginBottom:4,textTransform:'uppercase',letterSpacing:0.5}}>
                Observation — {EVAL_SHORT[evalType]}
              </div>
              <div style={{fontSize:13,color:'#334155',lineHeight:1.6,fontStyle:'italic'}}>{comment}</div>
            </div>
          ))}
        </div>
      )}
      {SCORE_GROUPS.map(group => {
        const groupRows = qRows.filter(r => r.minScore === group.score);
        if (groupRows.length === 0) return null;
        return (
          <div key={group.score} style={{marginBottom:20}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8,padding:'6px 12px',borderRadius:8,background:group.bg,border:`1px solid ${group.border}`}}>
              <span style={{fontWeight:800,color:group.color,fontSize:16}}>{group.score === 99 ? '—' : group.score}</span>
              <span style={{fontWeight:700,color:group.color,fontSize:12,textTransform:'uppercase',letterSpacing:0.5}}>{group.label}</span>
              <span style={{color:group.color,fontSize:11,opacity:0.7}}>({groupRows.length} question{groupRows.length > 1 ? 's' : ''})</span>
            </div>
            {groupRows.map(row => (
              <div key={row.id} style={{background:row.hasAppui?'#fff5f5':'#fff',border:row.hasAppui?'1.5px solid #fca5a5':`1px solid ${group.border}`,borderRadius:8,padding:'10px 14px',display:'flex',alignItems:'flex-start',gap:12,marginBottom:6}}>
                <div style={{flex:1}}>
                  {row.hasAppui && <span style={{display:'inline-block',marginRight:6,background:'#ef4444',color:'#fff',fontSize:9,fontWeight:800,padding:'2px 6px',borderRadius:4,verticalAlign:'middle',letterSpacing:0.5}}>🤝 APPUI</span>}
                  <span style={{fontSize:13,color:'#1e293b',lineHeight:1.5}}>[{row.id}] {row.label}</span>
                </div>
                <div style={{display:'flex',gap:6,flexShrink:0,alignItems:'center'}}>
                  {presentEvals.map(evalType => (
                    <div key={evalType} style={{textAlign:'center'}}>
                      <div style={{fontSize:9,color:EVAL_COLORS[evalType],fontWeight:700,marginBottom:2}}>
                        {EVAL_SHORT[evalType].charAt(0)}
                      </div>
                      <ScoreBadge val={row.scores[evalType]}/>
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
    const secQs = QUESTIONS.filter(q => q.sec === sec);
    for (const q of secQs) {
      const evals = presentEvals.filter(evalType => {
        const rec = getRecordForEval(evalType);
        return rec?.fields[`Appui structure — ${q.id}`] === 'Oui';
      });
      if (evals.length > 0) allAppui.push({ sec, secName, label: q.label, id: q.id, evals });
    }
  }
  if (allAppui.length === 0) return null;
  return (
    <div style={{background:'#fff',borderRadius:12,padding:'20px 24px',border:'2px solid #fecaca',marginBottom:24}}>
      <h2 style={{fontSize:15,fontWeight:800,color:'#dc2626',margin:'0 0 16px'}}>
        🤝 Synthèse des demandes d'appui — {allAppui.length} au total
      </h2>
      {allAppui.map((item, i) => (
        <div key={i} style={{display:'flex',gap:12,alignItems:'flex-start',padding:'8px 12px',borderRadius:8,background:'#fff5f5',border:'1px solid #fecaca',marginBottom:6}}>
          <span style={{flexShrink:0,background:'#fee2e2',color:'#dc2626',fontSize:11,fontWeight:700,padding:'2px 6px',borderRadius:5}}>S{item.sec}</span>
          <div style={{flex:1,fontSize:12,color:'#7f1d1d',lineHeight:1.5}}>[{item.id}] {item.label}</div>
          <div style={{display:'flex',gap:4,flexShrink:0}}>
            {item.evals.map(ev => (
              <span key={ev} style={{background:EVAL_COLORS[ev],color:'#fff',fontSize:10,fontWeight:700,padding:'2px 6px',borderRadius:10}}>
                {EVAL_SHORT[ev].charAt(0)}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
