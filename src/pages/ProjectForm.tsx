import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const ProjectForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = !!id;

  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [description, setDescription] = useState("");
  const [value, setValue] = useState("");
  const [deadline, setDeadline] = useState("");
  const [status, setStatus] = useState("em_andamento");
  const [links, setLinks] = useState("");
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("clients").select("id, name").eq("user_id", user.id).then(({ data }) => setClients(data || []));
    if (isEdit) {
      supabase.from("projects").select("*").eq("id", id).single().then(({ data }) => {
        if (data) {
          setName(data.name);
          setClientId(data.client_id || "");
          setDescription(data.description || "");
          setValue(data.value?.toString() || "");
          setDeadline(data.deadline || "");
          setStatus(data.status);
          setLinks(data.links?.join("\n") || "");
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
      client_id: clientId || null,
      description,
      value: value ? parseFloat(value) : 0,
      deadline: deadline || null,
      status: status as any,
      links: links ? links.split("\n").filter(Boolean) : [],
    };

    const { error } = isEdit
      ? await supabase.from("projects").update(payload).eq("id", id)
      : await supabase.from("projects").insert(payload);

    if (error) {
      toast.error("Erro ao salvar projeto");
    } else {
      toast.success(isEdit ? "Projeto atualizado" : "Projeto criado");
      navigate("/projects");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="border-border">
        <CardHeader>
          <CardTitle>{isEdit ? "Editar Projeto" : "Novo Projeto"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Projeto</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input type="number" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Prazo</Label>
                <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </div>
            </div>
            {isEdit && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="pausado">Pausado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Links úteis (um por linha)</Label>
              <Textarea value={links} onChange={(e) => setLinks(e.target.value)} placeholder="https://..." />
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : "Salvar"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/projects")}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectForm;
