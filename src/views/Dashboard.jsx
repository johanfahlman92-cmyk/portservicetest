import { AlertCircle, Clock, ChevronRight } from 'lucide-react'

function getVeckonummer(datum) {
  const d = new Date(datum)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const v1 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(((d - v1) / 86400000 - 3 + ((v1.getDay() + 6) % 7)) / 7)
}

function getVeckansBokningar(bokningar) {
  const idag = new Date()
  const dag = idag.getDay()
  const diffTillMån = dag === 0 ? -6 : 1 - dag
  const måndag = new Date(idag)
  måndag.setDate(idag.getDate() + diffTillMån)
  const dagNamn = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre']
  const resultat = []
  for (let i = 0; i < 5; i++) {
    const d = new Date(måndag)
    d.setDate(måndag.getDate() + i)
    const nyckel = d.toISOString().slice(0, 10)
    for (const b of (bokningar[nyckel] || [])) {
      resultat.push({ dag: dagNamn[i] + ' ' + d.getDate() + '/' + (d.getMonth() + 1), namn: b.namn, kund: b.kund, tekniker: b.tek || '–', typ: b.typ })
    }
  }
  return resultat
}

function getLarm(objekt, arenden) {
  const larm = []
  for (const o of objekt) {
    if (o.status === 'forsenad') larm.push({ typ: 'red', text: `${o.namn}: serviceintervall passerat ${o.dagerForsenad || '?'} dagar sedan` })
    if (o.status === 'arende') larm.push({ typ: 'red', text: `${o.namn}: öppet ärende ej åtgärdat` })
  }
  for (const a of arenden) {
    if (a.status !== 'atgardad' && a.prioritet === 'akut') larm.push({ typ: 'red', text: `${a.namn}: akut felanmälan öppen` })
    if (a.status !== 'atgardad' && !a.tekniker) larm.push({ typ: 'amber', text: `${a.namn}: tekniker ej tilldelad` })
  }
  for (const o of objekt) {
    if (o.status === 'snart') larm.push({ typ: 'amber', text: `${o.namn}: service snart` })
  }
  return larm.slice(0, 6)
}

function getServiceGrad(objekt) {
  const typer = [
    { typ: 'Vikport',      color: 'var(--c-teal)' },
    { typ: 'Takskjutport', color: 'var(--c-blue)' },
    { typ: 'Lastbrygga',   color: 'var(--c-teal)' },
    { typ: 'Grind',        color: 'var(--c-amber)' },
  ]
  return typer.map(({ typ, color }) => {
    const fil = objekt.filter(o => o.typ === typ)
    if (!fil.length) return null
    const avg = Math.round(fil.reduce((s, o) => s + Math.max(0, 100 - (o.intervallProcent || 0)), 0) / fil.length)
    return { typ, pct: avg, color }
  }).filter(Boolean)
}

const typBadge = { service: 'badge-teal', felanmalan: 'badge-coral', montering: 'badge-purple' }
const typLabel = { service: 'Service', felanmalan: 'Felanmälan', montering: 'Montering' }

export default function Dashboard({ kunder = [], objekt = [], arenden = [], bokningar = {}, onNavigera }) {
  const idag = new Date()
  const år = idag.getFullYear()
  const veckonr = getVeckonummer(idag)
  const mThis = år + '-' + String(idag.getMonth() + 1).padStart(2, '0')

  const allaBokningar = Object.entries(bokningar).flatMap(([datum, items]) => items.map(b => ({ ...b, datum })))
  const serviceDennaMånad = allaBokningar.filter(b => b.datum.startsWith(mThis) && b.typ === 'service').length
  const öppnaArenden = arenden.filter(a => a.status !== 'atgardad').length
  const monteringar = allaBokningar.filter(b => b.datum.startsWith(mThis) && b.typ === 'montering').length

  const veckoSchema = getVeckansBokningar(bokningar)
  const larm = getLarm(objekt, arenden)
  const serviceGrad = getServiceGrad(objekt)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 2 }}>Översikt</h1>
        <p style={{ color: 'var(--c-text2)', fontSize: 13 }}>Vecka {veckonr}, {år}</p>
      </div>

      <div className="grid4">
        {[
          { label: 'Objekt totalt',         value: objekt.length,     sub: 'portar & grindar',   color: 'var(--c-text)',    nav: 'register' },
          { label: 'Service denna månad',   value: serviceDennaMånad, sub: 'planerade besök',    color: 'var(--c-blue)',    nav: 'kalender' },
          { label: 'Öppna ärenden',         value: öppnaArenden,      sub: 'kräver uppföljning', color: 'var(--c-red)',     nav: 'arenden' },
          { label: 'Monteringar (månaden)', value: monteringar,       sub: 'aktiva uppdrag',     color: 'var(--c-purple)',  nav: 'montering' },
        ].map(m => (
          <div key={m.label} className="metric-card"
            onClick={() => onNavigera?.(m.nav)}
            style={{ cursor: 'pointer', transition: 'box-shadow 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >
            <div className="metric-label">{m.label}</div>
            <div className="metric-value" style={{ color: m.color }}>{m.value}</div>
            <div className="metric-sub">{m.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid2">
        <div className="card">
          <div className="section-title">Servicegrad per porttyp</div>
          {serviceGrad.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--c-text2)' }}>Lägg till objekt i portregistret för att se servicegrad.</p>
          )}
          {serviceGrad.map(s => (
            <div key={s.typ} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                <span>{s.typ}</span><span style={{ color: 'var(--c-text2)' }}>{s.pct}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${s.pct}%`, background: s.color }} />
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="section-title">Larm & notiser</div>
          {larm.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--c-text2)' }}>Inga aktiva larm.</div>
          )}
          {larm.map((l, i) => (
            <div key={i} className={`info-box ${l.typ === 'red' ? 'info-red' : 'info-amber'}`} style={{ marginBottom: 6 }}>
              {l.typ === 'red'
                ? <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                : <Clock size={14} style={{ flexShrink: 0, marginTop: 1 }} />}
              <span>{l.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="section-title">Kommande besök – denna vecka</div>
        {veckoSchema.length === 0 && (
          <p style={{ color: 'var(--c-text2)', fontSize: 13 }}>Inga bokningar denna vecka. Lägg till i Kalender.</p>
        )}
        {veckoSchema.map((v, i) => (
          <div key={i} className="row-item">
            <span style={{ fontSize: 11, color: 'var(--c-text2)', minWidth: 70 }}>{v.dag}</span>
            <div className="row-main">
              <div className="row-name">{v.namn}</div>
              <div className="row-sub">{v.kund} · {v.tekniker}</div>
            </div>
            <span className={`badge ${typBadge[v.typ] || 'badge-gray'}`}>{typLabel[v.typ] || v.typ}</span>
            <ChevronRight size={16} color="var(--c-text3)" />
          </div>
        ))}
      </div>
    </div>
  )
}
