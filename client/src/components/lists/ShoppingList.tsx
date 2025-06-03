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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
    },
    onSettled: () => {
      // Always re-categorize items after adding new item (success or error)
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });

      // Force re-categorization after a short delay to ensure data is fresh
      setTimeout(() => {
        const updatedList = queryClient.getQueryData<ShoppingListType[]>(['/api/shopping-lists']);
        if (updatedList && updatedList[0]?.items) {
          categorizeItems(updatedList[0].items);
        }
      }, 100);
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
        return old.map((list: any) => ({
          ...list,
          items: list.items?.filter((item: any) => item.id !== itemId) || []
        }));
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
      
      // If list is empty, generate a basic starter list
      if (currentItems.length === 0) {
        const starterItems = [
          { productName: 'Milk', quantity: 1, unit: 'GALLON' },
          { productName: 'Bread', quantity: 1, unit: 'LOAF' },
          { productName: 'Eggs', quantity: 1, unit: 'DOZEN' },
          { productName: 'Bananas', quantity: 2, unit: 'LB' },
          { productName: 'Chicken Breast', quantity: 1, unit: 'LB' },
          { productName: 'Yogurt', quantity: 4, unit: 'CONTAINER' },
          { productName: 'Apples', quantity: 3, unit: 'LB' },
          { productName: 'Spinach', quantity: 1, unit: 'BAG' }
        ];

        const addedItems = [];
        for (const item of starterItems) {
          try {
            const response = await apiRequest('POST', '/api/shopping-list/items', {
              shoppingListId: defaultList.id,
              productName: item.productName,
              quantity: item.quantity,
              unit: item.unit
            });
            addedItems.push(await response.json());
          } catch (error) {
            console.error('Failed to add starter item:', item.productName, error);
          }
        }

        return { 
          message: 'New shopping list created', 
          items: addedItems,
          itemsAdded: addedItems.length,
          itemsSkipped: 0,
          isNewList: true
        };
      }

      // If list has items, expand it with complementary items
      // Get existing items and create normalized versions for similarity checking
      const existingItems = new Map<string, string>(); // normalized -> original
      const existingNormalizedSet = new Set<string>();

      for (const item of currentItems) {
        const original = item.productName.toLowerCase().trim();
        
        // Normalize the product name for similarity checking (less aggressive)
        let normalized = original
          .replace(/\b(organic|free-range|grass-fed|natural|premium|select|fresh)\s+/gi, '') // Remove quality descriptors
          .replace(/\b(whole|2%|1%|skim|low-fat|non-fat)\s+/gi, '') // Remove specific types
          .replace(/\s+/g, ' ')
          .trim();

        // Only normalize very similar products
        if (normalized.includes('milk') && !normalized.includes('coconut') && !normalized.includes('almond')) {
          normalized = 'milk';
        } else if (normalized.includes('bread') && !normalized.includes('crumb')) {
          normalized = 'bread';
        } else if (normalized.includes('eggs') && !normalized.includes('eggplant')) {
          normalized = 'eggs';
        }

        existingItems.set(normalized, original);
        existingNormalizedSet.add(normalized);
      }

      // Enhanced recommendation items that complement existing list
      const enhancementItems = [
        // Produce
        { productName: 'Organic Bananas', quantity: 2, unit: 'LB' },
        { productName: 'Fresh Strawberries', quantity: 1, unit: 'LB' },
        { productName: 'Avocados', quantity: 4, unit: 'COUNT' },
        { productName: 'Baby Spinach', quantity: 1, unit: 'BAG' },
        { productName: 'Roma Tomatoes', quantity: 2, unit: 'LB' },
        { productName: 'Yellow Onions', quantity: 3, unit: 'LB' },
        { productName: 'Red Bell Peppers', quantity: 3, unit: 'COUNT' },
        { productName: 'Carrots', quantity: 2, unit: 'LB' },
        { productName: 'Broccoli Crowns', quantity: 2, unit: 'COUNT' },
        { productName: 'Cucumber', quantity: 2, unit: 'COUNT' },

        // Dairy & Eggs
        { productName: 'Organic Milk', quantity: 1, unit: 'GALLON' },
        { productName: 'Free-Range Eggs', quantity: 1, unit: 'DOZEN' },
        { productName: 'Greek Yogurt', quantity: 4, unit: 'CONTAINER' },
        { productName: 'Cheddar Cheese', quantity: 1, unit: 'BLOCK' },
        { productName: 'Butter', quantity: 1, unit: 'COUNT' },
        { productName: 'Cream Cheese', quantity: 1, unit: 'COUNT' },

        // Meat & Seafood
        { productName: 'Chicken Breast', quantity: 2, unit: 'LB' },
        { productName: 'Ground Turkey', quantity: 1, unit: 'LB' },
        { productName: 'Salmon Fillet', quantity: 1, unit: 'LB' },

        // Pantry & Canned Goods
        { productName: 'Brown Rice', quantity: 1, unit: 'BAG' },
        { productName: 'Quinoa', quantity: 1, unit: 'BAG' },
        { productName: 'Whole Wheat Pasta', quantity: 2, unit: 'BOX' },
        { productName: 'Olive Oil', quantity: 1, unit: 'BOTTLE' },
        { productName: 'Black Beans', quantity: 2, unit: 'CAN' },
        { productName: 'Diced Tomatoes', quantity: 2, unit: 'CAN' },
        { productName: 'Chicken Broth', quantity: 2, unit: 'CONTAINER' },
        { productName: 'Oatmeal', quantity: 1, unit: 'CONTAINER' },
        { productName: 'Almond Butter', quantity: 1, unit: 'JAR' },
        { productName: 'Honey', quantity: 1, unit: 'BOTTLE' },
        { productName: 'Sparkling Water', quantity: 12, unit: 'CAN' },
        { productName: 'Coconut Milk', quantity: 2, unit: 'CAN' },
        { productName: 'Pasta Sauce', quantity: 1, unit: 'JAR' },
        { productName: 'Baking Soda', quantity: 1, unit: 'BOX' },

        // Bakery
        { productName: 'Whole Wheat Bread', quantity: 1, unit: 'LOAF' },

        // Household Items
        { productName: 'Paper Towels', quantity: 6, unit: 'COUNT' },
        { productName: 'Toilet Paper', quantity: 12, unit: 'COUNT' },

        // Personal Care
        { productName: 'Shampoo', quantity: 1, unit: 'BOTTLE' },
        { productName: 'Toothpaste', quantity: 1, unit: 'COUNT' },

        // Spices & Seasonings
        { productName: 'Garlic Powder', quantity: 1, unit: 'COUNT' },
        { productName: 'Black Pepper', quantity: 1, unit: 'COUNT' },
        { productName: 'Sea Salt', quantity: 1, unit: 'COUNT' }
      ];

      // Filter out items that already exist in the list using a more precise matching
      const newItems = enhancementItems.filter(item => {
        const itemName = item.productName.toLowerCase().trim();
        
        // Check for exact matches first (case-insensitive)
        const exactMatch = currentItems.some(existing => 
          existing.productName.toLowerCase().trim() === itemName
        );
        
        if (exactMatch) {
          console.log(`Skipping "${item.productName}" - exact match found`);
          return false;
        }

        // Only check for very specific core product matches to avoid over-filtering
        const coreProduct = itemName
          .replace(/\b(organic|free-range|grass-fed|natural|premium|select|fresh|baby|roma|yellow|red|brown|whole\s+wheat|whole\s+grain)\s*/gi, '')
          .replace(/\s+/g, ' ')
          .trim();

        // Only normalize these very common base products
        let normalizedCore = coreProduct;
        if (coreProduct === 'milk' || coreProduct.endsWith(' milk')) {
          normalizedCore = 'milk';
        } else if (coreProduct === 'bread' || coreProduct.endsWith(' bread')) {
          normalizedCore = 'bread';
        } else if (coreProduct === 'eggs' || coreProduct.startsWith('eggs')) {
          normalizedCore = 'eggs';
        }

        // Check if this core product already exists
        const coreExists = currentItems.some(existing => {
          const existingCore = existing.productName.toLowerCase().trim()
            .replace(/\b(organic|free-range|grass-fed|natural|premium|select|fresh|baby|roma|yellow|red|brown|whole\s+wheat|whole\s+grain)\s*/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
          
          let existingNormalized = existingCore;
          if (existingCore === 'milk' || existingCore.endsWith(' milk')) {
            existingNormalized = 'milk';
          } else if (existingCore === 'bread' || existingCore.endsWith(' bread')) {
            existingNormalized = 'bread';
          } else if (existingCore === 'eggs' || existingCore.startsWith('eggs')) {
            existingNormalized = 'eggs';
          }

          return existingNormalized === normalizedCore;
        });
        
        if (coreExists) {
          console.log(`Skipping "${item.productName}" - core product already exists`);
          return false;
        }
        
        return true;
      });

      // Add only new items to enhance the existing list
      const addedItems = [];
      for (const item of newItems) {
        try {
          // Use AI categorization to get the proper unit
          let finalUnit = item.unit || 'COUNT';
          let finalQuantity = item.quantity || 1;

          try {
            // Try to get AI-suggested unit and quantity
            const aiResult = await aiCategorizationService.categorizeProduct(
              item.productName, 
              item.quantity || 1, 
              item.unit || 'COUNT'
            );

            if (aiResult?.suggestedUnit) {
              finalUnit = aiResult.suggestedUnit;
            }
            if (aiResult?.suggestedQuantity) {
              finalQuantity = aiResult.suggestedQuantity;
            }
          } catch (aiError) {
            // If AI fails, use quick categorization fallback
            const quickResult = aiCategorizationService.getQuickCategory(
              item.productName, 
              item.quantity || 1, 
              item.unit || 'COUNT'
            );
            if (quickResult.suggestedUnit) {
              finalUnit = quickResult.suggestedUnit;
            }
            if (quickResult.suggestedQuantity) {
              finalQuantity = quickResult.suggestedQuantity;
            }
          }

          const response = await apiRequest('POST', '/api/shopping-list/items', {
            shoppingListId: defaultList.id,
            productName: item.productName,
            quantity: finalQuantity,
            unit: finalUnit
          });
          const addedItem = await response.json();
          addedItems.push(addedItem);
        } catch (error) {
          console.error('Failed to add item:', item.productName, error);
        }
      }

      return { 
        message: 'List enhanced successfully', 
        items: addedItems,
        itemsAdded: addedItems.length,
        itemsSkipped: enhancementItems.length - newItems.length
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
      
      let title, description;
      
      if (data.isNewList) {
        title = "Shopping List Created";
        description = `Created a new list with ${data.itemsAdded} essential items`;
      } else {
        title = "List Enhanced";
        description = `Added ${data.itemsAdded} new items to expand your shopping list`;
        if (data.itemsSkipped > 0) {
          description += ` (${data.itemsSkipped} similar items already existed)`;
        }
      }
      
      toast({
        title,
        description
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to enhance list",
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
                            <Badge variant="secondary" className={config.color}>
                              {completedCount}/{totalCount} items
                            </Badge>
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

      <div className="mt-6 mb-6 flex gap-2">
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

      <form onSubmit={handleAddItem} className="mb-4">
        <div className="flex space-x-2 mb-2">
          <Input
            type="text"
            placeholder="Add an item..."
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            className="flex-1 border-4 border-gray-600 focus:border-blue-600 focus:ring-4 focus:ring-blue-300 bg-gray-50 text-black font-bold text-lg placeholder-gray-600 px-6 py-3 rounded-lg shadow-inner"
          />
          <Button 
            type="submit" 
            disabled={addItemMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white border-4 border-blue-600 hover:border-blue-700 shadow-lg min-w-[48px] rounded-lg"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex space-x-2">
          <div className="flex-1">
            <Input
              type="number"
              placeholder="Quantity"
              value={newItemQuantity}
              onChange={(e) => setNewItemQuantity(e.target.value)}
              min="1"
              className="w-full border-4 border-orange-400 focus:border-orange-600 focus:ring-4 focus:ring-orange-200 bg-orange-50 text-black font-bold text-lg placeholder-orange-600 px-4 py-3 rounded-lg shadow-md"
            />
          </div>
          <div className="flex-1">
            <select
              value={newItemUnit}
              onChange={(e) => setNewItemUnit(e.target.value)}
              className="w-full border-4 border-orange-400 focus:border-orange-600 focus:ring-4 focus:ring-orange-200 bg-orange-50 text-black font-bold text-lg px-4 py-3 rounded-lg shadow-md"
            >
              <option value="COUNT">Count</option>
              <option value="LB">Pounds</option>
              <option value="OZ">Ounces</option>
              <option value="GALLON">Gallon</option>
              <option value="QUART">Quart</option>
              <option value="PINT">Pint</option>
              <option value="CUP">Cup</option>
              <option value="LITER">Liter</option>
              <option value="ML">Milliliters</option>
              <option value="DOZEN">Dozen</option>
              <option value="LOAF">Loaf</option>
              <option value="BAG">Bag</option>
              <option value="BOX">Box</option>
              <option value="BOTTLE">Bottle</option>
              <option value="CAN">Can</option>
              <option value="JAR">Jar</option>
              <option value="PACK">Pack</option>
              <option value="CONTAINER">Container</option>
              <option value="BUNCH">Bunch</option>
              <option value="HEAD">Head</option>
              <option value="BLOCK">Block</option>
              <option value="BOTTLES">Bottles</option>
            </select>
          </div>
        </div>
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
    </div>
  );
};

export default ShoppingListComponent;