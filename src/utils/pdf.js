import logo from '../image-1779305303942.png'
import { RISKPUNKTER } from '../data/store.js'

// ── Företagskonfiguration (sätts från App.jsx vid start) ──────────────────────
let _companyConfig = {}
/** Uppdaterar företagskonfigurationen som används i PDF-headers. */
export function setCompanyConfig(cfg) {
  if (cfg && typeof cfg === 'object') _companyConfig = { ...cfg }
}
/** Returnerar aktuell företagskonfiguration. */
export function getCompanyConfig() { return _companyConfig }

/** Hämtar logotypen som base64-data-URL. */
export async function hämtaLogoBase64() {
  try {
    const res  = await fetch(logo)
    const blob = await res.blob()
    return new Promise(resolve => {
      const r = new FileReader()
      r.onload = () => resolve(r.result)
      r.readAsDataURL(blob)
    })
  } catch { return null }
}

/** Öppnar ett nytt fönster med HTML-innehåll och triggar utskrift. */
export function öppnaPrintFönster(html, titel = 'Skriv ut') {
  const win = window.open('', '_blank', 'width=860,height=1100')
  if (!win) return
  win.document.title = titel
  win.document.write(html)
  win.document.close()
  setTimeout(() => win.print(), 400)
}

/**
 * Enhetlig CSS för alla utskrifter – NMV Portservice Print Design System.
 */
export const PDF_CSS = `
*{box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif;padding:32px 40px 72px;color:#1a1917;font-size:12px}

/* ── Dokument-header ── */
.doc-header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #1C3461;padding-bottom:16px;margin-bottom:28px}
.doc-type{font-size:11px;color:#888;margin-top:6px;text-transform:uppercase;letter-spacing:.06em;font-weight:600}
.doc-ref{font-size:22px;font-weight:700;color:#1C3461;text-align:right;line-height:1.1}
.doc-ref-sub{font-size:12px;color:#888;text-align:right;margin-top:3px}

/* ── Sidfot ── */
.doc-footer{position:fixed;bottom:0;left:0;right:0;border-top:2px solid #1C3461;
  padding:10px 40px;display:flex;justify-content:space-between;align-items:center;
  background:#fff;font-size:9px;color:#888;gap:16px}
.doc-footer strong{color:#1C3461;font-size:10px}
@media print{.doc-footer{position:fixed;bottom:0}}

/* ── Sektionsrubrik ── */
.slbl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#888;margin:22px 0 10px}

/* ── Meta-grid (2 kolumner) ── */
.meta{display:grid;grid-template-columns:1fr 1fr;border:1px solid #ddd;border-radius:8px;overflow:hidden;margin-bottom:20px}
.cell{padding:9px 13px;border-bottom:1px solid #eee}
.cell:nth-child(odd){border-right:1px solid #eee}
.cell:last-child,.cell:nth-last-child(2){border-bottom:none}
.lbl{font-size:10px;color:#888;margin-bottom:2px}
.val{font-weight:600;font-size:12px}

/* ── Tabell ── */
table{width:100%;border-collapse:collapse;margin-bottom:20px}
thead th{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#888;padding:8px 10px;border-bottom:2px solid #e8e7e4;text-align:left}
td{padding:7px 10px;border-bottom:1px solid #f0f0ee;font-size:11px;vertical-align:top}
tr:last-child td{border-bottom:none}
.tbl-group td{background:#f8f8f7;font-weight:700;font-size:10px;color:#1C3461;text-transform:uppercase;letter-spacing:.06em;padding:7px 10px;border-bottom:1px solid #e8e7e4}

/* ── Status – serviceprotokoll (OK/AF/NOT/KA/EJ) ── */
.s-ok{color:#16a34a;font-weight:600}
.s-af{color:#2563eb;font-weight:600}
.s-not{color:#d97706;font-weight:600}
.s-ka{color:#dc2626;font-weight:600}
.s-ej{color:#9ca3af}

/* ── Status – äldre protokoll (G/J/A) ── */
.s-g{color:#16a34a;font-weight:600}
.s-j{color:#d97706;font-weight:600}
.s-a{color:#dc2626;font-weight:600}

/* ── Status – riskbedömning ── */
.s-risk-ok{color:#16a34a;font-weight:600}
.s-risk-atgard{color:#d97706;font-weight:600}
.s-risk-ej{color:#9ca3af}

/* ── Signaturer ── */
.sig-section{display:flex;gap:40px;flex-wrap:wrap;margin-top:20px;padding-top:16px;border-top:1px solid #e8e7e4}
.sig-box{border:1px solid #ddd;border-radius:8px;padding:12px 16px;min-width:200px}
.sig-box img{max-width:260px;max-height:80px;display:block}
.sig-label{font-size:11px;font-weight:600;color:#555;margin-bottom:8px}
.sig-date{font-size:11px;color:#888;margin-top:6px}

/* ── Godkännande-badge ── */
.approval{display:inline-flex;align-items:center;gap:10px;padding:12px 18px;border-radius:8px;margin:12px 0}
.approval-ok{background:#d1fae5;border:2px solid #16a34a;color:#16a34a}
.approval-ej{background:#fee2e2;border:2px solid #dc2626;color:#dc2626}
.approval-icon{font-size:20px}
.approval-text{font-weight:700;font-size:13px}
.approval-sub{font-size:11px;margin-top:3px;opacity:.8}

/* ── Diverse ── */
.desc-box{border:1px solid #ddd;border-radius:8px;padding:12px 16px;color:#444;line-height:1.7;margin-bottom:20px}
.page-break{page-break-before:always;break-before:page}
.port-sektion{margin-bottom:28px;page-break-inside:avoid}

@media print{body{padding:16px 20px}}
`

