import React from 'react';
import { useQuery } from '@tanstack/react-query';
import ShoppingListComponent from '@/components/lists/ShoppingList';
import Header from '@/components/layout/Header';
import BottomNavigation from '@/components/layout/BottomNavigation';
import type { ShoppingList as ShoppingListType, User } from '@/lib/types';

const ShoppingListPage: React.FC = () => {
  const { data: user } = useQuery<User>({
    queryKey: ['/api/user/profile'],
  });

  const { data: shoppingLists, isLoading } = useQuery<ShoppingListType[]>({
    queryKey: ['/api/shopping-lists'],
  });

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
        <Header user={user} />
        <main className="flex-1 overflow-y-auto p-4 bg-white">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-3 bg-white">
                  <div className="h-5 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                </div>
              ))}
            </div>
          </div>
        </main>
        <BottomNavigation activeTab="lists" />
      </div>
    );
  }

  // Get the default shopping list name for the header
  const defaultList = shoppingLists?.[0];
  const listName = defaultList?.name || 'Shopping List';

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
      <Header 
        title={listName}
        user={user}
      />
      <main className="flex-1 overflow-y-auto">
        <ShoppingListComponent />
      </main>
      <BottomNavigation activeTab="lists" />
    </div>
  );
};

export default ShoppingListPage;