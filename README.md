# NMV Portservice – Intern webbapp

Intern driftsystem för portserviceföretag. Hanterar portregister, serviceorder, monteringsprotokoll, ärenden, kalender och planering.

## Tech-stack

| Del | Teknik |
|-----|--------|
| Frontend | React 18 + Vite |
| Styling | CSS-variabler (src/index.css) |
| Backend / DB | Supabase (PostgreSQL + Auth + Storage) |
| Hosting | Netlify (auto-deploy från GitHub) |

---

## Snabbstart (lokal utveckling)

```bash
git clone https://github.com/johanfahlman92-cmyk/portservicetest.git
cd portservicetest
npm install
npm run dev          # http://localhost:5173
```

> Node.js 18+ krävs.

---

## Miljövariabler

Supabase-uppgifterna är hårdkodade i `src/lib/supabase.js` (fungerar direkt).  
För en renare setup kan de lyftas ut till en `.env`-fil:

```env
VITE_SUPABASE_URL=https://ldjfdzayedjkwmdcjcmd.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Uppdatera då `src/lib/supabase.js` till:
```js
import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

---

## Supabase-databas

- **URL:** `https://ldjfdzayedjkwmdcjcmd.supabase.co`
- **Dashboard:** https://supabase.com/dashboard/project/ldjfdzayedjkwmdcjcmd

### Tabeller

| Tabell | Viktigt |
|--------|---------|
| `kunder` | id: uuid DEFAULT gen_random_uuid() |
| `objekt` | Portregister. id: text DEFAULT gen_random_uuid() |
| `arenden` | id: text DEFAULT gen_random_uuid(). Kräver: `arkiverad boolean DEFAULT false` |
| `tekniker` | Medarbetare. Unik på namn |
| `bokningar` | Kalender. tek-kolumn = text (JSON-array: `["Anna","Björn"]`) |
| `fastigheter` | id: uuid DEFAULT gen_random_uuid() |
| `aktivitetslogg` | Händelselogg |
| `app_config` | Nyckel-värde: `protokoll_mallar`, `montage_mallar` (JSON) |
| `brukar_inbjudningar` | Inbjudningar för rollbaserad signup |
| `serviceorder` | Se schema nedan |
| `montageorder` | Montageplanering |

### serviceorder – skapa om den saknas
```sql
CREATE TABLE IF NOT EXISTS serviceorder (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nr               text,
  fastighet_id     uuid,
  fastighet_namn   text,
  kund             text,
  datum            date,
  tekniker         text,
  status           text DEFAULT 'planerad',
  objekt_ids       jsonb DEFAULT '[]',
  protokoll        jsonb DEFAULT '{}',
  signatur_tekniker text,
  signatur_kund    text,
  created_at       timestamptz DEFAULT now()
);
ALTER TABLE serviceorder ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autentiserade kan hantera serviceorder"
  ON serviceorder FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

### Kända SQL-fixes (redan körda, dokumenteras för referens)
```sql
ALTER TABLE kunder      ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE arenden     ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE fastigheter ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE objekt      ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE arenden     ADD COLUMN IF NOT EXISTS arkiverad boolean DEFAULT false;

CREATE POLICY "Inloggade kan lägga till kunder"
  ON kunder FOR INSERT TO authenticated WITH CHECK (true);
```

---

## Autentisering & roller

Supabase Auth med e-post + lösenord. Roll sätts i `user_metadata.roll`:

| Roll | Vy som visas |
|---|---|
| `admin` (eller inget) | Fullt admin-gränssnitt |
| `kontorist` | Felanmälningsformulär |
| `tekniker` | Mobil teknikervy |
| `kund` | Kundportal |

Roller hanteras via **Inställningar → Bjud in användare** (kräver inloggad admin).

---

## Deploy till Netlify

### Rekommenderat – Automatisk deploy via GitHub

1. Gå till [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project**
2. Koppla GitHub → välj `johanfahlman92-cmyk/portservicetest`
3. Bygg-inställningar:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. **Deploy site** – klart! Varje push till `main` deployas automatiskt.

### Miljövariabler i Netlify (om du lyfter ut credentials)
**Site → Site configuration → Environment variables** → lägg till:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Custom domän
**Site → Domain management → Add custom domain**

Lägg sedan till domänen i Supabase:  
**Authentication → URL Configuration → Site URL + Redirect URLs**

---

## Projektstruktur

```
src/
├── App.jsx                  # Root: auth, all data-state, rollrouting
├── index.css                # CSS-variabler och utility-klasser
├── lib/
│   └── supabase.js          # Supabase-klient
├── utils/
│   └── pdf.js               # Print Design System (PDF_CSS, pdfHeader, pdfDoc …)
├── data/
│   └── store.js             # Defaultdata: checklistmallar, RISKPUNKTER, statusConfig
├── components/
│   ├── Sidebar.jsx          # Marinblå fällbar sidmeny
│   ├── KundVäljare.jsx      # Sökbar kundväljar-komponent
│   └── DokumentZon.jsx      # Drag & drop filuppladdning (Supabase Storage)
└── views/
    ├── Dashboard.jsx
    ├── Portregister.jsx     # Portregister + serviceprotokoll-historik
    ├── Arenden.jsx          # Ärenden + inline felanmälan, arkivering, bulk-val
    ├── Serviceorder.jsx     # Serviceorder: planera → utföra → signera
    ├── Montering.jsx        # Monteringsprotokoll (wizard-flöde, PDF)
    ├── Montageplanering.jsx # Montageorder + protokoll
    ├── Planeringstavla.jsx  # Veckoplanering (alla eventtyper)
    ├── Kalender.jsx         # Veckokalender med virtuella SO/montageorder
    ├── Kunder.jsx
    ├── Fastigheter.jsx
    ├── Statistik.jsx
    ├── Installningar.jsx    # Admin: mallar, medarbetare, inbjudningar
    ├── Felanmalan.jsx       # Kontoristvy (fristående roll)
    ├── TeknikerVy.jsx       # Mobil teknikervy (fristående roll)
    └── KundPortal.jsx       # Kundportal (fristående roll)
```

---

## PDF-utskrifter

Alla utskrifter delar samma design via `src/utils/pdf.js`:

| Dokument | Fil | Funktion |
|---|---|---|
| Felanmälan | Arenden.jsx | `skrivUtArende(a)` |
| Serviceorder | Serviceorder.jsx | `skrivUt(order)` |
| Serviceprotokoll (historik) | Portregister.jsx | `skrivUtPDF()` |
| Monteringsprotokoll | Montering.jsx | `genereraHTML({...})` |
| Monteringsprotokoll (montageplanering) | Montageplanering.jsx | `genereraMontagePDF({...})` |
| Montageorder | Montageplanering.jsx | `skrivUt(order)` |

---

## Vanliga problem

**Appen laddas men är tom / ej inloggad**
→ Kontrollera att Supabase-URL och anon-nyckel stämmer i `src/lib/supabase.js`.

**CORS-fel mot Supabase**
→ Lägg till Netlify-domänen i Supabase → Authentication → URL Configuration.

**Tabell saknas / 404 från Supabase**
→ Kör SQL-scripten i avsnittet "Kända SQL-fixes" ovan.

**Vill byta Supabase-projekt**
→ Uppdatera URL + anon-nyckel i `src/lib/supabase.js` (eller `.env`).
