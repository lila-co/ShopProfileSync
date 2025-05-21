import React from 'react';
import { useLocation } from 'wouter';

type Tab = 'home' | 'lists' | 'scan' | 'deals' | 'profile';

interface BottomNavigationProps {
  activeTab: Tab;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ activeTab }) => {
  const [, navigate] = useLocation();
  
  const handleTabClick = (tab: Tab) => {
    switch(tab) {
      case 'home':
        navigate('/');
        break;
      case 'lists':
        navigate('/lists');
        break;
      case 'scan':
        navigate('/scan');
        break;
      case 'deals':
        navigate('/deals');
        break;
      case 'profile':
        navigate('/profile');
        break;
    }
  };
  
  return (
    <nav className="bg-white border-t border-gray-200 fixed bottom-0 left-0 right-0 z-10">
      <div className="max-w-md mx-auto px-4 pb-1">
        <div className="flex justify-between items-center">
          <button 
            className={`py-2 flex flex-col items-center w-1/5 ${activeTab === 'home' ? 'text-primary' : 'text-gray-400'}`}
            onClick={() => handleTabClick('home')}
            aria-label="Home"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span className="text-xs font-medium mt-1">Home</span>
          </button>
          
          <button 
            className={`py-2 flex flex-col items-center w-1/5 ${activeTab === 'lists' ? 'text-primary' : 'text-gray-400'}`}
            onClick={() => handleTabClick('lists')}
            aria-label="Lists"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="2"/>
              <line x1="9" y1="12" x2="15" y2="12"/>
              <line x1="9" y1="16" x2="15" y2="16"/>
            </svg>
            <span className="text-xs font-medium mt-1">Lists</span>
          </button>
          
          <button 
            className={`py-2 flex flex-col items-center w-1/5`}
            onClick={() => handleTabClick('scan')}
            aria-label="Scan"
          >
            <div className="bg-primary text-white rounded-full h-12 w-12 flex items-center justify-center -mt-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7V5a2 2 0 0 1 2-2h2"/>
                <path d="M17 3h2a2 2 0 0 1 2 2v2"/>
                <path d="M21 17v2a2 2 0 0 1-2 2h-2"/>
                <path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
                <line x1="8" x2="16" y1="12" y2="12"/>
              </svg>
            </div>
            <span className={`text-xs font-medium mt-1 ${activeTab === 'scan' ? 'text-primary' : 'text-gray-400'}`}>Scan</span>
          </button>
          
          <button 
            className={`py-2 flex flex-col items-center w-1/5 ${activeTab === 'deals' ? 'text-primary' : 'text-gray-400'}`}
            onClick={() => handleTabClick('deals')}
            aria-label="Deals"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            <span className="text-xs font-medium mt-1">Deals</span>
          </button>
          
          <button 
            className={`py-2 flex flex-col items-center w-1/5 ${activeTab === 'profile' ? 'text-primary' : 'text-gray-400'}`}
            onClick={() => handleTabClick('profile')}
            aria-label="Profile"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span className="text-xs font-medium mt-1">Profile</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default BottomNavigation;
