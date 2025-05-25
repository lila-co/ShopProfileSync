import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import BottomNavigation from '@/components/layout/BottomNavigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Users, Store, TrendingUp } from 'lucide-react';
import { User } from '@/lib/types';

const InternalAnalyticsPage: React.FC = () => {
  const { data: user } = useQuery<User>({
    queryKey: ['/api/user/profile'],
  });

  const { data: retailerAnalytics } = useQuery({
    queryKey: ['/api/internal/analytics/retailers'],
  });

  const { data: productAnalytics } = useQuery({
    queryKey: ['/api/internal/analytics/products'],
  });

  const { data: customerSegments } = useQuery({
    queryKey: ['/api/internal/analytics/customer-segments'],
  });

  const { data: purchasePatterns } = useQuery({
    queryKey: ['/api/internal/analytics/purchase-patterns'],
  });

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
      <Header user={user} />

      <main className="flex-1 overflow-y-auto p-4 pb-20">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Internal Analytics</h1>
          <p className="text-gray-600">Business intelligence and market insights</p>
        </div>

        <Tabs defaultValue="retailers" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="retailers">Retailers</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
          </TabsList>

          <TabsContent value="retailers" className="space-y-4">
            {retailerAnalytics?.map((retailer: any) => (
              <Card key={retailer.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <Store className="h-5 w-5 mr-2 text-blue-600" />
                    {retailer.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-xl font-bold">${(retailer.totalSales / 100).toFixed(0)}K</div>
                      <div className="text-sm text-gray-500">Total Sales</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold">{retailer.orderCount.toLocaleString()}</div>
                      <div className="text-sm text-gray-500">Orders</div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Top Categories:</div>
                    {retailer.topSellingCategories.slice(0, 3).map((category: any, index: number) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{category.name}</span>
                        <span>{category.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            {productAnalytics?.map((product: any) => (
              <Card key={product.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-gray-500">{product.category}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">${(product.totalSales / 100).toFixed(0)}K</div>
                      <div className="text-sm text-gray-500">{product.unitsSold} units</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </main>

      <BottomNavigation activeTab="home" />
    </div>
  );
};

export default InternalAnalyticsPage;