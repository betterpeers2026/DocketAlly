-- ============================================================
-- DocketAlly — Phase 1 Database Schema
-- Run this SQL in the Supabase Dashboard SQL Editor
-- ============================================================

-- 1. Profiles (extends auth.users)
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT,
  full_name   TEXT,
  stage       TEXT DEFAULT 'Employed',
  plan        TEXT DEFAULT 'free',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Records (core feature)
CREATE TABLE records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  entry_type  TEXT NOT NULL,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  time        TIME,
  narrative   TEXT NOT NULL,
  people      TEXT,
  facts       TEXT,
  follow_up   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Record attachments
CREATE TABLE record_attachments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id   UUID NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_name   TEXT NOT NULL,
  file_url    TEXT NOT NULL,
  file_type   TEXT,
  file_size   BIGINT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
ALTER TABLE record_attachments ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Records
CREATE POLICY "Users can view own records"
  ON records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own records"
  ON records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own records"
  ON records FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own records"
  ON records FOR DELETE
  USING (auth.uid() = user_id);

-- Record attachments
CREATE POLICY "Users can view own attachments"
  ON record_attachments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attachments"
  ON record_attachments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own attachments"
  ON record_attachments FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- Triggers
-- ============================================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at_records
  BEFORE UPDATE ON records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- Storage Bucket (manual setup required)
-- ============================================================
-- After running this SQL, go to Supabase Dashboard > Storage:
--
-- 1. Create a new bucket named "record-files" (Private, not public)
--
-- 2. Add these Storage policies:
--
--    SELECT policy (allow users to read their own files):
--      auth.uid()::text = (storage.foldername(name))[1]
--
--    INSERT policy (allow users to upload to their own folder):
--      auth.uid()::text = (storage.foldername(name))[1]
--
--    DELETE policy (allow users to delete their own files):
--      auth.uid()::text = (storage.foldername(name))[1]
--
-- File path format: {user_id}/{record_id}/{filename}

-- ============================================================
-- Phase 2: Vault — Secure Document Storage
-- Run this SQL in the Supabase Dashboard SQL Editor
-- ============================================================

CREATE TABLE vault_documents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_name         TEXT NOT NULL,
  file_url          TEXT NOT NULL,
  file_type         TEXT,
  file_size         BIGINT,
  category          TEXT DEFAULT 'General',
  notes             TEXT,
  linked_record_id  UUID REFERENCES records(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vault_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vault docs"
  ON vault_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vault docs"
  ON vault_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vault docs"
  ON vault_documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own vault docs"
  ON vault_documents FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER set_updated_at_vault_documents
  BEFORE UPDATE ON vault_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- Vault Storage Bucket (manual setup required)
-- ============================================================
-- In Supabase Dashboard > Storage:
--
-- 1. Create a new bucket named "vault-files" (Private, not public)
--
-- 2. Add these Storage policies:
--
--    SELECT policy:  auth.uid()::text = (storage.foldername(name))[1]
--    INSERT policy:  auth.uid()::text = (storage.foldername(name))[1]
--    DELETE policy:  auth.uid()::text = (storage.foldername(name))[1]
--
-- File path format: {user_id}/{doc_id}/{filename}
