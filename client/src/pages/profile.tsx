import React, { useState } from 'react';
import { useLocation } from 'wouter';
import Header from '@/components/layout/Header';
import BottomNavigation from '@/components/layout/BottomNavigation';
import ProfileSetup from '@/components/profile/ProfileSetup';
import RetailerLinking from '@/components/profile/RetailerLinking';
import PurchaseAnomalies from '@/components/profile/PurchaseAnomalies';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCircle, Calendar, Repeat, Timer, BarChart3, LockKeyhole, ShieldAlert, Store } from 'lucide-react';

const ProfilePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'patterns' | 'exceptions'>('profile');
  const [, navigate] = useLocation();

  return (
    <div className="max-w-4xl mx-auto bg-white min-h-screen flex flex-col">
      <Header title="Profile" />

      <main className="flex-1 overflow-y-auto p-4">
        <div className="w-full space-y-6">
          {/* Custom Tab Navigation */}
          <div className="grid w-full border rounded-lg overflow-hidden grid-cols-3">
            <Button
              variant={activeTab === 'profile' ? 'default' : 'ghost'}
              className={`rounded-none ${activeTab === 'profile' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              onClick={() => setActiveTab('profile')}
            >
              <UserCircle className="w-4 h-4 mr-2" />
              My Profile
            </Button>
            <Button
              variant={activeTab === 'patterns' ? 'default' : 'ghost'}
              className={`rounded-none ${activeTab === 'patterns' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              onClick={() => setActiveTab('patterns')}
            >
              <Repeat className="w-4 h-4 mr-2" />
              Seasonal Patterns
            </Button>
            <Button
              variant={activeTab === 'exceptions' ? 'default' : 'ghost'}
              className={`rounded-none ${activeTab === 'exceptions' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              onClick={() => setActiveTab('exceptions')}
            >
              <Timer className="w-4 h-4 mr-2" />
              Temporary Exceptions
            </Button>
          </div>

          {/* Tab Content */}
          <div className="mt-6">
            {activeTab === 'profile' && (
              <>
                <ProfileSetup />

                {/* RETAILER ACCOUNT LINKING */}
                <div className="mt-6 mb-8">
                  <div className="bg-primary/5 rounded-xl p-4 border border-primary/20 mb-4">
                    <h2 className="text-xl font-bold mb-2 flex items-center text-primary">
                      <Store className="w-5 h-5 mr-2" />
                      Connected Retailers
                    </h2>
                    <p className="text-sm text-gray-600">
                      Link your store accounts to automatically import purchase history and get personalized recommendations.
                    </p>
                  </div>

                  <RetailerLinking />
                </div>

                {/* ADMIN ACCESS SECTION */}
                <div className="mt-8">
                  <Separator className="mb-4" />
                  <h2 className="text-xl font-bold mb-4 flex items-center">
                    <LockKeyhole className="w-5 h-5 mr-2 text-amber-500" />
                    Admin Access
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="hover:shadow-md transition-all duration-200 cursor-pointer">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center">
                          <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
                          Internal Analytics
                        </CardTitle>
                        <CardDescription>Access comprehensive analytics and reporting</CardDescription>
                      </CardHeader>
                      <CardContent className="text-sm text-gray-600">
                        View customer segments, shopping patterns, and retailer performance data to optimize the shopping experience.
                      </CardContent>
                      <CardFooter className="pt-0">
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => navigate('/internal/analytics')}
                        >
                          Access Analytics
                        </Button>
                      </CardFooter>
                    </Card>

                    <Card className="hover:shadow-md transition-all duration-200 cursor-pointer">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center">
                          <ShieldAlert className="w-5 h-5 mr-2 text-red-600" />
                          System Administration
                        </CardTitle>
                        <CardDescription>Manage system settings and configurations</CardDescription>
                      </CardHeader>
                      <CardContent className="text-sm text-gray-600">
                        Configure app settings, manage retailer integrations, and monitor system performance.
                      </CardContent>
                      <CardFooter className="pt-0">
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => navigate('/admin-settings')}
                        >
                          System Settings
                        </Button>
                      </CardFooter>
                    </Card>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'patterns' && (
              <div className="bg-white rounded-lg p-4">
                <h2 className="text-lg font-bold mb-4">Recurring Shopping Patterns</h2>
                <p className="text-gray-600 mb-4">
                  Add long-term or recurring shopping pattern changes like summer breaks, college semesters, 
                  seasonal preferences, or annual events that affect your household's shopping habits.
                </p>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6">
                  <h3 className="text-blue-800 font-medium mb-2 flex items-center">
                    <Repeat className="w-4 h-4 mr-2" />
                    Why this matters
                  </h3>
                  <p className="text-sm text-blue-700">
                    Teaching SmartCart about your recurring shopping patterns helps the app identify trends over 
                    time and provide more personalized recommendations year after year. For example, if your 
                    family consumes more groceries when kids are home for summer break, the app can anticipate 
                    this pattern in future years.
                  </p>
                </div>

                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">This feature is coming soon!</p>
                  <p className="text-sm text-gray-400">
                    Soon you'll be able to add recurring shopping patterns for events like:
                    <br />
                    Summer breaks • School semesters • Seasonal sports • Annual holidays
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'exceptions' && <PurchaseAnomalies />}
          </div>
        </div>
      </main>

      <BottomNavigation activeTab="profile" />
    </div>
  );
};

export default ProfilePage;