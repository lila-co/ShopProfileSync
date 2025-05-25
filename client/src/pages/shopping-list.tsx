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

  // Tab state
  const [activeTab, setActiveTab] = useState('items');
  const [selectedOptimization, setSelectedOptimization] = useState('cost');

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
      const response = await apiRequest('POST', '/api/shopping-lists/generate', {});
      return response.json();
    },
    onSuccess: (data) => {
      // Add estimated savings to each item
      const enhancedItems = data.items.map((item: any) => ({
        ...item,
        isSelected: true,
      }));

      setGeneratedItems(enhancedItems);
      setGenerateDialogOpen(true);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to generate shopping list: " + error.message,
        variant: "destructive"
      });
    }
  });

  // Generate shopping list from typical purchases
  const generateListMutation = useMutation({
    mutationFn: async (items: any[]) => {
      // Filter only selected items
      const selectedItems = items.filter(item => item.isSelected);
      
      // Process each item individually to avoid batch errors
      const results = [];
      for (const item of selectedItems) {
        try {
          const response = await apiRequest('POST', '/api/shopping-list/items', {
            shoppingListId: defaultList?.id,
            productName: item.productName,
            quantity: item.quantity || 1,
            unit: item.unit || 'COUNT'
          });
          const result = await response.json();
          results.push(result);
        } catch (error) {
          console.error(`Error adding item ${item.productName}:`, error);
        }
      }
      
      return results;
    },
    onSuccess: () => {
      setGenerateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
      toast({
        title: "Shopping List Generated",
        description: "Your shopping list has been created based on your typical purchases.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to generate shopping list: " + error.message,
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

  // Get the default shopping list and its items
  const defaultList = shoppingLists?.[0];
  const items = defaultList?.items ?? [];

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
      <Header title="Shopping Lists" />

      <main className="flex-1 overflow-y-auto p-4 pb-20">
        <h2 className="text-xl font-bold mb-4">Shopping List</h2>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center">
                <ShoppingCart className="h-8 w-8 text-primary mb-2" />
                <h3 className="text-base font-semibold mb-1">Generate List</h3>
                <p className="text-xs text-gray-600 mb-3">
                  Based on your purchase patterns
                </p>
                <Button 
                  className="w-full bg-primary hover:bg-primary/90"
                  size="sm"
                  onClick={() => previewGenerateMutation.mutate()}
                  disabled={previewGenerateMutation.isPending}
                >
                  {previewGenerateMutation.isPending ? (
                    <span className="flex items-center">
                      <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                      Generating...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <ListChecks className="mr-2 h-4 w-4" />
                      Generate
                    </span>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center">
                <FileText className="h-8 w-8 text-blue-600 mb-2" />
                <h3 className="text-base font-semibold mb-1">Upload List</h3>
                <p className="text-xs text-gray-600 mb-3">
                  Import from file or photo
                </p>
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                  onClick={() => setUploadDialogOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Upload
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4 sm:mb-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <TabsList className="flex w-full sm:w-auto h-auto flex-wrap">
              <TabsTrigger value="items" className="flex-1 px-2 py-2 text-xs sm:text-sm whitespace-nowrap">Items</TabsTrigger>
              <TabsTrigger value="optimization" className="flex-1 px-2 py-2 text-xs sm:text-sm whitespace-nowrap">Optimization</TabsTrigger>
              <TabsTrigger value="comparison" className="flex-1 px-2 py-2 text-xs sm:text-sm whitespace-nowrap">Price Comparison</TabsTrigger>
            </TabsList>
            
            {items.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  variant="default"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    if (defaultList?.id) {
                      window.location.href = `/shop?listId=${defaultList.id}`;
                    }
                  }}
                >
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Order Online/Pickup
                </Button>
                
                <Button 
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    // Open print dialog with formatted list
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>Shopping List - ${defaultList?.name || 'My Shopping List'}</title>
                            <style>
                              body { font-family: Arial, sans-serif; margin: 20px; }
                              h1 { font-size: 18px; margin-bottom: 15px; }
                              .list { border: 1px solid #ddd; border-radius: 5px; padding: 15px; }
                              .item { padding: 8px 0; border-bottom: 1px solid #eee; display: flex; }
                              .checkbox { width: 20px; height: 20px; margin-right: 10px; }
                              .name { flex: 1; }
                              .quantity { margin-left: 10px; color: #666; }
                              @media print {
                                button { display: none; }
                              }
                            </style>
                          </head>
                          <body>
                            <button onclick="window.print();" style="padding: 8px 15px; background: #4F46E5; color: white; border: none; border-radius: 4px; margin-bottom: 20px; cursor: pointer;">Print List</button>
                            <h1>Shopping List: ${defaultList?.name || 'My Shopping List'}</h1>
                            <div class="list">
                              ${items.map(item => `
                                <div class="item">
                                  <div class="checkbox">□</div>
                                  <div class="name">${item.productName}</div>
                                  <div class="quantity">${item.quantity} ${item.unit || 'COUNT'}</div>
                                </div>
                              `).join('')}
                            </div>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                    }
                  }}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print List
                </Button>
              </div>
            )}
          </div>

          <TabsContent value="items" className="pt-4">
            <form onSubmit={handleAddItem} className="mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row gap-2 sm:space-x-2 mb-2">
                <Input
                  type="text"
                  placeholder="Add an item..."
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  type="submit" 
                  className="bg-primary text-white w-full sm:w-auto"
                  disabled={addItemMutation.isPending}
                >
                  {addItemMutation.isPending ? 'Adding...' : 'Add Item'}
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <div className="w-full sm:w-20">
                  <Input
                    type="number"
                    placeholder="Qty"
                    min="0.01"
                    step="0.01"
                    defaultValue="1"
                    onChange={(e) => setNewItemQuantity(Math.round(parseFloat(e.target.value) || 1))}
                    className="w-full"
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
                <Label htmlFor="auto-detect" className="cursor-pointer flex items-center text-xs sm:text-sm">
                  Auto-detect best unit based on item name
                </Label>
              </div>
            </form>

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
                items.map((item) => (
                  <Card key={item.id} className={item.isCompleted ? "opacity-60" : ""}>
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start sm:items-center">
                        <div className="flex items-start sm:items-center flex-1">
                          <input
                            type="checkbox"
                            checked={item.isCompleted}
                            onChange={() => handleToggleItem(item.id, item.isCompleted)}
                            className="h-5 w-5 text-primary rounded mr-3 mt-1 sm:mt-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap sm:flex-nowrap sm:items-center gap-1 sm:gap-2">
                              <span className={`font-medium break-words ${item.isCompleted ? "line-through text-gray-500" : "text-gray-800"}`}>
                                {item.productName}
                              </span>
                              <span className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full whitespace-nowrap">
                                Qty: {item.quantity} {item.unit && (
                                  <span className="text-xs text-gray-500">
                                    {item.unit === "LB" ? "lbs" : 
                                     item.unit === "OZ" ? "oz" : 
                                     item.unit === "PKG" ? "pkg" : 
                                     item.unit === "BOX" ? "box" : 
                                     item.unit === "CAN" ? "can" : 
                                     item.unit === "BOTTLE" ? "bottle" : 
                                     item.unit === "JAR" ? "jar" : 
                                     item.unit === "BUNCH" ? "bunch" : 
                                     item.unit === "ROLL" ? "roll" : ""}
                                  </span>
                                )}
                              </span>
                            </div>
                            {item.suggestedRetailerId && item.suggestedPrice && (
                              <div className="flex items-center text-xs text-gray-500 mt-1">
                                <span>
                                  Best price: ${(item.suggestedPrice / 100).toFixed(2)} at Retailer #{item.suggestedRetailerId}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-1 sm:space-x-2 ml-2 shrink-0">
                          <button
                            onClick={() => handleEditItem(item)}
                            className="text-gray-400 hover:text-blue-500 p-1"
                            aria-label="Edit item"
                            title="Edit item"
                          >
                            <Pencil className="h-4 w-4 sm:h-5 sm:w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-gray-400 hover:text-red-500 p-1"
                            aria-label="Delete item"
                            title="Delete item"
                          >
                            <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="optimization" className="pt-4">
            <Card className="mb-4">
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Shopping Optimization</h3>

                  <div className="mt-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      We'll analyze your shopping list across stores to find the best deals based on your preferences. You'll see options for:
                    </p>

                    <div className="space-y-3 mb-5">
                      <div className="flex items-start">
                        <div className="bg-blue-100 dark:bg-blue-900/20 p-2 rounded-full mr-3">
                          <StoreIcon className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-sm text-blue-700 dark:text-blue-300">Single Store Option</h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Best store with at least 80% of your items</p>
                        </div>
                      </div>

                      <div className="flex items-start">
                        <div className="bg-green-100 dark:bg-green-900/20 p-2 rounded-full mr-3">
                          <ShoppingCart className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-sm text-green-700 dark:text-green-300">Best Value Option</h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Lowest total cost using multiple stores</p>
                        </div>
                      </div>

                      <div className="flex items-start">
                        <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-full mr-3">
                          <Clock className="h-4 w-4 text-gray-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-sm">Balanced Option</h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Balances convenience, time and cost</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <Button
                        onClick={() => defaultList?.id && priceComparisonMutation.mutate(defaultList.id)}
                        disabled={priceComparisonMutation.isPending || !items.length}
                        className="w-full sm:w-auto"
                      >
                        {priceComparisonMutation.isPending ? 
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Optimizing...</> : 
                          <><Sparkles className="mr-2 h-4 w-4" /> Calculate Shopping Options</>}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-4">
                  <div className="border-b pb-3 mb-4">
                    <h3 className="text-lg font-medium">Optimized Shopping Plan</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Based on {items.length} items in your shopping list
                    </p>
                  </div>

                  {priceComparisonMutation.data?.singleStore?.length > 0 ? (
                    <div>
                      <div className="space-y-4 sm:space-y-6 mb-4 sm:mb-6">
                        <div className="border border-blue-200 rounded-lg sm:rounded-xl overflow-hidden">
                          <div className="bg-blue-50 dark:bg-blue-900/10 px-3 sm:px-4 py-2 sm:py-3 border-b border-blue-200">
                            <div className="font-medium text-sm sm:text-base text-blue-700 dark:text-blue-300">Single Store Option (80% of your items)</div>
                          </div>
                          <div className="p-3 sm:p-4">
                            <div className="flex items-center mb-3 sm:mb-4">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-100 flex items-center justify-center mr-3 sm:mr-4 shrink-0">
                                <StoreIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                              </div>
                              <div>
                                <h4 className="font-medium text-base sm:text-lg">
                                  {priceComparisonMutation.data?.bestSingleStore?.retailerName || 'Kroger'}
                                </h4>
                                <p className="text-xs sm:text-sm text-gray-500">
                                  {priceComparisonMutation.data?.bestSingleStore?.availableItems || 8} out of {items.length} items • 
                                  ${((priceComparisonMutation.data?.bestSingleStore?.totalCost || 4535) / 100).toFixed(2)} total
                                </p>
                              </div>
                            </div>
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
                          </div>
                        </div>

                        <div className="border border-green-200 rounded-lg sm:rounded-xl overflow-hidden">
                          <div className="bg-green-50 dark:bg-green-900/10 px-3 sm:px-4 py-2 sm:py-3 border-b border-green-200">
                            <div className="font-medium text-sm sm:text-base text-green-700 dark:text-green-300">
                              Best Value Option (Save ${((priceComparisonMutation.data?.multiStore?.[0]?.savings || 850) / 100).toFixed(2)})
                            </div>
                          </div>
                          <div className="p-3 sm:p-4">
                            <div className="flex items-center mb-3 sm:mb-4">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-100 flex items-center justify-center mr-3 sm:mr-4 shrink-0">
                                <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                              </div>
                              <div>
                                <h4 className="font-medium text-base sm:text-lg">
                                  {priceComparisonMutation.data?.multiStore?.[0]?.retailerNames?.join(' + ') || 'Kroger + Walmart'}
                                </h4>
                                <p className="text-xs sm:text-sm text-gray-500">
                                  All items • ${((priceComparisonMutation.data?.multiStore?.[0]?.totalCost || 3685) / 100).toFixed(2)} total
                                </p>
                              </div>
                            </div>
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
                          </div>
                        </div>

                        <div className="border rounded-lg sm:rounded-xl overflow-hidden">
                          <div className="bg-gray-50 dark:bg-gray-800 px-3 sm:px-4 py-2 sm:py-3 border-b">
                            <div className="font-medium text-sm sm:text-base">Balanced Option</div>
                          </div>
                          <div className="p-3 sm:p-4">
                            <div className="flex items-center mb-3 sm:mb-4">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-100 flex items-center justify-center mr-3 sm:mr-4 shrink-0">
                                <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" />
                              </div>
                              <div>
                                <h4 className="font-medium text-base sm:text-lg">
                                  {priceComparisonMutation.data?.balancedOption?.retailerName || 'Target'}
                                </h4>
                                <p className="text-xs sm:text-sm text-gray-500">
                                  {priceComparisonMutation.data?.balancedOption?.availableItems || 9} out of {items.length} items • 
                                  ${((priceComparisonMutation.data?.balancedOption?.totalCost || 4215) / 100).toFixed(2)} total
                                </p>
                              </div>
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="w-full text-xs sm:text-sm"
                              onClick={() => defaultList?.id && balancedOptimization.mutate(defaultList.id)}
                              disabled={balancedOptimization.isPending || !items.length}
                            >
                              {balancedOptimization.isPending ? (
                                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />                              ) : (
                                <BarChart className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                              )}
                              View Balanced Plan
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-3 sm:pt-4 mt-3 sm:mt-4">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
                          <div>
                            <p className="text-xs sm:text-sm text-gray-500">
                              Potential savings: <span className="font-medium text-green-600">
                                ${((priceComparisonMutation.data?.multiStore?.[0]?.savings || 850) / 100).toFixed(2)}
                                ({priceComparisonMutation.data?.multiStore?.[0]?.savingsPercent || 19}%)
                              </span>
                            </p>
                          </div>
                          <Button variant="link" size="sm" className="text-gray-500 text-xs sm:text-sm">
                            <Printer className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> Print Options
                          </Button>
                        </div>

                        <h4 className="font-medium text-sm sm:text-base mb-2 mt-3">Special Deals & Offers</h4>
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

                          <div className="border border-teal-200 rounded-lg p-3 bg-teal-50 dark:bg-teal-900/10">
                            <div className="flex">
                              <ShoppingCart className="h-5 w-5 text-teal-500 mr-2 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-teal-700 dark:text-teal-300">
                                  Target Circle Members Save 10%
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  On Fresh Produce items (additional $0.85 savings)
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 sm:py-8">
                      <div className="relative w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-3 sm:mb-4">
                        <div className="absolute inset-0 bg-primary/10 rounded-full flex items-center justify-center">
                          <BarChart4 className="h-8 w-8 sm:h-12 sm:w-12 text-primary/60" />
                        </div>
                      </div>
                      <h3 className="text-base sm:text-lg font-medium mb-2">Optimize Your Shopping</h3>
                      <p className="text-sm text-gray-500 mb-2 max-w-md mx-auto">
                        We'll analyze prices across stores to find the best deals based on your preferences
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6">
                        {items.length === 0 ? 
                          "Add items to your shopping list first" : 
                          `Ready to optimize ${items.length} items in your list`}
                      </p>
                      <Button
                        onClick={() => defaultList?.id && priceComparisonMutation.mutate(defaultList.id)}
                        disabled={priceComparisonMutation.isPending || !items.length}
                        className="px-4 sm:px-6 text-sm"
                      >
                        {items.length === 0 ? 
                          "Add Items First" : 
                          <><Sparkles className="mr-2 h-4 w-4" /> Find Best Options</>}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
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
                      {priceComparisonMutation.isPending ? "Calculating..." : "Refresh Prices"}
                    </Button>
                  </div>

                  {priceComparisonMutation.data?.retailers?.length > 0 ? (
                    <div className="space-y-4">
                      {priceComparisonMutation.data.retailers.map((store: any) => (
                        <div key={store.retailerId} className="border rounded-lg p-3">
                          <div className="flex justify-between mb-2">
                            <div>
                              <span className="font-semibold">{store.retailerName}</span>
                              <span className="ml-2 text-sm text-gray-500">{store.items?.length || 0} items</span>
                            </div>
                            <span className="font-semibold">${(store.subtotal / 100).toFixed(2)}</span>
                          </div>

                          <div className="space-y-2 mb-3">
                            {store.items?.slice(0, 3).map((item: any) => (
                              <div key={item.productId} className="flex justify-between text-sm">
                                <span>{item.productName}</span>
                                <span>${(item.price / 100).toFixed(2)}</span>
                              </div>
                            ))}

                            {store.items?.length > 3 && (
                              <div className="mt-2 flex items-center text-sm text-gray-500">
                                <span>
                                  +{store.items.length - 3} more items
                                </span>
                              </div>
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
                            variant="outline"
                            size="sm"
                          >
                            Shop at {store.retailerName}
                          </Button>
                        </div>
                      ))}

                      <div className="text-center mt-4">
                        <p className="text-sm text-gray-500 mb-2">
                          Best value: <span className="font-medium">Retailer Name</span>
                        </p>
                        <p className="text-xs text-gray-500">
                          Based on your shopping list and available deals
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
                      <Button
                        onClick={() => defaultList?.id && priceComparisonMutation.mutate(defaultList.id)}
                        disabled={priceComparisonMutation.isPending || !items.length}
                      >
                        {items.length === 0 ? "Add items to compare prices" : "Compare Prices"}
                      </Button>
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
                                item.unit === "BOTTLE" ? "bottle" : 
                                item.unit === "JAR" ? "jar" : 
                                item.unit === "BUNCH" ? "bunch" : 
                                item.unit === "ROLL" ? "roll" : ""}
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
                onClick={() => generateListMutation.mutate(generatedItems)}
                disabled={generateListMutation.isPending}
                className="bg-primary">
                Generate List
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
      </main>

      
    </div>
  );
};

export default ShoppingListPage;