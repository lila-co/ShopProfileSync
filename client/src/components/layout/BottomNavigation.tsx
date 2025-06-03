import React from 'react';
import { Home, List, User, Store, Tag, ShoppingCart } from 'lucide-react';
import { Link, useLocation } from 'wouter';

interface BottomNavigationProps {
  activeTab: 'lists' | 'profile' | 'stores' | 'deals' | 'shop';
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ activeTab }) => {
  const location = useLocation();
  const tabs = [
    { id: 'lists', label: 'Home', icon: Home, href: '/shopping-list' },
    { id: 'deals', label: 'Deals', icon: Tag, href: '/deals' },
    { id: 'shop', label: 'Shop Now', icon: ShoppingCart, href: '/plan-details?listId=1&planType=balanced' },
    { id: 'stores', label: 'Stores', icon: Store, href: '/retailers' },
    { id: 'profile', label: 'Profile', icon: User, href: '/profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 shadow-lg">
      <div className="max-w-md mx-auto flex justify-around items-center h-16 px-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <Link
              key={tab.id}
              to={tab.href}
              className={`flex flex-col items-center justify-center flex-1 py-2 px-1 rounded-lg transition-all duration-200 ${
                isActive || location.pathname === tab.href
                  ? 'text-primary bg-primary/10 scale-105'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon className={`h-6 w-6 mb-1 transition-all duration-200 ${
                isActive ? 'text-primary scale-110' : ''
              }`} />
              <span className={`text-xs transition-all duration-200 ${
                isActive ? 'font-semibold text-primary' : 'font-normal'
              }`}>
                {tab.label}
              </span>
              {isActive && (
                <div className="w-4 h-0.5 bg-primary rounded-full mt-1 animate-pulse"></div>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;