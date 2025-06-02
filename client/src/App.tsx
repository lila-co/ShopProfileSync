import React from 'react';
import { Router, Route, Switch, Redirect } from 'wouter';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { queryClient } from '@/lib/queryClient';
import AuthPage from './pages/auth';
import Dashboard from './pages/dashboard';
import ShoppingListPage from './pages/shopping-list';
import DealsPage from './pages/deals';
import RetailersPage from './pages/retailers';
import ProfilePage from './pages/profile';

function AppContent() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/shopping-list">
        {isAuthenticated ? <ShoppingListPage /> : <Redirect to="/" />}
      </Route>
      <Route path="/dashboard">
        {isAuthenticated ? <Dashboard /> : <Redirect to="/" />}
      </Route>
      <Route path="/deals">
        {isAuthenticated ? <DealsPage /> : <Redirect to="/" />}
      </Route>
      <Route path="/retailers">
        {isAuthenticated ? <RetailersPage /> : <Redirect to="/" />}
      </Route>
      <Route path="/profile">
        {isAuthenticated ? <ProfilePage /> : <Redirect to="/" />}
      </Route>
      <Route path="/">
        {isAuthenticated ? <Redirect to="/shopping-list" /> : <AuthPage />}
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