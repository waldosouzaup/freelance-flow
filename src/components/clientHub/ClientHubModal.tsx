import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Copy, Check, ExternalLink, Share2, Globe, ShieldCheck, Eye, Clock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { getOrCreateHubToken, toggleHubTokenActive, type ClientHubTokenData } from "@/services/clientHubService";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ClientHubModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetId?: string;
  projectId?: string;
  title: string;
  clientName?: string;
  clientPhone?: string;
}

export function ClientHubModal({
  open,
  onOpenChange,
  budgetId,
  projectId,
  title,
  clientName,
  clientPhone,
}: ClientHubModalProps) {
  const { user } = useAuth();
  const [tokenData, setTokenData] = useState<ClientHubTokenData | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!open || !user) return;

    const loadToken = async () => {
      setLoading(true);
      try {
        const token = await getOrCreateHubToken({
          userId: user.id,
          budgetId,
          projectId,
        });
        if (token) {
          setTokenData(token);
          setIsActive(token.is_active);
        }
      } finally {
        setLoading(false);
      }
    };

    loadToken();
  }, [open, user, budgetId, projectId]);

  const hubUrl = tokenData
    ? `${window.location.origin}/hub/${tokenData.token}`
    : "";

  const handleCopy = () => {
    if (!hubUrl) return;
    navigator.clipboard.writeText(hubUrl);
    setCopied(true);
    toast.success("Link do Portal do Cliente copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggle = async (checked: boolean) => {
    if (!tokenData) return;
    setIsActive(checked);
    const ok = await toggleHubTokenActive(tokenData.id, checked);
    if (ok) {
      toast.success(checked ? "Link ativado com sucesso." : "Link desativado. Clientes não poderão acessar.");
    } else {
      setIsActive(!checked);
      toast.error("Erro ao alterar status do link.");
    }
  };

  const handleSendWhatsApp = () => {
    if (!hubUrl) return;
    const msg = `Olá ${clientName || "Cliente"}! Acompanhe o status do seu serviço/projeto em tempo real através do nosso portal seguro:\n\n${hubUrl}`;
    const cleanPhone = (clientPhone || "").replace(/\D/g, "");
    const waUrl = cleanPhone
      ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Portal do Cliente (Client Hub)</DialogTitle>
              <DialogDescription className="text-xs">
                Link público seguro para {clientName || title}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Gerando link seguro...
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                Este link permite ao cliente acompanhar o status, laudo técnico e marcos de entrega sem senha. Seus custos internos e margens permanecem 100% confidenciais.
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Link Público de Acompanhamento</Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={hubUrl}
                  className="font-mono text-xs bg-card"
                  disabled={!isActive}
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleCopy}
                  disabled={!isActive}
                  title="Copiar link"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => window.open(hubUrl, "_blank")}
                  disabled={!isActive}
                  title="Abrir página do cliente"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
              <div className="space-y-0.5">
                <Label htmlFor="hub-toggle" className="text-sm font-medium">Link Ativo</Label>
                <p className="text-xs text-muted-foreground">
                  {isActive ? "Clientes podem visualizar a página" : "Acesso bloqueado temporariamente"}
                </p>
              </div>
              <Switch
                id="hub-toggle"
                checked={isActive}
                onCheckedChange={handleToggle}
              />
            </div>

            {tokenData?.last_accessed_at && (
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground px-1">
                <Clock className="h-3 w-3" />
                <span>
                  Último acesso do cliente:{" "}
                  {format(new Date(tokenData.last_accessed_at), "dd/MM/yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </span>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto gap-1.5"
            onClick={handleSendWhatsApp}
            disabled={!isActive || !hubUrl}
          >
            <Share2 className="h-4 w-4 text-emerald-500" />
            Enviar via WhatsApp
          </Button>

          <Button
            type="button"
            className="w-full sm:w-auto bg-primary text-primary-foreground"
            onClick={handleCopy}
            disabled={!isActive || !hubUrl}
          >
            {copied ? "Link Copiado!" : "Copiar Link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
