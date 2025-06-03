import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useLocation, useRoute } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { aiCategorizationService } from '@/lib/aiCategorization';

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
  Package
} from 'lucide-react';
import Header from '@/components/layout/Header';
import BottomNavigation from '@/components/layout/BottomNavigation';

const ShoppingRoute: React.FC = () => {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get URL parameters from current location
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const listId = searchParams.get('listId');
  const mode = searchParams.get('mode') || 'instore';
  const planDataParam = searchParams.get('planData');
  
  console.log('Shopping route loaded with location:', location);
  console.log('Shopping route loaded with params:', {
    listId,
    mode,
    planDataParam: planDataParam ? 'present' : 'missing'
  });

  const [optimizedRoute, setOptimizedRoute] = useState<any>(null);
  const [selectedPlanData, setSelectedPlanData] = useState<any>(null);
  const [currentAisleIndex, setCurrentAisleIndex] = useState(0);
  const [currentStoreIndex, setCurrentStoreIndex] = useState(0);
  const [completedItems, setCompletedItems] = useState<Set<number>>(new Set());
  const [loyaltyCard, setLoyaltyCard] = useState<any>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);

  // Fetch loyalty card info for the retailer
  const { data: loyaltyCardData } = useQuery({
    queryKey: [`/api/user/loyalty-card/${optimizedRoute?.retailerName}`],
    enabled: !!optimizedRoute?.retailerName,
    queryFn: async () => {
      const response = await fetch(`/api/user/loyalty-card/${encodeURIComponent(optimizedRoute.retailerName)}`, {
        credentials: "include",
      });
      if (!response.ok) {
        return null; // No loyalty card found
      }
      const data = await response.json();
      return data;
    }
  });

  useEffect(() => {
    if (loyaltyCardData) {
      setLoyaltyCard(loyaltyCardData);
    }
  }, [loyaltyCardData]);

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
    console.log('Shopping route useEffect triggered');
    console.log('planDataParam:', planDataParam);
    console.log('shoppingList:', shoppingList);
    console.log('Current location:', location);
    
    let planDataToUse = null;
    
    // Try URL parameter first
    if (planDataParam) {
      try {
        planDataToUse = JSON.parse(decodeURIComponent(planDataParam));
        console.log('Successfully parsed plan data from URL:', planDataToUse);
      } catch (error) {
        console.error('Error parsing URL plan data:', error);
      }
    }
    
    // If no URL param or parsing failed, try sessionStorage
    if (!planDataToUse) {
      const storedPlanData = sessionStorage.getItem('shoppingPlanData');
      if (storedPlanData) {
        try {
          planDataToUse = JSON.parse(storedPlanData);
          console.log('Using stored plan data from sessionStorage:', planDataToUse);
        } catch (error) {
          console.error('Error parsing stored plan data:', error);
        }
      }
    }
    
    if (planDataToUse) {
      setSelectedPlanData(planDataToUse);

      // Generate route from the selected plan
      const route = generateOptimizedShoppingRouteFromPlan(planDataToUse);
      console.log('Generated route from plan:', route);
      setOptimizedRoute(route);
      setStartTime(new Date());
      
      toast({
        title: "Shopping Route Ready!",
        description: `Your shopping route has been created`,
        duration: 3000
      });
    } else if (shoppingList?.items && shoppingList.items.length > 0) {
      console.log('Using shopping list items as fallback');
      const route = generateOptimizedShoppingRoute(shoppingList.items);
      setOptimizedRoute(route);
      setStartTime(new Date());
      
      toast({
        title: "Shopping Route Created",
        description: "Using your shopping list items",
        duration: 3000
      });
    } else {
      console.log('No data available for shopping route');
      toast({
        title: "No Shopping Data",
        description: "Unable to create shopping route. Please go back and select a plan.",
        variant: "destructive",
        duration: 5000
      });
    }
  }, [shoppingList, planDataParam, location, toast]);



  // Generate optimized shopping route from selected plan data
  const generateOptimizedShoppingRouteFromPlan = (planData: any) => {
    console.log('generateOptimizedShoppingRouteFromPlan called with:', planData);
    
    let items: any[] = [];
    let retailerName = 'Store';
    let isMultiStore = false;
    let stores: any[] = [];

    // Extract items from different plan structures
    if (planData.stores && planData.stores.length > 0) {
      console.log('Processing plan with stores:', planData.stores);
      
      if (planData.stores.length === 1) {
        // Single store plan
        const store = planData.stores[0];
        items = store.items || [];
        retailerName = store.retailer?.name || store.retailerName || 'Store';
        stores = [{
          ...store,
          retailerName: retailerName,
          items: items
        }];
        console.log('Single store plan - items:', items.length, 'retailer:', retailerName);
      } else {
        // Multi-store plan - keep stores separate
        isMultiStore = true;
        stores = planData.stores.map((store: any) => ({
          ...store,
          retailerName: store.retailer?.name || store.retailerName || 'Store',
          items: (store.items || []).map((item: any) => ({
            ...item,
            storeName: store.retailer?.name || store.retailerName || 'Store'
          }))
        }));
        retailerName = `Multi-Store Plan (${stores.length} stores)`;
        // For the main route, use items from first store initially
        items = stores[0]?.items || [];
        console.log('Multi-store plan - stores:', stores.length, 'first store items:', items.length);
      }
    } else if (planData.items) {
      // Single store plan with items directly
      items = planData.items;
      retailerName = planData.retailerName || 'Store';
      stores = [{ retailerName, items }];
      console.log('Plan with direct items - items:', items.length);
    } else {
      // Fallback - use shopping list items
      console.log('Using fallback - shopping list items');
      items = shoppingList?.items || [];
      stores = [{ retailerName: 'Store', items }];
    }

    // Ensure items have required properties
    const processedItems = items.map((item: any) => ({
      id: item.id || Math.random(),
      productName: item.productName || 'Unknown Product',
      quantity: item.quantity || 1,
      unit: item.unit || 'item',
      isCompleted: item.isCompleted || false,
      suggestedPrice: item.suggestedPrice || 0,
      ...item
    }));

    console.log('Processed items for route generation:', processedItems);
    const route = generateOptimizedShoppingRoute(processedItems, retailerName, planData);
    
    // Add multi-store specific data
    if (isMultiStore) {
      route.isMultiStore = true;
      route.stores = stores;
      route.currentStoreIndex = 0;
    }

    console.log('Generated final route:', route);
    return route;
  };

  // Generate optimized shopping route with AI-powered categorization
  const generateOptimizedShoppingRoute = (items: any[], retailerName?: string, planData?: any) => {
    // Define aisle mappings with better color schemes
    const aisleMapping = {
      'Produce': { aisle: 'Aisle 1', category: 'Fresh Produce', order: 1, color: 'bg-green-100 text-green-800' },
      'Dairy & Eggs': { aisle: 'Aisle 2', category: 'Dairy & Eggs', order: 2, color: 'bg-blue-100 text-blue-800' },
      'Meat & Seafood': { aisle: 'Aisle 3', category: 'Meat & Seafood', order: 3, color: 'bg-red-100 text-red-800' },
      'Pantry & Canned Goods': { aisle: 'Aisle 4-6', category: 'Pantry & Canned Goods', order: 4, color: 'bg-yellow-100 text-yellow-800' },
      'Frozen Foods': { aisle: 'Aisle 7', category: 'Frozen Foods', order: 5, color: 'bg-cyan-100 text-cyan-800' },
      'Bakery': { aisle: 'Aisle 8', category: 'Bakery', order: 6, color: 'bg-orange-100 text-orange-800' },
      'Personal Care': { aisle: 'Aisle 9', category: 'Personal Care', order: 7, color: 'bg-purple-100 text-purple-800' },
      'Household Items': { aisle: 'Aisle 10', category: 'Household Items', order: 8, color: 'bg-gray-100 text-gray-800' }
    };

    // Use AI categorization service for better accuracy
    const categorizeItemWithAI = async (productName: string) => {
      const result = await aiCategorizationService.categorizeProduct(productName);
      if (result) {
        return result;
      }

      // Fallback to basic categorization
      const fallback = aiCategorizationService.getQuickCategory(productName);
      return { 
        category: fallback.category, 
        confidence: fallback.confidence,
        aisle: aisleMapping[fallback.category as keyof typeof aisleMapping]?.aisle || 'Aisle 4-6',
        section: aisleMapping[fallback.category as keyof typeof aisleMapping]?.category || 'Center Store'
      };
    };

    // Group items by aisle using AI categorization
    const aisleGroups: { [key: string]: any } = {};
    const itemPromises: Promise<any>[] = [];

    // Process items with AI categorization
    items.forEach((item: any) => {
      // Use AI service for immediate fallback categorization
      const fallbackResult = aiCategorizationService.getQuickCategory(item.productName);
      const fallbackAisleInfo = aisleMapping[fallbackResult.category as keyof typeof aisleMapping] || 
                               aisleMapping['Pantry & Canned Goods'];

      if (!aisleGroups[fallbackAisleInfo.aisle]) {
        aisleGroups[fallbackAisleInfo.aisle] = {
          aisleName: fallbackAisleInfo.aisle,
          category: fallbackAisleInfo.category,
          order: fallbackAisleInfo.order,
          color: fallbackAisleInfo.color,
          items: []
        };
      }

      // Enhanced shelf location logic with more comprehensive patterns
      let shelfLocation = '';
      const name = item.productName.toLowerCase();

      // Dairy specific locations
      if (name.includes('milk') || name.includes('yogurt') || name.includes('cheese')) {
        shelfLocation = 'Dairy Cooler';
      }
      // Meat specific locations  
      else if (name.includes('chicken') || name.includes('beef') || name.includes('fish') || name.includes('meat')) {
        shelfLocation = 'Refrigerated Case';
      }
      // Produce specific locations
      else if (name.includes('banana')) shelfLocation = 'Front Display';
      else if (name.includes('apple') || name.includes('orange')) shelfLocation = 'Fruit Section';
      else if (name.includes('lettuce') || name.includes('spinach')) shelfLocation = 'Leafy Greens';
      else if (name.includes('tomato') || name.includes('pepper')) shelfLocation = 'Vegetable Section';
      // Bakery specific locations
      else if (name.includes('bread') || name.includes('bagel')) shelfLocation = 'Bakery Display';
      // Frozen specific locations
      else if (name.includes('frozen') || name.includes('ice cream')) shelfLocation = 'Freezer Section';
      // Household specific locations
      else if (name.includes('paper towel') || name.includes('toilet paper')) shelfLocation = 'Paper Goods';
      else if (name.includes('cleaner') || name.includes('detergent')) shelfLocation = 'Cleaning Supplies';
      // Personal care specific locations
      else if (name.includes('shampoo') || name.includes('soap')) shelfLocation = 'Health & Beauty';

      // Add item with enhanced categorization info
      aisleGroups[fallbackAisleInfo.aisle].items.push({
        ...item,
        shelfLocation,
        category: fallbackResult.category,
        confidence: 0.7 // Default confidence for fallback
      });

      // Queue AI categorization for background improvement
      const aiPromise = categorizeItemWithAI(item.productName).then(aiResult => {
        if (aiResult && aiResult.confidence > 0.7) {
          // Find the item and update its categorization if AI is more confident
          const currentAisle = aisleGroups[fallbackAisleInfo.aisle];
          const itemIndex = currentAisle.items.findIndex((i: any) => i.id === item.id);

          if (itemIndex !== -1) {
            currentAisle.items[itemIndex] = {
              ...currentAisle.items[itemIndex],
              category: aiResult.category,
              confidence: aiResult.confidence,
              aiSuggestion: aiResult.conversionReason
            };
          }
        }
      }).catch(error => {
        console.warn('AI categorization failed for item:', item.productName, error);
      });

      itemPromises.push(aiPromise);
    });

    // Allow AI categorization to complete in background without blocking UI
    Promise.all(itemPromises).then(() => {
      // Optionally trigger a re-render with improved categorization
      // This would require state management to update the route
    }).catch(error => {
      console.warn('Some AI categorizations failed:', error);
    });

    // Sort aisles by order and convert to array
    const sortedAisleGroups = Object.values(aisleGroups).sort((a: any, b: any) => a.order - b.order);

    // Calculate route optimization with AI insights
    const totalAisles = sortedAisleGroups.length;
    let estimatedTime = Math.max(15, totalAisles * 3 + items.length * 0.5);

    // Adjust time estimates based on item complexity and store layout
    const complexItems = items.filter((item: any) => {
      const name = item.productName.toLowerCase();
      return name.includes('organic') || name.includes('specialty') || name.includes('imported');
    }).length;

    const freshItems = items.filter((item: any) => {
      const name = item.productName.toLowerCase();
      return name.includes('fresh') || name.includes('produce') || name.includes('meat') || name.includes('seafood');
    }).length;

    // Add extra time for complex/fresh items that require more selection time
    estimatedTime += complexItems * 1.5 + freshItems * 1;
    estimatedTime = Math.round(estimatedTime);

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
    
    // For multi-store plans, calculate progress across all stores
    if (optimizedRoute.isMultiStore && optimizedRoute.stores) {
      const totalItems = optimizedRoute.stores.reduce((sum: number, store: any) => sum + store.items.length, 0);
      return totalItems > 0 ? (completedItems.size / totalItems) * 100 : 0;
    }
    
    return (completedItems.size / optimizedRoute.totalItems) * 100;
  };

  const getCurrentAisle = () => {
    if (!optimizedRoute?.aisleGroups) return null;
    
    // For multi-store plans, generate aisles from current store's items
    if (optimizedRoute.isMultiStore && optimizedRoute.stores) {
      const currentStore = optimizedRoute.stores[currentStoreIndex];
      if (!currentStore) return null;
      
      // Generate aisles for current store
      const storeRoute = generateOptimizedShoppingRoute(currentStore.items, currentStore.retailerName);
      if (!storeRoute.aisleGroups || !storeRoute.aisleGroups[currentAisleIndex]) return null;
      
      return storeRoute.aisleGroups[currentAisleIndex];
    }
    
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
              <p className="text-sm text-gray-400 mb-4">
                Debug info: listId={listId}, planData={planDataParam ? 'present' : 'missing'}, 
                sessionStorage={sessionStorage.getItem('shoppingPlanData') ? 'present' : 'missing'}
              </p>
              <div className="space-y-2">
                <Button onClick={() => navigate('/plan-details?listId=' + (listId || '1'))}>
                  Go Back to Plan Details
                </Button>
                <Button onClick={() => navigate('/shopping-list')}>
                  Go to Shopping List
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    // Clear any stored data and try again
                    sessionStorage.removeItem('shoppingPlanData');
                    navigate('/shopping-list');
                  }}
                >
                  Start Over
                </Button>
              </div>
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
        {/* Loyalty Card Section */}
        {loyaltyCard && (
          <Card className="mb-4 border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-semibold text-green-800">Loyalty Card Ready</div>
                    <div className="text-xs text-green-600">{loyaltyCard.cardNumber}</div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-green-700 border-green-300 hover:bg-green-100"
                  onClick={() => {
                    // Generate barcode display or show scannable code
                    toast({
                      title: "Loyalty Card",
                      description: "Show this to the cashier for points/discounts",
                      duration: 5000
                    });
                  }}
                >
                  Show Barcode
                </Button>
              </div>

              {/* Barcode Display Area */}
              <div className="bg-white p-3 rounded border text-center">
                <div className="text-xs text-gray-500 mb-1">Loyalty Card</div>
                <div className="font-mono text-lg font-bold tracking-wider">
                  {loyaltyCard.barcodeNumber || loyaltyCard.cardNumber}
                </div>
                {/* Simple barcode visualization */}
                <div className="flex justify-center mt-2 gap-px">
                  {loyaltyCard.barcodeNumber?.split('').map((digit: string, index: number) => (
                    <div
                      key={index}
                      className={`w-1 h-8 ${parseInt(digit) % 2 === 0 ? 'bg-black' : 'bg-gray-300'}`}
                    />
                  ))}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Member ID: {loyaltyCard.memberId || loyaltyCard.cardNumber}
                </div>
                {loyaltyCard.affiliateCode && (
                  <div className="text-xs text-blue-600 mt-1">
                    Affiliate: {loyaltyCard.affiliateCode}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

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

        {/* Multi-Store Navigation */}
        {optimizedRoute?.isMultiStore && (
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Store className="h-5 w-5 text-purple-600" />
                Multi-Store Shopping Plan
              </CardTitle>
              <p className="text-sm text-gray-600">Shop at {optimizedRoute.stores.length} stores for best prices</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {optimizedRoute.stores.map((store: any, index: number) => {
                  const storeCompletedItems = store.items.filter((item: any) => 
                    completedItems.has(item.id) || item.isCompleted
                  ).length;
                  const isCurrent = index === currentStoreIndex;
                  const isCompleted = storeCompletedItems === store.items.length;

                  return (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border transition-all cursor-pointer ${
                        isCurrent 
                          ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200' 
                          : isCompleted
                          ? 'bg-green-50 border-green-200'
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                      onClick={() => setCurrentStoreIndex(index)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{store.retailerName}</div>
                          <div className="text-xs text-gray-500">
                            {store.items.length} items • ${((store.subtotal || 0) / 100).toFixed(2)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-xs text-gray-600">
                            {storeCompletedItems}/{store.items.length}
                          </div>
                          {isCurrent && (
                            <Badge className="bg-blue-600 text-white text-xs">
                              Current
                            </Badge>
                          )}
                          {isCompleted && !isCurrent && (
                            <Badge className="bg-green-600 text-white text-xs">
                              Complete
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Store Navigation Buttons */}
              <div className="mt-4 pt-3 border-t">
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline"
                    onClick={() => setCurrentStoreIndex(Math.max(0, currentStoreIndex - 1))}
                    disabled={currentStoreIndex === 0}
                    className="w-full"
                  >
                    <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
                    Previous Store
                  </Button>

                  <Button 
                    className="w-full"
                    onClick={() => {
                      if (currentStoreIndex < optimizedRoute.stores.length - 1) {
                        setCurrentStoreIndex(currentStoreIndex + 1);
                        setCurrentAisleIndex(0); // Reset to first aisle of new store
                        toast({
                          title: "Moving to next store",
                          description: `Now shopping at ${optimizedRoute.stores[currentStoreIndex + 1].retailerName}`,
                          duration: 3000
                        });
                      }
                    }}
                    disabled={currentStoreIndex >= optimizedRoute.stores.length - 1}
                  >
                    Next Store
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Aisle */}
        {currentAisle && (
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-blue-600" />
                    {currentAisle.aisleName}
                    {optimizedRoute?.isMultiStore && (
                      <span className="text-sm font-normal text-gray-500">
                        @ {optimizedRoute.stores[currentStoreIndex]?.retailerName}
                      </span>
                    )}
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
                        setTimeout(() => navigate('/'), 2000);
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