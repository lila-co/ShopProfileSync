import { lazy } from "react";

// Core pages - loaded immediately after auth
export const CorePages = {
  Auth: lazy(() => import("../pages/auth")),
  Dashboard: lazy(() => import("../pages/dashboard")),
  ShoppingList: lazy(() => import("../pages/shopping-list")),
  Profile: lazy(() => import("../pages/profile")),
};

// Shopping features - grouped together
export const ShoppingPages = {
  Deals: lazy(() => import("../pages/deals")),
  Retailers: lazy(() => import("../pages/retailers")),
  RetailerDetails: lazy(() => import("../pages/retailer-details")),
  ShoppingRoute: lazy(() => import("../pages/shopping-route")),
  Scan: lazy(() => import("../pages/scan")),
  PlanDetails: lazy(() => import("../pages/plan-details")),
};

// Advanced features - separate chunk
export const AdvancedPages = {
  AutoOrder: lazy(() => import("../pages/auto-order")),
  OrderOnline: lazy(() => import("../pages/order-online")),
  RetailerCartDemo: lazy(() => import("../pages/retailer-cart-demo")),
};

// Admin features - separate chunk
export const AdminPages = {
  AdminProfile: lazy(() => import("../pages/admin-profile")),
  AdminSettings: lazy(() => import("../pages/admin-settings")),
  MonitoringDashboard: lazy(() => import("../pages/monitoring-dashboard")),
  InternalAnalytics: lazy(() => import("../pages/internal-analytics")),
};

// Onboarding - separate chunk
export const OnboardingPages = {
  Onboarding: lazy(() => import("../pages/onboarding")),
};

// Preload critical components for better UX
export const preloadCriticalComponents = () => {
  import("../pages/shopping-list");
  import("../pages/profile");
};
