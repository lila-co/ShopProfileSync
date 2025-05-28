import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { apiRequest } from '@/lib/queryClient';
import BottomNavigation from '@/components/layout/BottomNavigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Add CSS for line clamping
const styles = `
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

interface Deal {
  id: string;
  productName: string;
  description: string;
  price: number;
  imageUrl: string;
  retailerId: string;
  category: string;
}

const DealsView: React.FC = () => {
  const [selectedRetailer, setSelectedRetailer] = React.useState<string>('all');
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const queryClient = useQueryClient();
  const { toast } = useToast()

  const { data: deals, isLoading: isLoadingDeals } = useQuery({
    queryKey: ['/api/deals', selectedRetailer, selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedRetailer && selectedRetailer !== 'all') {
        params.append('retailerId', selectedRetailer);
      }
      if (selectedCategory && selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }

      const response = await fetch(`/api/deals?${params}`);
      return response.json();
    }
  });

  // Fetch retailers for filter
  const { data: retailers, isLoading: isLoadingRetailers } = useQuery({
    queryKey: ['/api/retailers'],
    queryFn: async () => {
      const response = await fetch('/api/retailers');
      return response.json();
    }
  });

  // Fetch categories for filter
  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['/api/deals/categories'],
    queryFn: async () => {
      const response = await fetch('/api/deals/categories');
      return response.json();
    }
  });

  // Add deal to shopping list mutation
  const addDealToListMutation = useMutation({
    mutationFn: async (deal: any) => {
      const response = await apiRequest('POST', '/api/shopping-list/items', {
        productName: deal.productName,
        quantity: 1,
        unit: 'COUNT'
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
      toast({
        title: "Item Added",
        description: `${data.productName} added to your shopping list`
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to add item to shopping list",
        variant: "destructive"
      });
    }
  });

  const handleRetailerChange = (value: string) => {
    setSelectedRetailer(value);
  };

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
  };


  // Build retailer options
  const retailerOptions = [
    { label: 'All Retailers', value: 'all' },
    ...(retailers || []).map(retailer => ({
      label: retailer.name,
      value: retailer.id.toString()
    }))
  ];

  // Build category options
  const categoryOptions = [
    { label: 'All Categories', value: 'all' },
    ...(categories || []).map(category => ({
      label: category,
      value: category
    }))
  ];



  if (isLoadingDeals) {
    return (
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">Weekly Deals</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <Card key={index} className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-100">
              <CardContent className="p-3">
                <div className="aspect-square mb-2 overflow-hidden rounded-md bg-gray-200 animate-pulse" />
                <div className="h-4 bg-gray-200 rounded animate-pulse mb-1" />
                <div className="h-6 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-8 bg-gray-200 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Weekly Deals</h1>

      <div className="flex flex-wrap gap-4 mb-6">
        <Select onValueChange={handleRetailerChange} value={selectedRetailer}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Retailer" />
          </SelectTrigger>
          <SelectContent>
            {isLoadingRetailers ? (
              <SelectItem value="loading" disabled>Loading retailers...</SelectItem>
            ) : (
              retailerOptions.map((retailer) => (
                <SelectItem key={retailer.value} value={retailer.value}>
                  {retailer.label}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        <Select onValueChange={handleCategoryChange} value={selectedCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Category" />
          </SelectTrigger>
          <SelectContent>
            {isLoadingCategories ? (
              <SelectItem value="loading" disabled>Loading categories...</SelectItem>
            ) : (
              categoryOptions.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {deals && deals.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {deals.map((deal: Deal) => (
            <Card key={`${deal.id}-${deal.retailerId}`} className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-100 hover:shadow-md transition-shadow">
              <CardContent className="p-3">
                <div className="aspect-square mb-2 overflow-hidden rounded-md bg-gray-100">
                  <img 
                    src={deal.imageUrl || `https://images.unsplash.com/photo-1506617420156-8e4536971650?w=400&h=400&fit=crop&crop=center`} 
                    alt={deal.productName} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to a generic product image
                      e.currentTarget.src = `https://images.unsplash.com/photo-1506617420156-8e4536971650?w=400&h=400&fit=crop&crop=center`;
                    }}
                  />
                </div>
                <h3 className="font-medium text-sm line-clamp-2 mb-1" title={deal.productName}>
                  {deal.productName}
                </h3>
                <div className="flex flex-col gap-1 mb-2">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500 line-through">
                      ${((deal.price || 0) / 100 * 1.3).toFixed(2)}
                    </span>
                    <span className="text-lg font-bold text-primary">
                      ${((deal.price || 0) / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="text-xs text-green-600 font-medium">
                    Save ${(((deal.price || 0) / 100) * 0.3).toFixed(2)} (23% off)
                  </div>
                  {deal.category && (
                    <span className="text-xs text-gray-500 ml-auto">
                      {deal.category}
                    </span>
                  )}
                </div>
                <Button 
                  size="sm" 
                  className="w-full h-8 text-xs"
                  onClick={() => addDealToListMutation.mutate(deal)}
                  disabled={addDealToListMutation.isPending}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {addDealToListMutation.isPending ? 'Adding...' : 'Add to List'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg mb-2">No deals found</p>
          <p className="text-gray-400 text-sm">Try adjusting your filters or check back later for new deals.</p>
        </div>
      )}
      <BottomNavigation activeTab="deals" />
    </div>
  );
};

export default DealsView;