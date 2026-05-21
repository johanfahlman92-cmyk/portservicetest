import { useState, useRef } from 'react'
import { CheckCircle, Printer, ChevronRight, Upload, FileText, X as XIcon, Search, AlertTriangle } from 'lucide-react'
import logo from '../image-1779305303942.png'
import KundVäljare from '../components/KundVäljare.jsx'
import { supabase } from '../lib/supabase.js'

// ── Signaturpad ───────────────────────────────────────────────────────────────
function SignaturPad({ onChange }) {
  const canvasRef = useRef(null)
  const drawing   = useRef(false)
  const lastPos   = useRef({ x: 0, y: 0 })

  const getPos = (e, canvas) => {
    const rect   = canvas.getBoundingClientRect()
    const scaleX = canvas.width  / rect.width
    const scaleY = canvas.height / rect.height
    const src    = e.touches ? e.touches[0] : e
    return { x: (src.clientX - rect.left) * scaleX, y: (src.clientY - rect.top) * scaleY }
  }
  const startDrawing = (e) => { drawing.current = true; lastPos.current = getPos(e, canvasRef.current); e.preventDefault() }
  const draw = (e) => {
    if (!drawing.current) return
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')
    const pos    = getPos(e, canvas)
    ctx.beginPath(); ctx.moveTo(lastPos.current.x, lastPos.current.y); ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#1a1917'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.stroke()
    lastPos.current = pos; e.preventDefault()
  }
  const stopDrawing = () => { if (!drawing.current) return; drawing.current = false; onChange?.(canvasRef.current.toDataURL()) }
  const rensa = () => { canvasRef.current.getContext('2d').clearRect(0, 0, 600, 130); onChange?.(null) }

  return (
    <div>
      <canvas ref={canvasRef} width={600} height={130}
        style={{ border: '1px solid var(--c-border)', borderRadius: 8, width: '100%',
          cursor: 'crosshair', background: '#fff', touchAction: 'none', display: 'block' }}
        onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
        onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
      />
      <button className="btn" style={{ fontSize: 12, marginTop: 6 }} onClick={rensa}>Rensa signatur</button>
    </div>
  )
}

// ── Konstanter ────────────────────────────────────────────────────────────────
const PORTTYPER = ['Vikport', 'Takskjutport', 'Lastbrygga', 'Grind']

const FAROR = [
  { id: 'klamrisk',  label: 'Klämrisk',         beskrivning: 'Rörliga delar som kan klämma (portblad, skenor, fjädrar)' },
  { id: 'slagrisk',  label: 'Slagrisk',          beskrivning: 'Nedfallande eller rörliga delar som kan slå mot person' },
  { id: 'indraget',  label: 'Indraget i maskin', beskrivning: 'Öppna mekanismer, drivsteg, kuggar, remmar' },
  { id: 'elektrisk', label: 'Elektrisk fara',     beskrivning: 'Exponerade ledare, felaktig jordning, kortslutning' },
  { id: 'fall',      label: 'Fall / stötning',    beskrivning: 'Risk för fall vid montage, stötning mot portblad' },
  { id: 'brand',     label: 'Brandrisk',          beskrivning: 'Gnistor vid svetsning, brandfarliga ämnen nära installation' },
]
const RISKNIVÅER = ['Låg', 'Medel', 'Hög', 'Eliminerad']
const tomsRisk   = () => Object.fromEntries(FAROR.map(f => [f.id, { nivå: 'Låg', åtgärd: '', ansvarig: '' }]))

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

const serviceIntervallLabel = (v) =>
  v === '6' ? '2 ggr/år (var 6:e mån)' :
  v === '12' ? '1 gång/år (var 12:e mån)' :
  'Ingen service'

