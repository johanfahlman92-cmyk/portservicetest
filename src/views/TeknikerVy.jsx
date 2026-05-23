import { useState } from 'react'
import { Calendar, AlertCircle, LogOut, Clock, CheckCircle, Play, ChevronDown, ChevronUp, MapPin } from 'lucide-react'
import logo from '../logo.png'

const prioritetConf = {
  akut:   { label: 'Akut',   badge: 'badge-red',   bar: 'var(--c-red)' },
  hog:    { label: 'Hög',    badge: 'badge-amber',  bar: 'var(--c-amber)' },
  normal: { label: 'Normal', badge: 'badge-blue',   bar: 'var(--c-blue)' },
}

const typColor = {
  service:    'var(--c-teal-bg)',
  felanmalan: 'var(--c-coral-bg)',
  montering:  'var(--c-purple-bg)',
}
const typText = {
  service:    'var(--c-teal-text)',
  felanmalan: 'var(--c-coral-text)',
  montering:  'var(--c-purple-text)',
}
const typLabel = {
  service:    'Service',
  felanmalan: 'Felanmälan',
  montering:  'Montering',
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

/* ── Statusprogression ── */
function StatusBar({ status }) {
  const steg = ['ny', 'pagAr', 'atgardad']
  const labels = { ny: 'Ny', pagAr: 'Pågår', atgardad: 'Klar' }
  const aktiv = steg.indexOf(status)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 14 }}>
      {steg.map((s, i) => (
        <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < steg.length - 1 ? 1 : 'none' }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: i <= aktiv ? 'var(--c-teal)' : 'var(--c-border)',
            color: i <= aktiv ? '#fff' : 'var(--c-text3)',
            fontSize: 11, fontWeight: 700,
            transition: 'background 0.2s',
          }}>
            {i < aktiv ? '✓' : i + 1}
          </div>
          <div style={{ fontSize: 10, color: i <= aktiv ? 'var(--c-teal-text)' : 'var(--c-text3)', marginLeft: 4, marginRight: i < steg.length - 1 ? 4 : 0, whiteSpace: 'nowrap', fontWeight: i === aktiv ? 600 : 400 }}>
            {labels[s]}
          </div>
          {i < steg.length - 1 && (
            <div style={{ flex: 1, height: 2, background: i < aktiv ? 'var(--c-teal)' : 'var(--c-border)', margin: '0 4px', transition: 'background 0.2s' }} />
          )}
        </div>
      ))}
    </div>
  )
}

