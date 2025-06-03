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
import { User, Settings, Bell, CreditCard, MapPin, Shield, Store, TrendingUp, ShieldAlert, AlertTriangle, Zap, Heart, DollarSign, Users, Globe, Lock, Eye } from 'lucide-react';
import { User as UserType } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const profileSchema = z.object({
  username: z.string().min(2, 'Username must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  zipCode: z.string().optional(),
  dietaryPreferences: z.array(z.string()).optional(),
  budgetRange: z.string().optional(),
  shoppingFrequency: z.string().optional(),
});

const ProfilePage: React.FC = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('profile');

  const { data: user, isLoading } = useQuery<UserType>({
    queryKey: ['/api/user/profile'],
  });

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
    <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
      <Header user={user} />

      <main className="flex-1 overflow-y-auto p-4 pb-20">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">My Profile</h1>
          <p className="text-gray-600">Manage your account settings and preferences</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 text-xs">
            <TabsTrigger value="profile">Profile</TabsTrigger>
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
                          <div className="flex flex-wrap gap-2 mt-2">
                            {['Vegetarian', 'Vegan', 'Gluten-Free', 'Keto', 'Organic', 'Low-Sodium'].map((diet) => (
                              <Badge
                                key={diet}
                                variant={form.watch('dietaryPreferences')?.includes(diet) ? 'default' : 'outline'}
                                className="cursor-pointer"
                                onClick={() => {
                                  const current = form.watch('dietaryPreferences') || [];
                                  const updated = current.includes(diet)
                                    ? current.filter(d => d !== diet)
                                    : [...current, diet];
                                  form.setValue('dietaryPreferences', updated);
                                }}
                              >
                                {diet}
                              </Badge>
                            ))}
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
                <div className="flex items-center justify-between py-2">
                  <div className="flex-1">
                    <Label htmlFor="shareData" className="text-base font-medium">Share anonymous usage data</Label>
                    <p className="text-sm text-gray-500 mt-1">Help improve our service</p>
                  </div>
                  <Switch id="shareData" defaultChecked={true} className="ml-4" />
                </div>

                <Separator />

                <div className="flex items-center justify-between py-2">
                  <div className="flex-1">
                    <Label htmlFor="locationTracking" className="text-base font-medium">Location-based recommendations</Label>
                    <p className="text-sm text-gray-500 mt-1">Get deals from nearby stores</p>
                  </div>
                  <Switch id="locationTracking" defaultChecked={true} className="ml-4" />
                </div>

                <Separator />

                <div className="flex items-center justify-between py-2">
                  <div className="flex-1">
                    <Label htmlFor="profileVisibility" className="text-base font-medium cursor-pointer">Public profile</Label>
                    <p className="text-sm text-gray-500 mt-1">Allow others to see your reviews</p>
                  </div>
                  <Switch 
                    id="profileVisibility" 
                    defaultChecked={false} 
                    className="ml-4"
                    aria-describedby="profileVisibility-description"
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between py-2">
                  <div className="flex-1">
                    <Label htmlFor="dataRetention" className="text-base font-medium cursor-pointer">Data retention</Label>
                    <p className="text-sm text-gray-500 mt-1">Keep purchase history for recommendations</p>
                  </div>
                  <Switch 
                    id="dataRetention" 
                    defaultChecked={true}
                    className="ml-4"
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
                <Button variant="outline" className="w-full">
                  <Eye className="w-4 h-4 mr-2" />
                  Download My Data
                </Button>
                <Button variant="destructive" className="w-full">
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
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="dealAlerts">Deal alerts</Label>
                    <p className="text-sm text-gray-500">Get notified about new deals</p>
                  </div>
                  <Switch id="dealAlerts" defaultChecked={true} />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="priceDrops">Price drop notifications</Label>
                    <p className="text-sm text-gray-500">Items on your list go on sale</p>
                  </div>
                  <Switch id="priceDrops" defaultChecked={true} />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="weeklyDigest">Weekly digest</Label>
                    <p className="text-sm text-gray-500">Summary of savings and trends</p>
                  </div>
                  <Switch id="weeklyDigest" defaultChecked={false} />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="expirationAlerts">Expiration alerts</Label>
                    <p className="text-sm text-gray-500">When deals are about to expire</p>
                  </div>
                  <Switch id="expirationAlerts" defaultChecked={true} />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="recommendationUpdates">New recommendations</Label>
                    <p className="text-sm text-gray-500">Personalized product suggestions</p>
                  </div>
                  <Switch id="recommendationUpdates" defaultChecked={true} />
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