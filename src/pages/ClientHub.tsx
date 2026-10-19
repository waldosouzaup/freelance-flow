import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchClientHubData, type ClientHubPayload } from "@/services/clientHubService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Wrench,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileDown,
  Phone,
  Globe,
  QrCode,
  Calendar,
  Layers,
  Sparkles,
  Smartphone,
  Cpu,
  Share2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { generateMaintenanceBudgetPdf, generateBudgetPdf } from "@/lib/generateBudgetPdf";
import type { MaintenancePart } from "@/types/maintenance";
import QRCode from "qrcode";

function formatCurrency(val: number): string {
  return (val || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function ClientHub() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ClientHubPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [pixQrDataUrl, setPixQrDataUrl] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    if (!token) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const res = await fetchClientHubData(token);
        setData(res);

        // Se houver chave pix, gera o QR code visual
        if (res.provider?.pix_key && res.budget?.total_value) {
          try {
            const qr = await QRCode.toDataURL(res.provider.pix_key, {
              width: 180,
              margin: 1,
              color: { dark: "#0f172a", light: "#ffffff" },
            });
            setPixQrDataUrl(qr);
          } catch (e) {
            console.error("Erro ao gerar QR code Pix:", e);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [token]);

  const budget = data?.budget;
  const project = data?.project;
  const provider = data?.provider;
  const bData = budget?.budget_data || {};

  const isMaintenance = bData.budget_type === "maintenance" || !!bData.productName;

  // Determina o status geral do atendimento
  const currentStatus = useMemo(() => {
    if (project) {
      if (project.status === "concluido") return { label: "Concluído / Entregue", step: 5, variant: "success" };
      if (project.status === "pausado") return { label: "Aguardando Peças / Pausado", step: 3, variant: "warning" };
      if (project.status === "cancelado") return { label: "Cancelado", step: 0, variant: "destructive" };
      return { label: "Em Andamento / Execução", step: 3, variant: "info" };
    }
    if (budget) {
      if (budget.status === "aprovado") return { label: "Aprovado / Em Execução", step: 3, variant: "success" };
      if (budget.status === "cancelado") return { label: "Cancelado / Não Aprovado", step: 0, variant: "destructive" };
      return { label: "Orçamento Aguardando Aprovação", step: 2, variant: "warning" };
    }
    return { label: "Em Análise", step: 1, variant: "info" };
  }, [project, budget]);

  // Stepper stages para Manutenção
  const maintenanceSteps = [
    { num: 1, label: "Recebido", desc: "Equipamento na bancada" },
    { num: 2, label: "Diagnóstico", desc: "Laudo técnico elaborado" },
    { num: 3, label: "Em Reparo", desc: "Substituição de peças & reparo" },
    { num: 4, label: "Testes", desc: "Controle de qualidade" },
    { num: 5, label: "Concluído", desc: "Pronto para retirada" },
  ];

  // Cálculo de progresso de etapas em projetos
  const projectProgress = useMemo(() => {
    if (!project?.stages || project.stages.length === 0) return project?.status === "concluido" ? 100 : 40;
    const completed = project.stages.filter((s) => s.completed).length;
    return Math.round((completed / project.stages.length) * 100);
  }, [project]);

  const handleDownloadPdf = async () => {
    if (!budget) return;
    setDownloadingPdf(true);
    try {
      if (isMaintenance) {
        await generateMaintenanceBudgetPdf(bData);
      } else {
        await generateBudgetPdf(bData);
      }
    } catch (e) {
      console.error("Erro ao gerar PDF:", e);
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center animate-pulse mb-3">
          <Layers className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">Carregando portal seguro...</p>
      </div>
    );
  }

  if (!data?.success || (!budget && !project)) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-4">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold tracking-tight mb-1">Acesso Indisponível</h1>
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          {data?.error || "O link fornecido é inválido, expirou ou foi temporariamente desativado pelo prestador."}
        </p>
        <p className="text-xs text-muted-foreground">
          Entre em contato diretamente com o responsável técnico para solicitar um novo link.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-12">
      {/* Top Banner */}
      <div className="border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {provider?.avatar_url ? (
              <img
                src={provider.avatar_url}
                alt={provider.display_name}
                className="h-9 w-9 rounded-lg object-cover border border-border"
              />
            ) : (
              <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center border border-emerald-500/20 text-sm">
                {(provider?.company_name || provider?.display_name || "F")[0].toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-sm font-bold leading-tight">
                {provider?.company_name || provider?.display_name || "Assistência Técnica"}
              </h2>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-emerald-500" /> Portal Verificado
                </span>
                {provider?.cnpj && <span>• CNPJ: {provider.cnpj}</span>}
              </div>
            </div>
          </div>

          {provider?.phone && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => {
                const phone = provider.phone?.replace(/\D/g, "");
                window.open(`https://wa.me/55${phone}`, "_blank");
              }}
            >
              <Phone className="h-3.5 w-3.5 text-emerald-500" />
              <span className="hidden sm:inline">WhatsApp</span>
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        {/* Main Status Hero */}
        <Card className="border-border overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-6 border-b border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    Status em Tempo Real
                  </span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight">
                  {project?.name || budget?.project_name || "Acompanhamento de Serviço"}
                </h1>
                <p className="text-xs text-muted-foreground mt-1">
                  Cliente: <strong className="text-foreground">{budget?.client_name || "Você"}</strong>
                  {budget?.budget_number && ` • Orçamento: #${budget.budget_number}`}
                </p>
              </div>

              <div className="text-left sm:text-right">
                <Badge
                  variant="outline"
                  className={`text-sm px-3 py-1 font-semibold border ${
                    currentStatus.variant === "success"
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                      : currentStatus.variant === "warning"
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                      : "bg-primary/10 text-primary border-primary/25"
                  }`}
                >
                  {currentStatus.label}
                </Badge>
                {bData.estimatedDaysToDeliver && (
                  <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center sm:justify-end gap-1">
                    <Clock className="h-3 w-3" /> Previsão: {bData.estimatedDaysToDeliver} dias úteis
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Stepper Progress */}
          <CardContent className="p-6">
            {isMaintenance ? (
              <div className="space-y-4">
                <div className="grid grid-cols-5 gap-2 text-center">
                  {maintenanceSteps.map((step) => {
                    const isDone = currentStatus.step >= step.num;
                    const isCurrent = currentStatus.step === step.num;

                    return (
                      <div key={step.num} className="flex flex-col items-center">
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs mb-1.5 transition-all ${
                            isDone
                              ? "bg-emerald-500 text-white shadow-sm"
                              : "bg-muted text-muted-foreground border border-border"
                          } ${isCurrent ? "ring-2 ring-emerald-500/40 ring-offset-2 ring-offset-background" : ""}`}
                        >
                          {isDone ? <CheckCircle2 className="h-4 w-4" /> : step.num}
                        </div>
                        <span
                          className={`text-xs font-semibold leading-tight ${
                            isDone ? "text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {step.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground hidden md:inline mt-0.5">
                          {step.desc}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="relative pt-2">
                  <Progress value={(currentStatus.step / 5) * 100} className="h-2" />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-muted-foreground">Progresso do Projeto</span>
                  <span className="font-bold text-primary">{projectProgress}% Concluído</span>
                </div>
                <Progress value={projectProgress} className="h-2.5" />

                {project?.stages && project.stages.length > 0 && (
                  <div className="pt-3 space-y-2">
                    <span className="text-xs font-semibold text-muted-foreground">Marcos de Entrega:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {project.stages.map((st) => (
                        <div
                          key={st.id}
                          className={`flex items-center gap-2 p-2 rounded-md border text-xs ${
                            st.completed
                              ? "bg-emerald-500/5 border-emerald-500/20 text-foreground"
                              : "bg-card border-border text-muted-foreground"
                          }`}
                        >
                          <CheckCircle2
                            className={`h-4 w-4 shrink-0 ${
                              st.completed ? "text-emerald-500" : "text-muted-foreground/40"
                            }`}
                          />
                          <span className={st.completed ? "line-through opacity-80" : ""}>{st.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Equipment & Diagnosis Details (if maintenance) */}
        {isMaintenance && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <Smartphone className="h-4 w-4 text-primary" />
                  Dados do Equipamento
                </div>
                <CardTitle className="text-lg">
                  {bData.productName || "Equipamento"}
                </CardTitle>
                {bData.brandModel && (
                  <CardDescription>
                    Modelo: <strong className="text-foreground">{bData.brandModel}</strong>
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-2.5 text-xs">
                {bData.serialNumber && (
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Número de Série / Tag:</span>
                    <span className="font-mono font-medium">{bData.serialNumber}</span>
                  </div>
                )}
                {bData.warrantyDays && (
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Garantia Assegurada:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {bData.warrantyDays} dias após a entrega
                    </span>
                  </div>
                )}
                <div className="pt-1">
                  <span className="text-muted-foreground block mb-1">Defeito Relatado:</span>
                  <div className="p-2.5 rounded-md bg-muted/40 border border-border text-foreground font-mono text-[11px] whitespace-pre-wrap">
                    {bData.reportedIssue || "Nenhum defeito registrado."}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <Cpu className="h-4 w-4 text-emerald-500" />
                  Laudo Técnico & Intervenções
                </div>
                <CardTitle className="text-lg">Parecer do Especialista</CardTitle>
                <CardDescription>Diagnóstico realizado na bancada técnica</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="p-3 rounded-md bg-card border border-border text-foreground leading-relaxed">
                  {bData.technicalDiagnosis || (
                    <span className="text-muted-foreground italic">
                      Equipamento em fase de análise e testes na bancada.
                    </span>
                  )}
                </div>

                {bData.parts && bData.parts.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground block mb-1.5">
                      Peças / Componentes de Reposição:
                    </span>
                    <div className="space-y-1">
                      {bData.parts.map((p: MaintenancePart, idx: number) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center text-[11px] p-1.5 rounded bg-muted/30 border border-border/50"
                        >
                          <span className="font-medium text-foreground">{p.name}</span>
                          <span className="text-muted-foreground font-mono">Qtd: {p.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Commercial Summary & Payment Card */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Resumo Comercial & Pagamento</span>
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(budget?.total_value || project?.value || 0)}
              </span>
            </CardTitle>
            <CardDescription>
              {bData.paymentConditions || "Condições combinadas na proposta comercial."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-lg bg-muted/30 border border-border">
              <div className="space-y-1 text-center sm:text-left">
                <h4 className="text-sm font-semibold text-foreground">Proposta Formal em PDF</h4>
                <p className="text-xs text-muted-foreground">
                  Baixe a via oficial de 1 página com todos os termos e laudos técnicos completos.
                </p>
              </div>
              <Button
                onClick={handleDownloadPdf}
                disabled={downloadingPdf || !budget}
                className="gap-2 bg-primary text-primary-foreground shrink-0 w-full sm:w-auto"
              >
                <FileDown className="h-4 w-4" />
                {downloadingPdf ? "Gerando PDF..." : "Baixar Proposta (PDF)"}
              </Button>
            </div>

            {/* Pix QR Code Section */}
            {provider?.pix_key && (
              <div className="p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 flex flex-col sm:flex-row items-center gap-4">
                {pixQrDataUrl && (
                  <div className="p-2 bg-white rounded-lg shadow-2xs shrink-0">
                    <img src={pixQrDataUrl} alt="QR Code Pix" className="h-32 w-32" />
                  </div>
                )}
                <div className="space-y-1.5 text-center sm:text-left flex-1 min-w-0">
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                    <QrCode className="h-3.5 w-3.5" /> Pague com Pix Instantâneo
                  </div>
                  <h4 className="text-sm font-bold text-foreground">Chave Pix do Prestador:</h4>
                  <div className="p-2 rounded bg-background border border-border font-mono text-xs text-foreground select-all break-all">
                    {provider.pix_key}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Tipo de Chave: <strong className="capitalize">{provider.pix_key_type || "Chave"}</strong>
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="pt-6 text-center text-xs text-muted-foreground space-y-1">
          <p>
            Portal do Cliente gerado com isolamento de dados via <strong>Freelance Flow</strong>.
          </p>
          <p className="text-[10px]">
            Para dúvidas ou alterações de agendamento, entre em contato diretamente com o responsável técnico.
          </p>
        </div>
      </div>
    </div>
  );
}
