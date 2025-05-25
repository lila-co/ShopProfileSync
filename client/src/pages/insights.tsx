
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import BottomNavigation from '@/components/layout/BottomNavigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, MapPin, TrendingDown, TrendingUp, DollarSign, ShoppingCart } from 'lucide-react';
import { User } from '@/lib/types';

const InsightsPage: React.FC = () => {
  const { data: user } = useQuery<User>({
    queryKey: ['/api/user/profile'],
  });

  // Mock data for detailed insights - in a real app, this would come from analytics
  const shoppingTimeAnalytics = {
    averageTimePerTrip: 42, // minutes
    averageDistanceToStore: 3.2, // miles
    timeSpentByCategory: [
      { category: 'Produce', minutes: 12, percentage: 28 },
      { category: 'Dairy', minutes: 8, percentage: 19 },
      { category: 'Meat', minutes: 10, percentage: 24 },
      { category: 'Pantry Items', minutes: 7, percentage: 17 },
      { category: 'Other', minutes: 5, percentage: 12 }
    ]
  };

  const savingsOpportunities = [
    {
      category: 'Produce',
      currentSpending: 125,
      potentialSavings: 28,
      recommendations: ['Buy seasonal fruits', 'Consider frozen alternatives', 'Shop sales cycles']
    },
    {
      category: 'Meat & Poultry',
      currentSpending: 180,
      potentialSavings: 45,
      recommendations: ['Buy in bulk when on sale', 'Try store brands', 'Consider protein alternatives']
    },
    {
      category: 'Packaged Goods',
      currentSpending: 95,
      potentialSavings: 22,
      recommendations: ['Use digital coupons', 'Buy generic brands', 'Stock up during sales']
    }
  ];

  const shoppingBehaviorInsights = [
    {
      metric: 'Shopping Frequency',
      value: '2.3 times per week',
      trend: 'optimal',
      insight: 'Your shopping frequency is ideal for fresh produce while minimizing impulse purchases.'
    },
    {
      metric: 'Average Cart Size',
      value: '$67.50',
      trend: 'increasing',
      insight: 'Cart size has increased 12% this month. Consider meal planning to optimize spending.'
    },
    {
      metric: 'Store Loyalty',
      value: '73% single store',
      trend: 'stable',
      insight: 'You shop primarily at one store. Exploring other options could increase savings.'
    }
  ];

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
      <Header user={user} />
      
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 pb-20">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Shopping Insights</h1>
            <p className="text-gray-600">Detailed analysis of your shopping patterns</p>
          </div>

          {/* Shopping Time Analytics */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Clock className="h-5 w-5 mr-2 text-primary" />
                Time & Efficiency Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{shoppingTimeAnalytics.averageTimePerTrip}min</div>
                  <div className="text-sm text-gray-600">Avg. Trip Time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{shoppingTimeAnalytics.averageDistanceToStore}mi</div>
                  <div className="text-sm text-gray-600">Avg. Distance</div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium text-gray-700">Time Spent by Category</h4>
                {shoppingTimeAnalytics.timeSpentByCategory.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{item.category}</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={item.percentage} className="w-20 h-2" />
                      <span className="text-sm font-medium">{item.minutes}min</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Savings Opportunities */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <TrendingDown className="h-5 w-5 mr-2 text-green-600" />
                Savings Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {savingsOpportunities.map((opportunity, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-medium text-gray-800">{opportunity.category}</h4>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">
                        ${opportunity.potentialSavings}
                      </div>
                      <div className="text-xs text-gray-500">potential savings</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    Monthly spending: ${opportunity.currentSpending}
                  </div>
                  <div className="space-y-1">
                    {opportunity.recommendations.map((rec, recIndex) => (
                      <div key={recIndex} className="text-xs text-gray-500 flex items-center">
                        <div className="w-1 h-1 bg-primary rounded-full mr-2"></div>
                        {rec}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Shopping Behavior Insights */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <ShoppingCart className="h-5 w-5 mr-2 text-blue-600" />
                Behavior Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {shoppingBehaviorInsights.map((insight, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {insight.trend === 'optimal' && <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>}
                    {insight.trend === 'increasing' && <TrendingUp className="h-4 w-4 text-orange-500 mt-1" />}
                    {insight.trend === 'stable' && <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-gray-800">{insight.metric}</span>
                      <span className="text-primary font-semibold">{insight.value}</span>
                    </div>
                    <p className="text-sm text-gray-600">{insight.insight}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Total Savings Summary */}
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  ${savingsOpportunities.reduce((sum, opp) => sum + opp.potentialSavings, 0)}
                </div>
                <div className="text-sm text-gray-600 mb-3">Total Monthly Savings Potential</div>
                <Badge variant="secondary" className="bg-green-50 text-green-700">
                  <DollarSign className="h-3 w-3 mr-1" />
                  ${savingsOpportunities.reduce((sum, opp) => sum + opp.potentialSavings, 0) * 12}/year potential
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <BottomNavigation activeTab="home" />
    </div>
  );
};

export default InsightsPage;
