import React from 'react';
import { useLocation } from 'wouter';
import { User } from '@/lib/types';

interface HeaderProps {
  title?: string;
  user?: User;
}

const Header: React.FC<HeaderProps> = ({ title = "SmartCart", user }) => {
  const [, navigate] = useLocation();
  
  const handleNotifications = () => {
    // Implement notifications functionality
    console.log("Toggle notifications");
  };
  
  const handleProfileClick = () => {
    navigate('/profile');
  };
  
  // Get user initials for avatar
  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`;
    }
    return "SC";
  };
  
  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className="flex justify-between items-center px-4 py-3 border-b">
        <div className="flex items-center space-x-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
            <rect x="9" y="9" width="6" height="6" rx="1"/>
            <line x1="9" y1="1" x2="9" y2="5"/>
            <line x1="15" y1="1" x2="15" y2="5"/>
            <circle cx="9" cy="19" r="1"/>
            <circle cx="15" cy="19" r="1"/>
          </svg>
          <h1 className="font-bold text-lg">{title}</h1>
        </div>
        <div className="flex items-center space-x-4">
          <button 
            className="text-gray-600" 
            onClick={handleNotifications}
            aria-label="Notifications"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </button>
          <button 
            className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center"
            onClick={handleProfileClick}
            aria-label="Profile"
          >
            <span className="font-medium text-sm">{getInitials()}</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
