import { useState, useRef } from 'react'
import { CheckCircle, ChevronRight, Printer, CheckSquare, History, ArrowLeft, Search, CalendarPlus, X } from 'lucide-react'
import logo from '../image-1779305303942.png'
import { protokollPunkter } from '../data/store.js'

const PORTTYPER = Object.keys(protokollPunkter)

const statusStyle = {
  G: { bg: 'var(--c-green-bg)',  color: 'var(--c-green-text)',  label: 'G – Godkänt' },
  J: { bg: 'var(--c-amber-bg)', color: 'var(--c-amber-text)', label: 'J – Justerad' },
  A: { bg: 'var(--c-red-bg)',   color: 'var(--c-red-text)',   label: 'A – Anmärkning' },
}

// ── Signaturplatta ────────────────────────────────────────
function SignaturPad({ onChange }) {
  const canvasRef = useRef(null)
  const drawing   = useRef(false)
  const lastPos   = useRef({ x: 0, y: 0 })

  const getPos = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width  / rect.width
    const scaleY = canvas.height / rect.height
    const src = e.touches ? e.touches[0] : e
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top)  * scaleY,
    }
  }

  const startDraw = (e) => {
    e.preventDefault()
    drawing.current = true
    lastPos.current = getPos(e)
  }
  const draw = (e) => {
    if (!drawing.current) return
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e)
    ctx.beginPath()
    ctx.lineWidth   = 2
    ctx.lineCap     = 'round'
    ctx.strokeStyle = '#1a1917'
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPos.current = pos
    onChange?.(canvas.toDataURL())
  }
  const stopDraw = () => { drawing.current = false }

  const rensa = () => {
    const canvas = canvasRef.current
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    onChange?.('')
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={600}
        height={130}
        style={{ border: '1px solid var(--c-border2)', borderRadius: 8, width: '100%', touchAction: 'none', cursor: 'crosshair', background: '#fff' }}
        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
      />
      <button className="btn" style={{ fontSize: 11, marginTop: 6 }} onClick={rensa}>Rensa signatur</button>
    </div>
  )
}

