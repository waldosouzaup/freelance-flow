import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Calculator,
  DollarSign,
  UserCog,
  LogOut,
  SlidersHorizontal,
  Layers,
  Sparkles,
  FileSpreadsheet,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface NavItem {
  title: string;
  url: string;
  icon: any;
  badge?: string;
  badgeColor?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Visão Geral",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard },
      { title: "Projetos", url: "/projects", icon: FolderKanban },
      { title: "Clientes", url: "/clients", icon: Users },
    ],
  },
  {
    label: "Orçamentos & Finanças",
    items: [
      {
        title: "Orçamentos",
        url: "/budgets",
        icon: FileSpreadsheet,
      },
      {
        title: "Calculadora",
        url: "/calculator",
        icon: Calculator,
        badge: "Novo",
        badgeColor: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      },
      { title: "Faturamento", url: "/billing", icon: DollarSign },
    ],
  },
  {
    label: "Sistema",
    items: [
      { title: "Parâmetros", url: "/parameters", icon: SlidersHorizontal },
      { title: "Configurações", url: "/settings", icon: UserCog },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { user, signOut } = useAuth();

  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : "U";
  const userName = user?.email ? user.email.split("@")[0] : "Usuário";

  return (
    <Sidebar collapsible="icon" className="border-r border-border/80 bg-sidebar text-sidebar-foreground" aria-label="Navegação Lateral do FreelanceFlow">
      {/* Brand Header */}
      <div className="p-4 flex items-center gap-3">
        {!collapsed ? (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-glow-emerald/20 text-white shrink-0">
                <Layers className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base leading-tight tracking-tight text-sidebar-foreground">
                  FreelanceFlow
                </span>
                <span className="text-[10px] text-muted-foreground font-medium">Gestão Estratégica</span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              v2.0
            </span>
          </div>
        ) : (
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-glow-emerald/20 text-white mx-auto">
            <Layers className="h-4 w-4" />
          </div>
        )}
      </div>

      <Separator className="opacity-50" />

      {/* Navigation Groups */}
      <SidebarContent className="py-2 space-y-4">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label} className="px-2 py-0">
            {!collapsed && (
              <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 px-2 py-1">
                {group.label}
              </SidebarGroupLabel>
            )}

            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {group.items.map((item) => {
                  const isActive =
                    item.url === "/"
                      ? location.pathname === "/"
                      : location.pathname.startsWith(item.url);

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          end={item.url === "/"}
                          className={`relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                            isActive
                              ? "bg-primary/10 text-primary font-semibold border border-primary/25 shadow-2xs"
                              : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          }`}
                          activeClassName=""
                        >
                          {isActive && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-primary" />
                          )}
                          <item.icon
                            className={`h-4 w-4 shrink-0 transition-transform ${
                              isActive ? "text-primary scale-105" : "text-muted-foreground"
                            }`}
                          />
                          {!collapsed && (
                            <div className="flex items-center justify-between flex-1 min-w-0">
                              <span className="truncate">{item.title}</span>
                              {item.badge && (
                                <span
                                  className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${
                                    item.badgeColor || "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </div>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* Footer Profile */}
      <SidebarFooter className="p-3 border-t border-border/60">
        {!collapsed ? (
          <div className="flex items-center justify-between p-2 rounded-lg bg-card/60 border border-border/60">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-xs border border-primary/20 shrink-0">
                {userInitial}
              </div>
              <div className="min-w-0 flex flex-col">
                <span className="text-xs font-semibold text-foreground truncate">{userName}</span>
                <span className="text-[10px] text-muted-foreground truncate">{user?.email}</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
              onClick={signOut}
              title="Sair do sistema"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 mx-auto text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={signOut}
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
