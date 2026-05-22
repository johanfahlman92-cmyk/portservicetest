import { useState, useRef } from 'react'
import { CheckCircle, ChevronRight, Printer, CheckSquare, History, ArrowLeft,
         Search, CalendarPlus, X, Check, Wrench, AlertCircle, AlertTriangle,
         Minus, Pencil, Plus, ClipboardList } from 'lucide-react'
import logo from '../image-1779305303942.png'
import { protokollPunkter as defaultMallar } from '../data/store.js'

async function hämtaLogoBase64() {
  try {
    const res  = await fetch(logo)
    const blob = await res.blob()
    return new Promise(resolve => {
      const r = new FileReader()
      r.onload = () => resolve(r.result)
      r.readAsDataURL(blob)
    })
  } catch { return null }
}

const PDF_STATUS_LABEL = { OK: 'Godkänd', AF: 'Åtgärdad', NOT: 'Att notera', KA: 'Kräver åtgärd', EJ: 'Ej tillämpbar' }
const PDF_STATUS_COLOR = { OK: '#16a34a', AF: '#2563eb', NOT: '#d97706', KA: '#dc2626', EJ: '#9ca3af' }

// ── Nya statusalternativ (5 st) ────────────────────────────────────────────
const STATUSES = [
  { kod: 'OK',  label: 'Godkänd',       Icon: Check,         color: '#16a34a', bg: '#f0fdf4', border: '#16a34a' },
  { kod: 'AF',  label: 'Åtgärdad',      Icon: Wrench,        color: '#2563eb', bg: '#eff6ff', border: '#2563eb' },
  { kod: 'NOT', label: 'Att notera',    Icon: AlertCircle,   color: '#d97706', bg: '#fffbeb', border: '#d97706' },
  { kod: 'KA',  label: 'Kräver åtgärd', Icon: AlertTriangle, color: '#dc2626', bg: '#fef2f2', border: '#dc2626' },
  { kod: 'EJ',  label: 'Ej tillämpbar', Icon: Minus,         color: '#9ca3af', bg: '#f9fafb', border: '#d1d5db' },
]
const STATUS_MAP = Object.fromEntries(STATUSES.map(s => [s.kod, s]))

// Bakåtkompatibilitet: gamla G/J/A → nya koder
const LEGACY = { G: 'OK', J: 'NOT', A: 'KA' }
const normKod = (k) => STATUS_MAP[k] ? k : (LEGACY[k] || k)

function StatusBadge({ kod }) {
  const k = normKod(kod)
  const s = STATUS_MAP[k]
  if (!s) return null
  const { Icon, color, bg, label } = s
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 6, background: bg, color, fontSize: 11, fontWeight: 600 }}>
      <Icon size={11} /> {label}
    </span>
  )
}

// ── Signaturplatta ─────────────────────────────────────────────────────────
function SignaturPad({ onChange }) {
  const canvasRef = useRef(null)
  const drawing   = useRef(false)
  const lastPos   = useRef({ x: 0, y: 0 })

  const getPos = (e) => {
    const canvas = canvasRef.current
    const rect   = canvas.getBoundingClientRect()
    const src    = e.touches ? e.touches[0] : e
    return {
      x: (src.clientX - rect.left) * (canvas.width  / rect.width),
      y: (src.clientY - rect.top)  * (canvas.height / rect.height),
    }
  }
  const startDraw = (e) => { e.preventDefault(); drawing.current = true; lastPos.current = getPos(e) }
  const draw = (e) => {
    if (!drawing.current) return
    e.preventDefault()
    const ctx = canvasRef.current.getContext('2d')
    const pos = getPos(e)
    ctx.beginPath(); ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = '#1a1917'
    ctx.moveTo(lastPos.current.x, lastPos.current.y); ctx.lineTo(pos.x, pos.y); ctx.stroke()
    lastPos.current = pos
    onChange?.(canvasRef.current.toDataURL())
  }
  const stopDraw = () => { drawing.current = false }
  const rensa = () => { canvasRef.current.getContext('2d').clearRect(0, 0, 600, 130); onChange?.('') }

  return (
    <div>
      <canvas ref={canvasRef} width={600} height={130}
        style={{ border: '1px solid var(--c-border)', borderRadius: 8, width: '100%', touchAction: 'none', cursor: 'crosshair', background: '#fff' }}
        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
      />
      <button className="btn" style={{ fontSize: 11, marginTop: 6 }} onClick={rensa}>Rensa signatur</button>
    </div>
  )
}

