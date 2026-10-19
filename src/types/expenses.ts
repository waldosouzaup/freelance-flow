export type ExpenseCategory =
  | "administrativa"
  | "software_cloud"
  | "ferramentas_oficina"
  | "infraestrutura"
  | "comercial_marketing"
  | "tributos_taxas"
  | "outros";

export interface OperationalExpense {
  id: string;
  user_id: string;
  description: string;
  category: ExpenseCategory;
  amount: number;
  expense_date: string;
  is_recurring: boolean;
  recurring_period: "mensal" | "anual" | "avulso" | null;
  project_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DREStatement {
  periodLabel: string;
  grossRevenue: number;
  deductions: number;
  taxRatePercent: number;
  netRevenue: number;

  costOfParts: number; // CMV
  directProjectCosts: number; // Custos diretos
  totalDirectCosts: number;

  grossProfit: number;
  grossMarginPercent: number;

  opexByCategory: Record<ExpenseCategory, number>;
  totalOPEX: number;

  operatingProfit: number; // EBIT / LAJIDA
  operatingMarginPercent: number;

  netProfit: number;
  netMarginPercent: number;
}
