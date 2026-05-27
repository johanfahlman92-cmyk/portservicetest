import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { DoorOpen, Plus, ChevronRight, X, Printer, Trash2, ArrowLeft, Archive, ArchiveRestore, Search, CalendarPlus, CheckCircle, Copy, Paperclip, AlertCircle, Check, Wrench, Minus, Save, ShieldCheck, ShieldAlert, Shield } from 'lucide-react'

// ── Garantihjälpare ──────────────────────────────────────────────────────────
function garantiStatus(installationsdatum, garantiAr) {
  if (!installationsdatum || !garantiAr) return null
  const inst  = new Date(installationsdatum + 'T00:00:00')
  const utgång = new Date(inst)
  utgång.setFullYear(utgång.getFullYear() + parseInt(garantiAr || 2))
  const idag = new Date(); idag.setHours(0,0,0,0)
  const dagar = Math.round((utgång - idag) / 86400000)
  return { utgångsdatum: utgång.toISOString().slice(0,10), dagar, giltig: dagar > 0 }
}

const CE_CFG = {
  godkand:        { label: 'CE-godkänd',      color: 'var(--c-teal)',  bg: 'var(--c-teal-bg)',  Icon: ShieldCheck },
  avvikelse:      { label: 'CE-avvikelse',     color: 'var(--c-red)',   bg: 'var(--c-red-bg)',   Icon: ShieldAlert },
  ej_kontrollerad:{ label: 'Ej CE-kontrollerad',color:'var(--c-text3)', bg: 'var(--c-bg)',       Icon: Shield      },
}
import DokumentZon from '../components/DokumentZon.jsx'
import FilUppladdning from '../components/FilUppladdning.jsx'
import { supabase } from '../lib/supabase.js'
import { statusConfig, protokollTyper, protokollPunkter, RISKPUNKTER as RISKPUNKTER_DEFAULT } from '../data/store.js'
import { hämtaLogoBase64 as hämtaLogo, pdfHeader, pdfMetaGrid, pdfDoc, pdfMontageProt, EGENKONTROLL_DEFAULT } from '../utils/pdf.js'

const filterOpts = [
  { id: 'alla',     label: 'Alla' },
  { id: 'ok',       label: 'OK' },
  { id: 'snart',    label: 'Service snart' },
  { id: 'forsenad', label: 'Försenad' },
  { id: 'arende',   label: 'Öppet ärende' },
]

// ── Statusdefinitioner för serviceprotokoll (G/J/A) ─────────────────────────
const PROT_STATUSES = [
  { kod: 'G', label: 'Godkänd',     color: 'var(--c-teal)',  bg: 'var(--c-teal-bg)',  border: 'var(--c-teal)',  Icon: Check  },
  { kod: 'J', label: 'Notera',      color: 'var(--c-amber)', bg: 'var(--c-amber-bg)', border: 'var(--c-amber)', Icon: Wrench },
  { kod: 'A', label: 'Avvikelse',   color: 'var(--c-red)',   bg: 'var(--c-red-bg)',   border: 'var(--c-red)',   Icon: Minus  },
]
const PROT_STATUS_MAP = Object.fromEntries(PROT_STATUSES.map(s => [s.kod, s]))

