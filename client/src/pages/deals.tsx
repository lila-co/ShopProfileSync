import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { apiRequest } from '@/lib/queryClient';
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


  const retailers = [
    { label: 'All Retailers', value: 'all' },
    { label: 'Amazon', value: 'amazon' },
    { label: 'Walmart', value: 'walmart' },
  ];

  const categories = [
    { label: 'All Categories', value: 'all' },
    { label: 'Electronics', value: 'electronics' },
    { label: 'Home Goods', value: 'home-goods' },
  ];



  if (isLoadingDeals) return <div>Loading deals...</div>;

  return (
    <div className="container mx-auto py-6">

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Select onValueChange={handleRetailerChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Retailer" />
          </SelectTrigger>
          <SelectContent>
            {retailers.map((retailer) => (
              <SelectItem key={retailer.value} value={retailer.value}>
                {retailer.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
        {deals?.map((deal: Deal) => (
          <Card key={deal.id} className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-100">
            <CardContent className="p-3">
              <div className="aspect-square mb-2 overflow-hidden rounded-md">
                <img src={deal.imageUrl} alt={deal.productName} className="w-full h-full object-cover" />
              </div>
              <h3 className="font-medium text-sm line-clamp-2 mb-1">{deal.productName}</h3>
              <p className="text-lg font-bold text-primary mb-2">${deal.price}</p>
              <Button 
                size="sm" 
                className="w-full h-8 text-xs"
                onClick={() => addDealToListMutation.mutate(deal)}
                disabled={addDealToListMutation.isPending}
              >
                <Plus className="h-3 w-3 mr-1" />
                {addDealToListMutation.isPending ? 'Adding...' : 'Add'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DealsView;