-- ============================================================
-- PORTSERVICE — SÄKERHETSMIGRATION (v2)
-- Kör detta i Supabase: Dashboard → SQL Editor → New query
-- ============================================================

-- ── 1. SÄKER ROLLTABELL ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_roles (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  roll       text NOT NULL DEFAULT 'kund' CHECK (roll IN ('admin','tekniker','kund')),
  kund_id    text,
  kund_namn  text,
  created_at timestamptz DEFAULT now()
);

-- ── 2. TRIGGER — sätt roll från inbjudan vid signup ──────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  inv record;
BEGIN
  SELECT * INTO inv
  FROM public.brukar_inbjudningar
  WHERE email = NEW.email
  LIMIT 1;

  IF FOUND THEN
    INSERT INTO public.user_roles (user_id, roll, kund_id, kund_namn)
    VALUES (NEW.id, inv.roll, inv.kund_id, inv.kund_namn)
    ON CONFLICT (user_id) DO UPDATE
      SET roll = inv.roll, kund_id = inv.kund_id, kund_namn = inv.kund_namn;

    DELETE FROM public.brukar_inbjudningar WHERE email = NEW.email;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 3. HJÄLPFUNKTIONER i public-schemat ──────────────────────
-- (auth-schemat är låst i Supabase — vi använder public istället)

CREATE OR REPLACE FUNCTION public.get_roll()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT roll FROM public.user_roles WHERE user_id = auth.uid()),
    (auth.jwt() -> 'user_metadata' ->> 'roll'),
    ''
  )
$$;

CREATE OR REPLACE FUNCTION public.get_kund_namn()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT kund_namn FROM public.user_roles WHERE user_id = auth.uid()),
    (auth.jwt() -> 'user_metadata' ->> 'kund_namn'),
    ''
  )
$$;

CREATE OR REPLACE FUNCTION public.get_kund_id()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT kund_id FROM public.user_roles WHERE user_id = auth.uid()),
    (auth.jwt() -> 'user_metadata' ->> 'kund_id')
  )
$$;

-- ── 4. RLS PÅ ALLA TABELLER ──────────────────────────────────

-- Ta bort gamla policies (säker att köra flera gånger)
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
  USING (public.get_roll() = 'admin')
  WITH CHECK (public.get_roll() = 'admin');

-- KUNDER
ALTER TABLE kunder ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kunder_admin"
  ON kunder FOR ALL TO authenticated
  USING (public.get_roll() = 'admin')
  WITH CHECK (public.get_roll() = 'admin');

CREATE POLICY "kunder_tekniker_read"
  ON kunder FOR SELECT TO authenticated
  USING (public.get_roll() = 'tekniker');

CREATE POLICY "kunder_kund_own"
  ON kunder FOR SELECT TO authenticated
  USING (public.get_roll() = 'kund' AND id::text = public.get_kund_id());

-- FASTIGHETER
ALTER TABLE fastigheter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fastigheter_admin"
  ON fastigheter FOR ALL TO authenticated
  USING (public.get_roll() = 'admin')
  WITH CHECK (public.get_roll() = 'admin');

CREATE POLICY "fastigheter_tekniker_read"
  ON fastigheter FOR SELECT TO authenticated
  USING (public.get_roll() = 'tekniker');

CREATE POLICY "fastigheter_kund_own"
  ON fastigheter FOR SELECT TO authenticated
  USING (public.get_roll() = 'kund' AND kund = public.get_kund_namn());

-- OBJEKT (Portar)
ALTER TABLE objekt ENABLE ROW LEVEL SECURITY;

CREATE POLICY "objekt_admin"
  ON objekt FOR ALL TO authenticated
  USING (public.get_roll() = 'admin')
  WITH CHECK (public.get_roll() = 'admin');

CREATE POLICY "objekt_tekniker"
  ON objekt FOR ALL TO authenticated
  USING (public.get_roll() = 'tekniker')
  WITH CHECK (public.get_roll() = 'tekniker');

