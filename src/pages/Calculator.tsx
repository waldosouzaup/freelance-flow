import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign } from "lucide-react";

const Calculator = () => {
  const { user } = useAuth();
  const [hourlyRate, setHourlyRate] = useState(100);
  const [hours, setHours] = useState(40);
  const [complexity, setComplexity] = useState(1.0);
  const [extraCosts, setExtraCosts] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase.from("pricing_parameters").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setHourlyRate(Number(data.hourly_rate));
        setComplexity(Number(data.default_complexity));
      }
    });
  }, [user]);

  const suggestedPrice = hourlyRate * hours * complexity + extraCosts;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Calculadora de Precificação</h1>

      <Card className="border-border">
        <CardHeader><CardTitle className="text-base">Parâmetros do Projeto</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor/Hora (R$)</Label>
              <Input type="number" step="0.01" value={hourlyRate} onChange={(e) => setHourlyRate(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Horas Estimadas</Label>
              <Input type="number" value={hours} onChange={(e) => setHours(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Complexidade (multiplicador)</Label>
              <Input type="number" step="0.1" min="0.5" max="3.0" value={complexity} onChange={(e) => setComplexity(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Custos Extras (R$)</Label>
              <Input type="number" step="0.01" value={extraCosts} onChange={(e) => setExtraCosts(Number(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-chart-green/10 border-chart-green/30">
        <CardContent className="p-6 flex items-center gap-4">
          <div className="bg-chart-green p-4 rounded-xl">
            <DollarSign className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Preço Sugerido</p>
            <p className="text-3xl font-bold">
              R$ {suggestedPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {hourlyRate} × {hours}h × {complexity} + {extraCosts.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Calculator;
