import { useMemo, useState } from 'react'
import { Users, DoorOpen, Building2, AlertCircle, CheckCircle, TrendingUp,
         BarChart2, Activity, Printer, Clock, ShieldCheck } from 'lucide-react'

const PERIOD_OPTS = [
  { id: '1m',  label: 'Senaste mån' },
  { id: '3m',  label: '3 månader'   },
  { id: '6m',  label: '6 månader'   },
  { id: '1y',  label: 'Senaste år'  },
  { id: 'all', label: 'Allt'        },
]

// ── Compliance-ring (SVG) ─────────────────────────────────────────────────────
function ComplianceRing({ pct, size = 80 }) {
  const r    = (size - 10) / 2
  const circ = 2 * Math.PI * r
  const dash = Math.max(0, Math.min(pct / 100, 1)) * circ
  const color = pct >= 80 ? 'var(--c-teal)' : pct >= 60 ? 'var(--c-amber)' : 'var(--c-red)'
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--c-border)" strokeWidth={7} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={7}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 700, color,
      }}>{pct}%</div>
    </div>
  )
}

// ── Enkel stapeldiagram ───────────────────────────────────────────────────────
function BarChart({ data, color = 'var(--c-teal)', height = 110 }) {
  if (!data.length) return null
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <div style={{ fontSize: 10, color: 'var(--c-text3)', minHeight: 14, lineHeight: '14px' }}>
            {d.value > 0 ? d.value : ''}
          </div>
          <div style={{
            width: '100%', background: color, borderRadius: '3px 3px 0 0',
            height: Math.max((d.value / max) * (height - 36), d.value > 0 ? 4 : 0),
            transition: 'height 0.3s',
          }} />
          <div style={{ fontSize: 9, color: 'var(--c-text3)', textAlign: 'center', whiteSpace: 'nowrap' }}>{d.label}</div>
        </div>
      ))}
    </div>
  )
}

