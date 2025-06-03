import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { Eye, EyeOff, Lock, ExternalLink, RefreshCw, Plus, Check, AlertCircle, Store, CheckCircle } from 'lucide-react';
import { getCompanyLogo } from '@/lib/imageUtils';

interface Retailer {
  id: number;
  name: string;
  logoColor: string;
}

interface RetailerAccount {
  id: number;
  retailerId: number;
  isConnected: boolean;
  username?: string;
  allowOrdering?: boolean;
  storeCredentials?: boolean;
  lastSync?: string;
  retailerName?: string;
}

const RetailerLinking: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedRetailer, setSelectedRetailer] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [allowOrdering, setAllowOrdering] = useState(true);
  const [loyaltyCardNumber, setLoyaltyCardNumber] = useState('');
  const [loyaltyMemberId, setLoyaltyMemberId] = useState('');
  const [connectionType, setConnectionType] = useState<'account' | 'email'>('account'); // Added connection type state

  // Get all available retailers
  const { data: retailers, isLoading: retailersLoading } = useQuery({
    queryKey: ['/api/retailers'],
  });

  // Get user's linked retailer accounts
  const { data: retailerAccounts, isLoading: accountsLoading } = useQuery({
    queryKey: ['/api/user/retailer-accounts'],
  });

  // Mutation to link a retailer account
  const linkAccountMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/user/retailer-accounts', data);
      return response.json();
    },
    onSuccess: () => {
      // Reset form and close dialog
      setUsername('');
      setPassword('');
      setLoyaltyCardNumber('');
      setLoyaltyMemberId('');
      setLinkDialogOpen(false);

      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/user/retailer-accounts'] });

      // Show success message
      const message = connectionType === 'circular' 
        ? `${selectedRetailer?.name} circular subscription activated.`
        : `Your ${selectedRetailer?.name} account has been connected to SmartCart.`;

      toast({
        title: connectionType === 'circular' ? 'Circular Subscription Active' : 'Account Linked Successfully',
        description: message,
      });
    },
    onError: (error: any) => {
      // Show error message
      toast({
        title: 'Failed to Link Account',
        description: error.message || 'Please check your credentials and try again.',
        variant: 'destructive',
      });
    }
  });

  // Mutation to update account settings
  const updateAccountMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('PATCH', `/api/user/retailer-accounts/${data.id}`, data);
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/user/retailer-accounts'] });

      // Show success message
      toast({
        title: 'Account Updated',
        description: `Your ${data.retailerName} account settings have been updated.`,
      });
    }
  });

  // Mutation to unlink a retailer account
  const unlinkAccountMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/user/retailer-accounts/${id}`);
      return response.json();
    },
    onSuccess: (_, id) => {
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/user/retailer-accounts'] });

      // Find the retailer name for the toast message
      const account = retailerAccounts?.find((acc: any) => acc.id === id);

      // Show success message
      toast({
        title: 'Account Unlinked',
        description: `Your ${account?.retailerName} account has been disconnected from SmartCart.`,
      });
    }
  });

  // Handle linking a new retailer account
  const handleLinkAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRetailer) return;

    const accountData = connectionType === 'circular' ? {
      retailerId: selectedRetailer.id,
      connectionType: 'circular',
      isConnected: true,
      circularOnly: true
    } : {
      retailerId: selectedRetailer.id,
      username,
      password,
      storeCredentials: rememberMe,
      allowOrdering,
      connectionType: 'account'
    };

    // If loyalty card info is provided, save it separately
    if (loyaltyCardNumber.trim()) {
      try {
        await apiRequest('POST', '/api/user/loyalty-card', {
          retailerId: selectedRetailer.id,
          cardNumber: loyaltyCardNumber,
          memberId: loyaltyMemberId || loyaltyCardNumber,
          barcodeNumber: loyaltyCardNumber,
          affiliateCode: `SMARTCART_${Date.now()}` // Generate affiliate code
        });
      } catch (error) {
        console.warn('Failed to save loyalty card:', error);
      }
    }

    linkAccountMutation.mutate(accountData);
  };

    const resetForm = () => {
    setUsername('');
    setPassword('');
    setLoyaltyCardNumber('');
    setLoyaltyMemberId('');
    setConnectionType('account');
  };

  // Open the link dialog for a specific retailer
  const openLinkDialog = (retailer: any) => {
    setSelectedRetailer(retailer);
    setConnectionType('account'); // Reset to default
    setLinkDialogOpen(true);
  };

  // Check if a retailer is already linked
  const isRetailerLinked = (retailerId: number) => {
    return retailerAccounts?.some((account: any) => account.retailerId === retailerId);
  };

  // Get a linked account by retailer ID
  const getLinkedAccount = (retailerId: number) => {
    return retailerAccounts?.find((account: any) => account.retailerId === retailerId);
  };

  const isConnected = (retailerId: number) => {
    return retailerAccounts?.some(account => account.retailerId === retailerId && account.isConnected);
  };

  if (retailersLoading || !retailers) {
    return <div>Loading retailers...</div>;
  }

  return (
    <div className="space-y-8">
      <h3 className="text-xl font-semibold mb-2">Connected Retailer Accounts</h3>
      <p className="text-gray-600 mb-6">
        Connect your retailer accounts to SmartCart to access your purchase history and enable online ordering.
        Your credentials are securely stored and can be removed at any time.
      </p>

      {/* Linked Accounts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {!accountsLoading && retailerAccounts?.length > 0 ? (
          retailerAccounts.map((account: any) => {
            const retailer = retailers?.find((r: any) => r.id === account.retailerId);
            const logoUrl = retailer ? getCompanyLogo(retailer.name) : undefined;

            return (
              <Card key={account.id} className="border-primary/30">
                <CardHeader className="pb-2">
                  <div className="flex items-center space-x-3">
                    {logoUrl ? (
                      <img src={logoUrl} alt={retailer?.name} className="h-8 w-8 object-contain" />
                    ) : (
                      <div 
                        className="h-8 w-8 rounded-full flex items-center justify-center text-white"
                        style={{backgroundColor: retailer?.logoColor || '#4A7CFA'}}
                      >
                        {retailer?.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-lg">
                        {retailer?.name}
                        <Badge className="ml-2 bg-primary text-white text-xs">Connected</Badge>
                      </CardTitle>
                      <CardDescription>{account.username}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="text-sm space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <RefreshCw className="h-4 w-4 mr-2 text-gray-500" />
                        <span>Last synchronized</span>
                      </div>
                      <span className="text-gray-600">
                        {new Date(account.lastSync || Date.now()).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <Label htmlFor={`order-${account.id}`} className="flex items-center">
                        <ExternalLink className="h-4 w-4 mr-2 text-gray-500" />
                        <span>Allow online ordering</span>
                      </Label>
                      <Switch 
                        id={`order-${account.id}`}
                        checked={account.allowOrdering}
                        onCheckedChange={(checked) => {
                          updateAccountMutation.mutate({
                            id: account.id,
                            allowOrdering: checked
                          });
                        }}
                      />
                    </div>

                    {account.storeCredentials && (
                      <div className="flex justify-between items-center">
                        <Label htmlFor={`creds-${account.id}`} className="flex items-center">
                          <Lock className="h-4 w-4 mr-2 text-gray-500" />
                          <span>Store credentials</span>
                        </Label>
                        <Switch 
                          id={`creds-${account.id}`}
                          checked={account.storeCredentials}
                          onCheckedChange={(checked) => {
                            updateAccountMutation.mutate({
                              id: account.id,
                              storeCredentials: checked
                            });
                          }}
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => unlinkAccountMutation.mutate(account.id)}
                    disabled={unlinkAccountMutation.isPending}
                  >
                    Disconnect Account
                  </Button>
                </CardFooter>
              </Card>
            );
          })
        ) : (
          <div className="col-span-1 md:col-span-2 text-center p-6 border rounded-lg bg-gray-50">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <h4 className="font-medium text-gray-700 mb-1">No Connected Accounts</h4>
            <p className="text-gray-500 text-sm mb-4">
              Link your retailer accounts to automatically track purchases and enable personalized shopping recommendations.
            </p>
          </div>
        )}
      </div>

      {/* Available Retailers */}
      <h3 className="text-lg font-semibold mt-8 mb-3">Available Retailers</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {!retailersLoading && retailers?.map((retailer: any) => {
          const isLinked = isRetailerLinked(retailer.id);
          const account = getLinkedAccount(retailer.id);
          const logoUrl = getCompanyLogo(retailer.name);

          return (
            <Card key={retailer.id} className={isLinked ? "border-primary/30" : ""}>
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center">
                  {logoUrl ? (
                    <img src={logoUrl} alt={retailer.name} className="h-12 w-12 mb-2 object-contain" />
                  ) : (
                    <div 
                      className="h-12 w-12 rounded-full flex items-center justify-center text-white mb-2"
                      style={{backgroundColor: retailer.logoColor || '#4A7CFA'}}
                    >
                      <span className="text-lg font-bold">{retailer.name.charAt(0)}</span>
                    </div>
                  )}
                  <h5 className="font-medium">{retailer.name}</h5>

                  {isLinked ? (
                    <div className="mt-2 w-full">
                      <Badge className="w-full mb-2 bg-primary/20 text-primary border border-primary/30">
                        <Check className="h-3 w-3 mr-1" /> Connected
                      </Badge>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full text-xs"
                        onClick={() => {
                          setSelectedRetailer(retailer);
                          setUsername(account?.username || '');
                          setAllowOrdering(account?.allowOrdering !== false);
                          setRememberMe(account?.storeCredentials !== false);
                          setLinkDialogOpen(true);
                        }}
                      >
                        Manage Connection
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2 w-full"
                      onClick={() => openLinkDialog(retailer)}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Connect
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Link Account Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              {selectedRetailer && (
                <>
                  {getCompanyLogo(selectedRetailer.name) ? (
                    <img 
                      src={getCompanyLogo(selectedRetailer.name)} 
                      alt={selectedRetailer.name} 
                      className="h-6 w-6 mr-2 object-contain" 
                    />
                  ) : (
                    <div 
                      className="h-6 w-6 rounded-full flex items-center justify-center text-white mr-2"
                      style={{backgroundColor: selectedRetailer.logoColor || '#4A7CFA'}}
                    >
                      <span className="text-xs font-bold">{selectedRetailer.name.charAt(0)}</span>
                    </div>
                  )}
                  Connect {selectedRetailer.name} Account
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              Enter your account credentials to connect your retailer account with SmartCart.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleLinkAccount}>
            <div className="space-y-4 py-2">
              {/* Connection Type Selection */}
              <div className="space-y-3">
                <Label>Connection Type</Label>
                <div className="flex space-x-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="connectionType"
                      value="account"
                      checked={connectionType === 'account'}
                      onChange={(e) => setConnectionType('account')}
                      className="text-primary"
                    />
                    <span className="text-sm">Store Account</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="connectionType"
                      value="circular"
                      checked={connectionType === 'circular'}
                      onChange={(e) => setConnectionType('circular')}
                      className="text-primary"
                    />
                    <span className="text-sm">Circular Only</span>
                  </label>
                </div>
              </div>

              {connectionType === 'account' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="username">Email or Username</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="your.email@example.com"
                      required
                    />
                  </div>
                </>
              )}

              {connectionType === 'circular' && (
                <div className="bg-blue-50 p-4 rounded-md">
                  <h4 className="font-medium text-blue-900 mb-2">Circular-Only Subscription</h4>
                  <p className="text-sm text-blue-700 mb-3">
                    We'll automatically fetch weekly circulars from {selectedRetailer?.name} to find deals for you. 
                    No account login required.
                  </p>
                  <div className="text-xs text-blue-600">
                    ✓ Get weekly deals and promotions<br/>
                    ✓ AI-powered deal matching<br/>
                    ✓ No personal account access needed
                  </div>
                </div>
              )}

              {connectionType === 'account' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="remember-me"
                      checked={rememberMe}
                      onCheckedChange={setRememberMe}
                    />
                    <Label htmlFor="remember-me">Remember my credentials</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="allow-ordering"
                      checked={allowOrdering}
                      onCheckedChange={setAllowOrdering}
                    />
                    <Label htmlFor="allow-ordering">Allow SmartCart to place orders for me</Label>
                  </div>
                </>
              )}

              {connectionType === 'circular' && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    We'll automatically fetch this store's weekly circulars for deal identification. 
                    No personal account connection required.
                  </p>

                  <div className="space-y-2">
                    <Label htmlFor="circularUrl">Circular URL (Optional)</Label>
                    <Input
                      id="circularUrl"
                      name="circularUrl"
                      type="url"
                      placeholder="https://store.com/weekly-ad"
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      If you know the specific URL for this store's weekly circular, enter it here. 
                      Otherwise, we'll try to find it automatically.
                    </p>
                  </div>
                </div>
              )}

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Loyalty Card (Optional)</h4>
                <p className="text-xs text-gray-600">
                  Add your loyalty card to earn points and access member discounts during shopping.
                </p>

                <div className="space-y-2">
                  <Label htmlFor="loyalty-card">Loyalty Card Number</Label>
                  <Input
                    id="loyalty-card"
                    value={loyaltyCardNumber}
                    onChange={(e) => setLoyaltyCardNumber(e.target.value)}
                    placeholder="1234567890123456"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="member-id">Member ID (if different)</Label>
                  <Input
                    id="member-id"
                    value={loyaltyMemberId}
                    onChange={(e) => setLoyaltyMemberId(e.target.value)}
                    placeholder="Optional member ID"
                  />
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-md">
                <p className="text-xs text-blue-600">
                  <strong>Privacy Note:</strong> SmartCart uses the highest security standards to protect your data. 
                  Your credentials will only be used to access your shopping history and place orders on your behalf 
                  when authorized. You can remove access at any time.
                </p>
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setLinkDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={linkAccountMutation.isPending}
              >
                {linkAccountMutation.isPending 
                  ? "Connecting..." 
                  : connectionType === 'circular' 
                    ? "Subscribe to Circular" 
                    : "Connect Account"
                }
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RetailerLinking;