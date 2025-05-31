import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ShoppingList as ShoppingListType, ShoppingListItem } from '@/lib/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Plus, ShoppingBag, Check, Trash2, Pencil } from 'lucide-react';
import { detectUnitFromItemName } from '@/lib/utils';

const ShoppingListSimple: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState(1);

  const { data: shoppingLists, isLoading } = useQuery<ShoppingListType[]>({
    queryKey: ['/api/shopping-lists'],
  });

  // Add item to shopping list
  const addItemMutation = useMutation({
    mutationFn: async ({ productName, quantity }: { productName: string, quantity: number }) => {
      const defaultList = shoppingLists?.[0];
      if (!defaultList) throw new Error("No shopping list found");

      const unit = detectUnitFromItemName(productName);

      const response = await apiRequest('POST', '/api/shopping-list/items', {
        shoppingListId: defaultList.id,
        productName,
        quantity,
        unit
      });
      return response.json();
    },
    onSuccess: () => {
      setNewItemName('');
      setNewItemQuantity(1);
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
      toast({
        title: "Item Added",
        description: "Item has been added to your shopping list."
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Add Item",
        description: "Could not add item to shopping list.",
        variant: "destructive"
      });
    }
  });

  // Toggle item completion status
  const toggleItemMutation = useMutation({
    mutationFn: async ({ itemId, completed }: { itemId: number, completed: boolean }) => {
      const response = await apiRequest('PATCH', `/api/shopping-list/items/${itemId}`, {
        isCompleted: completed
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
    }
  });

  // Delete item from shopping list
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const response = await apiRequest('DELETE', `/api/shopping-list/items/${itemId}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
      toast({
        title: "Item Removed",
        description: "Item has been removed from your shopping list"
      });
    }
  });

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemName.trim()) {
      addItemMutation.mutate({
        productName: newItemName.trim(),
        quantity: newItemQuantity
      });
    }
  };

  const handleToggleItem = (itemId: number, currentStatus: boolean) => {
    toggleItemMutation.mutate({ itemId, completed: !currentStatus });
  };

  const handleDeleteItem = (itemId: number) => {
    deleteItemMutation.mutate(itemId);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-10 bg-gray-200 rounded animate-pulse w-3/4 mb-4"></div>
        <div className="space-y-2">
          {Array(5).fill(0).map((_, index) => (
            <div key={index} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex justify-between items-center">
                <div className="w-full">
                  <div className="h-5 bg-gray-200 rounded animate-pulse w-1/2 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Get the default shopping list and its items
  const defaultList = shoppingLists?.[0];
  const items = defaultList?.items ?? [];

  // Separate completed and incomplete items
  const incompleteItems = items.filter(item => !item.isCompleted);
  const completedItems = items.filter(item => item.isCompleted);

  return (
    <div className="p-4 pb-20 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Shopping List</h2>
        <div className="text-sm text-gray-500">
          {incompleteItems.length} items
        </div>
      </div>

      {/* Add Item Form */}
      <form onSubmit={handleAddItem} className="mb-6">
        <div className="flex space-x-2 mb-3">
          <Input
            type="text"
            placeholder="Add an item..."
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            className="flex-1 h-12 text-base"
          />
          <Button 
            type="submit" 
            className="bg-primary text-white h-12 px-6"
            disabled={addItemMutation.isPending}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex space-x-2">
          <div className="w-24">
            <Input
              type="number"
              placeholder="Qty"
              min="1"
              value={newItemQuantity}
              onChange={(e) => setNewItemQuantity(parseInt(e.target.value) || 1)}
              className="w-full h-10 text-center"
            />
          </div>
          <div className="text-sm text-gray-500 flex items-center">
            Smart unit detection enabled
          </div>
        </div>
      </form>

      {/* Shopping List Items */}
      <div className="space-y-4">
        {items.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <ShoppingBag className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <p className="text-lg font-medium">Your shopping list is empty</p>
              <p className="text-sm mt-2">Add items to get started</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Incomplete Items */}
            {incompleteItems.length > 0 && (
              <div className="space-y-3">
                {incompleteItems.map((item) => (
                  <Card key={item.id} className="shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={item.isCompleted}
                          onChange={() => handleToggleItem(item.id, item.isCompleted)}
                          className="h-5 w-5 text-primary rounded cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-800 text-base">
                              {item.productName}
                            </span>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm bg-gray-100 px-2 py-1 rounded-full">
                                {item.quantity} {item.unit && item.unit !== "COUNT" ? item.unit.toLowerCase() : ""}
                              </span>
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-red-50"
                                aria-label="Delete item"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Completed Items */}
            {completedItems.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center space-x-2 mb-4">
                  <Check className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-gray-700">Completed ({completedItems.length})</h3>
                </div>
                <div className="space-y-2">
                  {completedItems.map((item) => (
                    <Card key={item.id} className="opacity-60">
                      <CardContent className="p-3">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={item.isCompleted}
                            onChange={() => handleToggleItem(item.id, item.isCompleted)}
                            className="h-4 w-4 text-primary rounded cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-medium line-through text-gray-500">
                                {item.productName}
                              </span>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs bg-gray-200 px-2 py-1 rounded-full">
                                  {item.quantity} {item.unit && item.unit !== "COUNT" ? item.unit.toLowerCase() : ""}
                                </span>
                                <button
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="text-gray-400 hover:text-red-500 p-1"
                                  aria-label="Delete item"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ShoppingListSimple;