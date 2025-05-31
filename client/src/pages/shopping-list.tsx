import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ShoppingList from '@/components/lists/ShoppingList';
import { Plus, Upload, BookOpen, Target, TrendingUp } from 'lucide-react';
import Header from '@/components/layout/Header';
import BottomNavigation from '@/components/layout/BottomNavigation';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { ShoppingList as ShoppingListType, User } from '@/lib/types';

const ShoppingListPage: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [showNewListDialog, setShowNewListDialog] = useState(false);

  const { data: user } = useQuery<User>({
    queryKey: ['/api/user/profile'],
  });

  const { data: shoppingLists, isLoading } = useQuery<ShoppingListType[]>({
    queryKey: ['/api/shopping-lists'],
  });

  const createListMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const response = await apiRequest('POST', '/api/shopping-lists', data);
      return response.json();
    },
    onSuccess: (newList) => {
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
      setSelectedListId(newList.id);
      setShowNewListDialog(false);
      setNewListName('');
      setNewListDescription('');
      toast({
        title: "List Created",
        description: "Your new shopping list has been created."
      });
    }
  });

  const handleCreateList = () => {
    if (newListName.trim()) {
      createListMutation.mutate({
        name: newListName.trim(),
        description: newListDescription.trim() || undefined
      });
    }
  };

  if (selectedListId) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
        <Header 
          title={shoppingLists?.find(list => list.id === selectedListId)?.name || 'Shopping List'} 
          showBackButton 
          onBack={() => setSelectedListId(null)}
        />
        <main className="flex-1 overflow-y-auto">
          <ShoppingList listId={selectedListId} />
        </main>
        <BottomNavigation activeTab="lists" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
      <Header user={user} />

      <main className="flex-1 overflow-y-auto">
        {/* Hero Section */}
        <div className="px-4 pt-6 pb-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">My Lists</h1>
          <p className="text-sm text-gray-600">Organize your shopping with smart lists</p>
        </div>

        {/* Quick Actions */}
        <div className="px-4 mb-6">
          <div className="grid grid-cols-3 gap-3">
            <Dialog open={showNewListDialog} onOpenChange={setShowNewListDialog}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="h-20 flex-col gap-2 border-2 border-dashed border-gray-300 hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <Plus className="h-5 w-5 text-gray-600" />
                  <span className="text-xs font-medium text-gray-700">New List</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm mx-auto">
                <DialogHeader>
                  <DialogTitle>Create New List</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="listName">List Name</Label>
                    <Input
                      id="listName"
                      placeholder="e.g., Weekly Groceries"
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="listDescription">Description (Optional)</Label>
                    <Textarea
                      id="listDescription"
                      placeholder="Add notes about this list..."
                      value={newListDescription}
                      onChange={(e) => setNewListDescription(e.target.value)}
                      className="mt-1 resize-none"
                      rows={3}
                    />
                  </div>
                  <Button 
                    onClick={handleCreateList} 
                    className="w-full"
                    disabled={!newListName.trim() || createListMutation.isPending}
                  >
                    {createListMutation.isPending ? 'Creating...' : 'Create List'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2 border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <Upload className="h-5 w-5 text-gray-600" />
              <span className="text-xs font-medium text-gray-700">Upload</span>
            </Button>

            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2 border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <BookOpen className="h-5 w-5 text-gray-600" />
              <span className="text-xs font-medium text-gray-700">Recipes</span>
            </Button>
          </div>
        </div>

        {/* Lists Section */}
        <div className="px-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Your Lists</h2>
            {shoppingLists && shoppingLists.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {shoppingLists.length} {shoppingLists.length === 1 ? 'list' : 'lists'}
              </Badge>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : shoppingLists && shoppingLists.length > 0 ? (
            <div className="space-y-3">
              {shoppingLists.map((list) => (
                <Card 
                  key={list.id} 
                  className="cursor-pointer hover:shadow-md transition-all duration-200 border-0 shadow-sm bg-white"
                  onClick={() => setSelectedListId(list.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {list.name}
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-sm text-gray-500">
                            {list.items?.length || 0} items
                          </span>
                          {list.updatedAt && (
                            <span className="text-xs text-gray-400">
                              Updated {new Date(list.updatedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        {list.description && (
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                            {list.description}
                          </p>
                        )}
                      </div>
                      <div className="ml-3 flex items-center">
                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Target className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No lists yet</h3>
              <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
                Create your first shopping list to get started with smart shopping
              </p>
              <Button 
                onClick={() => setShowNewListDialog(true)}
                className="w-full max-w-xs"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First List
              </Button>
            </div>
          )}
        </div>

        {/* Smart Features Banner */}
        {shoppingLists && shoppingLists.length > 0 && (
          <div className="px-4 mt-8 mb-8">
            <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-0">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 text-sm">Smart Shopping</h4>
                    <p className="text-xs text-gray-600 mt-1">
                      Get price comparisons and deals across stores
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      <BottomNavigation activeTab="lists" />
    </div>
  );
};

export default ShoppingListPage;