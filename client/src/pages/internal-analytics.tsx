import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import BottomNavigation from '@/components/layout/BottomNavigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Users, Store, TrendingUp } from 'lucide-react';
import { User } from '@/lib/types';

const InternalAnalyticsPage: React.FC = () => {
  const [demographicTrends, setDemographicTrends] = React.useState([
    {
      segment: "Young Professionals",
      currentBehaviors: { averageSpend: 75.50 },
      upcomingTrends: [
        { trend: "Eco-Friendly Products", predictedGrowth: "+15%", timeframe: "Next 3 Months", confidence: 0.85, drivingFactors: ["Environmental Awareness", "Social Media Influence"] },
        { trend: "Subscription Boxes", predictedGrowth: "+12%", timeframe: "Next 6 Months", confidence: 0.78, drivingFactors: ["Convenience", "Personalization"] }
      ]
    },
    {
      segment: "Families with Young Children",
      currentBehaviors: { averageSpend: 120.00 },
      upcomingTrends: [
        { trend: "Educational Toys", predictedGrowth: "+20%", timeframe: "Next 3 Months", confidence: 0.90, drivingFactors: ["Early Childhood Education", "Parental Concerns"] },
        { trend: "Organic Baby Food", predictedGrowth: "+18%", timeframe: "Next 6 Months", confidence: 0.82, drivingFactors: ["Health Concerns", "Product Availability"] }
      ]
    }
  ]);

  const [similarProfiles, setSimilarProfiles] = React.useState({
    profileMatches: [
      {
        profileType: "Value Shoppers",
        matchingUsers: 1250,
        similarity: 0.92,
        shoppingPatterns: { averageSpend: 35.00, brandLoyalty: 0.25, topCategories: ["Discount Apparel", "Generic Groceries"], pricesensitivity: "High" }
      },
      {
        profileType: "Tech Enthusiasts",
        matchingUsers: 875,
        similarity: 0.88,
        shoppingPatterns: { averageSpend: 95.00, brandLoyalty: 0.60, topCategories: ["Smart Home Devices", "Wearable Technology"], pricesensitivity: "Medium" }
      }
    ]
  });

  const [trendPredictions, setTrendPredictions] = React.useState({
    shortTerm: {
      predictions: [
        { category: "Home Office Supplies", prediction: "Increased demand for ergonomic equipment.", confidence: 0.75, drivingDemographics: ["Remote Workers", "Freelancers"] },
        { category: "Outdoor Fitness Gear", prediction: "Surge in demand for hiking and camping gear.", confidence: 0.80, drivingDemographics: ["Young Adults", "Active Seniors"] }
      ]
    },
    mediumTerm: {
      predictions: [
        { category: "Sustainable Fashion", prediction: "Shift towards recycled and upcycled clothing.", confidence: 0.85, drivingDemographics: ["Gen Z", "Millennials"] },
        { category: "Plant-Based Protein", prediction: "Growing interest in meat alternatives.", confidence: 0.70, drivingDemographics: ["Health-Conscious Consumers", "Environmental Advocates"] }
      ]
    },
    longTerm: {
      predictions: [
        { category: "AI-Powered Healthcare", prediction: "Adoption of AI diagnostics and personalized medicine.", confidence: 0.90, drivingDemographics: ["Baby Boomers", "Tech-Savvy Patients"] },
        { category: "Space Tourism", prediction: "Emergence of commercial space travel.", confidence: 0.60, drivingDemographics: ["High-Net-Worth Individuals", "Adventure Seekers"] }
      ]
    },
    demographicInsights: {
      fastestGrowingSegment: "Urban Millennials",
      mostInfluentialSegment: "Gen Z",
      emergingSegment: "Digital Nomads",
      aiConfidence: 0.88
    }
  });

  const { data: user } = useQuery<User>({
    queryKey: ['/api/user/profile'],
  });

  const { data: retailerAnalytics } = useQuery({
    queryKey: ['/api/internal/analytics/retailers'],
  });

  const { data: productAnalytics } = useQuery({
    queryKey: ['/api/internal/analytics/products'],
  });

  const { data: customerSegments } = useQuery({
    queryKey: ['/api/internal/analytics/customer-segments'],
  });

  const { data: purchasePatterns } = useQuery({
    queryKey: ['/api/internal/analytics/purchase-patterns'],
  });

  const { data: fetchedDemographicTrends } = useQuery({
    queryKey: ['/api/internal/analytics/demographic-trends'],
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { data: fetchedSimilarProfiles } = useQuery({
    queryKey: ['/api/internal/analytics/similar-profiles'],
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { data: fetchedTrendPredictions } = useQuery({
    queryKey: ['/api/internal/analytics/trend-predictions'],
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Use fetched data if available, otherwise fall back to default data
  React.useEffect(() => {
    if (fetchedDemographicTrends) {
      setDemographicTrends(fetchedDemographicTrends);
    }
  }, [fetchedDemographicTrends]);

  React.useEffect(() => {
    if (fetchedSimilarProfiles) {
      setSimilarProfiles(fetchedSimilarProfiles);
    }
  }, [fetchedSimilarProfiles]);

  React.useEffect(() => {
    if (fetchedTrendPredictions) {
      setTrendPredictions(fetchedTrendPredictions);
    }
  }, [fetchedTrendPredictions]);

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
      <Header user={user} />

      <main className="flex-1 overflow-y-auto p-4 pb-20">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Internal Analytics</h1>
          <p className="text-gray-600">Business intelligence and market insights</p>
        </div>

        <Tabs defaultValue="retailers" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="retailers">Retailers</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="demographics">AI Insights</TabsTrigger>
            <TabsTrigger value="predictions">Predictions</TabsTrigger>
          </TabsList>

          <TabsContent value="retailers" className="space-y-4">
            {retailerAnalytics?.map((retailer: any) => (
              <Card key={retailer.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <Store className="h-5 w-5 mr-2 text-blue-600" />
                    {retailer.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-xl font-bold">${(retailer.totalSales / 100).toFixed(0)}K</div>
                      <div className="text-sm text-gray-500">Total Sales</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold">{retailer.orderCount.toLocaleString()}</div>
                      <div className="text-sm text-gray-500">Orders</div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Top Categories:</div>
                    {retailer.topSellingCategories.slice(0, 3).map((category: any, index: number) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{category.name}</span>
                        <span>{category.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            {productAnalytics?.map((product: any) => (
              <Card key={product.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-gray-500">{product.category}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">${(product.totalSales / 100).toFixed(0)}K</div>
                      <div className="text-sm text-gray-500">{product.unitsSold} units</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="demographics" className="space-y-4">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Users className="h-5 w-5 mr-2 text-blue-600" />
                    AI Demographic Trends
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {demographicTrends && demographicTrends.map((segment: any, index: number) => (
                    <div key={index} className="border-l-4 border-blue-500 pl-4">
                      <h4 className="font-semibold text-gray-800">{segment.segment}</h4>
                      <p className="text-sm text-gray-600 mb-2">Avg. Spend: ${(segment.currentBehaviors.averageSpend).toFixed(2)}</p>
                      <div className="space-y-2">
                        {segment.upcomingTrends.slice(0, 2).map((trend: any, tIndex: number) => (
                          <div key={tIndex} className="bg-blue-50 p-3 rounded">
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-medium text-sm">{trend.trend}</span>
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">{trend.predictedGrowth}</span>
                            </div>
                            <p className="text-xs text-gray-600">{trend.timeframe} • {(trend.confidence * 100).toFixed(0)}% confidence</p>
                            <p className="text-xs text-gray-500 mt-1">{trend.drivingFactors.slice(0, 2).join(', ')}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2 text-purple-600" />
                    Similar Profile Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {similarProfiles && similarProfiles.profileMatches && (
                    <div className="space-y-4">
                      {similarProfiles.profileMatches.map((profile: any, index: number) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-gray-800">{profile.profileType}</h4>
                            <div className="text-right">
                              <div className="text-sm font-medium">{profile.matchingUsers.toLocaleString()} users</div>
                              <div className="text-xs text-gray-500">{(profile.similarity * 100).toFixed(0)}% similarity</div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">Avg. Spend: ${profile.shoppingPatterns.averageSpend}</p>
                              <p className="text-gray-600">Loyalty: {(profile.shoppingPatterns.brandLoyalty * 100).toFixed(0)}%</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Top Category: {profile.shoppingPatterns.topCategories[0]}</p>
                              <p className="text-gray-600">Price Sensitivity: {profile.shoppingPatterns.pricesensitivity}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="predictions" className="space-y-4">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                    AI Trend Predictions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {trendPredictions && (
                    <div className="space-y-6">
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-3">Short Term (1-3 months)</h4>
                        <div className="space-y-3">
                          {trendPredictions.shortTerm.predictions.map((pred: any, index: number) => (
                            <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-3">
                              <div className="flex justify-between items-start mb-2">
                                <span className="font-medium">{pred.category}</span>
                                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                                  {(pred.confidence * 100).toFixed(0)}% confidence
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 mb-1">{pred.prediction}</p>
                              <p className="text-xs text-gray-500">
                                Driven by: {pred.drivingDemographics.join(', ')}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold text-gray-800 mb-3">Medium Term (3-6 months)</h4>
                        <div className="space-y-3">
                          {trendPredictions.mediumTerm.predictions.map((pred: any, index: number) => (
                            <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <div className="flex justify-between items-start mb-2">
                                <span className="font-medium">{pred.category}</span>
                                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                  {(pred.confidence * 100).toFixed(0)}% confidence
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 mb-1">{pred.prediction}</p>
                              <p className="text-xs text-gray-500">
                                Driven by: {pred.drivingDemographics.join(', ')}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold text-gray-800 mb-3">Long Term (6-12 months)</h4>
                        <div className="space-y-3">
                          {trendPredictions.longTerm.predictions.map((pred: any, index: number) => (
                            <div key={index} className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                              <div className="flex justify-between items-start mb-2">
                                <span className="font-medium">{pred.category}</span>
                                <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                                  {(pred.confidence * 100).toFixed(0)}% confidence
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 mb-1">{pred.prediction}</p>
                              <p className="text-xs text-gray-500">
                                Driven by: {pred.drivingDemographics.join(', ')}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-gray-50 border rounded-lg p-4">
                        <h4 className="font-semibold text-gray-800 mb-2">Key Demographic Insights</h4>
                        <div className="grid grid-cols-1 gap-2 text-sm">
                          <p><span className="font-medium">Fastest Growing:</span> {trendPredictions.demographicInsights.fastestGrowingSegment}</p>
                          <p><span className="font-medium">Most Influential:</span> {trendPredictions.demographicInsights.mostInfluentialSegment}</p>
                          <p><span className="font-medium">Emerging Segment:</span> {trendPredictions.demographicInsights.emergingSegment}</p>
                          <p><span className="font-medium">AI Confidence:</span> {(trendPredictions.demographicInsights.aiConfidence * 100).toFixed(0)}%</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <BottomNavigation activeTab="home" />
    </div>
  );
};

export default InternalAnalyticsPage;