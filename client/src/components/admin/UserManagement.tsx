
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Input } from './components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from './components/ui/table';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './components/ui/dialog';
import { 
  Users, 
  Search, 
  Eye, 
  BarChart3,
  UserCheck,
  UserX,
  Crown,
  Shield,
  User as UserIcon
} from 'lucide-react';
import { User } from './lib/types';

interface UserStats {
  totalUsers: number;
  usersByRole: Array<{ role: string; count: number }>;
  usersByHouseholdType: Array<{ householdType: string; count: number }>;
  avgHouseholdSize: number;
}

const UserManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    staleTime: 30000,
  });

  const { data: userStats, isLoading: statsLoading } = useQuery<UserStats>({
    queryKey: ['/api/admin/user-stats'],
    staleTime: 30000,
  });

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="h-4 w-4" />;
      case 'admin': return <Shield className="h-4 w-4" />;
      case 'employee': return <UserCheck className="h-4 w-4" />;
      case 'test_user': return <UserX className="h-4 w-4" />;
      default: return <UserIcon className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-red-100 text-red-800';
      case 'employee': return 'bg-blue-100 text-blue-800';
      case 'test_user': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (usersLoading || statsLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Users className="h-4 w-4 mr-2 text-blue-600" />
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {userStats?.totalUsers || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Active accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <BarChart3 className="h-4 w-4 mr-2 text-green-600" />
              Avg Household
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {userStats?.avgHouseholdSize ? Number(userStats.avgHouseholdSize).toFixed(1) : '0'}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              People per household
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Role Distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">User Roles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {userStats?.usersByRole?.map((roleData) => (
              <Badge
                key={roleData.role}
                variant="secondary"
                className={getRoleColor(roleData.role)}
              >
                <span className="flex items-center gap-1">
                  {getRoleIcon(roleData.role)}
                  {roleData.role}: {roleData.count}
                </span>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* User Search and Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">User Database</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Household</TableHead>
                  <TableHead>Preferences</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          @{user.username} • {user.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="secondary" 
                        className={getRoleColor(user.role || 'customer')}
                      >
                        <span className="flex items-center gap-1">
                          {getRoleIcon(user.role || 'customer')}
                          {user.role || 'customer'}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{user.householdType || 'Not specified'}</div>
                        <div className="text-gray-500">
                          {user.householdSize ? `${user.householdSize} people` : 'Size unknown'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.preferOrganic && (
                          <Badge variant="outline" className="text-xs">Organic</Badge>
                        )}
                        {user.preferNameBrand && (
                          <Badge variant="outline" className="text-xs">Brand</Badge>
                        )}
                        {user.buyInBulk && (
                          <Badge variant="outline" className="text-xs">Bulk</Badge>
                        )}
                        {user.prioritizeCostSavings && (
                          <Badge variant="outline" className="text-xs">Savings</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setSelectedUser(user)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>User Details</DialogTitle>
                            <DialogDescription>
                              Complete profile information for {user.firstName} {user.lastName}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium mb-2">Basic Information</h4>
                              <div className="space-y-1 text-sm">
                                <div><strong>Name:</strong> {user.firstName} {user.lastName}</div>
                                <div><strong>Username:</strong> @{user.username}</div>
                                <div><strong>Email:</strong> {user.email}</div>
                                <div><strong>Role:</strong> {user.role || 'customer'}</div>
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="font-medium mb-2">Household</h4>
                              <div className="space-y-1 text-sm">
                                <div><strong>Type:</strong> {user.householdType || 'Not specified'}</div>
                                <div><strong>Size:</strong> {user.householdSize || 'Not specified'} people</div>
                                <div><strong>Shopping Radius:</strong> {user.shoppingRadius || 5} miles</div>
                              </div>
                            </div>

                            <div>
                              <h4 className="font-medium mb-2">Shopping Preferences</h4>
                              <div className="space-y-1 text-sm">
                                <div><strong>Prefers Organic:</strong> {user.preferOrganic ? 'Yes' : 'No'}</div>
                                <div><strong>Prefers Name Brand:</strong> {user.preferNameBrand ? 'Yes' : 'No'}</div>
                                <div><strong>Buys in Bulk:</strong> {user.buyInBulk ? 'Yes' : 'No'}</div>
                                <div><strong>Prioritizes Savings:</strong> {user.prioritizeCostSavings ? 'Yes' : 'No'}</div>
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? 'No users found matching your search.' : 'No users registered yet.'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sample Data Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <Users className="h-5 w-5 text-blue-600 mt-0.5" />
            </div>
            <div>
              <h4 className="font-medium text-blue-900 mb-1">Customer Data Preview</h4>
              <p className="text-sm text-blue-700">
                This shows the structure of customer data once users start signing up. 
                You can see user preferences, household information, and shopping behaviors 
                that will help personalize their experience and generate targeted recommendations.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagement;
