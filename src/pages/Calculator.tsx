import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calculator as CalculatorIcon,
  Plus,
  Trash2,
  DollarSign,
  Clock,
  Layers,
  Percent,
  Tag,
  FileDown,
  User,
  FolderKanban,
  ChevronsUpDown,
  Check,
  CalendarDays,
  FileText,
  History,
  RefreshCw,
  Wrench,
  Repeat,
  PackagePlus,
  Sparkles,
  Pencil,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
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
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { generateBudgetPdf, exportBudgetPdf, type BudgetData } from "@/lib/generateBudgetPdf";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MaintenanceCalculator } from "@/components/calculator/MaintenanceCalculator";
import { cn } from "@/lib/utils";

type CostCategory = "setup" | "mensal" | "extra";

interface CostItem {
  id: string;
  name: string;
  value: number;
  category: CostCategory;
}

interface ClientOption {
  id: string;
  name: string;
  email: string | null;
  phone?: string | null;
  company?: string | null;
  cpf_cnpj?: string | null;
  cep?: string | null;
  address?: string | null;
  address_number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
}

interface BudgetRecord {
  id: string;
  budget_number: string;
  status: string;
  client_name: string;
  client_email: string | null;
  project_name: string;
  total_value: number;
  budget_data: BudgetData;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  aguardando: { label: "Aguardando", className: "bg-warning/10 text-warning" },
  aprovado: { label: "Aprovado", className: "bg-success/10 text-success" },
  cancelado: { label: "Cancelado", className: "bg-destructive/10 text-destructive" },
};

const CATEGORY_CONFIG: Record<CostCategory, { label: string; icon: typeof Wrench; color: string }> = {
  setup: { label: "Setup Inicial", icon: Wrench, color: "text-blue-400" },
  mensal: { label: "Custo Fixo Mensal", icon: Repeat, color: "text-emerald-400" },
  extra: { label: "Custo Extra", icon: PackagePlus, color: "text-amber-400" },
};

