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
  "hsl(214 90% 52%)",
  "hsl(142 71% 45%)",
  "hsl(38 92% 50%)",
  "hsl(0 84% 60%)",
  "hsl(262 83% 58%)",
  "hsl(173 80% 45%)",
];

const STATUS_LABELS: Record<string, string> = {
  em_andamento: "Em Andamento",
  concluido: "Concluído",
  pausado: "Pausado",
  cancelado: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  em_andamento: "bg-warning/10 text-warning",
  concluido: "bg-success/10 text-success",
  pausado: "bg-muted text-muted-foreground",
  cancelado: "bg-destructive/10 text-destructive",
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
      change: "+12% este mês"
    },
    { 
      title: "Em Andamento", 
      value: formatCurrency(totalActive), 
      icon: TrendingUp, 
      color: "warning",
      change: "8 projetos ativos"
    },
    { 
      title: "Valor Médio / Projeto", 
      value: formatCurrency(avgValue), 
      icon: BarChart3, 
      color: "info",
      change: "Baseado em todos os projetos"
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Faturamento</h1>
        <p className="text-muted-foreground mt-1">Acompanhe seu desempenho financeiro</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.title} className="shadow-card hover:shadow-card-hover transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  <p className="text-2xl font-semibold">{card.value}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3" />
                    {card.change}
                  </p>
                </div>
                <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                  card.color === "success" ? "bg-success/10" :
                  card.color === "warning" ? "bg-warning/10" : "bg-info/10"
                }`}>
                  <card.icon className={`h-6 w-6 ${
                    card.color === "success" ? "text-success" :
                    card.color === "warning" ? "text-warning" : "text-info"
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
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Faturamento Mensal
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
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
                    tickFormatter={(v) => `R$${v}`}
                  />
                  <Tooltip
                    formatter={(v: number) => formatCurrency(v)}
                    contentStyle={{ 
                      backgroundColor: "white", 
                      border: "1px solid hsl(220 13% 91%)", 
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
                    }}
                  />
                  <Bar dataKey="valor" radius={[4, 4, 0, 0]} fill="hsl(214 90% 52%)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Client Distribution */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-primary" />
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
                    formatter={(v: number) => formatCurrency(v)}
                    contentStyle={{ 
                      backgroundColor: "white", 
                      border: "1px solid hsl(220 13% 91%)", 
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects Table */}
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Projetos com Valores</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-medium">Projeto</TableHead>
                  <TableHead className="font-medium">Cliente</TableHead>
                  <TableHead className="font-medium">Status</TableHead>
                  <TableHead className="font-medium text-right">Valor</TableHead>
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
                    <TableRow key={p.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.clients?.name || "—"}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2.5 py-1 rounded-full ${STATUS_COLORS[p.status]}`}>
                          {STATUS_LABELS[p.status] || p.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
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
