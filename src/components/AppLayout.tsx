import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Menu, Plus, ChevronRight } from "lucide-react";

const ROUTE_TITLES: Record<string, { title: string; parent?: string }> = {
  "/": { title: "Dashboard Executivo" },
  "/projects": { title: "Projetos" },
  "/projects/new": { title: "Novo Projeto", parent: "Projetos" },
  "/clients": { title: "Clientes" },
  "/clients/new": { title: "Novo Cliente", parent: "Clientes" },
  "/calculator": { title: "Calculadora de Orçamentos" },
  "/billing": { title: "Faturamento" },
  "/parameters": { title: "Parâmetros" },
  "/settings": { title: "Configurações" },
};

function getRouteInfo(pathname: string) {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];
  if (pathname.startsWith("/projects/") && pathname.endsWith("/edit")) {
    return { title: "Editar Projeto", parent: "Projetos" };
  }
  if (pathname.startsWith("/projects/")) {
    return { title: "Detalhes do Projeto", parent: "Projetos" };
  }
  if (pathname.startsWith("/clients/")) {
    return { title: "Editar Cliente", parent: "Clientes" };
  }
  return { title: "Visão Geral" };
}

export function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const routeInfo = getRouteInfo(location.pathname);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background font-sans antialiased text-foreground" aria-label="Painel Principal FreelanceFlow">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Executive Header Bar */}
          <header className="h-16 flex items-center justify-between border-b border-border/80 px-4 sm:px-6 bg-card/80 backdrop-blur-md sticky top-0 z-20">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-9 w-9 rounded-lg border border-border/70 hover:bg-accent/80 hover:text-foreground text-muted-foreground transition-all">
                <Menu className="h-4 w-4" />
              </SidebarTrigger>

              {/* Breadcrumb / Context Title */}
              <div className="flex items-center gap-1.5 text-sm">
                {routeInfo.parent && (
                  <>
                    <span className="text-muted-foreground hidden sm:inline">{routeInfo.parent}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 hidden sm:inline" />
                  </>
                )}
                <span className="font-semibold text-foreground tracking-tight">{routeInfo.title}</span>
              </div>
            </div>

            {/* Quick Action & Controls */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Quick New Budget Button */}
              {location.pathname !== "/calculator" && (
                <Button asChild size="sm" className="hidden sm:inline-flex h-8 gap-1.5 px-3 text-xs font-semibold shadow-xs">
                  <Link to="/calculator">
                    <Plus className="h-3.5 w-3.5" />
                    <span>Novo Orçamento</span>
                  </Link>
                </Button>
              )}

              {/* Live Status indicator */}
              <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full border border-border/60 bg-muted/40 text-xs text-muted-foreground">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-medium text-[11px]">Online</span>
              </div>

              {/* Theme Toggle */}
              <ThemeToggle />
            </div>
          </header>

          {/* Main Body */}
          <main id="main-content" className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto animate-in fade-in-50 duration-200">
            {children}
          </main>

          {/* Clean Organic Footer */}
          <footer className="py-4 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-2 px-6 text-xs text-muted-foreground bg-card/30">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">FreelanceFlow</span>
              <span>•</span>
              <span>Sistema de Gestão & Precificação Estratégica</span>
            </div>
            <div>
              Desenvolvido por{" "}
              <a
                href="https://waldoeller.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground hover:text-primary transition-colors underline-offset-4 hover:underline"
              >
                Waldo Eller
              </a>
            </div>
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}
