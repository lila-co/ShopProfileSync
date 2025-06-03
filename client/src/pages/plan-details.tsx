import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, MapPin, DollarSign, Clock, ShoppingCart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ShoppingItem {
  id: number;
  productName: string;
  quantity: number;
  unit: string;
  suggestedPrice: number;
  suggestedRetailer: {
    id: number;
    name: string;
    logoColor: string;
  };
}

interface PlanData {
  totalCost: number;
  estimatedTime: string;
  stores: Array<{
    retailer: {
      id: number;
      name: string;
      logoColor: string;
    };
    items: ShoppingItem[];
    subtotal: number;
  }>;
}

const PlanDetails: React.FC = () => {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const [selectedPlanType, setSelectedPlanType] = useState(
    searchParams.get('planType') || 'single-store'
  );

  const listId = searchParams.get('listId') || '1';

  // Fetch shopping list items
  const { data: shoppingItems, isLoading, error } = useQuery({
    queryKey: ['shopping-items', listId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/shopping-lists/${listId}`);
      const data = await response.json();
      return data.items || [];
    },
  });

  // Generate plan data based on shopping items and plan type
  const generatePlanData = (items: ShoppingItem[], planType: string): PlanData => {
    if (!items || items.length === 0) {
      return { totalCost: 0, estimatedTime: '0 min', stores: [] };
    }

    switch (planType) {
      case 'single-store':
        // Find the most common retailer
        const retailerCounts = items.reduce((acc, item) => {
          if (item.suggestedRetailer?.id) {
            const retailerId = item.suggestedRetailer.id;
            acc[retailerId] = (acc[retailerId] || 0) + 1;
          }
          return acc;
        }, {} as Record<number, number>);

        const retailerKeys = Object.keys(retailerCounts);
        if (retailerKeys.length === 0) {
          return { totalCost: 0, estimatedTime: '0 min', stores: [] };
        }

        const mostCommonRetailerId = retailerKeys.reduce((a, b) =>
          retailerCounts[Number(a)] > retailerCounts[Number(b)] ? a : b
        );

        const primaryRetailer = items.find(item => 
          item.suggestedRetailer?.id === Number(mostCommonRetailerId)
        )?.suggestedRetailer;

        if (!primaryRetailer) {
          return { totalCost: 0, estimatedTime: '0 min', stores: [] };
        }

        return {
          totalCost: items.reduce((sum, item) => sum + (item.suggestedPrice || 0) * item.quantity, 0),
          estimatedTime: '25-35 min',
          stores: [{
            retailer: primaryRetailer!,
            items: items,
            subtotal: items.reduce((sum, item) => sum + (item.suggestedPrice || 0) * item.quantity, 0)
          }]
        };

      case 'multi-store':
        // Group by retailer for best prices
        const storeGroups = items.reduce((acc, item) => {
          if (item.suggestedRetailer?.id) {
            const retailerId = item.suggestedRetailer.id;
            if (!acc[retailerId]) {
              acc[retailerId] = {
                retailer: item.suggestedRetailer,
                items: [],
                subtotal: 0
              };
            }
            acc[retailerId].items.push(item);
            acc[retailerId].subtotal += (item.suggestedPrice || 0) * item.quantity;
          }
          return acc;
        }, {} as Record<number, any>);

        return {
          totalCost: Object.values(storeGroups).reduce((sum: number, store: any) => sum + store.subtotal, 0),
          estimatedTime: '45-60 min',
          stores: Object.values(storeGroups)
        };

      case 'balanced':
        // Balance between convenience and savings
        const balancedStores = items.reduce((acc, item) => {
          if (item.suggestedRetailer?.id) {
            const retailerId = item.suggestedRetailer.id;
            if (!acc[retailerId]) {
              acc[retailerId] = {
                retailer: item.suggestedRetailer,
                items: [],
                subtotal: 0
              };
            }
            acc[retailerId].items.push(item);
            acc[retailerId].subtotal += (item.suggestedPrice || 0) * item.quantity;
          }
          return acc;
        }, {} as Record<number, any>);

        // Limit to 2 stores maximum for balance
        const topStores = Object.values(balancedStores)
          .sort((a: any, b: any) => b.subtotal - a.subtotal)
          .slice(0, 2);

        return {
          totalCost: topStores.reduce((sum: number, store: any) => sum + store.subtotal, 0),
          estimatedTime: '35-45 min',
          stores: topStores
        };

      default:
        return { totalCost: 0, estimatedTime: '0 min', stores: [] };
    }
  };

  const planData = generatePlanData(shoppingItems || [], selectedPlanType);

  const formatPrice = (price: number) => {
    return `$${(price / 100).toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading your shopping plan...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600">Error loading shopping list: {error.message}</div>
      </div>
    );
  }

  if (!shoppingItems || shoppingItems.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">No items found in shopping list</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/shopping-list')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Shopping List
        </Button>
        <h1 className="text-2xl font-bold">Shopping Plans</h1>
      </div>

      {/* Plan Type Selector */}
      <Tabs value={selectedPlanType} onValueChange={setSelectedPlanType} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="single-store">Single Store</TabsTrigger>
          <TabsTrigger value="multi-store">Multi-Store</TabsTrigger>
          <TabsTrigger value="balanced">Balanced</TabsTrigger>
        </TabsList>

        <TabsContent value="single-store" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Single Store Plan
              </CardTitle>
              <CardDescription>
                Shop everything at one store for maximum convenience
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{formatPrice(planData.totalCost)}</div>
                  <div className="text-sm text-gray-500">Total Cost</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{planData.estimatedTime}</div>
                  <div className="text-sm text-gray-500">Est. Time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{planData.stores.length}</div>
                  <div className="text-sm text-gray-500">Store(s)</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="multi-store" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Multi-Store Plan
              </CardTitle>
              <CardDescription>
                Get the best prices by shopping at multiple stores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{formatPrice(planData.totalCost)}</div>
                  <div className="text-sm text-gray-500">Total Cost</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{planData.estimatedTime}</div>
                  <div className="text-sm text-gray-500">Est. Time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{planData.stores.length}</div>
                  <div className="text-sm text-gray-500">Store(s)</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Balanced Plan
              </CardTitle>
              <CardDescription>
                Balance between savings and convenience
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{formatPrice(planData.totalCost)}</div>
                  <div className="text-sm text-gray-500">Total Cost</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{planData.estimatedTime}</div>
                  <div className="text-sm text-gray-500">Est. Time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{planData.stores.length}</div>
                  <div className="text-sm text-gray-500">Store(s)</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex gap-4 mb-6">
        <div className="space-y-2 w-full">
          <Button 
            className="w-full"
            size="lg"
            onClick={() => {
              console.log('Start Shopping Route clicked');
              console.log('Current planData:', planData);
              console.log('Selected plan type:', selectedPlanType);

              if (!planData || !planData.stores || planData.stores.length === 0) {
                toast({
                  title: "No Plan Data",
                  description: "Please select a plan type first",
                  variant: "destructive"
                });
                return;
              }

              const enhancedPlanData = {
                ...planData,
                planType: selectedPlanType === 'single-store' ? 'Single Store' :
                         selectedPlanType === 'multi-store' ? 'Multi-Store Best Value' :
                         selectedPlanType === 'balanced' ? 'Balanced Plan' : 'Shopping Plan',
                selectedPlanType: selectedPlanType,
                listId: listId
              };

              console.log('Enhanced plan data being sent:', enhancedPlanData);

              const params = new URLSearchParams({
                listId: listId || '1',
                mode: 'instore',
                planData: encodeURIComponent(JSON.stringify(enhancedPlanData))
              });

              const url = `/shopping-route?${params.toString()}`;
              console.log('Navigating to:', url);
              console.log('Full URL will be:', window.location.origin + url);

              // Try both navigation methods
              try {
                navigate(url);
                // Fallback after a short delay
                setTimeout(() => {
                  if (window.location.pathname !== '/shopping-route') {
                    console.log('Navigation failed, using window.location');
                    window.location.href = url;
                  }
                }, 500);
              } catch (error) {
                console.error('Navigation error:', error);
                window.location.href = url;
              }
            }}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Start Shopping Route
          </Button>
        </div>
      </div>

      {/* Store Details */}
      <div className="space-y-4">
        {planData.stores.map((store, index) => (
          <Card key={store.retailer.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className={`w-4 h-4 rounded-full bg-${store.retailer.logoColor}-500`}
                  />
                  <span>{store.retailer.name}</span>
                  <Badge variant="secondary">{store.items.length} items</Badge>
                </div>
                <div className="text-lg font-bold">{formatPrice(store.subtotal)}</div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {store.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                    <div className="flex-1">
                      <div className="font-medium">{item.productName}</div>
                      <div className="text-sm text-gray-500">
                        {item.quantity} {item.unit.toLowerCase()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatPrice(item.suggestedPrice * item.quantity)}</div>
                      <div className="text-sm text-gray-500">{formatPrice(item.suggestedPrice)} each</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PlanDetails;