import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
// import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AppLayout } from "./components/Layout/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import DashboardNew from "./pages/DashboardNew";
import Employees from "./pages/Employees";
// import EmployeesNew from "./pages/EmployeesNew";
import ApprovalRules from "./pages/ApprovalRules";
import AllExpenses from "./pages/AllExpenses";
import Approvals from "./pages/Approvals";
import MyExpenses from "./pages/MyExpenses";
import SubmitExpense from "./pages/SubmitExpense";
import TeamExpenses from "./pages/TeamExpenses";
import NotFound from "./pages/NotFound";

// const queryClient = new QueryClient();

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <ProtectedRoute>
              <AppLayout>
                <DashboardNew />
              </AppLayout>
            </ProtectedRoute>
          } />
            <Route path="/employees" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AppLayout>
                  <Employees />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/approval-rules" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AppLayout>
                  <ApprovalRules />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/all-expenses" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AppLayout>
                  <AllExpenses />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/approvals" element={
              <ProtectedRoute allowedRoles={['manager', 'admin']}>
                <AppLayout>
                  <Approvals />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/my-expenses" element={
              <ProtectedRoute allowedRoles={['employee', 'manager', 'admin']}>
                <AppLayout>
                  <MyExpenses />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/submit-expense" element={
              <ProtectedRoute allowedRoles={['employee', 'manager', 'admin']}>
                <AppLayout>
                  <SubmitExpense />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/team-expenses" element={
              <ProtectedRoute allowedRoles={['manager', 'admin']}>
                <AppLayout>
                  <TeamExpenses />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </TooltipProvider>
);export default App;
