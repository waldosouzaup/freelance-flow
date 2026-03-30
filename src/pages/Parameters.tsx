import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
      toast.success("Parâmetros salvos");
      setExists(true);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Parâmetros de Precificação</h1>
      <Card className="border-border">
        <CardHeader><CardTitle className="text-base">Configurações Padrão</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Valor/Hora Padrão (R$)</Label>
            <Input type="number" step="0.01" value={hourlyRate} onChange={(e) => setHourlyRate(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Margem Padrão (%)</Label>
            <Input type="number" step="0.01" value={defaultMargin} onChange={(e) => setDefaultMargin(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Complexidade Padrão</Label>
            <Input type="number" step="0.1" min="0.5" max="3.0" value={defaultComplexity} onChange={(e) => setDefaultComplexity(Number(e.target.value))} />
          </div>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Salvando..." : "Salvar Parâmetros"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Parameters;
