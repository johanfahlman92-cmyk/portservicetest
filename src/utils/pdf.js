import logo from '../image-1779305303942.png'

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
body{font-family:system-ui,-apple-system,sans-serif;padding:32px 40px;color:#1a1917;font-size:12px}

/* ── Dokument-header ── */
.doc-header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #1C3461;padding-bottom:16px;margin-bottom:28px}
.doc-type{font-size:11px;color:#888;margin-top:4px}
.doc-ref{font-size:22px;font-weight:700;color:#1C3461;text-align:right;line-height:1.1}
.doc-ref-sub{font-size:12px;color:#888;text-align:right;margin-top:3px}

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
        ? `<img src="${logoBase64}" style="height:52px;display:block" alt="NMV Portservice"/>`
        : `<span style="font-size:18px;font-weight:800;color:#1C3461">NMV Portservice</span>`}
      <div class="doc-type">${docType}</div>
    </div>
    <div>
      ${docRef    ? `<div class="doc-ref">${docRef}</div>`         : ''}
      ${docRefSub ? `<div class="doc-ref-sub">${docRefSub}</div>` : ''}
    </div>
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
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title><style>${PDF_CSS}</style></head><body>${bodyHtml}</body></html>`
}
