// Page chef de projet — accès via ?key=TOKEN_SECRET
import { useState, useEffect } from 'react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, ResponsiveContainer, Tooltip } from 'recharts';
import { SEC_NAMES, SCORE_FIELDS, EVAL_ORDER, EVAL_COLORS, EVAL_SHORT } from '../config';

export default function ProjectPage() {
  const [key, setKey] = useState('');
  const [records, setRecords] = useState([]);
  const [projet, setProjet] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedOSC, setSelectedOSC] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const k = params.get('key');
    if (k) { setKey(k); loadData(k); }
  }, []);

  async function loadData(k) {
    setLoading(true); setError('');
    const resp = await fetch(`/api/records?key=${k}`);
    const data = await resp.json();
    if (data.error) { setError(data.error); setLoading(false); return; }
    setRecords(data.records || []);
    setProjet(data.projet || '');
    setLoading(false);
  }

  const oscNames = [...new Set(records.map(r => r.fields["Nom de l'OSC"]).filter(Boolean))].sort();
  const oscRecords = selectedOSC ? records.filter(r => r.fields["Nom de l'OSC"] === selectedOSC) : [];
  const presentEvals = EVAL_ORDER.filter(e => oscRecords.some(r => r.fields["Type d'évaluation"] === e));
  const getRecordForEval = (evalType) => oscRecords.find(r => r.fields["Type d'évaluation"] === evalType);

  const radarData = Object.entries(SCORE_FIELDS).map(([sec, field]) => {
    const entry = { section: SEC_NAMES[sec].split(' ')[0] };
    for (const evalType of presentEvals) {
      const rec = getRecordForEval(evalType);
      entry[evalType] = rec ? (rec.fields[field] || 0) : 0;
    }
    return entry;
  });

  if (loading) return <div style={{padding:40,textAlign:'center',color:'#94a3b8',fontFamily:'Inter,sans-serif'}}>Chargement...</div>;
  if (error) return <div style={{padding:40,textAlign:'center',color:'#dc2626',fontFamily:'Inter,sans-serif'}}>Accès refusé</div>;
  if (!projet) return <div style={{padding:40,textAlign:'center',color:'#94a3b8',fontFamily:'Inter,sans-serif'}}>Lien invalide</div>;

  return (
    <div style={{fontFamily:'Inter,system-ui,sans-serif',background:'#f8fafc',minHeight:'100vh',padding:'24px 32px'}}>
      <div style={{maxWidth:1100,margin:'0 auto'}}>
        <div style={{marginBottom:28}}>
          <img src="https://images.fillout.com/orgid-732662/flowpublicid-p3BgAaYgGLus/widgetid-mMJS/kXtZ75Zg8QSTBDfjg3Vcwb/PULSE_LOGO_COULEUR.svg?a=rtAAwtQK1rtQfYt7rqMdQS" style={{height:40,marginBottom:12}} alt="PULSE"/>
          <h1 style={{fontSize:22,fontWeight:800,color:'#0f172a',margin:0}}>Dashboard — {projet}</h1>
          <p style={{fontSize:13,color:'#94a3b8',margin:'4px 0 0'}}>{oscNames.length} OSC suivies</p>
        </div>

        {/* OSC grid overview */}
        <div style={{background:'#fff',borderRadius:12,padding:'20px 24px',marginBottom:24,border:'1px solid #e2e8f0'}}>
          <h2 style={{fontSize:15,fontWeight:700,color:'#1e293b',margin:'0 0 16px'}}>Vue d'ensemble</h2>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:10}}>
            {oscNames.map(osc => {
              const oscRecs = records.filter(r => r.fields["Nom de l'OSC"] === osc);
              const latest = EVAL_ORDER.slice().reverse().find(e => oscRecs.some(r => r.fields["Type d'évaluation"] === e));
              const latestRec = oscRecs.find(r => r.fields["Type d'évaluation"] === latest);
              const score = latestRec?.fields['Score_Global'];
              const isSelected = selectedOSC === osc;
              return (
                <div key={osc}
                  onClick={() => setSelectedOSC(isSelected ? '' : osc)}
                  style={{padding:'12px 14px',borderRadius:10,border:isSelected?'2px solid #2563eb':'1px solid #e2e8f0',cursor:'pointer',background:isSelected?'#eff6ff':'#fff'}}
                >
                  <div style={{fontSize:13,fontWeight:700,color:'#1e293b',marginBottom:4}}>{osc}</div>
                  <div style={{fontSize:11,color:'#94a3b8',marginBottom:6}}>{latest ? EVAL_SHORT[latest] : 'Aucune éval'}</div>
                  <div style={{fontSize:20,fontWeight:800,color:score>=7?'#16a34a':score>=5?'#d97706':'#dc2626'}}>
                    {score != null ? Number(score).toFixed(1) : '—'}<span style={{fontSize:11,color:'#94a3b8'}}>/10</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detail selected OSC */}
        {selectedOSC && oscRecords.length > 0 && (
          <>
            <h2 style={{fontSize:17,fontWeight:800,color:'#0f172a',margin:'0 0 16px'}}>Détail — {selectedOSC}</h2>

            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,marginBottom:24}}>
              {presentEvals.map(evalType => {
                const rec = getRecordForEval(evalType);
                const score = rec?.fields['Score_Global'];
                return (
                  <div key={evalType} style={{background:'#fff',borderRadius:12,padding:'14px 16px',borderTop:`3px solid ${EVAL_COLORS[evalType]}`}}>
                    <div style={{fontSize:11,fontWeight:700,color:EVAL_COLORS[evalType],marginBottom:6}}>{EVAL_SHORT[evalType]}</div>
                    <div style={{fontSize:26,fontWeight:800,color:EVAL_COLORS[evalType]}}>{score!=null?Number(score).toFixed(1):'—'}<span style={{fontSize:12,color:'#94a3b8'}}>/10</span></div>
                  </div>
                );
              })}
            </div>

            <div style={{background:'#fff',borderRadius:12,padding:'20px 24px',marginBottom:24,border:'1px solid #e2e8f0'}}>
              <h3 style={{fontSize:14,fontWeight:700,color:'#1e293b',margin:'0 0 12px'}}>Scores par section</h3>
              <ResponsiveContainer width="100%" height={340}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0"/>
                  <PolarAngleAxis dataKey="section" tick={{fill:'#475569',fontSize:11}}/>
                  <PolarRadiusAxis angle={90} domain={[0,10]} tick={{fill:'#94a3b8',fontSize:9}} tickCount={6}/>
                  {presentEvals.map(e => <Radar key={e} name={EVAL_SHORT[e]} dataKey={e} stroke={EVAL_COLORS[e]} fill={EVAL_COLORS[e]} fillOpacity={0.12} strokeWidth={2}/>)}
                  <Tooltip contentStyle={{fontSize:11}}/>
                  <Legend wrapperStyle={{fontSize:11}}/>
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div style={{background:'#fff',borderRadius:12,padding:'20px 24px',border:'1px solid #e2e8f0'}}>
              <h3 style={{fontSize:14,fontWeight:700,color:'#1e293b',margin:'0 0 12px'}}>Scores par section</h3>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                <thead>
                  <tr style={{borderBottom:'2px solid #e2e8f0'}}>
                    <th style={{textAlign:'left',padding:'8px 12px',color:'#64748b'}}>Section</th>
                    {presentEvals.map(e => <th key={e} style={{textAlign:'center',padding:'8px 12px',color:EVAL_COLORS[e]}}>{EVAL_SHORT[e]}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(SEC_NAMES).map(([sec, name]) => (
                    <tr key={sec} style={{borderBottom:'1px solid #f1f5f9'}}>
                      <td style={{padding:'8px 12px',color:'#334155'}}><strong>S{sec}</strong> {name}</td>
                      {presentEvals.map(evalType => {
                        const rec = getRecordForEval(evalType);
                        const score = rec?.fields[SCORE_FIELDS[sec]];
                        const c = score>=7?'#16a34a':score>=5?'#d97706':score>0?'#dc2626':'#94a3b8';
                        return <td key={evalType} style={{textAlign:'center',padding:'8px 12px',fontWeight:700,color:c}}>{score!=null?Number(score).toFixed(1):'—'}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
