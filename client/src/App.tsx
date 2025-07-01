import React, { Suspense, lazy } from 'react';
import { Router, Route, Switch, Redirect } from 'wouter';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { queryClient } from '@/lib/queryClient';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import ErrorBoundary from '@/components/ErrorBoundary';
import AsyncErrorBoundary from '@/components/AsyncErrorBoundary';
import SimpleDashboard from '@/pages/simple-dashboard';
import ShoppingListSimple from '@/components/lists/ShoppingListSimple';
import { useEffect } from 'react';

// Import lazy-loaded components organized by feature groups
import { 
  CorePages, 
  ShoppingPages, 
  AdvancedPages, 
  AdminPages, 
  OnboardingPages,
  preloadCriticalComponents 
} from '@/utils/lazyImports';

// Loading fallback component
const PageLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <div className="text-lg text-gray-600">Loading...</div>
    </div>
  </div>
);

function AppContent() {
  const { isLoading, isAuthenticated } = useAuth();

  // Preload critical components when authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      preloadCriticalComponents();
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return <PageLoadingFallback />;
  }

  if (!isAuthenticated) {
    return (
      <Suspense fallback={<PageLoadingFallback />}>
        <CorePages.Auth />
      </Suspense>
    );
  }

  return (
    <Switch>
      <Route path="/onboarding">
        <ProtectedRoute>
          <ErrorBoundary level="page">
            <Suspense fallback={<PageLoadingFallback />}>
              <OnboardingPages.Onboarding />
            </Suspense>
          </ErrorBoundary>
        </ProtectedRoute>
      </Route>

      <Route path="/dashboard">
        <ProtectedRoute>
          <ErrorBoundary level="page">
            <Suspense fallback={<PageLoadingFallback />}>
              <CorePages.Dashboard />
            </Suspense>
          </ErrorBoundary>
        </ProtectedRoute>
      </Route>

      <Route path="/shopping-list">
        <ProtectedRoute>
          <ErrorBoundary level="page">
            <Suspense fallback={<PageLoadingFallback />}>
              <CorePages.ShoppingList />
            </Suspense>
          </ErrorBoundary>
        </ProtectedRoute>
      </Route>

      <Route path="/shopping-route">
        <ProtectedRoute>
          <ErrorBoundary level="page">
            <Suspense fallback={<PageLoadingFallback />}>
              <ShoppingPages.ShoppingRoute />
            </Suspense>
          </ErrorBoundary>
        </ProtectedRoute>
      </Route>

      <Route path="/deals">
        <ProtectedRoute>
          <ErrorBoundary level="page">
            <Suspense fallback={<PageLoadingFallback />}>
              <ShoppingPages.Deals />
            </Suspense>
          </ErrorBoundary>
        </ProtectedRoute>
      </Route>

      <Route path="/plan-details">
        <ProtectedRoute>
          <ErrorBoundary level="page">
            <Suspense fallback={<PageLoadingFallback />}>
              <ShoppingPages.PlanDetails />
            </Suspense>
          </ErrorBoundary>
        </ProtectedRoute>
      </Route>

      <Route path="/retailers">
        <ProtectedRoute>
          <ErrorBoundary level="page">
            <Suspense fallback={<PageLoadingFallback />}>
              <ShoppingPages.Retailers />
            </Suspense>
          </ErrorBoundary>
        </ProtectedRoute>
      </Route>

      <Route path="/retailers/:id">
        <ProtectedRoute>
          <ErrorBoundary level="page">
            <Suspense fallback={<PageLoadingFallback />}>
              <ShoppingPages.RetailerDetails />
            </Suspense>
          </ErrorBoundary>
        </ProtectedRoute>
      </Route>

      <Route path="/profile">
        <ProtectedRoute>
          <ErrorBoundary level="page">
            <Suspense fallback={<PageLoadingFallback />}>
              <CorePages.Profile />
            </Suspense>
          </ErrorBoundary>
        </ProtectedRoute>
      </Route>

      <Route path="/admin-profile">
        <ProtectedRoute>
          <ErrorBoundary level="page">
            <Suspense fallback={<PageLoadingFallback />}>
              <AdminPages.AdminProfile />
            </Suspense>
          </ErrorBoundary>
        </ProtectedRoute>
      </Route>

      <Route path="/scan">
        <ProtectedRoute>
          <ErrorBoundary level="page">
            <Suspense fallback={<PageLoadingFallback />}>
              <ShoppingPages.Scan />
            </Suspense>
          </ErrorBoundary>
        </ProtectedRoute>
      </Route>

      <Route path="/auto-order">
        <ProtectedRoute>
          <ErrorBoundary level="page">
            <Suspense fallback={<PageLoadingFallback />}>
              <AdvancedPages.AutoOrder />
            </Suspense>
          </ErrorBoundary>
        </ProtectedRoute>
      </Route>

      <Route path="/order-online">
        <ProtectedRoute>
          <ErrorBoundary level="page">
            <Suspense fallback={<PageLoadingFallback />}>
              <AdvancedPages.OrderOnline />
            </Suspense>
          </ErrorBoundary>
        </ProtectedRoute>
      </Route>

      <Route path="/retailer-cart-demo">
        <ProtectedRoute>
          <ErrorBoundary level="page">
            <AsyncErrorBoundary>
              <Suspense fallback={<PageLoadingFallback />}>
                <AdvancedPages.RetailerCartDemo />
              </Suspense>
            </AsyncErrorBoundary>
          </ErrorBoundary>
        </ProtectedRoute>
      </Route>

      <Route path="/admin-settings">
        <ProtectedRoute>
          <ErrorBoundary level="page">
            <Suspense fallback={<PageLoadingFallback />}>
              <AdminPages.AdminSettings />
            </Suspense>
          </ErrorBoundary>
        </ProtectedRoute>
      </Route>

      <Route path="/admin/monitoring">
        <ProtectedRoute>
          <ErrorBoundary level="page">
            <Suspense fallback={<PageLoadingFallback />}>
              <AdminPages.MonitoringDashboard />
            </Suspense>
          </ErrorBoundary>
        </ProtectedRoute>
      </Route>

      <Route path="/internal/analytics">
        <ProtectedRoute>
          <ErrorBoundary level="page">
            <Suspense fallback={<PageLoadingFallback />}>
              <AdminPages.InternalAnalytics />
            </Suspense>
          </ErrorBoundary>
        </ProtectedRoute>
      </Route>
      <Route path="/simple-dashboard">
        <ProtectedRoute>
          <SimpleDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/simple-list">
        <ProtectedRoute>
          <ShoppingListSimple />
        </ProtectedRoute>
      </Route>

      <Route path="/">
        <ProtectedRoute>
          <Redirect to="/shopping-list" />
        </ProtectedRoute>
      </Route>

      <Route>
        <ProtectedRoute>
          <Redirect to="/shopping-list" />
        </ProtectedRoute>
      </Route>
    </Switch>
  );
}

function App() {
  // Keep-alive functionality to prevent timeout during reviews
  useEffect(() => {
    const keepAlive = setInterval(() => {
      fetch('/api/shopping-list')
        .then(() => console.log('Session keep-alive'))
        .catch(() => console.log('Keep-alive failed'));
    }, 4 * 60 * 1000); // Every 4 minutes

    return () => clearInterval(keepAlive);
  }, []);

  return (
    <ErrorBoundary level="app">
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
}

export default App;