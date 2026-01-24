// dubai-control/src/App.tsx

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import ScrollToTop from "@/components/layout/ScrollToTop";

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
import Locations from "@/pages/Locations";
import PricingPage from "@/pages/PricingPage";

/* Contexts */
import { LocationsProvider } from "@/contexts/LocationsContext";

/* Marketing – CleanProof */
import CleanProofLanding from "@/marketing/cleanproof/CleanProofLanding";
import CleanProofDemoRequest from "@/marketing/cleanproof/CleanProofDemoRequest";

import "leaflet/dist/leaflet.css";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        {/* 👇 глобальный контроль скролла */}
        <ScrollToTop />

        <LocationsProvider>
          <Routes>
            {/* =========================
                Marketing (public)
                ========================= */}
            <Route path="/cleanproof" element={<CleanProofLanding />} />
            <Route path="/cleanproof/demo" element={<CleanProofDemoRequest />} />
            <Route path="/cleanproof/pricing" element={<PricingPage />} />
            {/* alias на всякий случай */}
            <Route path="/pricing" element={<PricingPage />} />

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
              <Route path="/locations" element={<Locations />} />
              <Route path="/locations/new" element={<Locations />} />
              <Route path="/locations/:id" element={<Locations />} />
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
        </LocationsProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
