import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, TrendingUp, BarChart3, PieChart as PieIcon, ArrowUpRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = [
  "hsl(152 76% 40%)", // Emerald
  "hsl(189 94% 43%)", // Cyan
  "hsl(214 90% 52%)", // Royal Blue
  "hsl(38 92% 50%)",  // Amber
  "hsl(173 80% 40%)", // Teal
  "hsl(215 16% 47%)", // Slate
];

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

const Billing = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ month: string; valor: number }[]>([]);
  const [clientData, setClientData] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("projects")
        .select("*, clients(name)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      const p = data || [];
      setProjects(p);

      // Monthly billing
      const monthly: Record<string, number> = {};
      p.forEach((proj) => {
        const month = format(new Date(proj.created_at), "MMM/yy", { locale: ptBR });
        monthly[month] = (monthly[month] || 0) + (Number(proj.value) || 0);
      });
      setMonthlyData(Object.entries(monthly).slice(-6).map(([month, valor]) => ({ month, valor })));

      // By client
      const byClient: Record<string, number> = {};
      p.forEach((proj) => {
        const name = proj.clients?.name || "Sem cliente";
        byClient[name] = (byClient[name] || 0) + (Number(proj.value) || 0);
      });
      setClientData(Object.entries(byClient).map(([name, value]) => ({ name, value })));
    };
    fetch();
  }, [user]);

  const totalBilled = projects
    .filter((p) => p.status === "concluido")
    .reduce((sum, p) => sum + (Number(p.value) || 0), 0);
  const totalActive = projects
    .filter((p) => p.status === "em_andamento")
    .reduce((sum, p) => sum + (Number(p.value) || 0), 0);
  const avgValue = projects.length > 0
    ? projects.reduce((sum, p) => sum + (Number(p.value) || 0), 0) / projects.length
    : 0;

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const summaryCards = [
    { 
      title: "Faturado (Concluídos)", 
      value: formatCurrency(totalBilled), 
      icon: DollarSign, 
      color: "success",
      change: "Receita liquidada",
      badge: "Liquidado",
      isHero: true,
    },
    { 
      title: "Em Andamento", 
      value: formatCurrency(totalActive), 
      icon: TrendingUp, 
      color: "warning",
      change: `${projects.filter(p => p.status === "em_andamento").length} projetos ativos`,
      badge: "A receber",
      isHero: false,
    },
    { 
      title: "Ticket Médio / Projeto", 
      value: formatCurrency(avgValue), 
      icon: BarChart3, 
      color: "info",
      change: `${projects.length} projetos no total`,
      badge: "Média",
      isHero: false,
    },
  ];

  return (
    <div className="space-y-6 pb-8" aria-label="Relatório Financeiro">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Relatório Financeiro & Faturamento</h1>
          <p className="text-sm text-muted-foreground mt-1">Acompanhe seu desempenho financeiro, ticket médio e distribuição</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {summaryCards.map((card) => (
          <Card 
            key={card.title} 
            className={`shadow-card hover:shadow-card-hover transition-all duration-200 border-border/80 ${
              card.isHero ? "bg-gradient-to-b from-card to-primary/[0.03] border-primary/20" : ""
            }`}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{card.title}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted font-medium text-muted-foreground">
                      {card.badge}
                    </span>
                  </div>
                  <p className="text-2xl font-bold tracking-tight font-mono-numbers">{card.value}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3 text-primary" />
                    {card.change}
                  </p>
                </div>
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${
                  card.color === "success" ? "bg-emerald-500/10 border border-emerald-500/20" :
                  card.color === "warning" ? "bg-amber-500/10 border border-amber-500/20" : 
                  "bg-cyan-500/10 border border-cyan-500/20"
                }`}>
                  <card.icon className={`h-6 w-6 ${
                    card.color === "success" ? "text-emerald-500" :
                    card.color === "warning" ? "text-amber-500" : "text-cyan-500"
                  }`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Chart */}
        <Card className="shadow-card border-border/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Faturamento Mensal Realizado
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.6)" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    axisLine={{ stroke: "hsl(var(--border) / 0.6)" }}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `R$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`}
                  />
                  <Tooltip
                    formatter={(v: number) => [formatCurrency(v), "Faturado"]}
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))", 
                      borderRadius: "10px",
                      boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                      color: "hsl(var(--foreground))"
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                  />
                  <Bar dataKey="valor" radius={[6, 6, 0, 0]} fill="hsl(152 76% 40%)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Client Distribution */}
        <Card className="shadow-card border-border/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-cyan-500" />
              Distribuição por Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={clientData} 
                    dataKey="value" 
                    nameKey="name" 
                    cx="50%" 
                    cy="50%" 
                    outerRadius={100}
                    innerRadius={60}
                    paddingAngle={2}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {clientData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => [formatCurrency(v), "Total"]}
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))", 
                      borderRadius: "10px",
                      boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                      color: "hsl(var(--foreground))"
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects Table */}
      <Card className="shadow-card border-border/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Detalhamento Financeiro por Projeto</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="rounded-lg border border-border/80 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Projeto</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Cliente</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Status</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Nenhum projeto encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  projects.map((p) => (
                    <TableRow key={p.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="font-medium text-foreground">{p.name}</TableCell>
                      <TableCell className="text-muted-foreground">{p.clients?.name || "—"}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${STATUS_COLORS[p.status] || "bg-muted text-muted-foreground"}`}>
                          {STATUS_LABELS[p.status] || p.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold font-mono-numbers text-foreground">
                        {formatCurrency(Number(p.value) || 0)}
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

export default Billing;
