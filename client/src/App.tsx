import React, { Suspense } from 'react';
import { Router, Route, Switch } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import ErrorBoundary from '@/components/ErrorBoundary';

// Import pages with lazy loading
import AuthPage from '@/pages/auth';
import DashboardPage from '@/pages/dashboard';
import ShoppingListPage from '@/pages/shopping-list';
import ProfilePage from '@/pages/profile';
import OnboardingPage from '@/pages/onboarding';
import NotFoundPage from '@/pages/not-found';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DealsPage from '@/pages/deals';
import CircularsPage from '@/pages/circulars';
import ExpirationTrackerPage from '@/pages/expiration-tracker';
import RetailersPage from '@/pages/retailers';
import RetailerDetailsPage from '@/pages/retailer-details';
import ScanPage from '@/pages/scan';
import PlanDetailsPage from '@/pages/plan-details';
import ShoppingRoutePage from '@/pages/shopping-route';
import AutoOrderPage from '@/pages/auto-order';
import OrderOnlinePage from '@/pages/order-online';
import RetailerCartDemoPage from '@/pages/retailer-cart-demo';
import AdminProfilePage from '@/pages/admin-profile';
import AdminSettingsPage from '@/pages/admin-settings';
import MonitoringDashboardPage from '@/pages/monitoring-dashboard';
import InternalAnalyticsPage from '@/pages/internal-analytics';
import AffiliateDashboardPage from '@/pages/affiliate-dashboard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/onboarding">
        <ProtectedRoute>
          <OnboardingPage />
        </ProtectedRoute>
      </Route>
      <Route path="/">
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      </Route>
      <Route path="/shopping-list">
        <ProtectedRoute>
          <ShoppingListPage />
        </ProtectedRoute>
      </Route>
      <Route path="/profile">
        <ProtectedRoute>
          <ProfilePage />
        </ProtectedRoute>
      </Route>
      <Route path="/deals">
        <ProtectedRoute>
          <DealsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/circulars">
        <ProtectedRoute>
          <CircularsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/expiration-tracker">
        <ProtectedRoute>
          <ExpirationTrackerPage />
        </ProtectedRoute>
      </Route>
      <Route path="/retailers">
        <ProtectedRoute>
          <RetailersPage />
        </ProtectedRoute>
      </Route>
      <Route path="/retailer/:id">
        <ProtectedRoute>
          <RetailerDetailsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/scan">
        <ProtectedRoute>
          <ScanPage />
        </ProtectedRoute>
      </Route>
      <Route path="/plan-details">
        <ProtectedRoute>
          <PlanDetailsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/shopping-route">
        <ProtectedRoute>
          <ShoppingRoutePage />
        </ProtectedRoute>
      </Route>
      <Route path="/auto-order">
        <ProtectedRoute>
          <AutoOrderPage />
        </ProtectedRoute>
      </Route>
      <Route path="/order-online">
        <ProtectedRoute>
          <OrderOnlinePage />
        </ProtectedRoute>
      </Route>
      <Route path="/retailer-cart-demo">
        <ProtectedRoute>
          <RetailerCartDemoPage />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/profile">
        <ProtectedRoute>
          <AdminProfilePage />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/settings">
        <ProtectedRoute>
          <AdminSettingsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/monitoring">
        <ProtectedRoute>
          <MonitoringDashboardPage />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/analytics">
        <ProtectedRoute>
          <InternalAnalyticsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/affiliate/dashboard">
        <ProtectedRoute>
          <AffiliateDashboardPage />
        </ProtectedRoute>
      </Route>
      <Route component={NotFoundPage} />
    </Switch>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AuthProvider>
            <div className="App">
              <AppContent />
              <Toaster />
            </div>
          </AuthProvider>
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;