export interface MaintenancePart {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export type LaborPricingType = "fixed" | "hourly";

export interface MaintenanceBudgetData {
  budgetNumber: string;
  date: string;
  validityDate: string;

  freelancerName: string;
  freelancerEmail: string;
  freelancerPhone: string;
  freelancerWebsite: string;
  logoUrl?: string;
  cnpj?: string;
  address?: string;
  pixKeyType?: string;
  pixKey?: string;

  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientAddress?: string;
  clientCpf?: string;
  clientCompany?: string;

  // Equipment / Product Info
  productName: string;
  brandModel?: string;
  serialNumber?: string;
  reportedIssue: string;
  technicalDiagnosis?: string;

  // Labor
  laborType: LaborPricingType;
  laborHours?: number;
  laborHourlyRate?: number;
  laborFixedPrice?: number;
  laborTotal: number;

  // Parts
  parts: MaintenancePart[];
  partsTotal: number;

  // Extra Costs (frete, deslocamento, insumos)
  extraCosts?: { name: string; value: number }[];
  extraCostsTotal: number;

  subtotal: number;

  // Modifiers
  profitMargin: number;
  profitAmount: number;
  tax: number;
  taxAmount: number;
  discount: number;
  total: number;

  // Warranty & Terms
  warrantyDays: number;
  estimatedDaysToDeliver?: number;
  paymentConditions: string;
  notes?: string;

  budget_type: "maintenance";
}
