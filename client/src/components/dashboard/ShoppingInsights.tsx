import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { PurchasePattern, MonthlySpending } from '@/lib/types';
import { useQuery } from '@tanstack/react-query';

const ShoppingInsights: React.FC = () => {
  const { data: topItems, isLoading: loadingTopItems } = useQuery<PurchasePattern[]>({
    queryKey: ['/api/insights/top-items'],
  });
  
  const { data: monthlyData, isLoading: loadingMonthlyData } = useQuery<MonthlySpending[]>({
    queryKey: ['/api/insights/monthly-spending'],
  });
  
  const renderTopItems = () => {
    if (loadingTopItems) {
      return Array(3).fill(0).map((_, i) => (
        <div key={i} className="flex items-center py-2 gap-3">
          <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse" />
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4 mb-2" />
            <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
          </div>
        </div>
      ));
    }
    
    return (topItems || []).slice(0, 3).map((item, index) => (
      <div key={index} className="flex items-center py-2 gap-3">
        <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
            <rect x="9" y="9" width="6" height="6" rx="1"/>
            <line x1="9" y1="1" x2="9" y2="5"/>
            <line x1="15" y1="1" x2="15" y2="5"/>
            <circle cx="9" cy="19" r="1"/>
            <circle cx="15" cy="19" r="1"/>
          </svg>
        </div>
        <div className="flex-1">
          <div className="flex justify-between">
            <span className="font-medium text-sm">{item.productName}</span>
            <span className="text-secondary font-medium text-sm">{item.frequency}</span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-500 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/>
                <path d="M3 9V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4"/>
              </svg>
              <span className="text-xs text-gray-500">Purchased {item.frequency}x</span>
            </div>
            <span className="text-xs text-gray-500">${(item.totalSpent / 100).toFixed(2)}</span>
          </div>
        </div>
      </div>
    ));
  };
  
  const renderMonthlyData = () => {
    if (loadingMonthlyData) {
      return (
        <div className="h-40 flex items-end justify-between">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="relative w-8">
                <div className="absolute bottom-0 left-0 w-3 bg-gray-200 rounded-sm animate-pulse" style={{ height: `${Math.random() * 100}px` }}></div>
                <div className="absolute bottom-0 right-0 w-3 bg-gray-200 rounded-sm animate-pulse" style={{ height: `${Math.random() * 100}px` }}></div>
              </div>
              <span className="text-xs text-gray-500 mt-1">-</span>
            </div>
          ))}
        </div>
      );
    }
    
    return (
      <div className="h-40 flex items-end justify-between">
        {(monthlyData || []).map((month, index) => {
          const currentYearHeight = month.currentYear;
          const previousYearHeight = month.previousYear;
          
          // Scale heights based on the maximum value
          const maxValue = Math.max(
            ...((monthlyData || []).flatMap(m => [m.currentYear, m.previousYear]))
          );
          
          const currentYearScaled = (currentYearHeight / maxValue) * 100;
          const previousYearScaled = (previousYearHeight / maxValue) * 100;
          
          return (
            <div key={index} className="flex flex-col items-center">
              <div className="relative w-8">
                <div 
                  className="absolute bottom-0 left-0 w-3 bg-primary rounded-sm" 
                  style={{ height: `${currentYearScaled}px` }}
                ></div>
                <div 
                  className="absolute bottom-0 right-0 w-3 bg-gray-300 rounded-sm" 
                  style={{ height: `${previousYearScaled}px` }}
                ></div>
              </div>
              <span className="text-xs text-gray-500 mt-1">{month.month}</span>
            </div>
          );
        })}
      </div>
    );
  };
  
  return (
    <section className="mb-6">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-gray-800">Your Shopping Insights</h3>
        <a href="/insights" className="text-primary text-sm font-medium">See all</a>
      </div>
      
      <Card className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        {/* Frequently Purchased Items */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium text-sm text-gray-700">Most Purchased Items</h4>
            <span className="text-xs text-gray-500">Last 3 months</span>
          </div>
          
          {renderTopItems()}
        </div>
        
        {/* Shopping Pattern Visualization */}
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium text-sm text-gray-700">Monthly Spending Pattern</h4>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-primary mr-1"></div>
              <span className="text-xs text-gray-500 mr-3">2023</span>
              <div className="w-3 h-3 rounded-full bg-gray-300 mr-1"></div>
              <span className="text-xs text-gray-500">2022</span>
            </div>
          </div>
          
          {/* Simple Chart Representation */}
          {renderMonthlyData()}
        </CardContent>
      </Card>
    </section>
  );
};

export default ShoppingInsights;
