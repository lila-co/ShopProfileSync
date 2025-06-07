import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import BottomNavigation from '@/components/layout/BottomNavigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, PieChart, TrendingUp, Users, ShoppingCart, DollarSign } from 'lucide-react';
import { User } from '@/lib/types';

const InternalAnalyticsPage: React.FC = () => {
  const { data: user } = useQuery<User>({
    queryKey: ['/api/user/profile'],
  });

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
      <Header user={user} title="Internal Analytics" />

      <main className="flex-1 overflow-y-auto p-4 pb-20">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Business Intelligence</h1>
          <p className="text-gray-600">Comprehensive analytics and market insights</p>
        </div>

        <div className="space-y-4">
          {/* User Analytics */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <Users className="w-5 h-5 mr-2 text-blue-600" />
                User Analytics
              </CardTitle>
              <CardDescription>Active user metrics and engagement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">1,247</div>
                  <div className="text-sm text-gray-600">Active Users</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">89%</div>
                  <div className="text-sm text-gray-600">Retention Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Purchase Analytics */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <ShoppingCart className="w-5 h-5 mr-2 text-green-600" />
                Purchase Analytics
              </CardTitle>
              <CardDescription>Shopping patterns and trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">$127</div>
                  <div className="text-sm text-gray-600">Avg Order Value</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">2.3x</div>
                  <div className="text-sm text-gray-600">Weekly Frequency</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Analytics */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-yellow-600" />
                Revenue Metrics
              </CardTitle>
              <CardDescription>Financial performance indicators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Monthly Revenue</span>
                  <span className="text-lg font-semibold text-green-600">$45,230</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Growth Rate</span>
                  <span className="text-lg font-semibold text-blue-600">+23%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Market Insights */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-red-600" />
                Market Insights
              </CardTitle>
              <CardDescription>AI-powered demographic analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="border rounded-lg p-3">
                  <h4 className="font-medium text-gray-800 text-sm mb-1">Trending Categories</h4>
                  <p className="text-xs text-gray-600">Organic products +40% growth</p>
                </div>
                <div className="border rounded-lg p-3">
                  <h4 className="font-medium text-gray-800 text-sm mb-1">Peak Shopping Times</h4>
                  <p className="text-xs text-gray-600">Saturday mornings, Wednesday evenings</p>
                </div>
                <div className="border rounded-lg p-3">
                  <h4 className="font-medium text-gray-800 text-sm mb-1">Customer Segments</h4>
                  <p className="text-xs text-gray-600">Budget-conscious families: 45%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Visualization */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <BarChart className="w-5 h-5 mr-2 text-indigo-600" />
                Data Visualization
              </CardTitle>
              <CardDescription>Interactive charts and reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">Purchase Trends</span>
                  <BarChart className="w-4 h-4 text-gray-600" />
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">Customer Segments</span>
                  <PieChart className="w-4 h-4 text-gray-600" />
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">Revenue Growth</span>
                  <TrendingUp className="w-4 h-4 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <BottomNavigation activeTab="profile" />
    </div>
  );
};

export default InternalAnalyticsPage;