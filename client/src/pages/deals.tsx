import React, { useState } from 'react';
import Header from '@/components/layout/Header';
import BottomNavigation from '@/components/layout/BottomNavigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DealsView } from '@/components/deals/DealsView';
import { useQuery } from '@tanstack/react-query';
import { Search, Tag, TrendingDown, Star, MapPin } from 'lucide-react';

import type { User } from '@/lib/types';

const DealsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const { data: user } = useQuery<User>({
    queryKey: ['/api/user/profile'],
  });

  const { data: dealsSummary } = useQuery({
    queryKey: ['/api/deals/summary'],
  });

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
      <Header user={user} />

      <main className="flex-1 overflow-y-auto">
        {/* Hero Section */}
        <div className="px-4 pt-6 pb-4">
          <h1 className="text-2xl font-bold text-foreground mb-2">Deals & Offers</h1>
          <p className="text-sm text-gray-600">Find the best prices near you</p>
        </div>

        {/* Search Bar */}
        <div className="px-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search for products or brands..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 bg-gray-50 border-0 text-base"
            />
          </div>
        </div>

        {/* Deals Summary Cards */}
        {dealsSummary && (
          <div className="px-4 mb-6">
            <div className="grid grid-cols-2 gap-3">
              <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="h-4 w-4 text-green-600" />
                    <span className="text-xs font-medium text-green-700">Best Savings</span>
                  </div>
                  <div className="text-xl font-bold text-green-800">
                    {dealsSummary.maxSavings}%
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    Off {dealsSummary.topCategory}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-medium text-blue-700">Active Deals</span>
                  </div>
                  <div className="text-xl font-bold text-blue-800">
                    {dealsSummary.totalDeals}
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    {dealsSummary.retailerCount} stores
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Quick Filters */}
        <div className="px-4 mb-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <Badge 
              variant={activeFilter === 'featured' ? "default" : "outline"} 
              className={`whitespace-nowrap px-3 py-2 cursor-pointer transition-colors ${
                activeFilter === 'featured' 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => setActiveFilter(activeFilter === 'featured' ? null : 'featured')}
            >
              <Star className="h-3 w-3 mr-1" />
              Featured
            </Badge>
            <Badge 
              variant={activeFilter === 'nearby' ? "default" : "outline"} 
              className={`whitespace-nowrap px-3 py-2 cursor-pointer transition-colors ${
                activeFilter === 'nearby' 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => setActiveFilter(activeFilter === 'nearby' ? null : 'nearby')}
            >
              <MapPin className="h-3 w-3 mr-1" />
              Nearby
            </Badge>
            <Badge 
              variant={activeFilter === 'Groceries' ? "default" : "outline"} 
              className={`whitespace-nowrap px-3 py-2 cursor-pointer transition-colors ${
                activeFilter === 'Groceries' 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => setActiveFilter(activeFilter === 'Groceries' ? null : 'Groceries')}
            >
              Groceries
            </Badge>
            <Badge 
              variant={activeFilter === 'Household' ? "default" : "outline"} 
              className={`whitespace-nowrap px-3 py-2 cursor-pointer transition-colors ${
                activeFilter === 'Household' 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => setActiveFilter(activeFilter === 'Household' ? null : 'Household')}
            >
              Household
            </Badge>
            <Badge 
              variant={activeFilter === 'Personal Care' ? "default" : "outline"} 
              className={`whitespace-nowrap px-3 py-2 cursor-pointer transition-colors ${
                activeFilter === 'Personal Care' 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => setActiveFilter(activeFilter === 'Personal Care' ? null : 'Personal Care')}
            >
              Personal Care
            </Badge>
          </div>
        </div>

        {/* Deals Content */}
        <div className="flex-1">
          <DealsView searchQuery={searchQuery} activeFilter={activeFilter} />
        </div>
      </main>

      <BottomNavigation activeTab="deals" />
    </div>
  );
};

export default DealsPage;