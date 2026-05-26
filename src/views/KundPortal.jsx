import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import {
  LogOut, AlertCircle, CheckCircle, Clock, Building2,
  ChevronDown, ChevronUp, DoorOpen, FileText,
  ChevronRight, ChevronLeft, X, Search, MapPin,
  Phone, Mail, CalendarPlus, Shield, ShieldCheck, ShieldAlert,
  Wrench, Package, Activity, Paperclip, Sun, Moon,
} from 'lucide-react'
import logo from '../image-1779305303942.png'
import { hämtaLogoBase64, pdfHeader, pdfDoc, pdfMontageProt, öppnaPrintFönster } from '../utils/pdf.js'

// ── Konstanter ─────────────────────────────────────────────────────────────────
const PRIO_LABEL = { normal: 'Normal', hog: 'Hög', akut: 'Akut' }
const PRIO_COLOR = { normal: 'var(--c-teal)', hog: '#f59e0b', akut: 'var(--c-red)' }
const STATUS_LABEL = { ny: 'Ny', pagaende: 'Pågår', atgardad: 'Åtgärdad' }
const STATUS_COLOR = { ny: '#f59e0b', pagaende: 'var(--c-blue)', atgardad: 'var(--c-teal)' }

const CE_CFG = {
  godkand:        { label: 'CE-godkänd',        color: 'var(--c-teal)',  bg: 'var(--c-teal-bg)',  Icon: ShieldCheck  },
  avvikelse:      { label: 'CE-avvikelse',       color: 'var(--c-red)',   bg: 'var(--c-red-bg)',   Icon: ShieldAlert  },
  ej_kontrollerad:{ label: 'Ej kontrollerad',    color: 'var(--c-text3)', bg: 'var(--c-bg)',       Icon: Shield       },
}

const FÄLT = {
  fontSize: 13, padding: '8px 12px', borderRadius: 8,
  border: '1px solid var(--c-border)', background: 'var(--c-surface)',
  color: 'var(--c-text)', width: '100%', boxSizing: 'border-box', outline: 'none',
}
const BTN_PRI = {
  padding: '10px 22px', background: 'var(--c-teal)', color: '#fff',
  border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
}
const BTN_SEC = {
  padding: '10px 16px', background: 'transparent', color: 'var(--c-text2)',
  border: '1px solid var(--c-border)', borderRadius: 8, fontSize: 13, cursor: 'pointer',
}

// ── Hjälpfunktioner ────────────────────────────────────────────────────────────
const tekStr = v => Array.isArray(v) ? v.join(', ') : (v || '–')

// Räkna dagar mellan idag och ett datum
function dagarTill(datum) {
  if (!datum) return null
  const idag = new Date(); idag.setHours(0,0,0,0)
  const d    = new Date(datum + 'T00:00:00')
  return Math.round((d - idag) / 86400000)
}

// Beräkna garantistatus
function garantiStatus(installationsdatum, garantiAr) {
  if (!installationsdatum || !garantiAr) return null
  const inst  = new Date(installationsdatum + 'T00:00:00')
  const utgång = new Date(inst)
  utgång.setFullYear(utgång.getFullYear() + parseInt(garantiAr || 2))
  const dagar = dagarTill(utgång.toISOString().slice(0,10))
  return { utgångsdatum: utgång.toISOString().slice(0,10), dagar, giltig: dagar > 0 }
}

// ── PDF: serviceprotokoll ──────────────────────────────────────────────────────
async function öppnaServicePDF(so, portNamn) {
  const win = window.open('about:blank', '_blank')
  if (!win) { alert('Tillåt popup-fönster i din webbläsare för att visa PDF.'); return }
  win.document.write('<div style="padding:40px;font-family:sans-serif;color:#555;text-align:center">Laddar protokoll…</div>')

  const logoB64 = await hämtaLogoBase64()
  const prot    = so.protokoll || {}
  const statuses   = prot.statuses || {}
  const noteringar = prot.noteringar || {}
  const hasNew     = Object.keys(statuses).length > 0
  let rows
  if (hasNew) {
    rows = Object.entries(statuses).map(([k, v]) => {
      const cls = v === 'G' ? 's-ok' : v === 'J' ? 's-ka' : 's-ej'
      const lbl = v === 'G' ? '✓ Godkänd' : v === 'J' ? '✗ Avvikelse' : '–'
      const not = noteringar[k] || ''
      return `<tr><td>${parseInt(k)+1}.</td><td class="${cls}">${lbl}</td><td style="color:#666">${not}</td></tr>`
    }).join('')
  } else {
    const pts = Object.entries(prot).filter(([k]) => !['datum','tekniker','signatur','signaturKund','riskKontroll','riskNoteringar','egenRisker','ansvariga','g','j','a','portTyp','portNamn','kund','notering','statuses','noteringar'].includes(k))
    rows = pts.length
      ? pts.map(([k, v]) => {
          const cls = v === 'OK' ? 's-ok' : v === 'EJ' ? 's-ka' : 's-af'
          const lbl = v === 'OK' ? '✓ OK' : v === 'EJ' ? '✗ Ej OK' : (v || '–')
          return `<tr><td>${k}</td><td class="${cls}">${lbl}</td><td></td></tr>`
        }).join('')
      : '<tr><td colspan="3" style="color:#888">Inga protokollpunkter</td></tr>'
  }

  const sig1 = prot.signatur || so.signatur_tekniker
  const sig2 = prot.signaturKund || so.signatur_kund
  const sigHtml = (sig1 || sig2) ? `<div class="sig-section">
    ${sig1 ? `<div class="sig-box"><div class="sig-label">Tekniker</div><img src="${sig1}"/><div class="sig-date">${prot.datum||so.datum||''}</div></div>` : ''}
    ${sig2 ? `<div class="sig-box"><div class="sig-label">Kund</div><img src="${sig2}"/><div class="sig-date">${prot.datum||so.datum||''}</div></div>` : ''}
  </div>` : ''

  const notHtml = (prot.notering || so.notering)
    ? `<div class="slbl">Notering</div><div class="desc-box">${prot.notering||so.notering}</div>` : ''

  const body = `
    ${pdfHeader(logoB64, 'Serviceprotokoll', portNamn || so.kund || '', prot.datum || so.datum || '')}
    <div class="slbl">Information</div>
    <div class="meta">
      <div class="cell"><div class="lbl">Kund</div><div class="val">${so.kund||'–'}</div></div>
      <div class="cell"><div class="lbl">Fastighet</div><div class="val">${so.fastighet_namn||'–'}</div></div>
      <div class="cell"><div class="lbl">Datum</div><div class="val">${prot.datum||so.datum||'–'}</div></div>
      <div class="cell"><div class="lbl">Tekniker</div><div class="val">${tekStr(prot.tekniker||so.tekniker)}</div></div>
    </div>
    <div class="slbl">Kontrollpunkter</div>
    <table><thead><tr><th>#</th><th>Status</th><th>Notering</th></tr></thead><tbody>${rows}</tbody></table>
    ${notHtml}${sigHtml}
  `
  win.document.open()
  win.document.write(pdfDoc('Serviceprotokoll', body))
  win.document.close()
  setTimeout(() => win.print(), 400)
}

// ── PDF: montageprotokoll ──────────────────────────────────────────────────────
async function öppnaMontagePDF(order) {
  if (!order.protokoll_data) return
  const win = window.open('about:blank', '_blank')
  if (!win) { alert('Tillåt popup-fönster i din webbläsare för att visa PDF.'); return }
  win.document.write('<div style="padding:40px;font-family:sans-serif;color:#555;text-align:center">Laddar protokoll…</div>')

  const logo64 = await hämtaLogoBase64()
  const html = pdfMontageProt(order.protokoll_data, logo64, {}, null)
  win.document.open()
  win.document.write(html)
  win.document.close()
  setTimeout(() => win.print(), 400)
}

// ── Responsiv hook ─────────────────────────────────────────────────────────────
function useBredd() {
  const [w, setW] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 800)
  useEffect(() => {
    const upd = () => setW(window.innerWidth)
    window.addEventListener('resize', upd)
    return () => window.removeEventListener('resize', upd)
  }, [])
  return w
}

