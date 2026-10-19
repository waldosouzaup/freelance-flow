-- Migration: Add address and CPF/CNPJ fields to clients, and email_sent_at to budgets
-- Date: 2026-10-19

-- 1. Add Address and Tax fields to clients table
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS cep TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS address_number TEXT,
  ADD COLUMN IF NOT EXISTS complement TEXT,
  ADD COLUMN IF NOT EXISTS neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT;

COMMENT ON COLUMN public.clients.cep IS 'CEP do cliente para preenchimento via ViaCEP';
COMMENT ON COLUMN public.clients.address IS 'Logradouro / Rua do endereço do cliente';
COMMENT ON COLUMN public.clients.address_number IS 'Número do endereço';
COMMENT ON COLUMN public.clients.complement IS 'Complemento do endereço (apto, sala, etc)';
COMMENT ON COLUMN public.clients.neighborhood IS 'Bairro do cliente';
COMMENT ON COLUMN public.clients.city IS 'Cidade do cliente';
COMMENT ON COLUMN public.clients.state IS 'UF / Estado do cliente';
COMMENT ON COLUMN public.clients.cpf_cnpj IS 'CPF ou CNPJ do cliente';

-- 2. Add email_sent_at to budgets table
ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.budgets.email_sent_at IS 'Data e hora do último envio do orçamento por e-mail';