/**
 * Genererar dokument-header HTML.
 * @param {string} logoBase64 - Logo som base64-data-URL (eller null)
 * @param {string} docType    - Dokumenttyp, t.ex. "Felanmälan"
 * @param {string} docRef     - Stor referenstext (nr/rubrik), visas höger
 * @param {string} docRefSub  - Liten undertext (datum etc.), visas höger
 */
export function pdfHeader(logoBase64, docType, docRef = '', docRefSub = '') {
  return `<div class="doc-header">
    <div>
      ${logoBase64
        ? `<img src="${logoBase64}" style="height:48px;display:block" alt="Portservice"/>`
        : `<div style="font-size:20px;font-weight:800;color:#1C3461;line-height:1">NMV Portservice</div>`}
      <div class="doc-type">${docType}</div>
    </div>
    <div>
      ${docRef    ? `<div class="doc-ref">${docRef}</div>`         : ''}
      ${docRefSub ? `<div class="doc-ref-sub">${docRefSub}</div>` : ''}
    </div>
  </div>`
}

/** Genererar sidfot med företagsuppgifter. */
export function pdfFooter() {
  const cc = _companyConfig
  const ort      = [cc.postnr, cc.ort].filter(Boolean).join(' ')
  const adress   = [cc.adress, ort].filter(Boolean).join(', ')
  const kontakt  = [cc.telefon, cc.epost, cc.webbplats].filter(Boolean).join('  ·  ')
  if (!cc.namn && !adress && !kontakt) return ''
  return `<div class="doc-footer">
    <div><strong>${cc.namn || ''}</strong>${cc.orgnr ? `<span style="margin-left:8px;color:#aaa">Org.nr ${cc.orgnr}</span>` : ''}</div>
    ${adress  ? `<div>${adress}</div>` : ''}
    ${kontakt ? `<div>${kontakt}</div>` : ''}
  </div>`
}

/**
 * Genererar ett 2-kolumns meta-grid.
 * @param {Array<{lbl: string, val: any}>} cells – cellpar (helst jämnt antal)
 */
export function pdfMetaGrid(cells) {
  return `<div class="meta">${cells.map(c =>
    `<div class="cell"><div class="lbl">${c.lbl}</div><div class="val">${
      c.val != null && c.val !== '' ? c.val : '–'
    }</div></div>`
  ).join('')}</div>`
}

/**
 * Omsluter body-HTML i ett komplett HTML-dokument med delad CSS.
 */
