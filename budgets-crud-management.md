# Budgets & Projects CRUD Management

## 🎯 Goal
Implement full CRUD for budgets (both Service and Maintenance), allowing users to:
1. **List & Search (Read)**: View all created budgets in a dedicated `/budgets` page and on the Calculator history, with metrics, filters by status and type.
2. **Edit (Update)**: Edit unapproved budgets (`aguardando`) directly in the Calculator with preloaded data, preserving the original budget number and updating the PDF.
3. **Delete (Delete)**: Delete budgets with confirmation dialog.
4. **Approve & Convert**: Once approved, lock modifications and offer a 1-click action to convert the approved budget into an active Project in the `projects` table.

---

## 🏛️ Architecture & Routing

1. **New Route `/budgets`**:
   - Page component: `src/pages/BudgetsList.tsx`
   - Navigation: added to `AppSidebar.tsx` under "Orçamentos & Finanças".
   - Metrics cards: Total de Orçamentos, Em Aberto / Aguardando, Aprovados, Faturamento Previsto.
   - Filters: Search query (number, client, project), Status filter (`all`, `aguardando`, `aprovado`, `cancelado`), Type filter (`all`, `service`, `maintenance`).
   - Actions:
     - ✏️ **Editar**: redirects to `/calculator?edit={id}` (disabled if already approved).
     - 📄 **Baixar PDF**: regenerates the single-page PDF.
     - 🔄 **Mudar Status**: dropdown with instant Supabase update.
     - 🚀 **Converter em Projeto**: creates a record in `public.projects` with client, name, price, deadline and redirects to `/projects`.
     - 🗑️ **Excluir**: AlertDialog with confirmation, deletes from `public.budgets`.

2. **Edit Mode in `/calculator?edit={id}`**:
   - `src/pages/Calculator.tsx` reads `searchParams.get("edit")`.
   - Fetches the budget record from `public.budgets`.
   - If `budget_type === 'maintenance'` or `budget_number.startsWith("MAN-")`:
     - Activates tab "Manutenção"
     - Feeds budget data into `MaintenanceCalculator` (with `initialBudget` prop or prefill state).
   - If `budget_type === 'service'` (default):
     - Activates tab "Serviço"
     - Populates client, project name, hours, hourly rate, complexity, costs list, profit margin, tax, discount, payment conditions.
   - Renders a prominent banner: "✏️ Editando Orçamento {budget_number}" with "Cancelar Edição" button.
   - Action button changes to: "Salvar Alterações e Atualizar PDF".
   - When clicked: executes `supabase.from("budgets").update(...)` keeping the same `budget_number`, regenerates the 1-page PDF, and returns to `/budgets`.

---

## 📋 Task Breakdown
- [ ] **Task 1**: Create `src/pages/BudgetsList.tsx` with full CRUD, metrics, filters, and Project conversion
- [ ] **Task 2**: Register `/budgets` in `src/App.tsx` and `src/components/AppSidebar.tsx`
- [ ] **Task 3**: Update `src/components/calculator/MaintenanceCalculator.tsx` to accept `initialData` and `onSaveEdit`
- [ ] **Task 4**: Update `src/pages/Calculator.tsx` to handle `?edit=:id` URL param for both service and maintenance budgets
- [ ] **Task 5**: Verify with `npx tsc --noEmit`, `npx vitest run`, and `npm run build`