// ── Protokollformulär (används för nytt OCH redigering) ───────────────────
function ProtokollForm({ objekt: obj, entry = null, tekniker = [], mallar = {}, onSpara, onAvbryt }) {
  const isEdit = !!entry
  const initPortTyp = entry?.portTyp || obj?.typ || Object.keys(mallar)[0] || 'Vikport'
  const punkter     = mallar[initPortTyp] || Object.values(mallar)[0] || []

  const initStatuses = {}
  if (entry?.statuses) {
    Object.entries(entry.statuses).forEach(([k, v]) => { initStatuses[k] = normKod(v) })
  }

  const PORTTYPER = Object.keys(mallar)

  const [portTyp,       setPortTyp]       = useState(initPortTyp)
  const [statuses,      setStatuses]      = useState(initStatuses)
  const [noteringar,    setNoteringar]    = useState(entry?.noteringar || {})
  const [teknikerNamn,  setTeknikerNamn]  = useState(entry?.tekniker || tekniker[0] || '')
  const [datumStr,      setDatumStr]      = useState(entry?.datum || new Date().toISOString().slice(0, 10))
  const [visaSignatur,  setVisaSignatur]  = useState(false)
  const [signaturbild,  setSignaturbild]  = useState(entry?.signatur || '')
  const [sparar,        setSparar]        = useState(false)
  const [expandNotis,   setExpandNotis]   = useState({})

  const aktuellaPunkter = mallar[portTyp] || []

  const setStatus   = (i, kod) => setStatuses(p => ({ ...p, [i]: p[i] === kod ? '' : kod }))
  const setNotering = (i, v)   => setNoteringar(p => ({ ...p, [i]: v }))

  const godkannAlla = () => {
    const alla = {}
    aktuellaPunkter.forEach((p, i) => { if (!p.startsWith('## ')) alla[i] = 'OK' })
    setStatuses(alla)
  }

  const counts = { OK: 0, AF: 0, NOT: 0, KA: 0, EJ: 0, tom: 0 }
  aktuellaPunkter.forEach((p, i) => {
    if (p.startsWith('## ')) return  // rubriker räknas inte
    const s = statuses[i]
    if (STATUS_MAP[s]) counts[s]++
    else counts.tom++
  })
  const totalPunkter = aktuellaPunkter.filter(p => !p.startsWith('## ')).length
  const done = totalPunkter - counts.tom
  const pct  = totalPunkter > 0 ? Math.round((done / totalPunkter) * 100) : 0

  const spara = async () => {
    setSparar(true)
    const nyttInslag = {
      ...(entry || {}),
      datum:      datumStr,
      tekniker:   teknikerNamn || 'Okänd',
      portTyp,
      statuses:   { ...statuses },
      noteringar: { ...noteringar },
      signatur:   signaturbild || null,
      // Summary counts
      ok:  counts.OK,
      af:  counts.AF,
      not: counts.NOT,
      ka:  counts.KA,
      ej:  counts.EJ,
      // Legacy fields for bakåtkompatibilitet
      g: counts.OK, j: counts.NOT, a: counts.KA,
      notering: Object.values(noteringar).filter(Boolean).join(', ') || '',
    }
    await onSpara(nyttInslag, isEdit)
    setSparar(false)
  }

  return (
    <div style={{ maxWidth: 700 }}>
      {/* Tekniker + datum + mall */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--c-text2)', marginBottom: 5 }}>Tekniker</div>
            <select value={teknikerNamn} onChange={e => setTeknikerNamn(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: '1px solid var(--c-border)', borderRadius: 6, background: 'var(--c-bg)', color: 'var(--c-text)' }}>
              <option value="">– Välj –</option>
              {tekniker.map(t => <option key={t} value={t}>{t}</option>)}
              <option value="Annan">Annan</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--c-text2)', marginBottom: 5 }}>Datum</div>
            <input type="date" value={datumStr} onChange={e => setDatumStr(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: '1px solid var(--c-border)', borderRadius: 6, background: 'var(--c-bg)', color: 'var(--c-text)', boxSizing: 'border-box' }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--c-text2)', marginBottom: 5 }}>Servicemall</div>
            <select value={portTyp} onChange={e => { setPortTyp(e.target.value); setStatuses({}); setNoteringar({}) }}
              style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: '1px solid var(--c-border)', borderRadius: 6, background: 'var(--c-bg)', color: 'var(--c-text)' }}>
              {PORTTYPER.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {STATUSES.filter(s => counts[s.kod] > 0).map(s => (
          <span key={s.kod} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, padding: '3px 10px', borderRadius: 20, background: s.bg, color: s.color, fontWeight: 600 }}>
            <s.Icon size={12} /> {counts[s.kod]} {s.label}
          </span>
        ))}
        <span style={{ fontSize: 12, color: 'var(--c-text3)', marginLeft: 'auto' }}>{done}/{aktuellaPunkter.length} ({pct}%)</span>
      </div>
      <div className="progress-bar" style={{ height: 6, marginBottom: 14 }}>
        <div className="progress-fill" style={{ width: `${pct}%`, background: counts.KA > 0 ? 'var(--c-red)' : 'var(--c-teal)' }} />
      </div>

      {/* Checklista */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {STATUSES.map(s => (
              <span key={s.kod} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, padding: '2px 7px', borderRadius: 4, background: s.bg, color: s.color, fontWeight: 600 }}>
                <s.Icon size={10} /> {s.label}
              </span>
            ))}
          </div>
          <button className="btn btn-teal" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }} onClick={godkannAlla}>
            <CheckSquare size={12} /> Godkänn alla
          </button>
        </div>

        {(() => {
          let numCount = 0
          return aktuellaPunkter.map((p, i) => {
            if (p.startsWith('## ')) {
              return (
                <div key={i} style={{ margin: '14px 0 6px', padding: '5px 10px', background: 'var(--c-bg)', borderRadius: 6, borderLeft: '3px solid var(--c-blue)' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-blue)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{p.slice(3)}</span>
                </div>
              )
            }
            numCount++
            const s = statuses[i] || ''
            const visaNotis = s === 'AF' || s === 'NOT' || s === 'KA' || expandNotis[i]
            return (
              <div key={i} style={{ borderBottom: '1px solid var(--c-border)', paddingBottom: 8, marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, color: 'var(--c-text3)', minWidth: 20, flexShrink: 0 }}>{numCount}.</span>
                  <span style={{ flex: 1, fontSize: 13 }}>{p}</span>
                  <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                    {STATUSES.map(({ kod, Icon, color, bg, border, label }) => (
                      <button key={kod} onClick={() => setStatus(i, kod)} title={label} style={{
                        width: 30, height: 28, borderRadius: 6, border: `1px solid ${s === kod ? border : 'var(--c-border)'}`,
                        background: s === kod ? bg : 'transparent',
                        color: s === kod ? color : 'var(--c-text3)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.12s',
                      }}>
                        <Icon size={13} />
                      </button>
                    ))}
                  </div>
                </div>
                {visaNotis && (
                  <input type="text" placeholder="Notering / åtgärd…"
                    value={noteringar[i] || ''} onChange={e => setNotering(i, e.target.value)}
                    style={{ marginTop: 6, marginLeft: 28, width: 'calc(100% - 28px)', fontSize: 12, padding: '5px 8px', border: '1px solid var(--c-border)', borderRadius: 6, background: 'var(--c-bg)', color: 'var(--c-text)', outline: 'none' }} />
                )}
              </div>
            )
          })
        })()}
      </div>

      {/* Signatur */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="toggle-row" style={{ borderBottom: visaSignatur ? undefined : 'none' }}>
          <div>
            <div style={{ fontWeight: 500, fontSize: 13 }}>Signatur tekniker</div>
            <div style={{ fontSize: 11, color: 'var(--c-text2)' }}>Tillval</div>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={visaSignatur} onChange={e => setVisaSignatur(e.target.checked)} />
            <div className="toggle-track" /><div className="toggle-thumb" />
          </label>
        </div>
        {visaSignatur && <div style={{ marginTop: 12 }}><SignaturPad onChange={setSignaturbild} /></div>}
      </div>

      {/* Knappar */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-teal" style={{ flex: 1 }} onClick={spara} disabled={sparar}>
          <CheckCircle size={14} /> {sparar ? 'Sparar…' : isEdit ? 'Spara ändringar' : 'Skicka in protokoll'}
        </button>
        {onAvbryt && <button className="btn" onClick={onAvbryt}>Avbryt</button>}
      </div>
    </div>
  )
}

export default function Protokoll({ objekt = [], tekniker = [], protokollMallar, onUppdateraObjekt, onLaggTillBokning, onLoggAktivitet }) {
  const protokollPunkter = protokollMallar || defaultMallar
  const [vy,            setVy]            = useState('lista')    // lista | alla | form | detalj
  const [valdObjekt,    setValdObjekt]    = useState(null)
  const [valdEntry,     setValdEntry]     = useState(null)       // valt protokoll i historik
  const [valdEntryIdx,  setValdEntryIdx]  = useState(null)
  const [redigerar,     setRedigerar]     = useState(false)
  const [sokText,       setSokText]       = useState('')
  const [sparatMsg,     setSparatMsg]     = useState(null)

  // Bokningsstate (visas efter sparat)
  const [visaBokaModal, setVisaBokaModal] = useState(false)
  const [hoppaBokning,  setHoppaBokning]  = useState(false)
  const [bokaDatum,     setBokaDatum]     = useState('')
  const [bokaTid,       setBokaTid]       = useState('08:00')
  const [bokaTekniker,  setBokaTekniker]  = useState('')
  const [bokaKlar,      setBokaKlar]      = useState(false)
  const [bokar,         setBokar]         = useState(false)

  // ── Spara nytt/redigerat protokoll ──────────────────────────────────────
  const sparaProtokoll = async (nyttInslag, isEdit) => {
    const idag = new Date().toISOString().slice(0, 10)
    let nyHistorik

    if (isEdit && valdEntryIdx != null) {
      nyHistorik = [...(valdObjekt.historik || [])]
      nyHistorik[valdEntryIdx] = nyttInslag
    } else {
      nyHistorik = [...(valdObjekt.historik || []), nyttInslag]
    }

    const nyttStatus = nyttInslag.ka > 0 ? 'arende' : 'ok'
    const nastaDate  = new Date(); nastaDate.setMonth(nastaDate.getMonth() + 6)
    const nastaDatum = nastaDate.toISOString().slice(0, 10)

    await onUppdateraObjekt(valdObjekt.id, {
      historik:         nyHistorik,
      status:           nyttStatus,
      senaste:          idag,
      nasta:            nastaDatum,
      intervallProcent: 0,
    })
    setValdObjekt(prev => ({ ...prev, historik: nyHistorik }))
    onLoggAktivitet?.('protokoll_sparat', 'objekt', valdObjekt.id, valdObjekt.namn,
      `Protokoll ${isEdit ? 'uppdaterat' : 'sparat'}: ${valdObjekt.namn}`)

    if (!isEdit) {
      setSparatMsg({ namn: valdObjekt.namn, inslag: nyttInslag, nastaDatum })
      setBokaDatum(nastaDatum)
      setBokaTekniker(nyttInslag.tekniker || '')
      setBokaKlar(false)
      setVy('sparat')
    } else {
      setRedigerar(false)
      setVy('detalj')
    }
  }

  // ── Bekräfta bokning ─────────────────────────────────────────────────────
  const bekraftaBokning = async () => {
    if (!onLaggTillBokning || !bokaDatum) return
    setBokar(true)
    await onLaggTillBokning(bokaDatum, {
      tid: bokaTid, typ: 'service',
      namn: valdObjekt?.namn, kund: valdObjekt?.kund || '',
      tek: bokaTekniker, arendeId: null,
    })
    setBokar(false); setBokaKlar(true)
  }

  // ── Skriv ut PDF ─────────────────────────────────────────────────────────
  const skrivUtProtokoll = async (obj, entry) => {
    const logoBase64 = await hämtaLogoBase64()
    const punkter    = protokollPunkter[entry.portTyp || obj?.typ] || protokollPunkter['Vikport'] || []

    let numCount = 0
    const rader = punkter.map((p, i) => {
      if (p.startsWith('## ')) {
        return `<tr><td colspan="3" style="background:#f3f2ef;padding:6px 8px;font-size:10px;font-weight:700;color:#1C3461;text-transform:uppercase;letter-spacing:0.06em">${p.slice(3)}</td></tr>`
      }
      numCount++
      const kod   = normKod(entry.statuses?.[i] || '')
      const label = PDF_STATUS_LABEL[kod] || ''
      const color = PDF_STATUS_COLOR[kod] || '#888'
      const not   = entry.noteringar?.[i] || ''
      return `<tr>
        <td style="padding:5px 8px;border-bottom:1px solid #e8e7e4;font-size:11px;text-align:justify"><span style="color:#888;margin-right:5px">${numCount}.</span>${p}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e8e7e4;font-size:11px;color:${color};font-weight:600;white-space:nowrap">${label}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e8e7e4;font-size:11px;color:#555;text-align:justify">${not}</td>
      </tr>`
    }).join('')

    const win = window.open('', '_blank', 'width=860,height=1100')
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Serviceprotokoll – ${obj?.namn}</title>
<style>
body{font-family:Arial,sans-serif;font-size:12px;color:#1a1917;margin:32px 40px}
h1{font-size:20px;margin-bottom:6px}
h2{font-size:13px;margin-top:22px;margin-bottom:8px;border-bottom:2px solid #1D9E75;padding-bottom:4px;color:#1D9E75}
.meta{display:grid;grid-template-columns:1fr 1fr;gap:4px 24px;margin-bottom:14px;font-size:11px;color:#555}
.meta b{color:#1a1917}
table{width:100%;border-collapse:collapse;margin-bottom:14px}
th{background:#f3f2ef;padding:6px 8px;text-align:left;font-size:11px;font-weight:600}
td{vertical-align:top}
p{text-align:justify;line-height:1.6}
.sig-box{border:1px solid #ccc;border-radius:6px;padding:8px;display:inline-block}
@media print{body{margin:16px}}
</style></head><body>
${logoBase64 ? `<img src="${logoBase64}" style="height:60px;display:block;margin-bottom:12px" alt="NMV Portservice" />` : ''}
<h1>Serviceprotokoll</h1>
<div class="meta">
  <div><b>Port:</b> ${obj?.namn || '–'}</div>
  <div><b>Kund:</b> ${obj?.kund || '–'}</div>
  <div><b>Porttyp:</b> ${entry.portTyp || obj?.typ || '–'}</div>
  <div><b>Datum:</b> ${entry.datum || '–'}</div>
  <div><b>Tekniker:</b> ${entry.tekniker || '–'}</div>
  <div><b>Adress:</b> ${obj?.adress || obj?.plats || '–'}</div>
</div>
<h2>Kontrollpunkter</h2>
<table>
  <thead><tr>
    <th style="width:60%">Kontrollpunkt</th>
    <th style="width:20%">Status</th>
    <th style="width:20%">Notering</th>
  </tr></thead>
  <tbody>${rader}</tbody>
</table>
${entry.signatur ? `<h2>Signatur tekniker</h2>
<div class="sig-box"><img src="${entry.signatur}" style="max-width:300px;max-height:90px"/></div>
<p style="font-size:11px;color:#555;margin-top:6px">${entry.tekniker || ''},&nbsp;${entry.datum}</p>` : ''}
</body></html>`)
    win.document.close()
    setTimeout(() => win.print(), 400)
  }

  // ── Välj objekt för nytt protokoll ───────────────────────────────────────
  const valjObjektForNytt = (o) => {
    setValdObjekt(o); setValdEntry(null); setValdEntryIdx(null)
    setRedigerar(false); setVy('form')
  }

  // ── Öppna befintligt protokoll ───────────────────────────────────────────
  const oppnaDetalj = (obj, entry, idx) => {
    setValdObjekt(obj); setValdEntry(entry); setValdEntryIdx(idx)
    setRedigerar(false); setVy('detalj')
  }

  const FLIK_BTN = (id, label, icon) => (
    <button onClick={() => setVy(id)} style={{
      padding: '8px 16px', fontSize: 13, fontWeight: vy === id ? 600 : 400,
      background: 'none', border: 'none', cursor: 'pointer',
      borderBottom: `2px solid ${vy === id ? 'var(--c-blue)' : 'transparent'}`,
      color: vy === id ? 'var(--c-text)' : 'var(--c-text2)', marginBottom: -2,
      display: 'flex', alignItems: 'center', gap: 6,
    }}>{icon}{label}</button>
  )

  // ── VY: Alla protokoll ───────────────────────────────────────────────────
  if (vy === 'alla') {
    const alleProtokoll = objekt
      .filter(o => !o.arkiverad)
      .flatMap(o => (o.historik || [])
        .filter(h => h.typ !== 'montering')
        .map((h, idx) => ({ ...h, _objekt: o, _idx: idx }))
      )
      .sort((a, b) => (b.datum || '').localeCompare(a.datum || ''))
      .filter(h => {
        if (!sokText) return true
        const q = sokText.toLowerCase()
        return h._objekt.namn?.toLowerCase().includes(q) || h._objekt.kund?.toLowerCase().includes(q) || h.tekniker?.toLowerCase().includes(q)
      })

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button className="btn" onClick={() => setVy('lista')}>← Tillbaka</button>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Alla protokoll</h1>
        </div>
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text3)', pointerEvents: 'none' }} />
          <input type="text" placeholder="Sök port, kund, tekniker…" value={sokText} onChange={e => setSokText(e.target.value)}
            style={{ width: '100%', padding: '7px 10px 7px 32px', fontSize: 13, border: '1px solid var(--c-border)', borderRadius: 8, background: 'var(--c-surface)', color: 'var(--c-text)', boxSizing: 'border-box' }} />
        </div>
        <div className="card">
          {alleProtokoll.length === 0 && <p style={{ fontSize: 13, color: 'var(--c-text3)' }}>Inga protokoll hittades.</p>}
          {alleProtokoll.map((h, i) => (
            <div key={i} className="row-item" onClick={() => oppnaDetalj(h._objekt, h, h._idx)} style={{ cursor: 'pointer' }}>
              <div className="row-main">
                <div className="row-name">{h._objekt.namn} · <span style={{ fontWeight: 400, color: 'var(--c-text2)' }}>{h._objekt.kund}</span></div>
                <div className="row-sub">{h.datum} · {h.tekniker}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                {h.ka > 0 && <span className="badge badge-red">{h.ka} kräver åtgärd</span>}
                {h.ka === 0 && h.not > 0 && <span className="badge badge-amber">{h.not} notering</span>}
                {!h.ka && !h.not && <span className="badge badge-teal">OK</span>}
              </div>
              <ChevronRight size={15} color="var(--c-text3)" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── VY: Protokoll-detalj ─────────────────────────────────────────────────
  if (vy === 'detalj' && valdEntry) {
    const punkter = protokollPunkter[valdEntry.portTyp || valdObjekt?.typ] || protokollPunkter['Vikport']

    if (redigerar) {
      return (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <button className="btn" onClick={() => setRedigerar(false)}>← Avbryt</button>
            <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Redigera protokoll — {valdObjekt?.namn}</h1>
          </div>
          <ProtokollForm
            objekt={valdObjekt}
            entry={valdEntry}
            tekniker={tekniker}
            mallar={protokollPunkter}
            onSpara={sparaProtokoll}
            onAvbryt={() => setRedigerar(false)}
          />
        </div>
      )
    }

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <button className="btn" onClick={() => setVy('lista')}>← Tillbaka</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={() => skrivUtProtokoll(valdObjekt, valdEntry)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Printer size={13} /> Skriv ut
            </button>
            <button className="btn" onClick={() => setRedigerar(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Pencil size={13} /> Redigera
            </button>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
            {[['Port', valdObjekt?.namn], ['Kund', valdObjekt?.kund], ['Datum', valdEntry.datum], ['Tekniker', valdEntry.tekniker], ['Porttyp', valdEntry.portTyp]].map(([l, v]) => (
              <div key={l}>
                <div style={{ fontSize: 10, color: 'var(--c-text3)', marginBottom: 2 }}>{l}</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{v || '–'}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {STATUSES.map(s => {
              const cnt = Object.values(valdEntry.statuses || {}).filter(v => normKod(v) === s.kod).length
              if (!cnt) return null
              return (
                <span key={s.kod} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '2px 8px', borderRadius: 6, background: s.bg, color: s.color, fontWeight: 600 }}>
                  <s.Icon size={11} /> {cnt} {s.label}
                </span>
              )
            })}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 12 }}>
          {(() => {
            let numCount = 0
            return punkter.map((p, i) => {
              if (p.startsWith('## ')) {
                return (
                  <div key={i} style={{ margin: '12px 0 4px', padding: '5px 10px', background: 'var(--c-bg)', borderRadius: 6, borderLeft: '3px solid var(--c-blue)' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-blue)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{p.slice(3)}</span>
                  </div>
                )
              }
              numCount++
              const kod = normKod(valdEntry.statuses?.[i] || '')
              const s   = STATUS_MAP[kod]
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--c-border)' }}>
                  <span style={{ fontSize: 10, color: 'var(--c-text3)', minWidth: 20, paddingTop: 2 }}>{numCount}.</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 13 }}>{p}</span>
                    {valdEntry.noteringar?.[i] && (
                      <div style={{ fontSize: 11, color: 'var(--c-text2)', marginTop: 3, fontStyle: 'italic' }}>{valdEntry.noteringar[i]}</div>
                    )}
                  </div>
                  {s && <StatusBadge kod={kod} />}
                </div>
              )
            })
          })()}
        </div>

        {valdEntry.signatur && (
          <div className="card">
            <div style={{ fontSize: 11, color: 'var(--c-text2)', marginBottom: 8 }}>Signatur</div>
            <img src={valdEntry.signatur} alt="Signatur" style={{ maxWidth: 260, border: '1px solid var(--c-border)', borderRadius: 6 }} />
          </div>
        )}
      </div>
    )
  }

  // ── VY: Sparat (efter inlämning) ──────────────────────────────────────────
  if (vy === 'sparat' && sparatMsg) {
    const inp = { width: '100%', padding: '7px 10px', fontSize: 13, border: '1px solid var(--c-border)', borderRadius: 6, background: 'var(--c-bg)', color: 'var(--c-text)', boxSizing: 'border-box' }
    return (
      <div>
        <div style={{ background: 'var(--c-teal-bg)', borderRadius: 12, padding: 20, textAlign: 'center', marginBottom: 16 }}>
          <CheckCircle size={32} color="var(--c-teal)" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--c-teal-text)', marginBottom: 4 }}>Protokoll sparat!</div>
          <div style={{ fontSize: 12, color: 'var(--c-teal-text)' }}>{sparatMsg.namn}</div>
        </div>

        {onLaggTillBokning && !hoppaBokning && (
          <div className="card" style={{ marginBottom: 16 }}>
            {bokaKlar ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <CheckCircle size={28} color="var(--c-teal)" style={{ margin: '0 auto 8px', display: 'block' }} />
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-teal-text)' }}>Service inbokad!</div>
                <div style={{ fontSize: 12, color: 'var(--c-text2)', marginTop: 4 }}>{bokaDatum} kl. {bokaTid}</div>
              </div>
            ) : visaBokaModal ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Boka nästa service</div>
                  <button className="btn" onClick={() => setVisaBokaModal(false)} style={{ padding: '3px 7px' }}><X size={13} /></button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px', marginBottom: 12 }}>
                  <div><label style={{ fontSize: 11, color: 'var(--c-text2)', display: 'block', marginBottom: 3 }}>Datum</label>
                    <input type="date" value={bokaDatum} onChange={e => setBokaDatum(e.target.value)} style={inp} /></div>
                  <div><label style={{ fontSize: 11, color: 'var(--c-text2)', display: 'block', marginBottom: 3 }}>Tid</label>
                    <input type="time" value={bokaTid} onChange={e => setBokaTid(e.target.value)} style={inp} /></div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, color: 'var(--c-text2)', display: 'block', marginBottom: 3 }}>Tekniker</label>
                  <select value={bokaTekniker} onChange={e => setBokaTekniker(e.target.value)} style={inp}>
                    <option value="">– Ej tilldelad –</option>
                    {tekniker.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <button className="btn btn-primary" onClick={bekraftaBokning} disabled={bokar || !bokaDatum}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CalendarPlus size={14} /> {bokar ? 'Bokar…' : 'Boka in i kalender'}
                </button>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>Boka nästa service?</div>
                  <div style={{ fontSize: 12, color: 'var(--c-text2)', marginTop: 2 }}>Föreslaget: <strong>{bokaDatum}</strong></div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-teal" onClick={() => setVisaBokaModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <CalendarPlus size={13} /> Ja, boka
                  </button>
                  <button className="btn" style={{ fontSize: 12 }} onClick={() => setHoppaBokning(true)}>Hoppa över</button>
                </div>
              </div>
            )}
          </div>
        )}

        <button className="btn" onClick={() => { setVy('lista'); setSparatMsg(null); setHoppaBokning(false); setBokaKlar(false); setVisaBokaModal(false) }}>← Nytt protokoll</button>
      </div>
    )
  }

  // ── VY: Nytt protokoll (formulär) ────────────────────────────────────────
  if (vy === 'form' && valdObjekt) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <img src={logo} alt="" style={{ height: 60, display: 'block', flexShrink: 0 }} />
          <button className="btn" onClick={() => setVy('lista')}>← Välj annan port</button>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Nytt protokoll</h1>
            <p style={{ fontSize: 12, color: 'var(--c-text2)', margin: '2px 0 0' }}>{valdObjekt.namn} · {valdObjekt.kund}</p>
          </div>
        </div>
        <ProtokollForm objekt={valdObjekt} tekniker={tekniker} mallar={protokollPunkter} onSpara={sparaProtokoll} />
      </div>
    )
  }

  // ── VY: Lista / Startsida ────────────────────────────────────────────────
  const aktivaObjekt = objekt.filter(o => !o.arkiverad)
  const filtrerade   = aktivaObjekt.filter(o => {
    if (!sokText) return true
    const q = sokText.toLowerCase()
    return o.namn?.toLowerCase().includes(q) || o.kund?.toLowerCase().includes(q) || o.typ?.toLowerCase().includes(q)
  })

  const totalaProtokoll = aktivaObjekt.reduce((sum, o) =>
    sum + (o.historik || []).filter(h => h.typ !== 'montering').length, 0)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 2 }}>Serviceprotokoll</h1>
          <p style={{ color: 'var(--c-text2)', fontSize: 13 }}>Välj port för nytt protokoll eller bläddra i historik</p>
        </div>
        <button onClick={() => setVy('alla')} className="btn" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ClipboardList size={14} /> Alla protokoll ({totalaProtokoll})
        </button>
      </div>

      <div style={{ position: 'relative', marginBottom: 12 }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text3)', pointerEvents: 'none' }} />
        <input type="text" placeholder="Sök port, kund, typ…" value={sokText} onChange={e => setSokText(e.target.value)}
          style={{ width: '100%', padding: '7px 10px 7px 32px', fontSize: 13, border: '1px solid var(--c-border)', borderRadius: 8, background: 'var(--c-surface)', color: 'var(--c-text)', boxSizing: 'border-box' }} />
      </div>

      {aktivaObjekt.length === 0 ? (
        <div className="card"><p style={{ color: 'var(--c-text2)', fontSize: 13 }}>Inga portar i registret.</p></div>
      ) : (
        <div className="card">
          {filtrerade.length === 0 && <p style={{ color: 'var(--c-text2)', fontSize: 13 }}>Inga portar matchar sökningen.</p>}
          {filtrerade.map(o => {
            const hist = (o.historik || []).filter(h => h.typ !== 'montering')
            const senaste = hist[hist.length - 1]
            return (
              <div key={o.id} className="row-item" style={{ cursor: 'pointer' }} onClick={() => valjObjektForNytt(o)}>
                <div className="row-main">
                  <div className="row-name">{o.namn}</div>
                  <div className="row-sub">{o.plats ? `${o.plats} · ` : ''}{o.kund} · {o.typ}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  {hist.length > 0 && (
                    <button
                      onClick={e => { e.stopPropagation(); oppnaDetalj(o, hist[hist.length - 1], hist.length - 1) }}
                      style={{ fontSize: 11, padding: '3px 8px', background: 'var(--c-bg)', border: '1px solid var(--c-border)', borderRadius: 6, cursor: 'pointer', color: 'var(--c-text2)' }}
                    >
                      {hist.length} protokoll
                    </button>
                  )}
                  <span style={{ fontSize: 11, color: 'var(--c-text3)' }}>{senaste?.datum || ''}</span>
                  <ChevronRight size={16} color="var(--c-text3)" />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
