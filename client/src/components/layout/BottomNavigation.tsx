import React from 'react';
import { List, User, Store, Tag, ShoppingCart, Shield } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface BottomNavigationProps {
  activeTab: string;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ activeTab }) => {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  // Check if user has admin access
  const isAdmin = user && (
    user.role === 'owner' || 
    user.role === 'admin' || 
    user.role === 'employee' || 
    user.username === 'admin' || 
    user.isAdmin === true
  );

  const baseNavItems = [
    { id: 'shopping-list', icon: List, label: 'List', path: '/shopping-list' },
    { id: 'deals', icon: Tag, label: 'Deals', path: '/deals' },
    { id: 'plan-details', icon: ShoppingCart, label: 'Shop Now', path: '/plan-details' },
    { id: 'profile', icon: User, label: 'Profile', path: '/profile' },
  ];

  // Add admin tab if user has admin privileges
  const navItems = isAdmin 
    ? [...baseNavItems, { id: 'admin', icon: Shield, label: 'Admin', path: '/admin-profile' }]
    : baseNavItems;

  return (
    <nav className="glass-nav fixed bottom-0 left-0 right-0 z-40 border-t border-glass-border safe-bottom">
      <div className="grid grid-cols-5 h-16">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center space-y-1 transition-colors",
                isActive
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              )}
            >
              <item.icon className={`h-6 w-6 mb-1 ${isActive ? 'text-blue-600' : ''}`} />
              <span className={`text-xs text-center leading-tight ${isActive ? 'text-blue-600 font-medium' : ''}`}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;