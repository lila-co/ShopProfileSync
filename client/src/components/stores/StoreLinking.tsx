import React from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Retailer, RetailerAccount } from '@/lib/types';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

const StoreLinking: React.FC = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: retailers, isLoading } = useQuery<Retailer[]>({
    queryKey: ['/api/retailers'],
  });

  const { data: connectedAccounts } = useQuery<RetailerAccount[]>({
    queryKey: ['/api/user/retailer-accounts'],
  });

  const connectRetailerMutation = useMutation({
    mutationFn: async (retailerId: number) => {
      // In a real app, this would redirect to OAuth or show a credential input form
      // For this demo, we'll just simulate connecting by creating a retailer account
      const response = await apiRequest('POST', '/api/user/retailer-accounts', {
        retailerId,
        isConnected: true
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/retailer-accounts'] });
      toast({
        title: "Store Connected",
        description: "Your store account has been successfully linked."
      });
    },
    onError: (error) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect store account. Please try again.",
        variant: "destructive"
      });
    }
  });

  const isConnected = (retailerId: number) => {
    return connectedAccounts?.some(account => account.retailerId === retailerId && account.isConnected);
  };

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string, icon: string }> = {
      blue: { bg: 'bg-blue-100', icon: 'text-blue-600' },
      red: { bg: 'bg-red-100', icon: 'text-red-600' },
      green: { bg: 'bg-green-100', icon: 'text-green-600' },
      yellow: { bg: 'bg-yellow-100', icon: 'text-yellow-600' },
      purple: { bg: 'bg-purple-100', icon: 'text-purple-600' },
      pink: { bg: 'bg-pink-100', icon: 'text-pink-600' },
      indigo: { bg: 'bg-indigo-100', icon: 'text-indigo-600' },
      gray: { bg: 'bg-gray-100', icon: 'text-gray-600' },
    };

    return colorMap[color] || colorMap.blue;
  };

  return (
    <div className="fixed inset-0 bg-white p-4 z-20">
      <div className="flex justify-between items-center mb-4">
        <button 
          className="text-gray-600" 
          onClick={() => navigate('/')}
          aria-label="Go back"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 19-7-7 7-7"/>
            <path d="M5 12h14"/>
          </svg>
        </button>
        <h2 className="text-lg font-bold">Link Store Account</h2>
        <div className="w-8"></div>
      </div>

      <p className="text-gray-600 mb-6">
        Connect your store accounts to automatically import your purchase history and get personalized recommendations.
      </p>

      <div className="space-y-3 mb-6">
        {isLoading ? (
          // Skeleton loading
          Array(4).fill(0).map((_, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="h-12 w-12 rounded-full bg-gray-200 animate-pulse mr-3"></div>
                  <div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-24 mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-40"></div>
                  </div>
                </div>
                <div className="h-8 bg-gray-200 rounded animate-pulse w-20"></div>
              </div>
            </div>
          ))
        ) : (
          // Actual retailer list
          (retailers || []).map((retailer) => {
            const colorClasses = getColorClasses(retailer.logoColor || 'blue');
            const connected = isConnected(retailer.id);

            return (
              <div key={retailer.id} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className={`h-12 w-12 rounded-full ${colorClasses.bg} flex items-center justify-center mr-3`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${colorClasses.icon}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/>
                        <path d="M3 9V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4"/>
                        <path d="M21 9V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v4"/>
                        <path d="M9 21v-6"/>
                        <path d="M15 21v-6"/>
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-medium">{retailer.name}</h4>
                      <p className="text-xs text-gray-500">Online & in-store purchases</p>
                    </div>
                  </div>
                  <Button
                    className={connected ? "py-1.5 px-4 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium" : "py-1.5 px-4 bg-primary text-white rounded-lg text-sm font-medium"}
                    onClick={() => connectRetailerMutation.mutate(retailer.id)}
                    disabled={connected || connectRetailerMutation.isPending}
                  >
                    {connected ? 'Connected' : 'Connect'}
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="text-center">
        <p className="text-sm text-gray-500 mb-3">Don't see your store?</p>
        <Button 
          className="py-2 px-4 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium"
          onClick={() => {
            toast({
              title: "Coming Soon",
              description: "Custom store addition will be available in a future update."
            });
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14"/>
            <path d="M5 12h14"/>
          </svg>
          Add Custom Store
        </Button>
      </div>
    </div>
  );
};

export default StoreLinking;