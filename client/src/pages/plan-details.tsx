
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import { 
  ArrowLeft, 
  Store, 
  ShoppingCart,
  Clock,
  DollarSign,
  MapPin,
  Package,
  CheckCircle2,
  ArrowRight,
  Navigation
} from 'lucide-react';
import Header from '@/components/layout/Header';
import BottomNavigation from '@/components/layout/BottomNavigation';

const PlanDetails: React.FC = () => {
  const [location, navigate] = useLocation();
  const { toast } = useToast();

  // Get URL parameters
  const params = new URLSearchParams(window.location.search);
  const listId = params.get('listId');
  const planType = params.get('planType');
  const mode = params.get('mode') || 'instore';

  console.log('Plan Details loaded with params:', { listId, planType, mode });

  const [planData, setPlanData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch shopping list to verify we have items before generating plans
  const { data: shoppingList } = useQuery({
    queryKey: [`/api/shopping-lists/${listId}`],
    enabled: !!listId,
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/shopping-lists/${listId}`);
      return response.json();
    }
  });

  // Fetch plan data based on type
  const fetchPlanData = async () => {
    if (!listId || !planType) {
      setIsLoading(false);
      return;
    }

    // Verify we have shopping list items before generating plan
    if (!shoppingList?.items || shoppingList.items.length === 0) {
      console.log('No shopping list items found, cannot generate plan');
      toast({
        title: "No Items Found",
        description: "Please add items to your shopping list before viewing plans",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      let endpoint = '';
      switch (planType) {
        case 'single-store':
          endpoint = '/api/shopping-lists/single-store';
          break;
        case 'best-value':
          endpoint = '/api/shopping-lists/best-value';
          break;
        case 'balanced':
          endpoint = '/api/shopping-lists/balanced';
          break;
        default:
          throw new Error('Invalid plan type');
      }

      console.log(`Generating ${planType} plan for shopping list ${listId} with ${shoppingList.items.length} items`);

      const response = await apiRequest('POST', endpoint, {
        shoppingListId: parseInt(listId)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to generate plan: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Plan data received:', data);
      setPlanData(data);
    } catch (error) {
      console.error('Error fetching plan data:', error);
      toast({
        title: "Error",
        description: "Failed to load plan details. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch plan data when we have shopping list data
    if (shoppingList) {
      fetchPlanData();
    }
  }, [listId, planType, shoppingList]);

  const getPlanTitle = () => {
    switch (planType) {
      case 'single-store':
        return 'Single Store Plan';
      case 'best-value':
        return 'Best Value Plan';
      case 'balanced':
        return 'Balanced Plan';
      default:
        return 'Shopping Plan';
    }
  };

  const getPlanDescription = () => {
    switch (planType) {
      case 'single-store':
        return 'Shop everything at one convenient location for fastest shopping';
      case 'best-value':
        return 'Maximum savings across multiple stores with best deals';
      case 'balanced':
        return 'Good savings with reasonable convenience and time efficiency';
      default:
        return 'Optimized shopping plan';
    }
  };

  const getPlanIcon = () => {
    switch (planType) {
      case 'single-store':
        return <Clock className="h-6 w-6 text-blue-600" />;
      case 'best-value':
        return <DollarSign className="h-6 w-6 text-green-600" />;
      case 'balanced':
        return <Package className="h-6 w-6 text-purple-600" />;
      default:
        return <Store className="h-6 w-6 text-gray-600" />;
    }
  };

  const getPlanColor = () => {
    switch (planType) {
      case 'single-store':
        return 'blue';
      case 'best-value':
        return 'green';
      case 'balanced':
        return 'purple';
      default:
        return 'gray';
    }
  };

  const handleProceedToShopping = () => {
    const planDataParam = encodeURIComponent(JSON.stringify({
      ...planData,
      planType: getPlanTitle(),
      mode: mode
    }));

    if (mode === 'online') {
      navigate(`/auto-order?listId=${listId}&planData=${planDataParam}`);
    } else {
      navigate(`/shopping-route?listId=${listId}&planData=${planDataParam}&mode=${mode}`);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
        <Header title="Plan Details" />
        <main className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="h-8 w-8 border-4 border-t-primary border-gray-200 rounded-full animate-spin mx-auto mb-4"></div>
              <p>Loading plan details...</p>
            </div>
          </div>
        </main>
        <BottomNavigation activeTab="lists" />
      </div>
    );
  }

  if (!planData) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
        <Header title="Plan Details" />
        <main className="flex-1 overflow-y-auto p-4">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-gray-500 mb-4">Unable to load plan details</p>
              <Button onClick={() => navigate('/shopping-list')}>
                Go Back to Shopping List
              </Button>
            </CardContent>
          </Card>
        </main>
        <BottomNavigation activeTab="lists" />
      </div>
    );
  }

  const color = getPlanColor();

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
      <Header title="Plan Details" />

      <main className="flex-1 overflow-y-auto p-4 pb-20">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate('/shopping-list')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to List
        </Button>

        {/* Plan Type Selection */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Choose Your Plan</h3>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={planType === 'single-store' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                const newParams = new URLSearchParams(window.location.search);
                newParams.set('planType', 'single-store');
                navigate(`/plan-details?${newParams.toString()}`);
              }}
              className="text-xs h-8"
            >
              <Clock className="h-3 w-3 mr-1" />
              Single Store
            </Button>
            <Button
              variant={planType === 'best-value' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                const newParams = new URLSearchParams(window.location.search);
                newParams.set('planType', 'best-value');
                navigate(`/plan-details?${newParams.toString()}`);
              }}
              className="text-xs h-8"
            >
              <DollarSign className="h-3 w-3 mr-1" />
              Best Value
            </Button>
            <Button
              variant={planType === 'balanced' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                const newParams = new URLSearchParams(window.location.search);
                newParams.set('planType', 'balanced');
                navigate(`/plan-details?${newParams.toString()}`);
              }}
              className="text-xs h-8"
            >
              <Package className="h-3 w-3 mr-1" />
              Balanced
            </Button>
          </div>
        </div>

        {/* Plan Header */}
        <Card className={`mb-4 border-${color}-200 bg-${color}-50`}>
          <CardContent className="p-4">
            <div className="flex items-center mb-3">
              <div className={`bg-${color}-100 p-3 rounded-lg mr-4`}>
                {getPlanIcon()}
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-bold text-gray-900">{getPlanTitle()}</h1>
                <p className="text-sm text-gray-600 mt-1">{getPlanDescription()}</p>
                {shoppingList && (
                  <p className="text-xs text-gray-500 mt-1">
                    Based on {shoppingList.items?.length || 0} items from "{shoppingList.name}"
                  </p>
                )}
              </div>
            </div>

            {/* Plan Summary Stats */}
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="text-center">
                <div className="font-bold text-lg">${(planData.totalCost / 100).toFixed(2)}</div>
                <div className="text-xs text-gray-600">Total Cost</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-lg">{planData.estimatedTime || 35}min</div>
                <div className="text-xs text-gray-600">Est. Time</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-lg">{planData.storeCount || planData.stores?.length || 1}</div>
                <div className="text-xs text-gray-600">Store{(planData.storeCount || planData.stores?.length || 1) > 1 ? 's' : ''}</div>
              </div>
            </div>

            {/* Savings Display */}
            {planData.savings > 0 && (
              <div className={`mt-4 p-3 bg-${color}-100 rounded-lg`}>
                <div className="flex justify-between items-center">
                  <span className="font-medium">You Save:</span>
                  <span className={`font-bold text-${color}-600`}>${(planData.savings / 100).toFixed(2)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Store Breakdown */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Store Breakdown</h3>
          
          {planData.stores ? (
            // Multi-store plan
            planData.stores.map((store: any, index: number) => (
              <Card key={store.retailerId} className="border-gray-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full bg-${color}-600 text-white flex items-center justify-center text-sm font-bold mr-3`}>
                        {index + 1}
                      </div>
                      <div>
                        <CardTitle className="text-base">{store.retailerName}</CardTitle>
                        <p className="text-sm text-gray-500">{store.address}</p>
                      </div>
                    </div>
                    <Badge variant="outline">{store.items?.length || 0} items</Badge>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span className="font-semibold">${(store.subtotal / 100).toFixed(2)}</span>
                    </div>
                  </div>

                  <Separator className="my-3" />

                  {/* Items List */}
                  <div className="space-y-2">
                    <h5 className="font-medium text-sm">Items to buy here:</h5>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {store.items?.slice(0, 5).map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-sm bg-gray-50 rounded p-2">
                          <span>{item.productName} (x{item.quantity})</span>
                          <span className="font-medium">${(item.price / 100).toFixed(2)}</span>
                        </div>
                      ))}
                      {store.items?.length > 5 && (
                        <div className="text-xs text-gray-500 text-center">
                          +{store.items.length - 5} more items
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            // Single store plan
            <Card className="border-gray-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Store className="h-5 w-5 text-gray-600 mr-3" />
                    <div>
                      <CardTitle className="text-base">{planData.retailerName}</CardTitle>
                      <p className="text-sm text-gray-500">{planData.address}</p>
                    </div>
                  </div>
                  <Badge variant="outline">{planData.items?.length || planData.totalItems || 0} items</Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span>Total Cost:</span>
                    <span className="font-semibold">${(planData.totalCost / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Availability Rate:</span>
                    <span>{Math.round((planData.availabilityRate || 0.95) * 100)}%</span>
                  </div>
                </div>

                <Separator className="my-3" />

                {/* Items Preview */}
                <div className="space-y-2">
                  <h5 className="font-medium text-sm">Items in this plan:</h5>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {planData.items?.slice(0, 5).map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm bg-gray-50 rounded p-2">
                        <span>{item.productName} (x{item.quantity})</span>
                        <span className="font-medium">${(item.price / 100).toFixed(2)}</span>
                      </div>
                    )) || (
                      <div className="text-sm text-gray-500 text-center p-4">
                        Item details will be loaded when you proceed
                      </div>
                    )}
                    {planData.items?.length > 5 && (
                      <div className="text-xs text-gray-500 text-center">
                        +{planData.items.length - 5} more items
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 space-y-3">
          <Button 
            className={`w-full h-12 font-semibold text-base bg-${color}-600 hover:bg-${color}-700 text-white border-2 border-${color}-600 shadow-md transition-all`}
            onClick={handleProceedToShopping}
          >
            {mode === 'online' ? (
              <>
                <ShoppingCart className="h-5 w-5 mr-2" />
                Order Online
              </>
            ) : (
              <>
                <Navigation className="h-5 w-5 mr-2" />
                Shop In-Store
              </>
            )}
          </Button>

          <Button 
            variant="outline" 
            className="w-full h-12 font-semibold text-base"
            onClick={() => navigate('/shopping-list')}
          >
            Choose Different Plan
          </Button>
        </div>

        {/* Additional Info */}
        <Card className="mt-4 bg-gray-50">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium text-gray-800 mb-1">Next Steps</div>
                <div className="text-gray-600">
                  {mode === 'online' 
                    ? "You'll be guided through the online ordering process for each store" 
                    : "You'll get an optimized in-store shopping route with aisle-by-aisle navigation"
                  }
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <BottomNavigation activeTab="lists" />
    </div>
  );
};

export default PlanDetails;
