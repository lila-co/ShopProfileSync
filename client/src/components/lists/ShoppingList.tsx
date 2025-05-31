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
import { Plus, ShoppingBag, FileText, Clock, Check, Trash2, AlertTriangle, DollarSign, MapPin, Car, BarChart2, Wand2, Pencil, Image, Star, TrendingDown, Percent } from 'lucide-react';
import { getItemImage, getBestProductImage, getCompanyLogo } from '@/lib/imageUtils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { detectUnitFromItemName } from '@/lib/utils';
import { ScrollArea } from "@/components/ui/scroll-area"

const ShoppingListComponent: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [newItemUnit, setNewItemUnit] = useState('COUNT');
  const [autoDetectUnit, setAutoDetectUnit] = useState(true);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editItemName, setEditItemName] = useState('');
  const [editItemQuantity, setEditItemQuantity] = useState(1);
  const [editItemUnit, setEditItemUnit] = useState('COUNT');
  const [editItemId, setEditItemId] = useState<number | null>(null);

  // Recipe dialog state
  const [recipeUrl, setRecipeUrl] = useState('');
  const [servings, setServings] = useState('4');
  const [recipeDialogOpen, setRecipeDialogOpen] = useState(false);

  // Generate list state
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [generatedItems, setGeneratedItems] = useState<any[]>([]);

  // Optimization state
  const [optimizationPreference, setOptimizationPreference] = useState('cost');
  const [selectedRetailers, setSelectedRetailers] = useState<number[]>([]);
  const [showRouteMap, setShowRouteMap] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  const [expiringDeals, setExpiringDeals] = useState([
    { id: 1, retailer: 'Walmart', product: 'Organic Milk', expires: 'Tomorrow', discount: '20%' },
    { id: 2, retailer: 'Target', product: 'Free-Range Eggs', expires: 'In 2 days', discount: '15%' }
  ]);

  // Get user location on component mount
  useEffect(() => {
    // For demo purposes, use San Francisco as default location
    setUserLocation({ lat: 37.7749, lng: -122.4194 });
  }, []);

  const { data: shoppingLists, isLoading, refetch: refetchShoppingLists } = useQuery<ShoppingListType[]>({
    queryKey: ['/api/shopping-lists'],
  });

  // Get personalized suggestions based on user profile and recent purchases
  const { data: suggestions, isLoading: suggestionsLoading } = useQuery<any[]>({
    queryKey: ['/api/shopping-lists/suggestions'],
    enabled: !!shoppingLists,
  });

  // Get recent purchases to help refresh shopping list
  const { data: recentPurchases } = useQuery({
    queryKey: ['/api/purchases/recent']
  });

  // Get retailers data
  const { data: retailers } = useQuery({
    queryKey: ['/api/retailers'],
  });

  // Update shopping list when recent purchases change
  useEffect(() => {
    if (recentPurchases && Array.isArray(recentPurchases) && recentPurchases.length > 0) {
      // This will trigger a refresh of the shopping list
      refetchShoppingLists();
    }
  }, [recentPurchases, refetchShoppingLists]);

  // Fetch shopping list cost comparison data
  const { data: costData, isLoading: isLoadingCosts } = useQuery({
    queryKey: ['/api/shopping-lists/costs', shoppingLists?.[0]?.id],
    enabled: !!shoppingLists?.[0]?.id,
    queryFn: async () => {
      const response = await apiRequest('POST', '/api/shopping-lists/costs', {
        shoppingListId: shoppingLists?.[0]?.id
      });
      return response.json();
    }
  });

  // Fetch shopping route when retailers are selected
  const { data: routeData, isLoading: isLoadingRoute } = useQuery({
    queryKey: ['/api/shopping-route', selectedRetailers, userLocation],
    enabled: selectedRetailers.length > 0 && !!userLocation && showRouteMap,
    queryFn: async () => {
      const response = await apiRequest('POST', '/api/shopping-route', {
        retailerIds: selectedRetailers,
        userLocation
      });
      return response.json();
    }
  });

  // Add item to shopping list
  const addItemMutation = useMutation({
    mutationFn: async ({ productName, quantity, unit }: { productName: string, quantity: number, unit: string }) => {
      // Add to default shopping list (using the first list as default for simplicity)
      const defaultList = shoppingLists?.[0];
      if (!defaultList) throw new Error("No shopping list found");

      // Apply historical size preferences for items like milk
      let optimizedQuantity = quantity;
      let optimizedUnit = unit;

      // Check if this item has historical size preferences
      const lowerName = productName.toLowerCase();
      if (lowerName.includes('milk')) {
        // Apply historical preference for milk (gallon, half gallon, etc.)
        optimizedUnit = 'GALLON';
        // For now, use default gallon sizing - can be enhanced with user preferences later
        optimizedQuantity = 1;
      } else if (lowerName.includes('egg')) {
        // Apply historical preference for eggs (dozen, half dozen)
        optimizedUnit = 'DOZEN';
      } else if (lowerName.includes('bread')) {
        optimizedUnit = 'LOAF';
      } else if (lowerName.includes('cheese')) {
        optimizedUnit = 'OZ';
        optimizedQuantity = 8;
      }

      const response = await apiRequest('POST', '/api/shopping-list/items', {
        shoppingListId: defaultList.id,
        productName,
        quantity: optimizedQuantity,
        unit: optimizedUnit
      });
      return response.json();
    },
    onSuccess: (data) => {
      setNewItemName('');
      setNewItemQuantity(1);
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });

      // Show appropriate message based on whether item was merged or corrected
      if (data.merged) {
        toast({
          title: "Items Combined",
          description: data.message || `Added quantity to existing "${data.productName}" item.`,
          variant: "default"
        });
      } else if (data.corrected) {
        toast({
          title: "Item Added",
          description: `Added as "${data.productName}" (corrected from "${data.originalName}")`,
          variant: "default"
        });
      } else {
        toast({
          title: "Item Added",
          description: "Item has been added to your shopping list."
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to Add Item",
        description: error.message || "Could not add item to shopping list.",
        variant: "destructive"
      });
    }
  });



  // Generate shopping list preview
  const previewGenerateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/shopping-lists/preview', {});
      return response.json();
    },
    onSuccess: (data) => {
      let items = data.items || [];

      if (items.length === 0) {
        items = [
          { productName: 'Milk', quantity: 1, reason: 'Purchased weekly' },
          { productName: 'Bananas', quantity: 1, reason: 'Running low based on purchase cycle' },
          { productName: 'Bread', quantity: 1, reason: 'Typically purchased every 5 days' },
          { productName: 'Eggs', quantity: 1, reason: 'Regularly purchased item' },
          { productName: 'Toilet Paper', quantity: 1, reason: 'Based on typical household usage' },
          { productName: 'Chicken Breast', quantity: 1, reason: 'Purchased bi-weekly' },
          { productName: 'Tomatoes', quantity: 3, reason: 'Based on recipe usage patterns' }
        ];
      }

      const enhancedItems = items.map(item => ({
        ...item,
        detectedUnit: detectUnitFromItemName(item.productName)
      }));

      setGeneratedItems(enhancedItems);
      setGenerateDialogOpen(true);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to generate list preview",
        variant: "destructive" 
      });
    }
  });

  // Generate shopping list from typical purchases
  const generateListMutation = useMutation({
    mutationFn: async () => {
      const items = generatedItems.map(item => ({
        ...item,
        unit: detectUnitFromItemName(item.productName)
      }));

      const response = await apiRequest('POST', '/api/shopping-lists/generate', {
        items: items
      });
      return response.json();
    },
    onSuccess: (data) => {
      setGenerateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });

      const itemCount = data.itemsAdded || generatedItems.length;
      toast({
        title: "Shopping List Generated",
        description: `Added ${itemCount} items with smart unit detection based on your purchase patterns`
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

  // Edit shopping list item
  const editItemMutation = useMutation({
    mutationFn: async () => {
      if (!editItemId) throw new Error("No item selected for editing");

      const response = await apiRequest('PATCH', `/api/shopping-list/items/${editItemId}`, {
        productName: editItemName,
        quantity: editItemQuantity,
        unit: editItemUnit
      });
      return response.json();
    },
    onSuccess: () => {
      setEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
      toast({
        title: "Item Updated",
        description: "Item has been updated in your shopping list"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update item",
        variant: "destructive"
      });
    }
  });

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemName.trim()) {
      const productName = newItemName.trim();

      // If auto-detect is enabled, determine the unit type based on item name
      const unit = autoDetectUnit 
        ? detectUnitFromItemName(productName) 
        : newItemUnit;

      addItemMutation.mutate({
        productName,
        quantity: newItemQuantity,
        unit
      });
    }
  };

  const handleToggleItem = (itemId: number, currentStatus: boolean) => {
    toggleItemMutation.mutate({ itemId, completed: !currentStatus });
  };

  const handleDeleteItem = (itemId: number) => {
    deleteItemMutation.mutate(itemId);
  };

  const handleEditItem = (item: ShoppingListItem) => {
    setEditItemId(item.id);
    setEditItemName(item.productName);
    setEditItemQuantity(item.quantity);
    setEditItemUnit(item.unit || 'COUNT');
    setEditDialogOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editItemName.trim()) {
      editItemMutation.mutate();
    }
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
  const rawItems = defaultList?.items ?? [];

  // Sort items by category first, then alphabetically within category
  const sortItemsByCategory = (items: ShoppingListItem[]) => {
    const categoryOrder = [
      'Produce',
      'Dairy & Eggs', 
      'Meat & Seafood',
      'Bakery',
      'Pantry & Canned Goods',
      'Frozen Foods',
      'Personal Care',
      'Household Items'
    ];

    return items.sort((a, b) => {
      // Get category for each item based on product name
      const getCategoryFromName = (productName: string) => {
        const name = productName.toLowerCase();
        if (/\b(banana|apple|orange|grape|strawberr|tomato|onion|carrot|potato|lettuce|spinach)\w*/i.test(name)) return 'Produce';
        if (/\b(milk|cheese|yogurt|egg|butter|cream)\w*/i.test(name)) return 'Dairy & Eggs';
        if (/\b(beef|chicken|pork|turkey|fish|meat|salmon|shrimp)\w*/i.test(name)) return 'Meat & Seafood';
        if (/\b(bread|loaf|roll|bagel|muffin|cake)\w*/i.test(name)) return 'Bakery';
        if (/\b(rice|pasta|bean|sauce|soup|cereal|flour|sugar|salt)\w*/i.test(name)) return 'Pantry & Canned Goods';
        if (/\b(frozen|ice cream|pizza)\w*/i.test(name)) return 'Frozen Foods';
        if (/\b(shampoo|soap|toothpaste|deodorant|lotion)\w*/i.test(name)) return 'Personal Care';
        if (/\b(cleaner|detergent|towel|tissue|toilet paper)\w*/i.test(name)) return 'Household Items';
        return 'Other';
      };

      const categoryA = getCategoryFromName(a.productName);
      const categoryB = getCategoryFromName(b.productName);

      // First sort by completion status (incomplete items first)
      if (a.isCompleted !== b.isCompleted) {
        return a.isCompleted ? 1 : -1;
      }

      // Then sort by category order
      const orderA = categoryOrder.indexOf(categoryA);
      const orderB = categoryOrder.indexOf(categoryB);

      if (orderA !== orderB) {
        // Put unknown categories at the end
        if (orderA === -1) return 1;
        if (orderB === -1) return -1;
        return orderA - orderB;
      }

      // Finally sort alphabetically within the same category
      return a.productName.localeCompare(b.productName);
    });
  };

  const items = sortItemsByCategory(rawItems);

  // Enhanced recommendations with more details for the recommendations tab
  const enhancedRecommendations = [
    {
      id: 1,
      productName: 'Organic Milk (Gallon)',
      currentPrice: 459,
      salePrice: 389,
      savings: 70,
      retailer: 'Whole Foods',
      distance: '1.2 miles',
      dealExpires: '2 days',
      reason: 'You buy milk every 6 days. Stock up on this 15% off deal.',
      rating: 4.8,
      category: 'Dairy'
    },
    {
      id: 2,
      productName: 'Free-Range Eggs (Dozen)',
      currentPrice: 349,
      salePrice: 279,
      savings: 70,
      retailer: 'Target',
      distance: '0.8 miles',
      dealExpires: '1 day',
      reason: 'Running low based on your purchase pattern. Great deal expires soon!',
      rating: 4.6,
      category: 'Dairy'
    },
    {
      id: 3,
      productName: 'Ground Turkey (1 lb)',
      currentPrice: 599,
      salePrice: 449,
      savings: 150,
      retailer: 'Walmart',
      distance: '2.1 miles',
      dealExpires: '4 days',
      reason: 'Healthy protein alternative. 25% off this week.',
      rating: 4.3,
      category: 'Meat'
    },
    {
      id: 4,
      productName: 'Organic Bananas (3 lbs)',
      currentPrice: 299,
      salePrice: 199,
      savings: 100,
      retailer: 'Kroger',
      distance: '1.5 miles',
      dealExpires: '3 days',
      reason: 'Your most purchased fruit. Stock up at lowest price this month.',
      rating: 4.7,
      category: 'Produce'
    }
  ];

  return (
    <div className="p-3 sm:p-4 pb-20">


      {/* Header */}
      <div className="mb-4">
        <h2 className="text-xl font-bold mb-4 text-gray-900">Shopping List</h2>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Button 
            variant="default" 
            size="lg" 
            onClick={() => previewGenerateMutation.mutate()}
            className="flex items-center justify-center h-12 text-base font-semibold bg-primary text-white border-2 border-primary hover:bg-primary/90 shadow-md transition-all"
            disabled={previewGenerateMutation.isPending}
          >
            <Wand2 className="h-5 w-5 mr-2" />
            {previewGenerateMutation.isPending ? 'Generating...' : 'Generate List'}
          </Button>
          <Button 
            variant="default" 
            size="lg" 
            onClick={() => setRecipeDialogOpen(true)} 
            className="flex items-center justify-center h-12 text-base font-semibold bg-slate-600 text-white border-2 border-slate-600 hover:bg-slate-700 shadow-md transition-all"
          >
            <FileText className="h-5 w-5 mr-2" />
            Import Recipe
          </Button>
        </div>
      </div>

      {/* Manual Add Item Section - Enhanced Visibility */}
      <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center mb-3">
          <Plus className="h-5 w-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Add New Item</h3>
        </div>

        <form onSubmit={handleAddItem}>
          <div className="flex space-x-2 mb-3">
            <Input
              type="text"
              placeholder="What do you need to buy?"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="flex-1 bg-white border-2 border-blue-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base font-medium shadow-sm"
              style={{ backgroundColor: 'white !important' }}
            />
            <Button 
              type="submit" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 font-semibold text-base shadow-md transition-all duration-200 rounded-lg"
              disabled={addItemMutation.isPending}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>

          <div className="flex space-x-3 mb-3">
            <div className="w-24">
              <Label className="text-sm font-medium text-gray-700 mb-1 block">Quantity</Label>
              <Input
                type="number"
                placeholder="1"
                min="1"
                defaultValue="1"
                onChange={(e) => setNewItemQuantity(parseInt(e.target.value) || 1)}
                className="w-full bg-white border-2 border-gray-300 rounded-lg text-gray-900 text-center text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 px-3 py-2 font-medium"
                style={{ backgroundColor: 'white !important' }}
              />
            </div>

            <div className="flex-1">
              <Label className="text-sm font-medium text-gray-700 mb-1 block">Unit</Label>
              <Select 
                value={newItemUnit} 
                onValueChange={setNewItemUnit}
                disabled={autoDetectUnit}
              >
                <SelectTrigger className={`w-full border-2 ${autoDetectUnit ? 'border-gray-200 opacity-60' : 'border-gray-300'} bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-lg py-2`}>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COUNT">Count</SelectItem>
                  <SelectItem value="LB">lb (Pounds)</SelectItem>
                  <SelectItem value="OZ">oz (Ounces)</SelectItem>
                  <SelectItem value="GALLON">Gallon</SelectItem>
                  <SelectItem value="LOAF">Loaf</SelectItem>
                  <SelectItem value="PKG">Package</SelectItem>
                  <SelectItem value="ROLL">Rolls</SelectItem>
                  <SelectItem value="BOX">Box</SelectItem>
                  <SelectItem value="CAN">Can</SelectItem>
                  <SelectItem value="BOTTLE">Bottle</SelectItem>
                  <SelectItem value="JAR">Jar</SelectItem>
                  <SelectItem value="BUNCH">Bunch</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-sm">
            <Switch 
              checked={autoDetectUnit} 
              onCheckedChange={setAutoDetectUnit}
              id="auto-detect"
            />
            <Label htmlFor="auto-detect" className="cursor-pointer flex items-center font-medium text-gray-800">
              <Wand2 className="h-4 w-4 mr-2 text-blue-600" /> 
              Smart unit detection based on item name
            </Label>
          </div>
        </form>
      </div>

      <Tabs defaultValue="list" className="mt-2">
        <TabsList className="grid w-full grid-cols-3 mb-3 h-10 bg-gray-100 border border-gray-300">
          <TabsTrigger value="list" className="flex items-center justify-center text-sm font-semibold py-2 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-700 hover:text-gray-900">
            <ShoppingBag className="h-4 w-4 mr-1" />
            List
          </TabsTrigger>
          <TabsTrigger value="optimize" className="flex items-center justify-center text-sm font-semibold py-2 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-700 hover:text-gray-900">
            <BarChart2 className="h-4 w-4 mr-1" />
            Optimize
          </TabsTrigger>
           <TabsTrigger value="recommendations" className="flex items-center justify-center text-sm font-semibold py-2 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-700 hover:text-gray-900">
            <BarChart2 className="h-4 w-4 mr-1" />
            Recommendations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {suggestions && Array.isArray(suggestions) && suggestions.length > 0 && (
            <details className="mb-4 border border-gray-200 rounded-md">
              <summary className="cursor-pointer p-3 font-medium text-sm">
                Suggestions based on your shopping history (click to expand)
              </summary>
              <div className="p-3 space-y-2 border-t border-gray-200">
                {suggestions.map((suggestion: any, index: number) => (
                  <div key={index} className="flex justify-between items-center py-2">
                    <span className="text-sm">
                      {suggestion.type === 'swap' ? suggestion.suggestedItem : suggestion.suggestedItem}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => addItemMutation.mutate({
                        productName: suggestion.suggestedItem,
                        quantity: 1,
                        unit: detectUnitFromItemName(suggestion.suggestedItem)
                      })}
                    >
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            </details>
          )}

          <ScrollArea className="h-[400px] w-full rounded-md border">
            <div className="space-y-3">
              {items.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-gray-500">
                    <ShoppingBag className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                    <p>Your shopping list is empty</p>
                    <p className="text-sm mt-1">Add items to get started</p>
                  </CardContent>
                </Card>
              ) : (
                (() => {
                  // Group items by category for display
                  const getCategoryFromName = (productName: string) => {
                    const name = productName.toLowerCase();
                    if (/\b(banana|apple|orange|grape|strawberr|tomato|onion|carrot|potato|lettuce|spinach)\w*/i.test(name)) return 'Produce';
                    if (/\b(milk|cheese|yogurt|egg|butter|cream)\w*/i.test(name)) return 'Dairy & Eggs';
                    if (/\b(beef|chicken|pork|turkey|fish|meat|salmon|shrimp)\w*/i.test(name)) return 'Meat & Seafood';
                    if (/\b(bread|loaf|roll|bagel|muffin|cake)\w*/i.test(name)) return 'Bakery';
                    if (/\b(rice|pasta|bean|sauce|soup|cereal|flour|sugar|salt)\w*/i.test(name)) return 'Pantry & Canned Goods';
                    if (/\b(frozen|ice cream|pizza)\w*/i.test(name)) return 'Frozen Foods';
                    if (/\b(shampoo|soap|toothpaste|deodorant|lotion)\w*/i.test(name)) return 'Personal Care';
                    if (/\b(cleaner|detergent|towel|tissue|toilet paper)\w*/i.test(name)) return 'Household Items';
                    return 'Other';
                  };

                  const getCategoryIcon = (category: string) => {
                    switch (category) {
                      case 'Produce': return '🍎';
                      case 'Dairy & Eggs': return '🥛';
                      case 'Meat & Seafood': return '🥩';
                      case 'Bakery': return '🍞';
                      case 'Pantry & Canned Goods': return '🥫';
                      case 'Frozen Foods': return '❄️';
                      case 'Personal Care': return '🧼';
                      case 'Household Items': return '🏠';
                      default: return '🛒';
                    }
                  };

                  // Group items by category while preserving sort order
                  const groupedItems: { [key: string]: ShoppingListItem[] } = {};
                  items.forEach(item => {
                    const category = getCategoryFromName(item.productName);
                    if (!groupedItems[category]) {
                      groupedItems[category] = [];
                    }
                    groupedItems[category].push(item);
                  });

                  // Separate completed and incomplete items
                  const incompleteItems = items.filter(item => !item.isCompleted);
                  const completedItems = items.filter(item => item.isCompleted);

                  // Group incomplete items by category
                  const incompleteGrouped: { [key: string]: ShoppingListItem[] } = {};
                  incompleteItems.forEach(item => {
                    const category = getCategoryFromName(item.productName);
                    if (!incompleteGrouped[category]) {
                      incompleteGrouped[category] = [];
                    }
                    incompleteGrouped[category].push(item);
                  });

                  return (
                    <>
                      {/* Incomplete items grouped by category */}
                      {Object.entries(incompleteGrouped).map(([category, categoryItems]) => (
                        <div key={`incomplete-${category}`} className="space-y-2">
                          <div className="flex items-center space-x-2 mt-4 mb-2">
                            <span className="text-lg">{getCategoryIcon(category)}</span>
                            <h4 className="font-semibold text-gray-700">{category}</h4>
                            <div className="flex-1 h-px bg-gray-300"></div>
                            <span className="text-xs text-gray-500">{categoryItems.length} items</span>
                          </div>
                          {categoryItems.map((item) => (
                            <div key={`incomplete-${category}-${item.id}`} className="mobile-shopping-item border-2 border-slate-200 rounded-xl p-4 ml-2 bg-white">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center flex-1">
                                  <input
                                    type="checkbox"
                                    checked={item.isCompleted}
                                    onChange={() => handleToggleItem(item.id, item.isCompleted)}
                                    className="h-5 w-5 text-primary rounded mr-4 flex-shrink-0 cursor-pointer"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center flex-wrap gap-2 mb-1">
                                      <span className="font-medium text-gray-800 text-base item-text">
                                        {item.productName}
                                      </span>
                                      <span className="text-sm bg-slate-100 text-slate-700 px-3 py-1 rounded-full whitespace-nowrap font-medium border border-slate-200">
                                        {item.quantity} {item.unit && item.unit !== "COUNT" ? item.unit.toLowerCase() : ""}
                                      </span>
                                    </div>
                                    {item.suggestedRetailerId && item.suggestedPrice && (
                                      <div className="flex items-center text-sm text-gray-500">
                                        <span>
                                          Best: ${(item.suggestedPrice / 100).toFixed(2)}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex space-x-2 ml-3">
                                  <button
                                    onClick={() => handleEditItem(item)}
                                    className="text-gray-400 hover:text-blue-500 p-2 rounded-full hover:bg-blue-50 transition-colors"
                                    aria-label="Edit item"
                                  >
                                    <Pencil className="h-5 w-5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteItem(item.id)}
                                    className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors"
                                    aria-label="Delete item"
                                  >
                                    <Trash2 className="h-5 w-5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}

                      {/* Completed items section */}
                      {completedItems.length > 0 && (
                        <div className="mt-6">
                          <div className="flex items-center space-x-2 mb-3">
                            <Check className="h-5 w-5 text-green-600" />
                            <h4 className="font-semibold text-gray-700">Completed</h4>
                            <div className="flex-1 h-px bg-gray-300"></div>
                            <span className="text-xs text-gray-500">{completedItems.length} items</span>
                          </div>
                          <div className="space-y-2">
                            {completedItems.map((item: ShoppingListItem) => (
                              <div key={`completed-item-${item.id}`} className="mobile-shopping-item border-2 border-gray-200 rounded-xl p-4 ml-2 bg-gray-50 opacity-75">
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center flex-1">
                                    <input
                                      type="checkbox"
                                      checked={item.isCompleted}
                                      onChange={() => handleToggleItem(item.id, item.isCompleted)}
                                      className="h-5 w-5 text-primary rounded mr-4 flex-shrink-0 cursor-pointer"
                                    />
                                                                   <div className="flex-1 min-w-0">
                                      <div className="flex items-center flex-wrap gap-2">
                                        <span className="font-medium line-through text-gray-500 text-base item-text">
                                          {item.productName}
                                        </span>
                                        <span className="text-sm bg-gray-100 text-gray-500 px-3 py-1 rounded-full whitespace-nowrap border border-gray-200">
                                          {item.quantity} {item.unit && item.unit !== "COUNT" ? item.unit.toLowerCase() : ""}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                                                 <div className="ml-3">
                                    <button
                                      onClick={() => handleDeleteItem(item.id)}
                                      className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors"
                                      aria-label="Delete item"
                                    >
                                      <Trash2 className="h-5 w-5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()
              )}
            </div>
          </ScrollArea>
        </TabsContent>



        <TabsContent value="optimize" className="space-y-4">
          <h3 className="text-xl font-bold mb-2 text-gray-900">Shopping Plans</h3>
          <p className="text-base text-gray-700 mb-4 font-medium">
            Choose the best shopping plan for your needs. We'll optimize your list across retailers.
          </p>

          <div className="grid gap-4">
            {/* Single Store Plan */}
            <Card className="border-2 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="bg-blue-100 p-3 rounded-lg mr-4">
                      <Clock className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-gray-900">Single Store</h4>
                      <p className="text-sm text-gray-600 mt-1">Shop everything at one convenient location</p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>• Fastest shopping</span>
                        <span>• One trip</span>
                        <span>• Higher prices</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline">~35 min</Badge>
                </div>

                {/* Plan Summary */}
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-semibold text-blue-800">Walmart</span>
                    <span className="text-sm text-blue-600">{items.length} items</span>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="text-sm">
                      <div className="flex justify-between">
                        <span>Estimated Total:</span>
                        <span className="font-semibold">$47.85</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Est. Shopping Time:</span>
                        <span>35 minutes</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-gray-600">
                    Top items: {items.slice(0, 3).map(item => item.productName).join(', ')}
                    {items.length > 3 && ` +${items.length - 3} more`}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    className="w-full bg-gray-700 hover:bg-gray-800 text-white"
                    onClick={() => {
                      window.location.href = `/plan-details?listId=${defaultList?.id}&planType=single-store&mode=online`;
                    }}
                  >
                    Order Online
                  </Button>
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={() => {
                      window.location.href = `/plan-details?listId=${defaultList?.id}&planType=single-store&mode=instore`;
                    }}
                  >
                    Shop In-Store
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Best Value Plan */}
            <Card className="border-2 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="bg-green-100 p-3 rounded-lg mr-4">
                      <DollarSign className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-gray-900">Best Value</h4>
                      <p className="text-sm text-gray-600 mt-1">Maximum savings across multiple stores</p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>• Lowest prices</span>
                        <span>• Multiple trips</span>
                        <span>• Best deals</span>
                      </div>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Most Savings</Badge>
                </div>

                {/* Plan Summary */}
                <div className="bg-green-50 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-semibold text-green-800">Multi-Store Plan</span>
                    <span className="text-sm text-green-600">3 stores</span>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="text-sm">
                      <div className="flex justify-between">
                        <span>Estimated Total:</span>
                        <span className="font-semibold">$38.20</span>
                      </div>
                      <div className="flex justify-between text-green-600">
                        <span>You Save:</span>
                        <span className="font-semibold">$9.65</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Est. Shopping Time:</span>
                        <span>65 minutes</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-gray-600">
                    Stores: Walmart, Target, Safeway
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    className="w-full bg-gray-700 hover:bg-gray-800 text-white"
                    onClick={() => {
                      window.location.href = `/plan-details?listId=${defaultList?.id}&planType=best-value&mode=online`;
                    }}
                  >
                    Order Online
                  </Button>
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      window.location.href = `/plan-details?listId=${defaultList?.id}&planType=best-value&mode=instore`;
                    }}
                  >
                    Shop In-Store
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Balanced Plan */}
            <Card className="border-2 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="bg-purple-100 p-3 rounded-lg mr-4">
                      <BarChart2 className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-gray-900">Balanced Plan</h4>
                      <p className="text-sm text-gray-600 mt-1">Good savings with reasonable convenience</p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>• Moderate savings</span>
                        <span>• 2-3 stores</span>
                        <span>• Time efficient</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-purple-700 border-purple-200">~45 min</Badge>
                </div>

                {/* Plan Summary */}
                <div className="bg-purple-50 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-semibold text-purple-800">Balanced Plan</span>
                    <span className="text-sm text-purple-600">2 stores</span>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="text-sm">
                      <div className="flex justify-between">
                        <span>Estimated Total:</span>
                        <span className="font-semibold">$42.15</span>
                      </div>
                      <div className="flex justify-between text-purple-600">
                        <span>You Save:</span>
                        <span className="font-semibold">$5.70</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Est. Shopping Time:</span>
                        <span>45 minutes</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-gray-600">
                    Stores: Walmart, Target
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    className="w-full bg-gray-700 hover:bg-gray-800 text-white"
                    onClick={() => {
                      window.location.href = `/plan-details?listId=${defaultList?.id}&planType=balanced&mode=online`;
                    }}
                  >
                    Order Online
                  </Button>
                  <Button 
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    onClick={() => {
                      window.location.href = `/plan-details?listId=${defaultList?.id}&planType=balanced&mode=instore`;
                    }}
                  >
                    Shop In-Store
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-4">
              <h4 className="font-semibold mb-3">Expiring Deals Alert</h4>
              <div className="space-y-3">
                {expiringDeals.map(deal => (
                  <div key={deal.id} className="flex justify-between items-center border-b pb-2">
                    <div>
                      <p className="font-medium">{deal.product}</p>
                      <div className="flex text-xs text-gray-500 space-x-3 mt-1">
                        <span>{deal.retailer}</span>
                        <span className="text-red-500">Expires: {deal.expires}</span>
                      </div>
                    </div>
                    <Badge>{deal.discount} off</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <h3 className="text-lg font-semibold mb-4">Smart Recommendations</h3>
          <p className="text-gray-600 text-sm mb-4">Maximize savings on your typical purchases</p>

          <ScrollArea className="h-[400px] w-full rounded-md border">
            <div className="space-y-3">
              {enhancedRecommendations.map((item) => (
                <Card key={item.id} className="transition-all hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-800 mb-1">{item.productName}</h4>
                        <div className="flex items-center space-x-2 mb-2">
                          <Star className="h-3 w-3 text-yellow-500 fill-current" />
                          <span className="text-xs text-gray-600">{item.rating}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500 line-through">
                            ${(item.currentPrice / 100).toFixed(2)}
                          </span>
                          <span className="font-bold text-primary">
                            ${(item.salePrice / 100).toFixed(2)}
                          </span>
                        </div>
                        <Badge variant="secondary" className="bg-green-50 text-green-700 mt-1">
                          <TrendingDown className="h-3 w-3 mr-1" />
                          ${(item.savings / 100).toFixed(2)} off
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="h-3 w-3 mr-1" />
                        {item.retailer} • {item.distance}
                      </div>
                      <div className="flex items-center text-sm text-orange-600">
                        <Clock className="h-3 w-3 mr-1" />
                        Deal expires in {item.dealExpires}
                      </div>
                      <p className="text-sm text-gray-600">{item.reason}</p>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center">
                        <Percent className="h-4 w-4 text-green-600 mr-1" />
                        <span className="text-sm font-medium text-green-600">
                          {Math.round((item.savings / item.currentPrice) * 100)}% off
                        </span>
                      </div>
                      <Button 
                        size="sm" 
                        className="bg-primary hover:bg-primary/90"
                        onClick={(e) => {
                          e.stopPropagation();
                          addItemMutation.mutate({
                            productName: item.productName,
                            quantity: 1,
                            unit: 'COUNT'
                          });
                        }}
                        disabled={addItemMutation.isPending}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {addItemMutation.isPending ? "Adding..." : "Add to List"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

      </Tabs>

      {/* Recipe Dialog */}
      <Dialog open={recipeDialogOpen} onOpenChange={setRecipeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Recipe</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Enter a recipe URL to automatically add all ingredients to your shopping list.
            </p>
            <div className="grid gap-3">
              <Label htmlFor="recipe-url">Recipe URL</Label>
              <Input 
                id="recipe-url" 
                placeholder="https://example.com/recipe" 
                value={recipeUrl}
                onChange={(e) => setRecipeUrl(e.target.value)}
                className="bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                style={{ backgroundColor: 'white !important' }}
              />

              <Label htmlFor="servings">Servings</Label>
              <Select value={servings} onValueChange={setServings}>
                <SelectTrigger>
                  <SelectValue placeholder="Select servings" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 serving</SelectItem>
                  <SelectItem value="2">2 servings</SelectItem>
                  <SelectItem value="4">4 servings</SelectItem>
                  <SelectItem value="6">6 servings</SelectItem>
                  <SelectItem value="8">8 servings</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => setRecipeDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={() => importRecipeMutation.mutate()}
              disabled={!recipeUrl || importRecipeMutation.isPending}
            >
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Shopping List Item</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="grid gap-3">
              <Label htmlFor="edit-item-name">Item Name</Label>
              <Input 
                id="edit-item-name" 
                placeholder="Item name" 
                value={editItemName}
                onChange={(e) => setEditItemName(e.target.value)}
                className="w-full bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                style={{ backgroundColor: 'white !important' }}
              />

              <div className="flex space-x-2">
                <div className="w-1/3">
                  <Label htmlFor="edit-item-quantity">Quantity</Label>
                  <Input
                    id="edit-item-quantity"
                    type="number"
                    min="1"
                    value={editItemQuantity}
                    onChange={(e) => setEditItemQuantity(parseInt(e.target.value) || 1)}
                    className="w-16 bg-gray-50 border border-gray-200 rounded text-gray-800 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent px-2 py-1"
                    style={{ backgroundColor: 'white !important' }}
                  />
                </div>

                <div className="w-2/3">
                  <Label htmlFor="edit-item-unit">Unit</Label>
                  <Select 
                    value={editItemUnit} 
                    onValueChange={setEditItemUnit}
                    disabled={autoDetectUnit}
                  >
                    <SelectTrigger id="edit-item-unit" className={`w-full ${autoDetectUnit ? 'opacity-60' : ''}`}>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COUNT">Count</SelectItem>
                      <SelectItem value="LB">lb (Pounds)</SelectItem>
                      <SelectItem value="OZ">oz (Ounces)</SelectItem>
                      <SelectItem value="GALLON">Gallon</SelectItem>
                      <SelectItem value="LOAF">Loaf</SelectItem>
                      <SelectItem value="PKG">Package</SelectItem>
                      <SelectItem value="ROLL">Rolls</SelectItem>
                      <SelectItem value="BOX">Box</SelectItem>
                      <SelectItem value="CAN">Can</SelectItem>
                      <SelectItem value="BOTTLE">Bottle</SelectItem>
                      <SelectItem value="JAR">Jar</SelectItem>
                      <SelectItem value="BUNCH">Bunch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2 mt-2">
                <Switch 
                  checked={autoDetectUnit} 
                  onCheckedChange={(checked) => {
                    setAutoDetectUnit(checked);
                    if (checked) {
                      setEditItemUnit(detectUnitFromItemName(editItemName));
                    }
                  }}
                  id="edit-auto-detect"
                />
                <Label htmlFor="edit-auto-detect" className="cursor-pointer flex items-center text-sm">
                  <Wand2 className="h-3.5 w-3.5 mr-1.5" /> 
                  Auto-detect unit based on item name
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => setEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={!editItemName.trim() || editItemMutation.isPending}
              >
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Generate List Preview Dialog */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>AI Generated Shopping List</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Based on your purchase history, here are suggested items for your shopping list:
            </p>
            <div className="max-h-64 overflow-y-auto">
              {generatedItems.map((item, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                  <div>
                    <span className="font-medium">{item.productName}</span>
                    <span className="text-sm text-gray-500 block">{item.reason}</span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {item.quantity} {item.detectedUnit && item.detectedUnit !== "COUNT" ? item.detectedUnit.toLowerCase() : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => setGenerateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={() => generateListMutation.mutate()}
              disabled={generateListMutation.isPending}
            >
              Add Items to List
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export { ShoppingListComponent as default, ShoppingListComponent as ShoppingList };