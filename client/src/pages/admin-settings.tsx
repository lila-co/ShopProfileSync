import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import Header from '@/components/layout/Header';
import BottomNavigation from '@/components/layout/BottomNavigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Database, Users, Shield, TrendingUp, ArrowLeft } from 'lucide-react';
import { User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import UserManagement from '@/components/admin/UserManagement';

const AdminSettingsPage: React.FC = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const { data: user } = useQuery<User>({
    queryKey: ['/api/user/profile'],
  });

  const handleAdminAction = (action: string) => {
    toast({
      title: "Admin Action",
      description: `${action} functionality coming soon`,
    });
  };

  return (
    <div className="max-w-4xl mx-auto bg-white min-h-screen flex flex-col">
      <Header user={user} />

      <main className="flex-1 overflow-y-auto p-4 pb-20">
        <div className="mb-6">
          <div className="flex items-center mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin-profile')}
              className="mr-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Admin Settings</h1>
              <p className="text-gray-600">System administration and configuration</p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="database">Database</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="space-y-4">
              <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Shield className="h-5 w-5 mr-2 text-red-600" />
                Security & Compliance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => handleAdminAction('GDPR/CCPA Compliance')}
                >
                  GDPR/CCPA Compliance Settings
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => handleAdminAction('Data Privacy Settings')}
                >
                  Data Privacy & Retention
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => handleAdminAction('Audit Logs')}
                >
                  Security Audit Logs
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate('/admin/monitoring')}
                >
                  View Security Monitoring →
                </Button>
              </div>
            </CardContent>
          </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <UserManagement />
          </TabsContent>

          <TabsContent value="database" className="mt-6">
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <Database className="h-5 w-5 mr-2 text-blue-600" />
                    Database Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => handleAdminAction('Connection Settings')}
                    >
                      Connection Settings
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => handleAdminAction('Backup Schedule')}
                    >
                      Backup Schedule
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => navigate('/admin/monitoring')}
                    >
                      View Database Monitoring →
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="system" className="mt-6">
            <div className="space-y-4">
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
                      onClick={() => handleAdminAction('Rate Limit Configuration')}
                    >
                      Rate Limit & Throttling
                    </Button>
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
                      onClick={() => handleAdminAction('Security Configuration')}
                    >
                      Security Configuration
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <BottomNavigation activeTab="home" />
    </div>
  );
};

export default AdminSettingsPage;