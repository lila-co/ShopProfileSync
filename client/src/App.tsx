import React, { Suspense, lazy } from 'react';
import { Router, Route, Switch, Redirect } from 'wouter';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { queryClient } from '@/lib/queryClient';
import AuthPage from './pages/auth';
import OnboardingPage from './pages/onboarding';
import ShoppingListPage from './pages/shopping-list';
import DealsPage from './pages/deals';
import RetailersPage from './pages/retailers';
import ProfilePage from './pages/profile';
import ScanPage from '@/pages/scan';
import ShopPage from './pages/shop';
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
      <Route path="/shopping-list" component={ShoppingListPage} />
      <Route path="/shop" component={ShopPage} />
      <Route path="/shopping-route" component={ShoppingRoute} />
      <Route path="/deals" component={DealsPage} />
      <Route path="/plan-details" component={PlanDetailsPage} />
      <Route path="/retailers" component={RetailersPage} />
      <Route path="/retailers/:id" component={RetailerDetailsPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/scan" component={ScanPage} />
      <Route path="/onboarding" component={OnboardingPage} />
      <Route path="/auto-order" component={AutoOrder} />
      <Route path="/order-online" component={OrderOnline} />
      <Route path="/retailer-cart-demo" component={RetailerCartDemo} />
      <Route path="/" component={() => <Redirect to="/shopping-list" />} />
      <Route component={() => <Redirect to="/shopping-list" />} />
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