import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";

/* Product pages */
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Jobs from "./pages/Jobs";
import JobDetails from "./pages/JobDetails";
import CreateJob from "./pages/CreateJob";
import Settings from "./pages/Settings";
import CleanerJob from "./pages/CleanerJob";
import NotFound from "./pages/NotFound";
import JobPlanning from "@/pages/JobPlanning";

/* Marketing – CleanProof */
import CleanProofLanding from "@/marketing/cleanproof/CleanProofLanding";
import CleanProofDemoRequest from "@/marketing/cleanproof/CleanProofDemoRequest";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* =========================
              Marketing (public)
              ========================= */}
          <Route path="/cleanproof" element={<CleanProofLanding />} />
          <Route path="/cleanproof/demo" element={<CleanProofDemoRequest />} />

          {/* =========================
              Auth
              ========================= */}
          <Route path="/" element={<Login />} />

          {/* =========================
              Protected app (with layout)
              ========================= */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/jobs/:id" element={<JobDetails />} />
            <Route path="/create-job" element={<CreateJob />} />
            <Route path="/planning" element={<JobPlanning />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          {/* =========================
              Cleaner interface (standalone)
              ========================= */}
          <Route path="/cleaner" element={<CleanerJob />} />

          {/* =========================
              Catch-all
              ========================= */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
