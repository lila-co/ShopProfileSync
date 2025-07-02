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
    <div className={`bg-white rounded-xl shadow-sm p-4 border transition-all duration-200 hover:shadow-md ${isUrgent ? 'border-orange-200 bg-gradient-to-br from-orange-50 to-red-50' : 'border-gray-100 hover:border-blue-200'}`}>
      {/* AI Insight Badge */}
      {recommendation.aiInsight && (
        <div className="mb-3">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border border-blue-200">
            <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L13.09 8.26L19 9L13.09 9.74L12 16L10.91 9.74L5 9L10.91 8.26L12 2Z"/>
            </svg>
            AI: {recommendation.aiInsight}
          </span>
        </div>
      )}

      {/* Urgency Badge */}
      {isUrgent && (
        <div className="mb-2">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Running Low
          </span>
        </div>
      )}

      {/* Confidence Score */}
      {recommendation.confidence && recommendation.confidence > 0.7 && (
        <div className="mb-2">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            recommendation.confidence > 0.9 
              ? 'bg-green-100 text-green-700' 
              : recommendation.confidence > 0.8 
                ? 'bg-blue-100 text-blue-700'
                : 'bg-yellow-100 text-yellow-700'
          }`}>
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            {Math.round(recommendation.confidence * 100)}% AI confidence
          </span>
        </div>
      )}

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
          <div className="bg-pink-100 py-1 px-3 rounded-full">
            <span className="text-pink-700 font-medium text-sm">Save ${(recommendation.savings / 100).toFixed(2)}</span>
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
              <p className="font-medium text-sm text-gray-800">{recommendation.suggestedRetailer?.name || 'Best retailer'}</p>
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