import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderKanban, Users, Clock, TrendingUp, Plus, Calculator } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { format } from "date-fns";
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
  const [stats, setStats] = useState({ totalProjects: 0, activeProjects: 0, totalClients: 0, upcomingDeadlines: 0 });
  const [statusData, setStatusData] = useState<{ name: string; value: number }[]>([]);
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ month: string; count: number }[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [projectsRes, clientsRes] = await Promise.all([
        supabase.from("projects").select("*, clients(name)").eq("user_id", user.id),
        supabase.from("clients").select("id").eq("user_id", user.id),
      ]);

      const projects = projectsRes.data || [];
      const clients = clientsRes.data || [];

      const now = new Date();
      const upcoming = projects.filter(
        (p) => p.deadline && new Date(p.deadline) > now && p.status === "em_andamento"
      ).length;

      setStats({
        totalProjects: projects.length,
        activeProjects: projects.filter((p) => p.status === "em_andamento").length,
        totalClients: clients.length,
        upcomingDeadlines: upcoming,
      });

      // Status chart
      const statusCounts: Record<string, number> = {};
      projects.forEach((p) => {
        statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
      });
      setStatusData(
        Object.entries(statusCounts).map(([key, value]) => ({
          name: STATUS_LABELS[key] || key,
          value,
        }))
      );

      // Monthly chart
      const monthlyCounts: Record<string, number> = {};
      projects.forEach((p) => {
        const month = format(new Date(p.created_at), "MMM/yy", { locale: ptBR });
        monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
      });
      setMonthlyData(
        Object.entries(monthlyCounts)
          .slice(-6)
          .map(([month, count]) => ({ month, count }))
      );

      // Recent projects
      setRecentProjects(
        projects
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5)
      );
    };
    fetchData();
  }, [user]);

  const summaryCards = [
    { title: "Total Projetos", value: stats.totalProjects, icon: FolderKanban, color: "bg-chart-blue" },
    { title: "Projetos Ativos", value: stats.activeProjects, icon: TrendingUp, color: "bg-chart-green" },
    { title: "Total Clientes", value: stats.totalClients, icon: Users, color: "bg-chart-orange" },
    { title: "Próximos Prazos", value: stats.upcomingDeadlines, icon: Clock, color: "bg-chart-red" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          <Button asChild size="sm">
            <Link to="/projects/new"><Plus className="h-4 w-4 mr-1" />Novo Projeto</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/clients/new"><Plus className="h-4 w-4 mr-1" />Novo Cliente</Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link to="/calculator"><Calculator className="h-4 w-4 mr-1" />Calculadora</Link>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.title} className="border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`${card.color} p-3 rounded-lg`}>
                <card.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className="text-2xl font-bold">{card.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border">
          <CardHeader><CardTitle className="text-base">Projetos por Status</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <XAxis dataKey="name" tick={{ fill: "hsl(215, 20%, 60%)", fontSize: 12 }} />
                <YAxis tick={{ fill: "hsl(215, 20%, 60%)", fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(216, 40%, 15%)", border: "1px solid hsl(215, 25%, 22%)", borderRadius: "8px" }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader><CardTitle className="text-base">Evolução Mensal</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <XAxis dataKey="month" tick={{ fill: "hsl(215, 20%, 60%)", fontSize: 12 }} />
                <YAxis tick={{ fill: "hsl(215, 20%, 60%)", fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(216, 40%, 15%)", border: "1px solid hsl(215, 25%, 22%)", borderRadius: "8px" }} />
                <Line type="monotone" dataKey="count" stroke="hsl(217, 91%, 60%)" strokeWidth={2} dot={{ fill: "hsl(217, 91%, 60%)" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Distribution + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border">
          <CardHeader><CardTitle className="text-base">Distribuição por Status</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "hsl(216, 40%, 15%)", border: "1px solid hsl(215, 25%, 22%)", borderRadius: "8px" }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border">
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
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.clients?.name || "Sem cliente"}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
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
