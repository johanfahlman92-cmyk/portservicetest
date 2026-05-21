import { useState } from 'react'
import { Phone, AlertCircle, Wrench, Building2, User } from 'lucide-react'

function Toggle({ checked, onChange }) {
  return (
    <label className="toggle-switch">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <div className="toggle-track" />
      <div className="toggle-thumb" />
    </label>
  )
}

function NyKundForm({ onSpara }) {
  const [typ, setTyp] = useState(null)
  const [form, setForm] = useState({})
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div style={{ background: 'var(--c-bg)', borderRadius: 10, padding: 14, marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12 }}>Ny kund</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {[
          { id: 'foretag', label: 'Företag', icon: Building2 },
          { id: 'privat', label: 'Privatperson', icon: User },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTyp(id)} style={{
            flex: 1, padding: '10px 8px', borderRadius: 10,
            border: `1.5px solid ${typ === id ? 'var(--c-blue)' : 'var(--c-border)'}`,
            background: typ === id ? 'var(--c-blue-bg)' : 'var(--c-surface)',
            cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            color: typ === id ? 'var(--c-blue-text)' : 'var(--c-text2)',
          }}>
            <Icon size={20} />
            <span style={{ fontSize: 12, fontWeight: 500 }}>{label}</span>
          </button>
        ))}
      </div>

      {typ && (
        <>
          {typ === 'foretag' && (
            <div className="field-wrap">
              <div className="field-label">Företagsnamn <span className="field-req">*</span></div>
              <input type="text" placeholder="t.ex. Svensson Åkeri AB" onChange={e => upd('namn', e.target.value)} />
            </div>
          )}
          {typ === 'privat' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              <div className="field-wrap" style={{ margin: 0 }}>
                <div className="field-label">Förnamn <span className="field-req">*</span></div>
                <input type="text" onChange={e => upd('fornamn', e.target.value)} />
              </div>
              <div className="field-wrap" style={{ margin: 0 }}>
                <div className="field-label">Efternamn <span className="field-req">*</span></div>
                <input type="text" onChange={e => upd('efternamn', e.target.value)} />
              </div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <div className="field-wrap" style={{ margin: 0 }}>
              <div className="field-label">Telefon <span className="field-req">*</span></div>
              <input type="tel" placeholder="070-000 00 00" onChange={e => upd('telefon', e.target.value)} />
            </div>
            <div className="field-wrap" style={{ margin: 0 }}>
              <div className="field-label">E-post</div>
              <input type="email" onChange={e => upd('epost', e.target.value)} />
            </div>
          </div>
          <div className="field-wrap">
            <div className="field-label">Gatuadress <span className="field-req">*</span></div>
            <input type="text" onChange={e => upd('adress', e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <div className="field-wrap" style={{ margin: 0 }}>
              <div className="field-label">Postnummer</div>
              <input type="text" placeholder="123 45" />
            </div>
            <div className="field-wrap" style={{ margin: 0 }}>
              <div className="field-label">Ort</div>
              <input type="text" />
            </div>
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => onSpara({ ...form, typ })}>
            Spara kund & fortsätt
          </button>
        </>
      )}
    </div>
  )
}

function KontaktForm({ kunder, objekt }) {
  return (
    <div>
      <div className="field-wrap">
        <div className="field-label">Kund</div>
        <select><option>Välj kund…</option>{kunder.map(k => <option key={k.id}>{k.namn}</option>)}</select>
      </div>
      <div className="field-wrap">
        <div className="field-label">Berörd port (valfritt)</div>
        <select><option>Ingen specifik port</option>{objekt.map(o => <option key={o.id}>{o.namn}</option>)}</select>
      </div>
      <div className="field-wrap">
        <div className="field-label">Samtalslogg</div>
        <textarea placeholder="Vad frågade kunden? Vad lovades? Vem pratade du med?" />
      </div>
      <div className="field-wrap">
        <div className="field-label">Åtgärd</div>
        <select>
          <option>Informerade kunden – inget mer krävs</option>
          <option>Bokade återkoppling</option>
          <option>Uppgradera till felanmälan</option>
          <option>Uppgradera till planerad service</option>
        </select>
      </div>
      <button className="btn btn-primary" style={{ width: '100%', marginTop: 4 }}>Spara och stäng</button>
    </div>
  )
}

