import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProjectsList from "./pages/ProjectsList";
import ProjectForm from "./pages/ProjectForm";
import ProjectDetails from "./pages/ProjectDetails";
import ClientsList from "./pages/ClientsList";
import ClientForm from "./pages/ClientForm";
import Calculator from "./pages/Calculator";
import Billing from "./pages/Billing";
import Parameters from "./pages/Parameters";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <AppLayout>{children}</AppLayout>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
    <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/projects" element={<ProtectedRoute><ProjectsList /></ProtectedRoute>} />
    <Route path="/projects/new" element={<ProtectedRoute><ProjectForm /></ProtectedRoute>} />
    <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetails /></ProtectedRoute>} />
    <Route path="/projects/:id/edit" element={<ProtectedRoute><ProjectForm /></ProtectedRoute>} />
    <Route path="/clients" element={<ProtectedRoute><ClientsList /></ProtectedRoute>} />
    <Route path="/clients/new" element={<ProtectedRoute><ClientForm /></ProtectedRoute>} />
    <Route path="/clients/:id/edit" element={<ProtectedRoute><ClientForm /></ProtectedRoute>} />
    <Route path="/calculator" element={<ProtectedRoute><Calculator /></ProtectedRoute>} />
    <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
    <Route path="/parameters" element={<ProtectedRoute><Parameters /></ProtectedRoute>} />
    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
