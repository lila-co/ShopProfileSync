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
import BottomNavigation from '@/components/layout/BottomNavigation';

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

  // Fetch deals for price comparison
  const { data: deals } = useQuery({
    queryKey: ['/api/deals'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Filter deals by retailer for current plan
  const getDealsForRetailer = (retailerId: number) => {
    return deals?.filter((deal: any) => deal.retailerId === retailerId) || [];
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
    <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 p-4">
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

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 pb-20 space-y-6">

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
          <div className="flex gap-3">
            <Button 
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg"
              size="lg"
              onClick={() => {
                console.log('Start Shopping Route clicked with planData:', planData);

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

                console.log('Enhanced plan data for navigation:', enhancedPlanData);

                // Store in sessionStorage as primary method
                sessionStorage.setItem('shoppingPlanData', JSON.stringify(enhancedPlanData));
                sessionStorage.setItem('shoppingListId', listId);
                sessionStorage.setItem('shoppingMode', 'instore');

                // Navigate with simple parameters to avoid URL corruption
                const targetUrl = `/shopping-route?listId=${listId}&mode=instore&fromPlan=true`;
                console.log('Navigating to:', targetUrl);

                // Use the navigate function instead of window.location for better routing
                navigate(targetUrl);

                toast({
                  title: "Loading Shopping Route",
                  description: "Preparing your optimized shopping route...",
                  duration: 2000
                });
              }}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Begin Shopping
            </Button>
            <Button 
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold shadow-lg"
              size="lg"
              onClick={async () => {
                console.log('Order Online clicked with planData:', planData);

                if (!planData || !planData.stores || planData.stores.length === 0) {
                  toast({
                    title: "No Plan Data",
                    description: "Please select a plan type first",
                    variant: "destructive"
                  });
                  return;
                }

                try {
                  toast({
                    title: "Preparing Order",
                    description: "Adding items to retailer cart with SmartCart benefits...",
                    duration: 3000
                  });

                  // For multi-store plans, handle each store separately
                  for (const store of planData.stores) {
                    const affiliateData = {
                      source: 'smartcart',
                      planId: `${listId}-${Date.now()}`,
                      affiliateId: 'smartcart-affiliate-001',
                      trackingParams: {
                        listId,
                        planType: selectedPlanType,
                        totalItems: store.items.length,
                        estimatedValue: store.subtotal,
                        retailerId: store.retailer.id
                      }
                    };

                    // Call API to add items to retailer cart with affiliate attribution
                    const response = await fetch('/api/retailers/add-to-cart', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        retailerId: store.retailer.id,
                        items: store.items.map(item => ({
                          productName: item.productName,
                          quantity: item.quantity,
                          unit: item.unit,
                          estimatedPrice: item.suggestedPrice
                        })),
                        affiliateData,
                        userInfo: {
                          userId: 1, // This would come from auth context in production
                          listId: listId
                        }
                      })
                    });

                    const result = await response.json();

                    if (response.ok) {
                      // Generate retailer-specific URL with affiliate tracking
                      let retailerUrl = '';
                      const affiliateParams = new URLSearchParams({
                        utm_source: 'smartcart',
                        utm_medium: 'affiliate',
                        utm_campaign: `plan-${selectedPlanType}`,
                        utm_content: `list-${listId}`,
                        affiliate_id: 'smartcart-001',
                        cart_token: result.cartToken || '',
                        tracking_id: result.trackingId || `${listId}-${Date.now()}`
                      });

                      // Generate retailer-specific URLs
                      switch (store.retailer.name.toLowerCase()) {
                        case 'walmart':
                          retailerUrl = `https://www.walmart.com/cart?${affiliateParams.toString()}`;
                          break;
                        case 'target':
                          retailerUrl = `https://www.target.com/cart?${affiliateParams.toString()}`;
                          break;
                        case 'kroger':
                          retailerUrl = `https://www.kroger.com/cart?${affiliateParams.toString()}`;
                          break;
                        case 'whole foods':
                          retailerUrl = `https://www.wholefoodsmarket.com/cart?${affiliateParams.toString()}`;
                          break;
                        default:
                          retailerUrl = `https://www.${store.retailer.name.toLowerCase().replace(/\s+/g, '')}.com/cart?${affiliateParams.toString()}`;
                      }

                      console.log(`Opening ${store.retailer.name} cart with pre-populated items:`, retailerUrl);

                      // Open retailer website in new tab with pre-populated cart
                      window.open(retailerUrl, '_blank');

                      toast({
                        title: `${store.retailer.name} Cart Ready!`,
                        description: `${store.items.length} items added with SmartCart affiliate benefits`,
                        duration: 4000
                      });

                      // Small delay between stores for multi-store plans
                      if (planData.stores.length > 1) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                      }
                    } else {
                      throw new Error(result.message || `Failed to add items to ${store.retailer.name} cart`);
                    }
                  }

                  // Final success message
                  const storeCount = planData.stores.length;
                  toast({
                    title: "All Carts Ready!",
                    description: `${storeCount} retailer ${storeCount > 1 ? 'carts' : 'cart'} prepared with your items and affiliate benefits`,
                    duration: 5000
                  });

                } catch (error) {
                  console.error('Error preparing retailer cart:', error);
                  toast({
                    title: "Cart Preparation Failed",
                    description: error.message || "Unable to add items to retailer cart. Please try again.",
                    variant: "destructive"
                  });
                }
              }}
            >
              <MapPin className="h-4 w-4 mr-2" />
              Order Online
            </Button>
          </div>
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
      </main>

      <BottomNavigation activeTab="shop" />
    </div>
  );
};

export default PlanDetails;