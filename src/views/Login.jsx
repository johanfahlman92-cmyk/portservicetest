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
      padding: 16,
      background: 'linear-gradient(145deg, #060f1e 0%, #0d2040 40%, #1C3461 75%, #0a3d3a 100%)',
      backgroundAttachment: 'fixed',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50%       { opacity: 0.85; transform: scale(1.12); }
        }
        @keyframes glow-pulse2 {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50%       { opacity: 0.7; transform: scale(1.08); }
        }
        @keyframes door-glow {
          0%, 100% { filter: drop-shadow(0 0 6px rgba(13,148,136,0.35)); }
          50%       { filter: drop-shadow(0 0 18px rgba(13,148,136,0.7)); }
        }
      `}</style>

      {/* Teal glow – uppe till vänster */}
      <div style={{
        position: 'fixed', top: -80, left: -80, width: 500, height: 500,
        borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(circle, rgba(13,148,136,0.28) 0%, transparent 65%)',
        animation: 'glow-pulse 6s ease-in-out infinite',
      }} />
      {/* Blå glow – mitten höger */}
      <div style={{
        position: 'fixed', top: '30%', right: -60, width: 420, height: 420,
        borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(circle, rgba(28,100,180,0.22) 0%, transparent 65%)',
        animation: 'glow-pulse2 8s ease-in-out infinite',
      }} />
      {/* Teal glow – nere mitten */}
      <div style={{
        position: 'fixed', bottom: -60, left: '35%', width: 380, height: 380,
        borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(circle, rgba(13,148,136,0.18) 0%, transparent 65%)',
        animation: 'glow-pulse 9s ease-in-out infinite 2s',
      }} />

      {/* Sektionsport – SVG */}
      <svg
        viewBox="0 0 340 300"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          position: 'fixed', bottom: -30, right: -60,
          width: 700, height: 620,
          opacity: 0.18, pointerEvents: 'none', zIndex: 0,
          animation: 'door-glow 6s ease-in-out infinite',
        }}
      >
        {/* Ytterram */}
        <rect x="8" y="8" width="324" height="284" rx="3"
          fill="rgba(13,148,136,0.08)" stroke="#0D9488" strokeWidth="4"/>

        {/* Panel 1 – överst, solid */}
        <rect x="8" y="8" width="324" height="52" fill="rgba(13,148,136,0.18)" stroke="#0D9488" strokeWidth="1.5"/>
        {/* Horisontell rib */}
        <line x1="8" y1="34" x2="332" y2="34" stroke="#0D9488" strokeWidth="0.8" strokeOpacity="0.5"/>

        {/* Panel 2 – solid */}
        <rect x="8" y="60" width="324" height="68" fill="rgba(13,148,136,0.18)" stroke="#0D9488" strokeWidth="1.5"/>
        <line x1="8" y1="94" x2="332" y2="94" stroke="#0D9488" strokeWidth="0.8" strokeOpacity="0.5"/>

        {/* Panel 3 – 4 stora fönster i rad */}
        <rect x="8" y="128" width="324" height="52" fill="rgba(13,148,136,0.14)" stroke="#0D9488" strokeWidth="1.5"/>
        {[0,1,2,3].map(i => (
          <g key={i}>
            <rect x={19 + i*79} y="135" width="65" height="38" rx="2"
              fill="rgba(13,148,136,0.28)" stroke="#0D9488" strokeWidth="1.5"/>
            {/* Fönsterpost vertikal i mitten */}
            <line x1={51.5 + i*79} y1="135" x2={51.5 + i*79} y2="173" stroke="#0D9488" strokeWidth="1"/>
          </g>
        ))}

        {/* Panel 4 */}
        <rect x="8" y="180" width="324" height="52" fill="rgba(13,148,136,0.18)" stroke="#0D9488" strokeWidth="1.5"/>
        <line x1="8" y1="206" x2="332" y2="206" stroke="#0D9488" strokeWidth="0.8" strokeOpacity="0.5"/>

        {/* Panel 5 – underst */}
        <rect x="8" y="232" width="324" height="60" fill="rgba(13,148,136,0.18)" stroke="#0D9488" strokeWidth="1.5"/>
        <line x1="8" y1="258" x2="332" y2="258" stroke="#0D9488" strokeWidth="0.8" strokeOpacity="0.5"/>

        {/* Skenor */}
        <rect x="0" y="8" width="6" height="284" fill="rgba(13,148,136,0.35)"/>
        <rect x="334" y="8" width="6" height="284" fill="rgba(13,148,136,0.35)"/>
      </svg>

      {/* Vikport 4-delad – SVG */}
      <svg
        viewBox="0 0 340 300"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          position: 'fixed', bottom: -30, left: -50,
          width: 660, height: 580,
          opacity: 0.18, pointerEvents: 'none', zIndex: 0,
          animation: 'door-glow 6s ease-in-out infinite 1.5s',
        }}
      >
        {/* Övre skena */}
        <rect x="0" y="0" width="340" height="10" fill="rgba(13,148,136,0.5)"/>
        {/* Nedre tröskel */}
        <rect x="0" y="290" width="340" height="10" fill="rgba(13,148,136,0.5)"/>

        {/* 4 vertikala paneler */}
        {[0,1,2,3].map(i => (
          <g key={i}>
            {/* Fylld panel */}
            <rect x={4 + i*84} y="10" width="80" height="280"
              fill="rgba(13,148,136,0.18)" stroke="#0D9488" strokeWidth="2"/>

            {/* Vertikala ribs */}
            <line x1={24 + i*84} y1="10" x2={24 + i*84} y2="290" stroke="#0D9488" strokeWidth="0.7" strokeOpacity="0.4"/>
            <line x1={44 + i*84} y1="10" x2={44 + i*84} y2="290" stroke="#0D9488" strokeWidth="0.7" strokeOpacity="0.4"/>
            <line x1={64 + i*84} y1="10" x2={64 + i*84} y2="290" stroke="#0D9488" strokeWidth="0.7" strokeOpacity="0.4"/>

            {/* Horisontell förstyvare */}
            <rect x={6 + i*84} y="130" width="76" height="6" rx="1"
              fill="rgba(13,148,136,0.35)" stroke="#0D9488" strokeWidth="1"/>

            {/* Fönster – portrait, nedre halvan */}
            <rect x={16 + i*84} y="180" width="48" height="80" rx="2"
              fill="rgba(13,148,136,0.28)" stroke="#0D9488" strokeWidth="1.5"/>
            {/* Fönsterpost horisontell */}
            <line x1={16 + i*84} y1="220" x2={64 + i*84} y2="220" stroke="#0D9488" strokeWidth="1"/>
            {/* Fönsterpost vertikal */}
            <line x1={40 + i*84} y1="180" x2={40 + i*84} y2="260" stroke="#0D9488" strokeWidth="1"/>
          </g>
        ))}

        {/* Tunga gångjärn / skarvprofiler mellan paneler */}
        {[84, 168, 252].map(x => (
          <g key={x}>
            <rect x={x} y="10" width="8" height="280" fill="rgba(13,148,136,0.5)" stroke="#0D9488" strokeWidth="1"/>
            {/* Gångjärn */}
            {[50, 145, 240].map(y => (
              <rect key={y} x={x - 4} y={y} width="16" height="12" rx="2"
                fill="rgba(13,148,136,0.7)" stroke="#0D9488" strokeWidth="1"/>
            ))}
          </g>
        ))}
      </svg>

      {/* Företagsnamn i bakgrunden */}
      <div style={{
        position: 'fixed', bottom: 24, left: 0, right: 0,
        textAlign: 'center', pointerEvents: 'none', zIndex: 0,
        fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.12)', fontWeight: 600,
      }}>
        NMV Portservice · Servicehanteringssystem
      </div>

      <div style={{
        width: '100%', maxWidth: 380, position: 'relative', zIndex: 1,
        background: 'rgba(255,255,255,0.97)', borderRadius: 16, padding: '32px 28px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(13,148,136,0.15)',
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

