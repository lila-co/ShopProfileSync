import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, MapPin, DollarSign, Clock, ShoppingCart, Store } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import BottomNavigation from '@/components/layout/BottomNavigation';
import { useQueryClient } from '@tanstack/react-query';

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
  const [overrideRetailerId, setOverrideRetailerId] = useState<number | null>(null);
  const [showStoreSelector, setShowStoreSelector] = useState(false);
  const queryClient = useQueryClient();

  const listId = searchParams.get('listId') || '1';

  // Fetch shopping list items
  const { data: shoppingListData, isLoading, error } = useQuery({
    queryKey: [`/api/shopping-lists/${listId}`],
    enabled: !!listId,
    retry: (failureCount, error) => {
      // Don't retry on 404 errors
      if (error?.message?.includes('404')) return false;
      return failureCount < 2;
    }
  });

  // Extract items from the shopping list data
  const shoppingItems = shoppingListData?.items || [];

  // Fetch deals for price comparison
  const { data: deals } = useQuery({
    queryKey: ['/api/deals'],
    staleTime: 20 * 60 * 1000, // 20 minutes - deals don't change frequently
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
  });

  // Fetch available retailers for store override
  const { data: availableRetailers } = useQuery({
    queryKey: ['/api/retailers'],
    staleTime: 30 * 60 * 1000, // 30 minutes - retailers don't change frequently
    refetchOnWindowFocus: false,
  });

  // Generate plan data based on shopping items and plan type
  const generatePlanData = (items: ShoppingItem[], planType: string): PlanData => {
    console.log('generatePlanData called with:', { items, planType, itemsLength: items?.length, overrideRetailerId });

    // Ensure items is a valid array
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.warn('generatePlanData received invalid items:', items);
      console.log('Shopping list data structure:', shoppingListData);
      return { totalCost: 0, estimatedTime: '0 min', stores: [] };
    }

    // Handle store override based on plan type
    if (overrideRetailerId && availableRetailers) {
      const selectedRetailer = availableRetailers.find((r: any) => r.id === overrideRetailerId);
      if (selectedRetailer && planType === 'single-store') {
        return {
          totalCost: items.reduce((sum, item) => sum + (item.suggestedPrice || 0) * item.quantity, 0),
          estimatedTime: '25-35 min',
          stores: [{
            retailer: selectedRetailer,
            items: items,
            subtotal: items.reduce((sum, item) => sum + (item.suggestedPrice || 0) * item.quantity, 0)
          }]
        };
      }
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
        let storeGroups = items.reduce((acc, item) => {
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

        // If store override is selected, replace one of the stores with the override
        if (overrideRetailerId && availableRetailers) {
          const selectedRetailer = availableRetailers.find((r: any) => r.id === overrideRetailerId);
          if (selectedRetailer) {
            // Remove the override retailer if it already exists in the groups
            delete storeGroups[overrideRetailerId];

            // Find the store with the most items and replace it with the override store
            const storeGroupsArray = Object.values(storeGroups);
            if (storeGroupsArray.length > 0) {
              const largestStore = storeGroupsArray.reduce((max: any, store: any) => 
                store.items.length > max.items.length ? store : max
              );
              delete storeGroups[largestStore.retailer.id];
            }

            // Add the override store with all items
            storeGroups[overrideRetailerId] = {
              retailer: selectedRetailer,
              items: items,
              subtotal: items.reduce((sum, item) => sum + (item.suggestedPrice || 0) * item.quantity, 0)
            };
          }
        }

        return {
          totalCost: Object.values(storeGroups).reduce((sum: number, store: any) => sum + store.subtotal, 0),
          estimatedTime: '45-60 min',
          stores: Object.values(storeGroups)
        };

      case 'balanced':
        // Balance between convenience and savings
        let balancedStores = items.reduce((acc, item) => {
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

        // If store override is selected, ensure it's included in the balanced plan
        if (overrideRetailerId && availableRetailers) {
          const selectedRetailer = availableRetailers.find((r: any) => r.id === overrideRetailerId);
          if (selectedRetailer) {
            // Always include the override store as one of the two stores
            const overrideStoreItems = items.filter(item => 
              !balancedStores[overrideRetailerId] || 
              Math.random() > 0.5 // Randomly distribute items between stores for balance
            );

            balancedStores[overrideRetailerId] = {
              retailer: selectedRetailer,
              items: overrideStoreItems,
              subtotal: overrideStoreItems.reduce((sum, item) => sum + (item.suggestedPrice || 0) * item.quantity, 0)
            };
          }
        }

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

  const planData = generatePlanData(
    Array.isArray(shoppingItems) ? shoppingItems : [], 
    selectedPlanType
  );

  const formatPrice = (price: number) => {
    return `$${(price / 100).toFixed(2)}`;
  };

  // Filter deals by retailer for current plan
  const getDealsForRetailer = (retailerId: number) => {
    return deals?.filter((deal: any) => deal.retailerId === retailerId) || [];
  };

  // Calculate availability of items based on plan type and stores
  const availability = React.useMemo(() => {
    if (!shoppingItems || !Array.isArray(shoppingItems) || shoppingItems.length === 0) {
      return {
        totalItems: 0,
        availableItems: 0,
        missingItems: []
      };
    }

    const totalItems = shoppingItems.length;
    let availableItems = 0;
    const missingItems: any[] = [];

    // For single-store plans, all items are considered available since we put them all in one store
    if (selectedPlanType === 'single-store') {
      availableItems = totalItems;
    } else {
      // For multi-store and balanced plans, check actual availability
      const planRetailerIds = new Set(planData.stores.map(store => store.retailer.id));

      shoppingItems.forEach(item => {
        if (item.suggestedRetailer && planRetailerIds.has(item.suggestedRetailer.id)) {
          availableItems++;
        } else {
          missingItems.push(item);
        }
      });
    }

    return {
      totalItems,
      availableItems,
      missingItems
    };
  }, [shoppingItems, planData.stores, selectedPlanType]);

  // State for managing session resume dialog
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [existingSessionData, setExistingSessionData] = useState<any>(null);

  // Check for existing shopping session - show dialog instead of auto-resuming
  useEffect(() => {
    const checkForExistingSession = () => {
      // Check for both session types
      const interruptedSession = localStorage.getItem(`interruptedSession-${listId}`);
      const persistentSession = localStorage.getItem(`shopping_session_${listId}`);

      let sessionDataStr = interruptedSession;

      // If no interrupted session, check persistent session
      if (!sessionDataStr && persistentSession) {
        try {
          const persistentData = JSON.parse(persistentSession);
          // Only use persistent session if it's not completed and not expired
          const sessionAge = Date.now() - persistentData.timestamp;
          const maxAge = 24 * 60 * 60 * 1000; // 24 hours

          if (!persistentData.isCompleted && sessionAge < maxAge) {
            sessionDataStr = persistentSession;
          } else {
            // Clean up completed or expired session
            localStorage.removeItem(`shopping_session_${listId}`);
            return;
          }
        } catch (error) {
          localStorage.removeItem(`shopping_session_${listId}`);
          return;
        }
      }

      // Show dialog if session exists instead of auto-resuming
      if (sessionDataStr) {
        try {
          const sessionData = JSON.parse(sessionDataStr);
          console.log('Found existing shopping session:', sessionData);
          setExistingSessionData(sessionData);
          setShowResumeDialog(true);
        } catch (error) {
          console.error('Error parsing session data:', error);
          // Clean up corrupted session data
          localStorage.removeItem(`interruptedSession-${listId}`);
          localStorage.removeItem(`shopping_session_${listId}`);
        }
      }
    };

    if (listId) {
      checkForExistingSession();
    }
  }, [listId]);

  // Function to resume existing session
  const resumeExistingSession = () => {
    if (!existingSessionData) return;

    try {
      // Restore plan data and shopping mode
      sessionStorage.setItem('shoppingPlanData', JSON.stringify(existingSessionData.planData));
      sessionStorage.setItem('shoppingListId', listId);
      sessionStorage.setItem('shoppingMode', existingSessionData.shoppingMode || 'instore');

      // Redirect to the shopping route page
      const targetUrl = `/shopping-route?listId=${listId}&mode=${existingSessionData.shoppingMode || 'instore'}&fromPlan=true&resume=true`;
      console.log('Resuming shopping session, navigating to:', targetUrl);
      navigate(targetUrl);

      toast({
        title: "Resuming Shopping Trip",
        description: "Continuing where you left off...",
        duration: 2000
      });
    } catch (error) {
      console.error('Error resuming session:', error);
      toast({
        title: "Error",
        description: "Failed to resume shopping session",
        variant: "destructive"
      });
    }

    setShowResumeDialog(false);
  };

  // Function to start fresh (clear existing session)
  const startFreshSession = () => {
    // Clear all existing session data
    localStorage.removeItem(`interruptedSession-${listId}`);
    localStorage.removeItem(`shopping_session_${listId}`);
    sessionStorage.removeItem('shoppingPlanData');
    sessionStorage.removeItem('shoppingListId');
    sessionStorage.removeItem('shoppingMode');

    setShowResumeDialog(false);
    setExistingSessionData(null);

    toast({
      title: "Starting Fresh",
      description: "Previous shopping session cleared",
      duration: 2000
    });
  };

  // All hooks must be called before any early returns
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading your shopping plan...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto frosted-bg min-h-screen flex flex-col">
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
        <main className="flex-1 flex items-center justify-center p-4">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-red-600 mb-4">
                <h3 className="text-lg font-semibold">Error Loading Shopping List</h3>
              </div>
              <p className="text-gray-600 mb-4">
                {error?.message?.includes('JSON') 
                  ? 'There was a server error. Please try again.'
                  : error.message || 'Failed to load shopping list data.'
                }
              </p>
              <div className="space-y-2">
                <Button onClick={() => window.location.reload()}>
                  Try Again
                </Button>
                <Button variant="outline" onClick={() => navigate('/shopping-list')}>
                  Go to Shopping List
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
        <BottomNavigation activeTab="plan-details" />
      </div>
    );
  }

  if (!shoppingItems || !Array.isArray(shoppingItems) || shoppingItems.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">No items found in shopping list</div>
      </div>
    );
  }

  const handleOrderOnline = async () => {
    if (!selectedPlanType) {
      toast({
        title: "Please select a plan type first",
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

    // Store plan data for the order page
    sessionStorage.setItem('shoppingPlanData', JSON.stringify(enhancedPlanData));
    sessionStorage.setItem('shoppingListId', listId);

    console.log('Order Online clicked with planData:', planData);

    // For multi-store plans, handle mobile differently
    if (planData.stores && planData.stores.length > 1) {
      // Check if user is on mobile device
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;

      if (isMobile) {
        // On mobile, process stores one by one with user confirmation
        let currentStoreIndex = 0;

        const processNextStore = async () => {
          if (currentStoreIndex >= planData.stores.length) {
            toast({
              title: "All Stores Processed",
              description: `Successfully set up ${planData.stores.length} retailer carts`,
              duration: 4000
            });
            return;
          }

          const store = planData.stores[currentStoreIndex];
          currentStoreIndex++;

          try {
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
                  userId: 1,
                  listId: listId
                }
              })
            });

            const result = await response.json();

            if (response.ok) {
              const urlParams = new URLSearchParams(result.cartUrl.split('?')[1] || '');
              const demoCartUrl = `/retailer-cart-demo?${urlParams.toString()}&retailer=${encodeURIComponent(store.retailer.name.toLowerCase().replace(/\s+/g, ''))}`;

              toast({
                title: `${store.retailer.name} Cart Ready`,
                description: `${store.items.length} items added. Tap to open cart.`,
                action: {
                  label: "Open Cart",
                  onClick: () => {
                    window.location.href = demoCartUrl;
                  }
                },
                duration: 8000
              });

              // Auto-process next store if user doesn't interact
              setTimeout(processNextStore, 8000);
            } else {
              toast({
                title: "Cart Error",
                description: `Failed to add items to ${store.retailer.name}`,
                variant: "destructive"
              });
              setTimeout(processNextStore, 2000);
            }
          } catch (error) {
            console.error(`Error with ${store.retailer.name}:`, error);
            toast({
              title: "Integration Error",
              description: `Error connecting to ${store.retailer.name}`,
              variant: "destructive"
            });
            setTimeout(processNextStore, 2000);
          }
        };

        // Start processing stores
        processNextStore();
      } else {
        // Desktop: open multiple tabs as before
        let successCount = 0;

        for (let i = 0; i < planData.stores.length; i++) {
          const store = planData.stores[i];

          // Add a small delay between opening tabs to prevent browser blocking
          setTimeout(async () => {
            try {
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
                console.log(`Cart prepared for ${store.retailer.name}:`, result.cartUrl);

                // Extract URL parameters and create demo cart URL
                const urlParams = new URLSearchParams(result.cartUrl.split('?')[1] || '');
                const demoCartUrl = `/retailer-cart-demo?${urlParams.toString()}&retailer=${encodeURIComponent(store.retailer.name.toLowerCase().replace(/\s+/g, ''))}`;

                // Use window.location.href instead of popup to avoid blocking
                setTimeout(() => {
                  window.location.href = demoCartUrl;
                }, i * 2000); // Stagger the redirects for multi-store

                successCount++;

                toast({
                  title: `${store.retailer.name} Cart Ready`,
                  description: `Redirecting to ${store.retailer.name} cart...`,
                  duration: 3000
                });
              } else {
                console.error(`Failed to add items to ${store.retailer.name} cart`);
                toast({
                  title: "Cart Error",
                  description: `Failed to add items to ${store.retailer.name} cart`,
                  variant: "destructive"
                });
              }
            } catch (error) {
              console.error(`Error with ${store.retailer.name}:`, error);
              toast({
                title: "Integration Error",
                description: `Error connecting to ${store.retailer.name}`,
                variant: "destructive"
              });
            }
          }, i * 1500); // 1.5 second delay between each store
        }

        // Show summary after all stores are processed
        setTimeout(() => {
          if (successCount > 0) {
            toast({
              title: "Multi-Store Cart Integration Complete",
              description: `Successfully prepared ${successCount} retailer cart${successCount > 1 ? 's' : ''} with your items. Check your browser tabs.`,
              duration: 6000
            });
          }
        }, planData.stores.length * 1500 + 1000);
      }
    } else {
      // Single store: direct cart integration
      const store = planData.stores?.[0];
      if (!store) {
        toast({
          title: "Error",
          description: "No store information available",
          variant: "destructive"
        });
        return;
      }

      try {
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

        if (response.ok) {
          const result = await response.json();
          console.log(`Cart prepared for ${store.retailer.name}:`, result.cartUrl);

          // Extract URL parameters and create demo cart URL
          const urlParams = new URLSearchParams(result.cartUrl.split('?')[1] || '');
          const demoCartUrl = `/retailer-cart-demo?${urlParams.toString()}&retailer=${encodeURIComponent(store.retailer.name.toLowerCase().replace(/\s+/g, ''))}`;

          toast({
            title: "Cart Ready!",
            description: `Your items have been added to ${store.retailer.name} cart. Redirecting to cart...`,
            duration: 2000
          });

          // Redirect to demo cart page instead of popup
          setTimeout(() => {
            window.location.href = demoCartUrl;
          }, 1500);
        } else {
          toast({
            title: "Cart Error",
            description: `Failed to add items to ${store.retailer.name} cart`,
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error(`Error with ${store.retailer.name}:`, error);
        toast({
          title: "Integration Error",
          description: `Error connecting to ${store.retailer.name}`,
          variant: "destructive"
        });
      }
    }
  };

  // Function to check for an interrupted shopping session in localStorage
  const hasInterruptedSession = (listId: string): boolean => {
    const interruptedSession = localStorage.getItem(`interruptedSession-${listId}`);
    const persistentSession = localStorage.getItem(`shopping_session_${listId}`);



    // Check if persistent session has meaningful progress
    if (persistentSession) {
      try {
        const sessionData = JSON.parse(persistentSession);
        // Check if session is recent (within last 24 hours)
        const sessionAge = Date.now() - (sessionData.timestamp || 0);
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours

        if (sessionAge > maxAge) {
          localStorage.removeItem(`shopping_session_${listId}`);
          return false;
        }

        // Only consider it progress if:
        // 1. Items have been completed, OR
        // 2. User has moved to aisle 2+ (not just initial aisle), OR  
        // 3. User has moved to store 2+ (not just initial store)
        // AND the session isn't marked as completed
        const hasProgress = ((sessionData.completedItems && sessionData.completedItems.length > 0) ||
                           (sessionData.currentAisleIndex && sessionData.currentAisleIndex > 1) ||
                           (sessionData.currentStoreIndex && sessionData.currentStoreIndex > 0)) &&
                           !sessionData.isCompleted && // Check if session is marked as completed
                           sessionData.timestamp && // Must have a timestamp
                           (Date.now() - sessionData.timestamp) > 30000; // Must be older than 30 seconds

        if (!hasProgress) {
          localStorage.removeItem(`shopping_session_${listId}`);
          localStorage.removeItem(`interruptedSession-${listId}`);
          return false;
        }

        return hasProgress;
      } catch (error) {
        console.warn('Error parsing persistent session:', error);
        localStorage.removeItem(`shopping_session_${listId}`);
        localStorage.removeItem(`interruptedSession-${listId}`);
        return false;
      }
    }

    // Also check if interruptedSession has meaningful data
    if (interruptedSession) {
      try {
        const sessionData = JSON.parse(interruptedSession);
        const hasProgress = (sessionData.completedItems && sessionData.completedItems.length > 0) ||
                           (sessionData.currentAisleIndex && sessionData.currentAisleIndex > 1) ||
                           (sessionData.currentStoreIndex && sessionData.currentStoreIndex > 0) &&
                           sessionData.timestamp && 
                           (Date.now() - sessionData.timestamp) > 30000;

        if (!hasProgress) {
          localStorage.removeItem(`interruptedSession-${listId}`);
          return false;
        }

        return hasProgress;
      } catch (error) {
        console.warn('Error parsing interrupted session:', error);
        localStorage.removeItem(`interruptedSession-${listId}`);
        return false;
      }
    }

    return false;
  };



  return (
    <div className="max-w-md mx-auto frosted-bg min-h-screen flex flex-col">
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
              </CardDescription>            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-xl font-bold text-purple-600">{planData.stores.length}</div>
                  <div className="text-xs text-gray-500">Store(s)</div>
                </div>
                <div className="text-center">
                  <div className={`text-xl font-bold ${availability.missingItems.length > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    {availability.availableItems}/{availability.totalItems}
                  </div>
                  <div className="text-xs text-gray-500">Available</div>
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
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-xl font-bold text-purple-600">{planData.stores.length}</div>
                  <div className="text-xs text-gray-500">Store(s)</div>
                </div>
                <div className="text-center">
                  <div className={`text-xl font-bold ${availability.missingItems.length > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    {availability.availableItems}/{availability.totalItems}
                  </div>
                  <div className="text-xs text-gray-500">Available</div>
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
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-xl font-bold text-purple-600">{planData.stores.length}</div>
                  <div className="text-xs text-gray-500">Store(s)</div>
                </div>
                <div className="text-center">
                  <div className={`text-xl font-bold ${availability.missingItems.length > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    {availability.availableItems}/{availability.totalItems}
                  </div>
                  <div className="text-xs text-gray-500">Available</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>



      {/* Resume Session Dialog */}
      <Dialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Continue Previous Shopping?</DialogTitle>
            <DialogDescription>
              You have an existing shopping session for this list. Would you like to continue where you left off or start fresh?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {existingSessionData && (
              <div className="text-sm text-gray-600">
                <p><strong>Previous session:</strong></p>
                <p>Store: {existingSessionData.currentStoreName || 'Unknown'}</p>
                <p>Progress: {existingSessionData.completedItems?.length || 0} items completed</p>
                {existingSessionData.timestamp && (
                  <p>Started: {new Date(existingSessionData.timestamp).toLocaleDateString()}</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={startFreshSession}>
              Start Fresh
            </Button>
            <Button onClick={resumeExistingSession}>
              Continue Shopping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Buttons */}
      <div className="flex gap-4 mb-6">
        <div className="space-y-2 w-full">
          <div className="flex gap-3">
            <Button 
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold shadow-lg"
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

                // Check for existing session first
                const existingSession = localStorage.getItem(`shopping_session_${listId}`) || 
                                      localStorage.getItem(`interruptedSession-${listId}`);

                if (existingSession && !showResumeDialog) {
                  try {
                    const sessionData = JSON.parse(existingSession);
                    const sessionAge = Date.now() - (sessionData.timestamp || 0);
                    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

                    // Check if session has meaningful progress and is not too old
                    const hasProgress = ((sessionData.completedItems && sessionData.completedItems.length > 0) ||
                                       (sessionData.currentAisleIndex && sessionData.currentAisleIndex > 1) ||
                                       (sessionData.currentStoreIndex && sessionData.currentStoreIndex > 0)) &&
                                       !sessionData.isCompleted &&
                                       sessionAge < maxAge;

                    if (hasProgress) {
                      setExistingSessionData(sessionData);
                      setShowResumeDialog(true);
                      return;
                    }
                  } catch (error) {
                    console.error('Error checking existing session:', error);
                  }
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

                // Store current session data in localStorage for recovery
                localStorage.setItem(`interruptedSession-${listId}`, JSON.stringify({
                  planData: enhancedPlanData,
                  shoppingMode: 'instore'
                }));

                // Navigate with simple parameters to avoid URL corruption
                const targetUrl = `/shopping-route?listId=${listId}&mode=instore&fromPlan=true`;
                console.log('Navigating to:', targetUrl);

                // Use the navigate function instead of window.location for better routing
                navigate(targetUrl);

                // No toast needed - shopping route page will handle feedback
              }}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Begin Shopping
            </Button>
            <Button 
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg"
              size="lg"
              onClick={handleOrderOnline}
            >
              <MapPin className="h-4 w-4 mr-2" />
              Order Online
            </Button>
          </div>
        </div>
      </div>

      {/* Trip Deals Summary */}
      {deals && deals.length > 0 && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <DollarSign className="h-5 w-5" />
              <span>Deals Applied to This Trip</span>
            </CardTitle>
            <CardDescription className="text-green-700">
              Active deals available at your selected stores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {planData.stores.map((store) => {
                const storeDeals = getDealsForRetailer(store.retailer.id);
                const applicableDeals = storeDeals.filter((deal: any) => 
                  store.items.some(item => 
                    item.productName.toLowerCase().includes(deal.productName.toLowerCase()) ||
                    deal.productName.toLowerCase().includes(item.productName.toLowerCase())
                  )
                );

                if (applicableDeals.length === 0) return null;

                return (
                  <div key={store.retailer.id} className="border-l-4 border-green-400 pl-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div 
                        className={`w-3 h-3 rounded-full bg-${store.retailer.logoColor}-500`}
                      />
                      <span className="font-semibold text-green-800">{store.retailer.name}</span>
                    </div>
                    <div className="space-y-2">
                      {applicableDeals.map((deal: any) => (
                        <div key={deal.id} className="flex items-center justify-between text-sm">
                          <span className="text-green-700">{deal.productName}</span>
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            {deal.dealType === 'spend_threshold_percentage' 
                              ? `${deal.discountPercentage}% off $${(deal.spendThreshold! / 100).toFixed(0)}+`
                              : `${Math.round((1 - deal.salePrice / deal.regularPrice) * 100)}% off`
                            }
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {planData.stores.every(store => 
                getDealsForRetailer(store.retailer.id).filter((deal: any) => 
                  store.items.some(item => 
                    item.productName.toLowerCase().includes(deal.productName.toLowerCase()) ||
                    deal.productName.toLowerCase().includes(item.productName.toLowerCase())
                  )
                ).length === 0
              ) && (
                <div className="text-center py-4 text-green-600">
                  <p className="text-sm">No specific product deals found for items in your list.</p>
                  <p className="text-xs">Check the Deals page for general offers at your selected stores.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Store Details */}
      <div className="space-y-4">
        {planData.stores
          .sort((a, b) => a.retailer.name.localeCompare(b.retailer.name))
          .map((store, index) => (
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

              {/* Store Selection within the card */}
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Store className="h-4 w-4" />
                    <span>Store Selection</span>
                  </div>
                  {overrideRetailerId && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setOverrideRetailerId(null);

                        // Invalidate deals cache when resetting to suggested retailers
                        queryClient.invalidateQueries({ queryKey: ['/api/deals'] });

                        toast({
                          title: "Store Reset",
                          description: "Using original retailer suggestions. Refreshing deals...",
                          duration: 2000
                        });
                      }}
                    >
                      Reset to Suggested
                    </Button>
                  )}
                </div>

                <Select
                  value={overrideRetailerId?.toString() || ""}
                  onValueChange={(value) => {
                    if (value) {
                      const retailerId = parseInt(value);
                      setOverrideRetailerId(retailerId);

                      // Invalidate deals cache and refetch for new retailer
                      queryClient.invalidateQueries({ queryKey: ['/api/deals'] });

                      toast({
                        title: "Store Changed",
                        description: `All items will be purchased from ${availableRetailers?.find((r: any) => r.id === retailerId)?.name}. Refreshing deals...`,
                        duration: 3000
                      });
                    }
                  }}
                >
                  <SelectTrigger className="bg-white border-gray-200 hover:border-gray-300 focus:border-purple-500 focus:ring-purple-200">
                    <SelectValue placeholder="Choose a different store (optional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 shadow-lg">
                    {availableRetailers?.map((retailer: any) => (
                      <SelectItem 
                        key={retailer.id} 
                        value={retailer.id.toString()}
                        className="hover:glass-card focus:bg-purple-50 cursor-pointer"
                      >
                        <div className="flex items-center gap-3 py-1">
                          <div 
                            className={`w-3 h-3 rounded-full`}
                            style={{ backgroundColor: `var(--${retailer.logoColor}-500, #${retailer.logoColor === 'blue' ? '3b82f6' : retailer.logoColor === 'green' ? '10b981' : retailer.logoColor === 'red' ? 'ef4444' : retailer.logoColor === 'orange' ? 'f97316' : '6b7280'})` }}
                          />
                          <span className="text-gray-900 font-medium">{retailer.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {store.items
                  .sort((a, b) => a.productName.localeCompare(b.productName))
                  .map((item) => (
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

      <BottomNavigation activeTab="plan-details" />
    </div>
  );
};

export default PlanDetails;