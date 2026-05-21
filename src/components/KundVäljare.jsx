import { useState } from 'react'
import { Plus, X, Check } from 'lucide-react'

/**
 * KundVäljare – select from existing customers or add a new one inline.
 *
 * Props:
 *   kunder      – array of { id, namn, … }
 *   value       – currently selected kund name (string)
 *   onChange    – called with kund name string when selection changes
 *   onNyKund    – async (namn: string) => void  – saves new kund to DB
 *   style       – style object applied to the select / input
 *   placeholder – placeholder for the "none selected" option
 */
export default function KundVäljare({ kunder = [], value, onChange, onNyKund, style = {}, placeholder = '– Välj kund –' }) {
  const [läggTill, setLäggTill] = useState(false)
  const [nyNamn,   setNyNamn]   = useState('')
  const [sparar,   setSparar]   = useState(false)

  const spara = async () => {
    const namn = nyNamn.trim()
    if (!namn) return
    setSparar(true)
    try {
      await onNyKund(namn)
      onChange(namn)
    } finally {
      setSparar(false)
      setNyNamn('')
      setLäggTill(false)
    }
  }

  const avbryt = () => { setLäggTill(false); setNyNamn('') }

  const btnBase = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, border: '1px solid var(--c-border2)',
    borderRadius: 6, cursor: 'pointer', padding: '0 8px',
    height: style.padding ? undefined : 34,
    fontSize: 12, background: 'var(--c-bg)', color: 'var(--c-text2)',
  }

  if (läggTill) {
    return (
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          type="text"
          value={nyNamn}
          onChange={e => setNyNamn(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') spara(); if (e.key === 'Escape') avbryt() }}
          placeholder="Nytt kundnamn…"
          style={{ ...style, flex: 1 }}
          autoFocus
        />
        <button
          onClick={spara}
          disabled={sparar || !nyNamn.trim()}
          title="Spara ny kund"
          style={{ ...btnBase, background: 'var(--c-teal-bg)', borderColor: 'var(--c-teal)', color: 'var(--c-teal-text)' }}
        >
          {sparar ? '…' : <Check size={14} />}
        </button>
        <button onClick={avbryt} title="Avbryt" style={btnBase}>
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ ...style, flex: 1 }}>
        <option value="">{placeholder}</option>
        {kunder.map(k => <option key={k.id} value={k.namn}>{k.namn}</option>)}
      </select>
      <button
        onClick={() => setLäggTill(true)}
        title="Lägg till ny kund"
        style={{ ...btnBase, background: 'var(--c-teal-bg)', borderColor: 'var(--c-teal)', color: 'var(--c-teal-text)' }}
      >
        <Plus size={14} />
      </button>
    </div>
  )
}