/* ── Ärendekort ── */
function ArendeKort({ a, onUppdatera }) {
  const [utvidgad, setUtvidgad] = useState(false)
  const [sparar, setSparar] = useState(false)
  const [klarad, setKlarad] = useState(false)

  const starta = async () => {
    setSparar(true)
    await onUppdatera(a.id, { status: 'pagAr' })
    setSparar(false)
  }

  const markeraKlar = async () => {
    setSparar(true)
    await onUppdatera(a.id, { status: 'atgardad' })
    setKlarad(true)
    setSparar(false)
  }

  if (klarad) {
    return (
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--c-teal-bg)', border: '1px solid var(--c-teal)' }}>
        <CheckCircle size={24} color="var(--c-teal)" style={{ flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-teal-text)' }}>Ärende klart!</div>
          <div style={{ fontSize: 12, color: 'var(--c-teal-text)' }}>#{a.nr} · {a.kund}</div>
        </div>
      </div>
    )
  }

  const prio = prioritetConf[a.prioritet] || prioritetConf.normal

  return (
    <div className="card" style={{
      borderLeft: `4px solid ${prio.bar}`,
      padding: 0,
      overflow: 'hidden',
    }}>
      {/* Topprad */}
      <div
        onClick={() => setUtvidgad(v => !v)}
        style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 10 }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span className={`badge ${prio.badge}`} style={{ fontSize: 11 }}>{prio.label}</span>
            {a.typ && (
              <span style={{ fontSize: 11, background: typColor[a.typ] || 'var(--c-bg)', color: typText[a.typ] || 'var(--c-text2)', padding: '2px 8px', borderRadius: 10, fontWeight: 500 }}>
                {typLabel[a.typ] || a.typ}
              </span>
            )}
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{a.kund}</div>
          <div style={{ fontSize: 13, color: 'var(--c-text2)' }}>
            {a.namn && a.namn !== 'Okänd port' ? a.namn : a.feltyp || 'Felanmälan'}
          </div>
          {a.besok && (
            <div style={{ fontSize: 12, color: 'var(--c-blue-text)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={11} /> Planerat besök: {a.besok}
            </div>
          )}
        </div>
        <div style={{ color: 'var(--c-text3)', flexShrink: 0, paddingTop: 2 }}>
          {utvidgad ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </div>

      {/* Utvidgad del */}
      {utvidgad && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--c-border)' }}>
          <div style={{ paddingTop: 14 }}>
            <StatusBar status={a.status} />
          </div>

          {a.beskrivning && (
            <div style={{
              fontSize: 13, color: 'var(--c-text2)', lineHeight: 1.6,
              background: 'var(--c-bg)', borderRadius: 8, padding: '10px 12px',
              marginBottom: 14, fontStyle: 'italic',
            }}>
              "{a.beskrivning}"
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14, fontSize: 12 }}>
            <div style={{ background: 'var(--c-bg)', borderRadius: 8, padding: '8px 10px' }}>
              <div style={{ color: 'var(--c-text3)', marginBottom: 2 }}>Ärende</div>
              <div style={{ fontWeight: 600 }}>#{a.nr}</div>
            </div>
            <div style={{ background: 'var(--c-bg)', borderRadius: 8, padding: '8px 10px' }}>
              <div style={{ color: 'var(--c-text3)', marginBottom: 2 }}>Öppnad</div>
              <div style={{ fontWeight: 600 }}>{a.datum || '–'}</div>
            </div>
            {a.feltyp && (
              <div style={{ background: 'var(--c-bg)', borderRadius: 8, padding: '8px 10px', gridColumn: '1 / -1' }}>
                <div style={{ color: 'var(--c-text3)', marginBottom: 2 }}>Feltyp</div>
                <div style={{ fontWeight: 600 }}>{a.feltyp}</div>
              </div>
            )}
            {a.kontakt && (
              <div style={{ background: 'var(--c-bg)', borderRadius: 8, padding: '8px 10px', gridColumn: '1 / -1' }}>
                <div style={{ color: 'var(--c-text3)', marginBottom: 2 }}>Kontaktperson</div>
                <div style={{ fontWeight: 600 }}>{a.kontakt}</div>
              </div>
            )}
          </div>

          {/* Åtgärdsknappar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {a.status === 'ny' && (
              <button
                onClick={starta}
                disabled={sparar}
                style={{
                  width: '100%', padding: '13px', borderRadius: 10,
                  background: 'var(--c-blue)', color: '#fff',
                  border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  opacity: sparar ? 0.6 : 1,
                }}
              >
                <Play size={16} fill="#fff" /> {sparar ? 'Startar…' : 'Starta arbete'}
              </button>
            )}
            {(a.status === 'ny' || a.status === 'pagAr') && (
              <button
                onClick={markeraKlar}
                disabled={sparar}
                style={{
                  width: '100%', padding: '13px', borderRadius: 10,
                  background: 'var(--c-teal)', color: '#fff',
                  border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  opacity: sparar ? 0.6 : 1,
                }}
              >
                <CheckCircle size={16} /> {sparar ? 'Sparar…' : 'Markera klar'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Bokningskort ── */
function BokningsKort({ b }) {
  return (
    <div className="card" style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '14px 16px' }}>
      <div style={{
        background: typColor[b.typ] || 'var(--c-bg)',
        color: typText[b.typ] || 'var(--c-text2)',
        borderRadius: 10, padding: '8px 10px',
        fontSize: 15, fontWeight: 700,
        flexShrink: 0, minWidth: 56, textAlign: 'center', lineHeight: 1.2,
      }}>
        {b.tid || '–'}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 3 }}>{b.namn}</div>
        {b.kund && <div style={{ fontSize: 13, color: 'var(--c-text2)', marginBottom: 4 }}>{b.kund}</div>}
        <span className={`badge ${
          b.typ === 'service' ? 'badge-teal' :
          b.typ === 'felanmalan' ? 'badge-coral' : 'badge-purple'
        }`}>
          {typLabel[b.typ] || b.typ}
        </span>
      </div>
    </div>
  )
}

/* ── Huvudkomponent ── */
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

  const akutaUtanBokning = minaArenden.filter(a =>
    a.prioritet === 'akut' && !dagensBokningar.some(b => b.arendeId === a.id)
  )

  const klaraArenden = arenden
    .filter(a => a.tekniker === namn && a.status === 'atgardad')
    .slice(-5)
    .reverse()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-bg)', display: 'flex', flexDirection: 'column', paddingBottom: 68 }}>

      {/* Header */}
      <div style={{
        background: '#1C3461', padding: '12px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={logo} alt="NMV Portservice" style={{ height: 32 }} />
          {namn && (
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: 12 }}>
              {namn}
            </span>
          )}
        </div>
        <button
          onClick={onLoggaUt}
          style={{
            background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.65)',
            borderRadius: 7, padding: '6px 12px', fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <LogOut size={14} /> Logga ut
        </button>
      </div>

      {/* Innehåll */}
      <div style={{ flex: 1, padding: '20px 16px', overflowY: 'auto' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>

          {/* ── IDAG ── */}
          {flik === 'idag' && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, textTransform: 'capitalize' }}>
                  {formatDag(idag)}
                </h1>
                <p style={{ color: 'var(--c-text2)', fontSize: 14 }}>
                  {dagensBokningar.length === 0
                    ? 'Inga bokningar idag'
                    : `${dagensBokningar.length} bokning${dagensBokningar.length > 1 ? 'ar' : ''} schemalagda`}
                </p>
              </div>

              {/* Akuta ärenden utan bokning */}
              {akutaUtanBokning.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{
                    background: 'var(--c-red-bg)', border: '1px solid var(--c-red)',
                    borderRadius: 10, padding: '10px 14px', marginBottom: 10,
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <AlertCircle size={16} color="var(--c-red)" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-red-text)' }}>
                      {akutaUtanBokning.length} akut{akutaUtanBokning.length > 1 ? 'a ärenden' : 't ärende'} kräver åtgärd
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {akutaUtanBokning.map(a => (
                      <ArendeKort key={a.id} a={a} onUppdatera={onUppdateraArende} />
                    ))}
                  </div>
                </div>
              )}

              {/* Dagens bokningar */}
              {dagensBokningar.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '48px 20px' }}>
                  <Clock size={40} color="var(--c-text3)" style={{ margin: '0 auto 12px', display: 'block' }} />
                  <div style={{ fontSize: 15, color: 'var(--c-text2)', marginBottom: 6, fontWeight: 500 }}>Inga bokningar idag</div>
                  <div style={{ fontSize: 13, color: 'var(--c-text3)' }}>
                    Se dina tilldelade ärenden under <strong>Ärenden</strong>.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {dagensBokningar.map((b, i) => (
                    <BokningsKort key={i} b={b} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── ÄRENDEN ── */}
          {flik === 'arenden' && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Mina ärenden</h1>
                <p style={{ color: 'var(--c-text2)', fontSize: 14 }}>
                  {minaArenden.length === 0
                    ? 'Inga öppna ärenden tilldelade dig'
                    : `${minaArenden.length} öppna ärenden`}
                </p>
              </div>

              {minaArenden.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '48px 20px' }}>
                  <CheckCircle size={40} color="var(--c-teal)" style={{ margin: '0 auto 12px', display: 'block' }} />
                  <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--c-teal-text)', marginBottom: 4 }}>Allt klart!</div>
                  <div style={{ fontSize: 13, color: 'var(--c-text2)' }}>Inga öppna ärenden tilldelade dig.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {minaArenden.map(a => (
                    <ArendeKort key={a.id} a={a} onUppdatera={onUppdateraArende} />
                  ))}
                </div>
              )}

              {klaraArenden.length > 0 && (
                <div style={{ marginTop: 32 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--c-text3)', marginBottom: 10 }}>
                    Senast åtgärdade
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {klaraArenden.map(a => (
                      <div key={a.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 14px', background: 'var(--c-surface)', borderRadius: 10,
                        border: '1px solid var(--c-border)', opacity: 0.6,
                      }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>#{a.nr} · {a.kund}</div>
                          <div style={{ fontSize: 12, color: 'var(--c-text2)' }}>{a.feltyp} · {a.datum}</div>
                        </div>
                        <span className="badge badge-teal" style={{ fontSize: 11 }}>Klar</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Bottom navigation */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'var(--c-surface)',
        borderTop: '1px solid var(--c-border)',
        display: 'flex',
        zIndex: 100,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {[
          { id: 'idag',    icon: Calendar,    label: 'Idag',    badge: dagensBokningar.length },
          { id: 'arenden', icon: AlertCircle, label: 'Ärenden', badge: minaArenden.length },
        ].map(({ id, icon: Icon, label, badge }) => {
          const aktiv = flik === id
          return (
            <button
              key={id}
              onClick={() => setFlik(id)}
              style={{
                flex: 1, padding: '10px 0 8px',
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                color: aktiv ? 'var(--c-blue)' : 'var(--c-text3)',
                position: 'relative',
                transition: 'color 0.15s',
              }}
            >
              <Icon size={22} strokeWidth={aktiv ? 2.2 : 1.8} />
              <span style={{ fontSize: 10, fontWeight: aktiv ? 600 : 400 }}>{label}</span>
              {badge > 0 && (
                <span style={{
                  position: 'absolute', top: 6, right: 'calc(50% - 18px)',
                  background: 'var(--c-red)', color: '#fff',
                  fontSize: 9, fontWeight: 700,
                  padding: '1px 5px', borderRadius: 10, lineHeight: 1.4,
                  minWidth: 16, textAlign: 'center',
                }}>
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
