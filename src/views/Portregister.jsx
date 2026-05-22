import { useState, useEffect } from 'react'
import { DoorOpen, Plus, ChevronRight, X, Printer, Trash2, ArrowLeft, Archive, ArchiveRestore, Search, CalendarPlus, CheckCircle, Copy, Paperclip, AlertCircle } from 'lucide-react'
import DokumentZon from '../components/DokumentZon.jsx'
import { statusConfig, protokollTyper, protokollPunkter } from '../data/store.js'
import logo from '../image-1779305303942.png'

const filterOpts = [
  { id: 'alla',     label: 'Alla' },
  { id: 'ok',       label: 'OK' },
  { id: 'snart',    label: 'Service snart' },
  { id: 'forsenad', label: 'Försenad' },
  { id: 'arende',   label: 'Öppet ärende' },
]

// ── Hämta logo som base64 ─────────────────────────────────────────────────────
async function hämtaLogoBase64() {
  try {
    const res  = await fetch(logo)
    const blob = await res.blob()
    return await new Promise(resolve => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.readAsDataURL(blob)
    })
  } catch { return '' }
}

// ── Protokolldetalj (read-only) ───────────────────────────────────────────────
function ProtokollDetalj({ entry, portTyp, onBack, onTaBort }) {
  const punkter    = protokollPunkter[entry.portTyp || portTyp] || []
  const statuses   = entry.statuses   || {}
  const noteringar = entry.noteringar || {}

  const skrivUtPDF = async () => {
    const logoBase64 = await hämtaLogoBase64()
    const rader = punkter.map((p, i) => {
      const s = statuses[i] || ''
      return `<tr class="${s.toLowerCase()}"><td>${i+1}</td><td>${p}</td><td style="text-align:center;font-weight:bold">${s||'–'}</td><td>${noteringar[i]||''}</td></tr>`
    }).join('')
    const win = window.open('', '_blank', 'width=860,height=1000')
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>Serviceprotokoll ${entry.datum}</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:Arial,sans-serif;font-size:11px;color:#111;padding:15mm 18mm}
        h1{font-size:18px;margin-bottom:3px}
        .sub{color:#666;font-size:11px;margin-bottom:14px}
        .grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px}
        .box{border:1px solid #ddd;padding:6px 10px;border-radius:4px}
        .lbl{font-size:9px;color:#888;margin-bottom:1px}
        .val{font-size:12px;font-weight:bold}
        table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:10px}
        th{background:#f4f4f4;text-align:left;padding:4px 6px;border:1px solid #ddd}
        td{padding:3px 6px;border:1px solid #ddd;vertical-align:top}
        .g{background:#e1f5ee}.j{background:#faeeda}.a{background:#fcebeb}
        @media print{@page{size:A4;margin:10mm}}
      </style></head><body>
      ${logoBase64 ? `<img src="${logoBase64}" style="float:right;height:40px;margin-top:-4px" alt="NMV Portservice" />` : ''}
      <h1>Serviceprotokoll</h1>
      <div class="sub">Datum: ${entry.datum}</div>
      <div class="grid">
        <div class="box"><div class="lbl">Tekniker</div><div class="val">${entry.tekniker||'–'}</div></div>
        <div class="box"><div class="lbl">Porttyp</div><div class="val">${entry.portTyp||portTyp}</div></div>
        <div class="box"><div class="lbl">Resultat</div><div class="val">${entry.g||0}G · ${entry.j||0}J · ${entry.a||0}A</div></div>
      </div>
      <table>
        <tr><th style="width:28px">#</th><th>Kontrollpunkt</th><th style="width:42px;text-align:center">Status</th><th>Notering / Åtgärd</th></tr>
        ${rader}
      </table>
      ${entry.signatur ? `<div style="margin-top:10px"><div style="font-size:10px;color:#888;margin-bottom:4px">Signatur tekniker</div><img src="${entry.signatur}" style="max-width:280px;border:1px solid #ccc;border-radius:4px" /></div>` : ''}
    </body></html>`)
    win.document.close()
    setTimeout(() => win.print(), 400)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <button className="btn" onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={14} /> Tillbaka
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={skrivUtPDF} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Printer size={13} /> Skriv ut
          </button>
          <button onClick={onTaBort} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', fontSize: 12, borderRadius: 7, cursor: 'pointer',
            border: '1px solid var(--c-red)', background: 'var(--c-red-bg)', color: 'var(--c-red-text)',
          }}>
            <Trash2 size={13} /> Ta bort protokoll
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
          <div><div style={{ fontSize: 11, color: 'var(--c-text2)' }}>Datum</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{entry.datum}</div></div>
          <div><div style={{ fontSize: 11, color: 'var(--c-text2)' }}>Tekniker</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{entry.tekniker || '–'}</div></div>
          <div><div style={{ fontSize: 11, color: 'var(--c-text2)' }}>Resultat</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              <span style={{ color: 'var(--c-teal)' }}>{entry.g||0}G</span> ·{' '}
              <span style={{ color: 'var(--c-amber)' }}>{entry.j||0}J</span> ·{' '}
              <span style={{ color: 'var(--c-red)' }}>{entry.a||0}A</span>
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
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Kontrollpunkter</div>
          {punkter.map((p, i) => {
            const s = statuses[i] || ''
            const bgMap  = { G: 'var(--c-green-bg)', J: 'var(--c-amber-bg)', A: 'var(--c-red-bg)' }
            const clrMap = { G: 'var(--c-green-text)', J: 'var(--c-amber-text)', A: 'var(--c-red-text)' }
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '6px 0', borderBottom: '1px solid var(--c-border)' }}>
                <span style={{ fontSize: 11, color: 'var(--c-text3)', minWidth: 22 }}>{i + 1}.</span>
                <span style={{ flex: 1, fontSize: 12 }}>{p}</span>
                {s && <span style={{ background: bgMap[s], color: clrMap[s],
                  borderRadius: 4, padding: '1px 8px', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{s}</span>}
                {noteringar[i] && (
                  <span style={{ fontSize: 11, color: 'var(--c-text2)', maxWidth: 160,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>
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

// ── Snabb-bokningsmodal ───────────────────────────────────────────────────────
function SnabbBokning({ obj, tekniker, onSpara, onStäng }) {
  const idag = new Date().toISOString().slice(0, 10)
  const [datum,  setDatum]  = useState(obj.nasta && obj.nasta >= idag ? obj.nasta : idag)
  const [tid,    setTid]    = useState('08:00')
  const [tek,    setTek]    = useState(tekniker[0] || '')
  const [sparar, setSparar] = useState(false)
  const [klar,   setKlar]   = useState(false)

  const boka = async () => {
    setSparar(true)
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

  const inp = { width: '100%', padding: '7px 10px', fontSize: 13, border: '1px solid var(--c-border2)', borderRadius: 6, background: 'var(--c-bg)', color: 'var(--c-text)', boxSizing: 'border-box' }
  const lbl = { fontSize: 11, color: 'var(--c-text2)', marginBottom: 3, display: 'block' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}>
      <div className="card" style={{ width: '100%', maxWidth: 400, padding: 22 }}>

        {klar ? (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <CheckCircle size={40} color="var(--c-teal)" style={{ margin: '0 auto 12px', display: 'block' }} />
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Service inbokad!</div>
            <div style={{ fontSize: 13, color: 'var(--c-text2)', marginBottom: 20 }}>
              {obj.namn} · {datum} kl. {tid}{tek ? ` · ${tek}` : ''}
            </div>
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
                <span style={{ fontWeight: 500 }}>{obj.senaste || '–'} → {obj.nasta}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px', marginBottom: 12 }}>
              <div>
                <label style={lbl}>Datum</label>
                <input type="date" value={datum} onChange={e => setDatum(e.target.value)} style={inp} />
              </div>
              <div>
                <label style={lbl}>Tid</label>
                <input type="time" value={tid} onChange={e => setTid(e.target.value)} style={inp} />
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
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

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={boka} disabled={sparar} style={{ flex: 1 }}>
                {sparar ? 'Bokar…' : <><CalendarPlus size={14} /> Boka in</>}
              </button>
              <button className="btn" onClick={onStäng}>Avbryt</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Portdetaljer ──────────────────────────────────────────────────────────────
function ObjektKort({ obj, onBack, onUppdateraObjekt, onTaBortObjekt, tekniker, onLaggTillBokning, onDupliceraPort, onNyArende }) {
  const [valdProtokoll,    setValdProtokoll]    = useState(null)
  const [visaSnabbBokning, setVisaSnabbBokning] = useState(false)
  const [redigeraNasta,    setRedigeraNasta]    = useState(false)
  const [nastaDatum,       setNastaDatum]       = useState(obj.nasta || '')
  const [spararNasta,      setSpararNasta]      = useState(false)
  const [dokument,         setDokument]         = useState(obj.dokument || [])

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

  // Samla dokument från monteringshistorik
  const monteringDok = (obj.historik || [])
    .filter(h => h.typ === 'montering' && h.dokument?.length)
    .flatMap(h => h.dokument)

  const serviceProtokoll = (obj.historik || []).filter(h => h.typ !== 'montering')
  const monteringEntry   = (obj.historik || []).find(h => h.typ === 'montering')

  const taBortProtokoll = async (entry) => {
    if (!window.confirm('Ta bort detta protokoll?')) return
    const nyHistorik = (obj.historik || []).filter(h => h !== entry)
    await onUppdateraObjekt(obj.id, { historik: nyHistorik })
    setValdProtokoll(null)
  }

  const arkiveraPort = async () => {
    if (!window.confirm(`Arkivera porten "${obj.namn}"?\nDen kan återställas från arkivet.`)) return
    await onUppdateraObjekt(obj.id, { arkiverad: true })
    onBack()
  }

  if (valdProtokoll) {
    return (
      <ProtokollDetalj
        entry={valdProtokoll}
        portTyp={obj.typ}
        onBack={() => setValdProtokoll(null)}
        onTaBort={() => taBortProtokoll(valdProtokoll)}
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

      {/* Serviceprotokoll */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="section-title">Serviceprotokoll ({serviceProtokoll.length})</div>
        {serviceProtokoll.length === 0
          ? <p style={{ color: 'var(--c-text2)', fontSize: 12 }}>Inga serviceprotokoll sparade.</p>
          : [...serviceProtokoll].reverse().map((h, i) => (
            <div key={i} className="row-item" onClick={() => setValdProtokoll(h)} style={{ cursor: 'pointer' }}>
              <div className="row-main">
                <div className="row-name">{h.datum} · {h.tekniker || '–'}</div>
                <div className="row-sub">
                  <span style={{ color: 'var(--c-teal)' }}>{h.g||0}G</span> ·{' '}
                  <span style={{ color: 'var(--c-amber)' }}>{h.j||0}J</span> ·{' '}
                  <span style={{ color: 'var(--c-red)' }}>{h.a||0}A</span>
                  {h.notering ? ` · ${h.notering.slice(0, 50)}` : ''}
                </div>
              </div>
              {h.a > 0 && <span className="badge badge-red">Anmärkning</span>}
              <ChevronRight size={15} color="var(--c-text3)" />
            </div>
          ))
        }
      </div>

      {/* Monteringspost */}
      {monteringEntry && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="section-title">Montering</div>
          <div style={{ display: 'flex', gap: 14, padding: '6px 0', fontSize: 12 }}>
            <span style={{ color: 'var(--c-text2)' }}>{monteringEntry.datum}</span>
            <span style={{ color: 'var(--c-text2)' }}>{monteringEntry.tekniker || '–'}</span>
            <span style={{ color: 'var(--c-teal)', fontWeight: 500 }}>
              {monteringEntry.ok ?? 0} OK · {monteringEntry.ej ?? 0} Ej OK
            </span>
          </div>
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

function NyttObjektForm({ kunder, fastigheter, onSpara, onAvbryt, forval = null }) {
  const initFastighetId = forval?.fastighetId || fastigheter[0]?.id || ''
  const [valdFastighetId,  setValdFastighetId]  = useState(initFastighetId)
  const [sparar,           setSparar]           = useState(false)
  const [annatFabrikat,    setAnnatFabrikat]    = useState(
    forval?.fabrikat && !FASTA_FABRIKAT.includes(forval.fabrikat) ? forval.fabrikat : ''
  )
  const [serviceIntervall, setServiceIntervall] = useState('12')
  const [form, setForm] = useState({
    typ:         forval?.typ         || portTyper[0],
    namn:        forval ? `Kopia av ${forval.namn}` : '',
    kund:        forval?.kund        || kunder[0]?.namn || '',
    fabrikat:    forval?.fabrikat && FASTA_FABRIKAT.includes(forval.fabrikat) ? forval.fabrikat : (forval?.fabrikat ? 'Annat' : ''),
    ar:          forval?.ar          || new Date().getFullYear(),
    adress:      forval?.adress      || '',
    ordernummer: forval?.ordernummer || '',
    serienummer: '',
  })
  const [fel, setFel] = useState(false)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const valdFastighet = fastigheter.find(f => f.id === valdFastighetId)
  const effektivtFabrikat = form.fabrikat === 'Annat' ? annatFabrikat : form.fabrikat

  const submit = async () => {
    if (!form.namn.trim() || !effektivtFabrikat.trim()) { setFel(true); return }
    setSparar(true)
    let nasta = ''
    if (serviceIntervall !== '0') {
      const d = new Date(); d.setMonth(d.getMonth() + parseInt(serviceIntervall))
      nasta = d.toISOString().slice(0, 10)
    }
    onSpara({
      id: 'p' + Date.now(),
      plats:       valdFastighet?.namn || '',
      fastighetId: valdFastighetId || null,
      typ:         form.typ,
      namn:        form.namn.trim(),
      kund:        form.kund,
      kundTyp:     'foretag',
      fabrikat:    effektivtFabrikat.trim(),
      ar:          parseInt(form.ar) || new Date().getFullYear(),
      adress:      form.adress.trim(),
      ordernummer: form.ordernummer.trim(),
      serienummer: form.serienummer.trim(),
      serviceIntervall: parseInt(serviceIntervall) || 0,
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
        <div style={fld}><label style={lbl}>Serienummer</label>
          <input type="text" placeholder="t.ex. SN-123456" value={form.serienummer}
            onChange={e => set('serienummer', e.target.value)} style={inp} /></div>

        {/* Adress */}
        <div style={{ ...fld, gridColumn: '1/-1' }}>
          <label style={lbl}>Adress</label>
          <input type="text" placeholder="Industrivägen 12, Luleå" value={form.adress}
            onChange={e => set('adress', e.target.value)} style={inp} />
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
export default function Portregister({ objekt = [], kunder = [], fastigheter = [], tekniker = [], onLaggTill, onUppdateraObjekt, onTaBortObjekt, onLaggTillBokning, initialObjektId, onInitialObjektHandled, onNyArende }) {
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
    />
  )

  const aktivaFastigheter = fastigheter.filter(f => !f.arkiverad)
  const filtered = aktivaPortar.filter(o => {
    if (filter !== 'alla' && o.status !== filter) return false
    if (!sokText) return true
    const q = sokText.toLowerCase()
    return o.namn?.toLowerCase().includes(q) || o.kund?.toLowerCase().includes(q) ||
           o.plats?.toLowerCase().includes(q) || o.fabrikat?.toLowerCase().includes(q) ||
           o.ordernummer?.toLowerCase().includes(q) || o.serienummer?.toLowerCase().includes(q)
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
                <div className="row-name">{obj.namn}</div>
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
