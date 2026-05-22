import logo from '../image-1779305303942.png'

/**
 * Hämtar logotypen som base64-data-URL.
 * Delas av Arenden, Protokoll och Montageplanering.
 */
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

/**
 * Öppnar ett nytt fönster med HTML-innehåll och triggar utskrift.
 */
export function öppnaPrintFönster(html, titel = 'Skriv ut') {
  const win = window.open('', '_blank', 'width=860,height=1100')
  if (!win) return
  win.document.title = titel
  win.document.write(html)
  win.document.close()
  setTimeout(() => win.print(), 400)
}
