import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from './lib/supabase.js'
import Sidebar from './components/Sidebar.jsx'
import Login from './views/Login.jsx'
import Dashboard from './views/Dashboard.jsx'
import Portregister from './views/Portregister.jsx'
import Arenden from './views/Arenden.jsx'
import Protokoll from './views/Protokoll.jsx'
import Kalender from './views/Kalender.jsx'
import Kunder from './views/Kunder.jsx'
import NyttArende from './views/NyttArende.jsx'
import Felanmalan from './views/Felanmalan.jsx'
import TeknikerVy from './views/TeknikerVy.jsx'
import Montering from './views/Montering.jsx'
import Fastigheter from './views/Fastigheter.jsx'
import Statistik from './views/Statistik.jsx'
import Installningar from './views/Installningar.jsx'
import KundPortal from './views/KundPortal.jsx'
import { Menu, Search } from 'lucide-react'
import { protokollPunkter as defaultProtokollMallar } from './data/store.js'

// ── Datakonvertering ──────────────────────────────────────────────────────────
function dbToObjekt(row) {
  return {
    ...row,
    kundTyp:          row.kund_typ,
    intervallProcent: row.intervall_procent,
    dagerForsenad:    row.dager_forsenad,
    fastighetId:      row.fastighet_id ?? null,
  }
}
function objektToDB(obj) {
  const { kundTyp, intervallProcent, dagerForsenad, fastighetId, ...rest } = obj
  return {
    ...rest,
    kund_typ:          kundTyp          ?? 'foretag',
    intervall_procent: intervallProcent ?? 0,
    dager_forsenad:    dagerForsenad    ?? 0,
    fastighet_id:      fastighetId      ?? null,
  }
}

