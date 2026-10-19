import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileSpreadsheet,
  Printer,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart as PieIcon,
  HelpCircle,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { calculateDRE } from "@/lib/dreCalculator";
import type { OperationalExpense } from "@/types/expenses";

function formatCurrency(val: number): string {
  return (val || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface DREProject {
  id: string;
  name: string;
  status: string;
  value: number | null;
  actual_costs: number | null;
  created_at: string;
  updated_at?: string;
}

interface DREMovement {
  id: string;
  movement_type: string;
  quantity: number;
  unit_cost: number;
  created_at: string;
}

interface DRETabProps {
  projects: DREProject[];
  movements: DREMovement[];
  expenses: OperationalExpense[];
  taxRate?: number;
}

export function DRETab({
  projects,
  movements,
  expenses,
  taxRate = 6,
}: DRETabProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");

  // Coleta lista única de meses disponíveis nos dados
  const availablePeriods = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => {
      const d = p.created_at?.slice(0, 7);
      if (d) set.add(d);
    });
    expenses.forEach((e) => {
      const d = e.expense_date?.slice(0, 7);
      if (d) set.add(d);
    });
    movements.forEach((m) => {
      const d = m.created_at?.slice(0, 7);
      if (d) set.add(d);
    });

    const arr = Array.from(set).sort().reverse();
    return arr;
  }, [projects, expenses, movements]);

  const dre = useMemo(() => {
    return calculateDRE({
      projects,
      movements,
      expenses,
      taxRatePercent: taxRate,
      filterMonthYear: selectedPeriod,
    });
  }, [projects, movements, expenses, taxRate, selectedPeriod]);

  const handlePrint = () => {
    window.print();
  };

  const isPositive = dre.netProfit >= 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-bold tracking-tight">
              Demonstração do Resultado do Exercício (DRE)
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Apuração contábil automatizada por regime de competência com base em projetos concluídos, estoque e OPEX.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px] h-9 text-xs">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo o Histórico (Acumulado)</SelectItem>
              {availablePeriods.map((period) => (
                <SelectItem key={period} value={period}>
                  Competência {period}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={handlePrint}
          >
            <Printer className="h-3.5 w-3.5" /> Imprimir / PDF
          </Button>
        </div>
      </div>

      {/* KPI Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardHeader className="pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Receita Operacional Líquida
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(dre.netRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Bruta: {formatCurrency(dre.grossRevenue)} (-{dre.taxRatePercent}% impostos)
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Lucro Bruto (Margem Bruta)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(dre.grossProfit)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Margem Bruta: <strong className="text-foreground">{dre.grossMarginPercent}%</strong>
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Despesas Operacionais (OPEX)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {formatCurrency(dre.totalOPEX)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Custos administrativos, cloud e infra
            </p>
          </CardContent>
        </Card>

        <Card
          className={`border ${
            isPositive
              ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-destructive/30 bg-destructive/5"
          }`}
        >
          <CardHeader className="pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Resultado Líquido do Exercício
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold flex items-center gap-1.5 ${
                isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
              }`}
            >
              {isPositive ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
              {formatCurrency(dre.netProfit)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Margem Líquida Real: <strong className="text-foreground">{dre.netMarginPercent}%</strong>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Structured DRE Financial Statement Table */}
      <Card className="border-border shadow-2xs overflow-hidden">
        <CardHeader className="bg-muted/30 pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">
                Estrutura Analítica da DRE ({dre.periodLabel})
              </CardTitle>
              <CardDescription className="text-xs">
                Norma Brasileira de Contabilidade (NBC TG / Simples Nacional)
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              Alíquota Fiscal: {dre.taxRatePercent}%
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableBody className="text-xs font-mono">
              {/* 1. Receita Bruta */}
              <TableRow className="bg-muted/20 font-bold hover:bg-muted/30">
                <TableCell className="w-[70%] font-sans text-sm">
                  (+) 1. RECEITA OPERACIONAL BRUTA
                </TableCell>
                <TableCell className="text-right text-sm font-bold text-foreground">
                  {formatCurrency(dre.grossRevenue)}
                </TableCell>
              </TableRow>
              <TableRow className="text-muted-foreground hover:bg-transparent">
                <TableCell className="pl-6 font-sans">
                  • Faturamento com Projetos e Serviços Concluídos
                </TableCell>
                <TableCell className="text-right">{formatCurrency(dre.grossRevenue)}</TableCell>
              </TableRow>

              {/* 2. Deduções */}
              <TableRow className="bg-muted/10 font-medium hover:bg-muted/20">
                <TableCell className="w-[70%] font-sans text-destructive">
                  (-) 2. DEDUÇÕES DA RECEITA BRUTA
                </TableCell>
                <TableCell className="text-right font-medium text-destructive">
                  ({formatCurrency(dre.deductions)})
                </TableCell>
              </TableRow>
              <TableRow className="text-muted-foreground hover:bg-transparent">
                <TableCell className="pl-6 font-sans">
                  • Tributos e Impostos sobre Serviços (ISS / Simples Nacional a {dre.taxRatePercent}%)
                </TableCell>
                <TableCell className="text-right text-destructive">
                  ({formatCurrency(dre.deductions)})
                </TableCell>
              </TableRow>

              {/* 3. Receita Líquida */}
              <TableRow className="bg-muted/40 font-bold border-t border-border">
                <TableCell className="font-sans text-sm text-foreground">
                  (=) 3. RECEITA OPERACIONAL LÍQUIDA
                </TableCell>
                <TableCell className="text-right text-sm font-bold text-foreground">
                  {formatCurrency(dre.netRevenue)}
                </TableCell>
              </TableRow>

              {/* 4. Custos Diretos CPV/CSP */}
              <TableRow className="bg-muted/10 font-medium hover:bg-muted/20">
                <TableCell className="font-sans text-destructive">
                  (-) 4. CUSTOS DOS SERVIÇOS PRESTADOS & PEÇAS (CPV / CSP)
                </TableCell>
                <TableCell className="text-right font-medium text-destructive">
                  ({formatCurrency(dre.totalDirectCosts)})
                </TableCell>
              </TableRow>
              <TableRow className="text-muted-foreground hover:bg-transparent">
                <TableCell className="pl-6 font-sans">
                  • Custo das Peças e Insumos Utilizados (CMV Estoque Baixado)
                </TableCell>
                <TableCell className="text-right text-destructive">
                  ({formatCurrency(dre.costOfParts)})
                </TableCell>
              </TableRow>
              <TableRow className="text-muted-foreground hover:bg-transparent">
                <TableCell className="pl-6 font-sans">
                  • Custos Diretos e Deslocamentos de Projetos
                </TableCell>
                <TableCell className="text-right text-destructive">
                  ({formatCurrency(dre.directProjectCosts)})
                </TableCell>
              </TableRow>

              {/* 5. Lucro Bruto */}
              <TableRow className="bg-emerald-500/10 font-bold border-t border-emerald-500/20">
                <TableCell className="font-sans text-sm text-emerald-600 dark:text-emerald-400">
                  (=) 5. LUCRO BRUTO (Margem Bruta: {dre.grossMarginPercent}%)
                </TableCell>
                <TableCell className="text-right text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(dre.grossProfit)}
                </TableCell>
              </TableRow>

              {/* 6. Despesas Operacionais OPEX */}
              <TableRow className="bg-muted/10 font-medium hover:bg-muted/20">
                <TableCell className="font-sans text-destructive">
                  (-) 6. DESPESAS OPERACIONAIS (OPEX)
                </TableCell>
                <TableCell className="text-right font-medium text-destructive">
                  ({formatCurrency(dre.totalOPEX)})
                </TableCell>
              </TableRow>
              <TableRow className="text-muted-foreground hover:bg-transparent">
                <TableCell className="pl-6 font-sans">• Despesas Administrativas Gerais</TableCell>
                <TableCell className="text-right text-destructive">
                  ({formatCurrency(dre.opexByCategory.administrativa)})
                </TableCell>
              </TableRow>
              <TableRow className="text-muted-foreground hover:bg-transparent">
                <TableCell className="pl-6 font-sans">• Softwares, Licenças & Servidores Cloud</TableCell>
                <TableCell className="text-right text-destructive">
                  ({formatCurrency(dre.opexByCategory.software_cloud)})
                </TableCell>
              </TableRow>
              <TableRow className="text-muted-foreground hover:bg-transparent">
                <TableCell className="pl-6 font-sans">• Ferramentas, Bancada & Equipamentos</TableCell>
                <TableCell className="text-right text-destructive">
                  ({formatCurrency(dre.opexByCategory.ferramentas_oficina)})
                </TableCell>
              </TableRow>
              <TableRow className="text-muted-foreground hover:bg-transparent">
                <TableCell className="pl-6 font-sans">• Infraestrutura Física (Aluguel, Energia, Internet)</TableCell>
                <TableCell className="text-right text-destructive">
                  ({formatCurrency(dre.opexByCategory.infraestrutura)})
                </TableCell>
              </TableRow>
              <TableRow className="text-muted-foreground hover:bg-transparent">
                <TableCell className="pl-6 font-sans">• Marketing, Prospecção & Comercial</TableCell>
                <TableCell className="text-right text-destructive">
                  ({formatCurrency(dre.opexByCategory.comercial_marketing)})
                </TableCell>
              </TableRow>
              <TableRow className="text-muted-foreground hover:bg-transparent">
                <TableCell className="pl-6 font-sans">• Outras Despesas Operacionais</TableCell>
                <TableCell className="text-right text-destructive">
                  ({formatCurrency(dre.opexByCategory.outros + dre.opexByCategory.tributos_taxas)})
                </TableCell>
              </TableRow>

              {/* 7. Lucro Operacional EBIT */}
              <TableRow className="bg-muted/30 font-bold border-t border-border">
                <TableCell className="font-sans text-sm text-foreground">
                  (=) 7. RESULTADO OPERACIONAL / EBIT (Margem: {dre.operatingMarginPercent}%)
                </TableCell>
                <TableCell className="text-right text-sm font-bold text-foreground">
                  {formatCurrency(dre.operatingProfit)}
                </TableCell>
              </TableRow>

              {/* 8. Lucro Líquido Final */}
              <TableRow
                className={`font-bold border-t-2 ${
                  isPositive
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                    : "bg-destructive/15 border-destructive/40 text-destructive"
                }`}
              >
                <TableCell className="font-sans text-base py-3">
                  (=) 8. LUCRO LÍQUIDO DO EXERCÍCIO (Margem Líquida Real: {dre.netMarginPercent}%)
                </TableCell>
                <TableCell className="text-right text-base py-3 font-mono font-bold">
                  {formatCurrency(dre.netProfit)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
