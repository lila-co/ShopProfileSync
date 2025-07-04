import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import Header from './components/layout/Header';
import BottomNavigation from './components/layout/BottomNavigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './components/ui/card';
import { Button } from './components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Badge } from './components/ui/badge';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { Separator } from './components/ui/separator';
import { 
  DollarSign, 
  TrendingUp, 
  ShoppingBag, 
  Users, 
  Calendar, 
  Tag, 
  Filter, 
  DownloadCloud, 
  ArrowRight, 
  ExternalLink, 
  Settings, 
  FileText,
  ChevronLeft
} from 'lucide-react';
import { getCompanyLogo } from './lib/imageUtils';

// Demo data for the dashboard
const revenueData = [
  { month: 'Jan', revenue: 2450, orders: 128, newUsers: 42 },
  { month: 'Feb', revenue: 3250, orders: 145, newUsers: 58 },
  { month: 'Mar', revenue: 5120, orders: 210, newUsers: 86 },
  { month: 'Apr', revenue: 4780, orders: 197, newUsers: 72 },
  { month: 'May', revenue: 5840, orders: 245, newUsers: 93 },
  { month: 'Jun', revenue: 7250, orders: 312, newUsers: 124 },
];

const retailerPerformance = [
  { name: 'Walmart', revenue: 9450, orders: 412, commission: 756, conversionRate: 8.2 },
  { name: 'Target', revenue: 7820, orders: 287, commission: 625, conversionRate: 7.8 },
  { name: 'Kroger', revenue: 4250, orders: 164, commission: 340, conversionRate: 6.5 },
  { name: 'Costco', revenue: 11250, orders: 146, commission: 900, conversionRate: 9.3 },
  { name: 'Amazon Fresh', revenue: 5840, orders: 210, commission: 467, conversionRate: 7.1 },
];

const categoryPerformance = [
  { name: 'Groceries', value: 42 },
  { name: 'Household', value: 28 },
  { name: 'Electronics', value: 15 },
  { name: 'Health & Beauty', value: 10 },
  { name: 'Other', value: 5 },
];

const COLORS = ['#4A7CFA', '#36D39A', '#F9B949', '#9747FF', '#F24C4C'];

