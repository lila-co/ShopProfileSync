import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import ShoppingList from "@/pages/shopping-list";
import Deals from "@/pages/deals";
import Circulars from "@/pages/circulars";
import Profile from "@/pages/profile";
import Scan from "@/pages/scan";
import Shop from "@/pages/shop";
import InternalAnalytics from "@/pages/internal-analytics";
import AdminSettings from "@/pages/admin-settings";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/lists" component={ShoppingList} />
      <Route path="/scan" component={Scan} />
      <Route path="/shop" component={Shop} />
      <Route path="/deals" component={Deals} />
      <Route path="/circulars" component={Circulars} />
      <Route path="/profile" component={Profile} />
      <Route path="/internal/analytics" component={InternalAnalytics} />
      <Route path="/admin-settings" component={AdminSettings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
