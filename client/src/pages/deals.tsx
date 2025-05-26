import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { apiRequest } from '@/lib/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
        {deals?.map((deal: Deal) => (
          <Card key={deal.id} className="bg-white shadow-md rounded-md overflow-hidden">
            <CardHeader>
              <CardTitle>{deal.productName}</CardTitle>
              <CardDescription>{deal.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <img src={deal.imageUrl} alt={deal.productName} className="w-full h-48 object-cover mb-4" />
              <p className="text-2xl font-bold text-gray-800">${deal.price}</p>
            </CardContent>
            <CardFooter className="flex justify-between items-center">
              <Button 
                        size="sm" 
                        className="w-full"
                        onClick={() => addDealToListMutation.mutate(deal)}
                        disabled={addDealToListMutation.isPending}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {addDealToListMutation.isPending ? 'Adding...' : 'Add to List'}
                      </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DealsView;