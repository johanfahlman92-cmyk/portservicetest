import { useState } from 'react'
import { AlertCircle, Clock, ChevronRight, DoorOpen, Users, CalendarDays, FileText, Wrench, CheckCircle, X } from 'lucide-react'

// ── Hjälpfunktioner ───────────────────────────────────────────────────────────
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
      resultat.push({ dag: dagNamn[i] + ' ' + d.getDate() + '/' + (d.getMonth() + 1), namn: b.namn, kund: b.kund, tekniker: b.tek || '–', typ: b.typ, datum: nyckel })
    }
  }
  return resultat
}

function getLarm(objekt, arenden) {
  const larm = []
  for (const o of objekt) {
    if (o.arkiverad) continue
    if (o.status === 'forsenad') larm.push({ typ: 'red',   text: `${o.namn}: serviceintervall passerat ${o.dagerForsenad || '?'} dagar sedan` })
    if (o.status === 'arende')   larm.push({ typ: 'red',   text: `${o.namn}: öppet ärende ej åtgärdat` })
  }
  for (const a of arenden) {
    if (a.status !== 'atgardad' && a.prioritet === 'akut')  larm.push({ typ: 'red',   text: `Ärende #${a.nr}: akut felanmälan – ${a.kund}` })
    if (a.status !== 'atgardad' && !a.tekniker)              larm.push({ typ: 'amber', text: `${a.namn}: tekniker ej tilldelad` })
  }
  for (const o of objekt) {
    if (!o.arkiverad && o.status === 'snart') larm.push({ typ: 'amber', text: `${o.namn}: service snart` })
  }
  return larm.slice(0, 7)
}

const typBadge = { service: 'badge-teal', felanmalan: 'badge-coral', montering: 'badge-purple' }
const typLabel = { service: 'Service', felanmalan: 'Felanmälan', montering: 'Montering' }

const SECTION = { fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--c-text3)', marginBottom: 10 }

