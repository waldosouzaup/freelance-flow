import type { OperationalExpense, ExpenseCategory, DREStatement } from "@/types/expenses";

interface ProjectRecord {
  id: string;
  name: string;
  status: string;
  value: number | null;
  actual_costs: number | null;
  created_at: string;
  updated_at?: string;
}

interface MovementRecord {
  id: string;
  movement_type: string;
  quantity: number;
  unit_cost: number;
  created_at: string;
}

export function calculateDRE(params: {
  projects: ProjectRecord[];
  movements: MovementRecord[];
  expenses: OperationalExpense[];
  taxRatePercent?: number;
  filterMonthYear?: string; // "YYYY-MM" or "all"
}): DREStatement {
  const {
    projects,
    movements,
    expenses,
    taxRatePercent = 6, // 6% Padrão Simples Nacional Anexo III / V
    filterMonthYear = "all",
  } = params;

  // 1. Filtrar projetos concluídos no período
  const filteredProjects = projects.filter((p) => {
    if (p.status !== "concluido") return false;
    if (filterMonthYear === "all") return true;
    const dateStr = p.updated_at || p.created_at;
    return dateStr.startsWith(filterMonthYear);
  });

  const grossRevenue = filteredProjects.reduce(
    (acc, p) => acc + (Number(p.value) || 0),
    0
  );

  // 2. Deduções fiscais
  const deductions = Math.round(grossRevenue * (taxRatePercent / 100) * 100) / 100;
  const netRevenue = grossRevenue - deductions;

  // 3. Custos Diretos
  // Custos registrados diretamente em projetos concluídos
  const directProjectCosts = filteredProjects.reduce(
    (acc, p) => acc + (Number(p.actual_costs) || 0),
    0
  );

  // CMV: Custo de peças baixadas no estoque no período
  const filteredMovements = movements.filter((m) => {
    if (m.movement_type !== "saida_orcamento") return false;
    if (filterMonthYear === "all") return true;
    return m.created_at.startsWith(filterMonthYear);
  });

  const costOfParts = filteredMovements.reduce(
    (acc, m) => acc + (Number(m.quantity) * Number(m.unit_cost) || 0),
    0
  );

  const totalDirectCosts = directProjectCosts + costOfParts;

  // 4. Lucro Bruto
  const grossProfit = netRevenue - totalDirectCosts;
  const grossMarginPercent =
    netRevenue > 0 ? Math.round((grossProfit / netRevenue) * 1000) / 10 : 0;

  // 5. Despesas Operacionais (OPEX)
  const opexByCategory: Record<ExpenseCategory, number> = {
    administrativa: 0,
    software_cloud: 0,
    ferramentas_oficina: 0,
    infraestrutura: 0,
    comercial_marketing: 0,
    tributos_taxas: 0,
    outros: 0,
  };

  const filteredExpenses = expenses.filter((e) => {
    if (filterMonthYear === "all") return true;
    // Se for recorrente mensal, considera aplicável a qualquer mês
    if (e.is_recurring && e.recurring_period === "mensal") return true;
    return e.expense_date.startsWith(filterMonthYear);
  });

  filteredExpenses.forEach((e) => {
    const cat = e.category in opexByCategory ? e.category : "outros";
    opexByCategory[cat] += Number(e.amount) || 0;
  });

  const totalOPEX = Object.values(opexByCategory).reduce((acc, val) => acc + val, 0);

  // 6. Lucro Operacional & Lucro Líquido
  const operatingProfit = grossProfit - totalOPEX;
  const operatingMarginPercent =
    netRevenue > 0 ? Math.round((operatingProfit / netRevenue) * 1000) / 10 : 0;

  const netProfit = operatingProfit;
  const netMarginPercent =
    grossRevenue > 0 ? Math.round((netProfit / grossRevenue) * 1000) / 10 : 0;

  return {
    periodLabel: filterMonthYear === "all" ? "Histórico Acumulado" : filterMonthYear,
    grossRevenue,
    deductions,
    taxRatePercent,
    netRevenue,
    costOfParts,
    directProjectCosts,
    totalDirectCosts,
    grossProfit,
    grossMarginPercent,
    opexByCategory,
    totalOPEX,
    operatingProfit,
    operatingMarginPercent,
    netProfit,
    netMarginPercent,
  };
}
