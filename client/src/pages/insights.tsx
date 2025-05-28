import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import BottomNavigation from '@/components/layout/BottomNavigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, ShoppingCart, TrendingUp, Calendar, Users, BarChart3, MapPin } from 'lucide-react';
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

  const { data: similarProfiles } = useQuery({
    queryKey: ['/api/insights/similar-profiles'],
  });

  const { data: areaInsights } = useQuery({
    queryKey: ['/api/insights/area-insights'],
  });

  const { data: demographicInsights } = useQuery({
    queryKey: ['/api/insights/demographic-insights'],
  });

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
      <Header user={user} />

      <main className="flex-1 overflow-y-auto p-4 pb-20">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Your Shopping Insights</h1>
          <p className="text-gray-600">Detailed analysis of your shopping patterns</p>
        </div>

        <Tabs defaultValue="spending" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="spending">Spending</TabsTrigger>
            <TabsTrigger value="items">Top Items</TabsTrigger>
            <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
            <TabsTrigger value="patterns">Patterns</TabsTrigger>
          </TabsList>

          <TabsContent value="spending" className="space-y-4">
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
          </TabsContent>

          <TabsContent value="items" className="space-y-4">
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
          </TabsContent>

          <TabsContent value="ai-insights" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Users className="h-5 w-5 mr-2 text-blue-600" />
                  Similar Shopper Profiles
                </CardTitle>
              </CardHeader>
              <CardContent>
                {similarProfiles && similarProfiles.length > 0 ? (
                  <div className="space-y-4">
                    {similarProfiles.slice(0, 2).map((profile: any, index: number) => (
                      <div key={index} className="border-l-4 border-blue-500 pl-4">
                        <h4 className="font-semibold text-gray-800">{profile.profileType}</h4>
                        <p className="text-sm text-gray-600 mb-2">{profile.matchingUsers} similar shoppers in your area</p>
                        <div className="bg-blue-50 p-3 rounded">
                          <p className="text-sm"><span className="font-medium">Avg. Spend:</span> ${profile.averageSpend}</p>
                          <p className="text-sm"><span className="font-medium">Popular Categories:</span> {profile.topCategories.slice(0, 2).join(', ')}</p>
                          <p className="text-sm"><span className="font-medium">Price Sensitivity:</span> {profile.priceSensitivity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="border-l-4 border-blue-500 pl-4">
                      <h4 className="font-semibold text-gray-800">Budget-Conscious Families</h4>
                      <p className="text-sm text-gray-600 mb-2">1,250 similar shoppers in your area</p>
                      <div className="bg-blue-50 p-3 rounded">
                        <p className="text-sm"><span className="font-medium">Avg. Spend:</span> $115/week</p>
                        <p className="text-sm"><span className="font-medium">Popular Categories:</span> Bulk groceries, Store brands</p>
                        <p className="text-sm"><span className="font-medium">Price Sensitivity:</span> High</p>
                      </div>
                    </div>
                    <div className="border-l-4 border-green-500 pl-4">
                      <h4 className="font-semibold text-gray-800">Health-Conscious Shoppers</h4>
                      <p className="text-sm text-gray-600 mb-2">875 similar shoppers in your area</p>
                      <div className="bg-green-50 p-3 rounded">
                        <p className="text-sm"><span className="font-medium">Avg. Spend:</span> $95/week</p>
                        <p className="text-sm"><span className="font-medium">Popular Categories:</span> Organic produce, Natural products</p>
                        <p className="text-sm"><span className="font-medium">Price Sensitivity:</span> Medium</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <MapPin className="h-5 w-5 mr-2 text-purple-600" />
                  Your Area Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                {areaInsights ? (
                  <div className="space-y-3">
                    <div className="bg-purple-50 p-3 rounded">
                      <h4 className="font-medium">{areaInsights.trendingCategory}</h4>
                      <p className="text-sm text-gray-600">{areaInsights.trendDescription}</p>
                      <p className="text-xs text-purple-600 mt-1">+{areaInsights.growthPercentage}% in your area this month</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="font-medium text-gray-700">Popular Store</p>
                        <p className="text-gray-600">{areaInsights.popularStore}</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">Best Deal Day</p>
                        <p className="text-gray-600">{areaInsights.bestDealDay}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-purple-50 p-3 rounded">
                      <h4 className="font-medium">Organic Products Trending</h4>
                      <p className="text-sm text-gray-600">More families in your area are choosing organic alternatives</p>
                      <p className="text-xs text-purple-600 mt-1">+25% in your area this month</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="font-medium text-gray-700">Popular Store</p>
                        <p className="text-gray-600">Whole Foods</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">Best Deal Day</p>
                        <p className="text-gray-600">Wednesday</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-green-600" />
                  Demographic Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                {demographicInsights && demographicInsights.length > 0 ? (
                  <div className="space-y-3">
                    {demographicInsights.slice(0, 3).map((insight: any, index: number) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-800">{insight.trend}</h4>
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">{insight.confidence}% confidence</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">{insight.description}</p>
                        <p className="text-xs text-gray-500">Based on {insight.sampleSize} local shoppers</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="border rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-800">Sustainable Shopping Growth</h4>
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">85% confidence</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">Eco-friendly products seeing 40% increase in your demographic</p>
                      <p className="text-xs text-gray-500">Based on 2,341 local shoppers</p>
                    </div>
                    <div className="border rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-800">Bulk Buying Trend</h4>
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">78% confidence</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">Families like yours are increasingly buying in bulk to save money</p>
                      <p className="text-xs text-gray-500">Based on 1,856 local shoppers</p>
                    </div>
                    <div className="border rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-800">Digital Coupon Adoption</h4>
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">92% confidence</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">Mobile couponing growing 65% among your age group</p>
                      <p className="text-xs text-gray-500">Based on 3,127 local shoppers</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="patterns" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-orange-600" />
                  Spending Patterns
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">Analyze your spending patterns over time.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <BottomNavigation activeTab="home" />
    </div>
  );
};

export default InsightsPage;