import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { Paperclip, Upload, ExternalLink, Trash2 } from 'lucide-react'

// ── Hjälpfunktioner ────────────────────────────────────────────────────────────
function getTyp(namn) {
  const ext = (namn.split('.').pop() || '').toLowerCase()
  if (ext === 'pdf') return 'pdf'
  if (['jpg','jpeg','png','gif','webp','heic'].includes(ext)) return 'bild'
  if (['doc','docx','xls','xlsx'].includes(ext)) return 'dokument'
  return 'annat'
}

function formatStorlek(b) {
  if (!b) return ''
  if (b < 1024)    return `${b} B`
  if (b < 1048576) return `${Math.round(b / 1024)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}

// ── Komponent ─────────────────────────────────────────────────────────────────
// Props:
//   objektId           – port-ID (text)
//   initialFiler       – array med befintliga filer från port_filer (default [])
//   onFilerUppdaterade – callback(nyArray) när listan förändras
//   readOnly           – visa bara listan, inget uppladdningsgränssnitt
export default function FilUppladdning({ objektId, initialFiler = [], onFilerUppdaterade, readOnly = false }) {
  const [filer,     setFiler]     = useState(initialFiler)
  const [dragOver,  setDragOver]  = useState(false)
  const [laddarUpp, setLaddarUpp] = useState(false)
  const [felMsg,    setFelMsg]    = useState('')
  const inputRef = useRef()

  // Synka om föräldrar skickar nya filer
  useEffect(() => { setFiler(initialFiler) }, [JSON.stringify(initialFiler)])

  const laddaUpp = async (files) => {
    if (!files?.length || laddarUpp) return
    setLaddarUpp(true); setFelMsg('')
    const nyFiler = []

    for (const file of Array.from(files)) {
      try {
        // Sanitera filnamnet för Storage-pathen
        const säker = file.name.replace(/[^a-zA-Z0-9._\-åäöÅÄÖ ]/g, '_')
        const path  = `${objektId}/${Date.now()}_${säker}`

        const { error: upErr } = await supabase.storage
          .from('port-filer')
          .upload(path, file, { upsert: false })
        if (upErr) throw upErr

        const { data: { publicUrl } } = supabase.storage
          .from('port-filer')
          .getPublicUrl(path)

        const { data: row, error: dbErr } = await supabase
          .from('port_filer')
          .insert({ objekt_id: objektId, namn: file.name, url: publicUrl, typ: getTyp(file.name), storlek: file.size })
          .select()
          .single()
        if (dbErr) throw dbErr

        nyFiler.push(row)
      } catch (err) {
        setFelMsg(`Kunde inte ladda upp "${file.name}": ${err.message}`)
      }
    }

    if (nyFiler.length) {
      const uppdaterade = [...filer, ...nyFiler]
      setFiler(uppdaterade)
      onFilerUppdaterade?.(uppdaterade)
    }
    setLaddarUpp(false)
  }

  const taBort = async (fil) => {
    if (!window.confirm(`Ta bort "${fil.namn}"?`)) return
    // Försök ta bort från Storage
    try {
      const path = decodeURIComponent(
        (fil.url.split('/port-filer/')[1] || '').split('?')[0]
      )
      if (path) await supabase.storage.from('port-filer').remove([path])
    } catch { /* ignorera storage-fel */ }

    await supabase.from('port_filer').delete().eq('id', fil.id)
    const uppdaterade = filer.filter(f => f.id !== fil.id)
    setFiler(uppdaterade)
    onFilerUppdaterade?.(uppdaterade)
  }

  return (
    <div>
      {/* Drop Zone – döljs i readOnly-läge */}
      {!readOnly && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); laddaUpp(e.dataTransfer.files) }}
          onClick={() => !laddarUpp && inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? 'var(--c-teal)' : 'var(--c-border)'}`,
            borderRadius: 10, padding: '18px 16px', textAlign: 'center',
            cursor: laddarUpp ? 'default' : 'pointer',
            background: dragOver ? 'var(--c-teal-bg)' : 'var(--c-bg)',
            transition: 'all 0.15s',
            marginBottom: filer.length > 0 ? 10 : 0,
          }}
        >
          <input
            ref={inputRef} type="file" multiple style={{ display: 'none' }}
            onChange={e => laddaUpp(e.target.files)}
            disabled={laddarUpp}
          />
          <Upload
            size={20}
            color={dragOver ? 'var(--c-teal)' : 'var(--c-text3)'}
            style={{ margin: '0 auto 8px', display: 'block' }}
          />
          {laddarUpp
            ? <div style={{ fontSize: 13, color: 'var(--c-teal)', fontWeight: 600 }}>Laddar upp…</div>
            : <>
                <div style={{ fontSize: 13, fontWeight: 600, color: dragOver ? 'var(--c-teal-text)' : 'var(--c-text2)' }}>
                  {dragOver ? 'Släpp för att ladda upp' : 'Dra och släpp filer här'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 3 }}>
                  eller klicka för att välja fil
                </div>
              </>
          }
        </div>
      )}

      {felMsg && (
        <div style={{ fontSize: 12, color: 'var(--c-red)', margin: '6px 0' }}>{felMsg}</div>
      )}

      {/* Fillista */}
      {filer.length > 0 && (
        <div style={{ border: '1px solid var(--c-border)', borderRadius: 8, overflow: 'hidden' }}>
          {filer.map((f, i) => (
            <div
              key={f.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px',
                borderBottom: i < filer.length - 1 ? '1px solid var(--c-border)' : 'none',
                background: 'var(--c-surface)',
              }}
            >
              <Paperclip size={14} color="var(--c-text3)" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.namn}
                </div>
                <div style={{ fontSize: 11, color: 'var(--c-text3)' }}>
                  {[f.typ && f.typ !== 'annat' ? f.typ.toUpperCase() : null, f.storlek ? formatStorlek(f.storlek) : null]
                    .filter(Boolean).join(' · ')}
                </div>
              </div>
              <a
                href={f.url} target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--c-blue)', flexShrink: 0, display: 'flex', padding: 4 }}
                onClick={e => e.stopPropagation()}
                title="Öppna fil"
              >
                <ExternalLink size={14} />
              </a>
              {!readOnly && (
                <button
                  onClick={() => taBort(f)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-red)', flexShrink: 0, display: 'flex', padding: 4 }}
                  title="Ta bort fil"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!readOnly && filer.length === 0 && !dragOver && (
        <div style={{ fontSize: 11, color: 'var(--c-text3)', textAlign: 'center', marginTop: 4 }}>
          Inga filer uppladdade ännu
        </div>
      )}
    </div>
  )
}