function FelForm({ kunder, objekt, onSparaArende }) {
  const [kundLage, setKundLage] = useState('befintlig')
  const [sokKund, setSokKund] = useState('')
  const [valdKund, setValdKund] = useState(null)
  const [valdObjekt, setValdObjekt] = useState('')
  const [feltyp, setFeltyp] = useState('Porten öppnar/stänger inte')
  const [beskrivning, setBeskrivning] = useState('')
  const [prioritet, setPrioritet] = useState('normal')
  const [sparad, setSparad] = useState(false)

  const filtKunder = kunder.filter(k => k.namn.toLowerCase().includes(sokKund.toLowerCase()))

  const skapa = () => {
    const idag = new Date().toISOString().slice(0, 10)
    const nr = idag.replace(/-/g, '').slice(2) + '-' + Math.floor(Math.random() * 90 + 10)
    const arende = {
      id: 'a' + Date.now(),
      nr,
      typ: 'felanmalan',
      namn: valdObjekt || 'Okänd port',
      kund: valdKund?.namn || 'Okänd kund',
      feltyp,
      beskrivning,
      kontakt: valdKund?.kontakt || '',
      datum: idag,
      status: 'ny',
      prioritet,
      tekniker: null,
      besok: null,
    }
    onSparaArende(arende)
    setSparad(true)
  }

  if (sparad) return (
    <div style={{ background: 'var(--c-teal-bg)', borderRadius: 10, padding: 16, textAlign: 'center' }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-teal-text)', marginBottom: 4 }}>Felanmälan skapad</div>
      <div style={{ fontSize: 12, color: 'var(--c-teal-text)' }}>Ärendet syns nu under Ärenden och kan bokas in i Kalender.</div>
    </div>
  )

  return (
    <div>
      <div className="divider">Kund</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {['befintlig', 'ny'].map(v => (
          <button key={v} onClick={() => setKundLage(v)} style={{
            padding: '4px 12px', fontSize: 12, borderRadius: 6,
            border: '1px solid var(--c-border)',
            background: kundLage === v ? 'var(--c-blue-bg)' : 'transparent',
            color: kundLage === v ? 'var(--c-blue-text)' : 'var(--c-text2)',
            cursor: 'pointer',
          }}>
            {v === 'befintlig' ? 'Befintlig kund' : '+ Ny kund'}
          </button>
        ))}
      </div>

      {kundLage === 'befintlig' && (
        !valdKund ? (
          <div>
            <input type="text" placeholder="Sök kundnamn…" value={sokKund}
              onChange={e => setSokKund(e.target.value)} style={{ marginBottom: 8 }} />
            {filtKunder.map(k => (
              <div key={k.id} onClick={() => setValdKund(k)} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 10px', background: 'var(--c-surface)',
                border: '1px solid var(--c-border)', borderRadius: 8, marginBottom: 6, cursor: 'pointer',
              }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{k.namn}</div>
                  <div style={{ fontSize: 11, color: 'var(--c-text2)' }}>{k.adress}, {k.ort} · {k.telefon}</div>
                </div>
                <span className="badge badge-gray">Välj</span>
              </div>
            ))}
            {filtKunder.length === 0 && sokKund && (
              <div style={{ fontSize: 12, color: 'var(--c-text3)', padding: '8px 0' }}>Inga kunder hittades.</div>
            )}
          </div>
        ) : (
          <div style={{ background: 'var(--c-teal-bg)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--c-teal-text)', fontWeight: 500 }}>✓ {valdKund.namn} · {valdKund.telefon}</span>
            <button onClick={() => setValdKund(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--c-teal-text)', textDecoration: 'underline' }}>Ändra</button>
          </div>
        )
      )}

      {kundLage === 'ny' && <NyKundForm onSpara={k => { setValdKund(k); setKundLage('befintlig') }} />}

      <div className="divider">Ärendedetaljer</div>
      <div className="field-wrap">
        <div className="field-label">Port (lämna tomt om okänt)</div>
        <select value={valdObjekt} onChange={e => setValdObjekt(e.target.value)}>
          <option value="">Okänd / ny port</option>
          {objekt.map(o => <option key={o.id}>{o.namn}</option>)}
        </select>
      </div>
      <div className="field-wrap">
        <div className="field-label">Feltyp</div>
        <select value={feltyp} onChange={e => setFeltyp(e.target.value)}>
          <option>Porten öppnar/stänger inte</option>
          <option>Porten fastnar</option>
          <option>Ovanliga ljud</option>
          <option>Fjärrkontroll fungerar inte</option>
          <option>Synlig skada</option>
          <option>Annat</option>
        </select>
      </div>
      <div className="field-wrap">
        <div className="field-label">Kundens beskrivning</div>
        <textarea value={beskrivning} onChange={e => setBeskrivning(e.target.value)}
          placeholder="Anteckna vad kunden berättar – teknikern läser detta innan besöket…" />
      </div>
      <div className="field-wrap">
        <div className="field-label">Prioritet</div>
        <select value={prioritet} onChange={e => setPrioritet(e.target.value)}>
          <option value="normal">Normal – inom 3 arbetsdagar</option>
          <option value="hog">Hög – säkerhetspåverkan</option>
          <option value="akut">Akut – porten helt blockerad</option>
        </select>
      </div>
      <button onClick={skapa} className="btn" style={{ width: '100%', background: 'var(--c-coral)', color: '#fff', borderColor: 'var(--c-coral)', marginTop: 4 }}>
        Skapa felanmälan
      </button>
    </div>
  )
}

