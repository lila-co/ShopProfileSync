import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowUpRight,
  Check,
  ChevronsUpDown,
  MapPin,
  ShoppingBag,
  ShoppingCart,
  Store,
  Truck
} from 'lucide-react';

const ShopPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRetailer, setSelectedRetailer] = useState<string>('');
  const [selectedList, setSelectedList] = useState<string>('');
  const [shoppingMode, setShoppingMode] = useState<'pickup' | 'delivery' | 'instore'>('instore');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  
  // Fetch shopping lists
  const { data: shoppingLists, isLoading: listsLoading } = useQuery({
    queryKey: ['/api/shopping-lists'],
    select: (data) => data.lists
  });
  
  // Fetch retailers
  const { data: retailers, isLoading: retailersLoading } = useQuery({
    queryKey: ['/api/retailers'],
    select: (data) => data.retailers
  });
  
  // Get active shopping list items
  const { data: listItems, isLoading: itemsLoading } = useQuery({
    queryKey: ['/api/shopping-list/items', selectedList],
    enabled: !!selectedList,
    select: (data) => data.items
  });
  
  // Submit shopping list for online order
  const submitOrderMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/shopping-route', {
        listId: selectedList, 
        retailerId: selectedRetailer,
        mode: shoppingMode
      });
      return response.json();
    },
    onSuccess: () => {
      setConfirmDialogOpen(false);
      setSuccessDialogOpen(true);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit order",
        variant: "destructive"
      });
    }
  });
  
  // Calculate estimated total
  const estimatedTotal = listItems?.reduce((total, item) => {
    return total + (item.suggestedPrice || 0) * item.quantity;
  }, 0) || 0;
  
  // Handle shopping method selection
  const handleShoppingMethodSelect = (value: 'pickup' | 'delivery' | 'instore') => {
    setShoppingMode(value);
  };
  
  // Handle finalize button click
  const handleFinalize = () => {
    if (!selectedRetailer || !selectedList) {
      toast({
        title: "Selection Required",
        description: "Please select both a retailer and a shopping list",
        variant: "destructive"
      });
      return;
    }
    setConfirmDialogOpen(true);
  };
  
  // Handle confirm order
  const handleConfirmOrder = () => {
    submitOrderMutation.mutate();
  };

  return (
    <div className="container py-6 pb-20">
      <h1 className="text-2xl font-bold mb-6">Shop Now</h1>
      
      <Tabs defaultValue="online" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="online">Online Shopping</TabsTrigger>
          <TabsTrigger value="instore">In-Store Guide</TabsTrigger>
        </TabsList>
        
        <TabsContent value="online" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Submit Your Order</CardTitle>
              <CardDescription>
                Select your shopping list and preferred retailer to order groceries online
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Select Shopping List</label>
                <Select
                  value={selectedList}
                  onValueChange={setSelectedList}
                  disabled={listsLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a shopping list" />
                  </SelectTrigger>
                  <SelectContent>
                    {shoppingLists?.map((list) => (
                      <SelectItem key={list.id} value={list.id.toString()}>
                        {list.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Select Retailer</label>
                <Select
                  value={selectedRetailer}
                  onValueChange={setSelectedRetailer}
                  disabled={retailersLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a retailer" />
                  </SelectTrigger>
                  <SelectContent>
                    {retailers?.map((retailer) => (
                      <SelectItem key={retailer.id} value={retailer.id.toString()}>
                        {retailer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Shopping Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={shoppingMode === 'pickup' ? 'default' : 'outline'}
                    className="flex items-center justify-center gap-2"
                    onClick={() => handleShoppingMethodSelect('pickup')}
                  >
                    <Store className="h-4 w-4" />
                    <span>Store Pickup</span>
                  </Button>
                  <Button
                    variant={shoppingMode === 'delivery' ? 'default' : 'outline'}
                    className="flex items-center justify-center gap-2"
                    onClick={() => handleShoppingMethodSelect('delivery')}
                  >
                    <Truck className="h-4 w-4" />
                    <span>Home Delivery</span>
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                onClick={handleFinalize}
                disabled={!selectedList || !selectedRetailer || submitOrderMutation.isPending}
              >
                Submit Order
              </Button>
            </CardFooter>
          </Card>
          
          {selectedList && !itemsLoading && listItems && (
            <Card>
              <CardHeader>
                <CardTitle>Your Shopping List</CardTitle>
                <CardDescription>
                  {listItems.length} {listItems.length === 1 ? 'item' : 'items'} in your list
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="divide-y">
                  {listItems.map((item) => (
                    <li key={item.id} className="py-2 flex justify-between items-center">
                      <div>
                        <span className="font-medium">{item.productName}</span>
                        <div className="text-sm text-gray-500">
                          Qty: {item.quantity}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          ${((item.suggestedPrice || 0) * item.quantity).toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-500">
                          ${(item.suggestedPrice || 0).toFixed(2)} each
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="flex justify-between">
                <div className="font-semibold">Estimated Total:</div>
                <div className="font-bold text-lg">${estimatedTotal.toFixed(2)}</div>
              </CardFooter>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="instore" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>In-Store Shopping Guide</CardTitle>
              <CardDescription>
                Optimize your in-store shopping experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Select Shopping List</label>
                <Select
                  value={selectedList}
                  onValueChange={setSelectedList}
                  disabled={listsLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a shopping list" />
                  </SelectTrigger>
                  <SelectContent>
                    {shoppingLists?.map((list) => (
                      <SelectItem key={list.id} value={list.id.toString()}>
                        {list.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Select Retailer</label>
                <Select
                  value={selectedRetailer}
                  onValueChange={setSelectedRetailer}
                  disabled={retailersLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a retailer" />
                  </SelectTrigger>
                  <SelectContent>
                    {retailers?.map((retailer) => (
                      <SelectItem key={retailer.id} value={retailer.id.toString()}>
                        {retailer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                onClick={handleFinalize}
                disabled={!selectedList || !selectedRetailer}
              >
                <MapPin className="h-4 w-4 mr-2" />
                Generate Store Map
              </Button>
            </CardFooter>
          </Card>
          
          {selectedList && selectedRetailer && !itemsLoading && listItems && (
            <Card>
              <CardHeader>
                <CardTitle>Optimized Shopping Route</CardTitle>
                <CardDescription>
                  Shop in this order to save time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-500 mb-2">Aisle 1: Produce</div>
                    <ul className="space-y-2">
                      {listItems
                        .filter(item => ['Apples', 'Bananas', 'Lettuce', 'Tomatoes', 'Avocados'].some(
                          term => item.productName.toLowerCase().includes(term.toLowerCase())
                        ))
                        .map((item) => (
                          <li key={item.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-green-500" />
                              <span>{item.productName}</span>
                            </div>
                            <span className="text-sm">Qty: {item.quantity}</span>
                          </li>
                        ))}
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-500 mb-2">Aisle 3: Dairy</div>
                    <ul className="space-y-2">
                      {listItems
                        .filter(item => ['Milk', 'Cheese', 'Yogurt', 'Butter', 'Eggs'].some(
                          term => item.productName.toLowerCase().includes(term.toLowerCase())
                        ))
                        .map((item) => (
                          <li key={item.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-green-500" />
                              <span>{item.productName}</span>
                            </div>
                            <span className="text-sm">Qty: {item.quantity}</span>
                          </li>
                        ))}
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-500 mb-2">Aisle 5: Pantry</div>
                    <ul className="space-y-2">
                      {listItems
                        .filter(item => ['Pasta', 'Rice', 'Cereal', 'Soup', 'Beans'].some(
                          term => item.productName.toLowerCase().includes(term.toLowerCase())
                        ))
                        .map((item) => (
                          <li key={item.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-green-500" />
                              <span>{item.productName}</span>
                            </div>
                            <span className="text-sm">Qty: {item.quantity}</span>
                          </li>
                        ))}
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-500 mb-2">Other Items</div>
                    <ul className="space-y-2">
                      {listItems
                        .filter(item => 
                          !['Apples', 'Bananas', 'Lettuce', 'Tomatoes', 'Avocados', 
                            'Milk', 'Cheese', 'Yogurt', 'Butter', 'Eggs',
                            'Pasta', 'Rice', 'Cereal', 'Soup', 'Beans'].some(
                            term => item.productName.toLowerCase().includes(term.toLowerCase())
                          )
                        )
                        .map((item) => (
                          <li key={item.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-green-500" />
                              <span>{item.productName}</span>
                            </div>
                            <span className="text-sm">Qty: {item.quantity}</span>
                          </li>
                        ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <div className="w-full">
                  <Button variant="outline" className="w-full">
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    Mark as Complete
                  </Button>
                </div>
              </CardFooter>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Your Order</DialogTitle>
            <DialogDescription>
              {shoppingMode === 'instore' 
                ? "Are you ready to start shopping in-store? We'll optimize your route through the store."
                : "You're about to submit your order. The retailer will process it for " + 
                  (shoppingMode === 'pickup' ? "pickup" : "delivery") + "."}
            </DialogDescription>
          </DialogHeader>
          
          {selectedList && listItems && (
            <div className="space-y-2 my-4">
              <div className="flex justify-between font-medium">
                <span>Total Items:</span>
                <span>{listItems.length}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Estimated Total:</span>
                <span>${estimatedTotal.toFixed(2)}</span>
              </div>
              {shoppingMode === 'delivery' && (
                <div className="flex justify-between font-medium">
                  <span>Delivery Fee:</span>
                  <span>$5.99</span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between font-bold">
                <span>Final Total:</span>
                <span>${(estimatedTotal + (shoppingMode === 'delivery' ? 5.99 : 0)).toFixed(2)}</span>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmOrder} disabled={submitOrderMutation.isPending}>
              {submitOrderMutation.isPending 
                ? "Processing..." 
                : shoppingMode === 'instore' 
                  ? "Start Shopping" 
                  : "Confirm Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Success Dialog */}
      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              {shoppingMode === 'instore' 
                ? "Your Shopping Guide is Ready" 
                : "Order Successfully Submitted"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            {shoppingMode === 'instore' ? (
              <p>
                Your in-store shopping guide is ready. Follow the optimized route to save time while shopping!
              </p>
            ) : shoppingMode === 'pickup' ? (
              <div className="space-y-4">
                <p>
                  Your order has been submitted for pickup. The store will notify you when it's ready.
                </p>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="font-medium">Pickup Information</div>
                  <div className="mt-2 text-sm text-gray-600">
                    <p>Pickup at: {retailers?.find(r => r.id.toString() === selectedRetailer)?.name || "Selected Retailer"}</p>
                    <p>Estimated ready: Today, between 4-6 PM</p>
                    <p>Order #: ORD-{Math.floor(Math.random() * 1000000)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p>
                  Your order has been submitted for delivery. You'll receive updates as it's processed.
                </p>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="font-medium">Delivery Information</div>
                  <div className="mt-2 text-sm text-gray-600">
                    <p>Estimated delivery: Tomorrow, between 10 AM-12 PM</p>
                    <p>Order #: ORD-{Math.floor(Math.random() * 1000000)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button onClick={() => setSuccessDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShopPage;