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
  Plus,
  Calculator,
  CheckCircle2,
  Clock,
  ArrowRight,
  DollarSign,
  Calendar,
  BarChart3,
  TrendingUp,
  PieChart as PieChartIcon,
  Activity,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
} from "recharts";
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

const PIE_COLORS = [
  "hsl(142 71% 45%)", // success - concluido
  "hsl(38 92% 50%)",  // warning - em_andamento
  "hsl(220 13% 69%)", // muted  - pausado
  "hsl(0 84% 60%)",   // danger - cancelado
];

const CHART_COLORS = {
  primary: "hsl(214 90% 52%)",
  success: "hsl(142 71% 45%)",
  warning: "hsl(38 92% 50%)",
  info: "hsl(199 89% 48%)",
};

const Dashboard = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [monthlyProjectData, setMonthlyProjectData] = useState<{ month: string; count: number; valor: number }[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<{ name: string; value: number; color: string }[]>([]);
  const [clientRevenueData, setClientRevenueData] = useState<{ name: string; value: number }[]>([]);

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

      // Monthly combined data (projects count + revenue)
      const monthlyMap: Record<string, { count: number; valor: number }> = {};
      p.forEach((proj) => {
        const month = format(new Date(proj.created_at), "MMM/yy", { locale: ptBR });
        if (!monthlyMap[month]) monthlyMap[month] = { count: 0, valor: 0 };
        monthlyMap[month].count += 1;
        monthlyMap[month].valor += Number(proj.value) || 0;
      });
      setMonthlyProjectData(
        Object.entries(monthlyMap)
          .slice(-6)
          .map(([month, d]) => ({ month, ...d }))
      );

      // Status distribution
      const statusMap: Record<string, number> = {};
      p.forEach((proj) => {
        statusMap[proj.status] = (statusMap[proj.status] || 0) + 1;
      });
      const statusOrder = ["concluido", "em_andamento", "pausado", "cancelado"];
      setStatusDistribution(
        statusOrder
          .filter((s) => statusMap[s])
          .map((s, i) => ({
            name: STATUS_LABELS[s],
            value: statusMap[s],
            color: PIE_COLORS[i % PIE_COLORS.length],
          }))
      );

      // Revenue by client (top 5)
      const clientMap: Record<string, number> = {};
      p.forEach((proj) => {
        const name = proj.clients?.name || "Sem cliente";
        clientMap[name] = (clientMap[name] || 0) + (Number(proj.value) || 0);
      });
      setClientRevenueData(
        Object.entries(clientMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, value]) => ({ name, value }))
      );
    };
    fetchData();
  }, [user]);

  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === "em_andamento").length;
  const completedProjects = projects.filter((p) => p.status === "concluido").length;
  const totalClients = clients.length;
  const totalValue = projects.reduce((sum, p) => sum + (Number(p.value) || 0), 0);
  const billedValue = projects
    .filter((p) => p.status === "concluido")
    .reduce((sum, p) => sum + (Number(p.value) || 0), 0);
  const pendingValue = projects
    .filter((p) => p.status === "em_andamento")
    .reduce((sum, p) => sum + (Number(p.value) || 0), 0);
  const completionRate = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0;
  const avgProjectValue = totalProjects > 0 ? totalValue / totalProjects : 0;

  const radialData = [{ name: "Conclusão", value: completionRate, fill: CHART_COLORS.success }];

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

  const tooltipStyle = {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
    color: "hsl(var(--foreground))",
  };

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

      {/* Stats Cards — Top Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-card hover:shadow-card-hover transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total de Projetos</p>
                <p className="text-3xl font-bold">{totalProjects}</p>
                <p className="text-xs text-muted-foreground">{activeProjects} ativos agora</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <FolderKanban className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-card-hover transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Faturado</p>
                <p className="text-3xl font-bold">{formatCurrency(billedValue)}</p>
                <p className="text-xs text-success flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {completedProjects} projetos concluídos
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-card-hover transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Em Andamento</p>
                <p className="text-3xl font-bold">{formatCurrency(pendingValue)}</p>
                <p className="text-xs text-warning flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {activeProjects} projetos ativos
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-warning/10 flex items-center justify-center">
                <Activity className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-card-hover transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Clientes</p>
                <p className="text-3xl font-bold">{totalClients}</p>
                <p className="text-xs text-muted-foreground">
                  Ticket médio: {formatCurrency(avgProjectValue)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-info/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-info" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Revenue Chart + Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Area Chart — 2 cols */}
        <Card className="shadow-card lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Faturamento Mensal
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyProjectData}>
                  <defs>
                    <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "hsl(220 10% 46%)", fontSize: 12 }}
                    axisLine={{ stroke: "hsl(220 13% 91%)" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "hsl(220 10% 46%)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                    width={55}
                  />
                  <Tooltip
                    formatter={(v: number) => formatCurrency(v)}
                    labelStyle={{ fontWeight: 600 }}
                    contentStyle={tooltipStyle}
                  />
                  <Area
                    type="monotone"
                    dataKey="valor"
                    stroke={CHART_COLORS.primary}
                    strokeWidth={2.5}
                    fill="url(#colorValor)"
                    dot={{ fill: CHART_COLORS.primary, r: 4, strokeWidth: 2, stroke: "white" }}
                    activeDot={{ r: 6, strokeWidth: 2, stroke: "white" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Pie + Radial */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-primary" />
              Status dos Projetos
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {statusDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              {statusDistribution.map((s) => (
                <div key={s.name} className="flex items-center gap-2 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-muted-foreground truncate">{s.name}</span>
                  <span className="font-semibold ml-auto">{s.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Projects per Month Bar + Revenue by Client Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Projects per Month — Bar Chart */}
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
                <BarChart data={monthlyProjectData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "hsl(220 10% 46%)", fontSize: 12 }}
                    axisLine={{ stroke: "hsl(220 13% 91%)" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "hsl(220 10% 46%)", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar
                    dataKey="count"
                    name="Projetos"
                    radius={[6, 6, 0, 0]}
                    fill={CHART_COLORS.info}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue by Client — Horizontal Bar */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Faturamento por Cliente (Top 5)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-64">
              {clientRevenueData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  Nenhum dado de faturamento por cliente
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clientRevenueData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: "hsl(220 10% 46%)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fill: "hsl(220 10% 46%)", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      width={100}
                    />
                    <Tooltip
                      formatter={(v: number) => formatCurrency(v)}
                      contentStyle={tooltipStyle}
                    />
                    <Bar
                      dataKey="value"
                      name="Faturamento"
                      radius={[0, 6, 6, 0]}
                      fill={CHART_COLORS.success}
                      maxBarSize={24}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Completion Radial + Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Completion Rate — Radial */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              Taxa de Conclusão
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex items-center gap-6">
              <div className="h-36 w-36 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    cx="50%"
                    cy="50%"
                    innerRadius="70%"
                    outerRadius="100%"
                    barSize={12}
                    data={radialData}
                    startAngle={90}
                    endAngle={-270}
                  >
                    <RadialBar
                      dataKey="value"
                      cornerRadius={10}
                      background={{ fill: "hsl(220 13% 91%)" }}
                    />
                    <text
                      x="50%"
                      y="50%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-foreground"
                      style={{ fontSize: "24px", fontWeight: 700 }}
                    >
                      {completionRate}%
                    </text>
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Concluídos</p>
                  <p className="text-xl font-bold text-success">{completedProjects}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Em Andamento</p>
                  <p className="text-xl font-bold text-warning">{activeProjects}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-xl font-bold">{totalProjects}</p>
                </div>
              </div>
            </div>
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
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Calendar className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum prazo próximo</p>
                  <p className="text-xs text-muted-foreground mt-1">Você está em dia!</p>
                </div>
              ) : (
                upcomingDeadlines.slice(0, 4).map((project) => (
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

      {/* Row 5: Recent Projects — Full Width */}
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
                  <div className="flex items-center gap-4 ml-4">
                    <span className="text-sm font-medium text-muted-foreground">
                      {formatCurrency(Number(project.value) || 0)}
                    </span>
                    <span className={`text-xs px-2.5 py-1 rounded-full border ${STATUS_COLORS[project.status]}`}>
                      {STATUS_LABELS[project.status]}
                    </span>
                    <div className="w-20 hidden sm:block">
                      <Progress value={getProjectProgress(project.id)} className="h-1.5" />
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right hidden sm:block">
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
  );
};

export default Dashboard;
