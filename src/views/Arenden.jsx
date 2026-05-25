import { useState, useEffect } from 'react'
import { ChevronRight, UserPlus, CheckCircle, Search, Paperclip, Plus, X, Pencil, FileText, Printer, Archive, RotateCcw, Check, Wrench, AlertCircle, AlertTriangle, Minus, Trash2 } from 'lucide-react'
import DokumentZon from '../components/DokumentZon.jsx'
import Felanmalan from './Felanmalan.jsx'
import { hämtaLogoBase64, pdfHeader, pdfMetaGrid, pdfDoc } from '../utils/pdf.js'
import { protokollPunkter as defaultProtokollMallar } from '../data/store.js'

const statusLabel = { ny: 'Ny', pagAr: 'Pågår', atgardad: 'Åtgärdad' }
const statusCls   = { ny: 'badge-red', pagAr: 'badge-amber', atgardad: 'badge-green' }
const prioLabel   = { normal: 'Normal', hog: 'Hög', akut: 'Akut' }
const prioCls     = { normal: 'badge-gray', hog: 'badge-amber', akut: 'badge-red' }

const FÄLT = { width: '100%', padding: '7px 10px', fontSize: 13, border: '1px solid var(--c-border)', borderRadius: 7, background: 'var(--c-bg)', color: 'var(--c-text)', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }

const KONTROLL_STATUSES = [
  { kod: 'OK',  label: 'Godkänd',       Icon: Check,         color: '#16a34a', bg: '#f0fdf4', border: '#16a34a' },
  { kod: 'AF',  label: 'Åtgärdad',      Icon: Wrench,        color: '#2563eb', bg: '#eff6ff', border: '#2563eb' },
  { kod: 'NOT', label: 'Att notera',    Icon: AlertCircle,   color: '#d97706', bg: '#fffbeb', border: '#d97706' },
  { kod: 'KA',  label: 'Kräver åtgärd', Icon: AlertTriangle, color: '#dc2626', bg: '#fef2f2', border: '#dc2626' },
  { kod: 'EJ',  label: 'Ej tillämpbar', Icon: Minus,         color: '#9ca3af', bg: '#f9fafb', border: '#d1d5db' },
]

async function skrivUtArende(a) {
  const logoBase64 = await hämtaLogoBase64()

  const body = `
    ${pdfHeader(logoBase64, 'Felanmälan', `#${a.nr}`, a.datum || '')}

    <div class="slbl">Kund &amp; port</div>
    ${pdfMetaGrid([
      { lbl: 'Kund',            val: a.kund    },
      { lbl: 'Port',            val: a.namn    },
      { lbl: 'Kontaktperson',   val: a.kontakt },
      { lbl: 'Planerat besök',  val: a.besok   },
    ])}

    <div class="slbl">Felinformation</div>
    ${pdfMetaGrid([
      { lbl: 'Feltyp',              val: a.feltyp                               },
      { lbl: 'Prioritet',           val: prioLabel[a.prioritet] || a.prioritet  },
      { lbl: 'Tilldelad tekniker',  val: (Array.isArray(a.tekniker) ? a.tekniker.join(', ') : a.tekniker) || 'Ej tilldelad' },
      { lbl: 'Status',              val: statusLabel[a.status] || a.status      },
    ])}

    ${a.beskrivning ? `
      <div class="slbl">Kundens beskrivning</div>
      <div class="desc-box">&ldquo;${a.beskrivning}&rdquo;</div>
    ` : ''}

    <div class="slbl">Utfört arbete (fylls i av tekniker)</div>
    <div class="desc-box" style="min-height:100px"></div>

    <div class="sig-section">
      <div class="sig-box" style="flex:1;min-height:70px">
        <div class="sig-label">Teknikerns underskrift</div>
        <div class="sig-date" style="margin-top:32px">Datum: ___________________</div>
      </div>
      <div class="sig-box" style="flex:1;min-height:70px">
        <div class="sig-label">Kundens underskrift</div>
        <div class="sig-date" style="margin-top:32px">Datum: ___________________</div>
      </div>
    </div>
  `

  const w = window.open('', '_blank')
  w.document.write(pdfDoc(`Felanmälan #${a.nr}`, body))
  w.document.close()
  setTimeout(() => w.print(), 400)
}

