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
  MoreVertical
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

          // Check if the session had actual progress to set hasStartedShopping correctly
          const sessionHadProgress = (sessionData.completedItems && sessionData.completedItems.length > 0) ||
                                    sessionData.currentAisleIndex > 0 ||
                                    sessionData.currentStoreIndex > 0;

          if (sessionHadProgress) {
            setHasStartedShopping(true);
          }

          // Clear restoration flag after a brief delay
          setTimeout(() => setIsRestoringSession(false), 100);

          console.log('Restored shopping session - Store:', sessionData.currentStoreIndex, 'Aisle:', sessionData.currentAisleIndex);

          toast({
            title: "Shopping Session Restored",
            description: `Continuing from where you left off at ${sessionData.currentStoreName || 'your store'}`,
            duration: 4000
          });
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

      toast({
        title: "Shopping Route Ready!",
        description: `Your shopping route has been created from your selected plan`,
        duration: 3000
      });
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

      toast({
        title: "Shopping Route Created",
        description: "Using your shopping list items",
        duration: 3000
      });
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
      'Personal Care': { aisle: 'Aisle 9', category: 'Personal Care', order: 7, color: 'bg-purple-100 text-purple-100 text-purple-100 text-purple-800' },
      'Household Items': { aisle: 'Aisle 10', category: 'Household Items', order: 8, color: 'bg-gray-100 text-gray-800' },
      'Generic': { aisle: 'Generic', category: 'Generic Items', order: 9, color: 'bg-slate-100 text-slate-800' }
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

      // Create AI categorization promise for more accurate results (only if we don't have a category)
      if (!item.category) {
        const aiPromise = categorizeItemWithAI(item.productName).then(result => {
          const betterAisleInfo = aisleMapping[result.category as keyof typeof aisleMapping] || 
                                 aisleMapping['Generic'];

          // Update the item if we get better categorization
          if (result.confidence > categoryConfidence) {
            const betterAisleName = betterAisleInfo.aisle;

            // Remove from current aisle if needed
            if (betterAisleName !== aisleName) {
              const currentAisleItems = aisleGroups[aisleName]?.items || [];
              const itemIndex = currentAisleItems.findIndex(i => i.id === item.id);
              if (itemIndex > -1) {
                currentAisleItems.splice(itemIndex, 1);
              }

              // Add to better aisle
              if (!aisleGroups[betterAisleName]) {
                aisleGroups[betterAisleName] = {
                  aisleName: betterAisleName,
                  category: betterAisleInfo.category,
                  order: betterAisleInfo.order,
                  color: betterAisleInfo.color,
                  items: []
                };
              }

              aisleGroups[betterAisleName].items.push({
                ...itemWithLocation,
                shelfLocation: getShelfLocation(item.productName, result.category),
                confidence: result.confidence,
                category: result.category
              });
            } else {
              // Update in place
              const itemToUpdate = aisleGroups[aisleName].items.find(i => i.id === item.id);
              if (itemToUpdate) {
                itemToUpdate.shelfLocation = getShelfLocation(item.productName, result.category);
                itemToUpdate.confidence = result.confidence;
                itemToUpdate.category = result.category;
              }
            }
          }
        }).catch(error => {
          console.warn(`Failed to get AI categorization for ${item.productName}:`, error);
        });

        itemPromises.push(aiPromise);
      }
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

  const handleToggleItem = (itemId: number, currentStatus: boolean, item?: any) => {
    if (!currentStatus && item) {
      // Item is being checked off - show out-of-stock option
      setOutOfStockItem(item);
      setOutOfStockDialogOpen(true);
      return;
    }

    // Handle unchecking item
    const newCompletedItems = new Set(completedItems);
    newCompletedItems.delete(itemId);
    setCompletedItems(newCompletedItems);
    toggleItemMutation.mutate({ itemId, completed: false });
  };

  const handleItemFound = () => {
    if (outOfStockItem) {
      const newCompletedItems = new Set(completedItems);
      newCompletedItems.add(outOfStockItem.id);
      setCompletedItems(newCompletedItems);

      updateItemMutation.mutate({
        itemId: outOfStockItem.id,
        updates: {
          isCompleted: true
        }
      });


    }
    setOutOfStockDialogOpen(false);
    setOutOfStockItem(null);
  };

  const handleLeaveForFutureTrip = () => {
    if (outOfStockItem) {
      updateItemMutation.mutate({
        itemId: outOfStockItem.id,
        updates: {
          notes: 'Left for future trip due to out-of-stock',
          isCompleted: false
        }
      });

      // Remove item from current shopping route display
      if (optimizedRoute?.aisleGroups) {
        optimizedRoute.aisleGroups.forEach((aisle: any) => {
          const itemIndex = aisle.items.findIndex((item: any) => item.id === outOfStockItem.id);
          if (itemIndex > -1) {
            aisle.items.splice(itemIndex, 1);
          }
        });
      }

      // For multi-store plans, also remove from current store's items
      if (optimizedRoute?.isMultiStore && optimizedRoute.stores) {
        const currentStore = optimizedRoute.stores[currentStoreIndex];
        if (currentStore) {
          const itemIndex = currentStore.items.findIndex((item: any) => item.id === outOfStockItem.id);
          if (itemIndex > -1) {
            currentStore.items.splice(itemIndex, 1);
          }
        }
      }

      // Force a re-render by updating the route state
      setOptimizedRoute({...optimizedRoute});

      toast({
        title: "Item Saved for Next Trip",
        description: `${outOfStockItem.productName} will remain on your list for next time`,
        duration: 3000
      });
    }
    setOutOfStockDialogOpen(false);
    setOutOfStockItem(null);
  };

  const handleRemoveFromList = async () => {
    if (outOfStockItem) {
      try {
        // Delete the item from the shopping list entirely
        await apiRequest('DELETE', `/api/shopping-list/items/${outOfStockItem.id}`);

        // Create a new optimized route with the item removed
        setOptimizedRoute((prevRoute: any) => {
          if (!prevRoute) return prevRoute;

          const newAisleGroups = prevRoute.aisleGroups.map((aisle: any) => ({
            ...aisle,
            items: aisle.items.filter((routeItem: any) => routeItem.id !== outOfStockItem.id)
          })).filter((aisle: any) => aisle.items.length > 0); // Remove empty aisles

          return {
            ...prevRoute,
            aisleGroups: newAisleGroups,
            totalItems: prevRoute.totalItems - 1
          };
        });

        // For multi-store plans, also remove from current store's items
        if (optimizedRoute?.isMultiStore && optimizedRoute.stores) {
          const updatedStores = [...optimizedRoute.stores];
          const currentStore = updatedStores[currentStoreIndex];
          if (currentStore) {
            currentStore.items = currentStore.items.filter((storeItem: any) => storeItem.id !== outOfStockItem.id);
          }
          setOptimizedRoute((prevRoute: any) => ({
            ...prevRoute,
            stores: updatedStores
          }));
        }

        // Invalidate queries to refresh the shopping list
        queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
        queryClient.invalidateQueries({ queryKey: [`/api/shopping-lists/${listId}`] });

        toast({
          title: "Item Removed",
          description: `${outOfStockItem.productName} has been removed from your list`,
          duration: 3000
        });
      } catch (error) {
        console.error('Failed to remove item:', error);
        toast({
          title: "Error",
          description: "Failed to remove item from list",
          variant: "destructive",
          duration: 3000
        });
      }
    }
    setOutOfStockDialogOpen(false);
    setOutOfStockItem(null);
  };

  const handleMigrateToNextStore = () => {
    if (outOfStockItem && optimizedRoute?.isMultiStore && optimizedRoute.stores) {
      // Find the best next store for this item based on availability and price
      const remainingStores = optimizedRoute.stores.slice(currentStoreIndex + 1);

      if (remainingStores.length === 0) {
        // No more stores left, save for future trip
        handleLeaveForFutureTrip();
        return;
      }

      // For now, add to the immediate next store (can be enhanced with price comparison later)
      const nextStore = remainingStores[0];
      const nextStoreIndex = currentStoreIndex + 1;

      // Add item to next store's items if not already there
      const itemExistsInNextStore = nextStore.items.some((item: any) => 
        item.productName.toLowerCase() === outOfStockItem.productName.toLowerCase()
      );

      if (!itemExistsInNextStore) {
        // Add item to next store's items array
        nextStore.items.push({
          ...outOfStockItem,
          storeName: nextStore.retailerName,
          suggestedRetailerId: nextStore.retailer?.id || nextStore.suggestedRetailerId,
          id: outOfStockItem.id + (nextStoreIndex * 1000), // Unique temporary ID
          movedFrom: optimizedRoute.stores[currentStoreIndex]?.retailerName
        });
      }

      // Update the item in the database to reflect the new store assignment
      updateItemMutation.mutate({
        itemId: outOfStockItem.id,
        updates: {
          suggestedRetailerId: nextStore.retailer?.id || nextStore.suggestedRetailerId,
          notes: `Moved from ${optimizedRoute.stores[currentStoreIndex]?.retailerName} - not available. Try at ${nextStore.retailerName}`,
          isCompleted: false
        }
      });

      // Remove item from current store's route display
      const currentStore = optimizedRoute.stores[currentStoreIndex];
      if (currentStore) {
        const itemIndex = currentStore.items.findIndex((item: any) => item.id === outOfStockItem.id);
        if (itemIndex > -1) {
          currentStore.items.splice(itemIndex, 1);
        }
      }

      // Also remove from current aisle in the optimized route display
      if (optimizedRoute.aisleGroups) {
        optimizedRoute.aisleGroups.forEach((aisle: any) => {
          const itemIndex = aisle.items.findIndex((routeItem: any) => routeItem.id === item.id);
          if (itemIndex > -1) {
            aisle.items.splice(itemIndex, 1);
          }
        });
      }

      // Force a re-render by updating the route state
      setOptimizedRoute({...optimizedRoute});

      toast({
        title: "Item Moved to Next Store",
        description: `${outOfStockItem.productName} will be available at ${nextStore.retailerName}`,
        duration: 3000
      });
    } else {
      // For single-store plans, create a reminder or alternative suggestion
      updateItemMutation.mutate({
        itemId: outOfStockItem.id,
        updates: {
          notes: `Try alternative store - not available at ${optimizedRoute?.retailerName || 'current store'}`,
          isCompleted: false
        }
      });

      toast({
        title: "Item Marked for Alternative Store",
        description: `${outOfStockItem.productName} saved with note to try alternative store`,
        duration: 3000
      });
    }
    setOutOfStockDialogOpen(false);
    setOutOfStockItem(null);
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

  const handleEndStore = () => {
    console.log('handleEndStore called, loyaltyCard:', loyaltyCard, 'retailer:', getCurrentRetailerName());

    // Show loyalty barcode dialog first if user has a loyalty card for current retailer
    if (loyaltyCard && loyaltyCard.retailerName === getCurrentRetailerName()) {
      console.log('Showing loyalty barcode dialog for:', getCurrentRetailerName());
      setLoyaltyBarcodeDialogOpen(true);
      return;
    }

    // Check if this is the last store (single store or last store in multi-store)
    const isLastStore = !optimizedRoute?.isMultiStore || 
                        (optimizedRoute?.isMultiStore && currentStoreIndex >= optimizedRoute.stores.length - 1);

    if (isLastStore) {
      // Only show uncompleted items dialog for the final store/end of shopping
      let allStoreItems: any[] = [];

      if (optimizedRoute?.isMultiStore && optimizedRoute.stores) {
        const currentStore = optimizedRoute.stores[currentStoreIndex];
        allStoreItems = currentStore?.items || [];
      } else {
        // Single store - get all items from all aisles
        allStoreItems = optimizedRoute?.aisleGroups?.flatMap(aisle => aisle.items) || [];
      }

      // Find uncompleted items
      const uncompleted = allStoreItems.filter(item => 
        !completedItems.has(item.id) && !item.isCompleted
      );

      if (uncompleted.length === 0) {
        // No uncompleted items, proceed with completion
        completeCurrentStore();
      } else {
        // Show dialog for uncompleted items only at the end
        setUncompletedItems(uncompleted);
        setEndStoreDialogOpen(true);
      }
    } else {
      // For intermediate stores in multi-store plans, just move to next store
      completeCurrentStore();
    }
  };

  const completeCurrentStore = async () => {
    const currentRetailerName = optimizedRoute?.isMultiStore 
      ? optimizedRoute.stores[currentStoreIndex]?.retailerName 
      : optimizedRoute?.retailerName;

    // Show immediate feedback for store completion
    toast({
      title: `${currentRetailerName} Complete!`,
      description: "Processing your completed items...",
      duration: 2000
    });

    // Get all items from the current shopping route
    const itemsToProcess = optimizedRoute?.aisleGroups?.flatMap(aisle => aisle.items) || [];
    console.log(`Processing ${itemsToProcess.length} items, ${completedItems.size} marked as completed`);

    // Separate completed and uncompleted items
    const completedItemIds = Array.from(completedItems);
    const uncompletedItemIds = itemsToProcess
      .filter(item => !completedItems.has(item.id))
      .map(item => item.id);

    console.log(`Items to delete (completed): ${completedItemIds}`);
    console.log(`Items to keep (uncompleted): ${uncompletedItemIds}`);

    // Delete only the completed items from the shopping list
    if (completedItemIds.length > 0) {
      const deletePromises = completedItemIds.map(async (itemId) => {
        try {
          console.log(`Deleting completed item ${itemId}`);
          const response = await apiRequest('DELETE', `/api/shopping-list/items/${itemId}`);

          if (response.ok) {
            console.log(`Successfully deleted completed item ${itemId}`);
            return { success: true, itemId };
          } else {
            console.error(`Failed to delete completed item ${itemId}: HTTP ${response.status}`);
            return { success: false, itemId, error: `HTTP ${response.status}` };
          }
        } catch (error) {
          console.error(`Failed to delete completed item ${itemId}:`, error);
          return { success: false, itemId, error: error.message };
        }
      });

      // Wait for all deletions to complete
      const deleteResults = await Promise.allSettled(deletePromises);

      // Log results for debugging
      const successfulDeletes = deleteResults.filter(result => 
        result.status === 'fulfilled' && result.value?.success
      ).length;
      const failedDeletes = deleteResults.filter(result => 
        result.status === 'rejected' || (result.status === 'fulfilled' && !result.value?.success)
      ).length;

      console.log(`Deletion results: ${successfulDeletes}/${completedItemIds.length} successful, ${failedDeletes} failed`);

      if (successfulDeletes > 0) {
        toast({
          title: "Items Completed",
          description: `${successfulDeletes} items removed from your shopping list`,
          duration: 3000
        });
      }
    }

    // Update uncompleted items with notes (but don't delete them)
    if (uncompletedItemIds.length > 0) {
      console.log(`Updating ${uncompletedItemIds.length} uncompleted items with notes`);

      const updatePromises = uncompletedItemIds.map(async (itemId) => {
        try {
          const item = itemsToProcess.find(i => i.id === itemId);
          const notes = `Not purchased during shopping trip on ${new Date().toLocaleDateString()} at ${currentRetailerName}`;

          await updateItemMutation.mutateAsync({
            itemId,
            updates: {
              isCompleted: false,
              notes: notes
            }
          });

          return { success: true, itemId };
        } catch (error) {
          console.error(`Failed to update uncompleted item ${itemId}:`, error);
          return { success: false, itemId };
        }
      });

      await Promise.allSettled(updatePromises);
    }

    // Invalidate queries to refresh the shopping list
    queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
    queryClient.invalidateQueries({ queryKey: [`/api/shopping-lists/${listId}`] });

    // Record the completed shopping trip for analytics
    try {
      await apiRequest('POST', '/api/shopping-trip/complete', {
        listId: listId,
        completedItems: completedItemIds,
        uncompletedItems: uncompletedItemIds.map(id => {
          const item = itemsToProcess.find(i => i.id === id);
          return {
            id,
            productName: item?.productName || 'Unknown',
            reason: 'not_found'
          };
        }),
        startTime: startTime,
        endTime: new Date(),
        retailerName: currentRetailerName
      });
    } catch (error) {
      console.warn('Failed to record shopping trip analytics:', error);
    }

    // Handle multi-store vs single store completion
    if (optimizedRoute?.isMultiStore && optimizedRoute.stores) {
      if (currentStoreIndex < optimizedRoute.stores.length - 1) {
        // Move to next store
        const nextStoreIndex = currentStoreIndex + 1;
        const nextStore = optimizedRoute.stores[nextStoreIndex];

        // Update state for next store
        setCurrentStoreIndex(nextStoreIndex);
        setCurrentAisleIndex(0);
        setCompletedItems(new Set()); // Reset completed items for new store

        // Show transition message with delay to ensure it's visible
        setTimeout(() => {
          toast({
            title: "🏪 Moving to Next Store",
            description: `Now shopping at ${nextStore.retailerName} (Store ${nextStoreIndex + 1} of ${optimizedRoute.stores.length})`,
            duration: 4000
          });
        }, 500);
      } else {
        // All stores completed - show completion message before ending
        setTimeout(() => {
          toast({
            title: "🎉 All Stores Complete!",
            description: "You've finished shopping at all stores. Great job!",
            duration: 3000
          });

          // End shopping after showing the message
          setTimeout(() => {
            endShopping();
          }, 1000);
        }, 500);
      }
    } else {
      // Single store completion - end shopping
      setTimeout(() => {
        endShopping();
      }, 1000);
    }
  };

  const endShopping = async () => {
    setIsShoppingComplete(true);

    // Get all uncompleted items across all stores
    let allUncompletedItems: any[] = [];
    let allMovedItems: any[] = [];

    if (optimizedRoute?.isMultiStore && optimizedRoute.stores) {
      // Multi-store: collect uncompleted items from all stores
      optimizedRoute.stores.forEach((store, index) => {
        const storeUncompleted = store.items.filter((item: any) => 
          !completedItems.has(item.id) && !item.isCompleted
        );

        // Track which items were moved between stores
        const itemsMovedFromThisStore = store.items.filter((item: any) => 
          item.movedFrom && item.movedFrom !== store.retailerName
        );

        allUncompletedItems.push(...storeUncompleted.map(item => ({
          ...item,
          storeName: store.retailerName,
          storeIndex: index
        })));

        allMovedItems.push(...itemsMovedFromThisStore.map(item => ({
          ...item,
          fromStore: item.movedFrom,
          toStore: store.retailerName,
          reason: 'unavailable_at_original_store'
        })));
      });
    } else {
      // Single store: get uncompleted items from current route
      allUncompletedItems = optimizedRoute?.aisleGroups?.flatMap(aisle => 
        aisle.items.filter(item => !completedItems.has(item.id) && !item.isCompleted)
      ) || [];
    }

    // Mark uncompleted items as not completed and add note with shopping trip context
    if (allUncompletedItems.length > 0) {
      for (const item of allUncompletedItems) {
        try {
          await updateItemMutation.mutateAsync({
            itemId: item.id,
            updates: {
              isCompleted: false,
              notes: `Returned to list - not purchased during shopping trip on ${new Date().toLocaleDateString()}`
            }
          });
        } catch (error) {
          console.warn(`Failed to update item ${item.id}:`, error);
        }
      }

      const storeText = optimizedRoute?.isMultiStore 
        ? `all ${optimizedRoute.stores.length} stores` 
        : optimizedRoute?.retailerName || 'the store';

      toast({
        title: "🛒 Shopping Trip Complete!",
        description: `Finished shopping at ${storeText}. ${allUncompletedItems.length} items returned to your list for next time.`,
        duration: 6000
      });
    } else {
      const storeText = optimizedRoute?.isMultiStore 
        ? `all ${optimizedRoute.stores.length} stores` 
        : optimizedRoute?.retailerName || 'the store';

      toast({
        title: "🎉 Perfect Shopping Trip!",
        description: `Completed all items at ${storeText}. Excellent work!`,
        duration: 6000
      });
    }

    // Send comprehensive analytics to server (don't block on this)
    const tripAnalytics = {
      listId: listId,
      completedItems: Array.from(completedItems),
      uncompletedItems: allUncompletedItems.map(item => ({
        ...item,
        reason: item.notes?.includes('out of stock') ? 'out_of_stock' : 'not_found'
      })),
      movedItems: allMovedItems,
      startTime: startTime,
      endTime: new Date(),
      retailerName: optimizedRoute?.isMultiStore ? 'Multi-Store' : optimizedRoute?.retailerName,
      planType: optimizedRoute?.planType,
      totalStores: optimizedRoute?.isMultiStore ? optimizedRoute.stores.length : 1
    };

    fetch('/api/shopping-trip/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(tripAnalytics)
    }).then(() => {
      console.log('Shopping trip analytics sent successfully');
    }).catch(error => {
      console.warn('Failed to send shopping trip analytics:', error);
    });

    // Clear any temporary shopping data
    sessionStorage.removeItem('shoppingPlanData');

    // Mark persistent shopping session as completed before clearing
    const persistentSessionKey = `shopping_session_${listId}`;
    const existingSession = localStorage.getItem(persistentSessionKey);
    if (existingSession) {
      try {
        const sessionData = JSON.parse(existingSession);
        // Mark as completed before removing
        sessionData.isCompleted = true;
        sessionData.completedAt = Date.now();
        localStorage.setItem(persistentSessionKey, JSON.stringify(sessionData));

        // Clear after a brief delay to allow plan-details to detect completion
        setTimeout(() => {
          localStorage.removeItem(persistentSessionKey);
          localStorage.removeItem(`interruptedSession-${listId}`);
          console.log('Cleared persistent shopping session');
        }, 500);
      } catch (error) {
        console.warn('Error updating session completion status:', error);
        localStorage.removeItem(persistentSessionKey);
      }
    }
    localStorage.removeItem(`interruptedSession-${listId}`);

    // Navigate back to shopping list after a delay to allow user to see the completion message
    setTimeout(() => {
      navigate('/shopping-list');
    }, 3000);
  };

  const handleMarkAllFound = () => {
    const newCompletedItems = new Set(completedItems);
    uncompletedItems.forEach(item => {
      newCompletedItems.add(item.id);
      toggleItemMutation.mutate({ itemId: item.id, completed: true });
    });
    setCompletedItems(newCompletedItems);
    setEndStoreDialogOpen(false);

    toast({
      title: "Items Marked as Found",
      description: `Marked ${uncompletedItems.length} items as found`,
      duration: 3000
    });

    completeCurrentStore();
  };

  const handleTryNextStore = () => {
    if (optimizedRoute?.isMultiStore && optimizedRoute.stores) {
      const nextStoreIndex = (currentStoreIndex + 1) % optimizedRoute.stores.length;
      const nextStore = optimizedRoute.stores[nextStoreIndex];

      // Move uncompleted items to next store
      uncompletedItems.forEach(item => {
        // Add item to next store's items if not already there
        const itemExistsInNextStore = nextStore.items.some((storeItem: any) => 
          storeItem.productName.toLowerCase() === item.productName.toLowerCase()
        );

        if (!itemExistsInNextStore) {
          nextStore.items.push({
            ...item,
            storeName: nextStore.retailerName,
            suggestedRetailerId: nextStore.retailer?.id || nextStore.suggestedRetailerId,
            id: item.id + 10000
          });
        }

        // Update the item in the database
        updateItemMutation.mutate({
          itemId: item.id,
          updates: {
            suggestedRetailerId: nextStore.retailer?.id || nextStore.suggestedRetailerId,
            notes: `Moved from ${optimizedRoute.stores[currentStoreIndex]?.retailerName} - try at ${nextStore.retailerName}`,
            isCompleted: false
          }
        });
      });

      setEndStoreDialogOpen(false);

      toast({
        title: "Items Moved to Next Store",
        description: `${uncompletedItems.length} items will be available at ${nextStore.retailerName}`,
        duration: 4000
      });

      completeCurrentStore();
    } else {
      // Single store - create reminder for alternative store
      uncompletedItems.forEach(item => {
        updateItemMutation.mutate({
          itemId: item.id,
          updates: {
            notes: `Try alternative store - not found at ${optimizedRoute?.retailerName || 'current store'}`,
            isCompleted: false
          }
        });
      });

      setEndStoreDialogOpen(false);

      toast({
        title: "Items Saved for Alternative Store",
        description: `${uncompletedItems.length} items marked to try at alternative stores`,
        duration: 4000
      });

      completeCurrentStore();
    }
  };

  const handleSaveForNextTrip = () => {
    uncompletedItems.forEach(item => {
      updateItemMutation.mutate({
        itemId: item.id,
        updates: {
          notes: 'Saved for future trip - not needed this time',          isCompleted: false
        }
      });
    });

    setEndStoreDialogOpen(false);

    toast({
      title: "Items Saved for Next Trip",
      description: `${uncompletedItems.length} items will remain on your list for next time`,
      duration: 4000
    });

    completeCurrentStore();
  };

  const handleFinishStore = () => {
    console.log('handleFinishStore called, loyaltyCard:', loyaltyCard, 'retailer:', getCurrentRetailerName());

    // Show loyalty barcode dialog first if user has a loyalty card for current retailer
    if (loyaltyCard && loyaltyCard.retailerName === getCurrentRetailerName()) {
      console.log('Showing loyalty barcode dialog for:', getCurrentRetailerName());
      setLoyaltyBarcodeDialogOpen(true);
      return;
    }

    // For multi-store plans, check uncompleted items at intermediary stores
    if (optimizedRoute?.isMultiStore && currentStoreIndex < optimizedRoute.stores.length - 1) {
      // Get uncompleted items from current store, excluding temporary/moved items
      const currentStore = optimizedRoute.stores[currentStoreIndex];
      const currentStoreItems = currentStore?.items || [];
      const uncompleted = currentStoreItems.filter(item => 
        !completedItems.has(item.id) && 
        !item.isCompleted &&
        typeof item.id === 'number' && 
        item.id < 10000 // Exclude temporary IDs from moved items
      );

      if (uncompleted.length > 0) {
        setUncompletedItems(uncompleted);
        setEndStoreDialogOpen(true);
      } else {
        completeCurrentStore();
      }
    } else {
      // For last store or single store, use the existing handleEndStore logic
      handleEndStore();
    }
  };

  const handleStoreComplete = () => {
    // Handle multi-store vs single store completion
    if (optimizedRoute?.isMultiStore && optimizedRoute.stores) {
      if (currentStoreIndex < optimizedRoute.stores.length - 1) {
        // Move to next store
        setCurrentStoreIndex(currentStoreIndex + 1);
        setCurrentAisleIndex(0);
        // Don't reset completed items completely - keep items completed in previous stores

        const nextStore = optimizedRoute.stores[currentStoreIndex + 1];
        toast({
          title: "Moving to Next Store",
          description: `Now shopping at ${nextStore.retailerName}`,
          duration: 3000
        });
      } else {
        // All stores completed - end shopping
        endShopping();
      }
    } else {
      // Single store completion - end shopping
      endShopping();
    }
  };

  // Save shopping session to localStorage (survives app closure)
  const savePersistentShoppingSession = (planData: any, route: any) => {
    // Only save if user has actually started shopping (made meaningful progress)
    if (!hasStartedShopping || completedItems.size === 0) {
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
        completedItems: Array.from(completedItems),
        timestamp: Date.now(),
        currentStoreName: currentStore?.retailerName,
        isMultiStore: route?.isMultiStore || false,
        totalStores: route?.stores?.length || 1
      };

      localStorage.setItem(sessionKey, JSON.stringify(sessionData));
      console.log('Saved persistent shopping session for list', listId);
    } catch (error) {
      console.warn('Failed to save shopping session:', error);
    }
  };

  // Track if user has actually started shopping (moved aisles or completed items)
  const [hasStartedShopping, setHasStartedShopping] = useState(false);

  // Update session whenever progress changes (only if user has started shopping)
  useEffect(() => {
    if (optimizedRoute && selectedPlanData && hasStartedShopping) {
      savePersistentShoppingSession(selectedPlanData, optimizedRoute);
    }
  }, [currentStoreIndex, currentAisleIndex, completedItems, optimizedRoute, selectedPlanData, hasStartedShopping]);

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

  // Track if we're currently restoring a session to avoid false "started shopping" detection
  const [isRestoringSession, setIsRestoringSession] = useState(false);

  //  // Remove this useEffect - session saving is now handled only in the savePersistentShoppingSession function
  // which is called from the other useEffect that tracks progress changes

  const proceedAfterLoyaltyCard = () => {
    console.log('proceedAfterLoyaltyCard called');
    setLoyaltyBarcodeDialogOpen(false);

    // Show success message for loyalty card usage
    toast({
      title: "Loyalty Card Applied",
      description: `Your ${getCurrentRetailerName()} loyalty card has been used successfully!`,
      duration: 3000
    });

    // Check if this is the last store (single store or last store in multi-store)
    const isLastStore = !optimizedRoute?.isMultiStore || 
                        (optimizedRoute?.isMultiStore && currentStoreIndex >= optimizedRoute.stores.length - 1);

    if (isLastStore) {
      // Only show uncompleted items dialog for the final store/end of shopping
      let allStoreItems: any[] = [];

      if (optimizedRoute?.isMultiStore && optimizedRoute.stores) {
        const currentStore = optimizedRoute.stores[currentStoreIndex];
        allStoreItems = currentStore?.items || [];
      } else {
        // Single store - get all items from all aisles
        allStoreItems = optimizedRoute?.aisleGroups?.flatMap(aisle => aisle.items) || [];
      }

      // Find uncompleted items
      const uncompleted = allStoreItems.filter(item => 
        !completedItems.has(item.id) && !item.isCompleted
      );

      if (uncompleted.length === 0) {
        // No uncompleted items, proceed with completion
        completeCurrentStore();
      } else {
        // Show dialog for uncompleted items only at the end
        setUncompletedItems(uncompleted);
        setEndStoreDialogOpen(true);
      }
    } else {
      // For intermediate stores in multi-store plans
      const currentStore = optimizedRoute.stores[currentStoreIndex];
      const currentStoreItems = currentStore?.items || [];
      const uncompleted = currentStoreItems.filter(item => 
        !completedItems.has(item.id) && 
        !item.isCompleted &&
        typeof item.id === 'number' && 
        item.id < 10000 // Exclude temporary IDs from moved items
      );

      if (uncompleted.length > 0) {
        setUncompletedItems(uncompleted);
        setEndStoreDialogOpen(true);
      } else {
        completeCurrentStore();
      }
    }
  };

  // Helper function to check and handle empty aisles
  const checkAndHandleEmptyAisle = () => {
    if (!optimizedRoute || !optimizedRoute.aisleGroups) return;

    const currentAisle = optimizedRoute.aisleGroups[currentAisleIndex];
    if (!currentAisle || currentAisle.items.length > 0) return;

    // Current aisle is empty

    // If it's the last aisle, end store/shopping trip
    if (currentAisleIndex === optimizedRoute.aisleGroups.length - 1) {
      handleFinishStore();
      return;
    }

    // Move to the next non-empty aisle or end the shopping trip
    let nextAisleIndex = currentAisleIndex + 1;
    while (nextAisleIndex < optimizedRoute.aisleGroups.length &&
           optimizedRoute.aisleGroups[nextAisleIndex].items.length === 0) {
      nextAisleIndex++;
    }

    if (nextAisleIndex < optimizedRoute.aisleGroups.length) {
      // Found a non-empty aisle, move to it
      setCurrentAisleIndex(nextAisleIndex);
      toast({
        title: "Skipping Empty Aisle",
        description: `Moving to next aisle: ${optimizedRoute.aisleGroups[nextAisleIndex].aisleName}`,
        duration: 3000
      });
    } else {
      // All remaining aisles are empty, end the shopping trip
      handleFinishStore();
    }
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


        {/* Loyalty Card Indicator */}
        {loyaltyCard && loyaltyCard.retailerName === getCurrentRetailerName() && (
          <Card className="mb-4 border-green-200 bg-green-50">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 bg-green-600 rounded-full flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <div>
                    <div className="font-medium text-green-800 text-sm">
                      {optimizedRoute?.isMultiStore ? `${getCurrentRetailerName()} ` : ''}Loyalty Card Ready
                    </div>
                    <div className="text-xs text-green-600">Card ending in {loyaltyCard.cardNumber?.slice(-4)}</div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-green-700 border-green-300 hover:bg-green-100 text-xs"
                  onClick={() => setLoyaltyBarcodeDialogOpen(true)}
                >
                  Show Barcode
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Loyalty Card Notice for Multi-Store */}
        {(!loyaltyCard || loyaltyCard.retailerName !== getCurrentRetailerName()) && optimizedRoute?.isMultiStore && getCurrentRetailerName() && (
          <Card className="mb-4 border-yellow-200 bg-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 bg-yellow-500 rounded-full flex items-center justify-center">
                  <Store className="h-3 w-3 text-white" />
                </div>
                <div>
                  <div className="font-medium text-yellow-800">No Loyalty Card</div>
                  <div className="text-xs text-yellow-600">
                    No loyalty card found for {getCurrentRetailerName()}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Store {currentStoreIndex + 1} of {optimizedRoute.stores.length}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}





        {/* Retailer-Specific Deals Section */}


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

                      {/* Item options menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="ml-2 bg-white border-gray-300 hover:bg-gray-50 px-2"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-white border border-gray-200 shadow-lg backdrop-blur-none">
                          {/* Check if this is a single-store plan */}
                          {!optimizedRoute?.isMultiStore ? (
                            <>
                              {/* Single-store plan options */}
                              <DropdownMenuItem
                                onClick={() => {
                                  updateItemMutation.mutate({
                                    itemId: item.id,
                                    updates: {
                                      notes: 'Saved for future trip',
                                      isCompleted: false
                                    }
                                  });

                                  // Create a new optimized route with the item removed from current shopping session
                                  setOptimizedRoute((prevRoute: any) => {
                                    if (!prevRoute) return prevRoute;

                                    const newAisleGroups = prevRoute.aisleGroups.map((aisle: any) => ({
                                      ...aisle,
                                      items: aisle.items.filter((routeItem: any) => routeItem.id !== item.id)
                                    })).filter((aisle: any) => aisle.items.length > 0); // Remove empty aisles

                                    return {
                                      ...prevRoute,
                                      aisleGroups: newAisleGroups,
                                      totalItems: prevRoute.totalItems - 1
                                    };
                                  });

                                  toast({
                                    title: "Item Saved for Later",
                                    description: `${item.productName} will remain on your list for next time`,
                                    duration: 3000
                                  });

                                  // Check if aisle is now empty after a brief delay
                                  setTimeout(() => {
                                    checkAndHandleEmptyAisle();
                                  }, 100);
                                }}
                                className="flex items-center gap-2"
                              >
                                <Clock className="h-4 w-4 text-blue-600" />
                                Save for Later
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={async () => {
                                  try {
                                    // Delete the item from the shopping list entirely
                                    await apiRequest('DELETE', `/api/shopping-list/items/${item.id}`);

                                    // Create a new optimized route with the item removed
                                    setOptimizedRoute((prevRoute: any) => {
                                      if (!prevRoute) return prevRoute;

                                      const newAisleGroups = prevRoute.aisleGroups.map((aisle: any) => ({
                                        ...aisle,
                                        items: aisle.items.filter((routeItem: any) => routeItem.id !== item.id)
                                      })).filter((aisle: any) => aisle.items.length > 0); // Remove empty aisles

                                      return {
                                        ...prevRoute,
                                        aisleGroups: newAisleGroups,
                                        totalItems: prevRoute.totalItems - 1
                                      };
                                    });

                                    // Invalidate queries to refresh the shopping list
                                    queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
                                    queryClient.invalidateQueries({ queryKey: [`/api/shopping-lists/${listId}`] });

                                    toast({
                                      title: "Item Removed",
                                      description: `${item.productName} has been removed from your list`,
                                      duration: 3000
                                    });
                                  } catch (error) {
                                    console.error('Failed to remove item:', error);
                                    toast({
                                      title: "Error",
                                      description: "Failed to remove item from list",
                                      variant: "destructive",
                                      duration: 3000
                                    });
                                  }
                                }}
                                className="flex items-center gap-2"
                              >
                                <Package className="h-4 w-4 text-red-600" />
                                Remove from List
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <>
                              {/* Multi-store and balanced plan options */}
                              <DropdownMenuItem
                                onClick={() => {
                                  updateItemMutation.mutate({
                                    itemId: item.id,
                                    updates: {
                                      notes: 'Saved for future trip',
                                      isCompleted: false
                                    }
                                  });

                                  // Create a new optimized route with the item removed from current shopping session
                                  setOptimizedRoute((prevRoute: any) => {
                                    if (!prevRoute) return prevRoute;

                                    const newAisleGroups = prevRoute.aisleGroups.map((aisle: any) => ({
                                      ...aisle,
                                      items: aisle.items.filter((routeItem: any) => routeItem.id !== item.id)
                                    })).filter((aisle: any) => aisle.items.length > 0); // Remove empty aisles

                                    let updatedRoute = {
                                      ...prevRoute,
                                      aisleGroups: newAisleGroups,
                                      totalItems: prevRoute.totalItems - 1
                                    };

                                    // For multi-store plans, also remove from current store's items
                                    if (prevRoute.isMultiStore && prevRoute.stores) {
                                      const updatedStores = prevRoute.stores.map((store: any, index: number) => {
                                        if (index === currentStoreIndex) {
                                          return {
                                            ...store,
                                            items: store.items.filter((storeItem: any) => storeItem.id !== item.id)
                                          };
                                        }
                                        return store;
                                      });
                                      updatedRoute.stores = updatedStores;
                                    }

                                    return updatedRoute;
                                  });

                                  toast({
                                    title: "Item Saved for Later",
                                    description: `${item.productName} will remain on your list for next time`,
                                    duration: 3000
                                  });

                                  // Check if aisle is now empty after a brief delay
                                  setTimeout(() => {
                                    checkAndHandleEmptyAisle();
                                  }, 100);
                                }}
                                className="flex items-center gap-2"
                              >
                                <Clock className="h-4 w-4 text-blue-600" />
                                Save for Later
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => {
                                  // Check if there are more stores to move to
                                  if (optimizedRoute?.isMultiStore && optimizedRoute.stores && currentStoreIndex < optimizedRoute.stores.length - 1) {
                                    // Move to next store
                                    const nextStore = optimizedRoute.stores[currentStoreIndex + 1];
                                    const nextStoreIndex = currentStoreIndex + 1;

                                    // Add item to next store's items if not already there
                                    const itemExistsInNextStore = nextStore.items.some((storeItem: any) => 
                                      storeItem.productName.toLowerCase() === item.productName.toLowerCase()
                                    );

                                    if (!itemExistsInNextStore) {
                                      // Add item to next store's items array
                                      nextStore.items.push({
                                        ...item,
                                        storeName: nextStore.retailerName,
                                        suggestedRetailerId: nextStore.retailer?.id || nextStore.suggestedRetailerId,
                                        id: item.id + (nextStoreIndex * 1000), // Unique temporary ID
                                        movedFrom: optimizedRoute.stores[currentStoreIndex]?.retailerName
                                      });
                                    }

                                    // Update the item in the database to reflect the new store assignment
                                    updateItemMutation.mutate({
                                      itemId: item.id,
                                      updates: {
                                        suggestedRetailerId: nextStore.retailer?.id || nextStore.suggestedRetailerId,
                                        notes: `Moved from ${optimizedRoute.stores[currentStoreIndex]?.retailerName} - try at ${nextStore.retailerName}`,
                                        isCompleted: false
                                      }
                                    });

                                    // Remove item from current store's route display
                                    const currentStore = optimizedRoute.stores[currentStoreIndex];
                                    if (currentStore) {
                                      const itemIndex = currentStore.items.findIndex((storeItem: any) => storeItem.id === item.id);
                                      if (itemIndex > -1) {
                                        currentStore.items.splice(itemIndex, 1);
                                      }
                                    }

                                    // Also remove from current aisle in the optimized route display
                                    if (optimizedRoute.aisleGroups) {
                                      optimizedRoute.aisleGroups.forEach((aisle: any) => {
                                        const itemIndex = aisle.items.findIndex((routeItem: any) => routeItem.id === item.id);
                                        if (itemIndex > -1) {
                                          aisle.items.splice(itemIndex, 1);
                                        }
                                      });
                                    }

                                    // Force a re-render by updating the route state
                                    setOptimizedRoute({...optimizedRoute});

                                    toast({
                                      title: "Item Moved to Next Store",
                                      description: `${item.productName} will be available at ${nextStore.retailerName}`,
                                      duration: 3000
                                    });
                                  } else if (optimizedRoute?.isMultiStore && optimizedRoute.stores) {
                                    // This is the last store - save for future trip
                                    updateItemMutation.mutate({
                                      itemId: item.id,
                                      updates: {
                                        notes: 'Saved for future trip - no more stores in current plan',
                                        isCompleted: false
                                      }
                                    });

                                    // Remove item from current shopping route display
                                    if (optimizedRoute?.aisleGroups) {
                                      optimizedRoute.aisleGroups.forEach((aisle: any) => {
                                        const itemIndex = aisle.items.findIndex((routeItem: any) => routeItem.id === item.id);
                                        if (itemIndex > -1) {
                                          aisle.items.splice(itemIndex, 1);
                                        }
                                      });
                                    }

                                    // For multi-store plans, also remove from current store's items
                                    if (optimizedRoute?.isMultiStore && optimizedRoute.stores) {
                                      const currentStore = optimizedRoute.stores[currentStoreIndex];
                                      if (currentStore) {
                                        const itemIndex = currentStore.items.findIndex((storeItem: any) => storeItem.id === item.id);
                                        if (itemIndex > -1) {
                                          currentStore.items.splice(itemIndex, 1);
                                        }
                                      }
                                    }

                                    // Force a re-render by updating the route state
                                    setOptimizedRoute({...optimizedRoute});

                                    toast({
                                      title: "Item Saved for Future Trip",
                                      description: `${item.productName} will remain on your list for next time`,
                                      duration: 3000
                                    });

                                    // Check if aisle is now empty after a brief delay
                                    setTimeout(() => {
                                      checkAndHandleEmptyAisle();
                                    }, 100);
                                  } else {
                                    // For single-store plans, create a reminder or alternative suggestion
                                    updateItemMutation.mutate({
                                      itemId: item.id,
                                      updates: {
                                        notes: `Try alternative store - not available at ${optimizedRoute?.retailerName || 'current store'}`,
                                        isCompleted: false
                                      }
                                    });

                                    toast({
                                      title: "Item Marked for Alternative Store",
                                      description: `${item.productName} saved with note to try alternative store`,
                                      duration: 3000
                                    });
                                  }
                                }}
                                className="flex items-center gap-2"
                              >
                                <MapPin className="h-4 w-4 text-purple-600" />
                                Move to Next Store
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={async () => {
                                  try {
                                    // Delete the item from the shopping list entirely
                                    await apiRequest('DELETE', `/api/shopping-list/items/${item.id}`);

                                    // Create a new optimized route with the item removed
                                    setOptimizedRoute((prevRoute: any) => {
                                      if (!prevRoute) return prevRoute;

                                      const newAisleGroups = prevRoute.aisleGroups.map((aisle: any) => ({
                                        ...aisle,
                                        items: aisle.items.filter((routeItem: any) => routeItem.id !== item.id)
                                      })).filter((aisle: any) => aisle.items.length > 0); // Remove empty aisles

                                      return {
                                        ...prevRoute,
                                        aisleGroups: newAisleGroups,
                                        totalItems: prevRoute.totalItems - 1
                                      };
                                    });

                                    // For multi-store plans, also remove from current store's items
                                    if (optimizedRoute?.isMultiStore && optimizedRoute.stores) {
                                      const updatedStores = [...optimizedRoute.stores];
                                      const currentStore = updatedStores[currentStoreIndex];
                                      if (currentStore) {
                                        currentStore.items = currentStore.items.filter((storeItem: any) => storeItem.id !== item.id);
                                      }
                                      setOptimizedRoute((prevRoute: any) => ({
                                        ...prevRoute,
                                        stores: updatedStores
                                      }));
                                    }

                                    // Invalidate queries to refresh the shopping list
                                    queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
                                    queryClient.invalidateQueries({ queryKey: [`/api/shopping-lists/${listId}`] });

                                    toast({
                                      title: "Item Removed",
                                      description: `${item.productName} has been removed from your list`,
                                      duration: 3000
                                    });
                                  } catch (error) {
                                    console.error('Failed to remove item:', error);
                                    toast({
                                      title: "Error",
                                      description: "Failed to remove item from list",
                                      variant: "destructive",
                                      duration: 3000
                                    });
                                  }
                                }}
                                className="flex items-center gap-2"
                              >
                                <Package className="h-4 w-4 text-red-600" />
                                Remove from List
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
                    <ArrowRight className="h-4 w-4 mr-2 rotate-180" />                    Previous
                  </Button>

                  {isLastAisle ? (
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() => handleFinishStore()}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      {optimizedRoute?.isMultiStore && currentStoreIndex < optimizedRoute.stores.length - 1 
                        ? `Finish ${optimizedRoute.stores[currentStoreIndex]?.retailerName}` 
                        : "End Shopping"
                      }
                    </Button>
                  ) : (
                    <Button 
                      variant="outline"
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
        <Card className="mb-4">
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

        

        {/* Multi-Store Navigation */}
        {optimizedRoute?.isMultiStore && (
          <Card>
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
                            {store.items.length} items 
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
                    variant="outline"
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
      </main>

      <BottomNavigation activeTab="lists" />

      {/* Out of Stock Item Dialog */}
      <AlertDialog open={outOfStockDialogOpen} onOpenChange={setOutOfStockDialogOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-orange-600" />
              </div>
              Can't Find This Item?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 mt-2">
              <strong>{outOfStockItem?.productName}</strong> is not available at this location.
              {optimizedRoute?.isMultiStore && optimizedRoute.stores && currentStoreIndex < optimizedRoute.stores.length - 1 && (
                <div className="mt-2 text-sm">
                  You have {optimizedRoute.stores.length - currentStoreIndex - 1} more store{optimizedRoute.stores.length - currentStoreIndex - 1 !== 1 ? 's' : ''} to visit.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col gap-3 mt-6">
            <Button 
              onClick={handleItemFound}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-4 rounded-lg flex items-center justify-center gap-3"
            >
              <Check className="h-5 w-5" />
              Actually Found It
            </Button>

            {/* Multi-store routes show migration options */}
            {optimizedRoute?.isMultiStore && optimizedRoute.stores && currentStoreIndex < optimizedRoute.stores.length - 1 ? (
              <Button 
                onClick={handleMigrateToNextStore}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-4 rounded-lg flex items-center justify-center gap-3"
              >
                <MapPin className="h-5 w-5" />
                Try at {optimizedRoute.stores[currentStoreIndex + 1]?.retailerName}
              </Button>
            ) : null}

            {/* For single-store routes, show simplified options */}
            {!optimizedRoute?.isMultiStore && (
              <Button 
                onClick={handleRemoveFromList}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-4 rounded-lg flex items-center justify-center gap-3"
              >
                <Package className="h-5 w-5" />
                Remove from List
              </Button>
            )}

            <Button 
              onClick={handleLeaveForFutureTrip}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 rounded-lg flex items-center justify-center gap-3"
            >
              <Clock className="h-5 w-5" />
              Save for Future Trip
            </Button>

            <Button 
              variant="outline" 
              onClick={() => setOutOfStockDialogOpen(false)}
              className="w-full border-gray-300 text-gray-700 font-medium py-3 rounded-lg"
            >
              Cancel
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* End Store Dialog for Uncompleted Items */}
      <AlertDialog open={endStoreDialogOpen} onOpenChange={setEndStoreDialogOpen}>
        <AlertDialogContent className="sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
              </div>
              {optimizedRoute?.isMultiStore && currentStoreIndex < optimizedRoute.stores.length - 1 
                ? "End Store - Uncompleted Items" 
                : "End Shopping - Uncompleted Items"              }
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 mt-2">
              You have {uncompletedItems.length} uncompleted item{uncompletedItems.length !== 1 ? 's' : ''} 
              {optimizedRoute?.isMultiStore && currentStoreIndex < optimizedRoute.stores.length - 1 
                ? ` at ${optimizedRoute.stores[currentStoreIndex]?.retailerName}. You can move them to ${optimizedRoute.stores[currentStoreIndex + 1]?.retailerName} or save them for a future shopping trip.`
                : " in your shopping trip. What would you like to do with them?"
              }
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Show list of uncompleted items */}
          {uncompletedItems.length > 0 && (
            <div className="max-h-40 overflow-y-auto border rounded-lg p-3 bg-gray-50">
              <div className="text-sm font-medium text-gray-700 mb-2">Uncompleted items:</div>
              <div className="space-y-1">
                {uncompletedItems.map((item, index) => (
                  <div key={item.id} className="text-sm text-gray-600">
                    • {item.productName} ({item.quantity} {item.unit})
                  </div>
                ))}
              </div>
            </div>
          )}

          <AlertDialogFooter className="flex flex-col gap-3 mt-6">
            <Button 
              onClick={handleMarkAllFound}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-4 rounded-lg flex items-center justify-center gap-3"
            >
              <Check className="h-5 w-5" />
              Mark as Found
            </Button>

            {/* For intermediary stores in multi-store plans - only show move to next store and save for future */}
            {optimizedRoute?.isMultiStore && optimizedRoute.stores && currentStoreIndex < optimizedRoute.stores.length - 1 && (
              <>
                <Button 
                  onClick={handleTryNextStore}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-4 rounded-lg flex items-center justify-center gap-3"
                >
                  <MapPin className="h-5 w-5" />
                  Move to {optimizedRoute.stores[currentStoreIndex + 1]?.retailerName}
                </Button>

                <Button 
                  onClick={handleSaveForNextTrip}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 rounded-lg flex items-center justify-center gap-3"
                >
                  <Clock className="h-5 w-5" />
                  Leave for Future Trip
                </Button>
              </>
            )}

            {/* For single store or last store in multi-store - show all options including end shopping */}
            {(!optimizedRoute?.isMultiStore || 
              (optimizedRoute?.isMultiStore && currentStoreIndex >= optimizedRoute.stores.length - 1)) && (
              <>
                <Button 
                  onClick={() => {
                    setEndStoreDialogOpen(false);
                    endShopping();
                  }}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-4 rounded-lg flex items-center justify-center gap-3"
                >
                  <ShoppingCart className="h-5 w-5" />
                  End Shopping Trip
                </Button>

                <Button 
                  onClick={handleSaveForNextTrip}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 rounded-lg flex items-center justify-center gap-3"
                >
                  <Clock className="h-5 w-5" />
                  Save for Next Trip
                </Button>
              </>
            )}

            <Button 
              variant="outline" 
              onClick={() => setEndStoreDialogOpen(false)}
              className="w-full border-gray-300 text-gray-700 font-medium py-3 rounded-lg"
            >
              Cancel
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Loyalty Barcode Dialog */}
      <Dialog open={loyaltyBarcodeDialogOpen} onOpenChange={setLoyaltyBarcodeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-semibold text-gray-900">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Star className="h-5 w-5 text-green-600" />
              </div>
              {getCurrentRetailerName()} Loyalty Card
            </DialogTitle>
            <DialogDescription className="text-gray-600 mt-2">
              Show this barcode to the cashier to earn points and apply member discounts.
              {optimizedRoute?.isMultiStore && (
                <div className="mt-1 text-sm">
                  Store {currentStoreIndex + 1} of {optimizedRoute.stores.length}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          {loyaltyCard && (
            <div className="mt-4">
              {/* Enhanced Barcode Display */}
              <div className="bg-white p-6 rounded-lg border-2 border-gray-300 text-center">
                <div className="text-sm text-gray-600 mb-2 font-medium">
                  {loyaltyCard.retailerName || getCurrentRetailerName()} Member Card
                </div>

                {/* Large barcode number */}
                <div className="font-mono text-2xl font-bold tracking-wider mb-4 text-gray-900">
                  {loyaltyCard.barcodeNumber || loyaltyCard.cardNumber}
                </div>

                {/* Enhanced barcode visualization */}
                <div className="flex justify-center mb-4 gap-px bg-white p-4 border rounded">
                  {(loyaltyCard.barcodeNumber || loyaltyCard.cardNumber)?.split('').map((digit: string, index: number) => {
                    // Create more realistic barcode pattern
                    const isWideBar = parseInt(digit) % 3 === 0;
                    const isBlackBar = parseInt(digit) % 2 === 0;
                    return (
                      <div
                        key={index}
                        className={`${isWideBar ? 'w-2' : 'w-1'} h-16 ${isBlackBar ? 'bg-black' : 'bg-gray-200'}`}
                      />
                    );
                  })}
                </div>

                {/* Member details */}
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="font-medium">
                    Member ID: {loyaltyCard.memberId || loyaltyCard.cardNumber}
                  </div>
                  {loyaltyCard.affiliateCode && (
                    <div className="text-blue-600">
                      Affiliate: {loyaltyCard.affiliateCode}
                    </div>
                  )}
                  {loyaltyCard.discountPercentage && (
                    <div className="text-green-600 font-medium">
                      Member Discount: {loyaltyCard.discountPercentage}% off
                    </div>
                  )}
                </div>
              </div>

              {/* Instructions */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center mt-0.5">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <div className="text-sm text-blue-800">
                    <div className="font-medium mb-1">Checkout Instructions:</div>
                    <ul className="space-y-1 text-xs">
                      <li>• Show this screen to the cashier</li>
                      <li>• They can scan the barcode or enter the number manually</li>
                      <li>• Make sure to apply discounts before payment</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-6 space-y-3">
                <Button 
                  onClick={proceedAfterLoyaltyCard}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-4 rounded-lg flex items-center justify-center gap-3"
                >
                  <Check className="h-5 w-5" />
                  Card Scanned - Continue Checkout
                </Button>

                <Button 
                  variant="outline" 
                  onClick={() => setLoyaltyBarcodeDialogOpen(false)}
                  className="w-full border-gray-300 text-gray-700 font-medium py-3 rounded-lg"
                >
                  Keep Shopping
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShoppingRoute;