import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { UserPlus, Trash2, Mail, Shield, User, ChevronDown, RefreshCw, Copy } from 'lucide-react'

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

export default function Installningar({ kunder }) {
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

    </div>
  )
}
