import { useState } from 'react'
import { ChevronRight, UserPlus, CheckCircle, Search, Paperclip } from 'lucide-react'
import DokumentZon from '../components/DokumentZon.jsx'

const statusLabel = { ny: 'Ny', pagAr: 'Pågår', atgardad: 'Åtgärdad' }
const statusCls   = { ny: 'badge-red', pagAr: 'badge-amber', atgardad: 'badge-green' }
const prioLabel   = { normal: 'Normal', hog: 'Hög', akut: 'Akut' }
const prioCls     = { normal: 'badge-gray', hog: 'badge-amber', akut: 'badge-red' }

function ArendeDetalj({ a, tekniker, onUppdatera, onBack }) {
  const [visaTilldela, setVisaTilldela] = useState(false)
  const [valdTekniker, setValdTekniker] = useState(a.tekniker || '')
  const [sparar, setSparar] = useState(false)
  const [dokument, setDokument] = useState(a.dokument || [])

  const sparaDokument = async (nyaDok) => {
    setDokument(nyaDok)
    await onUppdatera(a.id, { dokument: nyaDok })
  }

  const tilldela = async () => {
    if (!valdTekniker) return
    setSparar(true)
    await onUppdatera(a.id, { tekniker: valdTekniker, status: 'pagAr' })
    setSparar(false)
    setVisaTilldela(false)
  }

  const stang = async () => {
    setSparar(true)
    await onUppdatera(a.id, { status: 'atgardad' })
    setSparar(false)
    onBack()
  }

  return (
    <div>
      <button className="btn" onClick={onBack} style={{ marginBottom: 16 }}>← Tillbaka</button>
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{a.namn}</div>
            <div style={{ fontSize: 11, color: 'var(--c-text2)' }}>Ärende #{a.nr} · {a.kund}</div>
          </div>
          <span className={`badge ${statusCls[a.status]}`}>{statusLabel[a.status]}</span>
        </div>
        {[
          ['Feltyp', a.feltyp],
          ['Prioritet', prioLabel[a.prioritet] || a.prioritet],
          ['Öppnad', a.datum],
          ['Kontakt', a.kontakt],
          ['Tekniker', a.tekniker || 'Ej tilldelad'],
          ['Planerat besök', a.besok || '–'],
        ].map(([l, v]) => (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--c-border)', fontSize: 12 }}>
            <span style={{ color: 'var(--c-text2)' }}>{l}</span>
            <span style={{ fontWeight: 500 }}>{v}</span>
          </div>
        ))}
      </div>

      {a.beskrivning && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="section-title">Kundens beskrivning</div>
          <div style={{ background: 'var(--c-bg)', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: 'var(--c-text2)', lineHeight: 1.7 }}>
            "{a.beskrivning}"
          </div>
        </div>
      )}

      {visaTilldela && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 10 }}>Tilldela tekniker</div>
          <select
            value={valdTekniker}
            onChange={e => setValdTekniker(e.target.value)}
            style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: '1px solid var(--c-border2)', borderRadius: 6, background: 'var(--c-bg)', marginBottom: 10 }}
          >
            <option value="">– Välj tekniker –</option>
            {tekniker.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={tilldela} disabled={sparar || !valdTekniker}>
              {sparar ? 'Sparar…' : 'Spara'}
            </button>
            <button className="btn" onClick={() => setVisaTilldela(false)}>Avbryt</button>
          </div>
        </div>
      )}

      {/* Dokument */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 7 }}>
          <Paperclip size={14} color="var(--c-blue)" /> Bilagor {dokument.length > 0 && `(${dokument.length})`}
        </div>
        <DokumentZon dokument={dokument} onChange={sparaDokument} />
      </div>

      {a.status !== 'atgardad' && (
        <div style={{ display: 'flex', gap: 8 }}>
          {!visaTilldela && (
            <button className="btn btn-primary" onClick={() => setVisaTilldela(true)}>
              <UserPlus size={14} /> {a.tekniker ? 'Byt tekniker' : 'Tilldela tekniker'}
            </button>
          )}
          <button className="btn" onClick={stang} disabled={sparar} style={{ background: 'var(--c-teal)', color: '#fff', borderColor: 'var(--c-teal)' }}>
            <CheckCircle size={14} /> Stäng ärende
          </button>
        </div>
      )}
    </div>
  )
}

export default function Arenden({ arenden = [], tekniker = [], onUppdatera }) {
  const [valt, setValt] = useState(null)
  const [filter, setFilter] = useState('oppna')
  const [sokText, setSokText] = useState('')

  const filtArenden = arenden.filter(a => {
    const statusOk = filter === 'alla' ? true : filter === 'oppna' ? a.status !== 'atgardad' : a.status === filter
    if (!statusOk) return false
    if (!sokText) return true
    const q = sokText.toLowerCase()
    return a.namn?.toLowerCase().includes(q) || a.kund?.toLowerCase().includes(q) ||
           a.feltyp?.toLowerCase().includes(q) || String(a.nr).includes(q)
  })

  if (valt) {
    const uppdaterat = arenden.find(a => a.id === valt.id) || valt
    return <ArendeDetalj a={uppdaterat} tekniker={tekniker} onUppdatera={onUppdatera} onBack={() => setValt(null)} />
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 2 }}>Ärenden</h1>
        <p style={{ color: 'var(--c-text2)', fontSize: 13 }}>Öppna och pågående serviceärenden</p>
      </div>

      <div style={{ position: 'relative', marginBottom: 10 }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text3)', pointerEvents: 'none' }} />
        <input type="text" placeholder="Sök ärende, kund, feltyp…" value={sokText} onChange={e => setSokText(e.target.value)}
          style={{ width: '100%', padding: '7px 10px 7px 32px', fontSize: 13, border: '1px solid var(--c-border)', borderRadius: 8, background: 'var(--c-surface)', color: 'var(--c-text)', boxSizing: 'border-box' }} />
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[['oppna', 'Öppna'], ['alla', 'Alla'], ['ny', 'Nya'], ['pagAr', 'Pågår'], ['atgardad', 'Åtgärdade']].map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)} style={{
            padding: '4px 12px', fontSize: 12, borderRadius: 20,
            border: '1px solid var(--c-border)',
            background: filter === id ? 'var(--c-text)' : 'transparent',
            color: filter === id ? '#fff' : 'var(--c-text2)',
            cursor: 'pointer',
          }}>{label}</button>
        ))}
      </div>

      <div className="card">
        {filtArenden.length === 0 && (
          <p style={{ color: 'var(--c-text2)', fontSize: 13 }}>Inga ärenden att visa.</p>
        )}
        {filtArenden.map(a => (
          <div key={a.id} className="row-item" onClick={() => setValt(a)} style={{ cursor: 'pointer' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
              background: a.status === 'ny' ? 'var(--c-red)' : a.status === 'pagAr' ? 'var(--c-amber)' : 'var(--c-teal)'
            }} />
            <div className="row-main">
              <div className="row-name">{a.namn}</div>
              <div className="row-sub">{a.feltyp} · {a.kund} · {a.datum}</div>
            </div>
            <div className="row-right">
              <span className={`badge ${prioCls[a.prioritet]}`}>{prioLabel[a.prioritet]}</span>
              <span className={`badge ${statusCls[a.status]}`}>{statusLabel[a.status]}</span>
              <ChevronRight size={16} color="var(--c-text3)" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
