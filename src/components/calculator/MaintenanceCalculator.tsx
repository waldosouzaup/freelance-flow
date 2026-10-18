import { useState, useMemo, useEffect, useRef } from "react";
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
  Wrench,
  Cpu,
  ShieldCheck,
  Clock,
  FileDown,
  Pencil,
  Plus,
  Trash2,
  Check,
  ChevronsUpDown,
  User,
  CalendarDays,
  DollarSign,
  Layers,
  Percent,
  Tag,
  FileText,
  Truck,
  HardDrive,
  Bold,
  Pilcrow,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  generateMaintenanceBudgetPdf,
} from "@/lib/generateBudgetPdf";
import type {
  MaintenanceBudgetData,
  MaintenancePart,
  LaborPricingType,
} from "@/types/maintenance";
import { cn } from "@/lib/utils";

interface ClientOption {
  id: string;
  name: string;
  email: string | null;
  phone?: string | null;
  company?: string | null;
}

interface MaintenanceCalculatorProps {
  clients: ClientOption[];
  freelancerProfile: {
    name: string;
    email: string;
    phone: string;
    website: string;
    logoUrl?: string;
    cnpj?: string;
    address?: string;
    pixKeyType?: string;
    pixKey?: string;
  };
  defaultHourlyRate: number;
  onBudgetGenerated: () => void;
  editBudgetId?: string | null;
  editInitialData?: MaintenanceBudgetData | null;
  onCancelEdit?: () => void;
}

interface ExtraCostItem {
  id: string;
  name: string;
  value: number;
}

