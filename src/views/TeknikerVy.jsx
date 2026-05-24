import { useState, useRef } from 'react'
import { Calendar, AlertCircle, LogOut, Clock, CheckCircle, Play,
         ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
         ClipboardList, Wrench, Database, Search, FileText } from 'lucide-react'
import logo from '../logo.png'
import { protokollPunkter, RISKPUNKTER } from '../data/store.js'

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
  Vikport: [
    'Portblad och skenor utan skador eller deformationer',
    'Vridpunkter / gångjärn smorda och kontrollerade',
    'Fjädersystem kalibrerat och säkrat',
    'Säkerhetsbroms kontrollerad och testad',
    'Nödöppning (handmanöver) testad',
    'Automatikmotor monterad och kalibrerad',
    'Fotocell / säkerhetskant testad (reversering)',
    'Dörrslutning och tätlister kontrollerade',
    'Ändlägen inställda',
    'CE-märkning och varningsskyltar monterade',
    'Bruksanvisning överlämnad till kund',
  ],
  Takskjutport: [
    'Skensystem rakt, horisontalt och säkrat',
    'Balansfjädrar kontrollerade och justerade',
    'Portblad utan skador eller deformationer',
    'Hjul och lager smorda',
    'Nödöppning (handmanöver) testad',
    'Motormontering och fästpunkter kontrollerade',
    'Ändlägen inställda',
    'Säkerhetsfunktioner (reversering) testade',
    'Anslutning till elnät kontrollerad',
    'CE-märkning monterad',
    'Bruksanvisning överlämnad till kund',
  ],
  Lastbrygga: [
    'Hydraulsystem utan läckage',
    'Läpplucka och plattform utan skador',
    'Styrsystem och manöverpanel testad',
    'Ändlägesavstängning kontrollerad',
    'Säkerhetskant / lista testad',
    'Maxlast tydligt markerad',
    'Elektrisk installation kontrollerad',
    'Nödstoppsfunktion testad',
    'Hydraulslang utan skador eller förslitning',
    'CE-märkning monterad',
    'Bruksanvisning överlämnad till kund',
  ],
  Grind: [
    'Stolpar / fundament stabilt monterade och ingjutna',
    'Räls / styrning rak och säkrad',
    'Grindblad utan skador eller deformationer',
    'Motorenhet monterad och konfigurerad',
    'Fotocell / säkerhetskant kontrollerad',
    'Nödöppning testad',
    'Trafikljus / signallampor testade (om tillämpligt)',
    'Låssystem kontrollerat',
    'Ändlägen inställda',
    'CE-märkning monterad',
    'Bruksanvisning överlämnad till kund',
  ],
}

// ── Hjälp ─────────────────────────────────────────────────────────────────────
function formatDag(d) {
  try {
    const [y, m, day] = d.split('-').map(Number)
    return new Date(y, m - 1, day).toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })
  } catch { return d }
}

// ── SignaturPad ───────────────────────────────────────────────────────────────
function SignaturPad({ onChange }) {
  const ref = useRef(null)
  const drawing = useRef(false)
  const last = useRef({ x: 0, y: 0 })
  const pos = (e, c) => {
    const r = c.getBoundingClientRect()
    const s = e.touches ? e.touches[0] : e
    return { x: (s.clientX - r.left) * (c.width / r.width), y: (s.clientY - r.top) * (c.height / r.height) }
  }
  const start = e => { drawing.current = true; last.current = pos(e, ref.current); e.preventDefault() }
  const draw  = e => {
    if (!drawing.current) return
    const c = ref.current, ctx = c.getContext('2d'), p = pos(e, c)
    ctx.beginPath(); ctx.moveTo(last.current.x, last.current.y); ctx.lineTo(p.x, p.y)
    ctx.strokeStyle = '#1a1917'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.stroke()
    last.current = p; e.preventDefault()
  }
  const stop  = () => { if (!drawing.current) return; drawing.current = false; onChange?.(ref.current.toDataURL()) }
  const rensa = () => { ref.current.getContext('2d').clearRect(0, 0, 600, 150); onChange?.(null) }
  return (
    <div>
      <canvas ref={ref} width={600} height={150}
        style={{ border: '2px solid var(--c-border)', borderRadius: 10, width: '100%', background: '#fff', touchAction: 'none', display: 'block' }}
        onMouseDown={start} onMouseMove={draw} onMouseUp={stop} onMouseLeave={stop}
        onTouchStart={start} onTouchMove={draw} onTouchEnd={stop} />
      <button className="btn" style={{ fontSize: 12, marginTop: 8 }} onClick={rensa}>✕ Rensa</button>
    </div>
  )
}

