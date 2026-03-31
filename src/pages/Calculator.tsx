import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DollarSign, Plus, Trash2, Calculator as CalculatorIcon } from "lucide-react";

interface CostItem {
  id: string;
  name: string;
  value: number;
}

const Calculator = () => {
  const { user } = useAuth();
  
  // Base
  const [hourlyRate, setHourlyRate] = useState(100);
  const [hours, setHours] = useState(40);
  const [complexity, setComplexity] = useState(1.0);
  
  // Costs
  const [costsList, setCostsList] = useState<CostItem[]>([]);
  
  // Modifiers
  const [profitMargin, setProfitMargin] = useState(0); // %
  const [tax, setTax] = useState(0); // %
  const [discountValue, setDiscountValue] = useState(0); // R$

  useEffect(() => {
    if (!user) return;
    supabase.from("pricing_parameters").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setHourlyRate(Number(data.hourly_rate));
        setComplexity(Number(data.default_complexity));
      }
    });
  }, [user]);

  const addCost = () => {
    setCostsList([...costsList, { id: crypto.randomUUID(), name: "", value: 0 }]);
  };

  const removeCost = (id: string) => {
    setCostsList(costsList.filter((c) => c.id !== id));
  };

  const updateCost = (id: string, field: keyof CostItem, value: string | number) => {
    setCostsList(costsList.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  // Calculations
  const basePrice = hourlyRate * hours * complexity;
  const totalCosts = costsList.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
  const subtotal = basePrice + totalCosts;
  
  const profitAmount = subtotal * (profitMargin / 100);
  const subtotalWithProfit = subtotal + profitAmount;
  
  const taxAmount = subtotalWithProfit * (tax / 100);
  const subtotalWithTaxes = subtotalWithProfit + taxAmount;
  
  const totalDiscount = Number(discountValue) || 0;
  
  const suggestedPrice = Math.max(0, subtotalWithTaxes - totalDiscount);

  const formatCurrency = (val: number) => 
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary/10 rounded-xl">
          <CalculatorIcon className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calculadora de Precificação</h1>
          <p className="text-muted-foreground mt-1 text-sm">Monte seus orçamentos de forma detalhada e profissional</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Formulário - Coluna Esquerda */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                1. Parâmetros Base
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Valor/Hora (R$)</Label>
                  <Input type="number" step="0.01" value={hourlyRate || ""} onChange={(e) => setHourlyRate(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Horas Estimadas</Label>
                  <Input type="number" value={hours || ""} onChange={(e) => setHours(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Complexidade</Label>
                  <Input type="number" step="0.1" min="0.5" max="3.0" value={complexity || ""} onChange={(e) => setComplexity(Number(e.target.value))} />
                  <p className="text-[10px] text-muted-foreground">Multiplicador (1 = Padrão)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-lg">2. Custos Extras</CardTitle>
              <Button size="sm" variant="outline" onClick={addCost} className="h-8">
                <Plus className="w-4 h-4 mr-1.5" />
                Adicionar Custo
              </Button>
            </CardHeader>
            <CardContent>
              {costsList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center bg-muted/30 rounded-lg border border-dashed">
                  <p className="text-sm text-muted-foreground mb-3">Nenhum custo extra lançado.</p>
                  <Button size="sm" variant="secondary" onClick={addCost}>
                    Adicionar primeiro custo
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {costsList.map((cost) => (
                    <div key={cost.id} className="flex gap-3 items-start animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex-1 space-y-1.5">
                        <Label className="text-xs sr-only">Descrição</Label>
                        <Input 
                          placeholder="Ex: Domínio, Licença de Tema, Banco de Imagens..." 
                          value={cost.name} 
                          onChange={(e) => updateCost(cost.id, "name", e.target.value)} 
                        />
                      </div>
                      <div className="w-32 space-y-1.5">
                        <Label className="text-xs sr-only">Valor (R$)</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                          <Input 
                            type="number" 
                            step="0.01"
                            className="pl-8"
                            placeholder="0,00"
                            value={cost.value || ""} 
                            onChange={(e) => updateCost(cost.id, "value", Number(e.target.value))} 
                          />
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                        onClick={() => removeCost(cost.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  
                  <div className="flex justify-end pt-2">
                    <p className="text-sm font-medium">
                      Subtotal Extras: <span className="text-primary">{formatCurrency(totalCosts)}</span>
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">3. Modificadores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="flex justify-between">
                    Margem de Lucro 
                    <span className="text-muted-foreground font-normal">%</span>
                  </Label>
                  <Input 
                    type="number" 
                    step="1" 
                    placeholder="Ex: 20"
                    value={profitMargin || ""} 
                    onChange={(e) => setProfitMargin(Number(e.target.value))} 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex justify-between">
                    Impostos 
                    <span className="text-muted-foreground font-normal">%</span>
                  </Label>
                  <Input 
                    type="number" 
                    step="0.1" 
                    placeholder="Ex: 6.5"
                    value={tax || ""} 
                    onChange={(e) => setTax(Number(e.target.value))} 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex justify-between">
                    Desconto 
                    <span className="text-muted-foreground font-normal">R$</span>
                  </Label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    placeholder="0,00"
                    value={discountValue || ""} 
                    onChange={(e) => setDiscountValue(Number(e.target.value))} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resumo - Coluna Direita */}
        <div className="space-y-6">
          <Card className="border-border shadow-lg sticky top-6 overflow-hidden">
            <CardHeader className="bg-primary/5 pb-5 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                Resumo do Orçamento
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-6 space-y-4 text-sm">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Horas ({hours}h × {complexity}x)</span>
                  <span>{formatCurrency(basePrice)}</span>
                </div>
                
                {totalCosts > 0 && (
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Custos Extras ({costsList.length})</span>
                    <span>{formatCurrency(totalCosts)}</span>
                  </div>
                )}
                
                <Separator className="my-2" />
                
                <div className="flex justify-between items-center font-medium bg-muted/50 p-2 rounded-md -mx-2 px-2">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>

                {profitMargin > 0 && (
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Margem de Lucro ({profitMargin}%)</span>
                    <span className="text-emerald-500 font-medium">+{formatCurrency(profitAmount)}</span>
                  </div>
                )}

                {tax > 0 && (
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Impostos ({tax}%)</span>
                    <span className="text-amber-500 font-medium">+{formatCurrency(taxAmount)}</span>
                  </div>
                )}

                {totalDiscount > 0 && (
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Desconto</span>
                    <span className="text-destructive font-medium">-{formatCurrency(totalDiscount)}</span>
                  </div>
                )}
              </div>
              
              <div className="p-6 bg-primary text-primary-foreground border-t">
                <p className="text-xs font-medium text-primary-foreground/80 mb-2 uppercase tracking-wider">
                  Valor Sugerido
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-bold tracking-tight">
                    {formatCurrency(suggestedPrice)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Calculator;
