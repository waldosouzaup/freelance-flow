# Feature: Cadastro de Chave Pix, CNPJ e Endereço no Perfil com Exibição nos Orçamentos

## Goal
Adicionar ao perfil do usuário (`profiles`) campos para Tipo de Chave Pix, Chave Pix, CNPJ e Endereço, integrando-os na tela de Configurações e exibindo-os de forma condicional e profissional nos PDFs de orçamentos (Serviços e Manutenção), incluindo suporte a QR Code Pix escaneável.

## Architecture & Schema
- **Banco de Dados (Supabase):**
  - Migration SQL: Adicionar colunas `pix_key_type`, `pix_key`, `cnpj`, `address` na tabela `public.profiles`.
  - Atualização de `supabase/schema.sql` e criação de migration em `supabase/migrations/`.
- **Tela de Configurações (`src/pages/Settings.tsx`):**
  - Campos novos com máscaras/formatação amigável:
    - Seletor de Tipo de Chave Pix (CPF, CNPJ, Email, Telefone, Aleatória) e Input da Chave Pix.
    - Input de CNPJ (com formatação).
    - Input de Endereço Comercial completo.
- **Modelos e Gerador de PDF (`src/lib/generateBudgetPdf.ts`):**
  - Inclusão dos campos em `BudgetData` e `MaintenanceBudgetData`.
  - Exibição condicional de CNPJ e Endereço no cabeçalho do prestador (somente se preenchidos).
  - Box de Pagamento PIX com Chave legível e QR Code gerado para leitura e pagamento com a câmera do banco.
- **Calculadoras (`src/pages/Calculator.tsx` e `MaintenanceCalculator.tsx`):**
  - Consulta ao Supabase buscando os novos campos do perfil e repasse para a emissão do documento.

## Tasks
- [ ] Task 1: Criar migration SQL para adicionar `pix_key_type`, `pix_key`, `cnpj`, `address` na tabela `public.profiles`
- [ ] Task 2: Atualizar a página `src/pages/Settings.tsx` com formulário para Pix, CNPJ e Endereço
- [ ] Task 3: Atualizar `BudgetData` e `MaintenanceBudgetData` com os novos campos
- [ ] Task 4: Atualizar `src/pages/Calculator.tsx` para carregar os novos campos de `profiles`
- [ ] Task 5: Implementar box de pagamento Pix (com QR Code escaneável) e exibição condicional de CNPJ/Endereço em `src/lib/generateBudgetPdf.ts`
- [ ] Task 6: Validar com TypeScript (`npx tsc --noEmit`), testes e build (`npm run build`)

## Done When
- [ ] Usuário consegue salvar Tipo de Pix, Chave Pix, CNPJ e Endereço nas Configurações
- [ ] CNPJ e Endereço aparecem no PDF apenas quando preenchidos
- [ ] A chave Pix aparece em destaque no PDF com opção de leitura escaneável
- [ ] Funciona perfeitamente tanto no orçamento de Serviços quanto no de Manutenção
- [ ] `npm run build` passa com 100% de sucesso
