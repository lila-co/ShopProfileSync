import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { DealsSummary } from '@/lib/types';
import StoreCard from './StoreCard';

const WeeklyDeals: React.FC = () => {
  const { data: storeDeals, isLoading } = useQuery<DealsSummary[]>({
    queryKey: ['/api/deals/summary'],
  });
  
  return (
    <section className="mb-6">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-gray-800">Weekly Deals</h3>
        <a href="/deals" className="text-primary text-sm font-medium">View All</a>
      </div>
      
      <div className="overflow-x-auto hide-scrollbar -mx-4 px-4">
        <div className="flex space-x-2 sm:space-x-3 pb-2 w-max">
          {isLoading ? (
            // Skeleton loading
            Array(4).fill(0).map((_, index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm flex-shrink-0 w-28 sm:w-32 md:w-36 overflow-hidden border border-gray-100">
                <div className="h-16 sm:h-18 md:h-20 bg-gray-200 animate-pulse"></div>
                <div className="p-2 sm:p-3">
                  <div className="h-3 sm:h-4 bg-gray-200 rounded animate-pulse w-3/4 mb-1 sm:mb-2"></div>
                  <div className="h-2 sm:h-3 bg-gray-200 rounded animate-pulse w-1/2 mb-1"></div>
                  <div className="h-2 sm:h-3 bg-gray-200 rounded animate-pulse w-2/3"></div>
                </div>
              </div>
            ))
          ) : (
            // Actual store deals
            (storeDeals || []).map((storeDeal, index) => (
              <StoreCard key={index} storeDeal={storeDeal} />
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default WeeklyDeals;
