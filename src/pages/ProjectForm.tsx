import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, ListChecks } from "lucide-react";

interface Stage {
  id: string;
  title: string;
  completed: boolean;
  sort_order: number;
  isNew?: boolean;
}

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
  
  // Stages/Tasks
  const [stages, setStages] = useState<Stage[]>([]);
  const [newStageTitle, setNewStageTitle] = useState("");

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
      // Load existing stages
      supabase
        .from("project_stages")
        .select("*")
        .eq("project_id", id)
        .order("sort_order")
        .then(({ data }) => {
          if (data) {
            setStages(data.map(s => ({ ...s, isNew: false })));
          }
        });
    }
  }, [user, id]);

  const addStage = () => {
    if (!newStageTitle.trim()) return;
    setStages([
      ...stages,
      {
        id: crypto.randomUUID(),
        title: newStageTitle.trim(),
        completed: false,
        sort_order: stages.length,
        isNew: true,
      },
    ]);
    setNewStageTitle("");
  };

  const removeStage = (stageId: string) => {
    setStages(stages.filter((s) => s.id !== stageId).map((s, i) => ({ ...s, sort_order: i })));
  };

  const toggleStageComplete = (stageId: string) => {
    setStages(stages.map((s) => (s.id === stageId ? { ...s, completed: !s.completed } : s)));
  };

  const updateStageTitle = (stageId: string, title: string) => {
    setStages(stages.map((s) => (s.id === stageId ? { ...s, title } : s)));
  };

  const moveStage = (index: number, direction: "up" | "down") => {
    const newStages = [...stages];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= stages.length) return;
    [newStages[index], newStages[targetIndex]] = [newStages[targetIndex], newStages[index]];
    setStages(newStages.map((s, i) => ({ ...s, sort_order: i })));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addStage();
    }
  };

  const saveStages = async (projectId: string) => {
    if (!user) return;

    // Delete removed stages (only for edit mode)
    if (isEdit) {
      const { data: existingStages } = await supabase
        .from("project_stages")
        .select("id")
        .eq("project_id", projectId);
      
      if (existingStages) {
        const currentIds = stages.filter(s => !s.isNew).map(s => s.id);
        const toDelete = existingStages.filter(es => !currentIds.includes(es.id));
        if (toDelete.length > 0) {
          await supabase.from("project_stages").delete().in("id", toDelete.map(d => d.id));
        }
      }
    }

    // Upsert stages
    for (const stage of stages) {
      const payload = {
        title: stage.title,
        completed: stage.completed,
        sort_order: stage.sort_order,
        project_id: projectId,
        user_id: user.id,
      };

      if (!stage.isNew) {
        await supabase.from("project_stages").update(payload).eq("id", stage.id);
      } else {
        await supabase.from("project_stages").insert(payload);
      }
    }
  };

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

    let projectId = id;

    if (isEdit) {
      const { error } = await supabase.from("projects").update(payload).eq("id", id);
      if (error) {
        toast.error("Erro ao atualizar projeto");
        setLoading(false);
        return;
      }
    } else {
      const { data, error } = await supabase.from("projects").insert(payload).select().single();
      if (error) {
        toast.error("Erro ao criar projeto");
        setLoading(false);
        return;
      }
      projectId = data.id;
    }

    // Save stages
    await saveStages(projectId!);

    toast.success(isEdit ? "Projeto atualizado" : "Projeto criado");
    navigate("/projects");
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto pb-8">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>{isEdit ? "Editar Projeto" : "Novo Projeto"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
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

            {/* Tasks/Stages Section */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-primary" />
                <Label className="text-base font-medium">Tarefas do Projeto</Label>
              </div>
              <CardDescription>
                Adicione as etapas ou tarefas que precisam ser concluídas neste projeto.
              </CardDescription>

              {/* Add new task */}
              <div className="flex gap-2">
                <Input
                  value={newStageTitle}
                  onChange={(e) => setNewStageTitle(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Digite o nome da tarefa e pressione Enter"
                  className="flex-1"
                />
                <Button type="button" onClick={addStage} disabled={!newStageTitle.trim()}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </div>

              {/* Tasks list */}
              {stages.length > 0 && (
                <div className="space-y-2">
                  {stages.map((stage, index) => (
                    <div
                      key={stage.id}
                      className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border group"
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                      <div className="flex flex-col gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => moveStage(index, "up")}
                          disabled={index === 0}
                        >
                          ↑
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => moveStage(index, "down")}
                          disabled={index === stages.length - 1}
                        >
                          ↓
                        </Button>
                      </div>
                      <Checkbox
                        checked={stage.completed}
                        onCheckedChange={() => toggleStageComplete(stage.id)}
                      />
                      <Input
                        value={stage.title}
                        onChange={(e) => updateStageTitle(stage.id, e.target.value)}
                        className="flex-1 bg-transparent border-transparent focus:border-input h-8"
                      />
                      <span className="text-xs text-muted-foreground w-8">
                        {index + 1}/{stages.length}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => removeStage(stage.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {stages.length === 0 && (
                <div className="text-center py-6 border border-dashed rounded-lg text-muted-foreground">
                  <p className="text-sm">Nenhuma tarefa adicionada</p>
                  <p className="text-xs mt-1">Adicione tarefas para acompanhar o progresso do projeto</p>
                </div>
              )}

              {/* Progress summary */}
              {stages.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Progresso:</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{
                        width: `${stages.filter(s => s.completed).length / stages.length * 100}%`,
                      }}
                    />
                  </div>
                  <span className="font-medium">
                    {stages.filter(s => s.completed).length}/{stages.length}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
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
