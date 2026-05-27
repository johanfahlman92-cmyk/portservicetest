import { useState, useRef } from 'react'
import { Check, ChevronRight, ChevronLeft, Printer, CheckSquare,
         AlertTriangle, Wrench, AlertCircle, Minus, Plus,
         ClipboardList, CheckCircle, Search, Trash2, Archive } from 'lucide-react'
import { protokollPunkter as defaultMallar } from '../data/store.js'
import { hämtaLogoBase64, pdfHeader, pdfMetaGrid, pdfDoc, pdfRiskBedömning, öppnaPrintFönster } from '../utils/pdf.js'
import KundVäljare from '../components/KundVäljare.jsx'
import ServiceorderFoto from '../components/ServiceorderFoto.jsx'

// ── Konstanter ────────────────────────────────────────────────────────────────
const PORTTYPER = ['Vikport', 'Takskjutport', 'Lastbrygga', 'Grind']
const FASTA_FABRIKAT = ['Torverk', 'Lindab', 'Hörmann', 'Beyron Door', 'Nordic Door']

const STATUSES = [
  { kod: 'OK',  label: 'Godkänd',        Icon: Check,         color: '#16a34a', bg: '#f0fdf4', border: '#16a34a' },
  { kod: 'AF',  label: 'Åtgärdad',       Icon: Wrench,        color: '#2563eb', bg: '#eff6ff', border: '#2563eb' },
  { kod: 'NOT', label: 'Att notera',     Icon: AlertCircle,   color: '#d97706', bg: '#fffbeb', border: '#d97706' },
  { kod: 'KA',  label: 'Kräver åtgärd',  Icon: AlertTriangle, color: '#dc2626', bg: '#fef2f2', border: '#dc2626' },
  { kod: 'EJ',  label: 'Ej tillämpbar',  Icon: Minus,         color: '#9ca3af', bg: '#f9fafb', border: '#d1d5db' },
]
const STATUS_MAP = Object.fromEntries(STATUSES.map(s => [s.kod, s]))

const ORDER_STATUS = {
  planerad: { label: 'Planerad', color: 'var(--c-text2)',  bg: 'var(--c-surface)'  },
  pagaende: { label: 'Pågående', color: 'var(--c-blue)',   bg: 'var(--c-blue-bg)'  },
  utford:   { label: 'Utförd',   color: 'var(--c-teal)',   bg: 'var(--c-teal-bg)'  },
  avslutad: { label: 'Avslutad', color: 'var(--c-teal)',   bg: 'var(--c-teal-bg)'  },
}

const SECTION = { fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--c-text3)', marginBottom: 8 }

function genNr() {
  const d = new Date()
  const s = d.toISOString().slice(2, 10).replace(/-/g, '')
  return 'SO-' + s + '-' + Math.floor(Math.random() * 90 + 10)
}

// ── Signaturplatta ─────────────────────────────────────────────────────────────
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
      <button className="btn" style={{ fontSize: 11, marginTop: 6 }} onClick={rensa}>Rensa</button>
    </div>
  )
}

