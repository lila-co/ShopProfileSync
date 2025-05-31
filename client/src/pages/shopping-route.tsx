import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import { 
  Check, 
  MapPin, 
  Clock, 
  ArrowRight, 
  Store, 
  ShoppingCart,
  CheckCircle2,
  Circle,
  Navigation,
  Timer,
  Package
} from 'lucide-react';
import Header from '@/components/layout/Header';
import BottomNavigation from '@/components/layout/BottomNavigation';

const ShoppingRoute: React.FC = () => {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get URL parameters
  const params = new URLSearchParams(window.location.search);
  const listId = params.get('listId');
  const mode = params.get('mode') || 'instore';
  const planDataParam = params.get('planData');

  const [optimizedRoute, setOptimizedRoute] = useState<any>(null);
  const [selectedPlanData, setSelectedPlanData] = useState<any>(null);
  const [currentAisleIndex, setCurrentAisleIndex] = useState(0);
  const [completedItems, setCompletedItems] = useState<Set<number>>(new Set());
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Fetch shopping list and items
  const { data: shoppingList, isLoading } = useQuery({
    queryKey: [`/api/shopping-lists/${listId}`],
    enabled: !!listId,
    queryFn: async () => {
      const response = await fetch(`/api/shopping-lists/${listId}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error('Failed to fetch shopping list');
      }
      const data = await response.json();
      return data;
    }
  });

  // Toggle item completion
  const toggleItemMutation = useMutation({
    mutationFn: async ({ itemId, completed }: { itemId: number, completed: boolean }) => {
      const response = await apiRequest('PATCH', `/api/shopping-list/items/${itemId}`, {
        isCompleted: completed
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists', listId] });
    }
  });

  // Parse plan data and generate route when component loads
  useEffect(() => {
    if (planDataParam) {
      try {
        const planData = JSON.parse(decodeURIComponent(planDataParam));
        setSelectedPlanData(planData);

        // Generate route from the selected plan instead of raw shopping list items
        const route = generateOptimizedShoppingRouteFromPlan(planData);
        setOptimizedRoute(route);
        setStartTime(new Date());
      } catch (error) {
        console.error('Error parsing plan data:', error);
        // Fallback to original method if plan data is invalid
        if (shoppingList?.items) {
          const route = generateOptimizedShoppingRoute(shoppingList.items);
          setOptimizedRoute(route);
          setStartTime(new Date());
        }
      }
    } else if (shoppingList?.items) {
      // Fallback to original method if no plan data is provided
      const route = generateOptimizedShoppingRoute(shoppingList.items);
      setOptimizedRoute(route);
      setStartTime(new Date());
    }
  }, [shoppingList, planDataParam]);

  // Timer effect
  useEffect(() => {
    if (startTime) {
      const interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [startTime]);

  // Generate optimized shopping route from selected plan data
  const generateOptimizedShoppingRouteFromPlan = (planData: any) => {
    let items: any[] = [];
    let retailerName = 'Store';

    // Extract items from different plan structures
    if (planData.stores && planData.stores.length > 0) {
      // Multi-store plan - use first store for route or combine all stores
      if (planData.stores.length === 1) {
        items = planData.stores[0].items || [];
        retailerName = planData.stores[0].retailerName || 'Store';
      } else {
        // For multi-store plans, combine all items and let user know it's multi-store
        items = planData.stores.flatMap((store: any) => 
          (store.items || []).map((item: any) => ({
            ...item,
            storeName: store.retailerName // Add store name to each item
          }))
        );
        retailerName = `Multi-Store (${planData.stores.map((s: any) => s.retailerName).join(', ')})`;
      }
    } else if (planData.items) {
      // Single store plan
      items = planData.items;
      retailerName = planData.retailerName || 'Store';
    } else {
      // Fallback - use shopping list items
      items = shoppingList?.items || [];
    }

    return generateOptimizedShoppingRoute(items, retailerName, planData);
  };

  // Generate optimized shopping route with aisle information
  const generateOptimizedShoppingRoute = (items: any[], retailerName?: string, planData?: any) => {
    // Define aisle mappings for different product categories
    const aisleMapping = {
      'Produce': { aisle: 'Aisle 1', category: 'Fresh Produce', order: 1, color: 'bg-green-100 text-green-800' },
      'Dairy': { aisle: 'Aisle 2', category: 'Dairy & Eggs', order: 2, color: 'bg-blue-100 text-blue-800' },
      'Meat': { aisle: 'Aisle 3', category: 'Meat & Seafood', order: 3, color: 'bg-red-100 text-red-800' },
      'Pantry': { aisle: 'Aisle 4-6', category: 'Pantry & Canned Goods', order: 4, color: 'bg-yellow-100 text-yellow-800' },
      'Frozen': { aisle: 'Aisle 7', category: 'Frozen Foods', order: 5, color: 'bg-cyan-100 text-cyan-800' },
      'Bakery': { aisle: 'Aisle 8', category: 'Bakery', order: 6, color: 'bg-orange-100 text-orange-800' },
      'Personal Care': { aisle: 'Aisle 9', category: 'Health & Personal Care', order: 7, color: 'bg-purple-100 text-purple-800' },
      'Household': { aisle: 'Aisle 10', category: 'Household Items', order: 8, color: 'bg-gray-100 text-gray-800' }
    };

    // Function to categorize items
    const categorizeItem = (productName: string) => {
      const name = productName.toLowerCase();

      if (name.includes('banana') || name.includes('tomato') || name.includes('onion') || name.includes('bell pepper') || name.includes('basil') || name.includes('garlic')) {
        return 'Produce';
      } else if (name.includes('milk') || name.includes('yogurt') || name.includes('cheese') || name.includes('egg')) {
        return 'Dairy';
      } else if (name.includes('chicken') || name.includes('beef') || name.includes('meat') || name.includes('fish')) {
        return 'Meat';
      } else if (name.includes('bread') || name.includes('cake') || name.includes('bakery')) {
        return 'Bakery';
      } else if (name.includes('frozen') || name.includes('ice cream')) {
        return 'Frozen';
      } else if (name.includes('soap') || name.includes('shampoo') || name.includes('toothpaste') || name.includes('towel')) {
        return 'Personal Care';
      } else if (name.includes('towel') || name.includes('cleaner') || name.includes('detergent') || name.includes('paper towel')) {
        return 'Household';
      } else {
        return 'Pantry';
      }
    };

    // Group items by aisle
    const aisleGroups: { [key: string]: any } = {};

    items.forEach((item: any) => {
      const category = categorizeItem(item.productName);
      const aisleInfo = aisleMapping[category as keyof typeof aisleMapping];

      if (!aisleGroups[aisleInfo.aisle]) {
        aisleGroups[aisleInfo.aisle] = {
          aisleName: aisleInfo.aisle,
          category: aisleInfo.category,
          order: aisleInfo.order,
          color: aisleInfo.color,
          items: []
        };
      }

      // Add shelf location for specific items
      let shelfLocation = '';
      const name = item.productName.toLowerCase();
      if (name.includes('milk')) shelfLocation = 'Cooler Section';
      else if (name.includes('bread')) shelfLocation = 'End Cap';
      else if (name.includes('banana')) shelfLocation = 'Front Display';
      else if (name.includes('chicken')) shelfLocation = 'Refrigerated Case';

      aisleGroups[aisleInfo.aisle].items.push({
        ...item,
        shelfLocation
      });
    });

    // Sort aisles by order and convert to array
    const sortedAisleGroups = Object.values(aisleGroups).sort((a: any, b: any) => a.order - b.order);

    // Calculate route optimization
    const totalAisles = sortedAisleGroups.length;
    const estimatedTime = Math.max(15, totalAisles * 3 + items.length * 0.5);

    return {
      aisleGroups: sortedAisleGroups,
      totalAisles,
      estimatedTime: Math.round(estimatedTime),
      routeOrder: sortedAisleGroups.map((group: any) => group.aisleName),
      retailerName: retailerName || 'Kroger',
      totalItems: items.length,
      planType: planData?.planType || 'Shopping Plan',
      totalCost: planData?.totalCost || 0,
      savings: planData?.savings || 0
    };
  };

  const handleToggleItem = (itemId: number, currentStatus: boolean) => {
    const newCompletedItems = new Set(completedItems);

    if (currentStatus) {
      newCompletedItems.delete(itemId);
    } else {
      newCompletedItems.add(itemId);
    }

    setCompletedItems(newCompletedItems);
    toggleItemMutation.mutate({ itemId, completed: !currentStatus });

    if (!currentStatus) {
      toast({
        title: "Item checked off!",
        description: "Great job, keep shopping!",
        duration: 2000
      });
    }
  };

  const getProgressPercentage = () => {
    if (!optimizedRoute) return 0;
    return (completedItems.size / optimizedRoute.totalItems) * 100;
  };

  const getCurrentAisle = () => {
    if (!optimizedRoute?.aisleGroups) return null;
    return optimizedRoute.aisleGroups[currentAisleIndex];
  };

  const moveToNextAisle = () => {
    if (currentAisleIndex < optimizedRoute.aisleGroups.length - 1) {
      setCurrentAisleIndex(currentAisleIndex + 1);
      toast({
        title: "Moving to next aisle",
        description: `Now shopping in ${optimizedRoute.aisleGroups[currentAisleIndex + 1].aisleName}`,
        duration: 3000
      });
    }
  };

  const moveToPreviousAisle = () => {
    if (currentAisleIndex > 0) {
      setCurrentAisleIndex(currentAisleIndex - 1);
      toast({
        title: "Going back to previous aisle",
        description: `Now shopping in ${optimizedRoute.aisleGroups[currentAisleIndex - 1].aisleName}`,
        duration: 3000
      });
    }
  };

  const jumpToAisle = (aisleIndex: number) => {
    setCurrentAisleIndex(aisleIndex);
    const aisle = optimizedRoute.aisleGroups[aisleIndex];
    toast({
      title: "Jumped to aisle",
      description: `Now shopping in ${aisle.aisleName}`,
      duration: 3000
    });
  };

  const getAisleCompletionStatus = (aisle: any) => {
    const completedCount = aisle.items.filter((item: any) => 
      completedItems.has(item.id) || item.isCompleted
    ).length;
    return {
      completed: completedCount,
      total: aisle.items.length,
      isComplete: completedCount === aisle.items.length
    };
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
        <Header title="Shopping Route" />
        <main className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-center h-64">
            <p>Loading your shopping route...</p>
          </div>
        </main>
        <BottomNavigation activeTab="lists" />
      </div>
    );
  }

  if (!optimizedRoute) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
        <Header title="Shopping Route" />
        <main className="flex-1 overflow-y-auto p-4">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-gray-500 mb-4">No shopping route available</p>
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

  const currentAisle = getCurrentAisle();
  const isLastAisle = currentAisleIndex === optimizedRoute.aisleGroups.length - 1;

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
      <Header title="Shopping Route" />

      <main className="flex-1 overflow-y-auto p-4 pb-20">
        {/* Progress Header */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Store className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-semibold">{optimizedRoute.retailerName}</div>
                  {optimizedRoute.planType && (
                    <div className="text-xs text-gray-500">{optimizedRoute.planType}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Timer className="h-4 w-4" />
                <span>{formatTime(elapsedTime)}</span>
              </div>
            </div>

            {/* Plan Summary */}
            {(optimizedRoute.totalCost > 0 || optimizedRoute.savings > 0) && (
              <div className="mb-3 p-2 bg-green-50 rounded-lg">
                <div className="flex justify-between items-center text-sm">
                  {optimizedRoute.totalCost > 0 && (
                    <span className="font-medium">Total: ${(optimizedRoute.totalCost / 100).toFixed(2)}</span>
                  )}
                  {optimizedRoute.savings > 0 && (
                    <span className="text-green-600">Save: ${(optimizedRoute.savings / 100).toFixed(2)}</span>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{completedItems.size} of {optimizedRoute.totalItems} items</span>
              </div>
              <Progress value={getProgressPercentage()} className="h-2" />
            </div>

            <div className="flex items-center justify-between mt-3 text-sm">
              <span className="flex items-center gap-1">
                <Navigation className="h-4 w-4" />
                {currentAisleIndex + 1} of {optimizedRoute.totalAisles} aisles
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Est. {optimizedRoute.estimatedTime} min total
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Current Aisle */}
        {currentAisle && (
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-blue-600" />
                    {currentAisle.aisleName}
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">{currentAisle.category}</p>
                </div>
                <Badge className={currentAisle.color}>
                  {currentAisle.items.length} items
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="space-y-3">
                {currentAisle.items.map((item: any) => {
                  const isCompleted = completedItems.has(item.id) || item.isCompleted;

                  return (
                    <div 
                      key={item.id} 
                      className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                        isCompleted 
                          ? 'bg-green-50 border-green-200 opacity-75' 
                          : 'bg-white border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center flex-1">
                        <button
                          onClick={() => handleToggleItem(item.id, isCompleted)}
                          className="mr-3 focus:outline-none"
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="h-6 w-6 text-green-600" />
                          ) : (
                            <Circle className="h-6 w-6 text-gray-400 hover:text-green-600" />
                          )}
                        </button>

                        <div className="flex-1">
                          <div className={`font-medium ${isCompleted ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                            {item.productName}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center gap-2">
                            <Package className="h-3 w-3" />
                            <span>Qty: {item.quantity}</span>
                            {item.shelfLocation && (
                              <>
                                <span>•</span>
                                <span className="text-blue-600">{item.shelfLocation}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Navigation Buttons */}
              <div className="mt-4 pt-4 border-t space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline"
                    onClick={moveToPreviousAisle}
                    disabled={currentAisleIndex === 0}
                    className="w-full"
                  >
                    <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
                    Previous
                  </Button>

                  {isLastAisle ? (
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        toast({
                          title: "Shopping Complete!",
                          description: "Great job! All aisles completed.",
                          duration: 5000
                        });
                        setTimeout(() => navigate('/shopping-list'), 2000);
                      }}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Complete
                    </Button>
                  ) : (
                    <Button 
                      className="w-full"
                      onClick={moveToNextAisle}
                    >
                      Next
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Aisles Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">All Aisles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {optimizedRoute.aisleGroups.map((aisle: any, index: number) => {
                const completionStatus = getAisleCompletionStatus(aisle);
                const isCurrent = index === currentAisleIndex;
                const isVisited = index < currentAisleIndex;

                return (
                  <button
                    key={aisle.aisleName}
                    onClick={() => jumpToAisle(index)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                      isCurrent 
                        ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200' 
                        : completionStatus.isComplete 
                        ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                        : isVisited
                        ? 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        isCurrent 
                          ? 'bg-blue-600 text-white' 
                          : completionStatus.isComplete 
                          ? 'bg-green-600 text-white' 
                          : isVisited
                          ? 'bg-yellow-500 text-white'
                          : 'bg-gray-300 text-gray-700'
                      }`}>
                        {completionStatus.isComplete ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-sm">{aisle.aisleName}</div>
                        <div className="text-xs text-gray-500">{aisle.category}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-xs text-gray-600">
                        {completionStatus.completed}/{completionStatus.total}
                      </div>
                      {isCurrent && (
                        <Badge className="bg-blue-600 text-white text-xs">
                          Current
                        </Badge>
                      )}
                      {completionStatus.isComplete && !isCurrent && (
                        <Badge className="bg-green-600 text-white text-xs">
                          Complete
                        </Badge>
                      )}
                      {!completionStatus.isComplete && isVisited && (
                        <Badge className="bg-yellow-500 text-white text-xs">
                          Incomplete
                        </Badge>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </main>

      <BottomNavigation activeTab="lists" />
    </div>
  );
};

export default ShoppingRoute;