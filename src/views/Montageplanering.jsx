import { useState } from 'react'
import { Plus, Check, Clock, Package, Pencil, Printer, Search, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react'
import { protokollTyper, RISKPUNKTER } from '../data/store.js'
import KundVäljare from '../components/KundVäljare.jsx'
import { hämtaLogoBase64 } from '../utils/pdf.js'

// Samma porttyper som i Portregister
const PORTTYPER      = Object.keys(protokollTyper)           // Vikport, Takskjutport, Lastbrygga, Grind
const FASTA_FABRIKAT = ['Torverk', 'Lindab', 'Hörmann', 'Beyron Door', 'Nordic Door']

const STATUS_CFG = {
  ej_planerad: { label: 'Ej planerad', color: '#9ca3af', bg: '#f3f4f6', Icon: Clock },
  planerad:    { label: 'Planerad',    color: '#2563eb', bg: '#eff6ff', Icon: Package },
  utford:      { label: 'Utförd',      color: '#16a34a', bg: '#f0fdf4', Icon: Check },
}

function genereraMontagePDF({ p, logoBase64, montagemallar = {} }) {
  const riskRows = RISKPUNKTER.map((punkt, i) => {
    const st  = p.riskKontroll?.[i]
    const not = p.riskNoteringar?.[i] || ''
    const cls = st === 'ok' ? 'risk-ok' : st === 'atgard' ? 'risk-atgard' : st === 'ej_aktuellt' ? 'risk-ej' : ''
    const etk = st === 'ok' ? '✓ OK' : st === 'atgard' ? '⚠ Åtgärd krävs' : st === 'ej_aktuellt' ? '– Ej aktuellt' : '–'
    return `<tr><td style="text-align:justify">${punkt}</td><td class="${cls}">${etk}</td><td>${not}</td></tr>`
  }).join('')

  const egenRiskRows = (p.egenRisker || []).map(r => {
    const cls = r.status === 'ok' ? 'risk-ok' : r.status === 'atgard' ? 'risk-atgard' : 'risk-ej'
    const etk = r.status === 'ok' ? '✓ OK' : r.status === 'atgard' ? '⚠ Åtgärd krävs' : '– Ej aktuellt'
    return `<tr style="background:#fffbf0"><td><strong>${r.label||'–'}</strong><br><span style="color:#888">${r.beskrivning||''}</span></td><td class="${cls}">${etk}</td><td>${r.åtgärd||''}</td></tr>`
  }).join('')

  const mallar = Object.keys(montagemallar).length > 0 ? montagemallar : {
    Vikport: ['Portblad och skenor utan skador','Fjädersystem kalibrerat','Säkerhetsbroms testad','Nödöppning testad','Motor monterad och kalibrerad','Fotocell testad','Ändlägen inställda','CE-märkning monterad','Bruksanvisning överlämnad'],
    Takskjutport: ['Skensystem rakt och säkrat','Balansfjädrar kontrollerade','Portblad utan skador','Hjul och lager smorda','Nödöppning testad','Motormontering kontrollerad','Ändlägen inställda','CE-märkning monterad','Bruksanvisning överlämnad'],
    Lastbrygga: ['Hydraulsystem utan läckage','Plattform utan skador','Styrsystem testat','Säkerhetskant testad','Elektrisk installation kontrollerad','Nödstoppsfunktion testad','CE-märkning monterad','Bruksanvisning överlämnad'],
    Grind: ['Stolpar stabilt monterade','Räls och styrning rak','Grindblad utan skador','Motor monterad','Fotocell kontrollerad','Nödöppning testad','Ändlägen inställda','CE-märkning monterad','Bruksanvisning överlämnad'],
  }
  const punkter = mallar[p.portTyp] || []
  const egenRows = punkter.map((punkt, i) => {
    if (punkt.startsWith('## ')) return `<tr style="background:#f3f2ef"><td colspan="3" style="font-weight:700;font-size:11px;color:#1D9E75;padding:7px 8px">${punkt.slice(3).toUpperCase()}</td></tr>`
    const st  = p.egenkontroll?.[i] || '–'
    const not = p.egenNoteringar?.[i] || ''
    const cls = st === 'OK' ? 'ok' : st === 'EJ' ? 'ej' : 'na'
    const etk = st === 'OK' ? '✓ OK' : st === 'EJ' ? '✗ Ej OK' : st === 'NA' ? 'N/A' : '–'
    return `<tr><td style="text-align:justify">${punkt}</td><td class="${cls}">${etk}</td><td>${not}</td></tr>`
  }).join('')

  const godkjHtml = p.godkannande
    ? `<div style="display:inline-flex;align-items:center;gap:10px;padding:10px 18px;border-radius:8px;margin-top:12px;
        background:${p.godkannande === 'godkand' ? '#d1fae5' : '#fee2e2'};
        border:2px solid ${p.godkannande === 'godkand' ? '#1D9E75' : '#b83333'}">
        <span style="font-size:20px">${p.godkannande === 'godkand' ? '✓' : '✗'}</span>
        <div style="font-weight:700;color:${p.godkannande === 'godkand' ? '#1D9E75' : '#b83333'}">
          ${p.godkannande === 'godkand' ? 'Godkänd – arbetsplatsen kan påbörjas' : 'Ej godkänd – ansvarig informerad'}
        </div></div>` : ''

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Monteringsprotokoll</title>
<style>
body{font-family:Arial,sans-serif;font-size:12px;color:#1a1917;margin:32px 40px}
h1{font-size:20px;margin-bottom:6px}
h2{font-size:13px;margin-top:22px;margin-bottom:8px;border-bottom:2px solid #1D9E75;padding-bottom:4px;color:#1D9E75}
.meta{display:grid;grid-template-columns:1fr 1fr;gap:4px 24px;margin-bottom:14px;font-size:11px;color:#555}
.meta b{color:#1a1917}
table{width:100%;border-collapse:collapse;margin-bottom:14px}
th{background:#f3f2ef;padding:6px 8px;text-align:left;font-size:11px;font-weight:600}
td{padding:6px 8px;border-bottom:1px solid #e8e7e4;font-size:11px;vertical-align:top}
.ok{color:#1D9E75;font-weight:600}.ej{color:#b83333;font-weight:600}.na{color:#888}
.risk-ok{color:#1D9E75;font-weight:600}.risk-atgard{color:#b87000;font-weight:600}.risk-ej{color:#888;font-weight:600}
.sig-box{border:1px solid #ccc;border-radius:6px;padding:8px;display:inline-block;margin-top:6px}
@media print{body{margin:16px}}
</style></head><body>
${logoBase64 ? `<img src="${logoBase64}" style="height:60px;display:block;margin-bottom:12px" alt="NMV Portservice" />` : ''}
<h1>Monteringsprotokoll</h1>
<div class="meta">
  <div><b>Porttyp:</b> ${p.portTyp || '–'}</div>
  <div><b>Kund:</b> ${p.kund || '–'}</div>
  <div><b>Adress:</b> ${p.adress || '–'}</div>
  <div><b>Datum:</b> ${p.datum || '–'}</div>
  <div><b>Tekniker:</b> ${p.tekniker || '–'}</div>
  ${p.ordernummer ? `<div><b>Ordernummer:</b> ${p.ordernummer}</div>` : ''}
  ${p.serienummer ? `<div><b>Serienummer:</b> ${p.serienummer}</div>` : ''}
</div>
<h2>Riskbedömning</h2>
<table><thead><tr><th>Kontrollpunkt</th><th>Status</th><th>Åtgärd / notering</th></tr></thead>
<tbody>${riskRows}${egenRiskRows}</tbody></table>
${godkjHtml}
<div style="page-break-before:always;break-before:page"></div>
<h2 style="margin-top:0">Egenkontroll – ${p.portTyp || ''}</h2>
<table><thead><tr><th>Kontrollpunkt</th><th>Status</th><th>Notering</th></tr></thead>
<tbody>${egenRows}</tbody></table>
${p.signatur ? `<h2>Signatur tekniker</h2>
<div class="sig-box"><img src="${p.signatur}" style="max-width:300px;max-height:90px"/></div>
<p style="font-size:11px;color:#555;margin-top:6px">${p.tekniker||''},&nbsp;${p.datum}</p>` : ''}
</body></html>`
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

export default function Montageplanering({ kunder = [], fastigheter = [], montageorder = [], tekniker = [], onLaggTill, onUppdatera, onTaBort, onNyKund, onNavigeraMontering }) {
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
    await onTaBort(valt.id)
    setVy('lista'); setValt(null)
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
                  {order.tekniker && (
                    <div style={{ fontSize: 11, color: 'var(--c-teal-text)', marginTop: 1 }}>
                      👷 {order.tekniker}
                    </div>
                  )}
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

                  {/* Montageprotokoll (om sparat) */}
                  {order.protokoll_data && (
                    <div style={{ marginBottom: 12, padding: '10px 12px', background: 'var(--c-teal-bg)', borderRadius: 8, border: '1px solid var(--c-teal)' }}>
                      <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--c-teal-text)', marginBottom: 6 }}>
                        📋 Montageprotokoll sparat
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--c-text2)', marginBottom: 6 }}>
                        {order.protokoll_data.datum && <span>{order.protokoll_data.datum} · </span>}
                        {order.protokoll_data.tekniker && <span>{order.protokoll_data.tekniker} · </span>}
                        <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ {order.protokoll_data.ok ?? 0} OK</span>
                        {(order.protokoll_data.ej ?? 0) > 0 && <span style={{ color: '#b83333', fontWeight: 600 }}> · ✗ {order.protokoll_data.ej} Ej OK</span>}
                        {(order.protokoll_data.na ?? 0) > 0 && <span style={{ color: '#888' }}> · {order.protokoll_data.na} N/A</span>}
                      </div>
                      {order.protokoll_data.dokument?.length > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--c-text3)', marginBottom: 6 }}>
                          📎 {order.protokoll_data.dokument.length} dokument bifogad{order.protokoll_data.dokument.length > 1 ? 'e' : 't'}
                        </div>
                      )}
                      <button className="btn" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                        onClick={async () => {
                          const logoBase64 = await hämtaLogoBase64()
                          const html = genereraMontagePDF({ p: order.protokoll_data, logoBase64 })
                          const win = window.open('', '_blank', 'width=860,height=1100')
                          win.document.write(html); win.document.close()
                          setTimeout(() => win.print(), 400)
                        }}>
                        <Printer size={11} /> Skriv ut montageprotokoll
                      </button>
                    </div>
                  )}

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