// ── Montageprotokoll-detalj (läsonly – visa fullständigt protokoll + skriv ut) ─
function MontageProtokollDetalj({ p: pRaw, onBack, riskpunkter }) {
  // Normalisera fältnamn – historik-poster kan ha porttyp/teknikerNamn istf portTyp/tekniker
  const p = {
    ...pRaw,
    portTyp:  pRaw.portTyp  || pRaw.porttyp       || '',
    tekniker: pRaw.tekniker || pRaw.teknikerNamn   || '',
  }
  const punkter = EGENKONTROLL_DEFAULT[p.portTyp] || []
  const RISKPUNKTER = (riskpunkter && riskpunkter.length > 0) ? riskpunkter : RISKPUNKTER_DEFAULT

  const skrivUt = async () => {
    const logoBase64 = await hämtaLogo()
    const html = pdfMontageProt(p, logoBase64, {}, riskpunkter)
    const win = window.open('', '_blank', 'width=860,height=1100')
    win.document.write(html); win.document.close()
    setTimeout(() => win.print(), 400)
  }

  return (
    <div>
      {/* Toprad */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <button className="btn" onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={14} /> Tillbaka
        </button>
        <button className="btn btn-primary" onClick={skrivUt} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Printer size={14} /> Skriv ut protokoll
        </button>
      </div>

      {/* Metainfo */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px 16px', marginBottom: 12 }}>
          {[
            ['Porttyp',     p.portTyp],
            ['Kund',        p.kund],
            ['Adress',      p.adress],
            ['Datum',       p.datum],
            ['Tekniker',    p.tekniker],
            p.ordernummer ? ['Ordernummer', p.ordernummer] : null,
            p.serienummer ? ['Serienummer', p.serienummer] : null,
            p.position    ? ['Position',    p.position]    : null,
          ].filter(Boolean).map(([l, v]) => (
            <div key={l}>
              <div style={{ fontSize: 10, color: 'var(--c-text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>{l}</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{v || '–'}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, paddingTop: 10, borderTop: '1px solid var(--c-border)' }}>
          <span style={{ color: 'var(--c-teal)', fontWeight: 600 }}>✓ {p.ok ?? 0} Godkänd</span>
          {(p.ej ?? 0) > 0 && <span style={{ color: 'var(--c-red)', fontWeight: 600 }}>✗ {p.ej} Avvikelse</span>}
          {(p.na ?? 0) > 0 && <span style={{ color: '#888' }}>{p.na} Ej tillämpbar</span>}
          {p.godkannande && (
            <span style={{ fontWeight: 700, color: p.godkannande === 'godkand' ? 'var(--c-teal)' : 'var(--c-red)' }}>
              · {p.godkannande === 'godkand' ? '✓ Godkänd av kund' : '✗ Ej godkänd av kund'}
            </span>
          )}
        </div>
      </div>

      {/* Riskbedömning */}
      {p.riskKontroll && Object.keys(p.riskKontroll).length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Riskbedömning</div>
          {RISKPUNKTER.map((punkt, i) => {
            if (punkt.startsWith('## ')) return (
              <div key={i} style={{ margin: '10px 0 6px', padding: '5px 10px', background: 'var(--c-bg)', borderRadius: 6, borderLeft: '3px solid var(--c-blue)' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-blue)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{punkt.slice(3)}</span>
              </div>
            )
            const st  = p.riskKontroll?.[i]
            if (!st) return null
            const not = p.riskNoteringar?.[i] || ''
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, borderBottom: '1px solid var(--c-border)', paddingBottom: 6, marginBottom: 6 }}>
                <span style={{ flex: 1, fontSize: 12 }}>{punkt}</span>
                <span style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                  color: st === 'ok' ? 'var(--c-teal)' : st === 'atgard' ? 'var(--c-amber)' : 'var(--c-text3)' }}>
                  {st === 'ok' ? '✓ OK' : st === 'atgard' ? '⚠ Åtgärd krävs' : '– Ej aktuellt'}
                </span>
                {not && <span style={{ fontSize: 11, color: 'var(--c-text2)', maxWidth: 160, textAlign: 'right' }}>{not}</span>}
              </div>
            )
          })}
          {(p.egenRisker || []).map((r, i) => (
            <div key={`er${i}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 8,
              borderBottom: '1px solid var(--c-border)', paddingBottom: 6, marginBottom: 6,
              background: 'var(--c-bg)', padding: '6px 8px', borderRadius: 6 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{r.label || '–'}</div>
                {r.beskrivning && <div style={{ fontSize: 11, color: 'var(--c-text2)' }}>{r.beskrivning}</div>}
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                color: r.status === 'ok' ? 'var(--c-teal)' : r.status === 'atgard' ? 'var(--c-amber)' : 'var(--c-text3)' }}>
                {r.status === 'ok' ? '✓ OK' : r.status === 'atgard' ? '⚠ Åtgärd krävs' : '– Ej aktuellt'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Egenkontroll */}
      {punkter.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Egenkontroll – {p.portTyp}</div>
          {(() => {
            let ec = 0
            return punkter.map((punkt, i) => {
              if (punkt.startsWith('## ')) return (
                <div key={i} style={{ margin: '10px 0 6px', padding: '5px 10px', background: 'var(--c-bg)', borderRadius: 6, borderLeft: '3px solid var(--c-blue)' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-blue)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{punkt.slice(3)}</span>
                </div>
              )
              ec++
              const st  = p.egenkontroll?.[i] || ''
              const not = p.egenNoteringar?.[i] || ''
              const color = st === 'OK' ? 'var(--c-teal)' : st === 'EJ' ? 'var(--c-red)' : 'var(--c-text3)'
              const etikett = st === 'OK' ? '✓ Godkänd' : st === 'EJ' ? '✗ Avvikelse' : st === 'NA' ? 'Ej tillämpbar' : '–'
              return (
                <div key={i} style={{ borderBottom: '1px solid var(--c-border)', paddingBottom: 7, marginBottom: 7 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, color: 'var(--c-text3)', minWidth: 20, flexShrink: 0 }}>{ec}.</span>
                    <span style={{ flex: 1, fontSize: 12 }}>{punkt}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color, whiteSpace: 'nowrap' }}>{etikett}</span>
                  </div>
                  {not && <div style={{ marginLeft: 28, fontSize: 11, color: 'var(--c-text2)', marginTop: 3 }}>{not}</div>}
                </div>
              )
            })
          })()}
        </div>
      )}

      {/* Signatur */}
      {p.signatur && (
        <div className="card">
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Signatur tekniker</div>
          <img src={p.signatur} alt="Signatur" style={{ maxWidth: 280, border: '1px solid var(--c-border)', borderRadius: 6 }} />
          {p.tekniker && <div style={{ fontSize: 12, color: 'var(--c-text2)', marginTop: 6 }}>{p.tekniker} · {p.datum}</div>}
        </div>
      )}
    </div>
  )
}

// ── Protokolldetalj (interaktiv – redigera + godkänn alla) ───────────────────
function ProtokollDetalj({ entry, portTyp, onBack, onTaBort, onSpara }) {
  const punkter = protokollPunkter[entry.portTyp || portTyp] || []

  const [statuses,   setStatuses]   = useState(() => ({ ...(entry.statuses   || {}) }))
  const [noteringar, setNoteringar] = useState(() => ({ ...(entry.noteringar || {}) }))
  const [sparar,     setSparar]     = useState(false)

  const harÄndrat = JSON.stringify(statuses) !== JSON.stringify(entry.statuses || {}) ||
                    JSON.stringify(noteringar) !== JSON.stringify(entry.noteringar || {})

  const gCount = Object.values(statuses).filter(s => s === 'G').length
  const jCount = Object.values(statuses).filter(s => s === 'J').length
  const aCount = Object.values(statuses).filter(s => s === 'A').length

  const godkannAlla = () => {
    const nya = {}
    punkter.forEach((p, i) => { if (!p.startsWith('## ')) nya[i] = 'G' })
    setStatuses(nya)
  }

  const sparaÄndringar = async () => {
    setSparar(true)
    const updatedEntry = {
      ...entry,
      statuses,
      noteringar,
      g: Object.values(statuses).filter(s => s === 'G').length,
      j: Object.values(statuses).filter(s => s === 'J').length,
      a: Object.values(statuses).filter(s => s === 'A').length,
    }
    await onSpara?.(updatedEntry)
    setSparar(false)
  }

  const skrivUtPDF = async () => {
    const logoBase64 = await hämtaLogo()
    const STATUS_LABEL = { G: '✓ Godkänd', J: '⚠ Notera', A: '✗ Avvikelse' }
    const STATUS_CLS   = { G: 's-g',       J: 's-j',          A: 's-a'         }
    let numCount = 0
    const rader = punkter.map((p, i) => {
      if (p.startsWith('## ')) return `<tr class="tbl-group"><td colspan="3">${p.slice(3)}</td></tr>`
      numCount++
      const s   = statuses[i]   || ''
      const not = noteringar[i] || ''
      return `<tr>
        <td><span style="color:#bbb;margin-right:6px;font-size:10px">${numCount}.</span>${p}</td>
        <td class="${STATUS_CLS[s] || ''}" style="white-space:nowrap">${STATUS_LABEL[s] || '–'}</td>
        <td style="color:#666">${not}</td>
      </tr>`
    }).join('')

    const body = `
      ${pdfHeader(logoBase64, 'Serviceprotokoll', entry.datum || '', '')}
      <div class="slbl">Portinformation</div>
      ${pdfMetaGrid([
        { lbl: 'Objekt',    val: entry.portNamn || entry.namn || '–' },
        { lbl: 'Porttyp',   val: entry.portTyp  || portTyp           },
        { lbl: 'Tekniker',  val: entry.tekniker                      },
        { lbl: 'Datum',     val: entry.datum                         },
        { lbl: 'Resultat',  val: `${gCount} Godkänd · ${jCount} Notera · ${aCount} Avvikelse` },
        { lbl: 'Serviceintervall', val: entry.serviceIntervall || '–' },
      ])}
      <div class="slbl">Kontrollpunkter</div>
      <table>
        <thead><tr>
          <th style="width:58%">Kontrollpunkt</th>
          <th style="width:22%">Status</th>
          <th style="width:20%">Notering / Åtgärd</th>
        </tr></thead>
        <tbody>${rader}</tbody>
      </table>
      ${entry.signatur ? `
        <div class="slbl">Signatur tekniker</div>
        <div class="sig-section"><div class="sig-box">
          <div class="sig-label">${entry.tekniker || ''}</div>
          <img src="${entry.signatur}" style="max-width:280px;max-height:80px"/>
          <div class="sig-date">${entry.datum || ''}</div>
        </div></div>` : ''}
    `
    const win = window.open('', '_blank', 'width=860,height=1000')
    win.document.write(pdfDoc(`Serviceprotokoll ${entry.datum}`, body))
    win.document.close()
    setTimeout(() => win.print(), 400)
  }

  const totalPunkter = punkter.filter(p => !p.startsWith('## ')).length
  const ifyllda      = gCount + jCount + aCount
  const pct          = totalPunkter > 0 ? Math.round((ifyllda / totalPunkter) * 100) : 0

  return (
    <div>
      {/* Toprad */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <button className="btn" onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={14} /> Tillbaka
        </button>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {harÄndrat && (
            <button className="btn btn-teal" onClick={sparaÄndringar} disabled={sparar}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Save size={13} /> {sparar ? 'Sparar…' : 'Spara ändringar'}
            </button>
          )}
          <button className="btn" onClick={skrivUtPDF} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Printer size={13} /> Skriv ut
          </button>
          <button onClick={onTaBort} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', fontSize: 12, borderRadius: 7, cursor: 'pointer',
            border: '1px solid var(--c-red)', background: 'var(--c-red-bg)', color: 'var(--c-red-text)',
          }}>
            <Trash2 size={13} /> Ta bort
          </button>
        </div>
      </div>

      {/* Metainfo */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px 16px' }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--c-text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>Datum</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{entry.datum}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--c-text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>Tekniker</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{entry.tekniker || '–'}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--c-text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>Resultat</div>
            <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', gap: 8 }}>
              <span style={{ color: 'var(--c-teal)' }}>{gCount} Godkänd</span>
              {jCount > 0 && <span style={{ color: 'var(--c-amber)' }}>{jCount} Notera</span>}
              {aCount > 0 && <span style={{ color: 'var(--c-red)' }}>{aCount} Avvikelse</span>}
            </div>
          </div>
        </div>
        {/* Förloppsindikator */}
        <div className="progress-bar" style={{ height: 4, marginTop: 12 }}>
          <div className="progress-fill" style={{
            width: `${pct}%`,
            background: aCount > 0 ? 'var(--c-red)' : jCount > 0 ? 'var(--c-amber)' : 'var(--c-teal)',
          }} />
        </div>
        <div style={{ fontSize: 10, color: 'var(--c-text3)', marginTop: 4 }}>{ifyllda}/{totalPunkter} ifyllda</div>
      </div>

      {/* Kontrollpunkter */}
      {punkter.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Kontrollpunkter</div>
            <button className="btn btn-teal" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}
              onClick={godkannAlla}>
              <CheckCircle size={12} /> Godkänn alla
            </button>
          </div>
          {(() => {
            let numCount = 0
            return punkter.map((p, i) => {
              if (p.startsWith('## ')) {
                return (
                  <div key={i} style={{ margin: '10px 0 6px', padding: '5px 10px', background: 'var(--c-bg)', borderRadius: 6, borderLeft: '3px solid var(--c-blue)' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-blue)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{p.slice(3)}</span>
                  </div>
                )
              }
              numCount++
              const s = statuses[i] || ''
              const visaNotis = s === 'J' || s === 'A'
              return (
                <div key={i} style={{ borderBottom: '1px solid var(--c-border)', paddingBottom: 8, marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, color: 'var(--c-text3)', minWidth: 20, flexShrink: 0 }}>{numCount}.</span>
                    <span style={{ flex: 1, fontSize: 13 }}>{p}</span>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {PROT_STATUSES.map(({ kod, color, bg, border, label }) => (
                        <button key={kod} onClick={() => setStatuses(prev => ({ ...prev, [i]: s === kod ? undefined : kod }))}
                          style={{
                            padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                            border: `1px solid ${s === kod ? border : 'var(--c-border)'}`,
                            background: s === kod ? bg : 'transparent',
                            color: s === kod ? color : 'var(--c-text3)',
                            cursor: 'pointer', transition: 'all 0.12s', whiteSpace: 'nowrap',
                          }}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {visaNotis && (
                    <input type="text" placeholder="Notering / åtgärd…"
                      value={noteringar[i] || ''}
                      onChange={e => setNoteringar(prev => ({ ...prev, [i]: e.target.value }))}
                      style={{ marginTop: 6, marginLeft: 28, width: 'calc(100% - 28px)', fontSize: 12,
                        padding: '5px 8px', border: '1px solid var(--c-border)', borderRadius: 6,
                        background: 'var(--c-bg)', color: 'var(--c-text)', outline: 'none' }} />
                  )}
                </div>
              )
            })
          })()}
        </div>
      )}

      {entry.signatur && (
        <div className="card">
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--c-text3)', marginBottom: 8 }}>Signatur tekniker</div>
          <img src={entry.signatur} alt="Signatur" style={{ maxWidth: 280, border: '1px solid var(--c-border)', borderRadius: 6 }} />
        </div>
      )}
    </div>
  )
}

// ── Snabb-bokningsmodal ───────────────────────────────────────────────────────
function SnabbBokning({ obj, tekniker, onSpara, onLaggTillServiceorder, onNavigeraServiceorder, onStäng }) {
  const idag = new Date().toISOString().slice(0, 10)
  const datoPlus = (n) => { const d = new Date(idag); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
  const [datum,          setDatum]          = useState(obj.nasta && obj.nasta >= idag ? obj.nasta : idag)
  const [tid,            setTid]            = useState('08:00')
  const [tek,            setTek]            = useState(tekniker[0] || '')
  const [prioritet,      setPrioritet]      = useState('normal')
  const [notering,       setNotering]       = useState('')
  const [sparar,         setSparar]         = useState(false)
  const [klar,           setKlar]           = useState(false)
  const [serviceorderNr, setServiceorderNr] = useState('')

  const boka = async () => {
    setSparar(true)

    // Generera serviceordernummer
    const nr = idag.replace(/-/g, '').slice(2) + '-' + Math.floor(Math.random() * 90 + 10)
    setServiceorderNr(nr)

    // Skapa serviceorder
    if (onLaggTillServiceorder) {
      await onLaggTillServiceorder({
        nr,
        datum,
        status:     'planerad',
        tekniker:   tek || null,
        kund:       obj.kund || '',
        objekt_ids: obj.id ? [obj.id] : [],
        notering:   notering.trim() || '',
        prioritet,
      })
    }

    // Skapa kalenderbokning
    await onSpara(datum, {
      tid, typ: 'service',
      namn: obj.namn,
      kund: obj.kund || '',
      tek,
      arendeId: null,
    })

    setSparar(false)
    setKlar(true)
  }

  const inp = { width: '100%', padding: '7px 10px', fontSize: 13, border: '1px solid var(--c-border2)', borderRadius: 6, background: 'var(--c-bg)', color: 'var(--c-text)', boxSizing: 'border-box', outline: 'none' }
  const lbl = { fontSize: 11, color: 'var(--c-text2)', marginBottom: 3, display: 'block' }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}>
      <div className="card" style={{ width: '100%', maxWidth: 400, padding: 22 }}>

        {klar ? (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <CheckCircle size={40} color="var(--c-teal)" style={{ margin: '0 auto 12px', display: 'block' }} />
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Service inbokad!</div>
            <div style={{ fontSize: 13, color: 'var(--c-text2)', marginBottom: 8 }}>
              {obj.namn} · {datum} kl. {tid}{tek ? ` · ${tek}` : ''}
            </div>
            {serviceorderNr && (
              <button
                onClick={() => { onStäng(); onNavigeraServiceorder?.() }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12,
                  padding: '5px 12px', borderRadius: 6, marginBottom: 16, cursor: 'pointer',
                  background: 'var(--c-teal-bg)', color: 'var(--c-teal-text)', border: '1px solid var(--c-teal)',
                  fontWeight: 600, transition: 'opacity 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                <CheckCircle size={12} /> Serviceorder #{serviceorderNr} skapad — öppna →
              </button>
            )}
            <button className="btn" onClick={onStäng} style={{ width: '100%' }}>Stäng</button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>Boka service</div>
                <div style={{ fontSize: 12, color: 'var(--c-text2)', marginTop: 2 }}>{obj.namn}</div>
              </div>
              <button className="btn" onClick={onStäng} style={{ padding: '3px 7px' }}><X size={13} /></button>
            </div>

            {/* Port-info (read-only) */}
            <div style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)', borderRadius: 8, padding: '10px 12px', marginBottom: 14, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: 'var(--c-text2)' }}>Fastighet</span>
                <span style={{ fontWeight: 500 }}>{obj.plats || '–'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: 'var(--c-text2)' }}>Kund</span>
                <span style={{ fontWeight: 500 }}>{obj.kund || '–'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--c-text2)' }}>Senast / Nästa service</span>
                <span style={{ fontWeight: 500 }}>{obj.senaste || '–'} → {obj.nasta || '–'}</span>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
                <div>
                  <label style={lbl}>Besöksdatum</label>
                  <input type="date" value={datum} onChange={e => setDatum(e.target.value)}
                    style={{ ...inp, colorScheme: 'light' }} />
                </div>
                <div>
                  <label style={lbl}>Tid</label>
                  <input type="time" value={tid} onChange={e => setTid(e.target.value)}
                    style={{ ...inp, colorScheme: 'light' }} />
                </div>
              </div>
              {/* Snabb-datum-knappar */}
              <div style={{ display: 'flex', gap: 5, marginTop: 6, flexWrap: 'wrap' }}>
                {[
                  { label: 'Idag',       val: idag           },
                  { label: '+7 dagar',   val: datoPlus(7)    },
                  { label: '+14 dagar',  val: datoPlus(14)   },
                  { label: '+30 dagar',  val: datoPlus(30)   },
                  ...(obj.nasta && obj.nasta > idag ? [{ label: 'Nästa service', val: obj.nasta }] : []),
                ].map(({ label, val }) => (
                  <button key={label} type="button" onClick={() => setDatum(val)} style={{
                    padding: '2px 8px', fontSize: 11, borderRadius: 4, cursor: 'pointer',
                    border: `1px solid ${datum === val ? 'var(--c-navy)' : 'var(--c-border2)'}`,
                    background: datum === val ? 'var(--c-navy)' : 'transparent',
                    color: datum === val ? '#fff' : 'var(--c-text2)',
                    whiteSpace: 'nowrap',
                  }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Tekniker</label>
              {tekniker.length > 0
                ? <select value={tek} onChange={e => setTek(e.target.value)} style={inp}>
                    <option value="">– Ej tilldelad –</option>
                    {tekniker.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                : <input type="text" placeholder="Namn på tekniker" value={tek}
                    onChange={e => setTek(e.target.value)} style={inp} />
              }
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Prioritet</label>
              <select value={prioritet} onChange={e => setPrioritet(e.target.value)} style={inp}>
                <option value="normal">Normal</option>
                <option value="hog">Hög</option>
                <option value="akut">Akut</option>
              </select>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={lbl}>Notering (valfri)</label>
              <textarea value={notering} onChange={e => setNotering(e.target.value)}
                placeholder="T.ex. specifik del att kontrollera, kundönskemål…"
                rows={2} style={{ ...inp, resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={boka} disabled={sparar || !datum} style={{ flex: 1 }}>
                {sparar ? 'Bokar…' : <><CalendarPlus size={14} /> Boka in &amp; skapa serviceorder</>}
              </button>
              <button className="btn" onClick={onStäng}>Avbryt</button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}

// ── Portdetaljer ──────────────────────────────────────────────────────────────
function ObjektKort({ obj, onBack, onUppdateraObjekt, onTaBortObjekt, tekniker, onLaggTillBokning, onLaggTillServiceorder, onNavigeraServiceorder, onNavigeraArende, onDupliceraPort, onNyArende, montageorder = [], arenden = [] }) {
  const [valdProtokoll,       setValdProtokoll]       = useState(null)
  const [visaMontageDetalj,   setVisaMontageDetalj]   = useState(false)
  const [visaSnabbBokning,    setVisaSnabbBokning]    = useState(false)
  const [redigeraNasta,    setRedigeraNasta]    = useState(false)
  const [nastaDatum,       setNastaDatum]       = useState(obj.nasta || '')
  const [spararNasta,      setSpararNasta]      = useState(false)
  const [dokument,         setDokument]         = useState(obj.dokument || [])
  // Bifogade filer (port_filer)
  const [portFiler,        setPortFiler]        = useState([])

  useEffect(() => {
    supabase.from('port_filer').select('*').eq('objekt_id', obj.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setPortFiler(data) })
  }, [obj.id])

  // Garanti & CE – redigering
  const [redigeraGaranti,  setRedigeraGaranti]  = useState(false)
  const [instDatum,        setInstDatum]        = useState(obj.installationsdatum || '')
  const [garantiAr,        setGarantiAr]        = useState(String(obj.garanti_ar || '2'))
  const [ceStatus,         setCeStatus]         = useState(obj.ce_status || 'ej_kontrollerad')
  const [ceNotering,       setCeNotering]       = useState(obj.ce_notering || '')
  const [spararGaranti,    setSpararGaranti]    = useState(false)

  const sparaGaranti = async () => {
    setSpararGaranti(true)
    await onUppdateraObjekt(obj.id, {
      installationsdatum: instDatum || null,
      garanti_ar: parseInt(garantiAr) || null,
      ce_status: ceStatus,
      ce_notering: ceNotering.trim(),
    })
    setSpararGaranti(false)
    setRedigeraGaranti(false)
  }

  const garanti = garantiStatus(instDatum || obj.installationsdatum, garantiAr || obj.garanti_ar)
  const ceCfg = CE_CFG[ceStatus] || CE_CFG.ej_kontrollerad

  const sparaNasta = async () => {
    setSpararNasta(true)
    await onUppdateraObjekt(obj.id, { nasta: nastaDatum })
    setSpararNasta(false)
    setRedigeraNasta(false)
  }

  const sparaDokument = async (nyaDok) => {
    setDokument(nyaDok)
    await onUppdateraObjekt(obj.id, { dokument: nyaDok })
  }

  // Ärenden kopplade till porten
  const portArenden = arenden.filter(a =>
    !a.arkiverad &&
    (a.objekt_id ? a.objekt_id === obj.id : (a.namn === obj.namn && a.kund === obj.kund))
  )
  const öppnaPortArenden  = portArenden.filter(a => a.status !== 'atgardad')
  const stängdaPortArenden = portArenden.filter(a => a.status === 'atgardad').slice(-3).reverse()

  // Länkad montageorder – matcha via objekt_id eller (fallback) ordernummer
  const länkadOrder = montageorder.find(m =>
    m.status === 'utford' && (
      m.objekt_id === obj.id ||
      (obj.ordernummer && m.ordernummer &&
       m.ordernummer.toLowerCase() === obj.ordernummer.toLowerCase())
    )
  )
  // Fullständig protokolldata: prioritera montageorder, fallback till historik (gammal data)
  const monteringProtoData = länkadOrder?.protokoll_data ||
    ((obj.historik || []).find(h => h.typ === 'montering' && (h.egenkontroll || h.riskKontroll)) || null)

  // Samla alla monteringsdokument (ny + gammal data)
  const monteringDokNy     = monteringProtoData?.dokument || []
  const monteringDokGammal = (obj.historik || [])
    .filter(h => h.typ === 'montering' && h.dokument?.length)
    .flatMap(h => h.dokument)
  const monteringDok = [...monteringDokNy, ...monteringDokGammal]

  const serviceProtokoll = (obj.historik || []).filter(h => h.typ !== 'montering')
  // monteringEntry: bara för gamla poster UTAN fullständig protokolldata (ingen egenkontroll/riskKontroll)
  const monteringEntry = monteringProtoData ? null
    : (obj.historik || []).find(h => h.typ === 'montering')

  const taBortProtokoll = async (entry) => {
    if (!window.confirm('Ta bort detta protokoll?')) return
    const nyHistorik = (obj.historik || []).filter(h => h !== entry)
    await onUppdateraObjekt(obj.id, { historik: nyHistorik })
    setValdProtokoll(null)
  }

  const sparaProtokoll = async (updatedEntry) => {
    const nyHistorik = (obj.historik || []).map(h => h === valdProtokoll ? updatedEntry : h)
    await onUppdateraObjekt(obj.id, { historik: nyHistorik })
    setValdProtokoll(updatedEntry)
  }

  const arkiveraPort = async () => {
    if (!window.confirm(`Arkivera porten "${obj.namn}"?\nDen kan återställas från arkivet.`)) return
    await onUppdateraObjekt(obj.id, { arkiverad: true })
    onBack()
  }

  if (visaMontageDetalj && monteringProtoData) {
    return (
      <MontageProtokollDetalj
        p={monteringProtoData}
        onBack={() => setVisaMontageDetalj(false)}
        riskpunkter={RISKPUNKTER}
      />
    )
  }

  if (valdProtokoll) {
    return (
      <ProtokollDetalj
        entry={valdProtokoll}
        portTyp={obj.typ}
        onBack={() => setValdProtokoll(null)}
        onTaBort={() => taBortProtokoll(valdProtokoll)}
        onSpara={sparaProtokoll}
      />
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <button className="btn" onClick={onBack}>← Tillbaka</button>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => onDupliceraPort?.(obj)}
            title="Duplicera port"
            style={{ display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 12px', fontSize: 12, borderRadius: 8, cursor: 'pointer',
              border: '1px solid var(--c-border)', background: 'transparent', color: 'var(--c-text2)' }}
          >
            <Copy size={13} /> Duplicera
          </button>
          {onNyArende && (
            <button
              onClick={() => onNyArende(obj)}
              style={{ display: 'flex', alignItems: 'center', gap: 7,
                padding: '8px 14px', fontSize: 13, fontWeight: 600, borderRadius: 8, cursor: 'pointer',
                border: '1.5px solid var(--c-red)', background: 'var(--c-red-bg)', color: 'var(--c-red-text)' }}
            >
              <AlertCircle size={15} /> Ny felanmälan
            </button>
          )}
          <button
            onClick={() => setVisaSnabbBokning(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 7,
              padding: '8px 14px', fontSize: 13, fontWeight: 600, borderRadius: 8, cursor: 'pointer',
              border: '1.5px solid var(--c-teal)', background: 'var(--c-teal-bg)', color: 'var(--c-teal-text)' }}
          >
            <CalendarPlus size={15} /> Boka service
          </button>
        </div>
      </div>

      {visaSnabbBokning && (
        <SnabbBokning
          obj={obj}
          tekniker={tekniker}
          onSpara={onLaggTillBokning}
          onLaggTillServiceorder={onLaggTillServiceorder}
          onNavigeraServiceorder={onNavigeraServiceorder}
          onStäng={() => setVisaSnabbBokning(false)}
        />
      )}

      <div className="card" style={{ borderLeft: `3px solid ${statusConfig[obj.status]?.color}`, borderRadius: '0 12px 12px 0', marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            {obj.plats && <div style={{ fontSize: 11, color: 'var(--c-text2)', marginBottom: 2 }}>📍 {obj.plats}</div>}
            <div style={{ fontSize: 15, fontWeight: 600 }}>{obj.namn}</div>
            <div style={{ fontSize: 12, color: 'var(--c-text2)', marginTop: 2 }}>{obj.kund}</div>
          </div>
          <span className={`badge ${statusConfig[obj.status]?.cls}`}>{statusConfig[obj.status]?.label}</span>
        </div>
        {[
          ['Porttyp',           obj.typ],
          ['Fabrikat / modell', obj.fabrikat],
          obj.ordernummer && ['Ordernummer',  obj.ordernummer],
          obj.serienummer && ['Serienummer',  obj.serienummer],
          obj.position    && ['Position',     obj.position],
          ['Installationsår',   obj.ar],
          ['Placering',         obj.adress],
          ['Senaste service',   obj.senaste || '–'],
          ['Nästa service',     obj.nasta],
          ['Protokoll',         `${obj.protokoll} (${obj.punkter} punkter)`],
        ].filter(Boolean).map(([l, v]) => (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--c-border)', fontSize: 12 }}>
            <span style={{ color: 'var(--c-text2)' }}>{l}</span>
            <span style={{ fontWeight: 500 }}>{v}</span>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div className="section-title" style={{ margin: 0 }}>Serviceintervall</div>
          {!redigeraNasta && (
            <button onClick={() => setRedigeraNasta(true)} className="btn"
              style={{ fontSize: 11, padding: '3px 9px', display: 'flex', alignItems: 'center', gap: 4 }}>
              ✏ Ändra nästa
            </button>
          )}
        </div>
        {redigeraNasta ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <input type="date" value={nastaDatum} onChange={e => setNastaDatum(e.target.value)}
              style={{ flex: 1, padding: '6px 9px', fontSize: 13, border: '1px solid var(--c-border)', borderRadius: 6, background: 'var(--c-bg)', color: 'var(--c-text)' }} />
            <button className="btn btn-primary" onClick={sparaNasta} disabled={spararNasta} style={{ fontSize: 12 }}>
              {spararNasta ? 'Sparar…' : 'Spara'}
            </button>
            <button className="btn" onClick={() => setRedigeraNasta(false)} style={{ fontSize: 12 }}>Avbryt</button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--c-text2)', marginBottom: 4 }}>
              <span>{obj.senaste || '–'}</span><span>{obj.nasta || '–'}</span>
            </div>
            <div className="progress-bar" style={{ height: 8 }}>
              <div className="progress-fill" style={{
                width: `${Math.min(obj.intervallProcent, 100)}%`,
                background: obj.intervallProcent > 100 ? 'var(--c-red)' : obj.intervallProcent > 70 ? 'var(--c-amber)' : 'var(--c-teal)'
              }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--c-text2)', marginTop: 6 }}>
              {obj.status === 'forsenad'
                ? `Försenad ${obj.dagerForsenad} dagar`
                : `${obj.intervallProcent}% av intervallet förbrukat`}
            </div>
          </>
        )}
      </div>

      {/* Garanti & CE */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div className="section-title" style={{ margin: 0 }}>Garanti & CE-dokumentation</div>
          {!redigeraGaranti && (
            <button onClick={() => setRedigeraGaranti(true)} className="btn"
              style={{ fontSize: 11, padding: '3px 9px', display: 'flex', alignItems: 'center', gap: 4 }}>
              ✏ Redigera
            </button>
          )}
        </div>

        {redigeraGaranti ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--c-text2)', marginBottom: 4 }}>Installationsdatum</div>
                <input type="date" value={instDatum} onChange={e => setInstDatum(e.target.value)}
                  style={{ width: '100%', padding: '6px 9px', fontSize: 13, border: '1px solid var(--c-border)', borderRadius: 6, background: 'var(--c-bg)', color: 'var(--c-text)', colorScheme: 'light' }} />
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--c-text2)', marginBottom: 4 }}>Garantitid (år)</div>
                <div style={{ display: 'flex', gap: 5 }}>
                  {['1','2','5','10'].map(v => (
                    <button key={v} onClick={() => setGarantiAr(v)} style={{ flex: 1, padding: '6px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${garantiAr === v ? 'var(--c-teal)' : 'var(--c-border)'}`, background: garantiAr === v ? 'var(--c-teal-bg)' : 'transparent', color: garantiAr === v ? 'var(--c-teal-text)' : 'var(--c-text2)' }}>{v} år</button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--c-text2)', marginBottom: 4 }}>CE-status</div>
                <select value={ceStatus} onChange={e => setCeStatus(e.target.value)}
                  style={{ width: '100%', padding: '6px 9px', fontSize: 13, border: '1px solid var(--c-border)', borderRadius: 6, background: 'var(--c-bg)', color: 'var(--c-text)' }}>
                  <option value="ej_kontrollerad">Ej kontrollerad</option>
                  <option value="godkand">CE-godkänd</option>
                  <option value="avvikelse">CE-avvikelse</option>
                </select>
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--c-text2)', marginBottom: 4 }}>CE-notering</div>
                <input type="text" value={ceNotering} onChange={e => setCeNotering(e.target.value)} placeholder="T.ex. CE-märkning saknas…"
                  style={{ width: '100%', padding: '6px 9px', fontSize: 13, border: '1px solid var(--c-border)', borderRadius: 6, background: 'var(--c-bg)', color: 'var(--c-text)' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-teal" onClick={sparaGaranti} disabled={spararGaranti}
                style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Save size={12} /> {spararGaranti ? 'Sparar…' : 'Spara'}
              </button>
              <button className="btn" onClick={() => setRedigeraGaranti(false)} style={{ fontSize: 12 }}>Avbryt</button>
            </div>
          </div>
        ) : (
          <div>
            {/* Garanti-badge */}
            {garanti ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, marginBottom: 8, background: garanti.giltig ? 'var(--c-teal-bg)' : 'var(--c-red-bg)', border: `1px solid ${garanti.giltig ? 'var(--c-teal)' : 'var(--c-red)'}` }}>
                {garanti.giltig ? <ShieldCheck size={14} color="var(--c-teal)" /> : <ShieldAlert size={14} color="var(--c-red)" />}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: garanti.giltig ? 'var(--c-teal-text)' : 'var(--c-red-text)' }}>
                    {garanti.giltig ? `Garanti giltig · ${garanti.dagar} dagar kvar` : `Garanti utgången · ${Math.abs(garanti.dagar)} dagar sedan`}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--c-text3)' }}>Installerad: {instDatum || obj.installationsdatum} · Garantitid: {garantiAr || obj.garanti_ar} år · Utgår: {garanti.utgångsdatum}</div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--c-text3)', marginBottom: 8 }}>
                Installationsdatum och garantitid ej registrerade. Klicka ✏ Redigera för att lägga till.
              </div>
            )}
            {/* CE-badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, background: ceCfg.bg, border: `1px solid ${ceCfg.color}` }}>
              <ceCfg.Icon size={13} color={ceCfg.color} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: ceCfg.color }}>{ceCfg.label}</div>
                {(ceNotering || obj.ce_notering) && <div style={{ fontSize: 11, color: 'var(--c-text3)' }}>{ceNotering || obj.ce_notering}</div>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bifogade filer */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Paperclip size={14} color="var(--c-text3)" />
          <div className="section-title" style={{ margin: 0, flex: 1 }}>Filer &amp; dokument</div>
          <span style={{ fontSize: 11, color: 'var(--c-text3)' }}>{portFiler.length > 0 ? `${portFiler.length} fil${portFiler.length > 1 ? 'er' : ''}` : 'Inga filer'}</span>
        </div>
        <FilUppladdning
          objektId={obj.id}
          initialFiler={portFiler}
          onFilerUppdaterade={setPortFiler}
        />
      </div>

      {/* Ärenden kopplade till porten */}
      {portArenden.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="section-title" style={{ marginBottom: 8 }}>
            Ärenden
            {öppnaPortArenden.length > 0 && (
              <span style={{ marginLeft: 8, background: 'var(--c-red)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10 }}>
                {öppnaPortArenden.length} öppna
              </span>
            )}
          </div>

          {öppnaPortArenden.map(a => (
            <div key={a.id} className="row-item" onClick={() => onNavigeraArende?.(a.id)}
              style={{ cursor: onNavigeraArende ? 'pointer' : 'default', borderLeft: '3px solid var(--c-red)', paddingLeft: 10 }}>
              <div className="row-main">
                <div className="row-name" style={{ fontSize: 13 }}>#{a.nr} · {a.feltyp || a.typ}</div>
                <div className="row-sub">{a.datum}{a.tekniker ? ` · ${a.tekniker}` : ''}{a.besok ? ` · Besök: ${a.besok}` : ''}</div>
              </div>
              <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                <span className={`badge ${a.status === 'ny' ? 'badge-red' : 'badge-amber'}`}>
                  {a.status === 'ny' ? 'Ny' : 'Pågår'}
                </span>
                {onNavigeraArende && <ChevronRight size={15} color="var(--c-text3)" />}
              </div>
            </div>
          ))}

          {stängdaPortArenden.length > 0 && (
            <>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '10px 0 4px', paddingTop: öppnaPortArenden.length > 0 ? 8 : 0, borderTop: öppnaPortArenden.length > 0 ? '1px solid var(--c-border)' : 'none' }}>
                Senaste avslutade
              </div>
              {stängdaPortArenden.map(a => (
                <div key={a.id} className="row-item" onClick={() => onNavigeraArende?.(a.id)}
                  style={{ cursor: onNavigeraArende ? 'pointer' : 'default', opacity: 0.7 }}>
                  <div className="row-main">
                    <div className="row-name" style={{ fontSize: 13 }}>#{a.nr} · {a.feltyp || a.typ}</div>
                    <div className="row-sub">{a.datum}{a.tekniker ? ` · ${a.tekniker}` : ''}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                    <span className="badge badge-green">Åtgärdad</span>
                    {onNavigeraArende && <ChevronRight size={15} color="var(--c-text3)" />}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Serviceprotokoll */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="section-title">Serviceprotokoll ({serviceProtokoll.length})</div>
        {serviceProtokoll.length === 0
          ? <p style={{ color: 'var(--c-text2)', fontSize: 12 }}>Inga serviceprotokoll sparade.</p>
          : [...serviceProtokoll].reverse().map((h, i) => (
            <div key={i} className="row-item" onClick={() => setValdProtokoll(h)} style={{ cursor: 'pointer' }}>
              <div className="row-main">
                <div className="row-name">{h.datum} · {h.tekniker || '–'}</div>
                <div className="row-sub" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--c-teal)' }}>{h.g||0} Godkänd</span>
                  {(h.j||0) > 0 && <span style={{ color: 'var(--c-amber)' }}>· {h.j} Notera</span>}
                  {(h.a||0) > 0 && <span style={{ color: 'var(--c-red)' }}>· {h.a} Avvikelse</span>}
                  {h.notering ? <span>· {h.notering.slice(0, 50)}</span> : ''}
                </div>
              </div>
              {h.a > 0 && <span className="badge badge-red">Anmärkning</span>}
              <ChevronRight size={15} color="var(--c-text3)" />
            </div>
          ))
        }
      </div>

      {/* Montageprotokoll */}
      {(monteringProtoData || monteringEntry) && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="section-title" style={{ marginBottom: 8 }}>Montageprotokoll</div>

          {/* Klickbar rad med fullständigt protokoll (ny data från montageorder) */}
          {monteringProtoData && (
            <div className="row-item" onClick={() => setVisaMontageDetalj(true)}
              style={{ cursor: 'pointer' }}>
              <div className="row-main">
                <div className="row-name">{monteringProtoData.datum} · {monteringProtoData.tekniker || '–'}</div>
                <div className="row-sub" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--c-teal)' }}>{monteringProtoData.ok ?? 0} Godkänd</span>
                  {(monteringProtoData.ej ?? 0) > 0 && <span style={{ color: 'var(--c-red)' }}>· {monteringProtoData.ej} Avvikelse</span>}
                  {(monteringProtoData.na ?? 0) > 0 && <span style={{ color: '#888' }}>· {monteringProtoData.na} Ej tillämpbar</span>}
                  {monteringProtoData.godkannande && (
                    <span style={{ fontWeight: 600, color: monteringProtoData.godkannande === 'godkand' ? 'var(--c-teal)' : 'var(--c-red)' }}>
                      · {monteringProtoData.godkannande === 'godkand' ? '✓ Godkänd' : '✗ Ej godkänd'}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight size={15} color="var(--c-text3)" />
            </div>
          )}

          {/* Äldre data (ingen detaljvy tillgänglig) */}
          {!monteringProtoData && monteringEntry && (
            <div style={{ display: 'flex', gap: 14, padding: '4px 0', fontSize: 12, color: 'var(--c-text2)' }}>
              <span>{monteringEntry.datum}</span>
              <span>{monteringEntry.tekniker || '–'}</span>
              <span style={{ color: 'var(--c-teal)', fontWeight: 500 }}>{monteringEntry.ok ?? 0} Godkänd · {monteringEntry.ej ?? 0} Avvikelse</span>
            </div>
          )}
        </div>
      )}

      {/* Dokument */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 7 }}>
          <Paperclip size={14} color="var(--c-blue)" />
          Dokument {(dokument.length + monteringDok.length) > 0 && `(${dokument.length + monteringDok.length})`}
        </div>
        {/* Dokument från montering (läsonly) */}
        {monteringDok.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', marginBottom: 6 }}>Från montering</div>
            {monteringDok.map((d, i) => (
              <a key={i} href={d.url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 7,
                  background: 'var(--c-bg)', border: '1px solid var(--c-border)', marginBottom: 5,
                  textDecoration: 'none', color: 'var(--c-text)', fontSize: 12 }}>
                <Paperclip size={13} color="var(--c-text3)" />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.namn}</span>
              </a>
            ))}
          </div>
        )}
        <DokumentZon dokument={dokument} onChange={sparaDokument} />
      </div>

      {/* Arkivera */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <button onClick={arkiveraPort} style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '8px 14px', fontSize: 12, borderRadius: 8, cursor: 'pointer',
          border: '1px solid var(--c-amber)', background: 'var(--c-amber-bg)', color: 'var(--c-amber-text)',
        }}>
          <Archive size={13} /> Arkivera port
        </button>
      </div>
    </div>
  )
}

