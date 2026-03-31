import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Progress } from "@/components/ui/progress";
import { FolderKanban, Users, TrendingUp, Plus, Calculator, CheckCircle2, AlertTriangle, ArrowUpRight } from "lucide-react";
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format, isAfter, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_LABELS: Record<string, string> = {
  em_andamento: "Em Andamento",
  concluido: "Concluído",
  pausado: "Pausado",
  cancelado: "Cancelado",
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
  ).length;

  const recentProjects = [...projects]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const getProjectProgress = (projectId: string) => {
    const projectStages = stages.filter((s) => s.project_id === projectId);
    if (projectStages.length === 0) return 0;
    const completed = projectStages.filter((s) => s.completed).length;
    return Math.round((completed / projectStages.length) * 100);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      {/* Primary Showcase (Hero Metrico) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
        <div className="lg:col-span-8 flex flex-col justify-end space-y-6">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Visão Estratégica
            </p>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase">Painel Central</h1>
          </div>
          
          <div className="pt-6 border-t border-border/60">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">
              Volume Total Projetado (All Time)
            </p>
            <div className="flex items-start gap-2">
              <span className="text-2xl text-muted-foreground font-medium mt-1 md:mt-2">R$</span>
              <span className="text-6xl md:text-8xl font-black tracking-tighter text-emerald-600 dark:text-emerald-500">
                {totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col lg:items-end justify-end space-y-4">
          <div className="w-full h-px bg-border/60 block lg:hidden my-2" />
          <div className="flex gap-3 flex-col sm:flex-row w-full lg:w-auto">
            <Link 
              to="/projects/new" 
              className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-none bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900 font-bold uppercase tracking-wider text-xs hover:scale-[1.02] shadow-xl hover:shadow-2xl transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" /> Novo Projeto
            </Link>
            <Link 
              to="/calculator" 
              className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-none border border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50 font-bold uppercase tracking-wider text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors active:scale-95"
            >
              <Calculator className="h-4 w-4" /> Precificar
            </Link>
          </div>
        </div>
      </div>

      {/* Secondary Metrics - Sharp Technical style */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mt-4">
        <div className="border border-border bg-card p-5 hover:border-zinc-500/50 transition-colors duration-300 relative group overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/20 group-hover:bg-emerald-500 transition-colors" />
          <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase flex items-center justify-between mb-4">
            Ativos <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
          </p>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-black tracking-tighter">{activeProjects}</p>
            <p className="text-xs text-muted-foreground font-mono">/ {totalProjects} TOTAL</p>
          </div>
        </div>
        
        <div className="border border-border bg-card p-5 hover:border-zinc-500/50 transition-colors duration-300 relative group overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/20 group-hover:bg-blue-500 transition-colors" />
          <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase flex items-center justify-between mb-4">
            Clientes <Users className="w-3.5 h-3.5 text-blue-500" />
          </p>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-black tracking-tighter">{totalClients}</p>
            <p className="text-xs text-muted-foreground font-mono uppercase">Cadastros</p>
          </div>
        </div>

        <div className="border border-border bg-card p-5 hover:border-zinc-500/50 transition-colors duration-300 flex flex-col justify-between relative group overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-zinc-500/20 group-hover:bg-zinc-500 transition-colors" />
          <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase flex items-center justify-between mb-4">
            Conclusão Global <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </p>
          <div className="space-y-3 mt-auto">
            <p className="text-4xl font-black tracking-tighter">{completionRate}%</p>
            <Progress value={completionRate} className="h-1 rounded-none bg-border [&>div]:bg-zinc-900 dark:[&>div]:bg-zinc-50" />
          </div>
        </div>

        <div className="border border-border bg-card p-5 hover:border-orange-500/50 transition-colors duration-300 relative group overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-orange-500/20 group-hover:bg-orange-500 transition-colors" />
          <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase flex items-center justify-between mb-4">
            Alerta (7 dias) <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
          </p>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-black tracking-tighter text-orange-600 dark:text-orange-500">{upcomingDeadlines}</p>
            <p className="text-xs text-muted-foreground font-mono uppercase">Vencimentos</p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 lg:pt-4">
        {/* Trend Graphic */}
        <div className="border border-border p-6 space-y-4 relative overflow-hidden group bg-card">
          <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity duration-700 pointer-events-none">
            <FolderKanban className="w-48 h-48" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest">Densidade de Projetos</h3>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-mono mt-1">Evolução últimos 6 meses</p>
          </div>
          <div className="h-56 mt-6 relative z-10 w-full ml-[-20px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: "currentColor", opacity: 0.4, fontSize: 10, fontWeight: 700, fontFamily: 'monospace' }} 
                  dy={10}
                />
                <Tooltip 
                  cursor={{stroke: 'currentColor', strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.15}}
                  contentStyle={{ backgroundColor: "var(--background)", border: "1px solid var(--border)", borderRadius: "0px", fontSize: "12px", fontWeight: "bold", textTransform: "uppercase" }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="currentColor" 
                  strokeWidth={2.5} 
                  dot={{ fill: "var(--background)", r: 4, strokeWidth: 2 }} 
                  activeDot={{ r: 6, fill: "currentColor" }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity Mini-board */}
        <div className="border border-border p-6 flex flex-col bg-card">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest">Feed de Operações</h3>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-mono mt-1">Últimos {recentProjects.length} modificados</p>
            </div>
            <Link to="/projects" className="text-[10px] font-bold uppercase tracking-widest hover:underline flex items-center text-muted-foreground hover:text-foreground transition-colors">
              Explorar <ArrowUpRight className="w-3 h-3 ml-1" />
            </Link>
          </div>
          
          <div className="flex-1">
            {recentProjects.length === 0 ? (
              <div className="h-full min-h-[160px] flex items-center justify-center border border-dashed text-xs text-muted-foreground font-mono uppercase">
                Zero Registros Ativos
              </div>
            ) : (
              <div className="divide-y divide-border border-y border-border">
                  {recentProjects.map((p) => (
                    <Link
                      key={p.id}
                      to={`/projects/${p.id}`}
                      className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 hover:bg-muted/30 transition-colors group"
                    >
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="font-bold text-sm group-hover:underline truncate">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1 font-mono">CLIENTE: {p.clients?.name || "N/A"}</p>
                      </div>
                      <div className="text-left sm:text-right mt-2 sm:mt-0 flex flex-row items-center sm:block gap-4">
                        <span className={`text-[9px] px-2 py-1 font-bold tracking-widest uppercase border ${
                          p.status === 'em_andamento' ? 'border-orange-500/30 text-orange-500 bg-orange-500/5' : 
                          p.status === 'concluido' ? 'border-emerald-500/30 text-emerald-600 bg-emerald-500/5 dark:text-emerald-400' : 
                          'border-zinc-500/30 text-zinc-600 bg-zinc-500/5 dark:text-zinc-400'
                        }`}>
                          {STATUS_LABELS[p.status] || p.status}
                        </span>
                        <div className="flex items-center gap-2 mt-1.5 justify-end">
                          <span className="text-[10px] font-mono font-bold">{getProjectProgress(p.id)}%</span>
                          <div className="w-12 h-1 bg-border hidden sm:block">
                            <div className="h-full bg-foreground" style={{ width: `${getProjectProgress(p.id)}%` }} />
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
