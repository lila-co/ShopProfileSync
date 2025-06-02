import React from 'react';
import { Router, Route, Switch } from 'wouter';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import { queryClient } from '@/lib/queryClient';
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
                <div>Loading...</div>
              </Route>
            </Switch>
            <Toaster />
          </div>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;