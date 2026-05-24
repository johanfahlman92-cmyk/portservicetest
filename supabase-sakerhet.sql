-- ============================================================
-- PORTSERVICE — SÄKERHETSMIGRATION
-- Kör detta i Supabase: Dashboard → SQL Editor → New query
-- ============================================================

-- ── 1. SÄKER ROLLTABELL ──────────────────────────────────────
-- Ersätter user_metadata (som användaren kan ändra själv)
-- med en server-kontrollerad tabell.

CREATE TABLE IF NOT EXISTS user_roles (
  user_id   uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  roll      text NOT NULL DEFAULT 'kund' CHECK (roll IN ('admin','tekniker','kund')),
  kund_id   uuid REFERENCES kunder(id) ON DELETE SET NULL,
  kund_namn text,
  created_at timestamptz DEFAULT now()
);

-- ── 2. TRIGGER — sätt roll automatiskt från inbjudan vid signup ──
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  inv record;
BEGIN
  SELECT * INTO inv
  FROM brukar_inbjudningar
  WHERE email = NEW.email
  LIMIT 1;

  IF FOUND THEN
    INSERT INTO user_roles (user_id, roll, kund_id, kund_namn)
    VALUES (NEW.id, inv.roll, inv.kund_id, inv.kund_namn)
    ON CONFLICT (user_id) DO UPDATE
      SET roll = inv.roll, kund_id = inv.kund_id, kund_namn = inv.kund_namn;

    DELETE FROM brukar_inbjudningar WHERE email = NEW.email;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── 3. HJÄLPFUNKTIONER för RLS-policies ─────────────────────
-- Prioriterar den säkra rolltabellen, faller tillbaka på user_metadata
-- (för befintliga admin/tekniker-konton som skapades innan migrationen)

CREATE OR REPLACE FUNCTION auth.roll()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT roll FROM user_roles WHERE user_id = auth.uid()),
    (auth.jwt() -> 'user_metadata' ->> 'roll'),
    ''
  )
$$;

CREATE OR REPLACE FUNCTION auth.kund_namn()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT kund_namn FROM user_roles WHERE user_id = auth.uid()),
    (auth.jwt() -> 'user_metadata' ->> 'kund_namn'),
    ''
  )
$$;

CREATE OR REPLACE FUNCTION auth.kund_id_val()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT kund_id FROM user_roles WHERE user_id = auth.uid()),
    (auth.jwt() -> 'user_metadata' ->> 'kund_id')::uuid
  )
$$;

-- ── 4. RLS PÅ ALLA TABELLER ──────────────────────────────────

-- Ta bort gamla policies om de finns (säker att köra flera gånger)
DO $$ DECLARE r record;
BEGIN
  FOR r IN SELECT schemaname, tablename, policyname
           FROM pg_policies
           WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- USER_ROLES
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_roles_own"
  ON user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_roles_admin"
  ON user_roles FOR ALL TO authenticated
  USING (auth.roll() = 'admin')
  WITH CHECK (auth.roll() = 'admin');

-- KUNDER
ALTER TABLE kunder ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kunder_admin"
  ON kunder FOR ALL TO authenticated
  USING (auth.roll() = 'admin')
  WITH CHECK (auth.roll() = 'admin');

CREATE POLICY "kunder_tekniker_read"
  ON kunder FOR SELECT TO authenticated
  USING (auth.roll() = 'tekniker');

CREATE POLICY "kunder_kund_own"
  ON kunder FOR SELECT TO authenticated
  USING (auth.roll() = 'kund' AND id = auth.kund_id_val());

-- FASTIGHETER
ALTER TABLE fastigheter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fastigheter_admin"
  ON fastigheter FOR ALL TO authenticated
  USING (auth.roll() = 'admin')
  WITH CHECK (auth.roll() = 'admin');

CREATE POLICY "fastigheter_tekniker_read"
  ON fastigheter FOR SELECT TO authenticated
  USING (auth.roll() = 'tekniker');

CREATE POLICY "fastigheter_kund_own"
  ON fastigheter FOR SELECT TO authenticated
  USING (auth.roll() = 'kund' AND kund = auth.kund_namn());

-- OBJEKT (Portar)
ALTER TABLE objekt ENABLE ROW LEVEL SECURITY;

CREATE POLICY "objekt_admin"
  ON objekt FOR ALL TO authenticated
  USING (auth.roll() = 'admin')
  WITH CHECK (auth.roll() = 'admin');