// ── Läs gammalt protokoll (read-only) ───────────────────
function GammaltProtokoll({ entry, portTyp, onStäng }) {
  const punkter = protokollPunkter[entry.portTyp || portTyp] || []
  const statuses  = entry.statuses   || {}
  const noteringar = entry.noteringar || {}

  return (
    <div>
      <button className="btn" onClick={onStäng} style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <ArrowLeft size={14} /> Tillbaka till historik
      </button>
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
          <div><div style={{ fontSize: 11, color: 'var(--c-text2)' }}>Datum</div><div style={{ fontSize: 13, fontWeight: 600 }}>{entry.datum}</div></div>
          <div><div style={{ fontSize: 11, color: 'var(--c-text2)' }}>Tekniker</div><div style={{ fontSize: 13, fontWeight: 600 }}>{entry.tekniker}</div></div>
          <div><div style={{ fontSize: 11, color: 'var(--c-text2)' }}>Resultat</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              <span style={{ color: 'var(--c-green)' }}>{entry.g}G</span> ·{' '}
              <span style={{ color: 'var(--c-amber)' }}>{entry.j}J</span> ·{' '}
              <span style={{ color: 'var(--c-red)' }}>{entry.a}A</span>
            </div>
          </div>
        </div>
        {entry.notering && (
          <div style={{ fontSize: 12, color: 'var(--c-text2)', fontStyle: 'italic' }}>
            Anmärkning: {entry.notering}
          </div>
        )}
      </div>

      {punkter.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          {punkter.map((p, i) => {
            const s = statuses[i] || ''
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--c-border)' }}>
                <span style={{ fontSize: 11, color: 'var(--c-text3)', minWidth: 22 }}>{i + 1}.</span>
                <span style={{ flex: 1, fontSize: 12 }}>{p}</span>
                {s && (
                  <span style={{ background: statusStyle[s]?.bg, color: statusStyle[s]?.color, borderRadius: 4, padding: '1px 8px', fontSize: 11, fontWeight: 600 }}>{s}</span>
                )}
                {noteringar[i] && (
                  <span style={{ fontSize: 11, color: 'var(--c-text2)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {noteringar[i]}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {entry.signatur && (
        <div className="card">
          <div style={{ fontSize: 12, color: 'var(--c-text2)', marginBottom: 8 }}>Signatur tekniker</div>
          <img src={entry.signatur} alt="Signatur" style={{ maxWidth: 280, border: '1px solid var(--c-border)', borderRadius: 6 }} />
        </div>
      )}
    </div>
  )
}

export default function Protokoll({ objekt = [], tekniker = [], onUppdateraObjekt, onLaggTillBokning, onLoggAktivitet }) {
  const [valdObjekt, setValdObjekt]     = useState(null)
  const [flik, setFlik]                 = useState('nytt')  // nytt | historik
  const [gammaltEntry, setGammaltEntry] = useState(null)

  // Form-state
  const [portTyp, setPortTyp]         = useState('')
  const [statuses, setStatuses]       = useState({})
  const [noteringar, setNoteringar]   = useState({})
  const [teknikerNamn, setTeknikerNamn] = useState(tekniker[0] || '')
  const [visaSignatur, setVisaSignatur] = useState(false)
  const [signaturbild, setSignaturbild] = useState('')
  const [skickat, setSkickat]         = useState(false)
  const [sparar, setSparar]           = useState(false)
  const [visaBokaModal, setVisaBokaModal] = useState(false)
  const [bokaDatum, setBokaDatum]     = useState('')
  const [bokaTid, setBokaTid]         = useState('08:00')
  const [bokaTekniker, setBokaTekniker] = useState('')
  const [bokaKlar, setBokaKlar]       = useState(false)
  const [bokar, setBokar]             = useState(false)

  const valjObjekt = (o) => {
    setValdObjekt(o)
    setPortTyp(o.typ || 'Vikport')
    setStatuses({})
    setNoteringar({})
    setSkickat(false)
    setGammaltEntry(null)
    setFlik('nytt')
    setSignaturbild('')
    setVisaSignatur(false)
  }

  // Objektlista
  const [sokProtokoll, setSokProtokoll] = useState('')
  if (!valdObjekt) {
    const aktivaObjekt = objekt.filter(o => !o.arkiverad)
    const filtrerade = aktivaObjekt.filter(o => {
      if (!sokProtokoll) return true
      const q = sokProtokoll.toLowerCase()
      return o.namn?.toLowerCase().includes(q) || o.kund?.toLowerCase().includes(q) ||
             o.typ?.toLowerCase().includes(q) || o.plats?.toLowerCase().includes(q)
    })
    return (
      <div>
        <div style={{ marginBottom: 16 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 2 }}>Serviceprotokoll</h1>
          <p style={{ color: 'var(--c-text2)', fontSize: 13 }}>Välj vilket objekt protokollet gäller</p>
        </div>
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text3)', pointerEvents: 'none' }} />
          <input type="text" placeholder="Sök port, kund, typ, fastighet…" value={sokProtokoll} onChange={e => setSokProtokoll(e.target.value)}
            style={{ width: '100%', padding: '7px 10px 7px 32px', fontSize: 13, border: '1px solid var(--c-border)', borderRadius: 8, background: 'var(--c-surface)', color: 'var(--c-text)', boxSizing: 'border-box' }} />
        </div>
        {aktivaObjekt.length === 0 && (
          <div className="card">
            <p style={{ color: 'var(--c-text2)', fontSize: 13 }}>Inga objekt i portregistret. Lägg till objekt först.</p>
          </div>
        )}
        <div className="card">
          {filtrerade.length === 0 && aktivaObjekt.length > 0 && (
            <p style={{ color: 'var(--c-text2)', fontSize: 13 }}>Inga portar matchar sökningen.</p>
          )}
          {filtrerade.map(o => {
            const hist = (o.historik || []).filter(h => h.typ !== 'montering')
            return (
              <div key={o.id} className="row-item" onClick={() => valjObjekt(o)} style={{ cursor: 'pointer' }}>
                <div className="row-main">
                  <div className="row-name">{o.namn}</div>
                  <div className="row-sub">{o.plats ? `${o.plats} · ` : ''}{o.kund} · {o.typ}</div>
                </div>
                {hist.length > 0 && (
                  <span className="badge badge-gray">{hist.length} protokoll</span>
                )}
                <ChevronRight size={16} color="var(--c-text3)" />
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const punkter = protokollPunkter[portTyp] || protokollPunkter['Vikport']
  const historik = (valdObjekt.historik || []).filter(h => h.typ !== 'montering')

  const counts = { G: 0, J: 0, A: 0, tom: 0 }
  punkter.forEach((_, i) => {
    const s = statuses[i]
    if (s === 'G') counts.G++
    else if (s === 'J') counts.J++
    else if (s === 'A') counts.A++
    else counts.tom++
  })
  const done = punkter.length - counts.tom
  const pct  = Math.round((done / punkter.length) * 100)

  const setStatus   = (i, s) => setStatuses(p => ({ ...p, [i]: p[i] === s ? '' : s }))
  const setNotering = (i, v) => setNoteringar(p => ({ ...p, [i]: v }))

  const godkannAlla = () => {
    const alla = {}
    punkter.forEach((_, i) => { alla[i] = 'G' })
    setStatuses(alla)
  }

  const skickaIn = async () => {
    setSparar(true)
    const idag = new Date().toISOString().slice(0, 10)
    const nyttInslag = {
      datum:      idag,
      tekniker:   teknikerNamn || 'Okänd',
      portTyp,
      g:          counts.G,
      j:          counts.J,
      a:          counts.A,
      notering:   Object.values(noteringar).filter(Boolean).join(', ') || '',
      statuses:   { ...statuses },
      noteringar: { ...noteringar },
      signatur:   signaturbild || null,
    }
    const nyHistorik = [...(valdObjekt.historik || []), nyttInslag]
    const nyttStatus = counts.A > 0 ? 'arende' : 'ok'
    const nastaService = new Date()
    nastaService.setMonth(nastaService.getMonth() + 6)

    const nastaDatum = nastaService.toISOString().slice(0, 10)
    await onUppdateraObjekt(valdObjekt.id, {
      historik:        nyHistorik,
      status:          nyttStatus,
      senaste:         idag,
      nasta:           nastaDatum,
      intervallProcent: 0,
    })
    setValdObjekt(prev => ({ ...prev, historik: nyHistorik }))
    onLoggAktivitet?.('protokoll_sparat', 'objekt', valdObjekt.id, valdObjekt.namn,
      `Protokoll sparat: ${valdObjekt.namn} (${counts.G}G/${counts.J}J/${counts.A}A)`)
    setSparar(false)
    setSkickat(true)
    setBokaDatum(nastaDatum)
    setBokaTekniker(teknikerNamn || '')
    setBokaKlar(false)
  }

  const bekraftaBokning = async () => {
    if (!onLaggTillBokning || !bokaDatum) return
    setBokar(true)
    await onLaggTillBokning(bokaDatum, {
      tid: bokaTid, typ: 'service',
      namn: valdObjekt.namn,
      kund: valdObjekt.kund || '',
      tek: bokaTekniker,
      arendeId: null,
    })
    setBokar(false)
    setBokaKlar(true)
  }

  const skrivUtPDF = async () => {
    const idag = new Date().toISOString().slice(0, 10)
    let logoBase64 = ''
    try {
      const res  = await fetch(logo)
      const blob = await res.blob()
      logoBase64 = await new Promise(resolve => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.readAsDataURL(blob)
      })
    } catch { /* visa utan logotyp om fetch misslyckas */ }

    const win = window.open('', '_blank', 'width=860,height=1000')
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>Serviceprotokoll – ${valdObjekt.namn}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 11px; color: #111; padding: 15mm 18mm; }
        h1  { font-size: 18px; margin-bottom: 3px; }
        .sub { color: #666; font-size: 11px; margin-bottom: 14px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 14px; }
        .box { border: 1px solid #ddd; padding: 6px 10px; border-radius: 4px; }
        .lbl { font-size: 9px; color: #888; margin-bottom: 1px; }
        .val { font-size: 12px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 10px; }
        th { background: #f4f4f4; text-align: left; padding: 4px 6px; border: 1px solid #ddd; }
        td { padding: 3px 6px; border: 1px solid #ddd; vertical-align: top; }
        .g  { background: #e1f5ee; }
        .j  { background: #faeeda; }
        .a  { background: #fcebeb; }
        @media print { @page { size: A4; margin: 10mm; } }
      </style></head><body>
      ${logoBase64 ? `<img src="${logoBase64}" style="float:right;height:40px;margin-top:-4px" alt="NMV Portservice" />` : ''}
      <h1>Serviceprotokoll</h1>
      <div class="sub">Utskrivet: ${idag}</div>
      <div class="grid">
        <div class="box"><div class="lbl">Objekt</div><div class="val">${valdObjekt.namn}</div></div>
        <div class="box"><div class="lbl">Kund</div><div class="val">${valdObjekt.kund}</div></div>
        <div class="box"><div class="lbl">Porttyp</div><div class="val">${portTyp}</div></div>
        <div class="box"><div class="lbl">Tekniker</div><div class="val">${teknikerNamn || '–'}</div></div>
        <div class="box"><div class="lbl">Datum</div><div class="val">${idag}</div></div>
        <div class="box"><div class="lbl">Resultat</div><div class="val">${counts.G}G · ${counts.J}J · ${counts.A}A</div></div>
      </div>
      <table>
        <tr><th style="width:28px">#</th><th>Kontrollpunkt</th><th style="width:42px;text-align:center">Status</th><th>Notering / Åtgärd</th></tr>
        ${punkter.map((p, i) => {
          const s = statuses[i] || ''
          return `<tr class="${s.toLowerCase()}"><td>${i + 1}</td><td>${p}</td><td style="text-align:center;font-weight:bold">${s || '–'}</td><td>${noteringar[i] || ''}</td></tr>`
        }).join('')}
      </table>
      ${signaturbild ? `<div style="margin-top:10px"><div style="font-size:10px;color:#888;margin-bottom:4px">Signatur tekniker</div><img src="${signaturbild}" style="max-width:280px;border:1px solid #ccc;border-radius:4px" /></div>` : ''}
    </body></html>`)
    win.document.close()
    setTimeout(() => win.print(), 400)
  }

  if (skickat) {
    const inp = { width: '100%', padding: '7px 10px', fontSize: 13, border: '1px solid var(--c-border2)', borderRadius: 6, background: 'var(--c-bg)', color: 'var(--c-text)', boxSizing: 'border-box' }
    const lbl = { fontSize: 11, color: 'var(--c-text2)', marginBottom: 3, display: 'block' }
    return (
      <div>
        {/* Bekräftelse */}
        <div style={{ background: 'var(--c-teal-bg)', borderRadius: 12, padding: 20, textAlign: 'center', marginBottom: 16 }}>
          <CheckCircle size={32} color="var(--c-teal)" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--c-teal-text)', marginBottom: 4 }}>Protokoll sparat!</div>
          <div style={{ fontSize: 12, color: 'var(--c-teal-text)' }}>
            {valdObjekt.namn} · {counts.G} G · {counts.J} J · {counts.A} A
          </div>
        </div>

        {/* Auto-bokning */}
        {onLaggTillBokning && (
          <div className="card" style={{ marginBottom: 16 }}>
            {bokaKlar ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <CheckCircle size={28} color="var(--c-teal)" style={{ margin: '0 auto 8px', display: 'block' }} />
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-teal-text)' }}>Service inbokad i kalendern!</div>
                <div style={{ fontSize: 12, color: 'var(--c-text2)', marginTop: 4 }}>{bokaDatum} kl. {bokaTid}{bokaTekniker ? ` · ${bokaTekniker}` : ''}</div>
              </div>
            ) : visaBokaModal ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Boka nästa service i kalendern</div>
                  <button className="btn" onClick={() => setVisaBokaModal(false)} style={{ padding: '3px 7px' }}><X size={13} /></button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px', marginBottom: 12 }}>
                  <div>
                    <label style={lbl}>Datum (nästa service)</label>
                    <input type="date" value={bokaDatum} onChange={e => setBokaDatum(e.target.value)} style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Tid</label>
                    <input type="time" value={bokaTid} onChange={e => setBokaTid(e.target.value)} style={inp} />
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={lbl}>Tekniker</label>
                  {tekniker.length > 0
                    ? <select value={bokaTekniker} onChange={e => setBokaTekniker(e.target.value)} style={inp}>
                        <option value="">– Ej tilldelad –</option>
                        {tekniker.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    : <input type="text" value={bokaTekniker} onChange={e => setBokaTekniker(e.target.value)} style={inp} />
                  }
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
                  <div style={{ fontSize: 12, color: 'var(--c-text2)', marginTop: 2 }}>
                    Föreslaget datum: <strong>{bokaDatum}</strong>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-teal" onClick={() => setVisaBokaModal(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <CalendarPlus size={13} /> Ja, boka
                  </button>
                  <button className="btn" onClick={() => setBokaDatum('')} style={{ fontSize: 12 }}>Hoppa över</button>
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => { setValdObjekt(null); setSkickat(false) }}>← Nytt protokoll</button>
          <button className="btn" onClick={skrivUtPDF} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Printer size={14} /> Skriv ut PDF
          </button>
        </div>
      </div>
    )
  }

  // ── Historik-vy ──
  if (gammaltEntry) {
    return <GammaltProtokoll entry={gammaltEntry} portTyp={portTyp} onStäng={() => setGammaltEntry(null)} />
  }

  return (
    <div style={{ maxWidth: 700 }}>
      {/* Huvud */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <button className="btn" onClick={() => setValdObjekt(null)} style={{ marginBottom: 8 }}>← Byt objekt</button>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 2 }}>Serviceprotokoll</h1>
          <p style={{ color: 'var(--c-text2)', fontSize: 13 }}>{valdObjekt.namn} · {valdObjekt.kund}</p>
        </div>
        <img src={logo} alt="NMV Portservice" style={{ height: 48, display: 'block' }} />
      </div>

      {/* Flikar */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--c-border)', marginBottom: 16 }}>
        {[['nytt', 'Nytt protokoll'], ['historik', `Historik (${historik.length})`]].map(([id, lab]) => (
          <button key={id} onClick={() => setFlik(id)} style={{
            padding: '8px 16px', fontSize: 13, fontWeight: flik === id ? 600 : 400,
            background: 'none', border: 'none', cursor: 'pointer',
            borderBottom: `2px solid ${flik === id ? 'var(--c-blue)' : 'transparent'}`,
            color: flik === id ? 'var(--c-text)' : 'var(--c-text2)',
            marginBottom: -2,
          }}>{lab}</button>
        ))}
      </div>

      {/* ── HISTORIK ── */}
      {flik === 'historik' && (
        <div>
          {historik.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '32px', color: 'var(--c-text2)' }}>
              <History size={28} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.3 }} />
              <div>Inga protokoll sparade ännu.</div>
            </div>
          ) : (
            <div className="card">
              {[...historik].reverse().map((h, i) => (
                <div key={i} className="row-item" onClick={() => setGammaltEntry(h)} style={{ cursor: 'pointer' }}>
                  <div className="row-main">
                    <div className="row-name">{h.datum} · {h.tekniker}</div>
                    <div className="row-sub">
                      <span style={{ color: 'var(--c-green-text)' }}>{h.g}G</span> ·{' '}
                      <span style={{ color: 'var(--c-amber-text)' }}>{h.j}J</span> ·{' '}
                      <span style={{ color: 'var(--c-red-text)' }}>{h.a}A</span>
                      {h.notering ? ` · ${h.notering.slice(0, 50)}` : ''}
                    </div>
                  </div>
                  {h.a > 0 && <span className="badge badge-red">Anmärkning</span>}
                  <ChevronRight size={15} color="var(--c-text3)" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── NYTT PROTOKOLL ── */}
      {flik === 'nytt' && (
        <>
          {/* Tekniker + Mall */}
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--c-text2)', marginBottom: 6 }}>Utförande tekniker</div>
                <select value={teknikerNamn} onChange={e => setTeknikerNamn(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: '1px solid var(--c-border2)', borderRadius: 6, background: 'var(--c-bg)' }}>
                  <option value="">– Välj tekniker –</option>
                  {tekniker.map(t => <option key={t} value={t}>{t}</option>)}
                  <option value="Okänd">Annan</option>
                </select>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--c-text2)', marginBottom: 6 }}>Servicemall</div>
                <select value={portTyp} onChange={e => { setPortTyp(e.target.value); setStatuses({}); setNoteringar({}) }}
                  style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: '1px solid var(--c-border2)', borderRadius: 6, background: 'var(--c-bg)' }}>
                  {PORTTYPER.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Statistik */}
          <div className="grid3" style={{ marginBottom: 14 }}>
            <div className="metric-card"><div className="metric-label">Godkänt</div><div className="metric-value" style={{ color: 'var(--c-teal)' }}>{counts.G}</div></div>
            <div className="metric-card"><div className="metric-label">Justerade</div><div className="metric-value" style={{ color: 'var(--c-amber)' }}>{counts.J}</div></div>
            <div className="metric-card"><div className="metric-label">Anmärkningar</div><div className="metric-value" style={{ color: 'var(--c-red)' }}>{counts.A}</div></div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--c-text2)', marginBottom: 4 }}>
              <span>{done} av {punkter.length} punkter</span><span>{pct}%</span>
            </div>
            <div className="progress-bar" style={{ height: 8 }}>
              <div className="progress-fill" style={{ width: `${pct}%`, background: 'var(--c-blue)' }} />
            </div>
          </div>

          {/* Checklista */}
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--c-text2)' }}>
                <span style={{ background: 'var(--c-green-bg)', color: 'var(--c-green-text)', padding: '1px 7px', borderRadius: 10, marginRight: 5 }}>G Godkänt</span>
                <span style={{ background: 'var(--c-amber-bg)', color: 'var(--c-amber-text)', padding: '1px 7px', borderRadius: 10, marginRight: 5 }}>J Justerad</span>
                <span style={{ background: 'var(--c-red-bg)', color: 'var(--c-red-text)', padding: '1px 7px', borderRadius: 10 }}>A Anmärkning</span>
              </div>
              <button className="btn btn-teal" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }} onClick={godkannAlla}>
                <CheckSquare size={13} /> Godkänn alla
              </button>
            </div>

            {punkter.map((p, i) => {
              const s = statuses[i] || ''
              return (
                <div key={i} style={{ borderBottom: '1px solid var(--c-border)', paddingBottom: 8, marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 11, color: 'var(--c-text3)', minWidth: 22 }}>{i + 1}.</span>
                    <span style={{ flex: 1, fontSize: 13 }}>{p}</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {['G', 'J', 'A'].map(v => (
                        <button key={v} onClick={() => setStatus(i, v)} style={{
                          width: 32, height: 28, borderRadius: 6, border: '1px solid',
                          fontSize: 11, fontWeight: 500, cursor: 'pointer',
                          background:   s === v ? statusStyle[v].bg    : 'transparent',
                          color:        s === v ? statusStyle[v].color : 'var(--c-text3)',
                          borderColor:  s === v ? statusStyle[v].color : 'var(--c-border)',
                        }}>{v}</button>
                      ))}
                    </div>
                  </div>
                  {(s === 'J' || s === 'A') && (
                    <input type="text" placeholder="Anteckning / åtgärd…"
                      value={noteringar[i] || ''} onChange={e => setNotering(i, e.target.value)}
                      style={{ marginTop: 6, marginLeft: 32, width: 'calc(100% - 32px)', fontSize: 12 }} />
                  )}
                </div>
              )
            })}
          </div>

          {/* Signatur */}
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="divider" style={{ marginTop: 0 }}>Signatur tekniker (tillval)</div>
            <div className="toggle-row" style={{ borderBottom: visaSignatur ? undefined : 'none' }}>
              <div>
                <div style={{ fontWeight: 500 }}>Rita signatur</div>
                <div style={{ fontSize: 11, color: 'var(--c-text2)' }}>Aktivera för att signera protokollet</div>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" checked={visaSignatur} onChange={e => setVisaSignatur(e.target.checked)} />
                <div className="toggle-track" />
                <div className="toggle-thumb" />
              </label>
            </div>
            {visaSignatur && (
              <div style={{ marginTop: 12 }}>
                <SignaturPad onChange={setSignaturbild} />
              </div>
            )}
          </div>

          {/* Knappar */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-teal" style={{ flex: 1 }} onClick={skickaIn} disabled={sparar}>
              <CheckCircle size={15} /> {sparar ? 'Sparar…' : 'Skicka in protokoll'}
            </button>
            <button className="btn" onClick={skrivUtPDF} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Printer size={14} /> Förhandsgranska PDF
            </button>
          </div>
        </>
      )}
    </div>
  )
}
