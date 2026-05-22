import { useState } from 'react'
import { Building2, DoorOpen, ChevronRight, Plus, X, Trash2, Archive, ArchiveRestore, Pencil, Check, Search } from 'lucide-react'
import { statusConfig } from '../data/store.js'
import KundVäljare from '../components/KundVäljare.jsx'

// ── Hjälp: värsta status i en portgrupp ──────────────────────────────────────
function gruppsStatus(portar) {
  if (portar.some(o => o.status === 'forsenad')) return 'forsenad'
  if (portar.some(o => o.status === 'arende'))   return 'arende'
  if (portar.some(o => o.status === 'snart'))    return 'snart'
  return 'ok'
}

// ── Portdetalj (read-only) ────────────────────────────────────────────────────
function PortDetalj({ obj, onBack }) {
  return (
    <div>
      <button className="btn" onClick={onBack} style={{ marginBottom: 16 }}>← Tillbaka</button>

      <div className="card" style={{ borderLeft: `3px solid ${statusConfig[obj.status]?.color}`, borderRadius: '0 12px 12px 0', marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{obj.namn}</div>
            <div style={{ fontSize: 12, color: 'var(--c-text2)', marginTop: 2 }}>{obj.kund}</div>
          </div>
          <span className={`badge ${statusConfig[obj.status]?.cls}`}>{statusConfig[obj.status]?.label}</span>
        </div>
        {[
          ['Porttyp',           obj.typ],
          ['Fabrikat / modell', obj.fabrikat],
          ['Installationsår',   obj.ar],
          ['Placering',         obj.adress],
          ['Senaste service',   obj.senaste || '–'],
          ['Nästa service',     obj.nasta],
        ].map(([l, v]) => (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--c-border)', fontSize: 12 }}>
            <span style={{ color: 'var(--c-text2)' }}>{l}</span>
            <span style={{ fontWeight: 500 }}>{v}</span>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="section-title">Serviceintervall</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--c-text2)', marginBottom: 4 }}>
          <span>{obj.senaste || '–'}</span><span>{obj.nasta}</span>
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
      </div>

      <div className="card">
        <div className="section-title">Servicehistorik</div>
        {(!obj.historik || obj.historik.length === 0)
          ? <p style={{ color: 'var(--c-text2)', fontSize: 12 }}>Inga tidigare servicebesök.</p>
          : (
            <div className="timeline">
              {obj.historik.map((h, i) => (
                <div key={i} className="tl-row">
                  <div className="tl-left">
                    <div className="tl-dot" style={{ background: 'var(--c-teal)' }} />
                    <div className="tl-line" />
                  </div>
                  <div>
                    <div className="tl-title">{h.typ === 'montering' ? 'Montering' : 'Service utförd'}</div>
                    <div className="tl-sub">
                      {h.typ === 'montering' ? `${h.ok ?? 0} OK · ${h.ej ?? 0} Ej OK` : `${h.g}G · ${h.j}J · ${h.a}A`}
                      {h.notering && <> · <em>{h.notering}</em></>}
                    </div>
                    <div className="tl-time">{h.datum} · {h.tekniker}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  )
}

// ── Koppla-portar-panel (modal) ───────────────────────────────────────────────
function KopplaPortarPanel({ fastighet, alleaObjekt, koppladeIds, onSpara, onStäng }) {
  const [valda,   setValda]   = useState(() => new Set(koppladeIds))
  const [sök,     setSök]     = useState('')
  const [sparar,  setSparar]  = useState(false)

  const tillgängliga = alleaObjekt.filter(o => !o.arkiverad)
  const filtrerade   = sök.trim()
    ? tillgängliga.filter(o =>
        o.namn?.toLowerCase().includes(sök.toLowerCase()) ||
        o.kund?.toLowerCase().includes(sök.toLowerCase()) ||
        o.typ?.toLowerCase().includes(sök.toLowerCase())
      )
    : tillgängliga

  // Sortera: redan kopplade överst
  const sorterade = [...filtrerade].sort((a, b) => {
    const aKopplad = valda.has(a.id) ? 0 : 1
    const bKopplad = valda.has(b.id) ? 0 : 1
    return aKopplad - bKopplad || a.namn.localeCompare(b.namn, 'sv')
  })

  const toggle = (id) => setValda(prev => {
    const ny = new Set(prev)
    ny.has(id) ? ny.delete(id) : ny.add(id)
    return ny
  })

  const spara = async () => {
    setSparar(true)
    const orig = new Set(koppladeIds)
    const uppdateringar = []
    for (const o of alleaObjekt) {
      if (!orig.has(o.id) && valda.has(o.id)) {
        // Ny koppling
        uppdateringar.push({ id: o.id, changes: { fastighetId: fastighet.id, plats: fastighet.namn } })
      } else if (orig.has(o.id) && !valda.has(o.id)) {
        // Borttagen koppling
        uppdateringar.push({ id: o.id, changes: { fastighetId: null } })
      }
    }
    await onSpara(uppdateringar)
    setSparar(false)
    onStäng()
  }

  const antalValda = valda.size
  const antalÄndringar = tillgängliga.filter(o => {
    const orig = new Set(koppladeIds)
    return (orig.has(o.id) && !valda.has(o.id)) || (!orig.has(o.id) && valda.has(o.id))
  }).length

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}>
      <div className="card" style={{ width: '100%', maxWidth: 480, maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>

        {/* Rubrik */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--c-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Koppla portar</div>
            <div style={{ fontSize: 12, color: 'var(--c-text2)', marginTop: 2 }}>{fastighet.namn} · {antalValda} vald{antalValda !== 1 ? 'a' : ''}</div>
          </div>
          <button onClick={onStäng} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text2)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Sök */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--c-border)', flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text3)', pointerEvents: 'none' }} />
            <input
              type="text" placeholder="Sök port, kund, typ…" value={sök} onChange={e => setSök(e.target.value)}
              style={{ width: '100%', padding: '6px 10px 6px 28px', fontSize: 12, border: '1px solid var(--c-border)', borderRadius: 7, background: 'var(--c-bg)', color: 'var(--c-text)', boxSizing: 'border-box' }}
              autoFocus
            />
          </div>
        </div>

        {/* Portlista */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 12px' }}>
          {sorterade.length === 0 && (
            <p style={{ color: 'var(--c-text2)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Inga portar matchar sökningen.</p>
          )}
          {sorterade.map((o, i) => {
            const kopplad = valda.has(o.id)
            const förraVald = new Set(koppladeIds).has(o.id)
            const ändrad = kopplad !== förraVald
            return (
              <div key={o.id}>
                {/* Avdelare: kopplade → okopplade */}
                {i > 0 && sorterade[i - 1] && new Set(koppladeIds).has(sorterade[i - 1].id) && !new Set(koppladeIds).has(o.id) && valda.has(sorterade[i - 1].id) && !valda.has(o.id) && (
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '0.07em', padding: '8px 2px 4px' }}>
                    Övriga portar
                  </div>
                )}
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '9px 8px', borderRadius: 8,
                  cursor: 'pointer', background: ändrad ? 'var(--c-blue-bg)' : 'transparent',
                  transition: 'background 0.1s',
                }}>
                  <input
                    type="checkbox" checked={kopplad} onChange={() => toggle(o.id)}
                    style={{ width: 16, height: 16, accentColor: 'var(--c-teal)', flexShrink: 0, cursor: 'pointer' }}
                  />
                  <div className="port-icon" style={{ background: (statusConfig[o.status]?.color || '#888') + '20', width: 30, height: 30, flexShrink: 0 }}>
                    <DoorOpen size={14} color={statusConfig[o.status]?.color || '#888'} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: kopplad ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.namn}</div>
                    <div style={{ fontSize: 11, color: 'var(--c-text2)' }}>{o.kund}{o.typ ? ` · ${o.typ}` : ''}</div>
                  </div>
                  {kopplad && !ändrad && <span style={{ fontSize: 10, color: 'var(--c-teal)', fontWeight: 600, flexShrink: 0 }}>Kopplad</span>}
                  {ändrad && <span style={{ fontSize: 10, color: 'var(--c-blue-text)', fontWeight: 600, flexShrink: 0 }}>{kopplad ? '+ Lägg till' : '– Ta bort'}</span>}
                </label>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--c-border)', display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            onClick={spara} disabled={sparar || antalÄndringar === 0}
            style={{
              flex: 1, padding: '9px', fontSize: 13, fontWeight: 600, borderRadius: 8, cursor: antalÄndringar > 0 ? 'pointer' : 'not-allowed',
              background: antalÄndringar > 0 ? 'var(--c-teal)' : 'var(--c-border)', color: antalÄndringar > 0 ? '#fff' : 'var(--c-text3)', border: 'none',
              opacity: sparar ? 0.6 : 1,
            }}
          >
            {sparar ? 'Sparar…' : antalÄndringar > 0 ? `Spara (${antalÄndringar} ändring${antalÄndringar !== 1 ? 'ar' : ''})` : 'Inga ändringar'}
          </button>
          <button onClick={onStäng} className="btn" style={{ flexShrink: 0 }}>Avbryt</button>
        </div>
      </div>
    </div>
  )
}

// ── Fastighetdetalj ───────────────────────────────────────────────────────────
function FastighetDetalj({ fastighet, portar, alleaObjekt = [], onValjPort, onBack, onArkivera, onUppdatera, onUppdateraObjekt, kunder, onNyKund }) {
  const gs = gruppsStatus(portar)

  const [redigerar,    setRedigerar]    = useState(false)
  const [editNamn,     setEditNamn]     = useState(fastighet.namn)
  const [editAdress,   setEditAdress]   = useState(fastighet.adress || '')
  const [editKund,     setEditKund]     = useState(fastighet.kund  || '')
  const [sparar,       setSparar]       = useState(false)
  const [visaKoppla,   setVisaKoppla]   = useState(false)

  const sparaPortKopplingar = async (uppdateringar) => {
    await Promise.all(uppdateringar.map(({ id, changes }) => onUppdateraObjekt(id, changes)))
  }

  const startEdit = () => {
    setEditNamn(fastighet.namn)
    setEditAdress(fastighet.adress || '')
    setEditKund(fastighet.kund || '')
    setRedigerar(true)
  }

  const sparaEdit = async () => {
    const nyttNamn = editNamn.trim()
    if (!nyttNamn) return
    setSparar(true)
    // Om namnet ändrades: uppdatera plats på alla kopplade portar
    if (nyttNamn !== fastighet.namn) {
      await Promise.all(
        portar.map(p => onUppdateraObjekt(p.id, { plats: nyttNamn }))
      )
    }
    await onUppdatera(fastighet.id, { namn: nyttNamn, adress: editAdress.trim(), kund: editKund })
    setSparar(false)
    setRedigerar(false)
  }

  const inp = { width: '100%', padding: '7px 10px', fontSize: 13, boxSizing: 'border-box',
    border: '1px solid var(--c-border2)', borderRadius: 6, background: 'var(--c-bg)', color: 'var(--c-text)' }
  const lbl = { fontSize: 11, color: 'var(--c-text2)', marginBottom: 3, display: 'block' }

  return (
    <div>
      <button className="btn" onClick={onBack} style={{ marginBottom: 14 }}>← Alla fastigheter</button>

      <div className="card" style={{ marginBottom: 14 }}>
        {redigerar ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Redigera fastighet</div>
              <button className="btn" onClick={() => setRedigerar(false)} style={{ padding: '3px 7px' }}><X size={13} /></button>
            </div>
            <div>
              <label style={lbl}>Fastighetsbeteckning / namn *</label>
              <input type="text" value={editNamn} onChange={e => setEditNamn(e.target.value)} style={inp} autoFocus />
              {editNamn.trim() !== fastighet.namn && editNamn.trim() && (
                <div style={{ fontSize: 11, color: 'var(--c-amber-text)', marginTop: 3 }}>
                  Namnändring uppdaterar även {portar.length} kopplade port{portar.length !== 1 ? 'ar' : ''} automatiskt.
                </div>
              )}
            </div>
            <div>
              <label style={lbl}>Adress</label>
              <input type="text" value={editAdress} onChange={e => setEditAdress(e.target.value)}
                placeholder="Industrivägen 12, Luleå" style={inp} />
            </div>
            <div>
              <label style={lbl}>Kund / hyresgäst</label>
              <KundVäljare kunder={kunder} value={editKund} onChange={setEditKund} onNyKund={onNyKund} style={inp} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                className="btn btn-primary"
                onClick={sparaEdit}
                disabled={sparar || !editNamn.trim()}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {sparar ? 'Sparar…' : <><Check size={14} /> Spara ändringar</>}
              </button>
              <button className="btn" onClick={() => setRedigerar(false)}>Avbryt</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <Building2 size={28} color="var(--c-blue)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{fastighet.namn}</div>
              <div style={{ fontSize: 13, color: 'var(--c-text2)', marginTop: 3 }}>
                {fastighet.kund}{fastighet.adress ? ` · ${fastighet.adress}` : ''}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 12, background: 'var(--c-bg)', border: '1px solid var(--c-border)', borderRadius: 6, padding: '2px 10px' }}>
                  {portar.length} port{portar.length !== 1 ? 'ar' : ''}
                </span>
                {gs === 'forsenad' && <span className="badge badge-red">Försenad service</span>}
                {gs === 'arende'   && <span className="badge badge-red">Öppet ärende</span>}
                {gs === 'snart'    && <span className="badge badge-amber">Service snart</span>}
                {gs === 'ok'       && <span className="badge badge-teal">Allt OK</span>}
              </div>
            </div>
            <button
              onClick={startEdit}
              title="Redigera fastighet"
              style={{ flexShrink: 0, background: 'none', border: '1px solid var(--c-border)', borderRadius: 7,
                color: 'var(--c-text2)', cursor: 'pointer', padding: '6px 8px',
                display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}
            >
              <Pencil size={13} /> Redigera
            </button>
          </div>
        )}
      </div>

      {visaKoppla && (
        <KopplaPortarPanel
          fastighet={fastighet}
          alleaObjekt={alleaObjekt}
          koppladeIds={portar.map(p => p.id)}
          onSpara={sparaPortKopplingar}
          onStäng={() => setVisaKoppla(false)}
        />
      )}

      {portar.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '32px 20px', marginBottom: 14 }}>
          <DoorOpen size={32} color="var(--c-text3)" style={{ margin: '0 auto 10px', display: 'block' }} />
          <div style={{ fontSize: 13, color: 'var(--c-text2)', marginBottom: 16 }}>
            Inga portar kopplade till denna fastighet.
          </div>
          <button
            onClick={() => setVisaKoppla(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', fontSize: 13, fontWeight: 600, borderRadius: 8, cursor: 'pointer', border: '1.5px solid var(--c-teal)', background: 'var(--c-teal-bg)', color: 'var(--c-teal-text)' }}
          >
            <Plus size={15} /> Koppla portar
          </button>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Portar ({portar.length})</div>
            <button
              onClick={() => setVisaKoppla(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, borderRadius: 7, cursor: 'pointer', border: '1px solid var(--c-teal)', background: 'var(--c-teal-bg)', color: 'var(--c-teal-text)' }}
            >
              <Plus size={13} /> Koppla portar
            </button>
          </div>
          {portar.map(obj => (
            <div key={obj.id} className="row-item" onClick={() => onValjPort(obj)} style={{ cursor: 'pointer' }}>
              <div className="port-icon" style={{ background: (statusConfig[obj.status]?.color || '#888') + '20' }}>
                <DoorOpen size={16} color={statusConfig[obj.status]?.color || '#888'} />
              </div>
              <div className="row-main">
                <div className="row-name">{obj.namn}</div>
                <div className="row-sub">{obj.typ} · {obj.fabrikat} · {obj.ar}</div>
                <div className="progress-bar" style={{ width: 120, marginTop: 4 }}>
                  <div className="progress-fill" style={{
                    width: `${Math.min(obj.intervallProcent, 100)}%`,
                    background: obj.intervallProcent > 100 ? 'var(--c-red)' : obj.intervallProcent > 70 ? 'var(--c-amber)' : 'var(--c-teal)'
                  }} />
                </div>
                <div style={{ fontSize: 10, color: obj.status === 'forsenad' ? 'var(--c-red)' : 'var(--c-text2)', marginTop: 2 }}>
                  {obj.status === 'forsenad' ? `Försenad ${obj.dagerForsenad} dagar` : `Nästa service: ${obj.nasta}`}
                </div>
              </div>
              <div className="row-right">
                <span className={`badge ${statusConfig[obj.status]?.cls}`}>{statusConfig[obj.status]?.label}</span>
                <ChevronRight size={16} color="var(--c-text3)" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Arkivera ── */}
      <div className="card" style={{ borderLeft: '3px solid var(--c-amber)', borderRadius: '0 12px 12px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>Arkivera fastighet</div>
            <div style={{ fontSize: 12, color: 'var(--c-text2)' }}>
              Fastigheten döljs från listan men kan återställas från arkivet när som helst.
            </div>
          </div>
          <button onClick={onArkivera} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 16px', fontSize: 13, fontWeight: 600, borderRadius: 8, cursor: 'pointer',
            border: '1.5px solid var(--c-amber)', background: 'var(--c-amber-bg)', color: 'var(--c-amber-text)',
            flexShrink: 0,
          }}>
            <Archive size={15} /> Arkivera fastighet
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Formulär: Ny fastighet ────────────────────────────────────────────────────
function NyFastighetForm({ onSpara, onAvbryt, kunder = [], onNyKund }) {
  const [namn,   setNamn]   = useState('')
  const [adress, setAdress] = useState('')
  const [kund,   setKund]   = useState('')
  const [fel,    setFel]    = useState(false)

  const submit = () => {
    if (!namn.trim()) { setFel(true); return }
    onSpara({ namn: namn.trim(), adress: adress.trim(), kund: kund.trim() })
  }

  const inp = { width: '100%', padding: '8px 10px', fontSize: 13, boxSizing: 'border-box',
    border: '1px solid var(--c-border2)', borderRadius: 6, background: 'var(--c-bg)', color: 'var(--c-text)' }
  const lbl = { fontSize: 12, color: 'var(--c-text2)', marginBottom: 4, display: 'block' }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>Ny fastighet</div>
        <button className="btn" onClick={onAvbryt} style={{ padding: '4px 8px' }}><X size={14} /></button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={lbl}>Fastighetsbeteckning / namn *</label>
          <input type="text" value={namn} onChange={e => setNamn(e.target.value)}
            placeholder="t.ex. Volvo AB – Luleå, Lager 1"
            style={{ ...inp, borderColor: fel && !namn.trim() ? 'var(--c-red)' : undefined }}
            autoFocus />
          {fel && !namn.trim() && <div style={{ fontSize: 11, color: 'var(--c-red)', marginTop: 3 }}>Namn är obligatoriskt.</div>}
        </div>
        <div>
          <label style={lbl}>Adress</label>
          <input type="text" value={adress} onChange={e => setAdress(e.target.value)}
            placeholder="Industrivägen 12, Luleå" style={inp} />
        </div>
        <div>
          <label style={lbl}>Kund / hyresgäst</label>
          <KundVäljare kunder={kunder} value={kund} onChange={setKund} onNyKund={onNyKund} style={inp} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button className="btn btn-primary" onClick={submit}><Plus size={14} /> Spara fastighet</button>
        <button className="btn" onClick={onAvbryt}>Avbryt</button>
      </div>
    </div>
  )
}

// ── Arkivvy ───────────────────────────────────────────────────────────────────
function ArkivLista({ arkiverade, objekt, onÅterställ, onTaBortPermanent, onBack }) {
  return (
    <div>
      <button className="btn" onClick={onBack} style={{ marginBottom: 16 }}>← Tillbaka till fastigheter</button>

      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 2 }}>Arkiv – Fastigheter</h1>
        <p style={{ color: 'var(--c-text2)', fontSize: 13 }}>
          {arkiverade.length} arkiverad{arkiverade.length !== 1 ? 'e' : ''} fastighet{arkiverade.length !== 1 ? 'er' : ''}
        </p>
      </div>

      {arkiverade.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Archive size={36} color="var(--c-text3)" style={{ margin: '0 auto 12px', display: 'block' }} />
          <div style={{ fontSize: 13, color: 'var(--c-text2)' }}>Arkivet är tomt.</div>
        </div>
      ) : (
        <div className="card">
          {arkiverade.map(f => {
            const portarUnder = objekt.filter(o => o.fastighetId === f.id || (!o.fastighetId && o.plats === f.namn)).length
            return (
              <div key={f.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 0', borderBottom: '1px solid var(--c-border)',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                  background: '#88888820',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Building2 size={18} color="#888" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text2)' }}>{f.namn}</div>
                  <div style={{ fontSize: 12, color: 'var(--c-text3)' }}>
                    {f.kund}{f.adress ? ` · ${f.adress}` : ''}
                    {portarUnder > 0 && ` · ${portarUnder} port${portarUnder !== 1 ? 'ar' : ''}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => onÅterställ(f.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '6px 10px', fontSize: 11, borderRadius: 7, cursor: 'pointer',
                      border: '1px solid var(--c-teal)', background: 'var(--c-teal-bg)', color: 'var(--c-teal-text)',
                    }}>
                    <ArchiveRestore size={12} /> Återställ
                  </button>
                  <button
                    onClick={() => onTaBortPermanent(f)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '6px 10px', fontSize: 11, borderRadius: 7, cursor: 'pointer',
                      border: '1px solid var(--c-red)', background: 'var(--c-red-bg)', color: 'var(--c-red-text)',
                    }}>
                    <Trash2 size={12} /> Ta bort
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Fastighetslista (startsida) ───────────────────────────────────────────────
function FastighetLista({ fastigheter, objekt, onValjFastighet, onLaggTill, onVisaArkiv, arkivAntal, visaForm, setVisaForm, kunder, onNyKund }) {
  const [sokText, setSokText] = useState('')
  const filtrerade = sokText
    ? fastigheter.filter(f => {
        const q = sokText.toLowerCase()
        return f.namn?.toLowerCase().includes(q) || f.kund?.toLowerCase().includes(q) || f.adress?.toLowerCase().includes(q)
      })
    : fastigheter

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 2 }}>Fastigheter</h1>
          <p style={{ color: 'var(--c-text2)', fontSize: 13 }}>
            {fastigheter.length} fastighet{fastigheter.length !== 1 ? 'er' : ''} · {objekt.filter(o => !o.arkiverad).length} portar totalt
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {arkivAntal > 0 && (
            <button onClick={onVisaArkiv} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 12px', fontSize: 12, borderRadius: 8, cursor: 'pointer',
              border: '1px solid var(--c-border)', background: 'transparent', color: 'var(--c-text2)',
            }}>
              <Archive size={13} /> Arkiv ({arkivAntal})
            </button>
          )}
          {!visaForm && (
            <button className="btn btn-primary" onClick={() => setVisaForm(true)}>
              <Plus size={15} /> Ny fastighet
            </button>
          )}
        </div>
      </div>

      {!visaForm && fastigheter.length > 4 && (
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text3)', pointerEvents: 'none' }} />
          <input type="text" placeholder="Sök fastighet, kund, adress…" value={sokText} onChange={e => setSokText(e.target.value)}
            style={{ width: '100%', padding: '7px 10px 7px 32px', fontSize: 13, border: '1px solid var(--c-border)', borderRadius: 8, background: 'var(--c-surface)', color: 'var(--c-text)', boxSizing: 'border-box' }} />
        </div>
      )}

      {visaForm && (
        <NyFastighetForm
          onSpara={data => { onLaggTill(data); setVisaForm(false) }}
          onAvbryt={() => setVisaForm(false)}
          kunder={kunder}
          onNyKund={onNyKund}
        />
      )}

      {fastigheter.length === 0 && !visaForm && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Building2 size={40} color="var(--c-text3)" style={{ margin: '0 auto 12px', display: 'block' }} />
          <div style={{ fontSize: 14, color: 'var(--c-text2)' }}>
            Inga fastigheter ännu. Klicka <strong>+ Ny fastighet</strong> för att lägga till.
          </div>
        </div>
      )}

      {sokText && filtrerade.length === 0 && (
        <p style={{ color: 'var(--c-text2)', fontSize: 13 }}>Inga fastigheter matchar sökningen.</p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtrerade.map(f => {
          const portar = objekt.filter(o => (o.fastighetId === f.id || (!o.fastighetId && o.plats === f.namn)) && !o.arkiverad)
          const gs     = gruppsStatus(portar)
          return (
            <div key={f.id} className="card"
              style={{ cursor: 'pointer', transition: 'box-shadow 0.15s' }}
              onClick={() => onValjFastighet(f.id)}
              onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                  background: 'var(--c-blue-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Building2 size={22} color="var(--c-blue)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{f.namn}</div>
                  <div style={{ fontSize: 12, color: 'var(--c-text2)' }}>
                    {f.kund}{f.adress ? ` · ${f.adress}` : ''}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, background: 'var(--c-bg)', border: '1px solid var(--c-border)', borderRadius: 6, padding: '2px 10px' }}>
                      {portar.length} port{portar.length !== 1 ? 'ar' : ''}
                    </span>
                    {[...new Set(portar.map(o => o.typ))].slice(0, 3).map(t => (
                      <span key={t} className="badge badge-gray" style={{ fontSize: 10 }}>{t}</span>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                  {gs === 'forsenad' && <span className="badge badge-red">Försenad</span>}
                  {gs === 'arende'   && <span className="badge badge-red">Ärende</span>}
                  {gs === 'snart'    && <span className="badge badge-amber">Service snart</span>}
                  {gs === 'ok'       && <span className="badge badge-teal">OK</span>}
                  <ChevronRight size={16} color="var(--c-text3)" />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Huvudkomponent ────────────────────────────────────────────────────────────
export default function Fastigheter({ fastigheter = [], objekt = [], kunder = [], onLaggTill, onTaBort, onUppdatera, onNyKund, onUppdateraObjekt }) {
  const [valdFastighetId, setValdFastighetId] = useState(null)
  const [valdPort,        setValdPort]        = useState(null)
  const [visaForm,        setVisaForm]        = useState(false)
  const [visaArkiv,       setVisaArkiv]       = useState(false)

  const aktiva    = fastigheter.filter(f => !f.arkiverad)
  const arkiverade = fastigheter.filter(f =>  f.arkiverad)

  const arkivera = async (f) => {
    const portarUnder = objekt.filter(o => o.fastighetId === f.id || (!o.fastighetId && o.plats === f.namn)).length
    const msg = portarUnder > 0
      ? `Arkivera fastigheten "${f.namn}"?\nDet finns ${portarUnder} port${portarUnder !== 1 ? 'ar' : ''} kopplade (dessa påverkas inte).`
      : `Arkivera fastigheten "${f.namn}"?\nDen kan återställas från arkivet.`
    if (!window.confirm(msg)) return
    await onUppdatera(f.id, { arkiverad: true })
  }

  // ── Arkivvy ──
  if (visaArkiv) return (
    <ArkivLista
      arkiverade={arkiverade}
      objekt={objekt}
      onÅterställ={async (id) => {
        await onUppdatera(id, { arkiverad: false })
      }}
      onTaBortPermanent={async (f) => {
        const portarUnder = objekt.filter(o => o.fastighetId === f.id || (!o.fastighetId && o.plats === f.namn)).length
        const msg = portarUnder > 0
          ? `Ta bort "${f.namn}" permanent?\n${portarUnder} port${portarUnder !== 1 ? 'ar' : ''} är kopplade och påverkas inte.\nDet går inte att ångra.`
          : `Ta bort "${f.namn}" permanent? Det går inte att ångra.`
        if (!window.confirm(msg)) return
        await onTaBort(f.id)
      }}
      onBack={() => setVisaArkiv(false)}
    />
  )

  if (valdPort) return <PortDetalj obj={valdPort} onBack={() => setValdPort(null)} />

  if (valdFastighetId) {
    const fastighet = aktiva.find(f => f.id === valdFastighetId)
    const portar    = fastighet ? objekt.filter(o => (o.fastighetId === fastighet.id || (!o.fastighetId && o.plats === fastighet.namn)) && !o.arkiverad) : []
    return (
      <FastighetDetalj
        fastighet={fastighet || { namn: '–', adress: '', kund: '' }}
        portar={portar}
        alleaObjekt={objekt.filter(o => !o.arkiverad)}
        onValjPort={p => setValdPort(p)}
        onBack={() => setValdFastighetId(null)}
        onArkivera={() => arkivera(fastighet)}
        onUppdatera={onUppdatera}
        onUppdateraObjekt={onUppdateraObjekt}
        kunder={kunder}
        onNyKund={onNyKund}
      />
    )
  }

  return (
    <FastighetLista
      fastigheter={aktiva}
      objekt={objekt}
      onValjFastighet={id => setValdFastighetId(id)}
      onLaggTill={onLaggTill}
      onVisaArkiv={() => setVisaArkiv(true)}
      arkivAntal={arkiverade.length}
      visaForm={visaForm}
      setVisaForm={setVisaForm}
      kunder={kunder}
      onNyKund={onNyKund}
    />
  )
}
