import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import logo from '../logo.png'

export default function Login() {
  const [läge,     setLäge]     = useState('in')   // 'in' | 'skapa' | 'reset'
  const [epost,    setEpost]    = useState('')
  const [losenord, setLosenord] = useState('')
  const [losenord2,setLosenord2]= useState('')
  const [fel,      setFel]      = useState('')
  const [ok,       setOk]       = useState('')
  const [laddar,   setLaddar]   = useState(false)

  const byt = (nytt) => { setLäge(nytt); setFel(''); setOk('') }

  // ── Logga in ───────────────────────────────────────────────────────────────
  const loggaIn = async (e) => {
    e.preventDefault(); setFel(''); setLaddar(true)
    const { error } = await supabase.auth.signInWithPassword({ email: epost, password: losenord })
    setLaddar(false)
    if (error) setFel('Fel e-post eller lösenord.')
  }

  // ── Skapa konto ────────────────────────────────────────────────────────────
  const skapaKonto = async (e) => {
    e.preventDefault(); setFel('')
    if (losenord !== losenord2) { setFel('Lösenorden matchar inte.'); return }
    if (losenord.length < 6)   { setFel('Lösenordet måste vara minst 6 tecken.'); return }
    setLaddar(true)
    const { error } = await supabase.auth.signUp({ email: epost, password: losenord })
    setLaddar(false)
    if (error) { setFel('Kunde inte skapa konto: ' + error.message); return }
    setOk('Konto skapat! Kolla din e-post för att bekräfta — logga sedan in.')
    setLäge('in')
  }

  // ── Återställ lösenord ─────────────────────────────────────────────────────
  const skickaReset = async (e) => {
    e.preventDefault(); setFel(''); setLaddar(true)
    const { error } = await supabase.auth.resetPasswordForEmail(epost, {
      redirectTo: window.location.origin,
    })
    setLaddar(false)
    if (error) { setFel('Kunde inte skicka: ' + error.message); return }
    setOk('Länk skickad! Kolla din e-post.')
  }

  const FÄLT = {
    width: '100%', fontSize: 15, padding: '10px 12px',
    border: '1px solid #ddd', borderRadius: 8, boxSizing: 'border-box',
    outline: 'none', fontFamily: 'inherit', color: '#1a1917',
  }
  const BTN = {
    width: '100%', padding: '11px', fontSize: 15, fontWeight: 600,
    background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8,
    cursor: laddar ? 'default' : 'pointer', opacity: laddar ? 0.7 : 1,
    marginTop: 4,
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#1a1917', padding: 16,
    }}>
      <div style={{
        width: '100%', maxWidth: 380,
        background: '#ffffff', borderRadius: 16, padding: '32px 28px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <img src={logo} alt="NMV Portservice" style={{ width: 150, marginBottom: 12 }} />
        </div>

        {/* Flikar */}
        {läge !== 'reset' && (
          <div style={{ display: 'flex', background: '#f4f4f2', borderRadius: 10, padding: 3, marginBottom: 24 }}>
            {[['in', 'Logga in'], ['skapa', 'Skapa konto']].map(([id, label]) => (
              <button key={id} onClick={() => byt(id)} style={{
                flex: 1, padding: '7px', fontSize: 13, fontWeight: 600, border: 'none',
                borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
                background: läge === id ? '#fff' : 'transparent',
                color: läge === id ? '#1a1917' : '#888',
                boxShadow: läge === id ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              }}>{label}</button>
            ))}
          </div>
        )}

        {/* OK-meddelande */}
        {ok && (
          <div style={{ fontSize: 13, color: '#1D9E75', background: '#f0faf6', padding: '10px 12px', borderRadius: 8, marginBottom: 16, textAlign: 'center' }}>
            {ok}
          </div>
        )}

        {/* ── Logga in ── */}
        {läge === 'in' && (
          <form onSubmit={loggaIn}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 5 }}>E-post</label>
              <input type="email" value={epost} onChange={e => setEpost(e.target.value)} required placeholder="din@epost.se" autoComplete="email" style={FÄLT} />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 5 }}>Lösenord</label>
              <input type="password" value={losenord} onChange={e => setLosenord(e.target.value)} required placeholder="••••••••" autoComplete="current-password" style={FÄLT} />
            </div>
            <div style={{ textAlign: 'right', marginBottom: 18 }}>
              <button type="button" onClick={() => byt('reset')} style={{ background: 'none', border: 'none', fontSize: 12, color: '#1D9E75', cursor: 'pointer', padding: 0 }}>
                Glömt lösenord?
              </button>
            </div>
            {fel && <div style={{ fontSize: 12, color: '#c0392b', background: '#fdf0f0', padding: '8px 12px', borderRadius: 8, marginBottom: 14 }}>{fel}</div>}
            <button type="submit" disabled={laddar} style={BTN}>{laddar ? 'Loggar in…' : 'Logga in'}</button>
          </form>
        )}

        {/* ── Skapa konto ── */}
        {läge === 'skapa' && (
          <form onSubmit={skapaKonto}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 5 }}>E-post</label>
              <input type="email" value={epost} onChange={e => setEpost(e.target.value)} required placeholder="din@epost.se" autoComplete="email" style={FÄLT} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 5 }}>Lösenord</label>
              <input type="password" value={losenord} onChange={e => setLosenord(e.target.value)} required placeholder="Minst 6 tecken" autoComplete="new-password" style={FÄLT} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 5 }}>Bekräfta lösenord</label>
              <input type="password" value={losenord2} onChange={e => setLosenord2(e.target.value)} required placeholder="••••••••" autoComplete="new-password" style={FÄLT} />
            </div>
            {fel && <div style={{ fontSize: 12, color: '#c0392b', background: '#fdf0f0', padding: '8px 12px', borderRadius: 8, marginBottom: 14 }}>{fel}</div>}
            <button type="submit" disabled={laddar} style={BTN}>{laddar ? 'Skapar konto…' : 'Skapa konto'}</button>
            <p style={{ fontSize: 12, color: '#999', textAlign: 'center', marginTop: 12, marginBottom: 0 }}>
              Kontot kopplas automatiskt till rätt roll om du är inbjuden.
            </p>
          </form>
        )}

        {/* ── Glömt lösenord ── */}
        {läge === 'reset' && (
          <form onSubmit={skickaReset}>
            <div style={{ fontSize: 13, color: '#555', marginBottom: 18, textAlign: 'center' }}>
              Ange din e-post så skickar vi en länk för att sätta nytt lösenord.
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 5 }}>E-post</label>
              <input type="email" value={epost} onChange={e => setEpost(e.target.value)} required placeholder="din@epost.se" autoComplete="email" style={FÄLT} />
            </div>
            {fel && <div style={{ fontSize: 12, color: '#c0392b', background: '#fdf0f0', padding: '8px 12px', borderRadius: 8, marginBottom: 14 }}>{fel}</div>}
            <button type="submit" disabled={laddar} style={BTN}>{laddar ? 'Skickar…' : 'Skicka återställningslänk'}</button>
            <button type="button" onClick={() => byt('in')} style={{
              width: '100%', marginTop: 10, padding: '9px', fontSize: 13,
              background: 'none', border: '1px solid #ddd', borderRadius: 8,
              color: '#666', cursor: 'pointer',
            }}>← Tillbaka</button>
          </form>
        )}

      </div>
    </div>
  )
}
