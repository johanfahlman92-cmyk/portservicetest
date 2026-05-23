import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { supabase } from './lib/supabase.js'
import Sidebar from './components/Sidebar.jsx'
import Login from './views/Login.jsx'
import Dashboard from './views/Dashboard.jsx'
import Portregister from './views/Portregister.jsx'
import Arenden from './views/Arenden.jsx'
import Kalender from './views/Kalender.jsx'
import Kunder from './views/Kunder.jsx'
import Felanmalan from './views/Felanmalan.jsx'
import TeknikerVy from './views/TeknikerVy.jsx'
import Montering from './views/Montering.jsx'
import Montageplanering from './views/Montageplanering.jsx'
import Planeringstavla from './views/Planeringstavla.jsx'
import Fastigheter from './views/Fastigheter.jsx'
import Statistik from './views/Statistik.jsx'
import Installningar from './views/Installningar.jsx'
import KundPortal from './views/KundPortal.jsx'
import Serviceorder from './views/Serviceorder.jsx'
import { Menu, Search } from 'lucide-react'
import { protokollPunkter as defaultProtokollMallar, monteringPunkter as defaultMontagemallar } from './data/store.js'
import { setCompanyConfig } from './utils/pdf.js'

// ── Datakonvertering ──────────────────────────────────────────────────────────
function dbToObjekt(row) {
  return {
    ...row,
    kundTyp:          row.kund_typ,
    intervallProcent: row.intervall_procent,
    dagerForsenad:    row.dager_forsenad,
    fastighetId:      row.fastighet_id ?? null,
    serviceIntervall: row.service_intervall ?? 12,
  }
}
function objektToDB(obj) {
  const { kundTyp, intervallProcent, dagerForsenad, fastighetId, serviceIntervall, ...rest } = obj
  return {
    ...rest,
    kund_typ:          kundTyp          ?? 'foretag',
    intervall_procent: intervallProcent ?? 0,
    dager_forsenad:    dagerForsenad    ?? 0,
    fastighet_id:      fastighetId      ?? null,
    service_intervall: serviceIntervall ?? 12,
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
  // Hash-navigation: läs startsida från URL:en (t.ex. #arenden → 'arenden')
  const getHashPage = () => window.location.hash.slice(1) || 'dashboard'
  const [page, setPage]               = useState(getHashPage)
  const [user, setUser]               = useState(null)
  const [authLaddas, setAuthLaddas]   = useState(true)
  const [sidomenyÖppen, setSidomenyÖppen] = useState(() => window.innerWidth >= 768)

  const [kunder,        setKunder]        = useState([])
  const [objekt,        setObjekt]        = useState([])
  const [fastigheter,   setFastigheter]   = useState([])
  const [arenden,       setArenden]       = useState([])
  const [tekniker,      setTekniker]      = useState([])
  const [bokningar,     setBokningar]     = useState({})
  const [montageorder,  setMontageorder]  = useState([])
  const [serviceorderArr, setServiceorderArr] = useState([])
  const [aktivitetslogg,  setAktivitetslogg]  = useState([])
  const [protokollMallar, setProtokollMallar] = useState(defaultProtokollMallar)
  const [montagemallar,   setMontagemallar]   = useState(defaultMontagemallar)
  const [foretagConfig,   setForetagConfig]   = useState({})

  // ── Automatisk statusberäkning per port ───────────────────────────────────
  const objektMedStatus = useMemo(() => {
    const idag  = new Date().toISOString().slice(0, 10)
    const om30  = new Date(); om30.setDate(om30.getDate() + 30)
    const om30d = om30.toISOString().slice(0, 10)
    return objekt.map(obj => {
      if (obj.arkiverad) return obj
      // 1. Öppet ärende kopplat till porten → 'arende'
      const harÖppetArende = arenden.some(a =>
        !a.arkiverad &&
        a.status !== 'atgardad' &&
        (a.objekt_id ? a.objekt_id === obj.id : (a.namn === obj.namn && a.kund === obj.kund))
      )
      if (harÖppetArende) return { ...obj, status: 'arende' }
      // 2. Datumbaserad status utifrån nästa servicedatum
      if (obj.nasta) {
        if (obj.nasta < idag)       return { ...obj, status: 'forsenad' }
        if (obj.nasta <= om30d)     return { ...obj, status: 'snart' }
        return { ...obj, status: 'ok' }
      }
      // 3. Inget servicedatum inlagt än
      if (!obj.senaste) return { ...obj, status: 'ny' }
      return { ...obj, status: 'ok' }
    })
  }, [objekt, arenden])

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
      try {
        const [k, o, f, a, t, b, al, cfg, montCfg, foretagCfg] = await Promise.all([
          supabase.from('kunder').select('*').order('created_at'),
          supabase.from('objekt').select('*').order('created_at'),
          supabase.from('fastigheter').select('*').order('created_at'),
          supabase.from('arenden').select('*').order('created_at'),
          supabase.from('tekniker').select('namn').order('namn'),
          supabase.from('bokningar').select('*').order('created_at'),
          supabase.from('aktivitetslogg').select('*').order('created_at', { ascending: false }).limit(100),
          supabase.from('app_config').select('data').eq('id', 'protokoll_mallar').maybeSingle(),
          supabase.from('app_config').select('data').eq('id', 'montage_mallar').maybeSingle(),
          supabase.from('app_config').select('data').eq('id', 'foretag').maybeSingle(),
        ])
        if (k.data) setKunder(k.data)
        if (o.data) setObjekt(o.data.map(dbToObjekt))
        if (f.data) setFastigheter(f.data)
        if (a.data) setArenden(a.data)
        if (t.data) setTekniker(t.data.map(x => x.namn))
        if (al.data)  setAktivitetslogg(al.data)
        if (cfg.data)        setProtokollMallar(cfg.data.data)
        if (montCfg.data)    setMontagemallar(montCfg.data.data)
        if (foretagCfg.data) { const fc = foretagCfg.data.data || {}; setForetagConfig(fc); setCompanyConfig(fc) }
        if (b.data) {
          const grouped = {}
          for (const row of b.data) {
            if (!grouped[row.datum]) grouped[row.datum] = []
            let tek = []
            try { tek = row.tek ? JSON.parse(row.tek) : [] } catch { tek = row.tek ? [row.tek] : [] }
            grouped[row.datum].push({ supabaseId: row.id, tid: row.tid, typ: row.typ, namn: row.namn, kund: row.kund, tek, arendeId: row.arende_id })
          }
          setBokningar(grouped)
        }
      } catch (err) {
        console.error('Fel vid dataladdning:', err)
      }

      // Montageorder laddas separat — tabellen kanske inte finns ännu
      try {
        const { data, error } = await supabase.from('montageorder').select('*').order('created_at')
        if (!error && data) setMontageorder(data)
      } catch { /* tabellen finns inte ännu — ignorera */ }

      // Serviceorder
      try {
        const { data, error } = await supabase.from('serviceorder').select('*').order('created_at')
        if (!error && data) setServiceorderArr(data.map(r => ({
          ...r,
          objekt_ids: r.objekt_ids || [],
          protokoll:  r.protokoll  || {},
        })))
      } catch { /* tabellen finns inte ännu — ignorera */ }
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
      return true
    } catch (err) { toast('Kunde inte spara kund: ' + err.message, 'error'); return false }
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
      // Strippa det lokala temporär-id:t (t.ex. 'p' + Date.now()) – Supabase genererar riktigt UUID
      const { id: _tempId, ...dbPayload } = objektToDB(nytt)
      const { data, error } = await supabase.from('objekt').insert(dbPayload).select().single()
      if (error) throw error
      if (data) {
        setObjekt(prev => [...prev, dbToObjekt(data)])
        loggAktivitet('port_skapad', 'objekt', data.id, data.namn, `Ny port skapad: ${data.namn}`)
        return dbToObjekt(data)
      }
    } catch (err) { toast('Kunde inte spara port: ' + err.message, 'error') }
    return null
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

  // Validerar att ett värde är ett riktigt UUID – ej lokalt temp-id som 'p...' eller 'a...'
  const isUUID = (v) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)

  const laggTillArende = async (nytt) => {
    try {
      // Strippa lokalt temp-id och rensa objekt_id om det inte är ett riktigt UUID
      const { id: _tempId, ...payload } = nytt
      if (payload.objekt_id && !isUUID(payload.objekt_id)) payload.objekt_id = null
      const { data, error } = await supabase.from('arenden').insert(payload).select().single()
      if (error) throw error
      if (data) {
        setArenden(prev => [...prev, data])
        loggAktivitet('arende_skapat', 'arende', data.id, data.namn, `Nytt ärende: ${data.namn} (${data.kund})`)
        return data
      }
    } catch (err) { toast('Kunde inte spara ärende: ' + err.message, 'error') }
    return null
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
      const tekArr = Array.isArray(bokning.tek) ? bokning.tek : (bokning.tek ? [bokning.tek] : [])
      const { data, error } = await supabase.from('bokningar').insert({
        datum, tid: bokning.tid, typ: bokning.typ, namn: bokning.namn,
        kund: bokning.kund, tek: tekArr.length > 0 ? JSON.stringify(tekArr) : null,
        arende_id: bokning.arendeId || null,
      }).select().single()
      if (error) throw error
      if (data) {
        const tekArr = Array.isArray(bokning.tek) ? bokning.tek : (bokning.tek ? [bokning.tek] : [])
        setBokningar(prev => ({ ...prev, [datum]: [...(prev[datum] || []), { ...bokning, tek: tekArr, supabaseId: data.id }] }))
      }
    } catch (err) { toast('Kunde inte spara bokning: ' + err.message, 'error') }
  }

  const taBortBokning = async (datum, index) => {
    const b = bokningar[datum]?.[index]
    if (b?.supabaseId) await supabase.from('bokningar').delete().eq('id', b.supabaseId)
    setBokningar(prev => ({ ...prev, [datum]: prev[datum].filter((_, i) => i !== index) }))
  }

  // ── Montageorder CRUD ─────────────────────────────────────────────────────
  const laggTillMontageorder = async (ny) => {
    try {
      const { data, error } = await supabase.from('montageorder').insert(ny).select().single()
      if (error) {
        if (error.message?.includes('does not exist') || error.code === '42P01') {
          toast('Tabellen montageorder saknas i Supabase — kör SQL-scriptet under Inställningar', 'error', 8000)
        } else {
          toast('Kunde inte spara montageorder: ' + error.message, 'error')
        }
        return
      }
      if (data) { setMontageorder(prev => [...prev, data]); return data }
    } catch (err) { toast('Kunde inte spara montageorder: ' + err.message, 'error') }
    return null
  }

  const uppdateraMontageorder = async (id, changes) => {
    try {
      const { data, error } = await supabase.from('montageorder').update(changes).eq('id', id).select().single()
      if (error) throw error
      if (data) setMontageorder(prev => prev.map(m => m.id === id ? data : m))
    } catch (err) { toast('Kunde inte uppdatera montageorder: ' + err.message, 'error') }
  }

  // ── Serviceorder CRUD ────────────────────────────────────────────────────
  const laggTillServiceorder = async (ny) => {
    try {
      const { data, error } = await supabase.from('serviceorder').insert(ny).select().single()
      if (error) {
        if (error.message?.includes('does not exist') || error.code === '42P01') {
          toast('Tabellen serviceorder saknas – kör SQL-scriptet under Inställningar', 'error', 8000)
        } else {
          toast('Kunde inte spara serviceorder: ' + error.message, 'error')
        }
        return
      }
      if (data) setServiceorderArr(prev => [...prev, { ...data, objekt_ids: data.objekt_ids || [], protokoll: data.protokoll || {} }])
    } catch (err) { toast('Kunde inte spara serviceorder: ' + err.message, 'error') }
  }

  const uppdateraServiceorder = async (id, changes) => {
    try {
      const { data, error } = await supabase.from('serviceorder').update(changes).eq('id', id).select().single()
      if (error) throw error
      if (data) setServiceorderArr(prev => prev.map(o => o.id === id ? { ...data, objekt_ids: data.objekt_ids || [], protokoll: data.protokoll || {} } : o))
    } catch (err) { toast('Kunde inte uppdatera serviceorder: ' + err.message, 'error') }
  }

  const taBortServiceorder = async (id) => {
    try {
      const { error } = await supabase.from('serviceorder').delete().eq('id', id)
      if (error) throw error
      setServiceorderArr(prev => prev.filter(o => o.id !== id))
    } catch (err) { toast('Kunde inte ta bort serviceorder: ' + err.message, 'error') }
  }

  const taBortMontageorder = async (id) => {
    try {
      const { error } = await supabase.from('montageorder').delete().eq('id', id)
      if (error) throw error
      setMontageorder(prev => prev.filter(m => m.id !== id))
    } catch (err) { toast('Kunde inte ta bort montageorder: ' + err.message, 'error') }
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

  const sparaMontagemallar = async (mallar) => {
    setMontagemallar(mallar)
    await supabase.from('app_config').upsert({ id: 'montage_mallar', data: mallar, uppdaterad: new Date().toISOString() })
  }

  const sparaForetagConfig = async (cfg) => {
    setForetagConfig(cfg)
    setCompanyConfig(cfg)
    await supabase.from('app_config').upsert({ id: 'foretag', data: cfg, uppdaterad: new Date().toISOString() })
  }

  // Lyssna på bakåt/framåt-knappen i webbläsaren
  useEffect(() => {
    const onHashChange = () => setPage(getHashPage())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigera = (p) => {
    window.location.hash = p   // uppdaterar URL → triggar hashchange → setPage
    if (erMobil) setSidomenyÖppen(false)
  }

  const [valArende, setValArende] = useState(null)
  const navigeraArende = (id) => {
    setValArende(id)
    navigera('arenden')
  }

  const [valObjekt, setValObjekt] = useState(null)
  const navigeraObjekt = (id) => {
    setValObjekt(id)
    navigera('register')
  }

  const [prefilladPort, setPrefilladPort] = useState(null)
  const navigeraFelanmalan = (portObj) => {
    setPrefilladPort(portObj)
    navigera('arenden')
  }

  const [förifylldMontageorder, setFörifylldMontageorder] = useState(null)
  const navigeraMontering = (order) => {
    setFörifylldMontageorder(order)
    navigera('montering')
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
      onNyKund={laggTillKund}
    />
  )

  if (roll === 'kund') return (
    <KundPortal user={user} onLoggaUt={loggaUt} />
  )

  if (roll === 'tekniker') return (
    <TeknikerVy
      namn={user.user_metadata?.namn || user.email || ''}
      arenden={arenden}
      bokningar={bokningar}
      objekt={objektMedStatus}
      tekniker={tekniker}
      onUppdateraArende={uppdateraArende}
      onUppdateraObjekt={uppdateraObjekt}
      onLoggaUt={loggaUt}
    />
  )

  const oppnaArenden = arenden.filter(a => a.status !== 'atgardad').length

  const views = {
    dashboard:   () => <Dashboard kunder={kunder} objekt={objektMedStatus} arenden={arenden} bokningar={bokningar} montageorder={montageorder} onNavigera={navigera} onNavigeraArende={navigeraArende} onSparaArende={laggTillArende} />,
    fastigheter: () => <Fastigheter fastigheter={fastigheter} objekt={objektMedStatus} kunder={kunder} onLaggTill={laggTillFastighet} onTaBort={taBortFastighet} onUppdatera={uppdateraFastighet} onNyKund={snabbLaggTillKund} onUppdateraObjekt={uppdateraObjekt} />,
    register:    () => <Portregister objekt={objektMedStatus} kunder={kunder} fastigheter={fastigheter} tekniker={tekniker} montageorder={montageorder} arenden={arenden} onLaggTill={laggTillObjekt} onUppdateraObjekt={uppdateraObjekt} onTaBortObjekt={taBortObjekt} onLaggTillBokning={laggTillBokning} onLaggTillArende={laggTillArende} onNavigeraArende={navigeraArende} initialObjektId={valObjekt} onInitialObjektHandled={() => setValObjekt(null)} onNyArende={navigeraFelanmalan} />,
    arenden:     () => <Arenden arenden={arenden} tekniker={tekniker} kunder={kunder} objekt={objektMedStatus} protokollMallar={protokollMallar} bokningar={bokningar} onUppdatera={uppdateraArende} onUppdateraObjekt={uppdateraObjekt} onLaggTill={laggTillArende} onLaggTillBokning={laggTillBokning} onTaBortBokning={taBortBokning} onNyKund={laggTillKund} onLoggAktivitet={loggAktivitet} initialArendeId={valArende} onInitialArendeHandled={() => setValArende(null)} prefilladPort={prefilladPort} onPrefilladPortHandled={() => setPrefilladPort(null)} />,
    kalender:    () => <Kalender arenden={arenden} tekniker={tekniker} bokningar={bokningar} kunder={kunder} objekt={objektMedStatus} serviceorder={serviceorderArr} montageorder={montageorder} onLaggTillBokning={laggTillBokning} onTaBortBokning={taBortBokning} onNyKund={snabbLaggTillKund} onNavigera={navigera} onNavigeraArende={navigeraArende} onNavigeraObjekt={navigeraObjekt} onNavigeraServiceorder={() => navigera('serviceorder')} onNavigeraMontage={() => navigera('montageplanering')} />,
    kunder:      () => <Kunder kunder={kunder} fastigheter={fastigheter} objekt={objektMedStatus} arenden={arenden} onLaggTill={laggTillKund} onUppdatera={uppdateraKund} onTaBort={taBortKund} onNavigeraArende={navigeraArende} onNavigeraPort={navigeraObjekt} />,
    'nytt-arende': () => { navigera('arenden'); return null },
    montering:        () => <Montering objekt={objektMedStatus} tekniker={tekniker} kunder={kunder} montagemallar={montagemallar} onUppdateraObjekt={uppdateraObjekt} onLaggTillObjekt={laggTillObjekt} onNyKund={snabbLaggTillKund} onLaggTillBokning={laggTillBokning} förifylldMontageorder={förifylldMontageorder} onFörifylldHandled={() => setFörifylldMontageorder(null)} montageorder={montageorder} onUppdateraMontageorder={uppdateraMontageorder} onLaggTillMontageorder={laggTillMontageorder} onTillbaka={() => navigera('montageplanering')} standardIntervall={foretagConfig?.standardIntervall ?? 12} />,
    montageplanering: () => <Montageplanering kunder={kunder} fastigheter={fastigheter} montageorder={montageorder} tekniker={tekniker} objekt={objektMedStatus} onLaggTill={laggTillMontageorder} onUppdatera={uppdateraMontageorder} onTaBort={taBortMontageorder} onNyKund={snabbLaggTillKund} onNavigeraMontering={navigeraMontering} onNyttEjPlaneratMontage={() => navigeraMontering(null)} />,
    planeringstavla:  () => <Planeringstavla montageorder={montageorder} arenden={arenden} bokningar={bokningar} serviceorder={serviceorderArr} tekniker={tekniker} kunder={kunder} objekt={objektMedStatus} onNavigeraArende={navigeraArende} onNavigeraMontering={navigeraMontering} onNavigeraServiceorder={() => navigera('serviceorder')} onLaggTillBokning={laggTillBokning} onTaBortBokning={taBortBokning} onNyKund={snabbLaggTillKund} onNavigeraObjekt={navigeraObjekt} />,
    statistik:     () => <Statistik kunder={kunder} objekt={objektMedStatus} fastigheter={fastigheter} arenden={arenden} aktivitetslogg={aktivitetslogg} onExportKunder={exportKunderCSV} onExportPortar={exportPortarCSV} onExportArenden={exportArendenCSV} onExportFastigheter={exportFastigheterCSV} />,
    serviceorder:  () => <Serviceorder serviceorder={serviceorderArr} fastigheter={fastigheter} objekt={objektMedStatus} tekniker={tekniker} protokollMallar={protokollMallar} onLaggTill={laggTillServiceorder} onUppdatera={uppdateraServiceorder} onTaBort={taBortServiceorder} onUppdateraObjekt={uppdateraObjekt} />,
    installningar: () => roll === 'admin' ? <Installningar kunder={kunder} protokollMallar={protokollMallar} onSparaProtokollMallar={sparaProtokollMallar} montagemallar={montagemallar} onSparaMontagemallar={sparaMontagemallar} tekniker={tekniker} onLaggTillTekniker={laggTillTekniker} onTaBortTekniker={taBortTekniker} foretagConfig={foretagConfig} onSparaForetagConfig={sparaForetagConfig} /> : null,
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
            height: 52, flexShrink: 0, background: '#1C3461',
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
          maxWidth: erMobil ? '100%' : ['kalender', 'planeringstavla', 'dashboard'].includes(page) ? 1600 : 900,
          width: '100%',
        }}>
          {(views[page] || views.dashboard)()}
        </main>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
