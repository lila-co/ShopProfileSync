import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { 
  Check, 
  MapPin, 
  Clock, 
  ArrowRight, 
  ArrowLeft,
  Store, 
  ShoppingCart,
  CheckCircle2,
  Circle,
  Navigation,
  Package,
  Star,
  AlertCircle,
  MoreVertical,
  Plus,
  Minus
} from 'lucide-react';
import Header from '@/components/layout/Header';
import BottomNavigation from '@/components/layout/BottomNavigation';

// Enhanced deal matching and application logic
interface AppliedDeal {
  itemId: number;
  dealId: number;
  dealType: string;
  originalPrice: number;
  dealPrice: number;
  savings: number;
  dealDescription: string;
}

interface CouponStackingResult {
  appliedDeals: AppliedDeal[];
  totalSavings: number;
  finalTotal: number;
  loyaltyDiscount?: number;
  stackedCoupons: any[];
}

// Enhanced deal application engine
const applyDealsAndCoupons = (routeItems: any[], deals: any[], loyaltyCard: any) => {
  const appliedDeals: AppliedDeal[] = [];
  let totalSavings = 0;
  let finalTotal = 0;
  const stackedCoupons: any[] = [];

  // Step 1: Match deals to items with enhanced matching
  const enhancedMatchDeals = (item: any, deals: any[]) => {
    const itemName = item.productName.toLowerCase();
    const itemCategory = item.category?.toLowerCase() || '';

    return deals.filter((deal: any) => {
      const dealName = deal.productName.toLowerCase();
      const dealCategory = deal.category?.toLowerCase() || '';

      // Exact product match (highest priority)
      if (itemName === dealName || 
          itemName.includes(dealName) || 
          dealName.includes(itemName)) {
        return true;
      }

      // Category match (medium priority)
      if (itemCategory && dealCategory && itemCategory === dealCategory) {
        return true;
      }

      // Semantic matching for common products
      const semanticMatches = [
        { keywords: ['milk', 'dairy'], category: 'dairy' },
        { keywords: ['bread', 'loaf'], category: 'bakery' },
        { keywords: ['chicken', 'poultry'], category: 'meat' },
        { keywords: ['apple', 'banana', 'fruit'], category: 'produce' }
      ];

      return semanticMatches.some(match => 
        match.keywords.some(keyword => 
          itemName.includes(keyword) && dealName.includes(keyword)
        )
      );
    });
  };

  // Step 2: Apply best deals per item
  routeItems.forEach(item => {
    const itemDeals = enhancedMatchDeals(item, deals);
    if (itemDeals.length === 0) {
      finalTotal += (item.suggestedPrice || 0) * item.quantity;
      return;
    }

    // Sort deals by savings potential (highest first)
    const sortedDeals = itemDeals.sort((a, b) => {
      const savingsA = calculateDealSavings(item, a);
      const savingsB = calculateDealSavings(item, b);
      return savingsB - savingsA;
    });

    const bestDeal = sortedDeals[0];
    const dealResult = applyDealToItem(item, bestDeal);

    if (dealResult.savings > 0) {
      appliedDeals.push(dealResult);
      totalSavings += dealResult.savings;
      finalTotal += dealResult.dealPrice * item.quantity;
    } else {
      finalTotal += (item.suggestedPrice || 0) * item.quantity;
    }
  });

  // Step 3: Apply loyalty card discounts
  let loyaltyDiscount = 0;
  if (loyaltyCard && loyaltyCard.discountPercentage) {
    loyaltyDiscount = finalTotal * (loyaltyCard.discountPercentage / 100);
    finalTotal -= loyaltyDiscount;
    totalSavings += loyaltyDiscount;
  }

  // Step 4: Apply store-wide coupons and promotions
  const storeWideCoupons = deals.filter(deal => 
    deal.dealType === 'spend_threshold_percentage' ||
    deal.dealType === 'store_wide_discount'
  );

  storeWideCoupons.forEach(coupon => {
    if (coupon.dealType === 'spend_threshold_percentage' && 
        finalTotal >= (coupon.spendThreshold || 0)) {
      const couponSavings = finalTotal * (coupon.discountPercentage / 100);
      finalTotal -= couponSavings;
      totalSavings += couponSavings;
      stackedCoupons.push({
        ...coupon,
        appliedSavings: couponSavings
      });
    }
  });

  return {
    appliedDeals,
    totalSavings,
    finalTotal,
    loyaltyDiscount,
    stackedCoupons
  };
};

