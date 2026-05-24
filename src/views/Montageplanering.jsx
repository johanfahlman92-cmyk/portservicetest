import { useState } from 'react'
import { Plus, Check, Clock, Package, Pencil, Printer, Search, ChevronDown, ChevronUp, ArrowRight, Archive, ArchiveRestore, Lock } from 'lucide-react'
import { protokollTyper, RISKPUNKTER } from '../data/store.js'
import KundVäljare from '../components/KundVäljare.jsx'
import { hämtaLogoBase64, pdfHeader, pdfMetaGrid, pdfDoc, pdfMontageProt } from '../utils/pdf.js'

// Samma porttyper som i Portregister
const PORTTYPER      = Object.keys(protokollTyper)           // Vikport, Takskjutport, Lastbrygga, Grind
const FASTA_FABRIKAT = ['Torverk', 'Lindab', 'Hörmann', 'Beyron Door', 'Nordic Door']

const STATUS_CFG = {
  ej_planerad: { label: 'Ej planerad', color: '#9ca3af', bg: '#f3f4f6', Icon: Clock },
  planerad:    { label: 'Planerad',    color: '#2563eb', bg: '#eff6ff', Icon: Package },
  utford:      { label: 'Utförd',      color: '#16a34a', bg: '#f0fdf4', Icon: Check },
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
  onskat_montagedag: '', tekniker: '', status: 'ej_planerad', notering: '',
}

