import React, { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UstaAuthProvider, useUstaAuth } from './context/UstaAuthContext';
import { ToastProvider } from './context/ToastContext';
import { AdminLayout } from './components/layout/AdminLayout';
import { UstaLayout } from './components/usta/UstaLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { WorkersPage } from './pages/WorkersPage';
import { WorkTypesPage } from './pages/WorkTypesPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { UstaLoginPage } from './pages/usta/UstaLoginPage';
import { UstaFieldPage } from './pages/usta/UstaFieldPage';
import { UstaWalletPage } from './pages/usta/UstaWalletPage';
import { PageLoader } from './components/ui/EmptyState';

// --- Portal 1 (/admin) Guards ---
const ProtectedAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <PageLoader label="Sessiya yoxlanılır..." />
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }
  return <>{children}</>;
};

const PublicAdminLoginRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <PageLoader label="Yüklənir..." />
      </div>
    );
  }
  if (isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }
  return <>{children}</>;
};

// --- Portal 2 (/usta) Guards ---
const ProtectedUstaRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useUstaAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <PageLoader label="Usta sessiyası yoxlanılır..." />
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/usta/login" replace />;
  }
  return <>{children}</>;
};

const PublicUstaLoginRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useUstaAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <PageLoader label="Yüklənir..." />
      </div>
    );
  }
  if (isAuthenticated) {
    return <Navigate to="/usta" replace />;
  }
  return <>{children}</>;
};

const DocumentTitleSync: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    if (pathname.startsWith('/usta')) {
      document.title = 'Oxşar İnşaat — İşçi (Usta) Portalı';
    } else {
      document.title = 'Oxşar İnşaat — Müdir Portalı';
    }
  }, [pathname]);
  return null;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <DocumentTitleSync />
      <ToastProvider>
        <AuthProvider>
          <UstaAuthProvider>
            <Routes>
              <Route path="/" element={<Navigate to="/admin" replace />} />

              {/* PORTAL 1: MÜDİR PORTALI (/admin) */}
              <Route
                path="/admin/login"
                element={
                  <PublicAdminLoginRoute>
                    <LoginPage />
                  </PublicAdminLoginRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedAdminRoute>
                    <AdminLayout />
                  </ProtectedAdminRoute>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path="projects" element={<ProjectsPage />} />
                <Route path="projects/:id" element={<ProjectDetailPage />} />
                <Route path="workers" element={<WorkersPage />} />
                <Route path="work-types" element={<WorkTypesPage />} />
                <Route path="audit-logs" element={<AuditLogsPage />} />
              </Route>

              {/* PORTAL 2: İŞÇİ (USTA) MOBİL PORTALI (/usta) */}
              <Route
                path="/usta/login"
                element={
                  <PublicUstaLoginRoute>
                    <UstaLoginPage />
                  </PublicUstaLoginRoute>
                }
              />
              <Route
                path="/usta"
                element={
                  <ProtectedUstaRoute>
                    <UstaLayout />
                  </ProtectedUstaRoute>
                }
              >
                <Route index element={<UstaFieldPage />} />
                <Route path="wallet" element={<UstaWalletPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </UstaAuthProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
};

export default App;
