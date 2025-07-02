import React, { useState, useEffect } from 'react';
import AuthenticatedHeader from '@/components/layout/AuthenticatedHeader';
import BottomNavigation from '@/components/layout/BottomNavigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DealsView } from '@/components/deals/DealsView';
import { useQuery } from '@tanstack/react-query';
import { Search, TrendingDown, Tag } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import type { User } from '@/lib/types';

const DealsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [selectedRetailerId, setSelectedRetailerId] = useState<number | null>(null);

  // Check for retailer query parameter on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const retailerId = urlParams.get('retailer');
    if (retailerId) {
      setSelectedRetailerId(parseInt(retailerId, 10));
    }
  }, []);

  const { data: user } = useQuery<User>({
    queryKey: ['/api/user/profile'],
  });

  const { data: deals = [], isLoading: dealsLoading } = useQuery({
    queryKey: ['/api/deals'],
  });

  const { data: dealsSummary } = useQuery({
    queryKey: ['/api/deals/summary'],
  });

  const { data: retailers = [] } = useQuery({
    queryKey: ['/api/retailers'],
  });

  return (
    <div className="max-w-md mx-auto frosted-bg min-h-screen flex flex-col">
      <AuthenticatedHeader user={user} />

      <main className="flex-1 overflow-y-auto">
        {/* Hero Section */}
        <div className="px-4 pt-6 pb-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Deals & Offers</h1>
          <p className="text-sm text-gray-600">Find the best prices at your favorite stores</p>
        </div>

        {/* Search Bar */}
        <div className="px-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search for products or brands..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 glass-input border-0 text-base"
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

        {/* Main Content Tabs */}
        <div className="px-4 mb-4">
            {/* Store Filter */}
            <div className="mb-4">
            <Select 
                value={selectedRetailerId ? selectedRetailerId.toString() : "all"} 
                onValueChange={(value) => {
                if (value === "all") {
                    setSelectedRetailerId(null);
                    // Remove retailer query parameter from URL
                    const url = new URL(window.location.href);
                    url.searchParams.delete('retailer');
                    window.history.replaceState({}, '', url.toString());
                } else {
                    setSelectedRetailerId(parseInt(value));
                }
                }}
            >
                <SelectTrigger className="h-10 glass-input border-0">
                <SelectValue placeholder="All Stores" />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="all">All Stores</SelectItem>
                {retailers?.map((retailer) => (
                    <SelectItem key={retailer.id} value={retailer.id.toString()}>
                    {retailer.name}
                    </SelectItem>
                ))}
                </SelectContent>
            </Select>
            </div>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All Deals</TabsTrigger>
              <TabsTrigger value="featured">Featured</TabsTrigger>
              <TabsTrigger value="nearby">Nearby</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              <DealsView 
                searchQuery={searchQuery} 
                activeFilter={null}
                retailerId={selectedRetailerId}
              />
            </TabsContent>

            <TabsContent value="featured" className="mt-4">
              <DealsView 
                searchQuery={searchQuery} 
                activeFilter="featured"
                retailerId={selectedRetailerId}
              />
            </TabsContent>

            <TabsContent value="nearby" className="mt-4">
              <DealsView 
                searchQuery={searchQuery} 
                activeFilter="nearby"
                retailerId={selectedRetailerId}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <BottomNavigation activeTab="deals" />
    </div>
  );
};

export default DealsPage;