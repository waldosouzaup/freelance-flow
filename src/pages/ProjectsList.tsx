import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Eye, Search, Filter } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { analyzeProfitability, getProfitabilityLabel, getProfitabilityBadgeClasses } from "@/lib/profitability";

const STATUS_LABELS: Record<string, string> = {
  em_andamento: "Em Andamento",
  concluido: "Concluído",
  pausado: "Pausado",
  cancelado: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  em_andamento: "bg-warning/10 text-warning border-warning/20",
  concluido: "bg-success/10 text-success border-success/20",
  pausado: "bg-muted text-muted-foreground border-border",
  cancelado: "bg-destructive/10 text-destructive border-destructive/20",
};

const ProjectsList = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchProjects = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("projects")
      .select("*, clients(name)")
      .eq("user_id", user.id)
      .order("deadline", { ascending: true });
    setProjects(data || []);
  };

  const fetchClients = async () => {
    if (!user) return;
    const { data } = await supabase.from("clients").select("id, name").eq("user_id", user.id);
    setClients(data || []);
  };

  useEffect(() => {
    fetchProjects();
    fetchClients();
  }, [user]);

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("projects").delete().eq("id", deleteId);
    if (error) {
      toast.error("Erro ao excluir projeto");
    } else {
      toast.success("Projeto excluído");
      fetchProjects();
    }
    setDeleteId(null);
  };

  const statusCounts = {
    all: projects.length,
    em_andamento: projects.filter((p) => p.status === "em_andamento").length,
    concluido: projects.filter((p) => p.status === "concluido").length,
    pausado: projects.filter((p) => p.status === "pausado").length,
  };

  const filtered = projects.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const matchClient = clientFilter === "all" || p.client_id === clientFilter;
    return matchSearch && matchStatus && matchClient;
  });

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Gestão de Projetos</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie seus projetos, etapas, prazos e acompanhe a lucratividade</p>
        </div>
        <Button asChild className="shadow-subtle">
          <Link to="/projects/new">
            <Plus className="h-4 w-4 mr-2" />
            Novo Projeto
          </Link>
        </Button>
      </div>

      {/* Quick Status Pill Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { key: "all", label: "Todos", count: statusCounts.all },
          { key: "em_andamento", label: "Em Andamento", count: statusCounts.em_andamento },
          { key: "concluido", label: "Concluídos", count: statusCounts.concluido },
          { key: "pausado", label: "Pausados", count: statusCounts.pausado },
        ].map((item) => {
          const isActive = statusFilter === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setStatusFilter(item.key)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap border ${
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-subtle"
                  : "bg-card text-muted-foreground hover:text-foreground border-border/80 hover:bg-muted/50"
              }`}
            >
              <span>{item.label}</span>
              <span
                className={`text-[10px] font-mono-numbers px-1.5 py-0.2 rounded-full ${
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {item.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters Card */}
      <Card className="shadow-card border-border/80">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nome do projeto..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                className="pl-9 bg-background"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48 bg-background">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
                <SelectItem value="pausado">Pausado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-full sm:w-48 bg-background">
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-card border-border/80">
        <CardContent className="p-0">
          <div className="rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 border-b border-border/80">
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Nome</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Cliente</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Status</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Lucratividade</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Prazo</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-16">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-muted/60 flex items-center justify-center">
                          <Search className="h-6 w-6 text-muted-foreground/60" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Nenhum projeto encontrado</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Tente ajustar seus filtros ou termo de busca</p>
                        </div>
                        <Button asChild variant="outline" size="sm" className="mt-2">
                          <Link to="/projects/new">
                            <Plus className="h-4 w-4 mr-2" />
                            Criar novo projeto
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((p) => (
                    <TableRow key={p.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="font-medium text-foreground">{p.name}</TableCell>
                      <TableCell className="text-muted-foreground">{p.clients?.name || "—"}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${STATUS_COLORS[p.status] || "bg-muted text-muted-foreground"}`}>
                          {STATUS_LABELS[p.status] || p.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const analysis = analyzeProfitability({
                            estimatedRevenue: p.value,
                            actualCosts: p.actual_costs,
                            estimatedHours: p.estimated_hours,
                            actualHours: p.actual_hours,
                          });
                          return (
                            <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${getProfitabilityBadgeClasses(analysis.status)}`}>
                              {getProfitabilityLabel(analysis.status)}
                            </span>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        {p.deadline ? (
                          <span className="text-sm font-mono-numbers text-foreground">
                            {format(new Date(p.deadline), "dd/MM/yyyy")}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                            <Link to={`/projects/${p.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                            <Link to={`/projects/${p.id}/edit`}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir projeto</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir este projeto? Todas as etapas vinculadas também serão removidas. Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => {
                                    setDeleteId(p.id);
                                    handleDelete();
                                  }} 
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectsList;
