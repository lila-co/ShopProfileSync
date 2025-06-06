import React, { Suspense, lazy } from 'react';
import { Router, Route, Switch, Redirect } from 'wouter';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { queryClient } from '@/lib/queryClient';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import ErrorBoundary from '@/components/ErrorBoundary';
import AsyncErrorBoundary from '@/components/AsyncErrorBoundary';
import AuthPage from './pages/auth';
import OnboardingPage from './pages/onboarding';
import ShoppingListPage from './pages/shopping-list';
import DealsPage from './pages/deals';
import RetailersPage from './pages/retailers';
import ProfilePage from './pages/profile';
import ScanPage from '@/pages/scan';

import ShoppingRoute from './pages/shopping-route';
import PlanDetailsPage from '@/pages/plan-details';
import RetailerDetailsPage from './pages/retailer-details';
import AutoOrder from '@/pages/auto-order';
import OrderOnline from '@/pages/order-online';
const RetailerCartDemo = lazy(() => import('./pages/retailer-cart-demo'));
import MonitoringDashboard from '@/pages/monitoring-dashboard';

function AppContent() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <Switch>
      <Route path="/onboarding">
        <ProtectedRoute>
          <ErrorBoundary level="page">
            <OnboardingPage />
          </ErrorBoundary>
        </ProtectedRoute>
      </Route>

      <Route path="/shopping-list">
        <ProtectedRoute>
          <ErrorBoundary level="page">
            <ShoppingListPage />
          </ErrorBoundary>
        </ProtectedRoute>
      </Route>

      <Route path="/shopping-route">
        <ProtectedRoute>
          <ErrorBoundary level="page">
            <ShoppingRoute />
          </ErrorBoundary>
        </ProtectedRoute>
      </Route>

      <Route path="/deals">
        <ProtectedRoute>
          <ErrorBoundary level="page">
            <DealsPage />
          </ErrorBoundary>
        </ProtectedRoute>
      </Route>

      <Route path="/plan-details">
        <ProtectedRoute>
          <ErrorBoundary level="page">
            <PlanDetailsPage />
          </ErrorBoundary>
        </ProtectedRoute>
      </Route>

      <Route path="/retailers">
        <ProtectedRoute>
          <ErrorBoundary level="page">
            <RetailersPage />
          </ErrorBoundary>
        </ProtectedRoute>
      </Route>

      <Route path="/retailers/:id">
        <ProtectedRoute>
          <ErrorBoundary level="page">
            <RetailerDetailsPage />
          </ErrorBoundary>
        </ProtectedRoute>
      </Route>

      <Route path="/profile">
        <ProtectedRoute>
          <ErrorBoundary level="page">
            <ProfilePage />
          </ErrorBoundary>
        </ProtectedRoute>
      </Route>

      <Route path="/scan">
        <ProtectedRoute>
          <ErrorBoundary level="page">
            <ScanPage />
          </ErrorBoundary>
        </ProtectedRoute>
      </Route>

      <Route path="/auto-order">
        <ProtectedRoute>
          <ErrorBoundary level="page">
            <AutoOrder />
          </ErrorBoundary>
        </ProtectedRoute>
      </Route>

      <Route path="/order-online">
        <ProtectedRoute>
          <ErrorBoundary level="page">
            <OrderOnline />
          </ErrorBoundary>
        </ProtectedRoute>
      </Route>

      <Route path="/retailer-cart-demo">
        <ProtectedRoute>
          <ErrorBoundary level="page">
            <AsyncErrorBoundary>
              <Suspense fallback={<div className="flex items-center justify-center p-8">Loading...</div>}>
                <RetailerCartDemo />
              </Suspense>
            </AsyncErrorBoundary>
          </ErrorBoundary>
        </ProtectedRoute>
      </Route>
      
      <Route path="/admin/monitoring">
        <ProtectedRoute>
          <MonitoringDashboard />
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