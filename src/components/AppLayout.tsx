import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Menu } from "lucide-react";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-card sticky top-0 z-10">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
            <ThemeToggle />
          </header>
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
          <footer className="h-14 border-t border-border flex items-center justify-center bg-card/50 px-4">
            <p className="text-sm text-muted-foreground">
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
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}
