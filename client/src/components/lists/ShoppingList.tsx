import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ShoppingList as ShoppingListType, ShoppingListItem } from '@/lib/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { aiCategorizationService } from '@/lib/aiCategorization';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, ShoppingBag, FileText, Clock, Check, Trash2, AlertTriangle, DollarSign, MapPin, Car, BarChart2, Wand2, Pencil, Image, Star, TrendingDown, Percent, Circle, CheckCircle2 } from 'lucide-react';
import { getItemImage, getBestProductImage, getCompanyLogo } from '@/lib/imageUtils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

const ShoppingListComponent: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newItemName, setNewItemName] = useState('');
  const [recipeUrl, setRecipeUrl] = useState('');
  const [servings, setServings] = useState('4');
  const [recipeDialogOpen, setRecipeDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingListItem | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingQuantity, setEditingQuantity] = useState('');
  const [editingUnit, setEditingUnit] = useState('');
  const [isGeneratingList, setIsGeneratingList] = useState(false);
  const [generationSteps, setGenerationSteps] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(-1);

  const importRecipeMutation = useMutation({
    mutationFn: async () => {
      const defaultList = shoppingLists?.[0];
      if (!defaultList) throw new Error('No shopping list found');

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
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to import recipe ingredients",
        variant: "destructive"
      });
    }
  });

  const { data: shoppingLists, isLoading } = useQuery<ShoppingListType[]>({
    queryKey: ['/api/shopping-lists'],
  });

  const { data: suggestions, isLoading: suggestionsLoading } = useQuery({
    queryKey: ['/api/shopping-lists/suggestions'],
    enabled: !!shoppingLists,
  });

  // AI List Generation Animation and Auto-generation
  useEffect(() => {
    if (shoppingLists && shoppingLists.length > 0) {
      const defaultList = shoppingLists[0];
      const hasItems = defaultList.items && defaultList.items.length > 0;

      // Check if we've shown the animation before
      const hasShownAnimation = localStorage.getItem('listGenerationShown') === 'true';
      const forceAnimation = localStorage.getItem('forceShowAnimation') === 'true';

      // Show animation if: list is empty AND (never shown before OR forced)
      const shouldShowAnimation = !hasItems && (!hasShownAnimation || forceAnimation);

      if (shouldShowAnimation) {
        setIsGeneratingList(true);
        const steps = [
          "Analyzing your dietary preferences...",
          "Checking your pantry inventory...",
          "Finding the best deals and promotions...",
          "Optimizing your shopping route...",
          "Generating personalized recommendations..."
        ];

        setGenerationSteps(steps);
        setCurrentStep(0);

        const interval = setInterval(() => {
          setCurrentStep((prev) => {
            if (prev >= steps.length - 1) {
              clearInterval(interval);
              setTimeout(() => {
                setIsGeneratingList(false);
                localStorage.setItem('listGenerationShown', 'true');
                localStorage.removeItem('forceShowAnimation');

                // Auto-generate items
                generateSampleItems();
              }, 1000);
              return prev;
            }
            return prev + 1;
          });
        }, 1500);

        return () => clearInterval(interval);
      } else if (!hasItems && hasShownAnimation) {
        // If list is empty but we've shown animation before, just generate items directly
        generateSampleItems();
      }
    }
  }, [shoppingLists]);

  // Generate sample items for empty lists
  const generateSampleItems = async () => {
    const defaultList = shoppingLists?.[0];
    if (!defaultList || (defaultList.items && defaultList.items.length > 0)) return;

    try {
      const response = await apiRequest('POST', '/api/shopping-lists/generate', {
        shoppingListId: defaultList.id
      });

      if (response.ok) {
        // Refresh shopping lists to show new items
        queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });

        toast({
          title: "Shopping List Generated",
          description: "AI has created a personalized shopping list for you"
        });
      }
    } catch (error) {
      console.error('Failed to generate sample items:', error);
      // Fallback: add some basic items manually
      const basicItems = [
        { productName: 'Milk', quantity: 1, unit: 'GALLON' },
        { productName: 'Bread', quantity: 1, unit: 'LOAF' },
        { productName: 'Eggs', quantity: 1, unit: 'DOZEN' },
        { productName: 'Bananas', quantity: 2, unit: 'LB' },
        { productName: 'Chicken Breast', quantity: 1, unit: 'LB' }
      ];

      for (const item of basicItems) {
        try {
          await apiRequest('POST', '/api/shopping-list/items', {
            ...item,
            shoppingListId: defaultList.id
          });
        } catch (addError) {
          console.error('Failed to add item:', item.productName, addError);
        }
      }

      // Refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });

      toast({
        title: "Basic Items Added",
        description: "Added some essential items to get you started"
      });
    }

    const sampleItems = [
      { productName: 'Organic Milk', quantity: 1, unit: 'GALLON' },
      { productName: 'Bananas', quantity: 2, unit: 'LB' },
      { productName: 'Whole Grain Bread', quantity: 1, unit: 'LOAF' },
      { productName: 'Free-Range Eggs', quantity: 1, unit: 'DOZEN' },
      { productName: 'Chicken Breast', quantity: 1, unit: 'LB' }
    ];

    for (const item of sampleItems) {
      try {
        await apiRequest('POST', `/api/shopping-lists/${defaultList.id}/items`, item);
      } catch (error) {
        console.error('Error adding sample item:', error);
      }
    }

    // Refresh the list
    queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
  };

  const addItemMutation = useMutation({
    mutationFn: async (itemName: string) => {
      const defaultList = shoppingLists?.[0];
      if (!defaultList) throw new Error('No shopping list found');

      const response = await apiRequest('POST', `/api/shopping-lists/${defaultList.id}/items`, {
        productName: itemName,
        quantity: 1,
        unit: 'COUNT'
      });
      return response.json();
    },
    onSuccess: () => {
      setNewItemName('');
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
      toast({
        title: "Item added",
        description: "Item has been added to your shopping list",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add item",
        variant: "destructive",
      });
    }
  });

  const toggleItemMutation = useMutation({
    mutationFn: async ({ itemId, completed }: { itemId: number; completed: boolean }) => {
      const response = await apiRequest('PUT', `/api/shopping-lists/items/${itemId}`, {
        completed
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
        variant: "destructive",
      });
    }
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const response = await apiRequest('DELETE', `/api/shopping-lists/items/${itemId}`);
      if (!response.ok) {
        throw new Error('Failed to delete item');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
      toast({
        title: "Item deleted",
        description: "The item has been removed from your list"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete item",
        variant: "destructive"
      });
    }
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, updates }: { itemId: number; updates: Partial<ShoppingListItem> }) => {
      const response = await apiRequest('PUT', `/api/shopping-lists/items/${itemId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
      setEditingItem(null);
      toast({
        title: "Item updated",
        description: "Item has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update item",
        variant: "destructive",
      });
    }
  });

  const regenerateListMutation = useMutation({
    mutationFn: async () => {
      const defaultList = shoppingLists?.[0];
      if (!defaultList) throw new Error('No shopping list found');

      // First, delete all existing items
      if (defaultList.items && defaultList.items.length > 0) {
        for (const item of defaultList.items) {
          await apiRequest('DELETE', `/api/shopping-lists/items/${item.id}`);
        }
      }

      // Then generate new items
      const response = await apiRequest('POST', '/api/shopping-lists/generate', {
        shoppingListId: defaultList.id
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
      toast({
        title: "List Regenerated",
        description: "Your shopping list has been regenerated with fresh recommendations"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to regenerate list",
        variant: "destructive"
      });
    }
  });

  const handleRegenerateList = () => {
    // Show animation during regeneration
    setIsGeneratingList(true);
    const steps = [
      "Clearing current list...",
      "Analyzing your preferences...",
      "Finding fresh recommendations...",
      "Optimizing your shopping list...",
      "Finalizing new items..."
    ];

    setGenerationSteps(steps);
    setCurrentStep(0);

    let currentStepIndex = 0;
    const interval = setInterval(() => {
      currentStepIndex++;
      setCurrentStep(currentStepIndex);

      if (currentStepIndex >= steps.length - 1) {
        clearInterval(interval);
      }
    }, 1000);

    regenerateListMutation.mutate(undefined, {
      onSettled: () => {
        // Ensure animation completes before hiding
        setTimeout(() => {
          clearInterval(interval);
          setIsGeneratingList(false);
          setCurrentStep(-1);
        }, Math.max(1000, (steps.length - currentStepIndex) * 1000));
      }
    });
  };

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

  const handleEditItem = (item: ShoppingListItem) => {
    setEditingItem(item);
    setEditingName(item.productName);
    setEditingQuantity(item.quantity.toString());
    setEditingUnit(item.unit || 'COUNT');
  };

  const handleUpdateItem = () => {
    if (editingItem && editingName.trim()) {
      updateItemMutation.mutate({
        itemId: editingItem.id,
        updates: {
          productName: editingName.trim(),
          quantity: parseInt(editingQuantity) || 1,
          unit: editingUnit
        }
      });
    }
  });

  const handleRegenerateList = () => {
    // Show animation during regeneration
    setIsGeneratingList(true);
    const steps = [
      "Clearing current list...",
      "Analyzing your preferences...",
      "Finding fresh recommendations...",
      "Optimizing your shopping list...",
      "Finalizing new items..."
    ];

    setGenerationSteps(steps);
    setCurrentStep(0);

    let currentStepIndex = 0;
    const interval = setInterval(() => {
      currentStepIndex++;
      setCurrentStep(currentStepIndex);

      if (currentStepIndex >= steps.length - 1) {
        clearInterval(interval);
      }
    }, 1000);

    regenerateListMutation.mutate(undefined, {
      onSettled: () => {
        // Ensure animation completes before hiding
        setTimeout(() => {
          clearInterval(interval);
          setIsGeneratingList(false);
          setCurrentStep(-1);
        }, Math.max(1000, (steps.length - currentStepIndex) * 1000));
      }
    });
  };

  const handleImportRecipe = () => {
    if (recipeUrl.trim()) {
      importRecipeMutation.mutate();
    }
  };

  // Show AI generation animation
  if (isGeneratingList) {
    return (
      <div className="p-4 pb-20">
        <div className="max-w-md mx-auto">
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 relative">
                  <div className="absolute inset-0 bg-blue-600 rounded-full animate-pulse"></div>
                  <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                    <Wand2 className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  AI is Creating Your Smart Shopping List
                </h3>
                <p className="text-sm text-gray-600">
                  Please wait while we personalize your shopping experience
                </p>
              </div>

              <div className="space-y-3">
                {generationSteps.map((step, index) => (
                  <div key={index} className="flex items-center gap-3">
                    {index < currentStep ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                    ) : index === currentStep ? (
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                    ) : (
                      <Circle className="h-5 w-5 flex-shrink-0" />
                    )}
                    <span className="text-sm font-medium">{step}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 bg-white rounded-lg p-4">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                  <span>Progress</span>
                  <span>{Math.round(((currentStep + 1) / generationSteps.length) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${((currentStep + 1) / generationSteps.length) * 100}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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

      <form onSubmit={handleAddItem} className="flex space-x-2 mb-4">
        <Input
          type="text"
          placeholder="Add an item..."
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" disabled={addItemMutation.isPending}>
          <Plus className="h-4 w-4" />
        </Button>
      </form>

      <div className="mb-6 flex gap-2">
        <Button
          variant="outline"
          onClick={() => setRecipeDialogOpen(true)}
          className="flex items-center gap-1"
        >
          <FileText className="h-4 w-4" />
          <span>Import Recipe</span>
        </Button>

        <Button
          variant="outline"
          onClick={handleRegenerateList}
          disabled={regenerateListMutation.isPending}
          className="flex items-center gap-1"
        >
          <Wand2 className="h-4 w-4" />
          <span>{regenerateListMutation.isPending ? "Regenerating..." : "Regenerate List"}</span>
        </Button>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <Card key={item.id} className={`${item.completed ? 'opacity-60' : ''}`}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  <button
                    onClick={() => handleToggleItem(item.id, item.completed)}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      item.completed
                        ? 'bg-green-500 border-green-500'
                        : 'border-gray-300 hover:border-green-400'
                    }`}
                  >
                    {item.completed && <Check className="h-3 w-3 text-white" />}
                  </button>
                  <div className="flex-1">
                    <span className={`${item.completed ? 'line-through' : ''}`}>
                      {item.productName}
                    </span>
                    <div className="text-sm text-gray-500">
                      {item.quantity} {item.unit}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditItem(item)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {items.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <ShoppingBag className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Your shopping list is empty</p>
          <p className="text-sm">Add items above to get started</p>
        </div>
      )}

      {/* Recipe Import Dialog */}
      <Dialog open={recipeDialogOpen} onOpenChange={setRecipeDialogOpen}>
        <DialogContent>
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
              />
            </div>
            <div>
              <Label htmlFor="servings">Servings</Label>
              <Input
                id="servings"
                type="number"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                min="1"
                max="20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecipeDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleImportRecipe} 
              disabled={importRecipeMutation.isPending || !recipeUrl.trim()}
            >
              {importRecipeMutation.isPending ? "Importing..." : "Import Recipe"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Item Name</Label>
              <Input
                id="edit-name"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-quantity">Quantity</Label>
              <Input
                id="edit-quantity"
                type="number"
                value={editingQuantity}
                onChange={(e) => setEditingQuantity(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-unit">Unit</Label>
              <Input
                id="edit-unit"
                value={editingUnit}
                onChange={(e) => setEditingUnit(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateItem} disabled={updateItemMutation.isPending}>
              Update Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShoppingListComponent;