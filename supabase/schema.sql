-- ==============================================================================
-- FREELANCE FLOW - COMPREHENSIVE DATABASE SCHEMA (SUPABASE)
-- ==============================================================================
-- This script contains the complete database definition:
-- - Custom Enums and Utility Functions
-- - Core Tables (profiles, clients, projects, project_stages, pricing_parameters, budgets, budget_counter)
-- - Row Level Security (RLS) and Policies
-- - Automated Triggers (updated_at, user profile creation, validation)
-- - Storage Bucket (avatars) and Storage RLS Policies
-- - RPC Functions (atomic budget counter, ping/keepalive)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ENUMS & EXTENSIONS
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_status') THEN
    CREATE TYPE public.project_status AS ENUM ('em_andamento', 'concluido', 'pausado', 'cancelado');
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. UTILITY FUNCTIONS
-- ------------------------------------------------------------------------------
-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Lightweight ping function for keep-alive monitoring (returns 'pong')
CREATE OR REPLACE FUNCTION public.ping()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 'pong'::text;
$$;

-- ------------------------------------------------------------------------------
-- 3. PROFILES TABLE & TRIGGERS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  company_name TEXT,
  phone TEXT,
  website TEXT,
  pix_key_type TEXT,
  pix_key TEXT,
  cnpj TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON public.profiles 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Automatically create a profile record when a new user signs up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 4. CLIENTS TABLE & TRIGGERS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own clients" ON public.clients;
CREATE POLICY "Users can view own clients" 
  ON public.clients FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own clients" ON public.clients;
CREATE POLICY "Users can insert own clients" 
  ON public.clients FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own clients" ON public.clients;
CREATE POLICY "Users can update own clients" 
  ON public.clients FOR UPDATE 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own clients" ON public.clients;
CREATE POLICY "Users can delete own clients" 
  ON public.clients FOR DELETE 
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_clients_updated_at ON public.clients;
CREATE TRIGGER update_clients_updated_at 
  BEFORE UPDATE ON public.clients 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Prevent deleting clients that have linked projects
CREATE OR REPLACE FUNCTION public.prevent_client_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.projects WHERE client_id = OLD.id) THEN
    RAISE EXCEPTION 'Não é possível excluir um cliente com projetos vinculados';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS prevent_client_delete_trigger ON public.clients;
CREATE TRIGGER prevent_client_delete_trigger
  BEFORE DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.prevent_client_delete();

-- ------------------------------------------------------------------------------
-- 5. PROJECTS TABLE & TRIGGERS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  status public.project_status NOT NULL DEFAULT 'em_andamento',
  value NUMERIC(12,2) DEFAULT 0,
  estimated_hours NUMERIC(10,2) DEFAULT NULL,
  actual_hours NUMERIC(10,2) DEFAULT NULL,
  actual_costs NUMERIC(12,2) DEFAULT 0,
  deadline DATE,
  links TEXT[],
  general_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.projects.estimated_hours IS 'Horas estimadas para o projeto';
COMMENT ON COLUMN public.projects.actual_hours IS 'Horas reais gastas no projeto';
COMMENT ON COLUMN public.projects.actual_costs IS 'Custos reais do projeto';
COMMENT ON COLUMN public.projects.value IS 'Receita estimada / valor orçado do projeto';

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
CREATE POLICY "Users can view own projects" 
  ON public.projects FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
CREATE POLICY "Users can insert own projects" 
  ON public.projects FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
CREATE POLICY "Users can update own projects" 
  ON public.projects FOR UPDATE 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;
CREATE POLICY "Users can delete own projects" 
  ON public.projects FOR DELETE 
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
CREATE TRIGGER update_projects_updated_at 
  BEFORE UPDATE ON public.projects 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 6. PROJECT STAGES (CHECKLIST)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own stages" ON public.project_stages;
CREATE POLICY "Users can view own stages" 
  ON public.project_stages FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own stages" ON public.project_stages;
CREATE POLICY "Users can insert own stages" 
  ON public.project_stages FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own stages" ON public.project_stages;
CREATE POLICY "Users can update own stages" 
  ON public.project_stages FOR UPDATE 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own stages" ON public.project_stages;
CREATE POLICY "Users can delete own stages" 
  ON public.project_stages FOR DELETE 
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_stages_updated_at ON public.project_stages;
CREATE TRIGGER update_stages_updated_at 
  BEFORE UPDATE ON public.project_stages 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 7. PRICING PARAMETERS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pricing_parameters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  hourly_rate NUMERIC(10,2) NOT NULL DEFAULT 100,
  default_margin NUMERIC(5,2) NOT NULL DEFAULT 20,
  default_complexity NUMERIC(3,1) NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pricing_parameters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own params" ON public.pricing_parameters;
CREATE POLICY "Users can view own params" 
  ON public.pricing_parameters FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own params" ON public.pricing_parameters;
CREATE POLICY "Users can insert own params" 
  ON public.pricing_parameters FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own params" ON public.pricing_parameters;
CREATE POLICY "Users can update own params" 
  ON public.pricing_parameters FOR UPDATE 
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_pricing_params_updated_at ON public.pricing_parameters;
CREATE TRIGGER update_pricing_params_updated_at 
  BEFORE UPDATE ON public.pricing_parameters 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 8. BUDGETS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  budget_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'aguardando',
  client_name TEXT NOT NULL,
  client_email TEXT,
  project_name TEXT NOT NULL,
  total_value NUMERIC NOT NULL DEFAULT 0,
  budget_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own budgets" ON public.budgets;
CREATE POLICY "Users can manage their own budgets"
  ON public.budgets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON public.budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_status ON public.budgets(user_id, status);

DROP TRIGGER IF EXISTS update_budgets_updated_at ON public.budgets;
CREATE TRIGGER update_budgets_updated_at 
  BEFORE UPDATE ON public.budgets 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 9. BUDGET COUNTER & GENERATOR
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.budget_counter (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, year)
);

ALTER TABLE public.budget_counter ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own budget counters" ON public.budget_counter;
CREATE POLICY "Users can manage their own budget counters"
  ON public.budget_counter FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.get_next_budget_number(p_user_id UUID, p_year INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  INSERT INTO public.budget_counter (user_id, year, last_number)
  VALUES (p_user_id, p_year, 1)
  ON CONFLICT (user_id, year)
  DO UPDATE SET last_number = budget_counter.last_number + 1, updated_at = now()
  RETURNING last_number INTO next_num;
  
  RETURN next_num;
END;
$$;

-- ------------------------------------------------------------------------------
-- 10. STORAGE BUCKETS & POLICIES (AVATARS)
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Public can read avatars" ON storage.objects;
CREATE POLICY "Public can read avatars"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');
