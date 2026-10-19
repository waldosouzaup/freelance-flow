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

interface ItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemToEdit?: InventoryItem | null;
  onSuccess: () => void;
}

const CATEGORIES = [
  { value: "pecas", label: "Peças de Reposição" },
  { value: "componentes", label: "Componentes Eletrônicos" },
  { value: "insumos", label: "Insumos & Solda" },
  { value: "telas_baterias", label: "Telas & Baterias" },
  { value: "acessorios", label: "Acessórios" },
  { value: "outros", label: "Outros" },
];

const UNITS = ["UN", "PC", "CX", "PAR", "MT", "KG", "L"];

export function ItemFormDialog({
  open,
  onOpenChange,
  itemToEdit,
  onSuccess,
}: ItemFormDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("pecas");
  const [unit, setUnit] = useState("UN");
  const [quantity, setQuantity] = useState<number>(0);
  const [minQuantity, setMinQuantity] = useState<number>(2);
  const [costPrice, setCostPrice] = useState<number>(0);
  const [salePrice, setSalePrice] = useState<number>(0);
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (itemToEdit) {
      setName(itemToEdit.name || "");
      setSku(itemToEdit.sku || "");
      setCategory(itemToEdit.category || "pecas");
      setUnit(itemToEdit.unit || "UN");
      setQuantity(itemToEdit.quantity ?? 0);
      setMinQuantity(itemToEdit.min_quantity ?? 2);
      setCostPrice(itemToEdit.cost_price ?? 0);
      setSalePrice(itemToEdit.sale_price ?? 0);
      setLocation(itemToEdit.location || "");
      setDescription(itemToEdit.description || "");
    } else {
      setName("");
      setSku("");
      setCategory("pecas");
      setUnit("UN");
      setQuantity(0);
      setMinQuantity(2);
      setCostPrice(0);
      setSalePrice(0);
      setLocation("");
      setDescription("");
    }
  }, [itemToEdit, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!name.trim()) {
      toast.error("O nome da peça ou item é obrigatório.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        user_id: user.id,
        name: name.trim(),
        sku: sku.trim() || null,
        category,
        unit,
        quantity: Number(quantity) || 0,
        min_quantity: Number(minQuantity) || 0,
        cost_price: Number(costPrice) || 0,
        sale_price: Number(salePrice) || 0,
        location: location.trim() || null,
        description: description.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (itemToEdit) {
        const { error } = await supabase
          .from("inventory_items")
          .update(payload)
          .eq("id", itemToEdit.id);

        if (error) throw error;
        toast.success(`Peça "${name}" atualizada com sucesso!`);
      } else {
        const { data: created, error } = await supabase
          .from("inventory_items")
          .insert(payload)
          .select()
          .single();

        if (error) throw error;

        // Se adicionado com saldo inicial > 0, registrar movimentação inicial de entrada
        if (Number(quantity) > 0 && created) {
          await supabase.from("inventory_movements").insert({
            user_id: user.id,
            item_id: created.id,
            movement_type: "entrada",
            quantity: Number(quantity),
            unit_cost: Number(costPrice) || 0,
            notes: "Saldo inicial de cadastro",
          });
        }

        toast.success(`Peça "${name}" cadastrada com sucesso!`);
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      console.error("Erro ao salvar item de estoque:", err);
      const msg = err instanceof Error ? err.message : "Erro ao salvar item no estoque.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{itemToEdit ? "Editar Peça / Item" : "Cadastrar Nova Peça no Estoque"}</DialogTitle>
          <DialogDescription>
            {itemToEdit
              ? "Atualize os dados, preços de referência ou limites de estoque desta peça."
              : "Cadastre uma peça ou insumo para controle de saldo e baixa automática em orçamentos."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="item-name">Nome da Peça / Item *</Label>
              <Input
                id="item-name"
                placeholder="Ex: Conector de Carga USB-C, Tela OLED"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="item-sku">Código / SKU</Label>
              <Input
                id="item-sku"
                placeholder="Ex: PEC-001"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Unidade de Medida</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="item-qty">
                {itemToEdit ? "Saldo Atual" : "Quantidade Inicial"}
              </Label>
              <Input
                id="item-qty"
                type="number"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="item-min-qty">Estoque Mínimo (Alerta)</Label>
              <Input
                id="item-min-qty"
                type="number"
                step="any"
                value={minQuantity}
                onChange={(e) => setMinQuantity(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="item-cost">Preço de Custo (R$)</Label>
              <Input
                id="item-cost"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={costPrice || ""}
                onChange={(e) => setCostPrice(Number(e.target.value))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="item-sale">Preço de Venda Padrão (R$)</Label>
              <Input
                id="item-sale"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={salePrice || ""}
                onChange={(e) => setSalePrice(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="item-loc">Localização Física / Gaveta</Label>
            <Input
              id="item-loc"
              placeholder="Ex: Prateleira B, Gaveteiro 04"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="item-desc">Observações / Compatibilidade</Label>
            <Textarea
              id="item-desc"
              rows={2}
              placeholder="Ex: Compatível com modelos A20, A30 e A50..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-primary text-primary-foreground">
              {loading ? "Salvando..." : itemToEdit ? "Salvar Alterações" : "Cadastrar Peça"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
