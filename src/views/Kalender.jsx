import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, X, AlertCircle, ChevronDown, ChevronUp, Filter, Check, Pencil, Trash2, ExternalLink } from 'lucide-react'
import KundVäljare from '../components/KundVäljare.jsx'

const typColor = { service: 'var(--c-teal-bg)', felanmalan: 'var(--c-coral-bg)', montering: 'var(--c-purple-bg)' }
const typBorder= { service: 'var(--c-teal)',    felanmalan: 'var(--c-coral)',    montering: 'var(--c-purple)' }
const typText  = { service: 'var(--c-teal-text)', felanmalan: 'var(--c-coral-text)', montering: 'var(--c-purple-text)' }
const typLabel = { service: 'Service', felanmalan: 'Felanmälan', montering: 'Montering' }
const DAG_NAMN = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre']

const HOUR_START  = 7
const HOUR_END    = 16
const HOURS       = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i)
const HOUR_HEIGHT = 64

function getTop(tid) {
  const [h, m] = (tid || '08:00').split(':').map(Number)
  const top = (h - HOUR_START) * HOUR_HEIGHT + (m / 60) * HOUR_HEIGHT
  return Math.max(0, Math.min(top, (HOURS.length - 1) * HOUR_HEIGHT))
}

function getMåndag(offset) {
  const idag = new Date()
  const dag  = idag.getDay()
  const diff = dag === 0 ? -6 : 1 - dag
  const mn   = new Date(idag)
  mn.setDate(idag.getDate() + diff + offset * 7)
  mn.setHours(0, 0, 0, 0)
  return mn
}

function getVeckonummer(datum) {
  const d = new Date(datum)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const v1 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(((d - v1) / 86400000 - 3 + ((v1.getDay() + 6) % 7)) / 7)
}

function formatDatum(d) {
  return d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })
}

// ── Tekniker-väljare (flerval med chip-knappar) ───────
function TeknikerVäljare({ tekniker, value = [], onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {tekniker.map(t => {
        const vald = value.includes(t)
        return (
          <button
            key={t}
            type="button"
            onClick={() => onChange(vald ? value.filter(x => x !== t) : [...value, t])}
            style={{
              padding: '4px 12px', fontSize: 12, borderRadius: 20, cursor: 'pointer',
              border: `1px solid ${vald ? 'var(--c-navy)' : 'var(--c-border2)'}`,
              background: vald ? 'var(--c-blue-bg)' : 'transparent',
              color: vald ? 'var(--c-navy)' : 'var(--c-text2)',
              display: 'flex', alignItems: 'center', gap: 4,
              transition: 'all 0.15s',
            }}
          >
            {vald && <Check size={11} />}{t}
          </button>
        )
      })}
      {tekniker.length === 0 && (
        <span style={{ fontSize: 12, color: 'var(--c-text3)' }}>
          Inga medarbetare registrerade — lägg till i Inställningar.
        </span>
      )}
    </div>
  )
}

