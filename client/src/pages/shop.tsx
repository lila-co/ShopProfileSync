import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import { Check, ShoppingBag, ShoppingCart, TruckIcon, HomeIcon, Store, MapPin, Clock, Percent } from 'lucide-react';
import BottomNavigation from '@/components/layout/BottomNavigation';

const Shop: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedList, setSelectedList] = useState<number | null>(null);
  const [selectedRetailer, setSelectedRetailer] = useState<number | null>(null);
  const [shoppingMode, setShoppingMode] = useState<'instore' | 'pickup' | 'delivery'>('instore');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shoppingRoute, setShoppingRoute] = useState<any>(null);
  const [orderCompleted, setOrderCompleted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedRetailerInfo, setSelectedRetailerInfo] = useState<any>(null);
  
  // Check URL parameters for pre-selected retailer and list
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const retailerId = params.get('retailerId');
    const listId = params.get('listId');
    
    if (retailerId) {
      setSelectedRetailer(parseInt(retailerId));
      fetchRetailerInfo(parseInt(retailerId));
    }
    
    if (listId) {
      setSelectedList(parseInt(listId));
    }
  }, []);
  
  // Fetch retailer integration information
  const fetchRetailerInfo = async (retailerId: number) => {
    try {
      const response = await fetch(`/api/retailers/${retailerId}/integration-status`);
      if (response.ok) {
        const data = await response.json();
        setSelectedRetailerInfo(data);
      }
    } catch (error) {
      console.error('Error fetching retailer information:', error);
    }
  };
  
  // Search for products at the selected retailer
  const searchProducts = async () => {
    if (!selectedRetailer || !searchQuery.trim()) {
      return;
    }
    
    setIsSearching(true);
    
    try {
      const response = await fetch(`/api/retailers/${selectedRetailer}/products/search?query=${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      }
    } catch (error) {
      console.error('Error searching products:', error);
      toast({
        title: 'Search Error',
        description: 'Failed to search for products. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSearching(false);
    }
  };
  
  // Fetch shopping lists
  const { data: shoppingLists, isLoading: isLoadingLists } = useQuery({
    queryKey: ['/api/shopping-lists'],
    onSuccess: (data) => {
      // Default to the first list if none selected and no URL param
      if (data && data.length > 0 && !selectedList) {
        // Check URL parameters again to ensure we don't override them
        const params = new URLSearchParams(window.location.search);
        const listId = params.get('listId');
        
        if (listId) {
          setSelectedList(parseInt(listId));
        } else {
          setSelectedList(data[0].id);
        }
      }
    }
  });
  
  // Fetch retailers
  const { data: retailers, isLoading: isLoadingRetailers } = useQuery({
    queryKey: ['/api/retailers'],
    onSuccess: (data) => {
      // Default to the first retailer if none selected and no URL param
      if (data && data.length > 0 && !selectedRetailer) {
        // Check URL parameters again to ensure we don't override them
        const params = new URLSearchParams(window.location.search);
        const retailerId = params.get('retailerId');
        
        if (retailerId) {
          setSelectedRetailer(parseInt(retailerId));
          fetchRetailerInfo(parseInt(retailerId));
        } else {
          setSelectedRetailer(data[0].id);
          fetchRetailerInfo(data[0].id);
        }
      }
    }
  });
  
  // Get the items from the selected shopping list
  const { data: listItems, isLoading: isLoadingItems } = useQuery({
    queryKey: ['/api/shopping-lists', selectedList],
    enabled: !!selectedList,
    queryFn: async () => {
      if (!selectedList) return null;
      const response = await fetch(`/api/shopping-list/items?listId=${selectedList}`);
      return response.json();
    }
  });
  
  // Mutation for adding items to shopping list
  const addItemToListMutation = useMutation({
    mutationFn: async (data: { shoppingListId: number; productName: string; quantity: number }) => {
      const response = await apiRequest('POST', '/api/shopping-list/items', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists', selectedList] });
      toast({
        title: "Item Added",
        description: "Product has been added to your shopping list.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add item to shopping list.",
        variant: "destructive"
      });
    }
  });

  // Mutation for submitting shopping order/route
  const submitShoppingMutation = useMutation({
    mutationFn: async () => {
      setIsSubmitting(true);
      
      if (!selectedList || !selectedRetailer) {
        throw new Error("Please select a shopping list and retailer");
      }
      
      // First check the retailer integration status
      const statusResponse = await fetch(`/api/retailers/${selectedRetailer}/integration-status`);
      if (!statusResponse.ok) {
        throw new Error("Failed to check retailer integration status");
      }
      const retailerStatus = await statusResponse.json();
      
      // For in-store shopping or when online ordering is not supported
      if (shoppingMode === 'instore' || !retailerStatus.integration.supportsOnlineOrdering) {
        const response = await apiRequest('POST', '/api/shopping-route', {
          listId: selectedList,
          retailerId: selectedRetailer
        });
        
        const result = await response.json();
        // Ensure retailer name is included in the route
        const routeWithRetailer = {
          ...result.route,
          retailer: selectedRetailerInfo?.retailerName || retailers?.find(r => r.id === selectedRetailer)?.name || 'Store'
        };
        setShoppingRoute(routeWithRetailer);
        return { mode: 'instore', route: routeWithRetailer };
      } 
      // For online ordering (pickup or delivery)
      else {
        if (shoppingMode === 'pickup' && !retailerStatus.integration.supportsPickup) {
          throw new Error(`${retailerStatus.retailerName} does not support pickup orders through our app yet.`);
        }
        
        if (shoppingMode === 'delivery' && !retailerStatus.integration.supportsDelivery) {
          throw new Error(`${retailerStatus.retailerName} does not support delivery orders through our app yet.`);
        }
        
        // Get the list items
        const listItemsResponse = await fetch(`/api/shopping-lists/${selectedList}`);
        if (!listItemsResponse.ok) {
          throw new Error("Failed to get shopping list items");
        }
        const items = await listItemsResponse.json();
        
        // Customer info - in a real app, this would come from user profile
        const customerInfo = {
          name: "John Doe",
          email: "johndoe@example.com",
          address: "123 Main St, Anytown, USA",
          phone: "555-123-4567"
        };
        
        // Submit the order to the retailer API
        const orderResponse = await apiRequest('POST', `/api/retailers/${selectedRetailer}/orders`, {
          items,
          mode: shoppingMode,
          customerInfo,
          shoppingListId: selectedList
        });
        
        const orderResult = await orderResponse.json();
        
        // Ensure retailer name is included in the order result
        const orderWithRetailer = {
          ...orderResult,
          retailer: selectedRetailerInfo?.retailerName || retailers?.find(r => r.id === selectedRetailer)?.name || 'Store'
        };
        
        return { mode: shoppingMode, order: orderWithRetailer };
      }
    },
    onSuccess: (data) => {
      setIsSubmitting(false);
      setOrderCompleted(true);
      
      if (data.mode === 'instore') {
        toast({
          title: "Shopping Route Ready!",
          description: `Your in-store shopping route has been created.`,
          duration: 5000
        });
      } else {
        const modeText = data.mode === 'pickup' ? 'pickup' : 'delivery';
        toast({
          title: "Order Placed!",
          description: `Your ${modeText} order has been placed. ${data.order?.orderId ? `Order ID: ${data.order.orderId}` : ''}`,
          duration: 5000
        });
      }
    },
    onError: (error: Error) => {
      setIsSubmitting(false);
      toast({
        title: "Error",
        description: error.message || "Failed to create your shopping route/order",
        variant: "destructive"
      });
    }
  });
  
  const handleSubmit = () => {
    submitShoppingMutation.mutate();
  };
  
  const getTotalItemCount = () => {
    if (!listItems) return 0;
    return listItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
  };
  
  const getTotalPrice = () => {
    if (!listItems) return 0;
    return listItems.reduce((sum: number, item: any) => {
      return sum + ((item.suggestedPrice || 0) * item.quantity);
    }, 0);
  };
  
  const startNewShop = () => {
    setShoppingRoute(null);
    setOrderCompleted(false);
    queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
  };
  
  if (isLoadingLists || isLoadingRetailers) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
        <div className="p-4 pb-20">
          <h1 className="text-xl sm:text-2xl font-bold mb-4">Shop Now</h1>
          <div className="flex items-center justify-center flex-grow py-12">
            <p>Loading...</p>
          </div>
        </div>
        <BottomNavigation activeTab="shop" />
      </div>
    );
  }
  
  if (orderCompleted && shoppingRoute) {
    // Show confirmation and shopping route/order details
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
        <div className="p-4 pb-20">
          <h1 className="text-xl sm:text-2xl font-bold mb-2">Shop Now</h1>
        
        <Card className="mb-4 border-green-500">
          <CardHeader className="bg-green-50 dark:bg-green-900/20">
            <div className="flex items-center gap-2">
              <Check className="h-6 w-6 text-green-500" />
              <CardTitle>
                {shoppingMode === 'instore' ? 'Shopping Route Created' : 
                  shoppingMode === 'pickup' ? 'Pickup Order Placed' : 
                  'Delivery Order Placed'}
              </CardTitle>
            </div>
            <CardDescription>
              {shoppingMode === 'instore' ? 
                `Ready for your in-store visit at ${shoppingRoute.retailer}` : 
                shoppingMode === 'pickup' ? 
                `Your order will be ready for pickup at ${shoppingRoute.retailer}` : 
                `Your order will be delivered from ${shoppingRoute.retailer}`}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-4">
            {shoppingMode === 'instore' ? (
              // In-store shopping route
              <>
                <div className="flex items-center gap-2 mb-4">
                  <Store className="h-5 w-5 text-gray-500" />
                  <span className="font-medium">{shoppingRoute.retailer}</span>
                </div>
                
                <div className="flex items-center gap-2 mb-6">
                  <Clock className="h-5 w-5 text-gray-500" />
                  <span>Estimated shopping time: {shoppingRoute.estimatedTime}</span>
                </div>
                
                <h3 className="text-lg font-medium mb-2">Your Shopping Route:</h3>
                
                <ScrollArea className="h-[300px] rounded-md border p-4">
                  {shoppingRoute.aisles?.map((aisle: any, index: number) => (
                    <div key={index} className="mb-6">
                      <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-lg mb-2">
                        <h4 className="font-medium">{aisle.name}</h4>
                      </div>
                      <ul className="space-y-2 pl-2">
                        {aisle.items.map((item: any) => (
                          <li key={item.id} className="flex justify-between">
                            <span>
                              {item.productName} ({item.quantity})
                            </span>
                            {item.suggestedPrice && (
                              <span className="text-gray-500">
                                ${(item.suggestedPrice * item.quantity).toFixed(2)}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  
                  {shoppingRoute.other && (
                    <div className="mb-6">
                      <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-lg mb-2">
                        <h4 className="font-medium">{shoppingRoute.other.name}</h4>
                      </div>
                      <ul className="space-y-2 pl-2">
                        {shoppingRoute.other.items.map((item: any) => (
                          <li key={item.id} className="flex justify-between">
                            <span>
                              {item.productName} ({item.quantity})
                            </span>
                            {item.suggestedPrice && (
                              <span className="text-gray-500">
                                ${(item.suggestedPrice * item.quantity).toFixed(2)}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </ScrollArea>
              </>
            ) : (
              // Online order details (pickup or delivery)
              <>
                <div className="flex items-center gap-2 mb-4">
                  <Store className="h-5 w-5 text-gray-500" />
                  <span className="font-medium">{shoppingRoute.retailer}</span>
                </div>
                
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingBag className="h-5 w-5 text-gray-500" />
                  <span>Order ID: {shoppingRoute.orderId}</span>
                </div>
                
                <div className="flex items-center gap-2 mb-6">
                  <Clock className="h-5 w-5 text-gray-500" />
                  <span>
                    {shoppingMode === 'pickup' ? 'Ready for pickup: ' : 'Expected delivery: '}
                    {shoppingRoute.estimatedReady}
                  </span>
                </div>
                
                <h3 className="text-lg font-medium mb-2">Your Order:</h3>
                
                <ScrollArea className="h-[300px] rounded-md border p-4">
                  <ul className="space-y-2">
                    {shoppingRoute.items?.map((item: any) => (
                      <li key={item.id} className="flex justify-between border-b pb-2">
                        <span>
                          {item.productName} ({item.quantity})
                        </span>
                        {item.suggestedPrice && (
                          <span className="text-gray-500">
                            ${(item.suggestedPrice * item.quantity).toFixed(2)}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                  
                  <div className="mt-4 pt-4 border-t flex justify-between font-medium">
                    <span>Total ({shoppingRoute.totalItems} items):</span>
                    <span>${shoppingRoute.totalPrice?.toFixed(2) || '0.00'}</span>
                  </div>
                </ScrollArea>
              </>
            )}
          </CardContent>
          
          <CardFooter className="flex-col gap-2">
            <Button 
              className="w-full" 
              onClick={startNewShop}
            >
              Shop Again
            </Button>
          </CardFooter>
        </Card>
        
        <BottomNavigation activeTab="shop" />
      </div>
    );
  }
  
  return (
    <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
      <div className="p-4 pb-20">
        <h1 className="text-xl sm:text-2xl font-bold mb-4">Shop Now</h1>
      
      <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-lg">Select Shopping List</CardTitle>
            <CardDescription>Choose the shopping list you want to use</CardDescription>
          </CardHeader>
        <CardContent>
          <Select
            value={selectedList?.toString()}
            onValueChange={(value) => setSelectedList(parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a shopping list" />
            </SelectTrigger>
            <SelectContent>
              {shoppingLists?.map((list: any) => (
                <SelectItem key={list.id} value={list.id.toString()}>
                  {list.name} {list.isDefault && <span className="ml-2 text-sm">(Default)</span>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {selectedList && listItems && (
            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2">List Contents:</h3>
              <div className="rounded-md border p-2 max-h-[150px] overflow-y-auto">
                {listItems.length === 0 ? (
                  <p className="text-sm text-gray-500">This list is empty.</p>
                ) : (
                  <ul className="space-y-1">
                    {listItems.map((item: any) => (
                      <li key={item.id} className="text-sm">
                        {item.productName} ({item.quantity})
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="mt-2 text-right text-sm">
                <span className="font-medium">Total: {getTotalItemCount()} items</span>
                {getTotalPrice() > 0 && (
                  <span className="ml-4 font-medium">
                    Est. Price: ${getTotalPrice().toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Select Retailer</CardTitle>
          <CardDescription>Choose where you want to shop</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedRetailer?.toString()}
            onValueChange={(value) => {
              const retailerId = parseInt(value);
              setSelectedRetailer(retailerId);
              fetchRetailerInfo(retailerId);
              setSearchResults([]);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a retailer" />
            </SelectTrigger>
            <SelectContent>
              {retailers?.map((retailer: any) => (
                <SelectItem key={retailer.id} value={retailer.id.toString()}>
                  {retailer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {selectedRetailerInfo && (
            <div className="mt-4 text-sm">
              <div className="flex items-center">
                <Badge variant={selectedRetailerInfo.integration.status === 'ready' ? "success" : "secondary"} className="mr-2">
                  {selectedRetailerInfo.integration.status === 'ready' ? 'Connected' : 'No API'}
                </Badge>
                <span>
                  {selectedRetailerInfo.integration.supportsOnlineOrdering 
                    ? 'Supports online ordering' 
                    : 'In-store shopping only'}
                </span>
              </div>
            </div>
          )}
          
          {selectedRetailer && (
            <div className="mt-4">
              <form onSubmit={(e) => {
                e.preventDefault();
                searchProducts();
              }} className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Search for products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" disabled={isSearching || !searchQuery.trim()}>
                  {isSearching ? 'Searching...' : 'Search'}
                </Button>
              </form>
              
              {searchResults.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-2">Search Results:</h3>
                  <ScrollArea className="h-[200px] rounded-md border p-2">
                    <ul className="divide-y">
                      {searchResults.map((product, index) => (
                        <li key={index} className="py-2">
                          <div className="flex justify-between">
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-sm text-gray-500">
                                {product.category && `${product.category} • `}
                                {product.inStock ? 'In Stock' : 'Out of Stock'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">
                                ${product.salePrice ? (
                                  <>
                                    <span className="text-green-600">{product.salePrice.toFixed(2)}</span> 
                                    <span className="text-sm line-through ml-1">${product.price.toFixed(2)}</span>
                                  </>
                                ) : (
                                  product.price.toFixed(2)
                                )}
                              </p>
                              {product.inStock && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="mt-1"
                                  onClick={() => {
                                    if (!selectedList) {
                                      toast({
                                        title: "No list selected",
                                        description: "Please select a shopping list first",
                                        variant: "destructive"
                                      });
                                      return;
                                    }
                                    
                                    addItemToListMutation.mutate({
                                      shoppingListId: selectedList,
                                      productName: product.name,
                                      quantity: 1
                                    });
                                  }}
                                >
                                  Add to List
                                </Button>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Shopping Method</CardTitle>
          <CardDescription>How would you like to shop?</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* In-store shopping button */}
            <button
              type="button"
              onClick={() => setShoppingMode('instore')}
              className={`flex flex-col items-center justify-center rounded-md border-2 p-4 transition-all hover:border-primary hover:bg-gray-50/80
                ${shoppingMode === 'instore' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}
            >
              <Store className="mb-3 h-6 w-6" />
              <span className="text-sm font-medium">In-Store Shopping</span>
              <span className="text-xs text-muted-foreground mt-1 text-center">
                Get an organized route through the store
              </span>
            </button>
            
            {/* Pickup button */}
            <button
              type="button"
              onClick={() => setShoppingMode('pickup')}
              className={`flex flex-col items-center justify-center rounded-md border-2 p-4 transition-all hover:border-primary hover:bg-gray-50/80
                ${shoppingMode === 'pickup' ? 'border-primary bg-primary/5' : 'border-gray-200'}
                ${selectedRetailerInfo && !selectedRetailerInfo.integration?.supportsPickup ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={selectedRetailerInfo && !selectedRetailerInfo.integration?.supportsPickup}
            >
              <TruckIcon className="mb-3 h-6 w-6" />
              <span className="text-sm font-medium">Store Pickup</span>
              <span className="text-xs text-muted-foreground mt-1 text-center">
                Order online and pickup in-store
              </span>
              {selectedRetailerInfo && !selectedRetailerInfo.integration?.supportsPickup && (
                <Badge variant="outline" className="mt-2 text-xs bg-gray-100">Not Available</Badge>
              )}
            </button>
            
            {/* Delivery button */}
            <button
              type="button" 
              onClick={() => setShoppingMode('delivery')}
              className={`flex flex-col items-center justify-center rounded-md border-2 p-4 transition-all hover:border-primary hover:bg-gray-50/80
                ${shoppingMode === 'delivery' ? 'border-primary bg-primary/5' : 'border-gray-200'}
                ${selectedRetailerInfo && !selectedRetailerInfo.integration?.supportsDelivery ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={selectedRetailerInfo && !selectedRetailerInfo.integration?.supportsDelivery}
            >
              <HomeIcon className="mb-3 h-6 w-6" />
              <span className="text-sm font-medium">Home Delivery</span>
              <span className="text-xs text-muted-foreground mt-1 text-center">
                Get groceries delivered to your door
              </span>
              {selectedRetailerInfo && !selectedRetailerInfo.integration?.supportsDelivery && (
                <Badge variant="outline" className="mt-2 text-xs bg-gray-100">Not Available</Badge>
              )}
            </button>
          </div>
        </CardContent>
      </Card>
      
      {/* Conditional alerts based on shopping mode */}
      {shoppingMode === 'instore' && (
        <Alert className="mb-4">
          <Store className="h-4 w-4" />
          <AlertTitle>In-Store Shopping</AlertTitle>
          <AlertDescription>
            We'll organize your shopping list into an efficient route through the store.
          </AlertDescription>
        </Alert>
      )}
      
      {shoppingMode === 'pickup' && (
        <Alert className="mb-4">
          <TruckIcon className="h-4 w-4" />
          <AlertTitle>Store Pickup</AlertTitle>
          <AlertDescription>
            Your order will be prepared for pickup. Typical preparation time is 2-4 hours.
          </AlertDescription>
        </Alert>
      )}
      
      {shoppingMode === 'delivery' && (
        <Alert className="mb-4">
          <HomeIcon className="h-4 w-4" />
          <AlertTitle>Home Delivery</AlertTitle>
          <AlertDescription>
            Your groceries will be delivered to your home address. Delivery times vary by location.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="mt-6">
          <Button 
            className="w-full h-12 touch-target"
            size="lg"
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedList || !selectedRetailer || listItems?.length === 0}
          >
            {isSubmitting ? 'Processing...' : (
              shoppingMode === 'instore' ? 'Create Shopping Route' : 
              shoppingMode === 'pickup' ? 'Place Pickup Order' : 
              'Place Delivery Order'
            )}
          </Button>
        </div>
      </div>
      
      <BottomNavigation activeTab="shop" />
    </div>
  );
};

export default Shop;