import { useState } from 'react'
import { AlertCircle, CheckCircle, LogOut, Phone, Search, Wrench } from 'lucide-react'
import logo from '../logo.png'

const FELTYPER = [
  'Porten öppnar/stänger inte',
  'Porten fastnar',
  'Ovanliga ljud',
  'Fjärrkontroll fungerar inte',
  'Synlig skada',
  'Annat',
]

const SERVICETYPER = [
  'Periodservice',
  'Akutservice',
  'Garanti / reklamation',
  'Reparation',
  'Renovering',
  'Annat',
]

export default function Felanmalan({ kunder = [], objekt = [], onSparaArende, onLoggaUt, onNyKund, standaloneMode = true }) {
  const [steg, setSteg]       = useState('form')
  const [sparar, setSparar]   = useState(false)

  const [arendeTyp, setArendeTyp] = useState('felanmalan')

  const [sokKund, setSokKund]             = useState('')
  const [valdKund, setValdKund]           = useState(null)
  const [nyKundLage, setNyKundLage]       = useState(false)
  const [nyKundNamn, setNyKundNamn]       = useState('')
  const [nyKundTelefon, setNyKundTelefon] = useState('')
  const [nyKundAdress, setNyKundAdress]   = useState('')
  const [nyKundOrt, setNyKundOrt]         = useState('')

  const [valdObjekt, setValdObjekt]   = useState('')
  const [feltyp, setFeltyp]           = useState(FELTYPER[0])
  const [servicetyp, setServicetyp]   = useState(SERVICETYPER[0])
  const [beskrivning, setBeskrivning] = useState('')
  const [prioritet, setPrioritet]     = useState('normal')

  const typer   = arendeTyp === 'service' ? SERVICETYPER : FELTYPER
  const valtTyp = arendeTyp === 'service' ? servicetyp : feltyp
  const setTyp  = arendeTyp === 'service' ? setServicetyp : setFeltyp

  const filtKunder = kunder.filter(k =>
    k.namn.toLowerCase().includes(sokKund.toLowerCase())
  )
  const kundObjekt = valdKund ? objekt.filter(o => o.kund === valdKund.namn) : []

  const skickaIn = async () => {
    if (!valdKund && !nyKundNamn.trim()) return
    setSparar(true)

    // Spara ny kund i registret om den inte redan finns
    if (!valdKund && nyKundNamn.trim() && onNyKund) {
      await onNyKund({
        typ:     'foretag',
        namn:    nyKundNamn.trim(),
        kontakt: '',
        telefon: nyKundTelefon.trim(),
        epost:   '',
        adress:  nyKundAdress.trim(),
        ort:     nyKundOrt.trim(),
      })
    }

    const idag = new Date().toISOString().slice(0, 10)
    const nr   = idag.replace(/-/g, '').slice(2) + '-' + Math.floor(Math.random() * 90 + 10)
    await onSparaArende({
      id: 'a' + Date.now(),
      nr,
      typ:        arendeTyp,
      namn:       valdObjekt || 'Okänd port',
      kund:       valdKund?.namn     || nyKundNamn.trim(),
      feltyp:     valtTyp,
      beskrivning,
      kontakt:    valdKund?.kontakt  || '',
      adress:     valdKund?.adress   || nyKundAdress.trim() || '',
      ort:        valdKund?.ort      || nyKundOrt.trim()    || '',
      telefon:    valdKund?.telefon  || nyKundTelefon,
      datum:      idag,
      status:     'ny',
      prioritet,
      tekniker:   null,
      besok:      null,
    })
    setSparar(false)
    setSteg('klar')
  }

  const resetForm = () => {
    setSteg('form'); setSokKund(''); setValdKund(null); setNyKundLage(false)
    setNyKundNamn(''); setNyKundTelefon(''); setNyKundAdress(''); setNyKundOrt('')
    setValdObjekt(''); setFeltyp(FELTYPER[0]); setServicetyp(SERVICETYPER[0])
    setBeskrivning(''); setPrioritet('normal'); setArendeTyp('felanmalan')
  }

  const inp = { width: '100%', padding: '10px 12px', fontSize: 15, border: '1px solid var(--c-border)', borderRadius: 8, background: 'var(--c-surface)', color: 'var(--c-text)' }
  const lbl = { fontSize: 13, color: 'var(--c-text2)', display: 'block', marginBottom: 6, fontWeight: 500 }

  const innehall = (
    <div style={{ width: '100%', maxWidth: standaloneMode ? 560 : '100%' }}>

          {steg === 'klar' ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <CheckCircle size={52} color="var(--c-teal)" style={{ marginBottom: 16 }} />
              <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
                {arendeTyp === 'service' ? 'Serviceärende registrerat!'
                  : arendeTyp === 'kontakt' ? 'Kontaktärende registrerat!'
                  : 'Felanmälan inskickad!'}
              </h2>
              <p style={{ color: 'var(--c-text2)', fontSize: 14, marginBottom: 28 }}>
                Ärendet är registrerat och en tekniker kontaktar kunden.
              </p>
              <button className="btn btn-primary" style={{ fontSize: 15, padding: '10px 24px' }} onClick={resetForm}>
                Nytt ärende
              </button>
            </div>
          ) : (
            <>
              {/* Ärendetyp */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  {[
                    ['felanmalan', 'Felanmälan',    <AlertCircle size={15} />, 'var(--c-coral)',  'var(--c-coral-bg)',  'var(--c-coral-text)'],
                    ['kontakt',    'Kontakta kund', <Phone       size={15} />, 'var(--c-amber)',  'var(--c-amber-bg)',  'var(--c-amber-text)'],
                    ['service',    'Serviceärende', <Wrench      size={15} />, 'var(--c-blue)',   'var(--c-blue-bg)',   'var(--c-blue-text)'],
                  ].map(([val, lab, icon, brd, bg, col]) => (
                    <button key={val} onClick={() => setArendeTyp(val)} style={{
                      flex: 1, padding: '10px 6px', borderRadius: 10, cursor: 'pointer',
                      border: `2px solid ${arendeTyp === val ? brd : 'var(--c-border)'}`,
                      background: arendeTyp === val ? bg : 'var(--c-surface)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      fontSize: 13, fontWeight: 500,
                      color: arendeTyp === val ? col : 'var(--c-text2)',
                    }}>
                      {icon} {lab}
                    </button>
                  ))}
                </div>
                <p style={{ color: 'var(--c-text2)', fontSize: 14 }}>
                  {arendeTyp === 'kontakt'
                    ? 'Registrera ett kontaktärende – kunden ska kontaktas av tekniker eller kontoret.'
                    : 'Fyll i formuläret nedan för att registrera ett nytt ärende.'}
                </p>
              </div>

              {/* Kund */}
              <div className="card" style={{ marginBottom: 14 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Kund</div>

                {!valdKund && !nyKundLage && (
                  <>
                    <label style={lbl}>Sök befintlig kund</label>
                    <div style={{ position: 'relative', marginBottom: 10 }}>
                      <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text3)' }} />
                      <input type="text" placeholder="Kundnamn…" value={sokKund}
                        onChange={e => setSokKund(e.target.value)} style={{ ...inp, paddingLeft: 36 }} />
                    </div>
                    {sokKund && filtKunder.map(k => (
                      <div key={k.id} onClick={() => { setValdKund(k); setSokKund('') }}
                        style={{ padding: '10px 12px', background: 'var(--c-bg)', borderRadius: 8, marginBottom: 6, cursor: 'pointer', border: '1px solid var(--c-border)' }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{k.namn}</div>
                        <div style={{ fontSize: 11, color: 'var(--c-text2)' }}>
                          {k.kontakt} · {k.telefon}
                          {k.adress ? ` · ${k.adress}, ${k.ort}` : ''}
                        </div>
                      </div>
                    ))}
                    {sokKund && filtKunder.length === 0 && (
                      <div style={{ fontSize: 13, color: 'var(--c-text3)', padding: '8px 0' }}>Ingen kund hittades.</div>
                    )}
                    <button className="btn" style={{ marginTop: 8, fontSize: 13 }} onClick={() => setNyKundLage(true)}>
                      + Ny kund (ej registrerad)
                    </button>
                  </>
                )}

                {valdKund && (
                  <div style={{ background: 'var(--c-teal-bg)', borderRadius: 8, padding: '10px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-teal-text)' }}>✓ {valdKund.namn}</div>
                        {valdKund.telefon && <div style={{ fontSize: 12, color: 'var(--c-teal-text)' }}>{valdKund.telefon}</div>}
                        {(valdKund.adress || valdKund.ort) && (
                          <div style={{ fontSize: 12, color: 'var(--c-teal-text)' }}>
                            {[valdKund.adress, valdKund.ort].filter(Boolean).join(', ')}
                          </div>
                        )}
                      </div>
                      <button onClick={() => setValdKund(null)} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--c-teal-text)', textDecoration: 'underline', cursor: 'pointer' }}>Byt</button>
                    </div>
                  </div>
                )}

                {nyKundLage && (
                  <div>
                    <div style={{ marginBottom: 10 }}>
                      <label style={lbl}>Namn *</label>
                      <input type="text" value={nyKundNamn} onChange={e => setNyKundNamn(e.target.value)}
                        placeholder="Kund- eller företagsnamn" style={inp} />
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <label style={lbl}>Telefon</label>
                      <input type="tel" value={nyKundTelefon} onChange={e => setNyKundTelefon(e.target.value)}
                        placeholder="070-000 00 00" style={inp} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, marginBottom: 10 }}>
                      <div>
                        <label style={lbl}>Adress</label>
                        <input type="text" value={nyKundAdress} onChange={e => setNyKundAdress(e.target.value)}
                          placeholder="Gatuvägen 1" style={inp} />
                      </div>
                      <div>
                        <label style={lbl}>Ort</label>
                        <input type="text" value={nyKundOrt} onChange={e => setNyKundOrt(e.target.value)}
                          placeholder="Luleå" style={inp} />
                      </div>
                    </div>
                    <button className="btn" style={{ fontSize: 13 }} onClick={() => setNyKundLage(false)}>Avbryt</button>
                  </div>
                )}
              </div>

              {/* Port – visas bara när en kund är vald */}
              {(valdKund || nyKundNamn.trim()) && (
                <div className="card" style={{ marginBottom: 14 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Port (valfritt)</div>

                  {kundObjekt.length > 0 ? (
                    <>
                      <label style={lbl}>Välj berörd port</label>
                      <select value={valdObjekt} onChange={e => setValdObjekt(e.target.value)} style={inp}>
                        <option value="">Ej specificerad</option>
                        {kundObjekt.map(o => (
                          <option key={o.id} value={o.namn}>{o.namn}</option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <>
                      <p style={{ fontSize: 12, color: 'var(--c-text3)', margin: '0 0 8px' }}>
                        Inga portar registrerade för denna kund – ange portbeskrivning manuellt.
                      </p>
                      <input
                        type="text"
                        value={valdObjekt}
                        onChange={e => setValdObjekt(e.target.value)}
                        placeholder="t.ex. Vikport lager A, Grind entré…"
                        style={inp}
                      />
                    </>
                  )}
                </div>
              )}

              {/* Felinformation */}
              <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>
                  {arendeTyp === 'service' ? 'Serviceinformation' : arendeTyp === 'kontakt' ? 'Kontaktärende' : 'Felinformation'}
                </div>

                {arendeTyp !== 'kontakt' && (
                  <div style={{ marginBottom: 14 }}>
                    <label style={lbl}>{arendeTyp === 'service' ? 'Typ av service' : 'Feltyp'}</label>
                    <select value={valtTyp} onChange={e => setTyp(e.target.value)} style={inp}>
                      {typer.map(f => <option key={f}>{f}</option>)}
                    </select>
                  </div>
                )}

                <div style={{ marginBottom: 14 }}>
                  <label style={lbl}>
                    {arendeTyp === 'service' ? 'Beskrivning' : arendeTyp === 'kontakt' ? 'Anledning till kontakt' : 'Kundens beskrivning'}
                  </label>
                  <textarea value={beskrivning} onChange={e => setBeskrivning(e.target.value)}
                    placeholder={
                      arendeTyp === 'service'  ? 'Beskriv servicebehov…' :
                      arendeTyp === 'kontakt'  ? 'Vad gäller ärendet? Beskriv vad kunden behöver hjälp med…' :
                      'Vad berättar kunden? Beskriv felet så detaljerat som möjligt…'
                    }
                    style={{ ...inp, minHeight: 90, resize: 'vertical' }} />
                </div>

                <div>
                  <label style={lbl}>Prioritet</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[['normal', 'Normal', 'Inom 3 dagar', 'var(--c-blue)',  'var(--c-blue-bg)'],
                      ['akut',   'Akut',   'Port blockerad','var(--c-red)',   'var(--c-red-bg)']].map(([val, lab, sub, brd, bg]) => (
                      <button key={val} onClick={() => setPrioritet(val)} style={{
                        flex: 1, padding: '10px 8px', borderRadius: 8, cursor: 'pointer',
                        border: `2px solid ${prioritet === val ? brd : 'var(--c-border)'}`,
                        background: prioritet === val ? bg : 'transparent',
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{lab}</div>
                        <div style={{ fontSize: 11, color: 'var(--c-text2)' }}>{sub}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button onClick={skickaIn}
                disabled={sparar || (!valdKund && !nyKundNamn.trim())}
                className="btn btn-primary"
                style={{ width: '100%', padding: '13px', fontSize: 16, borderRadius: 10 }}>
                {sparar ? 'Skickar in…'
                  : arendeTyp === 'service' ? 'Skicka in serviceärende'
                  : arendeTyp === 'kontakt' ? 'Skicka in kontaktärende'
                  : 'Skicka in felanmälan'}
              </button>
            </>
          )}
    </div>
  )

  if (!standaloneMode) return innehall

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-bg)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#1C3461', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <img src={logo} alt="NMV Portservice" style={{ height: 38 }} />
        <button onClick={onLoggaUt} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)', borderRadius: 7, padding: '6px 12px', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <LogOut size={14} /> Logga ut
        </button>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px' }}>
        {innehall}
      </div>
    </div>
  )
}