CREATE POLICY "objekt_tekniker"
  ON objekt FOR ALL TO authenticated
  USING (auth.roll() = 'tekniker')
  WITH CHECK (auth.roll() = 'tekniker');

CREATE POLICY "objekt_kund_own"
  ON objekt FOR SELECT TO authenticated
  USING (auth.roll() = 'kund' AND kund = auth.kund_namn());

-- ARENDEN
ALTER TABLE arenden ENABLE ROW LEVEL SECURITY;

CREATE POLICY "arenden_admin"
  ON arenden FOR ALL TO authenticated
  USING (auth.roll() = 'admin')
  WITH CHECK (auth.roll() = 'admin');

CREATE POLICY "arenden_tekniker"
  ON arenden FOR ALL TO authenticated
  USING (auth.roll() = 'tekniker')
  WITH CHECK (auth.roll() = 'tekniker');

CREATE POLICY "arenden_kund_read"
  ON arenden FOR SELECT TO authenticated
  USING (auth.roll() = 'kund' AND kund = auth.kund_namn());

CREATE POLICY "arenden_kund_insert"
  ON arenden FOR INSERT TO authenticated
  WITH CHECK (auth.roll() = 'kund' AND kund = auth.kund_namn());

-- SERVICEORDER
ALTER TABLE serviceorder ENABLE ROW LEVEL SECURITY;

CREATE POLICY "serviceorder_admin"
  ON serviceorder FOR ALL TO authenticated
  USING (auth.roll() = 'admin')
  WITH CHECK (auth.roll() = 'admin');

CREATE POLICY "serviceorder_tekniker"
  ON serviceorder FOR ALL TO authenticated
  USING (auth.roll() = 'tekniker')
  WITH CHECK (auth.roll() = 'tekniker');

CREATE POLICY "serviceorder_kund_read"
  ON serviceorder FOR SELECT TO authenticated
  USING (auth.roll() = 'kund' AND kund = auth.kund_namn());

-- MONTAGEORDER
ALTER TABLE montageorder ENABLE ROW LEVEL SECURITY;

CREATE POLICY "montageorder_admin"
  ON montageorder FOR ALL TO authenticated
  USING (auth.roll() = 'admin')
  WITH CHECK (auth.roll() = 'admin');

CREATE POLICY "montageorder_tekniker"
  ON montageorder FOR ALL TO authenticated
  USING (auth.roll() = 'tekniker')
  WITH CHECK (auth.roll() = 'tekniker');

-- TEKNIKER
ALTER TABLE tekniker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tekniker_admin"
  ON tekniker FOR ALL TO authenticated
  USING (auth.roll() = 'admin')
  WITH CHECK (auth.roll() = 'admin');

CREATE POLICY "tekniker_read"
  ON tekniker FOR SELECT TO authenticated
  USING (auth.roll() IN ('admin', 'tekniker'));

-- APP_CONFIG (företagsinfo, bokningar, protokollmallar)
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_config_admin"
  ON app_config FOR ALL TO authenticated
  USING (auth.roll() = 'admin')
  WITH CHECK (auth.roll() = 'admin');

CREATE POLICY "app_config_tekniker_read"
  ON app_config FOR SELECT TO authenticated
  USING (auth.roll() = 'tekniker');

-- BRUKAR_INBJUDNINGAR
ALTER TABLE brukar_inbjudningar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inbjudningar_admin"
  ON brukar_inbjudningar FOR ALL TO authenticated
  USING (auth.roll() = 'admin')
  WITH CHECK (auth.roll() = 'admin');

-- Inloggad användare kan läsa sin egen inbjudan (behövs vid signup-flödet)
CREATE POLICY "inbjudningar_own"
  ON brukar_inbjudningar FOR SELECT TO authenticated
  USING (email = auth.email());

-- ── 5. MIGRERA BEFINTLIGA ANVÄNDARE ──────────────────────────
-- Kör detta EN gång för att flytta befintliga roller till user_roles-tabellen.
-- Kräver att du vet vilka user_id:n dina befintliga admin/tekniker har.
-- Gå till Authentication → Users i Supabase för att hitta UUID.
--
-- Exempel (ersätt UUID:n med riktiga värden):
--
-- INSERT INTO user_roles (user_id, roll)
-- VALUES
--   ('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', 'admin'),
--   ('yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy', 'tekniker')
-- ON CONFLICT (user_id) DO UPDATE SET roll = EXCLUDED.roll;

-- ============================================================
-- KLART! Verifiera med:
--   SELECT * FROM user_roles;
--   SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
-- ============================================================
