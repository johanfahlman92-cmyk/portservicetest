import { useState, useRef } from 'react'
import { Upload, FileText, X as XIcon } from 'lucide-react'
import { supabase } from '../lib/supabase.js'

function formatStorlek(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function DokumentZon({ dokument = [], onChange }) {
  const [dragging, setDragging] = useState(false)
  const [laddar,   setLaddar]   = useState(false)
  const [fel,      setFel]      = useState('')
  const inputRef = useRef(null)

  const laddaUpp = async (files) => {
    setLaddar(true); setFel('')
    const nya = []
    for (const fil of Array.from(files)) {
      const safeName = fil.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `${Date.now()}-${safeName}`
      const { data, error } = await supabase.storage.from('dokument').upload(path, fil, { upsert: false })
      if (error) {
        setFel(`Kunde inte ladda upp "${fil.name}": ${error.message}`)
      } else {
        const { data: urlData } = supabase.storage.from('dokument').getPublicUrl(data.path)
        nya.push({ namn: fil.name, url: urlData.publicUrl, typ: fil.type, storlek: fil.size })
      }
    }
    if (nya.length) onChange([...dokument, ...nya])
    setLaddar(false)
  }

  const taBort = (idx) => onChange(dokument.filter((_, i) => i !== idx))

  return (
    <div>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={e => { e.preventDefault(); setDragging(false) }}
        onDrop={e => { e.preventDefault(); setDragging(false); laddaUpp(e.dataTransfer.files) }}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? 'var(--c-teal)' : 'var(--c-border)'}`,
          borderRadius: 10, padding: '24px 16px', textAlign: 'center',
          cursor: 'pointer', transition: 'all 0.15s',
          background: dragging ? 'var(--c-teal-bg)' : 'var(--c-bg)',
        }}
      >
        <input ref={inputRef} type="file" multiple hidden onChange={e => laddaUpp(e.target.files)} />
        <Upload size={26} color={dragging ? 'var(--c-teal)' : 'var(--c-text3)'}
          style={{ margin: '0 auto 8px', display: 'block' }} />
        {laddar ? (
          <div style={{ fontSize: 13, color: 'var(--c-text2)' }}>Laddar upp…</div>
        ) : (
          <>
            <div style={{ fontSize: 13, color: 'var(--c-text2)' }}>
              Dra och släpp filer här, eller{' '}
              <span style={{ color: 'var(--c-teal)', fontWeight: 500 }}>klicka för att bläddra</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 4 }}>
              PDF, bilder, ritningar, certifikat m.m.
            </div>
          </>
        )}
      </div>

      {fel && <div style={{ fontSize: 12, color: 'var(--c-red)', marginTop: 6 }}>{fel}</div>}

      {dokument.length > 0 && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {dokument.map((d, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', borderRadius: 8,
              background: 'var(--c-bg)', border: '1px solid var(--c-border)',
            }}>
              <FileText size={16} color="var(--c-blue)" style={{ flexShrink: 0 }} />
              <a href={d.url} target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                style={{ flex: 1, fontSize: 13, color: 'var(--c-text)', textDecoration: 'none',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {d.namn}
              </a>
              <div style={{ fontSize: 11, color: 'var(--c-text3)', flexShrink: 0 }}>
                {formatStorlek(d.storlek)}
              </div>
              <button
                onClick={e => { e.stopPropagation(); taBort(i) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text3)', padding: 2 }}
              >
                <XIcon size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
