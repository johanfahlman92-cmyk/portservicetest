import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import logo from '../logo.png'

export default function Login() {
  const [epost, setEpost]       = useState('')
  const [losenord, setLosenord] = useState('')
  const [fel, setFel]           = useState('')
  const [laddar, setLaddar]     = useState(false)

  const loggaIn = async (e) => {
    e.preventDefault()
    setFel('')
    setLaddar(true)
    const { error } = await supabase.auth.signInWithPassword({ email: epost, password: losenord })
    setLaddar(false)
    if (error) setFel('Fel e-post eller lösenord.')
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
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src={logo} alt="NMV Portservice" style={{ width: 150, marginBottom: 16 }} />
          <div style={{ fontSize: 13, color: 'var(--c-text2)' }}>Logga in för att fortsätta</div>
        </div>

        <form onSubmit={loggaIn}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: 'var(--c-text2)', display: 'block', marginBottom: 5 }}>E-post</label>
            <input
              type="email" value={epost} onChange={e => setEpost(e.target.value)}
              required placeholder="din@epost.se" autoComplete="email"
              style={{ fontSize: 15, padding: '10px 12px' }}
            />
          </div>

          <div style={{ marginBottom: 22 }}>
            <label style={{ fontSize: 12, color: 'var(--c-text2)', display: 'block', marginBottom: 5 }}>Lösenord</label>
            <input
              type="password" value={losenord} onChange={e => setLosenord(e.target.value)}
              required placeholder="••••••••" autoComplete="current-password"
              style={{ fontSize: 15, padding: '10px 12px' }}
            />
          </div>

          {fel && (
            <div style={{ fontSize: 12, color: 'var(--c-red)', background: 'var(--c-red-bg)', padding: '8px 12px', borderRadius: 8, marginBottom: 14 }}>
              {fel}
            </div>
          )}

          <button type="submit" disabled={laddar} style={{
            width: '100%', padding: '11px', fontSize: 15, fontWeight: 600,
            background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8,
            cursor: laddar ? 'default' : 'pointer', opacity: laddar ? 0.7 : 1,
          }}>
            {laddar ? 'Loggar in…' : 'Logga in'}
          </button>
        </form>
      </div>
    </div>
  )
}
