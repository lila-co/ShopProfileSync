import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from './lib/queryClient';
import { useToast } from './hooks/use-toast';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from './components/ui/card';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Switch } from './components/ui/switch';
import { Separator } from './components/ui/separator';
import { Badge } from './components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './components/ui/dialog';
import { ScrollArea } from './components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './components/ui/select';

import { Eye, EyeOff, Lock, ExternalLink, RefreshCw, Plus, Check, AlertCircle, Store, CheckCircle } from 'lucide-react';
import { getCompanyLogo } from './lib/imageUtils';

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
  const [showAddStore, setShowAddStore] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreWebsite, setNewStoreWebsite] = useState('');
  const [selectedAvailableRetailer, setSelectedAvailableRetailer] = useState<string>('');

  // Form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [allowOrdering, setAllowOrdering] = useState(true);
  const [loyaltyCardNumber, setLoyaltyCardNumber] = useState('');
  const [loyaltyMemberId, setLoyaltyMemberId] = useState('');
  const [connectionType, setConnectionType] = useState<'account' | 'circular'>('account');

  // Get all available retailers
  const { data: retailers, isLoading: retailersLoading } = useQuery({
    queryKey: ['/api/retailers'],
  });

  // Get user's linked retailer accounts
  const { data: retailerAccounts, isLoading: accountsLoading, error: accountsError } = useQuery({
    queryKey: ['/api/user/retailer-accounts'],
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Debug logging
  React.useEffect(() => {
    console.log('Retailer accounts data:', {
      accounts: retailerAccounts,
      isLoading: accountsLoading,
      error: accountsError,
      connectedCount: retailerAccounts?.filter((account: any) => account.isConnected).length || 0
    });
  }, [retailerAccounts, accountsLoading, accountsError]);

  // Mutation to link a retailer account
  const linkAccountMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('Linking account with data:', data);
      const response = await apiRequest('POST', '/api/user/retailer-accounts', data);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to link account');
      }
      
      return response.json();
    },
    onSuccess: (newAccount) => {
      console.log('Account linked successfully:', newAccount);
      
      // Reset form and close dialog
      setUsername('');
      setPassword('');
      setLoyaltyCardNumber('');
      setLoyaltyMemberId('');
      setSelectedAvailableRetailer('');
      setLinkDialogOpen(false);

      // Invalidate and refetch queries to refresh the data immediately
      queryClient.invalidateQueries({ queryKey: ['/api/user/retailer-accounts'] });
      queryClient.refetchQueries({ queryKey: ['/api/user/retailer-accounts'] });

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
      console.error('Failed to link account:', error);
      
      // Show error message with more details
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
      console.log(`Attempting to delete retailer account with ID: ${id}`);
      const response = await apiRequest('DELETE', `/api/user/retailer-accounts/${id}`);

      // Check if the response is successful (204 No Content)
      if (response.status === 204) {
        return { success: true, id };
      } else if (response.status === 404) {
        throw new Error('Account not found');
      } else {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Failed to disconnect account');
        }
        return data;
      }
    },
    onSuccess: (_, id) => {
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/user/retailer-accounts'] });

      // Find the retailer name for the toast message
      const account = retailerAccounts?.find((acc: any) => acc.id === id);

      // Show success message
      toast({
        title: 'Account Unlinked',
        description: `Your ${account?.retailerName || 'retailer'} account has been disconnected from SmartCart.`,
      });
    },
    onError: (error: any, id) => {
      console.error('Failed to unlink account:', error);

      // Find the retailer name for the error message
      const account = retailerAccounts?.find((acc: any) => acc.id === id);

      toast({
        title: 'Failed to Disconnect',
        description: error.message || `Failed to disconnect ${account?.retailerName || 'retailer'} account. Please try again.`,
        variant: 'destructive',
      });
    }
  });

  // Mutation to add custom store
  const addStoreMutation = useMutation({
    mutationFn: async (storeData: {name: string, logoColor: string, websiteUrl?: string}) => {
      const response = await apiRequest('POST', '/api/retailers', storeData);
      return response.json();
    },
    onSuccess: (newRetailer) => {
      queryClient.invalidateQueries({ queryKey: ['/api/retailers'] });
      setNewStoreName('');
      setNewStoreWebsite('');

      toast({
        title: "Store Added",
        description: `${newRetailer.name} has been added successfully. You can now connect to it.`
      });

      // Close the add store dialog first
      setShowAddStore(false);
      
      // Small delay to ensure the add store dialog closes completely before opening connection dialog
      setTimeout(() => {
        setSelectedRetailer(newRetailer);
        setConnectionType('account'); // Default to account connection
        setLinkDialogOpen(true);
      }, 100);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add store. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Handle linking a new retailer account
  const handleLinkAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRetailer) {
      toast({
        title: 'Error',
        description: 'Please select a retailer to connect.',
        variant: 'destructive',
      });
      return;
    }

    // Validate form data for account connections
    if (connectionType === 'account' && (!username.trim() || !password.trim())) {
      toast({
        title: 'Missing Information',
        description: 'Please enter both username and password for account connection.',
        variant: 'destructive',
      });
      return;
    }

    const accountData = connectionType === 'circular' ? {
      retailerId: selectedRetailer.id,
      connectionType: 'circular',
      isConnected: true,
      circularOnly: true
    } : {
      retailerId: selectedRetailer.id,
      username: username.trim(),
      password: password.trim(),
      storeCredentials: rememberMe,
      allowOrdering,
      isConnected: true,
      connectionType: 'account'
    };

    console.log('Submitting account data:', { ...accountData, password: '[REDACTED]' });

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
    setSelectedAvailableRetailer('');
  };

  const handleAddStore = () => {
    const trimmedName = newStoreName.trim();
    if (trimmedName) {
      addStoreMutation.mutate({
        name: trimmedName,
        logoColor: 'blue',
        websiteUrl: newStoreWebsite.trim() || undefined
      });
    } else {
      toast({
        title: "Invalid Store Name",
        description: "Please enter a valid store name.",
        variant: "destructive"
      });
    }
  };

  // Open the link dialog for a specific retailer
  const openLinkDialog = (retailer: any) => {
    setSelectedRetailer(retailer);
    setConnectionType('account'); // Reset to default
    setSelectedAvailableRetailer(''); // Reset dropdown
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

      {/* Connected Accounts Only */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {!accountsLoading && retailerAccounts?.filter((account: any) => account.isConnected).length > 0 ? (
          retailerAccounts.filter((account: any) => account.isConnected).map((account: any) => {
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
              Connect retailer accounts below to automatically track purchases and enable personalized shopping recommendations.
            </p>
          </div>
        )}
      </div>

      {/* Available Retailers Dropdown */}
      <h3 className="text-lg font-semibold mt-8 mb-3">Connect New Retailer</h3>
      <div className="space-y-4">
        <Select value={selectedAvailableRetailer} onValueChange={(value) => {
          if (value === 'add-custom-store') {
            // Don't set the value for add custom store to prevent auto-close
            setShowAddStore(true);
          } else if (value) {
            setSelectedAvailableRetailer(value);
            // Auto-open connection dialog when a retailer is selected
            const retailerId = parseInt(value);
            const retailer = retailers?.find((r: any) => r.id === retailerId);
            if (retailer) {
              openLinkDialog(retailer);
            }
          }
        }}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a retailer to connect..." />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {!retailersLoading && retailers?.filter((retailer: any) => !isRetailerLinked(retailer.id))
              .sort((a: any, b: any) => a.name.localeCompare(b.name))
              .map((retailer: any) => {
              const logoUrl = getCompanyLogo(retailer.name);

              return (
                <SelectItem key={retailer.id} value={retailer.id.toString()}>
                  <div className="flex items-center space-x-2">
                    {logoUrl ? (
                      <img src={logoUrl} alt={retailer.name} className="h-5 w-5 object-contain" />
                    ) : (
                      <div 
                        className="h-5 w-5 rounded-full flex items-center justify-center text-white text-xs"
                        style={{backgroundColor: retailer.logoColor || '#4A7CFA'}}
                      >
                        {retailer.name.charAt(0)}
                      </div>
                    )}
                    <span>{retailer.name}</span>
                  </div>
                </SelectItem>
              );
            })}
            <SelectItem value="add-custom-store">
              <div className="flex items-center space-x-2">
                <Plus className="h-5 w-5 text-gray-500" />
                <span>Add Custom Store</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Add Custom Store Dialog */}
      <Dialog open={showAddStore} onOpenChange={setShowAddStore}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Store className="h-6 w-6 mr-2" />
              Add Custom Store
            </DialogTitle>
            <DialogDescription>
              Add a custom store that's not in our list. You can connect to it after adding.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="storeName">Store Name *</Label>
              <Input
                id="storeName"
                value={newStoreName}
                onChange={(e) => setNewStoreName(e.target.value)}
                placeholder="e.g., Local Market"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="storeWebsite">Website URL (Optional)</Label>
              <Input
                id="storeWebsite"
                type="url"
                value={newStoreWebsite}
                onChange={(e) => setNewStoreWebsite(e.target.value)}
                placeholder="https://example.com"
              />
            </div>

            <div className="bg-blue-50 p-3 rounded-md">
              <p className="text-xs text-blue-600">
                After adding your custom store, you'll be able to connect your account or subscribe to their weekly circulars if available.
              </p>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setShowAddStore(false);
                setNewStoreName('');
                setNewStoreWebsite('');
                setSelectedAvailableRetailer('');
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddStore}
              disabled={addStoreMutation.isPending || !newStoreName.trim()}
            >
              {addStoreMutation.isPending ? "Adding..." : "Add Store"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Account Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
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

          <form onSubmit={handleLinkAccount} className="flex flex-col flex-1 overflow-hidden">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-3 py-2">
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
                  <div className="bg-blue-50 p-3 rounded-md">
                    <h4 className="font-medium text-blue-900 mb-1">Circular-Only Subscription</h4>
                    <p className="text-sm text-blue-700 mb-2">
                      We'll automatically fetch weekly circulars from {selectedRetailer?.name} to find deals for you. 
                      No account login required.
                    </p>
                    <div className="text-xs text-blue-600 space-y-0.5">
                      <div>✓ Get weekly deals and promotions</div>
                      <div>✓ AI-powered deal matching</div>
                      <div>✓ No personal account access needed</div>
                    </div>
                    <div className="mt-2 p-2 bg-blue-100 rounded text-xs text-blue-700">
                      <strong>Tip:</strong> For automatic receipt scanning, configure email integration in the Email tab.
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
                  </>
                )}

                {connectionType === 'account' && (
                  <>
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
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      We'll automatically fetch this store's weekly circulars for deal identification. 
                      No personal account connection required.
                    </p>

                    <div className="space-y-1">
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

                <div className="space-y-3">
                  <h4 className="font-medium">Loyalty Card (Optional)</h4>
                  <p className="text-xs text-gray-600">
                    Add your loyalty card to earn points and access member discounts during shopping.
                  </p>

                  <div className="space-y-1">
                    <Label htmlFor="loyalty-card">Loyalty Card Number</Label>
                    <Input
                      id="loyalty-card"
                      value={loyaltyCardNumber}
                      onChange={(e) => setLoyaltyCardNumber(e.target.value)}
                      placeholder="1234567890123456"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="member-id">Member ID (if different)</Label>
                    <Input
                      id="member-id"
                      value={loyaltyMemberId}
                      onChange={(e) => setLoyaltyMemberId(e.target.value)}
                      placeholder="Optional member ID"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 p-2 rounded-md">
                  <p className="text-xs text-blue-600">
                    <strong>Privacy Note:</strong> SmartCart uses the highest security standards to protect your data. 
                    Your credentials will only be used to access your shopping history and place orders on your behalf 
                    when authorized. You can remove access at any time.
                  </p>
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="mt-3 flex-shrink-0 border-t pt-3">
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
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 shadow-md hover:shadow-lg transition-all duration-200"
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