const calculateDealSavings = (item: any, deal: any) => {
  const originalPrice = item.suggestedPrice || 0;
  const dealPrice = deal.salePrice || deal.regularPrice || originalPrice;
  return Math.max(0, originalPrice - dealPrice);
};

const applyDealToItem = (item: any, deal: any): AppliedDeal => {
  const originalPrice = item.suggestedPrice || 0;
  const dealPrice = deal.salePrice || originalPrice;
  const savings = Math.max(0, originalPrice - dealPrice);

  return {
    itemId: item.id,
    dealId: deal.id,
    dealType: deal.dealType || 'price_reduction',
    originalPrice,
    dealPrice,
    savings,
    dealDescription: `${deal.productName} - ${Math.round((1 - dealPrice / originalPrice) * 100)}% off`
  };
};

// Component to show retailer-specific deals for route items
const DealsForRetailer: React.FC<{ retailerName: string; routeItems: any[]; loyaltyCard?: any }> = ({ retailerName, routeItems, loyaltyCard }) => {
  const { data: retailers } = useQuery({
    queryKey: ['/api/retailers'],
  });

  const { data: deals } = useQuery({
    queryKey: ['/api/deals', { retailerName }],
    enabled: !!retailers && !!retailerName,
  });

  // Apply comprehensive deal logic
  const dealResults = React.useMemo(() => {
    if (!deals || !routeItems.length) return null;
    return applyDealsAndCoupons(routeItems, deals, loyaltyCard);
  }, [deals, routeItems, loyaltyCard]);

  if (!dealResults || dealResults.appliedDeals.length === 0) {
    return null;
  }

  const calculateSavings = (regular: number, sale: number) => {
    return Math.round((1 - sale / regular) * 100);
  };

  return null;
};

