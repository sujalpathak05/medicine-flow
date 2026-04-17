import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import MedicinesPage from "./pages/MedicinesPage";
import BranchesPage from "./pages/BranchesPage";
import UsersPage from "./pages/UsersPage";
import TransfersPage from "./pages/TransfersPage";
import ActivityPage from "./pages/ActivityPage";
import SellMedicinePage from "./pages/SellMedicinePage";
import SuppliersPage from "./pages/SuppliersPage";
import PurchasePage from "./pages/PurchasePage";
import ReturnsPage from "./pages/ReturnsPage";
import ReportsPage from "./pages/ReportsPage";
import AIChatPage from "./pages/AIChatPage";
import CustomersPage from "./pages/CustomersPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, role, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (adminOnly && role !== "admin") return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/medicines" element={<ProtectedRoute><MedicinesPage /></ProtectedRoute>} />
            <Route path="/branches" element={<ProtectedRoute adminOnly><BranchesPage /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute adminOnly><UsersPage /></ProtectedRoute>} />
            <Route path="/transfers" element={<ProtectedRoute><TransfersPage /></ProtectedRoute>} />
            <Route path="/sell" element={<ProtectedRoute><SellMedicinePage /></ProtectedRoute>} />
            <Route path="/suppliers" element={<ProtectedRoute adminOnly><SuppliersPage /></ProtectedRoute>} />
            <Route path="/purchase" element={<ProtectedRoute><PurchasePage /></ProtectedRoute>} />
            <Route path="/returns" element={<ProtectedRoute><ReturnsPage /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute adminOnly><ReportsPage /></ProtectedRoute>} />
            <Route path="/customers" element={<ProtectedRoute><CustomersPage /></ProtectedRoute>} />
            <Route path="/ai-assistant" element={<ProtectedRoute><AIChatPage /></ProtectedRoute>} />
            <Route path="/activity" element={<ProtectedRoute adminOnly><ActivityPage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute adminOnly><SettingsPage /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
