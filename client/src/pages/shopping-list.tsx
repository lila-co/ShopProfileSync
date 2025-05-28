
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

  const defaultList = shoppingLists?.[0];

  // Add item mutation
  const addItemMutation = useMutation({
    mutationFn: async (data: { shoppingListId: number; productName: string; quantity: number; unit: string }) => {
      const response = await apiRequest('POST', '/api/shopping-list/items', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
      setNewItemName('');
      setNewItemQuantity(1);
      setNewItemUnit('COUNT');
      toast({
        title: "Item Added",
        description: "Item has been added to your shopping list"
      });
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

  // Generate shopping list from AI recommendations
  const generateRecommendationsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/shopping-lists/recommendations', {});
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedItems(data.items || []);
      setGenerateDialogOpen(true);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to generate recommendations",
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

    const detectedUnit = detectUnitFromItemName(newItemName);
    
    addItemMutation.mutate({
      shoppingListId: defaultList.id,
      productName: newItemName.trim(),
      quantity: newItemQuantity,
      unit: newItemUnit || detectedUnit
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

  const pendingItems = defaultList.items?.filter(item => !item.isCompleted) || [];
  const completedItems = defaultList.items?.filter(item => item.isCompleted) || [];

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
            onClick={() => generateRecommendationsMutation.mutate()}
            disabled={generateRecommendationsMutation.isPending}
            className="flex items-center gap-2 h-12"
          >
            <Wand2 className="h-4 w-4" />
            <span className="text-xs">AI Suggestions</span>
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

        {/* Add Item Form */}
        <Card className="mb-6">
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
                  <Select value={newItemUnit} onValueChange={setNewItemUnit}>
                    <SelectTrigger className="w-20 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COUNT">ea</SelectItem>
                      <SelectItem value="LB">lb</SelectItem>
                      <SelectItem value="OZ">oz</SelectItem>
                      <SelectItem value="GAL">gal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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

        {/* Shopping List Items */}
        <div className="space-y-4">
          {/* Pending Items */}
          {pendingItems.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium text-sm mb-3 text-gray-900">
                  To Buy ({pendingItems.length})
                </h3>
                <div className="space-y-2">
                  {pendingItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                      <button
                        onClick={() => toggleItemMutation.mutate({ itemId: item.id, completed: true })}
                        className="w-5 h-5 rounded-full border-2 border-gray-300 hover:border-green-500 transition-colors flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {item.productName}
                          </span>
                          <span className="text-xs text-gray-500 flex-shrink-0">
                            {item.quantity} {item.unit?.toLowerCase() || 'ea'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditItem(item)}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => deleteItemMutation.mutate(item.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Completed Items */}
          {completedItems.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium text-sm mb-3 text-gray-600">
                  Completed ({completedItems.length})
                </h3>
                <div className="space-y-2">
                  {completedItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg opacity-60">
                      <button
                        onClick={() => toggleItemMutation.mutate({ itemId: item.id, completed: false })}
                        className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center flex-shrink-0"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500 line-through truncate">
                            {item.productName}
                          </span>
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {item.quantity} {item.unit?.toLowerCase() || 'ea'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteItemMutation.mutate(item.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
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
      </div>

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

      {/* Generate Items Dialog */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI Generated Recommendations</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Based on your shopping patterns, here are some recommendations:
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {generatedItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded-lg">
                  <div>
                    <span className="text-sm font-medium">{item.productName}</span>
                    <div className="text-xs text-gray-500">
                      {item.quantity} {item.unit} • {item.category}
                    </div>
                    {item.reason && (
                      <div className="text-xs text-blue-600 mt-1">{item.reason}</div>
                    )}
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    ${(item.estimatedPrice / 100).toFixed(2)}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => generateListMutation.mutate()}
              disabled={generateListMutation.isPending}
            >
              Add All Items
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNavigation activeTab="lists" />
    </div>
  );
};

export default ShoppingListPage;
export { ShoppingListPage };
