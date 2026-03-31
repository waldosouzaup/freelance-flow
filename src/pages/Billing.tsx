import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, TrendingUp, BarChart3, PieChart as PieIcon } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(142, 71%, 45%)",
  "hsl(45, 93%, 58%)",
  "hsl(0, 84%, 60%)",
  "hsl(25, 95%, 53%)",
];

const STATUS_LABELS: Record<string, string> = {
  em_andamento: "Em Andamento",
  concluido: "Concluído",
  pausado: "Pausado",
  cancelado: "Cancelado",
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
    { title: "Faturado (Concluídos)", value: formatCurrency(totalBilled), icon: DollarSign, gradient: "from-emerald-500/20 to-emerald-600/5" },
    { title: "Em Andamento", value: formatCurrency(totalActive), icon: TrendingUp, gradient: "from-blue-500/20 to-blue-600/5" },
    { title: "Valor Médio / Projeto", value: formatCurrency(avgValue), icon: BarChart3, gradient: "from-amber-500/20 to-amber-600/5" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Faturamento</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.title} className="border-border bg-gradient-to-br overflow-hidden">
            <CardContent className={`p-5 flex items-center gap-4 bg-gradient-to-br ${card.gradient}`}>
              <div className="p-3 rounded-xl bg-background/50">
                <card.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{card.title}</p>
                <p className="text-xl font-bold">{card.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" />Faturamento Mensal</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <XAxis dataKey="month" tick={{ fill: "hsl(215, 20%, 60%)", fontSize: 12 }} />
                <YAxis tick={{ fill: "hsl(215, 20%, 60%)", fontSize: 12 }} />
                <Tooltip
                  formatter={(v: number) => formatCurrency(v)}
                  contentStyle={{ backgroundColor: "hsl(216, 40%, 15%)", border: "1px solid hsl(215, 25%, 22%)", borderRadius: "8px" }}
                />
                <Bar dataKey="valor" radius={[6, 6, 0, 0]} fill="hsl(217, 91%, 60%)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><PieIcon className="h-4 w-4" />Valor por Cliente</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={clientData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name }) => name}>
                  {clientData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => formatCurrency(v)}
                  contentStyle={{ backgroundColor: "hsl(216, 40%, 15%)", border: "1px solid hsl(215, 25%, 22%)", borderRadius: "8px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader><CardTitle className="text-base">Projetos com Valores</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Projeto</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum projeto encontrado</TableCell>
                </TableRow>
              ) : (
                projects.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.clients?.name || "—"}</TableCell>
                    <TableCell>
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                        {STATUS_LABELS[p.status] || p.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(p.value) || 0)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Billing;
