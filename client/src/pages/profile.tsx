import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import Header from '@/components/layout/Header';
import BottomNavigation from '@/components/layout/BottomNavigation';
import ProfileSetup from '@/components/profile/ProfileSetup';
import RetailerLinking from '@/components/profile/RetailerLinking';
import PurchaseAnomalies from '@/components/profile/PurchaseAnomalies';
import RetailersContent from '@/components/profile/RetailersContent';
import ShoppingInsights from '@/components/dashboard/ShoppingInsights';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, Settings, Bell, CreditCard, MapPin, Shield, Store, TrendingUp, ShieldAlert, AlertTriangle, Zap, Heart, DollarSign, Users, Globe, Lock, Eye, Mail } from 'lucide-react';
import { User as UserType } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

import { profileUpdateSchema } from '@/lib/validation';

const profileSchema = profileUpdateSchema;

const ProfilePage: React.FC = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('profile');

  const { data: user, isLoading } = useQuery<UserType>({
    queryKey: ['/api/user/profile'],
  });

  const { data: privacyPreferences, isLoading: privacyLoading } = useQuery({
    queryKey: ['/api/user/privacy-preferences'],
  });

  const { data: notificationPreferences, isLoading: notificationLoading } = useQuery({
    queryKey: ['/api/user/notification-preferences'],
  });

  const updatePrivacyMutation = useMutation({
    mutationFn: async (preferences: Record<string, boolean>) => {
      const response = await fetch('/api/user/privacy-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to update privacy preferences`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/privacy-preferences'] });
      toast({
        title: "Privacy Settings Updated",
        description: "Your privacy preferences have been saved.",
      });
    },
    onError: (error: Error, variables, context) => {
      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: ['/api/user/privacy-preferences'] });
      console.error('Privacy update error:', error);
      toast({
        title: "Privacy Update Failed",
        description: error.message || "Failed to update privacy settings. Please try again.",
        variant: "destructive",
      });
    }
  });

  const updateNotificationMutation = useMutation({
    mutationFn: async (preferences: Record<string, boolean>) => {
      const response = await fetch('/api/user/notification-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to update notification preferences`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/notification-preferences'] });
      // Settings saved silently - no toast needed for every toggle
    },
    onError: (error: Error, variables, context) => {
      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: ['/api/user/notification-preferences'] });
      console.error('Notification update error:', error);
      toast({
        title: "Notification Update Failed", 
        description: error.message || "Failed to save notification preferences. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handlePrivacyToggle = (setting: string, value: boolean) => {
    if (updatePrivacyMutation.isPending) return;

    // Optimistically update the UI
    queryClient.setQueryData(['/api/user/privacy-preferences'], (old: any) => ({
      ...old,
      [setting]: value
    }));

    const preferences = { [setting]: value };
    updatePrivacyMutation.mutate(preferences);
  };

  const handleNotificationToggle = (setting: string, value: boolean) => {
    if (updateNotificationMutation.isPending) return;

    // Optimistically update the UI
    queryClient.setQueryData(['/api/user/notification-preferences'], (old: any) => ({
      ...old,
      [setting]: value
    }));

    const preferences = { [setting]: value };
    updateNotificationMutation.mutate(preferences);
  };

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: user?.username || '',
      email: user?.email || '',
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
      zipCode: user?.zipCode || '',
      dietaryPreferences: user?.dietaryPreferences || [],
      budgetRange: user?.budgetRange || '',
      shoppingFrequency: user?.shoppingFrequency || '',
    },
  });

  // Update form when user data loads
  React.useEffect(() => {
    if (user) {
      form.reset({
        username: user.username || '',
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
        zipCode: user.zipCode || '',
        dietaryPreferences: user.dietaryPreferences || [],
        budgetRange: user.budgetRange || '',
        shoppingFrequency: user.shoppingFrequency || '',
      });
    }
  }, [user, form]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: z.infer<typeof profileSchema>) => {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update profile');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: z.infer<typeof profileSchema>) => {
    updateProfileMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
        <Header user={user} />
        <main className="flex-1 overflow-y-auto p-4 pb-20">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </main>
        <BottomNavigation activeTab="profile" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto frosted-bg min-h-screen flex flex-col">
      <Header user={user} />

      <main className="flex-1 overflow-y-auto p-4 pb-20">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">My Profile</h1>
          <p className="text-gray-600">Manage your account settings and preferences</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-6 text-xs">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="retailers">Stores</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
            <TabsTrigger value="notifications">Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2 text-blue-600" />
                  Personal Information
                </CardTitle>
                <CardDescription>Update your basic profile information</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="john@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="(555) 123-4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="zipCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ZIP Code</FormLabel>
                          <FormControl>
                            <Input placeholder="12345" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Heart className="w-5 h-5 mr-2 text-red-600" />
                          Shopping Preferences
                        </CardTitle>
                        <CardDescription>Customize your shopping experience</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label htmlFor="budgetRange">Monthly Budget Range</Label>
                          <Select value={form.watch('budgetRange')} onValueChange={(value) => form.setValue('budgetRange', value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select budget range" />
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
                          <Label htmlFor="shoppingFrequency">Shopping Frequency</Label>
                          <Select value={form.watch('shoppingFrequency')} onValueChange={(value) => form.setValue('shoppingFrequency', value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="How often do you shop?" />
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

                        <div>
                          <Label>Dietary Preferences</Label>
                          <p className="text-xs text-gray-500 mt-1 mb-3">Click to select/deselect preferences</p>
                          <div className="flex flex-wrap gap-2">
                            {['Vegetarian', 'Vegan', 'Gluten-Free', 'Keto', 'Organic', 'Low-Sodium'].map((diet) => {
                              const isSelected = form.watch('dietaryPreferences')?.includes(diet);
                              return (
                                <button
                                  key={diet}
                                  type="button"
                                  className={`px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 border-2 ${
                                    isSelected
                                      ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105'
                                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                                  }`}
                                  onClick={() => {
                                    const current = form.watch('dietaryPreferences') || [];
                                    const updated = current.includes(diet)
                                      ? current.filter(d => d !== diet)
                                      : [...current, diet];
                                    form.setValue('dietaryPreferences', updated);
                                  }}
                                >
                                  {isSelected && (
                                    <span className="mr-1">✓</span>
                                  )}
                                  {diet}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Button type="submit" className="w-full" disabled={updateProfileMutation.isPending}>
                      {updateProfileMutation.isPending ? 'Updating...' : 'Update Profile'}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                  Household & Shopping Patterns
                </CardTitle>
                <CardDescription>Configure your household details and shopping preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <ProfileSetup />
              </CardContent>
            </Card>

          </TabsContent>

          <TabsContent value="retailers" className="space-y-4">
            {/* Retailers content moved from retailers page */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Store className="w-5 h-5 mr-2 text-purple-600" />
                  Partner Retailers
                </CardTitle>
                <CardDescription>View and manage your store connections</CardDescription>
              </CardHeader>
              <CardContent>
                <RetailersContent />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Mail className="w-5 h-5 mr-2 text-blue-600" />
                  Email Receipt Scanning
                </CardTitle>
                <CardDescription>Automatically scan your email for receipts to build shopping history</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Benefits of Email Integration:</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>✓ Automatic receipt detection and processing</li>
                    <li>✓ Historical purchase tracking without manual entry</li>
                    <li>✓ Enhanced personalized recommendations</li>
                    <li>✓ Better price tracking and deal alerts</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Connect Email Providers:</h4>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <svg viewBox="0 0 24 24" className="w-6 h-6">
                          <path fill="currentColor" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.910 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
                        </svg>
                        <div>
                          <div className="font-medium">Gmail</div>
                          <div className="text-sm text-gray-500">Scan Gmail for receipts</div>
                        </div>
                      </div>
                      <Button
                        onClick={() => window.location.href = `/api/auth/email/gmail?userId=${user?.id}`}
                        size="sm"
                      >
                        Connect
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <svg viewBox="0 0 24 24" className="w-6 h-6">
                          <path fill="currentColor" d="M7.462 2.5c-1.35 0-2.462 1.112-2.462 2.462v13.076c0 1.35 1.112 2.462 2.462 2.462h9.076c1.35 0 2.462-1.112 2.462-2.462V7.615L14.385 3H7.462z"/>
                        </svg>
                        <div>
                          <div className="font-medium">Outlook</div>
                          <div className="text-sm text-gray-500">Scan Outlook for receipts</div>
                        </div>
                      </div>
                      <Button
                        onClick={() => window.location.href = `/api/auth/email/outlook?userId=${user?.id}`}
                        size="sm"
                      >
                        Connect
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Privacy & Security</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    We use industry-standard OAuth 2.0 authentication and encrypt all stored tokens. 
                    We only access emails that contain receipts and never store email content permanently.
                  </p>
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>• Read-only access to your email</div>
                    <div>• Encrypted token storage</div>
                    <div>• Receipt detection only</div>
                    <div>• Disconnect anytime</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <ShoppingInsights />
          </TabsContent>

          <TabsContent value="privacy" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Lock className="w-5 h-5 mr-2 text-green-600" />
                  Privacy Settings
                </CardTitle>
                <CardDescription>Control your data and privacy preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between py-4 px-4 glass-card rounded-lg border">
                  <div className="flex-1">
                    <Label htmlFor="shareData" className="text-base font-medium text-gray-900">Share anonymous usage data</Label>
                    <p className="text-sm text-gray-600 mt-1">Help improve our service</p>
                  </div>
                  <Switch 
                    id="shareData" 
                    checked={privacyPreferences?.allowAnalytics ?? true}
                    onCheckedChange={(checked) => handlePrivacyToggle('allowAnalytics', checked)}
                    disabled={updatePrivacyMutation.isPending || privacyLoading}
                    className="ml-6 data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-gray-300" 
                  />
                </div>

                <div className="flex items-center justify-between py-4 px-4 glass-card rounded-lg border">
                  <div className="flex-1">
                    <Label htmlFor="locationTracking" className="text-base font-medium text-gray-900">Location-based recommendations</Label>
                    <p className="text-sm text-gray-600 mt-1">Get deals from nearby stores</p>
                  </div>
                  <Switch 
                    id="locationTracking" 
                    checked={privacyPreferences?.allowLocationTracking ?? true}
                    onCheckedChange={(checked) => handlePrivacyToggle('allowLocationTracking', checked)}
                    disabled={updatePrivacyMutation.isPending || privacyLoading}
                    className="ml-6 data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-gray-300" 
                  />
                </div>

                <div className="flex items-center justify-between py-4 px-4 glass-card rounded-lg border">
                  <div className="flex-1">
                    <Label htmlFor="profileVisibility" className="text-base font-medium text-gray-900 cursor-pointer">Public profile</Label>
                    <p className="text-sm text-gray-600 mt-1">Allow others to see your reviews</p>
                  </div>
                  <Switch 
                    id="profileVisibility" 
                    checked={privacyPreferences?.allowDataSharing ?? false}
                    onCheckedChange={(checked) => handlePrivacyToggle('allowDataSharing', checked)}
                    disabled={updatePrivacyMutation.isPending || privacyLoading}
                    className="ml-6 data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-gray-300"
                    aria-describedby="profileVisibility-description"
                  />
                </div>

                <div className="flex items-center justify-between py-4 px-4 glass-card rounded-lg border">
                  <div className="flex-1">
                    <Label htmlFor="dataRetention" className="text-base font-medium text-gray-900 cursor-pointer">Data retention</Label>
                    <p className="text-sm text-gray-600 mt-1">Keep purchase history for recommendations</p>
                  </div>
                  <Switch 
                    id="dataRetention" 
                    checked={privacyPreferences?.allowPersonalization ?? true}
                    onCheckedChange={(checked) => handlePrivacyToggle('allowPersonalization', checked)}
                    disabled={updatePrivacyMutation.isPending || privacyLoading}
                    className="ml-6 data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-gray-300"
                    aria-describedby="dataRetention-description"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-red-600">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Data Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/user/data-export', {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' },
                      });

                      if (response.ok) {
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `user_data_export_${new Date().toISOString().split('T')[0]}.json`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(url);

                        toast({
                          title: "Data Export Complete",
                          description: "Your data has been downloaded successfully.",
                        });
                      } else {
                        throw new Error('Export failed');
                      }
                    } catch (error) {
                      toast({
                        title: "Export Failed",
                        description: "Failed to export your data. Please try again.",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Download My Data
                </Button>
                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={async () => {
                    const confirmed = confirm(
                      "Are you sure you want to delete your account?\n\n" +
                      "This will permanently delete:\n" +
                      "• Your profile and personal information\n" +
                      "• Shopping lists and purchase history\n" +
                      "• Connected retailer accounts\n" +
                      "• All recommendations and preferences\n\n" +
                      "This action cannot be undone."
                    );

                    if (confirmed) {
                      try {
                        const response = await fetch('/api/user/delete-account', {
                          method: 'DELETE',
                          headers: { 'Content-Type': 'application/json' },
                        });

                        if (response.ok) {
                          toast({
                            title: "Account Deletion Initiated",
                            description: "Your account deletion request has been submitted. You will receive a confirmation email.",
                            variant: "destructive",
                          });

                          // Redirect to auth page after a delay
                          setTimeout(() => {
                            navigate('/auth');
                          }, 3000);
                        } else {
                          throw new Error('Deletion failed');
                        }
                      } catch (error) {
                        toast({
                          title: "Deletion Failed",
                          description: "Failed to delete account. Please contact support.",
                          variant: "destructive",
                        });
                      }
                    }
                  }}
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Delete Account
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="w-5 h-5 mr-2 text-yellow-600" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>Choose what alerts you'd like to receive</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between py-4 px-4 glass-card rounded-lg border">
                  <div className="flex-1">
                    <Label htmlFor="dealAlerts" className="text-base font-medium text-gray-900">Deal alerts</Label>
                    <p className="text-sm text-gray-600 mt-1">Get notified about new deals</p>
                  </div>
                  <Switch 
                    id="dealAlerts" 
                    checked={notificationPreferences?.dealAlerts ?? true}
                    onCheckedChange={(checked) => handleNotificationToggle('dealAlerts', checked)}
                    disabled={updateNotificationMutation.isPending || notificationLoading}
                    className="ml-6 data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-gray-300" 
                  />
                </div>

                <div className="flex items-center justify-between py-4 px-4 glass-card rounded-lg border">
                  <div className="flex-1">
                    <Label htmlFor="priceDrops" className="text-base font-medium text-gray-900">Price drop notifications</Label>
                    <p className="text-sm text-gray-600 mt-1">Items on your list go on sale</p>
                  </div>
                  <Switch 
                    id="priceDrops" 
                    checked={notificationPreferences?.priceDropAlerts ?? true}
                    onCheckedChange={(checked) => handleNotificationToggle('priceDropAlerts', checked)}
                    disabled={updateNotificationMutation.isPending || notificationLoading}
                    className="ml-6 data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-gray-300" 
                  />
                </div>

                <div className="flex items-center justify-between py-4 px-4 glass-card rounded-lg border">
                  <div className="flex-1">
                    <Label htmlFor="weeklyDigest" className="text-base font-medium text-gray-900">Weekly digest</Label>
                    <p className="text-sm text-gray-600 mt-1">Summary of savings and trends</p>
                  </div>
                  <Switch 
                    id="weeklyDigest" 
                    checked={notificationPreferences?.weeklyDigest ?? false}
                    onCheckedChange={(checked) => handleNotificationToggle('weeklyDigest', checked)}
                    disabled={updateNotificationMutation.isPending || notificationLoading}
                    className="ml-6 data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-gray-300" 
                  />
                </div>

                <div className="flex items-center justify-between py-4 px-4 glass-card rounded-lg border">
                  <div className="flex-1">
                    <Label htmlFor="expirationAlerts" className="text-base font-medium text-gray-900">Expiration alerts</Label>
                    <p className="text-sm text-gray-600 mt-1">When deals are about to expire</p>
                  </div>
                  <Switch 
                    id="expirationAlerts" 
                    checked={notificationPreferences?.expirationAlerts ?? true}
                    onCheckedChange={(checked) => handleNotificationToggle('expirationAlerts', checked)}
                    disabled={updateNotificationMutation.isPending || notificationLoading}
                    className="ml-6 data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-gray-300" 
                  />
                </div>

                <div className="flex items-center justify-between py-4 px-4 glass-card rounded-lg border">
                  <div className="flex-1">
                    <Label htmlFor="recommendationUpdates" className="text-base font-medium text-gray-900">New recommendations</Label>
                    <p className="text-sm text-gray-600 mt-1">Personalized product suggestions</p>
                  </div>
                  <Switch 
                    id="recommendationUpdates" 
                    checked={notificationPreferences?.recommendationUpdates ?? true}
                    onCheckedChange={(checked) => handleNotificationToggle('recommendationUpdates', checked)}
                    disabled={updateNotificationMutation.isPending || notificationLoading}
                    className="ml-6 data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-gray-300" 
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ShieldAlert className="w-5 h-5 mr-2 text-orange-600" />
                  Shopping Exceptions
                </CardTitle>
                <CardDescription>Manage temporary changes to your shopping patterns</CardDescription>
              </CardHeader>
              <CardContent>
                <PurchaseAnomalies />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Account Management Sections - Only show when on main profile view */}
        {activeTab === 'profile' && (
          <div className="mt-8 space-y-4">
            <Separator className="my-6" />

            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Account Management</h2>
              <p className="text-sm text-gray-600">Manage your connections and payment options</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Store className="w-5 h-5 mr-2 text-purple-600" />
                  Connected Stores
                </CardTitle>
                <CardDescription>Manage your linked retailer accounts</CardDescription>
              </CardHeader>
              <CardContent>
                <RetailerLinking />
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      <BottomNavigation activeTab="profile" />
    </div>
  );
};

export default ProfilePage;