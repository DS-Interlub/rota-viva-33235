import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { lazy, Suspense } from "react";
import Layout from "@/components/Layout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

// Lazy load pages for better performance
const RoutesPage = lazy(() => import("./pages/Routes"));
const Drivers = lazy(() => import("./pages/Drivers"));
const Customers = lazy(() => import("./pages/Customers"));
const Vehicles = lazy(() => import("./pages/Vehicles"));
const Expenses = lazy(() => import("./pages/Expenses"));
const Reports = lazy(() => import("./pages/Reports"));
const DriverRoutes = lazy(() => import("./pages/DriverRoutes"));
const DriverExpenses = lazy(() => import("./pages/DriverExpenses"));
const ManageDrivers = lazy(() => import("./pages/ManageDrivers"));

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
              <Route path="routes" element={
                <Suspense fallback={<div className="flex justify-center p-8">Carregando...</div>}>
                  <RoutesPage />
                </Suspense>
              } />
              <Route path="drivers" element={
                <Suspense fallback={<div className="flex justify-center p-8">Carregando...</div>}>
                  <Drivers />
                </Suspense>
              } />
              <Route path="manage-drivers" element={
                <Suspense fallback={<div className="flex justify-center p-8">Carregando...</div>}>
                  <ManageDrivers />
                </Suspense>
              } />
              <Route path="customers" element={
                <Suspense fallback={<div className="flex justify-center p-8">Carregando...</div>}>
                  <Customers />
                </Suspense>
              } />
              <Route path="vehicles" element={
                <Suspense fallback={<div className="flex justify-center p-8">Carregando...</div>}>
                  <Vehicles />
                </Suspense>
              } />
              <Route path="expenses" element={
                <Suspense fallback={<div className="flex justify-center p-8">Carregando...</div>}>
                  <Expenses />
                </Suspense>
              } />
              <Route path="reports" element={
                <Suspense fallback={<div className="flex justify-center p-8">Carregando...</div>}>
                  <Reports />
                </Suspense>
              } />
              <Route path="my-routes" element={
                <Suspense fallback={<div className="flex justify-center p-8">Carregando...</div>}>
                  <DriverRoutes />
                </Suspense>
              } />
              <Route path="my-expenses" element={
                <Suspense fallback={<div className="flex justify-center p-8">Carregando...</div>}>
                  <DriverExpenses />
                </Suspense>
              } />
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
