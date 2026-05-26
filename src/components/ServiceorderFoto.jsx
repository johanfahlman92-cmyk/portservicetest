import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { Camera, Image, X, ZoomIn, Loader } from 'lucide-react'

// ── ServiceorderFoto ──────────────────────────────────────────────────────────
// Props:
//   orderId    – serviceorder ID (text)
//   readOnly   – visa bara foton, inga knappar
//   skapadAv   – teknikerns namn (sparas i DB)
export default function ServiceorderFoto({ orderId, readOnly = false, skapadAv = '' }) {
  const [foton,     setFoton]     = useState([])
  const [laddar,    setLaddar]    = useState(false)
  const [fel,       setFel]       = useState('')
  const [lightbox,  setLightbox]  = useState(null)   // foto-objekt att visa fullskärm
  const kameraRef   = useRef()
  const bibliotekRef = useRef()

  // Ladda befintliga foton
  useEffect(() => {
    if (!orderId) return
    supabase
      .from('serviceorder_foton')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at')
      .then(({ data }) => { if (data) setFoton(data) })
  }, [orderId])

  // ── Ladda upp ──────────────────────────────────────────────────────────────
  const laddaUpp = async (files) => {
    if (!files?.length || laddar) return
    setLaddar(true)
    setFel('')
    const nya = []

    for (const file of Array.from(files)) {
      try {
        const ext  = (file.name.split('.').pop() || 'jpg').toLowerCase()
        const namn = `foto_${Date.now()}.${ext}`
        const path = `${orderId}/${namn}`

        const { error: upErr } = await supabase.storage
          .from('serviceorder-foton')
          .upload(path, file, { upsert: false })
        if (upErr) throw upErr

        const { data: { publicUrl } } = supabase.storage
          .from('serviceorder-foton')
          .getPublicUrl(path)

        const { data: row, error: dbErr } = await supabase
          .from('serviceorder_foton')
          .insert({
            order_id:  orderId,
            url:       publicUrl,
            namn:      file.name,
            storlek:   file.size,
            skapad_av: skapadAv,
          })
          .select()
          .single()
        if (dbErr) throw dbErr

        nya.push(row)
      } catch (err) {
        setFel(`Kunde inte ladda upp: ${err.message}`)
      }
    }

    if (nya.length) setFoton(p => [...p, ...nya])
    setLaddar(false)
  }

  // ── Ta bort ───────────────────────────────────────────────────────────────
  const taBort = async (foto) => {
    if (!window.confirm('Ta bort foto?')) return
    try {
      const path = decodeURIComponent(
        (foto.url.split('/serviceorder-foton/')[1] || '').split('?')[0]
      )
      if (path) await supabase.storage.from('serviceorder-foton').remove([path])
    } catch { /* ignorera storage-fel */ }

    await supabase.from('serviceorder_foton').delete().eq('id', foto.id)
    setFoton(p => p.filter(f => f.id !== foto.id))
    if (lightbox?.id === foto.id) setLightbox(null)
  }

  // ── Navigera i lightbox ───────────────────────────────────────────────────
  const gåTill = (riktning) => {
    const idx = foton.findIndex(f => f.id === lightbox.id)
    const nytt = foton[idx + riktning]
    if (nytt) setLightbox(nytt)
  }

  return (
    <div>
      {/* Knappar – döljs i readOnly */}
      {!readOnly && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: foton.length ? 12 : 4 }}>
          <button
            onClick={() => kameraRef.current?.click()}
            disabled={laddar}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 16px', borderRadius: 9,
              border: '1px solid var(--c-teal)', background: 'var(--c-teal-bg)',
              color: 'var(--c-teal-text)', cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
            }}
          >
            <Camera size={15} />
            Ta foto
          </button>
          <button
            onClick={() => bibliotekRef.current?.click()}
            disabled={laddar}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 16px', borderRadius: 9,
              border: '1px solid var(--c-border)', background: 'var(--c-surface)',
              color: 'var(--c-text2)', cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
            }}
          >
            <Image size={15} />
            Välj från bibliotek
          </button>
          {laddar && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--c-teal)' }}>
              <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} />
              Laddar upp…
            </span>
          )}

          {/* Doldа inputs */}
          <input
            ref={kameraRef}
            type="file" accept="image/*" capture="environment"
            style={{ display: 'none' }}
            onChange={e => { laddaUpp(e.target.files); e.target.value = '' }}
          />
          <input
            ref={bibliotekRef}
            type="file" accept="image/*" multiple
            style={{ display: 'none' }}
            onChange={e => { laddaUpp(e.target.files); e.target.value = '' }}
          />
        </div>
      )}

      {/* Felmeddelande */}
      {fel && (
        <div style={{ fontSize: 12, color: 'var(--c-red)', marginBottom: 8 }}>{fel}</div>
      )}

      {/* Fotogalleri */}
      {foton.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
          gap: 8,
        }}>
          {foton.map((foto, idx) => (
            <div
              key={foto.id}
              style={{
                position: 'relative', borderRadius: 8, overflow: 'hidden',
                aspectRatio: '1', background: 'var(--c-border)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
              }}
            >
              <img
                src={foto.url} alt={`Foto ${idx + 1}`}
                onClick={() => setLightbox(foto)}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', cursor: 'pointer' }}
                loading="lazy"
              />
              {/* Zooma */}
              <button
                onClick={() => setLightbox(foto)}
                style={{
                  position: 'absolute', bottom: 4, right: 4,
                  background: 'rgba(0,0,0,0.50)', border: 'none', borderRadius: 5,
                  width: 22, height: 22, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', cursor: 'pointer', padding: 0,
                }}
              >
                <ZoomIn size={12} color="#fff" />
              </button>
              {/* Ta bort */}
              {!readOnly && (
                <button
                  onClick={(e) => { e.stopPropagation(); taBort(foto) }}
                  style={{
                    position: 'absolute', top: 4, right: 4,
                    background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%',
                    width: 20, height: 20, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', cursor: 'pointer', padding: 0,
                  }}
                >
                  <X size={11} color="#fff" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        !readOnly && !laddar && (
          <div style={{ fontSize: 11, color: 'var(--c-text3)' }}>Inga foton tagna ännu</div>
        )
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.90)',
            zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {/* Stäng */}
          <button
            onClick={() => setLightbox(null)}
            style={{
              position: 'absolute', top: 14, right: 14,
              background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
              width: 36, height: 36, display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <X size={18} color="#fff" />
          </button>

          {/* Föregående */}
          {foton.findIndex(f => f.id === lightbox.id) > 0 && (
            <button
              onClick={e => { e.stopPropagation(); gåTill(-1) }}
              style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
                width: 40, height: 40, display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer', fontSize: 20, color: '#fff',
              }}
            >‹</button>
          )}

          {/* Nästa */}
          {foton.findIndex(f => f.id === lightbox.id) < foton.length - 1 && (
            <button
              onClick={e => { e.stopPropagation(); gåTill(1) }}
              style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
                width: 40, height: 40, display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer', fontSize: 20, color: '#fff',
              }}
            >›</button>
          )}

          {/* Foto */}
          <img
            src={lightbox.url} alt="Foto"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '94vw', maxHeight: '88vh', borderRadius: 10, objectFit: 'contain' }}
          />

          {/* Räknare */}
          <div style={{
            position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
            color: 'rgba(255,255,255,0.6)', fontSize: 12,
          }}>
            {foton.findIndex(f => f.id === lightbox.id) + 1} / {foton.length}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
