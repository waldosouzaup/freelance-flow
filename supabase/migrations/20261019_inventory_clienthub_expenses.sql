-- ==============================================================================
-- MIGRATION: Inventory Control, Client Hub and Operational Expenses
-- ==============================================================================

-- 1. INVENTORY ITEMS (PEÇAS E INSUMOS)
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

-- 2. INVENTORY MOVEMENTS (KARDEX / HISTÓRICO DE ENTRADAS E SAÍDAS)
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

-- 3. CLIENT HUB TOKENS (PORTAL DO CLIENTE - LINK PÚBLICO SEGURO)
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

-- 4. OPERATIONAL EXPENSES (DESPESAS OPERACIONAIS PARA DRE)
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
