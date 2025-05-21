import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

// Types for our analytics
interface RetailerAnalytics {
  id: number;
  name: string;
  totalSales: number;
  orderCount: number;
  averageOrderValue: number;
  topSellingCategories: {
    name: string;
    salesValue: number;
    percentage: number;
  }[];
}

interface ProductAnalytics {
  id: number;
  name: string;
  category: string;
  totalSales: number;
  unitsSold: number;
  averagePrice: number;
  percentageOfTotalSales: number;
}

interface CustomerSegment {
  id: string;
  name: string;
  percentage: number;
  averageSpend: number;
  count: number;
  topCategories: string[];
}

interface PurchasePattern {
  id: string;
  name: string;
  description: string;
  affectedProducts: string[];
  customerSegments: string[];
  statisticalSignificance: number;
}

interface FilterState {
  startDate: Date | null;
  endDate: Date | null;
  retailerId: number | null;
  category: string | null;
  minOrderValue: number;
  maxOrderValue: number;
  minAge: number;
  maxAge: number;
  householdType: string | null;
  includeNameBrands: boolean;
  includeOrganic: boolean;
}

// Mock data for demonstration
const MOCK_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#83a6ed'];

// Internal analytics page component
const InternalAnalytics: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('retailer');
  const [filters, setFilters] = useState<FilterState>({
    startDate: null,
    endDate: null,
    retailerId: null,
    category: null,
    minOrderValue: 0,
    maxOrderValue: 10000,
    minAge: 18,
    maxAge: 85,
    householdType: null,
    includeNameBrands: true,
    includeOrganic: true
  });

  // Fetch retailers for dropdown
  const { data: retailers } = useQuery({
    queryKey: ['/api/retailers'],
  });

  // These would be separate API endpoints in a real implementation
  const { data: retailerAnalytics, isLoading: loadingRetailerData } = useQuery({
    queryKey: ['/api/internal/analytics/retailers', filters],
    enabled: activeTab === 'retailer',
  });

  const { data: productAnalytics, isLoading: loadingProductData } = useQuery({
    queryKey: ['/api/internal/analytics/products', filters],
    enabled: activeTab === 'product',
  });

  const { data: customerSegments, isLoading: loadingSegmentData } = useQuery({
    queryKey: ['/api/internal/analytics/customer-segments', filters],
    enabled: activeTab === 'customer',
  });

  const { data: purchasePatterns, isLoading: loadingPatternData } = useQuery({
    queryKey: ['/api/internal/analytics/purchase-patterns', filters],
    enabled: activeTab === 'patterns',
  });

  // Generate mock data for visualization until backend is ready
  const getRetailerData = () => {
    // This would come from the API in a real implementation
    return [
      { name: 'Walmart', sales: 4000, orders: 240, avgOrder: 16.67 },
      { name: 'Target', sales: 3000, orders: 170, avgOrder: 17.65 },
      { name: 'Kroger', sales: 2000, orders: 130, avgOrder: 15.38 },
      { name: 'Costco', sales: 5000, orders: 100, avgOrder: 50.00 },
      { name: 'Whole Foods', sales: 1800, orders: 80, avgOrder: 22.50 },
      { name: 'Safeway', sales: 1500, orders: 90, avgOrder: 16.67 }
    ];
  };

  const getProductData = () => {
    return [
      { name: 'Milk', category: 'Dairy', sales: 2800, units: 700, avgPrice: 4.00, percentage: 15 },
      { name: 'Eggs', category: 'Dairy', sales: 1900, units: 400, avgPrice: 4.75, percentage: 10 },
      { name: 'Bread', category: 'Bakery', sales: 1600, units: 450, avgPrice: 3.56, percentage: 8 },
      { name: 'Bananas', category: 'Produce', sales: 1400, units: 900, avgPrice: 1.56, percentage: 7 },
      { name: 'Chicken', category: 'Meat', sales: 2200, units: 300, avgPrice: 7.33, percentage: 11 },
      { name: 'Coffee', category: 'Beverages', sales: 1800, units: 200, avgPrice: 9.00, percentage: 9 }
    ];
  };

  const getCustomerSegmentData = () => {
    return [
      { name: 'Family Households', value: 35 },
      { name: 'Single Professionals', value: 25 },
      { name: 'Empty Nesters', value: 15 },
      { name: 'Students', value: 12 },
      { name: 'Retirees', value: 13 }
    ];
  };

  const getMonthlyTrendData = () => {
    return [
      { month: 'Jan', sales: 4000, visits: 2400 },
      { month: 'Feb', sales: 3000, visits: 1398 },
      { month: 'Mar', sales: 2000, visits: 9800 },
      { month: 'Apr', sales: 2780, visits: 3908 },
      { month: 'May', sales: 1890, visits: 4800 },
      { month: 'Jun', sales: 2390, visits: 3800 },
      { month: 'Jul', sales: 3490, visits: 4300 },
      { month: 'Aug', sales: 3190, visits: 4100 },
      { month: 'Sep', sales: 2490, visits: 3500 },
      { month: 'Oct', sales: 2790, visits: 3200 },
      { month: 'Nov', sales: 3890, visits: 4100 },
      { month: 'Dec', sales: 4490, visits: 5400 }
    ];
  };

  const getBulkDealData = () => {
    return [
      { name: 'Buy 1 Get 1', conversion: 55 },
      { name: 'Buy 2 Get 1 Free', conversion: 68 },
      { name: 'Buy 3 for $10', conversion: 48 },
      { name: 'Spend $50 Save $10', conversion: 72 },
      { name: 'Spend $100 Save $25', conversion: 60 }
    ];
  };

  // Handle filter changes
  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Export data to CSV
  const exportData = () => {
    toast({
      title: "Data exported",
      description: "The analytics data has been exported to CSV format.",
    });
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Internal Analytics Dashboard</h1>
          <p className="text-gray-500">Comprehensive insights for retail behavior analysis</p>
        </div>
        <div className="space-x-2">
          <Button variant="outline" onClick={exportData}>Export Data</Button>
          <Button variant="default">Generate Report</Button>
        </div>
      </div>

      {/* Filters Panel */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-xl">Analytics Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date-range">Date Range</Label>
              <div className="flex gap-2">
                <DatePicker
                  selected={filters.startDate}
                  onSelect={(date) => updateFilter('startDate', date)}
                  placeholderText="Start Date"
                />
                <DatePicker
                  selected={filters.endDate}
                  onSelect={(date) => updateFilter('endDate', date)}
                  placeholderText="End Date"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="retailer">Retailer</Label>
              <Select onValueChange={(value) => updateFilter('retailerId', value)}>
                <SelectTrigger id="retailer">
                  <SelectValue placeholder="Select Retailer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Retailers</SelectItem>
                  <SelectItem value="1">Walmart</SelectItem>
                  <SelectItem value="2">Target</SelectItem>
                  <SelectItem value="3">Kroger</SelectItem>
                  <SelectItem value="4">Costco</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Product Category</Label>
              <Select onValueChange={(value) => updateFilter('category', value)}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  <SelectItem value="dairy">Dairy</SelectItem>
                  <SelectItem value="meat">Meat & Seafood</SelectItem>
                  <SelectItem value="produce">Produce</SelectItem>
                  <SelectItem value="bakery">Bakery</SelectItem>
                  <SelectItem value="household">Household</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="order-value">Order Value Range ($)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.minOrderValue}
                  onChange={(e) => updateFilter('minOrderValue', parseInt(e.target.value))}
                  className="w-20"
                />
                <span className="self-center">to</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={filters.maxOrderValue}
                  onChange={(e) => updateFilter('maxOrderValue', parseInt(e.target.value))}
                  className="w-20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="household-type">Household Type</Label>
              <Select onValueChange={(value) => updateFilter('householdType', value)}>
                <SelectTrigger id="household-type">
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="family">Family</SelectItem>
                  <SelectItem value="couple">Couple</SelectItem>
                  <SelectItem value="roommates">Roommates</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="age-range">Customer Age Range</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Min Age"
                  value={filters.minAge}
                  onChange={(e) => updateFilter('minAge', parseInt(e.target.value))}
                  className="w-20"
                />
                <span className="self-center">to</span>
                <Input
                  type="number"
                  placeholder="Max Age"
                  value={filters.maxAge}
                  onChange={(e) => updateFilter('maxAge', parseInt(e.target.value))}
                  className="w-20"
                />
              </div>
            </div>

            <div className="space-y-2 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="name-brands"
                  checked={filters.includeNameBrands}
                  onCheckedChange={(checked) => updateFilter('includeNameBrands', checked)}
                />
                <Label htmlFor="name-brands">Name Brands</Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="organic"
                  checked={filters.includeOrganic}
                  onCheckedChange={(checked) => updateFilter('includeOrganic', checked)}
                />
                <Label htmlFor="organic">Organic Products</Label>
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setFilters({
                startDate: null,
                endDate: null,
                retailerId: null,
                category: null,
                minOrderValue: 0,
                maxOrderValue: 10000,
                minAge: 18,
                maxAge: 85,
                householdType: null,
                includeNameBrands: true,
                includeOrganic: true
              })}
            >
              Reset Filters
            </Button>
            <Button variant="default">Apply Filters</Button>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="retailer">Retailer Analysis</TabsTrigger>
          <TabsTrigger value="product">Product Performance</TabsTrigger>
          <TabsTrigger value="customer">Customer Segments</TabsTrigger>
          <TabsTrigger value="patterns">Purchase Patterns</TabsTrigger>
          <TabsTrigger value="bulkdeals">Bulk Deal Analytics</TabsTrigger>
        </TabsList>

        {/* Retailer Analysis */}
        <TabsContent value="retailer" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Sales by Retailer</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getRetailerData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${value}`} />
                    <Bar dataKey="sales" fill="#8884d8" name="Total Sales ($)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Orders by Retailer</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getRetailerData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="orders" fill="#82ca9d" name="Order Count" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Avg. Order Value</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getRetailerData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${value}`} />
                    <Bar dataKey="avgOrder" fill="#ffc658" name="Avg. Order ($)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Sales Trends by Month</CardTitle>
            </CardHeader>
            <CardContent className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getMonthlyTrendData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip formatter={(value, name) => name === 'sales' ? `$${value}` : value} />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="sales" stroke="#8884d8" name="Sales ($)" />
                  <Line yAxisId="right" type="monotone" dataKey="visits" stroke="#82ca9d" name="Store Visits" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Product Performance */}
        <TabsContent value="product" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Products by Sales</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getProductData()} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip formatter={(value) => `$${value}`} />
                    <Bar dataKey="sales" fill="#8884d8" name="Sales ($)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Products by Units Sold</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getProductData()} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="units" fill="#82ca9d" name="Units Sold" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Sales Breakdown by Category</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getProductData()}
                      dataKey="sales"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(entry) => entry.category}
                    >
                      {getProductData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={MOCK_COLORS[index % MOCK_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `$${value}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Average Price by Product</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getProductData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${value}`} />
                    <Bar dataKey="avgPrice" fill="#ffc658" name="Avg. Price ($)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Customer Segments */}
        <TabsContent value="customer" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Customer Segments Distribution</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getCustomerSegmentData()}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(entry) => `${entry.name}: ${entry.value}%`}
                    >
                      {getCustomerSegmentData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={MOCK_COLORS[index % MOCK_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Household Shopping Preferences</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Families</h4>
                    <div className="text-sm">
                      <div className="flex justify-between mb-1">
                        <span>Bulk Purchases:</span>
                        <span className="font-medium">78%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full">
                        <div className="h-2 bg-blue-500 rounded-full" style={{ width: '78%' }}></div>
                      </div>
                    </div>
                    <div className="text-sm mt-2">
                      <div className="flex justify-between mb-1">
                        <span>Organic Products:</span>
                        <span className="font-medium">42%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full">
                        <div className="h-2 bg-blue-500 rounded-full" style={{ width: '42%' }}></div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Single Professionals</h4>
                    <div className="text-sm">
                      <div className="flex justify-between mb-1">
                        <span>Convenience Foods:</span>
                        <span className="font-medium">65%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full">
                        <div className="h-2 bg-green-500 rounded-full" style={{ width: '65%' }}></div>
                      </div>
                    </div>
                    <div className="text-sm mt-2">
                      <div className="flex justify-between mb-1">
                        <span>Meal Kits:</span>
                        <span className="font-medium">52%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full">
                        <div className="h-2 bg-green-500 rounded-full" style={{ width: '52%' }}></div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Retirees</h4>
                    <div className="text-sm">
                      <div className="flex justify-between mb-1">
                        <span>Health Foods:</span>
                        <span className="font-medium">61%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full">
                        <div className="h-2 bg-orange-500 rounded-full" style={{ width: '61%' }}></div>
                      </div>
                    </div>
                    <div className="text-sm mt-2">
                      <div className="flex justify-between mb-1">
                        <span>Name Brands:</span>
                        <span className="font-medium">70%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full">
                        <div className="h-2 bg-orange-500 rounded-full" style={{ width: '70%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Customer Segment Behavior Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Shopping Frequency</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Families:</span>
                      <span>1.8 trips/week</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Singles:</span>
                      <span>2.5 trips/week</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Retirees:</span>
                      <span>3.2 trips/week</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Average Basket Size</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Families:</span>
                      <span>$85.42</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Singles:</span>
                      <span>$38.76</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Retirees:</span>
                      <span>$42.19</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Top Categories</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Families:</span>
                      <span>Dairy, Produce, Meat</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Singles:</span>
                      <span>Prepared Foods, Beverages</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Retirees:</span>
                      <span>Produce, Health Foods</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Purchase Patterns */}
        <TabsContent value="patterns" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Cross-Purchase Correlations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <AlertTitle className="text-base">Strong Correlation: Bread & Milk</AlertTitle>
                    <AlertDescription>
                      78% of customers who purchase bread also purchase milk in the same transaction.
                    </AlertDescription>
                  </Alert>
                  
                  <Alert>
                    <AlertTitle className="text-base">Strong Correlation: Coffee & Creamer</AlertTitle>
                    <AlertDescription>
                      65% of customers who purchase coffee also purchase creamer within 3 days.
                    </AlertDescription>
                  </Alert>
                  
                  <Alert>
                    <AlertTitle className="text-base">Moderate Correlation: Chips & Soda</AlertTitle>
                    <AlertDescription>
                      52% of customers who purchase chips also purchase soda in the same transaction.
                    </AlertDescription>
                  </Alert>
                  
                  <Alert>
                    <AlertTitle className="text-base">Weak Correlation: Apples & Oranges</AlertTitle>
                    <AlertDescription>
                      Only 24% of customers who purchase apples also purchase oranges in the same visit.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Repurchase Timing Patterns</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { product: 'Milk', days: 7 },
                    { product: 'Bread', days: 5 },
                    { product: 'Eggs', days: 9 },
                    { product: 'Bananas', days: 4 },
                    { product: 'Coffee', days: 14 },
                    { product: 'Toilet Paper', days: 21 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="product" />
                    <YAxis label={{ value: 'Days Between Purchases', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Bar dataKey="days" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Seasonal Purchasing Patterns</CardTitle>
            </CardHeader>
            <CardContent className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={[
                    { month: 'Jan', seasonal: 1500, regular: 4000 },
                    { month: 'Feb', seasonal: 1800, regular: 3800 },
                    { month: 'Mar', seasonal: 2400, regular: 4100 },
                    { month: 'Apr', seasonal: 2800, regular: 3900 },
                    { month: 'May', seasonal: 3200, regular: 4200 },
                    { month: 'Jun', seasonal: 3600, regular: 4300 },
                    { month: 'Jul', seasonal: 4000, regular: 4100 },
                    { month: 'Aug', seasonal: 3800, regular: 4000 },
                    { month: 'Sep', seasonal: 3200, regular: 4200 },
                    { month: 'Oct', seasonal: 2600, regular: 4300 },
                    { month: 'Nov', seasonal: 2000, regular: 4500 },
                    { month: 'Dec', seasonal: 3000, regular: 5000 },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${value}`} />
                  <Legend />
                  <Line type="monotone" dataKey="seasonal" stroke="#ff7300" name="Seasonal Items" />
                  <Line type="monotone" dataKey="regular" stroke="#387908" name="Regular Items" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bulk Deal Analytics */}
        <TabsContent value="bulkdeals" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Bulk Deal Effectiveness</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getBulkDealData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis label={{ value: 'Conversion Rate (%)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Bar dataKey="conversion" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Minimum Purchase Incentive Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Spend $50, Save $10</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Avg. Cart Before Incentive</p>
                        <p className="text-xl font-bold">$38.75</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Avg. Cart After Incentive</p>
                        <p className="text-xl font-bold">$62.40</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Increase in Items</p>
                        <p className="text-xl font-bold">+42%</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Redemption Rate</p>
                        <p className="text-xl font-bold">63%</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Spend $100, Save $25</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Avg. Cart Before Incentive</p>
                        <p className="text-xl font-bold">$76.20</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Avg. Cart After Incentive</p>
                        <p className="text-xl font-bold">$118.35</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Increase in Items</p>
                        <p className="text-xl font-bold">+32%</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Redemption Rate</p>
                        <p className="text-xl font-bold">48%</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top Categories for Bulk Deals</CardTitle>
            </CardHeader>
            <CardContent className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { category: 'Dairy', effectiveness: 72 },
                    { category: 'Bakery', effectiveness: 68 },
                    { category: 'Meat', effectiveness: 56 },
                    { category: 'Produce', effectiveness: 48 },
                    { category: 'Beverages', effectiveness: 75 },
                    { category: 'Snacks', effectiveness: 82 },
                    { category: 'Household', effectiveness: 62 },
                    { category: 'Personal Care', effectiveness: 58 },
                  ]}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis label={{ value: 'Effectiveness Score (%)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Bar dataKey="effectiveness" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InternalAnalytics;