import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, X, AlertCircle, ChevronDown, ChevronUp, Check, Pencil, Trash2, ExternalLink, Filter, ClipboardList } from 'lucide-react'
import KundVäljare from '../components/KundVäljare.jsx'

// ── Konstanter & konfiguration ────────────────────────────────────────────────
const DAGNAMN_KORT = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre']
const DAGNAMN_LÅNG = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag']

const TYPE_CFG = {
  montage:      { label: 'Montage',      color: '#2563eb', bg: '#eff6ff',               emoji: '🔵' },
  service:      { label: 'Service',      color: '#1D9E75', bg: 'rgba(29,158,117,0.08)', emoji: '🟢' },
  arende:       { label: 'Ärende',       color: '#ea580c', bg: '#fff7ed',               emoji: '🟠' },
  akut:         { label: 'Akut',         color: '#dc2626', bg: '#fef2f2',               emoji: '🔴' },
  kalender:     { label: 'Händelse',     color: '#7c3aed', bg: '#faf5ff',               emoji: '🟣' },
  serviceorder: { label: 'Serviceorder', color: '#0891b2', bg: '#ecfeff',               emoji: '📋' },
}

// Bokningstyper (tidsgrid-stil)
const typColor  = { service: 'var(--c-teal-bg)',      felanmalan: 'var(--c-coral-bg)',      montering: 'var(--c-purple-bg)', mote: 'var(--c-purple-bg)'  }
const typBorder = { service: 'var(--c-teal)',          felanmalan: 'var(--c-coral)',          montering: 'var(--c-purple)',    mote: 'var(--c-purple)'     }
const typText   = { service: 'var(--c-teal-text)',    felanmalan: 'var(--c-coral-text)',    montering: 'var(--c-purple-text)', mote: 'var(--c-purple-text)'}
const typLabel  = { service: 'Service', felanmalan: 'Felanmälan', montering: 'Möte/Övrigt', mote: 'Möte/Övrigt' }

const TEK_COLORS = ['#2563eb', '#7c3aed', '#ea580c', '#0891b2', '#16a34a', '#b45309', '#db2777', '#0d9488']

const HOUR_START  = 7
const HOUR_END    = 16
const HOURS       = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i)
const HOUR_HEIGHT = 64

// ── Hjälpfunktioner ───────────────────────────────────────────────────────────
function getMonday(d) {
  const date = new Date(d)
  const day  = date.getDay()
  date.setDate(date.getDate() - day + (day === 0 ? -6 : 1))
  date.setHours(0, 0, 0, 0)
  return date
}
function toYMD(d) {
  // Använd lokal tid – toISOString() ger UTC vilket ger fel datum i t.ex. Sverige (UTC+2)
  const y  = d.getFullYear()
  const m  = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}
function getWeekNum(d) {
  const jan4 = new Date(d.getFullYear(), 0, 4)
  return Math.ceil(((d - jan4) / 86400000 + jan4.getDay() + 1) / 7)
}
function månNamn(d) { return d.toLocaleString('sv-SE', { month: 'long' }) }

function getTop(tid) {
  const [h, m] = (tid || '08:00').split(':').map(Number)
  return Math.max(0, Math.min((h - HOUR_START) * HOUR_HEIGHT + (m / 60) * HOUR_HEIGHT, (HOURS.length - 1) * HOUR_HEIGHT))
}
function tidTillMinuter(tid) {
  const [h, m] = (tid || '08:00').split(':').map(Number)
  return h * 60 + m
}
function layoutBokningar(items, filtTekniker) {
  const synliga = items.map((item, origIdx) => {
    const tekArr = Array.isArray(item.tek) ? item.tek : (item.tek ? [item.tek] : [])
    if (filtTekniker && !tekArr.includes(filtTekniker)) return null
    const startMin = tidTillMinuter(item.tid || '08:00')
    return { item, origIdx, tekArr, startMin, endMin: startMin + 60 }
  }).filter(Boolean)
  synliga.sort((a, b) => a.startMin - b.startMin)
  const kolEndar = []
  for (const ev of synliga) {
    let col = kolEndar.findIndex(slut => slut <= ev.startMin)
    if (col === -1) col = kolEndar.length
    ev.col = col
    kolEndar[col] = ev.endMin
  }
  for (const ev of synliga) {
    const överlappande = synliga.filter(o => o.startMin < ev.endMin && o.endMin > ev.startMin)
    ev.totalCols = Math.max(...överlappande.map(o => o.col + 1))
  }
  return synliga
}

// ── Sub-komponenter ───────────────────────────────────────────────────────────