function ServiceForm({ kunder, objekt }) {
  return (
    <div>
      <div className="field-wrap">
        <div className="field-label">Kund</div>
        <select><option>Välj kund…</option>{kunder.map(k => <option key={k.id}>{k.namn}</option>)}</select>
      </div>
      <div className="field-wrap">
        <div className="field-label">Port</div>
        <select><option>Välj port…</option>{objekt.map(o => <option key={o.id}>{o.namn}</option>)}</select>
      </div>
      <div className="field-wrap">
        <div className="field-label">Önskat datum</div>
        <input type="date" />
      </div>
      <div className="field-wrap">
        <div className="field-label">Anteckning till tekniker (valfritt)</div>
        <textarea placeholder="Eventuella önskemål från kunden…" />
      </div>
      <button className="btn btn-teal" style={{ width: '100%', marginTop: 4 }}>Skapa serviceärende</button>
    </div>
  )
}

const typer = [
  { id: 'kontakt', label: 'Kontakta kund', sub: 'Logga samtal – inget besök', icon: Phone, badge: 'badge-blue', badgeLabel: 'Internt' },
  { id: 'felanmalan', label: 'Felanmälan', sub: 'Tekniker åker ut', icon: AlertCircle, badge: 'badge-coral', badgeLabel: 'Utryckning' },
  { id: 'service', label: 'Planerad service', sub: 'Boka halvårsservice', icon: Wrench, badge: 'badge-teal', badgeLabel: 'Service' },
]

export default function NyttArende({ kunder = [], objekt = [], setArenden }) {
  const [vald, setVald] = useState(null)

  const sparaArende = (a) => setArenden(a)

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 2 }}>Nytt ärende</h1>
        <p style={{ color: 'var(--c-text2)', fontSize: 13 }}>Välj ärendetyp nedan</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: vald ? 16 : 0 }}>
        {typer.map(({ id, label, sub, icon: Icon, badge, badgeLabel }) => (
          <button key={id} onClick={() => setVald(vald === id ? null : id)} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '12px 16px', borderRadius: 12, width: '100%', textAlign: 'left',
            border: `${vald === id ? '2px' : '1px'} solid ${vald === id ? 'var(--c-blue)' : 'var(--c-border)'}`,
            background: vald === id ? 'var(--c-blue-bg)' : 'var(--c-surface)',
            cursor: 'pointer', transition: 'all 0.15s',
          }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--c-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={20} color="var(--c-text2)" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
              <div style={{ fontSize: 11, color: 'var(--c-text2)' }}>{sub}</div>
            </div>
            <span className={`badge ${badge}`}>{badgeLabel}</span>
          </button>
        ))}
      </div>

      {vald && (
        <div className="card" style={{ marginTop: 8 }}>
          {vald === 'kontakt' && <KontaktForm kunder={kunder} objekt={objekt} />}
          {vald === 'felanmalan' && <FelForm kunder={kunder} objekt={objekt} onSparaArende={sparaArende} />}
          {vald === 'service' && <ServiceForm kunder={kunder} objekt={objekt} />}
        </div>
      )}
    </div>
  )
}
