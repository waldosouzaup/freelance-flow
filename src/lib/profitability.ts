// Profitability analysis business logic
// Pure functions — no React dependencies

export type ProfitabilityStatus = 'healthy' | 'warning' | 'loss' | 'insufficient_data';

export interface ProfitabilityInput {
  estimatedRevenue: number | null;
  actualCosts: number | null;
  estimatedHours: number | null;
  actualHours: number | null;
}

export interface ProfitabilityResult {
  profit: number;
  realHourRate: number | null;
  estimatedHourRate: number | null;
  status: ProfitabilityStatus;
}

const SAFE_NUMBER = (val: number | null | undefined): number => Number(val) || 0;

const HAS_VALUE = (val: number | null | undefined): boolean =>
  val !== null && val !== undefined && val > 0;

export function calculateProfit(estimatedRevenue: number | null, actualCosts: number | null): number {
  return SAFE_NUMBER(estimatedRevenue) - SAFE_NUMBER(actualCosts);
}

export function calculateRealHourRate(estimatedRevenue: number | null, actualHours: number | null): number | null {
  const revenue = SAFE_NUMBER(estimatedRevenue);
  const hours = SAFE_NUMBER(actualHours);
  if (hours === 0) return null;
  return revenue / hours;
}

export function calculateEstimatedHourRate(estimatedRevenue: number | null, estimatedHours: number | null): number | null {
  const revenue = SAFE_NUMBER(estimatedRevenue);
  const hours = SAFE_NUMBER(estimatedHours);
  if (hours === 0) return null;
  return revenue / hours;
}

/**
 * Classification logic:
 * 1. insufficient_data → no actual data recorded yet
 * 2. loss → profit <= 0
 * 3. warning → profit > 0 but real hour rate dropped >30% vs estimated
 * 4. healthy → all good
 */
export function calculateProfitabilityStatus(input: ProfitabilityInput): ProfitabilityStatus {
  const { estimatedRevenue, actualCosts, estimatedHours, actualHours } = input;

  const hasActualData = HAS_VALUE(actualHours) || SAFE_NUMBER(actualCosts) > 0;
  if (!hasActualData) return 'insufficient_data';

  const profit = calculateProfit(estimatedRevenue, actualCosts);
  if (profit <= 0) return 'loss';

  const estimatedRate = calculateEstimatedHourRate(estimatedRevenue, estimatedHours);
  const realRate = calculateRealHourRate(estimatedRevenue, actualHours);

  if (estimatedRate && realRate && realRate < estimatedRate * 0.7) {
    return 'warning';
  }

  return 'healthy';
}

export function analyzeProfitability(input: ProfitabilityInput): ProfitabilityResult {
  return {
    profit: calculateProfit(input.estimatedRevenue, input.actualCosts),
    realHourRate: calculateRealHourRate(input.estimatedRevenue, input.actualHours),
    estimatedHourRate: calculateEstimatedHourRate(input.estimatedRevenue, input.estimatedHours),
    status: calculateProfitabilityStatus(input),
  };
}

// --- Display Helpers ---

const STATUS_CONFIG: Record<ProfitabilityStatus, { label: string; color: string; bgColor: string }> = {
  healthy: {
    label: 'Saudável',
    color: 'text-success',
    bgColor: 'bg-success/10 text-success border-success/20',
  },
  warning: {
    label: 'Atenção',
    color: 'text-warning',
    bgColor: 'bg-warning/10 text-warning border-warning/20',
  },
  loss: {
    label: 'Prejuízo',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10 text-destructive border-destructive/20',
  },
  insufficient_data: {
    label: 'Dados insuficientes',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted text-muted-foreground border-border',
  },
};

export function getProfitabilityLabel(status: ProfitabilityStatus): string {
  return STATUS_CONFIG[status].label;
}

export function getProfitabilityColor(status: ProfitabilityStatus): string {
  return STATUS_CONFIG[status].color;
}

export function getProfitabilityBadgeClasses(status: ProfitabilityStatus): string {
  return STATUS_CONFIG[status].bgColor;
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatHours(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h`;
}

export function formatRate(value: number | null): string {
  if (value === null) return '—';
  return `${formatCurrency(value)}/h`;
}