// ── Snabb-felanmälan ──────────────────────────────────────────────────────────
function SnabbFelanmalan({ kunder, objekt, onSpara, onStäng }) {
  const [kund,        setKund]        = useState('')
  const [port,        setPort]        = useState('')
  const [feltyp,      setFeltyp]      = useState('Porten öppnar/stänger inte')
  const [prioritet,   setPrioritet]   = useState('normal')
  const [beskrivning, setBeskrivning] = useState('')
  const [sparar,      setSparar]      = useState(false)
  const [klar,        setKlar]        = useState(false)

  const portarForKund = kund
    ? objekt.filter(o => !o.arkiverad && o.kund === kund)
    : objekt.filter(o => !o.arkiverad)

  const skapa = async () => {
    setSparar(true)
    const idag = new Date().toISOString().slice(0, 10)
    const nr   = idag.replace(/-/g, '').slice(2) + '-' + Math.floor(Math.random() * 90 + 10)
    const valdKund = kunder.find(k => k.namn === kund)
    await onSpara({
      nr, typ: 'felanmalan',
      namn:       port || 'Okänd port',
      kund:       kund || 'Okänd kund',
      feltyp,     beskrivning,
      kontakt:    valdKund?.kontakt || '',
      datum:      idag,
      status:     'ny',
      prioritet,
      tekniker:   null,
      besok:      null,
    })
    setSparar(false)
    setKlar(true)
    setTimeout(() => { setKlar(false); onStäng() }, 2200)
  }

  const inp = {
    width: '100%', padding: '7px 10px', fontSize: 13,
    border: '1px solid var(--c-border2)', borderRadius: 7,
    background: 'var(--c-bg)', color: 'var(--c-text)', boxSizing: 'border-box',
  }
  const lbl = { fontSize: 11, color: 'var(--c-text2)', marginBottom: 4, display: 'block' }

  if (klar) return (
    <div style={{ padding: '20px 0', textAlign: 'center' }}>
      <CheckCircle size={32} color="var(--c-teal)" style={{ margin: '0 auto 10px', display: 'block' }} />
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-teal-text)' }}>Felanmälan skapad!</div>
      <div style={{ fontSize: 12, color: 'var(--c-text2)', marginTop: 4 }}>Ärendet syns nu under Ärenden.</div>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px', marginBottom: 12 }}>
        <div>
          <label style={lbl}>Kund</label>
          <select value={kund} onChange={e => { setKund(e.target.value); setPort('') }} style={inp}>
            <option value="">– Välj kund –</option>
            {kunder.map(k => <option key={k.id} value={k.namn}>{k.namn}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Port</label>
          <select value={port} onChange={e => setPort(e.target.value)} style={inp}>
            <option value="">– Ingen/okänd port –</option>
            {portarForKund.map(o => <option key={o.id} value={o.namn}>{o.namn}</option>)}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={lbl}>Feltyp</label>
        <select value={feltyp} onChange={e => setFeltyp(e.target.value)} style={inp}>
          <option>Porten öppnar/stänger inte</option>
          <option>Porten fastnar</option>
          <option>Ovanliga ljud</option>
          <option>Fjärrkontroll fungerar inte</option>
          <option>Synlig skada</option>
          <option>Annat</option>
        </select>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={lbl}>Kundens beskrivning (valfritt)</label>
        <textarea value={beskrivning} onChange={e => setBeskrivning(e.target.value)}
          placeholder="Vad berättar kunden?"
          style={{ ...inp, resize: 'vertical', minHeight: 60 }} />
      </div>

      <div style={{ marginBottom: 18 }}>
        <label style={lbl}>Prioritet</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['normal', 'Normal', 'var(--c-text2)', 'var(--c-border)'], ['hog', 'Hög', 'var(--c-amber-text)', 'var(--c-amber)'], ['akut', 'Akut', '#fff', 'var(--c-red)']].map(([val, lab, textColor, borderColor]) => (
            <button key={val} onClick={() => setPrioritet(val)} style={{
              flex: 1, padding: '6px 10px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: `1.5px solid ${prioritet === val ? borderColor : 'var(--c-border)'}`,
              background: prioritet === val
                ? (val === 'akut' ? 'var(--c-red)' : val === 'hog' ? 'var(--c-amber-bg)' : 'var(--c-bg)')
                : 'transparent',
              color: prioritet === val ? textColor : 'var(--c-text2)',
            }}>{lab}</button>
          ))}
        </div>
      </div>

      <button
        className="btn"
        onClick={skapa}
        disabled={sparar}
        style={{
          width: '100%', background: 'var(--c-red)', color: '#fff', borderColor: 'var(--c-red)',
          fontWeight: 600, fontSize: 13, padding: '9px 0',
        }}
      >
        {sparar ? 'Skapar…' : '+ Skapa felanmälan'}
      </button>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard({ kunder = [], objekt = [], arenden = [], bokningar = {}, onNavigera, onSparaArende }) {
  const idag    = new Date()
  const veckonr = getVeckonummer(idag)
  const mThis   = idag.toISOString().slice(0, 7)

  const [visaSnabbForm, setVisaSnabbForm] = useState(false)

  // Datapunkter
  const allaBokningar     = Object.entries(bokningar).flatMap(([datum, items]) => items.map(b => ({ ...b, datum })))
  const serviceDennaMånad = allaBokningar.filter(b => b.datum.startsWith(mThis) && b.typ === 'service').length
  const öppnaArenden      = arenden.filter(a => a.status !== 'atgardad').length
  const monteringar       = allaBokningar.filter(b => b.datum.startsWith(mThis) && b.typ === 'montering').length
  const aktivaPortar      = objekt.filter(o => !o.arkiverad).length

  const veckoSchema = getVeckansBokningar(bokningar)
  const larm        = getLarm(objekt, arenden)

  // Hälsning
  const hour    = idag.getHours()
  const hälsning = hour < 5 ? 'God natt' : hour < 12 ? 'God morgon' : hour < 17 ? 'God eftermiddag' : 'God kväll'
  const dagNamn  = ['söndag', 'måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag']
  const mNamn    = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december']
  const datumStr = `${dagNamn[idag.getDay()]} ${idag.getDate()} ${mNamn[idag.getMonth()]}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Hälsning ── */}
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>
          {hälsning} 👋
        </h1>
        <p style={{ color: 'var(--c-text2)', fontSize: 13 }}>
          {datumStr} &nbsp;·&nbsp; vecka {veckonr}
        </p>
      </div>

      {/* ── KPI-kort ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
        {[
          { label: 'Aktiva portar',       value: aktivaPortar,      icon: DoorOpen,     color: 'var(--c-blue)',   bg: 'var(--c-blue-bg)',   nav: 'register' },
          { label: 'Öppna ärenden',       value: öppnaArenden,      icon: AlertCircle,  color: 'var(--c-red)',    bg: 'var(--c-red-bg)',    nav: 'arenden'  },
          { label: 'Service denna månad', value: serviceDennaMånad, icon: CalendarDays, color: 'var(--c-teal)',   bg: 'var(--c-teal-bg)',   nav: 'kalender' },
          { label: 'Monteringar (mån)',   value: monteringar,       icon: Wrench,       color: 'var(--c-purple)', bg: 'var(--c-purple-bg)', nav: 'montering'},
        ].map(m => (
          <div
            key={m.label}
            className="card"
            onClick={() => onNavigera?.(m.nav)}
            style={{ cursor: 'pointer', padding: '14px 16px', transition: 'box-shadow 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: m.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <m.icon size={16} color={m.color} />
              </div>
              <ChevronRight size={13} color="var(--c-text3)" />
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: m.value > 0 && m.nav === 'arenden' ? 'var(--c-red)' : 'var(--c-text)', marginBottom: 4 }}>
              {m.value}
            </div>
            <div style={{ fontSize: 11, color: 'var(--c-text2)', lineHeight: 1.4 }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* ── Snabbåtgärder ── */}
      <div>
        <div style={SECTION}>Snabbåtgärder</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>

          {/* Felanmälan – expanderbar */}
          <button
            onClick={() => setVisaSnabbForm(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: `1.5px solid ${visaSnabbForm ? 'var(--c-red)' : 'var(--c-border)'}`,
              background: visaSnabbForm ? 'var(--c-red-bg)' : 'var(--c-surface)',
              color: visaSnabbForm ? 'var(--c-red-text)' : 'var(--c-text)',
              transition: 'all 0.15s',
            }}
          >
            <AlertCircle size={15} color={visaSnabbForm ? 'var(--c-red)' : 'var(--c-text2)'} />
            Ny felanmälan
            {visaSnabbForm && <X size={12} style={{ marginLeft: 2 }} />}
          </button>

          {[
            { label: 'Kalender',     icon: CalendarDays, page: 'kalender',  color: 'var(--c-teal)' },
            { label: 'Protokoll',    icon: FileText,     page: 'protokoll', color: 'var(--c-blue)' },
            { label: 'Portregister', icon: DoorOpen,     page: 'register',  color: 'var(--c-purple)' },
          ].map(({ label, icon: Icon, page, color }) => (
            <button
              key={page}
              onClick={() => onNavigera?.(page)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                border: '1.5px solid var(--c-border)',
                background: 'var(--c-surface)', color: 'var(--c-text)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = color + '18' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--c-border)'; e.currentTarget.style.background = 'var(--c-surface)' }}
            >
              <Icon size={15} color="var(--c-text2)" />
              {label}
            </button>
          ))}
        </div>

        {/* Expanderat felanmälansformulär */}
        {visaSnabbForm && (
          <div className="card" style={{ marginTop: 12, borderColor: 'var(--c-red)', borderWidth: 1.5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Ny felanmälan</div>
                <div style={{ fontSize: 11, color: 'var(--c-text2)', marginTop: 2 }}>Fylls i direkt – ärendet sparas under Ärenden</div>
              </div>
              <button onClick={() => setVisaSnabbForm(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text3)', padding: 4 }}>
                <X size={16} />
              </button>
            </div>
            <SnabbFelanmalan
              kunder={kunder}
              objekt={objekt}
              onSpara={onSparaArende}
              onStäng={() => setVisaSnabbForm(false)}
            />
          </div>
        )}
      </div>

      {/* ── Tvåkolumns: Kommande vecka + Larm ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* Kommande besök */}
        <div className="card">
          <div style={SECTION}>Kommande besök – denna vecka</div>
          {veckoSchema.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--c-text2)', padding: '8px 0' }}>
              Inga bokningar denna vecka.{' '}
              <span
                onClick={() => onNavigera?.('kalender')}
                style={{ color: 'var(--c-blue)', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Öppna kalender
              </span>
            </div>
          ) : (
            veckoSchema.map((v, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 0', borderBottom: i < veckoSchema.length - 1 ? '1px solid var(--c-border)' : 'none',
              }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, color: 'var(--c-text3)',
                  minWidth: 52, lineHeight: 1.3,
                }}>
                  {v.dag}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.namn}</div>
                  <div style={{ fontSize: 11, color: 'var(--c-text2)' }}>{v.kund} · {v.tekniker}</div>
                </div>
                <span className={`badge ${typBadge[v.typ] || 'badge-gray'}`} style={{ fontSize: 10 }}>
                  {typLabel[v.typ] || v.typ}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Larm & notiser */}
        <div className="card">
          <div style={SECTION}>Larm & notiser</div>
          {larm.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--c-teal-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={14} color="var(--c-teal)" />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--c-teal-text)' }}>Allt ser bra ut!</div>
                <div style={{ fontSize: 11, color: 'var(--c-text2)' }}>Inga aktiva larm eller varningar.</div>
              </div>
            </div>
          ) : (
            larm.map((l, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '7px 0', borderBottom: i < larm.length - 1 ? '1px solid var(--c-border)' : 'none',
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 6, flexShrink: 0, marginTop: 1,
                  background: l.typ === 'red' ? 'var(--c-red-bg)' : 'var(--c-amber-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {l.typ === 'red'
                    ? <AlertCircle size={12} color="var(--c-red)" />
                    : <Clock       size={12} color="var(--c-amber)" />}
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--c-text)', paddingTop: 2 }}>{l.text}</div>
              </div>
            ))
          )}

          {larm.length > 0 && (
            <button
              onClick={() => onNavigera?.('arenden')}
              style={{
                marginTop: 10, fontSize: 11, color: 'var(--c-blue)', background: 'none',
                border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline',
              }}
            >
              Se alla ärenden →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
