import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// ── Hjälpfunktioner ───────────────────────────────────────────────────────────
function getMonday(d) {
  const date = new Date(d)
  const day  = date.getDay()
  date.setDate(date.getDate() - day + (day === 0 ? -6 : 1))
  date.setHours(0, 0, 0, 0)
  return date
}
function toYMD(d) { return d.toISOString().slice(0, 10) }
function getWeekNum(d) {
  const jan4 = new Date(d.getFullYear(), 0, 4)
  return Math.ceil(((d - jan4) / 86400000 + jan4.getDay() + 1) / 7)
}
function månNamn(d) {
  return d.toLocaleString('sv-SE', { month: 'long' })
}

// ── Konfiguration ─────────────────────────────────────────────────────────────
const DAGNAMN = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag']

const TYPE_CFG = {
  montage:  { label: 'Montage',   color: '#2563eb', bg: '#eff6ff', emoji: '🔵' },
  service:  { label: 'Service',   color: '#1D9E75', bg: 'rgba(29,158,117,0.08)', emoji: '🟢' },
  arende:   { label: 'Ärende',    color: '#ea580c', bg: '#fff7ed', emoji: '🟠' },
  akut:     { label: 'Akut',      color: '#dc2626', bg: '#fef2f2', emoji: '🔴' },
  kalender: { label: 'Händelse',  color: '#7c3aed', bg: '#faf5ff', emoji: '🟣' },
}

const TEK_COLORS = ['#2563eb', '#7c3aed', '#ea580c', '#0891b2', '#16a34a', '#b45309', '#db2777', '#0d9488']

// ── Eventkort ─────────────────────────────────────────────────────────────────
function EventKort({ ev, tekFärger, onClick }) {
  const s      = TYPE_CFG[ev.type]
  const tekFärg = ev.tekniker ? (tekFärger[ev.tekniker] || '#888') : null
  return (
    <div
      onClick={onClick}
      style={{ borderRadius: 7, padding: '7px 8px', marginBottom: 5, cursor: onClick ? 'pointer' : 'default',
        borderLeft: `3px solid ${s.color}`, background: s.bg, transition: 'filter 0.12s' }}
      onMouseEnter={e => onClick && (e.currentTarget.style.filter = 'brightness(0.95)')}
      onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
    >
      <div style={{ fontSize: 9, fontWeight: 700, color: s.color, textTransform: 'uppercase',
        letterSpacing: 0.3, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
        {ev.type === 'akut' && (
          <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%',
            background: '#dc2626', animation: 'blink 1s infinite' }} />
        )}
        {s.emoji} {s.label}
      </div>
      <div style={{ fontWeight: 700, fontSize: 11, color: 'var(--c-text)', lineHeight: 1.25 }}>{ev.title}</div>
      {ev.sub  && <div style={{ fontSize: 10, color: 'var(--c-text2)', marginTop: 1 }}>{ev.sub}</div>}
      {ev.typLabel && <div style={{ fontSize: 10, color: 'var(--c-text3)', marginTop: 1 }}>{ev.typLabel}</div>}
      {ev.tid  && <div style={{ fontSize: 9,  color: 'var(--c-text3)', marginTop: 2 }}>⏰ {ev.tid}</div>}
      {tekFärg && (
        <div style={{ fontSize: 10, marginTop: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: tekFärg, display: 'inline-block', flexShrink: 0 }} />
          <span style={{ color: tekFärg, fontWeight: 500 }}>{ev.tekniker}</span>
        </div>
      )}
    </div>
  )
}

