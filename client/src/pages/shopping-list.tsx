import React from 'react';
import Header from '@/components/layout/Header';
import BottomNavigation from '@/components/layout/BottomNavigation';
import ShoppingListComponent from '@/components/lists/ShoppingList';

const ShoppingListPage: React.FC = () => {
  return (
    <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
      <Header title="Shopping Lists" />
      
      <main className="flex-1 overflow-y-auto">
        <ShoppingListComponent />
      </main>
      
      <BottomNavigation activeTab="lists" />
    </div>
  );
};

export default ShoppingListPage;
