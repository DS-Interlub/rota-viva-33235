import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import RoutesPage from "./pages/Routes";
import Drivers from "./pages/Drivers";
import Customers from "./pages/Customers";
import Vehicles from "./pages/Vehicles";
import Expenses from "./pages/Expenses";
import Reports from "./pages/Reports";
import DriverRoutes from "./pages/DriverRoutes";
import DriverExpenses from "./pages/DriverExpenses";
import ManageDrivers from "./pages/ManageDrivers";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="routes" element={<RoutesPage />} />
              <Route path="drivers" element={<Drivers />} />
              <Route path="manage-drivers" element={<ManageDrivers />} />
              <Route path="customers" element={<Customers />} />
              <Route path="vehicles" element={<Vehicles />} />
              <Route path="expenses" element={<Expenses />} />
              <Route path="reports" element={<Reports />} />
              <Route path="my-routes" element={<DriverRoutes />} />
              <Route path="my-expenses" element={<DriverExpenses />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
