-- Add profitability tracking fields to projects table
-- The existing 'value' column is reused as estimated_revenue

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS actual_hours NUMERIC(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS actual_costs NUMERIC(12,2) DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN public.projects.estimated_hours IS 'Horas estimadas para o projeto';
COMMENT ON COLUMN public.projects.actual_hours IS 'Horas reais gastas no projeto';
COMMENT ON COLUMN public.projects.actual_costs IS 'Custos reais do projeto';
COMMENT ON COLUMN public.projects.value IS 'Receita estimada / valor orçado do projeto';