// ── Arkivvy ───────────────────────────────────────────────────────────────────
function ArkivLista({ arkiverade, onÅterställ, onTaBortPermanent, onBack }) {
  return (
    <div>
      <button className="btn" onClick={onBack} style={{ marginBottom: 16 }}>← Tillbaka till register</button>

      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 2 }}>Arkiv</h1>
        <p style={{ color: 'var(--c-text2)', fontSize: 13 }}>
          {arkiverade.length} arkiverad{arkiverade.length !== 1 ? 'e' : ''} port{arkiverade.length !== 1 ? 'ar' : ''}
        </p>
      </div>

      {arkiverade.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Archive size={36} color="var(--c-text3)" style={{ margin: '0 auto 12px', display: 'block' }} />
          <div style={{ fontSize: 13, color: 'var(--c-text2)' }}>Arkivet är tomt.</div>
        </div>
      ) : (
        <div className="card">
          {arkiverade.map(obj => (
            <div key={obj.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 0', borderBottom: '1px solid var(--c-border)',
            }}>
              <div className="port-icon" style={{ background: '#88888820', flexShrink: 0 }}>
                <DoorOpen size={18} color="#888" />
              </div>
              <div className="row-main" style={{ flex: 1 }}>
                <div className="row-name" style={{ color: 'var(--c-text2)' }}>{obj.namn}</div>
                <div className="row-sub">
                  {obj.plats ? `${obj.plats} · ` : ''}{obj.kund} · {obj.typ} · {obj.ar}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button
                  onClick={() => onÅterställ(obj.id)}
                  title="Återställ port"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '6px 10px', fontSize: 11, borderRadius: 7, cursor: 'pointer',
                    border: '1px solid var(--c-teal)', background: 'var(--c-teal-bg)', color: 'var(--c-teal-text)',
                  }}>
                  <ArchiveRestore size={12} /> Återställ
                </button>
                <button
                  onClick={() => onTaBortPermanent(obj)}
                  title="Ta bort permanent"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '6px 10px', fontSize: 11, borderRadius: 7, cursor: 'pointer',
                    border: '1px solid var(--c-red)', background: 'var(--c-red-bg)', color: 'var(--c-red-text)',
                  }}>
                  <Trash2 size={12} /> Ta bort
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Ny port-formulär ──────────────────────────────────────────────────────────
const portTyper = Object.keys(protokollTyper)

