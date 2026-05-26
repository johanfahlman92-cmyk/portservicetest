import { useState, useRef, useEffect } from 'react'
import { Calendar, AlertCircle, LogOut, Clock, CheckCircle, Play,
         ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
         ClipboardList, Wrench, Database, Search, FileText, Plus, X, CalendarDays, Printer, Pencil,
         ShieldCheck, ShieldAlert, Shield, Moon, Sun, Paperclip } from 'lucide-react'
import FilUppladdning from '../components/FilUppladdning.jsx'
import { supabase } from '../lib/supabase.js'

// ── Garantihjälpare (delad med Portregister) ──────────────────────────────────
function garantiStatusTek(installationsdatum, garantiAr) {
  if (!installationsdatum || !garantiAr) return null
  const inst   = new Date(installationsdatum + 'T00:00:00')
  const utgång = new Date(inst)
  utgång.setFullYear(utgång.getFullYear() + parseInt(garantiAr || 2))
  const dagar  = Math.round((utgång - new Date().setHours(0,0,0,0)) / 86400000)
  return { utgångsdatum: utgång.toISOString().slice(0,10), dagar, giltig: dagar > 0 }
}
import logo from '../logo.png'
import { protokollPunkter, RISKPUNKTER as RISKPUNKTER_DEFAULT } from '../data/store.js'
import { hämtaLogoBase64, pdfMontageProt, pdfRiskBedömning, pdfArende, pdfServiceProt, öppnaPrintFönster } from '../utils/pdf.js'
import Felanmalan from './Felanmalan.jsx'
import Portregister from './Portregister.jsx'

// Modul-nivå fallback – sub-komponenter utan prop-access använder denna
const RISKPUNKTER = RISKPUNKTER_DEFAULT

// ── Konstanter ────────────────────────────────────────────────────────────────
const PRIO_CONF = {
  akut:   { label: 'Akut',   badge: 'badge-red',   bar: 'var(--c-red)'   },
  hog:    { label: 'Hög',    badge: 'badge-amber',  bar: 'var(--c-amber)' },
  normal: { label: 'Normal', badge: 'badge-blue',   bar: 'var(--c-blue)'  },
}
const PROT_STATUSES = [
  { kod: 'G', label: 'Godkänd',   bg: 'var(--c-teal-bg)',  txt: 'var(--c-teal-text)',  border: 'var(--c-teal)'  },
  { kod: 'J', label: 'Notera',    bg: 'var(--c-amber-bg)', txt: 'var(--c-amber-text)', border: 'var(--c-amber)' },
  { kod: 'A', label: 'Avvikelse', bg: 'var(--c-red-bg)',   txt: 'var(--c-red-text)',   border: 'var(--c-red)'   },
]
const RISK_STATUS = [
  { id: 'ok',          label: '✓ OK',           bg: 'var(--c-teal-bg)',  txt: 'var(--c-teal-text)',  border: 'var(--c-teal)'  },
  { id: 'atgard',      label: '⚠ Åtgärd krävs', bg: 'var(--c-amber-bg)', txt: 'var(--c-amber-text)', border: 'var(--c-amber)' },
  { id: 'ej_aktuellt', label: '– Ej aktuellt',  bg: '#f0eeeb',           txt: '#666',                border: '#ccc'           },
]
const EGENKONTROLL = {
  Vikport:     ['Portblad och skenor utan skador eller deformationer','Vridpunkter / gångjärn smorda och kontrollerade','Fjädersystem kalibrerat och säkrat','Säkerhetsbroms kontrollerad och testad','Nödöppning (handmanöver) testad','Automatikmotor monterad och kalibrerad','Fotocell / säkerhetskant testad (reversering)','Dörrslutning och tätlister kontrollerade','Ändlägen inställda','CE-märkning och varningsskyltar monterade','Bruksanvisning överlämnad till kund'],
  Takskjutport:['Skensystem rakt, horisontalt och säkrat','Balansfjädrar kontrollerade och justerade','Portblad utan skador eller deformationer','Hjul och lager smorda','Nödöppning (handmanöver) testad','Motormontering och fästpunkter kontrollerade','Ändlägen inställda','Säkerhetsfunktioner (reversering) testade','Anslutning till elnät kontrollerad','CE-märkning monterad','Bruksanvisning överlämnad till kund'],
  Lastbrygga:  ['Hydraulsystem utan läckage','Läpplucka och plattform utan skador','Styrsystem och manöverpanel testad','Ändlägesavstängning kontrollerad','Säkerhetskant / lista testad','Maxlast tydligt markerad','Elektrisk installation kontrollerad','Nödstoppsfunktion testad','Hydraulslang utan skador eller förslitning','CE-märkning monterad','Bruksanvisning överlämnad till kund'],
  Grind:       ['Stolpar / fundament stabilt monterade och ingjutna','Räls / styrning rak och säkrad','Grindblad utan skador eller deformationer','Motorenhet monterad och konfigurerad','Fotocell / säkerhetskant kontrollerad','Nödöppning testad','Trafikljus / signallampor testade (om tillämpligt)','Låssystem kontrollerat','Ändlägen inställda','CE-märkning monterad','Bruksanvisning överlämnad till kund'],
}
const PORT_TYPER    = ['Vikport', 'Takskjutport', 'Lastbrygga', 'Grind']
const FASTA_FABRIKAT = ['Torverk', 'Lindab', 'Hörmann', 'Beyron Door', 'Nordic Door']
const DAG_NAMN      = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön']

// ── Hjälp ──────────────────────────────────────────────────────────────────────
const formatDag = (d) => { try { const [y,m,day]=d.split('-').map(Number); return new Date(y,m-1,day).toLocaleDateString('sv-SE',{weekday:'long',day:'numeric',month:'long'}) } catch { return d } }
const idag = () => new Date().toISOString().slice(0,10)
const montDatum = m => m.onskat_montagedag||m.datum_planerat||m.datum||''
const genNr = () => new Date().toISOString().slice(2,10).replace(/-/g,'') + '-' + Math.floor(Math.random()*90+10)
const getVeckoDagar = (offset) => {
  const now = new Date(); const day = now.getDay()
  const mon = new Date(now); mon.setDate(now.getDate() - (day===0?6:day-1) + offset*7)
  return Array.from({length:7},(_,i)=>{ const d=new Date(mon); d.setDate(mon.getDate()+i); return d.toISOString().slice(0,10) })
}
const INP = { width:'100%', padding:'11px 12px', fontSize:16, border:'1px solid var(--c-border)', borderRadius:9, background:'var(--c-bg)', color:'var(--c-text)', boxSizing:'border-box' }
const LBL = { fontSize:12, color:'var(--c-text2)', marginBottom:4, display:'block', marginTop:10 }

// ── SignaturPad ────────────────────────────────────────────────────────────────
function SignaturPad({ onChange }) {
  const ref=useRef(null); const drawing=useRef(false); const last=useRef({x:0,y:0})
  const pos=(e,c)=>{ const r=c.getBoundingClientRect(),s=e.touches?e.touches[0]:e; return{x:(s.clientX-r.left)*(c.width/r.width),y:(s.clientY-r.top)*(c.height/r.height)} }
  const start=e=>{ drawing.current=true; last.current=pos(e,ref.current); e.preventDefault() }
  const draw=e=>{ if(!drawing.current)return; const c=ref.current,ctx=c.getContext('2d'),p=pos(e,c); ctx.beginPath();ctx.moveTo(last.current.x,last.current.y);ctx.lineTo(p.x,p.y);ctx.strokeStyle='#1a1917';ctx.lineWidth=2.5;ctx.lineCap='round';ctx.stroke();last.current=p;e.preventDefault() }
  const stop=()=>{ if(!drawing.current)return; drawing.current=false; onChange?.(ref.current.toDataURL()) }
  const rensa=()=>{ ref.current.getContext('2d').clearRect(0,0,600,150); onChange?.(null) }
  return (
    <div>
      <canvas ref={ref} width={600} height={150} style={{border:'2px solid var(--c-border)',borderRadius:10,width:'100%',background:'#fff',touchAction:'none',display:'block'}}
        onMouseDown={start} onMouseMove={draw} onMouseUp={stop} onMouseLeave={stop}
        onTouchStart={start} onTouchMove={draw} onTouchEnd={stop} />
      <button className="btn" style={{fontSize:12,marginTop:8}} onClick={rensa}>✕ Rensa</button>
    </div>
  )
}

