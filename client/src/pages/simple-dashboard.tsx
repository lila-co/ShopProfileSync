
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Camera, DollarSign, MapPin, Plus, ArrowRight } from 'lucide-react';
import BottomNavigation from '@/components/layout/BottomNavigation';
import type { ShoppingList as ShoppingListType, User } from '@/lib/types';

const SimpleDashboard: React.FC = () => {
  const { data: user } = useQuery<User>({
    queryKey: ['/api/user/profile'],
  });

  const { data: shoppingLists } = useQuery<ShoppingListType[]>({
    queryKey: ['/api/shopping-lists'],
  });

  const { data: deals } = useQuery({
    queryKey: ['/api/deals'],
  });

  const defaultList = shoppingLists?.[0];
  const pendingItems = defaultList?.items?.filter(item => !item.completed) || [];
  const topDeals = deals?.slice(0, 3) || [];

  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white p-6 pb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Hi, {user?.firstName || 'there'}! 👋
            </h1>
            <p className="text-gray-600">Ready to shop smart?</p>
          </div>
          <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded-xl">
            <div className="text-2xl font-bold text-blue-600">{pendingItems.length}</div>
            <div className="text-sm text-blue-700">Items to buy</div>
          </div>
          <div className="bg-green-50 p-4 rounded-xl">
            <div className="text-2xl font-bold text-green-600">{topDeals.length}</div>
            <div className="text-sm text-green-700">Deals available</div>
          </div>
        </div>
      </div>

      {/* Main Actions */}
      <div className="p-6 space-y-4">
        {/* Current List */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <ShoppingBag className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Your Shopping List</h3>
                  <p className="text-sm text-gray-500">{pendingItems.length} items ready</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </div>

            {pendingItems.length > 0 ? (
              <div className="space-y-2 mb-4">
                {pendingItems.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-center space-x-2 text-sm">
                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                    <span className="text-gray-600">{item.productName}</span>
                  </div>
                ))}
                {pendingItems.length > 3 && (
                  <div className="text-sm text-gray-500">
                    +{pendingItems.length - 3} more items
                  </div>
                )}
              </div>
            ) : (
              <div className="mb-4">
                <p className="text-sm text-gray-500">Your list is empty</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = '/shopping-list'}
                className="justify-center"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Items
              </Button>
              <Button
                size="sm"
                onClick={() => window.location.href = `/shopping-route?listId=${defaultList?.id}&mode=instore`}
                className="bg-green-600 hover:bg-green-700 justify-center"
                disabled={pendingItems.length === 0}
              >
                Start Shopping
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            className="h-20 flex-col space-y-2 bg-white border-0 shadow-sm"
            onClick={() => window.location.href = '/scan'}
          >
            <Camera className="h-6 w-6 text-gray-600" />
            <span className="text-sm font-medium">Scan Receipt</span>
          </Button>

          <Button
            variant="outline"
            className="h-20 flex-col space-y-2 bg-white border-0 shadow-sm"
            onClick={() => window.location.href = '/deals'}
          >
            <DollarSign className="h-6 w-6 text-gray-600" />
            <span className="text-sm font-medium">Find Deals</span>
          </Button>
        </div>

        {/* Today's Best Deals */}
        {topDeals.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Today's Best Deals</h3>
                <Button variant="ghost" size="sm" onClick={() => window.location.href = '/deals'}>
                  See all
                </Button>
              </div>
              
              <div className="space-y-3">
                {topDeals.map((deal: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">{deal.productName}</p>
                      <p className="text-xs text-gray-500">{deal.retailer?.name || 'Store'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600 text-sm">
                        ${(deal.salePrice / 100).toFixed(2)}
                      </p>
                      {deal.regularPrice && (
                        <p className="text-xs text-gray-500 line-through">
                          ${(deal.regularPrice / 100).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <BottomNavigation activeTab="dashboard" />
    </div>
  );
};

export default SimpleDashboard;
