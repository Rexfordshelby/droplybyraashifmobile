import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { AuthProvider } from "@/hooks/useAuth";
import { isSupabaseConfigured } from "@/integrations/supabase/client";
import { RouteSEO } from "@/components/seo/RouteSEO";

const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const SendParcel = lazy(() => import("./pages/SendParcel"));
const RiderDashboard = lazy(() => import("./pages/RiderDashboard"));
const BecomeRider = lazy(() => import("./pages/BecomeRider"));
const Admin = lazy(() => import("./pages/Admin"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Profile = lazy(() => import("./pages/Profile"));
const Receipt = lazy(() => import("./pages/Receipt"));
const Track = lazy(() => import("./pages/Track"));
const PublicTrack = lazy(() => import("./pages/PublicTrack"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const ConfigurationWarning = () => {
  if (isSupabaseConfigured) return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
      <div className="container flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Supabase is not connected. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to enable sign-in, orders, and live tracking.
        </span>
      </div>
    </div>
  );
};

const RouteFallback = () => (
  <div className="min-h-[50vh] flex items-center justify-center text-sm text-muted-foreground">
    Loading...
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ConfigurationWarning />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <RouteSEO />
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/send" element={<SendParcel />} />
              <Route path="/rider" element={<RiderDashboard />} />
              <Route path="/become-rider" element={<BecomeRider />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/receipt/:orderId" element={<Receipt />} />
              <Route path="/track/:orderId" element={<Track />} />
              <Route path="/t/:code" element={<PublicTrack />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