// ── PDF ───────────────────────────────────────────────────────────────────────
function genereraHTML({ portNamn, kund, adress, portTyp, datum, teknikerNamn,
                        serviceIntervall, risker, egenkontroll, egenNoteringar,
                        signaturbild, logoBase64 }) {
  const punkter = EGENKONTROLL[portTyp] || []
  const riskRows = FAROR.map(f => {
    const r   = risker[f.id] || {}
    const niv = (r.nivå || 'Låg').toLowerCase()
    return `<tr><td>${f.label}</td><td>${f.beskrivning}</td>
      <td class="risk-${niv}">${r.nivå||'Låg'}</td>
      <td>${r.åtgärd||'–'}</td><td>${r.ansvarig||'–'}</td></tr>`
  }).join('')
  const egenRows = punkter.map((p, i) => {
    const st  = egenkontroll[i] || '–'
    const not = egenNoteringar[i] || ''
    const cls = st === 'OK' ? 'ok' : st === 'EJ' ? 'ej' : 'na'
    const etk = st === 'OK' ? '✓ OK' : st === 'EJ' ? '✗ Ej OK' : st === 'NA' ? 'N/A' : '–'
    return `<tr><td>${p}</td><td class="${cls}">${etk}</td><td>${not}</td></tr>`
  }).join('')
  const objektNamn = portNamn || adress || '–'

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Monteringsprotokoll – ${objektNamn}</title>
<style>
body{font-family:Arial,sans-serif;font-size:12px;color:#1a1917;margin:32px 40px}
h1{font-size:20px;margin-bottom:6px}
h2{font-size:13px;margin-top:22px;margin-bottom:8px;border-bottom:2px solid #1D9E75;padding-bottom:4px;color:#1D9E75}
.meta{display:grid;grid-template-columns:1fr 1fr;gap:3px 24px;margin-bottom:14px;font-size:11px;color:#555}
.meta b{color:#1a1917}
table{width:100%;border-collapse:collapse;margin-bottom:14px}
th{background:#f3f2ef;padding:6px 8px;text-align:left;font-size:11px;font-weight:600}
td{padding:6px 8px;border-bottom:1px solid #e8e7e4;font-size:11px}
.ok{color:#1D9E75;font-weight:600}.ej{color:#b83333;font-weight:600}.na{color:#888}
.risk-låg{color:#1D9E75;font-weight:600}.risk-medel{color:#b87000;font-weight:600}
.risk-hög{color:#b83333;font-weight:600}.risk-eliminerad{color:#888;font-weight:600}
.sig-box{border:1px solid #ccc;border-radius:6px;padding:8px;display:inline-block;margin-top:6px}
@media print{body{margin:0}}
</style></head><body>
${logoBase64 ? `<img src="${logoBase64}" style="float:right;height:40px;margin-top:-4px" alt="NMV Portservice" />` : ''}
<h1>Monteringsprotokoll</h1>
<div class="meta">
  <div><b>Objekt:</b> ${objektNamn}</div>
  <div><b>Kund:</b> ${kund||'–'}</div>
  <div><b>Adress:</b> ${adress||'–'}</div>
  <div><b>Porttyp:</b> ${portTyp}</div>
  <div><b>Datum:</b> ${datum}</div>
  <div><b>Tekniker:</b> ${teknikerNamn||'–'}</div>
  <div><b>Serviceintervall:</b> ${serviceIntervallLabel(serviceIntervall)}</div>
</div>
<h2>Riskbedömning – EN13241</h2>
<table>
  <thead><tr><th>Farotyp</th><th>Beskrivning</th><th>Risknivå</th><th>Åtgärd</th><th>Ansvarig</th></tr></thead>
  <tbody>${riskRows}</tbody>
</table>
<h2>Egenkontroll – ${portTyp}</h2>
<table>
  <thead><tr><th>Kontrollpunkt</th><th>Status</th><th>Notering</th></tr></thead>
  <tbody>${egenRows}</tbody>
</table>
${signaturbild ? `<h2>Tekniker signatur</h2>
<div class="sig-box"><img src="${signaturbild}" style="max-width:300px;max-height:90px"/></div>
<p style="font-size:11px;color:#555;margin-top:6px">${teknikerNamn||''},&nbsp;${datum}</p>` : ''}
</body></html>`
}

// ── Dokument drag-and-drop ────────────────────────────────────────────────────
function formatStorlek(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function DokumentZon({ dokument = [], onChange }) {
  const [dragging, setDragging] = useState(false)
  const [laddar,   setLaddar]   = useState(false)
  const [fel,      setFel]      = useState('')
  const inputRef = useRef(null)

  const laddaUpp = async (files) => {
    setLaddar(true); setFel('')
    const nya = []
    for (const fil of Array.from(files)) {
      const safeName = fil.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `${Date.now()}-${safeName}`
      const { data, error } = await supabase.storage.from('dokument').upload(path, fil, { upsert: false })
      if (error) {
        setFel(`Kunde inte ladda upp "${fil.name}": ${error.message}`)
      } else {
        const { data: urlData } = supabase.storage.from('dokument').getPublicUrl(data.path)
        nya.push({ namn: fil.name, url: urlData.publicUrl, typ: fil.type, storlek: fil.size })
      }
    }
    if (nya.length) onChange([...dokument, ...nya])
    setLaddar(false)
  }

  const taBort = (idx) => onChange(dokument.filter((_, i) => i !== idx))

  return (
    <div>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={e => { e.preventDefault(); setDragging(false) }}
        onDrop={e => { e.preventDefault(); setDragging(false); laddaUpp(e.dataTransfer.files) }}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? 'var(--c-teal)' : 'var(--c-border)'}`,
          borderRadius: 10, padding: '28px 16px', textAlign: 'center',
          cursor: 'pointer', transition: 'all 0.15s',
          background: dragging ? 'var(--c-teal-bg)' : 'var(--c-bg)',
        }}
      >
        <input ref={inputRef} type="file" multiple hidden onChange={e => laddaUpp(e.target.files)} />
        <Upload size={28} color={dragging ? 'var(--c-teal)' : 'var(--c-text3)'}
          style={{ margin: '0 auto 10px', display: 'block' }} />
        {laddar ? (
          <div style={{ fontSize: 13, color: 'var(--c-text2)' }}>Laddar upp…</div>
        ) : (
          <>
            <div style={{ fontSize: 13, color: 'var(--c-text2)' }}>
              Dra och släpp filer här, eller{' '}
              <span style={{ color: 'var(--c-teal)', fontWeight: 500 }}>klicka för att bläddra</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 4 }}>
              PDF, bilder, ritningar, certifikat, manualer m.m.
            </div>
          </>
        )}
      </div>

      {fel && <div style={{ fontSize: 12, color: 'var(--c-red)', marginTop: 6 }}>{fel}</div>}

      {dokument.length > 0 && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {dokument.map((d, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', borderRadius: 8,
              background: 'var(--c-bg)', border: '1px solid var(--c-border)' }}>
              <FileText size={16} color="var(--c-blue)" style={{ flexShrink: 0 }} />
              <a href={d.url} target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                style={{ flex: 1, fontSize: 13, color: 'var(--c-text)', textDecoration: 'none',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {d.namn}
              </a>
              <div style={{ fontSize: 11, color: 'var(--c-text3)', flexShrink: 0 }}>
                {formatStorlek(d.storlek)}
              </div>
              <button onClick={e => { e.stopPropagation(); taBort(i) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text3)', padding: 2 }}>
                <XIcon size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Huvudkomponent ────────────────────────────────────────────────────────────
export default function Montering({ objekt = [], tekniker = [], kunder = [], onUppdateraObjekt, onLaggTillObjekt, onNyKund }) {
  const [aktFlik,          setAktFlik]          = useState('info')

  const [portNamn,         setPortNamn]         = useState('')
  const [teknikerNamn,     setTeknikerNamn]     = useState('')
  const [datum,            setDatum]            = useState(new Date().toISOString().slice(0, 10))
  const [portTyp,          setPortTyp]          = useState(PORTTYPER[0])
  const [adress,           setAdress]           = useState('')
  const [kund,             setKund]             = useState('')
  const [serviceIntervall, setServiceIntervall] = useState('12')

  const [risker,           setRisker]           = useState(tomsRisk)
  const [egenkontroll,     setEgenkontroll]     = useState({})
  const [egenNoteringar,   setEgenNoteringar]   = useState({})

  const [visaSignatur,     setVisaSignatur]     = useState(false)
  const [signaturbild,     setSignaturbild]     = useState(null)
  const [dokument,         setDokument]         = useState([])

  const [sparad,  setSparad]  = useState(false)
  const [sparar,  setSparar]  = useState(false)

  const punkter    = EGENKONTROLL[portTyp] || []
  const okCount    = punkter.filter((_, i) => egenkontroll[i] === 'OK').length
  const ejCount    = punkter.filter((_, i) => egenkontroll[i] === 'EJ').length
  const naCount    = punkter.filter((_, i) => egenkontroll[i] === 'NA').length

  const kanSpara = portNamn.trim().length > 0

  const setRisk = (id, fält, val) => setRisker(prev => ({ ...prev, [id]: { ...prev[id], [fält]: val } }))
  const setEgen = (idx, val)      => setEgenkontroll(prev => ({ ...prev, [idx]: val }))

  const spara = async () => {
    if (!kanSpara) return
    setSparar(true)

    const nyttInslag = {
      datum, tekniker: teknikerNamn, typ: 'montering',
      portTyp, serviceIntervall: parseInt(serviceIntervall) || 0,
      adress, kund,
      risker:         { ...risker },
      egenkontroll:   { ...egenkontroll },
      egenNoteringar: { ...egenNoteringar },
      ok: okCount, ej: ejCount, na: naCount,
      signatur: signaturbild || null,
      dokument: [...dokument],
    }

    await onLaggTillObjekt({
      id:               'o' + Date.now(),
      namn:             portNamn.trim(),
      kund:             kund.trim(),
      typ:              portTyp,
      adress:           adress.trim(),
      status:           'ok',
      kundTyp:          'foretag',
      intervallProcent: 0,
      dagerForsenad:    0,
      historik:         [nyttInslag],
    })

    setSparar(false)
    setSparad(true)
  }

  const hämtaLogoBase64 = async () => {
    try {
      const res  = await fetch(logo)
      const blob = await res.blob()
      return await new Promise(resolve => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.readAsDataURL(blob)
      })
    } catch { return null }
  }

  const skrivUtPDF = async () => {
    const logoBase64 = await hämtaLogoBase64()
    const html = genereraHTML({ portNamn, kund, adress, portTyp, datum,
                                teknikerNamn, serviceIntervall, risker, egenkontroll,
                                egenNoteringar, signaturbild, logoBase64 })
    const win = window.open('', '_blank', 'width=860,height=1100')
    win.document.write(html)
    win.document.close()
    setTimeout(() => win.print(), 400)
  }

  const nyttProtokoll = () => {
    setSparad(false); setAktFlik('info')
    setPortNamn(''); setAdress(''); setKund(''); setTeknikerNamn('')
    setPortTyp(PORTTYPER[0]); setServiceIntervall('12')
    setRisker(tomsRisk()); setEgenkontroll({}); setEgenNoteringar({})
    setSignaturbild(null); setVisaSignatur(false); setDokument([])
  }

  // ── Styles ──
  const inp = { width: '100%', padding: '9px 12px', fontSize: 14, boxSizing: 'border-box',
    border: '1px solid var(--c-border)', borderRadius: 8, background: 'var(--c-surface)', color: 'var(--c-text)' }
  const lbl = { fontSize: 12, color: 'var(--c-text2)', display: 'block', marginBottom: 5, fontWeight: 500 }

  // ── Klar-vy ──
  if (sparad) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div><h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 2 }}>Montering</h1></div>
      <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <CheckCircle size={52} color="var(--c-teal)" style={{ marginBottom: 16 }} />
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Monteringsprotokoll sparat!</h2>
        <p style={{ color: 'var(--c-text2)', fontSize: 14, marginBottom: 24 }}>
          Protokollet har sparats i portens historik.<br />
          <span style={{ color: 'var(--c-teal)' }}>Porten har lagts till i portregistret.</span>
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={nyttProtokoll}>Nytt protokoll</button>
          <button className="btn" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={skrivUtPDF}>
            <Printer size={14} /> Skriv ut PDF
          </button>
        </div>
      </div>
    </div>
  )

  const flikar = [
    { id: 'info',         label: 'Montageinformation' },
    { id: 'risk',         label: 'Riskbedömning' },
    { id: 'egenkontroll', label: 'Egenkontroll' },
    { id: 'dokument',     label: `Dokument${dokument.length ? ` (${dokument.length})` : ''}` },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 2 }}>Montering</h1>
        <p style={{ color: 'var(--c-text2)', fontSize: 13 }}>Monteringsprotokoll, riskbedömning EN13241 och egenkontroll</p>
      </div>

      {/* ── Ny port ── */}
      <div className="card">
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Ny port</div>
        <div>
          <label style={lbl}>Portnamn / beteckning *</label>
          <input type="text" value={portNamn} onChange={e => setPortNamn(e.target.value)}
            placeholder="t.ex. Vikport Lager A" style={inp} autoFocus />
        </div>
        {portNamn.trim().length >= 2 && (() => {
          const träff = objekt.find(o => !o.arkiverad && o.namn.toLowerCase().includes(portNamn.trim().toLowerCase()))
          return träff ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8,
              background: 'var(--c-amber-bg)', borderRadius: 7, padding: '7px 10px',
              fontSize: 12, color: 'var(--c-amber-text)' }}>
              <AlertTriangle size={14} style={{ flexShrink: 0 }} />
              Liknande port finns redan: <strong>{träff.namn}</strong> ({träff.kund || träff.plats || '–'})
            </div>
          ) : null
        })()}
        <p style={{ fontSize: 12, color: 'var(--c-text2)', margin: '8px 0 0' }}>
          Porten läggs automatiskt till i portregistret när protokollet sparas.
        </p>
      </div>

      {/* ── Fliknavigation ── */}
      <div style={{ display: 'flex', gap: 2 }}>
        {flikar.map(f => (
          <button key={f.id} onClick={() => setAktFlik(f.id)} style={{
            padding: '8px 16px', fontSize: 13, border: 'none', cursor: 'pointer',
            borderRadius: '8px 8px 0 0',
            background: aktFlik === f.id ? 'var(--c-surface)' : 'transparent',
            color:      aktFlik === f.id ? 'var(--c-text)'    : 'var(--c-text2)',
            fontWeight: aktFlik === f.id ? 600 : 400,
            borderBottom: aktFlik === f.id ? '2px solid var(--c-teal)' : '2px solid transparent',
          }}>{f.label}</button>
        ))}
      </div>

      {/* ────────── TAB: Montageinformation ────────── */}
      {aktFlik === 'info' && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="grid2">
            <div>
              <label style={lbl}>Kund</label>
              <KundVäljare kunder={kunder} value={kund} onChange={setKund} onNyKund={onNyKund} style={inp} />
            </div>
            <div>
              <label style={lbl}>Installationsadress</label>
              <input type="text" value={adress} onChange={e => setAdress(e.target.value)}
                placeholder="Gatuvägen 1, Luleå" style={inp} />
            </div>
          </div>
          <div className="grid2">
            <div>
              <label style={lbl}>Porttyp</label>
              <select value={portTyp} onChange={e => setPortTyp(e.target.value)} style={inp}>
                {PORTTYPER.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Monteringsdatum</label>
              <input type="date" value={datum} onChange={e => setDatum(e.target.value)} style={inp} />
            </div>
          </div>
          <div>
            <label style={lbl}>Tekniker</label>
            <select value={teknikerNamn} onChange={e => setTeknikerNamn(e.target.value)} style={inp}>
              <option value="">– Välj tekniker –</option>
              {tekniker.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Serviceintervall (från monteringsdatum)</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                ['12',    '1 gång/år',    'Service var 12:e månad',    'var(--c-teal)',   'var(--c-teal-bg)',   'var(--c-teal-text)'],
                ['6',     '2 ggr/år',     'Service var 6:e månad',     'var(--c-teal)',   'var(--c-teal-bg)',   'var(--c-teal-text)'],
                ['0',     'Ingen service','Ingen schemalagd service',   'var(--c-text2)',  'var(--c-border)',    'var(--c-text)'],
              ].map(([val, lab, sub, brd, bg, col]) => (
                <button key={val} onClick={() => setServiceIntervall(val)} style={{
                  flex: 1, minWidth: 110, padding: '10px 12px', borderRadius: 8,
                  cursor: 'pointer', textAlign: 'left',
                  border: `2px solid ${serviceIntervall === val ? brd : 'var(--c-border)'}`,
                  background: serviceIntervall === val ? bg : 'var(--c-surface)',
                  color: serviceIntervall === val ? col : 'var(--c-text)',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{lab}</div>
                  <div style={{ fontSize: 11, color: 'var(--c-text2)', marginTop: 2 }}>{sub}</div>
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={() => setAktFlik('risk')}>
              Nästa: Riskbedömning <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ────────── TAB: Riskbedömning ────────── */}
      {aktFlik === 'risk' && (
        <div className="card">
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Riskbedömning – EN13241</div>
          <p style={{ fontSize: 12, color: 'var(--c-text2)', marginBottom: 16 }}>
            Bedöm varje farokategori, beskriv vidtagna åtgärder och ansvarig person.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {FAROR.map(f => {
              const r = risker[f.id]
              return (
                <div key={f.id} style={{ background: 'var(--c-bg)', borderRadius: 8,
                  padding: '12px 14px', border: '1px solid var(--c-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between',
                    alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{f.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--c-text2)', marginTop: 2 }}>{f.beskrivning}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {RISKNIVÅER.map(niv => {
                        const aktiv = r.nivå === niv
                        const bg = aktiv
                          ? niv === 'Hög' ? '#b83333' : niv === 'Medel' ? '#b87000'
                            : niv === 'Eliminerad' ? '#888' : 'var(--c-teal)'
                          : 'var(--c-surface)'
                        return (
                          <button key={niv} onClick={() => setRisk(f.id, 'nivå', niv)} style={{
                            padding: '4px 8px', fontSize: 11, borderRadius: 6, cursor: 'pointer',
                            border: `1.5px solid ${aktiv ? bg : 'var(--c-border)'}`,
                            background: bg, color: aktiv ? '#fff' : 'var(--c-text2)',
                            fontWeight: aktiv ? 600 : 400,
                          }}>{niv}</button>
                        )
                      })}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
                    <div>
                      <label style={{ ...lbl, marginBottom: 3 }}>Åtgärd</label>
                      <input type="text" value={r.åtgärd}
                        onChange={e => setRisk(f.id, 'åtgärd', e.target.value)}
                        placeholder="Beskriv åtgärd…"
                        style={{ ...inp, fontSize: 12, padding: '7px 10px' }} />
                    </div>
                    <div>
                      <label style={{ ...lbl, marginBottom: 3 }}>Ansvarig</label>
                      <input type="text" value={r.ansvarig}
                        onChange={e => setRisk(f.id, 'ansvarig', e.target.value)}
                        placeholder="Namn"
                        style={{ ...inp, fontSize: 12, padding: '7px 10px' }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={() => setAktFlik('egenkontroll')}>
              Nästa: Egenkontroll <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ────────── TAB: Egenkontroll ────────── */}
      {aktFlik === 'egenkontroll' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Egenkontroll – {portTyp}</div>
            <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
              <span style={{ color: 'var(--c-teal)', fontWeight: 600 }}>✓ OK: {okCount}</span>
              <span style={{ color: 'var(--c-red)',  fontWeight: 600 }}>✗ Ej: {ejCount}</span>
              <span style={{ color: 'var(--c-text2)' }}>N/A: {naCount}</span>
            </div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--c-text2)', marginBottom: 14 }}>
            Kontrollera varje punkt. Markera OK, Ej OK eller N/A.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {punkter.map((p, i) => {
              const st = egenkontroll[i]
              return (
                <div key={i} style={{
                  background: 'var(--c-bg)', borderRadius: 8, padding: '9px 12px',
                  border: `1px solid ${st === 'OK' ? 'var(--c-teal)' : st === 'EJ' ? 'var(--c-red)' : 'var(--c-border)'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13 }}>{p}</span>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      {[
                        ['OK', 'var(--c-teal)', 'var(--c-teal-bg)', 'var(--c-teal-text)', '✓ OK'],
                        ['EJ', 'var(--c-red)',  'var(--c-red-bg)',  'var(--c-red-text)',  '✗ Ej'],
                        ['NA', '#888',          '#e8e7e4',          '#555',               'N/A' ],
                      ].map(([val, brd, bg, col, etk]) => (
                        <button key={val} onClick={() => setEgen(i, val)} style={{
                          padding: '4px 9px', fontSize: 11, borderRadius: 6, cursor: 'pointer',
                          border: `1.5px solid ${st === val ? brd : 'var(--c-border)'}`,
                          background: st === val ? bg : 'transparent',
                          color: st === val ? col : 'var(--c-text2)',
                          fontWeight: st === val ? 600 : 400,
                        }}>{etk}</button>
                      ))}
                    </div>
                  </div>
                  {st === 'EJ' && (
                    <input type="text" placeholder="Notering om avvikelse…"
                      value={egenNoteringar[i] || ''}
                      onChange={e => setEgenNoteringar(prev => ({ ...prev, [i]: e.target.value }))}
                      style={{ ...inp, fontSize: 12, marginTop: 8 }} />
                  )}
                </div>
              )
            })}
          </div>

          {/* Signatur */}
          <div style={{ marginTop: 20, borderTop: '1px solid var(--c-border)', paddingTop: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 500, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              marginBottom: visaSignatur ? 10 : 0 }}>
              <input type="checkbox" checked={visaSignatur}
                onChange={e => setVisaSignatur(e.target.checked)} />
              Tekniker signatur
            </label>
            {visaSignatur && (
              <>
                <p style={{ fontSize: 12, color: 'var(--c-text2)', marginBottom: 8 }}>Rita signaturen nedan.</p>
                <SignaturPad onChange={setSignaturbild} />
              </>
            )}
          </div>

          {/* Åtgärdsknappar */}
          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button className="btn" style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={skrivUtPDF}>
              <Printer size={14} /> Förhandsgranska PDF
            </button>
            <button className="btn btn-primary"
              disabled={sparar || !kanSpara}
              onClick={spara}>
              {sparar ? 'Sparar…' : 'Spara protokoll'}
            </button>
          </div>

          {!kanSpara && (
            <p style={{ fontSize: 12, color: 'var(--c-text2)', textAlign: 'right', marginTop: 6 }}>
              Fyll i portnamn för att spara.
            </p>
          )}
        </div>
      )}

      {/* ────────── TAB: Dokument ────────── */}
      {aktFlik === 'dokument' && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Bifogade dokument</div>
            <p style={{ fontSize: 12, color: 'var(--c-text2)' }}>
              Bifoga relevanta dokument för porten och montaget – manualer, ritningar, CE-intyg, foton m.m.
              Dokumenten sparas och länkas till porten i portregistret.
            </p>
          </div>
          <DokumentZon dokument={dokument} onChange={setDokument} />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary"
              disabled={sparar || !kanSpara}
              onClick={spara}>
              {sparar ? 'Sparar…' : 'Spara protokoll'}
            </button>
          </div>
          {!kanSpara && (
            <p style={{ fontSize: 12, color: 'var(--c-text2)', textAlign: 'right', marginTop: -8 }}>
              Fyll i portnamn för att spara.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
