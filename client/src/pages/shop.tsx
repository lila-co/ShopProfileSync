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
  
  // Fetch shopping lists
  const { data: shoppingLists, isLoading: isLoadingLists } = useQuery({
    queryKey: ['/api/shopping-lists'],
    onSuccess: (data) => {
      // Default to the first list if none selected
      if (data && data.length > 0 && !selectedList) {
        setSelectedList(data[0].id);
      }
    }
  });
  
  // Fetch retailers
  const { data: retailers, isLoading: isLoadingRetailers } = useQuery({
    queryKey: ['/api/retailers'],
    onSuccess: (data) => {
      // Default to the first retailer if none selected
      if (data && data.length > 0 && !selectedRetailer) {
        setSelectedRetailer(data[0].id);
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
  
  // Mutation for submitting shopping order/route
  const submitShoppingMutation = useMutation({
    mutationFn: async () => {
      setIsSubmitting(true);
      
      if (!selectedList || !selectedRetailer) {
        throw new Error("Please select a shopping list and retailer");
      }
      
      const response = await apiRequest('POST', '/api/shopping-route', {
        listId: selectedList,
        retailerId: selectedRetailer,
        mode: shoppingMode
      });
      
      const result = await response.json();
      setShoppingRoute(result.route);
      return result;
    },
    onSuccess: (data) => {
      setIsSubmitting(false);
      setOrderCompleted(true);
      
      const modeText = {
        'instore': 'in-store shopping route',
        'pickup': 'pickup order',
        'delivery': 'delivery order'
      };
      
      toast({
        title: "Success!",
        description: `Your ${modeText[shoppingMode]} has been created.`,
        duration: 5000
      });
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
      <div className="container mx-auto p-4 flex flex-col min-h-screen">
        <h1 className="text-2xl font-bold mb-6">Shop Now</h1>
        <div className="flex items-center justify-center flex-grow">
          <p>Loading...</p>
        </div>
        <BottomNavigation activeTab="shop" />
      </div>
    );
  }
  
  if (orderCompleted && shoppingRoute) {
    // Show confirmation and shopping route/order details
    return (
      <div className="container mx-auto p-4 flex flex-col min-h-screen">
        <h1 className="text-2xl font-bold mb-2">Shop Now</h1>
        
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
    <div className="container mx-auto p-4 flex flex-col min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Shop Now</h1>
      
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Select Shopping List</CardTitle>
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
            onValueChange={(value) => setSelectedRetailer(parseInt(value))}
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
        </CardContent>
      </Card>
      
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Shopping Method</CardTitle>
          <CardDescription>How would you like to shop?</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup 
            value={shoppingMode} 
            onValueChange={(value: 'instore' | 'pickup' | 'delivery') => setShoppingMode(value)}
            className="grid grid-cols-1 gap-4 md:grid-cols-3"
          >
            <div>
              <RadioGroupItem value="instore" id="instore" className="peer sr-only" />
              <Label
                htmlFor="instore"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-white p-4 hover:bg-gray-50 hover:border-gray-200 peer-checked:border-primary [&:has([data-state=checked])]:border-primary"
              >
                <Store className="mb-3 h-6 w-6" />
                <span className="text-sm font-medium">In-Store Shopping</span>
                <span className="text-xs text-muted-foreground mt-1">
                  Get an organized route through the store
                </span>
              </Label>
            </div>
            
            <div>
              <RadioGroupItem value="pickup" id="pickup" className="peer sr-only" />
              <Label
                htmlFor="pickup"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-white p-4 hover:bg-gray-50 hover:border-gray-200 peer-checked:border-primary [&:has([data-state=checked])]:border-primary"
              >
                <TruckIcon className="mb-3 h-6 w-6" />
                <span className="text-sm font-medium">Store Pickup</span>
                <span className="text-xs text-muted-foreground mt-1">
                  Order online and pickup in-store
                </span>
              </Label>
            </div>
            
            <div>
              <RadioGroupItem value="delivery" id="delivery" className="peer sr-only" />
              <Label
                htmlFor="delivery"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-white p-4 hover:bg-gray-50 hover:border-gray-200 peer-checked:border-primary [&:has([data-state=checked])]:border-primary"
              >
                <HomeIcon className="mb-3 h-6 w-6" />
                <span className="text-sm font-medium">Home Delivery</span>
                <span className="text-xs text-muted-foreground mt-1">
                  Get groceries delivered to your door
                </span>
              </Label>
            </div>
          </RadioGroup>
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
      
      <div className="mt-auto mb-20">
        <Button 
          className="w-full"
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
      
      <BottomNavigation activeTab="shop" />
    </div>
  );
};

export default Shop;