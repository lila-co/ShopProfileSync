import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import BottomNavigation from '@/components/layout/BottomNavigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Database, Users, Shield } from 'lucide-react';
import { User } from '@/lib/types';

const AdminSettingsPage: React.FC = () => {
  const { data: user } = useQuery<User>({
    queryKey: ['/api/user/profile'],
  });

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
      <Header user={user} />

      <main className="flex-1 overflow-y-auto p-4 pb-20">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Admin Settings</h1>
          <p className="text-gray-600">System administration and configuration</p>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Database className="h-5 w-5 mr-2 text-blue-600" />
                Database Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  View Database Status
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Backup Database
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Clear Cache
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Users className="h-5 w-5 mr-2 text-green-600" />
                User Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  View All Users
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  User Analytics
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Export User Data
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Shield className="h-5 w-5 mr-2 text-red-600" />
                Security & Compliance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  Security Logs
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  API Rate Limits
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Data Privacy Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Settings className="h-5 w-5 mr-2 text-purple-600" />
                System Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  Feature Flags
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  API Integrations
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  System Health
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <BottomNavigation activeTab="home" />
    </div>
  );
};

export default AdminSettingsPage;