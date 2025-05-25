import React from 'react';
import { Router, Route, Switch, Redirect } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import Dashboard from '@/pages/dashboard';
import ShoppingListPage from '@/pages/shopping-list';
import ScanPage from '@/pages/scan';
import DealsPage from '@/pages/deals';
import ProfilePage from '@/pages/profile';
import CircularsPage from '@/pages/circulars';
import ShopPage from '@/pages/shop';
import InsightsPage from '@/pages/insights';
import RecommendationsPage from '@/pages/recommendations';
import ExpirationTrackerPage from '@/pages/expiration-tracker';
import AdminSettings from '@/pages/admin-settings';
import AffiliateDashboard from '@/pages/affiliate-dashboard';
import InternalAnalytics from '@/pages/internal-analytics';
import AuthPage from '@/pages/auth';
import NotFound from '@/components/NotFound';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="App">
          <Switch>
            <Route path="/" component={() => <Redirect to="/dashboard" />} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/lists" component={ShoppingListPage} />
            <Route path="/scan" component={ScanPage} />
            <Route path="/deals" component={DealsPage} />
            <Route path="/profile" component={ProfilePage} />
            <Route path="/circulars" component={CircularsPage} />
            <Route path="/shop" component={ShopPage} />
            <Route path="/insights" component={InsightsPage} />
            <Route path="/recommendations" component={RecommendationsPage} />
            <Route path="/expiration-tracker" component={ExpirationTrackerPage} />
            <Route path="/admin" component={AdminSettings} />
            <Route path="/affiliate" component={AffiliateDashboard} />
            <Route path="/analytics" component={InternalAnalytics} />
            <Route path="/auth" component={AuthPage} />
            <Route component={NotFound} />
          </Switch>
        </div>
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;