// ── CSV-export ────────────────────────────────────────────────────────────────
function exportCSV(headers, rows, filename) {
  const csv = [
    headers.join(';'),
    ...rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')),
  ].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function ToastContainer({ toasts, onRemove }) {
  if (!toasts.length) return null
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 999,
      display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
      {toasts.map(t => (
        <div key={t.id} onClick={() => onRemove(t.id)}
          style={{
            padding: '10px 16px', borderRadius: 9, fontSize: 13, fontWeight: 500,
            background: t.type === 'error'   ? '#3d1818'
                      : t.type === 'success' ? '#12302b'
                      : '#2a2925',
            color: t.type === 'error'   ? '#fca5a5'
                 : t.type === 'success' ? '#6ee7b7'
                 : '#e5e5e4',
            border: `1px solid ${
              t.type === 'error'   ? 'var(--c-red)'
            : t.type === 'success' ? 'var(--c-teal)'
            : 'var(--c-border)'}`,
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            cursor: 'pointer', maxWidth: 340, pointerEvents: 'auto',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
          {t.type === 'error' ? '✕' : '✓'} {t.msg}
        </div>
      ))}
    </div>
  )
}

// ── Global sökning ────────────────────────────────────────────────────────────
function GlobalSok({ objekt, kunder, fastigheter, arenden, onNavigera }) {
  const [text,   setText]   = useState('')
  const [öppen,  setÖppen]  = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setÖppen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const q = text.trim().toLowerCase()
  const resultat = q.length < 2 ? [] : [
    ...objekt.filter(o => !o.arkiverad && (
      o.namn?.toLowerCase().includes(q) || o.kund?.toLowerCase().includes(q) ||
      o.ordernummer?.toLowerCase().includes(q) || o.serienummer?.toLowerCase().includes(q)
    )).slice(0, 4).map(o => ({ typ: 'Port', id: o.id + 'p', namn: o.namn, sub: o.kund, page: 'register' })),
    ...fastigheter.filter(f => !f.arkiverad && (
      f.namn?.toLowerCase().includes(q) || f.kund?.toLowerCase().includes(q)
    )).slice(0, 3).map(f => ({ typ: 'Fastighet', id: f.id + 'f', namn: f.namn, sub: f.kund || f.adress, page: 'fastigheter' })),
    ...kunder.filter(k => k.namn?.toLowerCase().includes(q)).slice(0, 3)
      .map(k => ({ typ: 'Kund', id: k.id + 'k', namn: k.namn, sub: k.kontakt || k.ort, page: 'kunder' })),
    ...arenden.filter(a => a.status !== 'atgardad' && (
      a.namn?.toLowerCase().includes(q) || a.kund?.toLowerCase().includes(q)
    )).slice(0, 3).map(a => ({ typ: 'Ärende', id: a.id + 'a', namn: a.namn, sub: a.kund, page: 'arenden' })),
  ]

  const typFärg = { Port: 'var(--c-blue)', Fastighet: '#a78bfa', Kund: 'var(--c-teal)', Ärende: 'var(--c-red)' }

  return (
    <div ref={ref} style={{ position: 'relative', flex: 1, maxWidth: 380 }}>
      <div style={{ position: 'relative' }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text3)', pointerEvents: 'none' }} />
        <input
          type="text"
          placeholder="Global sökning…"
          value={text}
          onChange={e => { setText(e.target.value); setÖppen(true) }}
          onFocus={() => setÖppen(true)}
          style={{ width: '100%', padding: '7px 10px 7px 32px', fontSize: 13,
            border: '1px solid var(--c-border)', borderRadius: 8,
            background: 'var(--c-surface)', color: 'var(--c-text)', boxSizing: 'border-box' }}
        />
      </div>
      {öppen && resultat.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, marginTop: 4,
          background: 'var(--c-surface)', border: '1px solid var(--c-border)',
          borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', overflow: 'hidden',
        }}>
          {resultat.map((r, i) => (
            <div
              key={r.id}
              onClick={() => { onNavigera(r.page); setText(''); setÖppen(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', cursor: 'pointer',
                borderBottom: i < resultat.length - 1 ? '1px solid var(--c-border)' : 'none',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--c-bg)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{
                fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 600, flexShrink: 0,
                background: typFärg[r.typ] + '22', color: typFärg[r.typ],
              }}>{r.typ}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.namn}</div>
                {r.sub && <div style={{ fontSize: 11, color: 'var(--c-text2)' }}>{r.sub}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Mobil-breakpoint ──────────────────────────────────────────────────────────
function useErMobil() {
  const [erMobil, setErMobil] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const fn = () => setErMobil(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return erMobil
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const erMobil = useErMobil()
  const [page, setPage]               = useState('dashboard')
  const [user, setUser]               = useState(null)
  const [authLaddas, setAuthLaddas]   = useState(true)
  const [sidomenyÖppen, setSidomenyÖppen] = useState(() => window.innerWidth >= 768)

  const [kunder,        setKunder]        = useState([])
  const [objekt,        setObjekt]        = useState([])
  const [fastigheter,   setFastigheter]   = useState([])
  const [arenden,       setArenden]       = useState([])
  const [tekniker,      setTekniker]      = useState([])
  const [bokningar,     setBokningar]     = useState({})
  const [aktivitetslogg,  setAktivitetslogg]  = useState([])
  const [protokollMallar, setProtokollMallar] = useState(defaultProtokollMallar)

  // Toast-system
  const [toasts, setToasts] = useState([])
  const toast = useCallback((msg, type = 'info', ms = 4000) => {
    const id = Date.now() + Math.random()
    setToasts(p => [...p, { id, msg, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), ms)
  }, [])
  const removeToast = useCallback((id) => setToasts(p => p.filter(t => t.id !== id)), [])

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLaddas(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Kontrollera om nyinloggad saknar roll → kolla inbjudningstabell
  useEffect(() => {
    if (!user) return
    if (user.user_metadata?.roll) return  // Redan har roll, hoppa över
    async function kollaInbjudan() {
      const { data } = await supabase
        .from('brukar_inbjudningar')
        .select('*')
        .eq('email', user.email)
        .maybeSingle()
      if (!data) return
      // Sätt roll från inbjudan
      await supabase.auth.updateUser({
        data: {
          roll:      data.roll,
          kund_id:   data.kund_id   || null,
          kund_namn: data.kund_namn || '',
        },
      })
      // Radera inbjudan (används bara en gång)
      await supabase.from('brukar_inbjudningar').delete().eq('id', data.id)
      // Uppdatera user-objektet med ny metadata
      const { data: { user: refreshed } } = await supabase.auth.getUser()
      if (refreshed) setUser(refreshed)
    }
    kollaInbjudan()
  }, [user?.id])  // Kör bara när user.id förändras (ny inloggning)

  // Stäng sidebar automatiskt på mobil
  useEffect(() => {
    if (erMobil) setSidomenyÖppen(false)
    else setSidomenyÖppen(true)
  }, [erMobil])

  // Ladda data när inloggad
  useEffect(() => {
    if (!user) return
    async function ladda() {
      const [k, o, f, a, t, b, al, cfg] = await Promise.all([
        supabase.from('kunder').select('*').order('created_at'),
        supabase.from('objekt').select('*').order('created_at'),
        supabase.from('fastigheter').select('*').order('created_at'),
        supabase.from('arenden').select('*').order('created_at'),
        supabase.from('tekniker').select('namn').order('namn'),
        supabase.from('bokningar').select('*').order('created_at'),
        supabase.from('aktivitetslogg').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('app_config').select('data').eq('id', 'protokoll_mallar').maybeSingle(),
      ])
      if (k.data) setKunder(k.data)
      if (o.data) setObjekt(o.data.map(dbToObjekt))
      if (f.data) setFastigheter(f.data)
      if (a.data) setArenden(a.data)
      if (t.data) setTekniker(t.data.map(x => x.namn))
      if (al.data)  setAktivitetslogg(al.data)
      if (cfg.data) setProtokollMallar(cfg.data.data)
      if (b.data) {
        const grouped = {}
        for (const row of b.data) {
          if (!grouped[row.datum]) grouped[row.datum] = []
          grouped[row.datum].push({ supabaseId: row.id, tid: row.tid, typ: row.typ, namn: row.namn, kund: row.kund, tek: row.tek, arendeId: row.arende_id })
        }
        setBokningar(grouped)
      }
    }
    ladda()
  }, [user])

  const loggaUt = () => supabase.auth.signOut()

  // ── Aktivitetslogg ────────────────────────────────────────────────────────
  const loggAktivitet = useCallback(async (typ, entitetTyp, entitetId, entitetNamn, beskrivning) => {
    try {
      const { data } = await supabase.from('aktivitetslogg').insert({
        typ, entitet_typ: entitetTyp, entitet_id: String(entitetId || ''),
        entitet_namn: entitetNamn, beskrivning,
      }).select().single()
      if (data) setAktivitetslogg(prev => [data, ...prev].slice(0, 100))
    } catch { /* aktivitetslogg är icke-kritisk */ }
  }, [])

  // ── Datamutationer ────────────────────────────────────────────────────────
  const laggTillKund = async (ny) => {
    try {
      const { data, error } = await supabase.from('kunder').insert(ny).select().single()
      if (error) throw error
      if (data) setKunder(prev => [...prev, data])
    } catch (err) { toast('Kunde inte spara kund: ' + err.message, 'error') }
  }

  const snabbLaggTillKund = async (namn) => {
    try {
      const { data, error } = await supabase.from('kunder').insert({
        namn, typ: 'foretag', kontakt: '', telefon: '', epost: '', adress: '', ort: '',
      }).select().single()
      if (error) throw error
      if (data) setKunder(prev => [...prev, data])
    } catch (err) { toast('Kunde inte lägga till kund: ' + err.message, 'error') }
  }

  const laggTillObjekt = async (nytt) => {
    try {
      const { data, error } = await supabase.from('objekt').insert(objektToDB(nytt)).select().single()
      if (error) throw error
      if (data) {
        setObjekt(prev => [...prev, dbToObjekt(data)])
        loggAktivitet('port_skapad', 'objekt', data.id, data.namn, `Ny port skapad: ${data.namn}`)
      }
    } catch (err) { toast('Kunde inte spara port: ' + err.message, 'error') }
  }

  const uppdateraObjekt = async (id, changes) => {
    const dbChanges = {}
    for (const [k, v] of Object.entries(changes)) {
      if (k === 'kundTyp')          dbChanges['kund_typ'] = v
      else if (k === 'intervallProcent') dbChanges['intervall_procent'] = v
      else if (k === 'dagerForsenad')    dbChanges['dager_forsenad'] = v
      else if (k === 'fastighetId')      dbChanges['fastighet_id'] = v
      else dbChanges[k] = v
    }
    try {
      const { data, error } = await supabase.from('objekt').update(dbChanges).eq('id', id).select().single()
      if (error) throw error
      if (data) setObjekt(prev => prev.map(o => o.id === id ? dbToObjekt(data) : o))
    } catch (err) { toast('Kunde inte uppdatera port: ' + err.message, 'error') }
  }

  const taBortObjekt = async (id) => {
    try {
      const { error } = await supabase.from('objekt').delete().eq('id', id)
      if (error) throw error
      setObjekt(prev => prev.filter(o => o.id !== id))
    } catch (err) { toast('Kunde inte ta bort port: ' + err.message, 'error') }
  }

  const laggTillFastighet = async (ny) => {
    try {
      const { data, error } = await supabase.from('fastigheter').insert(ny).select().single()
      if (error) throw error
      if (data) setFastigheter(prev => [...prev, data])
    } catch (err) { toast('Kunde inte spara fastighet: ' + err.message, 'error') }
  }

  const taBortFastighet = async (id) => {
    try {
      const { error } = await supabase.from('fastigheter').delete().eq('id', id)
      if (error) throw error
      setFastigheter(prev => prev.filter(f => f.id !== id))
    } catch (err) { toast('Kunde inte ta bort fastighet: ' + err.message, 'error') }
  }

  const uppdateraFastighet = async (id, changes) => {
    try {
      const { data, error } = await supabase.from('fastigheter').update(changes).eq('id', id).select().single()
      if (error) throw error
      if (data) setFastigheter(prev => prev.map(f => f.id === id ? data : f))
    } catch (err) { toast('Kunde inte uppdatera fastighet: ' + err.message, 'error') }
  }

  const laggTillArende = async (nytt) => {
    try {
      const { data, error } = await supabase.from('arenden').insert(nytt).select().single()
      if (error) throw error
      if (data) {
        setArenden(prev => [...prev, data])
        loggAktivitet('arende_skapat', 'arende', data.id, data.namn, `Nytt ärende: ${data.namn} (${data.kund})`)
      }
    } catch (err) { toast('Kunde inte spara ärende: ' + err.message, 'error') }
  }

  const uppdateraArende = async (id, changes) => {
    try {
      const { data, error } = await supabase.from('arenden').update(changes).eq('id', id).select().single()
      if (error) throw error
      if (data) {
        setArenden(prev => prev.map(a => a.id === id ? data : a))
        if (changes.status === 'atgardad') {
          loggAktivitet('arende_stangd', 'arende', id, data.namn, `Ärende stängt: ${data.namn}`)
        }
      }
    } catch (err) { toast('Kunde inte uppdatera ärende: ' + err.message, 'error') }
  }

  const uppdateraKund = async (id, changes) => {
    try {
      const { data, error } = await supabase.from('kunder').update(changes).eq('id', id).select().single()
      if (error) throw error
      if (data) setKunder(prev => prev.map(k => k.id === id ? data : k))
    } catch (err) { toast('Kunde inte uppdatera kund: ' + err.message, 'error') }
  }

  const taBortKund = async (id) => {
    try {
      const { error } = await supabase.from('kunder').delete().eq('id', id)
      if (error) throw error
      setKunder(prev => prev.filter(k => k.id !== id))
    } catch (err) { toast('Kunde inte ta bort kund: ' + err.message, 'error') }
  }

  const laggTillTekniker = async (namn) => {
    await supabase.from('tekniker').upsert({ namn }, { onConflict: 'namn' })
    setTekniker(prev => [...prev, namn])
  }

  const taBortTekniker = async (namn) => {
    await supabase.from('tekniker').delete().eq('namn', namn)
    setTekniker(prev => prev.filter(t => t !== namn))
  }

  const laggTillBokning = async (datum, bokning) => {
    try {
      const { data, error } = await supabase.from('bokningar').insert({
        datum, tid: bokning.tid, typ: bokning.typ, namn: bokning.namn,
        kund: bokning.kund, tek: bokning.tek, arende_id: bokning.arendeId || null,
      }).select().single()
      if (error) throw error
      if (data) setBokningar(prev => ({ ...prev, [datum]: [...(prev[datum] || []), { ...bokning, supabaseId: data.id }] }))
    } catch (err) { toast('Kunde inte spara bokning: ' + err.message, 'error') }
  }

  const taBortBokning = async (datum, index) => {
    const b = bokningar[datum]?.[index]
    if (b?.supabaseId) await supabase.from('bokningar').delete().eq('id', b.supabaseId)
    setBokningar(prev => ({ ...prev, [datum]: prev[datum].filter((_, i) => i !== index) }))
  }

  // ── CSV-export-funktioner ─────────────────────────────────────────────────
  const exportPortarCSV = () => exportCSV(
    ['Namn', 'Kund', 'Fastighet', 'Typ', 'Fabrikat', 'Installationsår', 'Ordernummer', 'Serienummer', 'Senaste service', 'Nästa service', 'Status'],
    objekt.filter(o => !o.arkiverad).map(o => [o.namn, o.kund, o.plats, o.typ, o.fabrikat, o.ar, o.ordernummer, o.serienummer, o.senaste, o.nasta, o.status]),
    'portar.csv',
  )
  const exportKunderCSV = () => exportCSV(
    ['Namn', 'Typ', 'Kontakt', 'Telefon', 'E-post', 'Adress', 'Ort'],
    kunder.map(k => [k.namn, k.typ, k.kontakt, k.telefon, k.epost, k.adress, k.ort]),
    'kunder.csv',
  )
  const exportArendenCSV = () => exportCSV(
    ['Nr', 'Namn', 'Kund', 'Feltyp', 'Prioritet', 'Status', 'Tekniker', 'Datum', 'Planerat besök'],
    arenden.map(a => [a.nr, a.namn, a.kund, a.feltyp, a.prioritet, a.status, a.tekniker, a.datum, a.besok]),
    'arenden.csv',
  )
  const exportFastigheterCSV = () => exportCSV(
    ['Namn', 'Adress', 'Kund', 'Antal portar'],
    fastigheter.filter(f => !f.arkiverad).map(f => [
      f.namn, f.adress, f.kund,
      objekt.filter(o => (o.fastighetId === f.id || (!o.fastighetId && o.plats === f.namn)) && !o.arkiverad).length,
    ]),
    'fastigheter.csv',
  )

  const sparaProtokollMallar = async (mallar) => {
    setProtokollMallar(mallar)
    await supabase.from('app_config').upsert({ id: 'protokoll_mallar', data: mallar, uppdaterad: new Date().toISOString() })
  }

  const navigera = (p) => {
    setPage(p)
    if (erMobil) setSidomenyÖppen(false)
  }

  // Laddning
  if (authLaddas) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1917' }}>
      <div style={{ color: '#9a9890', fontSize: 14 }}>Laddar…</div>
    </div>
  )

  // Inloggning
  if (!user) return <Login />

  // Rollbaserad routing
  const roll = user.user_metadata?.roll

  if (roll === 'kontorist') return (
    <Felanmalan
      kunder={kunder}
      objekt={objekt}
      onSparaArende={laggTillArende}
      onLoggaUt={loggaUt}
    />
  )

  if (roll === 'kund') return (
    <KundPortal user={user} onLoggaUt={loggaUt} />
  )

  const oppnaArenden = arenden.filter(a => a.status !== 'atgardad').length

  const views = {
    dashboard:   () => <Dashboard kunder={kunder} objekt={objekt} arenden={arenden} bokningar={bokningar} onNavigera={navigera} onSparaArende={laggTillArende} />,
    fastigheter: () => <Fastigheter fastigheter={fastigheter} objekt={objekt} kunder={kunder} onLaggTill={laggTillFastighet} onTaBort={taBortFastighet} onUppdatera={uppdateraFastighet} onNyKund={snabbLaggTillKund} onUppdateraObjekt={uppdateraObjekt} />,
    register:    () => <Portregister objekt={objekt} kunder={kunder} fastigheter={fastigheter} tekniker={tekniker} onLaggTill={laggTillObjekt} onUppdateraObjekt={uppdateraObjekt} onTaBortObjekt={taBortObjekt} onLaggTillBokning={laggTillBokning} />,
    arenden:     () => <Arenden arenden={arenden} tekniker={tekniker} kunder={kunder} objekt={objekt} onUppdatera={uppdateraArende} onUppdateraObjekt={uppdateraObjekt} onLaggTill={laggTillArende} onLoggAktivitet={loggAktivitet} />,
    protokoll:   () => <Protokoll objekt={objekt} tekniker={tekniker} protokollMallar={protokollMallar} onUppdateraObjekt={uppdateraObjekt} onLaggTillBokning={laggTillBokning} onLoggAktivitet={loggAktivitet} />,
    kalender:    () => <Kalender arenden={arenden} tekniker={tekniker} bokningar={bokningar} kunder={kunder} onLaggTillTekniker={laggTillTekniker} onTaBortTekniker={taBortTekniker} onLaggTillBokning={laggTillBokning} onTaBortBokning={taBortBokning} onNyKund={snabbLaggTillKund} />,
    kunder:      () => <Kunder kunder={kunder} fastigheter={fastigheter} objekt={objekt} arenden={arenden} onLaggTill={laggTillKund} onUppdatera={uppdateraKund} onTaBort={taBortKund} />,
    'nytt-arende': () => { navigera('arenden'); return null },
    montering:   () => <Montering objekt={objekt} tekniker={tekniker} kunder={kunder} onUppdateraObjekt={uppdateraObjekt} onLaggTillObjekt={laggTillObjekt} onNyKund={snabbLaggTillKund} />,
    statistik:     () => <Statistik kunder={kunder} objekt={objekt} fastigheter={fastigheter} arenden={arenden} aktivitetslogg={aktivitetslogg} onExportKunder={exportKunderCSV} onExportPortar={exportPortarCSV} onExportArenden={exportArendenCSV} onExportFastigheter={exportFastigheterCSV} />,
    installningar: () => roll === 'admin' ? <Installningar kunder={kunder} protokollMallar={protokollMallar} onSparaProtokollMallar={sparaProtokollMallar} /> : null,
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>

      {/* Bakgrund-overlay på mobil när menyn är öppen */}
      {erMobil && sidomenyÖppen && (
        <div onClick={() => setSidomenyÖppen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 49 }} />
      )}

      <Sidebar
        active={page}
        onNav={navigera}
        oppnaArenden={oppnaArenden}
        öppen={sidomenyÖppen}
        erMobil={erMobil}
        onToggle={() => setSidomenyÖppen(o => !o)}
        onLoggaUt={loggaUt}
        epost={user.email}
        roll={roll}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* Topbar (mobil) */}
        {erMobil && (
          <div style={{
            height: 52, flexShrink: 0, background: '#1a1917',
            display: 'flex', alignItems: 'center',
            padding: '0 16px', gap: 12,
          }}>
            <button onClick={() => setSidomenyÖppen(true)} style={{
              background: 'none', border: 'none', color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', padding: 4,
            }}>
              <Menu size={22} />
            </button>
            <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>NMV Portservice</span>
            {oppnaArenden > 0 && (
              <span style={{ marginLeft: 'auto', background: '#A32D2D', color: '#fff', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10 }}>
                {oppnaArenden} ärenden
              </span>
            )}
          </div>
        )}

        {/* Sökrad */}
        <div style={{
          padding: erMobil ? '8px 16px' : '10px 32px',
          background: erMobil ? '#1a1917' : 'var(--c-surface)',
          borderBottom: '1px solid var(--c-border)',
          flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <GlobalSok
            objekt={objekt}
            kunder={kunder}
            fastigheter={fastigheter}
            arenden={arenden}
            onNavigera={navigera}
          />
        </div>

        <main style={{
          flex: 1,
          padding: erMobil ? '16px' : '28px 32px',
          overflowY: 'auto',
          maxWidth: erMobil ? '100%' : 900,
          width: '100%',
        }}>
          {(views[page] || views.dashboard)()}
        </main>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
