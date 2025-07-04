
import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { ShoppingCart, CheckCircle, ArrowLeft } from 'lucide-react';

interface CartItem {
  name: string;
  quantity: number;
}

const RetailerCartDemo: React.FC = () => {
  const [location, navigate] = useLocation();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [retailerName, setRetailerName] = useState('Retailer');
  const [affiliateInfo, setAffiliateInfo] = useState<any>({});

  useEffect(() => {
    // Parse URL parameters to extract cart items and affiliate info
    const urlParams = new URLSearchParams(location.split('?')[1] || '');
    
    // Extract retailer from URL path
    const path = location.split('?')[0];
    if (path.includes('walmart')) setRetailerName('Walmart');
    else if (path.includes('target')) setRetailerName('Target');
    else if (path.includes('kroger')) setRetailerName('Kroger');
    else if (path.includes('wholefoodsmarket')) setRetailerName('Whole Foods Market');

    // Extract cart items
    const items: CartItem[] = [];
    let itemIndex = 1;
    while (urlParams.has(`item${itemIndex}`)) {
      const itemName = decodeURIComponent(urlParams.get(`item${itemIndex}`) || '');
      const quantity = parseInt(urlParams.get(`qty${itemIndex}`) || '1');
      if (itemName) {
        items.push({ name: itemName, quantity });
      }
      itemIndex++;
    }
    setCartItems(items);

    // Extract affiliate information
    setAffiliateInfo({
      source: urlParams.get('utm_source'),
      campaign: urlParams.get('utm_campaign'),
      affiliateId: urlParams.get('affiliate_id'),
      cartToken: urlParams.get('cart_token'),
      trackingId: urlParams.get('tracking_id')
    });
  }, [location]);

  const getRetailerColor = () => {
    switch (retailerName.toLowerCase()) {
      case 'walmart': return 'blue';
      case 'target': return 'red';
      case 'kroger': return 'blue';
      case 'whole foods market': return 'green';
      default: return 'gray';
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white min-h-screen p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.close()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">{retailerName} Cart</h1>
        </div>
        <div className={`w-8 h-8 rounded-full bg-${getRetailerColor()}-500`} />
      </div>

      {/* SmartCart Integration Success Banner */}
      <Card className="border-green-200 bg-green-50 mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <div>
              <div className="font-semibold text-green-800">
                SmartCart Integration Successful!
              </div>
              <div className="text-sm text-green-600">
                Your items have been added to your {retailerName} cart with affiliate benefits applied
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cart Items */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Your Cart ({cartItems.length} items)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cartItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No items found in cart</p>
              <p className="text-sm">Items should have been added automatically from SmartCart</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cartItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-gray-500">Quantity: {item.quantity}</div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary">Added by SmartCart</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Affiliate Information */}
      {affiliateInfo.source && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">SmartCart Benefits Applied</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Affiliate Source:</span>
                <div className="text-gray-600">{affiliateInfo.source}</div>
              </div>
              <div>
                <span className="font-medium">Campaign:</span>
                <div className="text-gray-600">{affiliateInfo.campaign}</div>
              </div>
              <div>
                <span className="font-medium">Tracking ID:</span>
                <div className="text-gray-600 font-mono text-xs">{affiliateInfo.trackingId}</div>
              </div>
              <div>
                <span className="font-medium">Cart Token:</span>
                <div className="text-gray-600 font-mono text-xs">{affiliateInfo.cartToken}</div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-800">
                <strong>Benefits:</strong> You'll earn cashback and exclusive deals through SmartCart when you complete this purchase.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="space-y-4">
        <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 text-lg min-h-[56px] touch-manipulation">
          Proceed to Checkout
        </Button>
        <Button variant="outline" className="w-full py-4 text-lg min-h-[56px] touch-manipulation" onClick={() => window.close()}>
          Continue Shopping
        </Button>
      </div>

      {/* Disclaimer */}
      <Card className="mt-6 border-gray-200 bg-gray-50">
        <CardContent className="p-4">
          <div className="text-xs text-gray-600">
            <strong>Demo Notice:</strong> This is a demonstration of SmartCart's cart integration feature. 
            In a real implementation, these items would be added directly to your actual {retailerName} account 
            and you could proceed with checkout normally. Your affiliate benefits and cashback would be tracked automatically.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RetailerCartDemo;
