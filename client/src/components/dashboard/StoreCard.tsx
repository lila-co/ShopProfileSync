import React from 'react';
import { DealsSummary } from './lib/types';

interface StoreCardProps {
  storeDeal: DealsSummary;
}

const StoreCard: React.FC<StoreCardProps> = ({ storeDeal }) => {
  // Early return if storeDeal is not provided
  if (!storeDeal) {
    return null;
  }

  const handleClick = () => {
    // Navigate to deals page with retailer filter
    window.location.href = `/deals?retailer=${storeDeal.retailerId}`;
  };

  // Generate a consistent color based on retailer name
  const getRetailerColor = (retailerName: string) => {
    const colors = ['blue', 'green', 'purple', 'orange', 'pink', 'indigo', 'red', 'teal'];
    const index = retailerName.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const logoColor = storeDeal.logoColor || getRetailerColor(storeDeal.retailerName);

  return (
    <div 
      className="bg-white rounded-xl shadow-sm flex-shrink-0 w-28 sm:w-32 md:w-36 overflow-hidden border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleClick}
    >
      <div className={`h-16 sm:h-18 md:h-20 bg-${logoColor}-500 flex items-center justify-center`}>
        <div className="text-white font-bold text-lg sm:text-xl">
          {storeDeal.retailerName.charAt(0)}
        </div>
      </div>
      <div className="p-2 sm:p-3">
        <h4 className="font-medium text-xs sm:text-sm text-gray-800 mb-1 truncate">
          {storeDeal.retailerName}
        </h4>
        <p className="text-xs text-gray-600 mb-1">
          {storeDeal.dealsCount} deals
        </p>
        <p className="text-xs text-gray-500">
          Valid until {new Date(storeDeal.validUntil).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
};

export default StoreCard;