export function pdfDoc(title, bodyHtml) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title><style>${PDF_CSS}</style></head><body>${bodyHtml}${pdfFooter()}</body></html>`
}

/**
 * Genererar HTML för en felanmälan.
 * @param {object} a – arendeobjektet
 * @param {string} logoBase64
 */
export function pdfArende(a, logoBase64) {
  const prioritetLabel = { akut: '🔴 Akut', hög: '🟠 Hög', normal: '🟡 Normal', låg: '🟢 Låg' }
  const statusLabel    = { ny: 'Ny', pagaende: 'Pågående', atgardad: 'Åtgärdad' }
  const tekStr = Array.isArray(a.tekniker) ? a.tekniker.join(', ') : (a.tekniker || '–')

  const meta = pdfMetaGrid([
    { lbl: 'Kund',        val: a.kund },
    { lbl: 'Port / plats', val: a.namn },
    { lbl: 'Feltyp',      val: a.feltyp },
    { lbl: 'Datum',       val: a.datum },
    { lbl: 'Prioritet',   val: prioritetLabel[a.prioritet] || a.prioritet || '–' },
    { lbl: 'Status',      val: statusLabel[a.status] || a.status || '–' },
    { lbl: 'Tekniker',    val: tekStr },
    { lbl: 'Bokad tid',   val: a.besok || '–' },
  ])

  const body = `
    ${pdfHeader(logoBase64, 'Felanmälan', `#${a.nr || '–'}`, a.kund || '')}
    <div class="slbl">Ärendeinformation</div>
    ${meta}
    ${a.beskrivning ? `<div class="slbl">Beskrivning</div><div class="desc-box">${a.beskrivning}</div>` : ''}
    ${a.notering    ? `<div class="slbl">Åtgärd / notering</div><div class="desc-box">${a.notering}</div>` : ''}
  `
  return pdfDoc(`Felanmälan #${a.nr || ''}`, body)
}

/**
 * Genererar HTML för en fristående riskbedömning (serviceorder eller felanmälan).
 * @param {object} p – { kund, portNamn, portTyp, tekniker, datum, ordernummer, riskKontroll, riskNoteringar, riskpunkter }
 * @param {string} logoBase64
 */
