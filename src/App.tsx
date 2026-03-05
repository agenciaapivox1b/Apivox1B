import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import DashboardLayout from "./layout/DashboardLayout";
import OverviewPage from "./pages/OverviewPage";
import AgentsPage from "./pages/AgentsPage";
import InboxPage from "./pages/InboxPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import IntegrationsPage from "./pages/IntegrationsPage";
import KnowledgeBasePage from "./pages/KnowledgeBasePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<DashboardLayout><OverviewPage /></DashboardLayout>} />
          <Route path="/agents" element={<DashboardLayout><AgentsPage /></DashboardLayout>} />
          <Route path="/inbox" element={<DashboardLayout><InboxPage /></DashboardLayout>} />
          <Route path="/analytics" element={<DashboardLayout><AnalyticsPage /></DashboardLayout>} />
          <Route path="/integrations" element={<DashboardLayout><IntegrationsPage /></DashboardLayout>} />
          <Route path="/knowledge" element={<DashboardLayout><KnowledgeBasePage /></DashboardLayout>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
