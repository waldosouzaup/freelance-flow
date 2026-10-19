import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { InventoryItem } from "@/types/inventory";

interface MovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItem?: InventoryItem | null;
  items: InventoryItem[];
  onSuccess: () => void;
}

export function MovementDialog({
  open,
  onOpenChange,
  selectedItem,
  items,
  onSuccess,
}: MovementDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const [itemId, setItemId] = useState<string>("");
  const [movementType, setMovementType] = useState<"entrada" | "ajuste_manual">("entrada");
  const [quantity, setQuantity] = useState<number>(1);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (selectedItem) {
      setItemId(selectedItem.id);
      setUnitCost(selectedItem.cost_price || 0);
    } else if (items.length > 0 && !itemId) {
      setItemId(items[0].id);
      setUnitCost(items[0].cost_price || 0);
    }
    setQuantity(1);
    setNotes("");
  }, [selectedItem, items, open]);

  const currentItem = items.find((i) => i.id === itemId) || selectedItem;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!itemId) {
      toast.error("Selecione um item.");
      return;
    }
    if (quantity <= 0) {
      toast.error("A quantidade deve ser maior que zero.");
      return;
    }

    setLoading(true);
    try {
      const currentQty = Number(currentItem?.quantity) || 0;
      let newQty = currentQty;

      if (movementType === "entrada") {
        newQty = currentQty + Number(quantity);
      } else {
        // Ajuste manual pode ser para definir ou alterar o saldo
        newQty = Number(quantity);
      }

      // Atualiza saldo do item
      const updateData: any = {
        quantity: newQty,
        updated_at: new Date().toISOString(),
      };

      if (unitCost > 0) {
        updateData.cost_price = Number(unitCost);
      }

      const { error: itemError } = await supabase
        .from("inventory_items")
        .update(updateData)
        .eq("id", itemId);

      if (itemError) throw itemError;

      // Registra a movimentação no Kardex
      const diffQuantity = movementType === "entrada" ? Number(quantity) : newQty - currentQty;

      const { error: movError } = await supabase.from("inventory_movements").insert({
        user_id: user.id,
        item_id: itemId,
        movement_type: movementType,
        quantity: Math.abs(diffQuantity),
        unit_cost: Number(unitCost) || 0,
        notes: notes.trim() || (movementType === "entrada" ? "Entrada manual de estoque" : `Ajuste manual de ${currentQty} para ${newQty}`),
      });

      if (movError) throw movError;

      toast.success(`Estoque atualizado com sucesso! Novo saldo: ${newQty} ${currentItem?.unit || "UN"}`);
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      console.error("Erro ao registrar movimentação:", err);
      const msg = err instanceof Error ? err.message : "Erro ao atualizar estoque.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Movimentação Manual de Estoque</DialogTitle>
          <DialogDescription>
            Registre entradas de compra ou faça um ajuste de conferência física (balanço).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Item / Peça</Label>
            <Select value={itemId} onValueChange={(val) => {
              setItemId(val);
              const found = items.find((i) => i.id === val);
              if (found) setUnitCost(found.cost_price || 0);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o item..." />
              </SelectTrigger>
              <SelectContent>
                {items.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name} (Atual: {i.quantity} {i.unit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo de Movimento</Label>
              <Select
                value={movementType}
                onValueChange={(val: "entrada" | "ajuste_manual") => setMovementType(val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada (Adicionar ao Saldo)</SelectItem>
                  <SelectItem value="ajuste_manual">Ajuste (Definir Novo Saldo)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>
                {movementType === "entrada" ? "Qtd a Adicionar" : "Novo Saldo Total"}
              </Label>
              <Input
                type="number"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Custo Unitário de Aquisição (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={unitCost || ""}
              onChange={(e) => setUnitCost(Number(e.target.value))}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Motivo / Nota Fiscal / Observações</Label>
            <Textarea
              rows={2}
              placeholder="Ex: Compra NF-e 4921 / Fornecedor TechParts"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-primary text-primary-foreground">
              {loading ? "Gravando..." : "Confirmar Movimentação"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