const FASTA_FABRIKAT = ['Torverk', 'Lindab', 'Hörmann', 'Beyron Door', 'Nordic Door']

function NyttObjektForm({ kunder, fastigheter, objekt = [], onSpara, onAvbryt, forval = null }) {
  const initFastighetId = forval?.fastighetId || fastigheter[0]?.id || ''
  const [valdFastighetId,  setValdFastighetId]  = useState(initFastighetId)
  const [sparar,           setSparar]           = useState(false)
  const [annatFabrikat,    setAnnatFabrikat]    = useState(
    forval?.fabrikat && !FASTA_FABRIKAT.includes(forval.fabrikat) ? forval.fabrikat : ''
  )
  const [serviceIntervall, setServiceIntervall] = useState('12')
  const [form, setForm] = useState({
    typ:               forval?.typ               || portTyper[0],
    namn:              forval ? `Kopia av ${forval.namn}` : '',
    kund:              forval?.kund              || kunder[0]?.namn || '',
    fabrikat:          forval?.fabrikat && FASTA_FABRIKAT.includes(forval.fabrikat) ? forval.fabrikat : (forval?.fabrikat ? 'Annat' : ''),
    ar:                forval?.ar                || new Date().getFullYear(),
    adress:            forval?.adress            || '',
    ordernummer:       forval?.ordernummer       || '',
    serienummer:       '',
    position:          forval?.position          || '',
    installationsdatum: '',
    garanti_ar:        '',
    ce_status:         'ej_kontrollerad',
  })
  const [fel, setFel] = useState(false)
  const [dubblettVarning, setDubblettVarning] = useState(null)
  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); if (k==='serienummer') setDubblettVarning(null) }

  const valdFastighet = fastigheter.find(f => f.id === valdFastighetId)
  const effektivtFabrikat = form.fabrikat === 'Annat' ? annatFabrikat : form.fabrikat

  const submit = async () => {
    if (!form.namn.trim() || !effektivtFabrikat.trim()) { setFel(true); return }
    // Dubblettcheck på serienummer
    const sn = form.serienummer.trim()
    if (sn) {
      const dubblett = objekt.find(o => !o.arkiverad && o.serienummer?.trim() === sn)
      if (dubblett) { setDubblettVarning(`S/N ${sn} finns redan på "${dubblett.namn}" (${dubblett.kund})`); return }
    }
    setSparar(true)
    let nasta = ''
    if (serviceIntervall !== '0') {
      const d = new Date(); d.setMonth(d.getMonth() + parseInt(serviceIntervall))
      nasta = d.toISOString().slice(0, 10)
    }
    onSpara({
      id: 'p' + Date.now(),
      plats:              valdFastighet?.namn || '',
      fastighetId:        valdFastighetId || null,
      typ:                form.typ,
      namn:               form.namn.trim(),
      kund:               form.kund,
      kundTyp:            'foretag',
      fabrikat:           effektivtFabrikat.trim(),
      ar:                 parseInt(form.ar) || new Date().getFullYear(),
      adress:             form.adress.trim(),
      ordernummer:        form.ordernummer.trim(),
      serienummer:        form.serienummer.trim(),
      position:           form.position.trim(),
      installationsdatum: form.installationsdatum || null,
      garanti_ar:         parseInt(form.garanti_ar) || null,
      ce_status:          form.ce_status || 'ej_kontrollerad',
      serviceIntervall:   parseInt(serviceIntervall) || 0,
      senaste: '',
      nasta,
      intervallProcent: 0,
      status: 'ny',
      protokoll: form.typ,
      punkter: protokollTyper[form.typ].punkter,
      historik: [],
      arkiverad: false,
    })
    setSparar(false)
  }

  const inp = { width: '100%', padding: '7px 10px', fontSize: 13, boxSizing: 'border-box', border: '1px solid var(--c-border2)', borderRadius: 6, background: 'var(--c-bg)', color: 'var(--c-text)' }
  const lbl = { fontSize: 12, color: 'var(--c-text2)', marginBottom: 4, display: 'block' }
  const fld = { marginBottom: 12 }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{forval ? 'Duplicera port' : 'Ny port'}</div>
        <button className="btn" onClick={onAvbryt} style={{ padding: '4px 8px' }}><X size={14} /></button>
      </div>

      {/* Fastighet */}
      <div style={fld}>
        <label style={lbl}>Fastighet</label>
        {fastigheter.length > 0
          ? <select value={valdFastighetId} onChange={e => setValdFastighetId(e.target.value)} style={inp}>
              <option value="">– Ingen fastighet –</option>
              {fastigheter.map(f => <option key={f.id} value={f.id}>{f.namn}{f.adress ? ` – ${f.adress}` : ''}</option>)}
            </select>
          : <p style={{ fontSize: 12, color: 'var(--c-amber-text)', margin: 0, padding: '8px 10px', background: 'var(--c-amber-bg)', borderRadius: 6 }}>
              Inga fastigheter är upplagda. Gå till <strong>Fastigheter</strong> och lägg till en fastighet först.
            </p>
        }
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        {/* Porttyp + Kund */}
        <div style={fld}><label style={lbl}>Porttyp *</label>
          <select value={form.typ} onChange={e => set('typ', e.target.value)} style={inp}>
            {portTyper.map(t => <option key={t}>{t}</option>)}
          </select></div>
        <div style={fld}><label style={lbl}>Kund *</label>
          <select value={form.kund} onChange={e => set('kund', e.target.value)} style={inp}>
            <option value="">– Välj kund –</option>
            {kunder.map(k => <option key={k.id} value={k.namn}>{k.namn}</option>)}
          </select></div>

        {/* Placering (primärt namn/identifikator) */}
        <div style={{ ...fld, gridColumn: '1/-1' }}>
          <label style={lbl}>Placering * <span style={{ color: 'var(--c-text3)', fontWeight: 400 }}>(t.ex. Lager A – Port 2)</span></label>
          <input type="text" placeholder="t.ex. Vikport lager B – Port 2" value={form.namn}
            onChange={e => set('namn', e.target.value)}
            style={{ ...inp, borderColor: fel && !form.namn.trim() ? 'var(--c-red)' : undefined }} />
        </div>

        {/* Fabrikat */}
        <div style={fld}>
          <label style={lbl}>Fabrikat *</label>
          <select value={form.fabrikat} onChange={e => set('fabrikat', e.target.value)}
            style={{ ...inp, borderColor: fel && !effektivtFabrikat.trim() ? 'var(--c-red)' : undefined }}>
            <option value="">– Välj fabrikat –</option>
            {FASTA_FABRIKAT.map(f => <option key={f} value={f}>{f}</option>)}
            <option value="Annat">Annat / okänt</option>
          </select>
          {form.fabrikat === 'Annat' && (
            <input type="text" placeholder="Ange fabrikat / modell" value={annatFabrikat}
              onChange={e => setAnnatFabrikat(e.target.value)}
              style={{ ...inp, marginTop: 6, borderColor: fel && !annatFabrikat.trim() ? 'var(--c-red)' : undefined }} />
          )}
        </div>
        <div style={fld}><label style={lbl}>Installationsår</label>
          <input type="number" value={form.ar} onChange={e => set('ar', e.target.value)} style={inp} /></div>

        {/* Ordernummer + Serienummer */}
        <div style={fld}><label style={lbl}>Ordernummer</label>
          <input type="text" placeholder="t.ex. ORD-2024-001" value={form.ordernummer}
            onChange={e => set('ordernummer', e.target.value)} style={inp} /></div>
        <div style={fld}>
          <label style={lbl}>Serienummer</label>
          <input type="text" placeholder="t.ex. SN-123456" value={form.serienummer}
            onChange={e => set('serienummer', e.target.value)}
            style={{...inp, borderColor: dubblettVarning ? 'var(--c-red)' : undefined}} />
          {dubblettVarning && (
            <div style={{marginTop:4,padding:'6px 10px',background:'var(--c-red-bg)',border:'1px solid var(--c-red)',borderRadius:6,fontSize:12,color:'var(--c-red-text)'}}>
              ⚠ Dubblett: {dubblettVarning}
            </div>
          )}
        </div>

        <div style={fld}><label style={lbl}>Position</label>
          <input type="text" placeholder="t.ex. Port A, Norrgavel, Lastkaj 2" value={form.position}
            onChange={e => set('position', e.target.value)} style={inp} /></div>

        {/* Adress */}
        <div style={{ ...fld, gridColumn: '1/-1' }}>
          <label style={lbl}>Adress</label>
          <input type="text" placeholder="Industrivägen 12, Luleå" value={form.adress}
            onChange={e => set('adress', e.target.value)} style={inp} />
        </div>

        {/* Installationsdatum + Garantitid */}
        <div style={fld}><label style={lbl}>Installationsdatum</label>
          <input type="date" value={form.installationsdatum || ''} onChange={e => set('installationsdatum', e.target.value)}
            style={{ ...inp, colorScheme: 'light' }} /></div>
        <div style={fld}><label style={lbl}>Garantitid (år)</label>
          <input type="number" min="0" max="20" value={form.garanti_ar || ''} onChange={e => set('garanti_ar', e.target.value)}
            placeholder="t.ex. 2" style={inp} /></div>

        {/* CE-status */}
        <div style={{ ...fld, gridColumn: '1/-1' }}>
          <label style={lbl}>CE-status</label>
          <select value={form.ce_status || 'ej_kontrollerad'} onChange={e => set('ce_status', e.target.value)} style={inp}>
            <option value="ej_kontrollerad">Ej kontrollerad</option>
            <option value="godkand">CE-godkänd</option>
            <option value="avvikelse">CE-avvikelse</option>
          </select>
        </div>
      </div>

      {/* Serviceintervall */}
      <div style={fld}>
        <label style={lbl}>Serviceintervall</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            ['12', '1 gång/år',     'Service var 12:e månad'],
            ['6',  '2 ggr/år',      'Service var 6:e månad'],
            ['0',  'Ingen service', 'Ingen schemalagd service'],
          ].map(([val, lab, sub]) => (
            <button key={val} type="button" onClick={() => setServiceIntervall(val)} style={{
              flex: 1, minWidth: 100, padding: '9px 10px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
              border: `2px solid ${serviceIntervall === val ? 'var(--c-teal)' : 'var(--c-border)'}`,
              background: serviceIntervall === val ? 'var(--c-teal-bg)' : 'var(--c-surface)',
              color: serviceIntervall === val ? 'var(--c-teal-text)' : 'var(--c-text)',
            }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{lab}</div>
              <div style={{ fontSize: 11, color: 'var(--c-text2)', marginTop: 1 }}>{sub}</div>
            </button>
          ))}
        </div>
      </div>

      {fel && <div style={{ fontSize: 12, color: 'var(--c-red)', marginBottom: 10 }}>Fyll i alla obligatoriska fält (*).</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary" onClick={submit} disabled={sparar}>
          {sparar ? 'Sparar…' : <><Plus size={14} /> Spara port</>}
        </button>
        <button className="btn" onClick={onAvbryt}>Avbryt</button>
      </div>
    </div>
  )
}

