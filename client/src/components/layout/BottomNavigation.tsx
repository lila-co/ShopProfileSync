import React from 'react';
import { Home, List, User, Store, Tag } from 'lucide-react';

interface BottomNavigationProps {
  activeTab: 'home' | 'lists' | 'profile' | 'stores' | 'deals';
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ activeTab }) => {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home, href: '/' },
    { id: 'stores', label: 'Stores', icon: Store, href: '/retailers' },
    { id: 'lists', label: 'Lists', icon: List, href: '/shopping-list' },
    { id: 'deals', label: 'Weekly Deals', icon: Tag, href: '/deals' },
    { id: 'profile', label: 'Profile', icon: User, href: '/profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="max-w-md mx-auto flex justify-around items-center h-16 px-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <a
              key={tab.id}
              href={tab.href}
              className={`flex flex-col items-center justify-center flex-1 py-1 ${
                isActive 
                  ? 'text-primary' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className={`h-6 w-6 mb-1 ${isActive ? 'text-primary' : ''}`} />
              <span className={`text-xs ${isActive ? 'font-medium' : ''}`}>
                {tab.label}
              </span>
            </a>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;