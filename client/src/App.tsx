import React from 'react';
import { Router, Route, Switch, Redirect } from 'wouter';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Dashboard from '@/pages/dashboard';
import ShoppingListPage from '@/pages/shopping-list';
import ProfilePage from '@/pages/profile';
import NotFound from '@/pages/not-found';
import DealsPage from '@/pages/deals';
import RetailersPage from '@/pages/retailers';
import RecommendationsPage from '@/pages/recommendations';
import InternalAnalytics from '@/pages/internal-analytics';
import AdminSettings from '@/pages/admin-settings';
import AdminProfile from '@/pages/admin-profile';
import AffiliateDashboard from '@/pages/affiliate-dashboard';
import { queryClient } from '@/lib/queryClient';
import Shop from '@/pages/shop';
import ShoppingRoute from '@/pages/shopping-route';
import AutoOrder from './pages/auto-order';
import PlanDetails from './pages/plan-details';
import RetailerDetailsPage from './pages/retailer-details';
import AuthPage from './pages/auth';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <div className="App">
            <Switch>
              <Route path="/login" component={AuthPage} />
              <Route path="/">
                <ProtectedRoute>
                  <ShoppingListPage />
                </ProtectedRoute>
              </Route>
              <Route path="/shopping-list">
                <ProtectedRoute>
                  <ShoppingListPage />
                </ProtectedRoute>
              </Route>
              <Route path="/dashboard">
                <ProtectedRoute>
                  <Dashboard />
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
              <Route path="/recommendations">
                <ProtectedRoute>
                  <RecommendationsPage />
                </ProtectedRoute>
              </Route>
              <Route path="/internal/analytics">
                <ProtectedRoute>
                  <InternalAnalytics />
                </ProtectedRoute>
              </Route>
              <Route path="/admin-settings">
                <ProtectedRoute>
                  <AdminSettings />
                </ProtectedRoute>
              </Route>
              <Route path="/admin-profile">
                <ProtectedRoute>
                  <AdminProfile />
                </ProtectedRoute>
              </Route>
              <Route path="/affiliate-dashboard">
                <ProtectedRoute>
                  <AffiliateDashboard />
                </ProtectedRoute>
              </Route>
              <Route path="/shop">
                <ProtectedRoute>
                  <Shop />
                </ProtectedRoute>
              </Route>
              <Route path="/shopping-route">
                <ProtectedRoute>
                  <ShoppingRoute />
                </ProtectedRoute>
              </Route>
              <Route path="/auto-order">
                <ProtectedRoute>
                  <AutoOrder />
                </ProtectedRoute>
              </Route>
              <Route path="/plan-details">
                <ProtectedRoute>
                  <PlanDetails />
                </ProtectedRoute>
              </Route>
              <Route component={NotFound} />
            </Switch>
          </div>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;