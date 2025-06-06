
import { lazy } from 'react';

// Heavy UI components that can be loaded on demand
export const LazyUIComponents = {
  UserManagement: lazy(() => import('@/components/admin/UserManagement')),
  ReceiptScanner: lazy(() => import('@/components/receipt/ReceiptScanner')),
  StoreLinking: lazy(() => import('@/components/stores/StoreLinking')),
  RetailerLinking: lazy(() => import('@/components/profile/RetailerLinking')),
};

// Chart components (if any heavy charting libraries are used)
export const LazyChartComponents = {
  // Add any heavy chart components here when needed
};