// ── Dubbelt stapeldiagram (protokoll + felanmälningar) ────────────────────────
function DualBarChart({ data, height = 130 }) {
  if (!data.length) return null
  const max = Math.max(...data.flatMap(d => [d.protokoll, d.felanmalan]), 1)
  const barH = height - 44
  return (
    <div>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--c-text2)' }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--c-teal)', flexShrink: 0 }} />
          Protokoll
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--c-text2)' }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--c-coral)', flexShrink: 0 }} />
          Felanmälningar
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <div style={{ width: '100%', display: 'flex', gap: 2, alignItems: 'flex-end' }}>
              <div title={`Protokoll: ${d.protokoll}`} style={{
                flex: 1, background: 'var(--c-teal)', borderRadius: '2px 2px 0 0',
                height: Math.max((d.protokoll / max) * barH, d.protokoll > 0 ? 3 : 0),
                transition: 'height 0.3s',
              }} />
              <div title={`Felanmälningar: ${d.felanmalan}`} style={{
                flex: 1, background: 'var(--c-coral)', borderRadius: '2px 2px 0 0',
                height: Math.max((d.felanmalan / max) * barH, d.felanmalan > 0 ? 3 : 0),
                transition: 'height 0.3s',
              }} />
            </div>
            <div style={{ fontSize: 9, color: 'var(--c-text3)', textAlign: 'center', whiteSpace: 'nowrap' }}>{d.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Huvudkomponent ────────────────────────────────────────────────────────────
export default function Statistik({
  kunder = [], objekt = [], fastigheter = [], arenden = [],
  aktivitetslogg = [],
  onExportKunder, onExportPortar, onExportArenden, onExportFastigheter,
}) {
  const [period, setPeriod] = useState('6m')

  const idag   = new Date()
  const idag_s = `${idag.getFullYear()}-${String(idag.getMonth()+1).padStart(2,'0')}-${String(idag.getDate()).padStart(2,'0')}`
  const om30   = new Date(idag); om30.setDate(om30.getDate() + 30)
  const om60   = new Date(idag); om60.setDate(om60.getDate() + 60)
  const om30_s = `${om30.getFullYear()}-${String(om30.getMonth()+1).padStart(2,'0')}-${String(om30.getDate()).padStart(2,'0')}`
  const om60_s = `${om60.getFullYear()}-${String(om60.getMonth()+1).padStart(2,'0')}-${String(om60.getDate()).padStart(2,'0')}`

  // ── Period-startdatum ─────────────────────────────────────────────────────
  const periodeStart = useMemo(() => {
    if (period === 'all') return null
    const d = new Date()
    if (period === '1m') d.setMonth(d.getMonth() - 1)
    else if (period === '3m') d.setMonth(d.getMonth() - 3)
    else if (period === '6m') d.setMonth(d.getMonth() - 6)
    else if (period === '1y') d.setFullYear(d.getFullYear() - 1)
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  }, [period])

  const aktivaPortar      = useMemo(() => objekt.filter(o => !o.arkiverad), [objekt])
  const oppnaArenden      = useMemo(() => arenden.filter(a => a.status !== 'atgardad'), [arenden])
  const atgardade         = useMemo(() => arenden.filter(a => a.status === 'atgardad'), [arenden])
  const aktivaFastigheter = useMemo(() => fastigheter.filter(f => !f.arkiverad), [fastigheter])

  // ── Service health ────────────────────────────────────────────────────────
  const serviceHealth = useMemo(() => {
    let forsenade = 0, forfaller30 = 0, forfaller60 = 0, ejServicerade = 0
    for (const o of aktivaPortar) {
      if (!o.nasta && !o.senaste) { ejServicerade++; continue }
      if (o.nasta) {
        if (o.nasta < idag_s)  { forsenade++;   continue }
        if (o.nasta <= om30_s) { forfaller30++; continue }
        if (o.nasta <= om60_s) { forfaller60++; continue }
      }
    }
    const problemCount = forsenade + forfaller30
    const compliancePct = aktivaPortar.length > 0
      ? Math.round(((aktivaPortar.length - forsenade) / aktivaPortar.length) * 100)
      : 100
    return { forsenade, forfaller30, forfaller60, ejServicerade, compliancePct }
  }, [aktivaPortar, idag_s, om30_s, om60_s])

  // ── Protokoll i vald period ───────────────────────────────────────────────
  const protokollIPeriod = useMemo(() => {
    let count = 0
    for (const o of aktivaPortar)
      for (const h of (o.historik || []))
        if (h.typ !== 'montering' && h.datum && (!periodeStart || h.datum >= periodeStart)) count++
    return count
  }, [aktivaPortar, periodeStart])

  // ── Kombinerat diagram: protokoll + felanmälningar per månad ─────────────
  const kombinertData = useMemo(() => {
    const n = period === '1m' ? 1 : period === '3m' ? 3 : period === '1y' ? 12 : 6
    const months = []
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(idag)
      d.setMonth(d.getMonth() - i)
      const key   = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      const label = d.toLocaleString('sv-SE', { month: 'short' })
      let protokoll = 0, felanmalan = 0
      for (const o of aktivaPortar)
        for (const h of (o.historik || []))
          if (h.typ !== 'montering' && h.datum?.startsWith(key)) protokoll++
      for (const a of arenden)
        if (a.datum?.startsWith(key)) felanmalan++
      months.push({ label, protokoll, felanmalan })
    }
    return months
  }, [objekt, arenden, period])

  // ── Tekniker-aktivitet ────────────────────────────────────────────────────
  const tekAktivitet = useMemo(() => {
    const counts = {}
    for (const o of aktivaPortar)
      for (const h of (o.historik || []))
        if (h.tekniker && (!periodeStart || (h.datum && h.datum >= periodeStart)))
          counts[h.tekniker] = (counts[h.tekniker] || 0) + 1
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [objekt, periodeStart])

  // ── Portar per status ─────────────────────────────────────────────────────
  const statusCounts = useMemo(() => {
    const c = { ok: 0, snart: 0, forsenad: 0, arende: 0, ny: 0 }
    for (const o of aktivaPortar) c[o.status] = (c[o.status] || 0) + 1
    return c
  }, [objekt])

  // ── Top 5 kunder ──────────────────────────────────────────────────────────
  const topKunder = useMemo(() => {
    const stat = {}
    for (const o of aktivaPortar) {
      if (!o.kund) continue
      if (!stat[o.kund]) stat[o.kund] = { portar: 0, protokoll: 0, oppnaArenden: 0 }
      stat[o.kund].portar++
      for (const h of (o.historik || []))
        if (h.typ !== 'montering' && (!periodeStart || (h.datum && h.datum >= periodeStart)))
          stat[o.kund].protokoll++
    }
    for (const a of arenden) {
      if (!a.kund || a.status === 'atgardad') continue
      if (!stat[a.kund]) stat[a.kund] = { portar: 0, protokoll: 0, oppnaArenden: 0 }
      stat[a.kund].oppnaArenden++
    }
    return Object.entries(stat)
      .sort((a, b) => b[1].portar - a[1].portar)
      .slice(0, 5)
  }, [aktivaPortar, arenden, periodeStart])

  // ── Skriv ut rapport ──────────────────────────────────────────────────────
  const skrivUtStatistik = () => {
    const periodLabel = PERIOD_OPTS.find(p => p.id === period)?.label || period
    const w = window.open('', '_blank')
    const { compliancePct, forsenade, forfaller30, forfaller60 } = serviceHealth
    w.document.write(`<!DOCTYPE html><html lang="sv"><head>
      <meta charset="utf-8"><title>Statistikrapport</title>
      <style>
        body { font-family: Arial, sans-serif; color: #111; padding: 32px; font-size: 13px; }
        h1 { font-size: 22px; margin: 0 0 4px; } h2 { font-size: 14px; margin: 22px 0 8px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
        .meta { color: #666; font-size: 11px; margin-bottom: 24px; }
        .kpi { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
        .kpi-item { border: 1px solid #ddd; border-radius: 8px; padding: 12px 14px; }
        .kpi-val { font-size: 24px; font-weight: 700; margin-bottom: 2px; }
        .kpi-lbl { font-size: 11px; color: #666; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px; }
        td, th { border: 1px solid #ddd; padding: 7px 10px; text-align: left; }
        th { background: #f5f5f5; font-weight: 600; }
        tr:nth-child(even) { background: #fafafa; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style>
    </head><body>
      <h1>Statistikrapport – NMV Portservice</h1>
      <div class="meta">Genererad: ${new Date().toLocaleString('sv-SE')} &nbsp;·&nbsp; Period: ${periodLabel}</div>
      <h2>Service Health</h2>
      <div class="kpi">
        <div class="kpi-item"><div class="kpi-val">${compliancePct}%</div><div class="kpi-lbl">Compliance</div></div>
        <div class="kpi-item"><div class="kpi-val" style="color:#dc2626">${forsenade}</div><div class="kpi-lbl">Försenade</div></div>
        <div class="kpi-item"><div class="kpi-val" style="color:#d97706">${forfaller30}</div><div class="kpi-lbl">Förfaller 30 dagar</div></div>
        <div class="kpi-item"><div class="kpi-val">${forfaller60}</div><div class="kpi-lbl">Förfaller 60 dagar</div></div>
      </div>
      <h2>Nyckeltal</h2>
      <div class="kpi">
        <div class="kpi-item"><div class="kpi-val">${aktivaPortar.length}</div><div class="kpi-lbl">Aktiva portar</div></div>
        <div class="kpi-item"><div class="kpi-val">${kunder.length}</div><div class="kpi-lbl">Kunder</div></div>
        <div class="kpi-item"><div class="kpi-val">${oppnaArenden.length}</div><div class="kpi-lbl">Öppna ärenden</div></div>
        <div class="kpi-item"><div class="kpi-val">${protokollIPeriod}</div><div class="kpi-lbl">Protokoll (perioden)</div></div>
      </div>
      <h2>Aktivitet per månad</h2>
      <table><thead><tr><th>Månad</th><th>Protokoll</th><th>Felanmälningar</th></tr></thead><tbody>
        ${kombinertData.map(m => `<tr><td>${m.label}</td><td>${m.protokoll}</td><td>${m.felanmalan}</td></tr>`).join('')}
      </tbody></table>
      ${topKunder.length > 0 ? `<h2>Top kunder</h2>
      <table><thead><tr><th>Kund</th><th>Portar</th><th>Protokoll (perioden)</th><th>Öppna ärenden</th></tr></thead><tbody>
        ${topKunder.map(([n,s]) => `<tr><td>${n}</td><td>${s.portar}</td><td>${s.protokoll}</td><td>${s.oppnaArenden}</td></tr>`).join('')}
      </tbody></table>` : ''}
      ${tekAktivitet.length > 0 ? `<h2>Tekniker – protokoll (${periodLabel.toLowerCase()})</h2>
      <table><thead><tr><th>Tekniker</th><th>Antal</th></tr></thead><tbody>
        ${tekAktivitet.map(([n,c]) => `<tr><td>${n}</td><td>${c}</td></tr>`).join('')}
      </tbody></table>` : ''}
    </body></html>`)
    w.document.close()
    setTimeout(() => w.print(), 300)
  }

  const { compliancePct, forsenade, forfaller30, forfaller60, ejServicerade } = serviceHealth
  const periodLabel = PERIOD_OPTS.find(p => p.id === period)?.label || period

  return (
    <div>

      {/* ── Rubrik + kontroller ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 2 }}>Statistik & rapporter</h1>
          <p style={{ color: 'var(--c-text2)', fontSize: 13 }}>Nyckeltal, service health och aktivitet</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {PERIOD_OPTS.map(({ id, label }) => (
              <button key={id} onClick={() => setPeriod(id)} style={{
                padding: '5px 12px', fontSize: 12, borderRadius: 20, cursor: 'pointer',
                border: '1px solid var(--c-border)',
                background: period === id ? 'var(--c-text)' : 'transparent',
                color: period === id ? '#fff' : 'var(--c-text2)',
                transition: 'all 0.12s',
              }}>{label}</button>
            ))}
          </div>
          <button onClick={skrivUtStatistik} className="btn" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <Printer size={13} /> Skriv ut rapport
          </button>
        </div>
      </div>

      {/* ── SERVICE HEALTH ── */}
      <div className="card" style={{ marginBottom: 16, borderLeft: `3px solid ${compliancePct >= 80 ? 'var(--c-teal)' : compliancePct >= 60 ? 'var(--c-amber)' : 'var(--c-red)'}`, borderRadius: '0 12px 12px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <ShieldCheck size={15} color={compliancePct >= 80 ? 'var(--c-teal)' : compliancePct >= 60 ? 'var(--c-amber)' : 'var(--c-red)'} />
          <span style={{ fontWeight: 600, fontSize: 14 }}>Service Health</span>
          <span style={{ fontSize: 11, color: 'var(--c-text3)', marginLeft: 4 }}>
            Baserat på {aktivaPortar.length} aktiva portar
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr 1fr', gap: 16, alignItems: 'center' }}>

          {/* Compliance ring */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, paddingRight: 16, borderRight: '1px solid var(--c-border)' }}>
            <ComplianceRing pct={compliancePct} size={80} />
            <div style={{ fontSize: 11, color: 'var(--c-text2)', textAlign: 'center' }}>Compliance</div>
          </div>

          {/* Försenade */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: forsenade > 0 ? 'var(--c-red)' : 'var(--c-teal)', lineHeight: 1.1 }}>{forsenade}</div>
            <div style={{ fontSize: 11, color: 'var(--c-text2)', marginTop: 3 }}>Försenade</div>
            <div style={{ fontSize: 10, color: 'var(--c-text3)' }}>service passerad</div>
          </div>

          {/* Förfaller 30d */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: forfaller30 > 0 ? 'var(--c-amber)' : 'var(--c-teal)', lineHeight: 1.1 }}>{forfaller30}</div>
            <div style={{ fontSize: 11, color: 'var(--c-text2)', marginTop: 3 }}>Inom 30 dagar</div>
            <div style={{ fontSize: 10, color: 'var(--c-text3)' }}>kräver bokning</div>
          </div>

          {/* Förfaller 60d */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--c-text)', lineHeight: 1.1 }}>{forfaller60}</div>
            <div style={{ fontSize: 11, color: 'var(--c-text2)', marginTop: 3 }}>Inom 60 dagar</div>
            <div style={{ fontSize: 10, color: 'var(--c-text3)' }}>planera service</div>
          </div>

          {/* Ej servicade */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--c-text3)', lineHeight: 1.1 }}>{ejServicerade}</div>
            <div style={{ fontSize: 11, color: 'var(--c-text2)', marginTop: 3 }}>Ej servicade</div>
            <div style={{ fontSize: 10, color: 'var(--c-text3)' }}>saknar datum</div>
          </div>
        </div>
      </div>

      {/* ── KPI-rad ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Portar (aktiva)',      value: aktivaPortar.length,      icon: DoorOpen,    color: 'var(--c-blue)',  bg: 'var(--c-blue-bg)'  },
          { label: 'Kunder',               value: kunder.length,            icon: Users,       color: 'var(--c-teal)',  bg: 'var(--c-teal-bg)'  },
          { label: 'Fastigheter',          value: aktivaFastigheter.length, icon: Building2,   color: '#a78bfa',        bg: '#a78bfa20'          },
          { label: 'Öppna ärenden',        value: oppnaArenden.length,      icon: AlertCircle, color: 'var(--c-red)',   bg: 'var(--c-red-bg)'   },
          { label: 'Protokoll (perioden)', value: protokollIPeriod,         icon: CheckCircle, color: 'var(--c-green)', bg: 'var(--c-green-bg)' },
          { label: 'Åtgärdade ärenden',    value: atgardade.length,         icon: TrendingUp,  color: 'var(--c-amber)', bg: 'var(--c-amber-bg)' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card" style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 14px' }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: bg, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={17} color={color} />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
              <div style={{ fontSize: 10, color: 'var(--c-text2)' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Aktivitetdiagram + Top kunder ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Kombinerat diagram */}
        <div className="card">
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart2 size={15} color="var(--c-teal)" /> Aktivitet per månad
            <span style={{ fontSize: 11, color: 'var(--c-text3)', fontWeight: 400 }}>{periodLabel}</span>
          </div>
          <DualBarChart data={kombinertData} height={140} />
        </div>

        {/* Top 5 kunder */}
        <div className="card">
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Top kunder</div>
          {topKunder.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--c-text3)' }}>Ingen data ännu.</p>
          ) : (
            topKunder.map(([namn, s], i) => (
              <div key={namn} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i < topKunder.length - 1 ? 10 : 0 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0, fontSize: 11, fontWeight: 700,
                  background: 'var(--c-blue-bg)', color: 'var(--c-navy)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{i + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{namn}</div>
                  <div style={{ fontSize: 10, color: 'var(--c-text3)' }}>
                    {s.portar} port{s.portar !== 1 ? 'ar' : ''} · {s.protokoll} protokoll
                  </div>
                </div>
                {s.oppnaArenden > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 8, background: 'var(--c-red-bg)', color: 'var(--c-red)', flexShrink: 0 }}>
                    {s.oppnaArenden} ärende{s.oppnaArenden !== 1 ? 'n' : ''}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Tekniker + Portar per status ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Tekniker-aktivitet */}
        {tekAktivitet.length > 0 && (
          <div className="card">
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>
              Tekniker – protokoll
              <span style={{ fontSize: 11, color: 'var(--c-text3)', fontWeight: 400, marginLeft: 6 }}>{periodLabel}</span>
            </div>
            {tekAktivitet.map(([namn, antal]) => (
              <div key={namn} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, fontSize: 11, fontWeight: 700,
                  background: 'var(--c-blue-bg)', color: 'var(--c-navy)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {namn.charAt(0).toUpperCase()}
                </div>
                <div style={{ width: 90, fontSize: 11, color: 'var(--c-text2)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>{namn}</div>
                <div style={{ flex: 1 }}>
                  <div className="progress-bar" style={{ height: 7 }}>
                    <div className="progress-fill" style={{
                      width: `${Math.round((antal / tekAktivitet[0][1]) * 100)}%`,
                      background: 'var(--c-blue)',
                    }} />
                  </div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, minWidth: 22, textAlign: 'right', flexShrink: 0 }}>{antal}</div>
              </div>
            ))}
          </div>
        )}

        {/* Portar per status */}
        <div className="card">
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Portar per status</div>
          {[
            ['ok',       'OK',               'var(--c-teal)'],
            ['snart',    'Service snart',     'var(--c-amber)'],
            ['forsenad', 'Försenad',          'var(--c-red)'],
            ['arende',   'Öppet ärende',      '#ef4444'],
            ['ny',       'Ny (ej servicad)',  'var(--c-text3)'],
          ].map(([key, label, color]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 12 }}>{label}</div>
              <div style={{ fontSize: 13, fontWeight: 600, minWidth: 24, textAlign: 'right' }}>{statusCounts[key] || 0}</div>
              <div style={{ width: 56 }}>
                <div className="progress-bar" style={{ height: 5 }}>
                  <div className="progress-fill" style={{
                    width: `${aktivaPortar.length ? Math.round(((statusCounts[key] || 0) / aktivaPortar.length) * 100) : 0}%`,
                    background: color,
                  }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Aktivitetslogg ── */}
      {aktivitetslogg.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={15} color="var(--c-blue)" /> Aktivitetslogg
          </div>
          {aktivitetslogg.slice(0, 20).map((a, i) => (
            <div key={a.id || i} style={{
              display: 'flex', gap: 12, padding: '7px 0',
              borderBottom: '1px solid var(--c-border)', alignItems: 'flex-start',
            }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--c-blue)', flexShrink: 0, marginTop: 5 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12 }}>{a.beskrivning}</div>
                {a.entitet_namn && (
                  <div style={{ fontSize: 11, color: 'var(--c-text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.entitet_namn}
                  </div>
                )}
              </div>
              <div style={{ fontSize: 10, color: 'var(--c-text3)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {a.created_at ? new Date(a.created_at).toLocaleString('sv-SE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── CSV-export ── */}
      <div className="card">
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Exportera data (CSV)</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button className="btn" onClick={onExportPortar}     style={{ fontSize: 12 }}>↓ Portar</button>
          <button className="btn" onClick={onExportKunder}     style={{ fontSize: 12 }}>↓ Kunder</button>
          <button className="btn" onClick={onExportArenden}    style={{ fontSize: 12 }}>↓ Ärenden</button>
          <button className="btn" onClick={onExportFastigheter} style={{ fontSize: 12 }}>↓ Fastigheter</button>
        </div>
      </div>

    </div>
  )
}
