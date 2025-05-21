import React, { useState } from 'react';
import Header from '@/components/layout/Header';
import BottomNavigation from '@/components/layout/BottomNavigation';
import ProfileSetup from '@/components/profile/ProfileSetup';
import PurchaseAnomalies from '@/components/profile/PurchaseAnomalies';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserCircle, Calendar } from 'lucide-react';

const ProfilePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState("profile");
  
  return (
    <div className="max-w-4xl mx-auto bg-white min-h-screen flex flex-col">
      <Header title="Profile" />
      
      <main className="flex-1 overflow-y-auto p-4">
        <Tabs defaultValue="profile" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="profile" className="flex items-center">
              <UserCircle className="w-4 h-4 mr-2" />
              My Profile
            </TabsTrigger>
            <TabsTrigger value="exceptions" className="flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              Shopping Exceptions
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="mt-0">
            <ProfileSetup />
          </TabsContent>
          
          <TabsContent value="exceptions" className="mt-0">
            <PurchaseAnomalies />
          </TabsContent>
        </Tabs>
      </main>
      
      <BottomNavigation activeTab="profile" />
    </div>
  );
};

export default ProfilePage;
