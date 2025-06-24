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

const ShoppingRoute: React.FC = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [completedItems, setCompletedItems] = useState<Set<number>>(new Set());

  // Get URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const listId = urlParams.get('listId');

  // Fetch shopping list data
  const { data: shoppingListData, isLoading, error } = useQuery({
    queryKey: [`/api/shopping-lists/${listId}`],
    enabled: !!listId
  });

  // Get shopping items
  const shoppingItems = useMemo(() => {
    if (shoppingListData?.items && Array.isArray(shoppingListData.items)) {
      return shoppingListData.items;
    }
    return [];
  }, [shoppingListData]);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading shopping route...</div>
      </div>
    );
  }

  if (error || !shoppingItems.length) {
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
                <h3 className="text-lg font-semibold">No Shopping Items Found</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Please add items to your shopping list first.
              </p>
              <Button onClick={() => navigate('/shopping-list')}>
                Go to Shopping List
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

  // Calculate total cost
  const totalCost = shoppingItems.reduce((sum, item) => {
    const price = item.suggestedPrice || 0;
    const quantity = item.quantity || 1;
    return sum + (price * quantity);
  }, 0);

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
            Ready to Shop
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
                <span className="font-bold">${(totalCost / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Time:</span>
                <span>25-35 min</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Complete Shopping Button */}
        {completedCount === totalItems && totalItems > 0 && (
          <Card className="mt-4 bg-blue-50 border-blue-200">
            <CardContent className="p-4 text-center">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">
                🎉 Shopping Complete!
              </h3>
              <p className="text-blue-600 mb-4">
                You've collected all items from your list.
              </p>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  toast({
                    title: "Shopping Complete!",
                    description: "Great job! Your shopping trip is finished.",
                  });
                  navigate('/shopping-list');
                }}
              >
                Finish Shopping
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      <BottomNavigation activeTab="shopping-route" />
    </div>
  );
};

export default ShoppingRoute;