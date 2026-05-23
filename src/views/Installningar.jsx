import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { UserPlus, Trash2, Shield, User, RefreshCw, Copy,
         ChevronDown, ChevronUp, Plus, GripVertical, Check, ClipboardList } from 'lucide-react'

const ROLL_LABEL  = { admin: 'Admin', tekniker: 'Tekniker', kontorist: 'Kontorist', kund: 'Kundportal' }
const ROLL_FÄRG   = { admin: '#f59e0b', tekniker: 'var(--c-blue)', kontorist: '#a78bfa', kund: 'var(--c-teal)' }
const ROLL_BG     = { admin: '#f59e0b22', tekniker: 'var(--c-blue)22', kontorist: '#a78bfa22', kund: 'var(--c-teal)22' }

const FÄLT = {
  fontSize: 13, padding: '8px 12px', borderRadius: 8,
  border: '1px solid var(--c-border)', background: 'var(--c-surface)',
  color: 'var(--c-text)', width: '100%', boxSizing: 'border-box', outline: 'none',
}
const BTN_PRI = { padding: '9px 20px', background: 'var(--c-teal)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const BTN_SEC = { padding: '8px 14px', background: 'transparent', color: 'var(--c-text2)', border: '1px solid var(--c-border)', borderRadius: 8, fontSize: 13, cursor: 'pointer' }

const SECTION = { fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--c-text3)', marginBottom: 10 }

// ── Mall-editor (generisk – används för både service- och monteringsmallar) ────
function ProtokollMallar({ mallar = {}, onSpara, titel = 'Protokollmallar', beskrivning = 'Checklistor per porttyp' }) {
  const [lokala,     setLokala]     = useState(() => JSON.parse(JSON.stringify(mallar)))
  const [oppnaTyp,   setOppnaTyp]   = useState(null)
  const [nyTypNamn,  setNyTypNamn]  = useState('')
  const [sparar,     setSparar]     = useState(false)
  const [sparat,     setSparat]     = useState(false)
  const [andringar,  setAndringar]  = useState(false)
  const [bekraftaBortTyp, setBekraftaBortTyp] = useState(null)

  const andringarRef = useRef(false)
  const markAndrad = () => { setAndringar(true); setSparat(false); andringarRef.current = true }

  // Synka lokala om mallar-propen uppdateras (t.ex. efter async Supabase-laddning)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!andringarRef.current) {
      setLokala(JSON.parse(JSON.stringify(mallar)))
    }
  }, [mallar])

  const laggTillTyp = () => {
    const namn = nyTypNamn.trim()
    if (!namn || lokala[namn]) return
    setLokala(m => ({ ...m, [namn]: [] }))
    setOppnaTyp(namn)
    setNyTypNamn('')
    markAndrad()
  }

  const taBortTyp = (typ) => {
    setLokala(m => { const ny = { ...m }; delete ny[typ]; return ny })
    if (oppnaTyp === typ) setOppnaTyp(null)
    setBekraftaBortTyp(null)
    markAndrad()
  }

  const laggTillPunkt = (typ) => {
    setLokala(m => ({ ...m, [typ]: [...(m[typ] || []), ''] }))
    markAndrad()
  }

  const laggTillRubrik = (typ) => {
    setLokala(m => ({ ...m, [typ]: [...(m[typ] || []), '## Ny rubrik'] }))
    markAndrad()
  }

  const uppdateraPunkt = (typ, idx, val) => {
    setLokala(m => {
      const pts = [...m[typ]]
      const isHdr = (pts[idx] || '').startsWith('## ')
      pts[idx] = isHdr ? '## ' + val : val
      return { ...m, [typ]: pts }
    })
    markAndrad()
  }

  const taBortPunkt = (typ, idx) => {
    setLokala(m => ({ ...m, [typ]: m[typ].filter((_, i) => i !== idx) }))
    markAndrad()
  }

  const flyttaPunkt = (typ, idx, riktning) => {
    setLokala(m => {
      const pts = [...m[typ]]
      const swap = idx + riktning
      if (swap < 0 || swap >= pts.length) return m
      ;[pts[idx], pts[swap]] = [pts[swap], pts[idx]]
      return { ...m, [typ]: pts }
    })
    markAndrad()
  }

  const spara = async () => {
    setSparar(true)
    await onSpara(lokala)
    setSparar(false)
    setAndringar(false)
    andringarRef.current = false
    setSparat(true)
    setTimeout(() => setSparat(false), 2500)
  }

  const typer = Object.keys(lokala)

  return (
    <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 12, marginTop: 24 }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--c-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClipboardList size={15} color="var(--c-blue)" /> {titel}
          </div>
          <div style={{ fontSize: 12, color: 'var(--c-text3)', marginTop: 2 }}>{beskrivning}</div>
        </div>
        {andringar && (
          <button onClick={spara} disabled={sparar}
            style={{ padding: '8px 18px', background: 'var(--c-teal)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            {sparar ? 'Sparar…' : sparat ? <><Check size={13} /> Sparat!</> : 'Spara ändringar'}
          </button>
        )}
        {sparat && !andringar && (
          <span style={{ fontSize: 12, color: 'var(--c-teal)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Check size={13} /> Sparat
          </span>
        )}
      </div>

      {/* Typer */}
      {typer.map((typ) => {
        const punkterAntal = (lokala[typ] || []).filter(p => !p.startsWith('## ')).length
        const rubrikerAntal = (lokala[typ] || []).filter(p => p.startsWith('## ')).length
        return (
          <div key={typ} style={{ borderBottom: '1px solid var(--c-border)' }}>
            {/* Typ-rad */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', gap: 10 }}>
              <button
                onClick={() => setOppnaTyp(oppnaTyp === typ ? null : typ)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
              >
                {oppnaTyp === typ ? <ChevronUp size={15} color="var(--c-text3)" /> : <ChevronDown size={15} color="var(--c-text3)" />}
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text)' }}>{typ}</span>
                <span style={{ fontSize: 11, color: 'var(--c-text3)' }}>
                  {punkterAntal} punkt{punkterAntal !== 1 ? 'er' : ''}
                  {rubrikerAntal > 0 && ` · ${rubrikerAntal} rubrik${rubrikerAntal !== 1 ? 'er' : ''}`}
                </span>
              </button>
              {bekraftaBortTyp === typ ? (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--c-text2)' }}>Ta bort hela mallen?</span>
                  <button onClick={() => taBortTyp(typ)} style={{ padding: '4px 10px', background: 'var(--c-red)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Ja</button>
                  <button onClick={() => setBekraftaBortTyp(null)} style={{ padding: '4px 10px', background: 'transparent', color: 'var(--c-text2)', border: '1px solid var(--c-border)', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Nej</button>
                </div>
              ) : (
                <button onClick={() => setBekraftaBortTyp(typ)} style={{ background: 'none', border: 'none', color: 'var(--c-text3)', cursor: 'pointer', padding: 4 }}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            {/* Punkter & rubriker */}
            {oppnaTyp === typ && (
              <div style={{ padding: '0 20px 14px', background: '#1a1917' }}>
                {(lokala[typ] || []).map((punkt, idx) => {
                  const isHdr = punkt.startsWith('## ')
                  const visText = isHdr ? punkt.slice(3) : punkt
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      {isHdr
                        ? <span style={{ fontSize: 10, color: 'var(--c-blue)', minWidth: 24, textAlign: 'right', fontWeight: 700 }}>§</span>
                        : <span style={{ fontSize: 11, color: 'var(--c-text3)', minWidth: 24, textAlign: 'right' }}>{idx + 1}.</span>
                      }
                      <input
                        value={visText}
                        onChange={e => uppdateraPunkt(typ, idx, e.target.value)}
                        style={{
                          flex: 1, padding: '6px 10px', fontSize: 12,
                          border: `1px solid ${isHdr ? 'var(--c-blue)' : 'var(--c-border)'}`,
                          borderRadius: 6,
                          background: isHdr ? '#1e2a3a' : 'var(--c-surface)',
                          color: isHdr ? 'var(--c-blue)' : 'var(--c-text)',
                          fontWeight: isHdr ? 700 : 400,
                          outline: 'none',
                        }}
                      />
                      <button onClick={() => flyttaPunkt(typ, idx, -1)} disabled={idx === 0}
                        style={{ background: 'none', border: 'none', color: idx === 0 ? 'var(--c-border)' : 'var(--c-text3)', cursor: idx === 0 ? 'default' : 'pointer', padding: '2px 4px', fontSize: 13 }}>↑</button>
                      <button onClick={() => flyttaPunkt(typ, idx, 1)} disabled={idx === (lokala[typ] || []).length - 1}
                        style={{ background: 'none', border: 'none', color: idx === (lokala[typ] || []).length - 1 ? 'var(--c-border)' : 'var(--c-text3)', cursor: idx === (lokala[typ] || []).length - 1 ? 'default' : 'pointer', padding: '2px 4px', fontSize: 13 }}>↓</button>
                      <button onClick={() => taBortPunkt(typ, idx)}
                        style={{ background: 'none', border: 'none', color: 'var(--c-text3)', cursor: 'pointer', padding: '2px 4px' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )
                })}
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={() => laggTillPunkt(typ)}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px dashed var(--c-border)', borderRadius: 6, color: 'var(--c-text3)', fontSize: 12, padding: '6px 12px', cursor: 'pointer' }}>
                    <Plus size={13} /> Lägg till punkt
                  </button>
                  <button onClick={() => laggTillRubrik(typ)}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px dashed var(--c-blue)', borderRadius: 6, color: 'var(--c-blue)', fontSize: 12, padding: '6px 12px', cursor: 'pointer' }}>
                    <Plus size={13} /> Lägg till rubrik
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Ny porttyp */}
      <div style={{ padding: '14px 20px', display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          value={nyTypNamn}
          onChange={e => setNyTypNamn(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && laggTillTyp()}
          placeholder="Ny porttyp, t.ex. Rullgrind…"
          style={{ flex: 1, padding: '7px 12px', fontSize: 13, border: '1px solid var(--c-border)', borderRadius: 8, background: 'var(--c-bg)', color: 'var(--c-text)', outline: 'none' }}
        />
        <button onClick={laggTillTyp} disabled={!nyTypNamn.trim()}
          style={{ padding: '7px 16px', background: nyTypNamn.trim() ? 'var(--c-teal)' : 'var(--c-border)', color: nyTypNamn.trim() ? '#fff' : 'var(--c-text3)', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: nyTypNamn.trim() ? 'pointer' : 'default' }}>
          <Plus size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Skapa mall
        </button>
      </div>
    </div>
  )
}

// ── Medarbetare ───────────────────────────────────────────────────────────────
function TeknikerPanel({ tekniker = [], onLaggTill, onTaBort }) {
  const [nyNamn,       setNyNamn]       = useState('')
  const [bekraftaBort, setBekraftaBort] = useState(null)

  const laggTill = () => {
    const namn = nyNamn.trim()
    if (!namn || tekniker.includes(namn)) return
    onLaggTill?.(namn)
    setNyNamn('')
  }

  return (
    <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 12, marginTop: 24 }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--c-border)' }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Medarbetare</div>
        <div style={{ fontSize: 12, color: 'var(--c-text3)', marginTop: 2 }}>
          Tekniker och personal som kan tilldelas bokningar och ärenden
        </div>
      </div>

      <div style={{ padding: '14px 20px' }}>
        {/* Lista */}
        {tekniker.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--c-text3)', marginBottom: 14 }}>Inga medarbetare registrerade ännu.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            {tekniker.map(t => (
              <div key={t} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 12px', borderRadius: 8,
                background: 'var(--c-bg)', border: '1px solid var(--c-border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--c-blue-bg)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: 'var(--c-navy)',
                  }}>
                    {t.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{t}</span>
                </div>
                {bekraftaBort === t ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => { onTaBort?.(t); setBekraftaBort(null) }}
                      style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid var(--c-red)', background: 'var(--c-red-bg)', color: 'var(--c-red)', cursor: 'pointer' }}>
                      Ta bort
                    </button>
                    <button onClick={() => setBekraftaBort(null)}
                      style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid var(--c-border)', background: 'transparent', color: 'var(--c-text2)', cursor: 'pointer' }}>
                      Avbryt
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setBekraftaBort(t)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text3)', padding: 4, display: 'flex', alignItems: 'center' }}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Lägg till */}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="Förnamn Efternamn"
            value={nyNamn}
            onChange={e => setNyNamn(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && laggTill()}
            style={{ ...FÄLT, flex: 1 }}
          />
          <button onClick={laggTill} style={{ ...BTN_PRI, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
            <Plus size={14} /> Lägg till
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Huvudkomponent ────────────────────────────────────────────────────────────
export default function Installningar({ kunder, protokollMallar = {}, onSparaProtokollMallar, montagemallar = {}, onSparaMontagemallar, tekniker = [], onLaggTillTekniker, onTaBortTekniker }) {
  const [inbjudningar, setInbjudningar]   = useState([])
  const [laddas,       setLaddas]         = useState(true)
  const [visaForm,     setVisaForm]       = useState(false)
  const [bekraftaBort, setBekraftaBort]   = useState(null)

  // Form-state
  const [email,     setEmail]     = useState('')
  const [roll,      setRoll]      = useState('tekniker')
  const [valdKund,  setValdKund]  = useState('')
  const [sparar,    setSparar]    = useState(false)
  const [feldMsg,   setFeldMsg]   = useState('')
  const [kopierat,  setKopierat]  = useState(null)

  const loginUrl = window.location.origin

  // ── Ladda inbjudningar ────────────────────────────────────────────────────
  const laddaInbjudningar = async () => {
    setLaddas(true)
    const { data } = await supabase
      .from('brukar_inbjudningar')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setInbjudningar(data)
    setLaddas(false)
  }

  useEffect(() => { laddaInbjudningar() }, [])

  // ── Skicka inbjudan ───────────────────────────────────────────────────────
  const sparaInbjudan = async () => {
    if (!email.trim()) { setFeldMsg('Ange en e-postadress.'); return }
    if (roll === 'kund' && !valdKund) { setFeldMsg('Välj vilken kund kontot gäller.'); return }
    setSparar(true); setFeldMsg('')

    const kundPost = kunder.find(k => k.id === valdKund)
    const { error } = await supabase.from('brukar_inbjudningar').insert({
      email:     email.trim().toLowerCase(),
      roll,
      kund_id:   roll === 'kund' ? (valdKund || null) : null,
      kund_namn: roll === 'kund' ? (kundPost?.namn || '') : '',
    })

    setSparar(false)
    if (error) {
      setFeldMsg(
        error.code === '23505'
          ? 'En inbjudan för den e-postadressen finns redan.'
          : 'Fel: ' + error.message
      )
      return
    }

    setEmail(''); setRoll('tekniker'); setValdKund(''); setVisaForm(false)
    laddaInbjudningar()
  }

  // ── Ta bort inbjudan ──────────────────────────────────────────────────────
  const taBortInbjudan = async (id) => {
    await supabase.from('brukar_inbjudningar').delete().eq('id', id)
    setInbjudningar(prev => prev.filter(i => i.id !== id))
    setBekraftaBort(null)
  }

  const kopieraUrl = () => {
    navigator.clipboard.writeText(loginUrl)
    setKopierat(true)
    setTimeout(() => setKopierat(false), 2000)
  }

  return (
    <div>

      {/* Rubrik */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px', color: 'var(--c-text)' }}>Inställningar</h1>
        <p style={{ fontSize: 13, color: 'var(--c-text2)', margin: 0 }}>Hantera användare och inbjudningar</p>
      </div>

      {/* Inloggnings-URL */}
      <div style={{
        background: 'var(--c-surface)', border: '1px solid var(--c-border)',
        borderRadius: 12, padding: '16px 20px', marginBottom: 24,
      }}>
        <div style={SECTION}>Inloggningslänk</div>
        <p style={{ fontSize: 12, color: 'var(--c-text2)', margin: '0 0 10px' }}>
          Alla roller loggar in via samma adress. Skicka denna länk till nya användare.
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{
            flex: 1, padding: '8px 12px', background: 'var(--c-bg)', border: '1px solid var(--c-border)',
            borderRadius: 8, fontSize: 13, color: 'var(--c-text2)', overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {loginUrl}
          </div>
          <button onClick={kopieraUrl} style={{ ...BTN_SEC, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
            <Copy size={13} /> {kopierat ? 'Kopierat!' : 'Kopiera'}
          </button>
        </div>
      </div>

      {/* Roller-info */}
      <div style={{
        background: 'var(--c-surface)', border: '1px solid var(--c-border)',
        borderRadius: 12, padding: '16px 20px', marginBottom: 24,
      }}>
        <div style={SECTION}>Roller och behörigheter</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {Object.entries(ROLL_LABEL).map(([r, label]) => (
            <div key={r} style={{
              padding: '10px 14px', background: 'var(--c-bg)', border: '1px solid var(--c-border)',
              borderRadius: 9, display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 5, flexShrink: 0,
                background: ROLL_BG[r], color: ROLL_FÄRG[r],
              }}>{label}</span>
              <span style={{ fontSize: 12, color: 'var(--c-text2)', lineHeight: 1.5 }}>
                {r === 'admin'      && 'Full åtkomst till alla funktioner'}
                {r === 'tekniker'   && 'Egna ärenden, protokoll och kalender'}
                {r === 'kontorist'  && 'Registrerar felanmälningar'}
                {r === 'kund'       && 'Kundportal med egna portar och ärenden'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Inbjudningar */}
      <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 12 }}>
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--c-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text)' }}>Väntande inbjudningar</div>
            <div style={{ fontSize: 12, color: 'var(--c-text3)', marginTop: 2 }}>
              Automatisk rolltilldelning när användaren skapar konto
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={laddaInbjudningar} style={{ ...BTN_SEC, display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px' }}>
              <RefreshCw size={13} />
            </button>
            <button
              onClick={() => { setVisaForm(v => !v); setFeldMsg('') }}
              style={{ ...BTN_PRI, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <UserPlus size={14} /> Bjud in användare
            </button>
          </div>
        </div>

        {/* Inbjudningsformulär */}
        {visaForm && (
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid var(--c-border)',
            background: '#1a1917',
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text)', marginBottom: 14 }}>Ny inbjudan</div>
            <div style={{ display: 'grid', gridTemplateColumns: roll === 'kund' ? '2fr 1fr 2fr' : '2fr 1fr', gap: 12, alignItems: 'end' }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--c-text2)', display: 'block', marginBottom: 5 }}>E-postadress *</label>
                <input
                  type="email"
                  placeholder="namn@företag.se"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={FÄLT}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--c-text2)', display: 'block', marginBottom: 5 }}>Roll *</label>
                <select value={roll} onChange={e => { setRoll(e.target.value); setValdKund('') }} style={FÄLT}>
                  {Object.entries(ROLL_LABEL).map(([r, l]) => <option key={r} value={r}>{l}</option>)}
                </select>
              </div>
              {roll === 'kund' && (
                <div>
                  <label style={{ fontSize: 12, color: 'var(--c-text2)', display: 'block', marginBottom: 5 }}>Kopplad kund *</label>
                  <select value={valdKund} onChange={e => setValdKund(e.target.value)} style={FÄLT}>
                    <option value="">Välj kund…</option>
                    {kunder.map(k => <option key={k.id} value={k.id}>{k.namn}</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* Förklaring */}
            <div style={{
              marginTop: 12, padding: '8px 12px', background: 'var(--c-bg)',
              border: '1px solid var(--c-border)', borderRadius: 8, fontSize: 12, color: 'var(--c-text2)',
            }}>
              <strong style={{ color: 'var(--c-text)' }}>Flöde:</strong>{' '}
              Rollen sparas som en väntande inbjudan. När användaren skapar ett konto med den e-postadressen
              (via <em>Glömt lösenord</em> eller direkt registrering) tilldelas rollen automatiskt.
            </div>

            {feldMsg && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--c-red)' }}>{feldMsg}</div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
              <button style={BTN_SEC} onClick={() => { setVisaForm(false); setFeldMsg('') }}>Avbryt</button>
              <button
                style={{ ...BTN_PRI, opacity: sparar ? 0.6 : 1 }}
                onClick={sparaInbjudan}
                disabled={sparar}
              >
                {sparar ? 'Sparar…' : 'Skapa inbjudan'}
              </button>
            </div>
          </div>
        )}

        {/* Lista */}
        {laddas ? (
          <div style={{ padding: '20px', color: 'var(--c-text3)', fontSize: 13 }}>Laddar…</div>
        ) : inbjudningar.length === 0 ? (
          <div style={{ padding: '24px 20px', textAlign: 'center', color: 'var(--c-text3)', fontSize: 13 }}>
            Inga väntande inbjudningar.
          </div>
        ) : (
          inbjudningar.map((inv, i) => (
            <div key={inv.id} style={{
              padding: '13px 20px',
              borderBottom: i < inbjudningar.length - 1 ? '1px solid var(--c-border)' : 'none',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              {/* Ikon */}
              <div style={{
                width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                background: ROLL_BG[inv.roll] || '#2a2925',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {inv.roll === 'kund' ? <User size={15} color={ROLL_FÄRG[inv.roll]} /> : <Shield size={15} color={ROLL_FÄRG[inv.roll] || 'var(--c-text3)'} />}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--c-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {inv.email}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, flexShrink: 0,
                    background: ROLL_BG[inv.roll], color: ROLL_FÄRG[inv.roll],
                  }}>
                    {ROLL_LABEL[inv.roll] || inv.roll}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 2 }}>
                  {inv.roll === 'kund' && inv.kund_namn ? `Kund: ${inv.kund_namn} · ` : ''}
                  Skapad {new Date(inv.created_at).toLocaleDateString('sv-SE')}
                </div>
              </div>

              {/* Ta bort */}
              {bekraftaBort === inv.id ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 12, color: 'var(--c-text2)' }}>Ta bort?</span>
                  <button onClick={() => taBortInbjudan(inv.id)} style={{
                    padding: '5px 10px', background: 'var(--c-red)', color: '#fff',
                    border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600,
                  }}>Ja</button>
                  <button onClick={() => setBekraftaBort(null)} style={BTN_SEC}>Nej</button>
                </div>
              ) : (
                <button
                  onClick={() => setBekraftaBort(inv.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--c-text3)', cursor: 'pointer', padding: 4, display: 'flex', flexShrink: 0 }}
                  title="Ta bort inbjudan"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Instruktioner */}
      <div style={{
        marginTop: 24, padding: '16px 20px',
        background: 'var(--c-surface)', border: '1px solid var(--c-border)',
        borderRadius: 12,
      }}>
        <div style={SECTION}>Så bjuder du in en ny användare</div>
        <ol style={{ margin: 0, padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            'Klicka "Bjud in användare" och ange e-post, roll (och kund om det gäller kundportal).',
            'Kopiera inloggningslänken ovan och skicka den till användaren.',
            'Användaren skapar ett konto — om e-posten matchar en inbjudan tilldelas rollen automatiskt.',
            'Inbjudan försvinner automatiskt när kontot skapas.',
          ].map((steg, i) => (
            <li key={i} style={{ fontSize: 13, color: 'var(--c-text2)', lineHeight: 1.5 }}>{steg}</li>
          ))}
        </ol>
      </div>

      {/* Säkerhetsnotis */}
      <div style={{
        marginTop: 24, padding: '16px 20px',
        background: 'var(--c-surface)', border: '1px solid #f59e0b44',
        borderLeft: '3px solid #f59e0b', borderRadius: '0 12px 12px 0',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <Shield size={15} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f59e0b', marginBottom: 6 }}>
              Säkerhet – rollstyrning är klientbaserad
            </div>
            <div style={{ fontSize: 12, color: 'var(--c-text2)', lineHeight: 1.7 }}>
              Applikationens rollstyrning kontrolleras i webbläsaren. För fullständig datasäkerhet
              rekommenderas att <strong style={{ color: 'var(--c-text)' }}>Row Level Security (RLS)</strong> aktiveras
              i Supabase, så att databas­åtkomsten begränsas server-sida per roll.
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--c-text2)', lineHeight: 1.7 }}>
              <strong style={{ color: 'var(--c-text)' }}>Aktivera RLS:</strong>{' '}
              Supabase Dashboard → Table Editor → välj tabell → Enable RLS → skapa policies per roll.
            </div>
          </div>
        </div>
      </div>

      {/* Medarbetare */}
      <TeknikerPanel tekniker={tekniker} onLaggTill={onLaggTillTekniker} onTaBort={onTaBortTekniker} />

      {/* Protokollmallar */}
      <ProtokollMallar
        mallar={protokollMallar}
        onSpara={onSparaProtokollMallar}
        titel="Protokollmallar – Service"
        beskrivning="Checklistor per porttyp som används vid serviceprotokoll"
      />

      {/* Monteringsmallar */}
      <ProtokollMallar
        mallar={montagemallar}
        onSpara={onSparaMontagemallar}
        titel="Monteringsmallar – Egenkontroll"
        beskrivning="Egenkontroll-checklistor per porttyp som används vid monteringsprotokoll"
      />

    </div>
  )
}
