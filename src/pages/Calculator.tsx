import { useEffect, useState, useMemo, useCallback } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { generateBudgetPdf, type BudgetData } from "@/lib/generateBudgetPdf";
import { cn } from "@/lib/utils";

interface CostItem {
  id: string;
  name: string;
  value: number;
}

interface ClientOption {
  id: string;
  name: string;
  email: string | null;
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

const Calculator = () => {
  const { user } = useAuth();

  // Budget info
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
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

  // Base
  const [hourlyRate, setHourlyRate] = useState(100);
  const [hours, setHours] = useState(40);
  const [complexity, setComplexity] = useState(1.0);

  // Costs
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
      .select("id, name, email")
      .eq("user_id", user.id)
      .order("name")
      .then(({ data }) => {
        setClients(data || []);
      });

    supabase
      .from("profiles")
      .select("display_name, company_name, phone, website")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setFreelancerName(data.company_name || data.display_name || "");
          setFreelancerPhone(data.phone || "");
          setFreelancerWebsite(data.website || "");
        }
      });

    setFreelancerEmail(user.email || "");
    fetchBudgetHistory();
  }, [user, fetchBudgetHistory]);

  useEffect(() => {
    const year = new Date().getFullYear();
    setBudgetNumber(`ORC-${year}-...`);
  }, []);

  const addCost = () => {
    setCostsList([...costsList, { id: crypto.randomUUID(), name: "", value: 0 }]);
  };

  const removeCost = (id: string) => {
    setCostsList(costsList.filter((c) => c.id !== id));
  };

  const updateCost = (id: string, field: keyof CostItem, value: string | number) => {
    setCostsList(costsList.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  // Calculations
  const basePrice = hourlyRate * hours * complexity;
  const totalCosts = costsList.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
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
      clientName: clientName.trim(),
      clientEmail: clientEmail.trim(),
      projectName: projectName.trim(),
      hourlyRate,
      hours,
      complexity,
      basePrice,
      costs: costsList.filter((c) => c.name && c.value > 0),
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

  const handleGeneratePdf = async () => {
    if (!user || !canGeneratePdf) {
      toast.error("Preencha o nome do cliente e do projeto para gerar o orçamento.");
      return;
    }

    setGeneratingPdf(true);

    try {
      const year = new Date().getFullYear();
      const { data: rpcData, error } = await supabase.rpc("get_next_budget_number", {
        p_user_id: user.id,
        p_year: year,
      });

      let finalBudgetNumber: string;
      if (error || rpcData == null) {
        const fallback = Date.now().toString(36).toUpperCase().slice(-4);
        finalBudgetNumber = `ORC-${year}-${fallback}`;
      } else {
        finalBudgetNumber = `ORC-${year}-${String(rpcData).padStart(3, "0")}`;
      }

      setBudgetNumber(finalBudgetNumber);

      const budgetData = buildBudgetData(finalBudgetNumber);

      generateBudgetPdf(budgetData);

      // Save to database
      await supabase.from("budgets").insert({
        user_id: user.id,
        budget_number: finalBudgetNumber,
        client_name: budgetData.clientName,
        client_email: budgetData.clientEmail || null,
        project_name: budgetData.projectName,
        total_value: budgetData.total,
        budget_data: budgetData as unknown as Record<string, unknown>,
      });

      toast.success(`Orçamento ${finalBudgetNumber} gerado e salvo!`);
      fetchBudgetHistory();
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Erro ao gerar o PDF do orçamento.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleRegeneratePdf = (record: BudgetRecord) => {
    generateBudgetPdf(record.budget_data);
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

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
          <CalculatorIcon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Calculadora de Precificação</h1>
          <p className="text-muted-foreground mt-0.5">Monte orçamentos de forma detalhada e profissional</p>
        </div>
      </div>

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
                          onValueChange={(val) => {
                            setClientName(val);
                          }}
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

          {/* Extra Costs */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Tag className="h-4 w-4 text-primary" />
                  2. Custos Extras
                </CardTitle>
                <Button size="sm" variant="outline" onClick={addCost}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Adicionar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {costsList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center rounded-lg border border-dashed border-border">
                  <p className="text-sm text-muted-foreground mb-3">Nenhum custo extra adicionado</p>
                  <Button size="sm" variant="secondary" onClick={addCost}>
                    <Plus className="h-4 w-4 mr-1.5" />
                    Adicionar primeiro custo
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {costsList.map((cost) => (
                    <div key={cost.id} className="flex gap-3 items-start p-3 rounded-lg bg-muted/30">
                      <div className="flex-1 space-y-1.5">
                        <Input
                          placeholder="Ex: Domínio, Licença, Banco de Imagens..."
                          value={cost.name}
                          onChange={(e) => updateCost(cost.id, "name", e.target.value)}
                          className="bg-background"
                        />
                      </div>
                      <div className="w-36 space-y-1.5">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                          <Input
                            type="number"
                            step="0.01"
                            className="pl-8 bg-background"
                            placeholder="0,00"
                            value={cost.value || ""}
                            onChange={(e) => updateCost(cost.id, "value", Number(e.target.value))}
                          />
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => removeCost(cost.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex justify-end pt-2">
                    <p className="text-sm font-medium">
                      Subtotal Extras: <span className="text-primary">{formatCurrency(totalCosts)}</span>
                    </p>
                  </div>
                </div>
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

                {totalCosts > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Custos Extras ({costsList.length})</span>
                    <span className="font-medium">{formatCurrency(totalCosts)}</span>
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

              <div className="p-4 rounded-lg bg-primary text-primary-foreground">
                <p className="text-xs font-medium text-primary-foreground/80 mb-1 uppercase tracking-wide">
                  Valor Sugerido
                </p>
                <p className="text-3xl font-bold">
                  {formatCurrency(suggestedPrice)}
                </p>
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
                {generatingPdf ? "Gerando PDF..." : "Gerar Orçamento PDF"}
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

      {/* Budget History */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              Histórico de Orçamentos
            </CardTitle>
            <span className="text-xs text-muted-foreground">{budgetHistory.length} orçamento(s)</span>
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
                        <TableCell className="font-mono text-sm">{budget.budget_number}</TableCell>
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
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleRegeneratePdf(budget)}
                            title="Baixar PDF novamente"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
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
    </div>
  );
};

export default Calculator;
