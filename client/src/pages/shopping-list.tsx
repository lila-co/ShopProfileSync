import React, { useState, useRef } from 'react';
import Header from '@/components/layout/Header';
import BottomNavigation from '@/components/layout/BottomNavigation';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ShoppingList, ShoppingListItem } from '@/lib/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Plus, 
  ShoppingBag, 
  FileText, 
  Pencil, 
  Trash2, 
  BarChart4, 
  ListChecks, 
  ShoppingCart,
  Check,
  Loader2,
  Store as StoreIcon,
  MapPin,
  ArrowRight,
  Clock,
  BarChart,
  Printer,
  Sparkles
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { detectUnitFromItemName } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useLocation } from 'wouter';
import { extractTextFromReceiptImage } from '@/lib/openai';

const ShoppingListPage: React.FC = () => {
  const [location, navigate] = useLocation();
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

  // Generate list dialog state
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [generatedItems, setGeneratedItems] = useState<any[]>([]);

  // Upload list dialog state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadedItems, setUploadedItems] = useState<any[]>([]);
  const [uploadType, setUploadType] = useState<'file' | 'image'>('file');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Recipe dialog state
  const [recipeDialogOpen, setRecipeDialogOpen] = useState(false);
  const [recipeUrl, setRecipeUrl] = useState('');
  const [servings, setServings] = useState('4');

  // Recipe preview state
  const [recipePreviewDialogOpen, setRecipePreviewDialogOpen] = useState(false);
  const [recipePreviewItems, setRecipePreviewItems] = useState<any[]>([]);

  // Tab state
  const [activeTab, setActiveTab] = useState('items');
  const [selectedOptimization, setSelectedOptimization] = useState('cost');

  // Shopping plan view state
  const [planViewDialogOpen, setPlanViewDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [selectedPlanTitle, setSelectedPlanTitle] = useState('');
  const [showShoppingPlan, setShowShoppingPlan] = useState(false);

  // AI categorization state
  const [showCategorization, setShowCategorization] = useState(false);
  const [categorizedItems, setCategorizedItems] = useState<any[]>([]);
  const [isCategorizingItems, setIsCategorizingItems] = useState(false);

  const { data: shoppingLists, isLoading } = useQuery<ShoppingList[]>({
    queryKey: ['/api/shopping-lists'],
  });

  // Get retailers for price comparison
  const { data: retailers } = useQuery({
    queryKey: ['/api/retailers'],
  });

  // Get recommendations for the generate list feature
  const { data: recommendations } = useQuery({
    queryKey: ['/api/recommendations'],
  });

  // Generate shopping list preview
  const previewGenerateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/shopping-lists/preview', {});
      return response.json();
    },
    onSuccess: (data) => {
      // Get items from the preview response
      const items = data.items || [];

      // If no items were returned, create sample suggestions
      const itemsToShow = items.length > 0 ? items : [
        { productName: 'Milk', quantity: 1, unit: 'GALLON', reason: 'Purchased weekly', isSelected: true },
        { productName: 'Bananas', quantity: 1, unit: 'LB', reason: 'Running low based on purchase cycle', isSelected: true },
        { productName: 'Bread', quantity: 1, unit: 'LOAF', reason: 'Typically purchased every 5 days', isSelected: true },
        { productName: 'Eggs', quantity: 1, unit: 'DOZEN', reason: 'Regularly purchased item', isSelected: true },
        { productName: 'Toilet Paper', quantity: 1, unit: 'ROLL', reason: 'Based on typical household usage', isSelected: true },
        { productName: 'Chicken Breast', quantity: 1, unit: 'LB', reason: 'Purchased bi-weekly', isSelected: true },
        { productName: 'Tomatoes', quantity: 3, unit: 'LB', reason: 'Based on recipe usage patterns', isSelected: true }
      ];

      // Add estimated savings to each item
      const enhancedItems = itemsToShow.map((item: any) => ({
        ...item,
        isSelected: item.isSelected !== false, // Default to selected unless explicitly false
      }));

      setGeneratedItems(enhancedItems);
      setGenerateDialogOpen(true);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to generate shopping list preview: " + error.message,
        variant: "destructive"
      });
    }
  });

  // Generate shopping list from typical purchases
  const generateListMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/shopping-lists/preview', {});
      const data = await response.json();
      setGeneratedItems(data.items || []);
      setGenerateDialogOpen(true);
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Shopping List Preview Generated",
        description: `Found ${data.items?.length || 0} recommended items`
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to generate shopping list preview",
        variant: "destructive" 
      });
    }
  });

  // Add generated items to shopping list
  const addGeneratedItemsMutation = useMutation({
    mutationFn: async () => {
      const defaultList = shoppingLists?.[0];
      if (!defaultList) throw new Error("No shopping list found");

      const selectedItemsToAdd = generatedItems.filter(item => item.isSelected);

      if (selectedItemsToAdd.length === 0) {
        throw new Error("No items selected to add");
      }

      const response = await apiRequest('POST', '/api/shopping-lists/generate', {
        items: selectedItemsToAdd,
        shoppingListId: defaultList.id
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
      setGenerateDialogOpen(false);
      setGeneratedItems([]);
      toast({
        title: "Items Added",
        description: `Added ${data.addedItems?.length || 0} new items and updated ${data.updatedItems?.length || 0} existing items`
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to add items to shopping list: " + error.message,
        variant: "destructive"
      });
    }
  });

  // Preview recipe ingredients
  const previewRecipeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/shopping-lists/recipe/preview', {
        recipeUrl,
        servings: parseInt(servings)
      });
      return response.json();
    },
    onSuccess: (data) => {
      setRecipePreviewItems(data.items || []);
      setRecipeDialogOpen(false);
      setRecipePreviewDialogOpen(true);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to preview recipe ingredients",
        variant: "destructive"
      });
    }
  });

  // Import recipe ingredients
  const importRecipeMutation = useMutation({
    mutationFn: async (selectedItems?: any[]) => {
      const defaultList = shoppingLists?.[0];
      if (!defaultList) throw new Error("No shopping list found");

      const response = await apiRequest('POST', '/api/shopping-lists/recipe', {
        recipeUrl,
        shoppingListId: defaultList.id,
        servings: parseInt(servings),
        items: selectedItems
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
      setRecipePreviewDialogOpen(false);
      setRecipeDialogOpen(false);
      setRecipeUrl('');
      setRecipePreviewItems([]);
      toast({
        title: "Recipe Imported",
        description: "Ingredients have been added to your shopping list"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to import recipe ingredients",
        variant: "destructive"
      });
    }
  });

  // Upload shopping list from file
  const uploadListMutation = useMutation({
    mutationFn: async (items: any[]) => {
      const selectedItems = items.filter(item => item.isSelected);

      const response = await apiRequest('POST', '/api/shopping-list/items', {
        shoppingListId: shoppingLists?.[0].id,
        items: selectedItems
      });
      return response.json();
    },
    onSuccess: () => {
      setUploadDialogOpen(false);
      setUploadedItems([]);
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
      toast({
        title: "Shopping List Uploaded",
        description: "Your list has been imported successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to upload shopping list: " + error.message,
        variant: "destructive"
      });
    }
  });

  // Process image OCR
  const processImageMutation = useMutation({
    mutationFn: async (base64Image: string) => {
      const extractedData = await extractTextFromReceiptImage(base64Image);
      return extractedData;
    },
    onSuccess: (data) => {
      if (data.items && Array.isArray(data.items)) {
        const processedItems = data.items.map((item: any) => ({
          productName: item.productName || item.name || item,
          quantity: item.quantity || 1,
          unit: item.unit || 'COUNT',
          isSelected: true
        }));
        setUploadedItems(processedItems);
      } else {
        toast({
          title: "No items found",
          description: "Could not extract items from the image. Please try a clearer photo.",
          variant: "destructive"
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error processing image",
        description: "Failed to extract text from image: " + error.message,
        variant: "destructive"
      });
    }
  });

  // Calculate price comparison across retailers
  const priceComparisonMutation = useMutation({
    mutationFn: async (shoppingListId: number) => {
      const response = await apiRequest('POST', '/api/shopping-lists/costs', {
        shoppingListId
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Price comparison data will be available in data.retailers
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to compare prices: " + error.message,
        variant: "destructive"
      });
    }
  });

  // Single store optimization
  const singleStoreOptimization = useMutation({
    mutationFn: async (shoppingListId: number) => {
      const response = await apiRequest('POST', '/api/shopping-lists/single-store', {
        shoppingListId
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Handle the response data (e.g., display the optimized list)
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to generate single store optimization: " + error.message,
        variant: "destructive"
      });
    }
  });

  // Best value optimization
  const bestValueOptimization = useMutation({
    mutationFn: async (shoppingListId: number) => {
      const response = await apiRequest('POST', '/api/shopping-lists/best-value', {
        shoppingListId
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Handle the response data (e.g., display the optimized list)
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to generate best value optimization: " + error.message,
        variant: "destructive"
      });
    }
  });

  // Balanced optimization
  const balancedOptimization = useMutation({
    mutationFn: async (shoppingListId: number) => {
      const response = await apiRequest('POST', '/api/shopping-lists/balanced', {
        shoppingListId
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Handle the response data (e.g., display the optimized list)
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to generate balanced optimization: " + error.message,
        variant: "destructive"
      });
    }
  });

  // Add item to shopping list
  const addItemMutation = useMutation({
    mutationFn: async ({ productName, quantity, unit }: { productName: string, quantity: number, unit: string }) => {
      // Add to default shopping list (using the first list as default for simplicity)
      const defaultList = shoppingLists?.[0];
      if (!defaultList) throw new Error("No shopping list found");

      const response = await apiRequest('POST', '/api/shopping-list/items', {
        shoppingListId: defaultList.id,
        productName,
        quantity,
        unit
      });
      return response.json();
    },
    onSuccess: () => {
      setNewItemName('');
      setNewItemQuantity(1);
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });

      toast({
        title: "Item Added",
        description: "Item has been added to your shopping list"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Add Item",
        description: error.message || "Could not add item to shopping list.",
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
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to update item",
        variant: "destructive"
      });
    }
  });

  // Categorize items with AI
  const categorizeMutation = useMutation({
    mutationFn: async () => {
      const defaultList = shoppingLists?.[0];
      if (!defaultList) throw new Error("No shopping list found");

      const items = defaultList.items || [];
      if (items.length === 0) throw new Error("No items to categorize");

      setIsCategorizingItems(true);

      try {
        // Call the batch categorization endpoint
        const response = await apiRequest('POST', '/api/products/categorize-batch', {
          items: items.map(item => ({
            productName: item.productName,
            quantity: Math.max(1, Math.round(Number(item.quantity) || 1)),
            unit: item.unit || 'COUNT'
          }))
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const categorizedItems = await response.json();

        // Validate and clean the response data
        const cleanedItems = categorizedItems.map((item: any) => ({
          ...item,
          normalized: {
            ...item.normalized,
            originalQuantity: Math.max(1, Math.round(Number(item.normalized.originalQuantity) || 1)),
            suggestedQuantity: Math.max(1, Math.round(Number(item.normalized.suggestedQuantity) || 1)),
            normalizedQuantity: Math.max(1, Math.round(Number(item.normalized.normalizedQuantity) || 1))
          }
        }));

        return cleanedItems;
      } catch (error) {
        console.error('Categorization failed:', error);

        // Return fallback categorization for all items
        return items.map(item => ({
          productName: item.productName,
          category: {
            category: 'Pantry & Canned Goods',
            aisle: 'Aisle 4-6',
            confidence: 0.30,
            suggestedQuantityType: 'COUNT',
            typicalRetailNames: [item.productName],
            brandVariations: ['Generic'],
            normalizedName: null // Ensure normalizedName is present
          },
          normalized: {
            originalQuantity: Math.max(1, Math.round(Number(item.quantity) || 1)),
            originalUnit: item.unit || 'COUNT',
            suggestedQuantity: Math.max(1, Math.round(Number(item.quantity) || 1)),
            suggestedUnit: item.unit || 'COUNT',
            normalizedQuantity: Math.max(1, Math.round(Number(item.quantity) || 1)),
            conversionReason: 'Categorization service unavailable'
          },
          icon: '🥫'
        }));
      } finally {
        setIsCategorizingItems(false);
      }
    },
    onSuccess: (data) => {
      // Filter out items that don't have suggested changes
      const filteredItems = data.filter(item =>
        item.category.normalizedName !== null || // Filter to only show meaningful changes
        item.normalized.conversionReason !== 'No conversion needed' &&
        item.normalized.conversionReason !== 'Categorization service unavailable'
      );
      setCategorizedItems(filteredItems);
      setShowCategorization(true);
      toast({
        title: "AI Categorization Complete",
        description: `Analyzed ${data.length} items with AI-powered categorization`
      });
    },
    onError: (error: any) => {
      setIsCategorizingItems(false);
      toast({
        title: "Error",
        description: "Failed to categorize items: " + error.message,
        variant: "destructive"
      });
    }
  });

  // Apply categorization insights mutation
  const applyInsightsMutation = useMutation({
    mutationFn: async () => {
      const defaultList = shoppingLists?.[0];
      if (!defaultList) throw new Error("No shopping list found");

      const items = defaultList.items || [];

      // Update items with optimized quantities and units based on AI insights
      const updatePromises = categorizedItems.map(async (categorizedItem) => {
        const originalItem = items.find(item => item.productName === categorizedItem.productName);
        if (!originalItem) return null;

        // Check if there are meaningful changes to apply
        const currentQuantity = Number(originalItem.quantity) || 1;
        const currentUnit = originalItem.unit || 'COUNT';
        const suggestedQuantity = Math.max(1, Math.round(Number(categorizedItem.normalized.suggestedQuantity) || currentQuantity));
        const suggestedUnit = categorizedItem.normalized.suggestedUnit || currentUnit;

        // Only update if there's a meaningful change suggested OR if the AI provided optimization insights
        const hasQuantityChange = suggestedQuantity !== currentQuantity;
        const hasUnitChange = suggestedUnit !== currentUnit;
        const hasOptimizationReason = categorizedItem.normalized.conversionReason && 
          categorizedItem.normalized.conversionReason !== 'No conversion needed' &&
          categorizedItem.normalized.conversionReason !== 'Categorization service unavailable';

        const shouldUpdate = hasQuantityChange || hasUnitChange || hasOptimizationReason || categorizedItem.category.normalizedName;

        console.log('Update check for', originalItem.productName, {
          currentQuantity,
          suggestedQuantity,
          currentUnit,
          suggestedUnit,
          hasQuantityChange,
          hasUnitChange,
          hasOptimizationReason,
          shouldUpdate,
          conversionReason: categorizedItem.normalized.conversionReason
        });

        if (shouldUpdate) {
          // Ensure we're sending valid integer quantities, not confidence values
          const suggestedQuantity = Math.max(1, Math.round(Number(categorizedItem.normalized.suggestedQuantity)));

          // Use normalized name if available and different from original
          const updatedProductName = categorizedItem.category.normalizedName && 
            categorizedItem.category.normalizedName !== originalItem.productName 
            ? categorizedItem.category.normalizedName 
            : originalItem.productName;

          const response = await apiRequest('PATCH', `/api/shopping-list/items/${originalItem.id}`, {
            productName: updatedProductName,
            quantity: suggestedQuantity,
            unit: categorizedItem.normalized.suggestedUnit || 'COUNT'
          });
          return response.json();
        }
        return null;
      });

      const results = await Promise.all(updatePromises);
      const updatedCount = results.filter(result => result !== null).length;
      return updatedCount;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
      setShowCategorization(false);
      setCategorizedItems([]);
      toast({
        title: "Categorization Applied",
        description: `Updated ${count} items with AI optimization suggestions`
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to apply categorization insights: " + error.message,
        variant: "destructive"
      });
    }
  });

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemName.trim()) {
      const productName = newItemName.trim();

      let unit = newItemUnit;

      // If auto-detect is enabled, use AI to determine the optimal unit
      if (autoDetectUnit) {
        try {
          const response = await apiRequest('POST', '/api/products/categorize', {
            productName
          });
          const categoryData = await response.json();
          unit = categoryData.suggestedQuantityType || detectUnitFromItemName(productName);
        } catch (error) {
          // Fallback to local detection if AI fails
          unit = detectUnitFromItemName(productName);
        }
      }

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

  // Handle toggling item selection in generate list preview
  const handleToggleGeneratedItem = (index: number) => {
    const updatedItems = [...generatedItems];
    updatedItems[index].isSelected = !updatedItems[index].isSelected;
    setGeneratedItems(updatedItems);
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;

      // Parse different file types
      let items: any[] = [];

      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        // Parse plain text - each line is an item
        items = content.split('\n')
          .filter(line => line.trim())
          .map(line => ({
            productName: line.trim(),
            quantity: 1,
            unit: 'COUNT',
            isSelected: true
          }));
      } else if (file.type === 'application/json' || file.name.endsWith('.json')) {
        try {
          const jsonData = JSON.parse(content);
          if (Array.isArray(jsonData)) {
            items = jsonData.map(item => ({
              productName: typeof item === 'string' ? item : item.name || item.productName || '',
              quantity: typeof item === 'object' ? item.quantity || 1 : 1,
              unit: typeof item === 'object' ? item.unit || 'COUNT' : 'COUNT',
              isSelected: true
            }));
          }
        } catch (error) {
          toast({
            title: "Error parsing JSON",
            description: "Invalid JSON format",
            variant: "destructive"
          });
          return;
        }
      } else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        // Parse CSV - assume first column is item name
        const lines = content.split('\n').filter(line => line.trim());
        items = lines.map(line => {
          const columns = line.split(',');
          return {
            productName: columns[0]?.trim() || '',
            quantity: parseInt(columns[1]) || 1,
            unit: columns[2]?.trim() || 'COUNT',
            isSelected: true
          };
        }).filter(item => item.productName);
      }

      if (items.length > 0) {
        setUploadedItems(items);
      } else {
        toast({
          title: "No items found",
          description: "Could not parse items from the uploaded file.",
          variant: "destructive"
        });
      }
    };

    reader.readAsText(file);
  };

  // Handle image upload for OCR
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Image = e.target?.result as string;
      processImageMutation.mutate(base64Image.split(',')[1]);
    };

    reader.readAsDataURL(file);
  };

  // Handle toggling uploaded item selection
  const handleToggleUploadedItem = (index: number) => {
    const updatedItems = [...uploadedItems];
    updatedItems[index].isSelected = !updatedItems[index].isSelected;
    setUploadedItems(updatedItems);
  };

  // Handle toggling recipe preview item selection
  const handleToggleRecipeItem = (index: number) => {
    const updatedItems = [...recipePreviewItems];
    updatedItems[index].isSelected = !updatedItems[index].isSelected;
    setRecipePreviewItems(updatedItems);
  };

  // Handle viewing shopping plan
  const handleViewShoppingPlan = (plan: any, title: string) => {
    console.log('Opening shopping plan:', { plan, title, planType: plan?.planType }); // Debug log
    if (!plan) {
      toast({
        title: "Error",
        description: "Shopping plan data is not available",
        variant: "destructive"
      });
      return;
    }
    setSelectedPlan(plan);
    setSelectedPlanTitle(title);
    setShowShoppingPlan(true);
  };

  // Handle printing shopping plan
  const handlePrintShoppingPlan = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = generatePrintContent();
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  // Generate optimized shopping route with aisle information
  const generateOptimizedShoppingRoute = (plan: any) => {
    if (!plan) return plan;

    // Define aisle mappings for different product categories
    const aisleMapping = {
      'Produce': { aisle: 'Aisle 1', category: 'Fresh Produce', order: 1 },
      'Dairy': { aisle: 'Aisle 2', category: 'Dairy & Eggs', order: 2 },
      'Meat': { aisle: 'Aisle 3', category: 'Meat & Seafood', order: 3 },
      'Pantry': { aisle: 'Aisle 4-6', category: 'Pantry & Canned Goods', order: 4 },
      'Frozen': { aisle: 'Aisle 7', category: 'Frozen Foods', order: 5 },
      'Bakery': { aisle: 'Aisle 8', category: 'Bakery', order: 6 },
      'Personal Care': { aisle: 'Aisle 9', category: 'Health & Personal Care', order: 7 },
      'Household': { aisle: 'Aisle 10', category: 'Household Items', order: 8 }
    };

    // Function to categorize items
    const categorizeItem = (productName: string) => {
      const name = productName.toLowerCase();

      if (name.includes('banana') || name.includes('strawberries') || name.includes('produce')) {
        return 'Produce';
      } else if (name.includes('milk') || name.includes('yogurt') || name.includes('cheese') || name.includes('egg')) {
        return 'Dairy';
      } else if (name.includes('chicken') || name.includes('beef') || name.includes('meat') || name.includes('fish')) {
        return 'Meat';
      } else if (name.includes('bread') || name.includes('cake') || name.includes('bakery')) {
        return 'Bakery';
      } else if (name.includes('frozen') || name.includes('ice cream')) {
        return 'Frozen';
      } else if (name.includes('soap') || name.includes('shampoo') || name.includes('toothpaste')) {
        return 'Personal Care';
      } else if (name.includes('towel') || name.includes('cleaner') || name.includes('detergent')) {
        return 'Household';
      } else if (name.includes('Pantry')) {
        return 'Pantry';
      } else {
        return 'Pantry';
      }
    };

    // Process stores to add aisle organization
    const optimizedPlan = { ...plan };

    if (optimizedPlan.stores) {
      optimizedPlan.stores = optimizedPlan.stores.map((store: any) => {
        // Group items by aisle
        const aisleGroups: { [key: string]: any } = {};

        store.items.forEach((item: any) => {
          const category = categorizeItem(item.productName);
          const aisleInfo = aisleMapping[category as keyof typeof aisleMapping];

          if (!aisleGroups[aisleInfo.aisle]) {
            aisleGroups[aisleInfo.aisle] = {
              aisleName: aisleInfo.aisle,
              category: aisleInfo.category,
              order: aisleInfo.order,
              items: []
            };
          }

          // Add shelf location for specific items
          let shelfLocation = '';
          const name = item.productName.toLowerCase();
          if (name.includes('milk')) shelfLocation = 'Cooler Section';
          else if (name.includes('bread')) shelfLocation = 'End Cap';
          else if (name.includes('banana')) shelfLocation = 'Front Display';

          aisleGroups[aisleInfo.aisle].items.push({
            ...item,
            shelfLocation
          });
        });

        // Sort aisles by order and convert to array
        const sortedAisleGroups = Object.values(aisleGroups).sort((a: any, b: any) => a.order - b.order);

        // Calculate route optimization
        const totalAisles = sortedAisleGroups.length;
        const estimatedTime = Math.max(15, totalAisles * 3 + store.items.length * 0.5);

        return {
          ...store,
          aisleGroups: sortedAisleGroups,
          optimizedRoute: {
            totalAisles,
            estimatedTime: Math.round(estimatedTime),
            routeOrder: sortedAisleGroups.map((group: any) => group.aisleName)
          }
        };
      });
    } else if (optimizedPlan.items) {
      // Handle single store case
      const aisleGroups: { [key: string]: any } = {};

      optimizedPlan.items.forEach((item: any) => {
        const category = categorizeItem(item.productName);
        const aisleInfo = aisleMapping[category as keyof typeof aisleMapping];

        if (!aisleGroups[aisleInfo.aisle]) {
          aisleGroups[aisleInfo.aisle] = {
            aisleName: aisleInfo.aisle,
            category: aisleInfo.category,
            order: aisleInfo.order,
            items: []
          };
        }

        let shelfLocation = '';
        const name = item.productName.toLowerCase();
        if (name.includes('milk')) shelfLocation = 'Cooler Section';
        else if (name.includes('bread')) shelfLocation = 'End Cap';
        else if (name.includes('banana')) shelfLocation = 'Front Display';

        aisleGroups[aisleInfo.aisle].items.push({
          ...item,
          shelfLocation
        });
      });

      const sortedAisleGroups = Object.values(aisleGroups).sort((a: any, b: any) => a.order - b.order);
      const totalAisles = sortedAisleGroups.length;
      const estimatedTime = Math.max(15, totalAisles * 3 + optimizedPlan.items.length * 0.5);

      optimizedPlan.aisleGroups = sortedAisleGroups;
      optimizedPlan.optimizedRoute = {
        totalAisles,
        estimatedTime: Math.round(estimatedTime),
        routeOrder: sortedAisleGroups.map((group: any) => group.aisleName)
      };
    }

    return optimizedPlan;
  };

  // Generate print content
  const generatePrintContent = () => {
    if (!selectedPlan) return '';

    const currentDate = new Date().toLocaleDateString();

    // Build HTML content using string concatenation to avoid template literal issues
    let content = '<!DOCTYPE html>\n<html>\n<head>\n';
    content += '<title>Shopping Plan - ' + (selectedPlan.planType || 'Shopping List') + '</title>\n';
    content += '<style>\n';
    content += 'body { font-family: Arial, sans-serif; margin: 20px; }\n';
    content += '.header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 10px; }\n';
    content += '.store-section { margin-bottom: 30px; page-break-inside: avoid; }\n';
    content += '.store-header { background-color: #f5f5f5; padding: 10px; font-weight: bold; font-size: 18px; }\n';
    content += '.item-list { margin: 10px 0; }\n';
    content += '.item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dotted #ccc; }\n';
    content += '.item-checkbox { display: inline-block; width: 15px; height: 15px; border: 2px solid #333; margin-right: 10px; vertical-align: middle; }\n';
    content += '.item-text { flex: 1; }\n';
    content += '.item-price { font-weight: bold; }\n';
    content += '.summary { margin-top: 30px; border-top: 2px solid #000; padding-top: 10px; }\n';
    content += '.footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }\n';
    content += '.note { margin-top: 20px; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #007bff; }\n';
    content += '@media print { body { margin: 0; } .mobile-shopping-item { display: none !important; } }\n';
    content += '</style>\n</head>\n<body>\n';

    // Header section
    content += '<div class="header">\n';
    content += '<h1>Shopping Plan - ' + (selectedPlan.planType || 'Shopping List') + '</h1>\n';
    content += '<p>Generated on ' + currentDate + '</p>\n';
    content += '</div>\n';

    if (selectedPlan.stores) {
      selectedPlan.stores.forEach((store: any) => {
        content += '<div class="store-section">\n';
        content += '<div class="store-header">\n';
        content += store.retailerName;
        if (store.address) {
          content += '<br><small style="font-weight: normal;">' + store.address + '</small>';
        }
        content += '\n</div>\n<div class="item-list">\n';

        if (store.items && store.items.length > 0) {
          store.items.forEach((item: any) => {
            content += '<div class="item">\n';
            content += '<div class="item-text">\n';
            content += '<span class="item-checkbox"></span>\n';
            content += item.productName + ' (Qty: ' + item.quantity + ')\n';
            content += '</div>\n';
            content += '<span class="item-price">$' + (item.price / 100).toFixed(2) + '</span>\n';
            content += '</div>\n';
          });
        }

        content += '</div>\n';
        content += '<div style="text-align: right; font-weight: bold; margin-top: 10px;">\n';
        content += 'Store Total: $' + ((store.subtotal || store.totalCost || 0) / 100).toFixed(2) + '\n';
        content += '</div>\n</div>\n';
      });
    } else if (selectedPlan.items) {
      content += '<div class="store-section">\n';
      content += '<div class="store-header">' + (selectedPlan.retailerName || 'Shopping List') + '</div>\n';
      content += '<div class="item-list">\n';

      selectedPlan.items.forEach((item: any) => {
        content += '<div class="item">\n';
        content += '<div class="item-text">\n';
        content += '<span class="item-checkbox"></span>\n';
        content += item.productName + ' (Qty: ' + item.quantity + ')\n';
        content += '</div>\n';
        content += '<span class="item-price">$' + (item.price / 100).toFixed(2) + '</span>\n';
        content += '</div>\n';
      });

      content += '</div>\n</div>\n';
    }

    // Summary section
    content += '<div class="summary">\n';
    content += '<div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: bold;">\n';
    content += '<span>Total Cost:</span>\n';
    content += '<span>$' + (selectedPlan.totalCost / 100).toFixed(2) + '</span>\n';
    content += '</div>\n';

    if (selectedPlan.savings && selectedPlan.savings > 0) {
      content += '<div style="display: flex; justify-content: space-between; color: green;">\n';
      content += '<span>Total Savings:</span>\n';
      content += '<span>$' + (selectedPlan.savings / 100).toFixed(2) + '</span>\n';
      content += '</div>\n';
    }
    content += '</div>\n';

    // Note section
    content += '<div class="note">\n';
    content += '<h4 style="margin-top: 0;">📱 Mobile Shopping Tip:</h4>\n';
    content += '<p style="margin-bottom: 0;">Access your shopping list on your mobile device to check off items as you shop. Changes sync in real-time!</p>\n';
    content += '</div>\n';

    // Footer
    content += '<div class="footer">\n';
    content += '<p>Happy Shopping! 🛒</p>\n';
    content += '</div>\n';
    content += '</body>\n</html>';

    return content;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Produce": 
        return "🍎";
      case "Dairy & Eggs": 
        return "🥛";
      case "Meat & Seafood": 
        return "🥩";
      case "Pantry & Canned Goods": 
        return "🥫";
      case "Frozen Foods": 
        return "❄️";
      case "Bakery": 
        return "🍞";
      case "Personal Care": 
        return "🧼";
      case "Household Items": 
        return "🏠";
      default: 
        return "🛒";
    }
  };

  // Apply categorization insights
  const applyCategorizationInsights = () => {
    if (categorizedItems.length === 0) {
      toast({
        title: "No insights to apply",
        description: "Run categorization first to get insights",
        variant: "destructive"
      });
      return;
    }

    applyInsightsMutation.mutate();
  };

  // Get the default shopping list and its items
  const defaultList = shoppingLists?.[0];
  const items = defaultList?.items ?? [];
  const selectedList = defaultList;

  // Auto-trigger optimization when optimization tab is selected
  React.useEffect(() => {
    if (activeTab === 'optimization' && defaultList?.id && items.length > 0 && !priceComparisonMutation.data && !priceComparisonMutation.isPending) {
      priceComparisonMutation.mutate(defaultList.id);
    }
  }, [activeTab, defaultList?.id, items.length, priceComparisonMutation.data, priceComparisonMutation.isPending]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
        <Header title="Shopping Lists" />
        <main className="flex-1 overflow-y-auto p-4">
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
        </main>
        <BottomNavigation activeTab="lists" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
      <Header title="Shopping Lists" />

      <main className="flex-1 overflow-y-auto px-4 sm:px-6 pt-6 pb-24">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Shopping Lists</h1>
          <p className="text-gray-600 text-sm sm:text-base">Manage your shopping lists and find the best deals</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <Card className="border-2 border-gray-100 hover:border-primary/30 hover:shadow-lg transition-all duration-200 group">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-3 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors">
                  <ShoppingCart className="h-8 w-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-gray-900">Generate List</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">AI-powered list based on your shopping history</p>
                </div>
                <Button 
                  className="w-full bg-primary hover:bg-primary/90 h-12 font-medium shadow-sm"
                  onClick={() => previewGenerateMutation.mutate()}
                  disabled={previewGenerateMutation.isPending}
                >
                  {previewGenerateMutation.isPending ? (
                    <>
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <ListChecks className="h-4 w-4 mr-2" />
                      <span>Generate</span>
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-100 hover:border-blue-300 hover:shadow-lg transition-all duration-200 group">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-3 bg-blue-50 rounded-full group-hover:bg-blue-100 transition-colors">
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-gray-900">Upload List</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">Import from text, CSV, or photo of handwritten list</p>
                </div>
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 font-medium shadow-sm"
                  onClick={() => setUploadDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span>Upload</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-100 hover:border-green-300 hover:shadow-lg transition-all duration-200 group">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-3 bg-green-50 rounded-full group-hover:bg-green-100 transition-colors">
                  <FileText className="h-8 w-8 text-green-600" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-gray-900">Import Recipe</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">Extract ingredients from any recipe URL</p>
                </div>
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700 text-white h-12 font-medium shadow-sm"
                  onClick={() => setRecipeDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span>Recipe</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Categorization Section */}
        {items.length > 0 && (
          <Card className="mb-8 border-2 border-purple-100 bg-gradient-to-r from-purple-50 to-indigo-50 hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start space-x-4">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Sparkles className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-purple-800">AI Product Categorization</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Optimize your shopping list with AI-powered product analysis and categorization
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-purple-600">
                      <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                      <span>{items.length} items ready for analysis</span>
                    </div>
                  </div>
                </div>
                <Button 
                  onClick={() => categorizeMutation.mutate()}
                  disabled={categorizeMutation.isPending || items.length === 0}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md h-12 px-6 font-medium"
                  size="lg"
                >
                  {categorizeMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-5 w-5" />
                      Analyze Items
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid grid-cols-3 w-full bg-gray-100 p-1 rounded-xl h-14">
            <TabsTrigger 
              value="items" 
              className="flex-1 rounded-lg px-4 py-3 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary"
            >
              <ShoppingBag className="h-4 w-4 mr-2" />
              Items
            </TabsTrigger>
            <TabsTrigger 
              value="optimization" 
              className="flex-1 rounded-lg px-4 py-3 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary"
            >
              <BarChart className="h-4 w-4 mr-2" />
              Optimize
            </TabsTrigger>
            <TabsTrigger 
              value="comparison" 
              className="flex-1 rounded-lg px-4 py-3 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary"
            >
              <BarChart4 className="h-4 w-4 mr-2" />
              Compare
            </TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="pt-4">

<div className="space-y-3">
              {items.length === 0 ? (
                <Card>
                  <CardContent className="p-4 sm:p-6 text-center text-gray-500">
                    <ShoppingBag className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-gray-300 mb-2" />
                    <p>Your shopping list is empty</p>
                    <p className="text-xs sm:text-sm mt-1">Add items to get started</p>
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
                        <div key={'incomplete-' + category} className="space-y-2">
                          <div className="flex items-center space-x-3 mt-6 mb-4 p-3 bg-gray-50 rounded-lg border-l-4 border-primary">
                            <span className="text-2xl">{getCategoryIcon(category)}</span>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-800 text-base">{category}</h4>
                              <p className="text-xs text-gray-500">{categoryItems.length} item{categoryItems.length !== 1 ? 's' : ''}</p>
                            </div>
                          </div>
                          {categoryItems.map((item: ShoppingListItem) => (
                            <Card key={item.id} className="ml-4 border-2 border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-200">
                              <CardContent className="p-4">
                                <div className="flex items-center space-x-4">
                                  <input
                                    type="checkbox"
                                    checked={item.isCompleted}
                                    onChange={() => handleToggleItem(item.id, item.isCompleted)}
                                    className="h-5 w-5 text-primary rounded border-2 border-gray-300 focus:ring-2 focus:ring-primary focus:ring-offset-2"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                      <div className="flex-1">
                                        <h5 className="font-semibold text-gray-900 text-base truncate">
                                          {item.productName}
                                        </h5>
                                        <div className="flex items-center space-x-2 mt-1">
                                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                            Qty: {item.quantity}
                                            {item.unit && item.unit !== "COUNT" && (
                                              <span className="ml-1 text-gray-500">{item.unit.toLowerCase()}</span>
                                            )}
                                          </span>
                                        </div>
                                        {item.suggestedRetailerId && item.suggestedPrice && (
                                          <div className="flex items-center text-xs text-green-600 mt-2 p-2 bg-green-50 rounded">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                              <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/>
                                              <path d="M3 9V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4"/>
                                            </svg>
                                            <span className="font-medium">
                                              Best price: ${(item.suggestedPrice / 100).toFixed(2)} at Retailer #{item.suggestedRetailerId}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <button
                                          onClick={() => handleEditItem(item)}
                                          className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                          aria-label="Edit item"
                                          title="Edit item"
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteItem(item.id)}
                                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                          aria-label="Delete item"
                                          title="Delete item"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ))}

                      {/* Completed items section */}
                      {completedItems.length > 0 && (
                        <div className="mt-8">
                          <div className="flex items-center space-x-3 mb-4 p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
                            <Check className="h-6 w-6 text-green-600" />
                            <div className="flex-1">
                              <h4 className="font-semibold text-green-800 text-base">Completed Items</h4>
                              <p className="text-xs text-green-600">{completedItems.length} item{completedItems.length !== 1 ? 's' : ''} completed</p>
                            </div>
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
                                        onChange={() => handleToggleItem(item.id, item.isCompleted)}
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
                                        onClick={() => handleDeleteItem(item.id)}
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
                    </>
                  );
                })()
              )}
            </div>

            {/* Add Item Form */}
            <Card className="mb-8 border-2 border-gray-100">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Item</h3>
                <form onSubmit={handleAddItem} className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <Input
                        type="text"
                        placeholder="Enter item name (e.g., Bananas, Milk, Bread)"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        className="h-12 text-base border-2 border-gray-200 focus:border-primary"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="bg-primary hover:bg-primary/90 text-white h-12 px-8 font-medium shadow-sm w-full sm:w-auto"
                      disabled={addItemMutation.isPending}
                    >
                      {addItemMutation.isPending ? (
                        <>
                          <Loader2 className="animate-spin h-4 w-4 mr-2" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Item
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">Quantity</Label>
                      <Input
                        type="number"
                        placeholder="1"
                        min="0.01"
                        step="0.01"
                        defaultValue="1"
                        onChange={(e) => setNewItemQuantity(Math.round(parseFloat(e.target.value) || 1))}
                        className="h-10 border-2 border-gray-200 focus:border-primary"
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">Unit</Label>
                      <Select 
                        value={newItemUnit} 
                        onValueChange={setNewItemUnit}
                        disabled={autoDetectUnit}
                      >
                        <SelectTrigger className={'h-10 border-2 border-gray-200 focus:border-primary ' + (autoDetectUnit ? 'opacity-60' : '')}>
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

                  <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                    <Switch 
                      checked={autoDetectUnit} 
                      onCheckedChange={setAutoDetectUnit}
                      id="auto-detect"
                    />
                    <Label htmlFor="auto-detect" className="cursor-pointer flex items-center text-sm text-blue-800">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Auto-detect best unit based on item name
                    </Label>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="optimization" className="pt-4">
            {!priceComparisonMutation.data && priceComparisonMutation.isPending && (
              <Card className="mb-4">
                <CardContent className="p-4 sm:p-6">
                  <div className="space-y-4 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <h3 className="text-lg font-medium">Analyzing Your Shopping List</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Finding the best deals and optimizing your shopping experience...
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {priceComparisonMutation.data && (
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <div className="space-y-4">
                    <div className="border-b pb-3 mb-4">
                      <h3 className="text-lg font-medium">Optimized Shopping Plans</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Based on {items.length} items in your shopping list
                      </p>
                    </div>

                    <div className="space-y-4 sm:space-y-6 mb-4 sm:mb-6">
                      {/* Single Store Option */}
                      <div className="border border-blue-200 rounded-lg sm:rounded-xl overflow-hidden">
                        <div className="bg-blue-50 dark:bg-blue-900/10 px-3 sm:px-4 py-2 sm:py-3 border-b border-blue-200">
                          <div className="font-medium text-sm sm:text-base text-blue-700 dark:text-blue-300">Single Store Option</div>
                        </div>
                        <div className="p-3 sm:p-4">
                          <div className="flex items-center mb-3 sm:mb-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-100 flex items-center justify-center mr-3 sm:mr-4 shrink-0">
                              <StoreIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-medium text-base sm:text-lg">
                                {singleStoreOptimization.data?.retailerName || "Loading..."}
                              </h4>
                              <p className="text-xs sm:text-sm text-gray-500">
                                {singleStoreOptimization.data ? 
                                  `${singleStoreOptimization.data.availableItems || items.length} out of ${items.length} items • $${(singleStoreOptimization.data.totalCost / 100).toFixed(2)} total` :
                                  `${Math.floor(items.length * 0.87)} out of ${items.length} items • Est. $${(items.length * 2.85).toFixed(2)} total`
                                }
                              </p>
                              <p className="text-xs text-blue-600">123 Main St, San Francisco, CA 94105</p>
                            </div>
                          </div>
                          {singleStoreOptimization.data ? (
                            <div className="space-y-2 mb-3">
                              <div className="text-xs font-medium text-gray-600">Items Available:</div>
                              {singleStoreOptimization.data.items?.slice(0, 3).map((item: any, index: number) => (
                                <div key={index} className="flex justify-between text-xs">
                                  <span>{item.productName} (Qty: {item.quantity})</span>
                                  <span>${(item.price / 100).toFixed(2)}</span>
                                </div>
                              ))}
                              {singleStoreOptimization.data.items?.length > 3 && (
                                <div className="text-xs text-gray-500">
                                  +{singleStoreOptimization.data.items.length - 3} more items
                                </div>
                              )}
                              <Button 
                                size="sm" 
                                variant="default" 
                                className="w-full text-xs sm:text-sm mt-2"
                                onClick={() => handleViewShoppingPlan({
                                  ...singleStoreOptimization.data,
                                  planType: "Single Store"
                                }, `Single Store - ${singleStoreOptimization.data?.retailerName || "Loading..."}`)}
                              >
                                <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                View Full Shopping Plan
                              </Button>
                            </div>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="w-full text-xs sm:text-sm"
                              onClick={() => defaultList?.id && singleStoreOptimization.mutate(defaultList.id)}
                              disabled={singleStoreOptimization.isPending || !items.length}
                            >
                              {singleStoreOptimization.isPending ? (
                                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                              ) : (
                                <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                              )}
                              View Shopping Plan
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Best Value Option */}
                      <div className="border border-green-200 rounded-lg sm:rounded-xl overflow-hidden">
                        <div className="bg-green-50 dark:bg-green-900/10 px-3 sm:px-4 py-2 sm:py-3 border-b border-green-200">
                          <div className="font-medium text-sm sm:text-base text-green-700 dark:text-green-300">
                            Best Value Option {bestValueOptimization.data ? `(Save $${(bestValueOptimization.data.savings / 100).toFixed(2)})` : '(Save Est. $8.50)'}
                          </div>
                        </div>
                        <div className="p-3 sm:p-4">
                          <div className="flex items-center mb-3 sm:mb-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-100 flex items-center justify-center mr-3 sm:mr-4 shrink-0">
                              <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                            </div>
                            <div>
                              <h4 className="font-medium text-base sm:text-lg">
                                {bestValueOptimization.data ? 
                                  bestValueOptimization.data.stores?.map((s: any) => s.retailerName).join(' + ') :
                                  'Kroger + Walmart'
                                }
                              </h4>
                              <p className="text-xs sm:text-sm text-gray-500">
                                {bestValueOptimization.data ? 
                                  `All ${items.length} items • $${(bestValueOptimization.data.totalCost / 100).toFixed(2)} total` :
                                  `All ${items.length} items • Est. $${(items.length * 2.15).toFixed(2)} total`
                                }
                              </p>
                            </div>
                          </div>
                          {bestValueOptimization.data ? (
                            <div className="space-y-2 mb-3">
                              {bestValueOptimization.data.stores?.map((store: any, index: number) => (
                                <div key={index} className="border rounded p-2">
                                  <div className="font-medium text-xs text-gray-700">{store.retailerName}</div>
                                  <div className="text-xs text-gray-500">
                                    {store.items.length} items • ${(store.subtotal / 100).toFixed(2)}
                                  </div>
                                </div>
                              ))}
                              <Button 
                                size="sm" 
                                variant="default" 
                                className="w-full text-xs sm:text-sm mt-2"
                                onClick={() => handleViewShoppingPlan({
                                  ...bestValueOptimization.data,
                                  planType: "Best Value Multi-Store"
                                }, "Best Value - Multi-Store")}
                              >
                                <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                View Full Shopping Plan
                              </Button>
                            </div>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="default" 
                              className="w-full text-xs sm:text-sm"
                              onClick={() => defaultList?.id && bestValueOptimization.mutate(defaultList.id)}
                              disabled={bestValueOptimization.isPending || !items.length}
                            >
                              {bestValueOptimization.isPending ? (
                                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                              ) : (
                                <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                              )}
                              View Multi-Store Plan
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Balanced Option */}
                      <div className="border rounded-lg sm:rounded-xl overflow-hidden">
                        <div className="bg-gray-50 dark:bg-gray-800 px-3 sm:px-4 py-2 sm:py-3 border-b">
                          <div className="font-medium text-sm sm:text-base">
                            Balanced Option {balancedOptimization.data ? `(Save $${(balancedOptimization.data.savings / 100).toFixed(2)})` : '(Save Est. $3.20)'}
                          </div>
                        </div>
                        <div className="p-3 sm:p-4">
                          <div className="flex items-center mb-3 sm:mb-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-100 flex items-center justify-center mr-3 sm:mr-4 shrink-0">
                              <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" />
                            </div>
                            <div>
                              <h4 className="font-medium text-base sm:text-lg">
                                {balancedOptimization.data?.stores?.[0]?.retailerName || "Loading..."}
                              </h4>
                              <p className="text-xs sm:text-sm text-gray-500">
                                {balancedOptimization.data ? 
                                  `${balancedOptimization.data.stores?.[0]?.items?.length || items.length} out of ${items.length} items • $${(balancedOptimization.data.totalCost / 100).toFixed(2)} total` :
                                  `${Math.floor(items.length * 0.92)} out of ${items.length} items • Est. $${(items.length * 2.65).toFixed(2)} total`
                                }
                              </p>
                              <p className="text-xs text-gray-600">456 Market St, San Francisco, CA 94102</p>
                            </div>
                          </div>
                          {balancedOptimization.data ? (
                            <div className="space-y-2 mb-3">
                              <div className="text-xs font-medium text-gray-600">Items Available:</div>
                              {balancedOptimization.data.stores?.[0]?.items?.slice(0, 3).map((item: any, index: number) => (
                                <div key={index} className="flex justify-between text-xs">
                                  <span>{item.productName} (Qty: {item.quantity})</span>
                                  <span>${(item.price / 100).toFixed(2)}</span>
                                </div>
                              ))}
                              {(balancedOptimization.data.stores?.[0]?.items?.length || 0) > 3 && (
                                <div className="text-xs text-gray-500">
                                  +{(balancedOptimization.data.stores?.[0]?.items?.length || 0) - 3} more items
                                </div>
                              )}
                              <Button 
                                size="sm" 
                                variant="default" 
                                className="w-full text-xs sm:text-sm mt-2"
                                onClick={() => handleViewShoppingPlan({
                                  ...balancedOptimization.data,
                                  planType: "Balanced"
                                }, `Balanced - ${balancedOptimization.data?.stores?.[0]?.retailerName || "Loading..."}`)}
                              >
                                <BarChart className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                View Full Shopping Plan
                              </Button>
                            </div>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="w-full text-xs sm:text-sm"
                              onClick={() => defaultList?.id && balancedOptimization.mutate(defaultList.id)}
                              disabled={balancedOptimization.isPending || !items.length}
                            >
                              {balancedOptimization.isPending ? (
                                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                              ) : (
                                <BarChart className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                              )}
                              View Balanced Plan
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Go Shopping Section */}
                    <div className="border-t pt-4 mt-4">
                      <h4 className="font-medium text-sm sm:text-base mb-3">Ready to Shop?</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Button 
                          className="w-full h-auto p-4 flex flex-col items-center space-y-2"
                          onClick={() => {
                            // Always navigate to auto-order for smart ordering
                            navigate('/auto-order?listId=' + (selectedList?.id || defaultList?.id || '1') + '&mode=online');
                          }}
                        >
                          <ShoppingCart className="h-6 w-6" />
                          <div className="text-center">
                            <div className="font-medium">Shop Online</div>
                            <div className="text-xs text-white/80">Place optimized orders automatically</div>
                          </div>
                        </Button>

                        <Button 
                          variant="outline"
                          className="w-full h-auto p-4 flex flex-col items-center space-y-2"
                          onClick={() => {
                            navigate('/shop?listId=' + selectedList?.id + '&mode=pickup');
                          }}
                        >
                          <StoreIcon className="h-6 w-6" />

                          <div className="text-center">
                            <div className="font-medium">Order for Delivery/Pickup</div>
                            <div className="text-xs text-gray-500">Place orders for pickup or delivery</div>
                          </div>
                        </Button>
                      </div>
                    </div>

                    {/* Special Deals Section */}
                    <div className="border-t pt-4 mt-4">
                      <h4 className="font-medium text-sm sm:text-base mb-2">Special Deals & Offers</h4>
                      <div className="space-y-3">
                        <div className="border border-amber-200 rounded-lg p-3 bg-amber-50 dark:bg-amber-900/10">
                          <div className="flex">
                            <ShoppingBag className="h-5 w-5 text-amber-500 mr-2 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                                Spend $5.50 more on Dairy at Kroger
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                Get $3 off your total purchase
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="border border-purple-200 rounded-lg p-3 bg-purple-50 dark:bg-purple-900/10">
                          <div className="flex">
                            <ShoppingCart className="h-5 w-5 text-purple-500 mr-2 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
                                Buy 1 more Coca Cola at Walmart
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                Get 1 free (Buy 12, Get 1 Free promotion)
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {!priceComparisonMutation.data && (
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <div className="text-center py-6 sm:py-8">
                    <div className="relative w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-3 sm:mb-4">
                      <div className="absolute inset-0 bg-primary/10 rounded-full flex items-center justify-center">
                        <BarChart4 className="h-8 w-8 sm:h-12 sm:w-12 text-primary/60" />
                      </div>
                    </div>
                    <h3 className="text-base sm:text-lg font-medium mb-2">Optimize Your Shopping</h3>
                    <p className="text-sm text-gray-500 mb-2 max-w-md mx-auto">
                      Click "Calculate Shopping Options" above to see optimized plans
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6">
                      {items.length === 0 ? 
                        "Add items to your shopping list first" : 
                        `Ready to optimize ${items.length} items in your list`}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="comparison" className="pt-4">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Price Comparison</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => defaultList?.id && priceComparisonMutation.mutate(defaultList.id)}
                      disabled={priceComparisonMutation.isPending || !items.length}
                    >
                      {priceComparisonMutation.isPending ? "Calculating..." : "Compare Prices"}
                    </Button>
                  </div>

                  {priceComparisonMutation.data?.singleStore?.length > 0 ? (
                    <div className="space-y-4">
                      {priceComparisonMutation.data.singleStore.slice(0, 3).map((store: any) => (
                        <div key={store.retailerId} className="border rounded-lg p-4">
                          <div className="flex justify-between items-center mb-3">
                            <div>
                              <span className="font-semibold text-lg">{store.retailerName}</span>
                              <span className="ml-2 text-sm text-gray-500">{items.length} items</span>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-lg">${(store.totalCost / 100).toFixed(2)}</div>
                              {store.savings > 0 && (
                                <div className="text-sm text-green-600">Save ${(store.savings / 100).toFixed(2)}</div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2 mb-3">
                            {store.items?.slice(0, 3).map((item: any, index: number) => (
                              <div key={index} className="flex justify-between text-sm">
                                <span>{item.productName} (x{item.quantity})</span>
                                <span>${(item.price / 100).toFixed(2)}</span>
                              </div>
                            ))}

                            {store.items?.length > 3 && (
                              <div className="text-sm text-gray-500">
                                +{store.items.length - 3} more items
                              </div>
                            )}
                          </div>

                          {store.incentives?.length > 0 && (
                            <div className="bg-blue-50 rounded-lg p-3 mb-3">
                              <div className="text-sm font-medium text-blue-800 mb-1">Special Offers</div>
                              {store.incentives.slice(0, 1).map((incentive: any, index: number) => (
                                <div key={index} className="text-xs text-blue-600">
                                  {incentive.message}
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2">
                            <Button 
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => {
                                handleViewShoppingPlan({
                                  stores: store.stores || [{
                                    retailerId: store.retailerId,
                                    retailerName: store.retailerName,
                                    items: store.items,
                                    subtotal: store.totalCost,
                                    address: store.address
                                  }],
                                  totalCost: store.totalCost,
                                  savings: store.savings || 0
                                }, `In-Store Plan - ${store.retailerName}`);
                              }}
                            >
                              <StoreIcon className="h-4 w-4 mr-2" />
                              Shop In-Store
                            </Button>
                            <Button 
                              size="sm"
                              className="w-full"
                              onClick={() => {
                                toast({
                                  title: "Online Order",
                                  description: `Redirecting to ${store.retailerName} website`
                                });
                              }}
                            >
                              <ShoppingCart className="h-4 w-4 mr-2" />
                              Order Online
                            </Button>
                          </div>
                        </div>
                      ))}

                      <div className="text-center mt-6 p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-700 mb-1">
                          Best value: <span className="font-medium">{priceComparisonMutation.data.singleStore[0]?.retailerName}</span>
                        </p>
                        <p className="text-xs text-green-600">
                          Save ${((priceComparisonMutation.data.singleStore[2]?.totalCost - priceComparisonMutation.data.singleStore[0]?.totalCost) / 100).toFixed(2)} compared to most expensive option
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <BarChart4 className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                      <p className="text-gray-500 mb-2">Compare prices across stores</p>
                      <p className="text-sm text-gray-500 mb-4">
                        See which store offers the best value for your shopping list
                      </p>
                      {items.length === 0 && (
                        <p className="text-xs text-gray-400 mb-4">Add items to your list first</p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Generate List Preview Dialog */}
        <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Generate Shopping List Preview</DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto py-4">
              <p className="text-sm text-gray-500 mb-4">
                Based on your usual purchases and current needs, we recommend adding these items to your shopping list:
              </p>

              <div className="space-y-2">
                {generatedItems.map((item, index) => (
                  <div key={index} className="flex items-center p-2 border rounded-lg">
                    <input
                      type="checkbox"
                      checked={item.isSelected}
                      onChange={() => handleToggleGeneratedItem(index)}
                      className="h-5 w-5 text-primary rounded mr-3"
                    />
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:justify-between">
                        <div>
                          <p className="font-medium">{item.productName}</p>
                          <div className="flex items-center text-sm">
                            <span className="text-gray-500">
                              {item.quantity} {item.unit === "LB" ? "lbs" : 
                                item.unit === "OZ" ? "oz" : 
                                item.unit === "PKG" ? "pkg" : 
                                item.unit === "BOX" ? "box" : 
                                item.unit === "CAN" ? "can" : 
                                item.unit === "BOTTLE" ? "bottle" :                                item.unit === "JAR" ? "jar" : 
                                item.unit === "BUNCH" ? "bunch" : 
                                item.unit === "ROLL" ? "roll"                                  : ""}
                            </span>

                            {item.suggestedRetailerId && (
                              <span className="ml-2 text-green-600 text-xs">
                                On sale at Retailer #{item.suggestedRetailerId}
                              </span>
                            )}
                          </div>
                        </div>
                        {item.savings > 0 && (
                          <div className="mt-1 sm:mt-0 text-green-600 text-sm font-medium">
                            Save ${(item.savings / 100).toFixed(2)}
                          </div>
                        )}
                      </div>

                      {item.reason && (
                        <div className="mt-1 text-xs text-gray-500">
                          {item.reason}
                        </div>
                      )}

                      {item.dealComparison && (
                        <div className="mt-2 p-2 bg-blue-50 rounded-md border-l-2 border-blue-400">
                          <div className="text-xs font-medium text-blue-800 mb-1">
                            {item.dealComparison.type === 'standard_better_value' && '💡 Deal Alert'}
                            {item.dealComparison.type === 'bulk_preference' && '📦 Bulk Option'}  
                            {item.dealComparison.type === 'bulk_is_best_value' && '💰 Best Value'}
                          </div>
                          <div className="text-xs text-blue-700">
                            {item.dealComparison.message}
                          </div>
                          {item.dealComparison.potentialSavings && (
                            <div className="text-xs text-green-600 font-medium mt-1">
                              Save ${item.dealComparison.potentialSavings} vs bulk option
                            </div>
                          )}
                          {item.dealComparison.unitPriceDifference && (
                            <div className="text-xs text-gray-600">
                              Unit price difference: {item.dealComparison.unitPriceDifference}%
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => setGenerateDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => addGeneratedItemsMutation.mutate()}
                disabled={addGeneratedItemsMutation.isPending}
                className="bg-primary">
                {addGeneratedItemsMutation.isPending ? 'Adding...' : 'Add to List'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Upload List Dialog */}
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Upload Shopping List</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              {uploadedItems.length === 0 ? (
                <div className="space-y-4">
                  <Tabs value={uploadType} onValueChange={(value) => setUploadType(value as 'file' | 'image')} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="file">Import File</TabsTrigger>
                      <TabsTrigger value="image">Photo of List</TabsTrigger>
                    </TabsList>

                    <TabsContent value="file" className="space-y-4">
                      <div className="text-center">
                        <FileText className="h-12 w-12 mx-auto text-blue-500 mb-3" />
                        <p className="text-sm text-gray-600 mb-4">
                          Upload a text file, JSON, or CSV with your shopping list
                        </p>
                        <Button 
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Choose File
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".txt,.json,.csv"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          Supports: .txt, .json, .csv files
                        </p>
                      </div>
                    </TabsContent>

                    <TabsContent value="image" className="space-y-4">
                      <div className="text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-green-500 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                          <circle cx="12" cy="13" r="3"/>
                        </svg>
                        <p className="text-sm text-gray-600 mb-4">
                          Take a photo of your handwritten shopping list. We'll use OCR to convert it to digital format.
                        </p>
                        <Button 
                          onClick={() => imageInputRef.current?.click()}
                          disabled={processImageMutation.isPending}
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          {processImageMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <Plus className="mr-2 h-4 w-4" />
                              Upload Photo
                            </>
                          )}
                        </Button>
                        <input
                          ref={imageInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          Best results with clear, well-lit photos
                        </p>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Imported Items ({uploadedItems.length})</h4>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setUploadedItems([])}
                    >
                      Clear
                    </Button>
                  </div>

                  <div className="max-h-[50vh] overflow-y-auto space-y-2">
                    {uploadedItems.map((item, index) => (
                      <div key={index} className="flex items-center p-2 border rounded-lg">
                        <input
                          type="checkbox"
                          checked={item.isSelected}
                          onChange={() => handleToggleUploadedItem(index)}
                          className="h-5 w-5 text-primary rounded mr-3"
                        />
                        <div className="flex-1">
                          <p className="font-medium">{item.productName}</p>
                          <p className="text-sm text-gray-500">
                            Qty: {item.quantity} {item.unit.toLowerCase()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => {
                  setUploadDialogOpen(false);
                  setUploadedItems([]);
                }}
              >
                Cancel
              </Button>
              {uploadedItems.length > 0 && (
                <Button 
                  onClick={() => uploadListMutation.mutate(uploadedItems)}
                  disabled={uploadListMutation.isPending}
                  className="bg-primary"
                >
                  {uploadListMutation.isPending ? 'Adding...' : 'Add to List'}
                </Button>
              )}
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
                  className="w-full"
                />

                <div className="flex space-x-2">
                  <div className="w-1/3">
                    <Label htmlFor="edit-item-quantity">Quantity</Label>
                    <Input
                      id="edit-item-quantity"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={editItemQuantity}
                      onChange={(e) => setEditItemQuantity(Math.round(parseFloat(e.target.value) || 1))}
                      className="w-full"
                    />
                  </div>

                  <div className="w-2/3">
                    <Label htmlFor="edit-item-unit">Unit</Label>
                    <Select 
                      value={editItemUnit} 
                      onValueChange={setEditItemUnit}
                    >
                      <SelectTrigger id="edit-item-unit" className="w-full">
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
              </div>

              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={editItemMutation.isPending}
                  className="bg-primary">
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      {/* Recipe Import Dialog */}
      <Dialog open={recipeDialogOpen} onOpenChange={setRecipeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Recipe</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-500">
              Enter a recipe URL to automatically add all ingredients to your shopping list.
            </p>
            <div className="space-y-2">
              <Label htmlFor="recipeUrl">Recipe URL</Label>
              <Input
                id="recipeUrl"
                value={recipeUrl}
                onChange={(e) => setRecipeUrl(e.target.value)}
                placeholder="https://www.example.com/recipe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="servings">Number of Servings</Label>
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
            <Button variant="outline" onClick={() => setRecipeDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => previewRecipeMutation.mutate()} 
              disabled={!recipeUrl || previewRecipeMutation.isPending}
            >
              {previewRecipeMutation.isPending ? 'Loading...' : 'Preview Recipe'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recipe Preview Dialog */}
      <Dialog open={recipePreviewDialogOpen} onOpenChange={setRecipePreviewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recipe Ingredients Preview</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto py-4">
            <p className="text-sm text-gray-500 mb-4">
              Preview of ingredients that will be added to your shopping list from this recipe:
            </p>

            <div className="space-y-2">
              {recipePreviewItems.map((item, index) => (
                <div key={index} className="flex items-center p-2 border rounded-lg">
                  <input
                    type="checkbox"
                    checked={item.isSelected}
                    onChange={() => handleToggleRecipeItem(index)}
                    className="h-5 w-5 text-primary rounded mr-3"
                  />
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:justify-between">
                      <div>
                        <p className="font-medium">{item.productName}</p>
                        <div className="flex items-center text-sm">
                          <span className="text-gray-500">
                            {item.quantity} {item.unit === "LB" ? "lbs" : 
                              item.unit === "OZ" ? "oz" : 
                              item.unit === "PKG" ? "pkg" : 
                              item.unit === "BOX" ? "box" : 
                              item.unit === "CAN" ? "can" : 
                              item.unit === "BOTTLE" ? "bottle" :
                              item.unit === "JAR" ? "jar" : 
                              item.unit === "BUNCH" ? "bunch" : 
                              item.unit === "ROLL" ? "roll" : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => setRecipePreviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                const selectedItems = recipePreviewItems.filter(item => item.isSelected);
                importRecipeMutation.mutate(selectedItems);
              }}
              disabled={importRecipeMutation.isPending || recipePreviewItems.filter(item => item.isSelected).length === 0}
              className="bg-primary"
            >
              {importRecipeMutation.isPending ? 'Adding...' : `Add ${recipePreviewItems.filter(item => item.isSelected).length} Items`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Categorization Results Dialog */}
      <Dialog open={showCategorization} onOpenChange={setShowCategorization}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Sparkles className="h-5 w-5 text-purple-600 mr-2" />
              AI Product Categorization Results
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {categorizedItems.length === 0 ? (
              <div className="text-center p-4">
                <p className="text-gray-600">No items with suggested changes.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {categorizedItems.map((item, index) => (
                  <Card key={index} className="border border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center">
                          <span className="text-2xl mr-3">{item.icon}</span>
                          <div>
                            <h4 className="font-semibold text-lg">
                              {item.category.normalizedName && item.category.normalizedName !== item.productName ? (
                                <div>
                                  <span className="text-green-600">{item.category.normalizedName}</span>
                                  <div className="text-sm text-gray-500 line-through">was: {item.productName}</div>
                                </div>
                              ) : (
                                item.productName
                              )}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {item.category.category} • {item.category.aisle} • Confidence: {Math.round(item.category.confidence * 100)}%
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-green-600">
                            Suggested: {item.normalized.suggestedQuantity} {item.normalized.suggestedUnit}
                          </div>
                          <div className="text-xs text-gray-500">
                            Original: {item.normalized.originalQuantity} {item.normalized.originalUnit}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-1">AI Optimizations</h5>
                          {item.category.normalizedName && item.category.normalizedName !== item.productName && (
                            <p className="text-xs text-blue-600 mb-1">
                              Name standardization: "{item.productName}" → "{item.category.normalizedName}"
                            </p>
                          )}
                          <p className="text-xs text-gray-600">{item.normalized.conversionReason}</p>
                        </div>

                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-1">Typical Retail Names</h5>
                          <div className="flex flex-wrap gap-1">
                            {item.category.typicalRetailNames.slice(0, 3).map((name, idx) => (
                              <span key={idx} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {name}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-1">Brand Variations</h5>
                          <div className="flex flex-wrap gap-1">
                            {item.category.brandVariations.slice(0, 3).map((brand, idx) => (
                              <span key={idx} className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                                {brand}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategorization(false)}>
              Close
            </Button>
            <Button 
              onClick={() => applyCategorizationInsights()}
              disabled={applyInsightsMutation.isPending}
            >
              {applyInsightsMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Applying...
                </>
              ) : (
                'Apply Insights'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shopping Plan Modal */}
        <Dialog open={showShoppingPlan} onOpenChange={(open) => {
          console.log('Dialog state changing:', open); // Debug log
          setShowShoppingPlan(open);
        }}>
          <DialogContent className="w-full max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader className="pb-4">
              <DialogTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <span className="text-lg sm:text-xl font-bold">{selectedPlanTitle || 'Shopping Plan'}</span>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrintShoppingPlan}
                    className="text-xs sm:text-sm"
                  >
                    <Printer className="h-3 w-3 sm:h-4 w-4 mr-1 sm:mr-2" />
                    Print
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowShoppingPlan(false)}
                    className="text-xs sm:text-sm"
                  >
                    Close
                  </Button>
                </div>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 sm:space-y-6">
              {selectedPlan ? (
                <>
                  {/* Total Cost Section */}
                  <div className="bg-primary/5 rounded-lg p-3 sm:p-4 border border-primary/20">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                      <h3 className="font-bold text-primary text-base sm:text-lg">Total Cost</h3>
                      <div className="text-left sm:text-right">
                        <div className="text-xl sm:text-2xl font-bold text-primary">
                          ${selectedPlan.totalCost ? (selectedPlan.totalCost / 100).toFixed(2) : '0.00'}
                        </div>
                        {selectedPlan.savings && selectedPlan.savings > 0 && (
                          <div className="text-sm text-green-600">
                            You save ${(selectedPlan.savings / 100).toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Mobile-Optimized Shopping Checklist */}
                  {selectedPlan.stores && selectedPlan.stores.length > 0 ? (
                    <div className="space-y-4 sm:space-y-6">
                      {selectedPlan.stores.map((store: any, storeIndex: number) => (
                        <Card key={storeIndex} className="border border-gray-200">
                          <CardContent className="p-3 sm:p-4">
                            {/* Store Header */}
                            <div className="flex items-center justify-between mb-3 sm:mb-4 pb-2 border-b border-gray-100">
                              <div className="flex items-center gap-2 sm:gap-3">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                  <StoreIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                                </div>
                                <div>
                                  <h4 className="font-semibold text-sm sm:text-lg">{store.retailerName}</h4>
                                  <p className="text-xs sm:text-sm text-gray-500">
                                    {store.items?.length || 0} items • ${((store.subtotal || store.totalCost) / 100).toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Interactive Shopping List */}
                            {store.items && store.items.length > 0 ? (
                              <div className="space-y-2 sm:space-y-3">
                                {store.items.map((item: any, itemIndex: number) => (
                                  <div 
                                    key={itemIndex} 
                                    className="mobile-shopping-item flex items-center gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg border transition-all duration-200"
                                  >
                                    <input
                                      type="checkbox"
                                      className="h-4 w-4 sm:h-5 sm:w-5 text-primary rounded border-2 border-gray-300 focus:ring-primary focus:ring-offset-0"
                                      onChange={(e) => {
                                        // Toggle completed state styling
                                        const listItem = e.target.parentElement;
                                        if (e.target.checked) {
                                          listItem?.classList.add('opacity-60');
                                          listItem?.querySelector('.item-text')?.classList.add('line-through');
                                        } else {
                                          listItem?.classList.remove('opacity-60');
                                          listItem?.querySelector('.item-text')?.classList.remove('line-through');
                                        }
                                      }}
                                    />
                                    <div className="flex-1 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-2">
                                      <div className="item-text">
                                        <span className="font-medium text-sm sm:text-base">{item.productName}</span>
                                        <span className="text-xs sm:text-sm text-gray-500 ml-2">
                                          Qty: {item.quantity}
                                        </span>
                                      </div>
                                      <div className="text-right">
                                        <span className="font-semibold text-sm sm:text-base text-primary">
                                          ${(item.price / 100).toFixed(2)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ))}

                                {/* Store Total */}
                                <div className="border-t border-gray-200 pt-3 mt-4">
                                  <div className="flex justify-between items-center">
                                    <span className="font-medium text-sm sm:text-base">Store Total:</span>
                                    <span className="font-bold text-base sm:text-lg text-primary">
                                      ${((store.subtotal || store.totalCost) / 100).toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-4 text-gray-500 text-sm">
                                No items available for this store
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : selectedPlan.items && selectedPlan.items.length > 0 ? (
                    <Card className="border border-gray-200">
                      <CardContent className="p-3 sm:p-4">
                        {/* Single Store Header */}
                        <div className="flex items-center justify-between mb-3 sm:mb-4 pb-2 border-b border-gray-100">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-sm sm:text-lg">{selectedPlan.retailerName || 'Shopping List'}</h4>
                              <p className="text-xs sm:text-sm text-gray-500">
                                {selectedPlan.items.length} items • ${(selectedPlan.totalCost / 100).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Interactive Shopping List */}
                        <div className="space-y-2 sm:space-y-3">
                          {selectedPlan.items.map((item: any, itemIndex: number) => (
                            <div 
                              key={itemIndex} 
                              className="mobile-shopping-item flex items-center gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg border transition-all duration-200"
                            >
                              <input
                                type="checkbox"
                                className="h-4 w-4 sm:h-5 sm:w-5 text-primary rounded border-2 border-gray-300 focus:ring-primary focus:ring-offset-0"
                                onChange={(e) => {
                                  // Toggle completed state styling
                                  const listItem = e.target.parentElement;
                                  if (e.target.checked) {
                                    listItem?.classList.add('opacity-60');
                                    listItem?.querySelector('.item-text')?.classList.add('line-through');
                                  } else {
                                    listItem?.classList.remove('opacity-60');
                                    listItem?.querySelector('.item-text')?.classList.remove('line-through');
                                  }
                                }}
                              />
                              <div className="flex-1 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-2">
                                <div className="item-text">
                                  <span className="font-medium text-sm sm:text-base">{item.productName}</span>
                                  <span className="text-xs sm:text-sm text-gray-500 ml-2">
                                    Qty: {item.quantity}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="font-semibold text-sm sm:text-base text-primary">
                                    ${(item.price / 100).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p className="mb-2 text-sm sm:text-base">No shopping plan data available</p>
                      <p className="text-xs sm:text-sm">Please try generating the shopping plan again.</p>
                    </div>
                  )}

                  
                  {/* Mobile Action Buttons */}
                  <div className="sticky bottom-0 bg-background border-t border-border pt-6 mt-8 -mx-4 -mb-4 px-4 pb-6 shadow-lg">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Button
                        onClick={handlePrintShoppingPlan}
                        variant="outline"
                        className="w-full min-h-[48px] text-base font-medium border-2 hover:bg-muted focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        aria-label="Print shopping list"
                      >
                        <Printer className="h-5 w-5 mr-3" aria-hidden="true" />
                        Print List
                      </Button>
                      <Button
                        onClick={() => {
                          setShowShoppingPlan(false);
                          // Pass the selected plan data to the route page
                          const planData = encodeURIComponent(JSON.stringify(selectedPlan));
                          navigate('/shopping-route?listId=' + defaultList?.id + '&mode=instore&planData=' + planData);
                        }}
                        variant="outline"
                        className="w-full min-h-[48px] text-base font-medium bg-secondary/10 hover:bg-secondary/20 text-secondary-foreground border-2 border-secondary/30 focus:ring-2 focus:ring-secondary focus:ring-offset-2"
                        aria-label="Start shopping route navigation"
                      >
                        <MapPin className="h-5 w-5 mr-3" aria-hidden="true" />
                        Start Route
                      </Button>
                      <Button
                        onClick={() => setShowShoppingPlan(false)}
                        className="w-full min-h-[48px] text-base font-medium focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        aria-label="Close shopping plan"
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin" />
                  <p className="mb-2 text-sm sm:text-base">Loading shopping plan...</p>
                  <p className="text-xs sm:text-sm">If this persists, please try again.</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </main>

      <BottomNavigation activeTab="lists" />
    </div>
  );
};

export default ShoppingListPage;