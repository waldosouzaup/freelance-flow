import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  FolderKanban, 
  Users, 
  TrendingUp, 
  Plus, 
  Calculator, 
  CheckCircle2, 
  Clock,
  ArrowRight,
  DollarSign,
  Calendar,
  BarChart3
} from "lucide-react";
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format, isAfter, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

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

const Dashboard = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ month: string; count: number }[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [projectsRes, clientsRes, stagesRes] = await Promise.all([
        supabase.from("projects").select("*, clients(name)").eq("user_id", user.id),
        supabase.from("clients").select("id").eq("user_id", user.id),
        supabase.from("project_stages").select("*").eq("user_id", user.id),
      ]);

      const p = projectsRes.data || [];
      setProjects(p);
      setClients(clientsRes.data || []);
      setStages(stagesRes.data || []);

      // Monthly chart
      const monthlyCounts: Record<string, number> = {};
      p.forEach((proj) => {
        const month = format(new Date(proj.created_at), "MMM/yy", { locale: ptBR });
        monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
      });
      setMonthlyData(Object.entries(monthlyCounts).slice(-6).map(([month, count]) => ({ month, count })));
    };
    fetchData();
  }, [user]);

  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === "em_andamento").length;
  const completedProjects = projects.filter((p) => p.status === "concluido").length;
  const totalClients = clients.length;
  const totalValue = projects.reduce((sum, p) => sum + (Number(p.value) || 0), 0);
  const completionRate = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0;

  const now = new Date();
  const next7Days = addDays(now, 7);
  const upcomingDeadlines = projects.filter(
    (p) => p.deadline && p.status === "em_andamento" && isAfter(new Date(p.deadline), now) && !isAfter(new Date(p.deadline), next7Days)
  );

  const recentProjects = [...projects]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const getProjectProgress = (projectId: string) => {
    const projectStages = stages.filter((s) => s.project_id === projectId);
    if (projectStages.length === 0) return 0;
    const completed = projectStages.filter((s) => s.completed).length;
    return Math.round((completed / projectStages.length) * 100);
  };

  const formatCurrency = (value: number) => 
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Visão geral dos seus projetos e métricas</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/calculator">
              <Calculator className="h-4 w-4 mr-2" />
              Calculadora
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/projects/new">
              <Plus className="h-4 w-4 mr-2" />
              Novo Projeto
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Projects */}
        <Card className="shadow-card hover:shadow-card-hover transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total de Projetos</p>
                <p className="text-2xl font-semibold">{totalProjects}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <FolderKanban className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Projects */}
        <Card className="shadow-card hover:shadow-card-hover transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Em Andamento</p>
                <p className="text-2xl font-semibold">{activeProjects}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-warning/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Clients */}
        <Card className="shadow-card hover:shadow-card-hover transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Clientes</p>
                <p className="text-2xl font-semibold">{totalClients}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-info/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-info" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Value */}
        <Card className="shadow-card hover:shadow-card-hover transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-semibold">{formatCurrency(totalValue)}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Completion Rate & Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Completion Rate */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              Taxa de Conclusão
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Progress value={completionRate} className="h-2" />
              </div>
              <span className="text-2xl font-semibold text-success">{completionRate}%</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {completedProjects} de {totalProjects} projetos concluídos
            </p>
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-warning" />
              Próximos Prazos (7 dias)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {upcomingDeadlines.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum prazo próximo</p>
              ) : (
                upcomingDeadlines.slice(0, 3).map((project) => (
                  <Link 
                    key={project.id} 
                    to={`/projects/${project.id}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">{project.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {project.clients?.name || "Sem cliente"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {format(new Date(project.deadline), "dd/MM/yyyy")}
                      </p>
                      <p className="text-xs text-warning">Prazo próximo</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts & Recent Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Chart */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Projetos por Mês
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: "hsl(220 10% 46%)", fontSize: 12 }}
                    axisLine={{ stroke: "hsl(220 13% 91%)" }}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "white", 
                      border: "1px solid hsl(220 13% 91%)", 
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="hsl(214 90% 52%)" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(214 90% 52%)", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Projects */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-primary" />
                Projetos Recentes
              </CardTitle>
              <Link 
                to="/projects" 
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                Ver todos <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {recentProjects.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum projeto encontrado
                </p>
              ) : (
                recentProjects.map((project) => (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{project.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {project.clients?.name || "Sem cliente"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full border ${STATUS_COLORS[project.status]}`}>
                        {STATUS_LABELS[project.status]}
                      </span>
                      <div className="w-16">
                        <Progress value={getProjectProgress(project.id)} className="h-1.5" />
                      </div>
                      <span className="text-xs text-muted-foreground w-8 text-right">
                        {getProjectProgress(project.id)}%
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
