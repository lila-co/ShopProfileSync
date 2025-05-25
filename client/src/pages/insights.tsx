import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import BottomNavigation from '@/components/layout/BottomNavigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, DollarSign, ShoppingCart, Calendar } from 'lucide-react';
import { User } from '@/lib/types';

const InsightsPage: React.FC = () => {
  const { data: user } = useQuery<User>({
    queryKey: ['/api/user/profile'],
  });

  const { data: topItems } = useQuery({
    queryKey: ['/api/insights/top-items'],
  });

  const { data: monthlySpending } = useQuery({
    queryKey: ['/api/insights/monthly-spending'],
  });

  const { data: monthlySavings } = useQuery({
    queryKey: ['/api/insights/monthly-savings'],
  });

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
      <Header user={user} />

      <main className="flex-1 overflow-y-auto p-4 pb-20">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Your Shopping Insights</h1>
          <p className="text-gray-600">Detailed analysis of your shopping patterns</p>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-green-600" />
                Monthly Spending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-800">
                ${monthlySpending?.totalSpent ? (monthlySpending.totalSpent / 100).toFixed(2) : '0.00'}
              </div>
              <p className="text-sm text-gray-500">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
                Monthly Savings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${monthlySavings?.totalSaved ? (monthlySavings.totalSaved / 100).toFixed(2) : '0.00'}
              </div>
              <p className="text-sm text-gray-500">Saved this month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <ShoppingCart className="h-5 w-5 mr-2 text-purple-600" />
                Top Purchased Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topItems && topItems.length > 0 ? (
                <div className="space-y-2">
                  {topItems.slice(0, 5).map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm font-medium">{item.productName}</span>
                      <span className="text-sm text-gray-500">{item.count} times</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No purchase data available</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <BottomNavigation activeTab="home" />
    </div>
  );
};

export default InsightsPage;