import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppErrorBoundary } from './components/ErrorBoundary';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { ProviderDashboard } from './pages/ProviderDashboard';
import { FindProvider } from './pages/FindProvider';
import { ProviderDetails } from './pages/ProviderDetails';
import { CustomerProjects } from './pages/CustomerProjects';
import { NewProject } from './pages/NewProject';
import { ProjectDetails } from './pages/ProjectDetails';
import { EditProject } from './pages/EditProject';
import { Profile } from './pages/Profile';
import { ProviderProfile } from './pages/ProviderProfile.tsx';
import { AuthGuard } from './components/AuthGuard';
import { Navigation } from './components/Navigation';
import { useAuthStore } from './store/authStore';

function App() {
  const { initialize, initialized } = useAuthStore();

  React.useEffect(() => {
    if (!initialized) {
      initialize();
    }
  }, [initialize, initialized]);

  return (
    <Router>
      <AppErrorBoundary>
        <div className="min-h-screen bg-gray-50">
          <Navigation />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/find-provider" element={<FindProvider />} />
            <Route path="/provider/:id" element={<ProviderDetails />} />
            <Route
              path="/profile"
              element={
                <AuthGuard>
                  <Profile />
                </AuthGuard>
              }
            />
            <Route
              path="/provider-profile"
              element={
                <AuthGuard>
                  <ProviderGuard>
                    <ProviderProfile />
                  </ProviderGuard>
                </AuthGuard>
              }
            />
            <Route
              path="/dashboard"
              element={
                <AuthGuard>
                  <DashboardRouter />
                </AuthGuard>
              }
            />
            <Route
              path="/provider-dashboard"
              element={
                <AuthGuard>
                  <ProviderGuard>
                    <ProviderDashboard />
                  </ProviderGuard>
                </AuthGuard>
              }
            />
            <Route
              path="/projects"
              element={
                <AuthGuard>
                  <CustomerGuard>
                    <CustomerProjects />
                  </CustomerGuard>
                </AuthGuard>
              }
            />
            <Route
              path="/projects/new"
              element={
                <AuthGuard>
                  <CustomerGuard>
                    <NewProject />
                  </CustomerGuard>
                </AuthGuard>
              }
            />
            <Route
              path="/projects/:id"
              element={
                <AuthGuard>
                  <CustomerGuard>
                    <ProjectDetails />
                  </CustomerGuard>
                </AuthGuard>
              }
            />
            <Route
              path="/projects/:id/edit"
              element={
                <AuthGuard>
                  <CustomerGuard>
                    <EditProject />
                  </CustomerGuard>
                </AuthGuard>
              }
            />
          </Routes>
        </div>
      </AppErrorBoundary>
    </Router>
  );
}

function DashboardRouter() {
  const { profile, providerProfile } = useAuthStore();
  
  if (!profile) {
    return <div>Loading...</div>;
  }

  if (profile.user_type === 'provider' && (!providerProfile?.business_name || !providerProfile?.business_description)) {
    return <Navigate to="/provider-profile" replace />;
  }

  return profile.user_type === 'provider' ? 
    <Navigate to="/provider-dashboard" replace /> : 
    <Dashboard />;
}

function ProviderGuard({ children }: { children: React.ReactNode }) {
  const { profile } = useAuthStore();

  if (!profile) {
    return <div>Loading...</div>;
  }

  if (profile.user_type !== 'provider') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function CustomerGuard({ children }: { children: React.ReactNode }) {
  const { profile } = useAuthStore();

  if (!profile) {
    return <div>Loading...</div>;
  }

  if (profile.user_type !== 'customer') {
    return <Navigate to="/provider-dashboard" replace />;
  }

  return <>{children}</>;
}

export default App;