// ── Servicehistorik tidslinje ──────────────────────────────────────────────────
function Tidslinje({ arenden, serviceorder, montageorder, portId, portNamn, portAdress, mob, filter = 'alla' }) {
  // Bygg en kombinerad händelselogg för denna port
  const alla = []

  // Montageorder (installation)
  montageorder.forEach(mo => {
    const datum = mo.protokoll_data?.datum || mo.created_at?.slice(0,10) || ''
    alla.push({
      typ: 'montering',
      datum,
      rubrik: 'Installation',
      detalj: mo.protokoll_data?.portTyp ? `${mo.protokoll_data.portTyp}` : '',
      tekniker: mo.protokoll_data?.tekniker || tekStr(mo.tekniker),
      color: 'var(--c-teal)',
      bg: 'var(--c-teal-bg)',
      Icon: Package,
    })
  })

  // Serviceorder (genomförda)
  serviceorder.forEach(so => {
    if (!((so.objekt_ids || []).includes(portId) || so.fastighet_namn === portAdress)) return
    alla.push({
      typ: 'service',
      datum: so.datum || so.protokoll?.datum || '',
      rubrik: 'Service utförd',
      detalj: so.notering || so.protokoll?.notering || '',
      tekniker: tekStr(so.tekniker || so.protokoll?.tekniker),
      color: 'var(--c-blue)',
      bg: 'var(--c-blue-bg)',
      Icon: Wrench,
    })
  })

  // Ärenden (felanmälningar)
  arenden.forEach(a => {
    if (a.objekt_id !== portId && a.namn !== portNamn) return
    alla.push({
      typ: 'arende',
      datum: a.datum || '',
      rubrik: a.feltyp || a.typ || 'Felanmälan',
      detalj: a.notering || a.beskrivning || '',
      status: a.status,
      color: a.status === 'atgardad' ? 'var(--c-text3)' : 'var(--c-amber)',
      bg: a.status === 'atgardad' ? 'var(--c-bg)' : 'var(--c-amber-bg)',
      Icon: AlertCircle,
    })
  })

  // Sortera efter datum (nyast först)
  alla.sort((a, b) => (b.datum || '').localeCompare(a.datum || ''))

  // Filtrera
  const händelser = filter === 'alla' ? alla
    : filter === 'service' ? alla.filter(h => h.typ === 'service' || h.typ === 'montering')
    : alla.filter(h => h.typ === 'arende')

  if (händelser.length === 0) return (
    <div style={{ padding:'16px', textAlign:'center', color:'var(--c-text3)', fontSize:13 }}>
      {filter === 'alla' ? 'Ingen servicehistorik registrerad ännu.' : 'Inga händelser för valt filter.'}
    </div>
  )

  return (
    <div className="timeline" style={{ padding:'4px 0' }}>
      {händelser.map((h, i) => (
        <div key={i} className="tl-row">
          <div className="tl-left">
            <div className="tl-dot" style={{ background: h.color }} />
            <div className="tl-line" />
          </div>
          <div style={{ flex:1, paddingBottom:2 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
              <div style={{ width:22, height:22, borderRadius:6, background:h.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <h.Icon size={12} color={h.color} />
              </div>
              <span className="tl-title" style={{ color:'var(--c-text)' }}>{h.rubrik}</span>
              {h.status && (
                <span style={{ fontSize:10, padding:'1px 6px', borderRadius:4, background:(STATUS_COLOR[h.status]||'#888')+'22', color:STATUS_COLOR[h.status]||'#888', fontWeight:600 }}>
                  {STATUS_LABEL[h.status]||h.status}
                </span>
              )}
            </div>
            {h.tekniker && <div className="tl-sub">👤 {h.tekniker}</div>}
            {h.detalj && <div className="tl-sub" style={{ marginTop:2 }}>{h.detalj.slice(0,120)}{h.detalj.length>120?'…':''}</div>}
            <div className="tl-time">{h.datum || '–'}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Huvud ──────────────────────────────────────────────────────────────────────
export default function KundPortal({ user, onLoggaUt, darkMode: darkModeProp, onToggleDark }) {
  const bredd = useBredd()
  const mob   = bredd < 480

  // Läs mörkt läge från document (globalt tillstånd)
  const [darkMode, setDarkMode] = useState(() =>
    document.documentElement.getAttribute('data-theme') === 'dark'
  )
  const toggleDark = () => {
    if (onToggleDark) {
      onToggleDark()
    } else {
      const next = !darkMode
      document.documentElement.setAttribute('data-theme', next ? 'dark' : '')
      localStorage.setItem('theme', next ? 'dark' : 'light')
      setDarkMode(next)
    }
  }
  // Synka om parent ändrar
  useEffect(() => {
    if (darkModeProp !== undefined) setDarkMode(darkModeProp)
  }, [darkModeProp])

  const [kund,         setKund]         = useState(null)
  const [fastigheter,  setFastigheter]  = useState([])
  const [portar,       setPortar]       = useState([])
  const [arenden,      setArenden]      = useState([])
  const [serviceorder, setServiceorder] = useState([])
  const [montageorder, setMontageorder] = useState([])
  const [foretagInfo,  setForetagInfo]  = useState({})
  const [portFiler,    setPortFiler]    = useState([])
  const [laddas,       setLaddas]       = useState(true)

  // Navigation
  const [flik,          setFlik]          = useState('oversikt')
  const [valdFastighet, setValdFastighet] = useState('alla')
  const [arendeFilter,  setArendeFilter]  = useState('oppna')
  const [expanderat,    setExpanderat]    = useState(null)
  const [portDetalj,    setPortDetalj]    = useState(null)
  const [sokText,       setSokText]       = useState('')
  const [tidslinjeFilter, setTidslinjeFilter] = useState('alla')

  // Felanmälan
  const [visaFel,     setVisaFel]     = useState(false)
  const [valdFelPort, setValdFelPort] = useState('')
  const [feltyp,      setFeltyp]      = useState('')
  const [prioritet,   setPrioritet]   = useState('normal')
  const [beskrivning, setBeskrivning] = useState('')
  const [sparar,      setSparar]      = useState(false)
  const [sparad,      setSparad]      = useState(false)
  const [feldMsg,     setFeldMsg]     = useState('')

  const kundId   = user.user_metadata?.kund_id
  const kundNamn = user.user_metadata?.kund_namn || ''

  // Scrolla till toppen när portdetalj öppnas/stängs
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'auto' }) }, [portDetalj])

  // ── Ladda data ───────────────────────────────────────────────────────────────
  useEffect(() => {
    async function ladda() {
      if (!kundId && !kundNamn) { setLaddas(false); return }
      let namn = kundNamn
      if (kundId) {
        const { data: k } = await supabase.from('kunder').select('*').eq('id', kundId).maybeSingle()
        if (k) { setKund(k); namn = k.namn || kundNamn }
      }
      const [fRes, oRes, aRes, soRes, moRes, cfgRes] = await Promise.all([
        supabase.from('fastigheter').select('*').eq('kund', namn).order('namn'),
        supabase.from('objekt').select('*').eq('kund', namn).order('namn'),
        supabase.from('arenden').select('*').eq('kund', namn).order('created_at', { ascending: false }),
        supabase.from('serviceorder').select('*').eq('kund', namn).eq('status', 'avslutad').order('datum', { ascending: false }),
        supabase.from('montageorder').select('*').eq('kund', namn).eq('status', 'utford').order('created_at', { ascending: false }),
        supabase.from('app_config').select('data').eq('id', 'foretag').maybeSingle(),
      ])
      if (fRes.data)  setFastigheter(fRes.data.filter(f => !f.arkiverad))
      if (oRes.data)  setPortar(oRes.data.filter(o => !o.arkiverad))
      if (aRes.data)  setArenden(aRes.data)
      if (soRes.data) setServiceorder(soRes.data)
      if (moRes.data) setMontageorder(moRes.data)
      if (cfgRes.data?.data) setForetagInfo(cfgRes.data.data)
      setLaddas(false)
    }
    ladda()
  }, [kundId, kundNamn])

  // ── Ladda filer för en port ──────────────────────────────────────────────────
  const laddaPortFiler = async (portId) => {
    try {
      const { data } = await supabase.from('port_filer').select('*').eq('objekt_id', portId).order('created_at', { ascending: false })
      if (data) setPortFiler(data)
    } catch { setPortFiler([]) }
  }

  // ── Felanmälan ───────────────────────────────────────────────────────────────
  const öppnaFelanmälan = (portId = '') => { setValdFelPort(portId); setVisaFel(true) }
  const skickaFel = async () => {
    if (!valdFelPort || !feltyp) { setFeldMsg('Välj port och feltyp.'); return }
    setSparar(true); setFeldMsg('')
    const port    = portar.find(p => p.id === valdFelPort)
    const kundnamn = kund?.namn || kundNamn
    const now = new Date()
    const { error } = await supabase.from('arenden').insert({
      namn: port?.namn || 'Okänd port', kund: kundnamn,
      objekt_id: port?.id || null, feltyp, prioritet, beskrivning,
      status: 'ny', datum: now.toISOString().slice(0, 10), nr: now.getTime(),
    })
    setSparar(false)
    if (error) { setFeldMsg('Något gick fel: ' + error.message); return }
    setSparad(true)
    setValdFelPort(''); setFeltyp(''); setBeskrivning(''); setPrioritet('normal')
    const { data } = await supabase.from('arenden').select('*').eq('kund', kundnamn).order('created_at', { ascending: false })
    if (data) setArenden(data)
    setTimeout(() => { setSparad(false); setVisaFel(false) }, 3000)
  }

  // ── Filter-hjälpare ──────────────────────────────────────────────────────────
  const filterFastighet = items => {
    if (valdFastighet === 'alla') return items
    const f = fastigheter.find(f => f.id === valdFastighet)
    if (!f) return items
    return items.filter(item =>
      item.fastighet_id === f.id || item.fastighet_namn === f.namn || item.plats === f.namn ||
      portar.filter(p => p.fastighetId === f.id || p.plats === f.namn)
             .some(p => p.id === item.objekt_id || (item.objekt_ids||[]).includes(p.id))
    )
  }
  const filterPortar = ps => valdFastighet === 'alla' ? ps
    : ps.filter(p => { const f = fastigheter.find(f => f.id === valdFastighet); return f && (p.fastighetId === f.id || p.plats === f.namn) })

  if (laddas) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--c-bg)' }}>
      <span style={{ color:'var(--c-text3)', fontSize:14 }}>Laddar…</span>
    </div>
  )

  // ── Beräknade värden ─────────────────────────────────────────────────────────
  const displayNamn  = kund?.namn || kundNamn || user.email
  const filtPortar   = filterPortar(portar)
  const filtArenden  = filterFastighet(arenden)
  const filtSO       = filterFastighet(serviceorder)
  const öppnaArenden = filtArenden.filter(a => a.status !== 'atgardad')
  const nästaService = filtPortar.flatMap(p => p.nasta ? [p.nasta] : []).sort()[0]
  const harFlerFastig = fastigheter.length > 1
  const totalDok     = filtSO.length + montageorder.length

  // Servicestatistik
  const idag = new Date().toISOString().slice(0,10)
  const ärÅr = new Date().getFullYear().toString()
  const serviceÅr   = filtSO.filter(so => (so.datum||'').startsWith(ärÅr)).length
  const totalService = filtSO.length + montageorder.length
  const senasteService = filtPortar.flatMap(p => p.senaste ? [p.senaste] : []).sort().reverse()[0]

  const visadeArenden = arendeFilter === 'oppna'
    ? filtArenden.filter(a => a.status !== 'atgardad')
    : arendeFilter === 'atgardade'
    ? filtArenden.filter(a => a.status === 'atgardad')
    : filtArenden

  // Sökning bland portar
  const sokPortar = sokText.trim()
    ? filtPortar.filter(p => {
        const q = sokText.toLowerCase()
        return p.namn?.toLowerCase().includes(q) || p.typ?.toLowerCase().includes(q) ||
               p.fabrikat?.toLowerCase().includes(q) || p.position?.toLowerCase().includes(q) ||
               p.adress?.toLowerCase().includes(q) || p.plats?.toLowerCase().includes(q)
      })
    : filtPortar

  // Protokoll per port (serviceorder)
  const protokollPerPort = filtPortar.map(port => {
    const soLista = filtSO.filter(so => (so.objekt_ids || []).includes(port.id) || so.fastighet_namn === port.plats)
    return { port, soLista }
  }).filter(x => x.soLista.length > 0)

  // ── Header ───────────────────────────────────────────────────────────────────
  const header = (
    <header style={{ background:'#1C3461', padding:'0 16px', height:56, display:'flex', alignItems:'center', gap:10, flexShrink:0, borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ background:'rgba(255,255,255,0.96)', borderRadius:8, padding:'4px 10px', display:'flex', alignItems:'center', flexShrink:0, boxShadow:'0 1px 4px rgba(0,0,0,0.12)' }}>
        <img src={logo} alt="NMV Portservice" style={{ height:22, display:'block', objectFit:'contain' }} />
      </div>
      {harFlerFastig && !portDetalj && (
        <select value={valdFastighet} onChange={e => setValdFastighet(e.target.value)}
          style={{ fontSize:12, padding:'5px 8px', borderRadius:7, border:'1px solid rgba(255,255,255,0.2)', background:'rgba(255,255,255,0.1)', color:'#fff', cursor:'pointer', outline:'none', maxWidth:180 }}>
          <option value="alla">Alla fastigheter</option>
          {fastigheter.map(f => <option key={f.id} value={f.id}>{f.namn}</option>)}
        </select>
      )}
      <div style={{ flex:1 }} />
      {/* Mörkt läge-toggle */}
      <button onClick={toggleDark} title={darkMode ? 'Ljust läge' : 'Mörkt läge'}
        style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:7, padding:'5px 8px', fontSize:15, cursor:'pointer', color:'#fff', flexShrink:0, lineHeight:1, display:'flex', alignItems:'center' }}>
        {darkMode ? <Sun size={14} /> : <Moon size={14} />}
      </button>
      {!mob && <span style={{ fontSize:11, color:'rgba(255,255,255,0.45)', maxWidth:150, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user.email}</span>}
      <button onClick={onLoggaUt} style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:'1px solid rgba(255,255,255,0.2)', borderRadius:6, color:'rgba(255,255,255,0.7)', fontSize:12, padding:'5px 10px', cursor:'pointer', flexShrink:0 }}>
        <LogOut size={12} />{!mob && ' Logga ut'}
      </button>
    </header>
  )

  // ── Kontaktbanner ────────────────────────────────────────────────────────────
  const harKontakt = foretagInfo.telefon || foretagInfo.epost
  const kontaktBanner = harKontakt && (
    <div style={{ background:'var(--c-blue-bg)', borderBottom:'1px solid var(--c-border)', padding:'9px 20px', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', flexShrink:0 }}>
      {foretagInfo.namn && <span style={{ fontSize:12, fontWeight:600, color:'var(--c-blue-text)' }}>{foretagInfo.namn}</span>}
      {foretagInfo.telefon && (
        <a href={`tel:${foretagInfo.telefon}`} style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'var(--c-blue-text)', textDecoration:'none', fontWeight:500 }}>
          <Phone size={12} /> {foretagInfo.telefon}
        </a>
      )}
      {foretagInfo.epost && (
        <a href={`mailto:${foretagInfo.epost}`} style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'var(--c-blue-text)', textDecoration:'none', fontWeight:500 }}>
          <Mail size={12} /> {foretagInfo.epost}
        </a>
      )}
      <div style={{ flex:1 }} />
      <button onClick={() => öppnaFelanmälan()} style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:7, fontSize:12, fontWeight:600, background:'var(--c-red)', color:'#fff', border:'none', cursor:'pointer' }}>
        <AlertCircle size={12} /> Anmäl fel
      </button>
    </div>
  )

  // ── Felanmälan-modal ─────────────────────────────────────────────────────────
  const felanmalanModal = visaFel && (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'16px' }}
      onClick={e => { if (e.target === e.currentTarget) setVisaFel(false) }}>
      <div style={{ background:'var(--c-surface)', borderRadius:14, width:'100%', maxWidth:500, border:'1px solid var(--c-border)', boxShadow:'0 20px 60px rgba(0,0,0,0.4)', overflow:'hidden' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--c-border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <AlertCircle size={16} color="var(--c-red)" />
            <span style={{ fontSize:15, fontWeight:700 }}>Anmäl fel</span>
          </div>
          <button onClick={() => setVisaFel(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--c-text3)', display:'flex' }}><X size={18} /></button>
        </div>
        <div style={{ padding:'20px' }}>
          {sparad ? (
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 16px', background:'var(--c-teal-bg)', border:'1px solid var(--c-teal)', borderRadius:10, color:'var(--c-teal-text)', fontSize:13, fontWeight:500 }}>
              <CheckCircle size={16} /> Felanmälan skickad! Vi återkommer inom kort.
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ display:'flex', flexDirection: mob ? 'column' : 'row', gap:12 }}>
                <div style={{ flex:1 }}>
                  <label style={{ fontSize:12, color:'var(--c-text2)', display:'block', marginBottom:5 }}>Port *</label>
                  <select value={valdFelPort} onChange={e => setValdFelPort(e.target.value)} style={{...FÄLT, minHeight:44}}>
                    <option value="">Välj port…</option>
                    {(harFlerFastig && valdFastighet !== 'alla' ? filterPortar(portar) : portar).map(p =>
                      <option key={p.id} value={p.id}>{p.namn}{p.plats ? ` (${p.plats})` : ''}</option>
                    )}
                  </select>
                </div>
                <div style={{ flex:1 }}>
                  <label style={{ fontSize:12, color:'var(--c-text2)', display:'block', marginBottom:5 }}>Feltyp *</label>
                  <select value={feltyp} onChange={e => setFeltyp(e.target.value)} style={{...FÄLT, minHeight:44}}>
                    <option value="">Välj feltyp…</option>
                    {['Öppnar inte','Stänger inte','Ovanligt ljud','Fjärrkontroll fungerar inte','Mekaniskt fel','Elfel','Övrigt'].map(f =>
                      <option key={f} value={f}>{f}</option>
                    )}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize:12, color:'var(--c-text2)', display:'block', marginBottom:6 }}>Prioritet</label>
                <div style={{ display:'flex', gap:8 }}>
                  {['normal','hog','akut'].map(p => (
                    <button key={p} onClick={() => setPrioritet(p)} style={{ flex:1, padding:'7px 0', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', border:`1px solid ${prioritet===p?PRIO_COLOR[p]:'var(--c-border)'}`, background:prioritet===p?PRIO_COLOR[p]+'22':'transparent', color:prioritet===p?PRIO_COLOR[p]:'var(--c-text2)', transition:'all 0.15s' }}>{PRIO_LABEL[p]}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize:12, color:'var(--c-text2)', display:'block', marginBottom:5 }}>Beskrivning</label>
                <textarea value={beskrivning} onChange={e => setBeskrivning(e.target.value)} placeholder="Beskriv felet mer detaljerat…" rows={3} style={{ ...FÄLT, resize:'vertical', fontFamily:'inherit' }} />
              </div>
              {feldMsg && <div style={{ fontSize:12, color:'var(--c-red)' }}>{feldMsg}</div>}
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                <button style={BTN_SEC} onClick={() => setVisaFel(false)}>Avbryt</button>
                <button style={{ ...BTN_PRI, opacity:sparar?0.6:1 }} onClick={skickaFel} disabled={sparar}>{sparar ? 'Skickar…' : 'Skicka felanmälan'}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // ── PORTDETALJVY ─────────────────────────────────────────────────────────────
  if (portDetalj) {
    const port     = portDetalj
    const portSO   = serviceorder.filter(so => (so.objekt_ids || []).includes(port.id) || so.fastighet_namn === port.plats)
    const portMO   = montageorder.filter(mo => {
      if (mo.objekt_id === port.id) return true
      if (mo.protokoll_data?.portNamn === port.namn) return true
      if (mo.adress && port.adress && mo.adress === port.adress) return true
      return false
    })
    const portÄr   = arenden.filter(a => a.objekt_id === port.id || a.namn === port.namn)
    const aktÄr    = portÄr.filter(a => a.status !== 'atgardad')
    const harDok   = portSO.length > 0 || portMO.length > 0

    // Garantiinfo
    const garanti = garantiStatus(port.installationsdatum, port.garanti_ar)

    // Nästa service-påminnelse
    const dTill = dagarTill(port.nasta)

    // CE-konfig
    const ceCfg = CE_CFG[port.ce_status || 'ej_kontrollerad']

    return (
      <div style={{ minHeight:'100dvh', background:'var(--c-bg)', display:'flex', flexDirection:'column' }}>
        {header}
        {kontaktBanner}
        <main style={{ flex:1, padding:mob?'14px 14px':'20px 20px', paddingBottom:'max(24px, env(safe-area-inset-bottom, 24px))', maxWidth:800, width:'100%', margin:'0 auto', boxSizing:'border-box' }}>
          <button onClick={() => { setPortDetalj(null); setPortFiler([]) }} style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', color:'var(--c-text2)', fontSize:13, cursor:'pointer', padding:'0 0 16px 0', fontWeight:500 }}>
            <ChevronLeft size={16} /> Tillbaka till översikt
          </button>

          {/* Portinfo */}
          <div style={{ background:'var(--c-surface)', border:'1px solid var(--c-border)', borderRadius:12, padding:'16px 20px', marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:14, marginBottom:14 }}>
              <div style={{ width:44, height:44, background:'var(--c-blue-bg)', borderRadius:11, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <DoorOpen size={22} color="var(--c-blue)" />
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:19, fontWeight:700 }}>{port.namn}</div>
                <div style={{ fontSize:13, color:'var(--c-text2)', marginTop:2 }}>{port.typ}{port.fabrikat ? ` · ${port.fabrikat}` : ''}</div>
              </div>
              {aktÄr.length > 0 && (
                <span style={{ background:'var(--c-red)', color:'#fff', fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:10, flexShrink:0 }}>
                  {aktÄr.length} aktivt ärende{aktÄr.length > 1 ? 'n' : ''}
                </span>
              )}
            </div>
            <div style={{ display:'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr', gap:8 }}>
              {[
                ['Porttyp',       port.typ],
                ['Fabrikat',      port.fabrikat],
                ['Position',      port.position],
                ['Adress',        port.adress || port.plats],
                ['Serienummer',   port.serienummer],
                ['Ordernummer',   port.ordernummer],
                ['Senaste service', port.senaste],
                ['Nästa service', port.nasta],
                port.installationsdatum && ['Installationsdatum', port.installationsdatum],
              ].filter(Boolean).filter(([, v]) => v).map(([l, v]) => (
                <div key={l} style={{ background:'var(--c-bg)', borderRadius:8, padding:'8px 10px' }}>
                  <div style={{ fontSize:10, fontWeight:600, color:'var(--c-text3)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:2 }}>{l}</div>
                  <div style={{ fontSize:13, fontWeight:500, color: l === 'Nästa service' && port.nasta < idag ? 'var(--c-red)' : 'var(--c-text)' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Nästa service-påminnelse */}
          {dTill !== null && (
            <div style={{ background: dTill < 0 ? 'var(--c-red-bg)' : dTill <= 30 ? 'var(--c-amber-bg)' : 'var(--c-teal-bg)', border:`1px solid ${dTill < 0 ? 'var(--c-red)' : dTill <= 30 ? 'var(--c-amber)' : 'var(--c-teal)'}`, borderRadius:10, padding:'10px 14px', marginBottom:12, display:'flex', alignItems:'center', gap:10 }}>
              <Clock size={16} color={dTill < 0 ? 'var(--c-red)' : dTill <= 30 ? 'var(--c-amber)' : 'var(--c-teal)'} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:700, color: dTill < 0 ? 'var(--c-red-text)' : dTill <= 30 ? 'var(--c-amber-text)' : 'var(--c-teal-text)' }}>
                  {dTill < 0 ? `Service försenad med ${Math.abs(dTill)} dagar` : dTill === 0 ? 'Service förfaller idag!' : `Nästa service om ${dTill} dagar`}
                </div>
                <div style={{ fontSize:11, color:'var(--c-text3)', marginTop:2 }}>Nästa schemalagda service: {port.nasta}</div>
              </div>
            </div>
          )}

          {/* Garantistatus */}
          {garanti && (
            <div style={{ background: garanti.giltig ? 'var(--c-teal-bg)' : 'var(--c-red-bg)', border:`1px solid ${garanti.giltig?'var(--c-teal)':'var(--c-red)'}`, borderRadius:10, padding:'10px 14px', marginBottom:12, display:'flex', alignItems:'center', gap:10 }}>
              {garanti.giltig ? <ShieldCheck size={16} color="var(--c-teal)" /> : <ShieldAlert size={16} color="var(--c-red)" />}
              <div>
                <div style={{ fontSize:12, fontWeight:700, color: garanti.giltig ? 'var(--c-teal-text)' : 'var(--c-red-text)' }}>
                  {garanti.giltig ? `Garanti giltig (${garanti.dagar} dagar kvar)` : `Garanti utgången (${Math.abs(garanti.dagar)} dagar sedan)`}
                </div>
                <div style={{ fontSize:11, color:'var(--c-text3)', marginTop:2 }}>Garantitidens slut: {garanti.utgångsdatum}</div>
              </div>
            </div>
          )}

          {/* CE-dokumentation */}
          {port.ce_status && port.ce_status !== 'ej_kontrollerad' && (
            <div style={{ background: ceCfg.bg, border:`1px solid ${ceCfg.color}`, borderRadius:10, padding:'10px 14px', marginBottom:12, display:'flex', alignItems:'center', gap:10 }}>
              <ceCfg.Icon size={16} color={ceCfg.color} />
              <div>
                <div style={{ fontSize:12, fontWeight:700, color: ceCfg.color }}>{ceCfg.label}</div>
                {port.ce_notering && <div style={{ fontSize:11, color:'var(--c-text3)', marginTop:2 }}>{port.ce_notering}</div>}
              </div>
            </div>
          )}

          {/* Anmäl fel */}
          <button onClick={() => öppnaFelanmälan(port.id)} style={{ width:'100%', padding:'12px', borderRadius:10, marginBottom:12, background:'var(--c-red)', color:'#fff', border:'none', fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            <AlertCircle size={14} /> Anmäl fel på denna port
          </button>

          {/* Aktiva ärenden */}
          {portÄr.length > 0 && (
            <div style={{ background:'var(--c-surface)', border:'1px solid var(--c-border)', borderRadius:12, marginBottom:12, overflow:'hidden' }}>
              <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--c-border)', fontSize:11, fontWeight:700, color:'var(--c-text3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Ärenden ({portÄr.length})</div>
              {portÄr.slice(0,5).map((a, i) => (
                <div key={a.id} style={{ padding:'10px 16px', borderBottom: i < Math.min(portÄr.length,5) - 1 ? '1px solid var(--c-border)' : 'none', display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:7, height:7, borderRadius:'50%', background:PRIO_COLOR[a.prioritet]||'var(--c-text3)', flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13 }}>{a.feltyp || a.namn}</div>
                    <div style={{ fontSize:11, color:'var(--c-text3)' }}>{a.datum}{a.notering ? ` · ${a.notering}` : ''}</div>
                  </div>
                  <span style={{ fontSize:11, padding:'2px 8px', borderRadius:6, background:(STATUS_COLOR[a.status]||'#888')+'22', color:STATUS_COLOR[a.status]||'#888', fontWeight:600 }}>
                    {STATUS_LABEL[a.status]||a.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Servicehistorik tidslinje */}
          <div style={{ background:'var(--c-surface)', border:'1px solid var(--c-border)', borderRadius:12, marginBottom:12, overflow:'hidden' }}>
            {/* Header med filter + utskrift */}
            <div style={{ padding:'10px 12px', borderBottom:'1px solid var(--c-border)', display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              <div style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
                <Activity size={12} color="var(--c-text3)" />
                <span style={{ fontSize:11, fontWeight:700, color:'var(--c-text3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Servicehistorik</span>
              </div>
              <div style={{ flex:1 }} />
              {/* Filterknappar */}
              <div style={{ display:'flex', gap:4 }}>
                {[['alla','Alla'],['service','Service'],['arende','Felanmälan']].map(([v,l]) => (
                  <button key={v} onClick={() => setTidslinjeFilter(v)}
                    style={{ padding:'4px 10px', borderRadius:16, fontSize:11, fontWeight:600, cursor:'pointer',
                      border:`1px solid ${tidslinjeFilter===v?'var(--c-teal)':'var(--c-border)'}`,
                      background: tidslinjeFilter===v ? 'var(--c-teal-bg)' : 'transparent',
                      color: tidslinjeFilter===v ? 'var(--c-teal-text)' : 'var(--c-text2)' }}>
                    {l}
                  </button>
                ))}
              </div>
              {/* Utskriftsknapp */}
              <button onClick={() => {
                const alla = []
                portMO.forEach(mo => {
                  const datum = mo.protokoll_data?.datum || mo.created_at?.slice(0,10) || ''
                  alla.push({ typ:'montering', datum, rubrik:'Installation', detalj: mo.protokoll_data?.portTyp||'', tekniker: mo.protokoll_data?.tekniker||'' })
                })
                serviceorder.filter(so => (so.objekt_ids||[]).includes(port.id) || so.fastighet_namn===port.plats)
                  .forEach(so => alla.push({ typ:'service', datum:so.datum||'', rubrik:'Service utförd', detalj:so.notering||'', tekniker:tekStr(so.tekniker) }))
                arenden.filter(a => a.objekt_id===port.id||a.namn===port.namn)
                  .forEach(a => alla.push({ typ:'arende', datum:a.datum||'', rubrik:a.feltyp||'Felanmälan', detalj:a.notering||a.beskrivning||'', status:a.status }))
                alla.sort((a,b) => (b.datum||'').localeCompare(a.datum||''))
                const filtrerade = tidslinjeFilter==='alla' ? alla
                  : tidslinjeFilter==='service' ? alla.filter(h=>h.typ==='service'||h.typ==='montering')
                  : alla.filter(h=>h.typ==='arende')
                const rows = filtrerade.map(h =>
                  `<tr><td>${h.datum||'–'}</td><td>${h.rubrik}</td><td>${h.typ==='montering'?'Installation':h.typ==='service'?'Serviceorder':'Felanmälan'}</td><td>${h.tekniker||''}</td><td>${(h.detalj||'').slice(0,100)}</td></tr>`
                ).join('')
                const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Servicehistorik – ${port.namn}</title>
                  <style>body{font-family:sans-serif;padding:24px;color:#222}h1{font-size:18px;margin-bottom:4px}p{color:#666;font-size:13px;margin:0 0 16px}
                  table{width:100%;border-collapse:collapse;font-size:13px}th,td{padding:8px 10px;text-align:left;border-bottom:1px solid #e5e7eb}th{background:#f9fafb;font-weight:600}
                  </style></head><body>
                  <h1>Servicehistorik – ${port.namn}</h1>
                  <p>${port.typ||''}${port.fabrikat?' · '+port.fabrikat:''} · Utskriven ${new Date().toLocaleDateString('sv-SE')}</p>
                  <table><thead><tr><th>Datum</th><th>Händelse</th><th>Typ</th><th>Tekniker</th><th>Notering</th></tr></thead><tbody>${rows}</tbody></table>
                  </body></html>`
                const win = window.open('about:blank','_blank')
                if (!win) return
                win.document.open(); win.document.write(html); win.document.close()
                setTimeout(() => win.print(), 300)
              }}
              style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:16, fontSize:11, fontWeight:600, cursor:'pointer',
                border:'1px solid var(--c-border)', background:'transparent', color:'var(--c-text2)', flexShrink:0 }}>
                🖨 Skriv ut
              </button>
            </div>
            <div style={{ padding:'14px 16px' }}>
              <Tidslinje
                arenden={arenden}
                serviceorder={serviceorder}
                montageorder={portMO}
                portId={port.id}
                portNamn={port.namn}
                portAdress={port.plats}
                mob={mob}
                filter={tidslinjeFilter}
              />
            </div>
          </div>

          {/* Dokumentation */}
          <div style={{ background:'var(--c-surface)', border:'1px solid var(--c-border)', borderRadius:12, marginBottom:12, overflow:'hidden' }}>
            <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--c-border)', fontSize:11, fontWeight:700, color:'var(--c-text3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>
              Protokoll {harDok ? `(${portSO.length + portMO.length})` : ''}
            </div>
            {!harDok ? (
              <div style={{ padding:'24px', textAlign:'center', color:'var(--c-text3)', fontSize:13 }}>Inga protokoll registrerade ännu.</div>
            ) : (
              <>
                {portMO.map((mo, i) => (
                  <div key={mo.id} style={{ padding:'12px 16px', borderBottom:'1px solid var(--c-border)', display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:36, height:36, borderRadius:9, background:'var(--c-teal-bg)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <FileText size={16} color="var(--c-teal)" />
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600 }}>Montageprotokoll</div>
                      <div style={{ fontSize:11, color:'var(--c-text3)' }}>
                        {mo.protokoll_data?.datum || mo.created_at?.slice(0,10) || '–'}
                        {mo.nr ? ` · #${mo.nr}` : ''}
                      </div>
                    </div>
                    {mo.protokoll_data && (
                      <button onClick={() => öppnaMontagePDF(mo)} style={{ ...BTN_SEC, padding:'10px 14px', fontSize:12, minHeight:44, display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
                        <FileText size={14} /> {mob ? 'PDF' : 'Öppna PDF'}
                      </button>
                    )}
                  </div>
                ))}
                {portSO.map((so, i) => (
                  <div key={so.id} style={{ padding:'12px 16px', borderBottom: i < portSO.length - 1 ? '1px solid var(--c-border)' : 'none', display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:36, height:36, borderRadius:9, background:'var(--c-blue-bg)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <FileText size={16} color="var(--c-blue)" />
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600 }}>Serviceprotokoll</div>
                      <div style={{ fontSize:11, color:'var(--c-text3)' }}>
                        {so.datum||'–'}{so.tekniker ? ` · ${tekStr(so.tekniker)}` : ''}
                        {(so.protokoll?.signatur || so.signatur_tekniker) ? ' · ✓ Signerat' : ''}
                      </div>
                    </div>
                    <button onClick={() => öppnaServicePDF(so, port.namn)} style={{ ...BTN_SEC, padding:'10px 14px', fontSize:12, minHeight:44, display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
                      <FileText size={14} /> {mob ? 'PDF' : 'Öppna PDF'}
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Bifogade filer */}
          {portFiler.length > 0 && (
            <div style={{ background:'var(--c-surface)', border:'1px solid var(--c-border)', borderRadius:12, overflow:'hidden' }}>
              <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--c-border)', fontSize:11, fontWeight:700, color:'var(--c-text3)', textTransform:'uppercase', letterSpacing:'0.06em', display:'flex', alignItems:'center', gap:6 }}>
                <Paperclip size={12} /> Filer ({portFiler.length})
              </div>
              {portFiler.map((f, i) => (
                <a key={f.id} href={f.url} target="_blank" rel="noopener noreferrer"
                  style={{ padding:'11px 16px', borderBottom: i < portFiler.length - 1 ? '1px solid var(--c-border)' : 'none', display:'flex', alignItems:'center', gap:10, textDecoration:'none', color:'var(--c-text)' }}>
                  <Paperclip size={14} color="var(--c-text3)" />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.namn}</div>
                    {f.typ && f.typ !== 'annat' && <div style={{ fontSize:11, color:'var(--c-text3)' }}>{f.typ}</div>}
                  </div>
                  <ChevronRight size={14} color="var(--c-text3)" />
                </a>
              ))}
            </div>
          )}
        </main>
        {felanmalanModal}
      </div>
    )
  }

  // ── HUVUDVY ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100dvh', background:'var(--c-bg)', display:'flex', flexDirection:'column' }}>
      {header}
      {kontaktBanner}

      {/* Flikar */}
      <div style={{ background:'var(--c-surface)', borderBottom:'1px solid var(--c-border)', display:'flex', padding:mob?'0 4px':'0 12px', gap:0, flexShrink:0 }}>
        {[
          { id:'oversikt',  label:'Översikt' },
          { id:'arenden',   label:öppnaArenden.length ? `Ärenden (${öppnaArenden.length})` : 'Ärenden' },
          { id:'protokoll', label:totalDok ? `Protokoll (${totalDok})` : 'Protokoll' },
        ].map(t => (
          <button key={t.id} onClick={() => setFlik(t.id)} style={{ flex:1, padding:mob?'13px 6px':'13px 18px', fontSize:mob?11:13, fontWeight:flik===t.id?700:400, background:'none', border:'none', cursor:'pointer', color:flik===t.id?'var(--c-teal-text)':'var(--c-text2)', borderBottom:flik===t.id?'2px solid var(--c-teal)':'2px solid transparent', transition:'all 0.15s', whiteSpace:'nowrap', textAlign:'center' }}>{t.label}</button>
        ))}
      </div>

      <main style={{ flex:1, padding:mob?'16px 14px':'24px 20px', paddingBottom:'max(24px, env(safe-area-inset-bottom, 24px))', maxWidth:800, width:'100%', margin:'0 auto', boxSizing:'border-box' }}>

        {/* ── ÖVERSIKT ── */}
        {flik === 'oversikt' && (
          <>
            <div style={{ marginBottom:16 }}>
              <h1 style={{ fontSize:20, fontWeight:700, margin:0 }}>{displayNamn}</h1>
              <p style={{ fontSize:13, color:'var(--c-text2)', margin:'3px 0 0' }}>Din portserviceöversikt</p>
            </div>

            {/* Servicestatistik */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:10, marginBottom:16 }}>
              {[
                { label:'Portar',         value:filtPortar.length,   icon:DoorOpen,    color:'var(--c-blue)',   action:() => { setSokText(''); setFlik('oversikt') } },
                { label:'Aktiva ärenden', value:öppnaArenden.length, icon:AlertCircle, color:öppnaArenden.length>0?'var(--c-red)':'var(--c-teal)', action:() => { setArendeFilter('oppna'); setFlik('arenden') } },
                { label:'Service i år',   value:serviceÅr,           icon:Wrench,      color:'var(--c-purple,#7c3aed)', action:() => setFlik('protokoll') },
                { label:'Nästa service',  value:nästaService||'–',   icon:Clock,       color:'#a78bfa', small:!!nästaService, action: nästaService ? () => setFlik('oversikt') : null },
              ].map(({ label, value, icon:Icon, color, small, action }) => (
                <div key={label} onClick={action||undefined} style={{ background:'var(--c-surface)', border:'1px solid var(--c-border)', borderRadius:12, padding:'14px 16px', cursor:action?'pointer':'default', transition:'box-shadow 0.15s', userSelect:'none' }}
                  onMouseEnter={e => { if (action) e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.1)' }}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = ''}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ fontSize:10, fontWeight:600, color:'var(--c-text3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</span>
                    <div style={{ width:26, height:26, background:color+'22', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Icon size={13} color={color} />
                    </div>
                  </div>
                  <div style={{ fontSize:small?14:22, fontWeight:700 }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Nästa service-påminnelse (global) */}
            {nästaService && (() => {
              const d = dagarTill(nästaService)
              if (d === null || d > 60) return null
              return (
                <div style={{ background: d < 0 ? 'var(--c-red-bg)' : 'var(--c-amber-bg)', border:`1px solid ${d<0?'var(--c-red)':'var(--c-amber)'}`, borderRadius:10, padding:'10px 14px', marginBottom:16, display:'flex', alignItems:'center', gap:10 }}>
                  <Clock size={15} color={d < 0 ? 'var(--c-red)' : 'var(--c-amber)'} />
                  <span style={{ fontSize:12, fontWeight:600, color: d < 0 ? 'var(--c-red-text)' : 'var(--c-amber-text)' }}>
                    {d < 0 ? `En eller flera portar har försenad service (${Math.abs(d)}+ dagar)` : `Nästa service om ${d} dagar – ${nästaService}`}
                  </span>
                </div>
              )
            })()}

            {/* Aktiva ärenden – kompakt */}
            <div style={{ background:'var(--c-surface)', border:'1px solid var(--c-border)', borderRadius:12, marginBottom:16, overflow:'hidden' }}>
              <div style={{ padding:'12px 18px', borderBottom:'1px solid var(--c-border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:13, fontWeight:600 }}>Aktiva ärenden</span>
                {öppnaArenden.length > 0 && (
                  <span style={{ background:'var(--c-red)', color:'#fff', fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:10 }}>{öppnaArenden.length}</span>
                )}
              </div>
              {öppnaArenden.length === 0 ? (
                <div style={{ padding:'18px', display:'flex', alignItems:'center', gap:8, color:'var(--c-text3)', fontSize:13 }}>
                  <CheckCircle size={14} color="var(--c-teal)" /> Inga aktiva ärenden.
                </div>
              ) : öppnaArenden.slice(0, 3).map((a, i) => (
                <div key={a.id} style={{ padding:'11px 18px', display:'flex', alignItems:'center', gap:10, borderBottom: i < Math.min(öppnaArenden.length, 3) - 1 ? '1px solid var(--c-border)' : 'none' }}>
                  <div style={{ width:7, height:7, borderRadius:'50%', flexShrink:0, background:PRIO_COLOR[a.prioritet]||'var(--c-text3)' }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:500 }}>{a.namn}</div>
                    <div style={{ fontSize:11, color:'var(--c-text3)' }}>{a.feltyp} · {a.datum}</div>
                  </div>
                  <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:6, background:(STATUS_COLOR[a.status]||'#888')+'22', color:STATUS_COLOR[a.status]||'#888' }}>
                    {STATUS_LABEL[a.status]||a.status}
                  </span>
                </div>
              ))}
              {öppnaArenden.length > 3 && (
                <button onClick={() => { setArendeFilter('oppna'); setFlik('arenden') }} style={{ width:'100%', padding:'10px', background:'none', border:'none', borderTop:'1px solid var(--c-border)', color:'var(--c-teal-text)', fontSize:12, cursor:'pointer', fontWeight:600 }}>
                  Visa alla {öppnaArenden.length} ärenden →
                </button>
              )}
            </div>

            {/* Portar med sök */}
            <div style={{ background:'var(--c-surface)', border:'1px solid var(--c-border)', borderRadius:12, overflow:'hidden' }}>
              <div style={{ padding:'12px 18px', borderBottom:'1px solid var(--c-border)', display:'flex', alignItems:'center', gap:8 }}>
                <DoorOpen size={14} color="var(--c-blue)" />
                <span style={{ fontSize:13, fontWeight:600, flex:1 }}>Portar ({sokPortar.length}{sokPortar.length !== filtPortar.length ? ` av ${filtPortar.length}` : ''})</span>
              </div>
              <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--c-border)', position:'relative' }}>
                <Search size={13} style={{ position:'absolute', left:28, top:'50%', transform:'translateY(-50%)', color:'var(--c-text3)' }} />
                <input value={sokText} onChange={e => setSokText(e.target.value)} placeholder="Sök port…"
                  style={{ ...FÄLT, paddingLeft:30, fontSize:12, padding:'7px 10px 7px 30px' }} />
              </div>
              {sokPortar.length === 0 ? (
                <div style={{ padding:'18px', color:'var(--c-text3)', fontSize:13 }}>Inga portar matchar sökningen.</div>
              ) : (
                fastigheter.filter(f => valdFastighet === 'alla' || f.id === valdFastighet).map(f => {
                  const fps = sokPortar.filter(p => p.fastighetId === f.id || p.plats === f.namn)
                  if (!fps.length) return null
                  return (
                    <div key={f.id}>
                      {harFlerFastig && (
                        <div style={{ padding:'7px 18px', background:'var(--c-bg)', display:'flex', alignItems:'center', gap:6 }}>
                          <Building2 size={11} color="var(--c-text3)" />
                          <span style={{ fontSize:10, fontWeight:700, color:'var(--c-text3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{f.namn}</span>
                        </div>
                      )}
                      {fps.map((p, i) => (
                        <PortRad key={p.id} port={p} sista={i===fps.length-1} öppnaArenden={arenden.filter(a => (a.objekt_id===p.id||a.namn===p.namn) && a.status!=='atgardad').length}
                          onClick={() => { setPortDetalj(p); laddaPortFiler(p.id) }} />
                      ))}
                    </div>
                  )
                })
              )}
              {/* Portar utan fastighet-koppling */}
              {(() => {
                const losFaster = fastigheter.filter(f => valdFastighet === 'alla' || f.id === valdFastighet).flatMap(f => sokPortar.filter(p => p.fastighetId === f.id || p.plats === f.namn))
                const lösa = sokPortar.filter(p => !losFaster.some(lf => lf.id === p.id))
                return lösa.length > 0 ? (
                  <div>
                    {harFlerFastig && (
                      <div style={{ padding:'7px 18px', background:'var(--c-bg)', display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ fontSize:10, fontWeight:700, color:'var(--c-text3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Övriga</span>
                      </div>
                    )}
                    {lösa.map((p, i) => (
                      <PortRad key={p.id} port={p} sista={i===lösa.length-1} öppnaArenden={arenden.filter(a => (a.objekt_id===p.id||a.namn===p.namn) && a.status!=='atgardad').length}
                        onClick={() => { setPortDetalj(p); laddaPortFiler(p.id) }} />
                    ))}
                  </div>
                ) : null
              })()}
            </div>
          </>
        )}

        {/* ── ÄRENDEN ── */}
        {flik === 'arenden' && (
          <>
            <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
              {[['oppna','Pågående'],['atgardade','Avslutade'],['alla','Alla']].map(([v,l]) => (
                <button key={v} onClick={() => setArendeFilter(v)} style={{ padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer', border:`1px solid ${arendeFilter===v?'var(--c-teal)':'var(--c-border)'}`, background:arendeFilter===v?'var(--c-teal-bg)':'transparent', color:arendeFilter===v?'var(--c-teal-text)':'var(--c-text2)' }}>
                  {l}{v==='oppna'&&öppnaArenden.length>0?` (${öppnaArenden.length})`:v==='alla'?` (${filtArenden.length})`:''}
                </button>
              ))}
            </div>
            {visadeArenden.length === 0 ? (
              <div style={{ padding:'40px 20px', textAlign:'center', color:'var(--c-text3)', fontSize:13 }}>Inga ärenden att visa.</div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {visadeArenden.map(a => (
                  <ArendeKort key={a.id} arende={a} expanderat={expanderat===a.id} onToggle={() => setExpanderat(p => p===a.id?null:a.id)} />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── PROTOKOLL ── */}
        {flik === 'protokoll' && (
          <>
            {/* Servicestatistik */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:20 }}>
              {[
                { label:'Totalt utförda', value: totalService },
                { label:`Service ${ärÅr}`, value: serviceÅr },
                { label:'Senaste service', value: senasteService || '–', small: !!senasteService },
              ].map(({ label, value, small }) => (
                <div key={label} className="metric-card">
                  <div className="metric-label">{label}</div>
                  <div className="metric-value" style={{ fontSize: small ? 14 : 22 }}>{value}</div>
                </div>
              ))}
            </div>

            {totalDok === 0 ? (
              <div style={{ padding:'40px 20px', textAlign:'center', color:'var(--c-text3)', fontSize:13 }}>Inga protokoll tillgängliga ännu.</div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

                {/* Montageprotokoll */}
                {montageorder.length > 0 && (
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:'var(--c-text3)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>Montageprotokoll ({montageorder.length})</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      {montageorder.map(mo => (
                        <div key={mo.id} style={{ background:'var(--c-surface)', border:'1px solid var(--c-border)', borderRadius:12, padding:'12px 18px', display:'flex', alignItems:'center', gap:12 }}>
                          <div style={{ width:36, height:36, borderRadius:9, background:'var(--c-teal-bg)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            <FileText size={16} color="var(--c-teal)" />
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:13, fontWeight:600 }}>{mo.protokoll_data?.portNamn || mo.adress || 'Montage'}</div>
                            <div style={{ fontSize:11, color:'var(--c-text3)' }}>
                              {mo.protokoll_data?.datum || mo.created_at?.slice(0,10) || '–'}
                              {mo.nr ? ` · #${mo.nr}` : ''}
                              {mo.protokoll_data?.portTyp ? ` · ${mo.protokoll_data.portTyp}` : ''}
                            </div>
                          </div>
                          {mo.protokoll_data && (
                            <button onClick={() => öppnaMontagePDF(mo)} style={{ ...BTN_SEC, padding:'10px 14px', fontSize:12, minHeight:44, display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
                              <FileText size={14} /> {mob ? 'PDF' : 'Öppna PDF'}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Serviceprotokoll per port */}
                {protokollPerPort.length > 0 && (
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:'var(--c-text3)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>Serviceprotokoll ({filtSO.length})</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                      {protokollPerPort.map(({ port, soLista }) => (
                        <div key={port.id} style={{ background:'var(--c-surface)', border:'1px solid var(--c-border)', borderRadius:12, overflow:'hidden' }}>
                          <button onClick={() => { setPortDetalj(port); laddaPortFiler(port.id) }} style={{ width:'100%', padding:'12px 18px', background:'var(--c-bg)', display:'flex', alignItems:'center', gap:8, borderBottom:'1px solid var(--c-border)', border:'none', cursor:'pointer', textAlign:'left' }}>
                            <DoorOpen size={13} color="var(--c-blue)" />
                            <span style={{ fontSize:13, fontWeight:600 }}>{port.namn}</span>
                            <span style={{ fontSize:11, color:'var(--c-text3)' }}>{port.typ}{port.fabrikat?` · ${port.fabrikat}`:''}</span>
                            <ChevronRight size={13} color="var(--c-text3)" style={{ marginLeft:'auto' }} />
                          </button>
                          {soLista.map((so, i) => (
                            <div key={so.id} style={{ padding:'12px 18px', display:'flex', alignItems:'center', gap:12, borderBottom: i<soLista.length-1?'1px solid var(--c-border)':'none' }}>
                              <div style={{ width:34, height:34, borderRadius:8, background:'var(--c-blue-bg)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                <FileText size={15} color="var(--c-blue)" />
                              </div>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ fontSize:13, fontWeight:500 }}>Serviceprotokoll</div>
                                <div style={{ fontSize:11, color:'var(--c-text3)' }}>
                                  {so.datum||'–'}{so.tekniker ? ` · ${tekStr(so.tekniker)}` : ''}
                                  {(so.protokoll?.signatur || so.signatur_tekniker) ? ' · ✓' : ''}
                                </div>
                              </div>
                              <button onClick={() => öppnaServicePDF(so, port.namn)} style={{ ...BTN_SEC, padding:'10px 14px', fontSize:12, minHeight:44, display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
                                <FileText size={14} /> {mob ? 'PDF' : 'Öppna PDF'}
                              </button>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
      {felanmalanModal}
    </div>
  )
}

// ── ArendeKort ─────────────────────────────────────────────────────────────────
function ArendeKort({ arende: a, expanderat, onToggle }) {
  const stängd = a.status === 'atgardad'
  return (
    <div style={{ background:'var(--c-surface)', border:'1px solid var(--c-border)', borderRadius:12, overflow:'hidden', opacity:stängd?0.8:1 }}>
      <button onClick={onToggle} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'13px 16px', background:'none', border:'none', cursor:'pointer', textAlign:'left' }}>
        <div style={{ width:8, height:8, borderRadius:'50%', flexShrink:0, background:PRIO_COLOR[a.prioritet]||'var(--c-text3)' }} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'var(--c-text)' }}>{a.namn}</div>
          <div style={{ fontSize:11, color:'var(--c-text3)', marginTop:2 }}>{a.feltyp} · {a.datum}</div>
        </div>
        <span style={{ fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:6, flexShrink:0, background:(STATUS_COLOR[a.status]||'#888')+'22', color:STATUS_COLOR[a.status]||'#888' }}>
          {STATUS_LABEL[a.status]||a.status}
        </span>
        {expanderat ? <ChevronUp size={14} color="var(--c-text3)" /> : <ChevronDown size={14} color="var(--c-text3)" />}
      </button>
      {expanderat && (
        <div style={{ padding:'0 16px 16px', borderTop:'1px solid var(--c-border)' }}>
          {a.beskrivning && (
            <div style={{ marginTop:12 }}>
              <div style={{ fontSize:11, fontWeight:600, color:'var(--c-text3)', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.05em' }}>Beskrivning</div>
              <div style={{ fontSize:13, color:'var(--c-text2)', lineHeight:1.6 }}>{a.beskrivning}</div>
            </div>
          )}
          {a.notering && (
            <div style={{ marginTop:12, padding:'10px 12px', background:'var(--c-teal-bg)', borderRadius:8, border:'1px solid var(--c-teal)' }}>
              <div style={{ fontSize:11, fontWeight:600, color:'var(--c-teal-text)', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.05em' }}>Åtgärd / Teknikernotering</div>
              <div style={{ fontSize:13, color:'var(--c-teal-text)', lineHeight:1.6 }}>{a.notering}</div>
            </div>
          )}
          {a.tekniker && (Array.isArray(a.tekniker) ? a.tekniker : [a.tekniker]).filter(Boolean).length > 0 && (
            <div style={{ marginTop:10, fontSize:12, color:'var(--c-text3)' }}>
              👤 Ansvarig: <strong style={{ color:'var(--c-text2)' }}>{Array.isArray(a.tekniker) ? a.tekniker.join(', ') : a.tekniker}</strong>
            </div>
          )}
          {a.besok && (
            <div style={{ marginTop:6, fontSize:12, color:'var(--c-text3)' }}>
              📅 Besök: <strong style={{ color:'var(--c-text2)' }}>{a.besok}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── PortRad ────────────────────────────────────────────────────────────────────
function PortRad({ port, sista, öppnaArenden = 0, onClick }) {
  const idag = new Date().toISOString().slice(0,10)
  const statusFärg = { ok:'var(--c-teal)', varning:'#f59e0b', försenad:'var(--c-red)', okänd:'var(--c-text3)' }
  const färg = statusFärg[port.status] || statusFärg.okänd
  const dTill = dagarTill(port.nasta)
  return (
    <button onClick={onClick} style={{ width:'100%', padding:'10px 18px', borderBottom:sista?'none':'1px solid var(--c-border)', display:'flex', alignItems:'center', gap:10, background:'none', border:'none', cursor:'pointer', textAlign:'left' }}>
      <div style={{ width:7, height:7, borderRadius:'50%', background:färg, flexShrink:0 }} />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:500 }}>{port.namn}</div>
        <div style={{ fontSize:11, color:'var(--c-text3)' }}>
          {port.typ}{port.fabrikat?` · ${port.fabrikat}`:''}
          {port.position ? ` · ${port.position}` : ''}
        </div>
      </div>
      {öppnaArenden > 0 && (
        <span style={{ background:'var(--c-red)', color:'#fff', fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:8, flexShrink:0 }}>{öppnaArenden}</span>
      )}
      {port.nasta && (
        <div style={{ textAlign:'right', flexShrink:0, marginRight:4 }}>
          <div style={{ fontSize:10, color:'var(--c-text3)' }}>Nästa service</div>
          <div style={{ fontSize:12, fontWeight:600, color: dTill !== null && dTill < 0 ? 'var(--c-red)' : dTill !== null && dTill <= 30 ? 'var(--c-amber)' : 'var(--c-text2)' }}>
            {dTill !== null && dTill < 0 ? `${Math.abs(dTill)}d försenad` : dTill !== null && dTill <= 30 ? `${dTill}d kvar` : port.nasta}
          </div>
        </div>
      )}
      <ChevronRight size={14} color="var(--c-text3)" style={{ flexShrink:0 }} />
    </button>
  )
}
