import React from 'react';
import { Recommendation } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface RecommendationCardProps {
  recommendation: Recommendation;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({ recommendation }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const addToShoppingListMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/shopping-list/items', {
        productName: recommendation.productName,
        quantity: 1,
        unit: 'COUNT'
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });

      if (data.merged) {
        toast({
          title: "Items Combined",
          description: data.message || `Added quantity to existing "${data.productName}" item.`,
          variant: "default"
        });
      } else if (data.corrected) {
        toast({
          title: "Item Added",
          description: `Added as "${data.productName}" (corrected from "${data.originalName}")`,
          variant: "default"
        });
      } else {
        toast({
          title: "Item Added",
          description: `${recommendation.productName} has been added to your shopping list.`
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to Add Item",
        description: "Could not add item to shopping list.",
        variant: "destructive"
      });
    }
  });

  const isUrgent = recommendation.daysUntilPurchase !== undefined && recommendation.daysUntilPurchase <= 3;

  return (
    <div className={`bg-white rounded-xl shadow-sm p-4 border ${isUrgent ? 'border-green-100' : 'border-gray-100'}`}>
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-medium text-gray-800">{recommendation.productName}</h4>
          <p className={`${isUrgent ? 'text-green-600' : 'text-gray-600'} text-sm font-medium mt-1`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>
              {isUrgent 
                ? `Running low - purchase in ${recommendation.daysUntilPurchase} days` 
                : recommendation.daysUntilPurchase 
                  ? `Consider restocking in ${recommendation.daysUntilPurchase} days` 
                  : 'Consider adding to your shopping list'}
            </span>
          </p>
        </div>
        {recommendation.savings && recommendation.savings > 0 && (
          <div className="bg-secondary/10 py-1 px-3 rounded-full">
            <span className="text-secondary font-medium text-sm">Save ${(recommendation.savings / 100).toFixed(2)}</span>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/>
                <path d="M3 9V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4"/>
                <path d="M21 9V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v4"/>
                <path d="M9 21v-6"/>
                <path d="M15 21v-6"/>
              </svg>
            </div>
            <div>
              <p className="font-medium text-sm">{recommendation.suggestedRetailer?.name || 'Best retailer'}</p>
              <p className="text-xs text-gray-700">{recommendation.reason || 'Best price available'}</p>
            </div>
          </div>
          <span className="font-bold text-gray-800">
            ${recommendation.suggestedPrice ? (recommendation.suggestedPrice / 100).toFixed(2) : '0.00'}
          </span>
        </div>

        <Button
          className={`mt-3 w-full ${isUrgent ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700'}`}
          onClick={() => addToShoppingListMutation.mutate()}
          disabled={addToShoppingListMutation.isPending}
        >
          {addToShoppingListMutation.isPending ? 'Adding...' : 'Add to Shopping List'}
        </Button>
      </div>
    </div>
  );
};

export default RecommendationCard;