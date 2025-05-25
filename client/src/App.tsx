import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import NotFound from '@/pages/not-found';
import AdminSettings from '@/pages/admin-settings';
import AffiliateDashboard from '@/pages/affiliate-dashboard';
import InternalAnalytics from '@/pages/internal-analytics';
import AuthPage from '@/pages/auth';

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
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/lists" element={<ShoppingListPage />} />
            <Route path="/scan" element={<ScanPage />} />
            <Route path="/deals" element={<DealsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/circulars" element={<CircularsPage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/recommendations" element={<RecommendationsPage />} />
            <Route path="/admin" element={<AdminSettings />} />
            <Route path="/affiliate" element={<AffiliateDashboard />} />
            <Route path="/analytics" element={<InternalAnalytics />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;