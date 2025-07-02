import React, { useState, startTransition } from 'react';
import BottomNavigation from '@/components/layout/BottomNavigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Store, ExternalLink, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getQueryFn } from '@/lib/queryClient';
import AuthenticatedHeader from '@/components/layout/AuthenticatedHeader';
import { getCompanyLogo } from '@/lib/imageUtils';

interface Retailer {
  id: number;
  name: string;
  logoColor: string;
}

interface RetailerAccount {
  id: number;
  retailerId: number;
  isConnected: boolean;
}

const RetailersPage: React.FC = () => {
  const [location, setLocation] = useLocation();

  const { data: retailers, isLoading } = useQuery<Retailer[]>({
    queryKey: ['/api/retailers'],
    queryFn: getQueryFn({ on401: 'throw' }),
    suspense: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  const { data: connectedAccounts } = useQuery<RetailerAccount[]>({
    queryKey: ['/api/user/retailer-accounts'],
    queryFn: getQueryFn({ on401: 'throw' }),
    suspense: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  const isConnected = (retailerId: number) => {
    return connectedAccounts?.some(account => account.retailerId === retailerId && account.isConnected);
  };

  const handleRetailerClick = (retailerId: number) => {
    console.log('Navigating to retailer:', retailerId);
    console.log('Current location:', location);
    setLocation(`/retailers/${retailerId}`);
  };

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
        <AuthenticatedHeader />
        <main className="flex-1 overflow-y-auto p-4">
          <div>Loading retailers...</div>
        </main>
        <BottomNavigation activeTab="retailers" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto frosted-bg min-h-screen flex flex-col">
      <AuthenticatedHeader />

      <main className="flex-1 overflow-y-auto p-4 pb-20">
        <h2 className="text-xl font-bold mb-4">Partner Retailers</h2>

        <div className="space-y-4">
          {retailers?.map((retailer) => (
            <Card key={retailer.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleRetailerClick(retailer.id)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className={`w-4 h-4 rounded-full bg-${retailer.logoColor}-500`}
                    />
                    {/* Use the actual brand logo here */}
                    <img
                      src={getCompanyLogo(retailer.name)} // Assuming retailer.name can be used to derive the logo URL
                      alt={`${retailer.name} Logo`}
                      className="h-6 w-6"
                    />
                    <div>
                      <h3 className="font-semibold">{retailer.name}</h3>
                      <p className="text-sm text-gray-500">
                        {isConnected(retailer.id) ? 'Connected' : 'Available for connection'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isConnected(retailer.id) ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <ExternalLink className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>



        {(!retailers || retailers.length === 0) && (
          <Card>
            <CardContent className="p-6 text-center text-gray-500">
              <Store className="h-12 w-12 mx-auto text-gray-300 mb-2" />
              <p>No retailers available</p>
            </CardContent>
          </Card>
        )}

        {/* Link to manage connected accounts */}
        <div className="mt-6 text-center">
          <Button 
            variant="ghost" 
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            onClick={() => setLocation('/profile')}
          >
            Manage Connected Retailer Accounts
          </Button>
        </div>
      </main>

      <BottomNavigation activeTab="retailers" />
    </div>
  );
};

export default RetailersPage;