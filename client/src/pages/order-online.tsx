
import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ShoppingCart, CreditCard, MapPin, Clock, ExternalLink, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import BottomNavigation from '@/components/layout/BottomNavigation';

interface ShoppingItem {
  id: number;
  productName: string;
  quantity: number;
  unit: string;
  suggestedPrice: number;
  suggestedRetailer: {
    id: number;
    name: string;
    logoColor: string;
  };
}

interface PlanData {
  totalCost: number;
  estimatedTime: string;
  stores: Array<{
    retailer: {
      id: number;
      name: string;
      logoColor: string;
    };
    items: ShoppingItem[];
    subtotal: number;
  }>;
}

interface RetailerAccount {
  id: number;
  retailerId: number;
  isConnected: boolean;
  username?: string;
  allowOrdering?: boolean;
  retailerName?: string;
}

const OrderOnline: React.FC = () => {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const listId = searchParams.get('listId') || '1';
  
  const [selectedRetailer, setSelectedRetailer] = useState<number | null>(null);
  const [fulfillmentMethod, setFulfillmentMethod] = useState<'pickup' | 'delivery'>('pickup');
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: ''
  });
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Get plan data from session storage
  const [planData, setPlanData] = useState<PlanData | null>(null);

  useEffect(() => {
    const storedPlanData = sessionStorage.getItem('shoppingPlanData');
    if (storedPlanData) {
      try {
        setPlanData(JSON.parse(storedPlanData));
      } catch (error) {
        console.error('Error parsing plan data:', error);
      }
    }
  }, []);

  // Fetch connected retailer accounts
  const { data: connectedAccounts } = useQuery<RetailerAccount[]>({
    queryKey: ['/api/user/retailer-accounts'],
  });

  // Fetch shopping list items
  const { data: shoppingItems, isLoading } = useQuery({
    queryKey: ['shopping-items', listId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/shopping-lists/${listId}`);
      const data = await response.json();
      return data.items || [];
    },
  });

  const formatPrice = (price: number) => {
    return `$${(price / 100).toFixed(2)}`;
  };

  const getConnectedRetailers = () => {
    if (!connectedAccounts || !planData) return [];
    
    return planData.stores.filter(store => {
      const account = connectedAccounts.find(acc => 
        acc.retailerId === store.retailer.id && 
        acc.isConnected && 
        acc.allowOrdering
      );
      return account;
    }).map(store => ({
      ...store,
      account: connectedAccounts.find(acc => acc.retailerId === store.retailer.id)
    }));
  };

  const handleSubmitOrder = async () => {
    if (!selectedRetailer || !planData) {
      toast({
        title: "Selection Required",
        description: "Please select a retailer and ensure items are loaded",
        variant: "destructive"
      });
      return;
    }

    if (!customerInfo.name || !customerInfo.email || !customerInfo.phone) {
      toast({
        title: "Information Required",
        description: "Please fill in your contact information",
        variant: "destructive"
      });
      return;
    }

    if (fulfillmentMethod === 'delivery' && (!customerInfo.address || !customerInfo.city || !customerInfo.zipCode)) {
      toast({
        title: "Address Required",
        description: "Please fill in your delivery address",
        variant: "destructive"
      });
      return;
    }

    setIsSubmittingOrder(true);

    try {
      const selectedStore = planData.stores.find(store => store.retailer.id === selectedRetailer);
      if (!selectedStore) {
        throw new Error("Selected retailer not found in plan");
      }

      // Prepare order data with affiliate attribution
      const orderData = {
        retailerId: selectedRetailer,
        items: selectedStore.items.map(item => ({
          productName: item.productName,
          quantity: item.quantity,
          unit: item.unit,
          estimatedPrice: item.suggestedPrice
        })),
        fulfillmentMethod,
        customerInfo,
        affiliateData: {
          source: 'smartcart',
          planId: `${listId}-${Date.now()}`,
          affiliateId: 'smartcart-affiliate-001',
          trackingParams: {
            listId,
            planType: planData.planType || 'unknown',
            totalItems: selectedStore.items.length,
            estimatedValue: selectedStore.subtotal
          }
        }
      };

      const response = await apiRequest('POST', '/api/orders/submit', orderData);
      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Order Submitted Successfully!",
          description: `Order #${result.orderId} has been placed. You will receive confirmation soon.`,
        });

        // Navigate to order confirmation or back to dashboard
        navigate(`/order-confirmation?orderId=${result.orderId}&retailerId=${selectedRetailer}`);
      } else {
        throw new Error(result.message || 'Failed to submit order');
      }

    } catch (error: any) {
      console.error('Order submission error:', error);
      toast({
        title: "Order Failed",
        description: error.message || "Failed to submit order. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const connectedRetailers = getConnectedRetailers();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading your order...</div>
      </div>
    );
  }

  if (!planData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">No plan data found. Please go back and select a plan.</div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/plan-details')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Plans
        </Button>
        <h1 className="text-2xl font-bold">Order Online</h1>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 pb-20 space-y-6">

        {/* Affiliate Benefits Banner */}
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-green-600" />
              <div>
                <div className="font-semibold text-green-800">SmartCart Benefits</div>
                <div className="text-sm text-green-600">
                  Get exclusive cashback and deals when ordering through SmartCart
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Connected Retailers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Select Retailer
            </CardTitle>
            <CardDescription>
              Choose from your connected store accounts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {connectedRetailers.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-500 mb-4">No connected retailers with online ordering available</p>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/profile')}
                >
                  Connect Store Accounts
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {connectedRetailers.map((store) => (
                  <div 
                    key={store.retailer.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedRetailer === store.retailer.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedRetailer(store.retailer.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className={`w-4 h-4 rounded-full bg-${store.retailer.logoColor}-500`}
                        />
                        <div>
                          <div className="font-medium">{store.retailer.name}</div>
                          <div className="text-sm text-gray-500">
                            {store.items.length} items • {formatPrice(store.subtotal)}
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary">Connected</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fulfillment Method */}
        {selectedRetailer && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Fulfillment Method
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={fulfillmentMethod} onValueChange={(value: 'pickup' | 'delivery') => setFulfillmentMethod(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pickup">Store Pickup</SelectItem>
                  <SelectItem value="delivery">Home Delivery</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {/* Customer Information */}
        {selectedRetailer && (
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="john@example.com"
                />
              </div>

              {fulfillmentMethod === 'delivery' && (
                <>
                  <div>
                    <Label htmlFor="address">Delivery Address *</Label>
                    <Input
                      id="address"
                      value={customerInfo.address}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="123 Main St"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        value={customerInfo.city}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, city: e.target.value }))}
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <Label htmlFor="zipCode">ZIP *</Label>
                      <Input
                        id="zipCode"
                        value={customerInfo.zipCode}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, zipCode: e.target.value }))}
                        placeholder="12345"
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Order Summary */}
        {selectedRetailer && (
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const selectedStore = planData.stores.find(store => store.retailer.id === selectedRetailer);
                if (!selectedStore) return null;

                return (
                  <div className="space-y-3">
                    {selectedStore.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{item.productName}</div>
                          <div className="text-sm text-gray-500">
                            {item.quantity} {item.unit.toLowerCase()}
                          </div>
                        </div>
                        <div className="text-right">
                          {formatPrice(item.suggestedPrice * item.quantity)}
                        </div>
                      </div>
                    ))}
                    <div className="border-t pt-3">
                      <div className="flex justify-between items-center font-semibold">
                        <span>Estimated Total</span>
                        <span>{formatPrice(selectedStore.subtotal)}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        *Final total may vary based on actual prices and fees
                      </div>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* Submit Order Button */}
        {selectedRetailer && (
          <Button 
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold shadow-lg"
            size="lg"
            onClick={handleSubmitOrder}
            disabled={isSubmittingOrder}
          >
            {isSubmittingOrder ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Submitting Order...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Submit Order with SmartCart Benefits
              </>
            )}
          </Button>
        )}

        {/* Disclaimer */}
        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="p-4">
            <div className="text-xs text-gray-600 space-y-2">
              <p>
                <strong>Important:</strong> Your order will be processed through the retailer's website 
                using your connected account credentials. SmartCart acts as an affiliate partner to 
                provide you with exclusive benefits and cashback opportunities.
              </p>
              <p>
                By submitting this order, you agree to SmartCart's Terms of Service and Privacy Policy. 
                All transactions are secured and processed by the retailer.
              </p>
            </div>
          </CardContent>
        </Card>

      </main>

      <BottomNavigation activeTab="shop" />
    </div>
  );
};

export default OrderOnline;