const Calculator = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const editId = searchParams.get("edit");

  // Tab State
  const [activeTab, setActiveTab] = useState<string>("services");

  // Edit Mode State
  const [editingBudget, setEditingBudget] = useState<BudgetRecord | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<BudgetRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Budget info
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [clientCpf, setClientCpf] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [projectName, setProjectName] = useState("");
  const [validityDays, setValidityDays] = useState(30);
  const [paymentConditions, setPaymentConditions] = useState("");
  const [notes, setNotes] = useState("");
  const [budgetNumber, setBudgetNumber] = useState("");
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Client combobox
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientComboOpen, setClientComboOpen] = useState(false);

  // Profile
  const [freelancerName, setFreelancerName] = useState("");
  const [freelancerEmail, setFreelancerEmail] = useState("");
  const [freelancerPhone, setFreelancerPhone] = useState("");
  const [freelancerWebsite, setFreelancerWebsite] = useState("");
  const [freelancerLogo, setFreelancerLogo] = useState<string | null>(null);
  const [freelancerCnpj, setFreelancerCnpj] = useState("");
  const [freelancerAddress, setFreelancerAddress] = useState("");
  const [freelancerPixKeyType, setFreelancerPixKeyType] = useState("");
  const [freelancerPixKey, setFreelancerPixKey] = useState("");

  // Base
  const [hourlyRate, setHourlyRate] = useState(100);
  const [hours, setHours] = useState(40);
  const [complexity, setComplexity] = useState(1.0);

  // Costs - now with categories
  const [costsList, setCostsList] = useState<CostItem[]>([]);

  // Modifiers
  const [profitMargin, setProfitMargin] = useState(0);
  const [tax, setTax] = useState(0);
  const [discountValue, setDiscountValue] = useState(0);

  // Budget history
  const [budgetHistory, setBudgetHistory] = useState<BudgetRecord[]>([]);

  // Fetch budget history
  const fetchBudgetHistory = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("budgets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) {
      setBudgetHistory(data.map((b) => ({ ...b, budget_data: b.budget_data as unknown as BudgetData })));
    }
  }, [user]);

  // Fetch initial data
  useEffect(() => {
    if (!user) return;

    supabase
      .from("pricing_parameters")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setHourlyRate(Number(data.hourly_rate));
          setComplexity(Number(data.default_complexity));
        }
      });

    supabase
      .from("clients")
      .select("*")
      .eq("user_id", user.id)
      .order("name")
      .then(({ data }) => {
        setClients((data as ClientOption[]) || []);
      });

    supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setFreelancerName(data.company_name || data.display_name || "");
          setFreelancerPhone(data.phone || "");
          setFreelancerWebsite(data.website || "");
          setFreelancerLogo(data.avatar_url || null);
          const p = data as any;
          let cnpjVal = p.cnpj || "";
          let addressVal = p.address || "";
          let pixTypeVal = p.pix_key_type || "";
          let pixKeyVal = p.pix_key || "";

          try {
            const localExt = localStorage.getItem(`freelance_flow_profile_extended_${user.id}`);
            if (localExt) {
              const parsed = JSON.parse(localExt);
              if (!cnpjVal && parsed.cnpj) cnpjVal = parsed.cnpj;
              if (!addressVal && parsed.address) addressVal = parsed.address;
              if (!pixTypeVal && parsed.pix_key_type) pixTypeVal = parsed.pix_key_type;
              if (!pixKeyVal && parsed.pix_key) pixKeyVal = parsed.pix_key;
            }
          } catch {
            // ignore JSON error
          }

          setFreelancerCnpj(cnpjVal);
          setFreelancerAddress(addressVal);
          setFreelancerPixKeyType(pixTypeVal);
          setFreelancerPixKey(pixKeyVal);
        }
      });

    setFreelancerEmail(user.email || "");
    fetchBudgetHistory();
  }, [user, fetchBudgetHistory]);

  // Load Budget for Editing if ?edit=ID is present
  useEffect(() => {
    if (!user || !editId) {
      setEditingBudget(null);
      return;
    }

    const fetchBudgetToEdit = async () => {
      setLoadingEdit(true);
      const { data, error } = await supabase
        .from("budgets")
        .select("*")
        .eq("id", editId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error || !data) {
        toast.error("Orçamento não encontrado.");
        setSearchParams({});
        setLoadingEdit(false);
        return;
      }

      const record = { ...data, budget_data: data.budget_data as any } as BudgetRecord;

      if (record.status === "aprovado") {
        toast.warning(
          "Este orçamento já foi aprovado e não pode ser editado. Altere o status para 'Aguardando' caso precise reabri-lo."
        );
        navigate("/budgets");
        setLoadingEdit(false);
        return;
      }

      setEditingBudget(record);

      const bData = record.budget_data || {};
      const isMaint = record.budget_number.startsWith("MAN-") || bData.budget_type === "maintenance";

      if (isMaint) {
        setActiveTab("maintenance");
      } else {
        setActiveTab("services");
        setBudgetNumber(record.budget_number);
        setClientName(record.client_name || "");
        setClientEmail(record.client_email || "");
        setClientPhone(bData.clientPhone || "");
        setClientCompany(bData.clientCpf || bData.clientCompany || "");
        setProjectName(bData.projectName || record.project_name || "");
        if (bData.paymentConditions) setPaymentConditions(bData.paymentConditions);
        if (bData.notes) setNotes(bData.notes);
        if (bData.hours !== undefined) setHours(Number(bData.hours));
        if (bData.hourlyRate !== undefined) setHourlyRate(Number(bData.hourlyRate));
        if (bData.complexity !== undefined) setComplexity(Number(bData.complexity));
        if (bData.costs) setCostsList(bData.costs);
        if (bData.profitMargin !== undefined) setProfitMargin(Number(bData.profitMargin));
        if (bData.tax !== undefined) setTax(Number(bData.tax));
        if (bData.discount !== undefined) setDiscountValue(Number(bData.discount));
      }
      setLoadingEdit(false);
    };

    fetchBudgetToEdit();
  }, [user, editId]);

  const handleCancelEdit = () => {
    setEditingBudget(null);
    setSearchParams({});
    const year = new Date().getFullYear();
    setBudgetNumber(`ORC-${year}-...`);
    setProjectName("");
    setClientName("");
    setClientEmail("");
    setClientPhone("");
    setClientCompany("");
    setPaymentConditions("");
    setNotes("");
    setCostsList([]);
    setDiscountValue(0);
  };

  const handleDeleteBudgetConfirm = async () => {
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
        setBudgetHistory((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      }
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  useEffect(() => {
    if (editingBudget) return;
    const year = new Date().getFullYear();
    setBudgetNumber(`ORC-${year}-...`);
  }, [editingBudget]);

  const addCost = (category: CostCategory) => {
    setCostsList([...costsList, { id: crypto.randomUUID(), name: "", value: 0, category }]);
  };

  const removeCost = (id: string) => {
    setCostsList(costsList.filter((c) => c.id !== id));
  };

  const updateCost = (id: string, field: keyof CostItem, value: string | number) => {
    setCostsList(costsList.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  // Grouped costs
  const setupCosts = costsList.filter((c) => c.category === "setup");
  const mensalCosts = costsList.filter((c) => c.category === "mensal");
  const extraCosts = costsList.filter((c) => c.category === "extra");

  const totalSetup = setupCosts.reduce((acc, c) => acc + (Number(c.value) || 0), 0);
  const totalMensal = mensalCosts.reduce((acc, c) => acc + (Number(c.value) || 0), 0);
  const totalExtra = extraCosts.reduce((acc, c) => acc + (Number(c.value) || 0), 0);

  // Calculations
  const basePrice = hourlyRate * hours * complexity;
  const totalCosts = totalSetup + totalMensal + totalExtra;
  const subtotal = basePrice + totalCosts;
  const profitAmount = subtotal * (profitMargin / 100);
  const subtotalWithProfit = subtotal + profitAmount;
  const taxAmount = subtotalWithProfit * (tax / 100);
  const subtotalWithTaxes = subtotalWithProfit + taxAmount;
  const totalDiscount = Number(discountValue) || 0;
  const suggestedPrice = Math.max(0, subtotalWithTaxes - totalDiscount);

  const formatCurrency = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleSelectClient = (client: ClientOption) => {
    setClientName(client.name);
    setClientEmail(client.email || "");
    setClientPhone(client.phone || "");
    setClientCompany(client.company || "");
    setClientCpf(client.cpf_cnpj || "");
    const fullAddr = [
      client.address ? `${client.address}${client.address_number ? `, nº ${client.address_number}` : ""}` : "",
      client.complement,
      client.neighborhood,
      client.city && client.state ? `${client.city}/${client.state}` : client.city,
      client.cep ? `CEP ${client.cep}` : "",
    ].filter(Boolean).join(" - ");
    setClientAddress(fullAddr);
    setClientComboOpen(false);
  };

  const filteredClients = useMemo(() => {
    if (!clientName) return clients;
    return clients.filter((c) =>
      c.name.toLowerCase().includes(clientName.toLowerCase())
    );
  }, [clients, clientName]);

  const canGeneratePdf = clientName.trim() && projectName.trim();

  const buildBudgetData = (finalBudgetNumber: string): BudgetData => {
    const today = new Date();
    const validity = addDays(today, validityDays);
    return {
      budgetNumber: finalBudgetNumber,
      date: format(today, "dd/MM/yyyy"),
      validityDate: format(validity, "dd/MM/yyyy"),
      freelancerName,
      freelancerEmail,
      freelancerPhone,
      freelancerWebsite,
      logoUrl: freelancerLogo || undefined,
      cnpj: freelancerCnpj.trim() || undefined,
      address: freelancerAddress.trim() || undefined,
      pixKeyType: freelancerPixKeyType.trim() || undefined,
      pixKey: freelancerPixKey.trim() || undefined,
      clientName: clientName.trim(),
      clientEmail: clientEmail.trim(),
      clientPhone: clientPhone || undefined,
      clientCpf: clientCpf.trim() || undefined,
      clientAddress: clientAddress.trim() || undefined,
      projectName: projectName.trim(),
      hourlyRate,
      hours,
      complexity,
      basePrice,
      setupCosts: setupCosts.filter((c) => c.name && c.value > 0).map(({ name, value }) => ({ name, value })),
      mensalCosts: mensalCosts.filter((c) => c.name && c.value > 0).map(({ name, value }) => ({ name, value })),
      extraCosts: extraCosts.filter((c) => c.name && c.value > 0).map(({ name, value }) => ({ name, value })),
      costs: costsList.filter((c) => c.name && c.value > 0).map(({ name, value }) => ({ name, value })),
      totalSetup,
      totalMensal,
      totalExtra,
      totalCosts,
      subtotal,
      profitMargin,
      profitAmount,
      tax,
      taxAmount,
      discount: totalDiscount,
      total: suggestedPrice,
      paymentConditions: paymentConditions.trim(),
      notes: notes.trim(),
    };
  };

  const getNextBudgetNumber = async (): Promise<string> => {
    if (!user) return `ORC-${new Date().getFullYear()}-001`;
    const year = new Date().getFullYear();
    const prefix = `ORC-${year}-`;

    // Count existing budgets for this year to determine next number
    const { data, error } = await supabase
      .from("budgets")
      .select("budget_number")
      .eq("user_id", user.id)
      .like("budget_number", `${prefix}%`);

    if (error || !data) {
      const fallback = Date.now().toString(36).toUpperCase().slice(-4);
      return `${prefix}${fallback}`;
    }

    const maxNum = data.reduce((max, b) => {
      const match = b.budget_number.match(/(\d+)$/);
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 0);

    return `${prefix}${String(maxNum + 1).padStart(3, "0")}`;
  };

  const handleGeneratePdf = async () => {
    if (!user || !canGeneratePdf) {
      toast.error("Preencha o nome do cliente e do projeto para gerar o orçamento.");
      return;
    }

    setGeneratingPdf(true);

    try {
      const finalBudgetNumber = editingBudget
        ? editingBudget.budget_number
        : await getNextBudgetNumber();
      setBudgetNumber(finalBudgetNumber);

      const budgetData = buildBudgetData(finalBudgetNumber);
      await generateBudgetPdf(budgetData);

      if (editingBudget) {
        // Update existing record
        const { error: updateError } = await supabase
          .from("budgets")
          .update({
            client_name: budgetData.clientName,
            client_email: budgetData.clientEmail || null,
            project_name: budgetData.projectName,
            total_value: budgetData.total,
            budget_data: JSON.parse(JSON.stringify(budgetData)),
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingBudget.id);

        if (updateError) {
          console.error("Database update error:", updateError);
          toast.warning("PDF gerado, mas houve falha ao atualizar no banco de dados.");
        } else {
          toast.success(`Orçamento ${finalBudgetNumber} atualizado com sucesso!`);
          fetchBudgetHistory();
          navigate("/budgets");
        }
      } else {
        // Save to database
        await supabase.from("budgets").insert([{
          user_id: user.id,
          budget_number: finalBudgetNumber,
          client_name: budgetData.clientName,
          client_email: budgetData.clientEmail || null,
          project_name: budgetData.projectName,
          total_value: budgetData.total,
          budget_data: JSON.parse(JSON.stringify(budgetData)),
        }]);

        toast.success(`Orçamento ${finalBudgetNumber} gerado e salvo!`);
        fetchBudgetHistory();
      }
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Erro ao gerar o PDF do orçamento.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleRegeneratePdf = async (record: BudgetRecord) => {
    const dataToExport = { ...record.budget_data };
    if (!dataToExport.logoUrl && freelancerLogo) {
      dataToExport.logoUrl = freelancerLogo;
    }
    if (!dataToExport.cnpj && freelancerCnpj) {
      dataToExport.cnpj = freelancerCnpj;
    }
    if (!dataToExport.address && freelancerAddress) {
      dataToExport.address = freelancerAddress;
    }
    if (!dataToExport.pixKey && freelancerPixKey) {
      dataToExport.pixKey = freelancerPixKey;
      dataToExport.pixKeyType = freelancerPixKeyType;
    }
    await exportBudgetPdf(dataToExport);
    toast.success(`PDF do orçamento ${record.budget_number} baixado!`);
  };

  const handleUpdateStatus = async (budgetId: string, newStatus: string) => {
    const { error } = await supabase
      .from("budgets")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", budgetId);

    if (error) {
      toast.error("Erro ao atualizar status");
    } else {
      toast.success("Status atualizado!");
      fetchBudgetHistory();
    }
  };

  // Render a cost category section
  const renderCostSection = (
    category: CostCategory,
    items: CostItem[],
    total: number
  ) => {
    const config = CATEGORY_CONFIG[category];
    const Icon = config.icon;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={cn("h-4 w-4", config.color)} />
            <span className="text-sm font-medium">{config.label}</span>
            <span className="text-xs text-muted-foreground">({items.length})</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => addCost(category)} className="h-7 text-xs">
            <Plus className="h-3 w-3 mr-1" />
            Adicionar
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="flex items-center justify-center py-4 text-center rounded-lg border border-dashed border-border">
            <p className="text-xs text-muted-foreground">Nenhum {config.label.toLowerCase()} adicionado</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((cost) => (
              <div key={cost.id} className="flex gap-2 items-center p-2 rounded-lg bg-muted/30">
                <Input
                  placeholder={`Ex: ${category === "setup" ? "Domínio, Licença" : category === "mensal" ? "Hospedagem, Banco de Dados" : "Banco de Imagens, Plugin"}`}
                  value={cost.name}
                  onChange={(e) => updateCost(cost.id, "name", e.target.value)}
                  className="bg-background text-sm h-9"
                />
                <div className="w-32">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
                    <Input
                      type="number"
                      step="0.01"
                      className="pl-7 bg-background text-sm h-9"
                      placeholder="0,00"
                      value={cost.value || ""}
                      onChange={(e) => updateCost(cost.id, "value", Number(e.target.value))}
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => removeCost(cost.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <div className="flex justify-end">
              <p className="text-xs font-medium">
                Subtotal: <span className={config.color}>{formatCurrency(total)}</span>
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
          <CalculatorIcon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Calculadora de Precificação</h1>
          <p className="text-muted-foreground mt-0.5">Monte orçamentos de serviços e manutenção de forma profissional</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2 bg-muted/60 p-1">
          <TabsTrigger value="services" className="flex items-center gap-2">
            <CalculatorIcon className="h-4 w-4" />
            <span>Serviços & Projetos</span>
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-emerald-500" />
            <span>Manutenção de Produtos</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-6 mt-0">
          {editingBudget && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-primary/30 bg-primary/5 text-sm">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <Pencil className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    Editando Orçamento de Serviço: <span className="text-primary font-mono">{editingBudget.budget_number}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Altere os parâmetros desejados e clique em Salvar para atualizar este orçamento e gerar o novo PDF.
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleCancelEdit} className="h-8 text-xs shrink-0">
                Cancelar Edição
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form - Left Column */}
            <div className="lg:col-span-2 space-y-6">
          {/* Budget Info Section */}
          <Card className="shadow-card border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Dados do Orçamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Client Name - Combobox */}
                <div className="space-y-2">
                  <Label className="text-sm">Cliente</Label>
                  <Popover open={clientComboOpen} onOpenChange={setClientComboOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={clientComboOpen}
                        className="w-full justify-between font-normal h-10"
                      >
                        <span className="flex items-center gap-2 truncate">
                          <User className="h-4 w-4 text-muted-foreground shrink-0" />
                          {clientName || "Selecionar ou digitar..."}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput
                          placeholder="Buscar cliente..."
                          value={clientName}
                          onValueChange={(val) => setClientName(val)}
                        />
                        <CommandList>
                          <CommandEmpty>
                            <div className="py-2 text-sm">
                              <p className="text-muted-foreground">Nenhum cliente encontrado.</p>
                              {clientName && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  "<span className="font-medium text-foreground">{clientName}</span>" será usado como nome avulso.
                                </p>
                              )}
                            </div>
                          </CommandEmpty>
                          <CommandGroup heading="Clientes cadastrados">
                            {filteredClients.map((client) => (
                              <CommandItem
                                key={client.id}
                                value={client.name}
                                onSelect={() => handleSelectClient(client)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    clientName === client.name ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div>
                                  <p className="text-sm font-medium">{client.name}</p>
                                  {client.email && (
                                    <p className="text-xs text-muted-foreground">{client.email}</p>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Client Phone */}
                <div className="space-y-2">
                  <Label className="text-sm">Telefone / WhatsApp</Label>
                  <Input
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="font-mono-numbers"
                  />
                </div>

                {/* Client Email */}
                <div className="space-y-2">
                  <Label className="text-sm">Email do Cliente</Label>
                  <Input
                    type="email"
                    placeholder="cliente@email.com"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                  />
                </div>

                {/* Client CPF / CNPJ */}
                <div className="space-y-2">
                  <Label className="text-sm">CPF ou CNPJ</Label>
                  <Input
                    placeholder="000.000.000-00"
                    value={clientCpf}
                    onChange={(e) => setClientCpf(e.target.value)}
                    className="font-mono-numbers"
                  />
                </div>

                {/* Client Address */}
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-sm">Endereço do Cliente (para o PDF)</Label>
                  <Input
                    placeholder="Rua, número, complemento, bairro, cidade - UF, CEP"
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                  />
                </div>

                {/* Project Name */}
                <div className="space-y-2">
                  <Label className="text-sm">Nome do Projeto</Label>
                  <div className="relative">
                    <FolderKanban className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Ex: Redesign do Website"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                {/* Validity */}
                <div className="space-y-2">
                  <Label className="text-sm">Validade (dias)</Label>
                  <div className="relative">
                    <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      min={1}
                      value={validityDays || ""}
                      onChange={(e) => setValidityDays(Number(e.target.value))}
                      className="pl-9"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Válido até: {format(addDays(new Date(), validityDays || 30), "dd/MM/yyyy")}
                  </p>
                </div>
              </div>

              {/* Payment Conditions */}
              <div className="space-y-2">
                <Label className="text-sm">Condições de Pagamento</Label>
                <Textarea
                  placeholder="Ex: 50% na aprovação, 50% na entrega. Pagamento via PIX ou transferência bancária."
                  value={paymentConditions}
                  onChange={(e) => setPaymentConditions(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label className="text-sm">Observações</Label>
                <Textarea
                  placeholder="Informações adicionais para o cliente..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Base Parameters */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                1. Parâmetros Base
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Valor/Hora (R$)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      step="0.01"
                      value={hourlyRate || ""}
                      onChange={(e) => setHourlyRate(Number(e.target.value))}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Horas Estimadas</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={hours || ""}
                      onChange={(e) => setHours(Number(e.target.value))}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Complexidade</Label>
                  <div className="relative">
                    <Layers className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      step="0.1"
                      min="0.5"
                      max="3.0"
                      value={complexity || ""}
                      onChange={(e) => setComplexity(Number(e.target.value))}
                      className="pl-9"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Multiplicador (1 = Padrão)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Costs - Now with 3 categories */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" />
                2. Custos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {renderCostSection("setup", setupCosts, totalSetup)}
              <Separator />
              {renderCostSection("mensal", mensalCosts, totalMensal)}
              <Separator />
              {renderCostSection("extra", extraCosts, totalExtra)}

              {totalCosts > 0 && (
                <>
                  <Separator />
                  <div className="flex justify-end">
                    <p className="text-sm font-semibold">
                      Total de Custos: <span className="text-primary">{formatCurrency(totalCosts)}</span>
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Modifiers */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Percent className="h-4 w-4 text-primary" />
                3. Modificadores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm flex justify-between">
                    Margem de Lucro
                    <span className="text-muted-foreground font-normal">%</span>
                  </Label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      step="1"
                      placeholder="20"
                      value={profitMargin || ""}
                      onChange={(e) => setProfitMargin(Number(e.target.value))}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm flex justify-between">
                    Impostos
                    <span className="text-muted-foreground font-normal">%</span>
                  </Label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="6.5"
                      value={tax || ""}
                      onChange={(e) => setTax(Number(e.target.value))}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm flex justify-between">
                    Desconto
                    <span className="text-muted-foreground font-normal">R$</span>
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={discountValue || ""}
                      onChange={(e) => setDiscountValue(Number(e.target.value))}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary - Right Column */}
        <div className="space-y-6">
          <Card className="shadow-card sticky top-6">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-medium">Resumo do Orçamento</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Horas ({hours}h × {complexity}x)</span>
                  <span className="font-medium">{formatCurrency(basePrice)}</span>
                </div>

                {totalSetup > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Wrench className="h-3 w-3 text-blue-400" />
                      Setup Inicial ({setupCosts.length})
                    </span>
                    <span className="font-medium">{formatCurrency(totalSetup)}</span>
                  </div>
                )}

                {totalMensal > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Repeat className="h-3 w-3 text-emerald-400" />
                      Fixo Mensal ({mensalCosts.length})
                    </span>
                    <span className="font-medium">{formatCurrency(totalMensal)}</span>
                  </div>
                )}

                {totalExtra > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <PackagePlus className="h-3 w-3 text-amber-400" />
                      Custos Extras ({extraCosts.length})
                    </span>
                    <span className="font-medium">{formatCurrency(totalExtra)}</span>
                  </div>
                )}

                <Separator />

                <div className="flex justify-between items-center font-medium p-3 rounded-lg bg-muted/50">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>

                {profitMargin > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Margem de Lucro ({profitMargin}%)</span>
                    <span className="text-success font-medium">+{formatCurrency(profitAmount)}</span>
                  </div>
                )}

                {tax > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Impostos ({tax}%)</span>
                    <span className="text-warning font-medium">+{formatCurrency(taxAmount)}</span>
                  </div>
                )}

                {totalDiscount > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Desconto</span>
                    <span className="text-destructive font-medium">-{formatCurrency(totalDiscount)}</span>
                  </div>
                )}
              </div>

              <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-glow-emerald/25 border border-emerald-500/30">
                <p className="text-xs font-semibold text-emerald-100 uppercase tracking-wider mb-1">
                  Valor Sugerido do Projeto
                </p>
                <p className="text-3xl font-extrabold font-mono-numbers tracking-tight">
                  {formatCurrency(suggestedPrice)}
                </p>
                {freelancerPixKey && (
                  <p className="text-[11px] text-emerald-100/90 mt-2 flex items-center gap-1.5 font-medium">
                    <Sparkles className="h-3 w-3 inline text-emerald-200" />
                    Chave Pix ativa ({freelancerPixKeyType || "Pix"}) inclusa no PDF
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>Nº Orçamento</span>
                <span className="font-mono">{budgetNumber}</span>
              </div>

              <Separator />

              <Button
                className="w-full"
                size="lg"
                onClick={handleGeneratePdf}
                disabled={generatingPdf || !canGeneratePdf}
              >
                <FileDown className="h-4 w-4 mr-2" />
                {editingBudget
                  ? generatingPdf
                    ? "Atualizando..."
                    : "Salvar Alterações e Atualizar PDF"
                  : generatingPdf
                  ? "Gerando PDF..."
                  : "Gerar Orçamento PDF"}
              </Button>

              {!canGeneratePdf && (
                <p className="text-xs text-muted-foreground text-center">
                  Preencha o nome do cliente e do projeto para gerar.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </TabsContent>

    <TabsContent value="maintenance" className="space-y-6 mt-0">
      <MaintenanceCalculator
        clients={clients}
        freelancerProfile={{
          name: freelancerName,
          email: freelancerEmail,
          phone: freelancerPhone,
          website: freelancerWebsite,
          logoUrl: freelancerLogo || undefined,
          cnpj: freelancerCnpj.trim() || undefined,
          address: freelancerAddress.trim() || undefined,
          pixKeyType: freelancerPixKeyType.trim() || undefined,
          pixKey: freelancerPixKey.trim() || undefined,
        }}
        defaultHourlyRate={hourlyRate}
        onBudgetGenerated={() => {
          fetchBudgetHistory();
          if (editingBudget) navigate("/budgets");
        }}
        editBudgetId={
          editingBudget &&
          (editingBudget.budget_number.startsWith("MAN-") ||
            editingBudget.budget_data?.budget_type === "maintenance")
            ? editingBudget.id
            : null
        }
        editInitialData={
          editingBudget &&
          (editingBudget.budget_number.startsWith("MAN-") ||
            editingBudget.budget_data?.budget_type === "maintenance")
            ? editingBudget.budget_data
            : null
        }
        onCancelEdit={handleCancelEdit}
      />
    </TabsContent>
  </Tabs>

      {/* Budget History */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                Histórico de Orçamentos Recentes
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Altere orçamentos em aberto ou gerencie a listagem completa.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {budgetHistory.length} orçamento(s)
              </span>
              <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                <Link to="/budgets">
                  Gerenciador Completo
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {budgetHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <History className="h-8 w-8 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum orçamento gerado ainda</p>
              <p className="text-xs text-muted-foreground mt-1">Preencha os campos acima e gere seu primeiro orçamento.</p>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-medium">Nº</TableHead>
                    <TableHead className="font-medium">Cliente</TableHead>
                    <TableHead className="font-medium">Projeto</TableHead>
                    <TableHead className="font-medium text-right">Valor</TableHead>
                    <TableHead className="font-medium">Status</TableHead>
                    <TableHead className="font-medium">Data</TableHead>
                    <TableHead className="font-medium text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budgetHistory.map((budget) => {
                    const statusCfg = STATUS_CONFIG[budget.status] || STATUS_CONFIG.aguardando;
                    return (
                      <TableRow key={budget.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-sm">
                          <div className="flex items-center gap-1.5">
                            {budget.budget_number.startsWith("MAN-") ? (
                              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                Manutenção
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                                Serviço
                              </span>
                            )}
                            <span>{budget.budget_number}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{budget.client_name}</TableCell>
                        <TableCell>{budget.project_name}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(Number(budget.total_value))}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={budget.status}
                            onValueChange={(val) => handleUpdateStatus(budget.id, val)}
                          >
                            <SelectTrigger className="h-7 w-[130px] border-0 bg-transparent p-0">
                              <span className={`text-xs px-2.5 py-1 rounded-full ${statusCfg.className}`}>
                                {statusCfg.label}
                              </span>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="aguardando">
                                <span className="flex items-center gap-2">
                                  <span className="h-2 w-2 rounded-full bg-warning" />
                                  Aguardando
                                </span>
                              </SelectItem>
                              <SelectItem value="aprovado">
                                <span className="flex items-center gap-2">
                                  <span className="h-2 w-2 rounded-full bg-success" />
                                  Aprovado
                                </span>
                              </SelectItem>
                              <SelectItem value="cancelado">
                                <span className="flex items-center gap-2">
                                  <span className="h-2 w-2 rounded-full bg-destructive" />
                                  Cancelado
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(budget.created_at), "dd/MM/yy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-foreground"
                              onClick={() => {
                                if (budget.status === "aprovado") {
                                  toast.warning("Orçamento aprovado não pode ser alterado.");
                                  return;
                                }
                                navigate(`/calculator?edit=${budget.id}`);
                              }}
                              title={budget.status === "aprovado" ? "Aprovado (não editável)" : "Editar Orçamento"}
                              disabled={budget.status === "aprovado"}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleRegeneratePdf(budget)}
                              title="Baixar PDF novamente"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive/80 hover:text-destructive"
                              onClick={() => setDeleteTarget(budget)}
                              title="Excluir Orçamento"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
              <strong className="text-foreground">{deleteTarget?.budget_number}</strong>?
              Esta ação removerá este orçamento permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBudgetConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Excluindo..." : "Sim, Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Calculator;
