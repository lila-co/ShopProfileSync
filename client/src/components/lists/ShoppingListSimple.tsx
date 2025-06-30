
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ShoppingList as ShoppingListType, ShoppingListItem } from '@/lib/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Plus, Check, X, ShoppingBag, Wand2 } from 'lucide-react';

const ShoppingListSimple: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newItemName, setNewItemName] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);

  const { data: shoppingLists, isLoading } = useQuery<ShoppingListType[]>({
    queryKey: ['/api/shopping-lists'],
  });

  const addItemMutation = useMutation({
    mutationFn: async (itemName: string) => {
      const defaultList = shoppingLists?.[0];
      if (!defaultList) throw new Error('No shopping list found');

      const response = await apiRequest('POST', '/api/shopping-list/items', {
        shoppingListId: defaultList.id,
        productName: itemName,
        quantity: 1,
        unit: 'COUNT'
      });

      if (!response.ok) {
        throw new Error('Failed to add item');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
      setNewItemName('');
      setIsAddingItem(false);
    },
    onError: () => {
      toast({
        title: "Couldn't add item",
        description: "Please try again",
        variant: "destructive",
      });
    }
  });

  const toggleItemMutation = useMutation({
    mutationFn: async ({ itemId, completed }: { itemId: number; completed: boolean }) => {
      const response = await apiRequest('PATCH', `/api/shopping-list/items/${itemId}`, {
        isCompleted: completed
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
    }
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const response = await apiRequest('DELETE', `/api/shopping-list/items/${itemId}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
    }
  });

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemName.trim()) {
      addItemMutation.mutate(newItemName.trim());
    }
  };

  const handleToggleItem = (itemId: number, currentStatus: boolean) => {
    toggleItemMutation.mutate({ itemId, completed: !currentStatus });
  };

  const handleDeleteItem = (itemId: number) => {
    deleteItemMutation.mutate(itemId);
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="space-y-3">
          {Array(5).fill(0).map((_, index) => (
            <div key={index} className="h-16 bg-gray-100 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  const defaultList = shoppingLists?.[0];
  const items = defaultList?.items || [];
  const completedItems = items.filter(item => item.completed);
  const pendingItems = items.filter(item => !item.completed);

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 p-4 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Shopping List</h1>
            <p className="text-sm text-gray-500">
              {pendingItems.length} items to get
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
              {completedItems.length} done
            </div>
          </div>
        </div>
      </div>

      {/* Quick Add */}
      <div className="p-4 border-b border-gray-100">
        <form onSubmit={handleAddItem} className="flex space-x-2">
          <Input
            type="text"
            placeholder="What do you need?"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            className="flex-1 h-12 text-base border-2 border-gray-200 focus:border-blue-500 rounded-xl"
            autoFocus={isAddingItem}
          />
          <Button
            type="submit"
            disabled={!newItemName.trim() || addItemMutation.isPending}
            className="h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </form>
      </div>

      {/* Shopping Items */}
      <div className="p-4 space-y-3">
        {pendingItems.length === 0 && completedItems.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Your list is empty</h3>
            <p className="text-gray-500 mb-6">Add your first item above to get started</p>
            <Button
              variant="outline"
              className="mx-auto"
              onClick={() => setIsAddingItem(true)}
            >
              <Wand2 className="h-4 w-4 mr-2" />
              Suggest items for me
            </Button>
          </div>
        ) : (
          <>
            {/* Pending Items */}
            {pendingItems.map((item) => (
              <div
                key={item.id}
                className="mobile-shopping-item group"
                onClick={() => handleToggleItem(item.id, item.completed)}
              >
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-6 h-6 border-2 border-gray-300 rounded-full flex items-center justify-center group-hover:border-green-500 transition-colors">
                      {toggleItemMutation.isPending ? (
                        <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-medium text-gray-900 truncate">
                      {item.productName}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {item.quantity} {item.unit?.toLowerCase() || 'item'}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteItem(item.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {/* Completed Items */}
            {completedItems.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="h-px bg-gray-200 flex-1"></div>
                  <span className="text-sm text-gray-500 font-medium">
                    Completed ({completedItems.length})
                  </span>
                  <div className="h-px bg-gray-200 flex-1"></div>
                </div>
                
                {completedItems.map((item) => (
                  <div
                    key={item.id}
                    className="mobile-shopping-item opacity-60 group"
                    onClick={() => handleToggleItem(item.id, item.completed)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-medium text-gray-500 line-through truncate">
                          {item.productName}
                        </h3>
                        <p className="text-sm text-gray-400">
                          {item.quantity} {item.unit?.toLowerCase() || 'item'}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteItem(item.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Action */}
      {pendingItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100">
          <div className="max-w-md mx-auto">
            <Button
              className="w-full h-14 bg-green-600 hover:bg-green-700 text-white text-lg font-medium rounded-xl"
              onClick={() => {
                // Navigate to shopping route or start shopping
                window.location.href = `/shopping-route?listId=${defaultList?.id}&mode=instore`;
              }}
            >
              Start Shopping ({pendingItems.length} items)
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShoppingListSimple;