function ArendeDetalj({ a, tekniker, objekt = [], protokollMallar = {}, onUppdatera, onUppdateraObjekt, onLaggTillBokning, onTaBortBokning, bokningar = {}, onBack }) {
  const [visaTilldela,  setVisaTilldela]  = useState(false)
  const [valdTekniker,  setValdTekniker]  = useState(Array.isArray(a.tekniker) ? [...a.tekniker] : a.tekniker ? [a.tekniker] : [])
  const [sparar,        setSparar]        = useState(false)
  const [dokument,      setDokument]      = useState(a.dokument || [])
  const [redigerar,     setRedigerar]     = useState(false)
  const [editForm,      setEditForm]      = useState({})
  const [visaProtokoll, setVisaProtokoll] = useState(a.typ === 'service')
  const [protokollSparad, setProtokollSparad] = useState(false)
  const [protokollForm, setProtokollForm] = useState({
    utfort: '', nastaService: '', status: 'ok', tekniker: (Array.isArray(a.tekniker) ? a.tekniker[0] : a.tekniker) || '',
  })
  const [nastaTyp,        setNastaTyp]        = useState('')
  const [checkStatuses,   setCheckStatuses]   = useState({})
  const [checkNoteringar, setCheckNoteringar] = useState({})

  // Port och protokollpunkter (används för egenkontroll vid service)
  const port = objekt.find(o => a.objekt_id ? o.id === a.objekt_id : (o.namn === a.namn && o.kund === a.kund))
  const portTyp = port?.typ || ''
  const aktivaMallar = Object.keys(protokollMallar).length > 0 ? protokollMallar : defaultProtokollMallar
  const protokollLista = a.typ === 'service' ? (aktivaMallar[portTyp] || []) : []
  const alleaChecksFyllda = protokollLista.length === 0 || protokollLista.every(p => !!checkStatuses[p])

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
    setEditForm({ datum: a.datum || '', besok: a.besok || '', feltyp: a.feltyp || '', prioritet: a.prioritet || 'normal', beskrivning: a.beskrivning || '', kontakt: a.kontakt || '', tekniker: Array.isArray(a.tekniker) ? [...a.tekniker] : a.tekniker ? [a.tekniker] : [] })
    setRedigerar(true)
  }

  const sparaRedigering = async () => {
    setSparar(true)
    // Ta bort gamla besöksbokning om datum ändrats eller rensats
    if (onTaBortBokning && a.besok && editForm.besok !== a.besok) {
      const gamlaBok = bokningar[a.besok] || []
      let gammalIdx = -1
      for (let i = gamlaBok.length - 1; i >= 0; i--) {
        if (gamlaBok[i].arendeId === a.id) { gammalIdx = i; break }
      }
      if (gammalIdx !== -1) await onTaBortBokning(a.besok, gammalIdx)
    }
    await onUppdatera(a.id, editForm)
    // Auto-skapa kalenderbokning när besök-datum sätts eller ändras
    if (editForm.besok && editForm.besok !== a.besok && onLaggTillBokning) {
      await onLaggTillBokning(editForm.besok, {
        tid:      '08:00',
        typ:      'felanmalan',
        namn:     a.namn,
        kund:     a.kund,
        tek:      editForm.tekniker.length ? editForm.tekniker : (Array.isArray(a.tekniker) ? a.tekniker : a.tekniker ? [a.tekniker] : []),
        arendeId: a.id,
      })
    }
    setSparar(false)
    setRedigerar(false)
  }

  const tilldela = async () => {
    if (!valdTekniker.length) return
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
    const idag = new Date().toISOString().slice(0, 10)
    const tekNamn = protokollForm.tekniker || a.tekniker || ''
    if (port && onUppdateraObjekt) {
      // Skapa historikrad i portregistret
      const nyHistorik = {
        id:         'h' + Date.now(),
        datum:      idag,
        typ:        'service',
        tekniker:   tekNamn,
        notering:   protokollForm.utfort,
        ärendeNr:   a.nr,
        status:     protokollForm.status,
        portTyp:    portTyp,
        statuses:   checkStatuses,
        noteringar: checkNoteringar,
      }
      await onUppdateraObjekt(port.id, {
        senaste:  idag,
        nasta:    protokollForm.nastaService || port.nasta,
        status:   protokollForm.status,
        historik: [...(port.historik || []), nyHistorik],
      })
    }
    await onUppdatera(a.id, {
      status:    'atgardad',
      protokoll: protokollForm.utfort,
      tekniker:  tekNamn,
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
                <div style={{ fontSize: 11, color: 'var(--c-text2)', marginBottom: 6 }}>Tilldelade tekniker</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {tekniker.map(t => {
                    const checked = (editForm.tekniker || []).includes(t)
                    return (
                      <button key={t} type="button"
                        onClick={() => updEdit('tekniker', checked ? (editForm.tekniker || []).filter(x => x !== t) : [...(editForm.tekniker || []), t])}
                        style={{ padding: '6px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          border: `2px solid ${checked ? 'var(--c-navy)' : 'var(--c-border)'}`,
                          background: checked ? 'var(--c-blue-bg)' : 'transparent',
                          color: checked ? 'var(--c-navy)' : 'var(--c-text2)' }}>
                        {checked ? '✓ ' : ''}{t}
                      </button>
                    )
                  })}
                </div>
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
            ['Tekniker', (Array.isArray(vis.tekniker) ? vis.tekniker.join(', ') : vis.tekniker) || 'Ej tilldelad'],
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {tekniker.map(t => {
              const checked = valdTekniker.includes(t)
              return (
                <button key={t} type="button" onClick={() => setValdTekniker(prev => checked ? prev.filter(x => x !== t) : [...prev, t])}
                  style={{ padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    border: `2px solid ${checked ? 'var(--c-navy)' : 'var(--c-border)'}`,
                    background: checked ? 'var(--c-blue-bg)' : 'transparent',
                    color: checked ? 'var(--c-navy)' : 'var(--c-text2)' }}>
                  {checked ? '✓ ' : ''}{t}
                </button>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={tilldela} disabled={sparar || !valdTekniker.length}>{sparar ? 'Sparar…' : 'Spara'}</button>
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
                {/* ── Egenkontroll (service-ärenden med känd porttyp) ── */}
                {protokollLista.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-text2)' }}>
                        Egenkontroll – {portTyp}
                      </div>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {KONTROLL_STATUSES.map(s => (
                          <span key={s.kod} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, padding: '2px 6px', borderRadius: 4, background: s.bg, color: s.color, fontWeight: 600 }}>
                            <s.Icon size={9} /> {s.label}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{ border: '1px solid var(--c-border)', borderRadius: 8, overflow: 'hidden' }}>
                      {protokollLista.map((punkt, i) => {
                        const sts = checkStatuses[punkt]
                        const not = checkNoteringar[punkt] || ''
                        return (
                          <div key={punkt} style={{
                            padding: '7px 10px',
                            borderBottom: i < protokollLista.length - 1 ? '1px solid var(--c-border)' : 'none',
                            background: i % 2 === 0 ? 'transparent' : 'var(--c-surface)',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                              <span style={{ fontSize: 12, flex: 1 }}>{punkt}</span>
                              <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                                {KONTROLL_STATUSES.map(({ kod, Icon, color, bg, border, label }) => (
                                  <button key={kod} type="button"
                                    onClick={() => setCheckStatuses(prev => ({ ...prev, [punkt]: kod }))}
                                    title={label}
                                    style={{
                                      width: 30, height: 28, borderRadius: 6,
                                      border: `1px solid ${sts === kod ? border : 'var(--c-border)'}`,
                                      background: sts === kod ? bg : 'transparent',
                                      color: sts === kod ? color : 'var(--c-text3)',
                                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      transition: 'all 0.12s',
                                    }}
                                  ><Icon size={13} /></button>
                                ))}
                              </div>
                            </div>
                            {(sts === 'NOT' || sts === 'KA' || sts === 'AF') && (
                              <input type="text" placeholder="Notering…" value={not}
                                onChange={e => setCheckNoteringar(prev => ({ ...prev, [punkt]: e.target.value }))}
                                style={{ ...FÄLT, marginTop: 5, fontSize: 11 }} />
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <div style={{ fontSize: 11, marginTop: 4, color: alleaChecksFyllda ? 'var(--c-teal)' : 'var(--c-text3)' }}>
                      {alleaChecksFyllda
                        ? '✓ Alla punkter ifyllda'
                        : `${protokollLista.filter(p => checkStatuses[p]).length} / ${protokollLista.length} punkter ifyllda`}
                    </div>
                  </div>
                )}

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
                  onClick={sparaProtokoll} disabled={sparar || !protokollForm.utfort || !alleaChecksFyllda}
                  style={{ padding: '9px', background: 'var(--c-teal)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: (protokollForm.utfort && alleaChecksFyllda) ? 'pointer' : 'not-allowed', opacity: (protokollForm.utfort && alleaChecksFyllda) ? 1 : 0.5 }}
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
              <UserPlus size={14} /> {(a.tekniker || []).length ? 'Ändra tekniker' : 'Tilldela tekniker'}
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

export default function Arenden({ arenden = [], tekniker = [], kunder = [], objekt = [], protokollMallar = {}, bokningar = {}, onUppdatera, onUppdateraObjekt, onLaggTill, onLaggTillBokning, onTaBortBokning, onTaBort, onNyKund, onLoggAktivitet, initialArendeId, onInitialArendeHandled, prefilladPort, onPrefilladPortHandled }) {
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

  // Auto-öppna nytt ärende-formulär med port förifylld
  useEffect(() => {
    if (prefilladPort) {
      setVisaForm(true)
      setValt(null)
      onPrefilladPortHandled?.()
    }
  }, [prefilladPort])

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

  const bulkTaBort = async () => {
    if (!onTaBort) return
    setBulkSparar(true)
    await Promise.all([...valda].map(id => onTaBort(id)))
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
    return <ArendeDetalj a={uppdaterat} tekniker={tekniker} objekt={objekt} protokollMallar={protokollMallar} bokningar={bokningar} onUppdatera={onUppdatera} onUppdateraObjekt={onUppdateraObjekt} onLaggTillBokning={onLaggTillBokning} onTaBortBokning={onTaBortBokning} onBack={() => setValt(null)} />
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 2 }}>Felanmälningar</h1>
          <p style={{ color: 'var(--c-text2)', fontSize: 13 }}>Öppna och pågående felanmälningar</p>
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
            initialPortNamn={prefilladPort?.namn || ''}
            initialKund={prefilladPort?.kund || ''}
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
            {filter === 'arkiverade' && (<>
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
              {onTaBort && (
                <button
                  onClick={bulkTaBort}
                  disabled={bulkSparar}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 13px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    background: 'var(--c-red)', color: '#fff', border: 'none',
                    opacity: bulkSparar ? 0.6 : 1,
                  }}
                >
                  <Trash2 size={13} /> {bulkSparar ? 'Tar bort…' : `Ta bort permanent (${valda.size})`}
                </button>
              )}
            </>)}
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
