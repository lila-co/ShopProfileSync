import React from 'react';
import { List, User, Store, Tag, ShoppingCart, Shield } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';

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
    { id: 'retailers', icon: Store, label: 'Stores', path: '/retailers' },
    { id: 'profile', icon: User, label: 'Profile', path: '/profile' },
  ];

  // Add admin tab if user has admin privileges
  const navItems = isAdmin 
    ? [...baseNavItems, { id: 'admin', icon: Shield, label: 'Admin', path: '/admin-profile' }]
    : baseNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 shadow-lg">
      <div className="max-w-md mx-auto flex justify-around items-center h-16 px-4">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <Link
              key={item.id}
              href={item.path}
              className={`flex flex-col items-center justify-center flex-1 py-2 px-1 rounded-lg transition-all duration-200 ${
                isActive 
                  ? 'text-blue-600 bg-blue-50 border border-blue-200' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <item.icon className={`h-6 w-6 mb-1 ${isActive ? 'text-blue-600' : ''}`} />
              <span className={`text-xs ${isActive ? 'text-blue-600 font-medium' : ''}`}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;