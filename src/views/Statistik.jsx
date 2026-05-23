import { useMemo, useState } from 'react'
import { Users, DoorOpen, Building2, AlertCircle, CheckCircle, TrendingUp, BarChart2, Activity, Printer } from 'lucide-react'

const PERIOD_OPTS = [
  { id: '1m',  label: 'Senaste mån' },
  { id: '3m',  label: '3 månader'   },
  { id: '6m',  label: '6 månader'   },
  { id: '1y',  label: 'Senaste år'  },
  { id: 'all', label: 'Allt'        },
]

// ── SVG-stapeldiagram ─────────────────────────────────────────────────────────
function BarChart({ data, color = 'var(--c-teal)', height = 120 }) {
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
            height: Math.max((d.value / max) * (height - 38), d.value > 0 ? 4 : 0),
            transition: 'height 0.3s',
          }} />
          <div style={{ fontSize: 9, color: 'var(--c-text3)', textAlign: 'center', whiteSpace: 'nowrap' }}>{d.label}</div>
        </div>
      ))}
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

  const idag = new Date()

  // ── Beräkna period-startdatum ─────────────────────────────────────────────
  const periodeStart = useMemo(() => {
    if (period === 'all') return null
    const d = new Date()
    if (period === '1m') d.setMonth(d.getMonth() - 1)
    else if (period === '3m') d.setMonth(d.getMonth() - 3)
    else if (period === '6m') d.setMonth(d.getMonth() - 6)
    else if (period === '1y') d.setFullYear(d.getFullYear() - 1)
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  }, [period])

  const aktivaPortar     = useMemo(() => objekt.filter(o => !o.arkiverad), [objekt])
  const oppnaArenden     = useMemo(() => arenden.filter(a => a.status !== 'atgardad'), [arenden])
  const atgardade        = useMemo(() => arenden.filter(a => a.status === 'atgardad'), [arenden])
  const aktivaFastigheter = useMemo(() => fastigheter.filter(f => !f.arkiverad), [fastigheter])

  // Protokoll i vald period
  const protokollIPeriod = useMemo(() => {
    let count = 0
    for (const o of aktivaPortar)
      for (const h of (o.historik || []))
        if (h.typ !== 'montering' && h.datum && (!periodeStart || h.datum >= periodeStart)) count++
    return count
  }, [aktivaPortar, periodeStart])

  // Services per månad (baserat på vald period)
  const manadData = useMemo(() => {
    const n = period === '1m' ? 1 : period === '3m' ? 3 : period === '1y' ? 12 : 6
    const months = []
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(idag)
      d.setMonth(d.getMonth() - i)
      const key   = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      const label = d.toLocaleString('sv-SE', { month: 'short' })
      let count = 0
      for (const o of aktivaPortar)
        for (const h of (o.historik || []))
          if (h.typ !== 'montering' && h.datum?.startsWith(key)) count++
      months.push({ label, value: count })
    }
    return months
  }, [objekt, period])

  // Tekniker-aktivitet (filtrerat på period)
  const tekAktivitet = useMemo(() => {
    const counts = {}
    for (const o of aktivaPortar)
      for (const h of (o.historik || []))
        if (h.tekniker && (!periodeStart || (h.datum && h.datum >= periodeStart)))
          counts[h.tekniker] = (counts[h.tekniker] || 0) + 1
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [objekt, periodeStart])

  // Portar per status
  const statusCounts = useMemo(() => {
    const c = { ok: 0, snart: 0, forsenad: 0, arende: 0, ny: 0 }
    for (const o of aktivaPortar) c[o.status] = (c[o.status] || 0) + 1
    return c
  }, [objekt])

  // ── Skriv ut statistikrapport ─────────────────────────────────────────────
  const skrivUtStatistik = () => {
    const periodLabel = PERIOD_OPTS.find(p => p.id === period)?.label || period
    const w = window.open('', '_blank')
    w.document.write(`<!DOCTYPE html><html lang="sv"><head>
      <meta charset="utf-8">
      <title>Statistikrapport</title>
      <style>
        body { font-family: Arial, sans-serif; color: #111; padding: 32px; font-size: 13px; }
        h1 { font-size: 22px; margin: 0 0 4px; }
        h2 { font-size: 14px; margin: 22px 0 8px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
        .meta { color: #666; font-size: 11px; margin-bottom: 24px; }
        .kpi { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
        .kpi-item { border: 1px solid #ddd; border-radius: 8px; padding: 14px 16px; }
        .kpi-val { font-size: 26px; font-weight: 700; margin-bottom: 2px; }
        .kpi-lbl { font-size: 11px; color: #666; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        td, th { border: 1px solid #ddd; padding: 7px 10px; text-align: left; }
        th { background: #f5f5f5; font-weight: 600; }
        tr:nth-child(even) { background: #fafafa; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style>
    </head><body>
      <h1>Statistikrapport</h1>
      <div class="meta">Genererad: ${new Date().toLocaleString('sv-SE')} &nbsp;·&nbsp; Period: ${periodLabel}</div>
      <div class="kpi">
        <div class="kpi-item"><div class="kpi-val">${aktivaPortar.length}</div><div class="kpi-lbl">Aktiva portar</div></div>
        <div class="kpi-item"><div class="kpi-val">${kunder.length}</div><div class="kpi-lbl">Kunder</div></div>
        <div class="kpi-item"><div class="kpi-val">${aktivaFastigheter.length}</div><div class="kpi-lbl">Fastigheter</div></div>
        <div class="kpi-item"><div class="kpi-val">${oppnaArenden.length}</div><div class="kpi-lbl">Öppna ärenden</div></div>
        <div class="kpi-item"><div class="kpi-val">${protokollIPeriod}</div><div class="kpi-lbl">Protokoll (${periodLabel.toLowerCase()})</div></div>
        <div class="kpi-item"><div class="kpi-val">${atgardade.length}</div><div class="kpi-lbl">Åtgärdade ärenden totalt</div></div>
      </div>
      <h2>Portar per status</h2>
      <table><thead><tr><th>Status</th><th>Antal</th></tr></thead><tbody>
        ${[['ok','OK'],['snart','Service snart'],['forsenad','Försenad'],['arende','Öppet ärende'],['ny','Ny (ej servicad)']].map(([k,l]) =>
          `<tr><td>${l}</td><td>${statusCounts[k]||0}</td></tr>`).join('')}
      </tbody></table>
      ${tekAktivitet.length > 0 ? `
      <h2>Tekniker – protokoll (${periodLabel.toLowerCase()})</h2>
      <table><thead><tr><th>Tekniker</th><th>Antal protokoll</th></tr></thead><tbody>
        ${tekAktivitet.map(([n,c]) => `<tr><td>${n}</td><td>${c}</td></tr>`).join('')}
      </tbody></table>` : ''}
      <h2>Protokoll per månad</h2>
      <table><thead><tr><th>Månad</th><th>Antal</th></tr></thead><tbody>
        ${manadData.map(m => `<tr><td>${m.label}</td><td>${m.value}</td></tr>`).join('')}
      </tbody></table>
    </body></html>`)
    w.document.close()
    setTimeout(() => w.print(), 300)
  }

  return (
    <div>
      {/* Rubrik + period-väljare + skriv ut */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 2 }}>Statistik & rapporter</h1>
          <p style={{ color: 'var(--c-text2)', fontSize: 13 }}>Nyckeltal och aktivitet</p>
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

      {/* ── KPI-kort ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Portar (aktiva)',      value: aktivaPortar.length,      icon: DoorOpen,    color: 'var(--c-blue)',  bg: 'var(--c-blue-bg)' },
          { label: 'Kunder',               value: kunder.length,            icon: Users,       color: 'var(--c-teal)',  bg: 'var(--c-teal-bg)' },
          { label: 'Fastigheter',          value: aktivaFastigheter.length, icon: Building2,   color: '#a78bfa',        bg: '#a78bfa20' },
          { label: 'Öppna ärenden',        value: oppnaArenden.length,      icon: AlertCircle, color: 'var(--c-red)',   bg: 'var(--c-red-bg)' },
          { label: 'Protokoll (perioden)', value: protokollIPeriod,         icon: CheckCircle, color: 'var(--c-green)', bg: 'var(--c-green-bg)' },
          { label: 'Åtgärdade ärenden',    value: atgardade.length,         icon: TrendingUp,  color: 'var(--c-amber)', bg: 'var(--c-amber-bg)' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
            <div style={{ width: 38, height: 38, borderRadius: 9, background: bg, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={19} color={color} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
              <div style={{ fontSize: 11, color: 'var(--c-text2)' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Diagram + status ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Serviceprotokoll per månad */}
        <div className="card">
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart2 size={15} color="var(--c-teal)" /> Protokoll per månad
          </div>
          <BarChart data={manadData} color="var(--c-teal)" />
        </div>

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

      {/* ── Tekniker-aktivitet ── */}
      {tekAktivitet.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>
            Tekniker – antal protokoll ({PERIOD_OPTS.find(p => p.id === period)?.label || period})
          </div>
          {tekAktivitet.map(([namn, antal]) => (
            <div key={namn} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 120, fontSize: 12, color: 'var(--c-text2)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{namn}</div>
              <div style={{ flex: 1 }}>
                <div className="progress-bar" style={{ height: 8 }}>
                  <div className="progress-fill" style={{
                    width: `${Math.round((antal / tekAktivitet[0][1]) * 100)}%`,
                    background: 'var(--c-blue)',
                  }} />
                </div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, minWidth: 24, textAlign: 'right' }}>{antal}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Aktivitetslogg ── */}
      {aktivitetslogg.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={15} color="var(--c-blue)" /> Aktivitetslogg
          </div>
          {aktivitetslogg.slice(0, 30).map((a, i) => (
            <div key={a.id || i} style={{
              display: 'flex', gap: 12, padding: '7px 0',
              borderBottom: '1px solid var(--c-border)', alignItems: 'flex-start',
            }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--c-blue)',
                flexShrink: 0, marginTop: 5 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12 }}>{a.beskrivning}</div>
                {a.entitet_namn && (
                  <div style={{ fontSize: 11, color: 'var(--c-text2)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.entitet_namn}
                  </div>
                )}
              </div>
              <div style={{ fontSize: 10, color: 'var(--c-text3)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {a.created_at
                  ? new Date(a.created_at).toLocaleString('sv-SE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : ''}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Export ── */}
      <div className="card">
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Exportera data (CSV)</div>
        <p style={{ fontSize: 12, color: 'var(--c-text2)', marginBottom: 12 }}>
          Ladda ner data som CSV-filer som kan öppnas i Excel eller liknande program.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button className="btn" onClick={onExportPortar} style={{ fontSize: 12 }}>↓ Portar</button>
          <button className="btn" onClick={onExportKunder} style={{ fontSize: 12 }}>↓ Kunder</button>
          <button className="btn" onClick={onExportArenden} style={{ fontSize: 12 }}>↓ Ärenden</button>
          <button className="btn" onClick={onExportFastigheter} style={{ fontSize: 12 }}>↓ Fastigheter</button>
        </div>
      </div>
    </div>
  )
}
