import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Mail,
  Send,
  FileDown,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  Paperclip,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  generateBudgetPdf,
  generateMaintenanceBudgetPdf,
  getBudgetPdfBase64,
  BudgetData,
  MaintenanceBudgetData,
} from "@/lib/generateBudgetPdf";
import { sendBudgetEmail } from "@/services/emailService";

interface BudgetRecord {
  id: string;
  budget_number: string;
  status: "aguardando" | "aprovado" | "cancelado";
  client_name: string;
  client_email: string | null;
  project_name: string;
  total_value: number;
  budget_data: any;
  created_at: string;
  email_sent_at?: string | null;
}

interface SendBudgetEmailModalProps {
  budget: BudgetRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const SendBudgetEmailModal: React.FC<SendBudgetEmailModalProps> = ({
  budget,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [recipientEmail, setRecipientEmail] = useState("");
  const [senderName, setSenderName] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingResend, setSendingResend] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!budget || !open) return;

    setRecipientEmail(budget.client_email || "");

    // Load profile sender info
    if (user) {
      supabase
        .from("profiles")
        .select("company_name, display_name, phone")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          const comp = data?.company_name || data?.display_name || "Universal Informática";
          const phone = data?.phone || "";
          setSenderName(comp);

          const defaultSubject = `Proposta Comercial / Orçamento ${budget.budget_number} - ${budget.project_name} | ${comp}`;
          setSubject(defaultSubject);

          const formattedValue = Number(budget.total_value).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          });

          const defaultMessage = `Olá, ${budget.client_name}!

Segue a proposta comercial referente ao orçamento ${budget.budget_number} (${budget.project_name}).

• Valor Total: ${formattedValue}
• Status: Aguardando sua validação
• Validade da Proposta: 15 a 30 dias

O orçamento detalhado em formato PDF de 1 página está gerado e anexado para sua formalização.
Ficamos à disposição para esclarecer quaisquer dúvidas técnicas ou de prazos.

Atenciosamente,
${comp}
${phone ? `Contato / WhatsApp: ${phone}` : ""}`.trim();

          setMessage(defaultMessage);
        });
    }
  }, [budget, open, user]);

  if (!budget) return null;

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const bData = { ...(budget.budget_data || {}) };
      if (bData?.budget_type === "maintenance" || budget.budget_number.startsWith("MAN-")) {
        await generateMaintenanceBudgetPdf(bData as MaintenanceBudgetData);
      } else {
        await generateBudgetPdf(bData as BudgetData);
      }
      toast.success("PDF gerado e baixado com sucesso!");
    } catch (err) {
      console.error("PDF error:", err);
      toast.error("Erro ao gerar o PDF.");
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    toast.success("Mensagem copiada para a área de transferência!");
    setTimeout(() => setCopied(false), 2000);
  };

  // 1. Direct Background Dispatch via Resend API with PDF attached
  const handleSendViaResend = async () => {
    if (!recipientEmail || !recipientEmail.includes("@")) {
      toast.error("Por favor, informe um e-mail de destinatário válido.");
      return;
    }

    setSendingResend(true);
    try {
      toast.loading("Gerando PDF e enviando via Resend...", { id: "resend-send" });

      const bData = { ...(budget.budget_data || {}) };
      // Generate single-page PDF as Base64 in memory
      const pdfData = await getBudgetPdfBase64(bData);

      // Call Resend Serverless endpoint
      const result = await sendBudgetEmail({
        to: recipientEmail.trim(),
        subject: subject.trim(),
        message: message.trim(),
        senderName: senderName.trim(),
        pdfBase64: pdfData.base64,
        filename: pdfData.filename,
      });

      if (!result.success) {
        toast.dismiss("resend-send");
        toast.error(result.error || "Erro ao disparar via Resend.", {
          duration: 6000,
        });
        return;
      }

      // Record send date in Supabase budgets table
      const sentAt = new Date().toISOString();
      await supabase
        .from("budgets")
        .update({
          email_sent_at: sentAt,
          client_email: recipientEmail.trim(),
        })
        .eq("id", budget.id);

      toast.dismiss("resend-send");
      toast.success(`Orçamento com PDF anexado enviado com sucesso para ${recipientEmail}!`);
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.dismiss("resend-send");
      console.error("Resend send error:", err);
      toast.error(`Falha no envio: ${err.message || "Erro desconhecido"}`);
    } finally {
      setSendingResend(false);
    }
  };

  // 2. Open Mail Client (mailto:) fallback
  const handleOpenMailClient = async () => {
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(message);
    const mailtoUrl = `mailto:${recipientEmail}?subject=${encodedSubject}&body=${encodedBody}`;
    window.open(mailtoUrl, "_blank");

    // Record send timestamp
    const sentAt = new Date().toISOString();
    await supabase
      .from("budgets")
      .update({
        email_sent_at: sentAt,
        client_email: recipientEmail.trim() || null,
      })
      .eq("id", budget.id);

    toast.success("Cliente de e-mail aberto e envio registrado!");
    onSuccess();
    onOpenChange(false);
  };

  // 3. Just record send timestamp
  const handleRecordSendOnly = async () => {
    setLoading(true);
    try {
      const sentAt = new Date().toISOString();
      const { error } = await supabase
        .from("budgets")
        .update({
          email_sent_at: sentAt,
          client_email: recipientEmail.trim() || null,
        })
        .eq("id", budget.id);

      if (error) throw error;

      toast.success(`Registro de envio salvo com sucesso!`);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error("Error recording email send:", err);
      toast.error("Erro ao registrar envio no sistema.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-3 border-b border-border/70">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Enviar Orçamento por E-mail
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                <span className="font-mono font-medium text-foreground">{budget.budget_number}</span>
                <span>•</span>
                <span>{budget.client_name}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* History info banner */}
          {budget.email_sent_at ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>
                Último envio registrado em:{" "}
                <strong>
                  {format(new Date(budget.email_sent_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </strong>
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/60 border border-border/60 text-xs text-muted-foreground">
              <Clock className="h-4 w-4 shrink-0 text-muted-foreground/80" />
              <span>Este orçamento ainda não teve envio por e-mail registrado.</span>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="send-email-to" className="text-xs font-medium">
                  Para (E-mail do Cliente) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="send-email-to"
                  type="email"
                  placeholder="cliente@email.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="bg-background text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="send-sender" className="text-xs font-medium">
                  Remetente / Empresa
                </Label>
                <Input
                  id="send-sender"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Nome da sua empresa"
                  className="bg-background text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="send-subject" className="text-xs font-medium">
                Assunto do E-mail
              </Label>
              <Input
                id="send-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Assunto da mensagem"
                className="bg-background text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="send-message" className="text-xs font-medium">
                  Mensagem Personalizada
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyMessage}
                  className="h-6 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-500" />
                      <span className="text-emerald-500">Copiada</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copiar Texto</span>
                    </>
                  )}
                </Button>
              </div>
              <Textarea
                id="send-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                className="bg-background text-xs font-sans leading-relaxed resize-none"
              />
            </div>

            {/* Attached PDF card */}
            <div className="flex items-center justify-between p-3 rounded-md bg-muted/40 border border-border/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded bg-primary/10 text-primary">
                  <Paperclip className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground">
                    Orçamento_{budget.budget_number}.pdf
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Anexado automaticamente no envio via Resend
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPdf}
                disabled={downloading}
                className="h-8 gap-1.5 text-xs shadow-subtle"
              >
                {downloading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileDown className="h-3.5 w-3.5 text-primary" />
                )}
                Baixar PDF
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-border/70 flex flex-col sm:flex-row sm:justify-between items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs w-full sm:w-auto"
          >
            Cancelar
          </Button>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenMailClient}
              className="gap-1.5 text-xs shadow-subtle"
            >
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              Abrir no E-mail (mailto)
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={sendingResend}
              onClick={handleSendViaResend}
              className="gap-1.5 text-xs shadow-subtle bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            >
              {sendingResend ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Disparar pelo Resend
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
