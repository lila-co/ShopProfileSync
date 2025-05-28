import React from 'react';
import { DealsSummary } from '@/lib/types';
import { useLocation } from 'wouter';
import { Card } from '@/components/ui/card';

interface StoreCardProps {
  storeDeal: DealsSummary;
}

const StoreCard: React.FC<StoreCardProps> = ({ storeDeal }) => {
  const [, navigate] = useLocation();

  const getColorClasses = () => {
    const colorMap: Record<string, { bg: string, icon: string }> = {
      blue: { bg: 'bg-blue-100', icon: 'text-blue-600' },
      red: { bg: 'bg-red-100', icon: 'text-red-600' },
      green: { bg: 'bg-green-100', icon: 'text-green-600' },
      yellow: { bg: 'bg-yellow-100', icon: 'text-yellow-600' },
      purple: { bg: 'bg-purple-100', icon: 'text-purple-600' },
      pink: { bg: 'bg-pink-100', icon: 'text-pink-600' },
      indigo: { bg: 'bg-indigo-100', icon: 'text-indigo-600' },
      gray: { bg: 'bg-gray-100', icon: 'text-gray-600' },
    };

    return colorMap[storeDeal.logoColor] || colorMap.blue;
  };

  const colorClasses = getColorClasses();

  return (
    <Card 
      className="flex-shrink-0 w-28 sm:w-32 md:w-36 overflow-hidden border border-gray-100 cursor-pointer"
      onClick={() => navigate(`/deals/${storeDeal.retailerId}`)}
    >
      <div className={`h-16 sm:h-18 md:h-20 ${colorClasses.bg} flex items-center justify-center p-2 sm:p-3 relative overflow-hidden`}>
        
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 ${colorClasses.icon}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/>
            <path d="M3 9V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4"/>
            <path d="M21 9V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v4"/>
            <path d="M9 21v-6"/>
            <path d="M15 21v-6"/>
          </svg>
        
      </div>
      <div className="p-2 sm:p-3">
        <h4 className="font-medium text-gray-800 text-xs sm:text-sm mb-1 truncate">
          {storeDeal.retailerName}
        </h4>
        <p className="text-xs text-gray-500 mb-1 sm:mb-2 line-clamp-2 hidden sm:block">
          {storeDeal.dealsCount} deals available
        </p>
        <div className="flex items-center justify-between">
          <span className="text-primary font-bold text-xs sm:text-sm">
             Valid until {new Date(storeDeal.validUntil).toLocaleDateString()}
          </span>
        </div>
      </div>
    </Card>
  );
};

export default StoreCard;