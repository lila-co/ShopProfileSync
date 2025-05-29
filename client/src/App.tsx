import React from 'react';
import { Router, Route, Switch, Redirect } from 'wouter';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import Dashboard from '@/pages/dashboard';
import ShoppingListPage from '@/pages/shopping-list';
import ProfilePage from '@/pages/profile';
import NotFound from '@/pages/not-found';
import DealsPage from '@/pages/deals';
import RetailersPage from '@/pages/retailers';
import InsightsPage from '@/pages/insights';
import RecommendationsPage from '@/pages/recommendations';
import InternalAnalytics from '@/pages/internal-analytics';
import AdminSettings from '@/pages/admin-settings';
import AdminProfile from '@/pages/admin-profile';
import AffiliateDashboard from '@/pages/affiliate-dashboard';
import { queryClient } from '@/lib/queryClient';
import Shop from '@/pages/shop'; // Import the Shop component
import ShoppingRoute from '@/pages/shopping-route'; // Import the ShoppingRoute component
import RetailerDetailsPage from '@/pages/retailer-details';
import AutoOrder from '@/pages/auto-order'; // Import the AutoOrder component

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
            <Route path="/retailers" component={RetailersPage} />
            <Route path="/retailers/:id" component={RetailerDetailsPage} />
            <Route path="/insights" component={InsightsPage} />
            <Route path="/recommendations" component={RecommendationsPage} />
            <Route path="/internal/analytics" component={InternalAnalytics} />
            <Route path="/admin-settings" component={AdminSettings} />
            <Route path="/admin-profile" component={AdminProfile} />
            <Route path="/affiliate-dashboard" component={AffiliateDashboard} />
            <Route path="/shop" component={Shop} />
            <Route path="/shopping-route" component={ShoppingRoute} />
            <Route path="/auto-order" component={AutoOrder} />
            <Route component={NotFound} />
          </Switch>
        </div>
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;