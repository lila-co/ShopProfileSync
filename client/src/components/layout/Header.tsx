import React from 'react';
import { ArrowLeft, Bell, Search } from 'lucide-react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { useLocation } from 'wouter';
import AuthenticatedHeader from './AuthenticatedHeader';

interface HeaderProps {
  title: string;
  showBackButton?: boolean;
  showSearch?: boolean;
  showNotifications?: boolean;
  onBack?: () => void;
  showAuth?: boolean;
  rightContent?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({ 
  title, 
  showBackButton = false, 
  showSearch = false, 
  showNotifications = true,
  showAuth = false,
  onBack,
  rightContent
}) => {
  if (showAuth) {
    return <AuthenticatedHeader />;
  }

  const [, navigate] = useLocation();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center">
        {showBackButton && (
          <button 
            onClick={handleBack}
            className="mr-3 p-1 hover:bg-gray-100 rounded-full"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
        )}
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
      </div>
      <div className="flex items-center space-x-2">
        {showSearch && (
          <Button variant="ghost" size="sm">
            <Search className="h-5 w-5" />
          </Button>
        )}
        {showNotifications && (
          <Button variant="ghost" size="sm">
            <Bell className="h-5 w-5" />
          </Button>
        )}
      </div>
    </header>
  );
};

export default Header;