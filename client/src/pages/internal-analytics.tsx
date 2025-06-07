
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import BottomNavigation from '@/components/layout/BottomNavigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  ShoppingCart, 
  DollarSign, 
  Calendar,
  Download,
  Filter,
  RefreshCw,
  Target,
  Clock,
  MapPin,
  Package,
  Star,
  AlertTriangle,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { User } from '@/lib/types';

const InternalAnalyticsPage: React.FC = () => {
  const { data: user } = useQuery<User>({
    queryKey: ['/api/user/profile'],
  });

  const [dateRange, setDateRange] = useState('last30days');
  const [selectedMetric, setSelectedMetric] = useState('revenue');

  // Mock comprehensive business data
  const businessMetrics = {
    revenue: {
      current: 487320,
      previous: 412850,
      growth: 18.03,
      target: 500000
    },
    users: {
      active: 12847,
      new: 1534,
      retention: 89.2,
      churn: 3.4
    },
    orders: {
      total: 8429,
      avgValue: 127.45,
      frequency: 2.3,
      conversion: 12.8
    },
    inventory: {
      categories: 247,
      products: 15680,
      lowStock: 23,
      trending: 156
    }
  };

  const topPerformers = [
    { category: 'Organic Produce', revenue: 89420, growth: 34.2, orders: 2341 },
    { category: 'Dairy & Eggs', revenue: 67890, growth: 12.8, orders: 1876 },
    { category: 'Bakery', revenue: 54320, growth: 23.1, orders: 1654 },
    { category: 'Meat & Seafood', revenue: 43210, growth: 8.7, orders: 987 },
    { category: 'Pantry Staples', revenue: 38750, growth: 15.4, orders: 1432 }
  ];

  const customerSegments = [
    { segment: 'Budget-Conscious Families', percentage: 45, value: 219000, count: 5781 },
    { segment: 'Premium Shoppers', percentage: 28, value: 187000, count: 3597 },
    { segment: 'Health-Focused', percentage: 18, value: 98000, count: 2312 },
    { segment: 'Convenience Seekers', percentage: 9, value: 43000, count: 1157 }
  ];

  const regionalData = [
    { region: 'Northeast', revenue: 156789, users: 3421, growth: 23.4 },
    { region: 'Southeast', revenue: 134567, users: 2987, growth: 18.9 },
    { region: 'West Coast', revenue: 98765, users: 2654, growth: 31.2 },
    { region: 'Midwest', revenue: 76543, users: 2234, growth: 12.7 },
    { region: 'Southwest', revenue: 54321, users: 1551, growth: 28.1 }
  ];

  const isMobile = window.innerWidth < 768;

  if (isMobile) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
        <Header user={user} title="Internal Analytics" />
        <main className="flex-1 overflow-y-auto p-4 pb-20">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-bold text-gray-800 mb-2">Business Analytics</h1>
            <p className="text-sm text-gray-600">Switch to desktop for full analytics experience</p>
          </div>
          
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center">
                  <DollarSign className="w-4 h-4 mr-2 text-green-600" />
                  Revenue Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">${businessMetrics.revenue.current.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Monthly Revenue</div>
                  <Badge variant="outline" className="mt-2">+{businessMetrics.revenue.growth}%</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center">
                  <Users className="w-4 h-4 mr-2 text-blue-600" />
                  User Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold text-blue-600">{businessMetrics.users.active.toLocaleString()}</div>
                    <div className="text-xs text-gray-600">Active Users</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-600">{businessMetrics.users.retention}%</div>
                    <div className="text-xs text-gray-600">Retention</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <BottomNavigation activeTab="profile" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Business Intelligence Dashboard</h1>
            <p className="text-gray-600">Comprehensive analytics and market insights</p>
          </div>
          <div className="flex items-center space-x-4">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-48">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="last7days">Last 7 Days</SelectItem>
                <SelectItem value="last30days">Last 30 Days</SelectItem>
                <SelectItem value="last90days">Last 90 Days</SelectItem>
                <SelectItem value="thisYear">This Year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Key Performance Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                  <p className="text-3xl font-bold text-gray-900">${businessMetrics.revenue.current.toLocaleString()}</p>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-sm text-green-600 font-medium">+{businessMetrics.revenue.growth}%</span>
                    <span className="text-sm text-gray-500 ml-2">vs last month</span>
                  </div>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Users</p>
                  <p className="text-3xl font-bold text-gray-900">{businessMetrics.users.active.toLocaleString()}</p>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="w-4 h-4 text-blue-500 mr-1" />
                    <span className="text-sm text-blue-600 font-medium">+{businessMetrics.users.new}</span>
                    <span className="text-sm text-gray-500 ml-2">new this month</span>
                  </div>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Orders</p>
                  <p className="text-3xl font-bold text-gray-900">{businessMetrics.orders.total.toLocaleString()}</p>
                  <div className="flex items-center mt-2">
                    <Target className="w-4 h-4 text-purple-500 mr-1" />
                    <span className="text-sm text-purple-600 font-medium">${businessMetrics.orders.avgValue}</span>
                    <span className="text-sm text-gray-500 ml-2">avg order</span>
                  </div>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <ShoppingCart className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                  <p className="text-3xl font-bold text-gray-900">{businessMetrics.orders.conversion}%</p>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="w-4 h-4 text-orange-500 mr-1" />
                    <span className="text-sm text-orange-600 font-medium">+2.3%</span>
                    <span className="text-sm text-gray-500 ml-2">vs last month</span>
                  </div>
                </div>
                <div className="p-3 bg-orange-100 rounded-full">
                  <Target className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="regions">Regions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Trend Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Trend</CardTitle>
                  <CardDescription>Monthly revenue growth over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                    <div className="text-center">
                      <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">Revenue Chart Visualization</p>
                      <p className="text-sm text-gray-400">Integration with Chart.js or D3.js recommended</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Customer Segments */}
              <Card>
                <CardHeader>
                  <CardTitle>Customer Segments</CardTitle>
                  <CardDescription>Revenue distribution by customer type</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {customerSegments.map((segment, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">{segment.segment}</span>
                            <span className="text-sm text-gray-500">{segment.percentage}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${segment.percentage}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between mt-1 text-xs text-gray-500">
                            <span>${segment.value.toLocaleString()}</span>
                            <span>{segment.count.toLocaleString()} customers</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Performing Categories */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Categories</CardTitle>
                <CardDescription>Category performance and growth metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Category</th>
                        <th className="text-right py-3 px-4">Revenue</th>
                        <th className="text-right py-3 px-4">Growth</th>
                        <th className="text-right py-3 px-4">Orders</th>
                        <th className="text-right py-3 px-4">Avg Order</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topPerformers.map((category, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{category.category}</td>
                          <td className="text-right py-3 px-4">${category.revenue.toLocaleString()}</td>
                          <td className="text-right py-3 px-4">
                            <div className="flex items-center justify-end">
                              {category.growth > 0 ? (
                                <ChevronUp className="w-4 h-4 text-green-500 mr-1" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-red-500 mr-1" />
                              )}
                              <span className={category.growth > 0 ? 'text-green-600' : 'text-red-600'}>
                                {category.growth > 0 ? '+' : ''}{category.growth}%
                              </span>
                            </div>
                          </td>
                          <td className="text-right py-3 px-4">{category.orders.toLocaleString()}</td>
                          <td className="text-right py-3 px-4">${(category.revenue / category.orders).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="revenue" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Revenue Analytics</CardTitle>
                  <CardDescription>Detailed revenue breakdown and projections</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                    <div className="text-center">
                      <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg">Advanced Revenue Chart</p>
                      <p className="text-sm text-gray-400">Multi-line chart showing revenue trends, projections, and targets</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Revenue Goals</CardTitle>
                  <CardDescription>Progress toward targets</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Monthly Target</span>
                      <span className="text-sm text-gray-500">
                        ${businessMetrics.revenue.current.toLocaleString()} / ${businessMetrics.revenue.target.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-green-600 h-3 rounded-full" 
                        style={{ width: `${(businessMetrics.revenue.current / businessMetrics.revenue.target) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {((businessMetrics.revenue.current / businessMetrics.revenue.target) * 100).toFixed(1)}% of target achieved
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Q1 Performance</span>
                      <Badge variant="outline" className="text-green-600">Above Target</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Growth Rate</span>
                      <span className="font-medium">+{businessMetrics.revenue.growth}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Forecast Accuracy</span>
                      <span className="font-medium">94.2%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="customers" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Customer Acquisition</CardTitle>
                  <CardDescription>New customer growth and retention metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{businessMetrics.users.new}</p>
                      <p className="text-sm text-gray-600">New Customers</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{businessMetrics.users.retention}%</p>
                      <p className="text-sm text-gray-600">Retention Rate</p>
                    </div>
                  </div>
                  <div className="h-48 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                    <div className="text-center">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">Customer Acquisition Chart</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Customer Lifetime Value</CardTitle>
                  <CardDescription>CLV analysis by customer segment</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {customerSegments.map((segment, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{segment.segment}</p>
                          <p className="text-sm text-gray-500">{segment.count.toLocaleString()} customers</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">${(segment.value / segment.count).toFixed(0)}</p>
                          <p className="text-sm text-gray-500">Avg CLV</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Inventory Overview</CardTitle>
                  <CardDescription>Product and stock metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Products</span>
                    <span className="font-bold">{businessMetrics.inventory.products.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Categories</span>
                    <span className="font-bold">{businessMetrics.inventory.categories}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Low Stock Items</span>
                    <Badge variant="destructive">{businessMetrics.inventory.lowStock}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Trending Items</span>
                    <Badge variant="secondary">{businessMetrics.inventory.trending}</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Product Performance</CardTitle>
                  <CardDescription>Best and worst performing products</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                    <div className="text-center">
                      <Package className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">Product Performance Matrix</p>
                      <p className="text-sm text-gray-400">Revenue vs. Volume analysis</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="regions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Regional Performance</CardTitle>
                <CardDescription>Geographic breakdown of business metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                    <div className="text-center">
                      <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">Geographic Heat Map</p>
                      <p className="text-sm text-gray-400">Revenue by region visualization</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {regionalData.map((region, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{region.region}</p>
                          <p className="text-sm text-gray-500">{region.users.toLocaleString()} users</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">${region.revenue.toLocaleString()}</p>
                          <div className="flex items-center">
                            <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                            <span className="text-sm text-green-600">+{region.growth}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default InternalAnalyticsPage;
