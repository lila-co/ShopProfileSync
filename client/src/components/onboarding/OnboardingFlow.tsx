import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { 
  User, 
  Store, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft, 
  Eye, 
  EyeOff,
  Plus,
  MapPin,
  Heart,
  ShoppingCart,
  Mail
} from 'lucide-react';
import { getCompanyLogo } from '@/lib/imageUtils';

interface OnboardingFlowProps {
  onComplete: () => void;
}

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRetailers, setSelectedRetailers] = useState<number[]>([]);
  const [connectionType, setConnectionType] = useState<'account' | 'circular'>('account');

  // Profile setup state
  const [profileData, setProfileData] = useState({
    zipCode: '',
    budgetRange: '',
    shoppingFrequency: '',
    dietaryPreferences: [] as string[],
  });

  // Retailer connection state
  const [retailerCredentials, setRetailerCredentials] = useState<{[key: number]: {
    username: string;
    password: string;
    loyaltyCard: string;
    allowOrdering: boolean;
    storeCredentials: boolean;
  }}>({});

  const totalSteps = 5;
  const progress = (currentStep / totalSteps) * 100;

  // Get all available retailers
  const { data: retailers, isLoading: retailersLoading } = useQuery({
    queryKey: ['/api/retailers'],
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('PATCH', '/api/user/profile', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
    }
  });

  // Connect retailer accounts mutation
  const connectRetailersMutation = useMutation({
    mutationFn: async (connections: any[]) => {
      const promises = connections.map(connection => 
        apiRequest('POST', '/api/user/retailer-accounts', connection)
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/retailer-accounts'] });
      toast({
        title: "Welcome to SmartCart!",
        description: "Your account has been set up successfully.",
      });
      onComplete();
    },
    onError: (error: any) => {
      toast({
        title: "Setup Error",
        description: error.message || "There was an error setting up your account. You can add stores later in your profile.",
        variant: "destructive",
      });
      onComplete(); // Still complete onboarding even if retailer setup fails
    }
  });

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleRetailerToggle = (retailerId: number) => {
    setSelectedRetailers(prev => {
      if (prev.includes(retailerId)) {
        return prev.filter(id => id !== retailerId);
      } else {
        return [...prev, retailerId];
      }
    });

    // Initialize credentials for this retailer if not exists
    if (!retailerCredentials[retailerId]) {
      setRetailerCredentials(prev => ({
        ...prev,
        [retailerId]: {
          username: '',
          password: '',
          loyaltyCard: '',
          allowOrdering: true,
          storeCredentials: true,
        }
      }));
    }
  };

  const updateRetailerCredential = (retailerId: number, field: string, value: any) => {
    setRetailerCredentials(prev => ({
      ...prev,
      [retailerId]: {
        ...prev[retailerId],
        [field]: value
      }
    }));
  };

  const handleComplete = async () => {
    // Update profile first
    if (Object.values(profileData).some(val => val && val.length > 0)) {
      try {
        await updateProfileMutation.mutateAsync(profileData);
      } catch (error) {
        console.warn('Profile update failed:', error);
      }
    }

    // Connect selected retailers
    if (selectedRetailers.length > 0) {
      const connections = selectedRetailers.map(retailerId => {
        const creds = retailerCredentials[retailerId];

        if (connectionType === 'circular') {
          return {
            retailerId,
            connectionType: 'circular',
            isConnected: true,
            circularOnly: true
          };
        } else {
          return {
            retailerId,
            connectionType: 'account',
            username: creds?.username || '',
            password: creds?.password || '',
            storeCredentials: creds?.storeCredentials ?? true,
            allowOrdering: creds?.allowOrdering ?? true,
            isConnected: true
          };
        }
      });

      connectRetailersMutation.mutate(connections);
    } else {
      // No retailers selected, just complete onboarding
      toast({
        title: "Welcome to SmartCart!",
        description: "Your account has been set up successfully. You can add stores later in your profile.",
      });
      onComplete();
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle>Welcome to SmartCart!</CardTitle>
              <CardDescription>
                Let's set up your profile to personalize your shopping experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="zipCode">ZIP Code</Label>
                <Input
                  id="zipCode"
                  placeholder="12345"
                  value={profileData.zipCode}
                  onChange={(e) => setProfileData(prev => ({ ...prev, zipCode: e.target.value }))}
                />
                <p className="text-xs text-gray-500 mt-1">Helps us find deals at nearby stores</p>
              </div>

              <div>
                <Label htmlFor="budgetRange">Monthly Budget Range</Label>
                <Select 
                  value={profileData.budgetRange} 
                  onValueChange={(value) => setProfileData(prev => ({ ...prev, budgetRange: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your budget range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="under-200">Under $200</SelectItem>
                    <SelectItem value="200-400">$200 - $400</SelectItem>
                    <SelectItem value="400-600">$400 - $600</SelectItem>
                    <SelectItem value="600-800">$600 - $800</SelectItem>
                    <SelectItem value="800-plus">$800+</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="shoppingFrequency">How often do you shop?</Label>
                <Select 
                  value={profileData.shoppingFrequency} 
                  onValueChange={(value) => setProfileData(prev => ({ ...prev, shoppingFrequency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="few-times-week">Few times a week</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <Heart className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>Dietary Preferences</CardTitle>
              <CardDescription>
                Help us suggest products that match your lifestyle
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {['Vegetarian', 'Vegan', 'Gluten-Free', 'Keto', 'Organic', 'Low-Sodium'].map((diet) => (
                  <Button
                    key={diet}
                    variant={profileData.dietaryPreferences.includes(diet) ? 'default' : 'outline'}
                    className="h-auto py-3 text-sm"
                    onClick={() => {
                      const current = profileData.dietaryPreferences;
                      const updated = current.includes(diet)
                        ? current.filter(d => d !== diet)
                        : [...current, diet];
                      setProfileData(prev => ({ ...prev, dietaryPreferences: updated }));
                    }}
                  >
                    {diet}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-4 text-center">
                You can change these preferences anytime in your profile
              </p>
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                <Store className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle>Connect Your Stores</CardTitle>
              <CardDescription>
                Link your favorite stores to track purchases and find deals
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label>Connection Type</Label>
                <div className="flex space-x-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="connectionType"
                      value="circular"
                      checked={connectionType === 'circular'}
                      onChange={(e) => setConnectionType('circular')}
                      className="text-primary"
                    />
                    <span className="text-sm">Deals Only</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="connectionType"
                      value="account"
                      checked={connectionType === 'account'}
                      onChange={(e) => setConnectionType('account')}
                      className="text-primary"
                    />
                    <span className="text-sm">Full Account</span>
                  </label>
                </div>
                <p className="text-xs text-gray-500">
                  {connectionType === 'circular' 
                    ? 'Get weekly deals without sharing account credentials'
                    : 'Full integration with purchase history and ordering'
                  }
                </p>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto">
                {!retailersLoading && retailers?.slice(0, 8).map((retailer: any) => {
                  const logoUrl = getCompanyLogo(retailer.name);
                  const isSelected = selectedRetailers.includes(retailer.id);

                  return (
                    <div 
                      key={retailer.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        isSelected ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleRetailerToggle(retailer.id)}
                    >
                      <div className="flex items-center space-x-3">
                        {logoUrl ? (
                          <img src={logoUrl} alt={retailer.name} className="h-8 w-8 object-contain" />
                        ) : (
                          <div 
                            className="h-8 w-8 rounded-full flex items-center justify-center text-white"
                            style={{backgroundColor: retailer.logoColor || '#4A7CFA'}}
                          >
                            {retailer.name.charAt(0)}
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-medium">{retailer.name}</p>
                        </div>
                        {isSelected && <CheckCircle className="h-5 w-5 text-primary" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-xs text-gray-500 text-center">
                You can add more stores later in your profile settings
              </p>
            </CardContent>
          </Card>
        );

      case 4:
        return (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <Mail className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle>Email Receipt Scanning (Optional)</CardTitle>
              <CardDescription>
                Connect your email to automatically find and process receipts from your shopping
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>✓ Secure OAuth connection to your email</li>
                  <li>✓ Automatically detects receipt emails</li>
                  <li>✓ Builds your shopping history automatically</li>
                  <li>✓ Improves recommendations over time</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Connect Your Email Provider:</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex items-center space-x-2 h-12"
                    onClick={() => window.location.href = `/api/auth/email/gmail?userId=${user?.id}&redirect=/onboarding`}
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5">
                      <path fill="currentColor" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.910 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
                    </svg>
                    <span>Gmail</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex items-center space-x-2 h-12"
                    onClick={() => window.location.href = `/api/auth/email/outlook?userId=${user?.id}&redirect=/onboarding`}
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5">
                      <path fill="currentColor" d="M7.462 2.5c-1.35 0-2.462 1.112-2.462 2.462v13.076c0 1.35 1.112 2.462 2.462 2.462h9.076c1.35 0 2.462-1.112 2.462-2.462V7.615L14.385 3H7.462z"/>
                    </svg>
                    <span>Outlook</span>
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={handleNext}
                >
                  Skip for now
                </Button>
              </div>
            </CardContent>
          </Card>
        );


      case 5:
        if (selectedRetailers.length === 0) {
          return (
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                  <CheckCircle className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle>You're All Set!</CardTitle>
                <CardDescription>
                  Your SmartCart account is ready to use
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <p className="text-gray-600">
                  You can connect stores anytime from your profile to start tracking deals and purchases.
                </p>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">What's Next?</h4>
                  <ul className="text-sm text-blue-700 space-y-1 list-none">
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>Create your first shopping list</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>Browse deals from local stores</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>Connect stores for personalized recommendations</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          );
        }

        return (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <ShoppingCart className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>
                {connectionType === 'circular' ? 'Subscription Confirmation' : 'Store Account Setup'}
              </CardTitle>
              <CardDescription>
                {connectionType === 'circular' 
                  ? 'Confirm your store subscriptions for weekly deals'
                  : 'Enter your store account details for full integration'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {connectionType === 'circular' ? (
                <div className="space-y-3">
                  {selectedRetailers.map(retailerId => {
                    const retailer = retailers?.find((r: any) => r.id === retailerId);
                    const logoUrl = retailer ? getCompanyLogo(retailer.name) : undefined;

                    return (
                      <div key={retailerId} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        {logoUrl ? (
                          <img src={logoUrl} alt={retailer?.name} className="h-6 w-6 object-contain" />
                        ) : (
                          <div 
                            className="h-6 w-6 rounded-full flex items-center justify-center text-white"
                            style={{backgroundColor: retailer?.logoColor || '#4A7CFA'}}
                          >
                            {retailer?.name.charAt(0)}
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-medium">{retailer?.name}</p>
                          <p className="text-xs text-gray-500">Weekly deals and circulars</p>
                        </div>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                    );
                  })}
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-700">
                      We'll automatically fetch weekly deals from these stores. No account credentials needed!
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 max-h-64 overflow-y-auto">
                  {selectedRetailers.map(retailerId => {
                    const retailer = retailers?.find((r: any) => r.id === retailerId);
                    const creds = retailerCredentials[retailerId] || {};
                    const logoUrl = retailer ? getCompanyLogo(retailer.name) : undefined;

                    return (
                      <div key={retailerId} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-center space-x-3">
                          {logoUrl ? (
                            <img src={logoUrl} alt={retailer?.name} className="h-6 w-6 object-contain" />
                          ) : (
                            <div 
                              className="h-6 w-6 rounded-full flex items-center justify-center text-white"
                              style={{backgroundColor: retailer?.logoColor || '#4A7CFA'}}
                            >
                              {retailer?.name.charAt(0)}
                            </div>
                          )}
                          <h4 className="font-medium">{retailer?.name}</h4>
                        </div>

                        <div className="space-y-2">
                          <div>
                            <Label htmlFor={`username-${retailerId}`}>Email/Username</Label>
                            <Input
                              id={`username-${retailerId}`}
                              placeholder="your.email@example.com"
                              value={creds.username || ''}
                              onChange={(e) => updateRetailerCredential(retailerId, 'username', e.target.value)}
                            />
                          </div>

                          <div>
                            <Label htmlFor={`password-${retailerId}`}>Password</Label>
                            <div className="relative">
                              <Input
                                id={`password-${retailerId}`}
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                value={creds.password || ''}
                                onChange={(e) => updateRetailerCredential(retailerId, 'password', e.target.value)}
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

                          <div>
                            <Label htmlFor={`loyalty-${retailerId}`}>Loyalty Card (Optional)</Label>
                            <Input
                              id={`loyalty-${retailerId}`}
                              placeholder="1234567890"
                              value={creds.loyaltyCard || ''}
                              onChange={(e) => updateRetailerCredential(retailerId, 'loyaltyCard', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  if (retailersLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen frosted-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="glass-modal shadow-glass-strong">
          <CardHeader className="text-center">
            <CardTitle className="text-display-md">Welcome to ShopSmart</CardTitle>
            <CardDescription className="text-body">
              Let's get you set up with a personalized shopping experience
            </CardDescription>
          </CardHeader>

      {/* Rest of the component */}
        <CardContent>
           OnboardingFlow
        </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OnboardingFlow;