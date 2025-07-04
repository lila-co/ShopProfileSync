
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Crown, TestTube, User, ShieldCheck } from 'lucide-react';
import { useToast } from './hooks/use-toast';
import { apiRequest } from './lib/queryClient';

interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isAdmin: boolean;
}

interface RoleSwitchProps {
  currentUser: User;
}

const RoleSwitch: React.FC<RoleSwitchProps> = ({ currentUser }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentUserHeader, setCurrentUserHeader] = useState<string>('1');

  const switchRoleMutation = useMutation({
    mutationFn: async (targetRole: string) => {
      const response = await apiRequest('POST', '/api/user/switch-role', {
        targetRole
      }, {
        'x-current-user-id': currentUserHeader
      });
      return response.json();
    },
    onSuccess: (targetUser: User) => {
      // Update the current user header to switch context
      setCurrentUserHeader(targetUser.id.toString());
      
      // Invalidate all user-related queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
      queryClient.invalidateQueries({ queryKey: ['/api/recommendations'] });
      
      toast({
        title: "Role Switched Successfully",
        description: `You are now viewing as: ${targetUser.firstName} ${targetUser.lastName} (${targetUser.role})`,
      });

      // Reload the page to ensure all data is refreshed with the new user context
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    },
    onError: (error: any) => {
      toast({
        title: "Role Switch Failed",
        description: error.message || "Failed to switch roles. Please try again.",
        variant: "destructive"
      });
    }
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4" />;
      case 'admin':
        return <ShieldCheck className="w-4 h-4" />;
      case 'test_user':
        return <TestTube className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'admin':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'test_user':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Only show role switching if current user is owner
  if (currentUser.role !== 'owner') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            {getRoleIcon(currentUser.role)}
            <span className="ml-2">Current Role</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Badge className={getRoleBadgeColor(currentUser.role)}>
            {currentUser.role.replace('_', ' ').toUpperCase()}
          </Badge>
          <p className="text-sm text-gray-600 mt-2">
            {currentUser.firstName} {currentUser.lastName}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Crown className="w-5 h-5 mr-2 text-purple-600" />
          Role Management
        </CardTitle>
        <CardDescription>
          Switch between owner view and test user view to test different user experiences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center space-x-3">
            <Crown className="w-5 h-5 text-purple-600" />
            <div>
              <p className="font-medium">Company Owner</p>
              <p className="text-sm text-gray-600">Full admin access</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {currentUser.role === 'owner' && (
              <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                Current
              </Badge>
            )}
            {currentUser.role !== 'owner' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => switchRoleMutation.mutate('owner')}
                disabled={switchRoleMutation.isPending}
              >
                Switch to Owner
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center space-x-3">
            <TestTube className="w-5 h-5 text-orange-600" />
            <div>
              <p className="font-medium">Test User</p>
              <p className="text-sm text-gray-600">Customer experience view</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {currentUser.role === 'test_user' && (
              <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                Current
              </Badge>
            )}
            {currentUser.role !== 'test_user' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => switchRoleMutation.mutate('test_user')}
                disabled={switchRoleMutation.isPending}
              >
                Switch to Test User
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Current User:</strong> {currentUser.firstName} {currentUser.lastName}
          </p>
          <p className="text-sm text-blue-600">
            Role: {currentUser.role.replace('_', ' ').toUpperCase()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default RoleSwitch;
