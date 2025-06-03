import React from 'react';
import { Router, Route, Switch, Redirect } from 'wouter';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { queryClient } from '@/lib/queryClient';
import AuthPage from './pages/auth';
import ShoppingListPage from './pages/shopping-list';
import DealsPage from './pages/deals';
import RetailersPage from './pages/retailers';
import ProfilePage from './pages/profile';
import ScanPage from '@/pages/scan';
import ShopPage from '@/pages/shop';

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
      <Route path="/deals" component={DealsPage} />
      <Route path="/shop" component={ShopPage} />
      <Route path="/retailers" component={RetailersPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/scan" component={ScanPage} />
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