// ── ArendeKort ────────────────────────────────────────────────────────────────
function ArendeKort({ a, namn, tekniker: tekLista = [], onUppdatera, autoOpen = false }) {
  const [utv,      setUtv]      = useState(false)
  useEffect(() => { if (autoOpen) setUtv(true) }, [autoOpen])
  const [notering, setNotering] = useState(a.notering || '')
  const [sparar,   setSparar]   = useState(false)
  const [klarad,   setKlarad]   = useState(false)
  const [tagen,    setTagen]    = useState(false)
  const [visaRisk, setVisaRisk] = useState(false)
  const [risk,     setRisk]     = useState({})
  const [riskN,    setRiskN]    = useState({})
  const [ansvariga,setAnsvariga]= useState(namn?[{id:'a0',namn,roll:''}]:[])
  const [egna,     setEgna]     = useState([])
  const [redigerar,  setRedigerar]  = useState(false)
  const [editForm,   setEditForm]   = useState({})
  const [sparar2,    setSparar2]    = useState(false)

  const otilldelad  = !(a.tekniker || []).length
  const riskGjord   = Object.keys(risk).length > 0
  const startRedigera = () => {
    setEditForm({feltyp:a.feltyp||'',tekniker:Array.isArray(a.tekniker)?[...a.tekniker]:a.tekniker?[a.tekniker]:[],prioritet:a.prioritet||'normal',besok:a.besok||'',beskrivning:a.beskrivning||''})
    setRedigerar(true)
  }
  const sparaRedigering = async () => {
    setSparar2(true)
    await onUppdatera(a.id, editForm)
    setSparar2(false)
    setRedigerar(false)
  }

  if (klarad) return (
    <div className="card" style={{display:'flex',alignItems:'center',gap:12,background:'var(--c-teal-bg)',border:'1px solid var(--c-teal)'}}>
      <CheckCircle size={24} color="var(--c-teal)"/>
      <div><div style={{fontSize:14,fontWeight:600,color:'var(--c-teal-text)'}}>Klart!</div><div style={{fontSize:12,color:'var(--c-teal-text)'}}>#{a.nr} · {a.kund}</div></div>
    </div>
  )
  if (tagen) return (
    <div className="card" style={{display:'flex',alignItems:'center',gap:12,background:'var(--c-blue-bg, #EFF6FF)',border:'1px solid var(--c-blue)'}}>
      <CheckCircle size={22} color="var(--c-blue)"/>
      <div><div style={{fontSize:14,fontWeight:600,color:'var(--c-blue)'}}>Tilldelat dig!</div><div style={{fontSize:12,color:'var(--c-text2)'}}>#{a.nr} · {a.kund}</div></div>
    </div>
  )

  const prio = PRIO_CONF[a.prioritet] || PRIO_CONF.normal
  return (
    <div className="card" style={{borderLeft:`4px solid ${otilldelad ? 'var(--c-border)' : prio.bar}`,padding:0,overflow:'hidden'}}>
      <div onClick={()=>setUtv(v=>!v)} style={{padding:'14px 16px',cursor:'pointer',display:'flex',gap:10}}>
        <div style={{flex:1}}>
          <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:5}}>
            <span className={`badge ${prio.badge}`}>{prio.label}</span>
            {otilldelad && <span style={{fontSize:11,background:'#f0eeeb',color:'#666',padding:'2px 7px',borderRadius:10}}>Otilldelad</span>}
            {(a.tekniker||[]).filter(t=>t!==namn).length>0 && <span style={{fontSize:11,background:'var(--c-bg)',color:'var(--c-text2)',padding:'2px 7px',borderRadius:10}}>👤 {(a.tekniker||[]).filter(t=>t!==namn).join(', ')}</span>}
            {riskGjord && <span style={{fontSize:11,background:'#f0fdf4',color:'#166534',padding:'2px 7px',borderRadius:10,border:'1px solid #bbf7d0'}}>🛡️ Risk</span>}
          </div>
          <div style={{fontSize:15,fontWeight:600}}>{a.kund}</div>
          <div style={{fontSize:13,color:'var(--c-text2)'}}>{a.namn||a.feltyp||'Felanmälan'}</div>
          {a.besok&&<div style={{fontSize:12,color:'var(--c-blue-text,#2563EB)',marginTop:4}}>📅 Besök: {a.besok}</div>}
        </div>
        <div style={{color:'var(--c-text3)',paddingTop:4}}>{utv?<ChevronUp size={18}/>:<ChevronDown size={18}/>}</div>
      </div>
      {utv && (
        <div style={{padding:'0 16px 16px',borderTop:'1px solid var(--c-border)'}}>
          {redigerar ? (
            <div style={{paddingTop:10}}>
              <label style={LBL}>Feltyp</label>
              <select value={editForm.feltyp} onChange={e=>setEditForm(p=>({...p,feltyp:e.target.value}))} style={INP}>
                <option value="">– Välj feltyp –</option>
                {FELTA.map(f=><option key={f} value={f}>{f}</option>)}
              </select>
              <label style={LBL}>Tilldelade tekniker</label>
              <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:4}}>
                {tekLista.map(t=>{
                  const checked=(editForm.tekniker||[]).includes(t)
                  return(
                    <button key={t} type="button" onClick={()=>setEditForm(p=>({...p,tekniker:checked?(p.tekniker||[]).filter(x=>x!==t):[...(p.tekniker||[]),t]}))}
                      style={{padding:'9px 14px',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',
                        border:`2px solid ${checked?'var(--c-blue)':'var(--c-border)'}`,
                        background:checked?'var(--c-blue-bg)':'transparent',
                        color:checked?'var(--c-blue)':'var(--c-text2)'}}>
                      {checked?'✓ ':''}{t}
                    </button>
                  )
                })}
              </div>
              <label style={LBL}>Prioritet</label>
              <div style={{display:'flex',gap:6,marginTop:4,marginBottom:4}}>
                {[['normal','Normal'],['hog','Hög'],['akut','Akut']].map(([id,lab])=>(
                  <button key={id} onClick={()=>setEditForm(p=>({...p,prioritet:id}))}
                    style={{flex:1,padding:'10px 4px',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',
                      border:`2px solid ${editForm.prioritet===id?'var(--c-blue)':'var(--c-border)'}`,
                      background:editForm.prioritet===id?'var(--c-blue-bg,#eff6ff)':'transparent',
                      color:editForm.prioritet===id?'var(--c-blue)':'var(--c-text3)'}}>{lab}</button>
                ))}
              </div>
              <label style={LBL}>Planerat besök</label>
              <input type="date" value={editForm.besok} onChange={e=>setEditForm(p=>({...p,besok:e.target.value}))} style={{...INP,colorScheme:'light'}}/>
              <label style={LBL}>Beskrivning</label>
              <textarea value={editForm.beskrivning} onChange={e=>setEditForm(p=>({...p,beskrivning:e.target.value}))} rows={2} style={{...INP,resize:'vertical'}}/>
              <div style={{display:'flex',gap:8,marginTop:12}}>
                <button onClick={sparaRedigering} disabled={sparar2}
                  style={{flex:1,padding:12,borderRadius:9,background:'var(--c-blue)',color:'#fff',border:'none',fontSize:13,fontWeight:600,cursor:'pointer'}}>
                  {sparar2?'Sparar…':'Spara ändringar'}
                </button>
                <button onClick={()=>setRedigerar(false)}
                  style={{padding:'12px 14px',borderRadius:9,background:'transparent',color:'var(--c-text3)',border:'1px solid var(--c-border)',fontSize:13,cursor:'pointer'}}>
                  Avbryt
                </button>
              </div>
            </div>
          ) : (
            <>
              <div style={{display:'flex',justifyContent:'flex-end',marginTop:10,marginBottom:4}}>
                <button onClick={startRedigera}
                  style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',
                    border:'1.5px solid var(--c-border)',background:'transparent',color:'var(--c-text2)'}}>
                  <Pencil size={12}/> Redigera
                </button>
              </div>
              {a.beskrivning&&<div style={{fontSize:13,color:'var(--c-text2)',fontStyle:'italic',background:'var(--c-bg)',borderRadius:8,padding:'10px 12px',margin:'0 0 12px'}}>"{a.beskrivning}"</div>}
              {!otilldelad && <>
                <label style={LBL}>Notering / åtgärd</label>
                <textarea value={notering} onChange={e=>setNotering(e.target.value)} rows={2} placeholder="Beskriv utförd åtgärd…"
                  style={{...INP,resize:'vertical',marginBottom:10}}/>
              </>}

              {/* Valfri riskbedömning */}
              {!otilldelad && (
                <div style={{marginBottom:8}}>
                  <button onClick={()=>setVisaRisk(v=>!v)}
                    style={{width:'100%',padding:'10px 14px',borderRadius:9,fontSize:13,fontWeight:600,cursor:'pointer',
                      border:`1.5px solid ${riskGjord?'#16a34a':'var(--c-border)'}`,
                      background:riskGjord?'#f0fdf4':'transparent',
                      color:riskGjord?'#166534':'var(--c-text2)',
                      display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <span>🛡️ Riskbedömning {riskGjord?'(klar)':'(valfritt)'}</span>
                    <span>{visaRisk?'▲':'▼'}</span>
                  </button>
                  {visaRisk&&(
                    <div style={{marginTop:8}}>
                      <AnsvarigaPanel ansvariga={ansvariga} tekniker={tekLista} onChange={setAnsvariga}/>
                      {RISKPUNKTER.map((p,i)=>{ const s=risk[i]; return(
                        <div key={i} className="card" style={{marginBottom:6,padding:'10px 12px'}}>
                          <div style={{fontSize:12,marginBottom:8,lineHeight:1.4,color:'var(--c-text)'}}><span style={{color:'var(--c-text3)',marginRight:5}}>{i+1}.</span>{p}</div>
                          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:5}}>
                            {RISK_STATUS.map(({id,label,bg,txt,border})=>(
                              <button key={id} onClick={()=>setRisk(prev=>({...prev,[i]:s===id?undefined:id}))}
                                style={{padding:'9px 4px',borderRadius:7,fontSize:10,fontWeight:600,cursor:'pointer',
                                  border:`2px solid ${s===id?border:'var(--c-border)'}`,
                                  background:s===id?bg:'transparent',color:s===id?txt:'var(--c-text3)'}}>{label}</button>
                            ))}
                          </div>
                          {s==='atgard'&&<input type="text" placeholder="Beskriv åtgärd…" value={riskN[i]||''} onChange={e=>setRiskN(prev=>({...prev,[i]:e.target.value}))} style={{marginTop:6,width:'100%',padding:'7px 10px',fontSize:12,border:'1px solid var(--c-border)',borderRadius:7,background:'var(--c-bg)',color:'var(--c-text)',boxSizing:'border-box'}}/>}
                        </div>
                      )})}
                      <EgnaRiskerPanel egna={egna} onChange={setEgna}/>
                      {riskGjord&&(
                        <button onClick={async()=>{
                          const logo64=await hämtaLogoBase64()
                          öppnaPrintFönster(pdfRiskBedömning({
                            kund:a.kund,portNamn:a.namn||a.feltyp||'',portTyp:'',
                            tekniker:ansvariga.map(x=>x.namn).join(', ')||namn,datum:idag(),
                            ordernummer:a.nr||'',
                            riskKontroll:risk,riskNoteringar:riskN,
                            egenRisker:egna,ansvariga,
                          },logo64),'Riskbedömning')
                        }} style={{width:'100%',marginTop:8,padding:'11px 14px',borderRadius:9,background:'var(--c-surface)',color:'var(--c-text)',border:'1.5px solid var(--c-border)',fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:7}}>
                          <Printer size={14}/> Skriv ut riskbedömning
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div style={{display:'flex',flexDirection:'column',gap:8,marginTop:4}}>
                {otilldelad && (
                  <button disabled={sparar} onClick={async()=>{setSparar(true);await onUppdatera(a.id,{tekniker:[...(a.tekniker||[]).filter(t=>t!==namn),namn]});setTagen(true);setSparar(false)}}
                    style={{width:'100%',padding:14,borderRadius:10,background:'var(--c-blue)',color:'#fff',border:'none',fontSize:14,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                    ✋ Ta på mig
                  </button>
                )}
                {!otilldelad && a.status==='ny' && (
                  <button disabled={sparar} onClick={async()=>{setSparar(true);await onUppdatera(a.id,{status:'pagAr'});setSparar(false)}}
                    style={{width:'100%',padding:14,borderRadius:10,background:'var(--c-blue)',color:'#fff',border:'none',fontSize:14,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                    <Play size={16} fill="#fff"/> Starta arbete
                  </button>
                )}
                {/* Ångra start */}
                {!otilldelad && a.status==='pagAr' && (
                  <button disabled={sparar} onClick={async()=>{setSparar(true);await onUppdatera(a.id,{status:'ny'});setSparar(false)}}
                    style={{width:'100%',padding:10,borderRadius:10,background:'transparent',color:'var(--c-text3)',border:'1px solid var(--c-border)',fontSize:13,fontWeight:500,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                    ↩ Ångra start
                  </button>
                )}
                {!otilldelad && (a.status==='ny'||a.status==='pagAr') && (
                  <button disabled={sparar} onClick={async()=>{
                    setSparar(true)
                    const ok = await onUppdatera(a.id,{status:'atgardad',notering,...(riskGjord?{riskKontroll:risk,riskNoteringar:riskN}:{})})
                    if (ok) setKlarad(true)
                    setSparar(false)
                  }}
                    style={{width:'100%',padding:14,borderRadius:10,background:'var(--c-teal)',color:'#fff',border:'none',fontSize:14,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                    <CheckCircle size={16}/> Markera klar
                  </button>
                )}
                <button onClick={async()=>{
                  const logo64=await hämtaLogoBase64()
                  öppnaPrintFönster(pdfArende({...a,notering},logo64),`Felanmälan #${a.nr||''}`)
                }} style={{width:'100%',padding:10,borderRadius:10,background:'transparent',color:'var(--c-text3)',border:'1px solid var(--c-border)',fontSize:13,fontWeight:500,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                  <Printer size={14}/> Skriv ut felanmälan
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── NyKundSektion – återanvändbar kund-väljare med inline-skapa ──────────────
function NyKundSektion({ kunder, value, onChange, onNyKund }) {
  const [nyLage,    setNyLage]    = useState(false)
  const [nyNamn,    setNyNamn]    = useState('')
  const [nyAdress,  setNyAdress]  = useState('')
  const [nyTelefon, setNyTelefon] = useState('')
  const [skapar,    setSkapar]    = useState(false)
  const [fel,       setFel]       = useState('')

  const stang = () => { setNyLage(false); setNyNamn(''); setNyAdress(''); setNyTelefon(''); setFel('') }

  const skapa = async () => {
    if (!nyNamn.trim()) return
    setSkapar(true); setFel('')
    const result = await onNyKund?.({ namn: nyNamn.trim(), adress: nyAdress.trim(), telefon: nyTelefon.trim() })
    if (result) {
      onChange(nyNamn.trim())
      stang()
    } else {
      setFel('Kunde inte skapa kunden – kontrollera behörigheter i systemet.')
    }
    setSkapar(false)
  }

  if (nyLage) return (
    <div style={{background:'var(--c-bg)',border:'1.5px solid var(--c-teal)',borderRadius:10,padding:'12px 14px',marginBottom:2}}>
      <div style={{fontSize:12,fontWeight:700,color:'var(--c-teal-text)',marginBottom:10}}>Ny kund</div>
      <label style={LBL}>Namn *</label>
      <input type="text" value={nyNamn} onChange={e=>setNyNamn(e.target.value)} placeholder="Företag / kundnamn"
        style={{...INP,marginBottom:6}} autoFocus onKeyDown={e=>e.key==='Enter'&&skapa()}/>
      <label style={LBL}>Adress</label>
      <input type="text" value={nyAdress} onChange={e=>setNyAdress(e.target.value)} placeholder="Gatuadress, ort"
        style={{...INP,marginBottom:6}}/>
      <label style={LBL}>Telefon</label>
      <input type="tel" value={nyTelefon} onChange={e=>setNyTelefon(e.target.value)} placeholder="070-xxx xx xx"
        style={{...INP,marginBottom:8}}/>
      {fel && <div style={{fontSize:12,color:'var(--c-red-text,#991b1b)',background:'var(--c-red-bg,#fef2f2)',border:'1px solid var(--c-red)',borderRadius:7,padding:'7px 10px',marginBottom:8}}>⚠ {fel}</div>}
      <div style={{display:'flex',gap:6}}>
        <button onClick={skapa} disabled={skapar||!nyNamn.trim()}
          style={{flex:1,padding:'10px 14px',borderRadius:9,background:'var(--c-teal)',color:'#fff',border:'none',fontSize:13,fontWeight:600,cursor:'pointer',opacity:skapar||!nyNamn.trim()?0.55:1}}>
          {skapar?'Sparar…':'Spara kund'}
        </button>
        <button onClick={stang} style={{padding:'10px 12px',borderRadius:9,background:'transparent',color:'var(--c-text3)',border:'1px solid var(--c-border)',fontSize:13,cursor:'pointer'}}>✕</button>
      </div>
    </div>
  )
  return (
    <div>
      {kunder.length>0
        ? <select value={value} onChange={e=>onChange(e.target.value)} style={INP}>
            <option value="">– Välj kund –</option>
            {kunder.map(k=><option key={k.id} value={k.namn}>{k.namn}</option>)}
          </select>
        : <input type="text" value={value} onChange={e=>onChange(e.target.value)} placeholder="Kundnamn" style={INP}/>
      }
      {onNyKund && (
        <button onClick={()=>setNyLage(true)} style={{marginTop:6,padding:'6px 12px',borderRadius:7,fontSize:12,fontWeight:600,cursor:'pointer',border:'1.5px dashed var(--c-border)',background:'transparent',color:'var(--c-text2)',display:'flex',alignItems:'center',gap:5}}>
          <Plus size={12}/> Ny kund
        </button>
      )}
    </div>
  )
}

// ── Ny felanmälan-formulär ────────────────────────────────────────────────────
const FELTA = ['Dörren går inte upp','Dörren går inte ner','Fjäder bruten','Motor slutat fungera','Fjärrkontroll fungerar inte','Fotocell/säkerhetskant','Buller/skrammel','Tätlist skadad','Annat']
function NyArendeForm({ kunder, namn, tekniker: tekLista=[], onSpara, onAvbryt, onNyKund }) {
  const [form, setForm] = useState({kund:'',feltyp:'',beskrivning:'',prioritet:'normal',besok:'',tekniker:namn?[namn]:[]})
  const [sparar, setSparar] = useState(false)
  const set = (k,v) => setForm(p=>({...p,[k]:v}))
  const spara = async () => {
    if (!form.kund.trim()) return
    setSparar(true)
    await onSpara({nr:genNr(),status:'ny',datum:idag(),namn:form.feltyp||'Felanmälan',...form})
    setSparar(false)
  }
  return (
    <div className="card" style={{marginBottom:16}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <div style={{fontWeight:600,fontSize:15}}>Ny felanmälan</div>
        <button className="btn" onClick={onAvbryt} style={{padding:'4px 8px'}}><X size={14}/></button>
      </div>
      <label style={LBL}>Kund *</label>
      <NyKundSektion kunder={kunder} value={form.kund} onChange={v=>set('kund',v)} onNyKund={onNyKund}/>
      <label style={LBL}>Feltyp</label>
      <select value={form.feltyp} onChange={e=>set('feltyp',e.target.value)} style={INP}>
        <option value="">– Välj feltyp –</option>
        {FELTA.map(f=><option key={f} value={f}>{f}</option>)}
      </select>
      <label style={LBL}>Tilldelade tekniker</label>
      <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:4,marginBottom:4}}>
        {tekLista.map(t=>{
          const checked=(form.tekniker||[]).includes(t)
          return(
            <button key={t} type="button" onClick={()=>set('tekniker',checked?(form.tekniker||[]).filter(x=>x!==t):[...(form.tekniker||[]),t])}
              style={{padding:'9px 14px',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',
                border:`2px solid ${checked?'var(--c-blue)':'var(--c-border)'}`,
                background:checked?'var(--c-blue-bg)':'transparent',
                color:checked?'var(--c-blue)':'var(--c-text2)'}}>
              {checked?'✓ ':''}{t}
            </button>
          )
        })}
      </div>
      <label style={LBL}>Beskrivning</label>
      <textarea value={form.beskrivning} onChange={e=>set('beskrivning',e.target.value)} rows={2} placeholder="Beskriv felet…" style={{...INP,resize:'vertical'}}/>
      <label style={LBL}>Prioritet</label>
      <div style={{display:'flex',gap:6,marginTop:4,marginBottom:4}}>
        {[['normal','Normal'],['hog','Hög'],['akut','Akut']].map(([id,lab])=>(
          <button key={id} onClick={()=>set('prioritet',id)} style={{flex:1,padding:'10px 4px',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',border:`2px solid ${form.prioritet===id?'var(--c-blue)':'var(--c-border)'}`,background:form.prioritet===id?'var(--c-blue-bg,#eff6ff)':'transparent',color:form.prioritet===id?'var(--c-blue)':'var(--c-text3)'}}>{lab}</button>
        ))}
      </div>
      <label style={LBL}>Planerat besök</label>
      <input type="date" value={form.besok} onChange={e=>set('besok',e.target.value)} style={{...INP,colorScheme:'light'}}/>
      <div style={{display:'flex',gap:8,marginTop:14}}>
        <button className="btn btn-primary" onClick={spara} disabled={sparar||!form.kund.trim()} style={{flex:1,padding:13,fontSize:14}}>
          {sparar?'Sparar…':<><AlertCircle size={15}/> Skapa felanmälan</>}
        </button>
        <button className="btn" onClick={onAvbryt}>Avbryt</button>
      </div>
    </div>
  )
}

// ── Ny serviceorder-formulär ──────────────────────────────────────────────────
function NyServiceorderForm({ objekt, kunder, namn, tekniker: tekLista=[], onSpara, onAvbryt, onNyKund, onLaggTillObjekt }) {
  const [sok,      setSok]      = useState('')
  const [port,     setPort]     = useState(null)
  const [porttyp,  setPorttyp]  = useState('Vikport')
  const [fabrikat, setFabrikat] = useState('')
  const [annatFab, setAnnatFab] = useState('')
  const [serienr,  setSerienr]  = useState('')
  const [kund,     setKund]     = useState('')
  const [adress,   setAdress]   = useState('')
  const [datum,    setDatum]    = useState(idag())
  const [notering, setNotering] = useState('')
  const [tekVal,   setTekVal]   = useState(namn || '')
  const [status,   setStatus]   = useState('planerad')
  const [sparar,   setSparar]   = useState(false)
  const [felMsg,   setFelMsg]   = useState('')

  const effFab = fabrikat === 'Annat' ? annatFab : fabrikat
  const SEC = {fontSize:13,fontWeight:700,color:'var(--c-text)',marginBottom:14,paddingBottom:10,borderBottom:'2px solid var(--c-border)'}
  const lbl = {fontSize:12,fontWeight:500,color:'var(--c-blue-text)',display:'block',marginBottom:5,marginTop:14}
  const hits = sok.length > 1
    ? objekt.filter(o=>!o.arkiverad&&(o.namn?.toLowerCase().includes(sok.toLowerCase())||o.kund?.toLowerCase().includes(sok.toLowerCase()))).slice(0,6)
    : []

  const väljaPort = (p) => {
    setPort(p); setSok('')
    setPorttyp(p.typ||'Vikport')
    setFabrikat(FASTA_FABRIKAT.includes(p.fabrikat)?p.fabrikat:(p.fabrikat?'Annat':''))
    setAnnatFab(!FASTA_FABRIKAT.includes(p.fabrikat)?p.fabrikat||'':'')
    setSerienr(p.serienummer||'')
    setKund(p.kund||'')
    setAdress(p.adress||p.plats||'')
  }

  const spara = async () => {
    if (!datum) return
    setSparar(true); setFelMsg('')
    try {
      let objektId = port?.id || null
      if (!objektId && porttyp && kund.trim() && onLaggTillObjekt) {
        const nyPort = await onLaggTillObjekt({
          typ: porttyp, namn: `${porttyp}${adress?' – '+adress:''}`,
          kund: kund.trim(), fabrikat: effFab.trim(), adress: adress.trim(),
          serienummer: serienr.trim(), status:'ny', protokoll:porttyp,
          punkter:0, historik:[], ar:new Date().getFullYear(), serviceIntervall:12,
        })
        if (nyPort?.id) objektId = nyPort.id
      }
      await onSpara({
        nr:genNr(), datum, status,
        tekniker:tekVal, kund:kund.trim()||port?.kund||'',
        fastighet_id: port?.fastighetId || null,
        fastighet_namn: port?.plats || '',
        objekt_ids: objektId?[objektId]:[],
        protokoll:{},
        ...(notering.trim()?{notering:notering.trim()}:{}),
      })
    } catch(e) { setFelMsg(e.message||'Kunde inte spara'); setSparar(false); return }
    setSparar(false)
  }

  return (
    <div style={{marginBottom:16}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <h2 style={{fontSize:18,fontWeight:700,margin:0}}>Ny serviceorder</h2>
        <button className="btn" onClick={onAvbryt} style={{padding:'6px 10px'}}><X size={14}/></button>
      </div>

      {/* ── Portinformation ── */}
      <div className="card" style={{marginBottom:12}}>
        <div style={SEC}>Portinformation</div>
        {port ? (
          <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:'var(--c-teal-bg)',border:'1px solid var(--c-teal)',borderRadius:9,marginBottom:12}}>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:700,color:'var(--c-teal-text)'}}>{port.namn}</div>
              <div style={{fontSize:12,color:'var(--c-text2)',marginTop:1}}>{port.kund} · {port.typ}</div>
            </div>
            <button onClick={()=>{setPort(null);setSok('');setKund('');setAdress('')}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--c-text3)',padding:4,display:'flex'}}><X size={14}/></button>
          </div>
        ) : (
          <div style={{position:'relative',marginBottom:12}}>
            <Search size={15} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--c-text3)',pointerEvents:'none'}}/>
            <input type="text" placeholder="Sök befintlig port (valfritt)…" value={sok} onChange={e=>setSok(e.target.value)} style={{...INP,paddingLeft:36}}/>
            {hits.length>0&&(
              <div style={{position:'absolute',top:'100%',left:0,right:0,zIndex:50,background:'var(--c-surface)',border:'1px solid var(--c-border)',borderRadius:10,boxShadow:'0 4px 20px rgba(0,0,0,0.13)',marginTop:4,overflow:'hidden'}}>
                {hits.map(o=>(
                  <div key={o.id} onClick={()=>väljaPort(o)}
                    style={{padding:'10px 14px',cursor:'pointer',borderBottom:'1px solid var(--c-border)'}}
                    onMouseEnter={e=>e.currentTarget.style.background='var(--c-bg)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <div style={{fontSize:14,fontWeight:600}}>{o.namn}</div>
                    <div style={{fontSize:12,color:'var(--c-text2)',marginTop:1}}>{o.kund} · {o.typ}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 14px'}}>
          <div>
            <label style={lbl}>Porttyp *</label>
            <select value={porttyp} onChange={e=>setPorttyp(e.target.value)} style={INP}>
              {PORT_TYPER.map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Fabrikat</label>
            <select value={fabrikat} onChange={e=>setFabrikat(e.target.value)} style={INP}>
              <option value="">– Välj fabrikat –</option>
              {FASTA_FABRIKAT.map(f=><option key={f}>{f}</option>)}
              <option value="Annat">Annat / okänt</option>
            </select>
            {fabrikat==='Annat'&&<input type="text" value={annatFab} onChange={e=>setAnnatFab(e.target.value)} placeholder="Ange fabrikat…" style={{...INP,marginTop:6}}/>}
          </div>
          <div style={{gridColumn:'1/-1'}}>
            <label style={lbl}>Serienummer</label>
            <input type="text" value={serienr} onChange={e=>setSerienr(e.target.value)} placeholder="Valfritt" style={INP}/>
          </div>
        </div>
      </div>

      {/* ── Plats & kund ── */}
      <div className="card" style={{marginBottom:12}}>
        <div style={SEC}>Plats & kund</div>
        <label style={{...lbl,marginTop:0}}>Kund</label>
        <NyKundSektion kunder={kunder} value={kund} onChange={setKund} onNyKund={onNyKund}/>
        <label style={lbl}>Adress / plats</label>
        <input type="text" value={adress} onChange={e=>setAdress(e.target.value)} placeholder="Adress eller platsnamn" style={INP}/>
      </div>

      {/* ── Planering ── */}
      <div className="card" style={{marginBottom:12}}>
        <div style={SEC}>Planering</div>
        <label style={{...lbl,marginTop:0}}>Datum *</label>
        <input type="date" value={datum} onChange={e=>setDatum(e.target.value)} style={{...INP,colorScheme:'light'}}/>
        {tekLista.length>0&&<>
          <label style={lbl}>Tekniker</label>
          <select value={tekVal} onChange={e=>setTekVal(e.target.value)} style={INP}>
            <option value="">– Ej tilldelad –</option>
            {tekLista.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
        </>}
        <label style={lbl}>Status</label>
        <div style={{display:'flex',gap:6,marginTop:4}}>
          {[['planerad','Planerad'],['pagaende','Pågående'],['utford','Utförd']].map(([val,lab])=>(
            <button key={val} type="button" onClick={()=>setStatus(val)} style={{flex:1,padding:'8px 4px',borderRadius:8,cursor:'pointer',textAlign:'center',border:`2px solid ${status===val?'var(--c-blue)':'var(--c-border)'}`,background:status===val?'var(--c-blue-bg)':'var(--c-surface)',color:status===val?'var(--c-blue)':'var(--c-text)',fontSize:12,fontWeight:600}}>
              {lab}
            </button>
          ))}
        </div>
        <label style={lbl}>Notering</label>
        <textarea value={notering} onChange={e=>setNotering(e.target.value)} rows={3} placeholder="Vad ska göras, specifikationer…" style={{...INP,resize:'vertical'}}/>
      </div>

      {felMsg&&<div style={{background:'var(--c-red-bg)',border:'1px solid var(--c-red)',borderRadius:8,padding:'8px 12px',fontSize:13,color:'var(--c-red-text)',marginBottom:10}}>⚠ {felMsg}</div>}
      <div style={{display:'flex',gap:8}}>
        <button className="btn btn-primary" onClick={spara} disabled={sparar||!datum} style={{flex:1,padding:14,fontSize:14}}>
          {sparar?'Sparar…':<><ClipboardList size={15}/> Skapa serviceorder</>}
        </button>
        <button className="btn" onClick={onAvbryt} style={{padding:'14px 18px'}}>Avbryt</button>
      </div>
    </div>
  )
}

// ── Ny montageorder-formulär ──────────────────────────────────────────────────
function NyMontageorderForm({ kunder, namn, tekniker: tekLista=[], onSpara, onAvbryt, onNyKund }) {
  const [form,     setForm]     = useState({kund:'',porttyp:'Vikport',fabrikat:'',kundordernummer:'',montageplats:'',onskat_montagedag:idag(),preliminar_leverans:'',notering:''})
  const [annatFab, setAnnatFab] = useState('')
  const [tekVal,   setTekVal]   = useState(namn || '')
  const [status,   setStatus]   = useState('planerad')
  const [nmvNr,    setNmvNr]    = useState('MO-' + genNr())
  const [sparar,   setSparar]   = useState(false)
  const [felMsg,   setFelMsg]   = useState('')
  const set = (k,v) => setForm(p=>({...p,[k]:v}))
  const effFab = form.fabrikat === 'Annat' ? annatFab : form.fabrikat

  const spara = async () => {
    if (!form.kund.trim()) return
    setSparar(true); setFelMsg('')
    try {
      const res = await onSpara({
        ordernummer: nmvNr.trim() || ('MO-' + genNr()),
        status, tekniker: tekVal,
        kund: form.kund, porttyp: form.porttyp,
        fabrikat: effFab.trim(),
        serienummer: form.kundordernummer.trim(),
        montageplats: form.montageplats.trim(),
        onskat_montagedag: form.onskat_montagedag,
        preliminar_leverans: form.preliminar_leverans,
        notering: form.notering.trim(),
      })
      if (!res) setFelMsg('Kunde inte spara – kontrollera fälten')
    } catch(e) { setFelMsg(e.message||'Kunde inte spara') }
    setSparar(false)
  }

  return (
    <div className="card" style={{marginBottom:16}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <div style={{fontWeight:600,fontSize:15}}>Ny montageorder</div>
        <button className="btn" onClick={onAvbryt} style={{padding:'4px 8px'}}><X size={14}/></button>
      </div>
      <label style={LBL}>Kund *</label>
      <NyKundSektion kunder={kunder} value={form.kund} onChange={v=>set('kund',v)} onNyKund={onNyKund}/>
      <label style={LBL}>Porttyp</label>
      <select value={form.porttyp} onChange={e=>set('porttyp',e.target.value)} style={INP}>
        {PORT_TYPER.map(t=><option key={t}>{t}</option>)}
      </select>
      <label style={LBL}>Fabrikat</label>
      <select value={form.fabrikat} onChange={e=>set('fabrikat',e.target.value)} style={INP}>
        <option value="">– Välj fabrikat –</option>
        {FASTA_FABRIKAT.map(f=><option key={f}>{f}</option>)}
        <option value="Annat">Annat / okänt</option>
      </select>
      {form.fabrikat==='Annat'&&<input type="text" value={annatFab} onChange={e=>setAnnatFab(e.target.value)} placeholder="Ange fabrikat…" style={{...INP,marginTop:6}}/>}
      <label style={LBL}>NMV Ordernummer</label>
      <input type="text" value={nmvNr} onChange={e=>setNmvNr(e.target.value)} style={INP}/>
      <label style={LBL}>Ordernummer (port)</label>
      <input type="text" value={form.kundordernummer} onChange={e=>set('kundordernummer',e.target.value)} placeholder="t.ex. ORD-2024-001" style={INP}/>
      <label style={LBL}>Montageplats / Adress</label>
      <input type="text" value={form.montageplats} onChange={e=>set('montageplats',e.target.value)} placeholder="Leveransadress…" style={INP}/>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 12px'}}>
        <div>
          <label style={LBL}>Prelim. leverans</label>
          <input type="date" value={form.preliminar_leverans} onChange={e=>set('preliminar_leverans',e.target.value)} style={{...INP,colorScheme:'light'}}/>
        </div>
        <div>
          <label style={LBL}>Önskad montagedag</label>
          <input type="date" value={form.onskat_montagedag} onChange={e=>set('onskat_montagedag',e.target.value)} style={{...INP,colorScheme:'light'}}/>
        </div>
      </div>
      {tekLista.length>0&&<>
        <label style={LBL}>Tekniker</label>
        <select value={tekVal} onChange={e=>setTekVal(e.target.value)} style={INP}>
          <option value="">– Ej tilldelad –</option>
          {tekLista.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
      </>}
      <label style={LBL}>Status</label>
      <div style={{display:'flex',gap:6,marginTop:4}}>
        {[['planerad','Planerad'],['ej_planerad','Ej planerad']].map(([val,lab])=>(
          <button key={val} type="button" onClick={()=>setStatus(val)} style={{flex:1,padding:'8px 4px',borderRadius:8,cursor:'pointer',textAlign:'center',border:`2px solid ${status===val?'var(--c-blue)':'var(--c-border)'}`,background:status===val?'var(--c-blue-bg)':'var(--c-surface)',color:status===val?'var(--c-blue)':'var(--c-text)',fontSize:12,fontWeight:600}}>
            {lab}
          </button>
        ))}
      </div>
      <label style={LBL}>Notering</label>
      <textarea value={form.notering} onChange={e=>set('notering',e.target.value)} rows={2} placeholder="Specifikationer, önskemål…" style={{...INP,resize:'vertical'}}/>
      {felMsg&&<div style={{background:'var(--c-red-bg)',border:'1px solid var(--c-red)',borderRadius:8,padding:'8px 12px',fontSize:13,color:'var(--c-red-text)',marginTop:8}}>⚠ {felMsg}</div>}
      <div style={{display:'flex',gap:8,marginTop:14}}>
        <button className="btn btn-primary" onClick={spara} disabled={sparar||!form.kund.trim()} style={{flex:1,padding:13,fontSize:14}}>
          {sparar?'Sparar…':<><Wrench size={15}/> Skapa montageorder</>}
        </button>
        <button className="btn" onClick={onAvbryt}>Avbryt</button>
      </div>
    </div>
  )
}

// ── Ny port-formulär (mobil) ──────────────────────────────────────────────────
function NyPortForm({ kunder, fastigheter, onSpara, onAvbryt }) {
  const [form,   setForm]   = useState({typ:'Vikport',namn:'',kund:kunder[0]?.namn||'',fabrikat:'',ar:new Date().getFullYear(),adress:'',position:'',serviceIntervall:'12'})
  const [annat,  setAnnat]  = useState('')
  const [fel,    setFel]    = useState(false)
  const [sparar, setSparar] = useState(false)
  const [fastighetId, setFastighetId] = useState(fastigheter[0]?.id||'')
  const set = (k,v) => setForm(p=>({...p,[k]:v}))
  const fabrik = form.fabrikat==='Annat' ? annat : form.fabrikat

  const spara = async () => {
    if (!form.namn.trim()||!fabrik.trim()) { setFel(true); return }
    setSparar(true)
    const fast = fastigheter.find(f=>f.id===fastighetId)
    let nasta = ''
    if (form.serviceIntervall!=='0') { const d=new Date(); d.setMonth(d.getMonth()+parseInt(form.serviceIntervall)); nasta=d.toISOString().slice(0,10) }
    await onSpara({
      id:'p'+Date.now(), plats:fast?.namn||'', fastighetId:fastighetId||null,
      typ:form.typ, namn:form.namn.trim(), kund:form.kund,
      kundTyp:'foretag', fabrikat:fabrik.trim(), ar:parseInt(form.ar)||new Date().getFullYear(),
      adress:form.adress.trim(), position:form.position.trim(), ordernummer:'', serienummer:'',
      serviceIntervall:parseInt(form.serviceIntervall)||0,
      senaste:'', nasta, intervallProcent:0, status:'ny',
      protokoll:form.typ, punkter:0, historik:[], arkiverad:false,
    })
    setSparar(false)
  }

  return (
    <div className="card" style={{marginBottom:16}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <div style={{fontWeight:600,fontSize:15}}>Ny port</div>
        <button className="btn" onClick={onAvbryt} style={{padding:'4px 8px'}}><X size={14}/></button>
      </div>
      {fastigheter.length>0&&<>
        <label style={LBL}>Fastighet</label>
        <select value={fastighetId} onChange={e=>setFastighetId(e.target.value)} style={INP}>
          <option value="">– Ingen fastighet –</option>
          {fastigheter.filter(f=>!f.arkiverad).map(f=><option key={f.id} value={f.id}>{f.namn}{f.adress?` – ${f.adress}`:''}</option>)}
        </select>
      </>}
      <label style={LBL}>Porttyp</label>
      <select value={form.typ} onChange={e=>set('typ',e.target.value)} style={INP}>
        {PORT_TYPER.map(t=><option key={t}>{t}</option>)}
      </select>
      <label style={LBL}>Kund</label>
      {kunder.length>0
        ? <select value={form.kund} onChange={e=>set('kund',e.target.value)} style={INP}>
            <option value="">– Välj kund –</option>
            {kunder.map(k=><option key={k.id} value={k.namn}>{k.namn}</option>)}
          </select>
        : <input type="text" value={form.kund} onChange={e=>set('kund',e.target.value)} style={INP}/>
      }
      <label style={LBL}>Placering / namn *</label>
      <input type="text" value={form.namn} onChange={e=>set('namn',e.target.value)} placeholder="t.ex. Vikport lager B – Port 2"
        style={{...INP,borderColor:fel&&!form.namn.trim()?'var(--c-red)':undefined}}/>
      <label style={LBL}>Fabrikat *</label>
      <select value={form.fabrikat} onChange={e=>set('fabrikat',e.target.value)}
        style={{...INP,borderColor:fel&&!fabrik.trim()?'var(--c-red)':undefined}}>
        <option value="">– Välj fabrikat –</option>
        {FASTA_FABRIKAT.map(f=><option key={f} value={f}>{f}</option>)}
        <option value="Annat">Annat / okänt</option>
      </select>
      {form.fabrikat==='Annat'&&<input type="text" value={annat} onChange={e=>setAnnat(e.target.value)} placeholder="Ange fabrikat" style={{...INP,marginTop:6}}/>}
      <label style={LBL}>Position</label>
      <input type="text" value={form.position} onChange={e=>set('position',e.target.value)} placeholder="t.ex. Port A, Norrgavel, Lastkaj 2" style={INP}/>
      <label style={LBL}>Adress</label>
      <input type="text" value={form.adress} onChange={e=>set('adress',e.target.value)} placeholder="Industrivägen 12" style={INP}/>
      <label style={LBL}>Installationsår</label>
      <input type="number" value={form.ar} onChange={e=>set('ar',e.target.value)} style={INP}/>
      <label style={LBL}>Serviceintervall</label>
      <div style={{display:'flex',gap:6,marginTop:4}}>
        {[['12','1 gång/år'],['6','2 ggr/år'],['0','Ingen']].map(([val,lab])=>(
          <button key={val} type="button" onClick={()=>set('serviceIntervall',val)} style={{flex:1,padding:'10px 6px',borderRadius:8,cursor:'pointer',textAlign:'center',border:`2px solid ${form.serviceIntervall===val?'var(--c-teal)':'var(--c-border)'}`,background:form.serviceIntervall===val?'var(--c-teal-bg)':'var(--c-surface)',color:form.serviceIntervall===val?'var(--c-teal-text)':'var(--c-text)',fontSize:12,fontWeight:600}}>
            {lab}
          </button>
        ))}
      </div>
      {fel&&<div style={{fontSize:12,color:'var(--c-red)',marginTop:8}}>Fyll i alla obligatoriska fält (*).</div>}
      <div style={{display:'flex',gap:8,marginTop:14}}>
        <button className="btn btn-primary" onClick={spara} disabled={sparar} style={{flex:1,padding:13,fontSize:14}}>
          {sparar?'Sparar…':<><Plus size={15}/> Spara port</>}
        </button>
        <button className="btn" onClick={onAvbryt}>Avbryt</button>
      </div>
    </div>
  )
}

// ── Serviceprotokoll-formulär ─────────────────────────────────────────────────
// ServiceProtokollFormular: 2 eller 3 steg beroende på inkluderaRisk
function ServiceProtokollFormular({ port, namn, tekniker: tekLista=[], inkluderaRisk=true, onSlutfor, onBack }) {
  const punkter = protokollPunkter[port?.typ] || []
  const [steg,    setSteg]  = useState(1)
  const [risk,    setRisk]  = useState({}); const [riskN,setRiskN]=useState({})
  const [ansvariga,setAnsvariga]=useState(namn?[{id:'a0',namn,roll:''}]:[])
  const [egna,    setEgna]  = useState([])
  const [statuses,setSt]    = useState({})
  const [noter,   setNot]   = useState({})
  const [sig,     setSig]   = useState(null)
  const [sparar,  setSparar]= useState(false)
  const g=Object.values(statuses).filter(s=>s==='G').length,j=Object.values(statuses).filter(s=>s==='J').length,a=Object.values(statuses).filter(s=>s==='A').length
  const ifyllda=g+j+a,total=punkter.filter(p=>!String(p).startsWith('## ')).length,pct=total>0?Math.round(ifyllda/total*100):0
  const godkannAlla=()=>{ const n={}; punkter.forEach((p,i)=>{if(!String(p).startsWith('## '))n[i]='G'}); setSt(n) }
  const slutfor=async()=>{ setSparar(true); await onSlutfor({datum:idag(),tekniker:namn,statuses,noteringar:noter,signatur:sig,g,j,a,portTyp:port?.typ,portNamn:port?.namn,kund:port?.kund,...(inkluderaRisk?{riskKontroll:risk,riskNoteringar:riskN,egenRisker:egna,ansvariga}:{})}); setSparar(false) }
  const totalSteg = inkluderaRisk ? 3 : 2
  // inkluderaRisk=true : steg 1=Risk, 2=Protokoll, 3=Signatur
  // inkluderaRisk=false: steg 1=Protokoll, 2=Signatur
  const STEG_LBL = inkluderaRisk ? ['','Riskbedömning','Serviceprotokoll','Signatur'] : ['','Serviceprotokoll','Signatur']
  const STEG_SUB = inkluderaRisk ? ['','Före arbete','Under/efter service','Avsluta']  : ['','Under/efter service','Avsluta']
  const visaRisk      = inkluderaRisk && steg===1
  const visaProtokoll = inkluderaRisk ? steg===2 : steg===1
  const visaSignatur  = inkluderaRisk ? steg===3 : steg===2
  let nr=0
  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
        <button className="btn" onClick={steg===1?onBack:()=>setSteg(s=>s-1)} style={{padding:'8px 12px',display:'flex',alignItems:'center',gap:5}}><ChevronLeft size={16}/>{steg===1?'Avbryt':'Tillbaka'}</button>
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:600}}>{STEG_LBL[steg]}</div>
          <div style={{fontSize:12,color:'var(--c-text2)'}}>Steg {steg}/{totalSteg} · {STEG_SUB[steg]}</div>
        </div>
      </div>
      <div style={{display:'flex',gap:4,marginBottom:16}}>{Array.from({length:totalSteg},(_,i)=><div key={i} style={{flex:1,height:5,borderRadius:3,background:(i+1)<=steg?'var(--c-blue)':'var(--c-border)',transition:'background 0.2s'}}/>)}</div>

      {/* Steg 1: Riskbedömning (valfritt) */}
      {visaRisk&&(<div>
        <div style={{background:'var(--c-amber-bg,#fffbeb)',border:'1px solid var(--c-amber)',borderRadius:10,padding:'10px 14px',marginBottom:14,display:'flex',gap:8,alignItems:'center'}}>
          <span style={{fontSize:16}}>⚠️</span>
          <span style={{fontSize:13,color:'var(--c-amber-text,#92400e)',fontWeight:500}}>Utför riskbedömningen innan arbetet påbörjas</span>
        </div>
        <AnsvarigaPanel ansvariga={ansvariga} tekniker={tekLista} onChange={setAnsvariga}/>
        {RISKPUNKTER.map((p,i)=>{ const s=risk[i]; return(<div key={i} className="card" style={{marginBottom:8,padding:'12px 14px'}}>
          <div style={{fontSize:13,marginBottom:10,lineHeight:1.5}}><span style={{color:'var(--c-text3)',marginRight:6}}>{i+1}.</span>{p}</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6}}>
            {RISK_STATUS.map(({id,label,bg,txt,border})=>(
              <button key={id} onClick={()=>setRisk(prev=>({...prev,[i]:s===id?undefined:id}))} style={{padding:'11px 4px',borderRadius:8,fontSize:11,fontWeight:600,cursor:'pointer',border:`2px solid ${s===id?border:'var(--c-border)'}`,background:s===id?bg:'transparent',color:s===id?txt:'var(--c-text3)'}}>{label}</button>
            ))}
          </div>
          {s==='atgard'&&<input type="text" placeholder="Beskriv åtgärd…" value={riskN[i]||''} onChange={e=>setRiskN(prev=>({...prev,[i]:e.target.value}))} style={{marginTop:8,width:'100%',padding:'8px 10px',fontSize:13,border:'1px solid var(--c-border)',borderRadius:8,background:'var(--c-bg)',color:'var(--c-text)',boxSizing:'border-box'}}/>}
        </div>)})}
        <div style={{fontSize:12,fontWeight:700,color:'var(--c-text2)',textTransform:'uppercase',letterSpacing:'0.07em',margin:'12px 0 8px'}}>Egna riskpunkter</div>
        <EgnaRiskerPanel egna={egna} onChange={setEgna}/>
        <div style={{display:'flex',gap:8,marginBottom:80,marginTop:12}}>
          <button onClick={async()=>{
            const logo64=await hämtaLogoBase64()
            öppnaPrintFönster(pdfRiskBedömning({
              kund:port?.kund||'',portNamn:port?.namn||'',portTyp:port?.typ||'',
              tekniker:ansvariga.map(a=>a.namn).join(', ')||namn,datum:idag(),
              riskKontroll:risk,riskNoteringar:riskN,
              egenRisker:egna,ansvariga,
            },logo64),'Riskbedömning')
          }} style={{padding:'14px 16px',borderRadius:12,background:'var(--c-surface)',color:'var(--c-text)',border:'1.5px solid var(--c-border)',fontSize:14,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:7}}>
            <Printer size={16}/> Skriv ut
          </button>
          <button onClick={()=>setSteg(s=>s+1)} style={{flex:1,padding:16,borderRadius:12,background:'var(--c-blue)',color:'#fff',border:'none',fontSize:15,fontWeight:700,cursor:'pointer'}}>Nästa: Serviceprotokoll →</button>
        </div>
      </div>)}

      {/* Protokollpunkter */}
      {visaProtokoll&&(<div>
        <div style={{background:'var(--c-blue-bg,#eff6ff)',border:'1px solid var(--c-blue)',borderRadius:10,padding:'10px 14px',marginBottom:12,display:'flex',gap:8,alignItems:'center'}}>
          <span style={{fontSize:16}}>📋</span>
          <span style={{fontSize:13,color:'var(--c-blue)',fontWeight:500}}>{port?.namn} · {port?.typ}</span>
        </div>
        <div className="card" style={{marginBottom:12,padding:'12px 16px'}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:12}}>
            <span style={{color:'var(--c-text2)'}}>{ifyllda}/{total} ifyllda</span>
            <span>{g>0&&<span style={{color:'var(--c-teal)',fontWeight:600}}>✓{g} </span>}{j>0&&<span style={{color:'var(--c-amber)',fontWeight:600}}>⚠{j} </span>}{a>0&&<span style={{color:'var(--c-red)',fontWeight:600}}>✗{a}</span>}</span>
          </div>
          <div className="progress-bar" style={{height:6,marginBottom:10}}><div className="progress-fill" style={{width:`${pct}%`,background:a>0?'var(--c-red)':j>0?'var(--c-amber)':'var(--c-teal)'}}/></div>
          <button onClick={godkannAlla} style={{width:'100%',padding:10,borderRadius:8,background:'var(--c-teal-bg)',color:'var(--c-teal-text)',border:'1px solid var(--c-teal)',fontSize:13,fontWeight:600,cursor:'pointer'}}>✓ Godkänn alla</button>
        </div>
        {punkter.map((p,i)=>{
          if(String(p).startsWith('## '))return(<div key={i} style={{padding:'8px 14px',background:'var(--c-bg)',borderRadius:8,margin:'12px 0 6px',borderLeft:'3px solid var(--c-blue)'}}><span style={{fontSize:11,fontWeight:700,color:'var(--c-blue)',textTransform:'uppercase',letterSpacing:'0.07em'}}>{String(p).slice(3)}</span></div>)
          nr++; const s=statuses[i]||''
          return(<div key={i} className="card" style={{marginBottom:8,padding:'12px 14px'}}>
            <div style={{fontSize:13,marginBottom:10,lineHeight:1.4}}><span style={{color:'var(--c-text3)',marginRight:6,fontSize:11}}>{nr}.</span>{p}</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6}}>
              {PROT_STATUSES.map(({kod,label,bg,txt,border})=>(
                <button key={kod} onClick={()=>setSt(prev=>({...prev,[i]:s===kod?undefined:kod}))}
                  style={{padding:'13px 4px',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',border:`2px solid ${s===kod?border:'var(--c-border)'}`,background:s===kod?bg:'transparent',color:s===kod?txt:'var(--c-text3)'}}>
                  {label}
                </button>
              ))}
            </div>
            {(s==='J'||s==='A')&&<input type="text" placeholder="Notering…" value={noter[i]||''} onChange={e=>setNot(prev=>({...prev,[i]:e.target.value}))} style={{marginTop:8,width:'100%',padding:'8px 10px',fontSize:13,border:'1px solid var(--c-border)',borderRadius:8,background:'var(--c-bg)',color:'var(--c-text)',boxSizing:'border-box'}}/>}
          </div>)
        })}
        <button onClick={()=>setSteg(s=>s+1)} disabled={ifyllda===0} style={{width:'100%',padding:16,borderRadius:12,background:ifyllda===0?'var(--c-border)':'var(--c-blue)',color:ifyllda===0?'var(--c-text3)':'#fff',border:'none',fontSize:15,fontWeight:700,cursor:ifyllda===0?'not-allowed':'pointer',marginBottom:80}}>Nästa: Signatur →</button>
      </div>)}

      {/* Signatur */}
      {visaSignatur&&(<div>
        <div className="card" style={{marginBottom:80}}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:10}}>Signatur tekniker</div>
          <SignaturPad onChange={setSig}/>
          <button onClick={slutfor} disabled={sparar} style={{width:'100%',padding:16,marginTop:14,borderRadius:10,background:'var(--c-teal)',color:'#fff',border:'none',fontSize:15,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
            <CheckCircle size={18}/> {sparar?'Sparar…':'Slutför serviceprotokoll'}
          </button>
        </div>
      </div>)}
    </div>
  )
}

// ── ServiceorderDetalj ────────────────────────────────────────────────────────
function ServiceorderDetalj({ order, objekt, namn, tekniker: tekLista = [], onUppdatera, onUppdateraObjekt, onBack }) {
  const [vy,setVy]=useState('info')
  const [inkluderaRisk,setInkluderaRisk]=useState(false)
  const [redigerar,setRedigerar]=useState(false)
  const [editForm,setEditForm]=useState({})
  const [sparar2,setSparar2]=useState(false)
  const [portFiler,setPortFiler]=useState([])
  const [visaFiler,setVisaFiler]=useState(false)
  const port=(order.objekt_ids||[]).map(id=>objekt.find(o=>o.id===id)).filter(Boolean)[0]||null
  useEffect(()=>{
    if(!port?.id) return
    supabase.from('port_filer').select('*').eq('objekt_id',port.id)
      .order('created_at',{ascending:false})
      .then(({data})=>{ if(data) setPortFiler(data) })
  },[port?.id])
  const startRedigera=()=>{setEditForm({datum:order.datum||'',tekniker:order.tekniker||'',notering:order.notering||''});setRedigerar(true)}
  const sparaRedigering=async()=>{setSparar2(true);await onUppdatera(order.id,editForm);setSparar2(false);setRedigerar(false)}
  const hanteraSlutfort=async(prot)=>{
    const now=idag()
    await onUppdatera(order.id,{status:'avslutad',protokoll:prot})
    if(port){
      const nyHist=[...(port.historik||[]),{typ:'service',datum:now,tekniker:namn,portNamn:port.namn,portTyp:port.typ,statuses:prot.statuses,noteringar:prot.noteringar,signatur:prot.signatur,g:prot.g,j:prot.j,a:prot.a}]
      const nasta=port.serviceIntervall>0?(()=>{const d=new Date();d.setMonth(d.getMonth()+(port.serviceIntervall||12));return d.toISOString().slice(0,10)})():(port.nasta||'')
      await onUppdateraObjekt(port.id,{historik:nyHist,senaste:now,nasta})
    }
    setVy('klar')
  }
  if(vy==='protokoll')return(<ServiceProtokollFormular port={port} namn={namn} tekniker={tekLista} inkluderaRisk={inkluderaRisk} onSlutfor={hanteraSlutfort} onBack={()=>setVy('info')}/>)
  if(vy==='klar')return(<div style={{textAlign:'center',padding:'48px 20px'}}><CheckCircle size={56} color="var(--c-teal)" style={{margin:'0 auto 16px',display:'block'}}/><div style={{fontSize:18,fontWeight:700,color:'var(--c-teal-text)',marginBottom:8}}>Serviceorder klar!</div><div style={{fontSize:14,color:'var(--c-text2)',marginBottom:24}}>{port?.namn} · {idag()}</div><button className="btn btn-primary" onClick={onBack} style={{width:'100%',padding:14,fontSize:15}}>← Tillbaka</button></div>)
  return(
    <div>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
        <button className="btn" onClick={onBack} style={{padding:'8px 12px',display:'flex',alignItems:'center',gap:5}}><ChevronLeft size={16}/> Tillbaka</button>
        <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600}}>Serviceorder #{order.nr||'–'}</div><div style={{fontSize:12,color:'var(--c-text2)'}}>{order.kund}</div></div>
        <span className={`badge ${order.status==='planerad'?'badge-blue':order.status==='avslutad'?'badge-teal':'badge-amber'}`}>{order.status==='planerad'?'Planerad':order.status==='avslutad'?'Avslutad':'Pågår'}</span>
      </div>
      <div className="card" style={{marginBottom:12}}>
        {[['Datum',order.datum],['Kund',order.kund],port&&['Port',port.namn],port&&['Porttyp',port.typ],port&&['Adress',port.adress||port.plats],order.notering&&['Notering',order.notering]].filter(Boolean).map(([l,v])=>v&&(
          <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid var(--c-border)',fontSize:13}}>
            <span style={{color:'var(--c-text2)'}}>{l}</span><span style={{fontWeight:500,textAlign:'right',maxWidth:'60%'}}>{v}</span>
          </div>
        ))}
        {/* Garanti & CE */}
        {port && (() => {
          const garanti = garantiStatusTek(port.installationsdatum, port.garanti_ar)
          const ce = port.ce_status
          return (
            <>
              {garanti && (
                <div style={{display:'flex',alignItems:'center',gap:8,padding:'7px 0',borderBottom:'1px solid var(--c-border)',fontSize:12}}>
                  <span style={{color:'var(--c-text2)',flex:1}}>Garanti</span>
                  <span style={{fontWeight:600, color: garanti.giltig ? 'var(--c-teal)' : 'var(--c-red)', display:'flex',alignItems:'center',gap:4}}>
                    {garanti.giltig ? <ShieldCheck size={12}/> : <ShieldAlert size={12}/>}
                    {garanti.giltig ? `Giltig (${garanti.dagar}d kvar)` : `Utgången (${Math.abs(garanti.dagar)}d sedan)`}
                  </span>
                </div>
              )}
              {ce && ce !== 'ej_kontrollerad' && (
                <div style={{display:'flex',alignItems:'center',gap:8,padding:'7px 0',borderBottom:'1px solid var(--c-border)',fontSize:12}}>
                  <span style={{color:'var(--c-text2)',flex:1}}>CE-status</span>
                  <span style={{fontWeight:600, color: ce === 'godkand' ? 'var(--c-teal)' : 'var(--c-red)', display:'flex',alignItems:'center',gap:4}}>
                    {ce === 'godkand' ? <ShieldCheck size={12}/> : <ShieldAlert size={12}/>}
                    {ce === 'godkand' ? 'CE-godkänd' : 'CE-avvikelse'}
                    {port.ce_notering ? ` · ${port.ce_notering}` : ''}
                  </span>
                </div>
              )}
            </>
          )
        })()}
        {order.status!=='avslutad'&&!redigerar&&(
          <button onClick={startRedigera} style={{display:'flex',alignItems:'center',gap:5,marginTop:10,padding:'6px 12px',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',border:'1.5px solid var(--c-border)',background:'transparent',color:'var(--c-text2)'}}>
            <Pencil size={12}/> Redigera
          </button>
        )}
      </div>
      {redigerar&&(
        <div className="card" style={{marginBottom:12}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:10,color:'var(--c-text)'}}>Redigera orderuppgifter</div>
          <label style={{fontSize:12,color:'var(--c-text2)',marginBottom:4,display:'block'}}>Datum</label>
          <input type="date" value={editForm.datum} onChange={e=>setEditForm(p=>({...p,datum:e.target.value}))} style={{...INP,colorScheme:'light',marginBottom:8}}/>
          <label style={{fontSize:12,color:'var(--c-text2)',marginBottom:4,display:'block'}}>Tilldelad tekniker</label>
          <select value={editForm.tekniker} onChange={e=>setEditForm(p=>({...p,tekniker:e.target.value}))} style={{...INP,marginBottom:8}}>
            <option value="">Ej utsedd tekniker</option>
            {tekLista.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
          <label style={{fontSize:12,color:'var(--c-text2)',marginBottom:4,display:'block'}}>Notering</label>
          <textarea value={editForm.notering} onChange={e=>setEditForm(p=>({...p,notering:e.target.value}))} rows={2} placeholder="Notering…" style={{...INP,resize:'vertical',marginBottom:10}}/>
          <div style={{display:'flex',gap:8}}>
            <button onClick={sparaRedigering} disabled={sparar2} style={{flex:1,padding:11,borderRadius:9,background:'var(--c-blue)',color:'#fff',border:'none',fontSize:13,fontWeight:600,cursor:'pointer'}}>
              {sparar2?'Sparar…':'Spara ändringar'}
            </button>
            <button onClick={()=>setRedigerar(false)} style={{padding:'11px 14px',borderRadius:9,background:'transparent',color:'var(--c-text3)',border:'1px solid var(--c-border)',fontSize:13,cursor:'pointer'}}>Avbryt</button>
          </div>
        </div>
      )}
      {/* Skriv ut serviceprotokoll – visas om protokoll finns */}
      {order.status==='avslutad'&&order.protokoll?.statuses&&(
        <button onClick={async()=>{
          const logo64=await hämtaLogoBase64()
          const punkter=protokollPunkter[port?.typ||order.protokoll?.portTyp]||[]
          öppnaPrintFönster(pdfServiceProt(order,port?.namn,port?.typ,punkter,logo64),`Serviceprotokoll ${order.nr||''}`)
        }} style={{width:'100%',marginBottom:10,padding:'12px 16px',borderRadius:10,background:'var(--c-teal-bg)',color:'var(--c-teal-text)',border:'1.5px solid var(--c-teal)',fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
          <Printer size={15}/> Skriv ut serviceprotokoll
        </button>
      )}
      {/* Skriv ut riskbedömning – visas om sparad riskdata finns */}
      {order.protokoll?.riskKontroll&&Object.keys(order.protokoll.riskKontroll).length>0&&(
        <button onClick={async()=>{
          const logo64=await hämtaLogoBase64()
          öppnaPrintFönster(pdfRiskBedömning({
            kund:order.kund,portNamn:port?.namn||'',portTyp:port?.typ||'',
            tekniker:order.protokoll?.tekniker||namn,
            datum:order.protokoll?.datum||order.datum||'',
            ordernummer:order.nr||'',
            riskKontroll:order.protokoll.riskKontroll,
            riskNoteringar:order.protokoll.riskNoteringar||{},
            egenRisker:order.protokoll.egenRisker||[],
            ansvariga:order.protokoll.ansvariga||[],
          },logo64),'Riskbedömning')
        }} style={{width:'100%',marginBottom:10,padding:'12px 16px',borderRadius:10,background:'var(--c-surface)',color:'var(--c-text)',border:'1.5px solid var(--c-border)',fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
          <Printer size={15}/> Skriv ut riskbedömning
        </button>
      )}

      {port&&(port.historik||[]).filter(h=>h.typ!=='montering').slice(-2).reverse().map((h,i)=>(
        <div key={i} className="card" style={{marginBottom:8,padding:'10px 14px',background:'var(--c-bg)',fontSize:12}}>
          <div style={{color:'var(--c-text3)',marginBottom:2}}>Tidigare service</div>
          <div style={{fontWeight:500}}>{h.datum} · {h.tekniker||'–'}</div>
          <div style={{marginTop:2}}><span style={{color:'var(--c-teal)'}}>✓{h.g||0} </span>{(h.j||0)>0&&<span style={{color:'var(--c-amber)'}}>⚠{h.j} </span>}{(h.a||0)>0&&<span style={{color:'var(--c-red)'}}>✗{h.a}</span>}</div>
        </div>
      ))}

      {/* Filer & dokument */}
      {port && (
        <div className="card" style={{marginBottom:12}}>
          <button onClick={()=>setVisaFiler(v=>!v)}
            style={{width:'100%',display:'flex',alignItems:'center',gap:8,background:'none',border:'none',cursor:'pointer',padding:0,marginBottom:visaFiler?10:0}}>
            <Paperclip size={14} color="var(--c-text3)"/>
            <span style={{fontSize:13,fontWeight:600,flex:1,textAlign:'left',color:'var(--c-text)'}}>
              Filer &amp; dokument
            </span>
            <span style={{fontSize:11,color:'var(--c-text3)'}}>
              {portFiler.length > 0 ? `${portFiler.length} fil${portFiler.length>1?'er':''}` : 'Inga filer'}
            </span>
            <ChevronDown size={14} color="var(--c-text3)" style={{transform:visaFiler?'rotate(180deg)':'none',transition:'transform 0.2s'}}/>
          </button>
          {visaFiler && (
            <FilUppladdning
              objektId={port.id}
              initialFiler={portFiler}
              onFilerUppdaterade={setPortFiler}
            />
          )}
        </div>
      )}

      {order.status!=='avslutad'&&(
        <div style={{marginBottom:80}}>
          {/* Valfri riskbedömning – samma mönster som felanmälan */}
          <button onClick={()=>setInkluderaRisk(v=>!v)}
            style={{width:'100%',padding:'10px 14px',borderRadius:9,fontSize:13,fontWeight:600,cursor:'pointer',marginBottom:10,
              border:`1.5px solid ${inkluderaRisk?'#16a34a':'var(--c-border)'}`,
              background:inkluderaRisk?'#f0fdf4':'transparent',
              color:inkluderaRisk?'#166534':'var(--c-text2)',
              display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span>🛡️ Inkludera riskbedömning {inkluderaRisk?'(ingår)':'(valfritt)'}</span>
            <span style={{fontSize:11,padding:'2px 8px',borderRadius:6,background:inkluderaRisk?'#dcfce7':'var(--c-bg)',border:'1px solid currentColor'}}>{inkluderaRisk?'PÅ':'AV'}</span>
          </button>
          <button onClick={()=>port?setVy('protokoll'):alert('Ingen port kopplad.')} style={{width:'100%',padding:16,borderRadius:12,background:'var(--c-blue)',color:'#fff',border:'none',fontSize:15,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
            <FileText size={18}/> Starta serviceprotokoll
          </button>
        </div>
      )}
    </div>
  )
}

// ── AnsvarigaPanel (mobil) ────────────────────────────────────────────────────
function AnsvarigaPanel({ ansvariga=[], tekniker=[], onChange }) {
  const [nyNamn, setNyNamn] = useState('')
  const [nyRoll, setNyRoll] = useState('')
  const laggTill = (namn, roll='') => {
    const n = namn.trim(); if (!n || ansvariga.some(a=>a.namn===n)) return
    onChange([...ansvariga, {id:'a'+Date.now(), namn:n, roll:roll.trim()}])
    setNyNamn(''); setNyRoll('')
  }
  const taBort = id => onChange(ansvariga.filter(a=>a.id!==id))
  const internaKvar = tekniker.filter(t=>!ansvariga.some(a=>a.namn===t))
  return (
    <div className="card" style={{marginBottom:12,padding:'12px 14px'}}>
      <div style={{fontSize:12,fontWeight:700,color:'var(--c-text2)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:10}}>Ansvariga / personal</div>
      {ansvariga.length>0&&(
        <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:10}}>
          {ansvariga.map(a=>(
            <span key={a.id} style={{display:'inline-flex',alignItems:'center',gap:5,padding:'3px 10px',borderRadius:20,background:'var(--c-blue-bg)',border:'1px solid var(--c-blue)',fontSize:12,color:'var(--c-text)'}}>
              <span style={{fontWeight:500}}>{a.namn}</span>
              {a.roll&&<span style={{color:'var(--c-text3)',fontSize:11}}>{a.roll}</span>}
              <button onClick={()=>taBort(a.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--c-text3)',padding:'0 0 0 2px',lineHeight:1,fontSize:15}}>×</button>
            </span>
          ))}
        </div>
      )}
      {internaKvar.length>0&&(
        <div style={{marginBottom:10}}>
          <div style={{fontSize:11,color:'var(--c-text3)',marginBottom:5}}>Lägg till intern personal</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
            {internaKvar.map(t=>(
              <button key={t} onClick={()=>laggTill(t)} style={{padding:'4px 12px',borderRadius:15,fontSize:12,border:'1px dashed var(--c-border)',background:'transparent',color:'var(--c-text2)',cursor:'pointer'}}>{t}</button>
            ))}
          </div>
        </div>
      )}
      <div style={{display:'flex',flexDirection:'column',gap:6}}>
        <input value={nyNamn} onChange={e=>setNyNamn(e.target.value)} placeholder="Extern: Förnamn Efternamn" onKeyDown={e=>e.key==='Enter'&&laggTill(nyNamn,nyRoll)}
          style={{width:'100%',padding:'8px 10px',fontSize:13,border:'1px solid var(--c-border)',borderRadius:8,background:'var(--c-bg)',color:'var(--c-text)',boxSizing:'border-box'}}/>
        <input value={nyRoll} onChange={e=>setNyRoll(e.target.value)} placeholder="Företag / roll (valfritt)" onKeyDown={e=>e.key==='Enter'&&laggTill(nyNamn,nyRoll)}
          style={{width:'100%',padding:'8px 10px',fontSize:13,border:'1px solid var(--c-border)',borderRadius:8,background:'var(--c-bg)',color:'var(--c-text)',boxSizing:'border-box'}}/>
        <button onClick={()=>laggTill(nyNamn,nyRoll)} disabled={!nyNamn.trim()} style={{padding:'8px 14px',background:nyNamn.trim()?'var(--c-teal)':'var(--c-border)',color:nyNamn.trim()?'#fff':'var(--c-text3)',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:nyNamn.trim()?'pointer':'default'}}>+ Lägg till extern</button>
      </div>
    </div>
  )
}

// ── EgnaRiskerPanel (mobil) ───────────────────────────────────────────────────
function EgnaRiskerPanel({ egna=[], onChange }) {
  const laggTill = () => onChange([...egna, {id:'e'+Date.now(),label:'',beskrivning:'',status:null,åtgärd:''}])
  const upd = (id,fält,val) => onChange(egna.map(r=>r.id===id?{...r,[fält]:val}:r))
  const taBort = id => onChange(egna.filter(r=>r.id!==id))
  return (
    <div style={{marginBottom:12}}>
      {egna.map(r=>(
        <div key={r.id} className="card" style={{marginBottom:8,padding:'12px 14px',position:'relative'}}>
          <button onClick={()=>taBort(r.id)} style={{position:'absolute',top:8,right:8,background:'none',border:'none',cursor:'pointer',color:'var(--c-text3)',fontSize:18,lineHeight:1}}>×</button>
          <input value={r.label} onChange={e=>upd(r.id,'label',e.target.value)} placeholder="Kontrollpunkt / risk *"
            style={{width:'100%',padding:'8px 10px',fontSize:13,border:'1px solid var(--c-border)',borderRadius:8,background:'var(--c-bg)',color:'var(--c-text)',boxSizing:'border-box',marginBottom:6}}/>
          <input value={r.beskrivning||''} onChange={e=>upd(r.id,'beskrivning',e.target.value)} placeholder="Beskrivning (valfritt)"
            style={{width:'100%',padding:'8px 10px',fontSize:12,border:'1px solid var(--c-border)',borderRadius:8,background:'var(--c-bg)',color:'var(--c-text)',boxSizing:'border-box',marginBottom:8}}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,marginBottom:6}}>
            {RISK_STATUS.map(({id,label,bg,txt,border})=>{
              const aktiv=r.status===id
              return <button key={id} onClick={()=>upd(r.id,'status',aktiv?null:id)} style={{padding:'9px 4px',borderRadius:8,fontSize:11,fontWeight:600,cursor:'pointer',border:`2px solid ${aktiv?border:'var(--c-border)'}`,background:aktiv?bg:'transparent',color:aktiv?txt:'var(--c-text3)'}}>{label}</button>
            })}
          </div>
          {r.status==='atgard'&&<input value={r.åtgärd||''} onChange={e=>upd(r.id,'åtgärd',e.target.value)} placeholder="Beskriv åtgärd…"
            style={{width:'100%',padding:'8px 10px',fontSize:12,border:'1px solid var(--c-border)',borderRadius:8,background:'var(--c-bg)',color:'var(--c-text)',boxSizing:'border-box'}}/>}
        </div>
      ))}
      <button onClick={laggTill} style={{width:'100%',padding:'10px 14px',borderRadius:9,border:'1.5px dashed var(--c-border)',background:'transparent',color:'var(--c-text2)',fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
        <Plus size={14}/> Lägg till egen risk
      </button>
    </div>
  )
}

// ── MontageRiskFormular (separat riskbedömning – besök 1) ────────────────────
function MontageRiskFormular({ order, namn, tekniker: tekLista=[], onSpara, onBack, riskpunkter = RISKPUNKTER }) {
  const [risk,setRisk]=useState({}); const [riskN,setRiskN]=useState({})
  const [ansvariga,setAnsvariga]=useState(namn?[{id:'a0',namn,roll:''}]:[])
  const [egna,setEgna]=useState([])
  const [sparar,setSparar]=useState(false)
  const [sparad,setSparad]=useState(false)

  const spara=async()=>{
    setSparar(true)
    await onSpara({riskKontroll:risk,riskNoteringar:riskN,egenRisker:egna,ansvariga})
    setSparar(false)
    setSparad(true)
  }

  const skrivUtRisk = async () => {
    const logo64 = await hämtaLogoBase64()
    const html = pdfMontageProt({
      portTyp: order.porttyp || order.portTyp || 'Vikport',
      kund: order.kund, adress: order.adress || order.montageplats || '',
      datum: idag(), tekniker: namn,
      riskKontroll: risk, riskNoteringar: riskN,
      egenRisker: [], egenkontroll: {}, egenNoteringar: {},
      ordernummer: order.nr || order.ordernummer || null,
    }, logo64, {}, riskpunkter)
    const win = window.open('', '_blank', 'width=860,height=1100')
    win.document.write(html); win.document.close()
    setTimeout(() => win.print(), 400)
  }

  return(
    <div>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
        <button className="btn" onClick={onBack} style={{padding:'8px 12px',display:'flex',alignItems:'center',gap:5}}><ChevronLeft size={16}/> Avbryt</button>
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:600}}>Riskbedömning – Besök 1</div>
          <div style={{fontSize:12,color:'var(--c-text2)'}}>{order.kund} · Fyll i innan arbetet påbörjas</div>
        </div>
      </div>
      <div style={{background:'var(--c-amber-bg,#fffbeb)',border:'1px solid var(--c-amber)',borderRadius:10,padding:'10px 14px',marginBottom:14,display:'flex',gap:8,alignItems:'center'}}>
        <span style={{fontSize:16}}>⚠️</span>
        <span style={{fontSize:13,color:'var(--c-amber-text,#92400e)',fontWeight:500}}>Utför riskbedömningen innan arbetet påbörjas. Sparas och kan sedan återupptas.</span>
      </div>
      <AnsvarigaPanel ansvariga={ansvariga} tekniker={tekLista} onChange={setAnsvariga}/>
      {riskpunkter.map((p,i)=>{
        if(p.startsWith('## ')) return(
          <div key={i} style={{margin:'10px 0 4px',padding:'6px 10px',background:'var(--c-bg)',borderRadius:6,borderLeft:'3px solid var(--c-amber)'}}>
            <span style={{fontSize:11,fontWeight:700,color:'var(--c-amber-text)',textTransform:'uppercase',letterSpacing:'0.06em'}}>{p.slice(3)}</span>
          </div>
        )
        const s=risk[i]; return(
        <div key={i} className="card" style={{marginBottom:8,padding:'12px 14px'}}>
          <div style={{fontSize:13,marginBottom:10,lineHeight:1.5}}><span style={{color:'var(--c-text3)',marginRight:6}}>{i+1}.</span>{p}</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6}}>
            {RISK_STATUS.map(({id,label,bg,txt,border})=>(
              <button key={id} onClick={()=>setRisk(prev=>({...prev,[i]:s===id?undefined:id}))} style={{padding:'11px 4px',borderRadius:8,fontSize:11,fontWeight:600,cursor:'pointer',border:`2px solid ${s===id?border:'var(--c-border)'}`,background:s===id?bg:'transparent',color:s===id?txt:'var(--c-text3)'}}>{label}</button>
            ))}
          </div>
          {s==='atgard'&&<input type="text" placeholder="Beskriv åtgärd…" value={riskN[i]||''} onChange={e=>setRiskN(prev=>({...prev,[i]:e.target.value}))} style={{marginTop:8,width:'100%',padding:'8px 10px',fontSize:13,border:'1px solid var(--c-border)',borderRadius:8,background:'var(--c-bg)',color:'var(--c-text)',boxSizing:'border-box'}}/>}
        </div>
      )})}

      {sparad ? (
        <div style={{marginBottom:80}}>
          <div style={{padding:'12px 16px',background:'#f0fdf4',border:'1px solid #86efac',borderRadius:10,marginBottom:12,display:'flex',alignItems:'center',gap:10}}>
            <CheckCircle size={18} color="#16a34a"/>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:'#166534'}}>Riskbedömning sparad!</div>
              <div style={{fontSize:12,color:'#15803d'}}>Du kan nu fortsätta med egenkontroll vid besök 2.</div>
            </div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={skrivUtRisk} style={{flex:1,padding:'13px 0',borderRadius:12,background:'var(--c-surface)',color:'var(--c-text)',border:'1.5px solid var(--c-border)',fontSize:14,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
              <Printer size={16}/> Skriv ut riskbedömning
            </button>
            <button onClick={onBack} style={{flex:1,padding:'13px 0',borderRadius:12,background:'var(--c-blue)',color:'#fff',border:'none',fontSize:14,fontWeight:700,cursor:'pointer'}}>
              Tillbaka
            </button>
          </div>
        </div>
      ) : (
        <div style={{marginBottom:80}}>
          <div style={{margin:'16px 0 8px',fontSize:12,fontWeight:700,color:'var(--c-text2)',textTransform:'uppercase',letterSpacing:'0.07em'}}>Egna riskpunkter</div>
          <EgnaRiskerPanel egna={egna} onChange={setEgna}/>
          <button onClick={spara} disabled={sparar} style={{width:'100%',padding:16,borderRadius:12,background:'var(--c-teal)',color:'#fff',border:'none',fontSize:15,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginTop:12}}>
            <CheckCircle size={18}/> {sparar?'Sparar…':'Spara riskbedömning'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── MontageFormular (3 steg: Egenkontroll → Portuppgifter → Signatur) ─────────
function MontageFormular({ order, namn, onSlutfor, onBack }) {
  const porttyp=order.porttyp||order.portTyp||'Vikport'
  const egP=EGENKONTROLL[porttyp]||EGENKONTROLL['Vikport']||[]
  const [steg,setSteg]=useState(1)
  const [eg,setEg]=useState({}); const [egN,setEgN]=useState({})
  const initFab = FASTA_FABRIKAT.includes(order.fabrikat||'') ? (order.fabrikat||'') : (order.fabrikat ? 'Annat' : '')
  const [fabrikat,setFabrikat]=useState(initFab)
  const [annatFabrikat,setAnnatFabrikat]=useState(!FASTA_FABRIKAT.includes(order.fabrikat||'') ? (order.fabrikat||'') : '')
  const [serienr,setSerienr]=useState(order.serienummer||'')
  const [ordernr,setOrdernr]=useState(order.ordernummer||order.nr||'')
  const [sig,setSig]=useState(null); const [sigKund,setSigKund]=useState(null); const [godk,setGodk]=useState('godkand')
  const [sparar,setSparar]=useState(false)
  const fabrikVal = fabrikat==='Annat' ? annatFabrikat : fabrikat
  const slutfor=async()=>{
    setSparar(true)
    await onSlutfor({
      datum:idag(),tekniker:namn,portTyp:porttyp,kund:order.kund,adress:order.adress||'',
      egenkontroll:eg,egenNoteringar:egN,egenRisker:[],
      signatur:sig,signaturKund:sigKund,godkannande:godk,
      ok:Object.values(eg).filter(s=>s==='OK').length,
      ej:Object.values(eg).filter(s=>s==='EJ').length,
      na:Object.values(eg).filter(s=>s==='NA').length,
      // Portuppgifter – används vid auto-skapande i registret
      portFabrikat:fabrikVal, portSerienr:serienr, portOrdernr:ordernr,
    })
    setSparar(false)
  }
  const STEG_LBL=['','Egenkontroll','Portuppgifter','Signatur']
  const STEG_SUB=['','Efter montage','Registrering','Avsluta']
  return(
    <div>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
        <button className="btn" onClick={steg===1?onBack:()=>setSteg(s=>s-1)} style={{padding:'8px 12px',display:'flex',alignItems:'center',gap:5}}><ChevronLeft size={16}/>{steg===1?'Avbryt':'Tillbaka'}</button>
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:600}}>{STEG_LBL[steg]}</div>
          <div style={{fontSize:12,color:'var(--c-text2)'}}>Steg {steg}/3 · {STEG_SUB[steg]}</div>
        </div>
      </div>
      <div style={{display:'flex',gap:4,marginBottom:16}}>{[1,2,3].map(s=><div key={s} style={{flex:1,height:5,borderRadius:3,background:s<=steg?'var(--c-blue)':'var(--c-border)',transition:'background 0.2s'}}/>)}</div>

      {/* Steg 1: Egenkontroll */}
      {steg===1&&(<div>
        <div style={{background:'var(--c-blue-bg,#eff6ff)',border:'1px solid var(--c-blue)',borderRadius:10,padding:'10px 14px',marginBottom:14,display:'flex',gap:8,alignItems:'center'}}>
          <span style={{fontSize:16}}>✅</span>
          <span style={{fontSize:13,color:'var(--c-blue)',fontWeight:500}}>Egenkontroll efter genomfört montage</span>
        </div>
        {egP.map((p,i)=>{ const s=eg[i]; return(<div key={i} className="card" style={{marginBottom:8,padding:'12px 14px'}}>
          <div style={{fontSize:13,marginBottom:10,lineHeight:1.4}}><span style={{color:'var(--c-text3)',marginRight:6}}>{i+1}.</span>{p}</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6}}>
            {[{id:'OK',label:'✓ OK',bg:'var(--c-teal-bg)',txt:'var(--c-teal-text)',border:'var(--c-teal)'},{id:'EJ',label:'✗ Avvikelse',bg:'var(--c-red-bg)',txt:'var(--c-red-text)',border:'var(--c-red)'},{id:'NA',label:'– Ej tillämp',bg:'#f0eeeb',txt:'#666',border:'#ccc'}].map(({id,label,bg,txt,border})=>(
              <button key={id} onClick={()=>setEg(prev=>({...prev,[i]:s===id?undefined:id}))} style={{padding:'11px 4px',borderRadius:8,fontSize:11,fontWeight:600,cursor:'pointer',border:`2px solid ${s===id?border:'var(--c-border)'}`,background:s===id?bg:'transparent',color:s===id?txt:'var(--c-text3)'}}>{label}</button>
            ))}
          </div>
          {s==='EJ'&&<input type="text" placeholder="Beskriv avvikelsen…" value={egN[i]||''} onChange={e=>setEgN(prev=>({...prev,[i]:e.target.value}))} style={{marginTop:8,width:'100%',padding:'8px 10px',fontSize:13,border:'1px solid var(--c-border)',borderRadius:8,background:'var(--c-bg)',color:'var(--c-text)',boxSizing:'border-box'}}/>}
        </div>)})}
        <button onClick={()=>setSteg(2)} style={{width:'100%',padding:16,borderRadius:12,background:'var(--c-blue)',color:'#fff',border:'none',fontSize:15,fontWeight:700,cursor:'pointer',marginBottom:80}}>Nästa: Portuppgifter →</button>
      </div>)}

      {/* Steg 2: Portuppgifter */}
      {steg===2&&(<div>
        <div style={{background:'var(--c-blue-bg,#eff6ff)',border:'1px solid var(--c-blue)',borderRadius:10,padding:'10px 14px',marginBottom:14,display:'flex',gap:8,alignItems:'center'}}>
          <span style={{fontSize:16}}>🗄️</span>
          <span style={{fontSize:13,color:'var(--c-blue)',fontWeight:500}}>Fyll i portuppgifter för registret</span>
        </div>
        <div className="card" style={{marginBottom:12}}>
          <label style={LBL}>Fabrikat</label>
          <select value={fabrikat} onChange={e=>setFabrikat(e.target.value)} style={INP}>
            <option value="">– Välj fabrikat –</option>
            {FASTA_FABRIKAT.map(f=><option key={f} value={f}>{f}</option>)}
            <option value="Annat">Annat / okänt</option>
          </select>
          {fabrikat==='Annat'&&<input type="text" value={annatFabrikat} onChange={e=>setAnnatFabrikat(e.target.value)} placeholder="Ange fabrikat" style={{...INP,marginTop:6}}/>}
          <label style={LBL}>Serienummer</label>
          <input type="text" value={serienr} onChange={e=>setSerienr(e.target.value)} placeholder="Serienr på porten…" style={INP}/>
          <label style={LBL}>Ordernummer</label>
          <input type="text" value={ordernr} onChange={e=>setOrdernr(e.target.value)} placeholder="Ordernr / projektnr…" style={INP}/>
        </div>
        <button onClick={()=>setSteg(3)} style={{width:'100%',padding:16,borderRadius:12,background:'var(--c-blue)',color:'#fff',border:'none',fontSize:15,fontWeight:700,cursor:'pointer',marginBottom:80}}>Nästa: Signatur →</button>
      </div>)}

      {/* Steg 3: Signatur */}
      {steg===3&&(<div>
        <div className="card" style={{marginBottom:12}}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:10}}>Kundgodkännande</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            {[{id:'godkand',label:'✓ Godkänd',bg:'var(--c-teal-bg)',txt:'var(--c-teal-text)',border:'var(--c-teal)'},{id:'ej_godkand',label:'✗ Ej godkänd',bg:'var(--c-red-bg)',txt:'var(--c-red-text)',border:'var(--c-red)'}].map(({id,label,bg,txt,border})=>(
              <button key={id} onClick={()=>setGodk(id)} style={{padding:13,borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',border:`2px solid ${godk===id?border:'var(--c-border)'}`,background:godk===id?bg:'transparent',color:godk===id?txt:'var(--c-text3)'}}>{label}</button>
            ))}
          </div>
        </div>
        <div className="card" style={{marginBottom:12}}><div style={{fontSize:13,fontWeight:600,marginBottom:10}}>Signatur tekniker</div><SignaturPad onChange={setSig}/></div>
        <div className="card" style={{marginBottom:12}}><div style={{fontSize:13,fontWeight:600,marginBottom:4}}>Signatur kund <span style={{fontSize:11,fontWeight:400,color:'var(--c-text3)'}}>– valfri</span></div><div style={{fontSize:12,color:'var(--c-text2)',marginBottom:8}}>Kunden bekräftar med sin namnteckning att arbetet är utfört och godkänt.</div><SignaturPad onChange={setSigKund}/></div>
        <button onClick={slutfor} disabled={sparar} style={{width:'100%',padding:16,borderRadius:12,background:'var(--c-teal)',color:'#fff',border:'none',fontSize:15,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginBottom:80}}>
          <CheckCircle size={18}/> {sparar?'Sparar…':'Slutför montageorder'}
        </button>
      </div>)}
    </div>
  )
}

// ── MontageDetalj ─────────────────────────────────────────────────────────────
function MontageDetalj({ order, objekt, namn, tekniker: tekLista = [], onUppdatera, onUppdateraObjekt, onLaggTillObjekt, onBack, riskpunkter = RISKPUNKTER }) {
  const [vy,setVy]=useState('info')
  const [visaRiskDetalj,setVisaRiskDetalj]=useState(false)
  const [skapadPort,setSkapadPort]=useState(null)
  const [redigerar,setRedigerar]=useState(false)
  const [editForm,setEditForm]=useState({})
  const [sparar2,setSparar2]=useState(false)
  const startRedigera=()=>{setEditForm({tekniker:order.tekniker||'',onskat_montagedag:order.onskat_montagedag||order.datum_planerat||order.datum||'',notering:order.notering||''});setRedigerar(true)}
  const sparaRedigering=async()=>{setSparar2(true);await onUppdatera(order.id,editForm);setSparar2(false);setRedigerar(false)}
  const riskSteg = order.protokoll_data?.steg || 0
  const riskKlar = riskSteg >= 1
  const sparadRisk = order.protokoll_data?.riskKontroll || {}
  const sparadRiskN = order.protokoll_data?.riskNoteringar || {}

  const hanteraRiskSparad=async(riskData)=>{
    await onUppdatera(order.id,{status:'pagAr',protokoll_data:{steg:1,...riskData}})
    setVy('info')
  }
  const hanteraSlutfort=async(prot)=>{
    const now=idag()
    const porttyp=order.porttyp||order.portTyp||'Vikport'
    // Bevara befintlig riskdata från besök 1
    const befintligRisk=riskKlar?{riskKontroll:order.protokoll_data?.riskKontroll,riskNoteringar:order.protokoll_data?.riskNoteringar}:{}
    await onUppdatera(order.id,{status:'utford',protokoll_data:{...befintligRisk,...prot,steg:2}})
    // Om porten redan finns i registret – uppdatera historik
    if(order.objekt_id){
      const port=objekt.find(o=>o.id===order.objekt_id)
      if(port){const nyH=[...(port.historik||[]),{typ:'montering',datum:now,tekniker:namn,portTyp:porttyp,kund:order.kund}];await onUppdateraObjekt(port.id,{historik:nyH})}
    } else if(onLaggTillObjekt) {
      // Auto-skapa ny port i registret
      const portNamn=`${porttyp}${order.adress?' – '+order.adress:order.kund?' ('+order.kund+')':''}`
      const nasta=(()=>{const d=new Date();d.setMonth(d.getMonth()+12);return d.toISOString().slice(0,10)})()
      const nyPort={
        id:'p'+Date.now(), typ:porttyp, namn:portNamn,
        kund:order.kund||'', kundTyp:'foretag',
        fabrikat:prot.portFabrikat||'', ar:new Date().getFullYear(),
        adress:order.adress||'', position:order.position||'', plats:'', fastighetId:null,
        ordernummer:prot.portOrdernr||order.nr||'', serienummer:prot.portSerienr||'',
        serviceIntervall:12, senaste:'', nasta, intervallProcent:0, status:'ny',
        protokoll:porttyp, punkter:0, arkiverad:false,
        historik:[{typ:'montering',datum:now,tekniker:namn,portTyp:porttyp,kund:order.kund}],
      }
      await onLaggTillObjekt(nyPort)
      setSkapadPort(nyPort)
    }
    setVy('klar')
  }
  if(vy==='risk')return(<MontageRiskFormular order={order} namn={namn} tekniker={tekLista} onSpara={hanteraRiskSparad} onBack={()=>setVy('info')} riskpunkter={riskpunkter}/>)
  if(vy==='formular')return(<MontageFormular order={order} namn={namn} onSlutfor={hanteraSlutfort} onBack={()=>setVy('info')}/>)
  if(vy==='klar')return(
    <div style={{textAlign:'center',padding:'48px 20px'}}>
      <CheckCircle size={56} color="var(--c-teal)" style={{margin:'0 auto 16px',display:'block'}}/>
      <div style={{fontSize:18,fontWeight:700,color:'var(--c-teal-text)',marginBottom:8}}>Montage slutfört!</div>
      <div style={{fontSize:14,color:'var(--c-text2)',marginBottom:16}}>{order.kund} · {idag()}</div>
      {skapadPort&&(
        <div style={{background:'#eff6ff',border:'1px solid var(--c-blue)',borderRadius:10,padding:'12px 14px',marginBottom:16,textAlign:'left'}}>
          <div style={{fontSize:13,fontWeight:700,color:'var(--c-blue)',marginBottom:4}}>🗄️ Port skapad i registret</div>
          <div style={{fontSize:13,color:'var(--c-text)'}}>{skapadPort.namn}</div>
          <div style={{fontSize:12,color:'var(--c-text2)',marginTop:2}}>Fabrikat och serienr kan kompletteras av admin</div>
        </div>
      )}
      <button className="btn btn-primary" onClick={onBack} style={{width:'100%',padding:14,fontSize:15}}>← Tillbaka</button>
    </div>
  )
  return(
    <div>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
        <button className="btn" onClick={onBack} style={{padding:'8px 12px',display:'flex',alignItems:'center',gap:5}}><ChevronLeft size={16}/> Tillbaka</button>
        <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600}}>Montage #{order.nr||'–'}</div><div style={{fontSize:12,color:'var(--c-text2)'}}>{order.kund}</div></div>
        <span className={`badge ${order.status==='utford'?'badge-teal':order.status==='pagAr'?'badge-amber':'badge-blue'}`}>{order.status==='utford'?'Utförd':order.status==='pagAr'?'Pågår':'Planerad'}</span>
      </div>
      <div className="card" style={{marginBottom:12}}>
        {[['Kund',order.kund],['Porttyp',order.porttyp||order.portTyp],['Plats',order.montageplats||order.adress],['Planerat datum',order.onskat_montagedag||order.datum_planerat||order.datum],order.tekniker&&['Tekniker',order.tekniker],order.notering&&['Notering',order.notering]].filter(Boolean).map(([l,v])=>v&&(
          <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid var(--c-border)',fontSize:13}}>
            <span style={{color:'var(--c-text2)'}}>{l}</span><span style={{fontWeight:500,textAlign:'right',maxWidth:'60%'}}>{v}</span>
          </div>
        ))}
        {order.status!=='utford'&&!redigerar&&(
          <button onClick={startRedigera} style={{display:'flex',alignItems:'center',gap:5,marginTop:10,padding:'6px 12px',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',border:'1.5px solid var(--c-border)',background:'transparent',color:'var(--c-text2)'}}>
            <Pencil size={12}/> Redigera
          </button>
        )}
      </div>
      {redigerar&&(
        <div className="card" style={{marginBottom:12}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:10,color:'var(--c-text)'}}>Redigera orderuppgifter</div>
          <label style={{fontSize:12,color:'var(--c-text2)',marginBottom:4,display:'block'}}>Tilldelad tekniker</label>
          <select value={editForm.tekniker} onChange={e=>setEditForm(p=>({...p,tekniker:e.target.value}))} style={{...INP,marginBottom:8}}>
            <option value="">Ej utsedd tekniker</option>
            {tekLista.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
          <label style={{fontSize:12,color:'var(--c-text2)',marginBottom:4,display:'block'}}>Önskad montagedag</label>
          <input type="date" value={editForm.onskat_montagedag} onChange={e=>setEditForm(p=>({...p,onskat_montagedag:e.target.value}))} style={{...INP,colorScheme:'light',marginBottom:8}}/>
          <label style={{fontSize:12,color:'var(--c-text2)',marginBottom:4,display:'block'}}>Notering</label>
          <textarea value={editForm.notering} onChange={e=>setEditForm(p=>({...p,notering:e.target.value}))} rows={2} placeholder="Notering / specifikationer…" style={{...INP,resize:'vertical',marginBottom:10}}/>
          <div style={{display:'flex',gap:8}}>
            <button onClick={sparaRedigering} disabled={sparar2} style={{flex:1,padding:11,borderRadius:9,background:'var(--c-blue)',color:'#fff',border:'none',fontSize:13,fontWeight:600,cursor:'pointer'}}>
              {sparar2?'Sparar…':'Spara ändringar'}
            </button>
            <button onClick={()=>setRedigerar(false)} style={{padding:'11px 14px',borderRadius:9,background:'transparent',color:'var(--c-text3)',border:'1px solid var(--c-border)',fontSize:13,cursor:'pointer'}}>Avbryt</button>
          </div>
        </div>
      )}
      {order.status!=='utford'&&(
        <div style={{marginBottom:80}}>
          {/* Riskbedömning klar – klickbar för att visa detaljer */}
          {riskKlar&&(
            <div style={{marginBottom:12}}>
              <button onClick={()=>setVisaRiskDetalj(v=>!v)}
                style={{width:'100%',padding:'12px 14px',background:'#f0fdf4',border:'1px solid #86efac',borderRadius:10,cursor:'pointer',
                  display:'flex',alignItems:'center',gap:10,textAlign:'left'}}>
                <span style={{fontSize:18}}>🛡️</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:'#166534'}}>Riskbedömning genomförd</div>
                  <div style={{fontSize:12,color:'#15803d'}}>Besök 1 klar · {visaRiskDetalj?'Dölj detaljer':'Visa detaljer'}</div>
                </div>
                <span style={{color:'#16a34a',fontSize:14}}>{visaRiskDetalj?'▲':'▼'}</span>
              </button>
              {visaRiskDetalj&&(
                <div style={{marginTop:6,padding:'10px 12px',background:'#f0fdf4',border:'1px solid #86efac',borderRadius:10}}>
                  {RISKPUNKTER.map((p,i)=>{
                    const s=sparadRisk[i]
                    if(!s) return null
                    const cfg=RISK_STATUS.find(r=>r.id===s)||RISK_STATUS[0]
                    return(
                      <div key={i} style={{display:'flex',alignItems:'flex-start',gap:8,padding:'6px 0',borderBottom:'1px solid #bbf7d0',fontSize:12}}>
                        <span style={{padding:'2px 7px',borderRadius:6,fontWeight:700,fontSize:10,flexShrink:0,background:cfg.bg,color:cfg.txt,border:`1px solid ${cfg.border}`}}>{cfg.label}</span>
                        <div>
                          <div style={{color:'var(--c-text)',lineHeight:1.4}}>{p}</div>
                          {sparadRiskN[i]&&<div style={{color:'var(--c-amber-text)',marginTop:2,fontStyle:'italic'}}>↳ {sparadRiskN[i]}</div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
          {/* Besök 1: Starta riskbedömning */}
          {!riskKlar&&(
            <button onClick={()=>setVy('risk')} style={{width:'100%',padding:16,borderRadius:12,background:'var(--c-amber)',color:'#fff',border:'none',fontSize:15,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginBottom:10}}>
              ⚠️ Starta riskbedömning
            </button>
          )}
          {/* Besök 2: Starta egenkontroll (endast när risk är klar) */}
          {riskKlar&&(
            <button onClick={()=>setVy('formular')} style={{width:'100%',padding:16,borderRadius:12,background:'var(--c-blue)',color:'#fff',border:'none',fontSize:15,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
              <Wrench size={18}/> Starta egenkontroll
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Register-flik (med ny port) ───────────────────────────────────────────────
function RegisterFlik({ objekt, kunder, fastigheter, onLaggTillObjekt }) {
  const [sok,      setSok]      = useState('')
  const [vald,     setVald]     = useState(null)
  const [visaNy,   setVisaNy]   = useState(false)
  const [sparad,   setSparad]   = useState(false)

  if (vald) return(
    <div>
      <button className="btn" onClick={()=>setVald(null)} style={{marginBottom:16,display:'flex',alignItems:'center',gap:6}}><ChevronLeft size={16}/> Tillbaka</button>
      <div className="card" style={{marginBottom:12}}>
        <div style={{fontSize:16,fontWeight:600}}>{vald.namn}</div>
        <div style={{fontSize:13,color:'var(--c-text2)',marginBottom:8}}>{vald.kund}</div>
        {[['Porttyp',vald.typ],['Fabrikat',vald.fabrikat],['Position',vald.position],['År',vald.ar],['Adress',vald.adress||vald.plats],['Ordernummer',vald.ordernummer],['Serienummer',vald.serienummer],['Senaste service',vald.senaste||'–'],['Nästa service',vald.nasta||'–']].map(([l,v])=>v&&(
          <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--c-border)',fontSize:13}}>
            <span style={{color:'var(--c-text2)'}}>{l}</span><span style={{fontWeight:500}}>{v}</span>
          </div>
        ))}
      </div>
      {(vald.historik||[]).filter(h=>h.typ!=='montering').slice().reverse().slice(0,5).map((h,i)=>(
        <div key={i} className="card" style={{marginBottom:8,padding:'10px 14px',background:'var(--c-bg)',fontSize:12}}>
          <div style={{color:'var(--c-text3)'}}>Serviceprotokoll</div>
          <div style={{fontWeight:500}}>{h.datum} · {h.tekniker||'–'}</div>
          <div style={{marginTop:3}}><span style={{color:'var(--c-teal)'}}>✓{h.g||0} </span>{(h.j||0)>0&&<span style={{color:'var(--c-amber)'}}>⚠{h.j} </span>}{(h.a||0)>0&&<span style={{color:'var(--c-red)'}}>✗{h.a}</span>}</div>
        </div>
      ))}
    </div>
  )

  const q=sok.toLowerCase().trim()
  const hits=q.length<1?[]:objekt.filter(o=>!o.arkiverad&&(o.namn?.toLowerCase().includes(q)||o.kund?.toLowerCase().includes(q)||o.plats?.toLowerCase().includes(q)||o.fabrikat?.toLowerCase().includes(q))).slice(0,20)

  return(
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <h1 style={{fontSize:22,fontWeight:700,margin:0}}>Portregister</h1>
        <button onClick={()=>{setVisaNy(v=>!v);setSparad(false)}} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',fontSize:13,fontWeight:600,borderRadius:9,cursor:'pointer',border:'1.5px solid var(--c-teal)',background:visaNy?'var(--c-teal)':'var(--c-teal-bg)',color:visaNy?'#fff':'var(--c-teal-text)'}}>
          {visaNy?<X size={14}/>:<Plus size={14}/>} {visaNy?'Avbryt':'Ny port'}
        </button>
      </div>
      {sparad&&<div style={{background:'var(--c-teal-bg)',border:'1px solid var(--c-teal)',borderRadius:9,padding:'10px 14px',marginBottom:12,fontSize:13,color:'var(--c-teal-text)',fontWeight:600}}>✓ Porten sparades!</div>}
      {visaNy&&<NyPortForm kunder={kunder} fastigheter={fastigheter} onSpara={async(p)=>{await onLaggTillObjekt(p);setVisaNy(false);setSparad(true)}} onAvbryt={()=>setVisaNy(false)}/>}
      <div style={{position:'relative',marginBottom:12}}>
        <Search size={15} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--c-text3)',pointerEvents:'none'}}/>
        <input type="text" placeholder="Sök port, kund, fastighet…" value={sok} onChange={e=>setSok(e.target.value)}
          style={{...INP,paddingLeft:36,fontSize:14}}/>
      </div>
      {q.length<1?(
        <div style={{textAlign:'center',padding:'40px 20px',color:'var(--c-text3)'}}><Search size={36} style={{margin:'0 auto 12px',display:'block'}}/><div style={{fontSize:14}}>Sök på portnamn, kund eller fastighet</div></div>
      ):hits.length===0?(
        <div style={{textAlign:'center',padding:'40px 20px',color:'var(--c-text3)',fontSize:14}}>Inga portar hittades</div>
      ):hits.map(o=>(
        <div key={o.id} className="card" style={{marginBottom:8,cursor:'pointer'}} onClick={()=>setVald(o)}>
          <div style={{fontSize:14,fontWeight:600}}>{o.namn}</div>
          <div style={{fontSize:13,color:'var(--c-text2)'}}>{o.kund} · {o.typ}</div>
          {o.plats&&<div style={{fontSize:12,color:'var(--c-text3)',marginTop:2}}>📍 {o.plats}</div>}
          <div style={{fontSize:11,color:o.status==='forsenad'?'var(--c-red)':'var(--c-text3)',marginTop:4}}>Nästa service: {o.nasta||'–'}</div>
        </div>
      ))}
    </div>
  )
}


// ── MobilKalender ─────────────────────────────────────────────────────────────
const EV_TYP = {
  bokning_service:    { label:'Service',      color:'#1D9E75', bg:'rgba(29,158,117,0.1)'  },
  bokning_felanmalan: { label:'Felanmälan',   color:'#ea580c', bg:'#fff7ed'               },
  bokning_mote:       { label:'Möte/Övrigt',  color:'#7c3aed', bg:'#faf5ff'               },
  bokning_montering:  { label:'Möte/Övrigt',  color:'#7c3aed', bg:'#faf5ff'               },
  serviceorder:       { label:'Serviceorder', color:'#2563eb', bg:'#eff6ff'               },
  montageorder:       { label:'Montageorder', color:'#7c3aed', bg:'#faf5ff'               },
  arende:             { label:'Felanmälan',   color:'#ea580c', bg:'#fff7ed'               },
}
const getVeckonr = (s) => {
  const d=new Date(s+'T12:00:00'); d.setDate(d.getDate()+3-((d.getDay()+6)%7))
  const v1=new Date(d.getFullYear(),0,4)
  return 1+Math.round(((d-v1)/86400000-3+((v1.getDay()+6)%7))/7)
}
const fmtKort = (s) => { const [y,m,day]=s.split('-').map(Number); return new Date(y,m-1,day).toLocaleDateString('sv-SE',{day:'numeric',month:'short'}) }

function MobilKalender({ arenden, bokningar, objekt, kunder, serviceorderArr, montageorder, namn, onLaggTillBokning, onTaBortBokning, onNavigeraServiceorder, onNavigeraMontageorder, onNavigeraArende }) {
  const todayStr = idag()
  const [offset, setOffset] = useState(0)
  const [valdDag, setValdDag] = useState(todayStr)
  const [visaNy,  setVisaNy]  = useState(false)
  const [form,    setForm]    = useState({ namn:'', kund:'', tid:'08:00', typ:'service' })
  const [sparar,  setSparar]  = useState(false)
  const setF = (k,v) => setForm(p=>({...p,[k]:v}))

  const dagar   = getVeckoDagar(offset)
  const veckonr = getVeckonr(dagar[0])

  const eventerDag = (dag) => {
    const ev = []
    // Visa ALLA händelser för alla tekniker – delad planering
    ;(bokningar[dag]||[]).forEach((b,idx)=>{
      ev.push({...b,_typ:'bokning',_idx:idx,_sort:b.tid||'08:00'})
    })
    serviceorderArr.filter(so=>so.datum===dag&&so.status!=='avslutad')
      .forEach(so=>ev.push({...so,_typ:'serviceorder',_sort:'07:00'}))
    montageorder.filter(mo=>montDatum(mo)===dag&&mo.status!=='utford')
      .forEach(mo=>ev.push({...mo,_typ:'montageorder',_sort:'07:30'}))
    arenden.filter(a=>a.besok===dag&&a.status!=='atgardad'&&!a.arkiverad)
      .forEach(a=>ev.push({...a,_typ:'arende',_sort:'08:00'}))
    return ev.sort((a,b)=>(a._sort||'').localeCompare(b._sort||''))
  }

  const dagEv = eventerDag(valdDag)
  const getTypCfg = (ev) => EV_TYP[ev._typ==='bokning'?'bokning_'+(ev.typ||'service'):ev._typ] || EV_TYP.serviceorder

  const spara = async() => {
    if(!form.namn.trim()) return
    setSparar(true)
    await onLaggTillBokning(valdDag,{...form,tek:namn?[namn]:[]})
    setForm({namn:'',kund:'',tid:'08:00',typ:'service'})
    setVisaNy(false); setSparar(false)
  }

  return (
    <div>
      {/* Veckonavigering */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <div>
          <div style={{fontSize:22,fontWeight:700,margin:0}}>Planering</div>
          <div style={{fontSize:12,color:'var(--c-text3)',marginTop:2}}>v{veckonr} · {fmtKort(dagar[0])} – {fmtKort(dagar[6])}</div>
        </div>
        <div style={{display:'flex',gap:5}}>
          <button onClick={()=>setOffset(v=>v-1)} style={{padding:'7px 11px',borderRadius:8,border:'1px solid var(--c-border)',background:'transparent',cursor:'pointer',fontSize:16}}>‹</button>
          {offset!==0&&<button onClick={()=>{setOffset(0);setValdDag(todayStr)}} style={{padding:'7px 10px',borderRadius:8,border:'1px solid var(--c-border)',background:'transparent',cursor:'pointer',fontSize:12,fontWeight:600}}>Idag</button>}
          <button onClick={()=>setOffset(v=>v+1)} style={{padding:'7px 11px',borderRadius:8,border:'1px solid var(--c-border)',background:'transparent',cursor:'pointer',fontSize:16}}>›</button>
        </div>
      </div>

      {/* Veckostrip */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3,marginBottom:16,background:'var(--c-surface)',borderRadius:13,padding:6,border:'1px solid var(--c-border)'}}>
        {dagar.map((d,i)=>{
          const aktiv=d===valdDag, erIdag=d===todayStr, antal=eventerDag(d).length
          return(
            <div key={d} onClick={()=>setValdDag(d)}
              style={{textAlign:'center',cursor:'pointer',padding:'8px 2px',borderRadius:9,transition:'all 0.15s',
                background:aktiv?'#1C3461':erIdag?'var(--c-teal-bg)':'transparent',
                border:`1.5px solid ${aktiv?'#1C3461':erIdag?'var(--c-teal)':'transparent'}`}}>
              <div style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:2,
                color:aktiv?'rgba(255,255,255,0.7)':erIdag?'var(--c-teal-text)':'var(--c-text3)'}}>
                {DAG_NAMN[i].slice(0,2)}
              </div>
              <div style={{fontSize:17,fontWeight:700,lineHeight:1,
                color:aktiv?'#fff':erIdag?'var(--c-teal-text)':'var(--c-text)'}}>
                {d.slice(8)}
              </div>
              <div style={{height:6,display:'flex',justifyContent:'center',gap:2,alignItems:'center',marginTop:3}}>
                {antal>0&&[...Array(Math.min(antal,3))].map((_,j)=>(
                  <div key={j} style={{width:5,height:5,borderRadius:'50%',
                    background:aktiv?'rgba(255,255,255,0.8)':'var(--c-blue)'}}/>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Dag-header + ny bokning */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <div style={{fontSize:14,fontWeight:600,textTransform:'capitalize',color:'var(--c-text2)'}}>{formatDag(valdDag)}</div>
        <button onClick={()=>setVisaNy(v=>!v)}
          style={{display:'flex',alignItems:'center',gap:5,padding:'7px 13px',fontSize:12,fontWeight:600,borderRadius:8,cursor:'pointer',
            border:'1.5px solid var(--c-blue)',background:visaNy?'var(--c-blue)':'transparent',color:visaNy?'#fff':'var(--c-blue)'}}>
          {visaNy?<X size={12}/>:<Plus size={12}/>} Bokning
        </button>
      </div>

      {/* Ny bokning-form */}
      {visaNy&&(
        <div className="card" style={{marginBottom:14}}>
          <div style={{fontWeight:600,fontSize:14,marginBottom:10}}>Ny bokning</div>
          <label style={LBL}>Beskrivning *</label>
          <input type="text" value={form.namn} onChange={e=>setF('namn',e.target.value)} placeholder="t.ex. Servicebesök Lager A" style={INP}/>
          <label style={LBL}>Kund</label>
          {kunder.length>0
            ?<select value={form.kund} onChange={e=>setF('kund',e.target.value)} style={INP}>
               <option value="">– Välj kund –</option>
               {kunder.map(k=><option key={k.id} value={k.namn}>{k.namn}</option>)}
             </select>
            :<input type="text" value={form.kund} onChange={e=>setF('kund',e.target.value)} placeholder="Kund" style={INP}/>
          }
          <label style={LBL}>Tid</label>
          <input type="time" value={form.tid} onChange={e=>setF('tid',e.target.value)} style={{...INP,colorScheme:'light'}}/>
          <label style={LBL}>Typ</label>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,marginTop:4}}>
            {[['service','🟢 Service'],['felanmalan','🟠 Felanm.'],['mote','🟣 Övrigt']].map(([id,lab])=>{
              const tc=EV_TYP['bokning_'+id]
              return(
                <button key={id} onClick={()=>setF('typ',id)}
                  style={{padding:'10px 4px',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',
                    border:`2px solid ${form.typ===id?tc.color:'var(--c-border)'}`,
                    background:form.typ===id?tc.bg:'transparent',
                    color:form.typ===id?tc.color:'var(--c-text3)'}}>
                  {lab}
                </button>
              )
            })}
          </div>
          <div style={{display:'flex',gap:8,marginTop:12}}>
            <button onClick={spara} disabled={sparar||!form.namn.trim()}
              style={{flex:1,padding:13,borderRadius:9,background:'var(--c-blue)',color:'#fff',border:'none',fontSize:14,fontWeight:600,
                cursor:sparar||!form.namn.trim()?'not-allowed':'pointer',opacity:sparar||!form.namn.trim()?0.55:1}}>
              {sparar?'Sparar…':'Spara bokning'}
            </button>
            <button className="btn" onClick={()=>setVisaNy(false)}>Avbryt</button>
          </div>
        </div>
      )}

      {/* Händelselista */}
      {dagEv.length===0?(
        <div style={{textAlign:'center',padding:'40px 20px',color:'var(--c-text3)'}}>
          <CalendarDays size={38} style={{margin:'0 auto 12px',display:'block',opacity:0.4}}/>
          <div style={{fontSize:14}}>Inget schemalagt denna dag</div>
        </div>
      ):dagEv.map((ev,i)=>{
        const t=getTypCfg(ev)
        let titel='',kund='',tid='',extra=''
        if(ev._typ==='bokning'){
          titel=ev.namn; kund=ev.kund; tid=ev.tid
        } else if(ev._typ==='serviceorder'){
          const port=(ev.objekt_ids||[]).map(id=>objekt.find(o=>o.id===id)).filter(Boolean)[0]
          titel=port?.namn||ev.kund||`SO #${ev.nr}`; kund=ev.kund; extra=port?.typ||''
        } else if(ev._typ==='montageorder'){
          titel=ev.kund||`Montage #${ev.nr}`; kund=ev.porttyp||ev.portTyp||''; extra=ev.adress||''
        } else if(ev._typ==='arende'){
          titel=ev.namn||ev.feltyp||'Felanmälan'; kund=ev.kund; extra=ev.feltyp||''
        }
        // Teknikerbricka – vem som är tilldelad
        const teknikNamn = ev._typ==='bokning'
          ? (Array.isArray(ev.tek)?ev.tek.join(', '):ev.tek||'')
          : (ev.tekniker||'')
        const ärMin = teknikNamn && (teknikNamn===namn || (Array.isArray(ev.tek)&&ev.tek.includes(namn)))
        const navigerbar = (ev._typ==='serviceorder'&&onNavigeraServiceorder)
          ||(ev._typ==='montageorder'&&onNavigeraMontageorder)
          ||(ev._typ==='arende'&&onNavigeraArende)
          ||(ev._typ==='bokning'&&ev.typ==='service'&&onNavigeraServiceorder)
          ||(ev._typ==='bokning'&&ev.typ==='felanmalan'&&onNavigeraArende)
        const hanteraKlick = () => {
          if(ev._typ==='serviceorder'&&onNavigeraServiceorder) onNavigeraServiceorder(ev)
          else if(ev._typ==='montageorder'&&onNavigeraMontageorder) onNavigeraMontageorder(ev)
          else if(ev._typ==='arende'&&onNavigeraArende) onNavigeraArende(ev)
          else if(ev._typ==='bokning'&&ev.typ==='service'&&onNavigeraServiceorder) onNavigeraServiceorder(null)
          else if(ev._typ==='bokning'&&ev.typ==='felanmalan'&&onNavigeraArende) onNavigeraArende(ev)
        }
        return(
          <div key={i} className="card" onClick={navigerbar?hanteraKlick:undefined}
            style={{marginBottom:10,borderLeft:`4px solid ${t.color}`,background:t.bg,padding:'12px 14px',cursor:navigerbar?'pointer':undefined}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:5}}>
              <span style={{fontSize:10,fontWeight:700,color:t.color,textTransform:'uppercase',letterSpacing:'0.06em'}}>{t.label}</span>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                {tid&&<span style={{fontSize:12,color:'var(--c-text3)',fontWeight:500}}>⏰ {tid}</span>}
                {ev._typ==='bokning'&&(
                  <button onClick={e=>{e.stopPropagation();onTaBortBokning(valdDag,ev._idx)}}
                    style={{background:'none',border:'none',cursor:'pointer',color:'var(--c-text3)',padding:2,lineHeight:1,display:'flex'}}>
                    <X size={14}/>
                  </button>
                )}
                {navigerbar&&<ChevronRight size={16} style={{color:t.color,opacity:0.7,flexShrink:0}}/>}
              </div>
            </div>
            <div style={{fontSize:15,fontWeight:600,lineHeight:1.3}}>{titel||'–'}</div>
            {kund&&<div style={{fontSize:13,color:'var(--c-text2)',marginTop:2}}>{kund}</div>}
            {extra&&<div style={{fontSize:12,color:'var(--c-text3)',marginTop:1}}>{extra}</div>}
            {teknikNamn&&(
              <div style={{marginTop:6}}>
                <span style={{fontSize:11,padding:'2px 8px',borderRadius:8,fontWeight:ärMin?700:400,
                  background:ärMin?'rgba(28,52,97,0.12)':'rgba(0,0,0,0.05)',
                  color:ärMin?'#1C3461':'var(--c-text3)',border:`1px solid ${ärMin?'rgba(28,52,97,0.25)':'var(--c-border)'}`}}>
                  👤 {teknikNamn}{ärMin?' (du)':''}
                </span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Huvud ─────────────────────────────────────────────────────────────────────
export default function TeknikerVy({
  namn = '',
  arenden = [],
  bokningar = {},
  objekt = [],
  kunder = [],
  fastigheter = [],
  tekniker = [],
  serviceorderArr = [],
  montageorder = [],
  protokollMallar,
  montagemallar,
  onUppdateraArende,
  onUppdateraObjekt,
  onUppdateraServiceorder,
  onUppdateraMontageorder,
  onLaggTillServiceorder,
  onLaggTillMontageorder,
  onLaggTillObjekt,
  onLaggTillArende,
  onNyKund,
  onLaggTillBokning,
  onTaBortBokning,
  onLoggaUt,
  onTillAdmin,
  riskpunkter,
  darkMode,
  onToggleDark,
}) {
  const riskpunkterAktiva = (riskpunkter && riskpunkter.length > 0) ? riskpunkter : RISKPUNKTER_DEFAULT
  const [flik,             setFlik]             = useState('idag')
  const [valdServiceorder, setValdServiceorder] = useState(null)
  const [valdMontage,      setValdMontage]      = useState(null)
  const [arendeFilter,     setArendeFilter]     = useState('mina')
  const [fokusArendeId,    setFokusArendeId]    = useState(null)
  const [initialPortId,    setInitialPortId]    = useState(null)
  const [serviceFilter,    setServiceFilter]    = useState('mina')
  const [montageFilter,    setMontageFilter]    = useState('mina')
  const [visaNyService,    setVisaNyService]    = useState(false)
  const [visaNyMontage,    setVisaNyMontage]    = useState(false)
  const [visaNyArende,     setVisaNyArende]     = useState(false)
  const [arendeHistVis,    setArendeHistVis]    = useState(false)
  const [serviceHistVis,   setServiceHistVis]   = useState(false)
  const [montageHistVis,   setMontageHistVis]   = useState(false)

  // Lås body-scroll så sidan inte scrollar utanför appen
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const todayStr = idag()

  const dagensBokningar = (bokningar[todayStr]||[])
    .filter(b=>!namn||(Array.isArray(b.tek)?b.tek.includes(namn):b.tek===namn))
    .sort((a,b)=>(a.tid||'').localeCompare(b.tid||''))

  const alleArenden   = arenden.filter(a=>!a.arkiverad&&a.status!=='atgardad')
  const minaArenden   = alleArenden.filter(a=>(a.tekniker||[]).includes(namn))
  const otiArenden    = alleArenden.filter(a=>!(a.tekniker||[]).length)
  const visadeArenden = arendeFilter==='mina'?minaArenden:arendeFilter==='otilldelade'?otiArenden:alleArenden
  const sortedArenden = [...visadeArenden].sort((a,b)=>({akut:0,hog:1,normal:2}[a.prioritet]??2)-({akut:0,hog:1,normal:2}[b.prioritet]??2))

  const minaServiceordrar = serviceorderArr.filter(o=>o.tekniker===namn&&o.status!=='avslutad').sort((a,b)=>(a.datum||'').localeCompare(b.datum||''))
  const alleServiceordrar = serviceorderArr.filter(o=>o.status!=='avslutad').sort((a,b)=>(a.datum||'').localeCompare(b.datum||''))
  const visadeServiceordrar = serviceFilter==='mina' ? minaServiceordrar : alleServiceordrar

  const minaMontageordrar = montageorder.filter(m=>m.tekniker===namn&&m.status!=='utford').sort((a,b)=>montDatum(a).localeCompare(montDatum(b)))
  const alleMontageordrar = montageorder.filter(m=>m.status!=='utford').sort((a,b)=>montDatum(a).localeCompare(montDatum(b)))
  const visadeMontageordrar = montageFilter==='mina' ? minaMontageordrar : alleMontageordrar

  // Historik – avslutade ordrar (visas alltid för alla, oavsett filter)
  const klaraArenden     = arenden.filter(a=>!a.arkiverad&&a.status==='atgardad').sort((a,b)=>(b.datum||'').localeCompare(a.datum||'')).slice(0,30)
  const avslutadeService = serviceorderArr.filter(o=>o.status==='avslutad').sort((a,b)=>(b.datum||'').localeCompare(a.datum||'')).slice(0,30)
  const avslutadeMontage = montageorder.filter(m=>m.status==='utford').sort((a,b)=>montDatum(b).localeCompare(montDatum(a))).slice(0,30)

  const TABS = [
    { id:'idag',      icon:Calendar,      label:'Idag',    badge:dagensBokningar.length },
    { id:'felanmalan',icon:AlertCircle,   label:'Felanm.', badge:minaArenden.length },
    { id:'service',   icon:ClipboardList, label:'Service', badge:minaServiceordrar.length },
    { id:'montage',   icon:Wrench,        label:'Montage', badge:minaMontageordrar.length },
    { id:'register',  icon:Database,      label:'Register',badge:0 },
    { id:'kalender',  icon:CalendarDays,  label:'Kalender',badge:0 },
  ]

  const renderContent = () => {
    switch(flik) {

      case 'idag': return(
        <div>
          <h1 style={{fontSize:22,fontWeight:700,marginBottom:4,textTransform:'capitalize'}}>{formatDag(todayStr)}</h1>
          <p style={{color:'var(--c-text2)',fontSize:14,marginBottom:16}}>{dagensBokningar.length===0?'Inga bokningar idag':`${dagensBokningar.length} bokningar schemalagda`}</p>
          {minaArenden.filter(a=>a.prioritet==='akut').length>0&&(
            <div onClick={()=>setFlik('felanmalan')} style={{background:'var(--c-red-bg)',border:'1px solid var(--c-red)',borderRadius:10,padding:'10px 14px',marginBottom:16,display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}>
              <AlertCircle size={16} color="var(--c-red)"/>
              <span style={{fontSize:13,fontWeight:600,color:'var(--c-red-text)',flex:1}}>{minaArenden.filter(a=>a.prioritet==='akut').length} akuta ärenden kräver åtgärd</span>
              <ChevronRight size={16} color="var(--c-red)" style={{opacity:0.6}}/>
            </div>
          )}
          {(minaServiceordrar.length>0||minaMontageordrar.length>0)&&(
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
              {minaServiceordrar.length>0&&<div onClick={()=>setFlik('service')} className="card" style={{cursor:'pointer',padding:16,textAlign:'center'}}><ClipboardList size={26} color="var(--c-blue)" style={{margin:'0 auto 6px',display:'block'}}/><div style={{fontSize:22,fontWeight:700}}>{minaServiceordrar.length}</div><div style={{fontSize:12,color:'var(--c-text2)'}}>Serviceordrar</div></div>}
              {minaMontageordrar.length>0&&<div onClick={()=>setFlik('montage')} className="card" style={{cursor:'pointer',padding:16,textAlign:'center'}}><Wrench size={26} color="var(--c-amber)" style={{margin:'0 auto 6px',display:'block'}}/><div style={{fontSize:22,fontWeight:700}}>{minaMontageordrar.length}</div><div style={{fontSize:12,color:'var(--c-text2)'}}>Montageordrar</div></div>}
            </div>
          )}
          {dagensBokningar.length===0?(<div className="card" style={{textAlign:'center',padding:'40px 20px'}}><Clock size={36} color="var(--c-text3)" style={{margin:'0 auto 12px',display:'block'}}/><div style={{fontSize:14,color:'var(--c-text2)'}}>Inga bokningar idag</div></div>
          ):dagensBokningar.map((b,i)=>{
            const typFlik = b.typ==='felanmalan'?'felanmalan':b.typ==='montering'||b.typ==='montage'?'montage':'service'
            const typFarg = b.typ==='felanmalan'?'var(--c-red,#ef4444)':b.typ==='montering'||b.typ==='montage'?'var(--c-green,#22c55e)':'var(--c-blue,#2563eb)'
            return(
            <div key={i} className="card" onClick={()=>setFlik(typFlik)} style={{display:'flex',gap:14,alignItems:'center',padding:'14px 16px',marginBottom:8,cursor:'pointer',borderLeft:`4px solid ${typFarg}`}}>
              <div style={{background:typFarg,color:'#fff',borderRadius:10,padding:'8px 10px',fontSize:14,fontWeight:700,flexShrink:0,minWidth:52,textAlign:'center'}}>{b.tid||'–'}</div>
              <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600}}>{b.namn}</div>{b.kund&&<div style={{fontSize:13,color:'var(--c-text2)'}}>{b.kund}</div>}</div>
              <ChevronRight size={16} color="var(--c-text3)" style={{flexShrink:0}}/>
            </div>
            )
          })}
        </div>
      )

      case 'felanmalan': return(
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <h1 style={{fontSize:22,fontWeight:700,margin:0}}>Felanmälningar</h1>
            <button onClick={()=>setVisaNyArende(v=>!v)} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',fontSize:13,fontWeight:600,borderRadius:9,cursor:'pointer',border:'1.5px solid var(--c-red,#ef4444)',background:visaNyArende?'var(--c-red,#ef4444)':'transparent',color:visaNyArende?'#fff':'var(--c-red,#ef4444)'}}>
              {visaNyArende?<X size={14}/>:<Plus size={14}/>} Ny
            </button>
          </div>
          {/* Filter-knappar */}
          <div style={{display:'flex',gap:6,marginBottom:14}}>
            {[['mina',`Mina (${minaArenden.length})`],['alla',`Alla (${alleArenden.length})`],['otilldelade',`Otilldelade (${otiArenden.length})`]].map(([id,lab])=>(
              <button key={id} onClick={()=>setArendeFilter(id)} style={{flex:1,padding:'8px 4px',borderRadius:9,fontSize:12,fontWeight:600,cursor:'pointer',border:`1.5px solid ${arendeFilter===id?'var(--c-navy, #1C3461)':'var(--c-border)'}`,background:arendeFilter===id?'var(--c-navy, #1C3461)':'transparent',color:arendeFilter===id?'#fff':'var(--c-text2)',whiteSpace:'nowrap'}}>{lab}</button>
            ))}
          </div>
          {visaNyArende&&(
            <div className="card" style={{marginBottom:16,padding:'16px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                <div style={{fontWeight:600,fontSize:15}}>Ny felanmälan</div>
                <button className="btn" onClick={()=>setVisaNyArende(false)} style={{padding:'4px 8px'}}><X size={14}/></button>
              </div>
              <Felanmalan
                kunder={kunder}
                objekt={objekt}
                tekniker={tekniker}
                onNyKund={onNyKund}
                onSparaArende={onLaggTillArende}
                standaloneMode={false}
              />
            </div>
          )}
          {sortedArenden.length===0?(
            <div className="card" style={{textAlign:'center',padding:'48px 20px'}}><CheckCircle size={40} color="var(--c-teal)" style={{margin:'0 auto 12px',display:'block'}}/><div style={{fontSize:15,fontWeight:500,color:'var(--c-teal-text)'}}>Inga {arendeFilter==='mina'?'tilldelade':arendeFilter==='otilldelade'?'otilldelade':'öppna'} ärenden!</div></div>
          ):<div style={{display:'flex',flexDirection:'column',gap:10}}>{sortedArenden.map(a=><ArendeKort key={a.id} a={a} namn={namn} tekniker={tekniker} onUppdatera={onUppdateraArende} autoOpen={a.id===fokusArendeId}/>)}</div>}
          {/* Historik – avslutade ärenden */}
          {klaraArenden.length>0&&(
            <div style={{marginTop:20}}>
              <button onClick={()=>setArendeHistVis(v=>!v)} style={{width:'100%',padding:'10px 14px',borderRadius:9,fontSize:13,fontWeight:600,cursor:'pointer',border:'1px solid var(--c-border)',background:'transparent',color:'var(--c-text2)',display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:arendeHistVis?8:0}}>
                <span>Historik – åtgärdade ({klaraArenden.length})</span>
                <span>{arendeHistVis?'▲':'▼'}</span>
              </button>
              {arendeHistVis&&klaraArenden.map(a=>(
                <div key={a.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',background:'var(--c-surface)',borderRadius:10,border:'1px solid var(--c-border)',marginBottom:6}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:500}}>#{a.nr} · {a.kund}</div>
                    <div style={{fontSize:12,color:'var(--c-text2)'}}>{a.feltyp||a.namn||'–'} · {a.datum}</div>
                    {a.notering&&<div style={{fontSize:12,color:'var(--c-text3)',marginTop:2,fontStyle:'italic'}}>↳ {a.notering}</div>}
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
                    <button onClick={async()=>{
                      const logo64=await hämtaLogoBase64()
                      öppnaPrintFönster(pdfArende(a,logo64),`Felanmälan #${a.nr||''}`)
                    }} style={{display:'flex',alignItems:'center',gap:4,padding:'5px 10px',borderRadius:7,fontSize:11,fontWeight:600,cursor:'pointer',border:'1px solid var(--c-border)',background:'transparent',color:'var(--c-text2)'}}>
                      <Printer size={12}/> Skriv ut
                    </button>
                    <span className="badge badge-teal">Klar</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )

      case 'service':
        if(valdServiceorder)return(<ServiceorderDetalj order={valdServiceorder} objekt={objekt} namn={namn} tekniker={tekniker} onUppdatera={async(id,ch)=>{await onUppdateraServiceorder(id,ch);setValdServiceorder(p=>({...p,...ch}))}} onUppdateraObjekt={onUppdateraObjekt} onBack={()=>setValdServiceorder(null)}/>)
        return(
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <h1 style={{fontSize:22,fontWeight:700,margin:0}}>Serviceordrar</h1>
              <button onClick={()=>setVisaNyService(v=>!v)} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',fontSize:13,fontWeight:600,borderRadius:9,cursor:'pointer',border:'1.5px solid var(--c-blue)',background:visaNyService?'var(--c-blue)':'transparent',color:visaNyService?'#fff':'var(--c-blue)'}}>
                {visaNyService?<X size={14}/>:<Plus size={14}/>} Ny
              </button>
            </div>
            {/* Alla/Mina-filter */}
            <div style={{display:'flex',gap:6,marginBottom:14}}>
              {[['mina',`Mina (${minaServiceordrar.length})`],['alla',`Alla (${alleServiceordrar.length})`]].map(([id,lab])=>(
                <button key={id} onClick={()=>setServiceFilter(id)} style={{flex:1,padding:'8px 4px',borderRadius:9,fontSize:12,fontWeight:600,cursor:'pointer',border:`1.5px solid ${serviceFilter===id?'var(--c-navy,#1C3461)':'var(--c-border)'}`,background:serviceFilter===id?'var(--c-navy,#1C3461)':'transparent',color:serviceFilter===id?'#fff':'var(--c-text2)'}}>{lab}</button>
              ))}
            </div>
            {visaNyService&&<NyServiceorderForm objekt={objekt} kunder={kunder} namn={namn} tekniker={tekniker} onNyKund={onNyKund} onLaggTillObjekt={onLaggTillObjekt} onSpara={async(o)=>{await onLaggTillServiceorder(o);setVisaNyService(false)}} onAvbryt={()=>setVisaNyService(false)}/>}
            <p style={{color:'var(--c-text2)',fontSize:14,marginBottom:12}}>{visadeServiceordrar.length===0?'Inga öppna serviceordrar':`${visadeServiceordrar.length} öppna`}</p>
            {visadeServiceordrar.length===0?(<div className="card" style={{textAlign:'center',padding:'40px 20px'}}><CheckCircle size={40} color="var(--c-teal)" style={{margin:'0 auto 12px',display:'block'}}/><div style={{fontSize:15,fontWeight:500,color:'var(--c-teal-text)'}}>Inga öppna serviceordrar!</div></div>
            ):visadeServiceordrar.map(o=>{ const port=(o.objekt_ids||[]).map(id=>objekt.find(p=>p.id===id)).filter(Boolean)[0]; const ämin=o.tekniker===namn; return(
              <div key={o.id} className="card" style={{marginBottom:10,cursor:'pointer',borderLeft:`4px solid ${ämin?'var(--c-blue)':'var(--c-border)'}`}} onClick={()=>setValdServiceorder(o)}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:15,fontWeight:600}}>{o.kund}</div>
                    {port&&<div style={{fontSize:13,color:'var(--c-text2)'}}>{port.namn} · {port.typ}</div>}
                    <div style={{fontSize:12,color:'var(--c-text3)',marginTop:4,display:'flex',gap:8}}>
                      <span>📅 {o.datum||'–'}</span>
                      {o.tekniker&&<span style={{background:'var(--c-bg)',borderRadius:6,padding:'1px 6px',border:'1px solid var(--c-border)',fontWeight:ämin?700:400,color:ämin?'var(--c-blue)':'var(--c-text3)'}}>👤 {o.tekniker}</span>}
                    </div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:6}}><span className={`badge ${o.status==='planerad'?'badge-blue':'badge-amber'}`}>{o.status==='planerad'?'Planerad':'Pågår'}</span><ChevronRight size={16} color="var(--c-text3)"/></div>
                </div>
              </div>
            )})}
            {/* Historik – avslutade serviceordrar */}
            {avslutadeService.length>0&&(
              <div style={{marginTop:16}}>
                <button onClick={()=>setServiceHistVis(v=>!v)} style={{width:'100%',padding:'10px 14px',borderRadius:9,fontSize:13,fontWeight:600,cursor:'pointer',border:'1px solid var(--c-border)',background:'transparent',color:'var(--c-text2)',display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:serviceHistVis?8:0}}>
                  <span>Historik – avslutade ({avslutadeService.length})</span>
                  <span>{serviceHistVis?'▲':'▼'}</span>
                </button>
                {serviceHistVis&&avslutadeService.map(o=>{ const port=(o.objekt_ids||[]).map(id=>objekt.find(p=>p.id===id)).filter(Boolean)[0]; return(
                  <div key={o.id} className="card" style={{marginBottom:8,padding:'10px 14px',opacity:0.85}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:600}}>{o.kund}</div>
                        {port&&<div style={{fontSize:12,color:'var(--c-text2)'}}>{port.namn}</div>}
                        <div style={{fontSize:12,color:'var(--c-text3)',marginTop:2}}>📅 {o.datum||'–'} · 👤 {o.tekniker||'–'}</div>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
                        {o.protokoll?.statuses&&(
                          <button onClick={async()=>{
                            const logo64=await hämtaLogoBase64()
                            const punkter=protokollPunkter[port?.typ||o.protokoll?.portTyp]||[]
                            öppnaPrintFönster(pdfServiceProt(o,port?.namn,port?.typ,punkter,logo64),`Serviceprotokoll ${o.nr||''}`)
                          }} style={{display:'flex',alignItems:'center',gap:4,padding:'5px 10px',borderRadius:7,fontSize:11,fontWeight:600,cursor:'pointer',border:'1px solid var(--c-border)',background:'transparent',color:'var(--c-text2)'}}>
                            <Printer size={12}/> Protokoll
                          </button>
                        )}
                        <span className="badge badge-teal">Avslutad</span>
                      </div>
                    </div>
                  </div>
                )})}
              </div>
            )}
          </div>
        )

      case 'montage':
        if(valdMontage)return(<MontageDetalj order={valdMontage} objekt={objekt} namn={namn} tekniker={tekniker} onUppdatera={async(id,ch)=>{await onUppdateraMontageorder(id,ch);setValdMontage(p=>({...p,...ch}))}} onUppdateraObjekt={onUppdateraObjekt} onLaggTillObjekt={onLaggTillObjekt} onBack={()=>setValdMontage(null)} riskpunkter={riskpunkterAktiva}/>)
        return(
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <h1 style={{fontSize:22,fontWeight:700,margin:0}}>Montageordrar</h1>
              <button onClick={()=>setVisaNyMontage(v=>!v)} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',fontSize:13,fontWeight:600,borderRadius:9,cursor:'pointer',border:'1.5px solid var(--c-amber)',background:visaNyMontage?'var(--c-amber)':'transparent',color:visaNyMontage?'#fff':'var(--c-amber)'}}>
                {visaNyMontage?<X size={14}/>:<Plus size={14}/>} Ny
              </button>
            </div>
            {/* Alla/Mina-filter */}
            <div style={{display:'flex',gap:6,marginBottom:14}}>
              {[['mina',`Mina (${minaMontageordrar.length})`],['alla',`Alla (${alleMontageordrar.length})`]].map(([id,lab])=>(
                <button key={id} onClick={()=>setMontageFilter(id)} style={{flex:1,padding:'8px 4px',borderRadius:9,fontSize:12,fontWeight:600,cursor:'pointer',border:`1.5px solid ${montageFilter===id?'var(--c-navy,#1C3461)':'var(--c-border)'}`,background:montageFilter===id?'var(--c-navy,#1C3461)':'transparent',color:montageFilter===id?'#fff':'var(--c-text2)'}}>{lab}</button>
              ))}
            </div>
            {visaNyMontage&&<NyMontageorderForm kunder={kunder} namn={namn} tekniker={tekniker} onNyKund={onNyKund} onSpara={async(m)=>{const r=await onLaggTillMontageorder(m);if(r)setVisaNyMontage(false);return r}} onAvbryt={()=>setVisaNyMontage(false)}/>}
            <p style={{color:'var(--c-text2)',fontSize:14,marginBottom:12}}>{visadeMontageordrar.length===0?'Inga öppna montageordrar':`${visadeMontageordrar.length} öppna`}</p>
            {visadeMontageordrar.length===0?(<div className="card" style={{textAlign:'center',padding:'40px 20px'}}><CheckCircle size={40} color="var(--c-teal)" style={{margin:'0 auto 12px',display:'block'}}/><div style={{fontSize:15,fontWeight:500,color:'var(--c-teal-text)'}}>Inga öppna montageordrar!</div></div>
            ):visadeMontageordrar.map(m=>{ const ämin=m.tekniker===namn; const mRiskKlar=(m.protokoll_data?.steg||0)>=1; return(
              <div key={m.id} className="card" style={{marginBottom:10,cursor:'pointer',borderLeft:`4px solid ${ämin?'var(--c-amber)':'var(--c-border)'}`}} onClick={()=>setValdMontage(m)}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',marginBottom:2}}>
                      <span style={{fontSize:15,fontWeight:600}}>{m.kund}</span>
                      {mRiskKlar&&<span style={{fontSize:10,background:'#f0fdf4',color:'#166534',padding:'1px 7px',borderRadius:9,border:'1px solid #bbf7d0',fontWeight:700}}>🛡️ Risk klar</span>}
                    </div>
                    <div style={{fontSize:13,color:'var(--c-text2)'}}>{m.porttyp||m.portTyp||'–'} · {m.montageplats||m.adress||'–'}</div>
                    <div style={{fontSize:12,color:'var(--c-text3)',marginTop:4,display:'flex',gap:8}}>
                      <span>📅 {montDatum(m)||'–'}</span>
                      {m.tekniker&&<span style={{background:'var(--c-bg)',borderRadius:6,padding:'1px 6px',border:'1px solid var(--c-border)',fontWeight:ämin?700:400,color:ämin?'var(--c-amber)':'var(--c-text3)'}}>👤 {m.tekniker}</span>}
                    </div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:6}}><span className={`badge ${m.status==='planerad'?'badge-blue':'badge-amber'}`}>{m.status==='planerad'?'Planerad':m.status||'–'}</span><ChevronRight size={16} color="var(--c-text3)"/></div>
                </div>
              </div>
            )})}
            {/* Historik – utförda montageordrar */}
            {avslutadeMontage.length>0&&(
              <div style={{marginTop:16}}>
                <button onClick={()=>setMontageHistVis(v=>!v)} style={{width:'100%',padding:'10px 14px',borderRadius:9,fontSize:13,fontWeight:600,cursor:'pointer',border:'1px solid var(--c-border)',background:'transparent',color:'var(--c-text2)',display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:montageHistVis?8:0}}>
                  <span>Historik – utförda ({avslutadeMontage.length})</span>
                  <span>{montageHistVis?'▲':'▼'}</span>
                </button>
                {montageHistVis&&avslutadeMontage.map(m=>(
                  <div key={m.id} className="card" style={{marginBottom:8,padding:'10px 14px',opacity:0.85}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:600}}>{m.kund}</div>
                        <div style={{fontSize:12,color:'var(--c-text2)'}}>{m.porttyp||m.portTyp||'–'} · {m.montageplats||m.adress||'–'}</div>
                        <div style={{fontSize:12,color:'var(--c-text3)',marginTop:2}}>{montDatum(m)||'–'} · {m.tekniker||'–'}</div>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
                        {m.protokoll_data?.egenkontroll&&(
                          <button onClick={async()=>{
                            const logo64=await hämtaLogoBase64()
                            öppnaPrintFönster(pdfMontageProt(m.protokoll_data,logo64,{},riskpunkterAktiva),`Montageprotokoll ${m.nr||''}`)
                          }} style={{display:'flex',alignItems:'center',gap:4,padding:'5px 10px',borderRadius:7,fontSize:11,fontWeight:600,cursor:'pointer',border:'1px solid var(--c-border)',background:'transparent',color:'var(--c-text2)'}}>
                            <Printer size={12}/> Protokoll
                          </button>
                        )}
                        <span className="badge badge-teal">Utförd</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )

      case 'register':
        return(
          <Portregister
            objekt={objekt}
            kunder={kunder}
            fastigheter={fastigheter}
            tekniker={tekniker}
            montageorder={montageorder}
            arenden={arenden}
            riskpunkter={riskpunkterAktiva}
            onLaggTill={onLaggTillObjekt}
            onUppdateraObjekt={onUppdateraObjekt}
            onLaggTillBokning={onLaggTillBokning}
            onLaggTillArende={onLaggTillArende}
            onLaggTillServiceorder={onLaggTillServiceorder}
            onNavigeraArende={(a)=>{
              if(a?.id){setFokusArendeId(a.id);setArendeFilter('alla')}
              setFlik('felanmalan')
            }}
            onNavigeraServiceorder={()=>setFlik('service')}
            onNyArende={()=>{setFlik('felanmalan');setVisaNyArende(true)}}
            initialObjektId={initialPortId}
            onInitialObjektHandled={()=>setInitialPortId(null)}
          />
        )

      case 'kalender':
        return(
          <MobilKalender
            arenden={arenden}
            bokningar={bokningar}
            objekt={objekt}
            kunder={kunder}
            serviceorderArr={serviceorderArr}
            montageorder={montageorder}
            namn={namn}
            onLaggTillBokning={onLaggTillBokning}
            onTaBortBokning={onTaBortBokning}
            onNavigeraServiceorder={so=>{setValdServiceorder(so);setFlik('service')}}
            onNavigeraMontageorder={mo=>{setValdMontage(mo);setFlik('montage')}}
            onNavigeraArende={(ev)=>{
              const id=ev?.id||ev?.arendeId
              if(id){setFokusArendeId(id);setArendeFilter('alla')}
              setFlik('felanmalan')
            }}
          />
        )

      default: return null
    }
  }

  return (
    <div style={{height:'100dvh',background:'var(--c-bg)',display:'flex',flexDirection:'column',overflow:'hidden'}}>
      {/* Header – safe-area-inset-top för iPhone-notch / Dynamic Island */}
      <div style={{background:'#1C3461',paddingTop:'calc(12px + env(safe-area-inset-top))',paddingBottom:'12px',paddingLeft:'16px',paddingRight:'16px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{background:'rgba(255,255,255,0.96)',borderRadius:8,padding:'4px 10px',display:'flex',alignItems:'center',boxShadow:'0 1px 4px rgba(0,0,0,0.12)'}}>
            <img src={logo} alt="NMV Portservice" style={{height:22,display:'block',objectFit:'contain'}}/>
          </div>
          {namn&&<span style={{color:'rgba(255,255,255,0.65)',fontSize:13,borderLeft:'1px solid rgba(255,255,255,0.2)',paddingLeft:12}}>{namn}</span>}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          {onTillAdmin && (
            <button onClick={onTillAdmin} style={{background:'none',border:'1px solid rgba(255,255,255,0.2)',color:'rgba(255,255,255,0.65)',borderRadius:7,padding:'6px 12px',fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
              ← Admin
            </button>
          )}
          {onToggleDark && (
            <button onClick={onToggleDark} title={darkMode ? 'Ljust läge' : 'Mörkt läge'}
              style={{background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',color:'rgba(255,255,255,0.8)',borderRadius:7,padding:'6px 8px',fontSize:13,cursor:'pointer',display:'flex',alignItems:'center'}}>
              {darkMode ? <Sun size={14}/> : <Moon size={14}/>}
            </button>
          )}
          <button onClick={onLoggaUt} style={{background:'none',border:'1px solid rgba(255,255,255,0.2)',color:'rgba(255,255,255,0.65)',borderRadius:7,padding:'6px 12px',fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
            <LogOut size={14}/> Logga ut
          </button>
        </div>
      </div>

      {/* Innehåll – extra bottom-padding för home-indicator */}
      <div style={{flex:1,padding:'20px 16px',paddingBottom:'calc(88px + env(safe-area-inset-bottom))',overflowY:'auto',WebkitOverflowScrolling:'touch',overscrollBehavior:'contain'}}>
        <div style={{maxWidth:560,margin:'0 auto'}}>{renderContent()}</div>
      </div>

      {/* Bottom nav – 6 flikar */}
      <div style={{position:'fixed',bottom:0,left:0,right:0,background:'var(--c-surface)',borderTop:'2px solid var(--c-border)',display:'flex',zIndex:100,paddingBottom:'env(safe-area-inset-bottom)'}}>
        {TABS.map(({id,icon:Icon,label,badge})=>{
          const aktiv=flik===id
          return(
            <button key={id} onClick={()=>{setFlik(id);if(id!=='service')setValdServiceorder(null);if(id!=='montage')setValdMontage(null)}}
              style={{flex:1,padding:'12px 0 10px',background:'none',border:'none',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:4,color:aktiv?'var(--c-navy)':'var(--c-text3)',position:'relative',transition:'color 0.15s'}}>
              <div style={{position:'relative',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Icon size={26} strokeWidth={aktiv?2.5:1.7}/>
                {badge>0&&<span style={{position:'absolute',top:-5,right:-8,background:'var(--c-red)',color:'#fff',fontSize:10,fontWeight:700,padding:'1px 5px',borderRadius:10,lineHeight:1.4,minWidth:17,textAlign:'center'}}>{badge}</span>}
              </div>
              <span style={{fontSize:10,fontWeight:aktiv?700:400,letterSpacing:'0.01em'}}>{label}</span>
              {aktiv&&<span style={{position:'absolute',bottom:0,left:'20%',right:'20%',height:3,background:'var(--c-navy)',borderRadius:'3px 3px 0 0'}}/>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
