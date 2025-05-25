import React from 'react';
import { Router, Route, Switch, Redirect } from 'wouter';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import Dashboard from '@/pages/dashboard';
import ShoppingListPage from '@/pages/shopping-list';
import ProfilePage from '@/pages/profile';
import NotFound from '@/pages/not-found';
import DealsPage from '@/pages/deals';
import { queryClient } from '@/lib/queryClient';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="App">
          <Switch>
            <Route path="/" component={() => <Redirect to="/dashboard" />} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/shopping-list" component={ShoppingListPage} />
            <Route path="/profile" component={ProfilePage} />
            <Route path="/deals" component={DealsPage} />
            <Route path="/retailers" component={Dashboard} />
            <Route component={NotFound} />
          </Switch>
        </div>
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;