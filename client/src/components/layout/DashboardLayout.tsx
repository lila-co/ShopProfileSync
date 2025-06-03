import React from 'react';
import { Link, useLocation } from 'wouter';
import { 
  HomeIcon, 
  ListChecksIcon, 
  TrendingUpIcon, 
  UserIcon, 
  ScanIcon,
  ShoppingCartIcon,
  TagIcon,
  NewspaperIcon
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [location] = useLocation();

  const navigation = [
    { name: 'Shopping Lists', href: '/', icon: ListChecksIcon },
    { name: 'Scan Receipt', href: '/scan', icon: ScanIcon },
    { name: 'Deals', href: '/deals', icon: TagIcon },
    { name: 'Weekly Circulars', href: '/circulars', icon: NewspaperIcon },
    { name: 'Profile', href: '/profile', icon: UserIcon },
  ];
  
  const isActive = (path: string) => {
    return location === path;
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-16 overflow-y-auto bg-white dark:bg-gray-800 md:w-64 px-2 py-4 shadow-md">
        <div className="flex h-full flex-col justify-between">
          <div>
            {/* Logo */}
            <div className="flex items-center justify-center md:justify-start px-2 mb-8">
              <ShoppingCartIcon className="w-8 h-8 text-blue-500" />
              <span className="hidden md:ml-2 md:block text-xl font-bold text-blue-700 dark:text-blue-400">
                SmartCart
              </span>
            </div>
            
            {/* Navigation */}
            <nav className="space-y-2 px-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center p-2 rounded-lg transition-colors ${
                    isActive(item.href)
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <item.icon className="w-6 h-6 flex-shrink-0" />
                  <span className="hidden md:ml-3 md:block">{item.name}</span>
                </Link>
              ))}
            </nav>
          </div>
          
          {/* Admin link */}
          <div className="px-2">
            <Link 
              href="/internal/analytics" 
              className="flex items-center p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <TrendingUpIcon className="w-6 h-6 flex-shrink-0" />
              <span className="hidden md:ml-3 md:block">Analytics</span>
            </Link>
          </div>
        </div>
      </aside>
      
      {/* Main content */}
      <main className="flex-1 md:ml-64 ml-16">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;