// ── Huvudkomponent ─────────────────────────────────────────────────────────────
export default function Serviceorder({ serviceorder = [], fastigheter = [], objekt = [], tekniker = [], kunder = [], protokollMallar, onLaggTill, onUppdatera, onTaBort, onUppdateraObjekt, onNyKund, onLaggTillObjekt }) {
  const mallar = protokollMallar || defaultMallar

  // vy: lista | form | utfor | sign | klar
  const [vy,          setVy]          = useState('lista')
  const [valdOrder,   setValdOrder]   = useState(null)
  const [portIndex,   setPortIndex]   = useState(0)
  const [protokoll,   setProtokoll]   = useState({})
  const [sparar,      setSparar]      = useState(false)
  const [sokText,     setSokText]     = useState('')
  const [bekraftaId,  setBekraftaId]  = useState(null) // ID att bekräfta permanent borttagning
  const [visaArkiverade, setVisaArkiverade] = useState(false)

  // Form
  const [formFastighet, setFormFastighet] = useState('')
  const [formPortar,    setFormPortar]    = useState([])
  const [formTekniker,  setFormTekniker]  = useState('')
  const [formDatum,     setFormDatum]     = useState(new Date().toISOString().slice(0, 10))
  const [formSok,       setFormSok]       = useState('')
  const [formKund,      setFormKund]      = useState('')
  const [formNotering,  setFormNotering]  = useState('')
  const [formStatus,    setFormStatus]    = useState('planerad')
  // Ny port
  const [visaNyPort,      setVisaNyPort]      = useState(false)
  const [formPorttyp,     setFormPorttyp]     = useState('Vikport')
  const [formPortFabrikat, setFormPortFabrikat] = useState('')
  const [formAnnatFabrikat, setFormAnnatFabrikat] = useState('')
  const [formPortSerienr,  setFormPortSerienr]  = useState('')

  // Signaturer
  const [visaTekSign,  setVisaTekSign]  = useState(false)
  const [visaKundSign, setVisaKundSign] = useState(false)
  const [tekSign,      setTekSign]      = useState('')
  const [kundSign,     setKundSign]     = useState('')

  // ── Formulär ────────────────────────────────────────────────────────────────
  const öppnaForm = (order = null) => {
    if (order) {
      setFormFastighet(order.fastighet_id || '')
      setFormPortar(order.objekt_ids || [])
      setFormTekniker(order.tekniker || '')
      setFormDatum(order.datum || new Date().toISOString().slice(0, 10))
      setFormKund(order.kund || '')
      setFormNotering(order.notering || '')
      setFormStatus(order.status || 'planerad')
      setValdOrder(order)
    } else {
      setFormFastighet('')
      setFormPortar([])
      setFormTekniker(tekniker[0] || '')
      setFormDatum(new Date().toISOString().slice(0, 10))
      setFormKund('')
      setFormNotering('')
      setFormStatus('planerad')
      setValdOrder(null)
    }
    setFormSok('')
    setVisaNyPort(false)
    setFormPorttyp('Vikport')
    setFormPortFabrikat('')
    setFormAnnatFabrikat('')
    setFormPortSerienr('')
    setVy('form')
  }

  const sparaForm = async () => {
    setSparar(true)
    let objektIds = [...formPortar]

    // Skapa ny port om begärt
    if (visaNyPort && formPorttyp && formKund.trim() && onLaggTillObjekt) {
      const effFab = formPortFabrikat === 'Annat' ? formAnnatFabrikat : formPortFabrikat
      const fastighet = fastigheter.find(f => f.id === formFastighet)
      const nyPort = await onLaggTillObjekt({
        typ: formPorttyp,
        namn: `${formPorttyp}${fastighet?.namn ? ' – ' + fastighet.namn : ''}`,
        kund: formKund.trim(),
        fabrikat: effFab.trim(),
        adress: fastighet?.adress || fastighet?.namn || '',
        serienummer: formPortSerienr.trim(),
        status: 'ny', protokoll: formPorttyp,
        punkter: 0, historik: [], ar: new Date().getFullYear(), serviceIntervall: 12,
      })
      if (nyPort?.id) objektIds = [...objektIds, nyPort.id]
    }

    if (!objektIds.length) { setSparar(false); return }

    const fastighet = fastigheter.find(f => f.id === formFastighet)
    const payload = {
      fastighet_id:   formFastighet || null,
      fastighet_namn: fastighet?.namn || '',
      kund:           formKund || fastighet?.kund || '',
      datum:          formDatum,
      tekniker:       formTekniker,
      objekt_ids:     objektIds,
      status:         formStatus,
      protokoll:      valdOrder?.protokoll || {},
      signatur_tekniker: null,
      signatur_kund:     null,
    }
    if (formNotering.trim()) payload.notering = formNotering.trim()
    if (valdOrder) {
      await onUppdatera(valdOrder.id, payload)
    } else {
      payload.nr = genNr()
      await onLaggTill(payload)
    }
    setSparar(false)
    setVy('lista')
  }

  // ── Starta utförande ─────────────────────────────────────────────────────────
  const startaUtfor = (order) => {
    setValdOrder(order)
    setPortIndex(0)
    const init = {}
    for (const id of (order.objekt_ids || [])) {
      init[id] = order.protokoll?.[id] || { statuses: {}, noteringar: {} }
    }
    setProtokoll(init)
    setVisaTekSign(false)
    setVisaKundSign(false)
    setTekSign('')
    setKundSign('')
    // Markera som pågående om planerad
    if (order.status === 'planerad') onUppdatera(order.id, { status: 'pagaende' })
    setVy('utfor')
  }

  // ── Checklista-helpers ───────────────────────────────────────────────────────
  const setStatus = (objId, pIdx, kod) => {
    setProtokoll(prev => ({
      ...prev,
      [objId]: {
        ...prev[objId],
        statuses: {
          ...(prev[objId]?.statuses || {}),
          [pIdx]: prev[objId]?.statuses?.[pIdx] === kod ? '' : kod,
        },
      },
    }))
  }

  const setNotering = (objId, pIdx, val) => {
    setProtokoll(prev => ({
      ...prev,
      [objId]: {
        ...prev[objId],
        noteringar: { ...(prev[objId]?.noteringar || {}), [pIdx]: val },
      },
    }))
  }

  const godkannAlla = (objId, punkter) => {
    const alla = {}
    punkter.forEach((p, i) => { if (!p.startsWith('## ')) alla[i] = 'OK' })
    setProtokoll(prev => ({ ...prev, [objId]: { ...(prev[objId] || {}), statuses: alla } }))
  }

  // ── Slutför ──────────────────────────────────────────────────────────────────
  const slutfor = async () => {
    setSparar(true)
    const idag = new Date().toISOString().slice(0, 10)

    for (const objId of (valdOrder.objekt_ids || [])) {
      const port = objekt.find(o => o.id === objId)
      if (!port) continue
      // Beräkna nästa service baserat på portens konfigurerade intervall
      const intervallMån = port.serviceIntervall || 12
      const nd = new Date(valdOrder.datum || idag)
      nd.setMonth(nd.getMonth() + intervallMån)
      const nastaDatum = `${nd.getFullYear()}-${String(nd.getMonth()+1).padStart(2,'0')}-${String(nd.getDate()).padStart(2,'0')}`
      const prot    = protokoll[objId] || {}
      const punkter = mallar[port.typ] || []
      const counts  = { ok: 0, af: 0, not: 0, ka: 0, ej: 0 }
      punkter.forEach((p, i) => {
        if (p.startsWith('## ')) return
        const k = prot.statuses?.[i]
        if (k === 'OK') counts.ok++
        else if (k === 'AF') counts.af++
        else if (k === 'NOT') counts.not++
        else if (k === 'KA') counts.ka++
        else if (k === 'EJ') counts.ej++
      })
      const inslag = {
        datum: valdOrder.datum || idag,
        tekniker: valdOrder.tekniker || '',
        portTyp: port.typ || '',
        statuses: prot.statuses || {},
        noteringar: prot.noteringar || {},
        ok: counts.ok, af: counts.af, not: counts.not, ka: counts.ka, ej: counts.ej,
        g: counts.ok, j: counts.not, a: counts.ka,
        serviceorderId: valdOrder.id,
        serviceorderNr: valdOrder.nr,
        notering: '',
      }
      const nyHistorik = [...(port.historik || []), inslag]
      await onUppdateraObjekt(objId, {
        historik: nyHistorik,
        senaste: idag,
        nasta: nastaDatum,
        status: counts.ka > 0 ? 'arende' : 'ok',
        intervallProcent: 0,
      })
    }

    await onUppdatera(valdOrder.id, {
      status: 'utford',
      protokoll,
      signatur_tekniker: tekSign || null,
      signatur_kund:     kundSign || null,
    })
    setValdOrder(prev => ({
      ...prev, status: 'utford', protokoll,
      signatur_tekniker: tekSign || null,
      signatur_kund: kundSign || null,
    }))
    setSparar(false)
    setVy('klar')
  }

  // ── Skriv ut ─────────────────────────────────────────────────────────────────
  const skrivUt = async (order) => {
    const logoBase64 = await hämtaLogoBase64()

    const PDF_STATUS_LABEL = { OK: 'Godkänd', AF: 'Åtgärdad', NOT: 'Att notera', KA: 'Kräver åtgärd', EJ: 'Ej tillämpbar' }
    const PDF_STATUS_CLS   = { OK: 's-ok',    AF: 's-af',     NOT: 's-not',      KA: 's-ka',           EJ: 's-ej'          }

    const portSektioner = (order.objekt_ids || []).map(objId => {
      const port    = objekt.find(o => o.id === objId)
      if (!port) return ''
      const prot    = order.protokoll?.[objId] || {}
      const punkter = mallar[port.typ] || []
      let numCount  = 0
      const rader   = punkter.map((p, i) => {
        if (p.startsWith('## ')) {
          return `<tr class="tbl-group"><td colspan="3">${p.slice(3)}</td></tr>`
        }
        numCount++
        const kod   = prot.statuses?.[i] || ''
        const label = PDF_STATUS_LABEL[kod] || '–'
        const cls   = PDF_STATUS_CLS[kod]   || ''
        const not   = prot.noteringar?.[i]  || ''
        return `<tr>
          <td><span style="color:#bbb;margin-right:6px;font-size:10px">${numCount}.</span>${p}</td>
          <td class="${cls}" style="white-space:nowrap">${label}</td>
          <td style="color:#666">${not}</td>
        </tr>`
      }).join('')
      return `<div class="port-sektion">
        <div class="slbl">${port.namn}${port.typ ? `<span style="font-weight:400;color:#aaa;margin-left:8px;text-transform:none;font-size:11px;letter-spacing:0">— ${port.typ}</span>` : ''}</div>
        <table>
          <thead><tr>
            <th style="width:58%">Kontrollpunkt</th>
            <th style="width:20%">Status</th>
            <th style="width:22%">Notering</th>
          </tr></thead>
          <tbody>${rader}</tbody>
        </table>
      </div>`
    }).join('')

    const sigHtml = order.signatur_tekniker || order.signatur_kund ? `
      <div class="slbl">Signaturer</div>
      <div class="sig-section">
        ${order.signatur_tekniker ? `<div class="sig-box">
          <div class="sig-label">Tekniker: ${order.tekniker || ''}</div>
          <img src="${order.signatur_tekniker}"/>
          <div class="sig-date">${order.datum || ''}</div>
        </div>` : ''}
        ${order.signatur_kund ? `<div class="sig-box">
          <div class="sig-label">Kund</div>
          <img src="${order.signatur_kund}"/>
          <div class="sig-date">${order.datum || ''}</div>
        </div>` : ''}
      </div>` : ''

    const body = `
      ${pdfHeader(logoBase64, 'Serviceorder', order.nr, order.datum || '')}

      <div class="slbl">Grundinformation</div>
      ${pdfMetaGrid([
        { lbl: 'Fastighet',    val: order.fastighet_namn                 },
        { lbl: 'Kund',         val: order.kund                           },
        { lbl: 'Datum',        val: order.datum                          },
        { lbl: 'Tekniker',     val: order.tekniker                       },
        { lbl: 'Antal portar', val: (order.objekt_ids || []).length      },
        { lbl: 'Status',       val: 'Utförd'                             },
      ])}

      ${portSektioner}
      ${sigHtml}
    `

    const win = window.open('', '_blank', 'width=860,height=1100')
    win.document.write(pdfDoc(`Serviceorder ${order.nr}`, body))
    win.document.close()
    setTimeout(() => win.print(), 400)
  }

  // ── VY: Formulär ─────────────────────────────────────────────────────────────
  if (vy === 'form') {
    const inp = { width: '100%', padding: '9px 11px', fontSize: 14, border: '1px solid var(--c-border)', borderRadius: 8, background: 'var(--c-bg)', color: 'var(--c-text)', boxSizing: 'border-box' }
    const lbl = { fontSize: 12, fontWeight: 500, color: 'var(--c-blue-text)', display: 'block', marginBottom: 4, marginTop: 12 }
    const secHdr = { fontWeight: 600, fontSize: 14, marginBottom: 14, paddingBottom: 10, borderBottom: '2px solid var(--c-border)' }
    const effPortFab = formPortFabrikat === 'Annat' ? formAnnatFabrikat : formPortFabrikat

    const valdFastighet = fastigheter.find(f => f.id === formFastighet)
    const portarFörFilter = objekt.filter(o => !o.arkiverad && (
      formFastighet
        ? (o.fastighetId === formFastighet || (!o.fastighetId && o.plats === valdFastighet?.namn))
        : !formKund || o.kund === formKund
    ))
    const filtrerade = portarFörFilter.filter(o => {
      if (!formSok) return true
      const q = formSok.toLowerCase()
      return o.namn?.toLowerCase().includes(q) || o.kund?.toLowerCase().includes(q) || o.typ?.toLowerCase().includes(q)
    })
    const alleMarkerade = filtrerade.length > 0 && filtrerade.every(o => formPortar.includes(o.id))
    const togglePort = (id) => setFormPortar(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    const toggleAlla = () => {
      if (alleMarkerade) setFormPortar(prev => prev.filter(id => !filtrerade.some(o => o.id === id)))
      else setFormPortar(prev => [...new Set([...prev, ...filtrerade.map(o => o.id)])])
    }

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button className="btn" onClick={() => setVy('lista')}>← Tillbaka</button>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
            {valdOrder ? 'Redigera serviceorder' : 'Ny serviceorder'}
          </h1>
        </div>
        <div style={{ maxWidth: 700 }}>

          {/* ── Plats & kund ── */}
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={secHdr}>Plats & kund</div>
            <label style={{ ...lbl, marginTop: 0 }}>Kund</label>
            <KundVäljare
              kunder={kunder}
              value={formKund}
              onChange={v => { setFormKund(v); setFormFastighet('') }}
              onNyKund={onNyKund}
              style={inp}
              placeholder="– Välj kund –"
            />
            {formKund && (
              <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 12, color: 'var(--c-teal-text)', background: 'var(--c-teal-bg)',
                border: '1px solid var(--c-teal)', borderRadius: 6, padding: '5px 10px' }}>
                <Check size={13} /> Vald kund: <strong>{formKund}</strong>
              </div>
            )}
            {/* Kundens fastigheter */}
            {(() => {
              const kundensFastigheter = fastigheter.filter(f => !f.arkiverad && f.kund === formKund)
              if (!formKund || kundensFastigheter.length === 0) return null
              return (
                <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--c-bg)', borderRadius: 8, border: '1px solid var(--c-border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--c-blue)', fontWeight: 600, marginBottom: 6 }}>
                    📍 {formKund} har {kundensFastigheter.length} registrerad{kundensFastigheter.length > 1 ? 'e fastigheter' : ' fastighet'}
                  </div>
                  <label style={{ fontSize: 11, color: 'var(--c-text2)', display: 'block', marginBottom: 3 }}>
                    Filtrera portar per fastighet <span style={{ color: 'var(--c-text3)' }}>(valfritt)</span>
                  </label>
                  <select value={formFastighet} onChange={e => setFormFastighet(e.target.value)} style={inp}>
                    <option value="">– Alla kundens portar –</option>
                    {kundensFastigheter.map(f => (
                      <option key={f.id} value={f.id}>{f.namn}{f.adress ? ` – ${f.adress}` : ''}</option>
                    ))}
                  </select>
                </div>
              )
            })()}
          </div>

          {/* ── Välj portar ── */}
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', ...secHdr }}>
              <span>
                Välj portar
                {formPortar.length > 0 && (
                  <span style={{ marginLeft: 8, fontSize: 13, color: 'var(--c-teal)', fontWeight: 700 }}>
                    ({formPortar.length} {formPortar.length === 1 ? 'vald' : 'valda'})
                  </span>
                )}
              </span>
              {filtrerade.length > 0 && (
                <button className="btn" style={{ fontSize: 12, padding: '5px 12px' }} onClick={toggleAlla}>
                  {alleMarkerade ? 'Avmarkera alla' : 'Markera alla'}
                </button>
              )}
            </div>
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text3)', pointerEvents: 'none' }} />
              <input type="text" placeholder="Sök port, kund eller typ…" value={formSok} onChange={e => setFormSok(e.target.value)}
                style={{ ...inp, paddingLeft: 32 }} />
            </div>
            {filtrerade.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--c-text3)', padding: '14px 0', textAlign: 'center' }}>
                {formKund ? `Inga portar kopplade till ${formKund}.` : 'Välj en kund ovan eller sök bland alla portar.'}
              </div>
            ) : (
              filtrerade.map(o => {
                const vald = formPortar.includes(o.id)
                return (
                  <div key={o.id} onClick={() => togglePort(o.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 8px', marginLeft: -8, marginRight: -8,
                    borderRadius: 9, cursor: 'pointer',
                    background: vald ? 'var(--c-teal-bg)' : 'transparent',
                    borderBottom: '1px solid var(--c-border)',
                    transition: 'background 0.12s',
                  }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                      border: `2px solid ${vald ? 'var(--c-teal)' : 'var(--c-border)'}`,
                      background: vald ? 'var(--c-teal)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.12s',
                    }}>
                      {vald && <Check size={12} color="#fff" strokeWidth={3} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{o.namn}</div>
                      <div style={{ fontSize: 12, color: 'var(--c-text2)', marginTop: 1 }}>
                        {o.typ}{o.kund ? ' · ' + o.kund : ''}{o.plats ? ' · ' + o.plats : ''}
                      </div>
                    </div>
                    {o.senaste && (
                      <span style={{ fontSize: 11, color: 'var(--c-text3)', flexShrink: 0 }}>Senast {o.senaste}</span>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* ── Lägg till ny port ── */}
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', ...secHdr }}>
              <span>Lägg till ny port</span>
              <button className="btn" style={{ fontSize: 12, padding: '4px 12px' }} onClick={() => setVisaNyPort(v => !v)}>
                {visaNyPort ? '↑ Dölj' : <><Plus size={12} style={{ display: 'inline', marginRight: 4 }} />Ny port</>}
              </button>
            </div>
            {visaNyPort && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                  <div>
                    <label style={{ ...lbl, marginTop: 0 }}>Porttyp *</label>
                    <select value={formPorttyp} onChange={e => setFormPorttyp(e.target.value)} style={inp}>
                      {PORTTYPER.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ ...lbl, marginTop: 0 }}>Fabrikat</label>
                    <select value={formPortFabrikat} onChange={e => setFormPortFabrikat(e.target.value)} style={inp}>
                      <option value="">– Välj fabrikat –</option>
                      {FASTA_FABRIKAT.map(f => <option key={f} value={f}>{f}</option>)}
                      <option value="Annat">Annat / okänt</option>
                    </select>
                    {formPortFabrikat === 'Annat' && (
                      <input type="text" value={formAnnatFabrikat} onChange={e => setFormAnnatFabrikat(e.target.value)}
                        placeholder="Ange fabrikat…" style={{ ...inp, marginTop: 6 }} />
                    )}
                  </div>
                </div>
                <label style={lbl}>Serienummer</label>
                <input type="text" value={formPortSerienr} onChange={e => setFormPortSerienr(e.target.value)}
                  placeholder="Valfritt" style={inp} />
                <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--c-blue-bg)', borderRadius: 7, fontSize: 12, color: 'var(--c-blue)' }}>
                  ℹ️ Porten skapas automatiskt i registret när serviceordern sparas.
                </div>
              </div>
            )}
          </div>

          {/* ── Planering ── */}
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={secHdr}>Planering</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <div>
                <label style={{ ...lbl, marginTop: 0 }}>Datum *</label>
                <input type="date" value={formDatum} onChange={e => setFormDatum(e.target.value)} style={inp} />
              </div>
              <div>
                <label style={{ ...lbl, marginTop: 0 }}>Ansvarig tekniker</label>
                <select value={formTekniker} onChange={e => setFormTekniker(e.target.value)} style={inp}>
                  <option value="">– Ej tilldelad –</option>
                  {tekniker.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Status</label>
                <select value={formStatus} onChange={e => setFormStatus(e.target.value)} style={inp}>
                  <option value="planerad">Planerad</option>
                  <option value="pagaende">Pågående</option>
                  <option value="utford">Utförd</option>
                </select>
              </div>
            </div>
          </div>

          {/* ── Notering ── */}
          <div className="card" style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--c-blue-text)', display: 'block', marginBottom: 4 }}>Notering</label>
            <textarea value={formNotering} onChange={e => setFormNotering(e.target.value)}
              placeholder="Fritext, instruktioner, vad som ska göras…" rows={3}
              style={{ ...inp, resize: 'vertical' }} />
          </div>

          <button className="btn btn-teal" style={{ width: '100%', padding: 14, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            onClick={sparaForm} disabled={sparar || (formPortar.length === 0 && !visaNyPort)}>
            <CheckCircle size={16} />
            {sparar ? 'Sparar…' : valdOrder
              ? 'Spara ändringar'
              : `Skapa serviceorder${formPortar.length > 0 ? ` (${formPortar.length} port${formPortar.length !== 1 ? 'ar' : ''})` : visaNyPort ? ' (1 ny port)' : ''}`}
          </button>
        </div>
      </div>
    )
  }

  // ── VY: Utföra (wizard) ───────────────────────────────────────────────────────
  if (vy === 'utfor' && valdOrder) {
    const portIds = valdOrder.objekt_ids || []
    const port    = objekt.find(o => o.id === portIds[portIndex])
    const punkter = port ? (mallar[port.typ] || []) : []
    const prot    = protokoll[portIds[portIndex]] || { statuses: {}, noteringar: {} }
    const ärSista = portIndex === portIds.length - 1

    const counts = { OK: 0, AF: 0, NOT: 0, KA: 0, EJ: 0, tom: 0 }
    punkter.forEach((p, i) => {
      if (p.startsWith('## ')) return
      const s = prot.statuses?.[i]
      if (STATUS_MAP[s]) counts[s]++
      else counts.tom++
    })
    const totalPunkter = punkter.filter(p => !p.startsWith('## ')).length
    const done = totalPunkter - counts.tom
    const pct  = totalPunkter > 0 ? Math.round((done / totalPunkter) * 100) : 100

    return (
      <div>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <button className="btn" onClick={() => setVy('lista')}>← Avbryt</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{valdOrder.nr} · {valdOrder.fastighet_namn || valdOrder.kund}</div>
            <div style={{ fontSize: 11, color: 'var(--c-text2)' }}>{valdOrder.datum} · {valdOrder.tekniker}</div>
          </div>
        </div>

        {/* Port-flikar */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 14, flexWrap: 'wrap' }}>
          {portIds.map((id, i) => {
            const p      = objekt.find(o => o.id === id)
            const pData  = protokoll[id] || {}
            const allOk  = (mallar[p?.typ] || []).filter(x => !x.startsWith('## ')).every((_, pi) => !!pData.statuses?.[pi])
            const aktiv  = i === portIndex
            return (
              <button key={id} onClick={() => setPortIndex(i)} style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: aktiv ? 700 : 400,
                border: `1.5px solid ${aktiv ? 'var(--c-blue)' : allOk ? 'var(--c-teal)' : 'var(--c-border)'}`,
                background: aktiv ? 'var(--c-blue-bg)' : allOk ? 'var(--c-teal-bg)' : 'transparent',
                color: aktiv ? 'var(--c-blue)' : allOk ? 'var(--c-teal)' : 'var(--c-text2)',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                {p?.namn || id}
                {allOk && !aktiv && <Check size={10} />}
              </button>
            )
          })}
        </div>

        {port ? (
          <div style={{ maxWidth: 700 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700 }}>{port.namn}</div>
                <div style={{ fontSize: 12, color: 'var(--c-text2)' }}>{port.typ}{port.plats ? ' · ' + port.plats : ''}</div>
              </div>
              <span style={{ fontSize: 12, color: 'var(--c-text3)' }}>Port {portIndex + 1} / {portIds.length}</span>
            </div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
              {STATUSES.filter(s => counts[s.kod] > 0).map(s => (
                <span key={s.kod} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '2px 8px', borderRadius: 20, background: s.bg, color: s.color, fontWeight: 600 }}>
                  <s.Icon size={11} /> {counts[s.kod]} {s.label}
                </span>
              ))}
              <span style={{ fontSize: 11, color: 'var(--c-text3)', marginLeft: 'auto' }}>{done}/{totalPunkter} ({pct}%)</span>
            </div>
            <div className="progress-bar" style={{ height: 5, marginBottom: 14 }}>
              <div className="progress-fill" style={{ width: `${pct}%`, background: counts.KA > 0 ? 'var(--c-red)' : 'var(--c-teal)' }} />
            </div>

            <div className="card" style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                <button className="btn btn-teal" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}
                  onClick={() => godkannAlla(portIds[portIndex], punkter)}>
                  <CheckSquare size={12} /> Godkänn alla
                </button>
              </div>
              {(() => {
                let numCount = 0
                return punkter.map((p, i) => {
                  if (p.startsWith('## ')) {
                    return (
                      <div key={i} style={{ margin: '12px 0 6px', padding: '5px 10px', background: 'var(--c-bg)', borderRadius: 6, borderLeft: '3px solid var(--c-blue)' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-blue)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{p.slice(3)}</span>
                      </div>
                    )
                  }
                  numCount++
                  const s = prot.statuses?.[i] || ''
                  const visaNotis = s === 'AF' || s === 'NOT' || s === 'KA'
                  return (
                    <div key={i} style={{ borderBottom: '1px solid var(--c-border)', paddingBottom: 8, marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 10, color: 'var(--c-text3)', minWidth: 20, flexShrink: 0 }}>{numCount}.</span>
                        <span style={{ flex: 1, fontSize: 13 }}>{p}</span>
                        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                          {STATUSES.map(({ kod, Icon, color, bg, border, label }) => (
                            <button key={kod} onClick={() => setStatus(portIds[portIndex], i, kod)} title={label} style={{
                              width: 30, height: 28, borderRadius: 6,
                              border: `1px solid ${s === kod ? border : 'var(--c-border)'}`,
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
                          value={prot.noteringar?.[i] || ''}
                          onChange={e => setNotering(portIds[portIndex], i, e.target.value)}
                          style={{ marginTop: 6, marginLeft: 28, width: 'calc(100% - 28px)', fontSize: 12, padding: '5px 8px', border: '1px solid var(--c-border)', borderRadius: 6, background: 'var(--c-bg)', color: 'var(--c-text)', outline: 'none' }} />
                      )}
                    </div>
                  )
                })
              })()}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              {portIndex > 0 && (
                <button className="btn" onClick={() => setPortIndex(i => i - 1)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ChevronLeft size={14} /> Föregående
                </button>
              )}
              {!ärSista ? (
                <button className="btn btn-teal" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  onClick={() => setPortIndex(i => i + 1)}>
                  Nästa port <ChevronRight size={14} />
                </button>
              ) : (
                <button className="btn btn-teal" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  onClick={() => setVy('sign')}>
                  Slutför & signera <CheckCircle size={14} />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="card"><p style={{ color: 'var(--c-text3)', fontSize: 13 }}>Porten hittades inte.</p></div>
        )}
      </div>
    )
  }

  // ── VY: Signatur ──────────────────────────────────────────────────────────────
  if (vy === 'sign' && valdOrder) {
    let totalKA = 0, totalNOT = 0, totalOK = 0
    for (const id of (valdOrder.objekt_ids || [])) {
      const port    = objekt.find(o => o.id === id)
      const prot    = protokoll[id] || {}
      const punkter = mallar[port?.typ] || []
      punkter.forEach((p, i) => {
        if (p.startsWith('## ')) return
        const k = prot.statuses?.[i]
        if (k === 'KA') totalKA++
        else if (k === 'NOT') totalNOT++
        else if (k === 'OK' || k === 'AF' || k === 'EJ') totalOK++
      })
    }

    return (
      <div style={{ maxWidth: 600 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button className="btn" onClick={() => setVy('utfor')}>← Tillbaka</button>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Slutför serviceorder</h1>
        </div>

        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
            {valdOrder.nr} · {valdOrder.fastighet_namn || valdOrder.kund}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: '#f0fdf4', color: '#16a34a', fontWeight: 600 }}>
              {totalOK} Godkänd / Åtgärdad / Ej tillämpbar
            </span>
            {totalNOT > 0 && <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: '#fffbeb', color: '#d97706', fontWeight: 600 }}>{totalNOT} Att notera</span>}
            {totalKA > 0  && <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: '#fef2f2', color: '#dc2626', fontWeight: 600 }}>{totalKA} Kräver åtgärd</span>}
          </div>
        </div>

        {/* Foton */}
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            📷 Foton
          </div>
          <ServiceorderFoto orderId={valdOrder.id} skapadAv={valdOrder.tekniker || ''} />
        </div>

        <div className="card" style={{ marginBottom: 12 }}>
          <div className="toggle-row" style={{ borderBottom: visaTekSign ? '1px solid var(--c-border)' : 'none', paddingBottom: visaTekSign ? 12 : 0, marginBottom: visaTekSign ? 12 : 0 }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: 13 }}>Signatur tekniker</div>
              <div style={{ fontSize: 11, color: 'var(--c-text2)' }}>Tillval</div>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={visaTekSign} onChange={e => setVisaTekSign(e.target.checked)} />
              <div className="toggle-track" /><div className="toggle-thumb" />
            </label>
          </div>
          {visaTekSign && <SignaturPad onChange={setTekSign} />}
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="toggle-row" style={{ borderBottom: visaKundSign ? '1px solid var(--c-border)' : 'none', paddingBottom: visaKundSign ? 12 : 0, marginBottom: visaKundSign ? 12 : 0 }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: 13 }}>Signatur kund</div>
              <div style={{ fontSize: 11, color: 'var(--c-text2)' }}>Tillval – kunden bekräftar utfört arbete</div>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={visaKundSign} onChange={e => setVisaKundSign(e.target.checked)} />
              <div className="toggle-track" /><div className="toggle-thumb" />
            </label>
          </div>
          {visaKundSign && <SignaturPad onChange={setKundSign} />}
        </div>

        <button className="btn btn-teal" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          onClick={slutfor} disabled={sparar}>
          <CheckCircle size={14} /> {sparar ? 'Sparar…' : 'Slutför serviceorder'}
        </button>
      </div>
    )
  }

  // ── VY: Klar ──────────────────────────────────────────────────────────────────
  if (vy === 'klar' && valdOrder) {
    return (
      <div style={{ maxWidth: 500 }}>
        <div style={{ background: 'var(--c-teal-bg)', borderRadius: 12, padding: 24, textAlign: 'center', marginBottom: 20 }}>
          <CheckCircle size={36} color="var(--c-teal)" style={{ marginBottom: 10 }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--c-teal-text)', marginBottom: 4 }}>Serviceorder utförd!</div>
          <div style={{ fontSize: 13, color: 'var(--c-teal-text)' }}>
            {valdOrder.nr} · {valdOrder.objekt_ids?.length} port{valdOrder.objekt_ids?.length !== 1 ? 'ar' : ''} servade
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-teal" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              onClick={() => skrivUt({ ...valdOrder, protokoll, signatur_tekniker: tekSign || null, signatur_kund: kundSign || null })}>
              <Printer size={14} /> Skriv ut protokoll
            </button>
            <button className="btn" onClick={() => setVy('lista')}>← Tillbaka</button>
          </div>
          {protokoll?.riskKontroll && Object.keys(protokoll.riskKontroll).length > 0 && (
            <button className="btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              onClick={async () => {
                const logo64 = await hämtaLogoBase64()
                const port = objekt.find(o => (valdOrder.objekt_ids || [])[0] === o.id)
                öppnaPrintFönster(pdfRiskBedömning({
                  kund: valdOrder.kund,
                  portNamn: port?.namn || '',
                  portTyp: port?.typ || '',
                  tekniker: protokoll.tekniker || valdOrder.tekniker || '',
                  datum: protokoll.datum || valdOrder.datum || '',
                  ordernummer: valdOrder.nr || '',
                  riskKontroll: protokoll.riskKontroll,
                  riskNoteringar: protokoll.riskNoteringar || {},
                  egenRisker: protokoll.egenRisker || [],
                  ansvariga: protokoll.ansvariga || [],
                }, logo64), 'Riskbedömning')
              }}>
              <Printer size={14} /> Skriv ut riskbedömning
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── VY: Lista ─────────────────────────────────────────────────────────────────
  const filtrerade = serviceorder
    .filter(o => {
      if (!sokText) return true
      const q = sokText.toLowerCase()
      return o.nr?.toLowerCase().includes(q) ||
             o.fastighet_namn?.toLowerCase().includes(q) ||
             o.kund?.toLowerCase().includes(q) ||
             o.tekniker?.toLowerCase().includes(q)
    })
    .sort((a, b) => (b.datum || '').localeCompare(a.datum || ''))

  const grupper = {
    pagaende:  filtrerade.filter(o => o.status === 'pagaende'),
    planerad:  filtrerade.filter(o => o.status === 'planerad'),
    utford:    filtrerade.filter(o => o.status === 'utford'),
    arkiverad: filtrerade.filter(o => o.status === 'arkiverad'),
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 2 }}>Serviceordrar</h1>
          <p style={{ color: 'var(--c-text2)', fontSize: 13 }}>Planera och utför servicebesök på fastigheter</p>
        </div>
        <button className="btn btn-teal" onClick={() => öppnaForm()} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} /> Ny serviceorder
        </button>
      </div>

      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text3)', pointerEvents: 'none' }} />
        <input type="text" placeholder="Sök order, fastighet, kund, tekniker…" value={sokText} onChange={e => setSokText(e.target.value)}
          style={{ width: '100%', padding: '7px 10px 7px 32px', fontSize: 13, border: '1px solid var(--c-border)', borderRadius: 8, background: 'var(--c-surface)', color: 'var(--c-text)', boxSizing: 'border-box' }} />
      </div>

      {serviceorder.filter(o => o.status !== 'arkiverad').length === 0 && grupper.arkiverad.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <ClipboardList size={32} color="var(--c-text3)" style={{ margin: '0 auto 12px', display: 'block' }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text2)', marginBottom: 6 }}>Inga serviceorder ännu</div>
          <div style={{ fontSize: 12, color: 'var(--c-text3)', marginBottom: 16 }}>Skapa en order för att planera ett fastighetsbesök</div>
          <button className="btn btn-teal" onClick={() => öppnaForm()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Plus size={13} /> Ny serviceorder
          </button>
        </div>
      )}

      {[
        { key: 'pagaende', label: 'Pågående' },
        { key: 'planerad', label: 'Planerade' },
        { key: 'utford',   label: 'Utförda' },
        ...(visaArkiverade ? [{ key: 'arkiverad', label: 'Arkiverade' }] : []),
      ].map(({ key, label }) => grupper[key].length > 0 && (
        <div key={key} style={{ marginBottom: 20 }}>
          <div style={{ ...SECTION, marginBottom: 8 }}>{label} ({grupper[key].length})</div>
          <div className="card">
            {grupper[key].map((order, i) => {
              const st = ORDER_STATUS[order.status] || ORDER_STATUS.planerad
              return (
                <div key={order.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 6px', marginLeft: -6, marginRight: -6,
                  borderRadius: 8,
                  borderBottom: i < grupper[key].length - 1 ? '1px solid var(--c-border)' : 'none',
                  transition: 'background 0.12s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--c-bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                    onClick={() => (order.status === 'utford' || order.status === 'arkiverad') ? skrivUt(order) : startaUtfor(order)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{order.nr}</span>
                      <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 600, background: st.bg, color: st.color }}>{st.label}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--c-text2)' }}>
                      {order.fastighet_namn || order.kund || '–'} · {order.datum} · {order.tekniker || 'Ingen tekniker'} · {(order.objekt_ids || []).length} port{(order.objekt_ids || []).length !== 1 ? 'ar' : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                    {order.status !== 'utford' && order.status !== 'arkiverad' && (
                      <button className="btn btn-teal" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => startaUtfor(order)}>
                        {order.status === 'pagaende' ? 'Fortsätt' : 'Utför'}
                      </button>
                    )}
                    {(order.status === 'utford' || order.status === 'arkiverad') && (
                      <button className="btn" style={{ fontSize: 11, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => skrivUt(order)}>
                        <Printer size={12} /> Protokoll
                      </button>
                    )}
                    {(order.status === 'utford' || order.status === 'arkiverad') &&
                      order.protokoll?.riskKontroll && Object.keys(order.protokoll.riskKontroll).length > 0 && (
                      <button className="btn" style={{ fontSize: 11, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                        onClick={async () => {
                          const logo64 = await hämtaLogoBase64()
                          const port = objekt.find(o => (order.objekt_ids || [])[0] === o.id)
                          öppnaPrintFönster(pdfRiskBedömning({
                            kund: order.kund,
                            portNamn: port?.namn || '',
                            portTyp: port?.typ || '',
                            tekniker: order.protokoll?.tekniker || order.tekniker || '',
                            datum: order.protokoll?.datum || order.datum || '',
                            ordernummer: order.nr || '',
                            riskKontroll: order.protokoll.riskKontroll,
                            riskNoteringar: order.protokoll.riskNoteringar || {},
                            egenRisker: order.protokoll.egenRisker || [],
                            ansvariga: order.protokoll.ansvariga || [],
                          }, logo64), 'Riskbedömning')
                        }}>
                        <Printer size={12} /> Risk
                      </button>
                    )}
                    {order.status !== 'utford' && order.status !== 'arkiverad' && (
                      <button className="btn" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => öppnaForm(order)}>
                        Redigera
                      </button>
                    )}
                    {order.status === 'utford' && (
                      <button className="btn" style={{ fontSize: 11, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
                        onClick={() => onUppdatera(order.id, { status: 'arkiverad' })}>
                        <Archive size={12} /> Arkivera
                      </button>
                    )}
                    {order.status === 'arkiverad' && (
                      <button className="btn" style={{ fontSize: 11, padding: '4px 8px' }}
                        onClick={() => onUppdatera(order.id, { status: 'utford' })}>
                        Återställ
                      </button>
                    )}
                    <button style={{
                      fontSize: 11, padding: '4px 7px', borderRadius: 6, cursor: 'pointer',
                      background: 'none', border: '1px solid var(--c-border)',
                      color: 'var(--c-red)', display: 'flex', alignItems: 'center',
                    }}
                      title="Ta bort permanent"
                      onClick={e => { e.stopPropagation(); setBekraftaId(order.id) }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Arkiverade - toggle */}
      {grupper.arkiverad.length > 0 && (
        <button className="btn" style={{ width: '100%', fontSize: 12, color: 'var(--c-text3)', marginTop: 4 }}
          onClick={() => setVisaArkiverade(v => !v)}>
          {visaArkiverade ? 'Dölj arkiverade' : `Visa ${grupper.arkiverad.length} arkiverad${grupper.arkiverad.length !== 1 ? 'e' : ''} order`}
        </button>
      )}

      {/* Bekräfta permanent borttagning */}
      {bekraftaId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
          onClick={() => setBekraftaId(null)}>
          <div className="card" style={{ width: 340, padding: 22 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Ta bort serviceorder?</div>
            <div style={{ fontSize: 13, color: 'var(--c-text2)', marginBottom: 20 }}>
              Ordern tas bort permanent och kan inte återställas. Utförda protokoll på respektive port påverkas inte.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{
                flex: 1, padding: '9px 14px', borderRadius: 8, cursor: 'pointer',
                background: 'var(--c-red)', color: '#fff', border: 'none', fontWeight: 600, fontSize: 13,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }} onClick={() => { onTaBort(bekraftaId); setBekraftaId(null) }}>
                <Trash2 size={13} /> Ja, ta bort permanent
              </button>
              <button className="btn" onClick={() => setBekraftaId(null)}>Avbryt</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
