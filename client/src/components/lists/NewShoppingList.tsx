import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './components/ui/card';
import { Input } from './components/ui/input';
import { Button } from './components/ui/button';
import { ShoppingList as ShoppingListType, ShoppingListItem } from './lib/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from './lib/queryClient';
import { useToast } from './hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './components/ui/dialog';
import { Label } from './components/ui/label';
import { Plus, ShoppingBag, FileText, Clock, Check, Trash2, AlertTriangle, DollarSign, MapPin, Car, BarChart2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Badge } from './components/ui/badge';
import { Separator } from './components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { RadioGroup, RadioGroupItem } from './components/ui/radio-group';
import { Progress } from './components/ui/progress';

const ShoppingListComponent: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newItemName, setNewItemName] = useState('');
  const [recipeUrl, setRecipeUrl] = useState('');
  const [servings, setServings] = useState('4');
  const [recipeDialogOpen, setRecipeDialogOpen] = useState(false);
  const [optimizationPreference, setOptimizationPreference] = useState('cost');
  const [selectedRetailers, setSelectedRetailers] = useState<number[]>([]);
  const [showRouteMap, setShowRouteMap] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [expiringDeals, setExpiringDeals] = useState([
    { id: 1, retailer: 'Walmart', product: 'Organic Milk', expires: 'Tomorrow', discount: '20%' },
    { id: 2, retailer: 'Target', product: 'Free-Range Eggs', expires: 'In 2 days', discount: '15%' }
  ]);
  
  const { data: shoppingLists, isLoading } = useQuery<ShoppingListType[]>({
    queryKey: ['/api/shopping-lists'],
  });
  
  // Get personalized suggestions based on user profile
  const { data: suggestions, isLoading: suggestionsLoading } = useQuery({
    queryKey: ['/api/shopping-lists/suggestions'],
    enabled: !!shoppingLists,
  });
  
  // Get retailers data
  const { data: retailers } = useQuery({
    queryKey: ['/api/retailers'],
  });
  
  // Get user location on component mount (in a real app, would use Geolocation API)
  useEffect(() => {
    // For demo purposes, use San Francisco as default location
    setUserLocation({ lat: 37.7749, lng: -122.4194 });
  }, []);
  
  // Fetch shopping list cost comparison data
  const { data: costData, isLoading: isLoadingCosts } = useQuery({
    queryKey: ['/api/shopping-lists/costs', shoppingLists?.[0]?.id],
    enabled: !!shoppingLists?.[0]?.id,
    queryFn: async () => {
      const response = await apiRequest('POST', '/api/shopping-lists/costs', {
        shoppingListId: shoppingLists[0].id
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
    mutationFn: async (productName: string) => {
      // Add to default shopping list (using the first list as default for simplicity)
      const defaultList = shoppingLists?.[0];
      if (!defaultList) throw new Error("No shopping list found");
      
      const response = await apiRequest('POST', '/api/shopping-list/items', {
        shoppingListId: defaultList.id,
        productName,
        quantity: 1
      });
      return response.json();
    },
    onSuccess: () => {
      setNewItemName('');
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
      toast({
        title: "Item Added",
        description: "Item has been added to your shopping list."
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

  // Generate shopping list from typical purchases
  const generateListMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/shopping-lists/generate', {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
      toast({
        title: "Shopping List Generated",
        description: "Created a new list based on your typical purchases"
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
      setRecipeDialogOpen(false);
      setRecipeUrl('');
      
      // Show detailed feedback about what happened
      const { itemsAdded, itemsUpdated, itemsSkipped, duplicatesFound } = data;
      let description = data.message;
      
      if (duplicatesFound && duplicatesFound.length > 0) {
        const mergedItems = duplicatesFound.filter((d: any) => d.action === 'merged');
        const skippedItems = duplicatesFound.filter((d: any) => d.action === 'skipped');
        
        if (mergedItems.length > 0) {
          description += `\n\nMerged duplicates: ${mergedItems.map((d: any) => d.ingredient).join(', ')}`;
        }
        if (skippedItems.length > 0) {
          description += `\n\nSkipped duplicates: ${skippedItems.map((d: any) => d.ingredient).join(', ')}`;
        }
      }

      toast({
        title: "Recipe Imported",
        description,
        duration: 5000 // Show longer for detailed info
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
      
      <form onSubmit={handleAddItem} className="flex space-x-2 mb-6">
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
      </form>
      
      <div className="mb-4 flex gap-2">
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
          onClick={() => generateListMutation.mutate()}
          disabled={generateListMutation.isPending}
          className="flex items-center gap-1"
        >
          <ShoppingBag className="h-4 w-4" />
          <span>Generate List</span>
        </Button>
      </div>
      
      <Tabs defaultValue="list" className="mt-6">
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="price">Price Compare</TabsTrigger>
          <TabsTrigger value="optimize">Optimize</TabsTrigger>
          <TabsTrigger value="route">Route</TabsTrigger>
        </TabsList>
        
        <TabsContent value="list" className="space-y-4">
          {suggestions && suggestions.length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Suggested Items</h3>
              <div className="space-y-2">
                {suggestions.map((suggestion: any, index: number) => (
                  <Card key={index} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          {suggestion.type === 'swap' ? (
                            <div>
                              <p className="font-medium">
                                <span>
                                  <Trash2 className="h-4 w-4 inline-block text-gray-400 mr-1" />
                                  {suggestion.currentItem}
                                </span>
                                <span className="mx-2">→</span>
                                <span className="text-green-600">
                                  {suggestion.suggestedItem}
                                  <Check className="h-4 w-4 inline-block ml-1 text-green-600" />
                                </span>
                              </p>
                              <p className="text-sm text-gray-500 mt-1">{suggestion.reason}</p>
                            </div>
                          ) : (
                            <div>
                              <p className="font-medium text-blue-600">
                                <Plus className="h-4 w-4 inline-block mr-1" />
                                {suggestion.suggestedItem}
                              </p>
                              <p className="text-sm text-gray-500 mt-1">{suggestion.reason}</p>
                            </div>
                          )}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => addItemMutation.mutate(
                            suggestion.type === 'swap' ? 
                              suggestion.suggestedItem : 
                              suggestion.suggestedItem
                          )}
                        >
                          Add
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
          
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
              items.map((item: ShoppingListItem) => (
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
                        <div>
                          <span className={`font-medium ${item.isCompleted ? "line-through text-gray-500" : "text-gray-800"}`}>
                            {item.productName}
                          </span>
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
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="price" className="space-y-4">
          <h3 className="text-lg font-semibold mb-4">Price Comparison by Store</h3>
          
          {isLoadingCosts ? (
            <div className="p-8 text-center">
              <p>Loading price information...</p>
            </div>
          ) : costData?.singleStore?.length ? (
            <div className="space-y-4">
              {costData.singleStore.map((store: any, index: number) => (
                <Card key={index} className={index === 0 ? 'border-green-500 border-2' : ''}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-2 ${index === 0 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <h4 className="font-bold text-lg">{store.retailerName}</h4>
                      </div>
                      <Badge variant={index === 0 ? "default" : "outline"} className={index === 0 ? "bg-green-500" : ""}>
                        {index === 0 ? "Best Value" : `+$${((store.totalCost - costData.singleStore[0].totalCost)/100).toFixed(2)}`}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-500">Total Cost</p>
                        <p className="text-xl font-bold">${(store.totalCost/100).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Potential Savings</p>
                        <p className="text-xl font-bold text-green-600">${(store.savings/100).toFixed(2)}</p>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Items with deals</span>
                        <span>{store.items.filter((i: any) => i.hasDeal).length} of {store.items.length}</span>
                      </div>
                      <Progress value={(store.items.filter((i: any) => i.hasDeal).length / store.items.length) * 100} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center border border-dashed rounded-lg">
              <DollarSign className="h-12 w-12 mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500">No price comparison available</p>
              <p className="text-sm text-gray-400 mt-1">Add items to your shopping list first</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="optimize" className="space-y-4">
          <h3 className="text-lg font-semibold mb-4">Shopping Optimization</h3>
          
          <div className="mb-6">
            <h4 className="text-md font-medium mb-2">Optimization Preference</h4>
            <RadioGroup 
              value={optimizationPreference} 
              onValueChange={setOptimizationPreference}
              className="flex flex-col space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cost" id="cost" />
                <Label htmlFor="cost">Optimize for lowest total cost</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="time" id="time" />
                <Label htmlFor="time">Optimize for quickest trip</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="balance" id="balance" />
                <Label htmlFor="balance">Balance time and cost</Label>
              </div>
            </RadioGroup>
          </div>
          
          {isLoadingCosts ? (
            <div className="p-8 text-center">
              <p>Calculating optimal shopping plan...</p>
            </div>
          ) : costData?.multiStore ? (
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <div className="mb-4">
                    <h4 className="font-bold text-lg mb-2">Multi-Store Optimization</h4>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-500">Total Cost</p>
                        <p className="text-xl font-bold">${(costData.multiStore.totalCost/100).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Total Savings</p>
                        <p className="text-xl font-bold text-green-600">${(costData.multiStore.totalSavings/100).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div>
                    <h4 className="font-medium mb-3">Shopping Plan</h4>
                    {Object.keys(costData.multiStore.itemsByRetailer).map((retailerId: string) => {
                      const store = costData.multiStore.itemsByRetailer[retailerId];
                      return (
                        <div key={retailerId} className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium">{store.retailerName}</h5>
                            <p className="text-sm">${(store.subtotal/100).toFixed(2)}</p>
                          </div>
                          <ul className="text-sm ml-4 space-y-1">
                            {store.items.map((item: any, idx: number) => (
                              <li key={idx} className="list-disc list-outside">
                                {item.productName} ({item.quantity}x) - ${(item.price/100).toFixed(2)} each
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="flex justify-end mt-4">
                    <Button 
                      variant="outline" 
                      className="flex items-center space-x-1"
                      onClick={() => {
                        setSelectedRetailers(costData.multiStore.retailers);
                        setShowRouteMap(true);
                      }}
                    >
                      <MapPin className="h-4 w-4" />
                      <span>Show Route</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="p-8 text-center border border-dashed rounded-lg">
              <BarChart2 className="h-12 w-12 mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500">No optimization available</p>
              <p className="text-sm text-gray-400 mt-1">Add items to your shopping list first</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="route" className="space-y-4">
          <h3 className="text-lg font-semibold mb-4">Shopping Route</h3>
          
          {!showRouteMap ? (
            <div className="p-8 text-center border border-dashed rounded-lg">
              <Car className="h-12 w-12 mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500">No route planned yet</p>
              <p className="text-sm text-gray-400 mt-1">Select stores in the Optimize tab first</p>
            </div>
          ) : isLoadingRoute ? (
            <div className="p-8 text-center">
              <p>Calculating optimal route...</p>
            </div>
          ) : routeData ? (
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <div className="mb-4">
                    <h4 className="font-bold text-lg mb-2">Shopping Trip Details</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Total Distance</p>
                        <p className="text-xl font-bold">{routeData.route.totalDistance.toFixed(1)} km</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Estimated Time</p>
                        <p className="text-xl font-bold">{routeData.route.totalTime} min</p>
                      </div>
                    </div>
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div>
                    <h4 className="font-medium mb-3">Route</h4>
                    <div className="space-y-3">
                      {routeData.route.waypoints.map((point: any, index: number) => (
                        <div key={index} className="flex items-start">
                          <div className="w-6 flex-shrink-0 flex flex-col items-center">
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${index === 0 ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'}`}>
                              {index === 0 ? '' : index}
                            </div>
                            {index < routeData.route.waypoints.length - 1 && (
                              <div className="w-0.5 h-12 bg-gray-300"></div>
                            )}
                          </div>
                          <div className="ml-2">
                            <p className="font-medium">{point.name}</p>
                            <p className="text-sm text-gray-500">{point.address}</p>
                            {index > 0 && index < routeData.route.waypoints.length && (
                              <p className="text-xs text-gray-400 mt-1">
                                {routeData.retailers[index-1].distance} • {routeData.retailers[index-1].estimatedTime} drive
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mt-6 p-4 bg-gray-100 rounded-lg">
                    <p className="text-center text-sm text-gray-500 mb-4">Google Maps Preview</p>
                    <div className="bg-white p-4 border border-gray-300 rounded-lg h-48 flex items-center justify-center">
                      <p className="text-gray-500">Interactive map would be displayed here using Google Maps API</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="p-8 text-center border border-dashed rounded-lg">
              <Car className="h-12 w-12 mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500">Could not generate route</p>
              <p className="text-sm text-gray-400 mt-1">Please try again later</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Recipe Import Dialog */}
      <Dialog open={recipeDialogOpen} onOpenChange={setRecipeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Recipe</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
              onClick={() => importRecipeMutation.mutate()} 
              disabled={!recipeUrl || importRecipeMutation.isPending}
            >
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShoppingListComponent;