
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
  
  const [optimizedRoute, setOptimizedRoute] = useState<any>(null);
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

  // Generate optimized route when component loads
  useEffect(() => {
    if (shoppingList?.items) {
      const route = generateOptimizedShoppingRoute(shoppingList.items);
      setOptimizedRoute(route);
      setStartTime(new Date());
    }
  }, [shoppingList]);

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

  // Generate optimized shopping route with aisle information
  const generateOptimizedShoppingRoute = (items: any[]) => {
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
      retailerName: 'Kroger', // Default retailer
      totalItems: items.length
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
                <span className="font-semibold">{optimizedRoute.retailerName}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Timer className="h-4 w-4" />
                <span>{formatTime(elapsedTime)}</span>
              </div>
            </div>

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

              {/* Navigation Button */}
              <div className="mt-4 pt-4 border-t">
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
                    Complete Shopping Trip
                  </Button>
                ) : (
                  <Button 
                    className="w-full"
                    onClick={moveToNextAisle}
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Next Aisle: {optimizedRoute.aisleGroups[currentAisleIndex + 1]?.aisleName}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upcoming Aisles Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming Aisles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {optimizedRoute.aisleGroups.slice(currentAisleIndex + 1).map((aisle: any, index: number) => (
                <div 
                  key={aisle.aisleName}
                  className="flex items-center justify-between p-2 rounded-lg bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium">
                      {currentAisleIndex + index + 2}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{aisle.aisleName}</div>
                      <div className="text-xs text-gray-500">{aisle.category}</div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {aisle.items.length} items
                  </Badge>
                </div>
              ))}
              
              {optimizedRoute.aisleGroups.slice(currentAisleIndex + 1).length === 0 && (
                <p className="text-sm text-gray-500 text-center py-2">
                  This is your final aisle!
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      <BottomNavigation activeTab="lists" />
    </div>
  );
};

export default ShoppingRoute;
