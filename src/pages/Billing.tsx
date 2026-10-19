import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  TrendingUp,
  BarChart3,
  PieChart as PieIcon,
  ArrowUpRight,
  FileSpreadsheet,
  Receipt,
  LayoutDashboard,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ExpensesTab } from "@/components/billing/ExpensesTab";
import { DRETab } from "@/components/billing/DRETab";
import type { OperationalExpense } from "@/types/expenses";

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

interface ProjectWithClient {
  id: string;
  name: string;
  status: "em_andamento" | "concluido" | "pausado" | "cancelado";
  value: number | null;
  actual_costs: number | null;
  created_at: string;
  updated_at?: string;
  clients?: { name: string } | null;
}

interface MovementRecord {
  id: string;
  movement_type: string;
  quantity: number;
  unit_cost: number;
  created_at: string;
}

export default function Billing() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectWithClient[]>([]);
  const [movements, setMovements] = useState<MovementRecord[]>([]);
  const [expenses, setExpenses] = useState<OperationalExpense[]>([]);
  const [taxRate, setTaxRate] = useState<number>(6);

  const [monthlyData, setMonthlyData] = useState<{ month: string; valor: number }[]>([]);
  const [clientData, setClientData] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Projects
      const { data: projData } = await supabase
        .from("projects")
        .select("*, clients(name)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const p = projData || [];
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

      // 2. Inventory movements (para CMV de peças)
      const { data: movData } = await supabase
        .from("inventory_movements")
        .select("*")
        .eq("user_id", user.id);
      setMovements(movData || []);

      // 3. Operational expenses
      const { data: expData } = await supabase
        .from("operational_expenses")
        .select("*")
        .eq("user_id", user.id)
        .order("expense_date", { ascending: false });
      setExpenses((expData as OperationalExpense[]) || []);

      // 4. Parâmetros de precificação (alíquota tributária)
      const { data: paramsData } = await supabase
        .from("pricing_parameters")
        .select("default_margin")
        .eq("user_id", user.id)
        .maybeSingle();

      if (paramsData && paramsData.default_margin) {
        // Usa margem ou fallback 6%
        setTaxRate(6);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    <div className="space-y-6 pb-8" aria-label="Relatório Financeiro & DRE">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Faturamento, DRE & Contabilidade
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Governança financeira completa: fluxo de caixa, DRE automatizado e controle de despesas operacionais.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted/60 p-1 border border-border">
          <TabsTrigger value="overview" className="gap-2 text-xs">
            <LayoutDashboard className="h-3.5 w-3.5" /> Visão Geral
          </TabsTrigger>
          <TabsTrigger value="dre" className="gap-2 text-xs">
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" /> DRE & Relatório Contábil
          </TabsTrigger>
          <TabsTrigger value="expenses" className="gap-2 text-xs">
            <Receipt className="h-3.5 w-3.5 text-amber-500" /> Despesas Operacionais (OPEX)
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Visão Geral */}
        <TabsContent value="overview" className="space-y-6 m-0">
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
                        axisLine={{ stroke: "hsl(var(--border))" }}
                      />
                      <YAxis 
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                        axisLine={{ stroke: "hsl(var(--border))" }}
                        tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        }}
                        formatter={(value: number) => [formatCurrency(value), "Faturado"]}
                      />
                      <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Client Share Chart */}
            <Card className="shadow-card border-border/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <PieIcon className="h-4 w-4 text-primary" />
                  Distribuição por Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-72">
                  {clientData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                      Nenhum projeto cadastrado ainda
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={clientData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={95}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {clientData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          }}
                          formatter={(value: number) => [formatCurrency(value), "Total"]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Projects Table */}
          <Card className="shadow-card border-border/80">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-base font-semibold">Projetos & Receitas</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead>Projeto</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhum projeto registrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    projects.map((project) => (
                      <TableRow key={project.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium text-foreground text-xs">{project.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{project.clients?.name || "Sem cliente"}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                              STATUS_COLORS[project.status] || "bg-muted text-muted-foreground"
                            }`}
                          >
                            {STATUS_LABELS[project.status] || project.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(project.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right font-mono-numbers font-medium text-xs">
                          {formatCurrency(Number(project.value) || 0)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: DRE Contábil */}
        <TabsContent value="dre" className="m-0">
          <DRETab
            projects={projects}
            movements={movements}
            expenses={expenses}
            taxRate={taxRate}
          />
        </TabsContent>

        {/* Tab 3: Despesas Operacionais (OPEX) */}
        <TabsContent value="expenses" className="m-0">
          <ExpensesTab expenses={expenses} onRefresh={fetchData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