// ── Händelsepopup ─────────────────────────────────────
function HändelseDetalj({ val, onRedigera, onTaBort, onGåTillÄrende, onStäng }) {
  const { item, dagNamn, nyckel } = val
  const tekArr = Array.isArray(item.tek) ? item.tek : (item.tek ? [item.tek] : [])

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
      onClick={onStäng}>
      <div className="card" style={{ width: 320, padding: 20 }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', marginBottom: 3 }}>
              {dagNamn} {nyckel?.slice(5).replace('-', '/')} · {item.tid}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.3 }}>{item.namn}</div>
            {item.kund && <div style={{ fontSize: 13, color: 'var(--c-text2)', marginTop: 2 }}>{item.kund}</div>}
          </div>
          <button onClick={onStäng} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text3)', padding: 2 }}>
            <X size={16} />
          </button>
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          <span className={`badge ${
            item.typ === 'service' ? 'badge-teal' :
            item.typ === 'felanmalan' ? 'badge-coral' : 'badge-purple'
          }`}>{typLabel[item.typ] || item.typ}</span>
          {tekArr.length > 0 && (
            <span className="badge badge-gray">{tekArr.join(', ')}</span>
          )}
        </div>

        {/* Knappar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {item.arendeId && (
            <button
              onClick={onGåTillÄrende}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8,
                background: 'var(--c-blue)', color: '#fff', border: 'none',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              }}
            >
              <ExternalLink size={14} /> Gå till ärende
            </button>
          )}
          <button
            onClick={onRedigera}
            className="btn"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
          >
            <Pencil size={13} /> Redigera bokning
          </button>
          <button
            onClick={onTaBort}
            style={{
              width: '100%', padding: '8px 14px', borderRadius: 8,
              background: 'none', border: '1px solid var(--c-border)',
              color: 'var(--c-red)', cursor: 'pointer', fontSize: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}
          >
            <Trash2 size={13} /> Ta bort bokning
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Ny/redigera bokning ────────────────────────────────
function BokningForm({ initial, dag, dagar, arenden, tekniker, kunder = [], onNyKund, onSpara, onAvbryt }) {
  const redigering = !!initial
  const [typ,  setTyp]  = useState(initial?.typ  || 'service')
  const [tid,  setTid]  = useState(initial?.tid  || '08:00')
  const [namn, setNamn] = useState(initial?.namn || '')
  const [kund, setKund] = useState(initial?.kund || '')
  const [tek,  setTek]  = useState(initial?.tek  || [])
  const [datum,setDatum]= useState(initial?.datum || (dagar[0]?.nyckel || ''))
  const [valdArende, setValdArende] = useState('')
  const [fel, setFel]   = useState(false)

  const oppnaArenden = arenden.filter(a => a.typ === 'felanmalan' && a.status !== 'atgardad')

  const valjArende = (id) => {
    setValdArende(id)
    const a = arenden.find(x => x.id === id)
    if (a) { setNamn(a.namn || ''); setKund(a.kund || '') }
  }

  const submit = () => {
    if (!namn.trim()) { setFel(true); return }
    onSpara(datum, { tid, typ, namn: namn.trim(), kund: kund.trim(), tek, arendeId: initial?.arendeId || valdArende || null })
  }

  const inp = { width: '100%', padding: '6px 10px', fontSize: 12, border: '1px solid var(--c-border2)', borderRadius: 6, background: 'var(--c-bg)', color: 'var(--c-text)' }
  const lbl = { fontSize: 11, color: 'var(--c-text2)', marginBottom: 3, display: 'block' }
  const fld = { marginBottom: 10 }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div className="card" style={{ width: 420, padding: 20, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{redigering ? 'Redigera bokning' : `Ny bokning${dag ? ` – ${dag}` : ''}`}</div>
          <button className="btn" onClick={onAvbryt} style={{ padding: '3px 7px' }}><X size={13} /></button>
        </div>

        {redigering && (
          <div style={fld}>
            <label style={lbl}>Dag</label>
            <select value={datum} onChange={e => setDatum(e.target.value)} style={inp}>
              {dagar.map(d => <option key={d.nyckel} value={d.nyckel}>{d.namn} {d.nyckel.slice(5).replace('-', '/')}</option>)}
            </select>
          </div>
        )}

        {!redigering && oppnaArenden.length > 0 && (
          <div style={fld}>
            <label style={lbl}>Kopplad felanmälan (valfritt)</label>
            <select value={valdArende} onChange={e => valjArende(e.target.value)} style={inp}>
              <option value="">– Ingen –</option>
              {oppnaArenden.map(a => <option key={a.id} value={a.id}>#{a.nr} · {a.namn} · {a.kund}</option>)}
            </select>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
          <div style={fld}>
            <label style={lbl}>Tid</label>
            <input type="time" value={tid} onChange={e => setTid(e.target.value)} style={inp} />
          </div>
          <div style={fld}>
            <label style={lbl}>Typ</label>
            <select value={typ} onChange={e => setTyp(e.target.value)} style={inp}>
              <option value="service">Service</option>
              <option value="felanmalan">Felanmälan</option>
              <option value="montering">Montering</option>
            </select>
          </div>
          <div style={{ ...fld, gridColumn: '1 / -1' }}>
            <label style={lbl}>Objekt / beskrivning *</label>
            <input type="text" placeholder="t.ex. Vikport – Lager A" value={namn}
              onChange={e => setNamn(e.target.value)}
              style={{ ...inp, borderColor: fel && !namn.trim() ? 'var(--c-red)' : undefined }} />
          </div>
          <div style={{ ...fld, gridColumn: '1 / -1' }}>
            <label style={lbl}>Kund</label>
            <KundVäljare kunder={kunder} value={kund} onChange={setKund} onNyKund={onNyKund} style={inp} />
          </div>
          <div style={{ ...fld, gridColumn: '1 / -1' }}>
            <label style={lbl}>Medarbetare</label>
            <TeknikerVäljare tekniker={tekniker} value={tek} onChange={setTek} />
          </div>
        </div>

        {fel && <div style={{ fontSize: 11, color: 'var(--c-red)', marginBottom: 10 }}>Fyll i objekt/beskrivning.</div>}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button className="btn btn-primary" onClick={submit} style={{ fontSize: 12 }}><Plus size={13} /> Spara</button>
          <button className="btn" onClick={onAvbryt} style={{ fontSize: 12 }}>Avbryt</button>
        </div>
      </div>
    </div>
  )
}

// ── Boka in felanmälan-dialog ────────────────────────
function BokArendeDialog({ arende, dagar, tekniker, onSpara, onAvbryt }) {
  const [datum, setDatum] = useState(dagar[0]?.nyckel || '')
  const [tid,   setTid]   = useState('08:00')
  const [tek,   setTek]   = useState([])

  const inp = { width: '100%', padding: '6px 10px', fontSize: 12, border: '1px solid var(--c-border2)', borderRadius: 6, background: 'var(--c-bg)', color: 'var(--c-text)' }
  const lbl = { fontSize: 11, color: 'var(--c-text2)', marginBottom: 3, display: 'block' }

  const submit = () => {
    if (!datum) return
    onSpara(datum, { tid, typ: 'felanmalan', namn: arende.namn || 'Okänd port', kund: arende.kund || '', tek, arendeId: arende.id })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div className="card" style={{ width: 380, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Boka in felanmälan</div>
          <button className="btn" onClick={onAvbryt} style={{ padding: '3px 7px' }}><X size={13} /></button>
        </div>
        <div style={{ background: 'var(--c-coral-bg)', borderRadius: 8, padding: '9px 12px', marginBottom: 14, fontSize: 12, color: 'var(--c-coral-text)' }}>
          <div style={{ fontWeight: 600 }}>#{arende.nr} · {arende.feltyp}</div>
          <div>{arende.kund}{arende.namn ? ` · ${arende.namn}` : ''}</div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={lbl}>Dag</label>
          <select value={datum} onChange={e => setDatum(e.target.value)} style={inp}>
            {dagar.map(d => <option key={d.nyckel} value={d.nyckel}>{d.namn} {d.nyckel.slice(5).replace('-', '/')}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={lbl}>Tid</label>
          <input type="time" value={tid} onChange={e => setTid(e.target.value)} style={inp} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Medarbetare</label>
          <TeknikerVäljare tekniker={tekniker} value={tek} onChange={setTek} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={submit} style={{ fontSize: 12 }}><Plus size={13} /> Boka in</button>
          <button className="btn" onClick={onAvbryt} style={{ fontSize: 12 }}>Avbryt</button>
        </div>
      </div>
    </div>
  )
}

// ── Huvudkomponent ─────────────────────────────────────
export default function Kalender({
  arenden = [], tekniker = [], bokningar = {}, kunder = [],
  onLaggTillBokning, onTaBortBokning, onNyKund, onNavigera, onNavigeraArende,
}) {
  const [veckoOffset,  setVeckoOffset]  = useState(0)
  const [formDag,      setFormDag]      = useState(null)
  const [redigerar,    setRedigerar]    = useState(null)
  const [bokArende,    setBokArende]    = useState(null)
  const [visaObokade,  setVisaObokade]  = useState(true)
  const [filtTekniker, setFiltTekniker] = useState('')
  const [visaDetalj,   setVisaDetalj]   = useState(null)

  const måndag  = getMåndag(veckoOffset)
  const veckonr = getVeckonummer(måndag)

  const dagar = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(måndag)
    d.setDate(måndag.getDate() + i)
    return { namn: DAG_NAMN[i], datum: d, nyckel: d.toISOString().slice(0, 10) }
  })

  const allaBokFlatMap = Object.values(bokningar).flat()
  const bokadeIds      = new Set(allaBokFlatMap.map(b => b.arendeId).filter(Boolean))
  const obokade        = arenden.filter(a => a.typ === 'felanmalan' && a.status !== 'atgardad' && !bokadeIds.has(a.id))

  const sparaNyBokning = (datum, bokning) => {
    onLaggTillBokning(datum, bokning)
    setFormDag(null)
  }

  const sparaRedigering = (nyttDatum, nyBokning) => {
    onTaBortBokning(redigerar.datum, redigerar.origIdx)
    onLaggTillBokning(nyttDatum, nyBokning)
    setRedigerar(null)
  }

  const bokaNed = (datum, bokning) => {
    onLaggTillBokning(datum, bokning)
    setBokArende(null)
  }

  const friStart = dagar[0] ? formatDatum(dagar[0].datum) : ''
  const friSlut  = dagar[4] ? formatDatum(dagar[4].datum) : ''
  const prioritetDot = { akut: 'var(--c-red)', hog: 'var(--c-amber)', normal: 'var(--c-blue)' }

  return (
    <div>
      {/* Rubrik + navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 2 }}>Kalender</h1>
          <p style={{ color: 'var(--c-text2)', fontSize: 13 }}>Vecka {veckonr} · {friStart}–{friSlut}</p>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button className="btn" onClick={() => setVeckoOffset(v => v - 1)} style={{ padding: '6px 10px' }}><ChevronLeft size={15} /></button>
          {veckoOffset !== 0 && <button className="btn" onClick={() => setVeckoOffset(0)} style={{ fontSize: 12 }}>Idag</button>}
          <button className="btn" onClick={() => setVeckoOffset(v => v + 1)} style={{ padding: '6px 10px' }}><ChevronRight size={15} /></button>
        </div>
      </div>

      {/* Filtrera medarbetare */}
      {tekniker.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <Filter size={13} color="var(--c-text3)" />
          <select value={filtTekniker} onChange={e => setFiltTekniker(e.target.value)}
            style={{ padding: '5px 10px', fontSize: 12, border: '1px solid var(--c-border)', borderRadius: 6, background: 'var(--c-surface)', color: 'var(--c-text)' }}>
            <option value="">Alla medarbetare</option>
            {tekniker.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      )}

      {/* Ej inbokade felanmälningar */}
      {obokade.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <button onClick={() => setVisaObokade(v => !v)} style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            background: 'var(--c-coral-bg)', border: '1px solid #f0c0b0',
            borderRadius: visaObokade ? '10px 10px 0 0' : 10,
            padding: '10px 14px', cursor: 'pointer',
            color: 'var(--c-coral-text)', fontSize: 13, fontWeight: 500,
          }}>
            <AlertCircle size={15} />
            <span style={{ flex: 1, textAlign: 'left' }}>
              {obokade.length} ej inbokad{obokade.length > 1 ? 'e' : ''} felanmälan{obokade.length > 1 ? '' : ''}
            </span>
            {visaObokade ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {visaObokade && (
            <div style={{ background: 'var(--c-surface)', border: '1px solid #f0c0b0', borderTop: 'none', borderRadius: '0 0 10px 10px', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {obokade.map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 8, background: 'var(--c-bg)', border: '1px solid var(--c-border)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: prioritetDot[a.prioritet] || 'var(--c-blue)' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>#{a.nr} · {a.feltyp}</div>
                    <div style={{ fontSize: 11, color: 'var(--c-text2)' }}>{a.kund}{a.namn ? ` · ${a.namn}` : ''}</div>
                  </div>
                  <button className="btn btn-primary" style={{ fontSize: 11, padding: '4px 10px', flexShrink: 0 }} onClick={() => setBokArende(a)}>
                    + Boka in
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tidsgrid */}
      <div style={{ border: '1px solid var(--c-border)', borderRadius: 12, overflow: 'hidden', background: 'var(--c-surface)' }}>
        {/* Dagheader */}
        <div style={{ display: 'flex', borderBottom: '2px solid var(--c-border)' }}>
          <div style={{ width: 52, flexShrink: 0, borderRight: '1px solid var(--c-border)' }} />
          {dagar.map(dag => (
            <div key={dag.nyckel} style={{ flex: 1, padding: '8px 4px', textAlign: 'center', borderLeft: '1px solid var(--c-border)' }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{dag.namn}</div>
              <div style={{ fontSize: 11, color: 'var(--c-text3)', marginBottom: 4 }}>{formatDatum(dag.datum)}</div>
              <button onClick={() => setFormDag(dag.namn)} className="btn"
                style={{ fontSize: 10, padding: '2px 8px', display: 'inline-flex', gap: 3 }}>
                <Plus size={10} /> Lägg till
              </button>
            </div>
          ))}
        </div>

        {/* Tidsaxel + kolumner */}
        <div style={{ display: 'flex', overflowY: 'auto', maxHeight: 680 }}>
          <div style={{ width: 52, flexShrink: 0, borderRight: '1px solid var(--c-border)', background: 'var(--c-surface)' }}>
            {HOURS.map((h, hi) => (
              <div key={h} style={{
                height: HOUR_HEIGHT, fontSize: 10, color: 'var(--c-text3)',
                textAlign: 'right', paddingRight: 8, paddingTop: 4,
                borderTop: hi === 0 ? 'none' : '1px solid var(--c-border)',
              }}>
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {dagar.map(dag => {
            const items = bokningar[dag.nyckel] || []
            return (
              <div key={dag.nyckel} style={{ flex: 1, position: 'relative', borderLeft: '1px solid var(--c-border)' }}>
                {HOURS.map((h, hi) => (
                  <div key={h} style={{ height: HOUR_HEIGHT, borderTop: hi === 0 ? 'none' : '1px solid var(--c-border)', boxSizing: 'border-box' }} />
                ))}
                {items.map((item, origIdx) => {
                  const tekArr = Array.isArray(item.tek) ? item.tek : (item.tek ? [item.tek] : [])
                  if (filtTekniker && !tekArr.includes(filtTekniker)) return null
                  return (
                    <div key={origIdx}
                      onClick={() => setVisaDetalj({ item: { ...item, tek: tekArr }, dagNamn: dag.namn, nyckel: dag.nyckel, origIdx })}
                      style={{
                        position: 'absolute',
                        top: getTop(item.tid) + 2,
                        left: 3, right: 3,
                        minHeight: HOUR_HEIGHT - 6,
                        background: typColor[item.typ] || 'var(--c-blue-bg)',
                        borderLeft: `3px solid ${typBorder[item.typ] || 'var(--c-blue)'}`,
                        borderRadius: '0 6px 6px 0',
                        padding: '3px 6px',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        zIndex: 2,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                      }}
                    >
                      <div style={{ fontSize: 10, color: typText[item.typ], fontWeight: 700, marginBottom: 1 }}>{item.tid} · {typLabel[item.typ] || item.typ}</div>
                      <div style={{ fontSize: 11, fontWeight: 500, lineHeight: 1.2, paddingRight: 14 }}>{item.namn}</div>
                      {item.kund && <div style={{ fontSize: 10, color: 'var(--c-text2)' }}>{item.kund}</div>}
                      {tekArr.length > 0 && (
                        <div style={{ fontSize: 10, color: 'var(--c-text2)', marginTop: 1 }}>
                          {tekArr.join(', ')}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Dialoger */}
      {formDag && (
        <BokningForm
          dag={formDag}
          dagar={dagar.filter(d => d.namn === formDag)}
          arenden={arenden}
          tekniker={tekniker}
          kunder={kunder}
          onNyKund={onNyKund}
          onSpara={(datum, b) => { onLaggTillBokning(datum, b); setFormDag(null) }}
          onAvbryt={() => setFormDag(null)}
        />
      )}

      {redigerar && (
        <BokningForm
          initial={redigerar}
          dagar={dagar}
          arenden={arenden}
          tekniker={tekniker}
          kunder={kunder}
          onNyKund={onNyKund}
          onSpara={sparaRedigering}
          onAvbryt={() => setRedigerar(null)}
        />
      )}

      {bokArende && (
        <BokArendeDialog arende={bokArende} dagar={dagar} tekniker={tekniker} onSpara={bokaNed} onAvbryt={() => setBokArende(null)} />
      )}

      {visaDetalj && (
        <HändelseDetalj
          val={visaDetalj}
          onStäng={() => setVisaDetalj(null)}
          onRedigera={() => {
            setRedigerar({ ...visaDetalj.item, datum: visaDetalj.nyckel, origIdx: visaDetalj.origIdx })
            setVisaDetalj(null)
          }}
          onTaBort={() => {
            onTaBortBokning(visaDetalj.nyckel, visaDetalj.origIdx)
            setVisaDetalj(null)
          }}
          onGåTillÄrende={() => {
            setVisaDetalj(null)
            if (onNavigeraArende && visaDetalj.item.arendeId) onNavigeraArende(visaDetalj.item.arendeId)
            else onNavigera?.('arenden')
          }}
        />
      )}
    </div>
  )
}
