import React from 'react';
import Header from '@/components/layout/Header';
import BottomNavigation from '@/components/layout/BottomNavigation';
import DealsView from '@/components/deals/DealsView';

const DealsPage: React.FC = () => {
  return (
    <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
      <Header title="Weekly Deals" />
      
      <main className="flex-1 overflow-y-auto">
        <DealsView />
      </main>
      
      <BottomNavigation activeTab="deals" />
    </div>
  );
};

export default DealsPage;
