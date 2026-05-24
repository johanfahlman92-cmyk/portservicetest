import { useState, useRef } from 'react'
import { Calendar, AlertCircle, LogOut, Clock, CheckCircle, Play,
         ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
         ClipboardList, Wrench, Database, Search, FileText, Plus, X, CalendarDays } from 'lucide-react'
import logo from '../logo.png'
import { protokollPunkter, RISKPUNKTER } from '../data/store.js'
import Kalender from './Kalender.jsx'

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
const genNr = () => new Date().toISOString().slice(2,10).replace(/-/g,'') + '-' + Math.floor(Math.random()*90+10)
const getVeckoDagar = (offset) => {
  const now = new Date(); const day = now.getDay()
  const mon = new Date(now); mon.setDate(now.getDate() - (day===0?6:day-1) + offset*7)
  return Array.from({length:7},(_,i)=>{ const d=new Date(mon); d.setDate(mon.getDate()+i); return d.toISOString().slice(0,10) })
}
const INP = { width:'100%', padding:'11px 12px', fontSize:14, border:'1px solid var(--c-border)', borderRadius:9, background:'var(--c-bg)', color:'var(--c-text)', boxSizing:'border-box' }
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
function ArendeKort({ a, namn, onUppdatera }) {
  const [utv,     setUtv]     = useState(false)
  const [notering,setNotering]= useState(a.notering || '')
  const [sparar,  setSparar]  = useState(false)
  const [klarad,  setKlarad]  = useState(false)
  const [tagen,   setTagen]   = useState(false)

  const otilldelad = !a.tekniker

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
            {a.tekniker && a.tekniker !== namn && <span style={{fontSize:11,background:'var(--c-bg)',color:'var(--c-text2)',padding:'2px 7px',borderRadius:10}}>👤 {a.tekniker}</span>}
          </div>
          <div style={{fontSize:15,fontWeight:600}}>{a.kund}</div>
          <div style={{fontSize:13,color:'var(--c-text2)'}}>{a.namn||a.feltyp||'Felanmälan'}</div>
          {a.besok&&<div style={{fontSize:12,color:'var(--c-blue-text,#2563EB)',marginTop:4}}>📅 Besök: {a.besok}</div>}
        </div>
        <div style={{color:'var(--c-text3)',paddingTop:4}}>{utv?<ChevronUp size={18}/>:<ChevronDown size={18}/>}</div>
      </div>
      {utv && (
        <div style={{padding:'0 16px 16px',borderTop:'1px solid var(--c-border)'}}>
          {a.beskrivning&&<div style={{fontSize:13,color:'var(--c-text2)',fontStyle:'italic',background:'var(--c-bg)',borderRadius:8,padding:'10px 12px',margin:'12px 0'}}>"{a.beskrivning}"</div>}
          {!otilldelad && <>
            <label style={LBL}>Notering / åtgärd</label>
            <textarea value={notering} onChange={e=>setNotering(e.target.value)} rows={2} placeholder="Beskriv utförd åtgärd…"
              style={{...INP,resize:'vertical',marginBottom:10}}/>
          </>}
          <div style={{display:'flex',flexDirection:'column',gap:8,marginTop:8}}>
            {/* Ta på mig */}
            {otilldelad && (
              <button disabled={sparar} onClick={async()=>{setSparar(true);await onUppdatera(a.id,{tekniker:namn});setTagen(true);setSparar(false)}}
                style={{width:'100%',padding:14,borderRadius:10,background:'var(--c-blue)',color:'#fff',border:'none',fontSize:14,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                ✋ Ta på mig
              </button>
            )}
            {!otilldelad && a.status==='ny'&&(
              <button disabled={sparar} onClick={async()=>{setSparar(true);await onUppdatera(a.id,{status:'pagAr'});setSparar(false)}}
                style={{width:'100%',padding:14,borderRadius:10,background:'var(--c-blue)',color:'#fff',border:'none',fontSize:14,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                <Play size={16} fill="#fff"/> Starta arbete
              </button>
            )}
            {!otilldelad && (a.status==='ny'||a.status==='pagAr')&&(
              <button disabled={sparar} onClick={async()=>{setSparar(true);await onUppdatera(a.id,{status:'atgardad',notering});setKlarad(true);setSparar(false)}}
                style={{width:'100%',padding:14,borderRadius:10,background:'var(--c-teal)',color:'#fff',border:'none',fontSize:14,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                <CheckCircle size={16}/> Markera klar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Ny serviceorder-formulär ──────────────────────────────────────────────────
function NyServiceorderForm({ objekt, kunder, namn, onSpara, onAvbryt }) {
  const [sok,     setSok]     = useState('')
  const [port,    setPort]    = useState(null)
  const [datum,   setDatum]   = useState(idag())
  const [notering,setNotering]= useState('')
  const [sparar,  setSparar]  = useState(false)

  const hits = sok.length > 1
    ? objekt.filter(o => !o.arkiverad && (o.namn?.toLowerCase().includes(sok.toLowerCase()) || o.kund?.toLowerCase().includes(sok.toLowerCase()))).slice(0,6)
    : []

  const spara = async () => {
    if (!datum) return
    setSparar(true)
    await onSpara({
      nr: genNr(), datum, status: 'planerad',
      tekniker: namn, kund: port?.kund || '',
      objekt_ids: port ? [port.id] : [],
      notering: notering.trim(),
    })
    setSparar(false)
  }

  return (
    <div className="card" style={{marginBottom:16}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <div style={{fontWeight:600,fontSize:15}}>Ny serviceorder</div>
        <button className="btn" onClick={onAvbryt} style={{padding:'4px 8px'}}><X size={14}/></button>
      </div>
      <label style={LBL}>Sök och välj port</label>
      {port ? (
        <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 12px',background:'var(--c-teal-bg)',border:'1px solid var(--c-teal)',borderRadius:9,marginBottom:8}}>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:600,color:'var(--c-teal-text)'}}>{port.namn}</div>
            <div style={{fontSize:12,color:'var(--c-text2)'}}>{port.kund} · {port.typ}</div>
          </div>
          <button onClick={()=>{setPort(null);setSok('')}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--c-text3)'}}><X size={14}/></button>
        </div>
      ) : (
        <div style={{position:'relative',marginBottom:8}}>
          <Search size={14} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--c-text3)',pointerEvents:'none'}}/>
          <input type="text" placeholder="Sök portnamn eller kund…" value={sok} onChange={e=>setSok(e.target.value)}
            style={{...INP,paddingLeft:32}}/>
          {hits.length>0&&(
            <div style={{position:'absolute',top:'100%',left:0,right:0,zIndex:50,background:'var(--c-surface)',border:'1px solid var(--c-border)',borderRadius:9,boxShadow:'0 4px 16px rgba(0,0,0,0.12)',marginTop:4}}>
              {hits.map(o=>(
                <div key={o.id} onClick={()=>{setPort(o);setSok('')}} style={{padding:'10px 14px',cursor:'pointer',borderBottom:'1px solid var(--c-border)',fontSize:13}}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--c-bg)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <div style={{fontWeight:600}}>{o.namn}</div>
                  <div style={{fontSize:12,color:'var(--c-text2)'}}>{o.kund} · {o.typ}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <label style={LBL}>Datum</label>
      <input type="date" value={datum} onChange={e=>setDatum(e.target.value)} style={{...INP,colorScheme:'light'}}/>
      <label style={LBL}>Notering</label>
      <textarea value={notering} onChange={e=>setNotering(e.target.value)} rows={2} placeholder="Vad ska göras…" style={{...INP,resize:'vertical'}}/>
      <div style={{display:'flex',gap:8,marginTop:14}}>
        <button className="btn btn-primary" onClick={spara} disabled={sparar||!datum} style={{flex:1,padding:13,fontSize:14}}>
          {sparar?'Sparar…':<><ClipboardList size={15}/> Skapa serviceorder</>}
        </button>
        <button className="btn" onClick={onAvbryt}>Avbryt</button>
      </div>
    </div>
  )
}

// ── Ny montageorder-formulär ──────────────────────────────────────────────────
function NyMontageorderForm({ kunder, namn, onSpara, onAvbryt }) {
  const [form,   setForm]   = useState({kund:'',porttyp:'Vikport',adress:'',datum_planerat:idag(),notering:''})
  const [sparar, setSparar] = useState(false)
  const set = (k,v) => setForm(p=>({...p,[k]:v}))

  const spara = async () => {
    if (!form.kund.trim()) return
    setSparar(true)
    await onSpara({
      nr: genNr(), status: 'planerad', tekniker: namn,
      kund: form.kund, porttyp: form.porttyp, adress: form.adress.trim(),
      datum_planerat: form.datum_planerat, notering: form.notering.trim(),
    })
    setSparar(false)
  }

  return (
    <div className="card" style={{marginBottom:16}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <div style={{fontWeight:600,fontSize:15}}>Ny montageorder</div>
        <button className="btn" onClick={onAvbryt} style={{padding:'4px 8px'}}><X size={14}/></button>
      </div>
      <label style={LBL}>Kund *</label>
      {kunder.length>0
        ? <select value={form.kund} onChange={e=>set('kund',e.target.value)} style={INP}>
            <option value="">– Välj kund –</option>
            {kunder.map(k=><option key={k.id} value={k.namn}>{k.namn}</option>)}
          </select>
        : <input type="text" value={form.kund} onChange={e=>set('kund',e.target.value)} placeholder="Kundnamn" style={INP}/>
      }
      <label style={LBL}>Porttyp</label>
      <select value={form.porttyp} onChange={e=>set('porttyp',e.target.value)} style={INP}>
        {PORT_TYPER.map(t=><option key={t}>{t}</option>)}
      </select>
      <label style={LBL}>Adress</label>
      <input type="text" value={form.adress} onChange={e=>set('adress',e.target.value)} placeholder="Leveransadress…" style={INP}/>
      <label style={LBL}>Planerat datum</label>
      <input type="date" value={form.datum_planerat} onChange={e=>set('datum_planerat',e.target.value)} style={{...INP,colorScheme:'light'}}/>
      <label style={LBL}>Notering</label>
      <textarea value={form.notering} onChange={e=>set('notering',e.target.value)} rows={2} placeholder="Specifikationer, önskemål…" style={{...INP,resize:'vertical'}}/>
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
  const [form,   setForm]   = useState({typ:'Vikport',namn:'',kund:kunder[0]?.namn||'',fabrikat:'',ar:new Date().getFullYear(),adress:'',serviceIntervall:'12'})
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
      adress:form.adress.trim(), ordernummer:'', serienummer:'',
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
function ServiceProtokollFormular({ port, namn, onSlutfor, onBack }) {
  const punkter = protokollPunkter[port?.typ] || []
  const [statuses,setSt]  = useState({})
  const [noter,   setNot] = useState({})
  const [sig,     setSig] = useState(null)
  const [sparar,  setSparar] = useState(false)
  const g=Object.values(statuses).filter(s=>s==='G').length,j=Object.values(statuses).filter(s=>s==='J').length,a=Object.values(statuses).filter(s=>s==='A').length
  const ifyllda=g+j+a,total=punkter.filter(p=>!String(p).startsWith('## ')).length,pct=total>0?Math.round(ifyllda/total*100):0
  const godkannAlla=()=>{ const n={}; punkter.forEach((p,i)=>{if(!String(p).startsWith('## '))n[i]='G'}); setSt(n) }
  const slutfor=async()=>{ setSparar(true); await onSlutfor({datum:idag(),tekniker:namn,statuses,noteringar:noter,signatur:sig,g,j,a,portTyp:port?.typ,portNamn:port?.namn,kund:port?.kund}); setSparar(false) }
  let nr=0
  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
        <button className="btn" onClick={onBack} style={{padding:'8px 12px',display:'flex',alignItems:'center',gap:5}}><ChevronLeft size={16}/> Tillbaka</button>
        <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600}}>{port?.namn}</div><div style={{fontSize:12,color:'var(--c-text2)'}}>Serviceprotokoll · {port?.typ}</div></div>
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
      <div className="card" style={{marginBottom:80}}>
        <div style={{fontSize:13,fontWeight:600,marginBottom:10}}>Signatur tekniker</div>
        <SignaturPad onChange={setSig}/>
        <button onClick={slutfor} disabled={sparar||ifyllda===0} style={{width:'100%',padding:16,marginTop:14,borderRadius:10,background:ifyllda===0?'var(--c-border)':'var(--c-teal)',color:ifyllda===0?'var(--c-text3)':'#fff',border:'none',fontSize:15,fontWeight:700,cursor:ifyllda===0?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
          <CheckCircle size={18}/> {sparar?'Sparar…':'Slutför serviceprotokoll'}
        </button>
      </div>
    </div>
  )
}

// ── ServiceorderDetalj ────────────────────────────────────────────────────────
function ServiceorderDetalj({ order, objekt, namn, onUppdatera, onUppdateraObjekt, onBack }) {
  const [vy,setVy]=useState('info')
  const port=(order.objekt_ids||[]).map(id=>objekt.find(o=>o.id===id)).filter(Boolean)[0]||null
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
  if(vy==='protokoll')return(<ServiceProtokollFormular port={port} namn={namn} onSlutfor={hanteraSlutfort} onBack={()=>setVy('info')}/>)
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
      </div>
      {port&&(port.historik||[]).filter(h=>h.typ!=='montering').slice(-2).reverse().map((h,i)=>(
        <div key={i} className="card" style={{marginBottom:8,padding:'10px 14px',background:'var(--c-bg)',fontSize:12}}>
          <div style={{color:'var(--c-text3)',marginBottom:2}}>Tidigare service</div>
          <div style={{fontWeight:500}}>{h.datum} · {h.tekniker||'–'}</div>
          <div style={{marginTop:2}}><span style={{color:'var(--c-teal)'}}>✓{h.g||0} </span>{(h.j||0)>0&&<span style={{color:'var(--c-amber)'}}>⚠{h.j} </span>}{(h.a||0)>0&&<span style={{color:'var(--c-red)'}}>✗{h.a}</span>}</div>
        </div>
      ))}
      {order.status!=='avslutad'&&(
        <button onClick={()=>port?setVy('protokoll'):alert('Ingen port kopplad.')} style={{width:'100%',padding:16,borderRadius:12,background:'var(--c-blue)',color:'#fff',border:'none',fontSize:15,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginBottom:80}}>
          <FileText size={18}/> Starta serviceprotokoll
        </button>
      )}
    </div>
  )
}

// ── MontageFormular (3 steg) ──────────────────────────────────────────────────
function MontageFormular({ order, namn, onSlutfor, onBack }) {
  const porttyp=order.porttyp||order.portTyp||'Vikport'
  const egP=EGENKONTROLL[porttyp]||EGENKONTROLL['Vikport']||[]
  const [steg,setSteg]=useState(1)
  const [eg,setEg]=useState({}); const [egN,setEgN]=useState({})
  const [risk,setRisk]=useState({}); const [riskN,setRiskN]=useState({})
  const [sig,setSig]=useState(null); const [godk,setGodk]=useState('godkand')
  const [sparar,setSparar]=useState(false)
  const slutfor=async()=>{ setSparar(true); await onSlutfor({datum:idag(),tekniker:namn,portTyp:porttyp,kund:order.kund,adress:order.adress||'',egenkontroll:eg,egenNoteringar:egN,egenRisker:[],riskKontroll:risk,riskNoteringar:riskN,signatur:sig,godkannande:godk,ok:Object.values(eg).filter(s=>s==='OK').length,ej:Object.values(eg).filter(s=>s==='EJ').length,na:Object.values(eg).filter(s=>s==='NA').length}); setSparar(false) }
  const STEG_LBL=['','Egenkontroll','Riskbedömning','Signatur']
  return(
    <div>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
        <button className="btn" onClick={steg===1?onBack:()=>setSteg(s=>s-1)} style={{padding:'8px 12px',display:'flex',alignItems:'center',gap:5}}><ChevronLeft size={16}/>{steg===1?'Avbryt':'Tillbaka'}</button>
        <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600}}>{STEG_LBL[steg]}</div><div style={{fontSize:12,color:'var(--c-text2)'}}>Steg {steg}/3 · {porttyp}</div></div>
      </div>
      <div style={{display:'flex',gap:4,marginBottom:16}}>{[1,2,3].map(s=><div key={s} style={{flex:1,height:5,borderRadius:3,background:s<=steg?'var(--c-blue)':'var(--c-border)',transition:'background 0.2s'}}/>)}</div>
      {steg===1&&(<div>
        {egP.map((p,i)=>{ const s=eg[i]; return(<div key={i} className="card" style={{marginBottom:8,padding:'12px 14px'}}>
          <div style={{fontSize:13,marginBottom:10,lineHeight:1.4}}><span style={{color:'var(--c-text3)',marginRight:6}}>{i+1}.</span>{p}</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6}}>
            {[{id:'OK',label:'✓ OK',bg:'var(--c-teal-bg)',txt:'var(--c-teal-text)',border:'var(--c-teal)'},{id:'EJ',label:'✗ Avvikelse',bg:'var(--c-red-bg)',txt:'var(--c-red-text)',border:'var(--c-red)'},{id:'NA',label:'– Ej tillämp',bg:'#f0eeeb',txt:'#666',border:'#ccc'}].map(({id,label,bg,txt,border})=>(
              <button key={id} onClick={()=>setEg(prev=>({...prev,[i]:s===id?undefined:id}))} style={{padding:'11px 4px',borderRadius:8,fontSize:11,fontWeight:600,cursor:'pointer',border:`2px solid ${s===id?border:'var(--c-border)'}`,background:s===id?bg:'transparent',color:s===id?txt:'var(--c-text3)'}}>{label}</button>
            ))}
          </div>
          {s==='EJ'&&<input type="text" placeholder="Beskriv avvikelsen…" value={egN[i]||''} onChange={e=>setEgN(prev=>({...prev,[i]:e.target.value}))} style={{marginTop:8,width:'100%',padding:'8px 10px',fontSize:13,border:'1px solid var(--c-border)',borderRadius:8,background:'var(--c-bg)',color:'var(--c-text)',boxSizing:'border-box'}}/>}
        </div>)})}
        <button onClick={()=>setSteg(2)} style={{width:'100%',padding:16,borderRadius:12,background:'var(--c-blue)',color:'#fff',border:'none',fontSize:15,fontWeight:700,cursor:'pointer',marginBottom:80}}>Nästa: Riskbedömning →</button>
      </div>)}
      {steg===2&&(<div>
        {RISKPUNKTER.map((p,i)=>{ const s=risk[i]; return(<div key={i} className="card" style={{marginBottom:8,padding:'12px 14px'}}>
          <div style={{fontSize:13,marginBottom:10,lineHeight:1.5}}><span style={{color:'var(--c-text3)',marginRight:6}}>{i+1}.</span>{p}</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6}}>
            {RISK_STATUS.map(({id,label,bg,txt,border})=>(
              <button key={id} onClick={()=>setRisk(prev=>({...prev,[i]:s===id?undefined:id}))} style={{padding:'11px 4px',borderRadius:8,fontSize:11,fontWeight:600,cursor:'pointer',border:`2px solid ${s===id?border:'var(--c-border)'}`,background:s===id?bg:'transparent',color:s===id?txt:'var(--c-text3)'}}>{label}</button>
            ))}
          </div>
          {s==='atgard'&&<input type="text" placeholder="Beskriv åtgärd…" value={riskN[i]||''} onChange={e=>setRiskN(prev=>({...prev,[i]:e.target.value}))} style={{marginTop:8,width:'100%',padding:'8px 10px',fontSize:13,border:'1px solid var(--c-border)',borderRadius:8,background:'var(--c-bg)',color:'var(--c-text)',boxSizing:'border-box'}}/>}
        </div>)})}
        <button onClick={()=>setSteg(3)} style={{width:'100%',padding:16,borderRadius:12,background:'var(--c-blue)',color:'#fff',border:'none',fontSize:15,fontWeight:700,cursor:'pointer',marginBottom:80}}>Nästa: Signatur →</button>
      </div>)}
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
        <button onClick={slutfor} disabled={sparar} style={{width:'100%',padding:16,borderRadius:12,background:'var(--c-teal)',color:'#fff',border:'none',fontSize:15,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginBottom:80}}>
          <CheckCircle size={18}/> {sparar?'Sparar…':'Slutför montageorder'}
        </button>
      </div>)}
    </div>
  )
}

// ── MontageDetalj ─────────────────────────────────────────────────────────────
function MontageDetalj({ order, objekt, namn, onUppdatera, onUppdateraObjekt, onBack }) {
  const [vy,setVy]=useState('info')
  const hanteraSlutfort=async(prot)=>{
    const now=idag(); await onUppdatera(order.id,{status:'utford',protokoll_data:prot,datum_utfort:now})
    if(order.objekt_id){const port=objekt.find(o=>o.id===order.objekt_id);if(port){const nyH=[...(port.historik||[]),{typ:'montering',datum:now,tekniker:namn,portTyp:order.porttyp||'',kund:order.kund}];await onUppdateraObjekt(port.id,{historik:nyH})}}
    setVy('klar')
  }
  if(vy==='formular')return(<MontageFormular order={order} namn={namn} onSlutfor={hanteraSlutfort} onBack={()=>setVy('info')}/>)
  if(vy==='klar')return(<div style={{textAlign:'center',padding:'48px 20px'}}><CheckCircle size={56} color="var(--c-teal)" style={{margin:'0 auto 16px',display:'block'}}/><div style={{fontSize:18,fontWeight:700,color:'var(--c-teal-text)',marginBottom:8}}>Montage slutfört!</div><div style={{fontSize:14,color:'var(--c-text2)',marginBottom:24}}>{order.kund} · {idag()}</div><button className="btn btn-primary" onClick={onBack} style={{width:'100%',padding:14,fontSize:15}}>← Tillbaka</button></div>)
  return(
    <div>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
        <button className="btn" onClick={onBack} style={{padding:'8px 12px',display:'flex',alignItems:'center',gap:5}}><ChevronLeft size={16}/> Tillbaka</button>
        <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600}}>Montage #{order.nr||'–'}</div><div style={{fontSize:12,color:'var(--c-text2)'}}>{order.kund}</div></div>
        <span className={`badge ${order.status==='utford'?'badge-teal':order.status==='pagAr'?'badge-amber':'badge-blue'}`}>{order.status==='utford'?'Utförd':order.status==='pagAr'?'Pågår':'Planerad'}</span>
      </div>
      <div className="card" style={{marginBottom:12}}>
        {[['Kund',order.kund],['Porttyp',order.porttyp||order.portTyp],['Adress',order.adress],['Planerat datum',order.datum_planerat||order.datum],order.notering&&['Notering',order.notering]].filter(Boolean).map(([l,v])=>v&&(
          <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid var(--c-border)',fontSize:13}}>
            <span style={{color:'var(--c-text2)'}}>{l}</span><span style={{fontWeight:500,textAlign:'right',maxWidth:'60%'}}>{v}</span>
          </div>
        ))}
      </div>
      {order.status!=='utford'&&(
        <button onClick={()=>setVy('formular')} style={{width:'100%',padding:16,borderRadius:12,background:'var(--c-blue)',color:'#fff',border:'none',fontSize:15,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginBottom:80}}>
          <Wrench size={18}/> Starta monteringsprotokoll
        </button>
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
        {[['Porttyp',vald.typ],['Fabrikat',vald.fabrikat],['År',vald.ar],['Adress',vald.adress||vald.plats],['Senaste service',vald.senaste||'–'],['Nästa service',vald.nasta||'–']].map(([l,v])=>v&&(
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
  onLaggTillBokning,
  onTaBortBokning,
  onLoggaUt,
}) {
  const [flik,             setFlik]             = useState('idag')
  const [valdServiceorder, setValdServiceorder] = useState(null)
  const [valdMontage,      setValdMontage]      = useState(null)
  const [arendeFilter,     setArendeFilter]     = useState('mina')
  const [visaNyService,    setVisaNyService]    = useState(false)
  const [visaNyMontage,    setVisaNyMontage]    = useState(false)

  const todayStr = idag()

  const dagensBokningar = (bokningar[todayStr]||[])
    .filter(b=>!namn||(Array.isArray(b.tek)?b.tek.includes(namn):b.tek===namn))
    .sort((a,b)=>(a.tid||'').localeCompare(b.tid||''))

  const alleArenden   = arenden.filter(a=>!a.arkiverad&&a.status!=='atgardad')
  const minaArenden   = alleArenden.filter(a=>a.tekniker===namn)
  const otiArenden    = alleArenden.filter(a=>!a.tekniker)
  const visadeArenden = arendeFilter==='mina'?minaArenden:arendeFilter==='otilldelade'?otiArenden:alleArenden
  const sortedArenden = [...visadeArenden].sort((a,b)=>({akut:0,hog:1,normal:2}[a.prioritet]??2)-({akut:0,hog:1,normal:2}[b.prioritet]??2))

  const minaServiceordrar = serviceorderArr.filter(o=>o.tekniker===namn&&o.status!=='avslutad').sort((a,b)=>(a.datum||'').localeCompare(b.datum||''))
  const minaMontageordrar = montageorder.filter(m=>m.tekniker===namn&&m.status!=='utford').sort((a,b)=>((a.datum_planerat||a.datum)||'').localeCompare((b.datum_planerat||b.datum)||''))
  const klaraArenden = arenden.filter(a=>a.tekniker===namn&&a.status==='atgardad').slice(-5).reverse()

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
            <div style={{background:'var(--c-red-bg)',border:'1px solid var(--c-red)',borderRadius:10,padding:'10px 14px',marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
              <AlertCircle size={16} color="var(--c-red)"/>
              <span style={{fontSize:13,fontWeight:600,color:'var(--c-red-text)'}}>{minaArenden.filter(a=>a.prioritet==='akut').length} akuta ärenden kräver åtgärd</span>
            </div>
          )}
          {(minaServiceordrar.length>0||minaMontageordrar.length>0)&&(
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
              {minaServiceordrar.length>0&&<div onClick={()=>setFlik('service')} className="card" style={{cursor:'pointer',padding:16,textAlign:'center'}}><ClipboardList size={26} color="var(--c-blue)" style={{margin:'0 auto 6px',display:'block'}}/><div style={{fontSize:22,fontWeight:700}}>{minaServiceordrar.length}</div><div style={{fontSize:12,color:'var(--c-text2)'}}>Serviceordrar</div></div>}
              {minaMontageordrar.length>0&&<div onClick={()=>setFlik('montage')} className="card" style={{cursor:'pointer',padding:16,textAlign:'center'}}><Wrench size={26} color="var(--c-amber)" style={{margin:'0 auto 6px',display:'block'}}/><div style={{fontSize:22,fontWeight:700}}>{minaMontageordrar.length}</div><div style={{fontSize:12,color:'var(--c-text2)'}}>Montageordrar</div></div>}
            </div>
          )}
          {dagensBokningar.length===0?(<div className="card" style={{textAlign:'center',padding:'40px 20px'}}><Clock size={36} color="var(--c-text3)" style={{margin:'0 auto 12px',display:'block'}}/><div style={{fontSize:14,color:'var(--c-text2)'}}>Inga bokningar idag</div></div>
          ):dagensBokningar.map((b,i)=>(
            <div key={i} className="card" style={{display:'flex',gap:14,alignItems:'center',padding:'14px 16px',marginBottom:8}}>
              <div style={{background:'var(--c-blue)',color:'#fff',borderRadius:10,padding:'8px 10px',fontSize:14,fontWeight:700,flexShrink:0,minWidth:52,textAlign:'center'}}>{b.tid||'–'}</div>
              <div><div style={{fontSize:14,fontWeight:600}}>{b.namn}</div>{b.kund&&<div style={{fontSize:13,color:'var(--c-text2)'}}>{b.kund}</div>}</div>
            </div>
          ))}
        </div>
      )

      case 'felanmalan': return(
        <div>
          <h1 style={{fontSize:22,fontWeight:700,marginBottom:10}}>Felanmälningar</h1>
          {/* Filter-knappar */}
          <div style={{display:'flex',gap:6,marginBottom:14}}>
            {[['mina',`Mina (${minaArenden.length})`],['alla',`Alla (${alleArenden.length})`],['otilldelade',`Otilldelade (${otiArenden.length})`]].map(([id,lab])=>(
              <button key={id} onClick={()=>setArendeFilter(id)} style={{flex:1,padding:'8px 4px',borderRadius:9,fontSize:12,fontWeight:600,cursor:'pointer',border:`1.5px solid ${arendeFilter===id?'var(--c-navy, #1C3461)':'var(--c-border)'}`,background:arendeFilter===id?'var(--c-navy, #1C3461)':'transparent',color:arendeFilter===id?'#fff':'var(--c-text2)',whiteSpace:'nowrap'}}>{lab}</button>
            ))}
          </div>
          {sortedArenden.length===0?(
            <div className="card" style={{textAlign:'center',padding:'48px 20px'}}><CheckCircle size={40} color="var(--c-teal)" style={{margin:'0 auto 12px',display:'block'}}/><div style={{fontSize:15,fontWeight:500,color:'var(--c-teal-text)'}}>Inga {arendeFilter==='mina'?'tilldelade':arendeFilter==='otilldelade'?'otilldelade':'öppna'} ärenden!</div></div>
          ):<div style={{display:'flex',flexDirection:'column',gap:10}}>{sortedArenden.map(a=><ArendeKort key={a.id} a={a} namn={namn} onUppdatera={onUppdateraArende}/>)}</div>}
          {arendeFilter==='mina'&&klaraArenden.length>0&&(
            <div style={{marginTop:28}}>
              <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'var(--c-text3)',marginBottom:8}}>Senast åtgärdade</div>
              {klaraArenden.map(a=>(
                <div key={a.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',background:'var(--c-surface)',borderRadius:10,border:'1px solid var(--c-border)',opacity:0.65,marginBottom:6}}>
                  <div><div style={{fontSize:13,fontWeight:500}}>#{a.nr} · {a.kund}</div><div style={{fontSize:12,color:'var(--c-text2)'}}>{a.feltyp} · {a.datum}</div></div>
                  <span className="badge badge-teal">Klar</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )

      case 'service':
        if(valdServiceorder)return(<ServiceorderDetalj order={valdServiceorder} objekt={objekt} namn={namn} onUppdatera={async(id,ch)=>{await onUppdateraServiceorder(id,ch);setValdServiceorder(p=>({...p,...ch}))}} onUppdateraObjekt={onUppdateraObjekt} onBack={()=>setValdServiceorder(null)}/>)
        return(
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <h1 style={{fontSize:22,fontWeight:700,margin:0}}>Serviceordrar</h1>
              <button onClick={()=>setVisaNyService(v=>!v)} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',fontSize:13,fontWeight:600,borderRadius:9,cursor:'pointer',border:'1.5px solid var(--c-blue)',background:visaNyService?'var(--c-blue)':'transparent',color:visaNyService?'#fff':'var(--c-blue)'}}>
                {visaNyService?<X size={14}/>:<Plus size={14}/>} Ny
              </button>
            </div>
            {visaNyService&&<NyServiceorderForm objekt={objekt} kunder={kunder} namn={namn} onSpara={async(o)=>{await onLaggTillServiceorder(o);setVisaNyService(false)}} onAvbryt={()=>setVisaNyService(false)}/>}
            <p style={{color:'var(--c-text2)',fontSize:14,marginBottom:12}}>{minaServiceordrar.length===0?'Inga öppna serviceordrar':`${minaServiceordrar.length} öppna`}</p>
            {minaServiceordrar.length===0?(<div className="card" style={{textAlign:'center',padding:'40px 20px'}}><CheckCircle size={40} color="var(--c-teal)" style={{margin:'0 auto 12px',display:'block'}}/><div style={{fontSize:15,fontWeight:500,color:'var(--c-teal-text)'}}>Inga öppna serviceordrar!</div></div>
            ):minaServiceordrar.map(o=>{ const port=(o.objekt_ids||[]).map(id=>objekt.find(p=>p.id===id)).filter(Boolean)[0]; return(
              <div key={o.id} className="card" style={{marginBottom:10,cursor:'pointer',borderLeft:'4px solid var(--c-blue)'}} onClick={()=>setValdServiceorder(o)}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                  <div style={{flex:1}}><div style={{fontSize:15,fontWeight:600}}>{o.kund}</div>{port&&<div style={{fontSize:13,color:'var(--c-text2)'}}>{port.namn} · {port.typ}</div>}<div style={{fontSize:12,color:'var(--c-text3)',marginTop:4}}>📅 {o.datum||'–'}</div></div>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:6}}><span className={`badge ${o.status==='planerad'?'badge-blue':'badge-amber'}`}>{o.status==='planerad'?'Planerad':'Pågår'}</span><ChevronRight size={16} color="var(--c-text3)"/></div>
                </div>
              </div>
            )})}
          </div>
        )

      case 'montage':
        if(valdMontage)return(<MontageDetalj order={valdMontage} objekt={objekt} namn={namn} onUppdatera={async(id,ch)=>{await onUppdateraMontageorder(id,ch);setValdMontage(p=>({...p,...ch}))}} onUppdateraObjekt={onUppdateraObjekt} onBack={()=>setValdMontage(null)}/>)
        return(
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <h1 style={{fontSize:22,fontWeight:700,margin:0}}>Montageordrar</h1>
              <button onClick={()=>setVisaNyMontage(v=>!v)} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',fontSize:13,fontWeight:600,borderRadius:9,cursor:'pointer',border:'1.5px solid var(--c-amber)',background:visaNyMontage?'var(--c-amber)':'transparent',color:visaNyMontage?'#fff':'var(--c-amber)'}}>
                {visaNyMontage?<X size={14}/>:<Plus size={14}/>} Ny
              </button>
            </div>
            {visaNyMontage&&<NyMontageorderForm kunder={kunder} namn={namn} onSpara={async(m)=>{await onLaggTillMontageorder(m);setVisaNyMontage(false)}} onAvbryt={()=>setVisaNyMontage(false)}/>}
            <p style={{color:'var(--c-text2)',fontSize:14,marginBottom:12}}>{minaMontageordrar.length===0?'Inga öppna montageordrar':`${minaMontageordrar.length} öppna`}</p>
            {minaMontageordrar.length===0?(<div className="card" style={{textAlign:'center',padding:'40px 20px'}}><CheckCircle size={40} color="var(--c-teal)" style={{margin:'0 auto 12px',display:'block'}}/><div style={{fontSize:15,fontWeight:500,color:'var(--c-teal-text)'}}>Inga öppna montageordrar!</div></div>
            ):minaMontageordrar.map(m=>(
              <div key={m.id} className="card" style={{marginBottom:10,cursor:'pointer',borderLeft:'4px solid var(--c-amber)'}} onClick={()=>setValdMontage(m)}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                  <div style={{flex:1}}><div style={{fontSize:15,fontWeight:600}}>{m.kund}</div><div style={{fontSize:13,color:'var(--c-text2)'}}>{m.porttyp||m.portTyp||'–'} · {m.adress||'–'}</div><div style={{fontSize:12,color:'var(--c-text3)',marginTop:4}}>📅 {m.datum_planerat||m.datum||'–'}</div></div>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:6}}><span className={`badge ${m.status==='planerad'?'badge-blue':'badge-amber'}`}>{m.status==='planerad'?'Planerad':m.status||'–'}</span><ChevronRight size={16} color="var(--c-text3)"/></div>
                </div>
              </div>
            ))}
          </div>
        )

      case 'register':
        return(<RegisterFlik objekt={objekt} kunder={kunder} fastigheter={fastigheter} onLaggTillObjekt={onLaggTillObjekt}/>)

      case 'kalender':
        return(
          <Kalender
            arenden={arenden}
            tekniker={tekniker}
            bokningar={bokningar}
            kunder={kunder}
            objekt={objekt}
            serviceorder={serviceorderArr}
            montageorder={montageorder}
            onLaggTillBokning={onLaggTillBokning}
            onTaBortBokning={onTaBortBokning}
            onNyKund={undefined}
            onNavigera={(tab)=>{
              const m={arenden:'felanmalan',serviceorder:'service',montageplanering:'montage',register:'register'}
              setFlik(m[tab]||'idag')
            }}
            onNavigeraArende={()=>setFlik('felanmalan')}
            onNavigeraObjekt={()=>setFlik('register')}
            onNavigeraServiceorder={()=>setFlik('service')}
            onNavigeraMontage={()=>setFlik('montage')}
          />
        )

      default: return null
    }
  }

  return (
    <div style={{minHeight:'100vh',background:'var(--c-bg)',display:'flex',flexDirection:'column',paddingBottom:70}}>
      {/* Header */}
      <div style={{background:'#1C3461',padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <img src={logo} alt="logo" style={{height:32}}/>
          {namn&&<span style={{color:'rgba(255,255,255,0.65)',fontSize:13,borderLeft:'1px solid rgba(255,255,255,0.2)',paddingLeft:12}}>{namn}</span>}
        </div>
        <button onClick={onLoggaUt} style={{background:'none',border:'1px solid rgba(255,255,255,0.2)',color:'rgba(255,255,255,0.65)',borderRadius:7,padding:'6px 12px',fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
          <LogOut size={14}/> Logga ut
        </button>
      </div>

      {/* Innehåll */}
      <div style={{flex:1,padding: flik==='kalender' ? '12px 8px' : '20px 16px',overflowY:'auto'}}>
        <div style={{maxWidth: flik==='kalender' ? '100%' : 560,margin:'0 auto'}}>{renderContent()}</div>
      </div>

      {/* Bottom nav – 6 flikar */}
      <div style={{position:'fixed',bottom:0,left:0,right:0,background:'var(--c-surface)',borderTop:'1px solid var(--c-border)',display:'flex',zIndex:100,paddingBottom:'env(safe-area-inset-bottom)'}}>
        {TABS.map(({id,icon:Icon,label,badge})=>{
          const aktiv=flik===id
          return(
            <button key={id} onClick={()=>{setFlik(id);if(id!=='service')setValdServiceorder(null);if(id!=='montage')setValdMontage(null)}}
              style={{flex:1,padding:'9px 0 7px',background:'none',border:'none',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:2,color:aktiv?'var(--c-blue)':'var(--c-text3)',position:'relative',transition:'color 0.15s'}}>
              <Icon size={19} strokeWidth={aktiv?2.3:1.8}/>
              <span style={{fontSize:8.5,fontWeight:aktiv?700:400}}>{label}</span>
              {badge>0&&<span style={{position:'absolute',top:4,right:'calc(50% - 16px)',background:'var(--c-red)',color:'#fff',fontSize:9,fontWeight:700,padding:'1px 5px',borderRadius:10,lineHeight:1.4,minWidth:16,textAlign:'center'}}>{badge}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
