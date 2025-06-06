
import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { 
  ShoppingBag, 
  Scan, 
  Tag, 
  Newspaper,
  TrendingUp,
  Clock,
  Plus
} from 'lucide-react';

const ShoppingListPage: React.FC = () => {
  const [, navigate] = useLocation();

  const quickActions = [
    {
      title: 'Shopping Lists',
      description: 'View and manage your shopping lists',
      icon: ShoppingBag,
      href: '/dashboard',
      color: 'bg-blue-500'
    },
    {
      title: 'Scan Receipt',
      description: 'Add items by scanning receipts',
      icon: Scan,
      href: '/scan',
      color: 'bg-green-500'
    },
    {
      title: 'Deals',
      description: 'Find the best deals and savings',
      icon: Tag,
      href: '/deals',
      color: 'bg-orange-500'
    },
    {
      title: 'Weekly Circulars',
      description: 'Browse store weekly ads',
      icon: Newspaper,
      href: '/circulars',
      color: 'bg-purple-500'
    }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="text-center py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to Your Smart Shopping Hub
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Manage your shopping lists, find deals, and discover new ways to save time and money.
          </p>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickActions.map((action) => (
            <Card 
              key={action.title} 
              className="hover:shadow-lg transition-all duration-200 cursor-pointer"
              onClick={() => navigate(action.href)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-lg">
                  <div className={`p-2 rounded-lg ${action.color} text-white mr-3`}>
                    <action.icon className="h-5 w-5" />
                  </div>
                  {action.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm mb-4">{action.description}</p>
                <Button variant="outline" className="w-full">
                  Get Started
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Activity Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Your recent shopping activity will appear here</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => navigate('/dashboard')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First List
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ShoppingListPage;
