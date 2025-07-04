import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import ActionCard from './components/dashboard/ActionCard';
import StoreCard from './components/dashboard/StoreCard';
import WeeklyDeals from './components/dashboard/WeeklyDeals';
import ShoppingInsights from './components/dashboard/ShoppingInsights';
import RecommendationCard from './components/dashboard/RecommendationCard';
import { useDashboardData } from './hooks/useBatchApi';
import { Sparkles, Brain, Target, TrendingUp, Clock, MapPin } from 'lucide-react';

interface AIRecommendation {
  productName: string;
  daysUntilPurchase?: number;
  savings?: number;
  suggestedPrice?: number;
  suggestedRetailer?: {
    name: string;
  };
  reason?: string;
  aiInsight?: string;
  confidence?: number;
}

interface SmartDeal {
  productName: string;
  category: string;
  salePrice: number;
  originalPrice: number;
  savings: number;
  retailer: string;
  validUntil: string;
  aiReason: string;
  confidence: number;
}

const Dashboard: React.FC = () => {
  const [showAllRecommendations, setShowAllRecommendations] = useState(false);

  // Fetch AI-enhanced recommendations
  const { data: recommendations = [], isLoading: loadingRecommendations } = useQuery<AIRecommendation[]>({
    queryKey: ['/api/recommendations'],
    refetchOnMount: true,
    staleTime: 30000, // 30 seconds
  });

  // Fetch smart deals with AI analysis
  const { data: smartDeals = [], isLoading: loadingDeals } = useQuery<SmartDeal[]>({
    queryKey: ['/api/deals/smart-analysis'],
    refetchOnMount: true,
    staleTime: 30000,
  });

  // Fetch contextual shopping insights
  const { data: contextualInsights } = useQuery({
    queryKey: ['/api/insights/contextual'],
    refetchOnMount: true,
    staleTime: 30000,
  });

  // Fetch demographic insights
  const { data: demographicInsights = [] } = useQuery({
    queryKey: ['/api/insights/demographic-insights'],
    refetchOnMount: true,
    staleTime: 60000, // 1 minute
  });

  // Fetch similar shopper profiles
  const { data: similarProfiles = [] } = useQuery({
    queryKey: ['/api/insights/similar-profiles'],
    refetchOnMount: true,
    staleTime: 300000, // 5 minutes
  });

  // Fetch area insights
  const { data: areaInsights } = useQuery({
    queryKey: ['/api/insights/area-insights'],
    refetchOnMount: true,
    staleTime: 300000, // 5 minutes
  });

  // Get the most urgent/important recommendations to display
  const displayedRecommendations = showAllRecommendations 
    ? recommendations 
    : recommendations.slice(0, 3);

  const urgentRecommendations = recommendations.filter(
    rec => rec.daysUntilPurchase !== undefined && rec.daysUntilPurchase <= 3
  );

  return (
    <div className="pb-20 frosted-bg min-h-screen">
      {/* Header with AI Status */}
      <div className="glass-nav bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">Smart Shopping Dashboard</h1>
              <p className="text-blue-100">AI-powered insights for smarter shopping</p>
            </div>
            <div className="flex items-center space-x-2">
              <Brain className="w-6 h-6" />
              <span className="text-sm">AI Active</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* AI Insights Summary */}
        {contextualInsights && (
          <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <Sparkles className="w-5 h-5 mr-2 text-blue-600" />
                AI Shopping Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{urgentRecommendations.length}</div>
                  <div className="text-sm text-gray-600">Items Running Low</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    ${Math.round(recommendations.reduce((sum, rec) => sum + (rec.savings || 0), 0) / 100)}
                  </div>
                  <div className="text-sm text-gray-600">Potential Savings</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{smartDeals.length}</div>
                  <div className="text-sm text-gray-600">Smart Deals Found</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {areaInsights?.averageAreaSpend || 127}
                  </div>
                  <div className="text-sm text-gray-600">Area Avg Spend</div>
                </div>
              </div>

              {/* Contextual Tips */}
              {contextualInsights && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <h4 className="font-medium text-blue-900 mb-2">Smart Shopping Tips</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center text-blue-800">
                      <Clock className="w-3 h-3 mr-1" />
                      Best time: {contextualInsights.optimalShoppingTime}
                    </div>
                    <div className="flex items-center text-blue-800">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      {contextualInsights.budgetAlert}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Demographic Insights */}
        {demographicInsights.length > 0 && (
          <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <Brain className="w-5 h-5 mr-2 text-purple-600" />
                Shopping Trends in Your Area
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {demographicInsights.slice(0, 2).map((insight, index) => (
                  <div key={index} className="p-3 bg-white rounded-lg border border-purple-100">
                    <h4 className="font-medium text-gray-800 mb-1">{insight.trend}</h4>
                    <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-purple-600 font-medium">{insight.confidence}% confident</span>
                      <span className="text-gray-500">{insight.sampleSize} shoppers</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Similar Shopper Profiles */}
        {similarProfiles.length > 0 && (
          <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <Target className="w-5 h-5 mr-2 text-green-600" />
                Shoppers Like You
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {similarProfiles.slice(0, 2).map((profile, index) => (
                  <div key={index} className="p-3 bg-white rounded-lg border border-green-100">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-800">{profile.profileType}</h4>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {Math.round(profile.similarity * 100)}% match
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">Avg Spend: </span>
                        <span className="font-medium">${profile.averageSpend}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Frequency: </span>
                        <span className="font-medium">{profile.shoppingFrequency}</span>
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className="text-xs text-gray-500">Top categories: </span>
                      <span className="text-xs text-gray-700">{profile.topCategories.slice(0, 2).join(', ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Urgent Recommendations */}
        {urgentRecommendations.length > 0 && (
          <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-red-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <Clock className="w-5 h-5 mr-2 text-orange-600" />
                Urgent Restocking Needed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {urgentRecommendations.slice(0, 2).map((rec, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200">
                    <div>
                      <h4 className="font-medium text-gray-800">{rec.productName}</h4>
                      <p className="text-sm text-orange-600">
                        Purchase in {rec.daysUntilPurchase} days
                      </p>
                    </div>
                    <Badge variant="destructive">Urgent</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Recommendations */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center">
              <Target className="w-5 h-5 mr-2 text-green-600" />
              AI Recommendations
            </h2>
            {recommendations.length > 3 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowAllRecommendations(!showAllRecommendations)}
              >
                {showAllRecommendations ? 'Show Less' : `Show All (${recommendations.length})`}
              </Button>
            )}
          </div>

          {loadingRecommendations ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array(3).fill(0).map((_, i) => (
                <Card key={i} className="animate-pulse border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-center mb-3">
                      <div className="h-3 w-3 bg-gray-200 rounded-full mr-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3 mb-3"></div>
                    <div className="h-8 bg-gray-200 rounded mt-4"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : displayedRecommendations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedRecommendations.map((recommendation, index) => (
                <RecommendationCard 
                  key={index} 
                  recommendation={recommendation}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <Brain className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">No AI Recommendations Yet</h3>
                <p className="text-gray-500">Start shopping to help our AI learn your preferences</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Smart Deals Section */}
        {smartDeals.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                AI-Detected Smart Deals
              </h2>
              <div className="text-sm text-gray-600">
                {smartDeals.length} deals found
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {smartDeals.slice(0, 4).map((deal, index) => (
                <Card key={index} className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium text-gray-800">{deal.productName}</h4>
                        <p className="text-xs text-gray-500">{deal.retailer}</p>
                      </div>
                      <Badge className="bg-green-100 text-green-800">
                        Save ${(deal.savings / 100).toFixed(2)}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 mb-3">
                      <span className="line-through">${(deal.originalPrice / 100).toFixed(2)}</span>
                      <span className="ml-2 text-lg font-bold text-green-600">
                        ${(deal.salePrice / 100).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-blue-600 flex items-center">
                        <Brain className="w-3 h-3 mr-1" />
                        {deal.aiReason}
                      </span>
                      <span className="text-xs text-gray-500">{deal.confidence}% confident</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Valid until {deal.validUntil}</span>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                        Add to List
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ActionCard
            title="Smart Shopping List"
            description="AI-generated list"
            iconColor="text-blue-600"
            href="/shopping-list"
          />
          <ActionCard
            title="Weekly Deals"
            description="AI-curated deals"
            iconColor="text-green-600"
            href="/deals"
          />
          <ActionCard
            title="Shopping Route"
            description="Optimized path"
            iconColor="text-purple-600"
            href="/shopping-route"
          />
          <ActionCard
            title="Price Tracker"
            description="Monitor savings"
            iconColor="text-orange-600"
            href="/expiration-tracker"
          />
        </div>

        {/* Store Cards */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <MapPin className="w-5 h-5 mr-2 text-red-600" />
            Nearby Stores
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StoreCard storeName="Walmart" storeDistance="0.8 miles" logoColor="blue" />
            <StoreCard storeName="Target" storeDistance="1.2 miles" logoColor="red" />
            <StoreCard storeName="Whole Foods" storeDistance="1.5 miles" logoColor="green" />
          </div>
        </div>

        {/* Weekly Deals & Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WeeklyDeals />
          <ShoppingInsights />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;