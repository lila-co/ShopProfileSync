import React, { useState, startTransition } from 'react';
import Header from '@/components/layout/Header';
import BottomNavigation from '@/components/layout/BottomNavigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Store, ExternalLink, CheckCircle, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

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
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddStore, setShowAddStore] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');

  const { data: retailers, isLoading } = useQuery<Retailer[]>({
    queryKey: ['/api/retailers'],
    suspense: false,
  });

  const { data: connectedAccounts } = useQuery<RetailerAccount[]>({
    queryKey: ['/api/user/retailer-accounts'],
    suspense: false,
  });

  const addStoreMutation = useMutation({
    mutationFn: async (storeName: string) => {
      const response = await apiRequest('POST', '/api/retailers', {
        name: storeName,
        logoColor: 'blue'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/retailers'] });
      setShowAddStore(false);
      setNewStoreName('');
      toast({
        title: "Store Added",
        description: "Your custom store has been added successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add store. Please try again.",
        variant: "destructive"
      });
    }
  });

  const isConnected = (retailerId: number) => {
    return connectedAccounts?.some(account => account.retailerId === retailerId && account.isConnected);
  };

  const handleRetailerClick = (retailerId: number) => {
    startTransition(() => {
      navigate(`/retailers/${retailerId}`);
    });
  };

  const handleAddStore = () => {
    if (newStoreName.trim()) {
      addStoreMutation.mutate(newStoreName.trim());
    }
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
            <Card key={retailer.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4" onClick={() => handleRetailerClick(retailer.id)}>
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

        {/* Add Custom Store Section */}
        <div className="mt-6">
          <Dialog open={showAddStore} onOpenChange={setShowAddStore}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Custom Store
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Custom Store</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="storeName">Store Name</Label>
                  <Input
                    id="storeName"
                    value={newStoreName}
                    onChange={(e) => setNewStoreName(e.target.value)}
                    placeholder="Enter store name"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowAddStore(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAddStore}
                    disabled={!newStoreName.trim() || addStoreMutation.isPending}
                  >
                    {addStoreMutation.isPending ? 'Adding...' : 'Add Store'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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