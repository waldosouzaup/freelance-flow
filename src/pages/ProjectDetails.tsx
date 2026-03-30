import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Plus, Trash2, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, string> = {
  em_andamento: "Em Andamento",
  concluido: "Concluído",
  pausado: "Pausado",
  cancelado: "Cancelado",
};

const ProjectDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [stages, setStages] = useState<any[]>([]);
  const [newStage, setNewStage] = useState("");
  const [notes, setNotes] = useState("");
  const [editingStage, setEditingStage] = useState<string | null>(null);
  const [editStageTitle, setEditStageTitle] = useState("");

  const fetchProject = async () => {
    if (!user || !id) return;
    const { data } = await supabase.from("projects").select("*, clients(name)").eq("id", id).single();
    if (data) {
      setProject(data);
      setNotes(data.general_notes || "");
    }
  };

  const fetchStages = async () => {
    if (!id) return;
    const { data } = await supabase.from("project_stages").select("*").eq("project_id", id).order("sort_order");
    setStages(data || []);
  };

  useEffect(() => {
    fetchProject();
    fetchStages();
  }, [user, id]);

  const addStage = async () => {
    if (!newStage.trim() || !user || !id) return;
    const { error } = await supabase.from("project_stages").insert({
      project_id: id,
      user_id: user.id,
      title: newStage.trim(),
      sort_order: stages.length,
    });
    if (!error) {
      setNewStage("");
      fetchStages();
    }
  };

  const toggleStage = async (stageId: string, completed: boolean) => {
    await supabase.from("project_stages").update({ completed: !completed }).eq("id", stageId);
    fetchStages();
  };

  const deleteStage = async (stageId: string) => {
    await supabase.from("project_stages").delete().eq("id", stageId);
    fetchStages();
  };

  const updateStageTitle = async (stageId: string) => {
    if (!editStageTitle.trim()) return;
    await supabase.from("project_stages").update({ title: editStageTitle.trim() }).eq("id", stageId);
    setEditingStage(null);
    fetchStages();
  };

  const saveNotes = async () => {
    if (!id) return;
    const { error } = await supabase.from("projects").update({ general_notes: notes }).eq("id", id);
    if (!error) toast.success("Notas salvas");
  };

  if (!project) return <p className="text-muted-foreground">Carregando...</p>;

  const completedCount = stages.filter((s) => s.completed).length;
  const progress = stages.length > 0 ? Math.round((completedCount / stages.length) * 100) : 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{project.name}</h1>
        <Button asChild variant="outline" size="sm">
          <Link to={`/projects/${id}/edit`}><Pencil className="h-4 w-4 mr-1" />Editar</Link>
        </Button>
      </div>

      {/* Project info */}
      <Card className="border-border">
        <CardContent className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Cliente</p>
            <p className="font-medium">{project.clients?.name || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
              {STATUS_LABELS[project.status]}
            </span>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Valor</p>
            <p className="font-medium">R$ {project.value?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Prazo</p>
            <p className="font-medium">{project.deadline ? format(new Date(project.deadline), "dd/MM/yyyy") : "—"}</p>
          </div>
        </CardContent>
      </Card>

      {project.description && (
        <Card className="border-border">
          <CardHeader><CardTitle className="text-base">Descrição</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">{project.description}</p></CardContent>
        </Card>
      )}

      {project.links && project.links.length > 0 && (
        <Card className="border-border">
          <CardHeader><CardTitle className="text-base">Links Úteis</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {project.links.map((link: string, i: number) => (
              <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-primary hover:underline">
                <ExternalLink className="h-3 w-3" />{link}
              </a>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Progress */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Etapas ({completedCount}/{stages.length})</CardTitle>
            <span className="text-sm text-muted-foreground">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-chart-green rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {stages.map((stage) => (
            <div key={stage.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 group">
              <Checkbox
                checked={stage.completed}
                onCheckedChange={() => toggleStage(stage.id, stage.completed)}
              />
              {editingStage === stage.id ? (
                <Input
                  value={editStageTitle}
                  onChange={(e) => setEditStageTitle(e.target.value)}
                  onBlur={() => updateStageTitle(stage.id)}
                  onKeyDown={(e) => e.key === "Enter" && updateStageTitle(stage.id)}
                  autoFocus
                  className="flex-1 h-8"
                />
              ) : (
                <span className={`flex-1 text-sm ${stage.completed ? "line-through text-muted-foreground" : ""}`}>
                  {stage.title}
                </span>
              )}
              <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                  setEditingStage(stage.id);
                  setEditStageTitle(stage.title);
                }}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteStage(stage.id)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <Input
              placeholder="Nova etapa..."
              value={newStage}
              onChange={(e) => setNewStage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addStage()}
            />
            <Button size="sm" onClick={addStage}><Plus className="h-4 w-4" /></Button>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="border-border">
        <CardHeader><CardTitle className="text-base">Notas Gerais</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Anotações sobre o projeto..." />
          <Button size="sm" onClick={saveNotes}>Salvar Notas</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectDetails;
