// dubai-control/src/App.tsx

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import ScrollToTop from "@/components/layout/ScrollToTop";

/* Product pages */
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Jobs from "./pages/Jobs";
import JobDetails from "./pages/JobDetails";
import History from "./pages/History";
import SettingsHome from "./pages/settings/SettingsHome";
import AccountSettings from "./pages/settings/AccountSettings";
import Billing from "./pages/settings/Billing";
import CompanyProfile from "./pages/company/CompanyProfile";
import CompanyTeam from "./pages/company/CompanyTeam";
import CleanerJob from "./pages/CleanerJob";
import NotFound from "./pages/NotFound";
import JobPlanning from "./pages/JobPlanning";
import Locations from "./pages/Locations";
import PricingPage from "./pages/PricingPage";
import Signup from "./pages/Signup";
import Performance from "./pages/Performance";
import Reports from "./pages/Reports";
import ViolationJobsPage from "./pages/ViolationJobsPage";
import ReportEmailLogsPage from "./pages/ReportEmailLogs";
import Analytics from "./pages/Analytics";

/* Maintenance Context Pages */
import MaintenanceDashboard from "./pages/maintenance/Dashboard";
import Assets from "./pages/maintenance/Assets";
import VisitList from "./pages/maintenance/VisitList";
import CreateVisit from "./pages/maintenance/CreateVisit";
import VisitDetail from "./pages/maintenance/VisitDetail";

/* Contexts */
import { LocationsProvider } from "@/contexts/LocationsContext";
import { AppContextProvider } from "@/contexts/AppContext";

/* Marketing – CleanProof */
import CleanProofLanding from "@/marketing/cleanproof/CleanProofLanding";
import CleanProofDemoRequest from "@/marketing/cleanproof/CleanProofDemoRequest";
import CleanProofContact from "@/marketing/cleanproof/CleanProofContact";
import CleanProofUpdates from "@/marketing/cleanproof/CleanProofUpdates";

import "leaflet/dist/leaflet.css";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        {/* Global scroll control */}
        <ScrollToTop />

        <LocationsProvider>
          <Routes>
            {/* =========================
                Marketing (public)
                ========================= */}
            <Route path="/cleanproof" element={<CleanProofLanding />} />
            <Route path="/cleanproof/demo" element={<CleanProofDemoRequest />} />
            <Route path="/cleanproof/pricing" element={<PricingPage />} />
            <Route path="/cleanproof/updates" element={<CleanProofUpdates />} />
            <Route path="/cleanproof/contact" element={<CleanProofContact />} />
            {/* alias */}
            <Route path="/pricing" element={<PricingPage />} />

            {/* =========================
                Auth
                ========================= */}
            <Route path="/" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* =========================
                Protected app (with layout + context)
                ========================= */}
            <Route
              element={
                <AppContextProvider>
                  <AppLayout />
                </AppContextProvider>
              }
            >
              {/* -------------------------
                  Cleaning Context Routes
                  (existing paths, unchanged)
                  ------------------------- */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/jobs/:id" element={<JobDetails />} />

              {/* Legacy redirect: create-job → planning */}
              <Route
                path="/create-job"
                element={<Navigate to="/planning" replace />}
              />

              <Route path="/planning" element={<JobPlanning />} />
              <Route path="/history" element={<History />} />
              <Route path="/performance" element={<Performance />} />
              <Route path="/reports" element={<Reports />} />
              <Route
                path="/reports/violations"
                element={<ViolationJobsPage />}
              />
              <Route
                path="/reports/email-logs"
                element={<ReportEmailLogsPage />}
              />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/locations" element={<Locations />} />
              <Route path="/locations/new" element={<Locations />} />
              <Route path="/locations/:id" element={<Locations />} />

              {/* -------------------------
                  Maintenance Context Routes
                  (all under /maintenance/*)
                  ------------------------- */}
              <Route path="/maintenance/dashboard" element={<MaintenanceDashboard />} />
              <Route path="/maintenance/visits" element={<VisitList />} />
              <Route path="/maintenance/visits/new" element={<CreateVisit />} />
              <Route path="/maintenance/visits/:id" element={<VisitDetail />} />
              <Route path="/maintenance/assets" element={<Assets />} />
              <Route path="/maintenance/assets/new" element={<Assets />} />
              <Route path="/maintenance/assets/:id" element={<Assets />} />
              {/* Technicians placeholder - reuses cleaners for now */}
              <Route path="/maintenance/technicians" element={<CompanyTeam />} />

              {/* Legacy /assets redirect to maintenance context */}
              <Route
                path="/assets"
                element={<Navigate to="/maintenance/assets" replace />}
              />
              <Route
                path="/assets/new"
                element={<Navigate to="/maintenance/assets/new" replace />}
              />
              <Route
                path="/assets/:id"
                element={<Navigate to="/maintenance/assets/:id" replace />}
              />

              {/* -------------------------
                  Shared Routes
                  (accessible from any context)
                  ------------------------- */}
              <Route path="/company/profile" element={<CompanyProfile />} />
              <Route path="/company/team" element={<CompanyTeam />} />
              <Route path="/settings" element={<SettingsHome />} />
              <Route path="/settings/account" element={<AccountSettings />} />
              <Route path="/settings/billing" element={<Billing />} />
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
