import React from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft } from 'lucide-react';

interface HeaderProps {
  title: string;
  rightContent?: React.ReactNode;
  showBackButton?: boolean;
}

const Header: React.FC<HeaderProps> = ({ title, rightContent, showBackButton = false }) => {
  const [, navigate] = useLocation();

  const handleBack = () => {
    navigate(-1);
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
      {rightContent && <div>{rightContent}</div>}
    </header>
  );
};

export default Header;