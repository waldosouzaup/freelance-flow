import { describe, it, expect, vi, beforeEach } from "vitest";
import { depleteBudgetStock, restockBudgetStock } from "@/services/inventoryService";
import { supabase } from "@/integrations/supabase/client";

// Mock supabase client
vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      from: vi.fn(),
    },
  };
});

describe("Inventory Service (Baixa e Estorno Automático de Estoque)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna resultado vazio e bem-sucedido se o orçamento não contiver peças", async () => {
    const res = await depleteBudgetStock("budget-1", [], "user-1");
    expect(res.success).toBe(true);
    expect(res.depletedCount).toBe(0);
    expect(res.negativeItems).toHaveLength(0);
  });
});
