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
  cpf_cnpj TEXT,
  cep TEXT,
  address TEXT,
  address_number TEXT,
  complement TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
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
  email_sent_at TIMESTAMPTZ,
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

-- ------------------------------------------------------------------------------
-- 11. INVENTORY ITEMS (PEÇAS E INSUMOS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sku TEXT,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'pecas',
  unit TEXT NOT NULL DEFAULT 'UN',
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 0,
  min_quantity NUMERIC(10, 2) NOT NULL DEFAULT 0,
  cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  sale_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own inventory items" ON public.inventory_items;
CREATE POLICY "Users can view own inventory items"
  ON public.inventory_items FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own inventory items" ON public.inventory_items;
CREATE POLICY "Users can insert own inventory items"
  ON public.inventory_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own inventory items" ON public.inventory_items;
CREATE POLICY "Users can update own inventory items"
  ON public.inventory_items FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own inventory items" ON public.inventory_items;
CREATE POLICY "Users can delete own inventory items"
  ON public.inventory_items FOR DELETE
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_inventory_items_updated_at ON public.inventory_items;
CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_inventory_items_user_id ON public.inventory_items(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_name ON public.inventory_items(user_id, lower(name));

-- ------------------------------------------------------------------------------
-- 12. INVENTORY MOVEMENTS (KARDEX / HISTÓRICO)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('entrada', 'saida_orcamento', 'ajuste_manual', 'devolucao')),
  quantity NUMERIC(10, 2) NOT NULL,
  unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  reference_budget_id UUID REFERENCES public.budgets(id) ON DELETE SET NULL,
  reference_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own inventory movements" ON public.inventory_movements;
CREATE POLICY "Users can view own inventory movements"
  ON public.inventory_movements FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own inventory movements" ON public.inventory_movements;
CREATE POLICY "Users can insert own inventory movements"
  ON public.inventory_movements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_user_id ON public.inventory_movements(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_id ON public.inventory_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_budget_id ON public.inventory_movements(reference_budget_id);

-- ------------------------------------------------------------------------------
-- 13. CLIENT HUB TOKENS (PORTAL DO CLIENTE - LINK PÚBLICO SEGURO)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_hub_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  budget_id UUID REFERENCES public.budgets(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  allow_client_approval BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_hub_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own hub tokens" ON public.client_hub_tokens;
CREATE POLICY "Users can manage own hub tokens"
  ON public.client_hub_tokens FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_client_hub_tokens_token ON public.client_hub_tokens(token);
CREATE INDEX IF NOT EXISTS idx_client_hub_tokens_project ON public.client_hub_tokens(project_id);
CREATE INDEX IF NOT EXISTS idx_client_hub_tokens_budget ON public.client_hub_tokens(budget_id);

-- RPC: Leitura de dados públicos pelo Client Hub
CREATE OR REPLACE FUNCTION public.get_client_hub_data(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_record RECORD;
  v_result JSONB;
BEGIN
  SELECT * INTO v_token_record
  FROM public.client_hub_tokens
  WHERE token = p_token AND is_active = true
    AND (expires_at IS NULL OR expires_at > now());

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Link inválido, desativado ou expirado.');
  END IF;

  UPDATE public.client_hub_tokens
  SET last_accessed_at = now()
  WHERE id = v_token_record.id;

  SELECT jsonb_build_object(
    'success', true,
    'token', v_token_record.token,
    'allow_client_approval', v_token_record.allow_client_approval,
    'provider', (
      SELECT jsonb_build_object(
        'display_name', p.display_name,
        'company_name', p.company_name,
        'phone', p.phone,
        'website', p.website,
        'avatar_url', p.avatar_url,
        'cnpj', p.cnpj,
        'address', p.address,
        'pix_key', p.pix_key,
        'pix_key_type', p.pix_key_type
      )
      FROM public.profiles p
      WHERE p.user_id = v_token_record.user_id
    ),
    'project', (
      SELECT jsonb_build_object(
        'id', pr.id,
        'name', pr.name,
        'description', pr.description,
        'status', pr.status,
        'deadline', pr.deadline,
        'value', pr.value,
        'general_notes', pr.general_notes,
        'stages', (
          SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
              'id', st.id,
              'title', st.title,
              'completed', st.completed,
              'sort_order', st.sort_order
            ) ORDER BY st.sort_order ASC
          ), '[]'::jsonb)
          FROM public.project_stages st
          WHERE st.project_id = pr.id
        )
      )
      FROM public.projects pr
      WHERE pr.id = v_token_record.project_id
    ),
    'budget', (
      SELECT jsonb_build_object(
        'id', bg.id,
        'budget_number', bg.budget_number,
        'status', bg.status,
        'client_name', bg.client_name,
        'project_name', bg.project_name,
        'total_value', bg.total_value,
        'created_at', bg.created_at,
        'budget_data', bg.budget_data
      )
      FROM public.budgets bg
      WHERE bg.id = v_token_record.budget_id
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ------------------------------------------------------------------------------
-- 14. OPERATIONAL EXPENSES (DESPESAS OPERACIONAIS PARA DRE)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.operational_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'administrativa' CHECK (
    category IN ('administrativa', 'software_cloud', 'ferramentas_oficina', 'infraestrutura', 'comercial_marketing', 'tributos_taxas', 'outros')
  ),
  amount NUMERIC(12, 2) NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurring_period TEXT DEFAULT 'mensal' CHECK (recurring_period IN ('mensal', 'anual', 'avulso')),
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.operational_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own operational expenses" ON public.operational_expenses;
CREATE POLICY "Users can view own operational expenses"
  ON public.operational_expenses FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own operational expenses" ON public.operational_expenses;
CREATE POLICY "Users can insert own operational expenses"
  ON public.operational_expenses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own operational expenses" ON public.operational_expenses;
CREATE POLICY "Users can update own operational expenses"
  ON public.operational_expenses FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own operational expenses" ON public.operational_expenses;
CREATE POLICY "Users can delete own operational expenses"
  ON public.operational_expenses FOR DELETE
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_operational_expenses_updated_at ON public.operational_expenses;
CREATE TRIGGER update_operational_expenses_updated_at
  BEFORE UPDATE ON public.operational_expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_operational_expenses_user_date ON public.operational_expenses(user_id, expense_date);

