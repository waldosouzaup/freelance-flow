# Feature: Orçamento de Manutenção de Produtos / Equipamentos

## Goal
Adicionar à Calculadora do Freelance Flow um módulo especializado em Orçamento para Manutenção de Produtos e Equipamentos, permitindo detalhar laudo técnico, defeito relatado, peças de reposição com valores unitários, mão de obra técnica, prazo de garantia e geração de PDF com numeração dedicada (MAN-YYYY-XXX).

## Architecture & Design
- **Localização:** Abas intuitivas (`Tabs`) em `src/pages/Calculator.tsx` (`Serviços & Projetos` vs `Manutenção de Produtos`).
- **Design System:** Seguir a identidade *Minimalist Fintech / Sharp Technical* (bordas nítidas, contrastes Slate/Zinc com Emerald, tipografia de alta legibilidade).
- **Tipos de Dados:** Definição de `MaintenanceBudgetData` e `MaintenancePart` em `src/types/maintenance.ts` com suporte a peças (`name`, `quantity`, `unitPrice`, `totalPrice`), mão de obra (por hora ou valor fixo), defeito/diagnóstico e termos de garantia.
- **Exportação:** Template de PDF de manutenção em `src/lib/generateBudgetPdf.ts` com cabeçalho de manutenção, bloco de equipamento/cliente, laudo técnico, tabela detalhada de peças e serviços e box de garantia.
- **Persistência:** Compatibilidade total com a tabela `budgets` no Supabase via `budget_data JSONB` e numeração `MAN-YYYY-XXX`.

## Tasks
- [x] Task 1: Definir modelos e interfaces de dados para manutenção de produtos (`MaintenanceBudgetData`, `MaintenancePart`) em `src/types/maintenance.ts`
- [x] Task 2: Implementar template de PDF especializado para orçamentos de manutenção em `src/lib/generateBudgetPdf.ts`
- [x] Task 3: Criar o componente `MaintenanceCalculator` com campos de equipamento, defeito, laudo, peças, mão de obra (fixa ou por hora), garantia e cálculos automáticos
- [x] Task 4: Integrar abas na página `src/pages/Calculator.tsx` com alternância suave e histórico compartilhado
- [x] Task 5: Implementar geração de numeração atômica com prefixo `MAN-YYYY-XXX`
- [x] Task 6: Validar TypeScript, lint e build de produção (`npm run build`)

## Done When
- [x] O usuário consegue alternar facilmente entre Serviços e Manutenção de Produtos na Calculadora
- [x] É possível adicionar múltiplas peças com quantidade e valor unitário com cálculo dinâmico de totais
- [x] O laudo técnico, defeito relatado e prazo de garantia são configurados e exibidos
- [x] O PDF do orçamento de manutenção é gerado perfeitamente com layout profissional
- [x] O orçamento é salvo no histórico do Supabase com numeração `MAN-YYYY-XXX`
- [x] `npm run build` compila com 100% de sucesso
