import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Camera,
  Save,
  User,
  Settings as SettingsIcon,
  Mail,
  Building,
  Phone,
  Globe,
  FileText,
  MapPin,
  QrCode,
  Info,
  Database,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";

const Settings = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");

  // New fields: CNPJ, Address, Pix
  const [cnpj, setCnpj] = useState("");
  const [address, setAddress] = useState("");
  const [pixKeyType, setPixKeyType] = useState<string>("cnpj");
  const [pixKey, setPixKey] = useState("");

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [migrationNoticeVisible, setMigrationNoticeVisible] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setDisplayName(data.display_name || "");
        setAvatarUrl(data.avatar_url);
        setCompanyName(data.company_name || "");
        setPhone(data.phone || "");
        setWebsite(data.website || "");

        // Load new fields if they exist in the returned record, or fallback to localStorage
        const p = data as any;
        let c = p.cnpj || "";
        let a = p.address || "";
        let pt = p.pix_key_type || "";
        let pk = p.pix_key || "";

        try {
          const localExt = localStorage.getItem(`freelance_flow_profile_extended_${user.id}`);
          if (localExt) {
            const parsed = JSON.parse(localExt);
            if (!c && parsed.cnpj) c = parsed.cnpj;
            if (!a && parsed.address) a = parsed.address;
            if (!pt && parsed.pix_key_type) pt = parsed.pix_key_type;
            if (!pk && parsed.pix_key) pk = parsed.pix_key;
          }
        } catch {
          // ignore
        }

        if (c) setCnpj(c);
        if (a) setAddress(a);
        if (pt) setPixKeyType(pt);
        if (pk) setPixKey(pk);
      }
    };
    fetchProfile();
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB");
      return;
    }

    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error("Erro ao enviar imagem");
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    const url = `${publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: url })
      .eq("user_id", user.id);

    if (updateError) {
      toast.error("Erro ao atualizar avatar");
    } else {
      setAvatarUrl(url);
      toast.success("Avatar atualizado!");
    }
    setUploading(false);
  };

  const migrationSql = `-- Execute no SQL Editor do Supabase para adicionar as novas colunas:
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS pix_key_type TEXT,
  ADD COLUMN IF NOT EXISTS pix_key TEXT,
  ADD COLUMN IF NOT EXISTS cnpj TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT;`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(migrationSql);
    setCopiedSql(true);
    toast.success("Comando SQL copiado para a área de transferência!");
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);

    const extendedData = {
      cnpj: cnpj.trim() || null,
      address: address.trim() || null,
      pix_key_type: pixKeyType || null,
      pix_key: pixKey.trim() || null,
    };

    // Save extended fields in localStorage immediately as resilient fallback
    try {
      localStorage.setItem(
        `freelance_flow_profile_extended_${user.id}`,
        JSON.stringify(extendedData)
      );
    } catch {
      // ignore
    }

    const fullPayload: Record<string, any> = {
      display_name: displayName,
      company_name: companyName || null,
      phone: phone || null,
      website: website || null,
      ...extendedData,
    };

    const { error: fullError } = await supabase
      .from("profiles")
      .update(fullPayload)
      .eq("user_id", user.id);

    if (!fullError) {
      toast.success("Configurações salvas com sucesso no Supabase!");
      setMigrationNoticeVisible(false);
      setLoading(false);
      return;
    }

    console.warn("Full update failed, attempting core fields update...", fullError);

    // Fallback: If remote DB doesn't have pix/cnpj/address columns yet, update core columns
    const corePayload = {
      display_name: displayName,
      company_name: companyName || null,
      phone: phone || null,
      website: website || null,
    };

    const { error: coreError } = await supabase
      .from("profiles")
      .update(corePayload)
      .eq("user_id", user.id);

    if (coreError) {
      console.error("Error updating profile core fields:", coreError);
      toast.error("Erro ao salvar configurações no Supabase.");
    } else {
      toast.warning("Dados básicos salvos na nuvem e Pix/CNPJ guardados localmente! Para sincronizar no banco, execute a migração SQL.");
      setMigrationNoticeVisible(true);
    }
    setLoading(false);
  };

  const initials = displayName
    ? displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <div className="space-y-6 max-w-2xl pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <SettingsIcon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Configurações da Conta</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie seu perfil, dados da empresa, endereço fiscal e chave Pix</p>
        </div>
      </div>

      {/* 1. Profile Card */}
      <Card className="shadow-card border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Perfil Pessoal & Identificação
          </CardTitle>
          <CardDescription>
            Atualize sua foto e nome de identificação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar / Logo */}
          <div className="flex items-center gap-6">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <Avatar className="h-20 w-20 border-2 border-border">
                <AvatarImage src={avatarUrl || undefined} alt="Avatar" />
                <AvatarFallback className="text-lg bg-primary text-primary-foreground">{initials}</AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="h-5 w-5 text-white" />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            <div>
              <p className="font-medium">Logo da Empresa / Foto de Perfil</p>
              <p className="text-sm text-muted-foreground">Esta imagem aparecerá no topo dos seus orçamentos em PDF (máx. 2MB).</p>
              {uploading && <p className="text-xs text-primary mt-1">Enviando imagem...</p>}
            </div>
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName" className="text-sm font-medium">Nome do Responsável</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Seu nome completo"
              className="max-w-md"
            />
          </div>

          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              Email de Acesso
            </Label>
            <Input
              value={user?.email || ""}
              disabled
              className="max-w-md opacity-60"
            />
            <p className="text-xs text-muted-foreground">O email de login é gerenciado pela autenticação.</p>
          </div>
        </CardContent>
      </Card>

      {/* 2. Company Card (with CNPJ & Address) */}
      <Card className="shadow-card border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Building className="h-4 w-4 text-primary" />
            Dados da Empresa & Fiscais
          </CardTitle>
          <CardDescription>
            Informações que serão exibidas no cabeçalho do orçamento quando preenchidas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Company Name */}
          <div className="space-y-2">
            <Label htmlFor="companyName" className="text-sm font-medium">Nome da Empresa / Razão Social</Label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ex: Universal Informática, Tech Solutions LTDA"
                className="pl-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CNPJ */}
            <div className="space-y-2">
              <Label htmlFor="cnpj" className="text-sm font-medium">CNPJ / CPF</Label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="cnpj"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  placeholder="00.000.000/0000-00"
                  className="pl-9"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">Só aparece no PDF se preenchido.</p>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium">Telefone de Contato</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {/* Website */}
          <div className="space-y-2">
            <Label htmlFor="website" className="text-sm font-medium">Website</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://suaempresa.com.br"
                className="pl-9"
              />
            </div>
          </div>

          {/* Commercial Address */}
          <div className="space-y-2">
            <Label htmlFor="address" className="text-sm font-medium">Endereço Comercial</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ex: Av. Paulista, 1000, Sala 52 - Bela Vista, São Paulo - SP, CEP 01310-100"
                className="pl-9 min-h-[70px] resize-none"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">Só aparece no PDF se preenchido.</p>
          </div>
        </CardContent>
      </Card>

      {/* 3. Payment / PIX Card */}
      <Card className="shadow-card border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <QrCode className="h-4 w-4 text-emerald-500" />
            Dados de Pagamento (PIX)
          </CardTitle>
          <CardDescription>
            Gera automaticamente um QR Code escaneável e chave copia-e-cola no seu orçamento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Pix Key Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tipo de Chave Pix</Label>
              <Select value={pixKeyType} onValueChange={(val) => setPixKeyType(val)}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cnpj">CNPJ</SelectItem>
                  <SelectItem value="cpf">CPF</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Telefone</SelectItem>
                  <SelectItem value="random">Chave Aleatória (EVP)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Pix Key Value */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="pixKey" className="text-sm font-medium">Chave Pix</Label>
              <Input
                id="pixKey"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                placeholder={
                  pixKeyType === "cnpj"
                    ? "Ex: 23.192.394/0001-22"
                    : pixKeyType === "email"
                    ? "Ex: financeiro@suaempresa.com"
                    : pixKeyType === "phone"
                    ? "Ex: (31) 99560-7925"
                    : "Chave Pix para recebimento"
                }
                className="bg-background"
              />
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-muted-foreground">
            <Info className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>
              Ao preencher a chave Pix, o orçamento em PDF exibirá um <strong>QR Code oficial escaneável</strong> para pagamento direto no app do banco e a chave em texto para cópia rápida.
            </span>
          </div>

          {/* Live Preview Card */}
          {pixKey.trim() && (
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.04] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <QrCode className="h-3.5 w-3.5" />
                  Pré-visualização do Box no Orçamento
                </span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold">
                  Chave {pixKeyType.toUpperCase()}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-background/80 p-3 rounded-lg border border-border/60">
                <div className="h-16 w-16 rounded-lg bg-white p-1 border border-border flex items-center justify-center shrink-0">
                  <QrCode className="h-12 w-12 text-slate-900" />
                </div>
                <div className="space-y-1 text-center sm:text-left flex-1">
                  <p className="text-xs text-muted-foreground font-medium">Chave Pix para Pagamento:</p>
                  <p className="font-mono-numbers text-sm font-bold text-foreground break-all">{pixKey.trim()}</p>
                  <p className="text-[11px] text-muted-foreground">O cliente escaneia com o app do banco ou copia a chave.</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SQL Migration Notice if columns not yet present in Supabase */}
      {migrationNoticeVisible && (
        <Card className="border-amber-500/30 bg-amber-500/[0.04] shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <Database className="h-4 w-4" />
                Sincronização com o Banco de Dados (Supabase)
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopySql}
                className="h-8 gap-1.5 border-amber-500/30 hover:bg-amber-500/10 text-xs"
              >
                {copiedSql ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copiar SQL
                  </>
                )}
              </Button>
            </div>
            <CardDescription className="text-xs mt-1">
              Seus dados de Pix e CNPJ estão funcionando normalmente salvos neste navegador. Para gravá-los permanentemente na nuvem do Supabase, acesse o <strong>SQL Editor</strong> do painel Supabase e execute este comando:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="p-3 rounded-lg bg-background border border-border/80 font-mono text-xs overflow-x-auto text-foreground">
              {migrationSql}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={loading} size="lg" className="min-w-44 shadow-subtle">
          <Save className="h-4 w-4 mr-2" />
          {loading ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>
    </div>
  );
};

export default Settings;
