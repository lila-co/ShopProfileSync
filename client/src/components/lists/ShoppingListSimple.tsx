
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ShoppingList as ShoppingListType, ShoppingListItem } from '@/lib/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Plus, Check, X, ShoppingBag, Wand2, CheckCircle2 } from 'lucide-react';

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
      <div className="max-w-md mx-auto bg-gray-50 min-h-screen p-4">
        <div className="space-y-4">
          <div className="h-6 bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="space-y-3">
            {Array(5).fill(0).map((_, index) => (
              <div key={index} className="h-16 bg-gray-200 rounded-2xl animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const defaultList = shoppingLists?.[0];
  const items = defaultList?.items || [];
  const completedItems = items.filter(item => item.completed);
  const pendingItems = items.filter(item => !item.completed);

  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen">
      {/* Simplified Header */}
      <div className="sticky top-0 bg-white shadow-sm border-b border-gray-100 p-6 z-10">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Shopping List</h1>
          <div className="flex items-center justify-center mt-2 space-x-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{pendingItems.length}</div>
              <div className="text-sm text-gray-500">to get</div>
            </div>
            <div className="w-px h-8 bg-gray-200"></div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{completedItems.length}</div>
              <div className="text-sm text-gray-500">done</div>
            </div>
          </div>
        </div>
      </div>

      {/* Simplified Add Item */}
      <div className="p-6 bg-white border-b border-gray-100">
        <form onSubmit={handleAddItem} className="space-y-3">
          <Input
            type="text"
            placeholder="What do you need?"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            className="h-14 text-lg border-2 border-gray-200 focus:border-blue-500 rounded-2xl px-6"
            autoFocus={isAddingItem}
          />
          <Button
            type="submit"
            disabled={!newItemName.trim() || addItemMutation.isPending}
            className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold rounded-2xl"
          >
            {addItemMutation.isPending ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Plus className="h-6 w-6 mr-2" />
                Add Item
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Shopping Items */}
      <div className="p-6 space-y-4">
        {pendingItems.length === 0 && completedItems.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <ShoppingBag className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Your list is empty</h3>
            <p className="text-gray-500 mb-8 max-w-sm mx-auto">Start adding items to create your shopping list</p>
            <Button
              variant="outline"
              size="lg"
              className="h-12 px-8 border-2 border-gray-200 hover:border-blue-500 hover:text-blue-600"
              onClick={() => setIsAddingItem(true)}
            >
              <Wand2 className="h-5 w-5 mr-2" />
              Get suggestions
            </Button>
          </div>
        ) : (
          <>
            {/* Active Items */}
            {pendingItems.map((item) => (
              <div
                key={item.id}
                className="group bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-200"
                onClick={() => handleToggleItem(item.id, item.completed)}
              >
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 border-2 border-gray-300 rounded-full flex items-center justify-center group-hover:border-green-500 transition-colors">
                      {toggleItemMutation.isPending ? (
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {item.productName}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
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
                      className="w-10 h-10 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {/* Completed Items */}
            {completedItems.length > 0 && (
              <div className="mt-12">
                <div className="flex items-center justify-center mb-6">
                  <div className="h-px bg-gray-200 flex-1"></div>
                  <div className="mx-4 px-4 py-2 bg-green-50 rounded-full">
                    <span className="text-sm font-medium text-green-700">
                      Completed ({completedItems.length})
                    </span>
                  </div>
                  <div className="h-px bg-gray-200 flex-1"></div>
                </div>
                
                <div className="space-y-3">
                  {completedItems.map((item) => (
                    <div
                      key={item.id}
                      className="group bg-green-50 rounded-2xl p-5 border border-green-100"
                      onClick={() => handleToggleItem(item.id, item.completed)}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="h-5 w-5 text-white" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-medium text-green-700 line-through truncate">
                            {item.productName}
                          </h3>
                          <p className="text-sm text-green-600 mt-1">
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
                            className="w-10 h-10 opacity-0 group-hover:opacity-100 transition-opacity text-green-400 hover:text-red-500"
                          >
                            <X className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Simplified Bottom Action */}
      {pendingItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent">
          <div className="max-w-md mx-auto">
            <Button
              className="w-full h-16 bg-green-600 hover:bg-green-700 text-white text-xl font-semibold rounded-2xl shadow-lg"
              onClick={() => {
                window.location.href = `/shopping-route?listId=${defaultList?.id}&mode=instore`;
              }}
            >
              Start Shopping • {pendingItems.length} items
            </Button>
          </div>
        </div>
      )}

      {/* Safe area for bottom action */}
      {pendingItems.length > 0 && <div className="h-24"></div>}
    </div>
  );
};

export default ShoppingListSimple;
