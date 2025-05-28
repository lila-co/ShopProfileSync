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
import { Plus, ShoppingBag, FileText, Clock, Check, Trash2, AlertTriangle, DollarSign, MapPin, Car, BarChart2, Wand2, Pencil, Image, ShoppingCart } from 'lucide-react';
import { getItemImage, getBestProductImage, getCompanyLogo } from '@/lib/imageUtils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { detectUnitFromItemName } from '@/lib/utils';
import BottomNavigation from '@/components/layout/BottomNavigation';

const ShoppingListPage: React.FC = () => {
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [newItemUnit, setNewItemUnit] = useState('COUNT');
  const [autoDetectUnit, setAutoDetectUnit] = useState(true);
  const [recipeDialogOpen, setRecipeDialogOpen] = useState(false);
  const [recipeUrl, setRecipeUrl] = useState('');
  const [servings, setServings] = useState('4');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingListItem | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const [editItemQuantity, setEditItemQuantity] = useState(1);
  const [editItemUnit, setEditItemUnit] = useState('COUNT');
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [generatedItems, setGeneratedItems] = useState<any[]>([]);
  const [shoppingPlanModalOpen, setShoppingPlanModalOpen] = useState(false);
  const [shoppingPlanData, setShoppingPlanData] = useState<any>(null);
  const [shoppingPlanType, setShoppingPlanType] = useState<'single' | 'multi' | 'budget'>('single');
  const [optimizationProgress, setOptimizationProgress] = useState(0);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResults, setOptimizationResults] = useState<any>(null);
  const [recipePreviewOpen, setRecipePreviewOpen] = useState(false);
  const [recipePreviewItems, setRecipePreviewItems] = useState<any[]>([]);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch shopping lists
  const { data: shoppingLists, isLoading } = useQuery({
    queryKey: ['/api/shopping-lists']
  });

  // Get personalized suggestions based on user profile and recent purchases
  const { data: suggestions, isLoading: suggestionsLoading } = useQuery<any[]>({
    queryKey: ['/api/shopping-lists/suggestions'],
    enabled: !!shoppingLists,
  });

  const defaultList = shoppingLists?.[0];

  // Add item mutation
  const addItemMutation = useMutation({
    mutationFn: async (data: { shoppingListId: number; productName: string; quantity: number; unit: string }) => {
      const response = await apiRequest('POST', '/api/shopping-list/items', data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
      setNewItemName('');
      setNewItemQuantity(1);
      setNewItemUnit('COUNT');

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
        title: "Error",
        description: "Failed to add item",
        variant: "destructive"
      });
    }
  });

  // Preview recipe ingredients
  const previewRecipeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/shopping-lists/recipe-preview', {
        recipeUrl,
        servings: parseInt(servings)
      });
      return response.json();
    },
    onSuccess: (data) => {
      setRecipePreviewItems(data.ingredients || []);
      setRecipePreviewOpen(true);
      setRecipeDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to preview recipe ingredients",
        variant: "destructive"
      });
    }
  });

  // Add selected recipe items to shopping list
  const addRecipeItemsMutation = useMutation({
    mutationFn: async (selectedItems: any[]) => {
      const defaultList = shoppingLists?.[0];
      if (!defaultList) throw new Error("No shopping list found");

      const response = await apiRequest('POST', '/api/shopping-lists/recipe-add', {
        shoppingListId: defaultList.id,
        items: selectedItems
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
      setRecipePreviewOpen(false);
      setRecipePreviewItems([]);
      setRecipeUrl('');
      toast({
        title: "Recipe Imported",
        description: "Selected ingredients have been added to your shopping list"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add recipe ingredients",
        variant: "destructive"
      });
    }
  });

  // Generate shopping list preview
  const previewGenerateMutation = useMutation({
    mutationFn: async () => {
      // First get a preview of items before actually creating the list
      const response = await apiRequest('POST', '/api/shopping-lists/preview', {});
      return response.json();
    },
    onSuccess: (data) => {
      // Get items from API or generate sample items if none are returned
      let items = data.items || [];

      // If no items were returned, show sample suggestions
      if (items.length === 0) {
        // Sample items to demonstrate the feature
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

      // Enhance items with smart unit detection
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
      // Apply smart unit detection to generated items before creating the list
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

      // Show success message with stats
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

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const response = await apiRequest('DELETE', `/api/shopping-list/items/${itemId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
      toast({
        title: "Item Deleted",
        description: "Item has been removed from your shopping list"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive"
      });
    }
  });

  // Edit item mutation
  const editItemMutation = useMutation({
    mutationFn: async (data: { itemId: number; productName: string; quantity: number; unit: string }) => {
      const response = await apiRequest('PATCH', `/api/shopping-list/items/${data.itemId}`, {
        productName: data.productName,
        quantity: data.quantity,
        unit: data.unit
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
      setEditDialogOpen(false);
      setEditingItem(null);
      toast({
        title: "Item Updated",
        description: "Item has been updated successfully"
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

  // Optimize shopping plan
  const optimizeShoppingPlanMutation = useMutation({
    mutationFn: async (planType: 'single' | 'multi' | 'budget') => {
      if (!defaultList) throw new Error("No shopping list found");

      setIsOptimizing(true);
      setOptimizationProgress(0);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setOptimizationProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      try {
        const response = await apiRequest('POST', '/api/shopping-lists/optimize', {
          shoppingListId: defaultList.id,
          planType
        });
        const result = await response.json();

        clearInterval(progressInterval);
        setOptimizationProgress(100);

        setTimeout(() => {
          setIsOptimizing(false);
          setOptimizationProgress(0);
        }, 500);

        return result;
      } catch (error) {
        clearInterval(progressInterval);
        setIsOptimizing(false);
        setOptimizationProgress(0);
        throw error;
      }
    },
    onSuccess: (data) => {
      setOptimizationResults(data);
      setShoppingPlanData(data);
      setShoppingPlanModalOpen(true);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to optimize shopping plan",
        variant: "destructive"
      });
    }
  });

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !defaultList) return;

    const productName = newItemName.trim();

    // If auto-detect is enabled, determine the unit type based on item name
    const unit = autoDetectUnit 
      ? detectUnitFromItemName(productName) 
      : newItemUnit;

    addItemMutation.mutate({
      shoppingListId: defaultList.id,
      productName,
      quantity: newItemQuantity,
      unit
    });
  };

  const handleEditItem = (item: ShoppingListItem) => {
    setEditingItem(item);
    setEditItemName(item.productName);
    setEditItemQuantity(item.quantity);
    setEditItemUnit(item.unit || 'COUNT');
    setEditDialogOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editItemName.trim()) return;

    editItemMutation.mutate({
      itemId: editingItem.id,
      productName: editItemName.trim(),
      quantity: editItemQuantity,
      unit: editItemUnit
    });
  };

  const handleToggleRecipeItem = (index: number) => {
    setRecipePreviewItems(prev => 
      prev.map((item, i) => 
        i === index ? { ...item, isSelected: !item.isSelected } : item
      )
    );
  };

  const handleAddSelectedRecipeItems = () => {
    const selectedItems = recipePreviewItems.filter(item => item.isSelected);
    if (selectedItems.length === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select at least one item to add to your shopping list",
        variant: "destructive"
      });
      return;
    }
    addRecipeItemsMutation.mutate(selectedItems);
  };

  const handleOptimize = (planType: 'single' | 'multi' | 'budget') => {
    setShoppingPlanType(planType);
    optimizeShoppingPlanMutation.mutate(planType);
  };

  const openShoppingPlan = (plan: any) => {
    console.log('Opening shopping plan:', { plan });
    setShoppingPlanData(plan);
    setShoppingPlanModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your shopping list...</p>
        </div>
      </div>
    );
  }

  if (!defaultList) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Shopping List Found</h2>
          <p className="text-gray-600">Create your first shopping list to get started.</p>
        </div>
      </div>
    );
  }

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

  const rawItems = defaultList?.items ?? [];
  const items = sortItemsByCategory(rawItems);
  const pendingItems = items.filter(item => !item.isCompleted);
  const completedItems = items.filter(item => item.isCompleted);

  // Group incomplete items by category
  const incompleteGrouped: { [key: string]: ShoppingListItem[] } = {};
  pendingItems.forEach(item => {
    const category = getCategoryFromName(item.productName);
    if (!incompleteGrouped[category]) {
      incompleteGrouped[category] = [];
    }
    incompleteGrouped[category].push(item);
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-md mx-auto pt-6 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Shopping List</h1>
            <p className="text-sm text-gray-600">{defaultList.name}</p>
          </div>
          <Badge variant="secondary" className="text-xs">
            {(defaultList.items?.length || 0)} items
          </Badge>
        </div>

        {/* Generate Shopping List Banner */}
        <div className="mb-8 w-full border-2 border-primary shadow-lg rounded-lg overflow-hidden">
          <div className="bg-primary text-white px-4 py-2 text-lg font-bold text-center">
            Generate Your Shopping List
          </div>
          <div className="p-4 bg-primary/5">
            <p className="text-center mb-4 text-sm">Our AI analyzes your purchase history to create personalized shopping lists</p>
            <Button 
              variant="default" 
              onClick={() => previewGenerateMutation.mutate()}
              size="lg"
              className="w-full bg-primary hover:bg-primary/90 text-white py-6 text-lg font-bold"
            >
              <Wand2 className="h-5 w-5 mr-2" />
              GENERATE SHOPPING LIST
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setRecipeDialogOpen(true)}
            className="flex items-center gap-2 h-12"
          >
            <FileText className="h-4 w-4" />
            <span className="text-xs">Import Recipe</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              // Upload List functionality - could link to receipt scanner or file upload
              window.location.href = '/scan';
            }}
            className="flex items-center gap-2 h-12"
          >
            <Image className="h-4 w-4" />
            <span className="text-xs">Upload List</span>
          </Button>
        </div>

        {/* Optimization Controls */}
        {pendingItems.length > 0 && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart2 className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-sm">Optimize Shopping Plan</span>
              </div>

              {isOptimizing && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>Analyzing deals and routes...</span>
                    <span>{optimizationProgress}%</span>
                  </div>
                  <Progress value={optimizationProgress} className="h-2" />
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleOptimize('single')}
                  disabled={isOptimizing}
                  className="text-xs h-8"
                >
                  <MapPin className="h-3 w-3 mr-1" />
                  Single Store
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleOptimize('multi')}
                  disabled={isOptimizing}
                  className="text-xs h-8"
                >
                  <Car className="h-3 w-3 mr-1" />
                  Multi-Store
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleOptimize('budget')}
                  disabled={isOptimizing}
                  className="text-xs h-8"
                >
                  <DollarSign className="h-3 w-3 mr-1" />
                  Budget
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Suggestions */}
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
                      shoppingListId: defaultList.id,
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

        {/* Shopping List Items - Categorized and Sorted */}
        <div className="space-y-4">
          {/* Pending Items by Category */}
          {Object.entries(incompleteGrouped).map(([category, categoryItems]) => (
            <div key={`incomplete-${category}`} className="space-y-2">
              <div className="flex items-center space-x-2 mt-4 mb-2">
                <span className="text-lg">{getCategoryIcon(category)}</span>
                <h4 className="font-semibold text-gray-700">{category}</h4>
                <div className="flex-1 h-px bg-gray-200"></div>
                <span className="text-xs text-gray-500">{categoryItems.length} items</span>
              </div>
              <div className="space-y-2">
                {categoryItems.map((item: ShoppingListItem) => (
                  <Card key={item.id} className="ml-2">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center flex-1">
                          <input
                            type="checkbox"
                            checked={item.isCompleted}
                            onChange={() => toggleItemMutation.mutate({ itemId: item.id, completed: true })}
                            className="h-5 w-5 text-primary rounded mr-3"
                          />
                          <div className="flex-1">
                            <div className="flex items-center">
                              <span className="font-medium text-gray-800">
                                {item.productName}
                              </span>
                              <span className="ml-2 text-sm bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                                Qty: {item.quantity} {item.unit && item.unit !== "COUNT" && (
                                  <span className="text-xs text-gray-500">{item.unit.toLowerCase()}</span>
                                )}
                              </span>
                            </div>
                            {item.suggestedRetailerId && item.suggestedPrice && (
                              <div className="flex items-center text-xs text-gray-500 mt-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/>
                                  <path d="M3 9V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4"/>
                                </svg>
                                <span>
                                  Best price: ${(item.suggestedPrice / 100).toFixed(2)} at Retailer #{item.suggestedRetailerId}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditItem(item)}
                            className="text-gray-400 hover:text-blue-500"
                            aria-label="Edit item"
                            title="Edit item"
                          >
                            <Pencil className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => deleteItemMutation.mutate(item.id)}
                            className="text-gray-400 hover:text-red-500"
                            aria-label="Delete item"
                            title="Delete item"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}

          {/* Completed Items Section */}
          {completedItems.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center space-x-2 mb-3">
                <Check className="h-5 w-5 text-green-600" />
                <h4 className="font-semibold text-gray-700">Completed</h4>
                <div className="flex-1 h-px bg-gray-200"></div>
                <span className="text-xs text-gray-500">{completedItems.length} items</span>
              </div>
              <div className="space-y-2">
                {completedItems.map((item: ShoppingListItem) => (
                  <Card key={item.id} className="opacity-60 ml-2">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center flex-1">
                          <input
                            type="checkbox"
                            checked={item.isCompleted}
                            onChange={() => toggleItemMutation.mutate({ itemId: item.id, completed: false })}
                            className="h-5 w-5 text-primary rounded mr-3"
                          />
                          <div className="flex-1">
                            <div className="flex items-center">
                              <span className="font-medium line-through text-gray-500">
                                {item.productName}
                              </span>
                              <span className="ml-2 text-sm bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                                Qty: {item.quantity} {item.unit && item.unit !== "COUNT" && (
                                  <span className="text-xs text-gray-500">{item.unit.toLowerCase()}</span>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => deleteItemMutation.mutate(item.id)}
                            className="text-gray-400 hover:text-red-500"
                            aria-label="Delete item"
                            title="Delete item"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {pendingItems.length === 0 && completedItems.length === 0 && (
            <div className="text-center py-12">
              <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Your list is empty</h3>
              <p className="text-sm text-gray-600 mb-4">Start by adding items or importing a recipe</p>
            </div>
          )}
        </div>

        {/* Add Item Form - Moved to bottom */}
        <Card className="mt-6">
          <CardContent className="p-4">
            <form onSubmit={handleAddItem} className="space-y-3">
              <div className="flex gap-2">
                <Input 
                  placeholder="Add item to list..." 
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="flex-1 text-sm"
                />
                <div className="flex gap-1">
                  <Input
                    type="number"
                    min="1"
                    value={newItemQuantity}
                    onChange={(e) => setNewItemQuantity(parseInt(e.target.value) || 1)}
                    className="w-16 text-sm"
                  />
                  <Select 
                    value={newItemUnit} 
                    onValueChange={setNewItemUnit}
                    disabled={autoDetectUnit}
                  >
                    <SelectTrigger className={`w-20 text-xs ${autoDetectUnit ? 'opacity-60' : ''}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COUNT">ea</SelectItem>
                      <SelectItem value="LB">lb</SelectItem>
                      <SelectItem value="OZ">oz</SelectItem>
                      <SelectItem value="GAL">gal</SelectItem>
                      <SelectItem value="PKG">pkg</SelectItem>
                      <SelectItem value="BOX">box</SelectItem>
                      <SelectItem value="CAN">can</SelectItem>
                      <SelectItem value="BOTTLE">bottle</SelectItem>
                      <SelectItem value="JAR">jar</SelectItem>
                      <SelectItem value="BUNCH">bunch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-sm text-gray-600">
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

              <Button 
                type="submit" 
                className="w-full text-sm h-9"
                disabled={!newItemName.trim() || addItemMutation.isPending}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* All Dialogs remain the same... */}

      {/* Recipe Preview Dialog */}
      <Dialog open={recipePreviewOpen} onOpenChange={setRecipePreviewOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Recipe Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Select the ingredients you want to add to your shopping list:
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {recipePreviewItems.map((item, index) => (
                <div key={index} className="flex items-center space-x-3 p-2 border rounded-lg">
                  <input
                    type="checkbox"
                    checked={item.isSelected}
                    onChange={() => handleToggleRecipeItem(index)}
                    className="rounded"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium">{item.productName}</span>
                    <div className="text-xs text-gray-500">
                      {item.quantity} {item.unit}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecipePreviewOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddSelectedRecipeItems}
              disabled={addRecipeItemsMutation.isPending}
            >
              Add Selected Items
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Recipe Dialog */}
      <Dialog open={recipeDialogOpen} onOpenChange={setRecipeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Recipe</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="recipe-url">Recipe URL</Label>
              <Input 
                id="recipe-url"
                placeholder="https://example.com/recipe" 
                value={recipeUrl}
                onChange={(e) => setRecipeUrl(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <Label htmlFor="servings">Servings</Label>
              <Input 
                id="servings"
                type="number"
                min="1"
                max="20"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecipeDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => previewRecipeMutation.mutate()}
              disabled={!recipeUrl || previewRecipeMutation.isPending}
            >
              Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Items Dialog */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Shopping List Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Based on your typical purchases, we've prepared the following list. 
              You can modify this list after generating it.
            </p>

            {generatedItems.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <ShoppingBag className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                <p>No items to generate</p>
              </div>
            ) : (
              <div className="space-y-2">
                {generatedItems.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-2 border-b">
                    <div>
                      <p className="font-medium">{item.productName}</p>
                      <div className="text-xs text-gray-500">
                        {item.reason && <p>Reason: {item.reason}</p>}
                        {item.frequency && <p>Typically purchased: {item.frequency}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        Qty: {item.quantity || 1} {autoDetectUnit && (
                          <Badge variant="outline" className="ml-1">
                            {(item.detectedUnit || detectUnitFromItemName(item.productName)).toLowerCase()}
                          </Badge>
                        )}
                      </div>
                      {autoDetectUnit && (
                        <p className="text-xs text-gray-500 mt-1 flex items-center justify-end">
                          <Wand2 className="h-3 w-3 mr-1.5" /> Smart unit detection
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button 
              variant="outline" 
              onClick={() => setGenerateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              disabled={generateListMutation.isPending} 
              onClick={() => generateListMutation.mutate()}>
              Generate List
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shopping Plan Modal */}
      <Dialog open={shoppingPlanModalOpen} onOpenChange={setShoppingPlanModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5" />
              Optimized Shopping Plan
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
            {shoppingPlanData ? (
              <div className="space-y-6">
                {/* Plan Summary */}
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-green-900">Plan Summary</h3>
                    <Badge className="bg-green-100 text-green-800">
                      {shoppingPlanType === 'single' ? 'Single Store' : 
                       shoppingPlanType === 'multi' ? 'Multi-Store' : 'Budget Optimized'}
                    </Badge>
                  </div>
                  {shoppingPlanData.totalSavings && (
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-green-700 font-medium">Total Savings</p>
                        <p className="text-green-900 font-bold">
                          ${(shoppingPlanData.totalSavings / 100).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-green-700 font-medium">Regular Price</p>
                        <p className="text-gray-600">
                          ${((shoppingPlanData.totalOptimizedPrice + shoppingPlanData.totalSavings) / 100).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-green-700 font-medium">Your Price</p>
                        <p className="text-green-900 font-bold">
                          ${(shoppingPlanData.totalOptimizedPrice / 100).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Store Plans */}
                {shoppingPlanData.stores ? (
                  <Tabs defaultValue="0" className="w-full">
                    <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${shoppingPlanData.stores.length}, 1fr)` }}>
                      {shoppingPlanData.stores.map((store: any, index: number) => (
                        <TabsTrigger key={index} value={index.toString()} className="text-xs">
                          <div className="flex items-center gap-2">
                            <img 
                              src={getCompanyLogo(store.retailerName)} 
                              alt={store.retailerName}
                              className="w-4 h-4 rounded"
                            />
                            {store.retailerName}
                          </div>
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {shoppingPlanData.stores.map((store: any, index: number) => (
                      <TabsContent key={index} value={index.toString()} className="space-y-4">
                        <div className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <img 
                                src={getCompanyLogo(store.retailerName)} 
                                alt={store.retailerName}
                                className="w-8 h-8 rounded"
                              />
                              <div>
                                <h4 className="font-semibold">{store.retailerName}</h4>
                                <p className="text-sm text-gray-600">{store.address}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-600">Subtotal</p>
                              <p className="font-bold">${(store.subtotal / 100).toFixed(2)}</p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            {store.items.slice(0, 5).map((item: any, itemIndex: number) => (
                              <div key={itemIndex} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                                <div className="flex items-center gap-3">
                                  <img 
                                    src={getBestProductImage(item.productName)} 
                                    alt={item.productName}
                                    className="w-8 h-8 rounded object-cover"
                                  />
                                  <div>
                                    <p className="font-medium text-sm">{item.productName}</p>
                                    <p className="text-xs text-gray-600">
                                      {item.quantity} {item.unit?.toLowerCase() || 'ea'}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium text-sm">
                                    ${(item.totalPrice / 100).toFixed(2)}
                                  </p>
                                  {item.dealInfo && (
                                    <p className="text-xs text-green-600">
                                      Save ${((item.dealInfo.regularPrice - item.price) / 100).toFixed(2)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}

                            {store.items.length > 5 && (
                              <div className="text-center py-2">
                                <button 
                                  onClick={() => openShoppingPlan(shoppingPlanData)}
                                  className="text-sm text-blue-600 hover:text-blue-800"
                                >
                                  +{store.items.length - 5} more items
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                ) : shoppingPlanData.items ? (
                  // Single store plan
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={getCompanyLogo(shoppingPlanData.retailerName)} 
                          alt={shoppingPlanData.retailerName}
                          className="w-8 h-8 rounded"
                        />
                        <div>
                          <h4 className="font-semibold">{shoppingPlanData.retailerName}</h4>
                          <p className="text-sm text-gray-600">{shoppingPlanData.address}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Total</p>
                        <p className="font-bold">${(shoppingPlanData.totalPrice / 100).toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {shoppingPlanData.items.slice(0, 10).map((item: any, index: number) => (
                        <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                          <div className="flex items-center gap-3">
                            <img 
                              src={getBestProductImage(item.productName)} 
                              alt={item.productName}
                              className="w-8 h-8 rounded object-cover"
                            />
                            <div>
                              <p className="font-medium text-sm">{item.productName}</p>
                              <p className="text-xs text-gray-600">
                                {item.quantity} {item.unit?.toLowerCase() || 'ea'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-sm">
                              ${(item.price / 100).toFixed(2)}
                            </p>
                            {!item.isAvailable && (
                              <p className="text-xs text-red-600">Out of stock</p>
                            )}
                          </div>
                        </div>
                      ))}

                      {shoppingPlanData.items.length > 10 && (
                        <div className="text-center py-2">
                          <button 
                            onClick={() => openShoppingPlan(shoppingPlanData)}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            +{shoppingPlanData.items.length - 10} more items
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="mb-2 text-sm sm:text-base">No shopping plan data available</p>
                    <p className="text-xs sm:text-sm">Please try generating the shopping plan again.</p>
                  </div>
                )}

                {/* Mobile Action Buttons */}
                <div className="sticky bottom-0 bg-white border-t border-gray-200 pt-4 mt-6 -mx-4 -mb-4 px-4 pb-4">
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1">
                      <MapPin className="h-4 w-4 mr-2" />
                      View Route
                    </Button>
                    <Button className="flex-1">
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Start Shopping
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="mb-2 text-sm sm:text-base">No shopping plan data available</p>
                <p className="text-xs sm:text-sm">Please try generating the shopping plan again.</p>
              </div>
            )}
          </div>
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
                className="w-full"
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
                    className="w-full"
                  />
                </div>
                <div className="w-2/3">
                  <Label htmlFor="edit-item-unit">Unit</Label>
                  <Select value={editItemUnit} onValueChange={setEditItemUnit}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COUNT">Each</SelectItem>
                      <SelectItem value="LB">Pounds</SelectItem>
                      <SelectItem value="OZ">Ounces</SelectItem>
                      <SelectItem value="GAL">Gallons</SelectItem>
                      <SelectItem value="QT">Quarts</SelectItem>
                      <SelectItem value="PT">Pints</SelectItem>
                      <SelectItem value="CUP">Cups</SelectItem>
                      <SelectItem value="TSP">Teaspoons</SelectItem>
                      <SelectItem value="TBSP">Tablespoons</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
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

      <BottomNavigation activeTab="lists" />
    </div>
  );
};

export default ShoppingListPage;
export { ShoppingListPage };