import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Settings, Users, Store, Bell, Shield, Database, Cloud, Globe, Key } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

const AdminSettings: React.FC = () => {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState('general');
  
  const saveSettings = () => {
    toast({
      title: "Settings saved",
      description: "Your changes have been successfully saved.",
    });
  };
  
  return (
    <div className="container mx-auto py-6 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Administration</h1>
          <p className="text-gray-500">Configure and manage SavvyCart system settings</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/profile')}>
          Back to Profile
        </Button>
      </div>
      
      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <div className="col-span-12 md:col-span-3">
          <Card>
            <CardContent className="p-4">
              <nav className="space-y-1 mt-2">
                <Button variant={activeTab === 'general' ? 'default' : 'ghost'} className="w-full justify-start" onClick={() => setActiveTab('general')}>
                  <Settings className="mr-2 h-4 w-4" />
                  General
                </Button>
                <Button variant={activeTab === 'users' ? 'default' : 'ghost'} className="w-full justify-start" onClick={() => setActiveTab('users')}>
                  <Users className="mr-2 h-4 w-4" />
                  User Management
                </Button>
                <Button variant={activeTab === 'retailers' ? 'default' : 'ghost'} className="w-full justify-start" onClick={() => setActiveTab('retailers')}>
                  <Store className="mr-2 h-4 w-4" />
                  Retailer Integrations
                </Button>
                <Button variant={activeTab === 'notifications' ? 'default' : 'ghost'} className="w-full justify-start" onClick={() => setActiveTab('notifications')}>
                  <Bell className="mr-2 h-4 w-4" />
                  Notifications
                </Button>
                <Button variant={activeTab === 'security' ? 'default' : 'ghost'} className="w-full justify-start" onClick={() => setActiveTab('security')}>
                  <Shield className="mr-2 h-4 w-4" />
                  Security
                </Button>
                <Button variant={activeTab === 'database' ? 'default' : 'ghost'} className="w-full justify-start" onClick={() => setActiveTab('database')}>
                  <Database className="mr-2 h-4 w-4" />
                  Database
                </Button>
                <Button variant={activeTab === 'api' ? 'default' : 'ghost'} className="w-full justify-start" onClick={() => setActiveTab('api')}>
                  <Globe className="mr-2 h-4 w-4" />
                  API Configuration
                </Button>
              </nav>
            </CardContent>
          </Card>
          
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg">System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">API Server</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Online</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Database</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Connected</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Job Queue</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Running</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Redis Cache</span>
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Warning</Badge>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Last updated: 2 minutes ago
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Main Content */}
        <div className="col-span-12 md:col-span-9">
          {/* General Settings */}
          {activeTab === 'general' && (
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>Configure application-wide settings and preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="app-name">Application Name</Label>
                  <Input id="app-name" defaultValue="SavvyCart" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="support-email">Support Email</Label>
                  <Input id="support-email" defaultValue="support@savvycart.com" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="default-language">Default Language</Label>
                    <select 
                      id="default-language" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      defaultValue="en-US"
                    >
                      <option value="en-US">English (US)</option>
                      <option value="es-ES">Spanish</option>
                      <option value="fr-FR">French</option>
                      <option value="de-DE">German</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Default Timezone</Label>
                    <select 
                      id="timezone" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      defaultValue="America/New_York"
                    >
                      <option value="America/New_York">Eastern Time (US & Canada)</option>
                      <option value="America/Chicago">Central Time (US & Canada)</option>
                      <option value="America/Denver">Mountain Time (US & Canada)</option>
                      <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                      <option value="Europe/London">London</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="maintenance-mode" className="flex-1">Maintenance Mode</Label>
                  <Switch id="maintenance-mode" />
                </div>
                
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="allow-registration" className="flex-1">Allow New User Registration</Label>
                  <Switch id="allow-registration" defaultChecked />
                </div>
                
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="enable-analytics" className="flex-1">Enable Analytics Tracking</Label>
                  <Switch id="enable-analytics" defaultChecked />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end space-x-2">
                <Button variant="outline">Reset to Defaults</Button>
                <Button onClick={saveSettings}>Save Changes</Button>
              </CardFooter>
            </Card>
          )}
          
          {/* Retailer Integrations */}
          {activeTab === 'retailers' && (
            <Card>
              <CardHeader>
                <CardTitle>Retailer Integrations</CardTitle>
                <CardDescription>Manage retailer API connections and data sources</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 p-4 border-b">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                            <Store className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-medium">Walmart API Integration</h3>
                            <p className="text-sm text-gray-500">Connected: Products, Circulars, Inventory</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                      </div>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label htmlFor="walmart-api-key" className="text-xs font-medium">API Key</Label>
                          <div className="flex">
                            <Input id="walmart-api-key" type="password" value="●●●●●●●●●●●●●●●●●●●●" readOnly className="rounded-r-none" />
                            <Button variant="outline" className="rounded-l-none border-l-0">Show</Button>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="walmart-api-version" className="text-xs font-medium">API Version</Label>
                          <Input id="walmart-api-version" defaultValue="v3" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between space-x-2">
                        <Label htmlFor="walmart-enable-products" className="text-xs font-medium">Enable Product Catalog</Label>
                        <Switch id="walmart-enable-products" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between space-x-2">
                        <Label htmlFor="walmart-enable-circulars" className="text-xs font-medium">Enable Weekly Circulars</Label>
                        <Switch id="walmart-enable-circulars" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between space-x-2">
                        <Label htmlFor="walmart-enable-inventory" className="text-xs font-medium">Enable Inventory Status</Label>
                        <Switch id="walmart-enable-inventory" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between space-x-2">
                        <Label htmlFor="walmart-enable-ordering" className="text-xs font-medium">Enable Online Ordering</Label>
                        <Switch id="walmart-enable-ordering" />
                      </div>
                      <div className="pt-3 flex justify-end space-x-2">
                        <Button variant="outline" size="sm">Test Connection</Button>
                        <Button variant="outline" size="sm">Sync Now</Button>
                        <Button variant="default" size="sm">Save</Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 p-4 border-b">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                            <Store className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-medium">Target API Integration</h3>
                            <p className="text-sm text-gray-500">Connected: Products, Deals</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-gray-600">Click to configure Target integration settings</p>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 p-4 border-b">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                            <Store className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-medium">Kroger API Integration</h3>
                            <p className="text-sm text-gray-500">Connected: Products, Circulars, Loyalty</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Maintenance</Badge>
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-gray-600">Click to configure Kroger integration settings</p>
                    </div>
                  </div>
                  
                  <Button className="w-full" variant="outline">
                    + Add New Retailer Integration
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* API Configuration */}
          {activeTab === 'api' && (
            <Card>
              <CardHeader>
                <CardTitle>API Configuration</CardTitle>
                <CardDescription>Manage API keys and external integrations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 p-4 border-b">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                          <Key className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-medium">OpenAI API Integration</h3>
                          <p className="text-sm text-gray-500">Used for: Receipt parsing, Recommendations</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="openai-api-key" className="text-xs font-medium">API Key</Label>
                        <div className="flex">
                          <Input id="openai-api-key" type="password" value="●●●●●●●●●●●●●●●●●●●●" readOnly className="rounded-r-none" />
                          <Button variant="outline" className="rounded-l-none border-l-0">Show</Button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="openai-model" className="text-xs font-medium">Default Model</Label>
                        <select id="openai-model" className="w-full px-3 py-2 border border-gray-300 rounded-md">
                          <option value="gpt-4o">GPT-4o</option>
                          <option value="gpt-4-turbo">GPT-4 Turbo</option>
                          <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                        </select>
                      </div>
                    </div>
                    <div className="pt-3 flex justify-end space-x-2">
                      <Button variant="outline" size="sm">Test Connection</Button>
                      <Button variant="default" size="sm">Save</Button>
                    </div>
                  </div>
                </div>
                
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 p-4 border-b">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                          <Cloud className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-medium">AWS S3 Configuration</h3>
                          <p className="text-sm text-gray-500">Used for: Image storage, Backup</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-gray-600">Click to configure AWS S3 settings</p>
                  </div>
                </div>
                
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 p-4 border-b">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                          <Cloud className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-medium">Twilio SMS Integration</h3>
                          <p className="text-sm text-gray-500">Used for: Notifications, Alerts</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Not Configured</Badge>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-gray-600">Click to configure Twilio SMS settings</p>
                  </div>
                </div>
                
                <Button className="w-full" variant="outline">
                  + Add New API Integration
                </Button>
              </CardContent>
            </Card>
          )}
          
          {/* Other tabs would be implemented similarly */}
          {activeTab !== 'general' && activeTab !== 'retailers' && activeTab !== 'api' && (
            <Card>
              <CardHeader>
                <CardTitle>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Settings</CardTitle>
                <CardDescription>This section is under development</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="py-8 text-center">
                  <p className="text-gray-500">The {activeTab} configuration panel is coming soon!</p>
                  <p className="text-sm text-gray-400 mt-2">Check back later for updates</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;