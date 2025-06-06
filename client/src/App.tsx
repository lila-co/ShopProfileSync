import React, { Suspense, lazy } from 'react';
import { Router, Route, Switch, Redirect } from 'wouter';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { queryClient } from '@/lib/queryClient';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
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
          <OnboardingPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/shopping-list">
        <ProtectedRoute>
          <ShoppingListPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/shopping-route">
        <ProtectedRoute>
          <ShoppingRoute />
        </ProtectedRoute>
      </Route>
      
      <Route path="/deals">
        <ProtectedRoute>
          <DealsPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/plan-details">
        <ProtectedRoute>
          <PlanDetailsPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/retailers">
        <ProtectedRoute>
          <RetailersPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/retailers/:id">
        <ProtectedRoute>
          <RetailerDetailsPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/profile">
        <ProtectedRoute>
          <ProfilePage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/scan">
        <ProtectedRoute>
          <ScanPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/auto-order">
        <ProtectedRoute>
          <AutoOrder />
        </ProtectedRoute>
      </Route>
      
      <Route path="/order-online">
        <ProtectedRoute>
          <OrderOnline />
        </ProtectedRoute>
      </Route>
      
      <Route path="/retailer-cart-demo">
        <ProtectedRoute>
          <RetailerCartDemo />
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
  );
}

export default App;