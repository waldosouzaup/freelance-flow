

# Melhorias na Aplicação — Faturamento, Confirmação de Exclusão e Dashboard Premium

## 1. Painel de Faturamento

**Nova página `/billing`** com visão financeira dos projetos:
- Card destaque com valor total faturado (soma de todos os projetos concluídos)
- Card com valor em andamento (projetos ativos)
- Card com valor médio por projeto
- Gráfico de barras: faturamento por mês (baseado na data de conclusão/criação)
- Gráfico de pizza: distribuição de valores por cliente
- Tabela resumo dos projetos com valores

**Sidebar**: adicionar item "Faturamento" com ícone `DollarSign` entre Calculadora e Parâmetros.

**Rota**: `/billing` protegida no `App.tsx`.

Não requer mudanças no banco — usa os dados existentes da tabela `projects` (campo `value` e `status`).

## 2. Confirmação de Exclusão (AlertDialog)

Adicionar `AlertDialog` antes de deletar em:
- **ClientsList.tsx**: dialog "Tem certeza que deseja excluir este cliente?" com botões Cancelar/Excluir
- **ProjectsList.tsx**: dialog "Tem certeza que deseja excluir este projeto?" com botões Cancelar/Excluir

Usar o componente `AlertDialog` já existente em `src/components/ui/alert-dialog.tsx`. Controlar estado com `useState` para armazenar o ID do item a ser deletado.

## 3. Dashboard Premium Redesign

Reformular completamente o `Dashboard.tsx` com design premium:

**Novas métricas** (cards superiores expandidos):
- Total de Projetos
- Projetos Ativos
- Total de Clientes
- Valor Total dos Projetos (soma de `value`)
- Taxa de Conclusão (% de projetos concluídos)
- Próximos Prazos (projetos com deadline nos próximos 7 dias)

**Layout premium**:
- Cards com gradientes sutis e ícones maiores
- Seção de welcome com saudação ao usuário ("Bem-vindo, [nome]")
- Progress ring visual para taxa de conclusão
- Cards com animação hover (scale + shadow)
- Gráficos mantidos mas com visual refinado (cantos mais arredondados, tooltips melhorados)
- Projetos recentes com barra de progresso das etapas inline
- Atalhos rápidos com design de cards ao invés de botões simples

**Estrutura visual**:
```text
┌─────────────────────────────────────────────┐
│  Bem-vindo, [Nome]         [Atalhos rápidos]│
├──────┬──────┬──────┬──────┬──────┬──────────┤
│ Total│Ativos│Client│Valor │Concl.│ Prazos   │
├──────────────────┬──────────────────────────┤
│ Barras (Status)  │ Linha (Evolução Mensal)  │
├──────────────────┬──────────────────────────┤
│ Pizza (Distrib.) │ Projetos Recentes + %    │
└──────────────────┴──────────────────────────┘
```

## Arquivos Afetados

| Arquivo | Ação |
|---------|------|
| `src/pages/Billing.tsx` | Criar — painel de faturamento |
| `src/pages/Dashboard.tsx` | Reescrever — design premium com novas métricas |
| `src/pages/ClientsList.tsx` | Editar — adicionar AlertDialog de confirmação |
| `src/pages/ProjectsList.tsx` | Editar — adicionar AlertDialog de confirmação |
| `src/components/AppSidebar.tsx` | Editar — adicionar link Faturamento |
| `src/App.tsx` | Editar — adicionar rota `/billing` |

Nenhuma mudança no banco de dados necessária.

