import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Settings, DollarSign, Percent, Layers, Save } from "lucide-react";

const Parameters = () => {
  const { user } = useAuth();
  const [hourlyRate, setHourlyRate] = useState(100);
  const [defaultMargin, setDefaultMargin] = useState(20);
  const [defaultComplexity, setDefaultComplexity] = useState(1.0);
  const [loading, setLoading] = useState(false);
  const [exists, setExists] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("pricing_parameters").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setHourlyRate(Number(data.hourly_rate));
        setDefaultMargin(Number(data.default_margin));
        setDefaultComplexity(Number(data.default_complexity));
        setExists(true);
      }
    });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);

    const payload = {
      user_id: user.id,
      hourly_rate: hourlyRate,
      default_margin: defaultMargin,
      default_complexity: defaultComplexity,
    };

    const { error } = exists
      ? await supabase.from("pricing_parameters").update(payload).eq("user_id", user.id)
      : await supabase.from("pricing_parameters").insert(payload);

    if (error) {
      toast.error("Erro ao salvar parâmetros");
    } else {
      toast.success("Parâmetros salvos com sucesso");
      setExists(true);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
          <Settings className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Parâmetros de Precificação</h1>
          <p className="text-muted-foreground mt-0.5">Configure os valores padrão para a calculadora</p>
        </div>
      </div>

      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Configurações Padrão</CardTitle>
          <CardDescription>
            Esses valores serão usados automaticamente na calculadora de precificação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                Valor/Hora Padrão (R$)
              </Label>
              <Input 
                type="number" 
                step="0.01" 
                value={hourlyRate} 
                onChange={(e) => setHourlyRate(Number(e.target.value))}
                className="max-w-xs"
              />
              <p className="text-xs text-muted-foreground">
                Valor base por hora de trabalho
              </p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-2">
                <Percent className="h-4 w-4 text-muted-foreground" />
                Margem Padrão (%)
              </Label>
              <Input 
                type="number" 
                step="0.01" 
                value={defaultMargin} 
                onChange={(e) => setDefaultMargin(Number(e.target.value))}
                className="max-w-xs"
              />
              <p className="text-xs text-muted-foreground">
                Percentual de margem de lucro padrão
              </p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                Complexidade Padrão
              </Label>
              <Input 
                type="number" 
                step="0.1" 
                min="0.5" 
                max="3.0" 
                value={defaultComplexity} 
                onChange={(e) => setDefaultComplexity(Number(e.target.value))}
                className="max-w-xs"
              />
              <p className="text-xs text-muted-foreground">
                Multiplicador de complexidade (1 = Padrão, 0.5 = Fácil, 3 = Muito Complexo)
              </p>
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <Button onClick={handleSave} disabled={loading} className="min-w-32">
              <Save className="h-4 w-4 mr-2" />
              {loading ? "Salvando..." : "Salvar Parâmetros"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Parameters;
