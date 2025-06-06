import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, ShoppingCart, Sparkles, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { ShoppingList as ShoppingListType, ShoppingItem } from '@/lib/types';
import { apiRequest } from '@/lib/utils';

const CATEGORIES = [
  'Produce', 'Meat & Seafood', 'Dairy & Eggs', 'Bakery', 
  'Pantry & Canned Goods', 'Frozen Foods', 'Snacks & Candy',
  'Beverages', 'Health & Beauty', 'Household Items'
];

const ShoppingListComponent: React.FC = () => {
  const [newItemName, setNewItemName] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastSessionId, setLastSessionId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, sessionId } = useAuth();
  const queryClient = useQueryClient();

  // Detect new session after login
  useEffect(() => {
    if (sessionId && sessionId !== lastSessionId) {
      console.log('New session detected, starting list generation animation');
      setIsGenerating(true);
      setLastSessionId(sessionId);

      // Stop animation after 3 seconds
      const timer = setTimeout(() => {
        setIsGenerating(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [sessionId, lastSessionId]);

  const { data: shoppingList, isLoading } = useQuery<ShoppingListType>({
    queryKey: ['/api/shopping-list'],
    enabled: !!user,
  });

  const { data: suggestionsData } = useQuery({
    queryKey: ['/api/shopping-lists/suggestions'],
    enabled: !!user && showSuggestions,
  });

  const addItemMutation = useMutation({
    mutationFn: async (itemData: any) => {
      const response = await apiRequest('POST', '/api/shopping-list/items', itemData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-list'] });
      setNewItemName('');
      setShowSuggestions(false);
      toast({
        title: "Item added",
        description: "Item successfully added to your shopping list",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to add item to shopping list",
        variant: "destructive",
      });
    }
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest('PATCH', `/api/shopping-list/items/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-list'] });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/shopping-list/items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-list'] });
      toast({
        title: "Item removed",
        description: "Item successfully removed from your shopping list",
      });
    },
  });

  const handleAddItem = () => {
    if (newItemName.trim()) {
      addItemMutation.mutate({
        productName: newItemName.trim(),
        quantity: 1,
        unit: 'COUNT'
      });
    }
  };

  const handleAddSuggestion = (suggestion: any) => {
    addItemMutation.mutate({
      productName: suggestion.productName,
      quantity: suggestion.quantity || 1,
      unit: suggestion.unit || 'COUNT',
      category: suggestion.category
    });
  };

  const toggleItemComplete = (item: ShoppingItem) => {
    updateItemMutation.mutate({
      id: item.id,
      data: { completed: !item.completed }
    });
  };

  const updateItemQuantity = (item: ShoppingItem, quantity: number) => {
    if (quantity > 0) {
      updateItemMutation.mutate({
        id: item.id,
        data: { quantity }
      });
    }
  };

  const deleteItem = (id: number) => {
    deleteItemMutation.mutate(id);
  };

  useEffect(() => {
    if (suggestionsData) {
      setSuggestions(suggestionsData);
    }
  }, [suggestionsData]);

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
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
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Add New Item */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Add new item..."
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
                className="flex-1"
              />
              <Button 
                onClick={handleAddItem}
                disabled={!newItemName.trim() || addItemMutation.isPending}
                size="sm"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSuggestions(!showSuggestions)}
                className="flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Smart Suggestions
              </Button>
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Suggested for you:</div>
                <div className="flex flex-wrap gap-2">
                  {suggestions.slice(0, 6).map((suggestion, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="cursor-pointer hover:bg-blue-100"
                      onClick={() => handleAddSuggestion(suggestion)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {suggestion.productName}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Generating Animation */}
      {isGenerating && (
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin">
                <Sparkles className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <div className="font-medium text-blue-900">Generating your personalized list...</div>
                <div className="text-sm text-blue-700">Using your preferences and shopping history</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shopping List */}
      {shoppingList && shoppingList.items.length > 0 ? (
        <div className="space-y-4">
          {/* Progress Summary */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="h-5 w-5 text-blue-500" />
                  <span className="font-medium">
                    {shoppingList.completed_items} of {shoppingList.total_items} items completed
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  {Math.round((shoppingList.completed_items / shoppingList.total_items) * 100)}% done
                </div>
              </div>
              <Progress 
                value={(shoppingList.completed_items / shoppingList.total_items) * 100} 
                className="mt-2" 
              />
            </CardContent>
          </Card>

          {/* Items by Category */}
          {CATEGORIES.map(category => {
            const categoryItems = shoppingList.items.filter(item => item.category === category);
            if (categoryItems.length === 0) return null;

            return (
              <Card key={category}>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">{category}</h3>
                  <div className="space-y-2">
                    {categoryItems.map(item => (
                      <div 
                        key={item.id}
                        className={`flex items-center gap-3 p-2 rounded-lg border ${
                          item.completed 
                            ? 'bg-gray-50 border-gray-200' 
                            : 'bg-white border-gray-100'
                        }`}
                      >
                        <Checkbox
                          checked={item.completed}
                          onCheckedChange={() => toggleItemComplete(item)}
                        />

                        <div className="flex-1">
                          <div className={`font-medium ${
                            item.completed ? 'line-through text-gray-500' : 'text-gray-900'
                          }`}>
                            {item.productName}
                          </div>
                          {item.suggestedPrice && (
                            <div className="text-sm text-gray-600">
                              ${item.suggestedPrice.toFixed(2)}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateItemQuantity(item, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                          >
                            -
                          </Button>
                          <span className="w-8 text-center text-sm">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateItemQuantity(item, item.quantity + 1)}
                          >
                            +
                          </Button>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteItem(item.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Your shopping list is empty
            </h3>
            <p className="text-gray-500 mb-4">
              Add items above or use our smart suggestions to get started
            </p>
            <Button
              variant="outline"
              onClick={() => setShowSuggestions(true)}
              className="flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Get Smart Suggestions
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ShoppingListComponent;