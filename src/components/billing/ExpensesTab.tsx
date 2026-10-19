import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Receipt, Calendar, RefreshCw, DollarSign, Tag } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { OperationalExpense, ExpenseCategory } from "@/types/expenses";

const CATEGORY_MAP: Record<ExpenseCategory, { label: string; color: string }> = {
  administrativa: { label: "Administrativa", color: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20" },
  software_cloud: { label: "Software & Cloud", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  ferramentas_oficina: { label: "Ferramentas & Bancada", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  infraestrutura: { label: "Infraestrutura (Aluguel/Luz)", color: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20" },
  comercial_marketing: { label: "Marketing & Vendas", color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20" },
  tributos_taxas: { label: "Tributos & Taxas", color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" },
  outros: { label: "Outros", color: "bg-muted text-muted-foreground border-border" },
};

function formatCurrency(val: number): string {
  return (val || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface ExpensesTabProps {
  expenses: OperationalExpense[];
  onRefresh: () => void;
}

export function ExpensesTab({ expenses, onRefresh }: ExpensesTabProps) {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form states
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("administrativa");
  const [amount, setAmount] = useState<number>(0);
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringPeriod, setRecurringPeriod] = useState<"mensal" | "anual">("mensal");
  const [notes, setNotes] = useState("");

  const [categoryFilter, setCategoryFilter] = useState("all");

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (categoryFilter !== "all" && e.category !== categoryFilter) return false;
      return true;
    });
  }, [expenses, categoryFilter]);

  const totalMonthlyRecurring = useMemo(() => {
    return expenses
      .filter((e) => e.is_recurring && e.recurring_period === "mensal")
      .reduce((sum, e) => sum + Number(e.amount), 0);
  }, [expenses]);

  const totalAllExpenses = useMemo(() => {
    return expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  }, [expenses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!description.trim() || amount <= 0) {
      toast.error("Informe a descrição e o valor da despesa.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("operational_expenses").insert({
        user_id: user.id,
        description: description.trim(),
        category,
        amount: Number(amount),
        expense_date: expenseDate,
        is_recurring: isRecurring,
        recurring_period: isRecurring ? recurringPeriod : null,
        notes: notes.trim() || null,
      });

      if (error) throw error;
      toast.success("Despesa operacional registrada com sucesso!");
      setModalOpen(false);
      setDescription("");
      setAmount(0);
      setNotes("");
      setIsRecurring(false);
      onRefresh();
    } catch (err: unknown) {
      console.error("Erro ao salvar despesa:", err);
      const msg = err instanceof Error ? err.message : "Erro ao registrar despesa.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("operational_expenses").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir despesa.");
    } else {
      toast.success("Despesa excluída com sucesso.");
      onRefresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Despesas Operacionais (OPEX)</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cadastre custos fixos e variáveis da sua operação para apuração automática do DRE.
          </p>
        </div>

        <Button
          onClick={() => setModalOpen(true)}
          className="gap-1.5 bg-primary text-primary-foreground self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" /> Nova Despesa
        </Button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardHeader className="pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total de Despesas Lançadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(totalAllExpenses)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {expenses.length} lançamentos registrados
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Custos Fixos Mensais (Recorrentes)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {formatCurrency(totalMonthlyRecurring)}/mês
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Aluguel, internet, licenças e softwares
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Categorias Ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {new Set(expenses.map((e) => e.category)).size} de {Object.keys(CATEGORY_MAP).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Mapeamento de despesas para o DRE
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Table */}
      <Card className="border-border">
        <CardHeader className="p-4 pb-2 border-b border-border flex flex-row items-center justify-between">
          <div className="text-sm font-semibold">Lançamentos de Despesas</div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Categorias</SelectItem>
              {Object.entries(CATEGORY_MAP).map(([key, item]) => (
                <SelectItem key={key} value={key}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-center">Recorrência</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-xs">
                    Nenhuma despesa cadastrada. Clique em "Nova Despesa" para registrar.
                  </TableCell>
                </TableRow>
              ) : (
                filteredExpenses.map((e) => {
                  const cat = CATEGORY_MAP[e.category] || CATEGORY_MAP.outros;

                  return (
                    <TableRow key={e.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(e.expense_date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-xs text-foreground">{e.description}</div>
                        {e.notes && <div className="text-[10px] text-muted-foreground">{e.notes}</div>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] py-0 px-2 ${cat.color}`}>
                          {cat.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {e.is_recurring ? (
                          <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 gap-1">
                            <RefreshCw className="h-2.5 w-2.5" />
                            {e.recurring_period === "mensal" ? "Mensal" : "Anual"}
                          </Badge>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">Avulsa</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-medium text-foreground">
                        {formatCurrency(e.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(e.id)}
                          title="Excluir"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Nova Despesa */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Despesa Operacional</DialogTitle>
            <DialogDescription>
              Adicione despesas fixas ou variáveis que serão contabilizadas no DRE.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="exp-desc">Descrição *</Label>
              <Input
                id="exp-desc"
                placeholder="Ex: Assinatura Figma / Aluguel da Oficina / Internet"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Categoria DRE</Label>
                <Select value={category} onValueChange={(val: ExpenseCategory) => setCategory(val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_MAP).map(([key, item]) => (
                      <SelectItem key={key} value={key}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="exp-amt">Valor (R$) *</Label>
                <Input
                  id="exp-amt"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount || ""}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="exp-date">Data de Competência</Label>
                <Input
                  id="exp-date"
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5 flex flex-col justify-end">
                <div className="flex items-center justify-between p-2 rounded-md border border-border h-10">
                  <Label htmlFor="exp-rec" className="text-xs cursor-pointer">
                    Custo Recorrente?
                  </Label>
                  <Switch
                    id="exp-rec"
                    checked={isRecurring}
                    onCheckedChange={setIsRecurring}
                  />
                </div>
              </div>
            </div>

            {isRecurring && (
              <div className="space-y-1.5">
                <Label>Periodicidade da Recorrência</Label>
                <Select
                  value={recurringPeriod}
                  onValueChange={(val: "mensal" | "anual") => setRecurringPeriod(val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensal">Mensal (repete todo mês no DRE)</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="exp-notes">Observações / Fornecedor</Label>
              <Textarea
                id="exp-notes"
                rows={2}
                placeholder="Ex: Pago via débito automático / NF 3012"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="bg-primary text-primary-foreground">
                {loading ? "Salvando..." : "Salvar Despesa"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
