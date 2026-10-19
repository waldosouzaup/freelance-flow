import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Copy,
  Check,
  Building,
  Mail,
  Phone,
  MapPin,
  FileText,
  ExternalLink,
  MessageSquare,
  Pencil,
  User,
  ShieldCheck,
} from "lucide-react";
import { formatPhone, formatCpfCnpj, formatCep } from "@/pages/ClientForm";

export interface ClientRecord {
  id: string;
  user_id: string;
  name: string;
  cpf_cnpj?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  cep?: string | null;
  address?: string | null;
  address_number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

interface ClientDetailsModalProps {
  client: ClientRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (clientId: string) => void;
}

export const ClientDetailsModal: React.FC<ClientDetailsModalProps> = ({
  client,
  open,
  onOpenChange,
  onEdit,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!client) return null;

  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast.success(`${label} copiado para a área de transferência!`);
    setTimeout(() => {
      setCopiedField((cur) => (cur === label ? null : cur));
    }, 2000);
  };

  // Formatted address components
  const fullAddressLines = [
    client.address ? `${client.address}${client.address_number ? `, nº ${client.address_number}` : ""}` : "",
    client.complement ? `Comp: ${client.complement}` : "",
    client.neighborhood ? `Bairro: ${client.neighborhood}` : "",
    client.city && client.state ? `${client.city}/${client.state}` : client.city || "",
    client.cep ? `CEP: ${formatCep(client.cep)}` : "",
  ].filter(Boolean);

  const formattedFullAddress = fullAddressLines.join(" - ");

