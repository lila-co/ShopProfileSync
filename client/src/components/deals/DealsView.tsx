import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { ShoppingCart, Store, Clock, Plus, MapPin } from 'lucide-react';
import { getBestProductImage } from "../../lib/imageUtils";
import { aiCategorizationService } from "../../lib/aiCategorization";

import type { StoreDeal, Retailer } from '@/lib/types';

interface DealsViewProps {
  searchQuery?: string;
  activeFilter?: string | null;
  retailerId?: number | null;
}

const DealsView: React.FC<DealsViewProps> = ({ searchQuery = '', activeFilter = null, retailerId = null }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [nearbyRetailerIds, setNearbyRetailerIds] = useState<number[]>([]);
  const { data: retailers, isLoading: loadingRetailers } = useQuery<Retailer[]>({
    queryKey: ['/api/retailers'],
  });

  // Get user location for nearby filtering
  useEffect(() => {
    if (activeFilter === 'nearby' && !userLocation) {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const location = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            setUserLocation(location);
            fetchNearbyRetailers(location);
          },
          (error) => {
            console.warn('Geolocation failed, using fallback nearby logic:', error);
            // Fallback to nearby retailers based on common locations
            setNearbyRetailerIds([1, 2, 3]);
          }
        );
      } else {
        // Fallback for browsers without geolocation
        setNearbyRetailerIds([1, 2, 3]);
      }
    }
  }, [activeFilter]);

  const fetchNearbyRetailers = async (location: {lat: number, lng: number}) => {
    try {
      const response = await fetch(`/api/retailers/nearby?lat=${location.lat}&lng=${location.lng}&maxDistance=25`, {
        credentials: 'include',
      });
      if (response.ok) {
        const nearbyStores = await response.json();
        const retailerIds = nearbyStores.map((store: any) => store.retailerId);
        setNearbyRetailerIds(retailerIds);
      } else {
        // Fallback to default nearby retailers
        setNearbyRetailerIds([1, 2, 3]);
      }
    } catch (error) {
      console.warn('Failed to fetch nearby retailers:', error);
      setNearbyRetailerIds([1, 2, 3]);
    }
  };

  const { data: storeDeals, isLoading: loadingDeals } = useQuery<StoreDeal[]>({
    queryKey: ['/api/deals', { retailerId, category: activeFilter, nearbyRetailerIds }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (retailerId) {
        params.append('retailerId', retailerId.toString());
      }
      if (activeFilter) {
        params.append('category', activeFilter);
      }

      const response = await fetch(`/api/deals?${params.toString()}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch deals');
      }
      return response.json();
    },
  });

  // Enhanced product image with AI categorization and fallback
  const [productImages, setProductImages] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadProductImages = async () => {
      if (!storeDeals?.length) return;

      const imagePromises = storeDeals.map(async (deal) => {
        // Get AI category for better image matching
        const aiCategory = aiCategorizationService.getQuickCategory(deal.productName);

        // Use enhanced image matching with category awareness
        const image = await getBestProductImage(
          deal.productName, 
          deal.imageUrl, 
          aiCategory.category,
          false // Set to true if you want to enable AI image generation
        );

        return { dealId: deal.id, image };
      });

      const results = await Promise.all(imagePromises);
      const imageMap = results.reduce((acc, { dealId, image }) => {
        if (image) acc[dealId] = image;
        return acc;
      }, {} as Record<string, string>);

      setProductImages(imageMap);
    };

    loadProductImages();
  }, [storeDeals]);


  const addToShoppingListMutation = useMutation({
    mutationFn: async (deal: StoreDeal) => {
      const response = await apiRequest('POST', '/api/shopping-list/items', {
        productName: deal.productName,
        quantity: 1,
        unit: 'COUNT',
        suggestedRetailerId: deal.retailerId,
        suggestedPrice: Math.round(deal.salePrice * 100) // Convert dollars to cents
      });
      return response.json();
    },
    onSuccess: () => {
      // Invalidate shopping list queries directly
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
      queryClient.refetchQueries({ queryKey: ['/api/shopping-lists'] });

      toast({
        title: "Added to List",
        description: "Item has been added to your shopping list."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add item to shopping list",
        variant: "destructive"
      });
    }
  });

  const getRetailerColor = (retailerId: number) => {
    const retailer = retailers?.find(r => r.id === retailerId);
    const colorMap: Record<string, string> = {
      blue: 'bg-blue-500',
      red: 'bg-red-500',
      green: 'bg-green-500',
      yellow: 'bg-yellow-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500',
      pink: 'bg-pink-500',
      indigo: 'bg-indigo-500',
    };
    return colorMap[retailer?.logoColor || 'blue'] || 'bg-gray-500';
  };

  const getRetailerName = (retailerId: number) => {
    return retailers?.find(r => r.id === retailerId)?.name || 'Unknown Store';
  };

  const calculateSavings = (regular: number, sale: number) => {
    return Math.round((1 - sale / regular) * 100);
  };

  if (loadingDeals) {
    return (
      <div className="px-4 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="px-4">
      {/* Store Filter - Only show if not filtered by retailerId prop */}
      {!retailerId && (
        <div className="mb-4">
          <Select value="all" onValueChange={() => {}}>
            <SelectTrigger className="h-10 bg-gray-50 border-0">
              <SelectValue placeholder="All Stores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stores</SelectItem>
              {retailers?.map((retailer) => (
                <SelectItem key={retailer.id} value={retailer.id.toString()}>
                  {retailer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Deals Grid */}
      {storeDeals && storeDeals.length > 0 ? (
        <div className="space-y-3 pb-8">
          {storeDeals
            .filter(deal => {
              // Filter by search query
              const matchesSearch = searchQuery === '' || 
                deal.productName.toLowerCase().includes(searchQuery.toLowerCase());

              // Filter by active filter
              const matchesFilter = !activeFilter || 
                (activeFilter === 'featured' && deal.salePrice < deal.regularPrice * 0.7) ||
                (activeFilter === 'nearby' && nearbyRetailerIds.includes(deal.retailerId));

              return matchesSearch && matchesFilter;
            })
            .map((deal) => (
            <Card key={deal.id} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Product Image */}
                  <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <img
                    src={productImages[deal.id] || deal.imageUrl || 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=200&h=200&fit=crop'}
                    alt={deal.productName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=200&h=200&fit=crop';
                    }}
                  />
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">
                      {deal.productName}
                    </h3>

                    {/* Store Info */}
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className={`h-5 w-5 ${getRetailerColor(deal.retailerId)}`}>
                        <AvatarFallback className="text-xs text-white font-semibold">
                          {getRetailerName(deal.retailerId).charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-gray-600">
                        {getRetailerName(deal.retailerId)}
                      </span>
                    </div>

                    {/* Price and Savings */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-gray-900">
                          ${deal.salePrice.toFixed(2)}
                        </span>
                        <span className="text-sm text-gray-500 line-through">
                          ${deal.regularPrice.toFixed(2)}
                        </span>
                      </div>
                      <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                        {calculateSavings(deal.regularPrice, deal.salePrice)}% off
                      </Badge>
                    </div>

                    {/* Deal Timeline */}
                    <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      <span>
                        Valid until {new Date(deal.endDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Add Button */}
                  <div className="flex flex-col justify-center">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-8 h-8 p-0 rounded-full border-2"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        addToShoppingListMutation.mutate(deal);
                      }}
                      disabled={addToShoppingListMutation.isPending}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Store className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No deals found</h3>
          <p className="text-sm text-gray-500 max-w-xs mx-auto">
            {searchQuery ? 
              `No deals found for "${searchQuery}". Try adjusting your search or filters.` :
              'Check back later for new deals and offers.'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export { DealsView };