function TeknikerVäljare({ tekniker, value = [], onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {tekniker.map(t => {
        const vald = value.includes(t)
        return (
          <button key={t} type="button"
            onClick={() => onChange(vald ? value.filter(x => x !== t) : [...value, t])}
            style={{ padding: '4px 12px', fontSize: 12, borderRadius: 20, cursor: 'pointer',
              border: `1px solid ${vald ? 'var(--c-navy)' : 'var(--c-border2)'}`,
              background: vald ? 'var(--c-blue-bg)' : 'transparent',
              color: vald ? 'var(--c-navy)' : 'var(--c-text2)',
              display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.15s' }}>
            {vald && <Check size={11} />}{t}
          </button>
        )
      })}
      {tekniker.length === 0 && (
        <span style={{ fontSize: 12, color: 'var(--c-text3)' }}>Inga medarbetare registrerade.</span>
      )}
    </div>
  )
}

function HändelseDetalj({ val, onRedigera, onTaBort, onGåTillÄrende, onGåTillObjekt, onStäng }) {
  const { item, dagNamn, nyckel } = val
  const tekArr = Array.isArray(item.tek) ? item.tek : (item.tek ? [item.tek] : [])
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
      onClick={onStäng}>
      <div className="card" style={{ width: 320, padding: 20 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', marginBottom: 3 }}>
              {dagNamn} {nyckel?.slice(5).replace('-', '/')} · {item.tid}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.3 }}>{item.namn}</div>
            {item.kund && <div style={{ fontSize: 13, color: 'var(--c-text2)', marginTop: 2 }}>{item.kund}</div>}
          </div>
          <button onClick={onStäng} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text3)', padding: 2 }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          <span className={`badge ${item.typ === 'service' ? 'badge-teal' : item.typ === 'felanmalan' ? 'badge-coral' : 'badge-purple'}`}>
            {typLabel[item.typ] || item.typ}
          </span>
          {tekArr.length > 0 && <span className="badge badge-gray">{tekArr.join(', ')}</span>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {item.arendeId && onGåTillÄrende && (
            <button onClick={onGåTillÄrende}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: 'var(--c-blue)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              <ExternalLink size={14} /> Gå till ärende
            </button>
          )}
          {onGåTillObjekt && (
            <button onClick={onGåTillObjekt}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: 'var(--c-teal)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              <ExternalLink size={14} /> Gå till port
            </button>
          )}
          <button onClick={onRedigera} className="btn"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
            <Pencil size={13} /> Redigera bokning
          </button>
          <button onClick={onTaBort}
            style={{ width: '100%', padding: '8px 14px', borderRadius: 8, background: 'none', border: '1px solid var(--c-border)', color: 'var(--c-red)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
            <Trash2 size={13} /> Ta bort bokning
          </button>
        </div>
      </div>
    </div>
  )
}

function BokningForm({ initial, dag, dagar, arenden, tekniker, kunder = [], onNyKund, onSpara, onAvbryt }) {
  const redigering = !!initial
  const [typ,  setTyp]      = useState(initial?.typ   || 'service')
  const [tid,  setTid]      = useState(initial?.tid   || '08:00')
  const [namn, setNamn]     = useState(initial?.namn  || '')
  const [kund, setKund]     = useState(initial?.kund  || '')
  const [tek,  setTek]      = useState(initial?.tek   || [])
  const [datum, setDatum]   = useState(initial?.datum || (dagar[0]?.nyckel || ''))
  const [valdArende, setValdArende] = useState('')
  const [fel, setFel]       = useState(false)

  const oppnaArenden = arenden.filter(a => a.status !== 'atgardad')

  const valjArende = (id) => {
    setValdArende(id)
    const a = arenden.find(x => x.id === id)
    if (a) { setNamn(a.namn || ''); setKund(a.kund || '') }
  }
  const submit = () => {
    if (!namn.trim()) { setFel(true); return }
    onSpara(datum, { tid, typ, namn: namn.trim(), kund: kund.trim(), tek, arendeId: initial?.arendeId || valdArende || null })
  }

  const inp = { width: '100%', padding: '6px 10px', fontSize: 12, border: '1px solid var(--c-border2)', borderRadius: 6, background: 'var(--c-bg)', color: 'var(--c-text)' }
  const lbl = { fontSize: 11, color: 'var(--c-text2)', marginBottom: 3, display: 'block' }
  const fld = { marginBottom: 10 }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div className="card" style={{ width: 420, padding: 20, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>
            {redigering ? 'Redigera bokning' : `Ny bokning${dag ? ` – ${dag}` : ''}`}
          </div>
          <button className="btn" onClick={onAvbryt} style={{ padding: '3px 7px' }}><X size={13} /></button>
        </div>

        {redigering && (
          <div style={fld}>
            <label style={lbl}>Dag</label>
            <select value={datum} onChange={e => setDatum(e.target.value)} style={inp}>
              {dagar.map(d => <option key={d.nyckel} value={d.nyckel}>{d.namn} {d.nyckel.slice(5).replace('-', '/')}</option>)}
            </select>
          </div>
        )}

        {!redigering && oppnaArenden.length > 0 && (
          <div style={fld}>
            <label style={lbl}>Kopplad ärende (valfritt)</label>
            <select value={valdArende} onChange={e => valjArende(e.target.value)} style={inp}>
              <option value="">– Ingen –</option>
              {oppnaArenden.map(a => <option key={a.id} value={a.id}>#{a.nr} · {a.namn} · {a.kund}</option>)}
            </select>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
          <div style={fld}>
            <label style={lbl}>Tid</label>
            <input type="time" value={tid} onChange={e => setTid(e.target.value)} style={inp} />
          </div>
          <div style={fld}>
            <label style={lbl}>Typ</label>
            <select value={typ} onChange={e => setTyp(e.target.value)} style={inp}>
              <option value="service">Service</option>
              <option value="felanmalan">Felanmälan</option>
              <option value="mote">Möte / Övrigt</option>
            </select>
          </div>
          <div style={{ ...fld, gridColumn: '1 / -1' }}>
            <label style={lbl}>Objekt / beskrivning *</label>
            <input type="text" placeholder="t.ex. Vikport – Lager A" value={namn}
              onChange={e => setNamn(e.target.value)}
              style={{ ...inp, borderColor: fel && !namn.trim() ? 'var(--c-red)' : undefined }} />
          </div>
          <div style={{ ...fld, gridColumn: '1 / -1' }}>
            <label style={lbl}>Kund</label>
            <KundVäljare kunder={kunder} value={kund} onChange={setKund} onNyKund={onNyKund} style={inp} />
          </div>
          <div style={{ ...fld, gridColumn: '1 / -1' }}>
            <label style={lbl}>Medarbetare</label>
            <TeknikerVäljare tekniker={tekniker} value={tek} onChange={setTek} />
          </div>
        </div>

        {fel && <div style={{ fontSize: 11, color: 'var(--c-red)', marginBottom: 10 }}>Fyll i objekt/beskrivning.</div>}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button className="btn btn-primary" onClick={submit} style={{ fontSize: 12 }}><Plus size={13} /> Spara</button>
          <button className="btn" onClick={onAvbryt} style={{ fontSize: 12 }}>Avbryt</button>
        </div>
      </div>
    </div>
  )
}

function BokArendeDialog({ arende, dagar, tekniker, onSpara, onAvbryt }) {
  const [datum, setDatum] = useState(dagar[0]?.nyckel || '')
  const [tid,   setTid]   = useState('08:00')
  const [tek,   setTek]   = useState([])
  const inp = { width: '100%', padding: '6px 10px', fontSize: 12, border: '1px solid var(--c-border2)', borderRadius: 6, background: 'var(--c-bg)', color: 'var(--c-text)' }
  const lbl = { fontSize: 11, color: 'var(--c-text2)', marginBottom: 3, display: 'block' }
  const submit = () => {
    if (!datum) return
    onSpara(datum, { tid, typ: 'felanmalan', namn: arende.namn || 'Okänd port', kund: arende.kund || '', tek, arendeId: arende.id })
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div className="card" style={{ width: 380, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Boka in ärende</div>
          <button className="btn" onClick={onAvbryt} style={{ padding: '3px 7px' }}><X size={13} /></button>
        </div>
        <div style={{ background: 'var(--c-coral-bg)', borderRadius: 8, padding: '9px 12px', marginBottom: 14, fontSize: 12, color: 'var(--c-coral-text)' }}>
          <div style={{ fontWeight: 600 }}>#{arende.nr} · {arende.feltyp}</div>
          <div>{arende.kund}{arende.namn ? ` · ${arende.namn}` : ''}</div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={lbl}>Dag</label>
          <select value={datum} onChange={e => setDatum(e.target.value)} style={inp}>
            {dagar.map(d => <option key={d.nyckel} value={d.nyckel}>{d.namn} {d.nyckel.slice(5).replace('-', '/')}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={lbl}>Tid</label>
          <input type="time" value={tid} onChange={e => setTid(e.target.value)} style={inp} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Medarbetare</label>
          <TeknikerVäljare tekniker={tekniker} value={tek} onChange={setTek} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={submit} style={{ fontSize: 12 }}><Plus size={13} /> Boka in</button>
          <button className="btn" onClick={onAvbryt} style={{ fontSize: 12 }}>Avbryt</button>
        </div>
      </div>
    </div>
  )
}

function EventKort({ ev, tekFärger, onClick }) {
  const s = TYPE_CFG[ev.type]
  const tekFärg = ev.tekniker ? (tekFärger[ev.tekniker] || '#888') : null
  return (
    <div onClick={onClick}
      style={{ borderRadius: 7, padding: '7px 8px', marginBottom: 5, cursor: onClick ? 'pointer' : 'default',
        borderLeft: `3px solid ${s.color}`, background: s.bg, transition: 'filter 0.12s' }}
      onMouseEnter={e => onClick && (e.currentTarget.style.filter = 'brightness(0.95)')}
      onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
    >
      <div style={{ fontSize: 9, fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
        {ev.type === 'akut' && (
          <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: '#dc2626', animation: 'blink 1s infinite' }} />
        )}
        {s.emoji} {s.label}
      </div>
      <div style={{ fontWeight: 700, fontSize: 11, color: 'var(--c-text)', lineHeight: 1.25 }}>{ev.title}</div>
      {ev.sub      && <div style={{ fontSize: 10, color: 'var(--c-text2)', marginTop: 1 }}>{ev.sub}</div>}
      {ev.typLabel && <div style={{ fontSize: 10, color: 'var(--c-text3)', marginTop: 1 }}>{ev.typLabel}</div>}
      {ev.tid      && <div style={{ fontSize: 9, color: 'var(--c-text3)', marginTop: 2 }}>⏰ {ev.tid}</div>}
      {tekFärg && (
        <div style={{ fontSize: 10, marginTop: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: tekFärg, display: 'inline-block', flexShrink: 0 }} />
          <span style={{ color: tekFärg, fontWeight: 500 }}>{ev.tekniker}</span>
        </div>
      )}
    </div>
  )
}

// ── Huvud-komponent ───────────────────────────────────────────────────────────
export default function Planeringstavla({
  montageorder = [], arenden = [], bokningar = {}, serviceorder = [],
  tekniker = [], kunder = [], objekt = [],
  onNavigeraArende, onNavigeraMontering, onNavigeraServiceorder,
  onLaggTillBokning, onTaBortBokning,
  onNyKund, onNavigeraObjekt,
}) {
  const [veckosta,     setVeckosta]     = useState(() => getMonday(new Date()))
  const [dagVy,        setDagVy]        = useState(null)   // null = vecka, 'YYYY-MM-DD' = dagvy
  const [typFilter,    setTypFilter]    = useState({ montage: true, service: true, arende: true, akut: true, kalender: true, serviceorder: true })
  const [tekFilter,    setTekFilter]    = useState('alla')
  const [filtTekniker, setFiltTekniker] = useState('')     // dagvy-filter
  const [formDag,      setFormDag]      = useState(null)
  const [redigerar,    setRedigerar]    = useState(null)
  const [bokArende,    setBokArende]    = useState(null)
  const [visaDetalj,   setVisaDetalj]   = useState(null)
  const [visaObokade,  setVisaObokade]  = useState(true)
  const [visaKommandeSO, setVisaKommandeSO] = useState(true)

  const idag = toYMD(new Date())

  // Veckodagar mån–fre
  const dagar = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(veckosta)
    d.setDate(d.getDate() + i)
    return { namn: DAGNAMN_KORT[i], lång: DAGNAMN_LÅNG[i], datum: d, nyckel: toYMD(d) }
  })

  const veckaNr = getWeekNum(veckosta)
  const slutdag = new Date(veckosta); slutdag.setDate(slutdag.getDate() + 4)

  const prevVecka = () => { setVeckosta(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n }); setDagVy(null) }
  const nextVecka = () => { setVeckosta(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n }); setDagVy(null) }
  const tillIdag  = () => { setVeckosta(getMonday(new Date())); setDagVy(null) }

  // Tekniker → färg
  const tekFärger = {}
  tekniker.forEach((t, i) => { tekFärger[t] = TEK_COLORS[i % TEK_COLORS.length] })

  // Obokade ärenden (öppna, saknar besöksdag)
  const obokade = arenden.filter(a => a.status !== 'atgardad' && !a.besok)

  // Events för ett datum (veckoöversikt)
  function eventsForDay(dag) {
    const ymd = toYMD(dag)
    const evs = []
    if (typFilter.montage) {
      montageorder.filter(m => m.status !== 'utford' && m.onskat_montagedag === ymd).forEach(m =>
        evs.push({ type: 'montage', id: 'm_' + m.id, title: m.ordernummer, sub: m.kund,
          typLabel: [m.porttyp, m.fabrikat].filter(Boolean).join(' · '), tekniker: m.tekniker || null, raw: m })
      )
    }
    if (typFilter.serviceorder) {
      serviceorder.filter(so => so.datum === ymd && so.status !== 'utford' && so.status !== 'arkiverad').forEach(so => {
        const antal = (so.objekt_ids || []).length
        evs.push({ type: 'serviceorder', id: 'so_' + so.id,
          title: so.fastighet_namn || so.nr || 'Serviceorder', sub: so.kund || null,
          typLabel: `${antal} port${antal !== 1 ? 'ar' : ''}`, tekniker: so.tekniker || null, raw: so })
      })
    }
    arenden.filter(a => a.status !== 'atgardad' && a.besok === ymd).forEach(a => {
      const isAkut = a.prioritet === 'akut'
      if (isAkut  && !typFilter.akut)   return
      if (!isAkut && !typFilter.arende) return
      evs.push({ type: isAkut ? 'akut' : 'arende', id: 'a_' + a.id, title: a.namn, sub: a.kund,
        typLabel: a.feltyp || null, tekniker: a.tekniker || null, raw: a })
    })
    ;(bokningar[ymd] || []).forEach((b, idx) => {
      const typ = b.typ === 'service' ? 'service' : b.typ === 'arende' ? 'arende' : 'kalender'
      if (!typFilter[typ]) return
      evs.push({ type: typ, id: `b_${ymd}_${idx}`, title: b.namn, sub: b.kund || null,
        tid: b.tid || null, tekniker: Array.isArray(b.tek) ? b.tek[0] : (b.tek || null), raw: b })
    })
    if (tekFilter !== 'alla') return evs.filter(e => e.tekniker === tekFilter)
    return evs
  }

  // Oplanerade (veckoöversikt-botten)
  const oplanerade = [
    ...montageorder.filter(m => m.status === 'ej_planerad' || (m.status === 'planerad' && !m.onskat_montagedag))
      .map(m => ({ type: 'montage', id: 'm_' + m.id, title: m.ordernummer, sub: m.kund,
        typLabel: m.porttyp, leverans: m.preliminar_leverans, raw: m })),
    ...arenden.filter(a => a.status !== 'atgardad' && !a.besok)
      .map(a => ({ type: a.prioritet === 'akut' ? 'akut' : 'arende', id: 'a_' + a.id,
        title: a.namn, sub: a.kund, typLabel: a.feltyp, raw: a })),
  ]

  const alleEvents = dagar.flatMap(d => eventsForDay(d.datum))
  const räkna = type => alleEvents.filter(e => e.type === type).length

  const startStr = `${dagar[0].datum.getDate()} ${månNamn(dagar[0].datum).slice(0, 3)}`
  const slutStr  = `${slutdag.getDate()} ${månNamn(slutdag).slice(0, 3)} ${slutdag.getFullYear()}`

  // Aktiv dag i dagvy
  const activeDag = dagVy ? dagar.find(d => d.nyckel === dagVy) : null

  // Övriga händelser för dagvy (montage + arende — ej bokningar)
  const dagEventsOvrigt = activeDag ? (() => {
    const ymd = activeDag.nyckel
    const evs = []
    montageorder.filter(m => m.status !== 'utford' && m.onskat_montagedag === ymd).forEach(m =>
      evs.push({ type: 'montage', id: 'm_' + m.id, title: m.ordernummer, sub: m.kund,
        typLabel: [m.porttyp, m.fabrikat].filter(Boolean).join(' · '), raw: m })
    )
    arenden.filter(a => a.status !== 'atgardad' && a.besok === ymd).forEach(a =>
      evs.push({ type: a.prioritet === 'akut' ? 'akut' : 'arende', id: 'a_' + a.id,
        title: a.namn, sub: a.kund, typLabel: a.feltyp, raw: a })
    )
    serviceorder.filter(so => so.datum === ymd && so.status !== 'utford' && so.status !== 'arkiverad').forEach(so => {
      const antal = (so.objekt_ids || []).length
      evs.push({ type: 'serviceorder', id: 'so_' + so.id,
        title: so.fastighet_namn || so.nr || 'Serviceorder', sub: so.kund || null,
        typLabel: `${antal} port${antal !== 1 ? 'ar' : ''}`, raw: so })
    })
    return evs
  })() : []

  const bokningarForDag = activeDag ? (bokningar[activeDag.nyckel] || []) : []

  // Bokning-handlers
  const sparaNyBokning  = (datum, b) => { onLaggTillBokning?.(datum, b); setFormDag(null) }
  const sparaRedigering = (nyttDatum, nyb) => {
    onTaBortBokning?.(redigerar.datum, redigerar.origIdx)
    onLaggTillBokning?.(nyttDatum, nyb)
    setRedigerar(null)
  }
  const bokaNed = (datum, b) => { onLaggTillBokning?.(datum, b); setBokArende(null) }

  const prioritetDot = { akut: 'var(--c-red)', hog: 'var(--c-amber)', normal: 'var(--c-blue)' }

  // Serviceorder som INTE är i aktuell vecka (visas i panelen nedan)
  const veckanYMDs = new Set(dagar.map(d => d.nyckel))
  const kommandeSO = serviceorder
    .filter(so => so.status !== 'utford' && so.status !== 'arkiverad' && (!so.datum || !veckanYMDs.has(so.datum)))
    .sort((a, b) => (!a.datum ? 1 : !b.datum ? -1 : a.datum.localeCompare(b.datum)))

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div>
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:.25} }`}</style>

      {/* Rubrik */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 2 }}>Planeringstavla</h1>
          <p style={{ color: 'var(--c-text2)', fontSize: 13 }}>
            {dagVy && activeDag
              ? `${activeDag.lång} ${activeDag.datum.getDate()} ${månNamn(activeDag.datum)} ${activeDag.datum.getFullYear()}`
              : 'Samlad veckoöversikt — montage, service, ärenden och händelser'}
          </p>
        </div>
        {dagVy && (
          <button className="btn" onClick={() => setDagVy(null)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <ChevronLeft size={13} /> Veckoöversikt
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn" onClick={prevVecka} style={{ display: 'flex', alignItems: 'center', padding: '6px 10px' }}>
          <ChevronLeft size={14} />
        </button>
        <span style={{ fontWeight: 700, fontSize: 14, minWidth: 200, textAlign: 'center' }}>
          v{veckaNr} · {startStr} – {slutStr}
        </span>
        <button className="btn" onClick={nextVecka} style={{ display: 'flex', alignItems: 'center', padding: '6px 10px' }}>
          <ChevronRight size={14} />
        </button>
        {toYMD(dagar[0].datum) !== toYMD(getMonday(new Date())) && (
          <button className="btn" style={{ fontSize: 11, color: 'var(--c-teal)', borderColor: 'var(--c-teal)' }} onClick={tillIdag}>
            Idag
          </button>
        )}
        {/* Dagväljare (visas bara i dagvy) */}
        {dagVy && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
            {dagar.map(d => (
              <button key={d.nyckel} onClick={() => setDagVy(d.nyckel)}
                style={{ padding: '4px 10px', borderRadius: 8, fontSize: 11, cursor: 'pointer',
                  fontWeight: d.nyckel === dagVy ? 700 : 400,
                  background: d.nyckel === dagVy ? 'var(--c-teal)' : 'var(--c-surface)',
                  color: d.nyckel === dagVy ? '#fff' : d.nyckel === idag ? 'var(--c-teal)' : 'var(--c-text2)',
                  border: d.nyckel === dagVy ? '1.5px solid var(--c-teal)' : d.nyckel === idag ? '1.5px solid var(--c-teal)' : '1px solid var(--c-border)' }}>
                {d.namn} {d.datum.getDate()}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ══ VECKOÖVERSIKT ══ */}
      {!dagVy && (
        <>
          {/* Summering */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 9, marginBottom: 14 }}>
            {(['montage', 'serviceorder', 'service', 'arende', 'akut']).map(k => {
              const s = TYPE_CFG[k]
              return (
                <div key={k} style={{ background: 'var(--c-surface)', borderRadius: 9, border: '1px solid var(--c-border)', padding: '10px 14px' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{räkna(k)}</div>
                  <div style={{ fontSize: 11, color: 'var(--c-text2)', marginTop: 1 }}>{s.emoji} {s.label} denna vecka</div>
                </div>
              )
            })}
          </div>

          {/* Typfilter */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--c-text3)' }}>Visa:</span>
            {Object.entries(TYPE_CFG).map(([k, s]) => (
              <button key={k} onClick={() => setTypFilter(p => ({ ...p, [k]: !p[k] }))}
                style={{ padding: '3px 11px', borderRadius: 12, fontSize: 11, cursor: 'pointer', fontWeight: 600,
                  border: `1.5px solid ${s.color}`,
                  background: typFilter[k] ? s.color : 'transparent',
                  color: typFilter[k] ? '#fff' : s.color }}>
                {s.emoji} {s.label}
              </button>
            ))}
          </div>

          {/* Teknikerfilter */}
          {tekniker.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--c-text3)' }}>Tekniker:</span>
              <button onClick={() => setTekFilter('alla')}
                style={{ padding: '3px 11px', borderRadius: 12, fontSize: 11, cursor: 'pointer', fontWeight: 600,
                  background: tekFilter === 'alla' ? 'var(--c-teal)' : 'var(--c-surface)',
                  color: tekFilter === 'alla' ? '#fff' : 'var(--c-text2)',
                  border: tekFilter === 'alla' ? '1.5px solid var(--c-teal)' : '1px solid var(--c-border)' }}>
                Alla
              </button>
              {tekniker.map(t => (
                <button key={t} onClick={() => setTekFilter(tekFilter === t ? 'alla' : t)}
                  style={{ padding: '3px 11px', borderRadius: 12, fontSize: 11, cursor: 'pointer', fontWeight: 600,
                    border: `1.5px solid ${tekFärger[t] || '#888'}`,
                    background: tekFilter === t ? tekFärger[t] || '#888' : 'transparent',
                    color: tekFilter === t ? '#fff' : tekFärger[t] || '#888' }}>
                  ● {t}
                </button>
              ))}
            </div>
          )}

          {/* Veckogrid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 9 }}>
            {dagar.map((dag, idx) => {
              const erIdag = dag.nyckel === idag
              const evs    = eventsForDay(dag.datum)
              return (
                <div key={dag.nyckel} style={{ background: 'var(--c-surface)', borderRadius: 10,
                  border: `1px solid ${erIdag ? 'var(--c-teal)' : 'var(--c-border)'}`,
                  boxShadow: erIdag ? '0 0 0 2px rgba(29,158,117,0.15)' : 'none',
                  overflow: 'hidden', minHeight: 200 }}>

                  {/* Dagrubrik – klickbar för dagvy */}
                  <div onClick={() => setDagVy(dag.nyckel)}
                    style={{ padding: '9px 11px 8px', borderBottom: '1px solid var(--c-border)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                      cursor: 'pointer', transition: 'background 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--c-bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {DAGNAMN_LÅNG[idx]}
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.1,
                        color: erIdag ? 'var(--c-teal)' : 'var(--c-text)' }}>
                        {dag.datum.getDate()}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--c-text3)', marginTop: 1 }}>
                        {evs.length > 0 ? `${evs.length} händels${evs.length !== 1 ? 'er' : 'e'}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      {erIdag && (
                        <span style={{ fontSize: 9, background: 'var(--c-teal-bg)', color: 'var(--c-teal)',
                          padding: '2px 7px', borderRadius: 8, fontWeight: 700 }}>Idag</span>
                      )}
                      {onLaggTillBokning && (
                        <button
                          onClick={e => { e.stopPropagation(); setFormDag(dag.nyckel) }}
                          className="btn"
                          style={{ fontSize: 10, padding: '2px 7px', display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Plus size={9} /> Ny
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Events */}
                  <div style={{ padding: 7 }}>
                    {evs.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '24px 4px', color: 'var(--c-text3)', fontSize: 11 }}>–</div>
                    )}
                    {evs.map(ev => (
                      <EventKort key={ev.id} ev={ev} tekFärger={tekFärger}
                        onClick={
                          (ev.type === 'arende' || ev.type === 'akut') && onNavigeraArende ? () => onNavigeraArende(ev.raw.id) :
                          ev.type === 'montage' && onNavigeraMontering ? () => onNavigeraMontering(ev.raw) :
                          ev.type === 'serviceorder' && onNavigeraServiceorder ? () => onNavigeraServiceorder(ev.raw.id) : null
                        }
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ══ DAGVY ══ */}
      {dagVy && activeDag && (
        <div>
          {/* Teknikerfilter */}
          {tekniker.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <Filter size={13} color="var(--c-text3)" />
              <select value={filtTekniker} onChange={e => setFiltTekniker(e.target.value)}
                style={{ padding: '5px 10px', fontSize: 12, border: '1px solid var(--c-border)', borderRadius: 6, background: 'var(--c-surface)', color: 'var(--c-text)' }}>
                <option value="">Alla medarbetare</option>
                {tekniker.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}

          {/* Övriga händelser (montage + arende) */}
          {dagEventsOvrigt.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>
                Dagsöversikt
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {dagEventsOvrigt.map(ev => {
                  const s = TYPE_CFG[ev.type]
                  return (
                    <div key={ev.id}
                      onClick={() => {
                        if ((ev.type === 'arende' || ev.type === 'akut') && onNavigeraArende) onNavigeraArende(ev.raw.id)
                        else if (ev.type === 'montage' && onNavigeraMontering) onNavigeraMontering(ev.raw)
                        else if (ev.type === 'serviceorder' && onNavigeraServiceorder) onNavigeraServiceorder(ev.raw.id)
                      }}
                      style={{ flex: '1 1 200px', maxWidth: 280, borderRadius: 8, padding: '9px 12px',
                        borderLeft: `3px solid ${s.color}`, background: s.bg, cursor: 'pointer', transition: 'filter 0.12s' }}
                      onMouseEnter={e => e.currentTarget.style.filter = 'brightness(0.95)'}
                      onMouseLeave={e => e.currentTarget.style.filter = 'none'}
                    >
                      <div style={{ fontSize: 9, fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 }}>{s.emoji} {s.label}</div>
                      <div style={{ fontWeight: 600, fontSize: 12 }}>{ev.title}</div>
                      {ev.sub      && <div style={{ fontSize: 11, color: 'var(--c-text2)' }}>{ev.sub}</div>}
                      {ev.typLabel && <div style={{ fontSize: 11, color: 'var(--c-text3)' }}>{ev.typLabel}</div>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Tidsgrid med bokningar */}
          <div style={{ border: '1px solid var(--c-border)', borderRadius: 12, overflow: 'hidden', background: 'var(--c-surface)' }}>
            {/* Header */}
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--c-border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>
                Bokningar {activeDag.lång.toLowerCase()} {activeDag.datum.getDate()} {månNamn(activeDag.datum)}
                {bokningarForDag.length > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--c-text3)', marginLeft: 8 }}>({bokningarForDag.length} st)</span>
                )}
              </div>
              {onLaggTillBokning && (
                <button className="btn btn-primary" onClick={() => setFormDag(activeDag.nyckel)}
                  style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Plus size={12} /> Lägg till bokning
                </button>
              )}
            </div>

            {/* Tidsgrid */}
            <div style={{ display: 'flex', overflowY: 'auto', maxHeight: 620 }}>
              {/* Tidsaxel */}
              <div style={{ width: 52, flexShrink: 0, borderRight: '1px solid var(--c-border)', background: 'var(--c-surface)' }}>
                {HOURS.map((h, hi) => (
                  <div key={h} style={{ height: HOUR_HEIGHT, fontSize: 10, color: 'var(--c-text3)',
                    textAlign: 'right', paddingRight: 8, paddingTop: 4,
                    borderTop: hi === 0 ? 'none' : '1px solid var(--c-border)' }}>
                    {String(h).padStart(2, '0')}:00
                  </div>
                ))}
              </div>

              {/* Dag-kolumn */}
              <div style={{ flex: 1, position: 'relative' }}>
                {HOURS.map((h, hi) => (
                  <div key={h} style={{ height: HOUR_HEIGHT, borderTop: hi === 0 ? 'none' : '1px solid var(--c-border)', boxSizing: 'border-box' }} />
                ))}
                {layoutBokningar(bokningarForDag, filtTekniker).map(({ item, origIdx, tekArr, col, totalCols }) => {
                  const bredd   = 100 / totalCols
                  const vänster = col * bredd
                  return (
                    <div key={origIdx}
                      onClick={() => setVisaDetalj({ item: { ...item, tek: tekArr }, dagNamn: activeDag.lång, nyckel: activeDag.nyckel, origIdx })}
                      style={{ position: 'absolute', top: getTop(item.tid) + 2,
                        left: `calc(${vänster}% + 2px)`, width: `calc(${bredd}% - 4px)`,
                        minHeight: HOUR_HEIGHT - 6,
                        background: typColor[item.typ] || 'var(--c-blue-bg)',
                        borderLeft: `3px solid ${typBorder[item.typ] || 'var(--c-blue)'}`,
                        borderRadius: '0 6px 6px 0', padding: '3px 5px', cursor: 'pointer',
                        overflow: 'hidden', zIndex: 2, boxSizing: 'border-box',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                      <div style={{ fontSize: 10, color: typText[item.typ], fontWeight: 700, marginBottom: 1 }}>
                        {item.tid} · {typLabel[item.typ] || item.typ}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 500, lineHeight: 1.2 }}>{item.namn}</div>
                      {item.kund && totalCols < 3 && <div style={{ fontSize: 10, color: 'var(--c-text2)' }}>{item.kund}</div>}
                      {tekArr.length > 0 && totalCols < 3 && (
                        <div style={{ fontSize: 10, color: 'var(--c-text2)', marginTop: 1 }}>{tekArr.join(', ')}</div>
                      )}
                    </div>
                  )
                })}
                {bokningarForDag.length === 0 && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-text3)', fontSize: 13 }}>
                    Inga bokningar — klicka "Lägg till bokning" för att schemalägga
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Oplanerade (veckoöversikt) */}
      {!dagVy && oplanerade.length > 0 && (
        <div style={{ marginTop: 14, background: 'var(--c-surface)', borderRadius: 10, border: '1px solid var(--c-border)', padding: '12px 14px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 9 }}>
            ⏳ Ej schemalagda ({oplanerade.length})
          </div>
          <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
            {oplanerade.map(ev => {
              const s = TYPE_CFG[ev.type]
              return (
                <div key={ev.id}
                  onClick={() => {
                    if ((ev.type === 'arende' || ev.type === 'akut') && onNavigeraArende) onNavigeraArende(ev.raw.id)
                    else if (ev.type === 'montage' && onNavigeraMontering) onNavigeraMontering(ev.raw)
                    else if (ev.type === 'serviceorder' && onNavigeraServiceorder) onNavigeraServiceorder(ev.raw.id)
                  }}
                  style={{ flex: '1 1 170px', maxWidth: 230, borderRadius: 7, padding: '8px 10px',
                    borderLeft: `3px solid ${s.color}`, background: s.bg, cursor: 'pointer', transition: 'filter 0.12s' }}
                  onMouseEnter={e => e.currentTarget.style.filter = 'brightness(0.95)'}
                  onMouseLeave={e => e.currentTarget.style.filter = 'none'}
                >
                  <div style={{ fontSize: 9, fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 }}>{s.emoji} {s.label}</div>
                  <div style={{ fontWeight: 700, fontSize: 11 }}>{ev.title}</div>
                  {ev.sub      && <div style={{ fontSize: 10, color: 'var(--c-text2)', marginTop: 1 }}>{ev.sub}</div>}
                  {ev.typLabel && <div style={{ fontSize: 10, color: 'var(--c-text3)', marginTop: 1 }}>{ev.typLabel}</div>}
                  {ev.leverans && <div style={{ fontSize: 10, color: '#b45309', marginTop: 3 }}>📦 Leverans: {ev.leverans}</div>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Obokade ärenden */}
      {obokade.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <button onClick={() => setVisaObokade(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              background: 'var(--c-coral-bg)', border: '1px solid #f0c0b0',
              borderRadius: visaObokade ? '10px 10px 0 0' : 10,
              padding: '10px 14px', cursor: 'pointer', color: 'var(--c-coral-text)', fontSize: 13, fontWeight: 500 }}>
            <AlertCircle size={15} />
            <span style={{ flex: 1, textAlign: 'left' }}>
              {obokade.length} ej inbokad{obokade.length > 1 ? 'e' : ''} ärende{obokade.length > 1 ? 'n' : ''}
            </span>
            {visaObokade ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {visaObokade && (
            <div style={{ background: 'var(--c-surface)', border: '1px solid #f0c0b0', borderTop: 'none',
              borderRadius: '0 0 10px 10px', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {obokade.map(a => (
                <div key={a.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px',
                    borderRadius: 8, background: 'var(--c-bg)', border: '1px solid var(--c-border)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: prioritetDot[a.prioritet] || 'var(--c-blue)' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      #{a.nr} · {a.feltyp || a.namn}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--c-text2)' }}>{a.kund}{a.namn ? ` · ${a.namn}` : ''}</div>
                  </div>
                  {onLaggTillBokning && (
                    <button className="btn btn-primary" style={{ fontSize: 11, padding: '4px 10px', flexShrink: 0 }}
                      onClick={() => setBokArende(a)}>
                      + Boka in
                    </button>
                  )}
                  {onNavigeraArende && (
                    <button className="btn" style={{ fontSize: 11, padding: '4px 8px', flexShrink: 0 }}
                      onClick={() => onNavigeraArende(a.id)}>
                      Öppna
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Kommande serviceorder (ej i aktuell vecka) */}
      {!dagVy && kommandeSO.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <button onClick={() => setVisaKommandeSO(v => !v)} style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            background: '#ecfeff', border: '1px solid #a5f3fc',
            borderRadius: visaKommandeSO ? '10px 10px 0 0' : 10,
            padding: '10px 14px', cursor: 'pointer', color: '#0e7490', fontSize: 13, fontWeight: 500,
          }}>
            <ClipboardList size={15} />
            <span style={{ flex: 1, textAlign: 'left' }}>
              {kommandeSO.length} planerad{kommandeSO.length !== 1 ? 'e' : ''} serviceorder – ej denna vecka
            </span>
            {visaKommandeSO ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {visaKommandeSO && (
            <div style={{ background: 'var(--c-surface)', border: '1px solid #a5f3fc', borderTop: 'none', borderRadius: '0 0 10px 10px', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {kommandeSO.map(so => {
                const antal = (so.objekt_ids || []).length
                const statusCfg = so.status === 'pagaende'
                  ? { label: 'Pågående', color: 'var(--c-blue)' }
                  : { label: 'Planerad', color: 'var(--c-text3)' }
                return (
                  <div key={so.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 8, background: 'var(--c-bg)', border: '1px solid var(--c-border)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: '#0891b2' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {so.nr}
                        <span style={{ fontSize: 10, color: statusCfg.color, fontWeight: 500 }}>· {statusCfg.label}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--c-text2)' }}>
                        {so.datum ? so.datum : '–'} · {so.fastighet_namn || so.kund || '–'} · {antal} port{antal !== 1 ? 'ar' : ''}
                        {so.tekniker ? ` · ${so.tekniker}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                      {so.datum && (
                        <button className="btn" style={{ fontSize: 11, padding: '4px 8px' }}
                          onClick={() => { setVeckosta(getMonday(new Date(so.datum + 'T12:00:00'))); setDagVy(null) }}>
                          Gå till vecka
                        </button>
                      )}
                      {onNavigeraServiceorder && (
                        <button className="btn btn-primary" style={{ fontSize: 11, padding: '4px 10px' }}
                          onClick={() => onNavigeraServiceorder(so.id)}>
                          Öppna
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Dialoger ── */}
      {formDag && (
        <BokningForm
          dag={dagar.find(d => d.nyckel === formDag)?.lång || formDag}
          dagar={[dagar.find(d => d.nyckel === formDag)].filter(Boolean)}
          arenden={arenden}
          tekniker={tekniker}
          kunder={kunder}
          onNyKund={onNyKund}
          onSpara={sparaNyBokning}
          onAvbryt={() => setFormDag(null)}
        />
      )}

      {redigerar && (
        <BokningForm
          initial={redigerar}
          dagar={dagar}
          arenden={arenden}
          tekniker={tekniker}
          kunder={kunder}
          onNyKund={onNyKund}
          onSpara={sparaRedigering}
          onAvbryt={() => setRedigerar(null)}
        />
      )}

      {bokArende && (
        <BokArendeDialog
          arende={bokArende}
          dagar={dagar}
          tekniker={tekniker}
          onSpara={bokaNed}
          onAvbryt={() => setBokArende(null)}
        />
      )}

      {visaDetalj && (
        <HändelseDetalj
          val={visaDetalj}
          onStäng={() => setVisaDetalj(null)}
          onRedigera={() => {
            setRedigerar({ ...visaDetalj.item, datum: visaDetalj.nyckel, origIdx: visaDetalj.origIdx })
            setVisaDetalj(null)
          }}
          onTaBort={() => {
            onTaBortBokning?.(visaDetalj.nyckel, visaDetalj.origIdx)
            setVisaDetalj(null)
          }}
          onGåTillÄrende={visaDetalj.item.arendeId ? () => {
            setVisaDetalj(null)
            if (onNavigeraArende) onNavigeraArende(visaDetalj.item.arendeId)
          } : undefined}
          onGåTillObjekt={(() => {
            if (!onNavigeraObjekt || visaDetalj.item.arendeId) return undefined
            const port = objekt.find(o => !o.arkiverad && o.namn === visaDetalj.item.namn)
            if (!port) return undefined
            return () => { setVisaDetalj(null); onNavigeraObjekt(port.id) }
          })()}
        />
      )}
    </div>
  )
}