  // Formatted summary for full copy
  const handleCopyAll = () => {
    const lines = [
      `*DADOS DO CLIENTE*`,
      `Nome: ${client.name}`,
      client.cpf_cnpj ? `CPF/CNPJ: ${formatCpfCnpj(client.cpf_cnpj)}` : null,
      client.company ? `Empresa: ${client.company}` : null,
      client.email ? `E-mail: ${client.email}` : null,
      client.phone ? `Telefone: ${formatPhone(client.phone)}` : null,
      formattedFullAddress ? `Endereço: ${formattedFullAddress}` : null,
      client.notes ? `Observações: ${client.notes}` : null,
    ].filter(Boolean);

    navigator.clipboard.writeText(lines.join("\n"));
    setCopiedField("all");
    toast.success("Todos os dados do cliente foram copiados!");
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Phone clean digits for WhatsApp
  const cleanPhone = client.phone ? client.phone.replace(/\D/g, "") : "";
  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`}`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-3 border-b border-border/70">
          <div className="flex items-start justify-between gap-4 pr-6">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                {client.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  {client.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                  <span>Cadastrado em {new Date(client.created_at).toLocaleDateString("pt-BR")}</span>
                  {client.company && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted text-[11px] font-medium text-foreground">
                      <Building className="h-3 w-3 text-muted-foreground" />
                      {client.company}
                    </span>
                  )}
                </DialogDescription>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyAll}
              className="gap-1.5 text-xs shrink-0 shadow-subtle border-emerald-500/30 hover:border-emerald-500/60 hover:bg-emerald-500/10"
            >
              {copiedField === "all" ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-emerald-500 font-medium">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copiar Todos</span>
                </>
              )}
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* 1. Identification & Tax */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 pb-1 border-b border-border/40">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Identificação & Documento
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Name */}
              <div className="flex items-center justify-between p-2.5 rounded-md bg-muted/40 border border-border/60">
                <div className="space-y-0.5 overflow-hidden">
                  <span className="text-[11px] text-muted-foreground uppercase font-medium">Nome Completo</span>
                  <p className="text-sm font-semibold text-foreground truncate">{client.name}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => handleCopy(client.name, "Nome")}
                >
                  {copiedField === "Nome" ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>

              {/* CPF / CNPJ */}
              <div className="flex items-center justify-between p-2.5 rounded-md bg-muted/40 border border-border/60">
                <div className="space-y-0.5 overflow-hidden">
                  <span className="text-[11px] text-muted-foreground uppercase font-medium">CPF / CNPJ</span>
                  <p className="text-sm font-mono-numbers text-foreground truncate">
                    {client.cpf_cnpj ? formatCpfCnpj(client.cpf_cnpj) : "Não informado"}
                  </p>
                </div>
                {client.cpf_cnpj && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => handleCopy(formatCpfCnpj(client.cpf_cnpj!), "CPF/CNPJ")}
                  >
                    {copiedField === "CPF/CNPJ" ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* 2. Contact Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 pb-1 border-b border-border/40">
              <Phone className="h-4 w-4 text-primary" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Contato & Canais
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Email */}
              <div className="flex items-center justify-between p-2.5 rounded-md bg-muted/40 border border-border/60">
                <div className="space-y-0.5 overflow-hidden">
                  <span className="text-[11px] text-muted-foreground uppercase font-medium flex items-center gap-1">
                    <Mail className="h-3 w-3" /> Email
                  </span>
                  <p className="text-sm text-foreground truncate">{client.email || "Não informado"}</p>
                </div>
                {client.email && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => handleCopy(client.email!, "Email")}
                    >
                      {copiedField === "Email" ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button variant="ghost" size="icon" asChild className="h-7 w-7 text-muted-foreground hover:text-foreground">
                      <a href={`mailto:${client.email}`} title="Enviar Email">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  </div>
                )}
              </div>

              {/* Phone / WhatsApp */}
              <div className="flex items-center justify-between p-2.5 rounded-md bg-muted/40 border border-border/60">
                <div className="space-y-0.5 overflow-hidden">
                  <span className="text-[11px] text-muted-foreground uppercase font-medium flex items-center gap-1">
                    <Phone className="h-3 w-3" /> Telefone / WhatsApp
                  </span>
                  <p className="text-sm font-mono-numbers text-foreground truncate">
                    {client.phone ? formatPhone(client.phone) : "Não informado"}
                  </p>
                </div>
                {client.phone && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => handleCopy(formatPhone(client.phone!), "Telefone")}
                    >
                      {copiedField === "Telefone" ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    {whatsappUrl && (
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        className="h-7 w-7 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                      >
                        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" title="Conversar no WhatsApp">
                          <MessageSquare className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. Address Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-border/40">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-500" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Endereço Cadastrado
                </h4>
              </div>
              {formattedFullAddress && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1"
                  onClick={() => handleCopy(formattedFullAddress, "Endereço Completo")}
                >
                  {copiedField === "Endereço Completo" ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-500" />
                      <span className="text-emerald-500">Endereço Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copiar Endereço</span>
                    </>
                  )}
                </Button>
              )}
            </div>

            {formattedFullAddress ? (
              <div className="p-3 rounded-md bg-muted/40 border border-border/60 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-[11px] text-muted-foreground block font-medium">Logradouro</span>
                    <span className="font-medium text-foreground">
                      {client.address || "—"} {client.address_number ? `, nº ${client.address_number}` : ""}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-muted-foreground block font-medium">Complemento</span>
                    <span className="text-foreground">{client.complement || "—"}</span>
                  </div>

                  <div>
                    <span className="text-[11px] text-muted-foreground block font-medium">Bairro</span>
                    <span className="text-foreground">{client.neighborhood || "—"}</span>
                  </div>

                  <div>
                    <span className="text-[11px] text-muted-foreground block font-medium">Cidade / UF</span>
                    <span className="font-medium text-foreground">
                      {client.city ? `${client.city}${client.state ? ` - ${client.state}` : ""}` : "—"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-muted-foreground block font-medium">CEP</span>
                    <span className="font-mono-numbers text-foreground">
                      {client.cep ? formatCep(client.cep) : "—"}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-md bg-muted/20 border border-dashed border-border/60 text-center text-xs text-muted-foreground">
                Nenhum endereço cadastrado para este cliente.
              </div>
            )}
          </div>

          {/* 4. Notes Section */}
          {client.notes && (
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Observações Internas
                  </h4>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1"
                  onClick={() => handleCopy(client.notes!, "Observações")}
                >
                  {copiedField === "Observações" ? (
                    <Check className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
              <div className="p-3 rounded-md bg-muted/40 border border-border/60 text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                {client.notes}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-3 border-t border-border/70 flex sm:justify-between items-center gap-2">
          {onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onEdit(client.id);
              }}
              className="gap-1.5 text-xs"
            >
              <Pencil className="h-3.5 w-3.5" />
              Editar Cliente
            </Button>
          )}
          <Button variant="default" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