export default function Montageplanering({ kunder = [], fastigheter = [], montageorder = [], tekniker = [], objekt = [], onLaggTill, onUppdatera, onTaBort, onNyKund, onNavigeraMontering, onNyttEjPlaneratMontage }) {
  const [vy,            setVy]            = useState('lista')
  const [valt,          setValt]          = useState(null)
  const [form,          setForm]          = useState(TOMFORM)
  const [annatFabrikat, setAnnatFabrikat] = useState('')
  const [sparar,        setSparar]        = useState(false)
  const [sokText,       setSokText]       = useState('')
  const [filterStatus,  setFilterStatus]  = useState('alla')
  const [expandId,      setExpandId]      = useState(null)

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
        tekniker:            order.tekniker            || '',
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
    if (!window.confirm(`Ta bort montageorder "${valt.ordernummer || valt.montageplats || 'denna order'}"? Det går inte att ångra.`)) return
    await onTaBort(valt.id)
    setVy('lista'); setValt(null)
  }

  const skrivUt = async (order) => {
    const logoBase64 = await hämtaLogoBase64()
    const st = STATUS_CFG[order.status] || STATUS_CFG.ej_planerad

    const metaCeller = [
      { lbl: 'Porttyp',     val: order.porttyp       },
      { lbl: 'Fabrikat',    val: order.fabrikat       },
      { lbl: 'Kund',        val: order.kund           },
      { lbl: 'Montageplats', val: order.montageplats  },
      { lbl: 'Status',      val: st.label             },
      { lbl: 'Tekniker',    val: order.tekniker       },
      ...(order.serienummer ? [{ lbl: 'Serienummer', val: order.serienummer }] : [{ lbl: '', val: '' }]),
      ...(order.preliminar_leverans ? [{ lbl: 'Preliminär leverans', val: order.preliminar_leverans }] : [{ lbl: '', val: '' }]),
      ...(order.onskat_montagedag   ? [{ lbl: 'Önskad montagedag',   val: order.onskat_montagedag   }] : []),
    ]
    if (metaCeller.length % 2 !== 0) metaCeller.push({ lbl: '', val: '' })

    const metaHtml = `<div class="meta">${metaCeller.map(c =>
      `<div class="cell"><div class="lbl">${c.lbl}</div><div class="val">${c.val || '–'}</div></div>`
    ).join('')}</div>`

    const body = `
      ${pdfHeader(logoBase64, 'Montageorder', order.ordernummer || '–', '')}

      <div class="slbl">Orderinformation</div>
      ${metaHtml}

      ${order.notering ? `
        <div class="slbl">Notering</div>
        <div class="desc-box">${order.notering}</div>
      ` : ''}
    `

    const win = window.open('', '_blank', 'width=860,height=1100')
    win.document.write(pdfDoc(`Montageorder – ${order.ordernummer}`, body))
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
            <div>
              <label style={{ fontSize: 11, color: 'var(--c-text2)', display: 'block', marginBottom: 3 }}>Ansvarig tekniker</label>
              <select value={form.tekniker} onChange={e => F('tekniker', e.target.value)} style={inp}>
                <option value="">– Ej tilldelad –</option>
                {tekniker.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Plats & kund */}
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Plats & kund</div>

          {/* Kund */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, color: 'var(--c-text2)', display: 'block', marginBottom: 3 }}>Kund</label>
            <KundVäljare
              kunder={kunder}
              value={form.kund}
              onChange={v => { F('kund', v) }}
              onNyKund={onNyKund}
              style={inp}
              placeholder="– Välj kund –"
            />
            {form.kund && (
              <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 12, color: 'var(--c-teal-text)', background: 'var(--c-teal-bg)',
                border: '1px solid var(--c-teal)', borderRadius: 6, padding: '5px 10px' }}>
                <Check size={13} /> Vald kund: <strong>{form.kund}</strong>
              </div>
            )}
          </div>

          {/* Kundens fastigheter (visas bara om kunden har registrerade fastigheter) */}
          {(() => {
            const kundensFastigheter = fastigheter.filter(f => !f.arkiverad && f.kund === form.kund)
            if (!form.kund || kundensFastigheter.length === 0) return null
            return (
              <div style={{ marginBottom: 12, padding: '10px 12px', background: 'var(--c-bg)', borderRadius: 8, border: '1px solid var(--c-border)' }}>
                <div style={{ fontSize: 11, color: 'var(--c-blue)', fontWeight: 600, marginBottom: 6 }}>
                  📍 {form.kund} har {kundensFastigheter.length} registrerad{kundensFastigheter.length > 1 ? 'e fastigheter' : ' fastighet'}
                </div>
                <label style={{ fontSize: 11, color: 'var(--c-text2)', display: 'block', marginBottom: 3 }}>
                  Välj befintlig fastighet <span style={{ color: 'var(--c-text3)' }}>(valfritt — fyller i montageplats)</span>
                </label>
                <select
                  defaultValue=""
                  onChange={e => {
                    const f = kundensFastigheter.find(f => f.id === e.target.value)
                    if (f) F('montageplats', [f.namn, f.adress].filter(Boolean).join(', '))
                  }}
                  style={inp}>
                  <option value="">– Ingen vald, ange adress manuellt –</option>
                  {kundensFastigheter.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.namn}{f.adress ? ` – ${f.adress}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )
          })()}

          {/* Montageplats */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--c-text2)', display: 'block', marginBottom: 3 }}>
              Montageplats / adress *
            </label>
            <input type="text" value={form.montageplats} onChange={e => F('montageplats', e.target.value)}
              placeholder="Adress eller platsnamn" style={inp} />
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

  // Aktiva orders (exkludera arkiverade)
  const aktivaOrder = montageorder.filter(o => o.status !== 'arkiverad')
  const arkiveradeOrder = montageorder.filter(o => o.status === 'arkiverad')

  // Gruppera montageorders efter status
  const pågående = aktivaOrder
    .filter(o => o.status !== 'utford' && (o.protokoll_data?.steg >= 1))
    .sort((a, b) => (b.protokoll_data?.steg || 0) - (a.protokoll_data?.steg || 0))

  const planerade = aktivaOrder
    .filter(o => o.status === 'planerad' && (!o.protokoll_data?.steg || o.protokoll_data.steg < 1))
    .sort((a, b) => (a.onskat_montagedag || '').localeCompare(b.onskat_montagedag || ''))

  const ejPlanerade = aktivaOrder
    .filter(o => o.status === 'ej_planerad' && (!o.protokoll_data?.steg || o.protokoll_data.steg < 1))

  const klaraOrder = aktivaOrder
    .filter(o => o.status === 'utford')
    .sort((a, b) => (b.protokoll_data?.datum || b.created_at || '').localeCompare(a.protokoll_data?.datum || a.created_at || ''))

  // Legacy: protokoll sparade i objekt.historik
  const alleaMontage = objekt
    .filter(o => !o.arkiverad)
    .flatMap(o => (o.historik || [])
      .map((h, idx) => ({ ...h, objektId: o.id, objektNamn: o.namn, historikIdx: idx }))
      .filter(h => h.typ === 'montering')
    )
    .sort((a, b) => new Date(b.datum) - new Date(a.datum))

  const totalKlara = klaraOrder.length + alleaMontage.length

  // Sökfilter för klara
  const sokKlara = (o) => {
    if (!sokText) return true
    const q = sokText.toLowerCase()
    return o.ordernummer?.toLowerCase().includes(q)
        || o.kund?.toLowerCase().includes(q)
        || o.montageplats?.toLowerCase().includes(q)
        || o.porttyp?.toLowerCase().includes(q)
        || o.objektNamn?.toLowerCase().includes(q)
  }

  const SECTION_HDR = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--c-text3)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }

  // Hjälp-render för expanderbar orderrad
  const renderOrderRad = (order, accentColor) => {
    const expanded = expandId === order.id
    const steg = order.protokoll_data?.steg || 0
    return (
      <div key={order.id} className="card" style={{ padding: '12px 16px', borderLeft: `4px solid ${accentColor}` }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: 1, cursor: 'pointer', minWidth: 0 }} onClick={() => setExpandId(expanded ? null : order.id)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {order.ordernummer && <span style={{ fontWeight: 600, fontSize: 13 }}>{order.ordernummer}</span>}
              <span style={{ fontSize: 12, color: 'var(--c-text)' }}>{order.montageplats || order.kund || '–'}</span>
              {order.porttyp && <span style={{ fontSize: 11, color: 'var(--c-text3)' }}>{order.porttyp}</span>}
              {order.fabrikat && <span style={{ fontSize: 11, color: 'var(--c-text3)' }}>{order.fabrikat}</span>}
            </div>
            <div style={{ fontSize: 12, color: 'var(--c-text2)', marginTop: 2 }}>
              {order.kund}{order.tekniker ? ` · 👷 ${order.tekniker}` : ''}
            </div>
            {(order.preliminar_leverans || order.onskat_montagedag) && (
              <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 2 }}>
                {order.preliminar_leverans && `📦 Leverans: ${order.preliminar_leverans}`}
                {order.preliminar_leverans && order.onskat_montagedag && '  '}
                {order.onskat_montagedag && `🔧 Montage: ${order.onskat_montagedag}`}
              </div>
            )}
            {steg >= 1 && (
              <div style={{ fontSize: 11, color: accentColor, fontWeight: 500, marginTop: 3 }}>
                {steg >= 2 ? '● Riskbedömning klar – inväntar egenkontroll' : '● Portuppgifter sparade – inväntar riskbedömning'}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 5, flexShrink: 0, alignItems: 'center' }}>
            {onNavigeraMontering && order.status !== 'utford' && (
              <button className="btn btn-primary" style={{ fontSize: 11, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}
                onClick={() => onNavigeraMontering(order)}>
                {steg >= 1 ? 'Fortsätt' : 'Starta'} <ArrowRight size={11} />
              </button>
            )}
            <button className="btn" style={{ fontSize: 11, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 3 }}
              onClick={() => skrivUt(order)}>
              <Printer size={11} />
            </button>
            <button className="btn" style={{ fontSize: 11, padding: '4px 8px' }}
              onClick={() => öppnaForm(order)}>
              <Pencil size={11} />
            </button>
            <button className="btn" style={{ fontSize: 11, padding: '4px 8px' }}
              onClick={() => setExpandId(expanded ? null : order.id)}>
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>
        </div>

        {/* Expanderad detalj */}
        {expanded && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--c-border)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: 12, marginBottom: 12 }}>
              {order.serienummer && <div><span style={{ color: 'var(--c-text3)' }}>Serienummer: </span>{order.serienummer}</div>}
              {order.fabrikat    && <div><span style={{ color: 'var(--c-text3)' }}>Fabrikat: </span>{order.fabrikat}</div>}
              {order.preliminar_leverans && <div><span style={{ color: 'var(--c-text3)' }}>Prel. leverans: </span>{order.preliminar_leverans}</div>}
              {order.onskat_montagedag   && <div><span style={{ color: 'var(--c-text3)' }}>Önskad montagedag: </span>{order.onskat_montagedag}</div>}
              {order.notering && (
                <div style={{ gridColumn: '1 / -1', padding: '8px 10px', background: 'var(--c-bg)', borderRadius: 6, color: 'var(--c-text2)', fontStyle: 'italic' }}>
                  {order.notering}
                </div>
              )}
            </div>

            {/* Protokoll-sammanfattning om utförd */}
            {order.protokoll_data && order.status === 'utford' && (
              <div style={{ marginBottom: 10, padding: '10px 12px', background: 'var(--c-teal-bg)', borderRadius: 8, border: '1px solid var(--c-teal)' }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--c-teal-text)', marginBottom: 4 }}>📋 Monteringsprotokoll</div>
                <div style={{ fontSize: 11, color: 'var(--c-text2)', marginBottom: 6 }}>
                  {order.protokoll_data.datum && <span>{order.protokoll_data.datum} · </span>}
                  {order.protokoll_data.tekniker && <span>{order.protokoll_data.tekniker} · </span>}
                  <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ {order.protokoll_data.ok ?? 0} Godkänd</span>
                  {(order.protokoll_data.ej ?? 0) > 0 && <span style={{ color: '#b83333', fontWeight: 600 }}> · ✗ {order.protokoll_data.ej} Avvikelse</span>}
                  {(order.protokoll_data.na ?? 0) > 0 && <span style={{ color: '#888' }}> · {order.protokoll_data.na} Ej tillämpbar</span>}
                </div>
                <button className="btn" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                  onClick={async () => {
                    const logoBase64 = await hämtaLogoBase64()
                    const html = pdfMontageProt(order.protokoll_data, logoBase64)
                    const win = window.open('', '_blank', 'width=860,height=1100')
                    win.document.write(html); win.document.close()
                    setTimeout(() => win.print(), 400)
                  }}>
                  <Printer size={11} /> Skriv ut protokoll
                </button>
              </div>
            )}

            {/* Statusbyte – låst för utförda och pågående */}
            {order.status === 'utford' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: 'var(--c-text3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Lock size={11} /> Utförd – status låst
                </span>
                <button onClick={() => onUppdatera(order.id, { status: 'arkiverad' })}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px',
                    borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 500,
                    background: 'var(--c-amber-bg)', color: 'var(--c-amber-text)',
                    border: '1px solid var(--c-amber)' }}>
                  <Archive size={11} /> Arkivera
                </button>
              </div>
            ) : order.protokoll_data?.steg >= 1 ? (
              <div style={{ fontSize: 11, color: 'var(--c-text3)', display: 'flex', alignItems: 'center', gap: 5, fontStyle: 'italic' }}>
                <Lock size={11} /> Slutför via egenkontroll i wizarden för att markera som utförd
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['ej_planerad', 'planerad'].map(k => {
                  const s = STATUS_CFG[k]
                  return (
                    <button key={k} onClick={() => onUppdatera(order.id, { status: k })}
                      style={{ padding: '4px 12px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                        fontWeight: order.status === k ? 600 : 400,
                        background: order.status === k ? s.bg : 'var(--c-surface)',
                        color:      order.status === k ? s.color : 'var(--c-text3)',
                        border: `1px solid ${order.status === k ? s.color : 'var(--c-border)'}` }}>
                      {s.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 2 }}>Montageordrar</h1>
          <p style={{ color: 'var(--c-text2)', fontSize: 13, margin: 0 }}>Planera, genomför och följ upp monteringsarbeten</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {onNyttEjPlaneratMontage && (
            <button className="btn" onClick={onNyttEjPlaneratMontage}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={14} /> Ej-planerat montage
            </button>
          )}
          <button className="btn btn-teal" onClick={() => öppnaForm()}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14} /> Ny planerad order
          </button>
        </div>
      </div>

      {/* ── 🔴 Pågår ── */}
      {pågående.length > 0 && (
        <div>
          <div style={SECTION_HDR}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--c-red)' }} />
            Pågår – saknar egenkontroll ({pågående.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pågående.map(o => renderOrderRad(o, 'var(--c-red)'))}
          </div>
        </div>
      )}

      {/* ── 🟡 Planerade ── */}
      {planerade.length > 0 && (
        <div>
          <div style={SECTION_HDR}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--c-amber)' }} />
            Planerade ({planerade.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {planerade.map(o => renderOrderRad(o, 'var(--c-amber)'))}
          </div>
        </div>
      )}

      {/* ── 📦 Ej planerade ── */}
      {ejPlanerade.length > 0 && (
        <div>
          <div style={SECTION_HDR}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#9ca3af' }} />
            Ej planerade ({ejPlanerade.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ejPlanerade.map(o => renderOrderRad(o, '#9ca3af'))}
          </div>
        </div>
      )}

      {/* ── ✅ Klara ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={SECTION_HDR}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#16a34a' }} />
            Klara ({totalKlara})
          </div>
          {totalKlara > 0 && (
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text3)', pointerEvents: 'none' }} />
              <input type="text" placeholder="Sök i klara…" value={sokText} onChange={e => setSokText(e.target.value)}
                style={{ padding: '5px 8px 5px 26px', fontSize: 12, border: '1px solid var(--c-border)', borderRadius: 7, background: 'var(--c-surface)', color: 'var(--c-text)', width: 180 }} />
            </div>
          )}
        </div>

        {/* Klara från montageorder */}
        {klaraOrder.filter(sokKlara).length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
            {klaraOrder.filter(sokKlara).map(o => renderOrderRad(o, '#16a34a'))}
          </div>
        )}

        {/* Legacy-protokoll från objekt.historik */}
        {alleaMontage.filter(sokKlara).length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {alleaMontage.filter(sokKlara).map((p, i) => (
              <div key={i} className="card" style={{ padding: '12px 16px', borderLeft: '4px solid #16a34a', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{p.objektNamn}</div>
                  <div style={{ fontSize: 11, color: 'var(--c-text2)', marginTop: 2 }}>
                    {p.portTyp} · {p.kund || '–'} · {p.datum}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                  {p.godkannande === 'godkand'    && <span className="badge badge-teal">Godkänd</span>}
                  {p.godkannande === 'ej_godkand' && <span className="badge badge-red">Ej godkänd</span>}
                  {p.ok > 0 && <span style={{ fontSize: 11, color: 'var(--c-teal)' }}>✓ {p.ok}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {totalKlara === 0 && (
          <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--c-text3)', fontStyle: 'italic' }}>
            Inga avslutade monteringar ännu.
          </div>
        )}
      </div>

      {/* Tomt state */}
      {aktivaOrder.length === 0 && alleaMontage.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--c-text3)' }}>
          Inga monteringar ännu. Klicka "Ny planerad order" för att börja, eller "Ej-planerat montage" för direktstart.
        </div>
      )}

      {/* ── 🗄️ Arkiv ── */}
      {arkiveradeOrder.length > 0 && (
        <div>
          <div style={{ ...SECTION_HDR, color: 'var(--c-text3)' }}>
            <Archive size={13} /> Arkiv ({arkiveradeOrder.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {arkiveradeOrder.map(order => (
              <div key={order.id} className="card" style={{ padding: '10px 16px', opacity: 0.75, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text2)' }}>
                    {order.ordernummer || order.montageplats || order.kund || '–'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 2 }}>
                    {order.porttyp}{order.kund ? ` · ${order.kund}` : ''}{order.protokoll_data?.datum ? ` · ${order.protokoll_data.datum}` : ''}
                  </div>
                </div>
                <button onClick={() => onUppdatera(order.id, { status: 'utford' })}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
                    borderRadius: 6, fontSize: 11, cursor: 'pointer',
                    background: 'var(--c-surface)', color: 'var(--c-text2)',
                    border: '1px solid var(--c-border)' }}>
                  <ArchiveRestore size={11} /> Återställ
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
