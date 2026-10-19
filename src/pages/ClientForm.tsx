import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Search, MapPin, Building, User, Mail, Phone, FileText } from "lucide-react";

export const formatCep = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

export const formatCpfCnpj = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 11) {
    // CPF: 000.000.000-00
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
      .slice(0, 14);
  }
  // CNPJ: 00.000.000/0000-00
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2")
    .slice(0, 18);
};

export const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const ClientForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = !!id;

  const [name, setName] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  
  // Address fields
  const [cep, setCep] = useState("");
  const [address, setAddress] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  useEffect(() => {
    if (isEdit && user) {
      supabase
        .from("clients")
        .select("*")
        .eq("id", id)
        .single()
        .then(({ data }) => {
          if (data) {
            setName(data.name || "");
            setCpfCnpj(data.cpf_cnpj ? formatCpfCnpj(data.cpf_cnpj) : "");
            setEmail(data.email || "");
            setPhone(data.phone ? formatPhone(data.phone) : "");
            setCompany(data.company || "");
            setCep(data.cep ? formatCep(data.cep) : "");
            setAddress(data.address || "");
            setAddressNumber(data.address_number || "");
            setComplement(data.complement || "");
            setNeighborhood(data.neighborhood || "");
            setCity(data.city || "");
            setState(data.state || "");
            setNotes(data.notes || "");
          }
        });
    }
  }, [user, id]);

  const handleFetchViaCep = async (cepInput: string) => {
    const cleanCep = cepInput.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;

    setCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      if (!response.ok) throw new Error("Erro na requisição");
      const data = await response.json();

      if (data.erro) {
        toast.error("CEP não localizado na base dos Correios.");
      } else {
        setAddress(data.logradouro || "");
        setNeighborhood(data.bairro || "");
        setCity(data.localidade || "");
        setState(data.uf || "");
        toast.success(`Endereço localizado: ${data.localidade}/${data.uf}`);
        // Focus number input next
        setTimeout(() => {
          const numberInput = document.getElementById("client-address-number");
          numberInput?.focus();
        }, 100);
      }
    } catch (err) {
      console.error("ViaCEP error:", err);
      toast.error("Não foi possível consultar o CEP automaticamente.");
    } finally {
      setCepLoading(false);
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCep(e.target.value);
    setCep(formatted);
    const clean = formatted.replace(/\D/g, "");
    if (clean.length === 8) {
      handleFetchViaCep(clean);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const payload = {
      user_id: user.id,
      name: name.trim(),
      cpf_cnpj: cpfCnpj.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      company: company.trim() || null,
      cep: cep.trim() || null,
      address: address.trim() || null,
      address_number: addressNumber.trim() || null,
      complement: complement.trim() || null,
      neighborhood: neighborhood.trim() || null,
      city: city.trim() || null,
      state: state.trim() || null,
      notes: notes.trim() || null,
    };

    const { error } = isEdit
      ? await supabase.from("clients").update(payload).eq("id", id)
      : await supabase.from("clients").insert(payload);

    if (error) {
      console.error("Error saving client:", error);
      toast.error("Erro ao salvar cliente.");
    } else {
      toast.success(isEdit ? "Cliente atualizado com sucesso!" : "Cliente cadastrado com sucesso!");
      navigate("/clients");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto pb-10">
      <Card className="shadow-card border-border/80">
        <CardHeader className="pb-4 border-b border-border/60">
          <CardTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            {isEdit ? "Editar Cliente" : "Novo Cliente"}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isEdit
              ? "Atualize os dados cadastrais, endereço e observações do cliente"
              : "Cadastre um novo cliente com dados completos para geração de orçamentos e faturamento"}
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. Identification Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-border/40">
                <Building className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Identificação & Contato
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="client-name" className="text-sm font-medium">
                    Nome Completo / Razão Social <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="client-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Ex: João da Silva ou Universal Informática Ltda"
                    className="bg-background"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="client-cpf-cnpj" className="text-sm font-medium flex items-center justify-between">
                    <span>CPF ou CNPJ</span>
                    <span className="text-xs text-muted-foreground">Opcional</span>
                  </Label>
                  <Input
                    id="client-cpf-cnpj"
                    value={cpfCnpj}
                    onChange={(e) => setCpfCnpj(formatCpfCnpj(e.target.value))}
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                    className="bg-background font-mono-numbers"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="client-company" className="text-sm font-medium">
                    Empresa / Nome Fantasia
                  </Label>
                  <Input
                    id="client-company"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Ex: Universal Informática ou Pessoa Física"
                    className="bg-background"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="client-email" className="text-sm font-medium flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    Email de Contato
                  </Label>
                  <Input
                    id="client-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contato@cliente.com"
                    className="bg-background"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="client-phone" className="text-sm font-medium flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    Telefone / WhatsApp
                  </Label>
                  <Input
                    id="client-phone"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    placeholder="(31) 90000-0000"
                    className="bg-background font-mono-numbers"
                  />
                </div>
              </div>
            </div>

            {/* 2. Address & ViaCEP Section */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between pb-1 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-500" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Endereço Completo
                  </h3>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  Busca automática via API ViaCEP
                </span>
              </div>

              {/* CEP Input */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="client-cep" className="text-sm font-medium">
                    CEP
                  </Label>
                  <div className="relative">
                    <Input
                      id="client-cep"
                      value={cep}
                      onChange={handleCepChange}
                      onBlur={() => handleFetchViaCep(cep)}
                      placeholder="00000-000"
                      maxLength={9}
                      className="bg-background font-mono-numbers pr-9"
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {cepLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : (
                        <Search
                          className="h-4 w-4 cursor-pointer hover:text-foreground"
                          onClick={() => handleFetchViaCep(cep)}
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="client-address" className="text-sm font-medium">
                    Logradouro / Rua / Avenida
                  </Label>
                  <Input
                    id="client-address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Ex: Rua dos Cravos"
                    className="bg-background"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1.5 md:col-span-1">
                  <Label htmlFor="client-address-number" className="text-sm font-medium">
                    Número
                  </Label>
                  <Input
                    id="client-address-number"
                    value={addressNumber}
                    onChange={(e) => setAddressNumber(e.target.value)}
                    placeholder="Ex: 16 ou S/N"
                    className="bg-background"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-3">
                  <Label htmlFor="client-complement" className="text-sm font-medium">
                    Complemento
                  </Label>
                  <Input
                    id="client-complement"
                    value={complement}
                    onChange={(e) => setComplement(e.target.value)}
                    placeholder="Ex: Apto 201, Sala 04, Galpão B"
                    className="bg-background"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="client-neighborhood" className="text-sm font-medium">
                    Bairro
                  </Label>
                  <Input
                    id="client-neighborhood"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    placeholder="Ex: Jardim Daliana"
                    className="bg-background"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-3">
                  <Label htmlFor="client-city" className="text-sm font-medium">
                    Cidade
                  </Label>
                  <Input
                    id="client-city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ex: Vespasiano"
                    className="bg-background"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-1">
                  <Label htmlFor="client-state" className="text-sm font-medium">
                    UF
                  </Label>
                  <Input
                    id="client-state"
                    value={state}
                    onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
                    placeholder="MG"
                    maxLength={2}
                    className="bg-background uppercase text-center font-bold"
                  />
                </div>
              </div>
            </div>

            {/* 3. Internal Notes Section */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2 pb-1 border-b border-border/40">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Observações Internas
                </h3>
              </div>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anotações particulares sobre preferências, dados adicionais ou histórico do cliente..."
                className="bg-background min-h-[90px]"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/80">
              <Button type="button" variant="outline" onClick={() => navigate("/clients")}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="min-w-36 shadow-subtle gap-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Salvando..." : isEdit ? "Salvar Alterações" : "Cadastrar Cliente"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientForm;
