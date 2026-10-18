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

const ClientForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = !!id;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit && user) {
      supabase.from("clients").select("*").eq("id", id).single().then(({ data }) => {
        if (data) {
          setName(data.name);
          setEmail(data.email || "");
          setPhone(data.phone || "");
          setCompany(data.company || "");
          setNotes(data.notes || "");
        }
      });
    }
  }, [user, id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const payload = {
      user_id: user.id,
      name,
      email: email || null,
      phone: phone || null,
      company: company || null,
      notes: notes || null,
    };

    const { error } = isEdit
      ? await supabase.from("clients").update(payload).eq("id", id)
      : await supabase.from("clients").insert(payload);

    if (error) {
      toast.error("Erro ao salvar cliente");
    } else {
      toast.success(isEdit ? "Cliente atualizado" : "Cliente criado");
      navigate("/clients");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto pb-8">
      <Card className="shadow-card border-border/80">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold tracking-tight">{isEdit ? "Editar Cliente" : "Novo Cliente"}</CardTitle>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isEdit ? "Atualize os dados de contato do cliente" : "Cadastre uma nova pessoa física ou jurídica na sua base"}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Nome Completo / Razão Social</Label>
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
                placeholder="Ex: João da Silva ou Empresa XYZ"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Email de Contato</Label>
              <Input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="contato@cliente.com"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Telefone / WhatsApp</Label>
              <Input 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                placeholder="(00) 00000-0000"
                className="bg-background font-mono-numbers"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Empresa</Label>
              <Input 
                value={company} 
                onChange={(e) => setCompany(e.target.value)} 
                placeholder="Nome da empresa do cliente"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Observações Internas</Label>
              <Textarea 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)} 
                placeholder="Anotações particulares sobre este cliente..."
                className="bg-background min-h-[80px]"
              />
            </div>
            <div className="flex gap-3 pt-4 border-t border-border/80">
              <Button type="submit" disabled={loading} className="min-w-32 shadow-subtle">
                {loading ? "Salvando..." : isEdit ? "Salvar Alterações" : "Cadastrar Cliente"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/clients")}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientForm;
