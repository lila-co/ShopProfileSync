import React, { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import BottomNavigation from '@/components/layout/BottomNavigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Store, MapPin, Clock, Phone, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Retailer {
  id: number;
  name: string;
  logoColor: string;
  apiEndpoint?: string;
  apiKey?: string;
}

const RetailerDetailsPage: React.FC = () => {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const retailerId = parseInt(id || '0');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [nearestStore, setNearestStore] = useState<any>(null);
  const { toast } = useToast();

  const { data: retailer, isLoading, error } = useQuery<Retailer>({
    queryKey: [`/api/retailers/${retailerId}`],
    enabled: !!retailerId && retailerId > 0,
  });

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
        <Header 
          title="Loading..." 
          showBackButton 
          onBack={() => navigate('/retailers')}
        />
        <main className="flex-1 overflow-y-auto p-4">
          <div>Loading retailer details...</div>
        </main>
        <BottomNavigation activeTab="stores" />
      </div>
    );
  }

  if (error || (!retailer && !isLoading)) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
        <Header 
          title="Store Not Found" 
          showBackButton 
          onBack={() => navigate('/retailers')}
        />
        <main className="flex-1 overflow-y-auto p-4">
          <div>Store not found.</div>
        </main>
        <BottomNavigation activeTab="stores" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
      <Header 
        title={retailer.name} 
        showBackButton 
        onBack={() => navigate('/retailers')}
      />

      <main className="flex-1 overflow-y-auto p-4 pb-20">
        {/* Store Header */}
        <div className="text-center mb-6">
          <div className={`w-16 h-16 rounded-full bg-${retailer.logoColor}-500 mx-auto mb-3 flex items-center justify-center`}>
            <Store className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">{retailer.name}</h1>
          <p className="text-gray-500">Retail Store</p>
        </div>

        {/* Store Actions */}
        <div className="space-y-3 mb-6">
          <Button 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200" 
            variant="default"
            onClick={() => navigate(`/deals?retailer=${retailer.id}`)}
          >
            <Store className="h-4 w-4 mr-2" />
            View Current Deals
          </Button>
          <Button 
            className="w-full" 
            variant="outline"
            onClick={() => {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    const { latitude, longitude } = position.coords;
                    const searchQuery = encodeURIComponent(`${retailer.name} store near me`);
                    window.open(`https://www.google.com/maps/search/${searchQuery}/@${latitude},${longitude},15z`, '_blank');
                  },
                  (error) => {
                    console.error('Error getting location:', error);
                    // Fallback to generic search if location access is denied
                    window.open(`https://www.google.com/maps/search/${encodeURIComponent(retailer.name)}+store+locations`, '_blank');
                  }
                );
              } else {
                // Fallback for browsers that don't support geolocation
                window.open(`https://www.google.com/maps/search/${encodeURIComponent(retailer.name)}+store+locations`, '_blank');
              }
            }}
          >
            <MapPin className="h-4 w-4 mr-2" />
            Find Store Locations
          </Button>
        </div>

        {/* Store Info */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3">Store Information</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium">Hours</p>
                  <p className="text-sm text-gray-500">Mon-Sun: 6:00 AM - 11:00 PM</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium">Customer Service</p>
                  <p className="text-sm text-gray-500">1-800-{retailer.name.toUpperCase()}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Globe className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium">Website</p>
                  <p className="text-sm text-gray-500">www.{retailer.name.toLowerCase()}.com</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Integration Status */}
        <Card className="mt-4">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3">Integration Status</h3>
            <div className="flex items-center justify-between">
              <span>API Integration</span>
              <span className={`px-2 py-1 rounded text-xs ${
                retailer.apiEndpoint ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {retailer.apiEndpoint ? 'Active' : 'Limited'}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {retailer.apiEndpoint 
                ? 'Full API integration available for real-time pricing and ordering.'
                : 'Basic integration available. Some features may be simulated.'}
            </p>
          </CardContent>
        </Card>
      </main>

      <BottomNavigation activeTab="stores" />
    </div>
  );
};

export default RetailerDetailsPage;