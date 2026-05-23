import { useState } from 'react'
import { Building2, DoorOpen, ChevronRight } from 'lucide-react'
import { statusConfig } from '../data/store.js'

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
                      {h.typ === 'montering' ? `${h.ok ?? 0} Godkänd · ${h.ej ?? 0} Avvikelse` : `${h.g} Godkänd · ${h.j} Notera · ${h.a} Avvikelse`}
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

// ── Platsdetalj ───────────────────────────────────────────────────────────────
function PlatsDetalj({ platsNamn, portar, onValjPort, onBack }) {
  const gs = gruppsStatus(portar)

  return (
    <div>
      <button className="btn" onClick={onBack} style={{ marginBottom: 14 }}>← Alla objekt</button>

      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <Building2 size={28} color="var(--c-blue)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{platsNamn}</div>
            <div style={{ fontSize: 13, color: 'var(--c-text2)', marginTop: 3 }}>
              {portar[0]?.kund || ''}{portar[0]?.adress ? ` · ${portar[0].adress}` : ''}
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
        </div>
      </div>

      <div className="card">
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Portar</div>
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
    </div>
  )
}

// ── Platslista (startsida) ────────────────────────────────────────────────────
function PlatsLista({ platser, onValjPlats }) {
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 2 }}>Objekt</h1>
        <p style={{ color: 'var(--c-text2)', fontSize: 13 }}>
          {platser.length} objekt · {platser.reduce((s, p) => s + p.portar.length, 0)} portar totalt
        </p>
      </div>

      {platser.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Building2 size={40} color="var(--c-text3)" style={{ margin: '0 auto 12px', display: 'block' }} />
          <div style={{ fontSize: 14, color: 'var(--c-text2)' }}>
            Inga objekt ännu. Lägg till portar via <strong>Portregister</strong> eller <strong>Montering</strong> och tilldela dem ett objekt.
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {platser.map(({ namn, portar, kund, adress, gs }) => (
          <div key={namn} className="card"
            style={{ cursor: 'pointer', transition: 'box-shadow 0.15s' }}
            onClick={() => onValjPlats(namn)}
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
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{namn}</div>
                <div style={{ fontSize: 12, color: 'var(--c-text2)' }}>
                  {kund}{adress ? ` · ${adress}` : ''}
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
        ))}
      </div>
    </div>
  )
}

// ── Huvudkomponent ────────────────────────────────────────────────────────────
export default function Objekt({ objekt = [] }) {
  const [valdPlatsNamn, setValdPlatsNamn] = useState(null)
  const [valdPort,      setValdPort]      = useState(null)

  // Härled platser från porter
  const befintligaNamn = [...new Set(objekt.map(o => o.plats).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'sv'))

  const platser = befintligaNamn.map(namn => {
    const portar = objekt.filter(o => o.plats === namn)
    return { namn, portar, kund: portar[0]?.kund || '', adress: portar[0]?.adress || '', gs: gruppsStatus(portar) }
  })

  const utanPlats = objekt.filter(o => !o.plats)
  if (utanPlats.length > 0) {
    platser.push({ namn: '— Ej tilldelat objekt', portar: utanPlats, kund: '', adress: '', gs: gruppsStatus(utanPlats) })
  }

  if (valdPort) return <PortDetalj obj={valdPort} onBack={() => setValdPort(null)} />

  if (valdPlatsNamn) {
    const portar = objekt.filter(o => (o.plats || '— Ej tilldelat objekt') === valdPlatsNamn)
    return (
      <PlatsDetalj
        platsNamn={valdPlatsNamn}
        portar={portar}
        onValjPort={p => setValdPort(p)}
        onBack={() => setValdPlatsNamn(null)}
      />
    )
  }

  return <PlatsLista platser={platser} onValjPlats={namn => setValdPlatsNamn(namn)} />
}
