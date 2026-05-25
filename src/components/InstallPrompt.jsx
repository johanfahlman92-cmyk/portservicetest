import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'

/**
 * InstallPrompt – visar en banner för att installera appen som PWA.
 * - Android/Chrome: fångar beforeinstallprompt och visar knapp
 * - iOS Safari: visar instruktion "Dela → Lägg till på hemskärmen"
 * Visas inte om appen redan körs som standalone (dvs. redan installerad).
 * Stängs och sparas i localStorage i 7 dagar.
 */
export default function InstallPrompt() {
  const [prompt,    setPrompt]    = useState(null)   // deferred Android-prompt
  const [visaIOS,   setVisaIOS]   = useState(false)
  const [avfardad,  setAvfardad]  = useState(false)

  useEffect(() => {
    // Redan installerad som standalone – visa inte
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    if (standalone) return

    // Avfärdad nyligen (7 dagar)
    const ts = localStorage.getItem('installPromptDismissed')
    if (ts && Date.now() - parseInt(ts) < 7 * 24 * 60 * 60 * 1000) return

    // Android / Chrome Desktop – beforeinstallprompt
    const handler = (e) => { e.preventDefault(); setPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)

    // iOS Safari
    const isIOS     = /iP(hone|ad|od)/.test(navigator.userAgent)
    const isSafari  = /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent)
    if (isIOS && isSafari) {
      const timer = setTimeout(() => setVisaIOS(true), 3500)
      return () => {
        window.removeEventListener('beforeinstallprompt', handler)
        clearTimeout(timer)
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const installera = async () => {
    if (!prompt) return
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') stang()
    setPrompt(null)
  }

  const stang = () => {
    localStorage.setItem('installPromptDismissed', Date.now().toString())
    setAvfardad(true)
    setVisaIOS(false)
    setPrompt(null)
  }

  if (avfardad || (!prompt && !visaIOS)) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 'calc(82px + env(safe-area-inset-bottom))',
      left: 12, right: 12,
      background: '#1C3461',
      color: '#fff',
      borderRadius: 16,
      padding: '14px 16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.30)',
      zIndex: 200,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      animation: 'slideUp 0.35s ease',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: 'rgba(255,255,255,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Download size={20} color="#fff"/>
      </div>

      <div style={{flex: 1, minWidth: 0}}>
        <div style={{fontSize: 14, fontWeight: 700, marginBottom: 2}}>
          Installera appen
        </div>
        {visaIOS ? (
          <div style={{fontSize: 12, opacity: 0.8, lineHeight: 1.5}}>
            Tryck på <strong style={{background:'rgba(255,255,255,0.2)',padding:'1px 5px',borderRadius:4}}>⎙ Dela</strong> och sedan <strong>"Lägg till på hemskärmen"</strong>
          </div>
        ) : (
          <div style={{fontSize: 12, opacity: 0.8}}>
            Snabbare åtkomst, fungerar offline
          </div>
        )}
      </div>

      {prompt && (
        <button
          onClick={installera}
          style={{
            padding: '9px 14px', borderRadius: 9,
            background: 'rgba(255,255,255,0.18)',
            border: '1px solid rgba(255,255,255,0.35)',
            color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', flexShrink: 0,
            whiteSpace: 'nowrap',
          }}>
          Installera
        </button>
      )}

      <button
        onClick={stang}
        style={{
          background: 'none', border: 'none',
          color: 'rgba(255,255,255,0.55)', cursor: 'pointer',
          padding: 4, flexShrink: 0, display: 'flex',
        }}>
        <X size={18}/>
      </button>
    </div>
  )
}