const ShoppingRoute: React.FC = () => {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mutation for updating shopping list items
  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, updates }: { itemId: number; updates: Partial<any> }) => {
      const response = await apiRequest('PATCH', `/api/shopping-list/items/${itemId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
    },
    onError: (error: any) => {
      console.error('Failed to update item:', error);
    }
  });

  // Get URL parameters from current location
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const listId = searchParams.get('listId') || '1'; // Default to list 1 if not provided
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
  const [outOfStockDialogOpen, setOutOfStockDialogOpen] = useState(false);
  const [outOfStockItem, setOutOfStockItem] = useState<any>(null);
  const [endStoreDialogOpen, setEndStoreDialogOpen] = useState(false);
  const [uncompletedItems, setUncompletedItems] = useState<any[]>([]);
  const [loyaltyBarcodeDialogOpen, setLoyaltyBarcodeDialogOpen] = useState(false);
  const [isShoppingComplete, setIsShoppingComplete] = useState(false);
  const [movedItems, setMovedItems] = useState<Array<{
    itemId: number;
    fromStore: string;
    toStore: string;
    productName: string;
  }>>([]);

  // Get current retailer name for loyalty card fetching
  const getCurrentRetailerName = () => {
    if (optimizedRoute?.isMultiStore && optimizedRoute.stores) {
      return optimizedRoute.stores[currentStoreIndex]?.retailerName;
    }
    return optimizedRoute?.retailerName;
  };

  // Fetch loyalty card info for the current retailer
  const { data: loyaltyCardData, refetch: refetchLoyaltyCard } = useQuery({
    queryKey: [`/api/user/loyalty-card/${getCurrentRetailerName()}`],
    enabled: !!getCurrentRetailerName(),
  });

  useEffect(() => {
    console.log('Loyalty card data effect triggered:', loyaltyCardData, 'for retailer:', getCurrentRetailerName());
    if (loyaltyCardData) {
      console.log('Setting loyalty card:', loyaltyCardData);
      setLoyaltyCard(loyaltyCardData);
    } else {
      setLoyaltyCard(null);
    }
  }, [loyaltyCardData, currentStoreIndex]);

  // Refetch loyalty card when store changes
  useEffect(() => {
    const retailerName = getCurrentRetailerName();
    if (retailerName && optimizedRoute?.isMultiStore) {
      console.log('Store changed, refetching loyalty card for:', retailerName);
      refetchLoyaltyCard();
    }
  }, [currentStoreIndex, optimizedRoute?.isMultiStore, refetchLoyaltyCard]);

  // Fetch shopping list and items
  const { data: shoppingList, isLoading } = useQuery({
    queryKey: [`/api/shopping-lists/${listId}`],
    enabled: !!listId,
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
    console.log('listId:', listId);

    let planDataToUse = null;

    // Clean up any existing session without meaningful progress first
    const persistentSessionKey = `shopping_session_${listId}`;
    const existingSession = localStorage.getItem(persistentSessionKey);
    if (existingSession) {
      try {
        const sessionData = JSON.parse(existingSession);
        const hasProgress = (sessionData.completedItems && sessionData.completedItems.length > 0) ||
                           (sessionData.currentAisleIndex && sessionData.currentAisleIndex > 1) ||
                           (sessionData.currentStoreIndex && sessionData.currentStoreIndex > 0);

        if (!hasProgress) {
          localStorage.removeItem(persistentSessionKey);
          localStorage.removeItem(`interruptedSession-${listId}`);
        }
      } catch (error) {
        localStorage.removeItem(persistentSessionKey);
        localStorage.removeItem(`interruptedSession-${listId}`);
      }
    }

    // Check for persistent shopping session (survives app closure)
    const persistentSession = localStorage.getItem(persistentSessionKey);

    if (persistentSession) {
      try {
        const sessionData = JSON.parse(persistentSession);
        console.log('Found persistent shopping session:', sessionData);

        // Check if session is still valid (within 24 hours)
        const sessionAge = Date.now() - sessionData.timestamp;
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours

        if (sessionAge < maxAge) {
          planDataToUse = sessionData.planData;

          // Set restoration flag to prevent false "started shopping" detection
          setIsRestoringSession(true);

          // Restore shopping progress
          if (sessionData.currentStoreIndex !== undefined) {
            setCurrentStoreIndex(sessionData.currentStoreIndex);
          }
          if (sessionData.currentAisleIndex !== undefined) {
            setCurrentAisleIndex(sessionData.currentAisleIndex);
          }
          if (sessionData.completedItems) {
            setCompletedItems(new Set(sessionData.completedItems));
          }
          setMovedItems(sessionData.movedItems || []);

          // Restore hasStartedShopping state from session
          if (sessionData.hasStartedShopping !== undefined) {
            setHasStartedShopping(sessionData.hasStartedShopping);
          } else {
            // Fallback: Check if the session had actual progress
            const sessionHadProgress = (sessionData.completedItems && sessionData.completedItems.length > 0) ||
                                      sessionData.currentAisleIndex > 0 ||
                                      sessionData.currentStoreIndex > 0;
            setHasStartedShopping(sessionHadProgress);
          }

          // Clear restoration flag after a brief delay
          setTimeout(() => setIsRestoringSession(false), 100);

          console.log('Restored shopping session - Store:', sessionData.currentStoreIndex, 'Aisle:', sessionData.currentAisleIndex);

          // Resume shopping silently - the UI will show the current state
        } else {
          // Clean up old session
          localStorage.removeItem(persistentSessionKey);
          console.log('Cleaned up expired shopping session');
        }
      } catch (error) {
        console.error('Error parsing persistent session:', error);
        localStorage.removeItem(persistentSessionKey);
      }
    }

    // Try sessionStorage if no persistent session (for same-session navigation)
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

    // If no stored data, try URL parameter
    if (!planDataToUse && planDataParam) {
      try {
        planDataToUse = JSON.parse(decodeURIComponent(planDataParam));
        console.log('Successfully parsed plan data from URL:', planDataToUse);
      } catch (error) {
        console.error('Error parsing URL plan data:', error);
      }
    }

    if (planDataToUse) {
      setSelectedPlanData(planDataToUse);

      // Generate route from the selected plan
      const route = generateOptimizedShoppingRouteFromPlan(planDataToUse);
      console.log('Generated route from plan:', route);
      setOptimizedRoute(route);
      setStartTime(new Date());

      // Don't save session immediately - only save when user actually starts shopping

      // Route ready - no toast needed as user can see the interface
    } else if (shoppingList?.items && shoppingList.items.length > 0) {
      console.log('Using shopping list items as fallback, listId:', listId);

      // Create a simple plan data structure from shopping list items
      const fallbackPlanData = {
        stores: [{
          retailer: { name: 'Store', id: 1 },
          items: shoppingList.items,
          subtotal: shoppingList.items.reduce((sum: number, item: any) => 
            sum + (item.suggestedPrice || 0) * item.quantity, 0)
        }],
        totalCost: shoppingList.items.reduce((sum: number, item: any) => 
          sum + (item.suggestedPrice || 0) * item.quantity, 0),
        planType: 'Shopping List',
        listId: listId
      };

      const route = generateOptimizedShoppingRouteFromPlan(fallbackPlanData);
      console.log('Generated route from shopping list fallback:', route);
      setOptimizedRoute(route);
      setSelectedPlanData(fallbackPlanData);
      setStartTime(new Date());

      // Route created from shopping list - no toast needed
    } else {
      console.log('No data available for shopping route, listId:', listId, 'shoppingList:', shoppingList);
      toast({
        title: "No Shopping Data",
        description: "Unable to create shopping route. Please go back and select a plan.",
        variant: "destructive",
        duration: 5000
      });
    }
  }, [shoppingList, planDataParam, location, toast, listId]);

  // Track if user has actually started shopping (moved aisles or completed items)
  const [hasStartedShopping, setHasStartedShopping] = useState(false);

  // Track if we're currently restoring a session to avoid false "started shopping" detection
  const [isRestoringSession, setIsRestoringSession] = useState(false);

  // Check if user has started shopping based on progress
  useEffect(() => {
    // Only set hasStartedShopping to true if user has made meaningful progress
    // Don't count initial state restoration as "starting"
    const hasActualProgress = completedItems.size > 0 || 
                             (currentAisleIndex > 0 && !isRestoringSession) || 
                             (currentStoreIndex > 0 && !isRestoringSession);

    if (hasActualProgress) {
      setHasStartedShopping(true);
    }
  }, [completedItems.size, currentAisleIndex, currentStoreIndex]);

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

  // Define shelf location logic based on product and category
  const getShelfLocation = (productName: string, category: string) => {
    const name = productName.toLowerCase();

    // Produce section - specific areas
    if (category === 'Produce') {
      if (name.includes('banana') || name.includes('apple') || name.includes('orange')) {
        return 'Front entrance display';
      }
      if (name.includes('lettuce') || name.includes('spinach') || name.includes('salad')) {
        return 'Refrigerated greens wall';
      }
      if (name.includes('pepper') || name.includes('onion') || name.includes('tomato')) {
        return 'Center produce bins';
      }
      if (name.includes('avocado') || name.includes('lime') || name.includes('lemon')) {
        return 'Citrus & specialty section';
      }
      return 'Main produce area';
    }

    // Dairy & Eggs - specific refrigerated sections
    if (category === 'Dairy & Eggs') {
      if (name.includes('milk')) return 'Back wall - dairy cooler';
      if (name.includes('egg')) return 'Dairy cooler - middle shelf';
      if (name.includes('cheese')) return 'Specialty cheese section';
      if (name.includes('yogurt')) return 'Dairy cooler - top shelf';
      if (name.includes('butter')) return 'Dairy cooler - bottom shelf';
      return 'Main dairy section';
    }

    // Meat & Seafood
    if (category === 'Meat & Seafood') {
      if (name.includes('chicken') || name.includes('turkey')) {
        return 'Poultry case - left side';
      }
      if (name.includes('beef') || name.includes('ground')) {
        return 'Beef case - center';
      }
      if (name.includes('fish') || name.includes('salmon') || name.includes('seafood')) {
        return 'Seafood counter';
      }
      return 'Meat department';
    }

    // Frozen Foods
    if (category === 'Frozen Foods') {
      if (name.includes('ice cream')) return 'Frozen desserts aisle';
      if (name.includes('pizza')) return 'Frozen meals - left side';
      if (name.includes('vegetable')) return 'Frozen vegetables';
      return 'Frozen foods section';
    }

    // Bakery
    if (category === 'Bakery') {
      if (name.includes('bread') || name.includes('loaf')) {
        return 'Bread aisle - packaged goods';
      }
      return 'Fresh bakery counter';
    }

    // Pantry & Canned Goods - more specific locations
    if (category === 'Pantry & Canned Goods') {
      if (name.includes('cereal')) return 'Cereal aisle - eye level';
      if (name.includes('pasta')) return 'Pasta & sauce aisle';
      if (name.includes('rice') || name.includes('quinoa')) {
        return 'Grains & rice section';
      }
      if (name.includes('oil') || name.includes('vinegar')) {
        return 'Cooking oils & condiments';
      }
      if (name.includes('can') || name.includes('soup')) {
        return 'Canned goods - center aisles';
      }
      return 'Center store aisles';
    }

    // Personal Care
    if (category === 'Personal Care') {
      if (name.includes('shampoo') || name.includes('soap')) {
        return 'Health & beauty - left wall';
      }
      if (name.includes('toothpaste')) return 'Oral care section';
      return 'Health & beauty department';
    }

    // Household Items
    if (category === 'Household Items') {
      if (name.includes('detergent') || name.includes('cleaner')) {
        return 'Cleaning supplies aisle';
      }
      if (name.includes('paper') || name.includes('towel')) {
        return 'Paper goods aisle';
      }
      return 'Household goods section';
    }

    // Beverages
    if (name.includes('water') || name.includes('soda') || name.includes('juice')) {
      if (name.includes('sparkling') || name.includes('carbonated')) {
        return 'Beverage aisle - carbonated drinks';
      }
      return 'Beverage aisle - main section';
    }

    // Generic fallback
    return 'Check store directory';
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
      'Household Items': { aisle: 'Aisle 10', category: 'Household Items', order: 8, color: 'bg-gray-100 text-gray-800' },
      'Generic': { aisle: 'Generic', category: 'Generic Items', order: 9, color: 'bg-slate-100 text-slate-800' }
    };

    // Group items by aisle using AI categorization
    const aisleGroups: { [key: string]: any } = {};

    // Process items with AI categorization
    items.forEach((item: any) => {
      // Use existing category if available
      let itemCategory = item.category;
      let categoryConfidence = 0.9; // High confidence for existing categories

      if (!itemCategory) {
        const fallbackResult = aiCategorizationService.getQuickCategory(item.productName);
        itemCategory = fallbackResult.category;
        categoryConfidence = fallbackResult.confidence || 0.7;
      }

      const aisleInfo = aisleMapping[itemCategory as keyof typeof aisleMapping] || 
                       aisleMapping['Generic'];

      const aisleName = aisleInfo.aisle;

      if (!aisleGroups[aisleName]) {
        aisleGroups[aisleName] = {
          aisleName,
          category: aisleInfo.category,
          order: aisleInfo.order,
          color: aisleInfo.color,
          items: []
        };
      }

      // Add location and confidence for better UX
      const itemWithLocation = {
        ...item,
        shelfLocation: getShelfLocation(item.productName, itemCategory),
        confidence: categoryConfidence,
        category: itemCategory
      };

      aisleGroups[aisleName].items.push(itemWithLocation);
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

    const finalRetailerName = retailerName || 'Store';
    console.log('Generated route with retailer name:', finalRetailerName);

    return {
      aisleGroups: sortedAisleGroups,
      totalAisles,
      estimatedTime: Math.round(estimatedTime),
      routeOrder: sortedAisleGroups.map((group: any) => group.aisleName),
      retailerName: finalRetailerName,
      totalItems: items.length,
      planType: planData?.planType || 'Shopping Plan',
      totalCost: 0,
      savings: 0
    };
  };

  // Save shopping session to localStorage (survives app closure)
  const savePersistentShoppingSession = (planData: any, route: any) => {
    // Always save session once shopping route is loaded, regardless of progress
    if (!planData || !route) {
      return;
    }

    try {
      const sessionKey = `shopping_session_${listId}`;
      const currentStore = route?.isMultiStore && route.stores 
        ? route.stores[currentStoreIndex] 
        : { retailerName: route?.retailerName };

      const sessionData = {
        planData,
        listId,
        currentStoreIndex,
        currentAisleIndex,
        movedItems,
        completedItems: Array.from(completedItems),
        timestamp: Date.now(),
        currentStoreName: currentStore?.retailerName,
        isMultiStore: route?.isMultiStore || false,
        totalStores: route?.stores?.length || 1,
        hasStartedShopping: hasStartedShopping
      };

      localStorage.setItem(sessionKey, JSON.stringify(sessionData));
    } catch (error) {
      console.warn('Failed to save shopping session:', error);
    }
  };

  // Save session immediately when route is created and on any state change
  useEffect(() => {
    if (optimizedRoute && selectedPlanData) {
      savePersistentShoppingSession(selectedPlanData, optimizedRoute);
    }
  }, [currentStoreIndex, currentAisleIndex, completedItems, optimizedRoute, selectedPlanData, hasStartedShopping, movedItems]);

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

      // Generate aisles for current store including moved items
      const storeRoute = generateOptimizedShoppingRoute(currentStore.items, currentStore.retailerName);
      if (!storeRoute.aisleGroups || !storeRoute.aisleGroups[currentAisleIndex]) return null;

      return storeRoute.aisleGroups[currentAisleIndex];
    }

    return optimizedRoute.aisleGroups[currentAisleIndex];
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

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
      {/* Custom Header with Back Navigation */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/plan-details?listId=' + listId)}
          className="p-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold flex-1">Shopping Route</h1>
        {optimizedRoute && (
          <Badge variant="outline" className="text-xs">
            {Math.round(getProgressPercentage())}% Complete
          </Badge>
        )}
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-20">
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
                          onClick={() => {
                            if (isCompleted) {
                              // Handle unchecking item
                              const newCompletedItems = new Set(completedItems);
                              newCompletedItems.delete(item.id);
                              setCompletedItems(newCompletedItems);
                              toggleItemMutation.mutate({ itemId: item.id, completed: false });
                            } else {
                              // Handle checking item - mark as complete directly
                              const newCompletedItems = new Set(completedItems);
                              newCompletedItems.add(item.id);
                              setCompletedItems(newCompletedItems);
                              toggleItemMutation.mutate({ itemId: item.id, completed: true });
                            }
                          }}
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
            </CardContent>
          </Card>
        )}
      </main>

      <BottomNavigation activeTab="lists" />
    </div>
  );
};

export default ShoppingRoute;