CREATE POLICY "objekt_kund_own"
  ON objekt FOR SELECT TO authenticated
  USING (public.get_roll() = 'kund' AND kund = public.get_kund_namn());

-- ARENDEN
ALTER TABLE arenden ENABLE ROW LEVEL SECURITY;

CREATE POLICY "arenden_admin"
  ON arenden FOR ALL TO authenticated
  USING (public.get_roll() = 'admin')
  WITH CHECK (public.get_roll() = 'admin');

CREATE POLICY "arenden_tekniker"
  ON arenden FOR ALL TO authenticated
  USING (public.get_roll() = 'tekniker')
  WITH CHECK (public.get_roll() = 'tekniker');

CREATE POLICY "arenden_kund_read"
  ON arenden FOR SELECT TO authenticated
  USING (public.get_roll() = 'kund' AND kund = public.get_kund_namn());

CREATE POLICY "arenden_kund_insert"
  ON arenden FOR INSERT TO authenticated
  WITH CHECK (public.get_roll() = 'kund' AND kund = public.get_kund_namn());

-- SERVICEORDER
ALTER TABLE serviceorder ENABLE ROW LEVEL SECURITY;

CREATE POLICY "serviceorder_admin"
  ON serviceorder FOR ALL TO authenticated
  USING (public.get_roll() = 'admin')
  WITH CHECK (public.get_roll() = 'admin');

CREATE POLICY "serviceorder_tekniker"
  ON serviceorder FOR ALL TO authenticated
  USING (public.get_roll() = 'tekniker')
  WITH CHECK (public.get_roll() = 'tekniker');

CREATE POLICY "serviceorder_kund_read"
  ON serviceorder FOR SELECT TO authenticated
  USING (public.get_roll() = 'kund' AND kund = public.get_kund_namn());

-- MONTAGEORDER
ALTER TABLE montageorder ENABLE ROW LEVEL SECURITY;

CREATE POLICY "montageorder_admin"
  ON montageorder FOR ALL TO authenticated
  USING (public.get_roll() = 'admin')
  WITH CHECK (public.get_roll() = 'admin');

CREATE POLICY "montageorder_tekniker"
  ON montageorder FOR ALL TO authenticated
  USING (public.get_roll() = 'tekniker')
  WITH CHECK (public.get_roll() = 'tekniker');

-- TEKNIKER
ALTER TABLE tekniker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tekniker_admin"
  ON tekniker FOR ALL TO authenticated
  USING (public.get_roll() = 'admin')
  WITH CHECK (public.get_roll() = 'admin');

CREATE POLICY "tekniker_read"
  ON tekniker FOR SELECT TO authenticated
  USING (public.get_roll() IN ('admin', 'tekniker'));

-- APP_CONFIG
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_config_admin"
  ON app_config FOR ALL TO authenticated
  USING (public.get_roll() = 'admin')
  WITH CHECK (public.get_roll() = 'admin');

CREATE POLICY "app_config_tekniker_read"
  ON app_config FOR SELECT TO authenticated
  USING (public.get_roll() = 'tekniker');

-- BRUKAR_INBJUDNINGAR
ALTER TABLE brukar_inbjudningar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inbjudningar_admin"
  ON brukar_inbjudningar FOR ALL TO authenticated
  USING (public.get_roll() = 'admin')
  WITH CHECK (public.get_roll() = 'admin');

CREATE POLICY "inbjudningar_own"
  ON brukar_inbjudningar FOR SELECT TO authenticated
  USING (email = auth.email());

-- ── 5. MIGRERA BEFINTLIGA ANVÄNDARE ──────────────────────────
-- Kör separat efter att du hittat UUID:n i Authentication → Users:
--
-- INSERT INTO user_roles (user_id, roll)
-- VALUES
--   ('din-admin-uuid-här', 'admin'),
--   ('tekniker-uuid-här',  'tekniker')
-- ON CONFLICT (user_id) DO UPDATE SET roll = EXCLUDED.roll;

-- ── VERIFIERA ─────────────────────────────────────────────────
-- SELECT * FROM user_roles;
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
-- ============================================================
