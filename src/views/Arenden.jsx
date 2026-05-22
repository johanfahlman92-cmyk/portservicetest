import { useState, useEffect } from 'react'
import { ChevronRight, UserPlus, CheckCircle, Search, Paperclip, Plus, X, Pencil, FileText, Printer, Archive, RotateCcw } from 'lucide-react'
import DokumentZon from '../components/DokumentZon.jsx'
import Felanmalan from './Felanmalan.jsx'
import logo from '../image-1779305303942.png'

const statusLabel = { ny: 'Ny', pagAr: 'Pågår', atgardad: 'Åtgärdad' }
const statusCls   = { ny: 'badge-red', pagAr: 'badge-amber', atgardad: 'badge-green' }
const prioLabel   = { normal: 'Normal', hog: 'Hög', akut: 'Akut' }
const prioCls     = { normal: 'badge-gray', hog: 'badge-amber', akut: 'badge-red' }

const FÄLT = { width: '100%', padding: '7px 10px', fontSize: 13, border: '1px solid var(--c-border)', borderRadius: 7, background: 'var(--c-bg)', color: 'var(--c-text)', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }

async function skrivUtArende(a) {
  // Hämta logotyp som base64
  let logoBase64 = null
  try {
    const res  = await fetch(logo)
    const blob = await res.blob()
    logoBase64 = await new Promise(resolve => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.readAsDataURL(blob)
    })
  } catch { /* om det misslyckas visas inget logo */ }

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>Felanmälan #${a.nr}</title>
  <style>
    *{box-sizing:border-box}
    body{font-family:system-ui,sans-serif;margin:0;padding:32px 40px;color:#1a1917;font-size:13px}
    .top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:16px;border-bottom:2px solid #1C3461}
    .company-sub{font-size:11px;color:#666;margin-top:4px}
    .nr{font-size:22px;font-weight:700;text-align:right}
    .nr-sub{font-size:11px;color:#666;text-align:right}
    h3{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#888;margin:20px 0 8px}
    .grid{display:grid;grid-template-columns:1fr 1fr;border:1px solid #ddd;border-radius:8px;overflow:hidden}
    .cell{padding:9px 13px;border-bottom:1px solid #ddd}
    .cell:nth-child(odd){border-right:1px solid #ddd}
    .cell:last-child,.cell:nth-last-child(2){border-bottom:none}
    .lbl{font-size:10px;color:#888;margin-bottom:2px}
    .val{font-weight:600}
    .desc{border:1px solid #ddd;border-radius:8px;padding:12px;color:#444;line-height:1.7;min-height:60px}
    .sigs{display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-top:48px}
    .sig{border-top:1px solid #333;padding-top:8px;font-size:11px;color:#666}
    .work{border:1px solid #ddd;border-radius:8px;padding:12px;min-height:100px}
    @media print{body{padding:16px 20px}}
  </style></head><body>
  <div class="top">
    <div>
      ${logoBase64 ? `<img src="${logoBase64}" style="height:44px;display:block" alt="NMV Portservice" />` : '<div style="font-size:20px;font-weight:800">NMV Portservice</div>'}
      <div class="company-sub">Felanmälan</div>
    </div>
    <div><div class="nr">#${a.nr}</div><div class="nr-sub">${a.datum || ''}</div></div>
  </div>
  <h3>Kund &amp; Port</h3>
  <div class="grid">
    <div class="cell"><div class="lbl">Kund</div><div class="val">${a.kund || '–'}</div></div>
    <div class="cell"><div class="lbl">Port</div><div class="val">${a.namn || '–'}</div></div>
    <div class="cell"><div class="lbl">Kontaktperson</div><div class="val">${a.kontakt || '–'}</div></div>
    <div class="cell"><div class="lbl">Planerat besök</div><div class="val">${a.besok || '–'}</div></div>
  </div>
  <h3>Felinformation</h3>
  <div class="grid">
    <div class="cell"><div class="lbl">Feltyp</div><div class="val">${a.feltyp || '–'}</div></div>
    <div class="cell"><div class="lbl">Prioritet</div><div class="val">${prioLabel[a.prioritet] || a.prioritet || '–'}</div></div>
    <div class="cell"><div class="lbl">Tilldelad tekniker</div><div class="val">${a.tekniker || 'Ej tilldelad'}</div></div>
    <div class="cell"><div class="lbl">Status</div><div class="val">${statusLabel[a.status] || a.status || '–'}</div></div>
  </div>
  ${a.beskrivning ? `<h3>Kundens beskrivning</h3><div class="desc">"${a.beskrivning}"</div>` : ''}
  <h3>Utfört arbete (fylls i av tekniker)</h3>
  <div class="work"></div>
  <div class="sigs">
    <div class="sig">Teknikerns underskrift &amp; datum</div>
    <div class="sig">Kundens underskrift &amp; datum</div>
  </div>
  </body></html>`
  const w = window.open('', '_blank')
  w.document.write(html)
  w.document.close()
  setTimeout(() => w.print(), 400)
}

function ArendeDetalj({ a, tekniker, objekt = [], onUppdatera, onUppdateraObjekt, onBack }) {
  const [visaTilldela,  setVisaTilldela]  = useState(false)
  const [valdTekniker,  setValdTekniker]  = useState(a.tekniker || '')
  const [sparar,        setSparar]        = useState(false)
  const [dokument,      setDokument]      = useState(a.dokument || [])
  const [redigerar,     setRedigerar]     = useState(false)
  const [editForm,      setEditForm]      = useState({})
  const [visaProtokoll, setVisaProtokoll] = useState(false)
  const [protokollSparad, setProtokollSparad] = useState(false)
  const [protokollForm, setProtokollForm] = useState({
    utfort: '', nastaService: '', status: 'ok', tekniker: a.tekniker || '',
  })
  const [nastaTyp, setNastaTyp] = useState('')

  const väljNastaTyp = (typ) => {
    setNastaTyp(typ)
    if (typ === '6m' || typ === '12m') {
      const d = new Date()
      d.setMonth(d.getMonth() + (typ === '6m' ? 6 : 12))
      updProt('nastaService', d.toISOString().slice(0, 10))
    } else if (typ === 'ingen') {
      updProt('nastaService', '')
    }
  }

  const updEdit  = (k, v) => setEditForm(f => ({ ...f, [k]: v }))
  const updProt  = (k, v) => setProtokollForm(f => ({ ...f, [k]: v }))

  const sparaDokument = async (nyaDok) => {
    setDokument(nyaDok)
    await onUppdatera(a.id, { dokument: nyaDok })
  }

  const startRedigera = () => {
    setEditForm({ datum: a.datum || '', besok: a.besok || '', feltyp: a.feltyp || '', prioritet: a.prioritet || 'normal', beskrivning: a.beskrivning || '', kontakt: a.kontakt || '', tekniker: a.tekniker || '' })
    setRedigerar(true)
  }

  const sparaRedigering = async () => {
    setSparar(true)
    await onUppdatera(a.id, editForm)
    setSparar(false)
    setRedigerar(false)
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

  const arkivera = async () => {
    setSparar(true)
    await onUppdatera(a.id, { arkiverad: true })
    setSparar(false)
    onBack()
  }

  const ateraktivera = async () => {
    setSparar(true)
    await onUppdatera(a.id, { arkiverad: false, status: 'pagAr' })
    setSparar(false)
  }

  const sparaProtokoll = async () => {
    setSparar(true)
    const port = objekt.find(o => o.namn === a.namn || o.id === a.objektId)
    if (port && onUppdateraObjekt) {
      await onUppdateraObjekt(port.id, {
        senaste: new Date().toISOString().slice(0, 10),
        nasta:   protokollForm.nastaService || port.nasta,
        status:  protokollForm.status,
      })
    }
    await onUppdatera(a.id, {
      status:    'atgardad',
      protokoll: protokollForm.utfort,
      tekniker:  protokollForm.tekniker || a.tekniker,
    })
    setSparar(false)
    setProtokollSparad(true)
    setTimeout(() => onBack(), 1800)
  }

  // Merge local edits for display
  const vis = redigerar ? { ...a, ...editForm } : a

  return (
    <div>
      {/* Topprad */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <button className="btn" onClick={onBack}>← Tillbaka</button>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => skrivUtArende(a)} className="btn" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Printer size={13} /> Skriv ut
          </button>
          {!redigerar && (
            <button onClick={startRedigera} className="btn" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Pencil size={13} /> Redigera
            </button>
          )}
        </div>
      </div>

      {/* Huvudkort */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{a.namn}</div>
            <div style={{ fontSize: 11, color: 'var(--c-text2)' }}>Ärende #{a.nr} · {a.kund}</div>
          </div>
          <span className={`badge ${statusCls[a.status]}`}>{statusLabel[a.status]}</span>
        </div>

        {redigerar ? (
          /* ── Redigeringsläge ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--c-text2)', marginBottom: 4 }}>Öppnad</div>
                <input type="date" value={editForm.datum} onChange={e => updEdit('datum', e.target.value)} style={FÄLT} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--c-text2)', marginBottom: 4 }}>Planerat besök</div>
                <input type="date" value={editForm.besok} onChange={e => updEdit('besok', e.target.value)} style={FÄLT} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--c-text2)', marginBottom: 4 }}>Feltyp</div>
                <select value={editForm.feltyp} onChange={e => updEdit('feltyp', e.target.value)} style={FÄLT}>
                  {['Porten öppnar/stänger inte','Porten fastnar','Ovanliga ljud','Fjärrkontroll fungerar inte','Synlig skada','Annat'].map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--c-text2)', marginBottom: 4 }}>Prioritet</div>
                <select value={editForm.prioritet} onChange={e => updEdit('prioritet', e.target.value)} style={FÄLT}>
                  <option value="normal">Normal</option>
                  <option value="hog">Hög</option>
                  <option value="akut">Akut</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--c-text2)', marginBottom: 4 }}>Kontaktperson</div>
                <input value={editForm.kontakt} onChange={e => updEdit('kontakt', e.target.value)} style={FÄLT} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--c-text2)', marginBottom: 4 }}>Tilldelad tekniker</div>
                <select value={editForm.tekniker} onChange={e => updEdit('tekniker', e.target.value)} style={FÄLT}>
                  <option value="">– Ej tilldelad –</option>
                  {tekniker.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--c-text2)', marginBottom: 4 }}>Beskrivning</div>
              <textarea value={editForm.beskrivning} onChange={e => updEdit('beskrivning', e.target.value)} rows={3} style={{ ...FÄLT, resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={sparaRedigering} disabled={sparar}>{sparar ? 'Sparar…' : 'Spara ändringar'}</button>
              <button className="btn" onClick={() => setRedigerar(false)}>Avbryt</button>
            </div>
          </div>
        ) : (
          /* ── Visningsläge ── */
          [
            ['Feltyp', vis.feltyp],
            ['Prioritet', prioLabel[vis.prioritet] || vis.prioritet],
            ['Öppnad', vis.datum],
            ['Kontakt', vis.kontakt],
            ['Tekniker', vis.tekniker || 'Ej tilldelad'],
            ['Planerat besök', vis.besok || '–'],
          ].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--c-border)', fontSize: 12 }}>
              <span style={{ color: 'var(--c-text2)' }}>{l}</span>
              <span style={{ fontWeight: 500 }}>{v}</span>
            </div>
          ))
        )}
      </div>

      {/* Beskrivning */}
      {!redigerar && a.beskrivning && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="section-title">Kundens beskrivning</div>
          <div style={{ background: 'var(--c-bg)', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: 'var(--c-text2)', lineHeight: 1.7 }}>
            "{a.beskrivning}"
          </div>
        </div>
      )}

      {/* Tilldela tekniker */}
      {visaTilldela && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 10 }}>Tilldela tekniker</div>
          <select value={valdTekniker} onChange={e => setValdTekniker(e.target.value)}
            style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: '1px solid var(--c-border)', borderRadius: 6, background: 'var(--c-bg)', marginBottom: 10 }}>
            <option value="">– Välj tekniker –</option>
            {tekniker.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={tilldela} disabled={sparar || !valdTekniker}>{sparar ? 'Sparar…' : 'Spara'}</button>
            <button className="btn" onClick={() => setVisaTilldela(false)}>Avbryt</button>
          </div>
        </div>
      )}

      {/* Serviceprotokoll */}
      {a.status !== 'atgardad' && !redigerar && (
        <div className="card" style={{ marginBottom: 12 }}>
          <button
            onClick={() => setVisaProtokoll(v => !v)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: 'var(--c-text)' }}>
              <FileText size={14} color="var(--c-blue)" /> Rapportera & stäng ärende
            </div>
            <span style={{ fontSize: 12, color: 'var(--c-text3)' }}>{visaProtokoll ? '▲' : '▼'}</span>
          </button>

          {visaProtokoll && (
            protokollSparad ? (
              <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--c-teal)', fontSize: 13 }}>
                <CheckCircle size={15} /> Protokoll sparat — ärendet stängs…
              </div>
            ) : (
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--c-border)', paddingTop: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--c-text2)', marginBottom: 4 }}>Tekniker</div>
                    <select value={protokollForm.tekniker} onChange={e => updProt('tekniker', e.target.value)} style={FÄLT}>
                      <option value="">Välj tekniker…</option>
                      {tekniker.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--c-text2)', marginBottom: 6 }}>Nästa service</div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: nastaTyp === 'eget' ? 6 : 0 }}>
                      {[
                        { id: '6m',   label: '6 mån' },
                        { id: '12m',  label: '12 mån' },
                        { id: 'eget', label: 'Eget datum' },
                        { id: 'ingen',label: 'Ingen' },
                      ].map(({ id, label }) => (
                        <button key={id} type="button" onClick={() => väljNastaTyp(id)} style={{
                          padding: '4px 10px', fontSize: 11, borderRadius: 20, cursor: 'pointer',
                          border: `1px solid ${nastaTyp === id ? 'var(--c-blue)' : 'var(--c-border)'}`,
                          background: nastaTyp === id ? 'var(--c-blue-bg)' : 'transparent',
                          color: nastaTyp === id ? 'var(--c-blue-text)' : 'var(--c-text2)',
                          fontWeight: nastaTyp === id ? 600 : 400,
                          transition: 'all 0.12s',
                        }}>{label}</button>
                      ))}
                    </div>
                    {nastaTyp === 'eget' && (
                      <input type="date" value={protokollForm.nastaService}
                        onChange={e => updProt('nastaService', e.target.value)} style={FÄLT} />
                    )}
                    {nastaTyp && nastaTyp !== 'eget' && nastaTyp !== 'ingen' && protokollForm.nastaService && (
                      <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 4 }}>
                        → {protokollForm.nastaService}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--c-text2)', marginBottom: 4 }}>Utfört arbete *</div>
                  <textarea value={protokollForm.utfort} onChange={e => updProt('utfort', e.target.value)}
                    placeholder="Beskriv vad som gjordes…" rows={3} style={{ ...FÄLT, resize: 'vertical' }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--c-text2)', marginBottom: 6 }}>Portstatus efter åtgärd</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[['ok','OK'],['varning','Varning'],['försenad','Kräver uppföljning']].map(([v, l]) => (
                      <button key={v} onClick={() => updProt('status', v)} style={{
                        padding: '5px 12px', fontSize: 12, borderRadius: 6, cursor: 'pointer',
                        border: `1px solid ${protokollForm.status === v ? 'var(--c-teal)' : 'var(--c-border)'}`,
                        background: protokollForm.status === v ? 'var(--c-teal)22' : 'transparent',
                        color: protokollForm.status === v ? 'var(--c-teal)' : 'var(--c-text2)',
                        fontWeight: protokollForm.status === v ? 600 : 400,
                      }}>{l}</button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={sparaProtokoll} disabled={sparar || !protokollForm.utfort}
                  style={{ padding: '9px', background: 'var(--c-teal)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: protokollForm.utfort ? 'pointer' : 'not-allowed', opacity: protokollForm.utfort ? 1 : 0.5 }}
                >
                  {sparar ? 'Sparar…' : 'Spara protokoll & stäng ärende'}
                </button>
              </div>
            )
          )}
        </div>
      )}

      {/* Dokument */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 7 }}>
          <Paperclip size={14} color="var(--c-blue)" /> Bilagor {dokument.length > 0 && `(${dokument.length})`}
        </div>
        <DokumentZon dokument={dokument} onChange={sparaDokument} />
      </div>

      {/* Knappar – öppna ärenden */}
      {a.status !== 'atgardad' && !a.arkiverad && !redigerar && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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

      {/* Arkivera – åtgärdade ej arkiverade */}
      {a.status === 'atgardad' && !a.arkiverad && !redigerar && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={arkivera}
            disabled={sparar}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              background: 'none', border: '1px solid var(--c-border)',
              color: 'var(--c-text2)', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--c-text2)'; e.currentTarget.style.color = 'var(--c-text)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--c-border)'; e.currentTarget.style.color = 'var(--c-text2)' }}
          >
            <Archive size={14} /> Arkivera ärende
          </button>
          <span style={{ fontSize: 11, color: 'var(--c-text3)' }}>Döljer ärendet från aktiva listor</span>
        </div>
      )}

      {/* Återaktivera – arkiverade */}
      {a.arkiverad && !redigerar && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--c-amber-bg)', border: '1px solid var(--c-amber)',
          borderRadius: 10, padding: '12px 14px',
        }}>
          <Archive size={16} color="var(--c-amber)" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-amber-text)' }}>Arkiverat ärende</div>
            <div style={{ fontSize: 11, color: 'var(--c-amber-text)' }}>Visas inte i aktiva listor</div>
          </div>
          <button
            onClick={ateraktivera}
            disabled={sparar}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: '#fff', border: '1px solid var(--c-amber)', color: 'var(--c-amber-text)',
            }}
          >
            <RotateCcw size={13} /> Återaktivera
          </button>
        </div>
      )}
    </div>
  )
}

export default function Arenden({ arenden = [], tekniker = [], kunder = [], objekt = [], onUppdatera, onUppdateraObjekt, onLaggTill, onNyKund, onLoggAktivitet, initialArendeId, onInitialArendeHandled }) {
  const [valt,      setValt]      = useState(null)
  const [filter,    setFilter]    = useState('oppna')
  const [sokText,   setSokText]   = useState('')
  const [visaForm,  setVisaForm]  = useState(false)
  const [valjLage,  setValjLage]  = useState(false)
  const [valda,     setValda]     = useState(new Set())
  const [bulkSparar, setBulkSparar] = useState(false)

  useEffect(() => {
    if (initialArendeId && arenden.length > 0) {
      const a = arenden.find(x => x.id === initialArendeId)
      if (a) {
        setValt(a)
        onInitialArendeHandled?.()
      }
    }
  }, [initialArendeId, arenden])

  const toggleVald = (id) => setValda(prev => {
    const ny = new Set(prev)
    ny.has(id) ? ny.delete(id) : ny.add(id)
    return ny
  })

  const avslutaValjLage = () => { setValjLage(false); setValda(new Set()) }

  const bulkArkivera = async () => {
    setBulkSparar(true)
    await Promise.all([...valda].map(id => onUppdatera(id, { arkiverad: true })))
    setBulkSparar(false)
    avslutaValjLage()
  }

  const bulkAteraktivera = async () => {
    setBulkSparar(true)
    await Promise.all([...valda].map(id => onUppdatera(id, { arkiverad: false, status: 'pagAr' })))
    setBulkSparar(false)
    avslutaValjLage()
  }

  const filtArenden = arenden.filter(a => {
    if (filter === 'arkiverade') return a.arkiverad === true
    if (a.arkiverad) return false  // dölj arkiverade i alla andra vyer
    const statusOk = filter === 'alla' ? true : filter === 'oppna' ? a.status !== 'atgardad' : a.status === filter
    if (!statusOk) return false
    if (!sokText) return true
    const q = sokText.toLowerCase()
    return a.namn?.toLowerCase().includes(q) || a.kund?.toLowerCase().includes(q) ||
           a.feltyp?.toLowerCase().includes(q) || String(a.nr).includes(q)
  })

  if (valt) {
    const uppdaterat = arenden.find(a => a.id === valt.id) || valt
    return <ArendeDetalj a={uppdaterat} tekniker={tekniker} objekt={objekt} onUppdatera={onUppdatera} onUppdateraObjekt={onUppdateraObjekt} onBack={() => setValt(null)} />
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 2 }}>Ärenden</h1>
          <p style={{ color: 'var(--c-text2)', fontSize: 13 }}>Öppna och pågående serviceärenden</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {!visaForm && (
            <button
              onClick={() => { setValjLage(v => !v); setValda(new Set()) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: valjLage ? 'var(--c-blue-bg)' : 'transparent',
                color: valjLage ? 'var(--c-blue-text)' : 'var(--c-text2)',
                border: `1px solid ${valjLage ? 'var(--c-blue)' : 'var(--c-border)'}`,
                cursor: 'pointer',
              }}
            >
              {valjLage ? <><X size={14} /> Avsluta val</> : 'Välj flera'}
            </button>
          )}
          <button
            onClick={() => { setVisaForm(v => !v); if (valjLage) avslutaValjLage() }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: visaForm ? 'var(--c-surface)' : 'var(--c-teal)',
              color: visaForm ? 'var(--c-text2)' : '#fff',
              border: visaForm ? '1px solid var(--c-border)' : 'none',
              cursor: 'pointer',
            }}
          >
            {visaForm ? <><X size={14} /> Stäng</> : <><Plus size={14} /> Nytt ärende</>}
          </button>
        </div>
      </div>

      {/* Inline-formulär */}
      {visaForm && (
        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 12, padding: '20px', marginBottom: 20 }}>
          <Felanmalan
            kunder={kunder}
            objekt={objekt}
            onSparaArende={(a) => {
              onLaggTill?.(a)
            }}
            onNyKund={onNyKund}
            standaloneMode={false}
          />
        </div>
      )}

      <div style={{ position: 'relative', marginBottom: 10 }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text3)', pointerEvents: 'none' }} />
        <input type="text" placeholder="Sök ärende, kund, feltyp…" value={sokText} onChange={e => setSokText(e.target.value)}
          style={{ width: '100%', padding: '7px 10px 7px 32px', fontSize: 13, border: '1px solid var(--c-border)', borderRadius: 8, background: 'var(--c-surface)', color: 'var(--c-text)', boxSizing: 'border-box' }} />
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {[['oppna', 'Öppna'], ['alla', 'Alla'], ['ny', 'Nya'], ['pagAr', 'Pågår'], ['atgardad', 'Åtgärdade'], ['arkiverade', 'Arkiverade']].map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)} style={{
            padding: '4px 12px', fontSize: 12, borderRadius: 20,
            border: '1px solid var(--c-border)',
            background: filter === id ? 'var(--c-text)' : 'transparent',
            color: filter === id ? '#fff' : 'var(--c-text2)',
            cursor: 'pointer',
          }}>{label}</button>
        ))}
      </div>

      {/* Bulk-åtgärdsrad */}
      {valjLage && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
          background: 'var(--c-blue-bg)', border: '1px solid var(--c-blue)',
          borderRadius: 10, padding: '10px 14px', marginBottom: 12,
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-blue-text)', marginRight: 4 }}>
            {valda.size === 0 ? 'Välj ärenden' : `${valda.size} valda`}
          </span>
          {valda.size > 0 && (<>
            {filter !== 'arkiverade' && (
              <button
                onClick={bulkArkivera}
                disabled={bulkSparar}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 13px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: 'var(--c-text)', color: '#fff', border: 'none',
                  opacity: bulkSparar ? 0.6 : 1,
                }}
              >
                <Archive size={13} /> {bulkSparar ? 'Arkiverar…' : `Arkivera valda (${valda.size})`}
              </button>
            )}
            {filter === 'arkiverade' && (
              <button
                onClick={bulkAteraktivera}
                disabled={bulkSparar}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 13px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: 'var(--c-text)', color: '#fff', border: 'none',
                  opacity: bulkSparar ? 0.6 : 1,
                }}
              >
                <RotateCcw size={13} /> {bulkSparar ? 'Återaktiverar…' : `Återaktivera valda (${valda.size})`}
              </button>
            )}
          </>)}
          <button
            onClick={avslutaValjLage}
            style={{ marginLeft: 'auto', padding: '5px 11px', borderRadius: 7, fontSize: 12, cursor: 'pointer', background: 'none', border: '1px solid var(--c-blue)', color: 'var(--c-blue-text)', fontWeight: 500 }}
          >
            Avbryt
          </button>
        </div>
      )}

      <div className="card">
        {/* Välj alla – visas i välj-läge */}
        {valjLage && filtArenden.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 4px 10px', borderBottom: '1px solid var(--c-border)',
            marginBottom: 4,
          }}>
            <input
              type="checkbox"
              checked={filtArenden.length > 0 && filtArenden.every(a => valda.has(a.id))}
              onChange={e => {
                if (e.target.checked) setValda(new Set(filtArenden.map(a => a.id)))
                else setValda(new Set())
              }}
              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--c-blue)' }}
            />
            <span style={{ fontSize: 12, color: 'var(--c-text2)' }}>Välj alla ({filtArenden.length})</span>
          </div>
        )}

        {filtArenden.length === 0 && (
          <p style={{ color: 'var(--c-text2)', fontSize: 13 }}>Inga ärenden att visa.</p>
        )}
        {filtArenden.map(a => {
          const ärVald = valda.has(a.id)
          return (
            <div key={a.id} className="row-item"
              onClick={() => valjLage ? toggleVald(a.id) : setValt(a)}
              style={{
                cursor: 'pointer',
                opacity: a.arkiverad && !valjLage ? 0.55 : 1,
                background: ärVald ? 'var(--c-blue-bg)' : undefined,
                borderRadius: ärVald ? 8 : undefined,
              }}>
              {valjLage && (
                <input
                  type="checkbox"
                  checked={ärVald}
                  onChange={() => toggleVald(a.id)}
                  onClick={e => e.stopPropagation()}
                  style={{ width: 16, height: 16, cursor: 'pointer', flexShrink: 0, accentColor: 'var(--c-blue)' }}
                />
              )}
              {!valjLage && (
                <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                  background: a.arkiverad ? 'var(--c-text3)' : a.status === 'ny' ? 'var(--c-red)' : a.status === 'pagAr' ? 'var(--c-amber)' : 'var(--c-teal)'
                }} />
              )}
              <div className="row-main">
                <div className="row-name">{a.namn}</div>
                <div className="row-sub">{a.feltyp} · {a.kund} · {a.datum}</div>
              </div>
              <div className="row-right">
                {!valjLage && (a.arkiverad
                  ? <span className="badge badge-gray" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Archive size={10} /> Arkiverat</span>
                  : <><span className={`badge ${prioCls[a.prioritet]}`}>{prioLabel[a.prioritet]}</span>
                     <span className={`badge ${statusCls[a.status]}`}>{statusLabel[a.status]}</span></>
                )}
                {!valjLage && <ChevronRight size={16} color="var(--c-text3)" />}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
