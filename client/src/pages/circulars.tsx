import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Separator } from "./components/ui/separator";
import { Badge } from "./components/ui/badge";
import { Calendar } from './components/ui/calendar';
import { Retailers } from './components/retailers/RetailerList';
import { CalendarIcon, MapPin, AlertCircle } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import Header from './components/layout/Header';
import BottomNavigation from './components/layout/BottomNavigation';
import { Alert, AlertDescription, AlertTitle } from "./components/ui/alert";

// Types
import type { User, WeeklyCircular, StoreDeal, Retailer } from './lib/types';

const CircularsPage: React.FC = () => {
  const [selectedRetailerId, setSelectedRetailerId] = useState<number | null>(null);
  const [selectedCircularId, setSelectedCircularId] = useState<number | null>(null);
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'loading' | 'success' | 'error' | 'idle'>('idle');

  // Query user profile
  const { data: user } = useQuery<User>({
    queryKey: ['/api/user/profile'],
  });

  // Get user location
  const getUserLocation = () => {
    setLocationStatus('loading');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocationStatus('success');
        },
        (error) => {
          console.error("Error getting location:", error);
          setLocationStatus('error');
        }
      );
    } else {
      setLocationStatus('error');
    }
  };

  // Get all retailers
  const { data: retailers } = useQuery({
    queryKey: ['/api/retailers'],
  });

  // Use location when available
  useEffect(() => {
    // If user profile exists but no location, request it
    if (user && locationStatus === 'idle') {
      getUserLocation();
    }
  }, [user]);

  // Get circulars based on retailer selection and location
  const { data: circulars, isLoading: isLoadingCirculars } = useQuery({
    queryKey: ['/api/circulars', selectedRetailerId, location],
    queryFn: async () => {
      let endpoint = '/api/circulars';

      // Add query params
      const params = new URLSearchParams();
      if (selectedRetailerId) params.append('retailerId', selectedRetailerId.toString());
      if (location) {
        params.append('lat', location.lat.toString());
        params.append('lng', location.lng.toString());
        params.append('maxDistance', '25'); // 25 mile radius
      }

      // Append params to endpoint if any exist
      if (params.toString()) {
        endpoint += `?${params.toString()}`;
      }

      const response = await fetch(endpoint, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch circulars');
      }
      return response.json();
    },
  });

  // Get deals for selected circular
  const { data: circularDeals, isLoading: isLoadingDeals } = useQuery({
    queryKey: ['/api/circulars/deals', selectedCircularId],
    queryFn: async () => {
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
    <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
      <Header user={user} />

      <main className="flex-1 overflow-y-auto pb-20">
        <div className="p-4">
          <h1 className="text-3xl font-bold mb-6">Weekly Circulars</h1>
          <p className="text-gray-600 mb-4">
            Browse weekly flyers and deals from your favorite local grocery stores
          </p>

          {/* Location Alert */}
          {locationStatus === 'idle' && (
            <Alert variant="default" className="mb-4">
              <MapPin className="h-4 w-4" />
              <AlertTitle>Location Access</AlertTitle>
              <AlertDescription>
                Enable location access to see circulars from stores near you.
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={getUserLocation} 
                  className="ml-2"
                >
                  Enable Location
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {locationStatus === 'loading' && (
            <Alert variant="default" className="mb-4">
              <AlertTitle>Requesting Location...</AlertTitle>
              <AlertDescription>
                Please allow location access in your browser.
              </AlertDescription>
            </Alert>
          )}

          {locationStatus === 'success' && (
            <Alert variant="success" className="mb-4 bg-green-50 border-green-200">
              <MapPin className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-700">Location Found</AlertTitle>
              <AlertDescription className="text-green-600">
                Showing circulars from stores near your location.
              </AlertDescription>
            </Alert>
          )}

          {locationStatus === 'error' && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Location Unavailable</AlertTitle>
              <AlertDescription>
                Unable to access your location. Showing all available circulars instead.
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={getUserLocation} 
                  className="ml-2"
                >
                  Try Again
                </Button>
              </AlertDescription>
            </Alert>
          )}

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
                            <Card key={deal.id} className="h-full">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-lg">{deal.productName}</CardTitle>
                                <div className="flex justify-between items-center">
                                  <div className="flex gap-1 font-semibold">
                                    <span className="text-gray-400 line-through">${deal.regularPrice.toFixed(2)}</span>
                                    <span className="text-primary">${deal.salePrice.toFixed(2)}</span>
                                  </div>
                                  <Badge>{Math.round((1 - deal.salePrice / deal.regularPrice) * 100)}% off</Badge>
                                </div>
                              </CardHeader>
                              <CardContent>
                                {deal.imageUrl && (
                                  <div className="mb-4 aspect-square overflow-hidden">
                                    <img 
                                      src={deal.imageUrl} 
                                      alt={deal.productName} 
                                      className="w-full h-full object-contain"
                                    />
                                  </div>
                                )}
                                <div className="text-xs text-gray-500">
                                  <p>Category: {deal.category || 'General'}</p>
                                  <p>Valid until: {format(new Date(deal.endDate), 'MMM dd, yyyy')}</p>
                                </div>
                              </CardContent>
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
      </main>
      <BottomNavigation activeTab="circulars" />
    </div>
  );
};

export default CircularsPage;