// ── Huvud-komponent ───────────────────────────────────────────────────────────
export default function Planeringstavla({
  montageorder = [], arenden = [], bokningar = {},
  tekniker = [], kunder = [],
  onNavigeraArende, onNavigeraMontering,
}) {
  const [veckosta,  setVeckosta]  = useState(() => getMonday(new Date()))
  const [typFilter, setTypFilter] = useState({ montage: true, service: true, arende: true, akut: true, kalender: true })
  const [tekFilter, setTekFilter] = useState('alla')

  // Veckodagar mån–fre
  const dagar = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(veckosta)
    d.setDate(d.getDate() + i)
    return d
  })

  const idag    = toYMD(new Date())
  const veckaNr = getWeekNum(veckosta)
  const slutdag = new Date(veckosta); slutdag.setDate(slutdag.getDate() + 4)

  // Veckonavigering
  const prevVecka = () => setVeckosta(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })
  const nextVecka = () => setVeckosta(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })
  const tillIdag  = () => setVeckosta(getMonday(new Date()))

  // Tekniker → färg
  const tekFärger = {}
  tekniker.forEach((t, i) => { tekFärger[t] = TEK_COLORS[i % TEK_COLORS.length] })

  // ── Bygg events för ett datum ─────────────────────────────────────────────
  function eventsForDay(dag) {
    const ymd = toYMD(dag)
    const evs = []

    // Montageorder — onskat_montagedag
    if (typFilter.montage) {
      montageorder
        .filter(m => m.status !== 'utford' && m.onskat_montagedag === ymd)
        .forEach(m => evs.push({
          type: 'montage', id: 'm_' + m.id,
          title: m.ordernummer, sub: m.kund,
          typLabel: [m.porttyp, m.fabrikat].filter(Boolean).join(' · '),
          tekniker: m.tekniker || null, raw: m,
        }))
    }

    // Ärenden — besök-datum
    arenden
      .filter(a => a.status !== 'atgardad' && a.besok === ymd)
      .forEach(a => {
        const isAkut = a.prioritet === 'akut'
        if (isAkut  && !typFilter.akut)   return
        if (!isAkut && !typFilter.arende) return
        evs.push({
          type: isAkut ? 'akut' : 'arende', id: 'a_' + a.id,
          title: a.namn, sub: a.kund,
          typLabel: a.feltyp || null,
          tekniker: a.tekniker || null, raw: a,
        })
      })

    // Bokningar (kalender)
    ;(bokningar[ymd] || []).forEach((b, idx) => {
      const typ =
        b.typ === 'service' ? 'service' :
        b.typ === 'arende'  ? 'arende'  : 'kalender'
      if (!typFilter[typ]) return
      evs.push({
        type: typ, id: `b_${ymd}_${idx}`,
        title: b.namn, sub: b.kund || null,
        tid: b.tid || null,
        tekniker: Array.isArray(b.tek) ? b.tek[0] : (b.tek || null),
        raw: b,
      })
    })

    // Teknikerfilter
    if (tekFilter !== 'alla') return evs.filter(e => e.tekniker === tekFilter)
    return evs
  }

  // ── Oplanerade ────────────────────────────────────────────────────────────
  const oplanerade = [
    ...montageorder
      .filter(m => m.status === 'ej_planerad' || (m.status === 'planerad' && !m.onskat_montagedag))
      .map(m => ({
        type: 'montage', id: 'm_' + m.id,
        title: m.ordernummer, sub: m.kund,
        typLabel: m.porttyp, leverans: m.preliminar_leverans, raw: m,
      })),
    ...arenden
      .filter(a => a.status !== 'atgardad' && !a.besok)
      .map(a => ({
        type: a.prioritet === 'akut' ? 'akut' : 'arende', id: 'a_' + a.id,
        title: a.namn, sub: a.kund, typLabel: a.feltyp, raw: a,
      })),
  ]

  // ── Summering för veckan ──────────────────────────────────────────────────
  const alleEvents = dagar.flatMap(d => eventsForDay(d))
  const räkna = type => alleEvents.filter(e => e.type === type).length

  // Vecko-label
  const startStr = `${dagar[0].getDate()} ${månNamn(dagar[0]).slice(0,3)}`
  const slutStr  = `${slutdag.getDate()} ${månNamn(slutdag).slice(0,3)} ${slutdag.getFullYear()}`

  return (
    <div>
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:.25} }`}</style>

      {/* Rubrik */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 2 }}>Planeringstavla</h1>
          <p style={{ color: 'var(--c-text2)', fontSize: 13 }}>Samlad veckoöversikt — montage, service, ärenden och händelser</p>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn" onClick={prevVecka} style={{ display: 'flex', alignItems: 'center', padding: '6px 10px' }}>
          <ChevronLeft size={14} />
        </button>
        <span style={{ fontWeight: 700, fontSize: 14, minWidth: 200, textAlign: 'center' }}>
          v{veckaNr} · {startStr} – {slutStr}
        </span>
        <button className="btn" onClick={nextVecka} style={{ display: 'flex', alignItems: 'center', padding: '6px 10px' }}>
          <ChevronRight size={14} />
        </button>
        {toYMD(dagar[0]) !== toYMD(getMonday(new Date())) && (
          <button className="btn" style={{ fontSize: 11, color: 'var(--c-teal)', borderColor: 'var(--c-teal)' }} onClick={tillIdag}>
            Idag
          </button>
        )}
      </div>

      {/* Summering */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 9, marginBottom: 14 }}>
        {(['montage', 'service', 'arende', 'akut']).map(k => {
          const s = TYPE_CFG[k]
          return (
            <div key={k} style={{ background: 'var(--c-surface)', borderRadius: 9, border: '1px solid var(--c-border)', padding: '10px 14px' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{räkna(k)}</div>
              <div style={{ fontSize: 11, color: 'var(--c-text2)', marginTop: 1 }}>{s.emoji} {s.label} denna vecka</div>
            </div>
          )
        })}
      </div>

      {/* Typfilter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--c-text3)' }}>Visa:</span>
        {Object.entries(TYPE_CFG).map(([k, s]) => (
          <button key={k} onClick={() => setTypFilter(p => ({ ...p, [k]: !p[k] }))}
            style={{ padding: '3px 11px', borderRadius: 12, fontSize: 11, cursor: 'pointer',
              fontWeight: 600, border: `1.5px solid ${s.color}`,
              background: typFilter[k] ? s.color : 'transparent',
              color: typFilter[k] ? '#fff' : s.color }}>
            {s.emoji} {s.label}
          </button>
        ))}
      </div>

      {/* Teknikerfilter */}
      {tekniker.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--c-text3)' }}>Tekniker:</span>
          <button onClick={() => setTekFilter('alla')}
            style={{ padding: '3px 11px', borderRadius: 12, fontSize: 11, cursor: 'pointer', fontWeight: 600,
              background: tekFilter === 'alla' ? 'var(--c-teal)' : 'var(--c-surface)',
              color: tekFilter === 'alla' ? '#fff' : 'var(--c-text2)',
              border: tekFilter === 'alla' ? '1.5px solid var(--c-teal)' : '1px solid var(--c-border)' }}>
            Alla
          </button>
          {tekniker.map(t => (
            <button key={t} onClick={() => setTekFilter(tekFilter === t ? 'alla' : t)}
              style={{ padding: '3px 11px', borderRadius: 12, fontSize: 11, cursor: 'pointer', fontWeight: 600,
                border: `1.5px solid ${tekFärger[t] || '#888'}`,
                background: tekFilter === t ? tekFärger[t] || '#888' : 'transparent',
                color: tekFilter === t ? '#fff' : tekFärger[t] || '#888' }}>
              ● {t}
            </button>
          ))}
        </div>
      )}

      {/* Veckogrid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 9 }}>
        {dagar.map((dag, idx) => {
          const ymd    = toYMD(dag)
          const erIdag = ymd === idag
          const evs    = eventsForDay(dag)
          return (
            <div key={ymd} style={{
              background: 'var(--c-surface)',
              borderRadius: 10,
              border: `1px solid ${erIdag ? 'var(--c-teal)' : 'var(--c-border)'}`,
              boxShadow: erIdag ? '0 0 0 2px rgba(29,158,117,0.15)' : 'none',
              overflow: 'hidden', minHeight: 200,
            }}>
              {/* Dagrubrik */}
              <div style={{ padding: '9px 11px 8px', borderBottom: '1px solid var(--c-border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-text3)',
                    textTransform: 'uppercase', letterSpacing: 0.5 }}>{DAGNAMN[idx]}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.1,
                    color: erIdag ? 'var(--c-teal)' : 'var(--c-text)' }}>{dag.getDate()}</div>
                  <div style={{ fontSize: 9, color: 'var(--c-text3)', marginTop: 1 }}>
                    {evs.length > 0 ? `${evs.length} händels${evs.length !== 1 ? 'er' : 'e'}` : ''}
                  </div>
                </div>
                {erIdag && (
                  <span style={{ fontSize: 9, background: 'var(--c-teal-bg)', color: 'var(--c-teal)',
                    padding: '2px 7px', borderRadius: 8, fontWeight: 700, marginTop: 2 }}>Idag</span>
                )}
              </div>

              {/* Events */}
              <div style={{ padding: 7 }}>
                {evs.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '24px 4px', color: 'var(--c-text3)', fontSize: 11 }}>–</div>
                )}
                {evs.map(ev => (
                  <EventKort
                    key={ev.id}
                    ev={ev}
                    tekFärger={tekFärger}
                    onClick={
                      (ev.type === 'arende' || ev.type === 'akut') && onNavigeraArende
                        ? () => onNavigeraArende(ev.raw.id)
                        : ev.type === 'montage' && onNavigeraMontering
                          ? () => onNavigeraMontering(ev.raw)
                          : null
                    }
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Oplanerade */}
      {oplanerade.length > 0 && (
        <div style={{ marginTop: 14, background: 'var(--c-surface)', borderRadius: 10,
          border: '1px solid var(--c-border)', padding: '12px 14px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text3)',
            textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 9 }}>
            ⏳ Ej schemalagda ({oplanerade.length})
          </div>
          <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
            {oplanerade.map(ev => {
              const s = TYPE_CFG[ev.type]
              return (
                <div key={ev.id}
                  onClick={() => {
                    if ((ev.type === 'arende' || ev.type === 'akut') && onNavigeraArende) onNavigeraArende(ev.raw.id)
                    else if (ev.type === 'montage' && onNavigeraMontering) onNavigeraMontering(ev.raw)
                  }}
                  style={{ flex: '1 1 170px', maxWidth: 230, borderRadius: 7, padding: '8px 10px',
                    borderLeft: `3px solid ${s.color}`, background: s.bg, cursor: 'pointer',
                    transition: 'filter 0.12s' }}
                  onMouseEnter={e => e.currentTarget.style.filter = 'brightness(0.95)'}
                  onMouseLeave={e => e.currentTarget.style.filter = 'none'}
                >
                  <div style={{ fontSize: 9, fontWeight: 700, color: s.color,
                    textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 }}>{s.emoji} {s.label}</div>
                  <div style={{ fontWeight: 700, fontSize: 11 }}>{ev.title}</div>
                  {ev.sub      && <div style={{ fontSize: 10, color: 'var(--c-text2)', marginTop: 1 }}>{ev.sub}</div>}
                  {ev.typLabel && <div style={{ fontSize: 10, color: 'var(--c-text3)', marginTop: 1 }}>{ev.typLabel}</div>}
                  {ev.leverans && <div style={{ fontSize: 10, color: '#b45309', marginTop: 3 }}>📦 Leverans: {ev.leverans}</div>}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
