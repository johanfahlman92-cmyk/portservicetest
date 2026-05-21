import { useState } from 'react'
import { Calendar, AlertCircle, FileText, LogOut, Clock } from 'lucide-react'
import logo from '../logo.png'
import Protokoll from './Protokoll.jsx'

const prioritetConf = {
  akut:   { label: 'Akut',   badge: 'badge-red' },
  hog:    { label: 'Hög',    badge: 'badge-amber' },
  normal: { label: 'Normal', badge: 'badge-blue' },
}

const typColor = {
  service:     'var(--c-teal-bg)',
  felanmalan:  'var(--c-coral-bg)',
  montering:   'var(--c-purple-bg)',
}
const typText = {
  service:     'var(--c-teal-text)',
  felanmalan:  'var(--c-coral-text)',
  montering:   'var(--c-purple-text)',
}
const typLabel = {
  service:     'Service',
  felanmalan:  'Felanmälan',
  montering:   'Montering',
}

function formatDag(datumStr) {
  try {
    const [y, m, d] = datumStr.split('-').map(Number)
    const dato = new Date(y, m - 1, d)
    return dato.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })
  } catch {
    return datumStr
  }
}

export default function TeknikerVy({
  namn = '',
  arenden = [],
  bokningar = {},
  objekt = [],
  tekniker = [],
  onUppdateraArende,
  onUppdateraObjekt,
  onLoggaUt,
}) {
  const [flik, setFlik] = useState('idag')

  const idag = new Date().toISOString().slice(0, 10)

  const dagensBokningar = (bokningar[idag] || [])
    .filter(b => !namn || b.tek === namn)
    .slice()
    .sort((a, b) => (a.tid || '').localeCompare(b.tid || ''))

  const minaArenden = arenden
    .filter(a => a.tekniker === namn && a.status !== 'atgardad')
    .slice()
    .sort((a, b) => {
      const p = { akut: 0, hog: 1, normal: 2 }
      return (p[a.prioritet] ?? 2) - (p[b.prioritet] ?? 2)
    })

  const klaraArenden = arenden
    .filter(a => a.tekniker === namn && a.status === 'atgardad')
    .slice(-5)
    .reverse()

  const flikBtn = (id, icon, label, badge) => (
    <button
      onClick={() => setFlik(id)}
      style={{
        flex: 1,
        padding: '12px 0',
        fontSize: 14,
        fontWeight: flik === id ? 600 : 400,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        borderBottom: `2px solid ${flik === id ? 'var(--c-blue)' : 'transparent'}`,
        color: flik === id ? 'var(--c-text)' : 'var(--c-text2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        transition: 'all 0.15s',
      }}
    >
      {icon}
      {label}
      {badge > 0 && (
        <span style={{ background: 'var(--c-red)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 10 }}>
          {badge}
        </span>
      )}
    </button>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{
        background: '#1a1917', padding: '14px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img src={logo} alt="NMV Portservice" style={{ height: 38 }} />
          {namn && (
            <span style={{ color: '#9a9890', fontSize: 13, borderLeft: '1px solid #333', paddingLeft: 14 }}>
              {namn}
            </span>
          )}
        </div>
        <button
          onClick={onLoggaUt}
          style={{
            background: 'none', border: '1px solid #444', color: '#9a9890',
            borderRadius: 7, padding: '6px 12px', fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <LogOut size={14} /> Logga ut
        </button>
      </div>

      {/* Flikrad */}
      <div style={{
        background: 'var(--c-surface)', borderBottom: '1px solid var(--c-border)',
        display: 'flex', padding: '0 20px', flexShrink: 0,
      }}>
        {flikBtn('idag',      <Calendar   size={14} />, 'Idag',     0)}
        {flikBtn('arenden',   <AlertCircle size={14} />, 'Ärenden',  minaArenden.length)}
        {flikBtn('protokoll', <FileText   size={14} />, 'Protokoll', 0)}
      </div>

      {/* Innehåll */}
      <div style={{ flex: 1, padding: '24px 16px', overflowY: 'auto' }}>
        <div style={{ maxWidth: 620, margin: '0 auto' }}>

          {/* ── IDAG ── */}
          {flik === 'idag' && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4, textTransform: 'capitalize' }}>
                  {formatDag(idag)}
                </h1>
                <p style={{ color: 'var(--c-text2)', fontSize: 13 }}>
                  {dagensBokningar.length === 0
                    ? 'Inga bokningar idag.'
                    : `${dagensBokningar.length} bokning${dagensBokningar.length > 1 ? 'ar' : ''} idag`}
                </p>
              </div>

              {dagensBokningar.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <Clock size={36} color="var(--c-text3)" style={{ margin: '0 auto 12px', display: 'block' }} />
                  <div style={{ fontSize: 14, color: 'var(--c-text2)', marginBottom: 6 }}>Inga bokningar idag</div>
                  <div style={{ fontSize: 12, color: 'var(--c-text3)' }}>
                    Kolla i Ärenden om du har öppna felanmälningar.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {dagensBokningar.map((b, i) => (
                    <div key={i} className="card" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{
                        background: typColor[b.typ] || 'var(--c-bg)',
                        color: typText[b.typ] || 'var(--c-text2)',
                        borderRadius: 8, padding: '6px 10px',
                        fontSize: 13, fontWeight: 700,
                        flexShrink: 0, minWidth: 52, textAlign: 'center',
                      }}>
                        {b.tid}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 3 }}>{b.namn}</div>
                        {b.kund && <div style={{ fontSize: 12, color: 'var(--c-text2)' }}>{b.kund}</div>}
                        <span className={`badge ${
                          b.typ === 'service' ? 'badge-teal' :
                          b.typ === 'felanmalan' ? 'badge-coral' : 'badge-purple'
                        }`} style={{ marginTop: 6 }}>
                          {typLabel[b.typ] || b.typ}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── ÄRENDEN ── */}
          {flik === 'arenden' && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Mina ärenden</h1>
                <p style={{ color: 'var(--c-text2)', fontSize: 13 }}>
                  {minaArenden.length} öppna ärenden tilldelade dig
                </p>
              </div>

              {minaArenden.length === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ fontSize: 14, color: 'var(--c-text2)' }}>Inga öppna ärenden tilldelade dig.</div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {minaArenden.map(a => (
                  <div key={a.id} className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>
                          #{a.nr} · {a.feltyp || 'Felanmälan'}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--c-text2)', marginTop: 2 }}>
                          {a.kund}{a.namn && a.namn !== a.feltyp ? ` · ${a.namn}` : ''}
                        </div>
                      </div>
                      <span className={`badge ${prioritetConf[a.prioritet]?.badge || 'badge-gray'}`}>
                        {prioritetConf[a.prioritet]?.label || a.prioritet || '–'}
                      </span>
                    </div>

                    {a.beskrivning && (
                      <div style={{
                        fontSize: 12, color: 'var(--c-text2)', marginBottom: 10,
                        padding: '7px 10px', background: 'var(--c-bg)', borderRadius: 6, lineHeight: 1.5,
                      }}>
                        {a.beskrivning}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      {a.status === 'ny' && (
                        <button
                          className="btn"
                          style={{ fontSize: 12 }}
                          onClick={() => onUppdateraArende(a.id, { status: 'pagAr' })}
                        >
                          ▶ Starta
                        </button>
                      )}
                      {a.status === 'pagAr' && (
                        <span className="badge badge-amber">Pågår</span>
                      )}
                      <button
                        className="btn btn-teal"
                        style={{ fontSize: 12 }}
                        onClick={() => onUppdateraArende(a.id, { status: 'atgardad' })}
                      >
                        ✓ Markera klar
                      </button>
                      <span style={{ fontSize: 11, color: 'var(--c-text3)', marginLeft: 'auto' }}>
                        {a.datum}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {klaraArenden.length > 0 && (
                <div style={{ marginTop: 28 }}>
                  <div className="divider">Senast åtgärdade</div>
                  {klaraArenden.map(a => (
                    <div key={a.id} className="row-item" style={{ opacity: 0.55 }}>
                      <div className="row-main">
                        <div className="row-name">#{a.nr} · {a.kund}</div>
                        <div className="row-sub">{a.feltyp} · {a.datum}</div>
                      </div>
                      <span className="badge badge-teal" style={{ fontSize: 10 }}>Åtgärdad</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── PROTOKOLL ── */}
          {flik === 'protokoll' && (
            <Protokoll
              objekt={objekt}
              tekniker={tekniker}
              onUppdateraObjekt={onUppdateraObjekt}
            />
          )}

        </div>
      </div>
    </div>
  )
}
