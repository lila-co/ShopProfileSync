
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import Header from '@/components/layout/Header';
import BottomNavigation from '@/components/layout/BottomNavigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, TrendingUp, ShieldAlert, Database, Users, Settings } from 'lucide-react';
import { User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const AdminProfilePage: React.FC = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { data: user } = useQuery<User>({
    queryKey: ['/api/user/profile'],
  });

  // Check if user has admin privileges (you can implement your own logic here)
  const isAdmin = user?.role === 'admin' || user?.username === 'admin' || user?.isAdmin;

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
        <Header user={user} />
        <main className="flex-1 overflow-y-auto p-4 pb-20">
          <div className="text-center mt-20">
            <Shield className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <h1 className="text-xl font-bold text-gray-800 mb-2">Access Denied</h1>
            <p className="text-gray-600 mb-4">You don't have permission to access admin features.</p>
            <Button onClick={() => navigate('/profile')}>
              Return to Profile
            </Button>
          </div>
        </main>
        <BottomNavigation activeTab="profile" />
      </div>
    );
  }

  const handleAdminAction = (action: string) => {
    toast({
      title: "Admin Action",
      description: `${action} functionality coming soon`,
    });
  };

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
      <Header user={user} />

      <main className="flex-1 overflow-y-auto p-4 pb-20">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Administrative tools and analytics for company employees</p>
        </div>

        <div className="space-y-4">
          <Card className="hover:shadow-md transition-all duration-200 cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                Internal Analytics
              </CardTitle>
              <CardDescription>Business intelligence and market insights</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-gray-600">
              Access detailed analytics, customer segments, purchase patterns, and AI-powered demographic insights.
            </CardContent>
            <CardFooter className="pt-0">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/internal/analytics')}
              >
                View Analytics
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

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Database className="h-5 w-5 mr-2 text-blue-600" />
                Database Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => handleAdminAction('Database Status')}
                >
                  View Database Status
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => handleAdminAction('Database Backup')}
                >
                  Backup Database
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => handleAdminAction('Clear Cache')}
                >
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
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => handleAdminAction('View All Users')}
                >
                  View All Users
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => handleAdminAction('User Analytics')}
                >
                  User Analytics
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => handleAdminAction('Export User Data')}
                >
                  Export User Data
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
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => handleAdminAction('Feature Flags')}
                >
                  Feature Flags
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => handleAdminAction('API Integrations')}
                >
                  API Integrations
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => handleAdminAction('System Health')}
                >
                  System Health
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <BottomNavigation activeTab="profile" />
    </div>
  );
};

export default AdminProfilePage;
