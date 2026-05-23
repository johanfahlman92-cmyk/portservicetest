import { useState } from 'react'
import { Building2, User, Plus, X, Pencil, Trash2, Check, DoorOpen, AlertCircle, ChevronRight } from 'lucide-react'

const inputStyle = {
  width: '100%', padding: '7px 10px', fontSize: 13,
  border: '1px solid var(--c-border2)', borderRadius: 6,
  background: 'var(--c-bg)', color: 'var(--c-text)',
}
const labelStyle = { fontSize: 12, color: 'var(--c-text2)', marginBottom: 4, display: 'block' }
const fieldStyle = { marginBottom: 12 }

// ── Kund-formulär ─────────────────────────────────────────────────────────────
function KundForm({ initialVarden = null, onSpara, onAvbryt }) {
  const redigering = initialVarden !== null
  const [form, setForm] = useState({
    typ:     initialVarden?.typ     || 'foretag',
    namn:    initialVarden?.namn    || '',
    kontakt: initialVarden?.kontakt || '',
    telefon: initialVarden?.telefon || '',
    epost:   initialVarden?.epost   || '',
    adress:  initialVarden?.adress  || '',
    ort:     initialVarden?.ort     || '',
  })
  const [fel,    setFel]    = useState(false)
  const [sparar, setSparar] = useState(false)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const submit = async () => {
    if (!form.namn.trim()) { setFel(true); return }
    setSparar(true)
    await onSpara({ ...form, namn: form.namn.trim(), kontakt: form.kontakt.trim() })
    setSparar(false)
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>
          {redigering ? `Redigera: ${initialVarden.namn}` : 'Ny kund'}
        </div>
        <button className="btn" onClick={onAvbryt} style={{ padding: '4px 8px' }}><X size={14} /></button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        <div style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Kundtyp</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[['foretag', 'Företag'], ['privat', 'Privatperson']].map(([val, label]) => (
              <button key={val} onClick={() => set('typ', val)} style={{
                padding: '6px 16px', borderRadius: 6, fontSize: 13, cursor: 'pointer',
                border: '1px solid var(--c-border2)',
                background: form.typ === val ? 'var(--c-text)' : 'transparent',
                color: form.typ === val ? '#fff' : 'var(--c-text2)',
              }}>{label}</button>
            ))}
          </div>
        </div>

        <div style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
          <label style={labelStyle}>{form.typ === 'foretag' ? 'Företagsnamn' : 'Namn'} *</label>
          <input
            type="text"
            placeholder={form.typ === 'foretag' ? 't.ex. Lindqvist Logistik AB' : 't.ex. Lars Svensson'}
            value={form.namn}
            onChange={e => set('namn', e.target.value)}
            style={{ ...inputStyle, borderColor: fel && !form.namn.trim() ? 'var(--c-red)' : undefined }}
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Kontaktperson</label>
          <input type="text" placeholder="Förnamn Efternamn" value={form.kontakt}
            onChange={e => set('kontakt', e.target.value)} style={inputStyle} />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Telefon</label>
          <input type="text" placeholder="070-000 00 00" value={form.telefon}
            onChange={e => set('telefon', e.target.value)} style={inputStyle} />
        </div>

        <div style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
          <label style={labelStyle}>E-post</label>
          <input type="email" placeholder="namn@foretag.se" value={form.epost}
            onChange={e => set('epost', e.target.value)} style={inputStyle} />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Adress</label>
          <input type="text" placeholder="Gatuvägen 1" value={form.adress}
            onChange={e => set('adress', e.target.value)} style={inputStyle} />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Ort</label>
          <input type="text" placeholder="Luleå" value={form.ort}
            onChange={e => set('ort', e.target.value)} style={inputStyle} />
        </div>
      </div>

      {fel && (
        <div style={{ fontSize: 12, color: 'var(--c-red)', marginBottom: 12 }}>
          Fyll i namn (*).
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary" onClick={submit} disabled={sparar}
          style={{ opacity: sparar ? 0.7 : 1 }}>
          {sparar
            ? 'Sparar…'
            : redigering ? <><Check size={14} /> Spara ändringar</> : <><Plus size={14} /> Spara kund</>
          }
        </button>
        <button className="btn" onClick={onAvbryt} disabled={sparar}>Avbryt</button>
      </div>
    </div>
  )
}

// ── Kund-detaljvy ─────────────────────────────────────────────────────────────
function KundDetalj({ kund, fastigheter, objekt, arenden, onBack, onRedigera, onTaBort, onNavigeraArende, onNavigeraPort }) {
  const [bekraftaBort, setBekraftaBort] = useState(false)

  const kundensFastigheter = fastigheter.filter(f => !f.arkiverad && f.kund === kund.namn)
  const kundensPortar      = objekt.filter(o => !o.arkiverad && o.kund === kund.namn)
  const kundensArenden     = arenden.filter(a => a.kund === kund.namn)
  const oppnaArenden       = kundensArenden.filter(a => a.status !== 'atgardad')

  const statusCls   = { ny: 'badge-red', pagAr: 'badge-amber', atgardad: 'badge-green' }
  const statusLabel = { ny: 'Ny', pagAr: 'Pågår', atgardad: 'Åtgärdad' }

  return (
    <div>
      <button className="btn" onClick={onBack} style={{ marginBottom: 16 }}>← Alla kunder</button>

      {/* Kund-info */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, flexShrink: 0,
            background: kund.typ === 'foretag' ? 'var(--c-blue-bg)' : 'var(--c-teal-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {kund.typ === 'foretag'
              ? <Building2 size={24} color="var(--c-blue)" />
              : <User size={24} color="var(--c-teal)" />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{kund.namn}</div>
            <div style={{ fontSize: 13, color: 'var(--c-text2)' }}>
              {kund.typ === 'foretag' ? 'Företag' : 'Privatperson'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', marginTop: 12 }}>
              {[
                ['Kontakt',  kund.kontakt],
                ['Telefon',  kund.telefon],
                ['E-post',   kund.epost],
                ['Adress',   kund.adress ? `${kund.adress}${kund.ort ? ', ' + kund.ort : ''}` : kund.ort],
              ].filter(([, v]) => v).map(([l, v]) => (
                <div key={l}>
                  <div style={{ fontSize: 10, color: 'var(--c-text3)', marginBottom: 1 }}>{l}</div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          <button className="btn" onClick={onRedigera} style={{ padding: '5px 9px', flexShrink: 0 }}>
            <Pencil size={13} />
          </button>
        </div>
      </div>

      {/* Sammanfattning */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
        {[
          ['Fastigheter', kundensFastigheter.length, 'var(--c-blue)', 'var(--c-blue-bg)'],
          ['Portar',      kundensPortar.length,      'var(--c-teal)', 'var(--c-teal-bg)'],
          ['Öppna ärenden', oppnaArenden.length,     'var(--c-red)',  'var(--c-red-bg)'],
        ].map(([label, val, color, bg]) => (
          <div key={label} className="card" style={{ textAlign: 'center', padding: '12px 8px' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color }}>{val}</div>
            <div style={{ fontSize: 11, color: 'var(--c-text2)', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Fastigheter */}
      {kundensFastigheter.length > 0 && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Fastigheter ({kundensFastigheter.length})</div>
          {kundensFastigheter.map(f => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10,
              padding: '7px 0', borderBottom: '1px solid var(--c-border)', fontSize: 12 }}>
              <Building2 size={14} color="var(--c-blue)" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>{f.namn}</div>
                {f.adress && <div style={{ fontSize: 11, color: 'var(--c-text2)' }}>{f.adress}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Portar */}
      {kundensPortar.length > 0 && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Portar ({kundensPortar.length})</div>
          {kundensPortar.map(o => (
            <div key={o.id}
              onClick={() => onNavigeraPort?.(o.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 0', borderBottom: '1px solid var(--c-border)', fontSize: 12,
                cursor: onNavigeraPort ? 'pointer' : 'default' }}>
              <DoorOpen size={14} color="var(--c-text2)" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.namn}</div>
                <div style={{ fontSize: 11, color: 'var(--c-text2)' }}>{o.typ}{o.plats ? ` · ${o.plats}` : ''}</div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--c-text3)', whiteSpace: 'nowrap' }}>Nästa: {o.nasta || '–'}</div>
              {onNavigeraPort && <ChevronRight size={14} color="var(--c-text3)" style={{ flexShrink: 0 }} />}
            </div>
          ))}
        </div>
      )}

      {/* Ärenden */}
      {kundensArenden.length > 0 && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>
            Ärenden ({kundensArenden.length})
          </div>
          {[...kundensArenden].sort((a, b) => (b.datum || '').localeCompare(a.datum || '')).map(a => (
            <div key={a.id}
              onClick={() => onNavigeraArende?.(a.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 0', borderBottom: '1px solid var(--c-border)', fontSize: 12,
                cursor: onNavigeraArende ? 'pointer' : 'default' }}>
              <AlertCircle size={14} color={a.status === 'atgardad' ? 'var(--c-text3)' : 'var(--c-red)'} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.namn}</div>
                <div style={{ fontSize: 11, color: 'var(--c-text2)' }}>{a.feltyp} · {a.datum}</div>
              </div>
              <span className={`badge ${statusCls[a.status] || 'badge-gray'}`}>{statusLabel[a.status] || a.status}</span>
              {onNavigeraArende && <ChevronRight size={14} color="var(--c-text3)" style={{ flexShrink: 0 }} />}
            </div>
          ))}
        </div>
      )}

      {/* Ta bort */}
      <div className="card" style={{ borderLeft: '3px solid var(--c-red)', borderRadius: '0 12px 12px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--c-red-text)' }}>Ta bort kund</div>
            <div style={{ fontSize: 12, color: 'var(--c-text2)' }}>Tar inte bort kopplade fastigheter eller portar.</div>
          </div>
          {bekraftaBort ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-danger" onClick={onTaBort}>Bekräfta</button>
              <button className="btn" onClick={() => setBekraftaBort(false)}>Avbryt</button>
            </div>
          ) : (
            <button
              onClick={() => setBekraftaBort(true)}
              style={{ padding: '7px 14px', fontSize: 12, borderRadius: 8, cursor: 'pointer', border: '1px solid var(--c-red)', background: 'var(--c-red-bg)', color: 'var(--c-red-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Trash2 size={13} /> Ta bort
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Huvudkomponent ────────────────────────────────────────────────────────────
export default function Kunder({ kunder = [], fastigheter = [], objekt = [], arenden = [], onLaggTill, onUppdatera, onTaBort, onNavigeraArende, onNavigeraPort }) {
  const [sok,           setSok]           = useState('')
  const [visaForm,      setVisaForm]      = useState(false)
  const [redigerar,     setRedigerar]     = useState(null)
  const [valdKundId,    setValdKundId]    = useState(null)

  const filtered = kunder.filter(k =>
    k.namn?.toLowerCase().includes(sok.toLowerCase()) ||
    k.kontakt?.toLowerCase().includes(sok.toLowerCase()) ||
    k.ort?.toLowerCase().includes(sok.toLowerCase())
  )

  const laggTillKund = async (formData) => {
    const ok = await onLaggTill({ ...formData })
    if (ok !== false) setVisaForm(false)
  }

  const sparaRedigering = (formData) => {
    onUppdatera?.(redigerar.id, formData)
    setRedigerar(null)
    setValdKundId(null)
  }

  const taBortKund = (id) => {
    onTaBort?.(id)
    setValdKundId(null)
  }

  // ── Detaljvy ──
  if (valdKundId) {
    const kund = kunder.find(k => k.id === valdKundId)
    if (!kund) { setValdKundId(null); return null }

    if (redigerar?.id === kund.id) {
      return (
        <div>
          <button className="btn" onClick={() => setRedigerar(null)} style={{ marginBottom: 16 }}>← Tillbaka</button>
          <KundForm initialVarden={redigerar} onSpara={sparaRedigering} onAvbryt={() => setRedigerar(null)} />
        </div>
      )
    }

    return (
      <KundDetalj
        kund={kund}
        fastigheter={fastigheter}
        objekt={objekt}
        arenden={arenden}
        onBack={() => setValdKundId(null)}
        onRedigera={() => setRedigerar(kund)}
        onTaBort={() => taBortKund(kund.id)}
        onNavigeraArende={onNavigeraArende}
        onNavigeraPort={onNavigeraPort}
      />
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 2 }}>Kunder</h1>
          <p style={{ color: 'var(--c-text2)', fontSize: 13 }}>{kunder.length} registrerade kunder</p>
        </div>
        {!visaForm && (
          <button className="btn btn-primary" onClick={() => setVisaForm(true)}>
            <Plus size={15} /> Ny kund
          </button>
        )}
      </div>

      {visaForm && (
        <KundForm onSpara={laggTillKund} onAvbryt={() => setVisaForm(false)} />
      )}

      {!visaForm && (
        <>
          <input
            type="text" placeholder="Sök kund, kontakt, ort…"
            value={sok} onChange={e => setSok(e.target.value)}
            style={{ marginBottom: 12 }}
          />

          <div className="card">
            {filtered.map(k => (
              <div
                key={k.id}
                className="row-item"
                onClick={() => setValdKundId(k.id)}
                style={{ cursor: 'pointer' }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                  background: k.typ === 'foretag' ? 'var(--c-blue-bg)' : 'var(--c-teal-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {k.typ === 'foretag'
                    ? <Building2 size={18} color="var(--c-blue)" />
                    : <User      size={18} color="var(--c-teal)" />}
                </div>

                <div className="row-main">
                  <div className="row-name">{k.namn}</div>
                  <div className="row-sub">{[k.kontakt, k.telefon, k.ort].filter(Boolean).join(' · ')}</div>
                </div>

                <span className={`badge ${k.typ === 'foretag' ? 'badge-blue' : 'badge-teal'}`}>
                  {k.typ === 'foretag' ? 'Företag' : 'Privatperson'}
                </span>

                <ChevronRight size={16} color="var(--c-text3)" />
              </div>
            ))}

            {filtered.length === 0 && (
              <p style={{ color: 'var(--c-text2)', fontSize: 13 }}>Inga kunder hittades.</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
