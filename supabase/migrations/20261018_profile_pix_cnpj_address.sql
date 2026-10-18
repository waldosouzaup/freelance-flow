-- Add Pix, CNPJ and Address fields to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS pix_key_type TEXT,
  ADD COLUMN IF NOT EXISTS pix_key TEXT,
  ADD COLUMN IF NOT EXISTS cnpj TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT;

COMMENT ON COLUMN public.profiles.pix_key_type IS 'Tipo de chave Pix (cpf, cnpj, email, phone, random)';
COMMENT ON COLUMN public.profiles.pix_key IS 'Chave Pix para recebimento de pagamentos';
COMMENT ON COLUMN public.profiles.cnpj IS 'CNPJ ou CPF formal do prestador';
COMMENT ON COLUMN public.profiles.address IS 'Endereço comercial completo do prestador';
