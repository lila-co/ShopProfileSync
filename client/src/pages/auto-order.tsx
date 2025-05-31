
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import Header from '@/components/layout/Header';
import BottomNavigation from '@/components/layout/BottomNavigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  ShoppingCart, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Store,
  Package,
  CreditCard,
  Clock,
  DollarSign
} from 'lucide-react';

interface OptimizedOrder {
  retailerId: number;
  retailerName: string;
  items: any[];
  totalCost: number;
  orderId?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  estimatedDelivery?: string;
}

const AutoOrder: React.FC = () => {
  const { toast } = useToast();
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const listId = searchParams.get('listId');
  const mode = searchParams.get('mode') || 'online';
  
  const navigate = (path: string) => {
    window.location.href = path;
  };
  
  const [currentStep, setCurrentStep] = useState(0);
  const [orderResults, setOrderResults] = useState<OptimizedOrder | null>(null);
  const [multiStoreOrders, setMultiStoreOrders] = useState<OptimizedOrder[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<'single' | 'best-value' | 'balanced'>('single');

  // Fetch shopping list
  const { data: shoppingList } = useQuery({
    queryKey: [`/api/shopping-lists/${listId}`],
    enabled: !!listId,
  });

  // Get optimization plans
  const singleStoreMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/shopping-lists/single-store', {
        shoppingListId: parseInt(listId || '1')
      });
      return response.json();
    }
  });

  const bestValueMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/shopping-lists/best-value', {
        shoppingListId: parseInt(listId || '1')
      });
      return response.json();
    }
  });

  const balancedMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/shopping-lists/balanced', {
        shoppingListId: parseInt(listId || '1')
      });
      return response.json();
    }
  });

  // Place order mutation
  const placeOrderMutation = useMutation({
    mutationFn: async (orderData: {
      retailerId: number;
      items: any[];
      mode: string;
      customerInfo: any;
    }) => {
      const response = await apiRequest('POST', `/api/retailers/${orderData.retailerId}/orders`, {
        items: orderData.items,
        mode: orderData.mode,
        customerInfo: orderData.customerInfo,
        shoppingListId: listId
      });
      return response.json();
    }
  });

  // Load optimization plans on component mount
  useEffect(() => {
    if (listId) {
      setCurrentStep(1);
      Promise.all([
        singleStoreMutation.mutateAsync(),
        bestValueMutation.mutateAsync(),
        balancedMutation.mutateAsync()
      ]).then(() => {
        setCurrentStep(2);
      }).catch((error) => {
        console.error('Error loading optimization plans:', error);
        setCurrentStep(0);
      });
    }
  }, [listId]);

  const handlePlaceOrders = async () => {
    setCurrentStep(3);

    const customerInfo = {
      name: "John Doe", // In real app, get from user profile
      email: "johndoe@example.com",
      address: "123 Main St, Anytown, USA",
      phone: "555-123-4567"
    };

    try {
      if (selectedPlan === 'single') {
        // Single store order
        const planData = singleStoreMutation.data;
        if (!planData) throw new Error('No single store plan available');

        const orderResult = await placeOrderMutation.mutateAsync({
          retailerId: planData.retailerId,
          items: planData.items,
          mode,
          customerInfo
        });

        setOrderResults({
          retailerId: planData.retailerId,
          retailerName: planData.retailerName,
          items: planData.items,
          totalCost: planData.totalCost,
          orderId: orderResult.orderId,
          status: 'completed',
          estimatedDelivery: orderResult.estimatedDelivery
        });

      } else {
        // Multi-store orders (best-value or balanced)
        const planData = selectedPlan === 'best-value' ? bestValueMutation.data : balancedMutation.data;
        if (!planData?.stores) throw new Error('No multi-store plan available');

        const orderPromises = planData.stores.map(async (store: any) => {
          try {
            const orderResult = await placeOrderMutation.mutateAsync({
              retailerId: store.retailerId,
              items: store.items,
              mode,
              customerInfo
            });

            return {
              retailerId: store.retailerId,
              retailerName: store.retailerName,
              items: store.items,
              totalCost: store.subtotal,
              orderId: orderResult.orderId,
              status: 'completed' as const,
              estimatedDelivery: orderResult.estimatedDelivery
            };
          } catch (error) {
            console.error(`Order failed for ${store.retailerName}:`, error);
            return {
              retailerId: store.retailerId,
              retailerName: store.retailerName,
              items: store.items,
              totalCost: store.subtotal,
              status: 'failed' as const
            };
          }
        });

        const results = await Promise.all(orderPromises);
        setMultiStoreOrders(results);
      }

      setCurrentStep(4);
      toast({
        title: "Orders Placed Successfully",
        description: `Your ${selectedPlan} plan orders have been submitted`
      });

    } catch (error: any) {
      console.error('Order placement error:', error);
      toast({
        title: "Order Failed",
        description: error.message || "Failed to place orders",
        variant: "destructive"
      });
      setCurrentStep(2);
    }
  };

  const steps = [
    "Initializing",
    "Loading optimization plans", 
    "Choose your plan",
    "Placing orders",
    "Orders completed"
  ];

  const renderPlanSelection = () => {
    const plans = [
      {
        key: 'single',
        title: 'Single Store',
        data: singleStoreMutation.data,
        description: 'One stop shopping at the best store'
      },
      {
        key: 'best-value', 
        title: 'Best Value',
        data: bestValueMutation.data,
        description: 'Split orders for maximum savings'
      },
      {
        key: 'balanced',
        title: 'Balanced',
        data: balancedMutation.data,
        description: 'Balance between price and convenience'
      }
    ];

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Choose Your Shopping Plan</h3>
        <div className="grid gap-4">
          {plans.map((plan) => (
            <Card 
              key={plan.key}
              className={`cursor-pointer border-2 transition-colors ${
                selectedPlan === plan.key ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedPlan(plan.key as any)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      selectedPlan === plan.key ? 'border-primary bg-primary' : 'border-gray-300'
                    }`} />
                    <div>
                      <h4 className="font-medium">{plan.title}</h4>
                      <p className="text-sm text-gray-600">{plan.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      ${plan.data ? (plan.data.totalCost / 100).toFixed(2) : '0.00'}
                    </div>
                    {plan.data?.stores && (
                      <div className="text-sm text-gray-500">
                        {plan.data.stores.length} stores
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <Button 
          onClick={handlePlaceOrders}
          className="w-full"
          disabled={!selectedPlan}
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          Place Orders - {selectedPlan === 'single' ? '1 Store' : `${selectedPlan === 'best-value' ? bestValueMutation.data?.stores?.length || 0 : balancedMutation.data?.stores?.length || 0} Stores`}
        </Button>
      </div>
    );
  };

  const renderOrderResults = () => {
    if (selectedPlan === 'single' && orderResults) {
      return (
        <div className="space-y-4">
          <div className="text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-xl font-semibold text-green-700">Order Placed Successfully!</h3>
          </div>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold">{orderResults.retailerName}</h4>
                <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  Confirmed
                </span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Order ID:</span>
                  <span className="font-mono">{orderResults.orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Items:</span>
                  <span>{orderResults.items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total:</span>
                  <span className="font-semibold">${(orderResults.totalCost / 100).toFixed(2)}</span>
                </div>
                {orderResults.estimatedDelivery && (
                  <div className="flex justify-between">
                    <span>Estimated Delivery:</span>
                    <span>{orderResults.estimatedDelivery}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (multiStoreOrders.length > 0) {
      const totalCost = multiStoreOrders.reduce((sum, order) => sum + order.totalCost, 0);
      const successfulOrders = multiStoreOrders.filter(order => order.status === 'completed');
      
      return (
        <div className="space-y-4">
          <div className="text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-xl font-semibold text-green-700">
              {successfulOrders.length} of {multiStoreOrders.length} Orders Placed Successfully!
            </h3>
          </div>

          <div className="grid gap-3">
            {multiStoreOrders.map((order, index) => (
              <Card key={index} className={order.status === 'failed' ? 'border-red-200' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{order.retailerName}</h4>
                    <span className={`text-sm px-2 py-1 rounded-full ${
                      order.status === 'completed' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {order.status === 'completed' ? 'Confirmed' : 'Failed'}
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    {order.orderId && (
                      <div className="flex justify-between">
                        <span>Order ID:</span>
                        <span className="font-mono">{order.orderId}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Items:</span>
                      <span>{order.items.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total:</span>
                      <span className="font-semibold">${(order.totalCost / 100).toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-primary">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Grand Total:</span>
                <span className="text-xl font-bold text-primary">
                  ${(totalCost / 100).toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
      <Header title="Smart Auto-Order" />
      
      <main className="flex-1 overflow-y-auto p-4">
        {/* Progress indicator */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Step {currentStep + 1} of {steps.length}</span>
            <span className="text-sm text-gray-500">{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
          </div>
          <Progress value={((currentStep + 1) / steps.length) * 100} className="h-2" />
          <p className="text-sm text-gray-600 mt-2">{steps[currentStep]}</p>
        </div>

        {/* Content based on current step */}
        {currentStep === 0 && (
          <Card>
            <CardContent className="p-6 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Initializing Smart Order</h3>
              <p className="text-gray-600">Setting up your optimized shopping experience...</p>
            </CardContent>
          </Card>
        )}

        {currentStep === 1 && (
          <Card>
            <CardContent className="p-6 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Analyzing Best Deals</h3>
              <p className="text-gray-600">Comparing prices across stores and finding the best options for your list...</p>
            </CardContent>
          </Card>
        )}

        {currentStep === 2 && renderPlanSelection()}

        {currentStep === 3 && (
          <Card>
            <CardContent className="p-6 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Placing Your Orders</h3>
              <p className="text-gray-600">
                {selectedPlan === 'single' 
                  ? 'Submitting your order to the selected retailer...'
                  : 'Submitting orders to multiple retailers for best value...'}
              </p>
            </CardContent>
          </Card>
        )}

        {currentStep === 4 && renderOrderResults()}

        {/* Action buttons */}
        {currentStep === 4 && (
          <div className="mt-6 space-y-3">
            <Button 
              onClick={() => navigate('/shopping-list')}
              className="w-full"
            >
              Back to Shopping Lists
            </Button>
            <Button 
              onClick={() => navigate('/dashboard')}
              variant="outline"
              className="w-full"
            >
              View Dashboard
            </Button>
          </div>
        )}

        {/* Error state */}
        {(singleStoreMutation.isError || bestValueMutation.isError || balancedMutation.isError) && (
          <Card className="mt-4 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center text-red-600">
                <AlertCircle className="h-5 w-5 mr-2" />
                <span className="text-sm">Failed to load optimization plans. Please try again.</span>
              </div>
              <Button 
                onClick={() => navigate('/shopping-list')}
                variant="outline" 
                className="w-full mt-3"
              >
                Go Back
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      <BottomNavigation activeTab="lists" />
    </div>
  );
};

export default AutoOrder;
