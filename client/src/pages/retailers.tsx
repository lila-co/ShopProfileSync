import React from 'react';
import Header from '@/components/layout/Header';
import BottomNavigation from '@/components/layout/BottomNavigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { Store, ExternalLink, CheckCircle } from 'lucide-react';

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
  const { data: retailers, isLoading } = useQuery<Retailer[]>({
    queryKey: ['/api/retailers'],
  });

  const { data: connectedAccounts } = useQuery<RetailerAccount[]>({
    queryKey: ['/api/user/retailer-accounts'],
  });

  const isConnected = (retailerId: number) => {
    return connectedAccounts?.some(account => account.retailerId === retailerId && account.isConnected);
  };

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
        <Header title="Retailers" />
        <main className="flex-1 overflow-y-auto p-4">
          <div>Loading retailers...</div>
        </main>
        <BottomNavigation activeTab="retailers" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
      <Header title="Retailers" />

      <main className="flex-1 overflow-y-auto p-4 pb-20">
        <h2 className="text-xl font-bold mb-4">Partner Retailers</h2>

        <div className="space-y-4">
          {retailers?.map((retailer) => (
            <Card key={retailer.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className={`w-4 h-4 rounded-full bg-${retailer.logoColor}-500`}
                    />
                    <Store className="h-6 w-6 text-gray-600" />
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
      </main>

      <BottomNavigation activeTab="stores" />
    </div>
  );
};

export default RetailersPage;