
import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, Clock, DollarSign, CheckCircle2, Circle, Navigation } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { ShoppingItem } from '@/lib/types';
import BottomNavigation from '@/components/layout/BottomNavigation';
import { useToast } from '@/hooks/use-toast';

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
  planType?: string;
  listId?: string;
}

const ShoppingRoute: React.FC = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [completedItems, setCompletedItems] = useState<Set<number>>(new Set());
  const [currentAisle, setCurrentAisle] = useState<string>('');

  // Get URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const listId = urlParams.get('listId');
  const mode = urlParams.get('mode') || 'instore';
  const fromPlan = urlParams.get('fromPlan') === 'true';
  const planType = urlParams.get('planType') || 'single-store';

  // Get session data if available
  const sessionPlanData = useMemo(() => {
    try {
      const sessionData = sessionStorage.getItem(`planData-${listId}`);
      return sessionData ? JSON.parse(sessionData) : null;
    } catch (error) {
      console.error('Error parsing session plan data:', error);
      return null;
    }
  }, [listId]);

  // Fetch shopping list items if not available in session storage
  const { data: shoppingListData, isLoading: isLoadingList, error: listError } = useQuery({
    queryKey: [`/api/shopping-lists/${listId}`],
    enabled: !!listId,
    retry: (failureCount, error) => {
      if (error?.message?.includes('404')) return false;
      return failureCount < 2;
    }
  });

  // Generate plan data if needed
  const planData = useMemo(() => {
    // Always prefer session data first
    if (sessionPlanData && sessionPlanData.stores && sessionPlanData.stores.length > 0) {
      console.log('Using session plan data:', sessionPlanData);
      return sessionPlanData;
    }

    // Fallback to generating from shopping list data
    if (shoppingListData?.items && Array.isArray(shoppingListData.items) && shoppingListData.items.length > 0) {
      console.log('Generating plan data from shopping list:', shoppingListData.items);
      const generatedPlan = generatePlanData(shoppingListData.items, planType || 'single-store');
      console.log('Generated plan:', generatedPlan);
      return generatedPlan;
    }

    console.log('No valid data available for plan generation', {
      sessionPlanData,
      shoppingListData,
      planType
    });
    return null;
  }, [sessionPlanData, shoppingListData, planType]);

  // Extract shopping items for categorization
  const shoppingItems = useMemo(() => {
    if (planData?.stores && Array.isArray(planData.stores)) {
      const items = planData.stores.flatMap(store => 
        Array.isArray(store.items) ? store.items : []
      );
      console.log('Extracted shopping items:', items);
      return items;
    }

    // Fallback to direct shopping list items if plan data is not available
    if (shoppingListData?.items && Array.isArray(shoppingListData.items)) {
      console.log('Using direct shopping list items:', shoppingListData.items);
      return shoppingListData.items;
    }

    console.log('No shopping items available');
    return [];
  }, [planData, shoppingListData]);

  const handleItemToggle = (itemId: number) => {
    setCompletedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  if (isLoadingList) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading shopping route...</div>
      </div>
    );
  }

  if (listError) {
    console.error('Shopping list error:', listError);
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
        <div className="flex items-center gap-4 mb-6 p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/plan-details?listId=' + listId)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Plan
          </Button>
          <h1 className="text-xl font-bold">Shopping Route</h1>
        </div>
        <main className="flex-1 flex items-center justify-center p-4">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-red-600 mb-4">
                <h3 className="text-lg font-semibold">Error Loading Shopping Data</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Unable to load your shopping list. Please try again.
              </p>
              <div className="space-y-2">
                <Button onClick={() => window.location.reload()}>
                  Try Again
                </Button>
                <Button variant="outline" onClick={() => navigate('/plan-details?listId=' + listId)}>
                  Back to Plan
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
        <BottomNavigation activeTab="shopping-route" />
      </div>
    );
  }

  if (!planData || !planData.stores || planData.stores.length === 0) {
    console.warn('No plan data available:', { planData, sessionPlanData, shoppingListData });
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
        <div className="flex items-center gap-4 mb-6 p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/plan-details?listId=' + listId)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Plan
          </Button>
          <h1 className="text-xl font-bold">Shopping Route</h1>
        </div>
        <main className="flex-1 flex items-center justify-center p-4">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-orange-600 mb-4">
                <h3 className="text-lg font-semibold">No Shopping Plan Available</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Please create a shopping plan first before starting your route.
              </p>
              <Button onClick={() => navigate('/plan-details?listId=' + listId)}>
                Create Shopping Plan
              </Button>
            </CardContent>
          </Card>
        </main>
        <BottomNavigation activeTab="shopping-route" />
      </div>
    );
  }

  const completedCount = completedItems.size;
  const totalItems = shoppingItems.length;
  const progressPercentage = totalItems > 0 ? (completedCount / totalItems) * 100 : 0;

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 p-4 bg-white border-b">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/plan-details?listId=' + listId)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Shopping Route</h1>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="h-4 w-4" />
            {planData.stores[0]?.retailer?.name || 'Store'}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">Progress</span>
          <span className="text-sm text-gray-600">{completedCount}/{totalItems} items</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Shopping Items */}
      <main className="flex-1 px-4 pb-20">
        <div className="space-y-3">
          {shoppingItems.map((item) => (
            <Card key={item.id} className="relative">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleItemToggle(item.id)}
                    className="flex-shrink-0"
                  >
                    {completedItems.has(item.id) ? (
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    ) : (
                      <Circle className="h-6 w-6 text-gray-400" />
                    )}
                  </button>
                  
                  <div className="flex-1">
                    <div className={`font-medium ${completedItems.has(item.id) ? 'line-through text-gray-500' : ''}`}>
                      {item.productName}
                    </div>
                    <div className="text-sm text-gray-600">
                      Qty: {item.quantity} {item.unit?.toLowerCase() || ''}
                    </div>
                    {item.category && (
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {item.category}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="text-right">
                    <div className="font-medium">
                      ${((item.suggestedPrice || 0) / 100).toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {item.suggestedRetailer?.name || 'Store'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trip Summary */}
        <Card className="mt-6 bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Trip Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total Items:</span>
                <span>{totalItems}</span>
              </div>
              <div className="flex justify-between">
                <span>Completed:</span>
                <span>{completedCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Total:</span>
                <span className="font-bold">${(planData.totalCost / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Time:</span>
                <span>{planData.estimatedTime}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <BottomNavigation activeTab="shopping-route" />
    </div>
  );
};

const generatePlanData = (items: ShoppingItem[], planType: string): PlanData => {
  console.log('generatePlanData called with:', { items, planType, itemsLength: items?.length });

  // Ensure items is a valid array
  if (!items || !Array.isArray(items) || items.length === 0) {
    console.warn('generatePlanData received invalid items:', items);
    return { 
      totalCost: 0, 
      estimatedTime: '0 min', 
      stores: [],
      planType: planType || 'single-store',
      listId: ''
    };
  }

  // Calculate total cost
  const totalCost = items.reduce((sum, item) => {
    const price = item.suggestedPrice || 0;
    const quantity = item.quantity || 1;
    return sum + (price * quantity);
  }, 0);

  // Get primary retailer (most common retailer among items)
  const retailerCounts: { [key: string]: { retailer: any; count: number } } = {};
  
  items.forEach(item => {
    if (item.suggestedRetailer) {
      const retailerId = item.suggestedRetailer.id.toString();
      if (!retailerCounts[retailerId]) {
        retailerCounts[retailerId] = {
          retailer: item.suggestedRetailer,
          count: 0
        };
      }
      retailerCounts[retailerId].count++;
    }
  });

  const primaryRetailer = Object.values(retailerCounts).reduce((prev, current) => 
    (current.count > prev.count) ? current : prev
  )?.retailer || {
    id: 1,
    name: 'Store',
    logoColor: 'blue'
  };

  return {
    totalCost: totalCost,
    estimatedTime: '25-35 min',
    stores: [{
      retailer: primaryRetailer,
      items: items,
      subtotal: totalCost
    }],
    planType: planType || 'single-store',
    listId: ''
  };
};

export default ShoppingRoute;
