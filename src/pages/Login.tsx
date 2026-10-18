import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";
import { Briefcase, Mail, Lock } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Conta criada! Verifique seu email para confirmar.");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
      } else {
        navigate("/");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Subtle ambient lighting */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-md shadow-card border-border/80 backdrop-blur-sm relative z-10">
        <CardHeader className="text-center space-y-3 pb-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 shadow-glow-emerald/30">
            <Briefcase className="h-7 w-7 text-white" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight">FreelanceFlow</CardTitle>
            <p className="text-xs uppercase tracking-wider font-semibold text-primary">Plataforma de Gestão & Precificação</p>
          </div>
          <CardDescription className="text-muted-foreground text-sm">
            {isSignUp ? "Crie sua conta para gerenciar orçamentos e lucros" : "Entre no seu painel de gestão profissional"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email de Acesso</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-9 bg-background"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pl-9 bg-background"
                />
              </div>
            </div>
            <Button type="submit" className="w-full shadow-subtle" disabled={loading}>
              {loading ? "Aguarde..." : isSignUp ? "Criar Conta Gratuita" : "Entrar no Painel"}
            </Button>
          </form>
          <div className="mt-6 text-center pt-6 border-t border-border/60">
            <p className="text-sm text-muted-foreground">
              {isSignUp ? "Já possui cadastro?" : "Ainda não possui conta?"}{" "}
              <button
                type="button"
                className="font-semibold text-primary hover:underline transition-all cursor-pointer"
                onClick={() => setIsSignUp(!isSignUp)}
              >
                {isSignUp ? "Acesse sua conta" : "Cadastre-se"}
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
      <div className="absolute bottom-6 w-full text-center">
        <p className="text-xs text-muted-foreground">
          Desenvolvido por:{" "}
          <a 
            href="https://waldoeller.com/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="font-medium text-foreground hover:text-primary hover:underline transition-all"
          >
            Waldo Eller
          </a>
        </p>
      </div>
    </div>
  );
};

export default Login;
