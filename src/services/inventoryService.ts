import { supabase } from "@/integrations/supabase/client";
import type { InventoryItem, StockDepletionResult } from "@/types/inventory";
import type { MaintenancePart } from "@/types/maintenance";

/**
 * Realiza a baixa automática no estoque das peças incluídas em um orçamento aprovado.
 * Segue as decisões arquiteturais:
 * - Se a peça não existir no estoque: cadastra automaticamente com saldo inicial 0 e realiza a baixa (ficando com saldo negativo).
 * - Se a quantidade em estoque for insuficiente: permite a baixa gerando saldo negativo e sinalizando no resultado.
 * - Registra a movimentação no Kardex (inventory_movements) com tipo 'saida_orcamento'.
 */
export async function depleteBudgetStock(
  budgetId: string,
  parts: MaintenancePart[],
  userId: string
): Promise<StockDepletionResult> {
  const result: StockDepletionResult = {
    success: true,
    depletedCount: 0,
    negativeItems: [],
    createdItems: [],
  };

  if (!parts || parts.length === 0) return result;

  try {
    // 1. Verificar se este orçamento já teve baixa realizada para evitar duplicidade
    const { data: existingMovements, error: checkError } = await supabase
      .from("inventory_movements")
      .select("id")
      .eq("user_id", userId)
      .eq("reference_budget_id", budgetId)
      .eq("movement_type", "saida_orcamento");

    if (checkError) {
      console.error("Erro ao verificar movimentações existentes:", checkError);
    } else if (existingMovements && existingMovements.length > 0) {
      // Já baixado anteriormente
      return result;
    }

    // 2. Buscar itens existentes do usuário
    const { data: inventoryData, error: invError } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("user_id", userId);

    if (invError) throw invError;
    const inventoryList = (inventoryData as InventoryItem[]) || [];

    for (const part of parts) {
      const partName = part.name.trim();
      if (!partName) continue;

      const qtyToDeduct = Number(part.quantity) || 1;
      const unitPrice = Number(part.unitPrice) || 0;

      // Buscar por nome correspondente (case-insensitive)
      let matchedItem = inventoryList.find(
        (item) => item.name.toLowerCase() === partName.toLowerCase()
      );

      // Decisão 1: Se o item não existir, cadastra automaticamente no estoque
      if (!matchedItem) {
        const estimatedCost = Math.round(unitPrice * 0.65 * 100) / 100; // Margem padrão estimada de custo
        const { data: newItem, error: createError } = await supabase
          .from("inventory_items")
          .insert({
            user_id: userId,
            name: partName,
            sku: `AUTO-${Date.now().toString().slice(-4)}`,
            category: "pecas",
            unit: "UN",
            quantity: 0,
            min_quantity: 1,
            cost_price: estimatedCost,
            sale_price: unitPrice,
            description: "Cadastrado automaticamente na aprovação de orçamento",
          })
          .select()
          .single();

        if (createError) {
          console.error("Erro ao auto-cadastrar item no estoque:", createError);
          continue;
        }

        matchedItem = newItem as InventoryItem;
        result.createdItems.push(matchedItem.name);
      }

      // Calcula novo saldo (permite negativo conforme Decisão B)
      const currentQty = Number(matchedItem.quantity) || 0;
      const newQty = currentQty - qtyToDeduct;

      // Atualiza saldo do item
      const { error: updateError } = await supabase
        .from("inventory_items")
        .update({
          quantity: newQty,
          updated_at: new Date().toISOString(),
        })
        .eq("id", matchedItem.id);

      if (updateError) {
        console.error("Erro ao atualizar quantidade do item:", updateError);
        continue;
      }

      // Registra movimentação no Kardex
      await supabase.from("inventory_movements").insert({
        user_id: userId,
        item_id: matchedItem.id,
        movement_type: "saida_orcamento",
        quantity: qtyToDeduct,
        unit_cost: matchedItem.cost_price || 0,
        reference_budget_id: budgetId,
        notes: `Baixa automática - Orçamento aprovado (Saldo pós-baixa: ${newQty} ${matchedItem.unit})`,
      });

      result.depletedCount++;

      // Sinaliza alerta se ficou com saldo negativo ou abaixo do mínimo
      if (newQty < 0) {
        result.negativeItems.push({
          name: matchedItem.name,
          currentQuantity: newQty,
        });
      }
    }

    return result;
  } catch (err) {
    console.error("Falha na baixa automática de estoque:", err);
    result.success = false;
    return result;
  }
}

/**
 * Estorna peças devolvendo o saldo ao estoque quando um orçamento aprovado é cancelado.
 */
export async function restockBudgetStock(
  budgetId: string,
  userId: string
): Promise<number> {
  try {
    // 1. Buscar as movimentações de saída do orçamento
    const { data: movements, error: movError } = await supabase
      .from("inventory_movements")
      .select("id, item_id, quantity, unit_cost")
      .eq("user_id", userId)
      .eq("reference_budget_id", budgetId)
      .eq("movement_type", "saida_orcamento");

    if (movError || !movements || movements.length === 0) return 0;

    let restoredCount = 0;

    for (const mov of movements) {
      // Buscar item atual
      const { data: itemData } = await supabase
        .from("inventory_items")
        .select("id, quantity")
        .eq("id", mov.item_id)
        .single();

      if (!itemData) continue;

      const restoredQty = (Number(itemData.quantity) || 0) + Number(mov.quantity);

      // Devolve quantidade ao estoque
      await supabase
        .from("inventory_items")
        .update({
          quantity: restoredQty,
          updated_at: new Date().toISOString(),
        })
        .eq("id", mov.item_id);

      // Registra estorno no Kardex
      await supabase.from("inventory_movements").insert({
        user_id: userId,
        item_id: mov.item_id,
        movement_type: "devolucao",
        quantity: mov.quantity,
        unit_cost: mov.unit_cost,
        reference_budget_id: budgetId,
        notes: `Estorno de peças - Orçamento cancelado`,
      });

      restoredCount++;
    }

    return restoredCount;
  } catch (err) {
    console.error("Falha ao estornar peças no estoque:", err);
    return 0;
  }
}
