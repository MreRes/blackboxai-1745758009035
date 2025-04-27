import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AuthLayout from '@/layouts/AuthLayout';
import UserLayout from '@/layouts/UserLayout';
import AdminLayout from '@/layouts/AdminLayout';
import { AuthProvider } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';

// Auth Pages
import Login from '@/pages/auth/Login';
import AdminLogin from '@/pages/auth/AdminLogin';

// User Pages
import UserDashboard from '@/pages/user/Dashboard';
import Transactions from '@/pages/user/Transactions';
import Budgets from '@/pages/user/Budgets';
import Reports from '@/pages/user/Reports';
import ChatBot from '@/pages/user/ChatBot';

// Admin Pages
import AdminDashboard from '@/pages/admin/Dashboard';
import UserManagement from '@/pages/admin/UserManagement';
import SystemSettings from '@/pages/admin/SystemSettings';
import WhatsAppSessions from '@/pages/admin/WhatsAppSessions';

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <Routes>
        {/* Public Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/admin/login" element={<AdminLogin />} />
        </Route>

        {/* User Routes */}
        <Route element={<ProtectedRoute role="USER" />}>
          <Route element={<UserLayout />}>
            <Route path="/dashboard" element={<UserDashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/budgets" element={<Budgets />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/chat" element={<ChatBot />} />
          </Route>
        </Route>

        {/* Admin Routes */}
        <Route element={<ProtectedRoute role="ADMIN" />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<UserManagement />} />
            <Route path="/admin/settings" element={<SystemSettings />} />
            <Route path="/admin/whatsapp" element={<WhatsAppSessions />} />
          </Route>
        </Route>

        {/* Redirect root to dashboard or login */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}
