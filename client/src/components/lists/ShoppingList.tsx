import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ShoppingList as ShoppingListType, ShoppingListItem } from '@/lib/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, ShoppingBag, FileText, Clock, Check, Trash2, AlertTriangle, DollarSign, MapPin, Car, BarChart2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';

const ShoppingListComponent: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newItemName, setNewItemName] = useState('');
  const [recipeUrl, setRecipeUrl] = useState('');
  const [servings, setServings] = useState('4');
  const [recipeDialogOpen, setRecipeDialogOpen] = useState(false);
  const [optimizationPreference, setOptimizationPreference] = useState('cost');
  const [selectedRetailers, setSelectedRetailers] = useState<number[]>([]);
  const [showRouteMap, setShowRouteMap] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [expiringDeals, setExpiringDeals] = useState([
    { id: 1, retailer: 'Walmart', product: 'Organic Milk', expires: 'Tomorrow', discount: '20%' },
    { id: 2, retailer: 'Target', product: 'Free-Range Eggs', expires: 'In 2 days', discount: '15%' }
  ]);
  
  const { data: shoppingLists, isLoading } = useQuery<ShoppingListType[]>({
    queryKey: ['/api/shopping-lists'],
  });
  
  // Get personalized suggestions based on user profile
  const { data: suggestions, isLoading: suggestionsLoading } = useQuery({
    queryKey: ['/api/shopping-lists/suggestions'],
    enabled: !!shoppingLists,
  });
  
  // Add item to shopping list
  const addItemMutation = useMutation({
    mutationFn: async (productName: string) => {
      // Add to default shopping list (using the first list as default for simplicity)
      const defaultList = shoppingLists?.[0];
      if (!defaultList) throw new Error("No shopping list found");
      
      const response = await apiRequest('POST', '/api/shopping-list/items', {
        shoppingListId: defaultList.id,
        productName,
        quantity: 1
      });
      return response.json();
    },
    onSuccess: () => {
      setNewItemName('');
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
      toast({
        title: "Item Added",
        description: "Item has been added to your shopping list."
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Add Item",
        description: error.message || "Could not add item to shopping list.",
        variant: "destructive"
      });
    }
  });

  // Generate shopping list from typical purchases
  const generateListMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/shopping-lists/generate', {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
      toast({
        title: "Shopping List Generated",
        description: "Created a new list based on your typical purchases"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to generate shopping list",
        variant: "destructive" 
      });
    }
  });

  // Import recipe ingredients
  const importRecipeMutation = useMutation({
    mutationFn: async () => {
      const defaultList = shoppingLists?.[0];
      if (!defaultList) throw new Error("No shopping list found");
      
      const response = await apiRequest('POST', '/api/shopping-lists/recipe', {
        recipeUrl,
        shoppingListId: defaultList.id,
        servings: parseInt(servings)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
      setRecipeDialogOpen(false);
      setRecipeUrl('');
      toast({
        title: "Recipe Imported",
        description: "Ingredients have been added to your shopping list"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to import recipe ingredients",
        variant: "destructive"
      });
    }
  });
  
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
  
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const response = await apiRequest('DELETE', `/api/shopping-list/items/${itemId}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
      toast({
        title: "Item Removed",
        description: "Item has been removed from your shopping list."
      });
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
  
  const defaultList = shoppingLists?.[0];
  const items = defaultList?.items || [];
  
  return (
    <div className="p-4 pb-20">
      <h2 className="text-xl font-bold mb-4">Shopping List</h2>
      
      <form onSubmit={handleAddItem} className="flex space-x-2 mb-6">
        <Input
          type="text"
          placeholder="Add an item..."
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          className="flex-1"
        />
        <Button 
          type="submit" 
          className="bg-primary text-white"
          disabled={addItemMutation.isPending}
        >
          Add
        </Button>
      </form>
      
      <div className="space-y-3">
        {items.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-gray-500">
              <p>Your shopping list is empty</p>
              <p className="text-sm mt-1">Add items to get started</p>
            </CardContent>
          </Card>
        ) : (
          items.map((item: ShoppingListItem) => (
            <Card key={item.id} className={item.isCompleted ? "opacity-60" : ""}>
              <CardContent className="p-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center flex-1">
                    <input
                      type="checkbox"
                      checked={item.isCompleted}
                      onChange={() => handleToggleItem(item.id, item.isCompleted)}
                      className="h-5 w-5 text-primary rounded mr-3"
                    />
                    <div>
                      <span className={`font-medium ${item.isCompleted ? "line-through text-gray-500" : "text-gray-800"}`}>
                        {item.productName}
                      </span>
                      {item.suggestedRetailer && (
                        <div className="flex items-center text-xs text-gray-500 mt-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/>
                            <path d="M3 9V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4"/>
                          </svg>
                          <span>
                            {item.suggestedRetailer.name} - ${item.suggestedPrice ? (item.suggestedPrice / 100).toFixed(2) : '0.00'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="text-gray-400 hover:text-red-500"
                    aria-label="Delete item"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      <line x1="10" y1="11" x2="10" y2="17"/>
                      <line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                  </button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ShoppingListComponent;
