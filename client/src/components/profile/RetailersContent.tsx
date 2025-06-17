
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Store, ExternalLink, CheckCircle } from 'lucide-react';
import { getQueryFn } from '@/lib/queryClient';
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

const RetailersContent: React.FC = () => {
  const [, setLocation] = useLocation();

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
    setLocation(`/retailers/${retailerId}`);
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-16 bg-gray-200 rounded"></div>
        <div className="h-16 bg-gray-200 rounded"></div>
        <div className="h-16 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {retailers?.map((retailer) => (
        <Card key={retailer.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleRetailerClick(retailer.id)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div 
                  className={`w-4 h-4 rounded-full bg-${retailer.logoColor}-500`}
                />
                <img
                  src={getCompanyLogo(retailer.name)}
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

      {(!retailers || retailers.length === 0) && (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">
            <Store className="h-12 w-12 mx-auto text-gray-300 mb-2" />
            <p>No retailers available</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RetailersContent;
