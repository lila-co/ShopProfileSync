import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Calendar } from '@/components/ui/calendar';
import { Retailers } from '@/components/retailers/RetailerList';
import { CalendarIcon } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

// Types
import type { WeeklyCircular, StoreDeal, Retailer } from '@/lib/types';
import DashboardLayout from '@/components/layout/DashboardLayout';

const CircularsPage: React.FC = () => {
  const [selectedRetailerId, setSelectedRetailerId] = useState<number | null>(null);
  const [selectedCircularId, setSelectedCircularId] = useState<number | null>(null);
  
  // Get all retailers
  const { data: retailers } = useQuery({
    queryKey: ['/api/retailers'],
  });
  
  // Get all active circulars, filtered by retailer if one is selected
  const { data: circulars, isLoading: isLoadingCirculars } = useQuery({
    queryKey: ['/api/circulars', selectedRetailerId],
    queryFn: async () => {
      const url = selectedRetailerId 
        ? `/api/circulars?retailerId=${selectedRetailerId}` 
        : '/api/circulars';
      const response = await fetch(url);
      return response.json();
    },
    enabled: true,
  });
  
  // Get deals for a specific circular if one is selected
  const { data: circularDeals, isLoading: isLoadingDeals } = useQuery({
    queryKey: ['/api/circulars', selectedCircularId, 'deals'],
    queryFn: async () => {
      if (!selectedCircularId) return [];
      const response = await fetch(`/api/circulars/${selectedCircularId}/deals`);
      return response.json();
    },
    enabled: !!selectedCircularId,
  });
  
  // Handle retailer selection
  const handleRetailerSelect = (retailerId: number | null) => {
    setSelectedRetailerId(retailerId);
    setSelectedCircularId(null); // Reset circular selection when changing retailer
  };
  
  // Handle circular selection
  const handleCircularSelect = (circularId: number) => {
    setSelectedCircularId(circularId);
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Weekly Circulars</h1>
        <p className="text-gray-600 mb-8">
          Browse weekly flyers and deals from your favorite local grocery stores
        </p>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar - Retailer Selection */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Stores</CardTitle>
                <CardDescription>Select a store to view their weekly ads</CardDescription>
              </CardHeader>
              <CardContent>
                <Retailers
                  retailers={retailers || []}
                  onRetailerSelect={handleRetailerSelect}
                  selectedRetailerId={selectedRetailerId}
                  showAll={true}
                />
              </CardContent>
            </Card>
          </div>
          
          {/* Main Content */}
          <div className="lg:col-span-9">
            {/* Circulars List */}
            {!selectedCircularId && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {isLoadingCirculars ? (
                  <p>Loading circulars...</p>
                ) : circulars && circulars.length > 0 ? (
                  circulars.map((circular: WeeklyCircular) => (
                    <Card key={circular.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleCircularSelect(circular.id)}>
                      {circular.imageUrl && (
                        <div className="aspect-[1.5/1] overflow-hidden">
                          <img 
                            src={circular.imageUrl} 
                            alt={circular.title} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle>{circular.title}</CardTitle>
                          <Badge>{formatDistanceToNow(new Date(circular.endDate), { addSuffix: true })}</Badge>
                        </div>
                        <CardDescription>
                          {circular.description || `Valid until ${format(new Date(circular.endDate), 'MMM dd, yyyy')}`}
                        </CardDescription>
                      </CardHeader>
                      <CardFooter>
                        <div className="flex items-center text-sm text-gray-500">
                          <CalendarIcon className="mr-1 h-4 w-4" />
                          <span>
                            {format(new Date(circular.startDate), 'MMM dd')} - {format(new Date(circular.endDate), 'MMM dd, yyyy')}
                          </span>
                        </div>
                      </CardFooter>
                    </Card>
                  ))
                ) : (
                  <div className="lg:col-span-3 text-center py-8">
                    <h3 className="text-xl font-medium mb-2">No circulars available</h3>
                    <p className="text-gray-500">
                      {selectedRetailerId 
                        ? "This store currently has no active weekly ads" 
                        : "Please select a store to view their weekly ads"}
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Circular Details */}
            {selectedCircularId && circulars && (
              <div>
                {/* Back button */}
                <Button
                  variant="outline"
                  onClick={() => setSelectedCircularId(null)}
                  className="mb-4"
                >
                  ← Back to circulars
                </Button>
                
                {/* Circular info */}
                {circulars.filter((c: WeeklyCircular) => c.id === selectedCircularId).map((circular: WeeklyCircular) => (
                  <div key={circular.id}>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                      <div>
                        <h2 className="text-2xl font-bold">{circular.title}</h2>
                        <p className="text-gray-500">
                          {format(new Date(circular.startDate), 'MMM dd')} - {format(new Date(circular.endDate), 'MMM dd, yyyy')}
                        </p>
                        {circular.description && <p className="mt-2">{circular.description}</p>}
                      </div>
                      
                      {circular.pdfUrl && (
                        <Button className="mt-4 md:mt-0" asChild>
                          <a href={circular.pdfUrl} target="_blank" rel="noopener noreferrer">
                            View Full PDF
                          </a>
                        </Button>
                      )}
                    </div>
                    
                    {circular.imageUrl && (
                      <div className="mb-6">
                        <img 
                          src={circular.imageUrl} 
                          alt={circular.title} 
                          className="w-full max-h-80 object-contain rounded-lg"
                        />
                      </div>
                    )}
                    
                    <Separator className="mb-6" />
                    
                    {/* Deals from this circular */}
                    <h3 className="text-xl font-semibold mb-4">Featured Deals</h3>
                    
                    {isLoadingDeals ? (
                      <p>Loading deals...</p>
                    ) : circularDeals && circularDeals.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {circularDeals.map((deal: StoreDeal) => (
                          <Card key={deal.id}>
                            {deal.imageUrl && (
                              <div className="h-40 overflow-hidden">
                                <img 
                                  src={deal.imageUrl} 
                                  alt={deal.productName} 
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <CardHeader>
                              <CardTitle className="text-lg">{deal.productName}</CardTitle>
                              {deal.category && <Badge>{deal.category}</Badge>}
                            </CardHeader>
                            <CardContent>
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-2xl font-bold">${(deal.salePrice / 100).toFixed(2)}</div>
                                  <div className="text-sm text-gray-500 line-through">${(deal.regularPrice / 100).toFixed(2)}</div>
                                </div>
                                <div className="text-green-600 font-bold">
                                  Save {Math.round(((deal.regularPrice - deal.salePrice) / deal.regularPrice) * 100)}%
                                </div>
                              </div>
                            </CardContent>
                            {deal.featured && (
                              <CardFooter>
                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
                                  Featured Deal
                                </Badge>
                              </CardFooter>
                            )}
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center py-8 text-gray-500">
                        No specific deals found for this circular. Visit the store for more information.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CircularsPage;