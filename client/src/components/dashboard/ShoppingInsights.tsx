import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TrendingUp, DollarSign, ShoppingCart, MapPin, Users, Target, Calendar, Package, Plus, BarChart3, Clock } from 'lucide-react';
import ActionCard from '@/components/dashboard/ActionCard';
import ReceiptScanner from '@/components/receipt/ReceiptScanner';
import SafeComponent from '@/components/SafeComponent';
import { useErrorHandler } from '@/hooks/useErrorHandler';

const ShoppingInsights: React.FC = () => {
  const [data, setData] = useState(null);
  const [role, setRole] = useState('');
  const [showReceiptScanner, setShowReceiptScanner] = useState(false);

  const { data: topItems, isLoading: loadingTopItems } = useQuery<PurchasePattern[]>({
    queryKey: ['/api/insights/top-items'],
  });

  const { data: monthlyData, isLoading: loadingMonthlyData } = useQuery<MonthlySpending[]>({
    queryKey: ['/api/insights/monthly-spending'],
  });

  const { data: monthlySavings } = useQuery<number>({
    queryKey: ['/api/insights/monthly-savings'],
  });

  const { data: areaInsights } = useQuery({
    queryKey: ['/api/insights/area-insights'],
  });

  const { data: demographicInsights } = useQuery({
    queryKey: ['/api/insights/demographic-insights'],
  });

  if (showReceiptScanner) {
    return <ReceiptScanner />;
  }

  const renderTopItems = () => {
    if (loadingTopItems) {
      return Array(5).fill(0).map((_, i) => (
        <div key={i} className="flex items-center py-2 gap-3">
          <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse" />
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4 mb-2" />
            <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
          </div>
        </div>
      ));
    }

    return (topItems || []).slice(0, 5).map((item, index) => (
      <div key={index} className="flex items-center py-3 gap-3 border-b border-gray-100 last:border-b-0">
        <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center">
          <ShoppingCart className="h-5 w-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <span className="font-medium text-sm">{item.productName}</span>
            <Badge variant="secondary" className="text-xs">{item.frequency}x</Badge>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-gray-500">Total spent: ${(item.totalSpent / 100).toFixed(2)}</span>
            <span className="text-xs text-green-600">Avg: ${(item.totalSpent / item.frequency / 100).toFixed(2)}</span>
          </div>
        </div>
      </div>
    ));
  };

  const renderMonthlyData = () => {
    if (loadingMonthlyData) {
      return (
        <div className="h-40 flex items-end justify-between">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="relative w-8">
                <div className="absolute bottom-0 left-0 w-3 bg-gray-200 rounded-sm animate-pulse" style={{ height: `${Math.random() * 100}px` }}></div>
                <div className="absolute bottom-0 right-0 w-3 bg-gray-200 rounded-sm animate-pulse" style={{ height: `${Math.random() * 100}px` }}></div>
              </div>
              <span className="text-xs text-gray-500 mt-1">-</span>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="h-40 flex items-end justify-between">
        {(monthlyData || []).map((month, index) => {
          const currentYearHeight = month.currentYear;
          const previousYearHeight = month.previousYear;

          const maxValue = Math.max(
            ...((monthlyData || []).flatMap(m => [m.currentYear, m.previousYear]))
          );

          const currentYearScaled = (currentYearHeight / maxValue) * 100;
          const previousYearScaled = (previousYearHeight / maxValue) * 100;

          return (
            <div key={index} className="flex flex-col items-center">
              <div className="relative w-8">
                <div 
                  className="absolute bottom-0 left-0 w-3 bg-blue-500 rounded-sm" 
                  style={{ height: `${currentYearScaled}px` }}
                ></div>
                <div 
                  className="absolute bottom-0 right-0 w-3 bg-gray-300 rounded-sm" 
                  style={{ height: `${previousYearScaled}px` }}
                ></div>
              </div>
              <span className="text-xs text-gray-500 mt-1">{month.month}</span>
            </div>
          );
        })}
      </div>
    );
  };

  // Mock data for additional insights
  const shoppingPatterns = {
    averageTripsPerWeek: 2.3,
    averageSpendPerTrip: 67.40,
    preferredShoppingDay: 'Saturday',
    preferredShoppingTime: 'Morning (9-11 AM)',
    mostFrequentStore: 'Walmart',
    budgetAdherence: 92,
    impulsePurchases: 18
  };

  const categorySpending = [
    { category: 'Groceries', amount: 284.50, percentage: 42, change: '+5%' },
    { category: 'Household', amount: 127.80, percentage: 19, change: '-2%' },
    { category: 'Personal Care', amount: 95.60, percentage: 14, change: '+8%' },
    { category: 'Beverages', amount: 89.20, percentage: 13, change: '+1%' },
    { category: 'Snacks', amount: 76.90, percentage: 12, change: '+12%' }
  ];

  return (
    <div className="space-y-4">
      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <Plus className="w-5 h-5 mr-2 text-primary" />
            Quick Actions
          </CardTitle>
          <CardDescription>Add data to improve your insights</CardDescription>
        </CardHeader>
        <CardContent>
          <ActionCard 
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9.5 9.5 14.5 14.5"/>
                <path d="M14.5 9.5 9.5 14.5"/>
                <rect width="16" height="16" x="4" y="4" rx="2"/>
                <path d="M4 15h16"/>
                <path d="M15 4v6"/>
                <path d="M9 4v2"/>
              </svg>
            }
            title="Add Receipt"
            subtitle="Scan or upload to get better insights"
            onClick={() => setShowReceiptScanner(true)}
            iconBgColor="bg-primary/10"
          />
        </CardContent>
      </Card>

      {/* Most Purchased Items */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <ShoppingCart className="w-5 h-5 mr-2 text-blue-600" />
            Most Purchased Items
          </CardTitle>
          <CardDescription>Your top purchases in the last 3 months</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {renderTopItems()}
        </CardContent>
      </Card>

      {/* Category Spending Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-purple-600" />
            Category Spending
          </CardTitle>
          <CardDescription>How you spend across different categories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {categorySpending.map((category, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">{category.category}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">${category.amount}</span>
                      <Badge variant={category.change.startsWith('+') ? 'default' : 'secondary'} className="text-xs">
                        {category.change}
                      </Badge>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full" 
                      style={{ width: `${category.percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Shopping Behavior Patterns */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <Clock className="w-5 h-5 mr-2 text-orange-600" />
            Shopping Patterns
          </CardTitle>
          <CardDescription>Your shopping habits and preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-3">
              <div>
                <p className="font-medium text-gray-700">Preferred Day</p>
                <p className="text-gray-600">{shoppingPatterns.preferredShoppingDay}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Preferred Time</p>
                <p className="text-gray-600">{shoppingPatterns.preferredShoppingTime}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Favorite Store</p>
                <p className="text-gray-600">{shoppingPatterns.mostFrequentStore}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <p className="font-medium text-gray-700">Budget Adherence</p>
                <div className="flex items-center">
                  <p className="text-gray-600">{shoppingPatterns.budgetAdherence}%</p>
                  <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${shoppingPatterns.budgetAdherence}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              <div>
                <p className="font-medium text-gray-700">Impulse Purchases</p>
                <p className="text-gray-600">{shoppingPatterns.impulsePurchases}% of trips</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Spending Trend */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
            Monthly Spending Trend
          </CardTitle>
          <CardDescription>Compare your spending patterns year over year</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-3">
            <div className="flex items-center justify-center gap-4 text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-blue-500 mr-1"></div>
                <span className="text-gray-600">2024</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-gray-300 mr-1"></div>
                <span className="text-gray-600">2023</span>
              </div>
            </div>
          </div>
          {renderMonthlyData()}
        </CardContent>
      </Card>

      {/* Area Insights */}
      {areaInsights && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-purple-600" />
              Local Area Trends
            </CardTitle>
            <CardDescription>What's trending in your area</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-purple-50 p-3 rounded-lg">
              <h4 className="font-medium text-purple-900 mb-1">{areaInsights.trendingCategory}</h4>
              <p className="text-sm text-purple-700 mb-2">{areaInsights.trendDescription}</p>
              <p className="text-xs text-purple-600">+{areaInsights.growthPercentage}% growth this month</p>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
              <div>
                <p className="font-medium text-gray-700">Popular Store</p>
                <p className="text-gray-600">{areaInsights.popularStore}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Best Deal Day</p>
                <p className="text-gray-600">{areaInsights.bestDealDay}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Demographic Trends */}
      {demographicInsights && demographicInsights.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Users className="w-5 h-5 mr-2 text-green-600" />
              Demographic Trends
            </CardTitle>
            <CardDescription>What people like you are buying</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {demographicInsights.slice(0, 2).map((insight: any, index: number) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-800 text-sm">{insight.trend}</h4>
                    <Badge variant="outline" className="text-xs">{insight.confidence}%</Badge>
                  </div>
                  <p className="text-sm text-gray-600">{insight.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ShoppingInsights;