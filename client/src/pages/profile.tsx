import React from 'react';
import Header from '@/components/layout/Header';
import BottomNavigation from '@/components/layout/BottomNavigation';
import ProfileSetup from '@/components/profile/ProfileSetup';

const ProfilePage: React.FC = () => {
  return (
    <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
      <Header title="Profile" />
      
      <main className="flex-1 overflow-y-auto">
        <ProfileSetup />
      </main>
      
      <BottomNavigation activeTab="profile" />
    </div>
  );
};

export default ProfilePage;
