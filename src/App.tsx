import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "./layout/DashboardLayout";
import OverviewPage from "./pages/OverviewPage";
import AgentsPage from "./pages/AgentsPage";
import InboxPage from "./pages/InboxPage";
import AnalyticsPage from "./pages/AnalyticsPage";

import KnowledgeBasePage from "./pages/KnowledgeBasePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Protected Dashboard Routes */}
            <Route path="/" element={<ProtectedRoute><DashboardLayout><OverviewPage /></DashboardLayout></ProtectedRoute>} />
            <Route path="/agents" element={<ProtectedRoute><DashboardLayout><AgentsPage /></DashboardLayout></ProtectedRoute>} />
            <Route path="/inbox" element={<ProtectedRoute><DashboardLayout><InboxPage /></DashboardLayout></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><DashboardLayout><AnalyticsPage /></DashboardLayout></ProtectedRoute>} />
            <Route path="/integrations" element={<Navigate to="/" replace />} />
            <Route path="/knowledge" element={<ProtectedRoute><DashboardLayout><KnowledgeBasePage /></DashboardLayout></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
