export type InventoryMovementType = "entrada" | "saida_orcamento" | "ajuste_manual" | "devolucao";

export interface InventoryItem {
  id: string;
  user_id: string;
  sku: string | null;
  name: string;
  description: string | null;
  category: string;
  unit: string;
  quantity: number;
  min_quantity: number;
  cost_price: number;
  sale_price: number;
  location: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryMovement {
  id: string;
  user_id: string;
  item_id: string;
  movement_type: InventoryMovementType;
  quantity: number;
  unit_cost: number;
  reference_budget_id: string | null;
  reference_project_id: string | null;
  notes: string | null;
  created_at: string;
  item?: {
    name: string;
    sku: string | null;
    unit: string;
  };
}

export interface StockDepletionResult {
  success: boolean;
  depletedCount: number;
  negativeItems: { name: string; currentQuantity: number }[];
  createdItems: string[];
}
