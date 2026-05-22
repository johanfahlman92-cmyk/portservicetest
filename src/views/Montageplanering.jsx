import { useState } from 'react'
import { Plus, Check, Clock, Package, Pencil, Printer, Search, ChevronDown, ChevronUp, ArrowRight, UserPlus } from 'lucide-react'
import logo from '../image-1779305303942.png'
import { protokollTyper } from '../data/store.js'

// Samma porttyper som i Portregister
const PORTTYPER      = Object.keys(protokollTyper)           // Vikport, Takskjutport, Lastbrygga, Grind
const FASTA_FABRIKAT = ['Torverk', 'Lindab', 'Hörmann', 'Beyron Door', 'Nordic Door']

const STATUS_CFG = {
  ej_planerad: { label: 'Ej planerad', color: '#9ca3af', bg: '#f3f4f6', Icon: Clock },
  planerad:    { label: 'Planerad',    color: '#2563eb', bg: '#eff6ff', Icon: Package },
  utford:      { label: 'Utförd',      color: '#16a34a', bg: '#f0fdf4', Icon: Check },
}

async function hämtaLogoBase64() {
  try {
    const res  = await fetch(logo)
    const blob = await res.blob()
    return new Promise(resolve => {
      const r = new FileReader()
      r.onload = () => resolve(r.result)
      r.readAsDataURL(blob)
    })
  } catch { return null }
}

function StatusBadge({ status }) {
  const s = STATUS_CFG[status] || STATUS_CFG.ej_planerad
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10,
      padding: '2px 8px', borderRadius: 4, background: s.bg, color: s.color, fontWeight: 600 }}>
      <s.Icon size={10} /> {s.label}
    </span>
  )
}

const TOMFORM = {
  porttyp: PORTTYPER[0], fabrikat: '', ordernummer: '', serienummer: '',
  montageplats: '', kund: '', preliminar_leverans: '',
  onskat_montagedag: '', status: 'ej_planerad', notering: '',
}

