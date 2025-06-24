The provided changes focus on improving data loading and error handling within the shopping route component, particularly addressing issues related to empty shopping lists and incorrect data retrieval.
```

```replit_final_file
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