// ── Portregister – platt lista ────────────────────────────────────────────────
export default function Portregister({ objekt = [], kunder = [], fastigheter = [], tekniker = [], montageorder = [], arenden = [], riskpunkter, onLaggTill, onUppdateraObjekt, onTaBortObjekt, onLaggTillBokning, onLaggTillArende, onLaggTillServiceorder, onNavigeraArende, onNavigeraServiceorder, initialObjektId, onInitialObjektHandled, onNyArende }) {
  const RISKPUNKTER = (riskpunkter && riskpunkter.length > 0) ? riskpunkter : RISKPUNKTER_DEFAULT
  const [filter,         setFilter]         = useState('alla')
  const [sokText,        setSokText]        = useState('')
  const [vald,           setVald]           = useState(null)
  const [visaForm,       setVisaForm]       = useState(false)
  const [visaArkiv,      setVisaArkiv]      = useState(false)
  const [dupliceraForval, setDupliceraForval] = useState(null)

  useEffect(() => {
    if (initialObjektId && objekt.length > 0) {
      const o = objekt.find(x => x.id === initialObjektId)
      if (o) { setVald(o); onInitialObjektHandled?.() }
    }
  }, [initialObjektId, objekt])

  const aktivaPortar = objekt.filter(o => !o.arkiverad)
  const arkiverade   = objekt.filter(o =>  o.arkiverad)

  // ── Arkivvy ──
  if (visaArkiv) return (
    <ArkivLista
      arkiverade={arkiverade}
      onÅterställ={async (id) => {
        await onUppdateraObjekt(id, { arkiverad: false })
      }}
      onTaBortPermanent={async (obj) => {
        if (!window.confirm(`Ta bort "${obj.namn}" permanent? Det går inte att ångra.`)) return
        await onTaBortObjekt(obj.id)
      }}
      onBack={() => setVisaArkiv(false)}
    />
  )

  // ── Portdetalj ──
  if (vald) return (
    <ObjektKort
      obj={vald}
      onBack={() => setVald(null)}
      onUppdateraObjekt={async (id, changes) => {
        await onUppdateraObjekt(id, changes)
        setVald(prev => ({ ...prev, ...changes }))
      }}
      onTaBortObjekt={onTaBortObjekt}
      tekniker={tekniker}
      onLaggTillBokning={onLaggTillBokning}
      onDupliceraPort={(obj) => {
        setDupliceraForval(obj)
        setVald(null)
        setVisaForm(true)
      }}
      onNyArende={onNyArende}
      onLaggTillArende={onLaggTillArende}
      onLaggTillServiceorder={onLaggTillServiceorder}
      onNavigeraArende={onNavigeraArende}
      onNavigeraServiceorder={onNavigeraServiceorder}
      arenden={arenden}
      montageorder={montageorder}
    />
  )

  const aktivaFastigheter = fastigheter.filter(f => !f.arkiverad)
  const filtered = aktivaPortar.filter(o => {
    if (filter !== 'alla' && o.status !== filter) return false
    if (!sokText) return true
    const q = sokText.toLowerCase()
    return o.namn?.toLowerCase().includes(q) || o.kund?.toLowerCase().includes(q) ||
           o.plats?.toLowerCase().includes(q) || o.fabrikat?.toLowerCase().includes(q) ||
           o.ordernummer?.toLowerCase().includes(q) || o.serienummer?.toLowerCase().includes(q) || o.position?.toLowerCase().includes(q)
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 2 }}>Portregister</h1>
          <p style={{ color: 'var(--c-text2)', fontSize: 13 }}>{aktivaPortar.length} portar totalt</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {arkiverade.length > 0 && (
            <button onClick={() => setVisaArkiv(true)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 12px', fontSize: 12, borderRadius: 8, cursor: 'pointer',
              border: '1px solid var(--c-border)', background: 'transparent', color: 'var(--c-text2)',
            }}>
              <Archive size={13} /> Arkiv ({arkiverade.length})
            </button>
          )}
          {!visaForm && (
            <button className="btn btn-primary" onClick={() => setVisaForm(true)}>
              <Plus size={15} /> Ny port
            </button>
          )}
        </div>
      </div>

      {visaForm && (
        <NyttObjektForm
          kunder={kunder}
          fastigheter={aktivaFastigheter}
          objekt={objekt}
          forval={dupliceraForval}
          onSpara={nytt => { onLaggTill(nytt); setVisaForm(false); setDupliceraForval(null) }}
          onAvbryt={() => { setVisaForm(false); setDupliceraForval(null) }}
        />
      )}

      <div style={{ position: 'relative', marginBottom: 10 }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text3)', pointerEvents: 'none' }} />
        <input type="text" placeholder="Sök port, kund, fastighet, fabrikat, order- eller serienummer…" value={sokText} onChange={e => setSokText(e.target.value)}
          style={{ width: '100%', padding: '7px 10px 7px 32px', fontSize: 13, border: '1px solid var(--c-border)', borderRadius: 8, background: 'var(--c-surface)', color: 'var(--c-text)', boxSizing: 'border-box' }} />
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {filterOpts.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            padding: '4px 12px', fontSize: 12, borderRadius: 20, border: '1px solid var(--c-border)',
            background: filter === f.id ? 'var(--c-text)' : 'transparent',
            color:      filter === f.id ? '#fff' : 'var(--c-text2)', cursor: 'pointer',
          }}>{f.label}</button>
        ))}
      </div>

      <div className="card">
        {filtered.length === 0
          ? <p style={{ color: 'var(--c-text2)', fontSize: 13 }}>Inga portar matchar filtret.</p>
          : filtered.map(obj => (
            <div key={obj.id} className="row-item" onClick={() => setVald(obj)} style={{ cursor: 'pointer' }}>
              <div className="port-icon" style={{ background: (statusConfig[obj.status]?.color || '#888') + '20' }}>
                <DoorOpen size={18} color={statusConfig[obj.status]?.color || '#888'} />
              </div>
              <div className="row-main">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <div className="row-name">{obj.namn}</div>
                  {obj.position && (
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 5,
                      background: 'var(--c-blue-bg)', color: 'var(--c-blue)',
                      border: '1px solid var(--c-blue)', whiteSpace: 'nowrap',
                    }}>{obj.position}</span>
                  )}
                </div>
                <div className="row-sub">
                  {obj.plats ? `${obj.plats} · ` : ''}{obj.kund} · {obj.fabrikat} · {obj.ar}
                  {obj.ordernummer ? ` · Order: ${obj.ordernummer}` : ''}
                  {obj.serienummer ? ` · S/N: ${obj.serienummer}` : ''}
                </div>
                <div className="progress-bar" style={{ width: 140, marginTop: 5 }}>
                  <div className="progress-fill" style={{
                    width: `${Math.min(obj.intervallProcent, 100)}%`,
                    background: obj.intervallProcent > 100 ? 'var(--c-red)' : obj.intervallProcent > 70 ? 'var(--c-amber)' : 'var(--c-teal)'
                  }} />
                </div>
                <div style={{ fontSize: 10, color: obj.status === 'forsenad' ? 'var(--c-red)' : 'var(--c-text2)', marginTop: 2 }}>
                  {obj.status === 'forsenad' ? `Intervall passerat ${obj.dagerForsenad} dagar sedan` : `Nästa service: ${obj.nasta}`}
                </div>
              </div>
              <div className="row-right">
                <span className={`badge ${statusConfig[obj.status]?.cls}`}>{statusConfig[obj.status]?.label}</span>
                <ChevronRight size={16} color="var(--c-text3)" />
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
