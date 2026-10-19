import { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FileSpreadsheet,
  Plus,
  Pencil,
  Trash2,
  FileDown,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  DollarSign,
  ArrowRight,
  Rocket,
  Wrench,
  Layers,
  AlertTriangle,
  Globe,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  generateBudgetPdf,
  generateMaintenanceBudgetPdf,
} from "@/lib/generateBudgetPdf";
import type { BudgetData } from "@/types/budget";
import type { MaintenanceBudgetData } from "@/types/maintenance";
import { depleteBudgetStock, restockBudgetStock } from "@/services/inventoryService";
import { ClientHubModal } from "@/components/clientHub/ClientHubModal";
import { SendBudgetEmailModal } from "@/components/budgets/SendBudgetEmailModal";

interface BudgetRecord {
  id: string;
  budget_number: string;
  status: "aguardando" | "aprovado" | "cancelado";
  client_name: string;
  client_email: string | null;
  project_name: string;
  total_value: number;
  budget_data: any;
  email_sent_at?: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_CONFIG = {
  aguardando: {
    label: "Aguardando",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
    icon: Clock,
  },
  aprovado: {
    label: "Aprovado",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
    icon: CheckCircle2,
  },
  cancelado: {
    label: "Cancelado",
    className: "bg-destructive/10 text-destructive border border-destructive/20",
    icon: XCircle,
  },
};

function formatCurrency(val: number): string {
  return (val || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function BudgetsList() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [budgets, setBudgets] = useState<BudgetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<BudgetRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Convert to Project State
  const [convertTarget, setConvertTarget] = useState<BudgetRecord | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  // Send Email State
  const [sendEmailTarget, setSendEmailTarget] = useState<BudgetRecord | null>(null);

  // Client Hub Modal State
  const [hubTarget, setHubTarget] = useState<BudgetRecord | null>(null);

  // Download PDF loading state per budget
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchBudgets = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("budgets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching budgets:", error);
        toast.error("Erro ao carregar lista de orçamentos.");
      } else {
        setBudgets((data as BudgetRecord[]) || []);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  // Status Change
  const handleStatusChange = async (budgetId: string, newStatus: "aguardando" | "aprovado" | "cancelado") => {
    if (!user) return;
    const currentBudget = budgets.find((b) => b.id === budgetId);
    const oldStatus = currentBudget?.status;

    const { error } = await supabase
      .from("budgets")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", budgetId);

    if (error) {
      toast.error("Erro ao atualizar status do orçamento.");
      return;
    }

    toast.success(`Status atualizado para "${STATUS_CONFIG[newStatus].label}"`);
    setBudgets((prev) =>
      prev.map((b) => (b.id === budgetId ? { ...b, status: newStatus } : b))
    );

    // Baixa automática de estoque ao aprovar orçamento com peças
    if (newStatus === "aprovado" && currentBudget?.budget_data?.parts) {
      const parts = currentBudget.budget_data.parts;
      const depletion = await depleteBudgetStock(budgetId, parts, user.id);

      if (depletion.depletedCount > 0) {
        toast.success(
          `Estoque atualizado: ${depletion.depletedCount} peça(s) baixada(s) automaticamente.`
        );
      }
      if (depletion.createdItems.length > 0) {
        toast.info(
          `Nova(s) peça(s) cadastrada(s) no estoque com saldo negativo: ${depletion.createdItems.join(", ")}`
        );
      }
      if (depletion.negativeItems.length > 0) {
        toast.warning(
          `Atenção: Peças com saldo negativo: ${depletion.negativeItems.map((i) => `${i.name} (${i.currentQuantity})`).join(", ")}`
        );
      }
    }

    // Estorno automático ao cancelar orçamento que já estava aprovado
    if (newStatus === "cancelado" && oldStatus === "aprovado") {
      const restored = await restockBudgetStock(budgetId, user.id);
      if (restored > 0) {
        toast.info(`Estorno de estoque: ${restored} peça(s) devolvida(s) ao saldo.`);
      }
    }
  };

  // Delete Budget
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("budgets")
        .delete()
        .eq("id", deleteTarget.id);

      if (error) {
        toast.error("Erro ao excluir orçamento.");
      } else {
        toast.success(`Orçamento ${deleteTarget.budget_number} excluído.`);
        setBudgets((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      }
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  // Convert Approved Budget to Project
  const handleConvertConfirm = async () => {
    if (!convertTarget || !user) return;
    setIsConverting(true);
    try {
      // Find client id by name
      let clientId: string | null = null;
      const { data: clients } = await supabase
        .from("clients")
        .select("id, name")
        .eq("user_id", user.id);

      if (clients && clients.length > 0) {
        const found = clients.find(
          (c) => c.name.toLowerCase() === convertTarget.client_name.toLowerCase()
        );
        if (found) clientId = found.id;
      }

      const bData = convertTarget.budget_data || {};
      const estimatedHours = bData.hours || bData.laborHours || 0;

      const { data: newProj, error } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          client_id: clientId,
          name: convertTarget.project_name,
          description: `Originado do Orçamento ${convertTarget.budget_number}`,
          status: "em_andamento",
          value: convertTarget.total_value,
          estimated_hours: estimatedHours || null,
          general_notes: bData.notes || bData.technicalDiagnosis || null,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating project:", error);
        toast.error("Erro ao converter orçamento em projeto.");
      } else {
        toast.success(`Projeto "${convertTarget.project_name}" criado com sucesso!`);
        navigate(`/projects/${newProj.id}`);
      }
    } finally {
      setIsConverting(false);
      setConvertTarget(null);
    }
  };

  // Regenerate PDF
  const handleDownloadPdf = async (budget: BudgetRecord) => {
    setDownloadingId(budget.id);
    try {
      let bData = { ...(budget.budget_data || {}) };

      // Dynamic enrichment: If client address, phone or cpf is missing from budget_data, enrich from clients table
      if (!bData.clientAddress || !bData.clientPhone || !bData.clientCpf) {
        if (user) {
          const { data: matchedClients } = await supabase
            .from("clients")
            .select("*")
            .eq("user_id", user.id);

          if (matchedClients && matchedClients.length > 0) {
            const clientMatch = matchedClients.find(
              (c) =>
                c.name.toLowerCase().trim() === budget.client_name.toLowerCase().trim() ||
                (budget.client_email && c.email && c.email.toLowerCase().trim() === budget.client_email.toLowerCase().trim())
            );

            if (clientMatch) {
              if (!bData.clientPhone && clientMatch.phone) bData.clientPhone = clientMatch.phone;
              if (!bData.clientEmail && clientMatch.email) bData.clientEmail = clientMatch.email;
              if (!bData.clientCpf && clientMatch.cpf_cnpj) bData.clientCpf = clientMatch.cpf_cnpj;
              if (!bData.clientAddress && (clientMatch.address || clientMatch.city)) {
                bData.clientAddress = [
                  clientMatch.address ? `${clientMatch.address}${clientMatch.address_number ? `, nº ${clientMatch.address_number}` : ""}` : "",
                  clientMatch.complement,
                  clientMatch.neighborhood,
                  clientMatch.city && clientMatch.state ? `${clientMatch.city}/${clientMatch.state}` : clientMatch.city,
                  clientMatch.cep ? `CEP ${clientMatch.cep}` : "",
                ].filter(Boolean).join(" - ");
              }
            }
          }
        }
      }

      if (bData?.budget_type === "maintenance" || budget.budget_number.startsWith("MAN-")) {
        await generateMaintenanceBudgetPdf(bData as MaintenanceBudgetData);
      } else {
        await generateBudgetPdf(bData as BudgetData);
      }
      toast.success(`PDF do orçamento ${budget.budget_number} gerado!`);
    } catch (err) {
      console.error("Error generating PDF:", err);
      toast.error("Erro ao gerar PDF.");
    } finally {
      setDownloadingId(null);
    }
  };

  // Metrics
  const metrics = useMemo(() => {
    const totalCount = budgets.length;
    const aguardandoCount = budgets.filter((b) => b.status === "aguardando").length;
    const aprovadoCount = budgets.filter((b) => b.status === "aprovado").length;
    const totalVolume = budgets.reduce((acc, b) => acc + (Number(b.total_value) || 0), 0);
    const aprovadoVolume = budgets
      .filter((b) => b.status === "aprovado")
      .reduce((acc, b) => acc + (Number(b.total_value) || 0), 0);

    return { totalCount, aguardandoCount, aprovadoCount, totalVolume, aprovadoVolume };
  }, [budgets]);

  // Filtered List
  const filteredBudgets = useMemo(() => {
    return budgets.filter((b) => {
      // Search
      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search ||
        b.budget_number.toLowerCase().includes(searchLower) ||
        b.client_name.toLowerCase().includes(searchLower) ||
        b.project_name.toLowerCase().includes(searchLower);

      // Status
      const matchesStatus = statusFilter === "all" || b.status === statusFilter;

      // Type
      const isMaint =
        b.budget_number.startsWith("MAN-") || b.budget_data?.budget_type === "maintenance";
      const matchesType =
        typeFilter === "all" ||
        (typeFilter === "maintenance" && isMaint) ||
        (typeFilter === "service" && !isMaint);

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [budgets, search, statusFilter, typeFilter]);

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Gestão de Orçamentos
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
              {budgets.length} {budgets.length === 1 ? "registro" : "registros"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie, altere propostas em aberto, gere PDFs de 1 página e converta orçamentos aprovados em projetos.
          </p>
        </div>

        <Button asChild size="default" className="shadow-subtle gap-2">
          <Link to="/calculator">
            <Plus className="h-4 w-4" />
            Novo Orçamento
          </Link>
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-card border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total de Orçamentos
            </CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{metrics.totalCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Volume total: <span className="font-semibold text-foreground">{formatCurrency(metrics.totalVolume)}</span>
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Em Aberto / Aguardando
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
              {metrics.aguardandoCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Podem ser editados antes de aprovar
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Aprovados
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {metrics.aprovadoCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Prontos para virar projetos
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Receita Aprovada
            </CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {formatCurrency(metrics.aprovadoVolume)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Convertido em fechamentos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <Card className="shadow-card border-border/80">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, nº do orçamento ou projeto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>

            <div className="flex flex-wrap sm:flex-nowrap gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px] bg-background">
                  <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="aguardando">Aguardando</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[170px] bg-background">
                  <Layers className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Tipos</SelectItem>
                  <SelectItem value="service">Serviços (ORC-)</SelectItem>
                  <SelectItem value="maintenance">Manutenção (MAN-)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budgets Table */}
      <Card className="shadow-card border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Propostas & Orçamentos</CardTitle>
          <CardDescription>
            Clique no lápis para alterar um orçamento em aberto, ou converta em projeto quando aprovado.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              Carregando lista de orçamentos...
            </div>
          ) : filteredBudgets.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-muted/60 mx-auto flex items-center justify-center">
                <FileSpreadsheet className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">Nenhum orçamento encontrado</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {search || statusFilter !== "all" || typeFilter !== "all"
                  ? "Tente ajustar os filtros ou a busca digitada acima."
                  : "Comece gerando o seu primeiro orçamento na Calculadora."}
              </p>
              {!(search || statusFilter !== "all" || typeFilter !== "all") && (
                <Button asChild size="sm" className="mt-2">
                  <Link to="/calculator">Criar Primeiro Orçamento</Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-[170px] font-medium">Nº Orçamento</TableHead>
                    <TableHead className="font-medium">Cliente</TableHead>
                    <TableHead className="font-medium">Projeto / Produto</TableHead>
                    <TableHead className="text-right font-medium">Valor Total</TableHead>
                    <TableHead className="w-[140px] font-medium">Status</TableHead>
                    <TableHead className="w-[100px] font-medium">Data</TableHead>
                    <TableHead className="w-[160px] text-right font-medium">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBudgets.map((budget) => {
                    const isMaint =
                      budget.budget_number.startsWith("MAN-") ||
                      budget.budget_data?.budget_type === "maintenance";
                    const isApproved = budget.status === "aprovado";
                    const statusCfg = STATUS_CONFIG[budget.status] || STATUS_CONFIG.aguardando;

                    return (
                      <TableRow key={budget.id} className="hover:bg-muted/30">
                        {/* Budget Number & Type Badge */}
                        <TableCell className="font-mono text-xs">
                          <div className="flex flex-col gap-1 items-start">
                            <span className="font-bold text-foreground text-sm">
                              {budget.budget_number}
                            </span>
                            {isMaint ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                                <Wrench className="h-2.5 w-2.5" />
                                Manutenção
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30">
                                <Layers className="h-2.5 w-2.5" />
                                Serviço
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Client */}
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium text-sm text-foreground">{budget.client_name}</p>
                            {budget.client_email && (
                              <p className="text-xs text-muted-foreground">{budget.client_email}</p>
                            )}
                            {budget.email_sent_at && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/30">
                                      <Mail className="h-2.5 w-2.5" />
                                      Enviado por e-mail em {format(new Date(budget.email_sent_at), "dd/MM")}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Último envio por e-mail registrado em{" "}
                                    {format(new Date(budget.email_sent_at), "dd/MM/yyyy 'às' HH:mm", {
                                      locale: ptBR,
                                    })}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>

                        {/* Project / Product */}
                        <TableCell>
                          <p className="text-sm font-medium text-foreground line-clamp-1">
                            {budget.project_name}
                          </p>
                          {budget.budget_data?.productName && (
                            <p className="text-xs text-muted-foreground">
                              {budget.budget_data.brandModel || budget.budget_data.serialNumber || ""}
                            </p>
                          )}
                        </TableCell>

                        {/* Value */}
                        <TableCell className="text-right font-semibold text-sm">
                          {formatCurrency(Number(budget.total_value))}
                        </TableCell>

                        {/* Status Select */}
                        <TableCell>
                          <Select
                            value={budget.status}
                            onValueChange={(val) =>
                              handleStatusChange(budget.id, val as "aguardando" | "aprovado" | "cancelado")
                            }
                          >
                            <SelectTrigger className="h-7 w-[130px] border-0 bg-transparent p-0">
                              <span
                                className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${statusCfg.className}`}
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                {statusCfg.label}
                              </span>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="aguardando">
                                <span className="flex items-center gap-2">
                                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                                  Aguardando
                                </span>
                              </SelectItem>
                              <SelectItem value="aprovado">
                                <span className="flex items-center gap-2">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                  Aprovado
                                </span>
                              </SelectItem>
                              <SelectItem value="cancelado">
                                <span className="flex items-center gap-2">
                                  <XCircle className="h-3.5 w-3.5 text-destructive" />
                                  Cancelado
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>

                        {/* Date */}
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(budget.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Convert to Project (Enabled only if approved) */}
                            {isApproved && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                                      onClick={() => setConvertTarget(budget)}
                                    >
                                      <Rocket className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Converter em Projeto em Andamento</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}

                            {/* Edit Action */}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-foreground hover:bg-muted"
                                      disabled={isApproved}
                                      onClick={() => navigate(`/calculator?edit=${budget.id}`)}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {isApproved
                                    ? "Orçamento aprovado não pode ser alterado"
                                    : "Editar Orçamento na Calculadora"}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            {/* Client Hub Public Link Action */}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                                    onClick={() => setHubTarget(budget)}
                                  >
                                    <Globe className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Portal do Cliente (Link Público)</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            {/* Send by Email Action */}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-sky-600 dark:text-sky-400 hover:text-sky-700 hover:bg-sky-500/10"
                                    onClick={() => setSendEmailTarget(budget)}
                                  >
                                    <Mail className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Encaminhar Orçamento por E-mail</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            {/* Download PDF Action */}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-foreground hover:bg-muted"
                                    disabled={downloadingId === budget.id}
                                    onClick={() => handleDownloadPdf(budget)}
                                  >
                                    <FileDown className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Baixar PDF (1 Página)</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            {/* Delete Action */}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => setDeleteTarget(budget)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Excluir Orçamento</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Excluir Orçamento
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o orçamento{" "}
              <strong className="text-foreground">{deleteTarget?.budget_number}</strong> de{" "}
              <strong className="text-foreground">{deleteTarget?.client_name}</strong> no valor de{" "}
              <strong className="text-foreground">
                {deleteTarget ? formatCurrency(deleteTarget.total_value) : ""}
              </strong>
              ? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Excluindo..." : "Sim, Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Convert to Project Confirmation Dialog */}
      <AlertDialog open={!!convertTarget} onOpenChange={(open) => !open && setConvertTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <Rocket className="h-5 w-5" />
              Converter em Projeto
            </AlertDialogTitle>
            <AlertDialogDescription>
              Deseja criar automaticamente um projeto em andamento a partir do orçamento aprovado{" "}
              <strong className="text-foreground">{convertTarget?.budget_number}</strong>?
              <br /><br />
              O projeto será cadastrado com o cliente <strong>{convertTarget?.client_name}</strong> e valor de{" "}
              <strong>{convertTarget ? formatCurrency(convertTarget.total_value) : ""}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isConverting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConvertConfirm}
              disabled={isConverting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isConverting ? "Criando Projeto..." : "Sim, Converter em Projeto"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Client Hub Modal */}
      {hubTarget && (
        <ClientHubModal
          open={!!hubTarget}
          onOpenChange={(open) => !open && setHubTarget(null)}
          budgetId={hubTarget.id}
          title={hubTarget.project_name}
          clientName={hubTarget.client_name}
          clientPhone={hubTarget.budget_data?.clientPhone}
        />
      )}

      {/* Send Budget by Email Modal */}
      <SendBudgetEmailModal
        budget={sendEmailTarget}
        open={!!sendEmailTarget}
        onOpenChange={(open) => !open && setSendEmailTarget(null)}
        onSuccess={fetchBudgets}
      />
    </div>
  );
}