export function pdfRiskBedömning(p, logoBase64) {
  const rp = p.riskpunkter || RISKPUNKTER
  const riskRows = rp.map((punkt, i) => {
    const status   = (p.riskKontroll   || {})[i]
    const notering = (p.riskNoteringar || {})[i] || ''
    const [cls, lbl] =
      status === 'ok'          ? ['s-risk-ok',    '✓ OK']           :
      status === 'atgard'      ? ['s-risk-atgard', '⚠ Åtgärd krävs'] :
      status === 'ej_aktuellt' ? ['s-risk-ej',    '– Ej aktuellt']  :
                                 ['',              '–']
    return `<tr>
      <td style="width:32px;color:#aaa;font-size:10px">${i + 1}</td>
      <td>${punkt}${notering ? `<div style="margin-top:4px;font-style:italic;color:#777;font-size:10px">↳ ${notering}</div>` : ''}</td>
      <td style="text-align:center;white-space:nowrap"><span class="${cls}">${lbl}</span></td>
    </tr>`
  }).join('')

  const body = `
    ${pdfHeader(logoBase64, 'Riskbedömning',
      p.ordernummer ? `#${p.ordernummer}` : (p.portNamn || 'Riskbedömning'),
      p.datum || '')}

    <div class="slbl">Uppdragsinformation</div>
    ${pdfMetaGrid([
      { lbl: 'Kund',     val: p.kund      },
      { lbl: 'Port',     val: p.portNamn  },
      { lbl: 'Porttyp',  val: p.portTyp   },
      { lbl: 'Tekniker', val: p.tekniker  },
      { lbl: 'Datum',    val: p.datum     },
      { lbl: 'Order',    val: p.ordernummer || '–' },
    ])}

    <div class="slbl">Riskbedömning – utförd före arbete påbörjades</div>
    <table>
      <thead><tr><th>#</th><th>Riskpunkt</th><th style="text-align:center">Bedömning</th></tr></thead>
      <tbody>${riskRows}</tbody>
    </table>

    <div class="sig-section">
      <div class="sig-box" style="flex:1;min-height:80px">
        <div class="sig-label">Teknikerns underskrift</div>
        <div class="sig-date" style="margin-top:36px">Datum: ___________________</div>
      </div>
      <div class="sig-box" style="flex:1;min-height:80px">
        <div class="sig-label">Ansvarig (vid behov)</div>
        <div class="sig-date" style="margin-top:36px">Datum: ___________________</div>
      </div>
    </div>
  `
  return pdfDoc('Riskbedömning', body)
}

// ── Standardmallar för egenkontroll (används om inga anpassade mallar finns) ──
export const EGENKONTROLL_DEFAULT = {
  Vikport:      ['Portblad och skenor utan skador','Fjädersystem kalibrerat','Säkerhetsbroms testad','Nödöppning testad','Motor monterad och kalibrerad','Fotocell testad','Ändlägen inställda','CE-märkning monterad','Bruksanvisning överlämnad'],
  Takskjutport: ['Skensystem rakt och säkrat','Balansfjädrar kontrollerade','Portblad utan skador','Hjul och lager smorda','Nödöppning testad','Motormontering kontrollerad','Ändlägen inställda','CE-märkning monterad','Bruksanvisning överlämnad'],
  Lastbrygga:   ['Hydraulsystem utan läckage','Plattform utan skador','Styrsystem testat','Säkerhetskant testad','Elektrisk installation kontrollerad','Nödstoppsfunktion testad','CE-märkning monterad','Bruksanvisning överlämnad'],
  Grind:        ['Stolpar stabilt monterade','Räls och styrning rak','Grindblad utan skador','Motor monterad','Fotocell kontrollerad','Nödöppning testad','Ändlägen inställda','CE-märkning monterad','Bruksanvisning överlämnad'],
}

/**
 * Genererar HTML för ett monteringsprotokoll (riskbedömning + egenkontroll).
 * Kan anropas från Montering, Montageplanering och Portregister.
 *
 * @param {object} p            – protokolldata (portTyp, kund, adress, datum, tekniker, …)
 * @param {string} logoBase64   – logo som base64-data-URL
 * @param {object} montagemallar – anpassade egenkontrollmallar (valfritt)
 */
export function pdfMontageProt(p, logoBase64, montagemallar = {}, riskpunkter = null) {
  const mallar  = Object.keys(montagemallar).length > 0 ? montagemallar : EGENKONTROLL_DEFAULT
  const punkter = mallar[p.portTyp] || []

  // ── Riskbedömning ────────────────────────────────────────────────────────────
  const aktivaRiskpunkter = (riskpunkter && riskpunkter.length > 0) ? riskpunkter : RISKPUNKTER
  const riskRows = aktivaRiskpunkter.map((punkt, i) => {
    if (punkt.startsWith('## ')) {
      return `<tr class="tbl-group"><td colspan="3">${punkt.slice(3)}</td></tr>`
    }
    const st  = p.riskKontroll?.[i]
    const not = p.riskNoteringar?.[i] || ''
    const cls = st === 'ok' ? 's-risk-ok' : st === 'atgard' ? 's-risk-atgard' : st === 'ej_aktuellt' ? 's-risk-ej' : ''
    const etk = st === 'ok' ? '✓ OK' : st === 'atgard' ? '⚠ Åtgärd krävs' : st === 'ej_aktuellt' ? '– Ej aktuellt' : '–'
    return `<tr><td>${punkt}</td><td class="${cls}">${etk}</td><td style="color:#666">${not}</td></tr>`
  }).join('')

  const egenRiskRows = (p.egenRisker || []).map(r => {
    const cls = r.status === 'ok' ? 's-risk-ok' : r.status === 'atgard' ? 's-risk-atgard' : 's-risk-ej'
    const etk = r.status === 'ok' ? '✓ OK' : r.status === 'atgard' ? '⚠ Åtgärd krävs' : '– Ej aktuellt'
    return `<tr style="background:#fffbf2"><td><strong>${r.label||'–'}</strong>${r.beskrivning ? `<br><span style="color:#888;font-size:10px">${r.beskrivning}</span>` : ''}</td><td class="${cls}">${etk}</td><td style="color:#666">${r.åtgärd||''}</td></tr>`
  }).join('')

  // ── Egenkontroll ─────────────────────────────────────────────────────────────
  let egenCount = 0
  const egenRows = punkter.map((punkt, i) => {
    if (punkt.startsWith('## ')) {
      return `<tr class="tbl-group"><td colspan="3">${punkt.slice(3)}</td></tr>`
    }
    egenCount++
    const st  = p.egenkontroll?.[i] || '–'
    const not = p.egenNoteringar?.[i] || ''
    const cls = st === 'OK' ? 's-ok' : st === 'EJ' ? 's-ka' : st === 'NA' ? 's-ej' : ''
    const etk = st === 'OK' ? '✓ Godkänd' : st === 'EJ' ? '✗ Avvikelse' : st === 'NA' ? 'Ej tillämpbar' : '–'
    return `<tr>
      <td><span style="color:#bbb;margin-right:6px;font-size:10px">${egenCount}.</span>${punkt}</td>
      <td class="${cls}" style="white-space:nowrap">${etk}</td>
      <td style="color:#666">${not}</td>
    </tr>`
  }).join('')

  // ── Godkännande-badge ────────────────────────────────────────────────────────
  const godkjHtml = p.godkannande
    ? `<div class="approval ${p.godkannande === 'godkand' ? 'approval-ok' : 'approval-ej'}">
        <span class="approval-icon">${p.godkannande === 'godkand' ? '✓' : '✗'}</span>
        <div>
          <div class="approval-text">${p.godkannande === 'godkand' ? 'Godkänd' : 'Ej godkänd'}</div>
          <div class="approval-sub">${p.godkannande === 'godkand'
            ? 'Arbetsplatsen kan påbörjas utan fara för säkerhet och hälsa.'
            : 'Ej godkänd – ansvarig informerad om fel och åtgärder.'}</div>
        </div>
      </div>` : ''

  // ── Meta-celler ──────────────────────────────────────────────────────────────
  const metaCeller = [
    { lbl: 'Porttyp',   val: p.portTyp   },
    { lbl: 'Kund',      val: p.kund      },
    { lbl: 'Adress',    val: p.adress    },
    { lbl: 'Datum',     val: p.datum     },
    { lbl: 'Tekniker',  val: p.tekniker  },
    ...(p.ordernummer ? [{ lbl: 'Ordernummer', val: p.ordernummer }] : [{ lbl: '', val: '' }]),
    ...(p.serienummer ? [{ lbl: 'Serienummer', val: p.serienummer }] : []),
  ]
  if (metaCeller.length % 2 !== 0) metaCeller.push({ lbl: '', val: '' })

  const metaHtml = `<div class="meta">${metaCeller.map(c =>
    `<div class="cell"><div class="lbl">${c.lbl}</div><div class="val">${c.val || '–'}</div></div>`
  ).join('')}</div>`

  const body = `
    ${pdfHeader(logoBase64, 'Monteringsprotokoll', p.portTyp || '', p.datum || '')}
    <div class="slbl">Information</div>
    ${metaHtml}
    <div class="slbl">Riskbedömning</div>
    <table>
      <thead><tr><th>Kontrollpunkt</th><th>Status</th><th style="width:30%">Åtgärd / notering</th></tr></thead>
      <tbody>${riskRows}${egenRiskRows}</tbody>
    </table>
    ${godkjHtml}
    <div class="page-break"></div>
    <div class="slbl">Egenkontroll — ${p.portTyp || ''}</div>
    <table>
      <thead><tr>
        <th style="width:58%">Kontrollpunkt</th>
        <th style="width:20%">Status</th>
        <th style="width:22%">Notering</th>
      </tr></thead>
      <tbody>${egenRows}</tbody>
    </table>
    ${p.signatur ? `
      <div class="slbl">Signatur tekniker</div>
      <div class="sig-section">
        <div class="sig-box">
          <div class="sig-label">${p.tekniker || ''}</div>
          <img src="${p.signatur}" style="max-width:300px;max-height:90px"/>
          <div class="sig-date">${p.datum || ''}</div>
        </div>
      </div>` : ''}
  `

  return pdfDoc('Monteringsprotokoll', body)
}
