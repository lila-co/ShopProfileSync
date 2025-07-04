import React, { useState, useEffect } from 'react';
import Header from './components/layout/Header';
import BottomNavigation from './components/layout/BottomNavigation';
import { Card, CardContent } from './components/ui/card';
import { Button } from './components/ui/button';
import { Progress } from './components/ui/progress';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from './lib/queryClient';
import { useToast } from './hooks/use-toast';
import { useLocation } from 'wouter';
import { 
  ShoppingCart, 
  Loader2, 
  CheckCircle, 
  Store, 
  DollarSign,
  Clock,
  Package,
  ArrowRight,
  AlertCircle
} from 'lucide-react';

interface OptimizedOrder {
  retailerId: number;
  retailerName: string;
  items: any[];
  totalCost: number;
  estimatedTime: number;
  orderUrl?: string;
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

  const steps = [
    'Analyzing your shopping list',
    'Finding best prices across stores',
    'Optimizing your shopping plan',
    'Preparing orders'
  ];

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
    },
    onError: (error) => {
      console.error('Single store error:', error);
      toast({
        title: "Error",
        description: "Failed to get single store optimization",
        variant: "destructive"
      });
    }
  });

  const bestValueMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/shopping-lists/best-value', {
        shoppingListId: parseInt(listId || '1')
      });
      return response.json();
    },
    onError: (error) => {
      console.error('Best value error:', error);
      toast({
        title: "Error", 
        description: "Failed to get best value optimization",
        variant: "destructive"
      });
    }
  });

  const balancedMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/shopping-lists/balanced', {
        shoppingListId: parseInt(listId || '1')
      });
      return response.json();
    },
    onError: (error) => {
      console.error('Balanced error:', error);
      toast({
        title: "Error",
        description: "Failed to get balanced optimization", 
        variant: "destructive"
      });
    }
  });

  // Start the optimization process
  useEffect(() => {
    let startTimer: NodeJS.Timeout;

    if (listId && shoppingList && currentStep === 0) {
      startTimer = setTimeout(() => {
        console.log('Starting optimization process...');

        // Step 1: Start analyzing
        setCurrentStep(1);

        // Step 2: Move to price finding after 2 seconds
        const step2Timer = setTimeout(() => {
          console.log('Moving to step 2 - Finding best prices');
          setCurrentStep(2);

          // Start the optimization mutations
          singleStoreMutation.mutate();
          bestValueMutation.mutate();
          balancedMutation.mutate();
        }, 3000);

        // Step 3: Move to optimization after 4 seconds
        const step3Timer = setTimeout(() => {
          console.log('Moving to step 3 - Optimizing plan');
          setCurrentStep(3);
        }, 3000);

        // Step 4: Move to final results after another 3 seconds (increased delay)
        const step4Timer = setTimeout(() => {
          console.log('Moving to step 4 - Completing optimization');
          setCurrentStep(4);
        }, 3000);

        return () => {
          clearTimeout(step2Timer);
          clearTimeout(step3Timer);
          clearTimeout(step4Timer);
        };
      }, 500); // 500ms debounce
    }

    return () => {
      if (startTimer) {
        clearTimeout(startTimer);
      }
    };
  }, [listId, shoppingList, currentStep]);

  const handlePlaceOrder = async () => {
    if (!orderResults) return;

    try {
      toast({
        title: "Order Placed",
        description: `Your order has been placed at ${orderResults.retailerName}`,
      });

      // Navigate to shop page to complete the order
      navigate(`/shop?retailerId=${orderResults.retailerId}&listId=${listId}&mode=${mode}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to place order",
        variant: "destructive"
      });
    }
  };

  const isLoading = currentStep < 4 && !orderResults;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
      <Header title="Smart Order" />

      <main className="flex-1 overflow-y-auto p-4 pb-24">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Smart Order</h1>
          <p className="text-gray-600 text-sm">
            AI-powered optimization to get you the best deals
          </p>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Initializing Smart Order</h3>
                  <p className="text-sm text-gray-600">
                    {steps[currentStep] || 'Processing...'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Progress value={progress} className="w-full" />
                  <p className="text-xs text-gray-500">
                    Step {Math.min(currentStep + 1, steps.length)} of {steps.length}
                  </p>
                </div>

                <div className="text-xs text-gray-400 space-y-1">
                  {steps.map((step, index) => (
                    <div 
                      key={index} 
                      className={`flex items-center space-x-2 ${
                        index <= currentStep ? 'text-primary' : 'text-gray-400'
                      }`}
                    >
                      {index < currentStep ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : index === currentStep ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <div className="h-3 w-3 rounded-full border border-current" />
                      )}
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : orderResults ? (
          <div className="space-y-4">
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <div>
                    <h3 className="font-semibold text-green-800">Order Optimized!</h3>
                    <p className="text-sm text-green-600">Found the best deals for your list</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Recommended Plan</h4>
                    <Store className="h-5 w-5 text-gray-400" />
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-blue-800">{orderResults.retailerName}</span>
                      <span className="text-sm text-blue-600">{orderResults.items.length} items</span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <DollarSign className="h-4 w-4 mx-auto text-green-600 mb-1" />
                        <div className="font-medium">${(orderResults.totalCost / 100).toFixed(2)}</div>
                        <div className="text-xs text-gray-500">Total Cost</div>
                      </div>

                      <div className="text-center">
                        <Clock className="h-4 w-4 mx-auto text-blue-600 mb-1" />
                        <div className="font-medium">{orderResults.estimatedTime}min</div>
                        <div className="text-xs text-gray-500">Est. Time</div>
                      </div>

                      <div className="text-center">
                        <Package className="h-4 w-4 mx-auto text-purple-600 mb-1" />
                        <div className="font-medium">{orderResults.items.length}</div>
                        <div className="text-xs text-gray-500">Items</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h5 className="font-medium text-sm">Items in Order:</h5>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {orderResults.items.slice(0, 5).map((item, index) => (
                        <div key={index} className="flex justify-between text-sm bg-gray-50 rounded p-2">
                          <span>{item.productName} (x{item.quantity})</span>
                          <span className="font-medium">${(item.price / 100).toFixed(2)}</span>
                        </div>
                      ))}
                      {orderResults.items.length > 5 && (
                        <div className="text-xs text-gray-500 text-center">
                          +{orderResults.items.length - 5} more items
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                onClick={() => navigate(`/shopping-list`)}
                className="w-full"
              >
                Back to List
              </Button>

              <Button 
                onClick={handlePlaceOrder}
                className="w-full bg-primary hover:bg-primary/90"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Place Order
              </Button>
            </div>

            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium text-amber-800 mb-1">Next Steps</div>
                    <div className="text-amber-700">
                      You'll be redirected to complete your order at {orderResults.retailerName}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Unable to Create Order</h3>
              <p className="text-gray-600 mb-4">
                There was an issue optimizing your shopping list. Please try again.
              </p>
              <Button onClick={() => window.location.reload()}>
                Try Again
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