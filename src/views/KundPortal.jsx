import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import {
  LogOut, AlertCircle, CheckCircle, Clock, Building2,
  ChevronDown, ChevronUp, DoorOpen, Wrench, User,
} from 'lucide-react'

// ── Helpers ────────────────────────────────────────────────────────────────────
const PRIO_LABEL = { akut: 'Akut', hog: 'Hög', normal: 'Normal' }
const PRIO_COLOR = { akut: 'var(--c-red)', hog: '#f59e0b', normal: 'var(--c-teal)' }
const STATUS_LABEL = { ny: 'Ny', pagaende: 'Pågår', atgardad: 'Åtgärdad' }
const STATUS_COLOR = { ny: '#f59e0b', pagaende: 'var(--c-blue)', atgardad: 'var(--c-teal)' }

const FÄLT = { fontSize: 13, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--c-border)', background: 'var(--c-surface)', color: 'var(--c-text)', width: '100%', boxSizing: 'border-box', outline: 'none' }
const BTN_PRI = { padding: '9px 20px', background: 'var(--c-teal)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const BTN_SEC = { padding: '9px 16px', background: 'transparent', color: 'var(--c-text2)', border: '1px solid var(--c-border)', borderRadius: 8, fontSize: 13, cursor: 'pointer' }

export default function KundPortal({ user, onLoggaUt }) {
  const [kund,        setKund]        = useState(null)
  const [fastigheter, setFastigheter] = useState([])
  const [portar,      setPortar]      = useState([])
  const [arenden,     setArenden]     = useState([])
  const [laddas,      setLaddas]      = useState(true)
  const [visaForm,    setVisaForm]    = useState(false)
  const [visaPortar,  setVisaPortar]  = useState(false)

  // Felanmälan-state
  const [valdPort,    setValdPort]    = useState('')
  const [feltyp,      setFeltyp]      = useState('')
  const [prioritet,   setPrioritet]   = useState('normal')
  const [beskrivning, setBeskrivning] = useState('')
  const [sparar,      setSparar]      = useState(false)
  const [sparad,      setSparad]      = useState(false)
  const [feldMsg,     setFeldMsg]     = useState('')

  const kundId   = user.user_metadata?.kund_id
  const kundNamn = user.user_metadata?.kund_namn || ''

  // ── Ladda data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    async function ladda() {
      if (!kundId && !kundNamn) { setLaddas(false); return }

      const [kRes, fRes, oRes, aRes] = await Promise.all([
        kundId
          ? supabase.from('kunder').select('*').eq('id', kundId).maybeSingle()
          : { data: null },
        supabase.from('fastigheter').select('*').order('namn'),
        supabase.from('objekt').select('*').order('namn'),
        supabase.from('arenden').select('*').order('created_at', { ascending: false }),
      ])

      const k = kRes.data
      setKund(k)

      const namn = k?.namn || kundNamn
      if (fRes.data) setFastigheter(fRes.data.filter(f => f.kund === namn && !f.arkiverad))
      if (oRes.data) setPortar(oRes.data.filter(o => o.kund === namn && !o.arkiverad))
      if (aRes.data) setArenden(aRes.data.filter(a => a.kund === namn))
      setLaddas(false)
    }
    ladda()
  }, [kundId, kundNamn])

  // ── Skicka felanmälan ──────────────────────────────────────────────────────
  const skickaFel = async () => {
    if (!valdPort || !feltyp) { setFeldMsg('Välj port och feltyp.'); return }
    setSparar(true); setFeldMsg('')
    const port = portar.find(p => p.id === valdPort)
    const kundnamn = kund?.namn || kundNamn
    const now = new Date()
    const { error } = await supabase.from('arenden').insert({
      namn:        port?.namn || 'Okänd port',
      kund:        kundnamn,
      feltyp,
      prioritet,
      beskrivning,
      status:      'ny',
      datum:       now.toISOString().slice(0, 10),
      nr:          now.getTime(),
    })
    setSparar(false)
    if (error) { setFeldMsg('Något gick fel: ' + error.message); return }
    setSparad(true)
    setValdPort(''); setFeltyp(''); setBeskrivning(''); setPrioritet('normal')
    // Uppdatera ärenden i listan
    const { data } = await supabase
      .from('arenden').select('*')
      .eq('kund', kundnamn).order('created_at', { ascending: false })
    if (data) setArenden(data)
    setTimeout(() => { setSparad(false); setVisaForm(false) }, 3500)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (laddas) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--c-bg)' }}>
      <span style={{ color: 'var(--c-text3)', fontSize: 14 }}>Laddar…</span>
    </div>
  )

  const displayNamn = kund?.namn || kundNamn || user.email
  const öppnaArenden  = arenden.filter(a => a.status !== 'atgardad')
  const stängdaArenden = arenden.filter(a => a.status === 'atgardad')
  const nästaService  = portar.flatMap(p => p.nasta ? [p.nasta] : []).sort()[0]

  const serviceHistorik = portar
    .flatMap(p => (p.historik || []).map(h => ({ ...h, portNamn: p.namn })))
    .filter(h => h.datum) // inkludera alla historik-poster som har datum (service + montering)
    .sort((a, b) => (b.datum || '').localeCompare(a.datum || ''))

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <header style={{
        background: '#1C3461', padding: '0 24px', height: 56,
        display: 'flex', alignItems: 'center', gap: 12,
        borderBottom: '1px solid var(--c-border)', flexShrink: 0,
      }}>
        <div style={{ width: 32, height: 32, background: 'var(--c-teal)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>N</span>
        </div>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#fff', flex: 1 }}>NMV Portservice — Kundportal</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--c-text3)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</span>
          <button onClick={onLoggaUt} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: '1px solid var(--c-border)', borderRadius: 6,
            color: 'var(--c-text2)', fontSize: 12, padding: '5px 10px', cursor: 'pointer',
          }}>
            <LogOut size={13} /> Logga ut
          </button>
        </div>
      </header>

      {/* Main */}
      <main style={{ flex: 1, padding: '28px 24px', maxWidth: 780, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>

        {/* Välkomstrad */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--c-text)' }}>{displayNamn}</h1>
          <p style={{ fontSize: 13, color: 'var(--c-text2)', margin: '4px 0 0' }}>
            Din portserviceöversikt
          </p>
        </div>

        {/* KPI-kort */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Portar', value: portar.length, icon: DoorOpen, color: 'var(--c-blue)' },
            { label: 'Aktiva ärenden', value: öppnaArenden.length, icon: AlertCircle, color: öppnaArenden.length > 0 ? 'var(--c-red)' : 'var(--c-teal)' },
            { label: 'Utförda uppdrag', value: serviceHistorik.length, icon: Wrench, color: 'var(--c-purple)' },
            { label: 'Nästa service', value: nästaService || '–', icon: Clock, color: '#a78bfa', small: !!nästaService },
          ].map(({ label, value, icon: Icon, color, small }) => (
            <div key={label} style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
                <div style={{ width: 28, height: 28, background: color + '22', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={14} color={color} />
                </div>
              </div>
              <div style={{ fontSize: small ? 15 : 24, fontWeight: 700, color: 'var(--c-text)' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Felanmälan-sektion */}
        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 12, marginBottom: 20, overflow: 'hidden' }}>
          <button
            onClick={() => setVisaForm(v => !v)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--c-text)', fontSize: 14, fontWeight: 600,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={16} color="var(--c-red)" />
              Anmäl fel
            </div>
            {visaForm ? <ChevronUp size={16} color="var(--c-text3)" /> : <ChevronDown size={16} color="var(--c-text3)" />}
          </button>

          {visaForm && (
            <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--c-border)' }}>
              {sparad ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px',
                  background: '#12302b', border: '1px solid var(--c-teal)', borderRadius: 10, marginTop: 16,
                  color: '#6ee7b7', fontSize: 13, fontWeight: 500,
                }}>
                  <CheckCircle size={16} /> Felanmälan skickad! Vi återkommer inom kort.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, color: 'var(--c-text2)', display: 'block', marginBottom: 5 }}>Port *</label>
                      <select value={valdPort} onChange={e => setValdPort(e.target.value)} style={FÄLT}>
                        <option value="">Välj port…</option>
                        {portar.map(p => <option key={p.id} value={p.id}>{p.namn} {p.plats ? `(${p.plats})` : ''}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: 'var(--c-text2)', display: 'block', marginBottom: 5 }}>Feltyp *</label>
                      <select value={feltyp} onChange={e => setFeltyp(e.target.value)} style={FÄLT}>
                        <option value="">Välj feltyp…</option>
                        {['Öppnar inte', 'Stänger inte', 'Ovanligt ljud', 'Fjärrkontroll fungerar inte', 'Mekaniskt fel', 'Elfel', 'Övrigt'].map(f =>
                          <option key={f} value={f}>{f}</option>
                        )}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 12, color: 'var(--c-text2)', display: 'block', marginBottom: 5 }}>Prioritet</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {['normal', 'hög', 'kritisk'].map(p => (
                        <button key={p} onClick={() => setPrioritet(p)} style={{
                          padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          border: `1px solid ${prioritet === p ? PRIO_COLOR[p] : 'var(--c-border)'}`,
                          background: prioritet === p ? PRIO_COLOR[p] + '22' : 'transparent',
                          color: prioritet === p ? PRIO_COLOR[p] : 'var(--c-text2)',
                          transition: 'all 0.15s',
                          textTransform: 'capitalize',
                        }}>{PRIO_LABEL[p]}</button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 12, color: 'var(--c-text2)', display: 'block', marginBottom: 5 }}>Beskrivning</label>
                    <textarea
                      value={beskrivning}
                      onChange={e => setBeskrivning(e.target.value)}
                      placeholder="Beskriv felet mer detaljerat…"
                      rows={3}
                      style={{ ...FÄLT, resize: 'vertical', fontFamily: 'inherit' }}
                    />
                  </div>

                  {feldMsg && <div style={{ fontSize: 12, color: 'var(--c-red)' }}>{feldMsg}</div>}

                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button style={BTN_SEC} onClick={() => setVisaForm(false)}>Avbryt</button>
                    <button style={{ ...BTN_PRI, opacity: sparar ? 0.6 : 1 }} onClick={skickaFel} disabled={sparar}>
                      {sparar ? 'Skickar…' : 'Skicka felanmälan'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Aktiva ärenden */}
        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 12, marginBottom: 20 }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--c-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text)' }}>Aktiva ärenden</span>
            {öppnaArenden.length > 0 && (
              <span style={{ background: 'var(--c-red)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>
                {öppnaArenden.length}
              </span>
            )}
          </div>
          {öppnaArenden.length === 0 ? (
            <div style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--c-text3)', fontSize: 13 }}>
              <CheckCircle size={14} color="var(--c-teal)" /> Inga aktiva ärenden just nu.
            </div>
          ) : (
            <div>
              {öppnaArenden.map((a, i) => (
                <div key={a.id} style={{
                  padding: '12px 20px',
                  borderBottom: i < öppnaArenden.length - 1 ? '1px solid var(--c-border)' : 'none',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: PRIO_COLOR[a.prioritet] || 'var(--c-text3)',
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--c-text)' }}>{a.namn}</div>
                    <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 2 }}>
                      {a.feltyp} · {a.datum}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                    background: STATUS_COLOR[a.status] + '22', color: STATUS_COLOR[a.status],
                    whiteSpace: 'nowrap',
                  }}>
                    {STATUS_LABEL[a.status] || a.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Portar */}
        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 12 }}>
          <button
            onClick={() => setVisaPortar(v => !v)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--c-text)', fontSize: 13, fontWeight: 600, borderRadius: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <DoorOpen size={15} color="var(--c-blue)" />
              Dina portar ({portar.length})
            </div>
            {visaPortar ? <ChevronUp size={15} color="var(--c-text3)" /> : <ChevronDown size={15} color="var(--c-text3)" />}
          </button>

          {visaPortar && portar.length > 0 && (
            <div style={{ borderTop: '1px solid var(--c-border)' }}>
              {/* Fastigheter-gruppering */}
              {fastigheter.length > 0 ? (
                fastigheter.map(f => {
                  const fps = portar.filter(p => p.fastighetId === f.id || p.plats === f.namn)
                  if (!fps.length) return null
                  return (
                    <div key={f.id}>
                      <div style={{ padding: '8px 20px', background: 'var(--c-bg)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Building2 size={12} color="var(--c-text3)" />
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{f.namn}</span>
                      </div>
                      {fps.map((p, i) => <PortRad key={p.id} port={p} sista={i === fps.length - 1} />)}
                    </div>
                  )
                })
              ) : (
                portar.map((p, i) => <PortRad key={p.id} port={p} sista={i === portar.length - 1} />)
              )}
            </div>
          )}

          {visaPortar && portar.length === 0 && (
            <div style={{ padding: '16px 20px', color: 'var(--c-text3)', fontSize: 13, borderTop: '1px solid var(--c-border)' }}>
              Inga registrerade portar.
            </div>
          )}
        </div>

        {/* Utfört arbete – servicehistorik */}
        {serviceHistorik.length > 0 && (
          <div style={{ marginTop: 20, background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 12 }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--c-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Wrench size={15} color="var(--c-blue)" />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Utfört arbete ({serviceHistorik.length})</span>
            </div>
            {serviceHistorik.slice(0, 15).map((h, i) => (
              <div key={i} style={{
                padding: '11px 20px',
                borderBottom: i < Math.min(serviceHistorik.length, 15) - 1 ? '1px solid var(--c-border)' : 'none',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                  background: h.typ === 'montering' ? 'var(--c-purple-bg)' : 'var(--c-blue-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Wrench size={14} color={h.typ === 'montering' ? 'var(--c-purple)' : 'var(--c-blue)'} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--c-text)' }}>{h.portNamn}</div>
                  <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 2 }}>
                    {h.typ === 'montering' ? 'Montering' : 'Service'} · {h.tekniker || '–'} · {h.datum}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                  {h.ok > 0 && (
                    <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 8, background: 'var(--c-teal-bg)', color: 'var(--c-teal-text)', fontWeight: 600 }}>
                      ✓ {h.ok}
                    </span>
                  )}
                  {h.ej > 0 && (
                    <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 8, background: 'var(--c-red-bg)', color: 'var(--c-red-text)', fontWeight: 600 }}>
                      ✗ {h.ej}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Åtgärdade ärenden */}
        {stängdaArenden.length > 0 && (
          <div style={{ marginTop: 20, background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 12 }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--c-border)' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text)' }}>Åtgärdade ärenden ({stängdaArenden.length})</span>
            </div>
            {stängdaArenden.slice(0, 5).map((a, i) => (
              <div key={a.id} style={{
                padding: '11px 20px', borderBottom: i < Math.min(stängdaArenden.length, 5) - 1 ? '1px solid var(--c-border)' : 'none',
                display: 'flex', alignItems: 'center', gap: 10, opacity: 0.7,
              }}>
                <CheckCircle size={13} color="var(--c-teal)" />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, color: 'var(--c-text)' }}>{a.namn}</span>
                  <span style={{ fontSize: 11, color: 'var(--c-text3)', marginLeft: 8 }}>{a.datum}</span>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  )
}

function PortRad({ port, sista }) {
  const statusFärg = {
    ok:         'var(--c-teal)',
    varning:    '#f59e0b',
    försenad:   'var(--c-red)',
    okänd:      'var(--c-text3)',
  }
  const färg = statusFärg[port.status] || statusFärg.okänd
  return (
    <div style={{
      padding: '11px 20px',
      borderBottom: sista ? 'none' : '1px solid var(--c-border)',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: färg, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--c-text)' }}>{port.namn}</div>
        <div style={{ fontSize: 11, color: 'var(--c-text3)' }}>{port.typ} {port.fabrikat ? `· ${port.fabrikat}` : ''}</div>
      </div>
      {port.nasta && (
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: 'var(--c-text3)' }}>Nästa service</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text2)' }}>{port.nasta}</div>
        </div>
      )}
    </div>
  )
}
