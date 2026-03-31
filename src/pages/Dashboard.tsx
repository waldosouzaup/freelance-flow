import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FolderKanban, Users, Clock, TrendingUp, Plus, Calculator, DollarSign, CheckCircle2, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { format, isAfter, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(142, 71%, 45%)",
  "hsl(45, 93%, 58%)",
  "hsl(0, 84%, 60%)",
];

const STATUS_LABELS: Record<string, string> = {
  em_andamento: "Em Andamento",
  concluido: "Concluído",
  pausado: "Pausado",
  cancelado: "Cancelado",
};

const Dashboard = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<{ name: string; value: number }[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ month: string; count: number }[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [projectsRes, clientsRes, profileRes, stagesRes] = await Promise.all([
        supabase.from("projects").select("*, clients(name)").eq("user_id", user.id),
        supabase.from("clients").select("id").eq("user_id", user.id),
        supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("project_stages").select("*").eq("user_id", user.id),
      ]);

      const p = projectsRes.data || [];
      setProjects(p);
      setClients(clientsRes.data || []);
      setProfile(profileRes.data);
      setStages(stagesRes.data || []);

      // Status chart
      const statusCounts: Record<string, number> = {};
      p.forEach((proj) => { statusCounts[proj.status] = (statusCounts[proj.status] || 0) + 1; });
      setStatusData(Object.entries(statusCounts).map(([key, value]) => ({ name: STATUS_LABELS[key] || key, value })));

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
  ).length;

  const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const recentProjects = [...projects]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const getProjectProgress = (projectId: string) => {
    const projectStages = stages.filter((s) => s.project_id === projectId);
    if (projectStages.length === 0) return 0;
    const completed = projectStages.filter((s) => s.completed).length;
    return Math.round((completed / projectStages.length) * 100);
  };

  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Freelancer";

  const metricCards = [
    { title: "Total Projetos", value: totalProjects, icon: FolderKanban, gradient: "from-blue-500/20 to-blue-600/5", iconColor: "text-blue-400" },
    { title: "Projetos Ativos", value: activeProjects, icon: TrendingUp, gradient: "from-emerald-500/20 to-emerald-600/5", iconColor: "text-emerald-400" },
    { title: "Total Clientes", value: totalClients, icon: Users, gradient: "from-orange-500/20 to-orange-600/5", iconColor: "text-orange-400" },
    { title: "Valor Total", value: formatCurrency(totalValue), icon: DollarSign, gradient: "from-violet-500/20 to-violet-600/5", iconColor: "text-violet-400" },
    { title: "Taxa Conclusão", value: `${completionRate}%`, icon: CheckCircle2, gradient: "from-teal-500/20 to-teal-600/5", iconColor: "text-teal-400", isProgress: true },
    { title: "Prazos (7 dias)", value: upcomingDeadlines, icon: AlertTriangle, gradient: "from-red-500/20 to-red-600/5", iconColor: "text-red-400" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome + Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Bem-vindo, {displayName} 👋</h1>
          <p className="text-sm text-muted-foreground">Aqui está o resumo dos seus projetos</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/projects/new" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" />Novo Projeto
          </Link>
          <Link to="/clients/new" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-accent transition-colors">
            <Plus className="h-4 w-4" />Novo Cliente
          </Link>
          <Link to="/calculator" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-colors">
            <Calculator className="h-4 w-4" />Calculadora
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {metricCards.map((card) => (
          <Card key={card.title} className="border-border overflow-hidden hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-0.5">
            <CardContent className={`p-4 bg-gradient-to-br ${card.gradient}`}>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-background/60">
                  <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-1">{card.title}</p>
              <p className="text-xl font-bold">{card.value}</p>
              {card.isProgress && (
                <Progress value={completionRate} className="mt-2 h-1.5" />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
          <CardHeader><CardTitle className="text-base">Projetos por Status</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <XAxis dataKey="name" tick={{ fill: "hsl(215, 20%, 60%)", fontSize: 12 }} />
                <YAxis tick={{ fill: "hsl(215, 20%, 60%)", fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(216, 40%, 15%)", border: "1px solid hsl(215, 25%, 22%)", borderRadius: "8px", color: "hsl(215, 20%, 80%)" }} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
          <CardHeader><CardTitle className="text-base">Evolução Mensal</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <XAxis dataKey="month" tick={{ fill: "hsl(215, 20%, 60%)", fontSize: 12 }} />
                <YAxis tick={{ fill: "hsl(215, 20%, 60%)", fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(216, 40%, 15%)", border: "1px solid hsl(215, 25%, 22%)", borderRadius: "8px", color: "hsl(215, 20%, 80%)" }} />
                <Line type="monotone" dataKey="count" stroke="hsl(217, 91%, 60%)" strokeWidth={2.5} dot={{ fill: "hsl(217, 91%, 60%)", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
          <CardHeader><CardTitle className="text-base">Distribuição por Status</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} label>
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "hsl(216, 40%, 15%)", border: "1px solid hsl(215, 25%, 22%)", borderRadius: "8px", color: "hsl(215, 20%, 80%)" }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
          <CardHeader><CardTitle className="text-base">Projetos Recentes</CardTitle></CardHeader>
          <CardContent>
            {recentProjects.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum projeto ainda.</p>
            ) : (
              <div className="space-y-3">
                {recentProjects.map((p) => (
                  <Link
                    key={p.id}
                    to={`/projects/${p.id}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-all duration-200 group"
                  >
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="font-medium text-sm group-hover:text-primary transition-colors truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.clients?.name || "Sem cliente"}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Progress value={getProjectProgress(p.id)} className="h-1 flex-1" />
                        <span className="text-[10px] text-muted-foreground">{getProjectProgress(p.id)}%</span>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary whitespace-nowrap">
                      {STATUS_LABELS[p.status] || p.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
