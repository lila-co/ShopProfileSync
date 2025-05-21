import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { StoreDeal, Retailer } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';

const DealsView: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRetailerId, setSelectedRetailerId] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const { data: retailers, isLoading: loadingRetailers } = useQuery<Retailer[]>({
    queryKey: ['/api/retailers'],
  });
  
  const { data: storeDeals, isLoading: loadingDeals } = useQuery<StoreDeal[]>({
    queryKey: ['/api/deals', selectedRetailerId, selectedCategory],
  });
  
  const { data: categories } = useQuery<string[]>({
    queryKey: ['/api/deals/categories'],
  });
  
  const addToShoppingListMutation = useMutation({
    mutationFn: async (deal: StoreDeal) => {
      const response = await apiRequest('POST', '/api/shopping-list/items', {
        productName: deal.productName,
        suggestedRetailerId: deal.retailerId,
        suggestedPrice: deal.salePrice
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
      toast({
        title: "Item Added",
        description: "Item has been added to your shopping list."
      });
    }
  });
  
  const getColorClass = (retailerId: number) => {
    const retailer = retailers?.find(r => r.id === retailerId);
    const colorMap: Record<string, string> = {
      blue: 'bg-blue-500',
      red: 'bg-red-500',
      green: 'bg-green-500',
      yellow: 'bg-yellow-500',
      purple: 'bg-purple-500',
      pink: 'bg-pink-500',
      indigo: 'bg-indigo-500',
      gray: 'bg-gray-500',
    };
    
    return colorMap[retailer?.logoColor || 'blue'] || 'bg-primary';
  };
  
  const handleAddToList = (deal: StoreDeal) => {
    addToShoppingListMutation.mutate(deal);
  };
  
  return (
    <div className="p-4 pb-20">
      <h2 className="text-xl font-bold mb-4">Weekly Deals</h2>
      
      {/* Retailer filter */}
      <div className="mb-4">
        <h3 className="font-medium text-sm text-gray-700 mb-2">Filter by Store</h3>
        <div className="flex overflow-x-auto hide-scrollbar space-x-2 pb-2">
          <button
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap 
                      ${selectedRetailerId === null ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'}`}
            onClick={() => setSelectedRetailerId(null)}
          >
            All Stores
          </button>
          
          {loadingRetailers ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="h-8 w-20 bg-gray-200 rounded-full animate-pulse" />
            ))
          ) : (
            retailers?.map(retailer => (
              <button
                key={retailer.id}
                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap 
                          ${selectedRetailerId === retailer.id ? 
                            `${getColorClass(retailer.id)} text-white` : 
                            'bg-gray-100 text-gray-700'}`}
                onClick={() => setSelectedRetailerId(retailer.id)}
              >
                {retailer.name}
              </button>
            ))
          )}
        </div>
      </div>
      
      {/* Category filter */}
      {categories && categories.length > 0 && (
        <div className="mb-4">
          <h3 className="font-medium text-sm text-gray-700 mb-2">Filter by Category</h3>
          <div className="flex overflow-x-auto hide-scrollbar space-x-2 pb-2">
            <button
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap 
                        ${selectedCategory === null ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'}`}
              onClick={() => setSelectedCategory(null)}
            >
              All Categories
            </button>
            
            {categories.map((category, index) => (
              <button
                key={index}
                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap 
                          ${selectedCategory === category ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'}`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Deals list */}
      <div className="space-y-3 mt-4">
        {loadingDeals ? (
          Array(5).fill(0).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex justify-between">
                  <div className="space-y-2 w-full">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4 mb-1"></div>
                    <div className="h-10 flex justify-between">
                      <div className="h-6 bg-gray-200 rounded animate-pulse w-1/4"></div>
                      <div className="h-6 bg-gray-200 rounded animate-pulse w-1/4"></div>
                    </div>
                    <div className="h-8 bg-gray-200 rounded animate-pulse w-full mt-2"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : storeDeals && storeDeals.length > 0 ? (
          storeDeals.map((deal, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center">
                      <div className={`h-4 w-4 rounded-full ${getColorClass(deal.retailerId)} mr-2`}></div>
                      <h4 className="font-medium">{deal.productName}</h4>
                    </div>
                    {deal.category && (
                      <p className="text-xs text-gray-500 mt-1">{deal.category}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Valid until {new Date(deal.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="line-through text-gray-500 text-sm">${(deal.regularPrice / 100).toFixed(2)}</p>
                    <p className="text-secondary font-bold">${(deal.salePrice / 100).toFixed(2)}</p>
                    <p className="text-xs text-secondary">
                      Save ${((deal.regularPrice - deal.salePrice) / 100).toFixed(2)}
                    </p>
                  </div>
                </div>
                
                <Button
                  className="w-full mt-3 bg-primary text-white"
                  onClick={() => handleAddToList(deal)}
                  disabled={addToShoppingListMutation.isPending}
                >
                  Add to Shopping List
                </Button>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-gray-500">
              <p>No deals available with the current filters</p>
              <p className="text-sm mt-1">Try adjusting your filters or check back later</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DealsView;
