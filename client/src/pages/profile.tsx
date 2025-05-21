import React, { useState } from 'react';
import Header from '@/components/layout/Header';
import BottomNavigation from '@/components/layout/BottomNavigation';
import ProfileSetup from '@/components/profile/ProfileSetup';
import PurchaseAnomalies from '@/components/profile/PurchaseAnomalies';
import { Button } from '@/components/ui/button';
import { UserCircle, Calendar } from 'lucide-react';

const ProfilePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'exceptions'>('profile');
  
  return (
    <div className="max-w-4xl mx-auto bg-white min-h-screen flex flex-col">
      <Header title="Profile" />
      
      <main className="flex-1 overflow-y-auto p-4">
        <div className="w-full space-y-6">
          {/* Custom Tab Navigation */}
          <div className="flex w-full border rounded-lg overflow-hidden">
            <Button
              variant={activeTab === 'profile' ? 'default' : 'ghost'}
              className={`flex-1 rounded-none ${activeTab === 'profile' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              onClick={() => setActiveTab('profile')}
            >
              <UserCircle className="w-4 h-4 mr-2" />
              My Profile
            </Button>
            <Button
              variant={activeTab === 'exceptions' ? 'default' : 'ghost'}
              className={`flex-1 rounded-none ${activeTab === 'exceptions' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              onClick={() => setActiveTab('exceptions')}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Shopping Exceptions
            </Button>
          </div>
          
          {/* Tab Content */}
          <div className="mt-6">
            {activeTab === 'profile' && <ProfileSetup />}
            {activeTab === 'exceptions' && <PurchaseAnomalies />}
          </div>
        </div>
      </main>
      
      <BottomNavigation activeTab="profile" />
    </div>
  );
};

export default ProfilePage;
