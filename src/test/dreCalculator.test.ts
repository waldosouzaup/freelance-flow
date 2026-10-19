import { describe, it, expect } from "vitest";
import { calculateDRE } from "@/lib/dreCalculator";
import type { OperationalExpense } from "@/types/expenses";

describe("DRE Calculator (Demonstração do Resultado do Exercício)", () => {
  const mockProjects = [
    {
      id: "proj-1",
      name: "Reparo Notebook Dell",
      status: "concluido",
      value: 1000,
      actual_costs: 100, // Custo direto de insumo/frete
      created_at: "2026-10-05T10:00:00Z",
      updated_at: "2026-10-10T15:00:00Z",
    },
    {
      id: "proj-2",
      name: "Troca de Tela iPhone",
      status: "concluido",
      value: 2000,
      actual_costs: 50,
      created_at: "2026-10-12T10:00:00Z",
      updated_at: "2026-10-15T15:00:00Z",
    },
    {
      id: "proj-3",
      name: "Projeto em Andamento",
      status: "em_andamento",
      value: 5000,
      actual_costs: 200,
      created_at: "2026-10-18T10:00:00Z",
      updated_at: "2026-10-18T10:00:00Z",
    },
  ];

  const mockMovements = [
    {
      id: "mov-1",
      movement_type: "saida_orcamento",
      quantity: 1,
      unit_cost: 300, // Custo da tela
      created_at: "2026-10-12T11:00:00Z",
    },
    {
      id: "mov-2",
      movement_type: "saida_orcamento",
      quantity: 2,
      unit_cost: 50, // Conectores
      created_at: "2026-10-06T11:00:00Z",
    },
  ];

  const mockExpenses: OperationalExpense[] = [
    {
      id: "exp-1",
      user_id: "user-1",
      description: "Aluguel da Sala",
      category: "infraestrutura",
      amount: 600,
      expense_date: "2026-10-01",
      is_recurring: true,
      recurring_period: "mensal",
      project_id: null,
      notes: null,
      created_at: "2026-10-01T00:00:00Z",
      updated_at: "2026-10-01T00:00:00Z",
    },
    {
      id: "exp-2",
      user_id: "user-1",
      description: "Assinatura Software Cloud",
      category: "software_cloud",
      amount: 150,
      expense_date: "2026-10-05",
      is_recurring: true,
      recurring_period: "mensal",
      project_id: null,
      notes: null,
      created_at: "2026-10-05T00:00:00Z",
      updated_at: "2026-10-05T00:00:00Z",
    },
  ];

  it("calcula corretamente a Receita Bruta considerando apenas projetos concluídos", () => {
    const dre = calculateDRE({
      projects: mockProjects,
      movements: mockMovements,
      expenses: mockExpenses,
      taxRatePercent: 6,
      filterMonthYear: "2026-10",
    });

    // proj-1 (1000) + proj-2 (2000) = 3000 (proj-3 não está concluído)
    expect(dre.grossRevenue).toBe(3000);
  });

  it("deduz os impostos e apura a Receita Operacional Líquida", () => {
    const dre = calculateDRE({
      projects: mockProjects,
      movements: mockMovements,
      expenses: mockExpenses,
      taxRatePercent: 6,
      filterMonthYear: "2026-10",
    });

    // 6% de 3000 = 180
    expect(dre.deductions).toBe(180);
    // 3000 - 180 = 2820
    expect(dre.netRevenue).toBe(2820);
  });

  it("calcula Custos Diretos (CPV/CSP: peças CMV + custos de projetos)", () => {
    const dre = calculateDRE({
      projects: mockProjects,
      movements: mockMovements,
      expenses: mockExpenses,
      taxRatePercent: 6,
      filterMonthYear: "2026-10",
    });

    // Peças: 300 + (2 * 50) = 400
    expect(dre.costOfParts).toBe(400);
    // Custos diretos: 100 + 50 = 150
    expect(dre.directProjectCosts).toBe(150);
    // Total Custos Diretos: 400 + 150 = 550
    expect(dre.totalDirectCosts).toBe(550);
    // Lucro Bruto: 2820 - 550 = 2270
    expect(dre.grossProfit).toBe(2270);
  });

  it("consolida despesas operacionais (OPEX) e apura o Lucro Líquido final", () => {
    const dre = calculateDRE({
      projects: mockProjects,
      movements: mockMovements,
      expenses: mockExpenses,
      taxRatePercent: 6,
      filterMonthYear: "2026-10",
    });

    // OPEX: 600 (aluguel) + 150 (software) = 750
    expect(dre.totalOPEX).toBe(750);
    expect(dre.opexByCategory.infraestrutura).toBe(600);
    expect(dre.opexByCategory.software_cloud).toBe(150);

    // Lucro Operacional (EBIT): 2270 - 750 = 1520
    expect(dre.operatingProfit).toBe(1520);
    expect(dre.netProfit).toBe(1520);

    // Margem líquida: (1520 / 3000) * 100 = 50.7%
    expect(dre.netMarginPercent).toBe(50.7);
  });
});
