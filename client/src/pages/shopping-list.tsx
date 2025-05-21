import React, { useState, useEffect } from 'react';
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
import { Plus, ShoppingBag, FileText, Pencil, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { detectUnitFromItemName } from '@/lib/utils';

const ShoppingListPage: React.FC = () => {
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
  
  const { data: shoppingLists, isLoading } = useQuery<ShoppingList[]>({
    queryKey: ['/api/shopping-lists'],
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
    onError: (error) => {
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
        
        <form onSubmit={handleAddItem} className="mb-6">
          <div className="flex space-x-2 mb-2">
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
          </div>
          
          <div className="flex space-x-2">
            <div className="w-20">
              <Input
                type="number"
                placeholder="Qty"
                min="0.01"
                step="0.01"
                defaultValue="1"
                onChange={(e) => setNewItemQuantity(parseFloat(e.target.value) || 1)}
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
            <Label htmlFor="auto-detect" className="cursor-pointer flex items-center">
              Auto-detect best unit based on item name
            </Label>
          </div>
        </form>
        
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
            items.map((item) => (
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
                      <div className="flex-1">
                        <div className="flex items-center">
                          <span className={`font-medium ${item.isCompleted ? "line-through text-gray-500" : "text-gray-800"}`}>
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
            ))
          )}
        </div>
        
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
                      onChange={(e) => setEditItemQuantity(parseFloat(e.target.value) || 1)}
                      className="w-full"
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
      </main>
      
      <BottomNavigation activeTab="lists" />
    </div>
  );
};

export default ShoppingListPage;