// ── ArendeKort ────────────────────────────────────────────────────────────────
function ArendeKort({ a, onUppdatera }) {
  const [utv,     setUtv]     = useState(false)
  const [notering,setNotering]= useState(a.notering || '')
  const [sparar,  setSparar]  = useState(false)
  const [klarad,  setKlarad]  = useState(false)

  if (klarad) return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--c-teal-bg)', border: '1px solid var(--c-teal)' }}>
      <CheckCircle size={24} color="var(--c-teal)" />
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-teal-text)' }}>Klart!</div>
        <div style={{ fontSize: 12, color: 'var(--c-teal-text)' }}>#{a.nr} · {a.kund}</div>
      </div>
    </div>
  )

  const prio = PRIO_CONF[a.prioritet] || PRIO_CONF.normal
  return (
    <div className="card" style={{ borderLeft: `4px solid ${prio.bar}`, padding: 0, overflow: 'hidden' }}>
      <div onClick={() => setUtv(v => !v)} style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <span className={`badge ${prio.badge}`} style={{ marginBottom: 6, display: 'inline-block' }}>{prio.label}</span>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{a.kund}</div>
          <div style={{ fontSize: 13, color: 'var(--c-text2)' }}>{a.namn || a.feltyp || 'Felanmälan'}</div>
          {a.besok && <div style={{ fontSize: 12, color: 'var(--c-blue-text)', marginTop: 4 }}>📅 Besök: {a.besok}</div>}
        </div>
        <div style={{ color: 'var(--c-text3)', paddingTop: 4 }}>{utv ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}</div>
      </div>
      {utv && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--c-border)' }}>
          {a.beskrivning && (
            <div style={{ fontSize: 13, color: 'var(--c-text2)', fontStyle: 'italic', background: 'var(--c-bg)', borderRadius: 8, padding: '10px 12px', margin: '12px 0' }}>
              "{a.beskrivning}"
            </div>
          )}
          <label style={{ fontSize: 12, color: 'var(--c-text2)', display: 'block', marginBottom: 4, marginTop: 12 }}>Notering / åtgärd</label>
          <textarea value={notering} onChange={e => setNotering(e.target.value)} rows={2}
            placeholder="Beskriv utförd åtgärd…"
            style={{ width: '100%', padding: '8px 10px', fontSize: 13, borderRadius: 8, border: '1px solid var(--c-border)', background: 'var(--c-bg)', color: 'var(--c-text)', resize: 'vertical', boxSizing: 'border-box', marginBottom: 10 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {a.status === 'ny' && (
              <button disabled={sparar} onClick={async () => { setSparar(true); await onUppdatera(a.id, { status: 'pagAr' }); setSparar(false) }}
                style={{ width: '100%', padding: 14, borderRadius: 10, background: 'var(--c-blue)', color: '#fff', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Play size={16} fill="#fff" /> Starta arbete
              </button>
            )}
            {(a.status === 'ny' || a.status === 'pagAr') && (
              <button disabled={sparar} onClick={async () => { setSparar(true); await onUppdatera(a.id, { status: 'atgardad', notering }); setKlarad(true); setSparar(false) }}
                style={{ width: '100%', padding: 14, borderRadius: 10, background: 'var(--c-teal)', color: '#fff', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <CheckCircle size={16} /> Markera klar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Serviceprotokoll-formulär ─────────────────────────────────────────────────
function ServiceProtokollFormular({ port, namn, onSlutfor, onBack }) {
  const punkter   = protokollPunkter[port?.typ] || []
  const [statuses,  setStatuses]  = useState({})
  const [noter,     setNoter]     = useState({})
  const [signatur,  setSignatur]  = useState(null)
  const [sparar,    setSparar]    = useState(false)

  const gCount = Object.values(statuses).filter(s => s === 'G').length
  const jCount = Object.values(statuses).filter(s => s === 'J').length
  const aCount = Object.values(statuses).filter(s => s === 'A').length
  const ifyllda = gCount + jCount + aCount
  const total   = punkter.filter(p => !String(p).startsWith('## ')).length
  const pct     = total > 0 ? Math.round((ifyllda / total) * 100) : 0

  const godkannAlla = () => {
    const nya = {}
    punkter.forEach((p, i) => { if (!String(p).startsWith('## ')) nya[i] = 'G' })
    setStatuses(nya)
  }

  const slutfor = async () => {
    setSparar(true)
    await onSlutfor({ datum: new Date().toISOString().slice(0,10), tekniker: namn, statuses, noteringar: noter, signatur, g: gCount, j: jCount, a: aCount, portTyp: port?.typ, portNamn: port?.namn, kund: port?.kund })
    setSparar(false)
  }

  let nr = 0
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button className="btn" onClick={onBack} style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 5 }}>
          <ChevronLeft size={16} /> Tillbaka
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{port?.namn}</div>
          <div style={{ fontSize: 12, color: 'var(--c-text2)' }}>Serviceprotokoll · {port?.typ}</div>
        </div>
      </div>

      {/* Progress + godkänn alla */}
      <div className="card" style={{ marginBottom: 12, padding: '12px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
          <span style={{ color: 'var(--c-text2)' }}>{ifyllda}/{total} ifyllda</span>
          <span>
            {gCount > 0 && <span style={{ color: 'var(--c-teal)', fontWeight: 600 }}>✓{gCount} </span>}
            {jCount > 0 && <span style={{ color: 'var(--c-amber)', fontWeight: 600 }}>⚠{jCount} </span>}
            {aCount > 0 && <span style={{ color: 'var(--c-red)', fontWeight: 600 }}>✗{aCount}</span>}
          </span>
        </div>
        <div className="progress-bar" style={{ height: 6, marginBottom: 10 }}>
          <div className="progress-fill" style={{ width: `${pct}%`, background: aCount > 0 ? 'var(--c-red)' : jCount > 0 ? 'var(--c-amber)' : 'var(--c-teal)' }} />
        </div>
        <button onClick={godkannAlla} style={{ width: '100%', padding: 10, borderRadius: 8, background: 'var(--c-teal-bg)', color: 'var(--c-teal-text)', border: '1px solid var(--c-teal)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          ✓ Godkänn alla
        </button>
      </div>

      {/* Kontrollpunkter */}
      {punkter.map((p, i) => {
        if (String(p).startsWith('## ')) return (
          <div key={i} style={{ padding: '8px 14px', background: 'var(--c-bg)', borderRadius: 8, margin: '12px 0 6px', borderLeft: '3px solid var(--c-blue)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-blue)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{String(p).slice(3)}</span>
          </div>
        )
        nr++
        const s = statuses[i] || ''
        return (
          <div key={i} className="card" style={{ marginBottom: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 13, marginBottom: 10, lineHeight: 1.4 }}>
              <span style={{ color: 'var(--c-text3)', marginRight: 6, fontSize: 11 }}>{nr}.</span>{p}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              {PROT_STATUSES.map(({ kod, label, bg, txt, border }) => (
                <button key={kod} onClick={() => setStatuses(prev => ({ ...prev, [i]: s === kod ? undefined : kod }))}
                  style={{ padding: '13px 4px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `2px solid ${s === kod ? border : 'var(--c-border)'}`, background: s === kod ? bg : 'transparent', color: s === kod ? txt : 'var(--c-text3)' }}>
                  {label}
                </button>
              ))}
            </div>
            {(s === 'J' || s === 'A') && (
              <input type="text" placeholder="Notering / åtgärd…" value={noter[i] || ''}
                onChange={e => setNoter(prev => ({ ...prev, [i]: e.target.value }))}
                style={{ marginTop: 8, width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid var(--c-border)', borderRadius: 8, background: 'var(--c-bg)', color: 'var(--c-text)', boxSizing: 'border-box' }} />
            )}
          </div>
        )
      })}

      {/* Signatur + slutför */}
      <div className="card" style={{ marginBottom: 80 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Signatur tekniker</div>
        <SignaturPad onChange={setSignatur} />
        <button onClick={slutfor} disabled={sparar || ifyllda === 0}
          style={{ width: '100%', padding: 16, marginTop: 14, borderRadius: 10, background: ifyllda === 0 ? 'var(--c-border)' : 'var(--c-teal)', color: ifyllda === 0 ? 'var(--c-text3)' : '#fff', border: 'none', fontSize: 15, fontWeight: 700, cursor: ifyllda === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <CheckCircle size={18} /> {sparar ? 'Sparar…' : 'Slutför serviceprotokoll'}
        </button>
      </div>
    </div>
  )
}

// ── ServiceorderDetalj ────────────────────────────────────────────────────────
function ServiceorderDetalj({ order, objekt, namn, onUppdatera, onUppdateraObjekt, onBack }) {
  const [vy, setVy] = useState('info')

  const port = (order.objekt_ids || []).map(id => objekt.find(o => o.id === id)).filter(Boolean)[0] || null

  const hanteraSlutfort = async (prot) => {
    const now = new Date().toISOString().slice(0, 10)
    await onUppdatera(order.id, { status: 'avslutad', protokoll: prot })
    if (port) {
      const nyHistorik = [...(port.historik || []), { typ: 'service', datum: now, tekniker: namn, portNamn: port.namn, portTyp: port.typ, statuses: prot.statuses, noteringar: prot.noteringar, signatur: prot.signatur, g: prot.g, j: prot.j, a: prot.a }]
      const nasta = port.serviceIntervall > 0 ? (() => { const d = new Date(); d.setMonth(d.getMonth() + (port.serviceIntervall || 12)); return d.toISOString().slice(0, 10) })() : (port.nasta || '')
      await onUppdateraObjekt(port.id, { historik: nyHistorik, senaste: now, nasta })
    }
    setVy('klar')
  }

  if (vy === 'protokoll') return (
    <ServiceProtokollFormular port={port} namn={namn} onSlutfor={hanteraSlutfort} onBack={() => setVy('info')} />
  )

  if (vy === 'klar') return (
    <div style={{ textAlign: 'center', padding: '48px 20px' }}>
      <CheckCircle size={56} color="var(--c-teal)" style={{ margin: '0 auto 16px', display: 'block' }} />
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--c-teal-text)', marginBottom: 8 }}>Serviceorder klar!</div>
      <div style={{ fontSize: 14, color: 'var(--c-text2)', marginBottom: 24 }}>{port?.namn} · {new Date().toISOString().slice(0,10)}</div>
      <button className="btn btn-primary" onClick={onBack} style={{ width: '100%', padding: 14, fontSize: 15 }}>← Tillbaka</button>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button className="btn" onClick={onBack} style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 5 }}><ChevronLeft size={16} /> Tillbaka</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Serviceorder #{order.nr || '–'}</div>
          <div style={{ fontSize: 12, color: 'var(--c-text2)' }}>{order.kund}</div>
        </div>
        <span className={`badge ${order.status === 'planerad' ? 'badge-blue' : order.status === 'avslutad' ? 'badge-teal' : 'badge-amber'}`}>
          {order.status === 'planerad' ? 'Planerad' : order.status === 'avslutad' ? 'Avslutad' : 'Pågår'}
        </span>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        {[
          ['Datum',   order.datum],
          ['Kund',    order.kund],
          port && ['Port',    port.namn],
          port && ['Porttyp', port.typ],
          port && ['Adress',  port.adress || port.plats],
          order.notering && ['Notering', order.notering],
        ].filter(Boolean).map(([l, v]) => v && (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--c-border)', fontSize: 13 }}>
            <span style={{ color: 'var(--c-text2)' }}>{l}</span>
            <span style={{ fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{v}</span>
          </div>
        ))}
      </div>

      {/* Senaste serviceprotokoll på porten */}
      {port && (port.historik || []).filter(h => h.typ !== 'montering').slice(-2).reverse().map((h, i) => (
        <div key={i} className="card" style={{ marginBottom: 8, padding: '10px 14px', background: 'var(--c-bg)', fontSize: 12 }}>
          <div style={{ color: 'var(--c-text3)', marginBottom: 2 }}>Tidigare service</div>
          <div style={{ fontWeight: 500 }}>{h.datum} · {h.tekniker || '–'}</div>
          <div style={{ marginTop: 2 }}>
            <span style={{ color: 'var(--c-teal)' }}>✓{h.g || 0} </span>
            {(h.j || 0) > 0 && <span style={{ color: 'var(--c-amber)' }}>⚠{h.j} </span>}
            {(h.a || 0) > 0 && <span style={{ color: 'var(--c-red)' }}>✗{h.a}</span>}
          </div>
        </div>
      ))}

      {order.status !== 'avslutad' && (
        <button onClick={() => port ? setVy('protokoll') : alert('Ingen port kopplad till denna serviceorder.')}
          style={{ width: '100%', padding: 16, borderRadius: 12, background: 'var(--c-blue)', color: '#fff', border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 80 }}>
          <FileText size={18} /> Starta serviceprotokoll
        </button>
      )}
    </div>
  )
}

// ── MontageFormular (3 steg) ──────────────────────────────────────────────────
function MontageFormular({ order, namn, onSlutfor, onBack }) {
  const porttyp = order.porttyp || order.portTyp || 'Vikport'
  const egPunkter = EGENKONTROLL[porttyp] || EGENKONTROLL['Vikport'] || []

  const [steg,         setSteg]         = useState(1)
  const [egenkontroll, setEgenkontroll] = useState({})
  const [egenNoter,    setEgenNoter]    = useState({})
  const [riskKontroll, setRiskKontroll] = useState({})
  const [riskNoter,    setRiskNoter]    = useState({})
  const [signatur,     setSignatur]     = useState(null)
  const [godkannande,  setGodkannande]  = useState('godkand')
  const [sparar,       setSparar]       = useState(false)

  const slutfor = async () => {
    setSparar(true)
    const now = new Date().toISOString().slice(0, 10)
    await onSlutfor({
      datum: now, tekniker: namn, portTyp: porttyp,
      kund: order.kund, adress: order.adress || '',
      egenkontroll, egenNoteringar: egenNoter, egenRisker: [],
      riskKontroll, riskNoteringar: riskNoter,
      signatur, godkannande,
      ok: Object.values(egenkontroll).filter(s => s === 'OK').length,
      ej: Object.values(egenkontroll).filter(s => s === 'EJ').length,
      na: Object.values(egenkontroll).filter(s => s === 'NA').length,
    })
    setSparar(false)
  }

  const STEG_LABEL = ['', 'Egenkontroll', 'Riskbedömning', 'Signatur']

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <button className="btn" onClick={steg === 1 ? onBack : () => setSteg(s => s - 1)}
          style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 5 }}>
          <ChevronLeft size={16} /> {steg === 1 ? 'Avbryt' : 'Tillbaka'}
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{STEG_LABEL[steg]}</div>
          <div style={{ fontSize: 12, color: 'var(--c-text2)' }}>Steg {steg}/3 · {porttyp}</div>
        </div>
      </div>

      {/* Stegindikator */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {[1, 2, 3].map(s => (
          <div key={s} style={{ flex: 1, height: 5, borderRadius: 3, background: s <= steg ? 'var(--c-blue)' : 'var(--c-border)', transition: 'background 0.2s' }} />
        ))}
      </div>

      {/* STEG 1 – Egenkontroll */}
      {steg === 1 && (
        <div>
          {egPunkter.map((p, i) => {
            const s = egenkontroll[i]
            return (
              <div key={i} className="card" style={{ marginBottom: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 13, marginBottom: 10, lineHeight: 1.4 }}>
                  <span style={{ color: 'var(--c-text3)', marginRight: 6 }}>{i+1}.</span>{p}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                  {[
                    { id: 'OK', label: '✓ OK',        bg: 'var(--c-teal-bg)',  txt: 'var(--c-teal-text)',  border: 'var(--c-teal)'  },
                    { id: 'EJ', label: '✗ Avvikelse', bg: 'var(--c-red-bg)',   txt: 'var(--c-red-text)',   border: 'var(--c-red)'   },
                    { id: 'NA', label: '– Ej tillämp',bg: '#f0eeeb',           txt: '#666',                border: '#ccc'           },
                  ].map(({ id, label, bg, txt, border }) => (
                    <button key={id} onClick={() => setEgenkontroll(prev => ({ ...prev, [i]: s === id ? undefined : id }))}
                      style={{ padding: '11px 4px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `2px solid ${s === id ? border : 'var(--c-border)'}`, background: s === id ? bg : 'transparent', color: s === id ? txt : 'var(--c-text3)' }}>
                      {label}
                    </button>
                  ))}
                </div>
                {s === 'EJ' && (
                  <input type="text" placeholder="Beskriv avvikelsen…" value={egenNoter[i] || ''}
                    onChange={e => setEgenNoter(prev => ({ ...prev, [i]: e.target.value }))}
                    style={{ marginTop: 8, width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid var(--c-border)', borderRadius: 8, background: 'var(--c-bg)', color: 'var(--c-text)', boxSizing: 'border-box' }} />
                )}
              </div>
            )
          })}
          <button onClick={() => setSteg(2)}
            style={{ width: '100%', padding: 16, borderRadius: 12, background: 'var(--c-blue)', color: '#fff', border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 80 }}>
            Nästa: Riskbedömning →
          </button>
        </div>
      )}

      {/* STEG 2 – Riskbedömning */}
      {steg === 2 && (
        <div>
          {RISKPUNKTER.map((p, i) => {
            const s = riskKontroll[i]
            return (
              <div key={i} className="card" style={{ marginBottom: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 13, marginBottom: 10, lineHeight: 1.5 }}>
                  <span style={{ color: 'var(--c-text3)', marginRight: 6 }}>{i+1}.</span>{p}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                  {RISK_STATUS.map(({ id, label, bg, txt, border }) => (
                    <button key={id} onClick={() => setRiskKontroll(prev => ({ ...prev, [i]: s === id ? undefined : id }))}
                      style={{ padding: '11px 4px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `2px solid ${s === id ? border : 'var(--c-border)'}`, background: s === id ? bg : 'transparent', color: s === id ? txt : 'var(--c-text3)' }}>
                      {label}
                    </button>
                  ))}
                </div>
                {s === 'atgard' && (
                  <input type="text" placeholder="Beskriv åtgärd…" value={riskNoter[i] || ''}
                    onChange={e => setRiskNoter(prev => ({ ...prev, [i]: e.target.value }))}
                    style={{ marginTop: 8, width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid var(--c-border)', borderRadius: 8, background: 'var(--c-bg)', color: 'var(--c-text)', boxSizing: 'border-box' }} />
                )}
              </div>
            )
          })}
          <button onClick={() => setSteg(3)}
            style={{ width: '100%', padding: 16, borderRadius: 12, background: 'var(--c-blue)', color: '#fff', border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 80 }}>
            Nästa: Signatur →
          </button>
        </div>
      )}

      {/* STEG 3 – Signatur + slutför */}
      {steg === 3 && (
        <div>
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Kundgodkännande</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { id: 'godkand',    label: '✓ Godkänd',    bg: 'var(--c-teal-bg)', txt: 'var(--c-teal-text)', border: 'var(--c-teal)' },
                { id: 'ej_godkand', label: '✗ Ej godkänd', bg: 'var(--c-red-bg)',  txt: 'var(--c-red-text)',  border: 'var(--c-red)'  },
              ].map(({ id, label, bg, txt, border }) => (
                <button key={id} onClick={() => setGodkannande(id)}
                  style={{ padding: 13, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: `2px solid ${godkannande === id ? border : 'var(--c-border)'}`, background: godkannande === id ? bg : 'transparent', color: godkannande === id ? txt : 'var(--c-text3)' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Signatur tekniker</div>
            <SignaturPad onChange={setSignatur} />
          </div>
          <button onClick={slutfor} disabled={sparar}
            style={{ width: '100%', padding: 16, borderRadius: 12, background: 'var(--c-teal)', color: '#fff', border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 80 }}>
            <CheckCircle size={18} /> {sparar ? 'Sparar…' : 'Slutför montageorder'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── MontageDetalj ─────────────────────────────────────────────────────────────
function MontageDetalj({ order, montagemallar, objekt, namn, onUppdatera, onUppdateraObjekt, onBack }) {
  const [vy, setVy] = useState('info')

  const hanteraSlutfort = async (prot) => {
    const now = new Date().toISOString().slice(0, 10)
    await onUppdatera(order.id, { status: 'utford', protokoll_data: prot, datum_utfort: now })
    if (order.objekt_id) {
      const port = objekt.find(o => o.id === order.objekt_id)
      if (port) {
        const nyHistorik = [...(port.historik || []), { typ: 'montering', datum: now, tekniker: namn, portTyp: order.porttyp || '', kund: order.kund }]
        await onUppdateraObjekt(port.id, { historik: nyHistorik })
      }
    }
    setVy('klar')
  }

  if (vy === 'formular') return (
    <MontageFormular order={order} montagemallar={montagemallar} namn={namn} onSlutfor={hanteraSlutfort} onBack={() => setVy('info')} />
  )

  if (vy === 'klar') return (
    <div style={{ textAlign: 'center', padding: '48px 20px' }}>
      <CheckCircle size={56} color="var(--c-teal)" style={{ margin: '0 auto 16px', display: 'block' }} />
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--c-teal-text)', marginBottom: 8 }}>Montage slutfört!</div>
      <div style={{ fontSize: 14, color: 'var(--c-text2)', marginBottom: 24 }}>{order.kund} · {new Date().toISOString().slice(0,10)}</div>
      <button className="btn btn-primary" onClick={onBack} style={{ width: '100%', padding: 14, fontSize: 15 }}>← Tillbaka</button>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button className="btn" onClick={onBack} style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 5 }}><ChevronLeft size={16} /> Tillbaka</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Montage #{order.nr || '–'}</div>
          <div style={{ fontSize: 12, color: 'var(--c-text2)' }}>{order.kund}</div>
        </div>
        <span className={`badge ${order.status === 'utford' ? 'badge-teal' : order.status === 'pagAr' ? 'badge-amber' : 'badge-blue'}`}>
          {order.status === 'utford' ? 'Utförd' : order.status === 'pagAr' ? 'Pågår' : 'Planerad'}
        </span>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        {[
          ['Kund',             order.kund],
          ['Porttyp',          order.porttyp || order.portTyp],
          ['Adress',           order.adress],
          ['Planerat datum',   order.datum_planerat || order.datum],
          order.notering && ['Notering', order.notering],
        ].filter(Boolean).map(([l, v]) => v && (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--c-border)', fontSize: 13 }}>
            <span style={{ color: 'var(--c-text2)' }}>{l}</span>
            <span style={{ fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{v}</span>
          </div>
        ))}
      </div>

      {order.status !== 'utford' && (
        <button onClick={() => setVy('formular')}
          style={{ width: '100%', padding: 16, borderRadius: 12, background: 'var(--c-blue)', color: '#fff', border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 80 }}>
          <Wrench size={18} /> Starta monteringsprotokoll
        </button>
      )}
    </div>
  )
}

// ── Register ──────────────────────────────────────────────────────────────────
function Register({ objekt }) {
  const [sok,  setSok]  = useState('')
  const [vald, setVald] = useState(null)

  if (vald) return (
    <div>
      <button className="btn" onClick={() => setVald(null)} style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
        <ChevronLeft size={16} /> Tillbaka
      </button>
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>{vald.namn}</div>
        <div style={{ fontSize: 13, color: 'var(--c-text2)', marginBottom: 8 }}>{vald.kund}</div>
        {[
          ['Porttyp', vald.typ], ['Fabrikat', vald.fabrikat], ['År', vald.ar],
          ['Adress', vald.adress || vald.plats],
          ['Senaste service', vald.senaste || '–'], ['Nästa service', vald.nasta || '–'],
        ].map(([l, v]) => v && (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--c-border)', fontSize: 13 }}>
            <span style={{ color: 'var(--c-text2)' }}>{l}</span>
            <span style={{ fontWeight: 500 }}>{v}</span>
          </div>
        ))}
      </div>
      {(vald.historik || []).filter(h => h.typ !== 'montering').slice().reverse().slice(0,5).map((h, i) => (
        <div key={i} className="card" style={{ marginBottom: 8, padding: '10px 14px', background: 'var(--c-bg)', fontSize: 12 }}>
          <div style={{ color: 'var(--c-text3)' }}>Serviceprotokoll</div>
          <div style={{ fontWeight: 500 }}>{h.datum} · {h.tekniker || '–'}</div>
          <div style={{ marginTop: 3 }}>
            <span style={{ color: 'var(--c-teal)' }}>✓{h.g||0} </span>
            {(h.j||0) > 0 && <span style={{ color: 'var(--c-amber)' }}>⚠{h.j} </span>}
            {(h.a||0) > 0 && <span style={{ color: 'var(--c-red)' }}>✗{h.a}</span>}
          </div>
        </div>
      ))}
    </div>
  )

  const q = sok.toLowerCase().trim()
  const hits = q.length < 1 ? [] : objekt.filter(o => !o.arkiverad && (
    o.namn?.toLowerCase().includes(q) || o.kund?.toLowerCase().includes(q) ||
    o.plats?.toLowerCase().includes(q) || o.fabrikat?.toLowerCase().includes(q)
  )).slice(0, 20)

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Portregister</h1>
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text3)', pointerEvents: 'none' }} />
        <input type="text" placeholder="Sök port, kund, fastighet…" value={sok} onChange={e => setSok(e.target.value)}
          style={{ width: '100%', padding: '12px 12px 12px 36px', fontSize: 14, border: '1px solid var(--c-border)', borderRadius: 10, background: 'var(--c-surface)', color: 'var(--c-text)', boxSizing: 'border-box' }} />
      </div>
      {q.length < 1 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--c-text3)' }}>
          <Search size={36} style={{ margin: '0 auto 12px', display: 'block' }} />
          <div style={{ fontSize: 14 }}>Sök på portnamn, kund eller fastighet</div>
        </div>
      ) : hits.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--c-text3)', fontSize: 14 }}>Inga portar hittades</div>
      ) : hits.map(o => (
        <div key={o.id} className="card" style={{ marginBottom: 8, cursor: 'pointer' }} onClick={() => setVald(o)}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{o.namn}</div>
          <div style={{ fontSize: 13, color: 'var(--c-text2)' }}>{o.kund} · {o.typ}</div>
          {o.plats && <div style={{ fontSize: 12, color: 'var(--c-text3)', marginTop: 2 }}>📍 {o.plats}</div>}
          <div style={{ fontSize: 11, color: o.status === 'forsenad' ? 'var(--c-red)' : 'var(--c-text3)', marginTop: 4 }}>
            Nästa service: {o.nasta || '–'}
          </div>
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
  tekniker = [],
  serviceorderArr = [],
  montageorder = [],
  protokollMallar,
  montagemallar,
  onUppdateraArende,
  onUppdateraObjekt,
  onUppdateraServiceorder,
  onUppdateraMontageorder,
  onLoggaUt,
}) {
  const [flik,             setFlik]             = useState('idag')
  const [valdServiceorder, setValdServiceorder] = useState(null)
  const [valdMontage,      setValdMontage]      = useState(null)

  const idag = new Date().toISOString().slice(0, 10)

  const dagensBokningar = (bokningar[idag] || [])
    .filter(b => !namn || (Array.isArray(b.tek) ? b.tek.includes(namn) : b.tek === namn))
    .sort((a, b) => (a.tid || '').localeCompare(b.tid || ''))

  const minaArenden = arenden
    .filter(a => a.tekniker === namn && a.status !== 'atgardad')
    .sort((a, b) => ({ akut: 0, hog: 1, normal: 2 }[a.prioritet] ?? 2) - ({ akut: 0, hog: 1, normal: 2 }[b.prioritet] ?? 2))

  const minaServiceordrar = serviceorderArr
    .filter(o => o.tekniker === namn && o.status !== 'avslutad')
    .sort((a, b) => (a.datum || '').localeCompare(b.datum || ''))

  const minaMontageordrar = montageorder
    .filter(m => m.tekniker === namn && m.status !== 'utford')
    .sort((a, b) => ((a.datum_planerat || a.datum) || '').localeCompare((b.datum_planerat || b.datum) || ''))

  const klaraArenden = arenden.filter(a => a.tekniker === namn && a.status === 'atgardad').slice(-5).reverse()

  const TABS = [
    { id: 'idag',       icon: Calendar,      label: 'Idag',     badge: dagensBokningar.length },
    { id: 'felanmalan', icon: AlertCircle,   label: 'Felanm.',  badge: minaArenden.length },
    { id: 'service',    icon: ClipboardList, label: 'Service',  badge: minaServiceordrar.length },
    { id: 'montage',    icon: Wrench,        label: 'Montage',  badge: minaMontageordrar.length },
    { id: 'register',   icon: Database,      label: 'Register', badge: 0 },
  ]

  const renderContent = () => {
    switch (flik) {

      case 'idag': return (
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, textTransform: 'capitalize' }}>{formatDag(idag)}</h1>
          <p style={{ color: 'var(--c-text2)', fontSize: 14, marginBottom: 16 }}>
            {dagensBokningar.length === 0 ? 'Inga bokningar idag' : `${dagensBokningar.length} bokningar schemalagda`}
          </p>

          {/* Akuta ärenden */}
          {minaArenden.filter(a => a.prioritet === 'akut').length > 0 && (
            <div style={{ background: 'var(--c-red-bg)', border: '1px solid var(--c-red)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={16} color="var(--c-red)" />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-red-text)' }}>
                {minaArenden.filter(a => a.prioritet === 'akut').length} akuta ärenden kräver åtgärd
              </span>
            </div>
          )}

          {/* Snabbkort – öppna ordrar */}
          {(minaServiceordrar.length > 0 || minaMontageordrar.length > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {minaServiceordrar.length > 0 && (
                <div onClick={() => setFlik('service')} className="card" style={{ cursor: 'pointer', padding: 16, textAlign: 'center' }}>
                  <ClipboardList size={26} color="var(--c-blue)" style={{ margin: '0 auto 6px', display: 'block' }} />
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{minaServiceordrar.length}</div>
                  <div style={{ fontSize: 12, color: 'var(--c-text2)' }}>Serviceordrar</div>
                </div>
              )}
              {minaMontageordrar.length > 0 && (
                <div onClick={() => setFlik('montage')} className="card" style={{ cursor: 'pointer', padding: 16, textAlign: 'center' }}>
                  <Wrench size={26} color="var(--c-amber)" style={{ margin: '0 auto 6px', display: 'block' }} />
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{minaMontageordrar.length}</div>
                  <div style={{ fontSize: 12, color: 'var(--c-text2)' }}>Montageordrar</div>
                </div>
              )}
            </div>
          )}

          {/* Bokningar */}
          {dagensBokningar.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <Clock size={36} color="var(--c-text3)" style={{ margin: '0 auto 12px', display: 'block' }} />
              <div style={{ fontSize: 14, color: 'var(--c-text2)' }}>Inga bokningar idag</div>
            </div>
          ) : dagensBokningar.map((b, i) => (
            <div key={i} className="card" style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '14px 16px', marginBottom: 8 }}>
              <div style={{ background: 'var(--c-blue)', color: '#fff', borderRadius: 10, padding: '8px 10px', fontSize: 14, fontWeight: 700, flexShrink: 0, minWidth: 52, textAlign: 'center' }}>
                {b.tid || '–'}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{b.namn}</div>
                {b.kund && <div style={{ fontSize: 13, color: 'var(--c-text2)' }}>{b.kund}</div>}
              </div>
            </div>
          ))}
        </div>
      )

      case 'felanmalan': return (
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Mina felanmälningar</h1>
          <p style={{ color: 'var(--c-text2)', fontSize: 14, marginBottom: 16 }}>
            {minaArenden.length === 0 ? 'Allt klart!' : `${minaArenden.length} öppna ärenden`}
          </p>
          {minaArenden.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px 20px' }}>
              <CheckCircle size={40} color="var(--c-teal)" style={{ margin: '0 auto 12px', display: 'block' }} />
              <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--c-teal-text)' }}>Allt klart!</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {minaArenden.map(a => <ArendeKort key={a.id} a={a} onUppdatera={onUppdateraArende} />)}
            </div>
          )}
          {klaraArenden.length > 0 && (
            <div style={{ marginTop: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--c-text3)', marginBottom: 8 }}>Senast åtgärdade</div>
              {klaraArenden.map(a => (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--c-surface)', borderRadius: 10, border: '1px solid var(--c-border)', opacity: 0.65, marginBottom: 6 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>#{a.nr} · {a.kund}</div>
                    <div style={{ fontSize: 12, color: 'var(--c-text2)' }}>{a.feltyp} · {a.datum}</div>
                  </div>
                  <span className="badge badge-teal">Klar</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )

      case 'service':
        if (valdServiceorder) return (
          <ServiceorderDetalj
            order={valdServiceorder}
            objekt={objekt}
            namn={namn}
            onUppdatera={async (id, ch) => { await onUppdateraServiceorder(id, ch); setValdServiceorder(p => ({ ...p, ...ch })) }}
            onUppdateraObjekt={onUppdateraObjekt}
            onBack={() => setValdServiceorder(null)}
          />
        )
        return (
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Mina serviceordrar</h1>
            <p style={{ color: 'var(--c-text2)', fontSize: 14, marginBottom: 16 }}>
              {minaServiceordrar.length === 0 ? 'Inga öppna serviceordrar' : `${minaServiceordrar.length} öppna`}
            </p>
            {minaServiceordrar.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '48px 20px' }}>
                <CheckCircle size={40} color="var(--c-teal)" style={{ margin: '0 auto 12px', display: 'block' }} />
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--c-teal-text)' }}>Inga öppna serviceordrar!</div>
              </div>
            ) : minaServiceordrar.map(o => {
              const port = (o.objekt_ids || []).map(id => objekt.find(p => p.id === id)).filter(Boolean)[0]
              return (
                <div key={o.id} className="card" style={{ marginBottom: 10, cursor: 'pointer', borderLeft: '4px solid var(--c-blue)' }}
                  onClick={() => setValdServiceorder(o)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>{o.kund}</div>
                      {port && <div style={{ fontSize: 13, color: 'var(--c-text2)' }}>{port.namn} · {port.typ}</div>}
                      <div style={{ fontSize: 12, color: 'var(--c-text3)', marginTop: 4 }}>📅 {o.datum || '–'}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                      <span className={`badge ${o.status === 'planerad' ? 'badge-blue' : 'badge-amber'}`}>
                        {o.status === 'planerad' ? 'Planerad' : 'Pågår'}
                      </span>
                      <ChevronRight size={16} color="var(--c-text3)" />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )

      case 'montage':
        if (valdMontage) return (
          <MontageDetalj
            order={valdMontage}
            montagemallar={montagemallar}
            objekt={objekt}
            namn={namn}
            onUppdatera={async (id, ch) => { await onUppdateraMontageorder(id, ch); setValdMontage(p => ({ ...p, ...ch })) }}
            onUppdateraObjekt={onUppdateraObjekt}
            onBack={() => setValdMontage(null)}
          />
        )
        return (
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Mina montageordrar</h1>
            <p style={{ color: 'var(--c-text2)', fontSize: 14, marginBottom: 16 }}>
              {minaMontageordrar.length === 0 ? 'Inga öppna montageordrar' : `${minaMontageordrar.length} öppna`}
            </p>
            {minaMontageordrar.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '48px 20px' }}>
                <CheckCircle size={40} color="var(--c-teal)" style={{ margin: '0 auto 12px', display: 'block' }} />
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--c-teal-text)' }}>Inga öppna montageordrar!</div>
              </div>
            ) : minaMontageordrar.map(m => (
              <div key={m.id} className="card" style={{ marginBottom: 10, cursor: 'pointer', borderLeft: '4px solid var(--c-amber)' }}
                onClick={() => setValdMontage(m)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{m.kund}</div>
                    <div style={{ fontSize: 13, color: 'var(--c-text2)' }}>{m.porttyp || m.portTyp || '–'} · {m.adress || '–'}</div>
                    <div style={{ fontSize: 12, color: 'var(--c-text3)', marginTop: 4 }}>📅 {m.datum_planerat || m.datum || '–'}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <span className={`badge ${m.status === 'planerad' ? 'badge-blue' : 'badge-amber'}`}>
                      {m.status === 'planerad' ? 'Planerad' : m.status || '–'}
                    </span>
                    <ChevronRight size={16} color="var(--c-text3)" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )

      case 'register':
        return <Register objekt={objekt} />

      default: return null
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-bg)', display: 'flex', flexDirection: 'column', paddingBottom: 70 }}>

      {/* Header */}
      <div style={{ background: '#1C3461', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={logo} alt="logo" style={{ height: 32 }} />
          {namn && <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: 12 }}>{namn}</span>}
        </div>
        <button onClick={onLoggaUt} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.65)', borderRadius: 7, padding: '6px 12px', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <LogOut size={14} /> Logga ut
        </button>
      </div>

      {/* Innehåll */}
      <div style={{ flex: 1, padding: '20px 16px', overflowY: 'auto' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          {renderContent()}
        </div>
      </div>

      {/* Bottom nav */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--c-surface)', borderTop: '1px solid var(--c-border)', display: 'flex', zIndex: 100, paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {TABS.map(({ id, icon: Icon, label, badge }) => {
          const aktiv = flik === id
          return (
            <button key={id} onClick={() => { setFlik(id); if (id !== 'service') setValdServiceorder(null); if (id !== 'montage') setValdMontage(null) }}
              style={{ flex: 1, padding: '10px 0 8px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, color: aktiv ? 'var(--c-blue)' : 'var(--c-text3)', position: 'relative', transition: 'color 0.15s' }}>
              <Icon size={20} strokeWidth={aktiv ? 2.2 : 1.8} />
              <span style={{ fontSize: 9, fontWeight: aktiv ? 700 : 400 }}>{label}</span>
              {badge > 0 && (
                <span style={{ position: 'absolute', top: 5, right: 'calc(50% - 17px)', background: 'var(--c-red)', color: '#fff', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 10, lineHeight: 1.4, minWidth: 16, textAlign: 'center' }}>
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
