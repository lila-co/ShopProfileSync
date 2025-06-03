import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ShoppingList as ShoppingListType, ShoppingListItem } from '@/lib/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const ShoppingListSimple: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { logout } = useAuth();
  const [newItemName, setNewItemName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch shopping lists
  const { data: shoppingLists, isLoading: listsLoading } = useQuery<ShoppingListType[]>({
    queryKey: ['/api/shopping-lists'],
    refetchOnWindowFocus: false,
  });

  // Add item mutation
  const addItemMutation = useMutation({
    mutationFn: async (productName: string) => {
      const defaultList = shoppingLists?.[0];
      if (!defaultList) throw new Error('No shopping list found');
      
      const response = await apiRequest('POST', '/api/shopping-list/items', {
        shoppingListId: defaultList.id,
        productName,
        quantity: 1,
        unit: 'COUNT'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
      setNewItemName('');
      toast({
        title: "Item Added",
        description: "Successfully added item to your shopping list"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add item",
        variant: "destructive"
      });
    }
  });

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const response = await apiRequest('DELETE', `/api/shopping-list/items/${itemId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
      toast({
        title: "Item Removed",
        description: "Successfully removed item from your shopping list"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove item",
        variant: "destructive"
      });
    }
  });

  // Toggle item completion mutation
  const toggleItemMutation = useMutation({
    mutationFn: async ({ itemId, completed }: { itemId: number; completed: boolean }) => {
      const response = await apiRequest('PATCH', `/api/shopping-list/items/${itemId}`, {
        isCompleted: completed
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update item",
        variant: "destructive"
      });
    }
  });

  // Generate new list mutation
  const generateListMutation = useMutation({
    mutationFn: async () => {
      setIsLoading(true);
      const defaultList = shoppingLists?.[0];
      if (!defaultList) throw new Error('No shopping list found');

      // Clear existing items first
      if (defaultList.items && defaultList.items.length > 0) {
        for (const item of defaultList.items) {
          await apiRequest('DELETE', `/api/shopping-list/items/${item.id}`);
        }
      }

      // Generate new recommendations
      const response = await apiRequest('POST', '/api/shopping-lists/generate', {
        shoppingListId: defaultList.id
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
      setIsLoading(false);
      toast({
        title: "List Generated",
        description: "Your shopping list has been regenerated with fresh recommendations"
      });
    },
    onError: (error: any) => {
      setIsLoading(false);
      toast({
        title: "Error",
        description: error.message || "Failed to generate list",
        variant: "destructive"
      });
    }
  });

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemName.trim()) {
      addItemMutation.mutate(newItemName.trim());
    }
  };

  const handleDeleteItem = (itemId: number) => {
    deleteItemMutation.mutate(itemId);
  };

  const handleToggleItem = (itemId: number, currentStatus: boolean) => {
    toggleItemMutation.mutate({ itemId, completed: !currentStatus });
  };

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out"
    });
  };

  const handleGenerateList = () => {
    generateListMutation.mutate();
  };

  if (listsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const defaultList = shoppingLists?.[0];
  const items = defaultList?.items || [];

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl font-bold">Shopping List</CardTitle>
          <div className="flex gap-2">
            <Button 
              onClick={handleGenerateList}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                'Generate List'
              )}
            </Button>
            <Button 
              onClick={handleLogout}
              variant="outline"
              className="text-red-600 border-red-600 hover:bg-red-50"
            >
              Logout
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Item Form */}
          <form onSubmit={handleAddItem} className="flex gap-2">
            <Input
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Add new item..."
              className="flex-1"
            />
            <Button 
              type="submit" 
              disabled={!newItemName.trim() || addItemMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {addItemMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </form>

          {/* Shopping List Items */}
          <div className="space-y-3">
            {items.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Your shopping list is empty.</p>
                <p className="text-sm">Add items above or generate a new list.</p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
                >
                  <button
                    onClick={() => handleToggleItem(item.id, item.isCompleted)}
                    className="flex-shrink-0"
                  >
                    {item.isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                  
                  <div className="flex-1">
                    <div className={`font-medium ${item.isCompleted ? 'line-through text-gray-500' : ''}`}>
                      {item.productName}
                    </div>
                    <div className="text-sm text-gray-500">
                      Quantity: {item.quantity} {item.unit}
                      {item.suggestedPrice && (
                        <span className="ml-2">
                          • ${(item.suggestedPrice / 100).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={() => handleDeleteItem(item.id)}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    disabled={deleteItemMutation.isPending}
                  >
                    {deleteItemMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))
            )}
          </div>

          {/* Summary */}
          {items.length > 0 && (
            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">
                  Total Items: {items.length} 
                  {items.filter(item => item.isCompleted).length > 0 && (
                    <span className="text-green-600 ml-2">
                      ({items.filter(item => item.isCompleted).length} completed)
                    </span>
                  )}
                </span>
                {items.some(item => item.suggestedPrice) && (
                  <span className="font-medium">
                    Est. Total: ${(
                      items
                        .filter(item => item.suggestedPrice)
                        .reduce((sum, item) => sum + (item.suggestedPrice || 0), 0) / 100
                    ).toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ShoppingListSimple;