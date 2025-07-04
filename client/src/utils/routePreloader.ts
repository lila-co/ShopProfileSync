
// Route preloader utility
export class RoutePreloader {
  private static preloadedRoutes = new Set<string>();

  static preloadRoute(routeName: string) {
    if (this.preloadedRoutes.has(routeName)) {
      return;
    }

    this.preloadedRoutes.add(routeName);

    switch (routeName) {
      case 'deals':
        import('./pages/deals');
        break;
      case 'retailers':
        import('./pages/retailers');
        break;
      case 'scan':
        import('./pages/scan');
        break;
      case 'profile':
        import('./pages/profile');
        break;
      case 'shopping-route':
        import('./pages/shopping-route');
        break;
      case 'auto-order':
        import('./pages/auto-order');
        break;
      case 'order-online':
        import('./pages/order-online');
        break;
      default:
        break;
    }
  }

  static preloadOnHover(routeName: string) {
    // Preload component when user hovers over navigation link
    return () => this.preloadRoute(routeName);
  }

  static preloadOnIdle() {
    // Preload non-critical routes when browser is idle
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        this.preloadRoute('deals');
        this.preloadRoute('retailers');
      });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        this.preloadRoute('deals');
        this.preloadRoute('retailers');
      }, 2000);
    }
  }
}
