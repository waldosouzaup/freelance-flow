import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calculator as CalculatorIcon, Plus, Trash2, DollarSign, Clock, Layers, Percent, Tag } from "lucide-react";

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
    <div className="max-w-6xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
          <CalculatorIcon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Calculadora de Precificação</h1>
          <p className="text-muted-foreground mt-0.5">Monte orçamentos de forma detalhada e profissional</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form - Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Base Parameters */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                1. Parâmetros Base
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Valor/Hora (R$)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="number" 
                      step="0.01" 
                      value={hourlyRate || ""} 
                      onChange={(e) => setHourlyRate(Number(e.target.value))}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Horas Estimadas</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="number" 
                      value={hours || ""} 
                      onChange={(e) => setHours(Number(e.target.value))}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Complexidade</Label>
                  <div className="relative">
                    <Layers className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="number" 
                      step="0.1" 
                      min="0.5" 
                      max="3.0" 
                      value={complexity || ""} 
                      onChange={(e) => setComplexity(Number(e.target.value))}
                      className="pl-9"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Multiplicador (1 = Padrão)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Extra Costs */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Tag className="h-4 w-4 text-primary" />
                  2. Custos Extras
                </CardTitle>
                <Button size="sm" variant="outline" onClick={addCost}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Adicionar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {costsList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center rounded-lg border border-dashed border-border">
                  <p className="text-sm text-muted-foreground mb-3">Nenhum custo extra adicionado</p>
                  <Button size="sm" variant="secondary" onClick={addCost}>
                    <Plus className="h-4 w-4 mr-1.5" />
                    Adicionar primeiro custo
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {costsList.map((cost) => (
                    <div key={cost.id} className="flex gap-3 items-start p-3 rounded-lg bg-muted/30">
                      <div className="flex-1 space-y-1.5">
                        <Input 
                          placeholder="Ex: Domínio, Licença, Banco de Imagens..." 
                          value={cost.name} 
                          onChange={(e) => updateCost(cost.id, "name", e.target.value)}
                          className="bg-background"
                        />
                      </div>
                      <div className="w-36 space-y-1.5">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                          <Input 
                            type="number" 
                            step="0.01"
                            className="pl-8 bg-background"
                            placeholder="0,00"
                            value={cost.value || ""} 
                            onChange={(e) => updateCost(cost.id, "value", Number(e.target.value))} 
                          />
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="shrink-0 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => removeCost(cost.id)}
                      >
                        <Trash2 className="h-4 w-4" />
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

          {/* Modifiers */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Percent className="h-4 w-4 text-primary" />
                3. Modificadores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm flex justify-between">
                    Margem de Lucro 
                    <span className="text-muted-foreground font-normal">%</span>
                  </Label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="number" 
                      step="1" 
                      placeholder="20"
                      value={profitMargin || ""} 
                      onChange={(e) => setProfitMargin(Number(e.target.value))}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm flex justify-between">
                    Impostos 
                    <span className="text-muted-foreground font-normal">%</span>
                  </Label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="number" 
                      step="0.1" 
                      placeholder="6.5"
                      value={tax || ""} 
                      onChange={(e) => setTax(Number(e.target.value))}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm flex justify-between">
                    Desconto 
                    <span className="text-muted-foreground font-normal">R$</span>
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="0,00"
                      value={discountValue || ""} 
                      onChange={(e) => setDiscountValue(Number(e.target.value))}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary - Right Column */}
        <div className="space-y-6">
          <Card className="shadow-card sticky top-6">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-medium">Resumo do Orçamento</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Horas ({hours}h × {complexity}x)</span>
                  <span className="font-medium">{formatCurrency(basePrice)}</span>
                </div>
                
                {totalCosts > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Custos Extras ({costsList.length})</span>
                    <span className="font-medium">{formatCurrency(totalCosts)}</span>
                  </div>
                )}
                
                <Separator />
                
                <div className="flex justify-between items-center font-medium p-3 rounded-lg bg-muted/50">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>

                {profitMargin > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Margem de Lucro ({profitMargin}%)</span>
                    <span className="text-success font-medium">+{formatCurrency(profitAmount)}</span>
                  </div>
                )}

                {tax > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Impostos ({tax}%)</span>
                    <span className="text-warning font-medium">+{formatCurrency(taxAmount)}</span>
                  </div>
                )}

                {totalDiscount > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Desconto</span>
                    <span className="text-destructive font-medium">-{formatCurrency(totalDiscount)}</span>
                  </div>
                )}
              </div>
              
              <div className="p-4 rounded-lg bg-primary text-primary-foreground">
                <p className="text-xs font-medium text-primary-foreground/80 mb-1 uppercase tracking-wide">
                  Valor Sugerido
                </p>
                <p className="text-3xl font-bold">
                  {formatCurrency(suggestedPrice)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Calculator;