export default function Montageplanering({ kunder = [], montageorder = [], onLaggTill, onUppdatera, onTaBort, onNyKund, onNavigeraMontering }) {
  const [vy,            setVy]            = useState('lista')
  const [valt,          setValt]          = useState(null)
  const [form,          setForm]          = useState(TOMFORM)
  const [annatFabrikat, setAnnatFabrikat] = useState('')
  const [sparar,        setSparar]        = useState(false)
  const [sokText,       setSokText]       = useState('')
  const [filterStatus,  setFilterStatus]  = useState('alla')
  const [expandId,      setExpandId]      = useState(null)
  const [nyttKundNamn,  setNyttKundNamn]  = useState('')
  const [visaNyKund,    setVisaNyKund]    = useState(false)
  const [spararKund,    setSpararKund]    = useState(false)

  const F = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const effektivtFabrikat = form.fabrikat === 'Annat' ? annatFabrikat : form.fabrikat

  const öppnaForm = (order = null) => {
    setValt(order)
    if (order) {
      const ärAnnat = order.fabrikat && !FASTA_FABRIKAT.includes(order.fabrikat)
      setAnnatFabrikat(ärAnnat ? order.fabrikat : '')
      setForm({
        porttyp:             order.porttyp             || PORTTYPER[0],
        fabrikat:            ärAnnat ? 'Annat' : (order.fabrikat || ''),
        ordernummer:         order.ordernummer         || '',
        serienummer:         order.serienummer         || '',
        montageplats:        order.montageplats        || '',
        kund:                order.kund                || '',
        preliminar_leverans: order.preliminar_leverans || '',
        onskat_montagedag:   order.onskat_montagedag   || '',
        status:              order.status              || 'ej_planerad',
        notering:            order.notering            || '',
      })
    } else {
      setAnnatFabrikat('')
      setForm({ ...TOMFORM })
    }
    setVy('ny')
  }

  const spara = async () => {
    if (!form.ordernummer.trim() || !form.montageplats.trim()) return
    setSparar(true)
    const payload = { ...form, fabrikat: effektivtFabrikat.trim() }
    if (valt) await onUppdatera(valt.id, payload)
    else       await onLaggTill(payload)
    setSparar(false)
    setVy('lista'); setValt(null)
  }

  const taBort = async () => {
    if (!valt) return
    await onTaBort(valt.id)
    setVy('lista'); setValt(null)
  }

  const läggTillNyKund = async () => {
    if (!nyttKundNamn.trim()) return
    setSpararKund(true)
    await onNyKund?.(nyttKundNamn.trim())
    F('kund', nyttKundNamn.trim())
    setNyttKundNamn('')
    setVisaNyKund(false)
    setSpararKund(false)
  }

  const skrivUt = async (order) => {
    const logoBase64 = await hämtaLogoBase64()
    const st = STATUS_CFG[order.status] || STATUS_CFG.ej_planerad
    const win = window.open('', '_blank', 'width=860,height=1100')
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Montageorder – ${order.ordernummer}</title>
<style>
body{font-family:Arial,sans-serif;font-size:12px;color:#1a1917;margin:32px 40px}
h1{font-size:20px;margin-bottom:6px}
h2{font-size:13px;margin-top:22px;margin-bottom:8px;border-bottom:2px solid #1D9E75;padding-bottom:4px;color:#1D9E75}
.meta{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;margin-bottom:18px;font-size:11px;color:#555}
.meta b{color:#1a1917}
p{text-align:justify;line-height:1.6;font-size:12px}
@media print{body{margin:16px}}
</style></head><body>
${logoBase64 ? `<img src="${logoBase64}" style="height:60px;display:block;margin-bottom:12px" alt="NMV Portservice" />` : ''}
<h1>Montageorder</h1>
<div class="meta">
  <div><b>Ordernummer:</b> ${order.ordernummer}</div>
  ${order.serienummer ? `<div><b>Serienummer:</b> ${order.serienummer}</div>` : '<div></div>'}
  <div><b>Porttyp:</b> ${order.porttyp}</div>
  ${order.fabrikat ? `<div><b>Fabrikat:</b> ${order.fabrikat}</div>` : '<div></div>'}
  <div><b>Status:</b> ${st.label}</div>
  <div><b>Montageplats:</b> ${order.montageplats}</div>
  <div><b>Kund:</b> ${order.kund || '–'}</div>
  ${order.preliminar_leverans ? `<div><b>Preliminär leverans:</b> ${order.preliminar_leverans}</div>` : '<div></div>'}
  ${order.onskat_montagedag  ? `<div><b>Önskad montagedag:</b> ${order.onskat_montagedag}</div>` : '<div></div>'}
</div>
${order.notering ? `<h2>Notering</h2><p>${order.notering}</p>` : ''}
</body></html>`)
    win.document.close()
    setTimeout(() => win.print(), 400)
  }

  // ── VY: Formulär ─────────────────────────────────────────────────────────
  if (vy === 'ny') {
    const inp = { width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid var(--c-border)', borderRadius: 6, background: 'var(--c-bg)', color: 'var(--c-text)', boxSizing: 'border-box' }
    const kanSpara = form.ordernummer.trim() && form.montageplats.trim()

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button className="btn" onClick={() => { setVy('lista'); setValt(null) }}>← Tillbaka</button>
          <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
            {valt ? 'Redigera montageorder' : 'Ny montageorder'}
          </h1>
        </div>

        {/* Portdetaljer */}
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Portdetaljer</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--c-text2)', display: 'block', marginBottom: 3 }}>Porttyp *</label>
              <select value={form.porttyp} onChange={e => F('porttyp', e.target.value)} style={inp}>
                {PORTTYPER.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--c-text2)', display: 'block', marginBottom: 3 }}>Fabrikat *</label>
              <select value={form.fabrikat} onChange={e => F('fabrikat', e.target.value)}
                style={{ ...inp, borderColor: !form.fabrikat ? 'var(--c-border)' : undefined }}>
                <option value="">– Välj fabrikat –</option>
                {FASTA_FABRIKAT.map(f => <option key={f} value={f}>{f}</option>)}
                <option value="Annat">Annat / okänt</option>
              </select>
              {form.fabrikat === 'Annat' && (
                <input type="text" placeholder="Ange fabrikat / modell" value={annatFabrikat}
                  onChange={e => setAnnatFabrikat(e.target.value)}
                  style={{ ...inp, marginTop: 6 }} />
              )}
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--c-text2)', display: 'block', marginBottom: 3 }}>Ordernummer *</label>
              <input type="text" value={form.ordernummer} onChange={e => F('ordernummer', e.target.value)}
                placeholder="t.ex. 2025-0142" style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--c-text2)', display: 'block', marginBottom: 3 }}>Serienummer</label>
              <input type="text" value={form.serienummer} onChange={e => F('serienummer', e.target.value)}
                placeholder="Valfritt" style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--c-text2)', display: 'block', marginBottom: 3 }}>Status</label>
              <select value={form.status} onChange={e => F('status', e.target.value)} style={inp}>
                <option value="ej_planerad">Ej planerad</option>
                <option value="planerad">Planerad</option>
                <option value="utford">Utförd</option>
              </select>
            </div>
          </div>
        </div>

        {/* Plats & kund */}
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Plats & kund</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 11, color: 'var(--c-text2)', display: 'block', marginBottom: 3 }}>Montageplats / adress *</label>
              <input type="text" value={form.montageplats} onChange={e => F('montageplats', e.target.value)}
                placeholder="Adress eller platsnamn" style={inp} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 11, color: 'var(--c-text2)', display: 'block', marginBottom: 3 }}>Kund</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input list="montage-kund-lista" type="text" value={form.kund} onChange={e => F('kund', e.target.value)}
                  placeholder="Välj eller skriv" style={{ ...inp, flex: 1 }} />
                <datalist id="montage-kund-lista">
                  {kunder.map(k => <option key={k.id} value={k.namn} />)}
                </datalist>
                {onNyKund && (
                  <button className="btn" title="Lägg till ny kund" onClick={() => setVisaNyKund(v => !v)}
                    style={{ flexShrink: 0, padding: '0 10px' }}>
                    <UserPlus size={14} />
                  </button>
                )}
              </div>
              {visaNyKund && (
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <input type="text" placeholder="Nytt kundnamn…" value={nyttKundNamn}
                    onChange={e => setNyttKundNamn(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && läggTillNyKund()}
                    style={{ ...inp, flex: 1 }} autoFocus />
                  <button className="btn btn-teal" onClick={läggTillNyKund} disabled={spararKund || !nyttKundNamn.trim()}
                    style={{ flexShrink: 0 }}>
                    {spararKund ? '…' : 'Lägg till'}
                  </button>
                  <button className="btn" onClick={() => { setVisaNyKund(false); setNyttKundNamn('') }}>✕</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Planering */}
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Planering</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--c-text2)', display: 'block', marginBottom: 3 }}>Preliminär leverans</label>
              <input type="date" value={form.preliminar_leverans} onChange={e => F('preliminar_leverans', e.target.value)} style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--c-text2)', display: 'block', marginBottom: 3 }}>Önskad montagedag</label>
              <input type="date" value={form.onskat_montagedag} onChange={e => F('onskat_montagedag', e.target.value)} style={inp} />
              <div style={{ fontSize: 10, color: 'var(--c-text3)', marginTop: 3 }}>Lämna tomt om ej planerad</div>
            </div>
          </div>
        </div>

        {/* Notering */}
        <div className="card" style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: 'var(--c-text2)', display: 'block', marginBottom: 3 }}>Notering</label>
          <textarea value={form.notering} onChange={e => F('notering', e.target.value)} placeholder="Fritext…" rows={3}
            style={{ ...inp, resize: 'vertical' }} />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-teal" style={{ flex: 1 }} onClick={spara} disabled={!kanSpara || sparar}>
            <Check size={14} /> {sparar ? 'Sparar…' : valt ? 'Spara ändringar' : 'Skapa montageorder'}
          </button>
          {valt && (
            <button className="btn" style={{ color: 'var(--c-red)', borderColor: 'var(--c-red)' }} onClick={taBort}>
              Ta bort
            </button>
          )}
          <button className="btn" onClick={() => { setVy('lista'); setValt(null) }}>Avbryt</button>
        </div>
      </div>
    )
  }

  // ── VY: Lista ─────────────────────────────────────────────────────────────
  const filtrerade = montageorder
    .filter(o => filterStatus === 'alla' || o.status === filterStatus)
    .filter(o => {
      if (!sokText) return true
      const q = sokText.toLowerCase()
      return o.ordernummer?.toLowerCase().includes(q)
          || o.kund?.toLowerCase().includes(q)
          || o.montageplats?.toLowerCase().includes(q)
          || o.porttyp?.toLowerCase().includes(q)
          || o.fabrikat?.toLowerCase().includes(q)
    })
    .sort((a, b) => {
      if (a.status === 'utford' && b.status !== 'utford') return 1
      if (b.status === 'utford' && a.status !== 'utford') return -1
      const da = a.onskat_montagedag || a.preliminar_leverans || a.created_at || ''
      const db = b.onskat_montagedag || b.preliminar_leverans || b.created_at || ''
      return da.localeCompare(db)
    })

  const räkna = s => montageorder.filter(o => o.status === s).length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 2 }}>Montageplanering</h1>
          <p style={{ color: 'var(--c-text2)', fontSize: 13 }}>Planera och följ upp montagearbeten</p>
        </div>
        <button className="btn btn-teal" onClick={() => öppnaForm()}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} /> Ny montageorder
        </button>
      </div>

      {/* Statistikcards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
        {Object.entries(STATUS_CFG).map(([k, s]) => (
          <div key={k} onClick={() => setFilterStatus(k === filterStatus ? 'alla' : k)}
            style={{ background: 'var(--c-surface)', borderRadius: 10, padding: '12px 16px',
              border: `1px solid ${filterStatus === k ? s.color : 'var(--c-border)'}`,
              cursor: 'pointer', transition: 'border-color 0.15s' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{räkna(k)}</div>
            <div style={{ fontSize: 12, color: 'var(--c-text2)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter-chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        {[['alla', `Alla (${montageorder.length})`], ...Object.entries(STATUS_CFG).map(([k, s]) => [k, `${s.label} (${räkna(k)})`])].map(([k, label]) => (
          <button key={k} onClick={() => setFilterStatus(k)}
            style={{ padding: '4px 12px', borderRadius: 16, fontSize: 12, cursor: 'pointer',
              fontWeight: filterStatus === k ? 600 : 400,
              background: filterStatus === k ? 'var(--c-teal)' : 'var(--c-surface)',
              color:      filterStatus === k ? '#fff'          : 'var(--c-text2)',
              border:     filterStatus === k ? 'none'          : '1px solid var(--c-border)' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Sök */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text3)', pointerEvents: 'none' }} />
        <input type="text" placeholder="Sök ordernummer, kund, plats, fabrikat…" value={sokText} onChange={e => setSokText(e.target.value)}
          style={{ width: '100%', padding: '7px 10px 7px 32px', fontSize: 13, border: '1px solid var(--c-border)', borderRadius: 8, background: 'var(--c-surface)', color: 'var(--c-text)', boxSizing: 'border-box' }} />
      </div>

      {/* Lista */}
      <div className="card">
        {filtrerade.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--c-text3)', textAlign: 'center', padding: '16px 0' }}>
            {montageorder.length === 0
              ? 'Inga montageordrar ännu. Klicka "Ny montageorder" för att börja.'
              : 'Inga montageordrar matchar sökningen.'}
          </p>
        )}
        {filtrerade.map(order => {
          const expanded = expandId === order.id
          return (
            <div key={order.id} style={{ borderBottom: '1px solid var(--c-border)', padding: '10px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

                {/* Klickbar rad */}
                <div style={{ flex: 1, cursor: 'pointer', minWidth: 0 }}
                  onClick={() => setExpandId(expanded ? null : order.id)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{order.ordernummer}</span>
                    <StatusBadge status={order.status} />
                    <span style={{ fontSize: 11, color: 'var(--c-text2)' }}>{order.porttyp}</span>
                    {order.fabrikat && <span style={{ fontSize: 11, color: 'var(--c-text3)' }}>{order.fabrikat}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--c-text2)', marginTop: 2 }}>
                    {[order.kund, order.montageplats].filter(Boolean).join(' · ')}
                  </div>
                  {(order.preliminar_leverans || order.onskat_montagedag) && (
                    <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 2 }}>
                      {order.preliminar_leverans && `📦 Leverans: ${order.preliminar_leverans}`}
                      {order.preliminar_leverans && order.onskat_montagedag && '  '}
                      {order.onskat_montagedag   && `🔧 Montage: ${order.onskat_montagedag}`}
                    </div>
                  )}
                </div>

                {/* Knappar */}
                <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                  <button className="btn" style={{ fontSize: 11, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 3 }}
                    onClick={() => skrivUt(order)}>
                    <Printer size={11} /> PDF
                  </button>
                  <button className="btn" style={{ fontSize: 11, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 3 }}
                    onClick={() => öppnaForm(order)}>
                    <Pencil size={11} />
                  </button>
                  <button className="btn" style={{ fontSize: 11, padding: '4px 8px' }}
                    onClick={() => setExpandId(expanded ? null : order.id)}>
                    {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                </div>
              </div>

              {/* Expanderad vy */}
              {expanded && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--c-border)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: 12, marginBottom: 12 }}>
                    {order.serienummer         && <div><span style={{ color: 'var(--c-text3)' }}>Serienummer: </span>{order.serienummer}</div>}
                    {order.fabrikat            && <div><span style={{ color: 'var(--c-text3)' }}>Fabrikat: </span>{order.fabrikat}</div>}
                    {order.preliminar_leverans && <div><span style={{ color: 'var(--c-text3)' }}>Prel. leverans: </span>{order.preliminar_leverans}</div>}
                    {order.onskat_montagedag   && <div><span style={{ color: 'var(--c-text3)' }}>Önskad montagedag: </span>{order.onskat_montagedag}</div>}
                    {order.notering && (
                      <div style={{ gridColumn: '1 / -1', padding: '8px 10px', background: 'var(--c-bg)', borderRadius: 6, color: 'var(--c-text2)', fontStyle: 'italic' }}>
                        {order.notering}
                      </div>
                    )}
                  </div>

                  {/* Snabb-statusbyte */}
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: 'var(--c-text3)', marginBottom: 4 }}>Ändra status:</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {Object.entries(STATUS_CFG).map(([k, s]) => (
                        <button key={k} onClick={() => onUppdatera(order.id, { ...order, status: k })}
                          style={{ padding: '4px 12px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                            fontWeight: order.status === k ? 600 : 400,
                            background: order.status === k ? s.bg : 'var(--c-surface)',
                            color:      order.status === k ? s.color : 'var(--c-text3)',
                            border: `1px solid ${order.status === k ? s.color : 'var(--c-border)'}` }}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Starta montering */}
                  {onNavigeraMontering && order.status !== 'utford' && (
                    <button className="btn btn-teal"
                      style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
                      onClick={() => onNavigeraMontering(order)}>
                      <ArrowRight size={13} /> Starta montering
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
