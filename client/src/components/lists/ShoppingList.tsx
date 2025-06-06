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
import { Plus, ShoppingBag, FileText, Clock, Check, Trash2, AlertTriangle, DollarSign, MapPin, Car, BarChart2, Wand2, Pencil, Image, Star, TrendingDown, Percent, Circle, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import { getItemImage, getBestProductImage, getCompanyLogo } from '@/lib/imageUtils';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import VoiceAgent from '@/components/voice/VoiceAgent';
// Removed next-auth import as it's not being used properly in this context

const ShoppingListComponent: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('1');
  const [newItemUnit, setNewItemUnit] = useState('COUNT');
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
  const [categorizedItems, setCategorizedItems] = useState<Record<string, ShoppingListItem[]>>({});
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [isCategorizingItems, setIsCategorizingItems] = useState(false);
  const [userHasClearedList, setUserHasClearedList] = useState(false);
  // Session handling removed - using AuthContext instead

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
    refetchOnWindowFocus: true,
    refetchInterval: 30000, // Refetch every 30 seconds instead of 2 seconds
    staleTime: 10000, // Consider data fresh for 10 seconds
  });

  const { data: suggestions, isLoading: suggestionsLoading } = useQuery({
    queryKey: ['/api/shopping-lists/suggestions'],
    enabled: !!shoppingLists,
  });

  // Category definitions with icons and colors
  const categoryConfig = {
    'Produce': { icon: '🍎', color: 'bg-green-100 text-green-800 border-green-200', aisle: 'Aisle 1' },
    'Dairy & Eggs': { icon: '🥛', color: 'bg-blue-100 text-blue-800 border-blue-200', aisle: 'Aisle 2' },
    'Meat & Seafood': { icon: '🥩', color: 'bg-red-100 text-red-800 border-red-200', aisle: 'Aisle 3' },
    'Pantry & Canned Goods': { icon: '🥫', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', aisle: 'Aisle 4-6' },
    'Frozen Foods': { icon: '❄️', color: 'bg-cyan-100 text-cyan-800 border-cyan-200', aisle: 'Aisle 7' },
    'Bakery': { icon: '🍞', color: 'bg-orange-100 text-orange-800 border-orange-200', aisle: 'Aisle 8' },
    'Personal Care': { icon: '🧼', color: 'bg-purple-100 text-purple-800 border-purple-200', aisle: 'Aisle 9' },
    'Household Items': { icon: '🏠', color: 'bg-gray-100 text-gray-800 border-gray-200', aisle: 'Aisle 10' },
  };

  // Auto-categorize items using AI categorization service
  const categorizeItems = async (items: ShoppingListItem[]) => {
    if (!items.length) {
      setCategorizedItems({});
      return;
    }

    setIsCategorizingItems(true);
    try {
      const categorized: Record<string, ShoppingListItem[]> = {};

      // Process items in parallel for better performance
      const categorizedPromises = items.map(async (item) => {
        let category = 'Pantry & Canned Goods'; // Default category

        try {
          // Use AI categorization service
          const result = await aiCategorizationService.categorizeProduct(
            item.productName, 
            item.quantity, 
            item.unit
          );

          if (result && result.category) {
            category = result.category;
          } else {
            // Fallback to quick categorization
            const quickResult = aiCategorizationService.getQuickCategory(
              item.productName, 
              item.quantity, 
              item.unit
            );
            category = quickResult.category;
          }
        } catch (error) {
          console.warn('Failed to categorize item:', item.productName, error);
          // Use quick categorization as fallback
          const quickResult = aiCategorizationService.getQuickCategory(
            item.productName, 
            item.quantity, 
            item.unit
          );
          category = quickResult.category;
        }

        return { item, category };
      });

      const results = await Promise.all(categorizedPromises);

      // Group items by category
      results.forEach(({ item, category }) => {
        if (!categorized[category]) {
          categorized[category] = [];
        }
        categorized[category].push(item);
      });

      // Sort items within each category alphabetically
      Object.keys(categorized).forEach(category => {
        categorized[category].sort((a, b) => a.productName.localeCompare(b.productName));
      });

      setCategorizedItems(categorized);
    } catch (error) {
      console.error('Error categorizing items:', error);
      // Fallback: group all items under default category
      setCategorizedItems({
        'Pantry & Canned Goods': items
      });
    } finally {
      setIsCategorizingItems(false);
    }
  };

  // Toggle category collapse state
  const toggleCategory = (category: string) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Auto-categorize items whenever the shopping list changes
  useEffect(() => {
    const defaultList = shoppingLists?.[0];
    const items = defaultList?.items || [];

    if (items.length > 0) {
      categorizeItems(items);
    } else {
      setCategorizedItems({});
    }
  }, [shoppingLists]);

  // Trigger auto-generation for empty lists and auto-regeneration for new sessions
  useEffect(() => {
    const triggerListGeneration = async () => {
      if (shoppingLists && shoppingLists.length > 0) {
        const defaultList = shoppingLists[0];
        const hasItems = defaultList?.items && defaultList.items.length > 0;

        // Check if this is a truly new session (browser restart/new tab)
        const lastSessionTimestamp = sessionStorage.getItem('shoppingListSessionStart');
        const currentBrowserSession = Date.now().toString();

        // If no session timestamp exists, this is the first visit in this browser session
        const isNewSession = !lastSessionTimestamp;

        // Store session data
        if (isNewSession) {
          sessionStorage.setItem('shoppingListSessionStart', currentBrowserSession);
          localStorage.setItem('browserSessionId', currentBrowserSession);
        }

        // Auto-generate for empty lists OR auto-regenerate for truly new sessions with existing items
        const shouldAutoGenerate = (!hasItems && !userHasClearedList) || (hasItems && isNewSession);

        console.log('Animation trigger check:', {
          hasItems,
          isNewSession,
          shouldAutoGenerate,
          userHasClearedList,
          isGeneratingList
        });

        if (shouldAutoGenerate && !isGeneratingList) {
          const isEmptyList = !hasItems;

          console.log(isEmptyList ? 'Empty shopping list detected, generating new list...' : 'New session detected with existing items, regenerating list...');

          // Show animation for all scenarios
          setIsGeneratingList(true);
          const steps = isEmptyList ? [
            "Analyzing your dietary preferences...",
            "Checking your pantry inventory...",
            "Finding the best deals and promotions...",
            "Optimizing your shopping route...",
            "Generating personalized recommendations..."
          ] : [
            "Scanning for new deals and promotions...",
            "Analyzing recent purchase patterns...",
            "Checking for items that need restocking...",
            "Finding seasonal recommendations...",
            "Updating your shopping list..."
          ];

          setGenerationSteps(steps);
          setCurrentStep(0);

          let autoAnimationInterval: NodeJS.Timeout | null = null;
          let autoAnimationTimeout: NodeJS.Timeout | null = null;

          // Start animation immediately
          autoAnimationInterval = setInterval(() => {
            setCurrentStep((prev) => {
              const nextStep = prev + 1;
              if (nextStep >= steps.length) {
                if (autoAnimationInterval) {
                  clearInterval(autoAnimationInterval);
                  autoAnimationInterval = null;
                }
                return steps.length - 1; // Stay on last step
              }
              return nextStep;
            });
          }, 1200);

          // Trigger regeneration after animation
          autoAnimationTimeout = setTimeout(() => {
            if (autoAnimationInterval) {
              clearInterval(autoAnimationInterval);
            }

            console.log('Starting regeneration mutation after animation...');

            // Use the unified regenerate mutation
            regenerateListMutation.mutate(undefined, {
              onSettled: () => {
                console.log('Regeneration completed, hiding animation...');
                setTimeout(() => {
                  setIsGeneratingList(false);
                  setCurrentStep(-1);
                }, 800);
              },
              onError: (error) => {
                console.error('Auto-regeneration failed:', error);
                setIsGeneratingList(false);
                setCurrentStep(-1);
              }
            });
          }, steps.length * 1200 + 1000);
        } else if (hasItems && !isNewSession) {
          console.log('Existing session with items, no auto-regeneration needed');
          // Reset the flag when list has items again
          setUserHasClearedList(false);
        } else {
          console.log('User has manually cleared list or animation already running');
        }
      } else {
        console.log('No shopping lists found yet');
      }
    };

    // Add a small delay to ensure the component is fully mounted
    const timeoutId = setTimeout(triggerListGeneration, 100);

    return () => clearTimeout(timeoutId);
  }, [shoppingLists, userHasClearedList, isGeneratingList]); // React to changes in shoppingLists and userHasClearedList

  const addItemMutation = useMutation({
    mutationFn: async ({ itemName, quantity, unit }: { itemName: string; quantity: number; unit: string }) => {
      const defaultList = shoppingLists?.[0];
      if (!defaultList) throw new Error('No shopping list found');

      const response = await apiRequest('POST', '/api/shopping-list/items', {
        shoppingListId: defaultList.id,
        productName: itemName,
        quantity: quantity,
        unit: unit
      });
      return response.json();
    },
    onMutate: async ({ itemName, quantity, unit }: { itemName: string; quantity: number; unit: string }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/shopping-lists'] });

      // Snapshot the previous value
      const previousLists = queryClient.getQueryData(['/api/shopping-lists']);

      // Optimistically update to the new value
      const tempId = Date.now(); // Temporary ID for optimistic update
      const newItem = {
        id: tempId,
        productName: itemName,
        quantity: quantity,
        unit: unit,
        completed: false,
        shoppingListId: shoppingLists?.[0]?.id
      };

      queryClient.setQueryData(['/api/shopping-lists'], (old: any) => {
        if (!old) return old;
        return old.map((list: any) => ({
          ...list,
          items: [...(list.items || []), newItem]
        }));
      });

      return { previousLists };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(['/api/shopping-lists'], context?.previousLists);
      toast({
        title: "Error",
        description: "Failed to add item",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
    },
    onSuccess: () => {
      setNewItemName('');
      setNewItemQuantity('1');
      setNewItemUnit('COUNT');
      toast({
        title: "Item added",
        description: "Item has been added to your shopping list",
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
      const response = await apiRequest('DELETE', `/api/shopping-list/items/${itemId}`);
      if (!response.ok) {
        throw new Error('Failed to delete item');
      }
      return response;
    },
    onMutate: async (itemId: number) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/shopping-lists'] });

      // Snapshot the previous value
      const previousLists = queryClient.getQueryData(['/api/shopping-lists']);

      // Optimistically update to the new value
      queryClient.setQueryData(['/api/shopping-lists'], (old: any) => {
        if (!old) return old;
        const updatedLists = old.map((list: any) => ({
          ...list,
          items: list.items?.filter((item: any) => item.id !== itemId) || []
        }));

        // Check if this deletion will result in an empty list
        const defaultList = updatedLists[0];
        if (defaultList && (!defaultList.items || defaultList.items.length === 0)) {
          // User is manually clearing the list
          setUserHasClearedList(true);
        }

        return updatedLists;
      });

      return { previousLists };
    },
    onError: (err, itemId, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(['/api/shopping-lists'], context?.previousLists);
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive"
      });
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
    },
    onSuccess: () => {
      toast({
        title: "Item deleted",
        description: "The item has been removed from your list"
      });
    }
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, updates }: { itemId: number; updates: Partial<ShoppingListItem> }) => {
      const response = await apiRequest('PATCH', `/api/shopping-list/items/${itemId}`, updates);
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

      const currentItems = defaultList.items || [];
      const isEmptyList = currentItems.length === 0;

      console.log(`Regenerating list - Current items: ${currentItems.length}, Empty: ${isEmptyList}`);
      console.log('Making API call to /api/shopping-lists/generate');

      try {
        // Use the unified API endpoint for all scenarios
        const response = await apiRequest('POST', '/api/shopping-lists/generate', {
          shoppingListId: defaultList.id
        });

        console.log('API response status:', response.status);

        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch (parseError) {
            console.warn('Failed to parse error response:', parseError);
            try {
              const errorText = await response.text();
              errorMessage = errorText || errorMessage;
            } catch (textError) {
              console.warn('Failed to get error text:', textError);
              errorMessage = `HTTP ${response.status}`;
            }
          }
          console.error('API error response:', errorMessage);
          throw new Error(`Failed to generate shopping list: ${errorMessage}`);
        }

        const result = await response.json();
        console.log('API response data:', result);

        return {
          ...result,
          isEmptyList,
          message: isEmptyList ? 'New shopping list created' : 'List enhanced with additional items'
        };
      } catch (error) {
        console.error('Network or API error:', error);
        if (error.message && error.message.includes('Failed to generate shopping list')) {
          throw error; // Re-throw API errors as-is
        }
        throw new Error('Failed to connect to server. Please check your connection and try again.');
      }
    },
    onSuccess: (data) => {
      console.log('Regeneration successful, invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });

      let title, description;

      if (data.isEmptyList) {
        title = "Shopping List Created";
        description = `Created a new list with ${data.itemsAdded || data.totalItems || 'essential'} items`;
      } else {
        title = "List Regenerated";
        description = `Added ${data.itemsAdded || data.totalItems || 'new'} items to your shopping list`;
        if (data.itemsSkipped && data.itemsSkipped > 0) {
          description += ` (${data.itemsSkipped} similar items already existed)`;
        }
      }

      console.log('Showing success toast:', title, description);

      toast({
        title,
        description
      });
    },
    onError: (error: any) => {
      console.error('Regeneration failed:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to enhance list. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleRegenerateList = () => {
    // Prevent multiple calls if already generating
    if (regenerateListMutation.isPending || isGeneratingList) {
      console.log('Regeneration already in progress, ignoring duplicate call');
      return;
    }

    // Reset the flag since user is explicitly asking for regeneration
    setUserHasClearedList(false);

    const defaultList = shoppingLists?.[0];
    const hasItems = defaultList?.items && defaultList.items.length > 0;

    console.log('Manual regeneration triggered - hasItems:', hasItems);

    // Show animation during regeneration
    setIsGeneratingList(true);
    const steps = hasItems ? [
      "Analyzing current list...",
      "Finding complementary items...", 
      "Checking for the best deals...",
      "Optimizing quantities and units...",
      "Adding new recommendations..."
    ] : [
      "Creating your shopping list...",
      "Analyzing your preferences...",
      "Finding the best deals...",
      "Optimizing your shopping route...",
      "Finalizing recommendations..."
    ];

    setGenerationSteps(steps);
    setCurrentStep(0);

    console.log('Starting animation with steps:', steps);

    let animationInterval: NodeJS.Timeout | null = null;

    // Start the animation immediately
    animationInterval = setInterval(() => {
      setCurrentStep((prevStep) => {
        const nextStep = prevStep + 1;
        console.log('Animation step:', nextStep, 'of', steps.length);
        if (nextStep >= steps.length) {
          if (animationInterval) {
            clearInterval(animationInterval);
            animationInterval = null;
          }
          return steps.length - 1; // Stay on last step
        }
        return nextStep;
      });
    }, 1000);

    // Start the actual mutation after animation has time to show
    const mutationTimeout = setTimeout(() => {
      console.log('Starting regeneration mutation...');
      
      regenerateListMutation.mutate(undefined, {
        onSettled: () => {
          console.log('Mutation settled, cleaning up animation');
          // Clean up animation when mutation is done
          if (animationInterval) {
            clearInterval(animationInterval);
            animationInterval = null;
          }

          // Hide the animation after a short delay
          setTimeout(() => {
            setIsGeneratingList(false);
            setCurrentStep(-1);
          }, 800);
        },
        onError: (error) => {
          console.error('Regeneration failed in handler:', error);
          // Ensure animation stops on error
          if (animationInterval) {
            clearInterval(animationInterval);
            animationInterval = null;
          }
          setIsGeneratingList(false);
          setCurrentStep(-1);
        },
        onSuccess: (data) => {
          console.log('Regeneration completed successfully in handler:', data);
        }
      });
    }, 500);

    // Cleanup function in case component unmounts
    return () => {
      if (animationInterval) {
        clearInterval(animationInterval);
      }
      clearTimeout(mutationTimeout);
    };
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemName.trim()) {
      const quantity = parseInt(newItemQuantity) || 1;
      addItemMutation.mutate({ 
        itemName: newItemName.trim(), 
        quantity: quantity,
        unit: newItemUnit 
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
  };

  const handleImportRecipe = () => {
    if (recipeUrl.trim()) {
      importRecipeMutation.mutate();
    }
  };

  // Voice command handlers
  const handleVoiceAddItem = async (itemName: string, quantity: number, unit: string) => {
    return new Promise<void>((resolve, reject) => {
      addItemMutation.mutate(
        { itemName, quantity, unit },
        {
          onSuccess: () => resolve(),
          onError: (error) => reject(error)
        }
      );
    });
  };

  const handleVoiceToggleItem = (itemName: string) => {
    const defaultList = shoppingLists?.[0];
    if (!defaultList?.items) return;

    // Find item by name (case-insensitive)
    const item = defaultList.items.find(
      item => item.productName.toLowerCase().includes(itemName.toLowerCase())
    );

    if (item) {
      toggleItemMutation.mutate({ itemId: item.id, completed: !item.completed });
    }
  };

  const handleVoiceDeleteItem = (itemName: string) => {
    const defaultList = shoppingLists?.[0];
    if (!defaultList?.items) return;

    // Find item by name (case-insensitive)
    const item = defaultList.items.find(
      item => item.productName.toLowerCase().includes(itemName.toLowerCase())
    );

    if (item) {
      deleteItemMutation.mutate(item.id);
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
                  {generationSteps.some(step => step.includes('Scanning')) 
                    ? 'AI is Updating Your Shopping List'
                    : 'AI is Creating Your Smart Shopping List'
                  }
                </h3>
                <p className="text-sm text-gray-600">
                  {generationSteps.some(step => step.includes('Scanning'))
                    ? 'Checking for new deals and items you might need'
                    : 'Please wait while we personalize your shopping experience'
                  }
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

      {/* Categorized Shopping List */}
      {isCategorizingItems && (
        <div className="flex items-center justify-center py-4 text-gray-500">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
          <span>Categorizing items...</span>
        </div>
      )}

      {Object.keys(categorizedItems).length > 0 && !isCategorizingItems && (
        <div className="space-y-3">
          {Object.entries(categorizedItems)
            .sort(([a], [b]) => {
              // Sort categories by typical shopping order
              const order = ['Produce', 'Dairy & Eggs', 'Meat & Seafood', 'Pantry & Canned Goods', 'Frozen Foods', 'Bakery', 'Personal Care', 'Household Items'];
              return order.indexOf(a) - order.indexOf(b);
            })
            .map(([category, categoryItems]) => {
              const config = categoryConfig[category as keyof typeof categoryConfig] || {
                icon: '🛒',
                color: 'bg-gray-100 text-gray-800 border-gray-200',
                aisle: 'General'
              };
              const isCollapsed = collapsedCategories[category];
              const completedCount = categoryItems.filter(item => item.completed).length;
              const totalCount = categoryItems.length;

              return (
                <Collapsible key={category} open={!isCollapsed} onOpenChange={() => toggleCategory(category)}>
                  <Card className={`border-2 ${config.color.split(' ')[0]} border-opacity-30`}>
                    <CollapsibleTrigger className="w-full">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{config.icon}</span>
                            <div className="text-left">
                              <h3 className="font-semibold text-lg">{category}</h3>
                              <p className="text-sm text-gray-600">{config.aisle}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            {isCollapsed ? (
                              <ChevronRight className="h-5 w-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="px-3 pb-3 space-y-2">
                        {categoryItems.map((item) => (
                          <Card key={item.id} className={`${item.completed ? 'opacity-60' : ''} border border-gray-200`}>
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3 flex-1">
                                  <div className="flex-1">
                                    <span className={`${item.completed ? 'line-through' : ''}`}>
                                      {item.productName}
                                    </span>
                                    <div className="text-sm text-gray-500">
                                      {item.quantity} {item.unit || 'COUNT'}
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
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
        </div>
      )}

      {/* Fallback for uncategorized view */}
      {Object.keys(categorizedItems).length === 0 && !isCategorizingItems && items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => (
            <Card key={item.id} className={`${item.completed ? 'opacity-60' : ''}`}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="flex-1">
                      <span className={`${item.completed ? 'line-through' : ''}`}>
                        {item.productName}
                      </span>
                      <div className="text-sm text-gray-500">
                        {item.quantity} {item.unit || 'COUNT'}
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
      )}

      {items.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <ShoppingBag className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Your shopping list is empty</p>
          <p className="text-sm">Add items below to get started</p>
        </div>
      )}



      <form onSubmit={handleAddItem} className="mb-4">
        <Card className="bg-white rounded-lg shadow-md border border-gray-200">
          <CardContent className="p-4">
            {/* Item Name Input */}
            <Input
              type="text"
              placeholder="Add item name"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="h-12 text-base border-2 border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 bg-white rounded-lg transition-all duration-200"
            />

            {/* Quantity and Unit Row */}
            <div className="flex space-x-3 mt-3">
              <div className="flex-1">
                <Input
                  type="number"
                  placeholder="Quantity"
                  value={newItemQuantity}
                  onChange={(e) => setNewItemQuantity(e.target.value)}
                  min="1"
                  className="h-11 text-base border-2 border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 bg-white rounded-lg transition-all duration-200"
                />
              </div>

              <div className="flex-1">
                <select
                  onChange={(e) => setNewItemUnit(e.target.value as ShoppingListItem['unit'])}
                  className="h-11 text-base border-2 border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 bg-white rounded-lg transition-all duration-200 cursor-pointer"
                >
                  <option value="COUNT">Count</option>
                  <option value="LB">Pound</option>
                  <option value="OZ">Ounce</option>
                  <option value="GALLON">Gallon</option>
                  <option value="CUP">Cup</option>
                  <option value="TSP">Teaspoon</option>
                  <option value="TBSP">Tablespoon</option>
                  <option value="PINT">Pint</option>
                  <option value="QUART">Quart</option>
                  <option value="LITER">Liter</option>
                  <option value="ML">Milliliter</option>
                  <option value="GRAMS">Grams</option>
                  <option value="KG">Kilogram</option>
                  <option value="BAG">Bag</option>
                  <option value="BOX">Box</option>
                  <option value="BOTTLE">Bottle</option>
                  <option value="JAR">Jar</option>
                  <option value="CAN">Can</option>
                  <option value="PACK">Pack</option>
                  <option value="LOAF">Loaf</option>
                  <option value="BUNCH">Bunch</option>
                  <option value="HEAD">Head</option>
                  <option value="CLOVE">Clove</option>
                  <option value="SLICE">Slice</option>
                  <option value="PIECE">Piece</option>
                  <option value="SHEET">Sheet</option>
                  <option value="ROLL">Roll</option>
                  <option value="TUBE">Tube</option>
                  <option value="BLOCK">Block</option>
                  <option value="STICK">Stick</option>
                  <option value="DOZEN">Dozen</option>
                  <option value="CASE">Case</option>
                  <option value="CARTON">Carton</option>
                  <option value="CONTAINER">Container</option>
                  <option value="PACKAGE">Package</option>
                  <option value="BUNDLE">Bundle</option>
                  <option value="BASKET">Basket</option>
                  <option value="TRAY">Tray</option>
                  <option value="CRATE">Crate</option>
                  <option value="SACK">Sack</option>
                  <option value="BUCKET">Bucket</option>
                  <option value="BARREL">Barrel</option>
                  <option value="BOTTLES">Bottles</option>
                </select>
              </div>
            </div>

            {/* Action buttons row */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRecipeDialogOpen(true)}
                  className="h-10 px-4 border-2 border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 text-gray-700 rounded-lg transition-all duration-200 flex items-center space-x-2"
                >
                  <FileText className="h-4 w-4" />
                  <span className="text-sm font-medium">Import Recipe</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRegenerateList}
                  disabled={regenerateListMutation.isPending}
                  className="h-10 px-4 border-2 border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 text-gray-700 rounded-lg transition-all duration-200 flex items-center space-x-2"
                >
                  <Wand2 className="h-4 w-4" />
                  <span className="text-sm font-medium">Regenerate List</span>
                </Button>
              </div>

              <div className="flex items-center space-x-2">
                {newItemName.trim() && (
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700 border border-blue-200">
                    Ready to add
                  </Badge>
                )}
                
                <Button
                  type="submit"
                  disabled={!newItemName.trim() || addItemMutation.isPending}
                  className="h-10 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-sm font-medium">Add Item</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>



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



      {/* Voice AI Agent - Moved to bottom */}
      <div className="mt-6 mb-4">
        <VoiceAgent
          onAddItem={handleVoiceAddItem}
          onToggleItem={handleVoiceToggleItem}
          onDeleteItem={handleVoiceDeleteItem}
          isProcessing={addItemMutation.isPending || toggleItemMutation.isPending || deleteItemMutation.isPending}
        />
      </div>
    </div>
  );
};

export default ShoppingListComponent;