const AffiliateDashboard: React.FC = () => {
  const [, navigate] = useLocation();
  const [dateRange, setDateRange] = useState('last30days');
  const [retailerFilter, setRetailerFilter] = useState('all');

  // Get retailer data from API
  const { data: retailers } = useQuery({
    queryKey: ['/api/retailers'],
  });

  // Calculate summary metrics
  const totalRevenue = revenueData.reduce((sum, item) => sum + item.revenue, 0);
  const totalOrders = revenueData.reduce((sum, item) => sum + item.orders, 0);
  const totalCommission = retailerPerformance.reduce((sum, item) => sum + item.commission, 0);
  const averageConversion = (retailerPerformance.reduce((sum, item) => sum + item.conversionRate, 0) / retailerPerformance.length).toFixed(1);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  // This would be a real query in production
  const { isLoading: transactionsLoading } = useQuery({
    queryKey: ['/api/affiliate/transactions', { dateRange, retailerFilter }],
    enabled: false,
  });

  return (
    <div className="max-w-7xl mx-auto bg-white min-h-screen flex flex-col">
      <Header title="Affiliate Dashboard" />

      <main className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="mb-2"
              onClick={() => navigate('/admin-settings')}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Admin
            </Button>
            <h1 className="text-2xl font-bold">Affiliate Revenue Dashboard</h1>
            <p className="text-gray-500">Track and analyze your affiliate marketing performance</p>
          </div>

          <div className="flex items-center space-x-3">
            <Select defaultValue={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="last7days">Last 7 Days</SelectItem>
                <SelectItem value="last30days">Last 30 Days</SelectItem>
                <SelectItem value="thisMonth">This Month</SelectItem>
                <SelectItem value="lastMonth">Last Month</SelectItem>
                <SelectItem value="thisYear">This Year</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" className="gap-1">
              <FileText className="h-4 w-4" />
              Export
            </Button>

            <Button variant="outline" size="sm" className="gap-1">
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                  <h3 className="text-2xl font-bold mt-1">{formatCurrency(totalRevenue)}</h3>
                  <div className="flex items-center mt-1 text-green-600">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    <span className="text-xs font-medium">+12.5% from last period</span>
                  </div>
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Commissions</p>
                  <h3 className="text-2xl font-bold mt-1">{formatCurrency(totalCommission)}</h3>
                  <div className="flex items-center mt-1 text-green-600">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    <span className="text-xs font-medium">+8.3% from last period</span>
                  </div>
                </div>
                <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center">
                  <Tag className="h-5 w-5 text-secondary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Orders</p>
                  <h3 className="text-2xl font-bold mt-1">{totalOrders}</h3>
                  <div className="flex items-center mt-1 text-green-600">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    <span className="text-xs font-medium">+15.2% from last period</span>
                  </div>
                </div>
                <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
                  <ShoppingBag className="h-5 w-5 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Avg. Conversion</p>
                  <h3 className="text-2xl font-bold mt-1">{averageConversion}%</h3>
                  <div className="flex items-center mt-1 text-green-600">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    <span className="text-xs font-medium">+2.1% from last period</span>
                  </div>
                </div>
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Monthly Revenue Trend */}
          <Card className="col-span-1 lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle>Monthly Revenue Trend</CardTitle>
              <CardDescription>
                Track your revenue, orders, and user growth by month
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip 
                      formatter={(value: any, name: string) => {
                        if (name === 'revenue') return formatCurrency(value);
                        return value;
                      }} 
                    />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="revenue" name="Revenue ($)" stroke="#4A7CFA" activeDot={{ r: 8 }} />
                    <Line yAxisId="right" type="monotone" dataKey="orders" name="Orders" stroke="#36D39A" />
                    <Line yAxisId="right" type="monotone" dataKey="newUsers" name="New Users" stroke="#F9B949" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Category Breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Product Categories</CardTitle>
              <CardDescription>
                Revenue share by product category
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="h-80 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryPerformance}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryPerformance.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => `${value}%`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Retailer Performance Table */}
        <h2 className="text-xl font-bold mt-8 mb-4">Retailer Performance</h2>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Retailer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conversion Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {retailerPerformance.map((retailer) => {
                    const logoUrl = getCompanyLogo(retailer.name);
                    return (
                      <tr key={retailer.name} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {logoUrl ? (
                              <img src={logoUrl} alt={retailer.name} className="h-8 w-8 object-contain mr-3" />
                            ) : (
                              <div className="h-8 w-8 rounded-full flex items-center justify-center bg-gray-200 mr-3">
                                {retailer.name.charAt(0)}
                              </div>
                            )}
                            <div className="font-medium text-gray-900">{retailer.name}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-700">{retailer.orders}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-700">{formatCurrency(retailer.revenue)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-700">{formatCurrency(retailer.commission)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2 max-w-[100px]">
                              <div 
                                className="bg-primary h-2.5 rounded-full" 
                                style={{ width: `${retailer.conversionRate * 10}%` }}
                              ></div>
                            </div>
                            <span className="text-gray-700">{retailer.conversionRate}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Button variant="ghost" size="sm" className="gap-1 text-primary">
                            <ExternalLink className="h-4 w-4" />
                            Details
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <h2 className="text-xl font-bold mt-8 mb-4">Recent Transactions</h2>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Affiliate Transactions</CardTitle>
                <CardDescription>
                  Most recent affiliate-linked purchases
                </CardDescription>
              </div>
              <div className="flex space-x-2">
                <Select defaultValue={retailerFilter} onValueChange={setRetailerFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Retailers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Retailers</SelectItem>
                    {retailers?.map((retailer: any) => (
                      <SelectItem key={retailer.id} value={retailer.id.toString()}>
                        {retailer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="gap-1">
                  <Filter className="h-4 w-4" />
                  Filter
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <div className="flex justify-center items-center h-40">
                <div className="h-8 w-8 border-4 border-t-primary border-gray-300 rounded-full animate-spin"></div>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Retailer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[...Array(5)].map((_, index) => {
                    const retailer = retailerPerformance[index % retailerPerformance.length];
                    const orderAmount = Math.floor(Math.random() * 200) + 50;
                    const commission = (orderAmount * (retailer.conversionRate / 100)).toFixed(2);
                    const status = index % 4 === 0 ? 'pending' : 'paid';

                    return (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-medium">#ORD-{23452 + index}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                          {new Date(Date.now() - index * 86400000).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                          user{1000 + index}@example.com
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            {getCompanyLogo(retailer.name) ? (
                              <img 
                                src={getCompanyLogo(retailer.name)} 
                                alt={retailer.name} 
                                className="h-5 w-5 object-contain mr-2"
                              />
                            ) : (
                              <div className="h-5 w-5 rounded-full flex items-center justify-center bg-gray-200 mr-2">
                                <span className="text-xs">{retailer.name.charAt(0)}</span>
                              </div>
                            )}
                            {retailer.name}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                          {formatCurrency(orderAmount)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-green-600 font-medium">
                          {formatCurrency(Number(commission))}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge 
                            variant="outline" 
                            className={status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}
                          >
                            {status === 'paid' ? 'Paid' : 'Pending'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="text-sm text-gray-500">Showing 5 of 243 transactions</div>
            <Button variant="outline" size="sm">
              View All Transactions
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardFooter>
        </Card>

        {/* Settings Section */}
        <h2 className="text-xl font-bold mt-8 mb-4">Affiliate Program Settings</h2>
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-medium text-lg mb-4">Affiliate Links</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="default-commission">Default Commission Rate (%)</Label>
                    <Input id="default-commission" defaultValue="8.0" type="number" step="0.1" />
                    <p className="text-xs text-gray-500">
                      Default commission percentage when specific retailer rates are not available
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="affiliate-prefix">SmartCart Affiliate Prefix</Label>
                    <Input id="affiliate-prefix" defaultValue="smartcart_aff" />
                    <p className="text-xs text-gray-500">
                      Prefix used in affiliate tracking codes for attribution
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-lg mb-4">Payout Settings</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="payout-threshold">Payout Threshold</Label>
                    <Input id="payout-threshold" defaultValue="100.00" type="number" step="10" />
                    <p className="text-xs text-gray-500">
                      Minimum amount required before commissions are paid out
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="payout-method">Default Payout Method</Label>
                    <Select defaultValue="bank">
                      <SelectTrigger id="payout-method">
                        <SelectValue placeholder="Select Method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bank">Direct Bank Transfer</SelectItem>
                        <SelectItem value="paypal">PayPal</SelectItem>
                        <SelectItem value="stripe">Stripe</SelectItem>
                        <SelectItem value="check">Check</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            <div>
              <h3 className="font-medium text-lg mb-4">Retailer-Specific Commission Rates</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-500 px-2">
                  <div className="col-span-4">Retailer</div>
                  <div className="col-span-2">Base Rate (%)</div>
                  <div className="col-span-2">Premium Rate (%)</div>
                  <div className="col-span-2">Cookie Duration</div>
                  <div className="col-span-2">Status</div>
                </div>

                {retailerPerformance.map((retailer) => (
                  <div key={retailer.name} className="grid grid-cols-12 gap-4 items-center px-2 py-3 border-b last:border-0">
                    <div className="col-span-4 flex items-center">
                      {getCompanyLogo(retailer.name) ? (
                        <img 
                          src={getCompanyLogo(retailer.name)} 
                          alt={retailer.name} 
                          className="h-6 w-6 object-contain mr-2" 
                        />
                      ) : (
                        <div className="h-6 w-6 rounded-full flex items-center justify-center bg-gray-200 mr-2">
                          <span className="text-xs">{retailer.name.charAt(0)}</span>
                        </div>
                      )}
                      {retailer.name}
                    </div>
                    <div className="col-span-2">
                      <Input 
                        value={(retailer.conversionRate - 2).toFixed(1)} 
                        type="number" 
                        step="0.1"
                        className="h-8"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input 
                        value={(retailer.conversionRate + 1).toFixed(1)} 
                        type="number" 
                        step="0.1"
                        className="h-8"
                      />
                    </div>
                    <div className="col-span-2">
                      <Select defaultValue="30">
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 day</SelectItem>
                          <SelectItem value="7">7 days</SelectItem>
                          <SelectItem value="14">14 days</SelectItem>
                          <SelectItem value="30">30 days</SelectItem>
                          <SelectItem value="60">60 days</SelectItem>
                          <SelectItem value="90">90 days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Active
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button variant="outline" className="mr-2">Cancel</Button>
              <Button>Save Settings</Button>
            </div>
          </CardContent>
        </Card>
      </main>

      <BottomNavigation activeTab="profile" />
    </div>
  );
};

export default AffiliateDashboard;