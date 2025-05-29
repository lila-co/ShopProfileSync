
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

import { Check, ShoppingCart, Store, Clock, AlertCircle, Loader2 } from 'lucide-react';
import BottomNavigation from '@/components/layout/BottomNavigation';

interface OrderStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
}

interface OptimizedOrder {
  totalItems: number;
  totalCost: number;
  totalSavings: number;
  retailers: {
    retailerId: number;
    retailerName: string;
    items: any[];
    subtotal: number;
    orderInfo?: {
      orderId: string;
      status: string;
      estimatedReady: string;
    };
  }[];
}

const AutoOrder: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const listId = searchParams.get('listId');
  const mode = searchParams.get('mode') || 'online';
  
  const [currentStep, setCurrentStep] = useState(0);
  const [orderResults, setOrderResults] = useState<OptimizedOrder | null>(null);
  const [processingComplete, setProcessingComplete] = useState(false);

  const steps: OrderStep[] = [
    {
      id: 'analyze',
      title: 'Analyzing Shopping List',
      description: 'Finding the best deals and checking item availability',
      status: 'pending'
    },
    {
      id: 'optimize',
      title: 'Optimizing Order Plan',
      description: 'Creating the most cost-effective shopping strategy',
      status: 'pending'
    },
    {
      id: 'verify',
      title: 'Verifying Retailer Availability',
      description: 'Checking which retailers support online ordering',
      status: 'pending'
    },
    {
      id: 'place',
      title: 'Placing Orders',
      description: 'Automatically submitting orders to selected retailers',
      status: 'pending'
    }
  ];

  const [orderSteps, setOrderSteps] = useState(steps);

  // Auto-generate order mutation
  const generateOrderMutation = useMutation({
    mutationFn: async () => {
      if (!listId) throw new Error('No shopping list selected');

      // Step 1: Analyze shopping list
      updateStepStatus(0, 'processing');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const costResponse = await apiRequest('POST', '/api/shopping-lists/costs', {
        shoppingListId: parseInt(listId)
      });
      const costData = await costResponse.json();
      updateStepStatus(0, 'completed');

      // Step 2: Optimize order plan
      updateStepStatus(1, 'processing');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Use multi-store optimization for best deals
      const optimizedPlan = costData.multiStore;
      updateStepStatus(1, 'completed');

      // Step 3: Verify retailer availability
      updateStepStatus(2, 'processing');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const retailersResponse = await apiRequest('GET', '/api/retailers');
      const retailers = await retailersResponse.json();
      updateStepStatus(2, 'completed');

      // Step 4: Place orders
      updateStepStatus(3, 'processing');
      
      const orderResults: OptimizedOrder = {
        totalItems: Object.values(optimizedPlan.itemsByRetailer).reduce(
          (sum: number, retailer: any) => sum + retailer.items.length, 0
        ),
        totalCost: optimizedPlan.totalCost,
        totalSavings: optimizedPlan.totalSavings,
        retailers: []
      };

      // Place orders with each retailer
      for (const retailerId of optimizedPlan.retailers) {
        const retailer = retailers.find((r: any) => r.id === retailerId);
        const retailerItems = optimizedPlan.itemsByRetailer[retailerId];
        
        if (retailer && retailerItems) {
          try {
            // Check retailer integration status
            const statusResponse = await fetch(`/api/retailers/${retailerId}/integration-status`);
            const retailerStatus = await statusResponse.json();
            
            let orderInfo = null;
            
            if (retailerStatus.integration.supportsOnlineOrdering) {
              // Place actual order
              const orderResponse = await apiRequest('POST', `/api/retailers/${retailerId}/orders`, {
                items: retailerItems.items.map((item: any) => ({
                  productName: item.productName,
                  quantity: item.quantity
                })),
                mode: mode === 'online' ? 'pickup' : mode,
                customerInfo: {
                  name: "John Doe",
                  email: "johndoe@example.com",
                  address: "123 Main St, Anytown, USA",
                  phone: "555-123-4567"
                },
                shoppingListId: parseInt(listId)
              });
              
              const orderResult = await orderResponse.json();
              orderInfo = {
                orderId: orderResult.orderId,
                status: orderResult.status,
                estimatedReady: orderResult.estimatedReady
              };
            }
            
            orderResults.retailers.push({
              retailerId: retailer.id,
              retailerName: retailer.name,
              items: retailerItems.items,
              subtotal: retailerItems.subtotal,
              orderInfo
            });
          } catch (error) {
            console.error(`Failed to place order with ${retailer.name}:`, error);
            // Still add to results but without order info
            orderResults.retailers.push({
              retailerId: retailer.id,
              retailerName: retailer.name,
              items: retailerItems.items,
              subtotal: retailerItems.subtotal
            });
          }
        }
      }
      
      updateStepStatus(3, 'completed');
      return orderResults;
    },
    onSuccess: (data) => {
      setOrderResults(data);
      setProcessingComplete(true);
      
      const successfulOrders = data.retailers.filter(r => r.orderInfo).length;
      const totalRetailers = data.retailers.length;
      
      toast({
        title: "Orders Processed!",
        description: `Successfully placed ${successfulOrders}/${totalRetailers} orders. Total savings: $${(data.totalSavings / 100).toFixed(2)}`,
        duration: 5000
      });
    },
    onError: (error: Error) => {
      updateStepStatus(currentStep, 'error');
      toast({
        title: "Order Processing Failed",
        description: error.message || "Failed to process your order automatically",
        variant: "destructive"
      });
    }
  });

  const updateStepStatus = (stepIndex: number, status: OrderStep['status']) => {
    setOrderSteps(prev => prev.map((step, index) => 
      index === stepIndex ? { ...step, status } : step
    ));
    if (status === 'processing') {
      setCurrentStep(stepIndex);
    }
  };

  // Auto-start order generation when component mounts
  useEffect(() => {
    if (listId && !generateOrderMutation.isLoading && !processingComplete) {
      generateOrderMutation.mutate();
    }
  }, [listId]);

  const getStepIcon = (step: OrderStep) => {
    switch (step.status) {
      case 'completed':
        return <Check className="h-5 w-5 text-green-500" />;
      case 'processing':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getProgressPercentage = () => {
    const completedSteps = orderSteps.filter(step => step.status === 'completed').length;
    return (completedSteps / orderSteps.length) * 100;
  };

  if (!listId) {
    return (
      <div className="container mx-auto p-4 flex flex-col min-h-screen">
        <h1 className="text-2xl font-bold mb-6">Auto Order</h1>
        <div className="flex-grow flex items-center justify-center">
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-gray-500">No shopping list selected</p>
              <Button 
                className="w-full mt-4" 
                onClick={() => navigate('/shopping-list')}
              >
                Go to Shopping Lists
              </Button>
            </CardContent>
          </Card>
        </div>
        <BottomNavigation activeTab="shop" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 flex flex-col min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Auto Order Processing</h1>
      
      {!processingComplete ? (
        <>
          {/* Progress Overview */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Processing Your Order
              </CardTitle>
              <CardDescription>
                SmartCart is automatically finding the best deals and placing orders for you
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Progress value={getProgressPercentage()} className="w-full" />
                <p className="text-sm text-gray-600 text-center">
                  {Math.round(getProgressPercentage())}% Complete
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Processing Steps */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Processing Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {orderSteps.map((step, index) => (
                  <div key={step.id} className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getStepIcon(step)}
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-medium ${
                        step.status === 'processing' ? 'text-blue-600' : 
                        step.status === 'completed' ? 'text-green-600' :
                        step.status === 'error' ? 'text-red-600' : 'text-gray-700'
                      }`}>
                        {step.title}
                      </h3>
                      <p className="text-sm text-gray-500">{step.description}</p>
                    </div>
                    {step.status === 'processing' && (
                      <Badge variant="outline">Processing...</Badge>
                    )}
                    {step.status === 'completed' && (
                      <Badge variant="default" className="bg-green-500">Complete</Badge>
                    )}
                    {step.status === 'error' && (
                      <Badge variant="destructive">Error</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        /* Order Results */
        <>
          <Card className="mb-6 border-green-500">
            <CardHeader className="bg-green-50 dark:bg-green-900/20">
              <div className="flex items-center gap-2">
                <Check className="h-6 w-6 text-green-500" />
                <CardTitle>Orders Placed Successfully!</CardTitle>
              </div>
              <CardDescription>
                Your orders have been automatically processed and submitted
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{orderResults?.totalItems}</p>
                  <p className="text-sm text-gray-500">Items</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">${(orderResults?.totalCost || 0 / 100).toFixed(2)}</p>
                  <p className="text-sm text-gray-500">Total Cost</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    ${(orderResults?.totalSavings || 0 / 100).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500">Savings</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Details by Retailer */}
          <div className="space-y-4 mb-6">
            <h2 className="text-lg font-semibold">Your Orders</h2>
            {orderResults?.retailers.map((retailer) => (
              <Card key={retailer.retailerId}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Store className="h-5 w-5" />
                      <CardTitle className="text-lg">{retailer.retailerName}</CardTitle>
                    </div>
                    {retailer.orderInfo ? (
                      <Badge variant="default" className="bg-green-500">Order Placed</Badge>
                    ) : (
                      <Badge variant="outline">Manual Checkout Required</Badge>
                    )}
                  </div>
                  {retailer.orderInfo && (
                    <CardDescription>
                      Order #{retailer.orderInfo.orderId} • Ready: {retailer.orderInfo.estimatedReady}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px] rounded-md border p-4">
                    <div className="space-y-2">
                      {retailer.items.map((item: any, index: number) => (
                        <div key={index} className="flex justify-between items-center">
                          <span>{item.productName} ({item.quantity})</span>
                          <span className="font-medium">${(item.totalPrice / 100).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <div className="mt-4 pt-4 border-t flex justify-between items-center">
                    <span className="font-medium">Subtotal:</span>
                    <span className="font-bold">${(retailer.subtotal / 100).toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-auto mb-20 space-y-2">
            <Button 
              className="w-full" 
              onClick={() => navigate('/shopping-list')}
            >
              Back to Shopping Lists
            </Button>
            <Button 
              variant="outline"
              className="w-full" 
              onClick={() => navigate('/dashboard')}
            >
              View Dashboard
            </Button>
          </div>
        </>
      )}
      
      <BottomNavigation activeTab="shop" />
    </div>
  );
};

export default AutoOrder;
