# Portservice – Servicesystem

React-app byggd med Vite. Kör lokalt i VS Code.

## Kom igång

```bash
# Installera beroenden
npm install

# Starta utvecklingsserver
npm run dev
```

Öppna http://localhost:5173 i webbläsaren.

## Struktur

```
src/
  components/
    Sidebar.jsx         – Navigering
  views/
    Dashboard.jsx       – Översikt, larm, veckans besök
    Portregister.jsx    – Alla objekt, objektskort, historik
    Arenden.jsx         – Öppna och pågående ärenden
    Protokoll.jsx       – Digital checklista G/J/A, signatur (tillval)
    Kalender.jsx        – Veckovy med besök per tekniker
    Kunder.jsx          – Kund­register (företag & privatpersoner)
    NyttArende.jsx      – Kontoristvy: Kontakta kund / Felanmälan / Service
  data/
    store.js            – Mockdata (objekt, ärenden, kunder, tekniker)
  App.jsx               – Routing mellan vyer
  index.css             – Design-tokens och globala stilar
  main.jsx              – Entry point
```

## Moduler i systemet

| Modul | Vy | Beskrivning |
|---|---|---|
| Portregister | Portregister | Alla objekt med status, intervall, historik |
| Ärenden | Arenden | Felanmälningar och uppföljningar |
| Protokoll | Protokoll | Serviceprotokoll G/J/A per porttyp |
| Kalender | Kalender | Resursplanering per vecka |
| Kunder | Kunder | Företag och privatpersoner |
| Nytt ärende | NyttArende | Kontoristens tre ärendetyper |

## Ärendetyper (kontorist)

- **Kontakta kund** – loggar samtal, inget besök
- **Felanmälan** – utryckning, tekniker tilldelas
- **Planerad service** – manuell bokning utöver automatiskt intervall

> Montering skapas bara av admin och ingår inte i kontoristens vy.

## Protokollstatus

| Kod | Betydelse |
|---|---|
| G | Godkänt |
| J | Justerad/Åtgärdad |
| A | Anmärkning – skapar uppföljningsärende |

Signatur är **tillval** på service och felanmälan.  
Signatur är **alltid obligatorisk** vid montering (EN 13241).

## Serviceintervall

- Standard: var 6:e månad (2× per år)
- Interna larm i admin: 30 dagar + 14 dagar innan + vid förfall
- **Inga automatiska utskick till kund**
- E-post till kund vid servicebeställning: manuellt val av admin

## Bygga för produktion

```bash
npm run build
```
