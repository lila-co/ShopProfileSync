import React, { useState } from 'react';
import { useLocation } from 'wouter';
import Header from '@/components/layout/Header';
import BottomNavigation from '@/components/layout/BottomNavigation';
import ProfileSetup from '@/components/profile/ProfileSetup';
import PurchaseAnomalies from '@/components/profile/PurchaseAnomalies';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCircle, Calendar, Repeat, Timer, BarChart3, LockKeyhole, ShieldAlert } from 'lucide-react';

const ProfilePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'patterns' | 'exceptions'>('profile');
  
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
            {activeTab === 'profile' && <ProfileSetup />}
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
