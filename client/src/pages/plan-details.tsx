
import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Clock, DollarSign, ShoppingCart, MapPin, ArrowRight, Store, Users, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import BottomNavigation from '@/components/layout/BottomNavigation';
import Header from '@/components/layout/Header';

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

type PlanType = 'single-store' | 'multi-store' | 'balanced';

function generatePlanData(shoppingList: { items: ShoppingItem[] } | null, planType: PlanType = 'single-store'): PlanData | null {
  console.log('generatePlanData called with:', { items: shoppingList?.items || [], planType, itemsLength: shoppingList?.items?.length || 0 });
  
  if (!shoppingList || !shoppingList.items || shoppingList.items.length === 0) {
    console.log('generatePlanData received invalid items:', shoppingList?.items || []);
    return null;
  }

  const items = shoppingList.items;
  
  // Group items by retailer
  const storeGroups = new Map<number, { retailer: any; items: ShoppingItem[]; subtotal: number }>();
  
  items.forEach(item => {
    if (!item.suggestedRetailer) return;
    
    const retailerId = item.suggestedRetailer.id;
    if (!storeGroups.has(retailerId)) {
      storeGroups.set(retailerId, {
        retailer: item.suggestedRetailer,
        items: [],
        subtotal: 0
      });
    }
    
    const group = storeGroups.get(retailerId)!;
    group.items.push(item);
    group.subtotal += (item.suggestedPrice || 0) * item.quantity;
  });

  const stores = Array.from(storeGroups.values());
  
  // Apply plan type logic
  let finalStores = stores;
  if (planType === 'single-store' && stores.length > 1) {
    // Find store with most items or lowest total cost
    finalStores = [stores.reduce((best, current) => {
      return current.items.length > best.items.length ? current : best;
    })];
  } else if (planType === 'balanced') {
    // Keep all stores but optimize for convenience
    finalStores = stores.sort((a, b) => b.items.length - a.items.length);
  }

  const totalCost = finalStores.reduce((sum, store) => sum + store.subtotal, 0);
  const estimatedTime = `${Math.max(15, finalStores.length * 20 + finalStores.reduce((sum, store) => sum + store.items.length * 2, 0))} minutes`;

  return {
    totalCost,
    estimatedTime,
    stores: finalStores
  };
}

export default function PlanDetails() {
  const [, navigate] = useLocation();
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('single-store');
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const { toast } = useToast();

  // Get listId from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const listId = urlParams.get('listId') || '1';

  // Fetch shopping list data
  const { data: shoppingList, isLoading, error } = useQuery({
    queryKey: ['shopping-list', listId],
    queryFn: () => apiRequest(`/api/shopping-lists/${listId}`),
    enabled: !!listId,
  });

  console.log('Shopping list data structure:', shoppingList);

  // Generate plan data when shopping list changes
  useEffect(() => {
    if (shoppingList && shoppingList.items) {
      const generated = generatePlanData(shoppingList, selectedPlan);
      setPlanData(generated);
    }
  }, [shoppingList, selectedPlan]);

  const handlePlanTypeChange = (newPlanType: PlanType) => {
    setSelectedPlan(newPlanType);
  };

  const handleBeginShopping = () => {
    if (!planData) {
      toast({
        title: "No Plan Available",
        description: "Please generate a shopping plan first.",
        variant: "destructive"
      });
      return;
    }

    // Store plan data for the shopping route
    sessionStorage.setItem('shoppingPlanData', JSON.stringify(planData));
    
    // Navigate to shopping route
    navigate(`/shopping-route?listId=${listId}&planData=${encodeURIComponent(JSON.stringify(planData))}`);
  };

  const handleOrderOnline = () => {
    if (!planData) {
      toast({
        title: "No Plan Available",
        description: "Please generate a shopping plan first.",
        variant: "destructive"
      });
      return;
    }

    navigate(`/order-online?listId=${listId}&planData=${encodeURIComponent(JSON.stringify(planData))}`);
  };

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
        <Header title="Plan Details" />
        <main className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading your shopping plan...</div>
          </div>
        </main>
        <BottomNavigation activeTab="lists" />
      </div>
    );
  }

  if (error || !shoppingList) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
        <Header title="Plan Details" />
        <main className="flex-1 overflow-y-auto p-4">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-gray-500 mb-4">Unable to load shopping list</p>
              <Button onClick={() => navigate('/shopping-list')}>
                Back to Shopping Lists
              </Button>
            </CardContent>
          </Card>
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
              <p className="text-gray-500 mb-4">No items in your shopping list</p>
              <Button onClick={() => navigate('/shopping-list')}>
                Add Items to List
              </Button>
            </CardContent>
          </Card>
        </main>
        <BottomNavigation activeTab="lists" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
      <Header title="Shopping Plan" />
      
      <main className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Plan Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Choose Your Plan</CardTitle>
            <CardDescription>Select how you'd like to shop</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'single-store', label: 'Single Store', icon: Store },
                { id: 'multi-store', label: 'Multi-Store', icon: Users },
                { id: 'balanced', label: 'Balanced', icon: Zap }
              ].map(({ id, label, icon: Icon }) => (
                <Button
                  key={id}
                  variant={selectedPlan === id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePlanTypeChange(id as PlanType)}
                  className="flex flex-col gap-1 h-auto py-3"
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs">{label}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Plan Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Plan Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="font-medium">Total Cost</span>
              </div>
              <span className="text-lg font-bold text-green-600">
                ${(planData.totalCost / 100).toFixed(2)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="font-medium">Estimated Time</span>
              </div>
              <span className="text-sm text-gray-600">{planData.estimatedTime}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-purple-600" />
                <span className="font-medium">Stores</span>
              </div>
              <span className="text-sm text-gray-600">{planData.stores.length}</span>
            </div>
          </CardContent>
        </Card>

        {/* Store Breakdown */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Store Breakdown</h3>
          {planData.stores.map((store, index) => (
            <Card key={store.retailer.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: store.retailer.logoColor }}
                    >
                      {store.retailer.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-medium">{store.retailer.name}</h4>
                      <p className="text-sm text-gray-500">{store.items.length} items</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-green-600">
                      ${(store.subtotal / 100).toFixed(2)}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {store.items.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>{item.productName} (×{item.quantity})</span>
                      <span className="text-gray-500">
                        ${((item.suggestedPrice * item.quantity) / 100).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  {store.items.length > 3 && (
                    <div className="text-sm text-gray-500 text-center">
                      +{store.items.length - 3} more items
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pb-6">
          <Button 
            onClick={handleBeginShopping} 
            className="w-full bg-green-600 hover:bg-green-700"
            size="lg"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Begin Shopping
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          
          <Button 
            onClick={handleOrderOnline} 
            variant="outline" 
            className="w-full"
            size="lg"
          >
            Order Online Instead
          </Button>
        </div>
      </main>

      <BottomNavigation activeTab="lists" />
    </div>
  );
}