function formatCurrency(val: number): string {
  return (val || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export const MaintenanceCalculator = ({
  clients,
  freelancerProfile,
  defaultHourlyRate,
  onBudgetGenerated,
  editBudgetId,
  editInitialData,
  onCancelEdit,
}: MaintenanceCalculatorProps) => {
  const { user } = useAuth();

  // Client Selection
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [clientComboOpen, setClientComboOpen] = useState(false);

  // Equipment / Product Info
  const [productName, setProductName] = useState("");
  const [brandModel, setBrandModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [validityDays, setValidityDays] = useState(15);

  // Technical Diagnosis
  const [reportedIssue, setReportedIssue] = useState("");
  const [technicalDiagnosis, setTechnicalDiagnosis] = useState("");

  const reportedIssueRef = useRef<HTMLTextAreaElement>(null);
  const technicalDiagnosisRef = useRef<HTMLTextAreaElement>(null);
  const [showIssuePreview, setShowIssuePreview] = useState(false);
  const [showDiagnosisPreview, setShowDiagnosisPreview] = useState(false);

  // Formatting helpers for Bold and Paragraphs
  const handleApplyBold = (
    ref: React.RefObject<HTMLTextAreaElement>,
    currentValue: string,
    setter: (val: string) => void
  ) => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = currentValue.substring(start, end);

    let nextVal: string;
    let nextPos: number;

    if (selected) {
      nextVal = currentValue.substring(0, start) + `**${selected}**` + currentValue.substring(end);
      nextPos = start + selected.length + 4;
    } else {
      nextVal = currentValue.substring(0, start) + `**texto em negrito**` + currentValue.substring(end);
      nextPos = start + 2;
    }

    setter(nextVal);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(nextPos, nextPos);
    }, 10);
  };

  const handleAddParagraph = (
    ref: React.RefObject<HTMLTextAreaElement>,
    currentValue: string,
    setter: (val: string) => void
  ) => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const insert = "\n\n";
    const nextVal = currentValue.substring(0, start) + insert + currentValue.substring(end);
    const nextPos = start + insert.length;

    setter(nextVal);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(nextPos, nextPos);
    }, 10);
  };

  const handleKeyDownFormatting = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    ref: React.RefObject<HTMLTextAreaElement>,
    currentValue: string,
    setter: (val: string) => void
  ) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === "b" || e.key === "B")) {
      e.preventDefault();
      handleApplyBold(ref, currentValue, setter);
    }
  };

  const renderFormattedPreview = (raw: string) => {
    if (!raw.trim()) {
      return <p className="text-xs text-muted-foreground italic">Nenhum texto inserido ainda.</p>;
    }
    const paragraphs = raw.split(/\r?\n+/).filter(Boolean);
    return (
      <div className="space-y-2 text-xs text-foreground/90 leading-relaxed font-sans">
        {paragraphs.map((p, pIdx) => {
          const parts: React.ReactNode[] = [];
          const regex = /\*\*(.*?)\*\*/g;
          let last = 0;
          let m;
          while ((m = regex.exec(p)) !== null) {
            if (m.index > last) {
              parts.push(p.substring(last, m.index));
            }
            if (m[1]) {
              parts.push(
                <strong key={`${pIdx}-${m.index}`} className="font-bold text-foreground">
                  {m[1]}
                </strong>
              );
            }
            last = regex.lastIndex;
          }
          if (last < p.length) {
            parts.push(p.substring(last));
          }
          return <p key={pIdx}>{parts}</p>;
        })}
      </div>
    );
  };

  // Labor
  const [laborType, setLaborType] = useState<LaborPricingType>("fixed");
  const [laborFixedPrice, setLaborFixedPrice] = useState(180);
  const [laborHours, setLaborHours] = useState(2);
  const [laborHourlyRate, setLaborHourlyRate] = useState(defaultHourlyRate || 100);

  // Parts List
  const [parts, setParts] = useState<MaintenancePart[]>([
    { id: crypto.randomUUID(), name: "", quantity: 1, unitPrice: 0, totalPrice: 0 },
  ]);

  // Extra Costs (frete, deslocamento, insumos)
  const [extraCosts, setExtraCosts] = useState<ExtraCostItem[]>([]);

  // Modifiers
  const [profitMargin, setProfitMargin] = useState(0);
  const [tax, setTax] = useState(0);
  const [discountValue, setDiscountValue] = useState(0);

  // Terms & Payment
  const [warrantyDays, setWarrantyDays] = useState(90);
  const [estimatedDaysToDeliver, setEstimatedDaysToDeliver] = useState(3);
  const [paymentConditions, setPaymentConditions] = useState("50% na aprovação do orçamento e 50% na retirada/entrega do equipamento testado.");
  const [notes, setNotes] = useState("");

  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Load existing budget if in edit mode
  useEffect(() => {
    if (!editInitialData) return;
    if (editInitialData.clientName) setClientName(editInitialData.clientName);
    if (editInitialData.clientEmail) setClientEmail(editInitialData.clientEmail);
    if (editInitialData.clientPhone) setClientPhone(editInitialData.clientPhone);
    if (editInitialData.clientCpf || editInitialData.clientCompany) {
      setClientCompany(editInitialData.clientCpf || editInitialData.clientCompany || "");
    }
    if (editInitialData.productName) setProductName(editInitialData.productName);
    if (editInitialData.brandModel) setBrandModel(editInitialData.brandModel);
    if (editInitialData.serialNumber) setSerialNumber(editInitialData.serialNumber);
    if (editInitialData.reportedIssue) setReportedIssue(editInitialData.reportedIssue);
    if (editInitialData.technicalDiagnosis) setTechnicalDiagnosis(editInitialData.technicalDiagnosis);
    if (editInitialData.laborType) setLaborType(editInitialData.laborType);
    if (editInitialData.laborFixedPrice !== undefined) setLaborFixedPrice(editInitialData.laborFixedPrice);
    if (editInitialData.laborHours !== undefined) setLaborHours(editInitialData.laborHours);
    if (editInitialData.laborHourlyRate !== undefined) setLaborHourlyRate(editInitialData.laborHourlyRate);
    if (editInitialData.parts && editInitialData.parts.length > 0) setParts(editInitialData.parts);
    if (editInitialData.extraCosts && editInitialData.extraCosts.length > 0) {
      setExtraCosts(editInitialData.extraCosts.map((ec) => ({ id: crypto.randomUUID(), name: ec.name, value: ec.value })));
    }
    if (editInitialData.profitMargin !== undefined) setProfitMargin(editInitialData.profitMargin);
    if (editInitialData.tax !== undefined) setTax(editInitialData.tax);
    if (editInitialData.discount !== undefined) setDiscountValue(editInitialData.discount);
    if (editInitialData.warrantyDays !== undefined) setWarrantyDays(editInitialData.warrantyDays);
    if (editInitialData.estimatedDaysToDeliver !== undefined) setEstimatedDaysToDeliver(editInitialData.estimatedDaysToDeliver);
    if (editInitialData.paymentConditions) setPaymentConditions(editInitialData.paymentConditions);
    if (editInitialData.notes) setNotes(editInitialData.notes);
  }, [editInitialData]);

  // Client Filter
  const filteredClients = useMemo(() => {
    if (!clientName) return clients;
    return clients.filter((c) =>
      c.name.toLowerCase().includes(clientName.toLowerCase())
    );
  }, [clients, clientName]);

  const handleSelectClient = (c: ClientOption) => {
    setClientName(c.name);
    setClientEmail(c.email || "");
    setClientPhone(c.phone || "");
    setClientCompany(c.company || "");
    setClientComboOpen(false);
  };

  // Calculations
  const laborTotal = useMemo(() => {
    if (laborType === "fixed") {
      return Number(laborFixedPrice) || 0;
    }
    return (Number(laborHours) || 0) * (Number(laborHourlyRate) || 0);
  }, [laborType, laborFixedPrice, laborHours, laborHourlyRate]);

  const partsTotal = useMemo(() => {
    return parts.reduce((acc, p) => acc + (p.totalPrice || 0), 0);
  }, [parts]);

  const extraCostsTotal = useMemo(() => {
    return extraCosts.reduce((acc, c) => acc + (Number(c.value) || 0), 0);
  }, [extraCosts]);

  const subtotal = useMemo(() => {
    return laborTotal + partsTotal + extraCostsTotal;
  }, [laborTotal, partsTotal, extraCostsTotal]);

  const profitAmount = useMemo(() => {
    return (subtotal * (profitMargin || 0)) / 100;
  }, [subtotal, profitMargin]);

  const taxAmount = useMemo(() => {
    const baseWithProfit = subtotal + profitAmount;
    return (baseWithProfit * (tax || 0)) / 100;
  }, [subtotal, profitAmount, tax]);

  const total = useMemo(() => {
    const finalVal = subtotal + profitAmount + taxAmount - (discountValue || 0);
    return Math.max(0, finalVal);
  }, [subtotal, profitAmount, taxAmount, discountValue]);

  // Parts Actions
  const addPart = () => {
    setParts([
      ...parts,
      { id: crypto.randomUUID(), name: "", quantity: 1, unitPrice: 0, totalPrice: 0 },
    ]);
  };

  const updatePart = (id: string, field: "name" | "quantity" | "unitPrice", value: any) => {
    setParts(
      parts.map((p) => {
        if (p.id !== id) return p;
        const updated = { ...p, [field]: value };
        const qty = field === "quantity" ? Number(value) : p.quantity;
        const price = field === "unitPrice" ? Number(value) : p.unitPrice;
        updated.totalPrice = Math.max(0, qty * price);
        return updated;
      })
    );
  };

  const removePart = (id: string) => {
    setParts(parts.filter((p) => p.id !== id));
  };

  // Extra Costs Actions
  const addExtraCost = () => {
    setExtraCosts([
      ...extraCosts,
      { id: crypto.randomUUID(), name: "", value: 0 },
    ]);
  };

  const updateExtraCost = (id: string, field: "name" | "value", value: any) => {
    setExtraCosts(
      extraCosts.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const removeExtraCost = (id: string) => {
    setExtraCosts(extraCosts.filter((c) => c.id !== id));
  };

  // Atomic Budget Number Generator for Maintenance (MAN-YYYY-XXX)
  const getNextMaintenanceBudgetNumber = async (): Promise<string> => {
    if (!user) return `MAN-${new Date().getFullYear()}-001`;

    const year = new Date().getFullYear();
    const prefix = `MAN-${year}-`;

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

  const canGeneratePdf = clientName.trim() !== "" && productName.trim() !== "";

  const handleGeneratePdf = async () => {
    if (!user || !canGeneratePdf) {
      toast.error("Informe o cliente e o produto/equipamento para emitir o orçamento.");
      return;
    }

    setGeneratingPdf(true);

    try {
      const finalBudgetNumber = editInitialData?.budgetNumber || (await getNextMaintenanceBudgetNumber());
      const today = new Date();
      const validityDate = addDays(today, validityDays || 15);

      const validParts = parts
        .filter((p) => p.name.trim() !== "" && p.totalPrice > 0)
        .map((p) => ({ ...p }));

      const validExtraCosts = extraCosts
        .filter((c) => c.name.trim() !== "" && Number(c.value) > 0)
        .map((c) => ({ name: c.name, value: Number(c.value) }));

      const budgetData: MaintenanceBudgetData = {
        budgetNumber: finalBudgetNumber,
        date: format(today, "dd/MM/yyyy", { locale: ptBR }),
        validityDate: format(validityDate, "dd/MM/yyyy", { locale: ptBR }),

        freelancerName: freelancerProfile.name || "FreelanceFlow",
        freelancerEmail: freelancerProfile.email || "",
        freelancerPhone: freelancerProfile.phone || "",
        freelancerWebsite: freelancerProfile.website || "",
        logoUrl: freelancerProfile.logoUrl,
        cnpj: freelancerProfile.cnpj,
        address: freelancerProfile.address,
        pixKeyType: freelancerProfile.pixKeyType,
        pixKey: freelancerProfile.pixKey,

        clientName,
        clientEmail,
        clientPhone: clientPhone || undefined,
        clientCpf: clientCompany || undefined,

        productName,
        brandModel: brandModel.trim() || undefined,
        serialNumber: serialNumber.trim() || undefined,
        reportedIssue: reportedIssue.trim(),
        technicalDiagnosis: technicalDiagnosis.trim() || undefined,

        laborType,
        laborHours: laborType === "hourly" ? Number(laborHours) : undefined,
        laborHourlyRate: laborType === "hourly" ? Number(laborHourlyRate) : undefined,
        laborFixedPrice: laborType === "fixed" ? Number(laborFixedPrice) : undefined,
        laborTotal,

        parts: validParts,
        partsTotal,

        extraCosts: validExtraCosts.length > 0 ? validExtraCosts : undefined,
        extraCostsTotal,

        subtotal,
        profitMargin: Number(profitMargin) || 0,
        profitAmount,
        tax: Number(tax) || 0,
        taxAmount,
        discount: Number(discountValue) || 0,
        total,

        warrantyDays: Number(warrantyDays) || 90,
        estimatedDaysToDeliver: estimatedDaysToDeliver ? Number(estimatedDaysToDeliver) : undefined,
        paymentConditions,
        notes: notes.trim() || undefined,

        budget_type: "maintenance",
      };

      // Generate PDF
      await generateMaintenanceBudgetPdf(budgetData);

      if (editBudgetId) {
        // Update existing record
        const { error: updateError } = await supabase
          .from("budgets")
          .update({
            client_name: clientName,
            client_email: clientEmail || null,
            project_name: `Manutenção: ${productName}`,
            total_value: budgetData.total,
            budget_data: JSON.parse(JSON.stringify(budgetData)),
            updated_at: new Date().toISOString(),
          })
          .eq("id", editBudgetId);

        if (updateError) {
          console.error("Database update error:", updateError);
          toast.warning("PDF gerado, mas houve falha ao atualizar no banco de dados.");
        } else {
          toast.success(`Orçamento ${finalBudgetNumber} atualizado com sucesso!`);
          onBudgetGenerated();
        }
      } else {
        // Save to Supabase (compatible with budgets table)
        const { error: insertError } = await supabase.from("budgets").insert([
          {
            user_id: user.id,
            budget_number: finalBudgetNumber,
            client_name: clientName,
            client_email: clientEmail || null,
            project_name: `Manutenção: ${productName}`,
            total_value: budgetData.total,
            budget_data: JSON.parse(JSON.stringify(budgetData)),
          },
        ]);

        if (insertError) {
          console.error("Database insert error:", insertError);
          toast.warning("PDF gerado, mas houve uma falha ao salvar no histórico do banco.");
        } else {
          toast.success(`Orçamento de manutenção ${finalBudgetNumber} gerado e salvo!`);
          onBudgetGenerated();
        }
      }
    } catch (err) {
      console.error("Maintenance PDF error:", err);
      toast.error("Erro ao gerar o PDF de manutenção.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-4">
      {editBudgetId && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-primary/30 bg-primary/5 text-sm">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Pencil className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                Editando Orçamento de Manutenção: <span className="text-primary font-mono">{editInitialData?.budgetNumber}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                As alterações realizadas atualizarão este registro e gerarão o PDF atualizado de 1 página.
              </p>
            </div>
          </div>
          {onCancelEdit && (
            <Button variant="outline" size="sm" onClick={onCancelEdit} className="h-8 text-xs shrink-0">
              Cancelar Edição
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Form - Left 2 Columns */}
      <div className="lg:col-span-2 space-y-6">
        {/* 1. Equipment & Client Identification */}
        <Card className="shadow-card border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-primary" />
              Equipamento & Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Equipment Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm">
                  Produto / Equipamento <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="Ex: Notebook Dell Inspiron, Inversor Solar 5kW, Motor Elétrico"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Marca / Modelo</Label>
                <Input
                  placeholder="Ex: Dell / Vostro 3500"
                  value={brandModel}
                  onChange={(e) => setBrandModel(e.target.value)}
                  className="bg-background"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Número de Série / Tag</Label>
                <Input
                  placeholder="Ex: SN-9482049"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="bg-background"
                />
              </div>

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
                            <p className="text-muted-foreground">Nenhum cliente cadastrado.</p>
                            {clientName && (
                              <p className="text-xs text-muted-foreground mt-1">
                                "<span className="font-medium text-foreground">{clientName}</span>" será usado avulso.
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

              <div className="space-y-2">
                <Label className="text-sm">Email do Cliente</Label>
                <Input
                  type="email"
                  placeholder="cliente@email.com"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="bg-background"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Issue & Technical Diagnosis */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Wrench className="h-4 w-4 text-amber-500" />
              Defeito Relatado & Laudo Técnico
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Defeito Relatado */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label className="text-sm font-medium">Defeito Relatado pelo Cliente</Label>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleApplyBold(reportedIssueRef, reportedIssue, setReportedIssue)}
                    className="h-7 px-2.5 text-xs gap-1 font-semibold border-border hover:bg-muted"
                    title="Adicionar negrito (**texto**) ou selecione e use Ctrl+B"
                  >
                    <Bold className="h-3.5 w-3.5" />
                    <span>Negrito</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddParagraph(reportedIssueRef, reportedIssue, setReportedIssue)}
                    className="h-7 px-2.5 text-xs gap-1 border-border hover:bg-muted"
                    title="Adicionar novo parágrafo"
                  >
                    <Pilcrow className="h-3.5 w-3.5" />
                    <span>Parágrafo</span>
                  </Button>
                  <Button
                    type="button"
                    variant={showIssuePreview ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setShowIssuePreview(!showIssuePreview)}
                    className="h-7 px-2 text-xs gap-1"
                    title={showIssuePreview ? "Ocultar prévia" : "Visualizar formatação"}
                  >
                    {showIssuePreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">{showIssuePreview ? "Ocultar" : "Prévia"}</span>
                  </Button>
                </div>
              </div>

              <Textarea
                ref={reportedIssueRef}
                placeholder="Ex: Equipamento **não liga**, emite bipe intermitente ao conectar no carregador e aquece na lateral."
                value={reportedIssue}
                onChange={(e) => setReportedIssue(e.target.value)}
                onKeyDown={(e) => handleKeyDownFormatting(e, reportedIssueRef, reportedIssue, setReportedIssue)}
                className="bg-background min-h-[75px] font-mono text-xs"
              />

              {showIssuePreview && (
                <div className="p-3 rounded-lg border border-border/80 bg-muted/40 space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    Prévia da formatação no documento:
                  </span>
                  {renderFormattedPreview(reportedIssue)}
                </div>
              )}
            </div>

            {/* Diagnóstico Técnico / Parecer de Reparo */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label className="text-sm font-medium">Diagnóstico Técnico / Parecer de Reparo</Label>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleApplyBold(technicalDiagnosisRef, technicalDiagnosis, setTechnicalDiagnosis)}
                    className="h-7 px-2.5 text-xs gap-1 font-semibold border-border hover:bg-muted"
                    title="Adicionar negrito (**texto**) ou selecione e use Ctrl+B"
                  >
                    <Bold className="h-3.5 w-3.5" />
                    <span>Negrito</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddParagraph(technicalDiagnosisRef, technicalDiagnosis, setTechnicalDiagnosis)}
                    className="h-7 px-2.5 text-xs gap-1 border-border hover:bg-muted"
                    title="Adicionar novo parágrafo"
                  >
                    <Pilcrow className="h-3.5 w-3.5" />
                    <span>Parágrafo</span>
                  </Button>
                  <Button
                    type="button"
                    variant={showDiagnosisPreview ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setShowDiagnosisPreview(!showDiagnosisPreview)}
                    className="h-7 px-2 text-xs gap-1"
                    title={showDiagnosisPreview ? "Ocultar prévia" : "Visualizar formatação"}
                  >
                    {showDiagnosisPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">{showDiagnosisPreview ? "Ocultar" : "Prévia"}</span>
                  </Button>
                </div>
              </div>

              <Textarea
                ref={technicalDiagnosisRef}
                placeholder="Ex: **Curto circuito na linha secundária.**&#10;&#10;Necessária **substituição de capacitor** de tântalo e limpeza química completa com álcool isopropílico."
                value={technicalDiagnosis}
                onChange={(e) => setTechnicalDiagnosis(e.target.value)}
                onKeyDown={(e) => handleKeyDownFormatting(e, technicalDiagnosisRef, technicalDiagnosis, setTechnicalDiagnosis)}
                className="bg-background min-h-[90px] font-mono text-xs"
              />

              {showDiagnosisPreview && (
                <div className="p-3 rounded-lg border border-border/80 bg-muted/40 space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    Prévia da formatação no documento:
                  </span>
                  {renderFormattedPreview(technicalDiagnosis)}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 3. Labor Pricing */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                Mão de Obra Técnica
              </CardTitle>
              {/* Labor Mode Switcher */}
              <div className="flex rounded-lg border border-border p-0.5 bg-muted/40 text-xs">
                <button
                  type="button"
                  onClick={() => setLaborType("fixed")}
                  className={cn(
                    "px-3 py-1 rounded-md font-medium transition-colors",
                    laborType === "fixed"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Valor Fixo
                </button>
                <button
                  type="button"
                  onClick={() => setLaborType("hourly")}
                  className={cn(
                    "px-3 py-1 rounded-md font-medium transition-colors",
                    laborType === "hourly"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Por Hora Técnica
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {laborType === "fixed" ? (
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <div>
                  <p className="text-sm font-medium">Mão de Obra Fechada para Reparo</p>
                  <p className="text-xs text-muted-foreground">Valor único para realização do serviço técnico</p>
                </div>
                <div className="w-40 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                  <Input
                    type="number"
                    step="0.01"
                    className="pl-9 bg-background font-semibold text-right"
                    value={laborFixedPrice || ""}
                    onChange={(e) => setLaborFixedPrice(Number(e.target.value))}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Horas Técnicas Estimadas</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    className="bg-background"
                    value={laborHours}
                    onChange={(e) => setLaborHours(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Valor da Hora Técnica (R$)</Label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    className="bg-background"
                    value={laborHourlyRate}
                    onChange={(e) => setLaborHourlyRate(Number(e.target.value))}
                  />
                </div>
              </div>
            )}
            <div className="flex justify-end mt-3 text-sm font-medium text-blue-500">
              Total Mão de Obra: {formatCurrency(laborTotal)}
            </div>
          </CardContent>
        </Card>

        {/* 4. Replacement Parts & Components */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Cpu className="h-4 w-4 text-emerald-500" />
                Peças & Componentes de Reposição
              </CardTitle>
              <Button size="sm" variant="outline" onClick={addPart} className="h-7 text-xs">
                <Plus className="h-3 w-3 mr-1" />
                Adicionar Peça
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {parts.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-border rounded-lg">
                <p className="text-xs text-muted-foreground">Nenhuma peça adicionada (caso seja apenas serviço de mão de obra)</p>
              </div>
            ) : (
              parts.map((part, index) => (
                <div key={part.id} className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg bg-muted/30">
                  <div className="col-span-6">
                    <Input
                      placeholder={`Ex: Tela IPS 15.6'', Conector DC Jack, Rolamento ${index + 1}`}
                      value={part.name}
                      onChange={(e) => updatePart(part.id, "name", e.target.value)}
                      className="bg-background text-sm h-9"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min="1"
                      placeholder="Qtd"
                      value={part.quantity || ""}
                      onChange={(e) => updatePart(part.id, "quantity", Number(e.target.value))}
                      className="bg-background text-sm h-9 text-center"
                    />
                  </div>
                  <div className="col-span-3 relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Unitário"
                      value={part.unitPrice || ""}
                      onChange={(e) => updatePart(part.id, "unitPrice", Number(e.target.value))}
                      className="pl-7 bg-background text-sm h-9 text-right"
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => removePart(part.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
            <div className="flex justify-end pt-1">
              <p className="text-xs font-medium text-emerald-500">
                Subtotal Peças: {formatCurrency(partsTotal)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 5. Extra Costs (Deslocamento, Insumos) */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Truck className="h-4 w-4 text-amber-500" />
                Custos Extras & Deslocamento (Opcional)
              </CardTitle>
              <Button size="sm" variant="outline" onClick={addExtraCost} className="h-7 text-xs">
                <Plus className="h-3 w-3 mr-1" />
                Adicionar Custo
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {extraCosts.length === 0 ? (
              <div className="text-center py-4 border border-dashed border-border rounded-lg">
                <p className="text-xs text-muted-foreground">Nenhum custo de deslocamento ou insumo extra adicionado</p>
              </div>
            ) : (
              extraCosts.map((extra) => (
                <div key={extra.id} className="flex gap-2 items-center p-2 rounded-lg bg-muted/30">
                  <Input
                    placeholder="Ex: Taxa de visita técnica, frete de peças, insumos químicos"
                    value={extra.name}
                    onChange={(e) => updateExtraCost(extra.id, "name", e.target.value)}
                    className="bg-background text-sm h-9"
                  />
                  <div className="w-32 relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
                    <Input
                      type="number"
                      step="0.01"
                      className="pl-7 bg-background text-sm h-9 text-right"
                      placeholder="0,00"
                      value={extra.value || ""}
                      onChange={(e) => updateExtraCost(extra.id, "value", Number(e.target.value))}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive shrink-0"
                    onClick={() => removeExtraCost(extra.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            )}
            {extraCostsTotal > 0 && (
              <div className="flex justify-end pt-1">
                <p className="text-xs font-medium text-amber-500">
                  Subtotal Extras: {formatCurrency(extraCostsTotal)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 6. Warranty, Terms & Notes */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              Garantia & Condições
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Prazo de Garantia do Reparo (Dias)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    value={warrantyDays}
                    onChange={(e) => setWarrantyDays(Number(e.target.value))}
                    className="bg-background w-28 text-center font-semibold"
                  />
                  <div className="flex gap-1">
                    {[30, 90, 180].map((d) => (
                      <Button
                        key={d}
                        type="button"
                        size="sm"
                        variant={warrantyDays === d ? "default" : "outline"}
                        onClick={() => setWarrantyDays(d)}
                        className="text-xs h-9 px-2.5"
                      >
                        {d}d
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Prazo Estimado de Execução (Dias Úteis)</Label>
                <Input
                  type="number"
                  min="1"
                  value={estimatedDaysToDeliver}
                  onChange={(e) => setEstimatedDaysToDeliver(Number(e.target.value))}
                  className="bg-background text-center font-semibold"
                  placeholder="Ex: 3"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Condições de Pagamento</Label>
              <Input
                value={paymentConditions}
                onChange={(e) => setPaymentConditions(e.target.value)}
                className="bg-background text-sm"
                placeholder="Ex: À vista no PIX com 5% de desconto, ou em até 3x no cartão"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Observações Técnicas / Restrições (Opcional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-background resize-none min-h-[60px]"
                placeholder="Ex: Equipamento apresenta marcas de uso prévias na tampa traseira. Garantia não cobre danos por líquido."
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Summary - Right Column */}
      <div className="space-y-6">
        <Card className="shadow-card border-primary/20 sticky top-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Resumo do Orçamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Financial Modifiers */}
            <div className="space-y-3 p-3 bg-muted/40 rounded-lg">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Margem / Lucro (%)</span>
                  <span>{profitMargin}%</span>
                </div>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={profitMargin || ""}
                  onChange={(e) => setProfitMargin(Number(e.target.value))}
                  className="bg-background h-8 text-sm"
                  placeholder="0%"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Impostos (%)</span>
                  <span>{tax}%</span>
                </div>
                <Input
                  type="number"
                  min="0"
                  max="50"
                  value={tax || ""}
                  onChange={(e) => setTax(Number(e.target.value))}
                  className="bg-background h-8 text-sm"
                  placeholder="0%"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Desconto (R$)</span>
                  <span>{formatCurrency(discountValue)}</span>
                </div>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discountValue || ""}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                  className="bg-background h-8 text-sm"
                  placeholder="0,00"
                />
              </div>
            </div>

            {/* Breakdown */}
            <div className="space-y-2 py-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Mão de Obra Técnica:</span>
                <span className="font-medium text-foreground">{formatCurrency(laborTotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Peças & Componentes:</span>
                <span className="font-medium text-foreground">{formatCurrency(partsTotal)}</span>
              </div>
              {extraCostsTotal > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Custos Extras:</span>
                  <span className="font-medium text-foreground">{formatCurrency(extraCostsTotal)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-medium">
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>

              {profitMargin > 0 && (
                <div className="flex justify-between text-xs text-emerald-500">
                  <span>Margem ({profitMargin}%):</span>
                  <span>+{formatCurrency(profitAmount)}</span>
                </div>
              )}
              {tax > 0 && (
                <div className="flex justify-between text-xs text-amber-500">
                  <span>Impostos ({tax}%):</span>
                  <span>+{formatCurrency(taxAmount)}</span>
                </div>
              )}
              {discountValue > 0 && (
                <div className="flex justify-between text-xs text-destructive">
                  <span>Desconto:</span>
                  <span>-{formatCurrency(discountValue)}</span>
                </div>
              )}
            </div>

            {/* Total Highlight */}
            <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-glow-emerald/25 border border-emerald-500/30">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-100 mb-1">
                Valor Total do Reparo
              </p>
              <p className="text-3xl font-extrabold font-mono-numbers tracking-tight">
                {formatCurrency(total)}
              </p>
              <div className="flex flex-col gap-1 mt-2 text-[11px] text-emerald-100/90 font-medium">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 inline text-emerald-200" />
                  Garantia inclusa de {warrantyDays || 90} dias
                </span>
                {freelancerProfile.pixKey && (
                  <span className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 inline text-emerald-200" />
                    Chave Pix ativa com QR Code no laudo
                  </span>
                )}
              </div>
            </div>

            <Separator />

            {/* Action Button */}
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              size="lg"
              onClick={handleGeneratePdf}
              disabled={generatingPdf || !canGeneratePdf}
            >
              <FileDown className="h-4 w-4 mr-2" />
              {editBudgetId
                ? generatingPdf
                  ? "Atualizando..."
                  : "Salvar Alterações e Atualizar PDF"
                : generatingPdf
                ? "Gerando PDF..."
                : "Gerar Orçamento de Manutenção"}
            </Button>

            {!canGeneratePdf && (
              <p className="text-xs text-muted-foreground text-center">
                Preencha o cliente e o produto para gerar o documento.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
  );
};
