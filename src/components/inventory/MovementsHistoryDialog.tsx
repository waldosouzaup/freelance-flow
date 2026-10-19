import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { InventoryItem, InventoryMovement } from "@/types/inventory";
import { ArrowDownLeft, ArrowUpRight, RotateCcw, SlidersHorizontal } from "lucide-react";

interface MovementsHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: InventoryItem | null;
}

const TYPE_CONFIG = {
  entrada: {
    label: "Entrada",
    icon: ArrowDownLeft,
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
  },
  saida_orcamento: {
    label: "Saída (Orçamento)",
    icon: ArrowUpRight,
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
  },
  ajuste_manual: {
    label: "Ajuste Manual",
    icon: SlidersHorizontal,
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
  },
  devolucao: {
    label: "Devolução / Estorno",
    icon: RotateCcw,
    className: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20",
  },
};

function formatCurrency(v: number): string {
  return (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function MovementsHistoryDialog({
  open,
  onOpenChange,
  item,
}: MovementsHistoryDialogProps) {
  const { user } = useAuth();
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user) return;

    const fetchHistory = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from("inventory_movements")
          .select("*, inventory_items(name, sku, unit), budgets(budget_number, project_name)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (item) {
          query = query.eq("item_id", item.id);
        }

        const { data, error } = await query.limit(50);
        if (error) throw error;
        setMovements(data || []);
      } catch (err) {
        console.error("Erro ao carregar histórico de movimentações:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [open, item, user]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            Histórico de Movimentações (Kardex)
            {item ? ` - ${item.name}` : ""}
          </DialogTitle>
          <DialogDescription>
            Rastreabilidade de todas as entradas, saídas automáticas por orçamentos e estornos.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] rounded-md border border-border">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0">
              <TableRow>
                <TableHead>Data / Hora</TableHead>
                {!item && <TableHead>Item / SKU</TableHead>}
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead className="text-right">Custo Unit.</TableHead>
                <TableHead>Origem / Observações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={item ? 5 : 6} className="text-center py-6 text-muted-foreground">
                    Carregando movimentações...
                  </TableCell>
                </TableRow>
              ) : movements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={item ? 5 : 6} className="text-center py-6 text-muted-foreground">
                    Nenhuma movimentação registrada para este filtro.
                  </TableCell>
                </TableRow>
              ) : (
                movements.map((m) => {
                  const cfg = TYPE_CONFIG[m.movement_type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.entrada;
                  const Icon = cfg.icon;
                  const itemName = m.inventory_items?.name || "Item";
                  const itemSku = m.inventory_items?.sku;
                  const unit = m.inventory_items?.unit || "UN";

                  return (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(m.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      {!item && (
                        <TableCell>
                          <div className="font-medium text-xs text-foreground">{itemName}</div>
                          {itemSku && <div className="text-[10px] text-muted-foreground">SKU: {itemSku}</div>}
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge variant="outline" className={`gap-1 text-xs py-0.5 px-2 ${cfg.className}`}>
                          <Icon className="h-3 w-3" />
                          {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium text-xs">
                        {m.quantity} {unit}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {formatCurrency(m.unit_cost)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {m.budgets?.budget_number ? (
                          <span className="font-semibold text-primary">
                            {m.budgets.budget_number} ({m.budgets.project_name || "Orçamento"})
                          </span>
                        ) : (
                          m.notes || "-"
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
