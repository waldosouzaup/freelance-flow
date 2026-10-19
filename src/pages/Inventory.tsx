import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Boxes,
  Plus,
  Search,
  Filter,
  ArrowDownLeft,
  History,
  AlertTriangle,
  Pencil,
  Trash2,
  DollarSign,
  PackageCheck,
  TrendingUp,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import type { InventoryItem } from "@/types/inventory";
import { ItemFormDialog } from "@/components/inventory/ItemFormDialog";
import { MovementDialog } from "@/components/inventory/MovementDialog";
import { MovementsHistoryDialog } from "@/components/inventory/MovementsHistoryDialog";

function formatCurrency(v: number): string {
  return (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Inventory() {
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "low_negative" | "negative">("all");

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<InventoryItem | null>(null);

  const [movementOpen, setMovementOpen] = useState(false);
  const [selectedMovementItem, setSelectedMovementItem] = useState<InventoryItem | null>(null);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<InventoryItem | null>(null);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchItems = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (error) throw error;
      setItems((data as InventoryItem[]) || []);
    } catch (err: unknown) {
      console.error("Erro ao buscar estoque:", err);
      toast.error("Erro ao carregar itens do estoque.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Metrics
  const metrics = useMemo(() => {
    const totalItems = items.length;
    const totalUnits = items.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);
    const totalCostValue = items.reduce(
      (acc, i) => acc + (Number(i.quantity) > 0 ? Number(i.quantity) * Number(i.cost_price || 0) : 0),
      0
    );
    const totalSaleValue = items.reduce(
      (acc, i) => acc + (Number(i.quantity) > 0 ? Number(i.quantity) * Number(i.sale_price || 0) : 0),
      0
    );
    const negativeCount = items.filter((i) => Number(i.quantity) < 0).length;
    const lowCount = items.filter((i) => Number(i.quantity) <= Number(i.min_quantity) && Number(i.quantity) >= 0).length;

    return {
      totalItems,
      totalUnits,
      totalCostValue,
      totalSaleValue,
      negativeCount,
      lowCount,
      criticalCount: negativeCount + lowCount,
    };
  }, [items]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !search ||
        item.name.toLowerCase().includes(q) ||
        (item.sku && item.sku.toLowerCase().includes(q)) ||
        (item.location && item.location.toLowerCase().includes(q));

      const matchesCategory =
        categoryFilter === "all" || item.category === categoryFilter;

      let matchesStatus = true;
      if (statusFilter === "negative") {
        matchesStatus = Number(item.quantity) < 0;
      } else if (statusFilter === "low_negative") {
        matchesStatus = Number(item.quantity) <= Number(item.min_quantity);
      }

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [items, search, categoryFilter, statusFilter]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("inventory_items")
        .delete()
        .eq("id", deleteTarget.id);

      if (error) throw error;
      toast.success(`Peça "${deleteTarget.name}" removida do estoque.`);
      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
    } catch (err: unknown) {
      console.error("Erro ao excluir peça:", err);
      const msg = err instanceof Error ? err.message : "Erro ao excluir peça.";
      toast.error(msg);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Controle de Estoque & Peças</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Gestão de peças de reposição com baixa automática em orçamentos aprovados e rastreio Kardex.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            className="gap-1.5"
            onClick={() => {
              setSelectedHistoryItem(null);
              setHistoryOpen(true);
            }}
          >
            <History className="h-4 w-4 text-muted-foreground" />
            Histórico Geral
          </Button>

          <Button
            variant="outline"
            className="gap-1.5"
            onClick={() => {
              setSelectedMovementItem(null);
              setMovementOpen(true);
            }}
          >
            <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
            Entrada / Ajuste
          </Button>

          <Button
            className="gap-1.5 bg-primary text-primary-foreground"
            onClick={() => {
              setItemToEdit(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Nova Peça
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Cadastrado
            </CardTitle>
            <Boxes className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalItems} itens</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.totalUnits} unidades em saldo físico
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Patrimônio em Estoque (Custo)
            </CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(metrics.totalCostValue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Projeção de venda: {formatCurrency(metrics.totalSaleValue)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Estoque Mínimo Atingido
            </CardTitle>
            <SlidersHorizontal className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {metrics.lowCount} peças
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Próximas do limite de segurança
            </p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-colors border ${
            metrics.negativeCount > 0
              ? "border-destructive/40 bg-destructive/5 hover:bg-destructive/10"
              : "border-border"
          }`}
          onClick={() => setStatusFilter(statusFilter === "negative" ? "all" : "negative")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Estoque Negativo (Pendente)
            </CardTitle>
            <AlertTriangle
              className={`h-4 w-4 ${
                metrics.negativeCount > 0 ? "text-destructive" : "text-muted-foreground"
              }`}
            />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                metrics.negativeCount > 0 ? "text-destructive" : "text-foreground"
              }`}
            >
              {metrics.negativeCount} peças
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.negativeCount > 0
                ? "Baixadas em orçamentos sem reposição física"
                : "Nenhum furo de estoque"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome da peça, SKU ou gaveteiro..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Categorias</SelectItem>
                <SelectItem value="pecas">Peças de Reposição</SelectItem>
                <SelectItem value="componentes">Componentes Eletrônicos</SelectItem>
                <SelectItem value="insumos">Insumos & Solda</SelectItem>
                <SelectItem value="telas_baterias">Telas & Baterias</SelectItem>
                <SelectItem value="acessorios">Acessórios</SelectItem>
                <SelectItem value="outros">Outros</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(val: "all" | "low_negative" | "negative") => setStatusFilter(val)}
            >
              <SelectTrigger className="w-full sm:w-[210px]">
                <SelectValue placeholder="Status do Saldo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Saldos</SelectItem>
                <SelectItem value="low_negative">Abaixo do Mínimo / Negativo</SelectItem>
                <SelectItem value="negative">Apenas Estoque Negativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[110px]">Código / SKU</TableHead>
                <TableHead>Peça / Item</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-center">Saldo em Estoque</TableHead>
                <TableHead className="text-right">Custo Unit.</TableHead>
                <TableHead className="text-right">Preço Venda</TableHead>
                <TableHead className="text-right">Margem %</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    Carregando estoque de peças...
                  </TableCell>
                </TableRow>
              ) : filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Boxes className="h-8 w-8 text-muted-foreground/50" />
                      <p className="font-medium text-foreground">Nenhuma peça encontrada.</p>
                      <p className="text-xs">
                        {search || categoryFilter !== "all" || statusFilter !== "all"
                          ? "Tente ajustar os filtros de busca acima."
                          : "Comece cadastrando suas peças ou aprove um orçamento na Calculadora."}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 gap-1.5"
                        onClick={() => {
                          setItemToEdit(null);
                          setFormOpen(true);
                        }}
                      >
                        <Plus className="h-4 w-4" /> Cadastrar Primeira Peça
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => {
                  const qty = Number(item.quantity) || 0;
                  const min = Number(item.min_quantity) || 0;
                  const cost = Number(item.cost_price) || 0;
                  const sale = Number(item.sale_price) || 0;
                  const margin = sale > 0 ? Math.round(((sale - cost) / sale) * 100) : 0;

                  const isNegative = qty < 0;
                  const isLow = qty <= min && !isNegative;

                  return (
                    <TableRow key={item.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {item.sku || "-"}
                      </TableCell>

                      <TableCell>
                        <div className="font-medium text-sm text-foreground">{item.name}</div>
                        {item.location && (
                          <div className="text-[11px] text-muted-foreground">
                            Local: {item.location}
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="text-xs capitalize text-muted-foreground">
                        {item.category.replace("_", " & ")}
                      </TableCell>

                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={`font-mono text-xs px-2.5 py-0.5 ${
                            isNegative
                              ? "bg-destructive/15 text-destructive border-destructive/30 font-bold gap-1"
                              : isLow
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          }`}
                        >
                          {isNegative && <AlertTriangle className="h-3 w-3 inline" />}
                          {qty} {item.unit}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right text-xs text-muted-foreground">
                        {formatCurrency(cost)}
                      </TableCell>

                      <TableCell className="text-right text-xs font-medium text-foreground">
                        {formatCurrency(sale)}
                      </TableCell>

                      <TableCell className="text-right text-xs">
                        <span
                          className={`font-semibold ${
                            margin >= 30 ? "text-emerald-500" : margin > 0 ? "text-amber-500" : "text-muted-foreground"
                          }`}
                        >
                          {margin}%
                        </span>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                            title="Entrada / Ajuste rápido"
                            onClick={() => {
                              setSelectedMovementItem(item);
                              setMovementOpen(true);
                            }}
                          >
                            <ArrowDownLeft className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                            title="Histórico Kardex"
                            onClick={() => {
                              setSelectedHistoryItem(item);
                              setHistoryOpen(true);
                            }}
                          >
                            <History className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            title="Editar peça"
                            onClick={() => {
                              setItemToEdit(item);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Excluir peça"
                            onClick={() => setDeleteTarget(item)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ItemFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        itemToEdit={itemToEdit}
        onSuccess={fetchItems}
      />

      <MovementDialog
        open={movementOpen}
        onOpenChange={setMovementOpen}
        selectedItem={selectedMovementItem}
        items={items}
        onSuccess={fetchItems}
      />

      <MovementsHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        item={selectedHistoryItem}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Peça do Estoque?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá a peça <strong>"{deleteTarget?.name}"</strong> do catálogo de estoque. O histórico de movimentações anteriores será preservado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo..." : "Sim, Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
