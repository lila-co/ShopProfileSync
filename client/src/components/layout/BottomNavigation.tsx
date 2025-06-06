import React from 'react';
import { Home, List, User, Store, Tag, ShoppingCart } from 'lucide-react';
import { Link, useLocation } from 'wouter';

interface BottomNavigationProps {
  activeTab: string;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ activeTab }) => {
  const [, navigate] = useLocation();

  React.useEffect(() => {
    // Preload routes on idle
    RoutePreloader.preloadOnIdle();
  }, []);

  const navItems = [
    { id: 'shopping-list', icon: List, label: 'List', path: '/shopping-list' },
    { id: 'deals', icon: Tag, label: 'Deals', path: '/deals' },
    { id: 'scan', icon: ShoppingCart, label: 'Scan', path: '/scan' },
    { id: 'retailers', icon: Store, label: 'Stores', path: '/retailers' },
    { id: 'profile', icon: User, label: 'Profile', path: '/profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 shadow-lg">
      <div className="max-w-md mx-auto flex justify-around items-center h-16 px-4">
        {navItems.map((item) => (
          <Link
            key={item.id}
            href={item.path}
            className="flex flex-col items-center justify-center flex-1 py-2 px-1 rounded-lg transition-all duration-200 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            onMouseEnter={() => RoutePreloader.preloadRoute(item.path)}
          >
            <item.icon className="h-6 w-6 mb-1" />
            <span className="text-xs">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default BottomNavigation;