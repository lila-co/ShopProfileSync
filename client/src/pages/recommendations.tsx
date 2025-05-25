
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import BottomNavigation from '@/components/layout/BottomNavigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star, Clock, Percent, Plus, TrendingDown, MapPin } from 'lucide-react';
import { User, Recommendation } from '@/lib/types';

const RecommendationsPage: React.FC = () => {
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  const { data: user } = useQuery<User>({
    queryKey: ['/api/user/profile'],
  });

  const { data: recommendations } = useQuery<Recommendation[]>({
    queryKey: ['/api/recommendations'],
  });

  // Enhanced recommendations with more details
  const enhancedRecommendations = [
    {
      id: 1,
      productName: 'Organic Milk (Gallon)',
      currentPrice: 459,
      salePrice: 389,
      savings: 70,
      retailer: 'Whole Foods',
      distance: '1.2 miles',
      dealExpires: '2 days',
      reason: 'You buy milk every 6 days. Stock up on this 15% off deal.',
      rating: 4.8,
      category: 'Dairy'
    },
    {
      id: 2,
      productName: 'Free-Range Eggs (Dozen)',
      currentPrice: 349,
      salePrice: 279,
      savings: 70,
      retailer: 'Target',
      distance: '0.8 miles',
      dealExpires: '1 day',
      reason: 'Running low based on your purchase pattern. Great deal expires soon!',
      rating: 4.6,
      category: 'Dairy'
    },
    {
      id: 3,
      productName: 'Ground Turkey (1 lb)',
      currentPrice: 599,
      salePrice: 449,
      savings: 150,
      retailer: 'Walmart',
      distance: '2.1 miles',
      dealExpires: '4 days',
      reason: 'Healthy protein alternative. 25% off this week.',
      rating: 4.3,
      category: 'Meat'
    },
    {
      id: 4,
      productName: 'Organic Bananas (3 lbs)',
      currentPrice: 299,
      salePrice: 199,
      savings: 100,
      retailer: 'Kroger',
      distance: '1.5 miles',
      dealExpires: '3 days',
      reason: 'Your most purchased fruit. Stock up at lowest price this month.',
      rating: 4.7,
      category: 'Produce'
    },
    {
      id: 5,
      productName: 'Whole Wheat Bread',
      currentPrice: 329,
      salePrice: 249,
      savings: 80,
      retailer: 'Safeway',
      distance: '0.9 miles',
      dealExpires: '5 days',
      reason: 'Better nutritional choice. Buy 2 get 1 free deal.',
      rating: 4.4,
      category: 'Bakery'
    },
    {
      id: 6,
      productName: 'Greek Yogurt (32 oz)',
      currentPrice: 549,
      salePrice: 399,
      savings: 150,
      retailer: 'Target',
      distance: '0.8 miles',
      dealExpires: '6 days',
      reason: 'High protein option. Member exclusive 27% off.',
      rating: 4.9,
      category: 'Dairy'
    }
  ];

  const toggleItemSelection = (id: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const addSelectedToList = async () => {
    const itemsToAdd = enhancedRecommendations.filter(item => selectedItems.has(item.id));
    // In a real app, this would make an API call to add items to shopping list
    console.log('Adding items to shopping list:', itemsToAdd);
    setSelectedItems(new Set());
  };

  const groupedRecommendations = enhancedRecommendations.reduce((groups, item) => {
    const category = item.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(item);
    return groups;
  }, {} as Record<string, typeof enhancedRecommendations>);

  const totalSavings = Array.from(selectedItems).reduce((sum, id) => {
    const item = enhancedRecommendations.find(r => r.id === id);
    return sum + (item?.savings || 0);
  }, 0);

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
      <Header user={user} />
      
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 pb-20">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Smart Recommendations</h1>
            <p className="text-gray-600">Maximize savings on your typical purchases</p>
          </div>

          {/* Selection Summary */}
          {selectedItems.size > 0 && (
            <Card className="mb-4 bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-green-800">
                      {selectedItems.size} items selected
                    </div>
                    <div className="text-sm text-green-600">
                      Total savings: ${(totalSavings / 100).toFixed(2)}
                    </div>
                  </div>
                  <Button 
                    onClick={addSelectedToList}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Add to List
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="all" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="urgent">Urgent</TabsTrigger>
              <TabsTrigger value="savings">Best Deals</TabsTrigger>
              <TabsTrigger value="nearby">Nearby</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-3">
              {Object.entries(groupedRecommendations).map(([category, items]) => (
                <div key={category} className="space-y-3">
                  <h3 className="font-semibold text-gray-700 flex items-center">
                    {category}
                    <Badge variant="secondary" className="ml-2">
                      {items.length} deals
                    </Badge>
                  </h3>
                  {items.map((item) => (
                    <Card 
                      key={item.id} 
                      className={`cursor-pointer transition-all ${
                        selectedItems.has(item.id) 
                          ? 'ring-2 ring-primary bg-primary/5' 
                          : 'hover:shadow-md'
                      }`}
                      onClick={() => toggleItemSelection(item.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-800 mb-1">{item.productName}</h4>
                            <div className="flex items-center space-x-2 mb-2">
                              <Star className="h-3 w-3 text-yellow-500 fill-current" />
                              <span className="text-xs text-gray-600">{item.rating}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-500 line-through">
                                ${(item.currentPrice / 100).toFixed(2)}
                              </span>
                              <span className="font-bold text-primary">
                                ${(item.salePrice / 100).toFixed(2)}
                              </span>
                            </div>
                            <Badge variant="secondary" className="bg-green-50 text-green-700 mt-1">
                              <TrendingDown className="h-3 w-3 mr-1" />
                              ${(item.savings / 100).toFixed(2)} off
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="h-3 w-3 mr-1" />
                            {item.retailer} • {item.distance}
                          </div>
                          <div className="flex items-center text-sm text-orange-600">
                            <Clock className="h-3 w-3 mr-1" />
                            Deal expires in {item.dealExpires}
                          </div>
                          <p className="text-sm text-gray-600">{item.reason}</p>
                        </div>
                        
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center">
                            <Percent className="h-4 w-4 text-green-600 mr-1" />
                            <span className="text-sm font-medium text-green-600">
                              {Math.round((item.savings / item.currentPrice) * 100)}% off
                            </span>
                          </div>
                          <Button 
                            size="sm" 
                            variant={selectedItems.has(item.id) ? "default" : "outline"}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleItemSelection(item.id);
                            }}
                          >
                            {selectedItems.has(item.id) ? "Selected" : "Select"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ))}
            </TabsContent>

            <TabsContent value="urgent" className="space-y-3">
              {enhancedRecommendations
                .filter(item => parseInt(item.dealExpires.split(' ')[0]) <= 2)
                .map((item) => (
                  <Card key={item.id} className="border-orange-200">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-800">{item.productName}</h4>
                        <Badge variant="destructive">Expires {item.dealExpires}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{item.reason}</p>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-primary">
                          ${(item.salePrice / 100).toFixed(2)}
                        </span>
                        <Button size="sm" onClick={() => toggleItemSelection(item.id)}>
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </TabsContent>

            <TabsContent value="savings" className="space-y-3">
              {enhancedRecommendations
                .sort((a, b) => b.savings - a.savings)
                .map((item) => (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-800">{item.productName}</h4>
                        <Badge className="bg-green-100 text-green-800">
                          ${(item.savings / 100).toFixed(2)} savings
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{item.retailer}</span>
                        <Button size="sm" onClick={() => toggleItemSelection(item.id)}>
                          Select
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </TabsContent>

            <TabsContent value="nearby" className="space-y-3">
              {enhancedRecommendations
                .sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance))
                .map((item) => (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-800">{item.productName}</h4>
                        <Badge variant="outline">{item.distance}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{item.retailer}</span>
                        <Button size="sm" onClick={() => toggleItemSelection(item.id)}>
                          Select
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <BottomNavigation activeTab="home" />
    </div>
  );
};

export default RecommendationsPage;
