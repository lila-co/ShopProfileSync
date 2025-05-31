typescript
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import BottomNavigation from '@/components/layout/BottomNavigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Clock, Trash2, RefreshCw, Calendar, Snowflake, Package } from 'lucide-react';
import { User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface ExpirationItem {
  id: number;
  productName: string;
  location: 'fridge' | 'freezer' | 'pantry';
  lastPurchaseDate: Date;
  typicalRepurchaseDays: number;
  daysOverdue: number;
  estimatedExpirationDate: Date;
  status: 'fresh' | 'expiring_soon' | 'overdue' | 'expired';
  category: string;
}

const ExpirationTrackerPage: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [selectedTab, setSelectedTab] = useState('all');

  const { data: user } = useQuery<User>({
    queryKey: ['/api/user/profile'],
  });

  // Mock data for demonstration - in a real app, this would come from analyzing purchase patterns
  const expirationItems: ExpirationItem[] = [
    {
      id: 1,
      productName: 'Ground Beef',
      location: 'fridge',
      lastPurchaseDate: new Date('2025-01-15'),
      typicalRepurchaseDays: 7,
      daysOverdue: 5,
      estimatedExpirationDate: new Date('2025-01-18'),
      status: 'expired',
      category: 'Meat'
    },
    {
      id: 2,
      productName: 'Greek Yogurt',
      location: 'fridge',
      lastPurchaseDate: new Date('2025-01-20'),
      typicalRepurchaseDays: 10,
      daysOverdue: 2,
      estimatedExpirationDate: new Date('2025-01-25'),
      status: 'expired',
      category: 'Dairy'
    },
    {
      id: 3,
      productName: 'Spinach',
      location: 'fridge',
      lastPurchaseDate: new Date('2025-01-21'),
      typicalRepurchaseDays: 5,
      daysOverdue: 1,
      estimatedExpirationDate: new Date('2025-01-26'),
      status: 'expiring_soon',
      category: 'Produce'
    },
    {
      id: 4,
      productName: 'Frozen Berries',
      location: 'freezer',
      lastPurchaseDate: new Date('2024-12-15'),
      typicalRepurchaseDays: 30,
      daysOverdue: 12,
      estimatedExpirationDate: new Date('2025-03-15'),
      status: 'overdue',
      category: 'Frozen'
    },
    {
      id: 5,
      productName: 'Chicken Breast',
      location: 'freezer',
      lastPurchaseDate: new Date('2025-01-10'),
      typicalRepurchaseDays: 14,
      daysOverdue: 3,
      estimatedExpirationDate: new Date('2025-04-10'),
      status: 'overdue',
      category: 'Meat'
    },
    {
      id: 6,
      productName: 'Canned Tomatoes',
      location: 'pantry',
      lastPurchaseDate: new Date('2024-11-20'),
      typicalRepurchaseDays: 60,
      daysOverdue: 8,
      estimatedExpirationDate: new Date('2026-11-20'),
      status: 'overdue',
      category: 'Pantry'
    },
    {
      id: 7,
      productName: 'Fresh Milk',
      location: 'fridge',
      lastPurchaseDate: new Date('2025-01-25'),
      typicalRepurchaseDays: 7,
      daysOverdue: -2,
      estimatedExpirationDate: new Date('2025-02-01'),
      status: 'fresh',
      category: 'Dairy'
    },
    {
      id: 8,
      productName: 'Banana',
      location: 'pantry',
      lastPurchaseDate: new Date('2025-01-24'),
      typicalRepurchaseDays: 5,
      daysOverdue: 0,
      estimatedExpirationDate: new Date('2025-01-29'),
      status: 'expiring_soon',
      category: 'Produce'
    }
  ];

  const clearItemsMutation = useMutation({
    mutationFn: async (itemIds: number[]) => {
      // In a real app, this would make an API call to remove items
      console.log('Clearing items:', itemIds);
      return Promise.resolve();
    },
    onSuccess: () => {
      toast({
        title: "Items Cleared",
        description: `${selectedItems.size} items have been removed from tracking.`
      });
      setSelectedItems(new Set());
      queryClient.invalidateQueries({ queryKey: ['/api/expiration-items'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to clear items.",
        variant: "destructive"
      });
    }
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      // In a real app, this would clear all tracked items
      console.log('Clearing all items');
      return Promise.resolve();
    },
    onSuccess: () => {
      toast({
        title: "All Items Cleared",
        description: "All tracked items have been removed."
      });
      setSelectedItems(new Set());
      queryClient.invalidateQueries({ queryKey: ['/api/expiration-items'] });
    }
  });

  const refreshTrackingMutation = useMutation({
    mutationFn: async () => {
      // In a real app, this would refresh the tracking data
      console.log('Refreshing tracking data');
      return Promise.resolve();
    },
    onSuccess: () => {
      toast({
        title: "Tracking Refreshed",
        description: "Expiration data has been updated based on your latest purchases."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/expiration-items'] });
    }
  });

  const toggleItemSelection = (id: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'expired': return 'bg-red-100 text-red-800 border-red-200';
      case 'expiring_soon': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'overdue': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'fresh': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getLocationIcon = (location: string) => {
    switch (location) {
      case 'freezer': return <Snowflake className="h-4 w-4" />;
      case 'fridge': return <Package className="h-4 w-4" />;
      case 'pantry': return <Package className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const filterItems = (items: ExpirationItem[], filter: string) => {
    switch (filter) {
      case 'expired':
        return items.filter(item => item.status === 'expired');
      case 'expiring':
        return items.filter(item => item.status === 'expiring_soon');
      case 'overdue':
        return items.filter(item => item.status === 'overdue');
      case 'fridge':
        return items.filter(item => item.location === 'fridge');
      case 'freezer':
        return items.filter(item => item.location === 'freezer');
      case 'pantry':
        return items.filter(item => item.location === 'pantry');
      default:
        return items;
    }
  };

  const filteredItems = filterItems(expirationItems, selectedTab);
  const expiredCount = expirationItems.filter(item => item.status === 'expired').length;
  const expiringCount = expirationItems.filter(item => item.status === 'expiring_soon').length;
  const overdueCount = expirationItems.filter(item => item.status === 'overdue').length;

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
      <Header user={user} />

      <main className="flex-1 overflow-y-auto">
        <div className="p-4 pb-20">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Food Expiration Tracker</h1>
            <p className="text-gray-600">Manage items that may be expiring or haven't been repurchased</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-red-600">{expiredCount}</div>
                <div className="text-xs text-red-600">Expired</div>
              </CardContent>
            </Card>
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-orange-600">{expiringCount}</div>
                <div className="text-xs text-orange-600">Expiring Soon</div>
              </CardContent>
            </Card>
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-yellow-600">{overdueCount}</div>
                <div className="text-xs text-yellow-600">Overdue</div>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshTrackingMutation.mutate()}
              disabled={refreshTrackingMutation.isPending}
              className="flex items-center gap-1"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>

            {selectedItems.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => clearItemsMutation.mutate(Array.from(selectedItems))}
                disabled={clearItemsMutation.isPending}
                className="flex items-center gap-1"
              >
                <Trash2 className="h-4 w-4" />
                Clear Selected ({selectedItems.size})
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => clearAllMutation.mutate()}
              disabled={clearAllMutation.isPending}
              className="flex items-center gap-1 ml-auto"
            >
              <Trash2 className="h-4 w-4" />
              Clear All
            </Button>
          </div>

          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="expired">Expired</TabsTrigger>
              <TabsTrigger value="expiring">Expiring</TabsTrigger>
              <TabsTrigger value="overdue">Overdue</TabsTrigger>
            </TabsList>

            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
              <TabsList className="grid w-full grid-cols-3 mt-2">
                <TabsTrigger value="fridge">Fridge</TabsTrigger>
                <TabsTrigger value="freezer">Freezer</TabsTrigger>
                <TabsTrigger value="pantry">Pantry</TabsTrigger>
              </TabsList>
            </Tabs>

            <TabsContent value={selectedTab} className="space-y-3">
              {filteredItems.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-gray-500">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No items found for this filter</p>
                  </CardContent>
                </Card>
              ) : (
                filteredItems.map((item) => (
                  <Card 
                    key={item.id} 
                    className={`cursor-pointer transition-all ${
                      selectedItems.has(item.id) 
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : 'hover:shadow-md'
                    } ${item.status === 'expired' ? 'border-red-200' : 
                       item.status === 'expiring_soon' ? 'border-orange-200' : ''}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          checked={selectedItems.has(item.id)}
                          onCheckedChange={() => toggleItemSelection(item.id)}
                          onClick={(e) => e.stopPropagation()}
                        />

                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-gray-800">{item.productName}</h4>
                            <Badge 
                              variant="outline" 
                              className={getStatusColor(item.status)}
                            >
                              {item.status === 'expired' && <AlertTriangle className="h-3 w-3 mr-1" />}
                              {item.status === 'expiring_soon' && <Clock className="h-3 w-3 mr-1" />}
                              {item.status.replace('_', ' ')}
                            </Badge>
                          </div>

                          <div className="space-y-1 text-sm text-gray-600">
                            <div className="flex items-center">
                              {getLocationIcon(item.location)}
                              <span className="ml-1 capitalize">{item.location}</span>
                              <span className="mx-2">•</span>
                              <span>{item.category}</span>
                            </div>

                            <div className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              Last purchased: {item.lastPurchaseDate.toLocaleDateString()}
                            </div>

                            <div className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {item.daysOverdue > 0 ? (
                                <span className="text-red-600">
                                  {item.daysOverdue} days overdue for repurchase
                                </span>
                              ) : item.daysOverdue === 0 ? (
                                <span className="text-orange-600">
                                  Due for repurchase today
                                </span>
                              ) : (
                                <span className="text-green-600">
                                  Repurchase in {Math.abs(item.daysOverdue)} days
                                </span>
                              )}
                            </div>

                            {item.status === 'expired' && (
                              <div className="text-red-600 text-xs font-medium">
                                ⚠️ May have expired on {item.estimatedExpirationDate.toLocaleDateString()}
                              </div>
                            )}
                          </div>

                          <div className="mt-3 text-xs text-gray-500">
                            Typical repurchase cycle: {item.typicalRepurchaseDays} days
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <BottomNavigation activeTab="lists" />
    </div>
  );
};

export default ExpirationTrackerPage;