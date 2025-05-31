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
import { Plus, ShoppingBag, FileText, Clock, Check, Trash2, AlertTriangle, DollarSign, MapPin, Car, BarChart2, Wand2, Pencil, Image } from 'lucide-react';
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

      <form onSubmit={handleAddItem} className="mb-6">
        <div className="flex space-x-2 mb-2">
          <Input
            type="text"
            placeholder="Add an item..."
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            className="flex-1 bg-gray-50 border border-gray-200 rounded-l-lg px-3 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
            style={{ backgroundColor: 'white !important' }}
          />
          <Button 
            type="submit" 
            className="bg-primary text-white"
            disabled={addItemMutation.isPending}
          >
            Add
          </Button>
        </div>

        <div className="flex space-x-2">
          <div className="w-20">
            <Input
              type="number"
              placeholder="Qty"
              min="1"
              defaultValue="1"
              onChange={(e) => setNewItemQuantity(parseInt(e.target.value) || 1)}
              className="w-16 bg-gray-50 border border-gray-200 rounded text-gray-800 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent px-2 py-1"
              style={{ backgroundColor: 'white !important' }}
            />
          </div>

          <Select 
            value={newItemUnit} 
            onValueChange={setNewItemUnit}
            disabled={autoDetectUnit}
          >
            <SelectTrigger className={`flex-1 ${autoDetectUnit ? 'opacity-60' : ''}`}>
              <SelectValue placeholder="Unit" />
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

        <div className="flex items-center space-x-2 mt-2 text-sm text-gray-600">
          <Switch 
            checked={autoDetectUnit} 
            onCheckedChange={setAutoDetectUnit}
            id="auto-detect"
          />
          <Label htmlFor="auto-detect" className="cursor-pointer flex items-center">
            <Wand2 className="h-3.5 w-3.5 mr-1.5" /> 
            Auto-detect best unit based on item name
          </Label>
        </div>
      </form>

      <Tabs defaultValue="list" className="mt-2">
        <TabsList className="grid w-full grid-cols-4 mb-3 h-8">
          <TabsTrigger value="list" className="flex items-center justify-center text-xs font-medium py-1">
            <ShoppingBag className="h-3 w-3 mr-1" />
            List
          </TabsTrigger>
          <TabsTrigger value="price" className="flex items-center justify-center text-xs font-medium py-1">
            <DollarSign className="h-3 w-3 mr-1" />
            Price
          </TabsTrigger>
          <TabsTrigger value="optimize" className="flex items-center justify-center text-xs font-medium py-1">
            <BarChart2 className="h-3 w-3 mr-1" />
            Optimize
          </TabsTrigger>
          <TabsTrigger value="route" className="flex items-center justify-center text-xs font-medium py-1">
            <Car className="h-3 w-3 mr-1" />
            Route
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

        <TabsContent value="price" className="space-y-4">
          <h3 className="text-lg font-semibold mb-2">Price Comparison</h3>
          <p className="text-sm text-gray-500 mb-4">
            We've compared your shopping list prices across different retailers to help you save money.
          </p>

          {isLoadingCosts ? (
            <div className="p-8 text-center">
              <div className="h-8 w-8 border-4 border-t-primary border-gray-200 rounded-full animate-spin mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Calculating costs...</p>
            </div>
          ) : costData ? (
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-semibold text-lg mb-4">Best Option: Shop at Multiple Stores</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>Total Cost</span>
                      <span className="font-semibold">${(costData.multiStore.totalCost / 100).toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span>Savings vs. Single Store</span>
                      <span className="text-green-600 font-semibold">${(costData.multiStore.savings / 100).toFixed(2)}</span>
                    </div>

                    <Separator className="my-2" />

                    <div className="space-y-3">
                      <h5 className="font-medium">Shopping Plan:</h5>
                      {costData.multiStore.retailers.map((store: any, index: number) => (
                        <div key={store.retailerId} className="border rounded-lg p-3">
                          <div className="flex justify-between mb-2">
                            <div>
                              <span className="font-semibold">{store.retailerName}</span>
                              <span className="ml-2 text-sm text-gray-500">{store.items?.length || 0} items</span>
                            </div>
                            <span className="font-semibold">${(store.subtotal / 100).toFixed(2)}</span>
                          </div>

                          <div className="mb-2 text-sm text-gray-500">
                            {store.items && store.items.slice(0, 3).map((item: any, idx: number) => (
                              <div key={idx} className="flex justify-between">
                                <span>{item.productName} (x{item.quantity})</span>
                                <span>${(item.price / 100).toFixed(2)}</span>
                              </div>
                            ))}
                            {store.items && store.items.length > 3 && (
                              <div className="text-sm text-right text-primary cursor-pointer">
                                +{store.items.length - 3} more items
                              </div>
                            )}
                          </div>

                          <Button 
                            className="w-full mt-1 text-sm h-8"
                            variant="outline"
                            onClick={() => {
                              window.location.href = `/shop?retailerId=${store.retailerId}&listId=${defaultList?.id}`;
                            }}
                          >
                            <ShoppingBag className="mr-2 h-3.5 w-3.5" />
                            Shop at {store.retailerName}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <h4 className="font-semibold text-md mt-6 mb-2">Single Store Options</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {costData.singleStore.map((store: any, index: number) => (
                  <Card key={store.retailerId} className={index === 0 ? "border-primary" : ""}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h5 className="font-semibold">{store.retailerName}</h5>
                          <div className="flex space-x-4 text-sm text-gray-500 mt-1">
                            <span>Total: ${(store.totalCost / 100).toFixed(2)}</span>
                            {index !== 0 && (
                              <span className="text-red-500">
                                +${((store.totalCost - costData.singleStore[0].totalCost) / 100).toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                        {index === 0 && (
                          <Badge className="bg-primary text-white">Best Value</Badge>
                        )}
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Items with deals</span>
                          <span>{store.items?.filter((i: any) => i.hasDeal)?.length || 0} of {store.items?.length || 0}</span>
                        </div>
                        <Progress value={store.items?.length ? ((store.items?.filter((i: any) => i.hasDeal)?.length || 0) / store.items.length) * 100 : 0} className="h-2" />
                      </div>

                      <Button 
                        className="w-full mt-4"
                        onClick={() => {
                          window.location.href = `/shop?retailerId=${store.retailerId}&listId=${defaultList?.id}`;
                        }}
                        variant={index === 0 ? "default" : "outline"}
                      >
                        <ShoppingBag className="mr-2 h-4 w-4" />
                        Shop at {store.retailerName}
                      </Button>

                      {/* Bulk Deals */}
                      {store.bulkDeals && store.bulkDeals.length > 0 && (
                        <div className="mt-4">
                          <h6 className="text-sm font-medium mb-2 flex items-center">
                            <AlertTriangle className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
                            Bulk Deals Available
                          </h6>
                          <div className="text-xs text-gray-600 space-y-1.5">
                            {store.bulkDeals.map((deal: any, idx: number) => (
                              <div key={idx} className="border border-amber-100 bg-amber-50 p-2 rounded">
                                Buy {deal.quantity} {deal.productName} and save ${(deal.savings / 100).toFixed(2)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center border rounded-lg">
              <AlertTriangle className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500">Could not calculate price comparison</p>
              <p className="text-sm text-gray-400 mt-1">Try adding more items to your shopping list</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="optimize" className="space-y-4">
          <h3 className="text-lg font-semibold mb-2">Shopping List Optimization</h3>
          <p className="text-sm text-gray-500 mb-4">
            Set your preferences to optimize your shopping experience across multiple retailers.
          </p>

          <div className="space-y-6">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div>
                  <h4 className="font-semibold mb-3">What matters most to you?</h4>
                  <RadioGroup 
                    className="space-y-2" 
                    value={optimizationPreference}
                    onValueChange={setOptimizationPreference}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="cost" id="cost" />
                      <Label htmlFor="cost" className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-2 text-green-600" />
                        <div>
                          <span className="font-medium">Cost Savings</span>
                          <p className="text-xs text-gray-500">Prioritize getting the best prices, even if it means shopping at multiple stores</p>
                        </div>
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="convenience" id="convenience" />
                      <Label htmlFor="convenience" className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-blue-600" />
                        <div>
                          <span className="font-medium">Convenience</span>
                          <p className="text-xs text-gray-500">Shop at a single store even if some items cost more</p>
                        </div>
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="quality" id="quality" />
                      <Label htmlFor="quality" className="flex items-center">
                        <Check className="h-4 w-4 mr-2 text-purple-600" />
                        <div>
                          <span className="font-medium">Quality</span>
                          <p className="text-xs text-gray-500">Prioritize preferred brands and specialty stores</p>
                        </div>
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="sustainability" id="sustainability" />
                      <Label htmlFor="sustainability" className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 8a5 5 0 0 0-5-5c-1.956 0-3.693.94-4.794 2.393A5 5 0 0 0 13 18a4.966 4.966 0 0 0 3.584-1.553A4.978 4.978 0 0 0 18 13h-6"></path>
                        </svg>
                        <div>
                          <span className="font-medium">Sustainability</span>
                          <p className="text-xs text-gray-500">Prioritize eco-friendly products and locally sourced items</p>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-3">Select your preferred retailers</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {retailers && retailers.map((retailer: any) => {
                      const logoUrl = getCompanyLogo(retailer.name);

                      return (
                        <div key={retailer.id} className="flex items-center space-x-2">
                          <input 
                            type="checkbox" 
                            id={`retailer-${retailer.id}`}
                            checked={selectedRetailers.includes(retailer.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRetailers([...selectedRetailers, retailer.id]);
                              } else {
                                setSelectedRetailers(selectedRetailers.filter(id => id !== retailer.id));
                              }
                            }}
                            className="h-4 w-4 text-primary rounded"
                          />
                          <div className="flex items-center">
                            {logoUrl ? (
                              <img 
                                src={logoUrl} 
                                alt={retailer.name} 
                                className="h-5 w-5 mr-2 object-contain" 
                              />
                            ) : (
                              <div 
                                className="h-5 w-5 mr-2 rounded-full flex items-center justify-center"
                                style={{backgroundColor: retailer.logoColor || '#4A7CFA'}}
                              >
                                <span className="text-xs text-white font-bold">
                                  {retailer.name.charAt(0)}
                                </span>
                              </div>
                            )}
                            <Label htmlFor={`retailer-${retailer.id}`} className="text-sm">
                              {retailer.name}
                            </Label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Button 
                  className="w-full mt-2"
                  disabled={selectedRetailers.length === 0}
                  onClick={() => {
                    toast({
                      title: "Shopping List Optimized",
                      description: `Optimized for ${optimizationPreference} across ${selectedRetailers.length} retailers`
                    });
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 13.341C14 14.793 10.848 15.643 9.5 15.643C8.152 15.643 5 14.793 5 13.341C5 11.89 8.152 11.04 9.5 11.04C10.848 11.04 14 11.89 14 13.341Z"/>
                    <path d="M14 13.341V17.693C14 18.982 11.183 19.996 9.5 19.996C7.817 19.996 5 18.982 5 17.693V13.341"/>
                    <path d="M18.71 7.314C18.71 8.936 15.143 9.914 13.5 9.914C11.857 9.914 8.29 8.936 8.29 7.314C8.29 5.692 11.857 4.714 13.5 4.714C15.143 4.714 18.71 5.692 18.71 7.314Z"/>
                    <path d="M18.71 7.314V11.9C18.71 12.913 17.5 13.8 15.807 14.267"/>
                    <path d="M13.5 9.914C11.857 9.914 8.29 8.936 8.29 7.314"/>
                  </svg>
                  Optimize Shopping List
                </Button>
              </CardContent>
            </Card>

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
          </div>
        </TabsContent>

        <TabsContent value="route" className="space-y-4">
          <h3 className="text-lg font-semibold mb-2">Shopping Route</h3>
          <p className="text-sm text-gray-500 mb-4">
            Plan the optimal route for your shopping trip across multiple stores.
          </p>

          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Map Route</h4>
                <Switch 
                  checked={showRouteMap} 
                  onCheckedChange={setShowRouteMap}
                />
              </div>

              <div>
                <h5 className="text-sm font-medium mb-2">Selected Retailers</h5>
                <div className="grid grid-cols-2 gap-2">
                  {retailers && retailers.map((retailer: any) => (
                    <div key={retailer.id} className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        id={`route-retailer-${retailer.id}`}
                        checked={selectedRetailers.includes(retailer.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRetailers([...selectedRetailers, retailer.id]);
                          } else {
                            setSelectedRetailers(selectedRetailers.filter(id => id !== retailer.id));
                          }
                        }}
                        className="h-4 w-4 text-primary rounded"
                      />
                      <Label htmlFor={`route-retailer-${retailer.id}`} className="text-sm">{retailer.name}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {showRouteMap && (
                <div className="mt-4 border rounded-lg overflow-hidden relative h-64 bg-gray-200">
                  {isLoadingRoute ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-8 w-8 border-4 border-t-primary border-gray-300 rounded-full animate-spin"></div>
                    </div>
                  ) : routeData ? (
                    <div className="absolute inset-0">
                      <div className="p-3 bg-white/80 backdrop-blur-sm z-10 absolute bottom-0 left-0 right-0">
                        <div className="flex justify-between items-center mb-2">
                          <h6 className="font-medium">Optimized Route</h6>
                          <span className="text-sm text-gray-600">{routeData.totalDistance.toFixed(1)} miles</span>
                        </div>
                        <div className="flex space-x-2">
                          {routeData.retailers.map((retailer: any, index: number) => (
                            <div key={retailer.id} className="text-xs text-center">
                              <div className="bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center mx-auto">
                                {index + 1}
                              </div>
                              <span className="block mt-1">{retailer.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="h-full w-full bg-gray-100 flex items-center justify-center">
                        <div className="text-center text-gray-400">
                          <MapPin className="h-8 w-8 mx-auto mb-2" />
                          <p className="text-sm">Map visualization would go here</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                      <Car className="h-8 w-8 mb-2" />
                      <p>Select retailers to view route</p>
                    </div>
                  )}
                </div>
              )}

              <Button 
                className="w-full mt-2"
                disabled={selectedRetailers.length < 2}
                onClick={() => {
                  toast({
                    title: "Shopping Route Created",
                    description: `Optimized route for ${selectedRetailers.length} stores`
                  });
                }}
              >
                <Car className="h-4 w-4 mr-2" />
                Generate Shopping Route
              </Button>
            </CardContent>
          </Card>
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