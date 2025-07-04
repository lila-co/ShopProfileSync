import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from './lib/queryClient';
import { useToast } from './hooks/use-toast';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { DatePicker } from './components/ui/date-picker';
import { Checkbox } from './components/ui/checkbox';
import { Badge } from './components/ui/badge';
import { Trash, Plus, Calendar } from 'lucide-react';
import { format } from 'date-fns';

// Anomaly types from our schema
const ANOMALY_TYPES = [
  { value: 'VACATION', label: 'Vacation' },
  { value: 'SEASONAL', label: 'Seasonal Change' },
  { value: 'HOLIDAY', label: 'Holiday' },
  { value: 'SICKNESS', label: 'Illness' },
  { value: 'GUESTS', label: 'Hosting Guests' },
  { value: 'OTHER', label: 'Other' }
];

// Common product categories that could be affected
const PRODUCT_CATEGORIES = [
  'Dairy',
  'Produce',
  'Meat',
  'Seafood',
  'Bakery',
  'Frozen Foods',
  'Beverages',
  'Snacks',
  'Household',
  'Personal Care'
];

export type PurchaseAnomaly = {
  id: number;
  userId: number;
  name: string;
  anomalyType: string;
  startDate: string;
  endDate: string;
  description: string | null;
  affectedCategories: string[];
  excludeFromRecommendations: boolean;
};

export default function PurchaseAnomalies() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [newAnomaly, setNewAnomaly] = useState<Partial<PurchaseAnomaly>>({
    name: '',
    anomalyType: 'VACATION',
    startDate: new Date().toISOString(),
    endDate: new Date().toISOString(),
    description: '',
    affectedCategories: [],
    excludeFromRecommendations: true
  });

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Get all anomalies
  const { data: anomalies = [], isLoading } = useQuery({
    queryKey: ['/api/anomalies'],
    queryFn: async () => {
      const response = await fetch('/api/anomalies');
      if (!response.ok) {
        throw new Error('Failed to fetch anomalies');
      }
      return response.json();
    }
  });

  // Create anomaly mutation
  const createAnomalyMutation = useMutation({
    mutationFn: async (anomaly: Partial<PurchaseAnomaly>) => {
      const response = await fetch('/api/anomalies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...anomaly, affectedCategories: selectedCategories })
      });
      if (!response.ok) {
        throw new Error('Failed to create anomaly');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/anomalies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/recommendations'] });
      toast({
        title: 'Success',
        description: 'Shopping pattern exception added successfully!',
      });
      setIsAddingNew(false);
      setNewAnomaly({
        name: '',
        anomalyType: 'VACATION',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        description: '',
        affectedCategories: [],
        excludeFromRecommendations: true
      });
      setSelectedCategories([]);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to add shopping pattern exception.',
        variant: 'destructive'
      });
      console.error(error);
    }
  });

  // Delete anomaly mutation
  const deleteAnomalyMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/anomalies/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error('Failed to delete anomaly');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/anomalies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/recommendations'] });
      toast({
        title: 'Success',
        description: 'Shopping pattern exception removed successfully!',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to remove shopping pattern exception.',
        variant: 'destructive'
      });
      console.error(error);
    }
  });

  const handleCategoryToggle = (category: string) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter(c => c !== category));
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
  };

  const handleCreateAnomaly = () => {
    if (!newAnomaly.name) {
      toast({
        title: 'Missing information',
        description: 'Please provide a name for this shopping pattern exception.',
        variant: 'destructive'
      });
      return;
    }

    createAnomalyMutation.mutate(newAnomaly);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this shopping pattern exception?')) {
      deleteAnomalyMutation.mutate(id);
    }
  };

  function formatDate(dateString: string) {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (e) {
      return 'Invalid date';
    }
  }

  function getBadgeColor(type: string) {
    switch (type) {
      case 'VACATION': return 'bg-blue-500';
      case 'SEASONAL': return 'bg-green-500';
      case 'HOLIDAY': return 'bg-red-500';
      case 'SICKNESS': return 'bg-yellow-500';
      case 'GUESTS': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  }

  function getAnomalyTypeLabel(type: string) {
    const anomalyType = ANOMALY_TYPES.find(t => t.value === type);
    return anomalyType ? anomalyType.label : type;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Shopping Pattern Exceptions</h2>
        {!isAddingNew && (
          <Button onClick={() => setIsAddingNew(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Exception
          </Button>
        )}
      </div>
      
      <p className="text-muted-foreground">
        Add exceptions to your normal shopping patterns, like vacations or holidays, to help SmartCart make smarter recommendations.
      </p>
      
      {isAddingNew && (
        <Card>
          <CardHeader>
            <CardTitle>New Shopping Pattern Exception</CardTitle>
            <CardDescription>
              Tell us about temporary changes to your shopping habits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input 
                  id="name" 
                  placeholder="Summer Vacation" 
                  value={newAnomaly.name}
                  onChange={(e) => setNewAnomaly({...newAnomaly, name: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select 
                  value={newAnomaly.anomalyType} 
                  onValueChange={(value) => setNewAnomaly({...newAnomaly, anomalyType: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ANOMALY_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <DatePicker
                  selected={newAnomaly.startDate ? new Date(newAnomaly.startDate) : null}
                  onSelect={(date) => date && setNewAnomaly({...newAnomaly, startDate: date.toISOString()})}
                  placeholderText="Select start date"
                />
              </div>
              
              <div className="space-y-2">
                <Label>End Date</Label>
                <DatePicker
                  selected={newAnomaly.endDate ? new Date(newAnomaly.endDate) : null}
                  onSelect={(date) => date && setNewAnomaly({...newAnomaly, endDate: date.toISOString()})}
                  placeholderText="Select end date"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input 
                id="description" 
                placeholder="Going on vacation, won't need regular groceries" 
                value={newAnomaly.description || ''}
                onChange={(e) => setNewAnomaly({...newAnomaly, description: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Affected Product Categories</Label>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-5">
                {PRODUCT_CATEGORIES.map(category => (
                  <div key={category} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`category-${category}`} 
                      checked={selectedCategories.includes(category)}
                      onCheckedChange={() => handleCategoryToggle(category)}
                    />
                    <Label htmlFor={`category-${category}`} className="text-sm font-normal">
                      {category}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="excludeFromRecommendations"
                checked={newAnomaly.excludeFromRecommendations}
                onCheckedChange={(checked) => 
                  setNewAnomaly({...newAnomaly, excludeFromRecommendations: checked === true})}
              />
              <Label htmlFor="excludeFromRecommendations">
                Exclude from recommendations during this period
              </Label>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setIsAddingNew(false)}>Cancel</Button>
            <Button onClick={handleCreateAnomaly} disabled={createAnomalyMutation.isPending}>
              {createAnomalyMutation.isPending ? 'Saving...' : 'Save Exception'}
            </Button>
          </CardFooter>
        </Card>
      )}
      
      {isLoading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : anomalies.length === 0 && !isAddingNew ? (
        <Card className="bg-muted/50">
          <CardContent className="pt-6 text-center">
            <p>You haven't added any shopping pattern exceptions yet.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Add exceptions like vacations, holidays, or other special circumstances to help SmartCart make better recommendations.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {anomalies.map(anomaly => (
            <Card key={anomaly.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <Badge className={getBadgeColor(anomaly.anomalyType)}>
                      {getAnomalyTypeLabel(anomaly.anomalyType)}
                    </Badge>
                    <CardTitle className="mt-2">{anomaly.name}</CardTitle>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDelete(anomaly.id)}
                    disabled={deleteAnomalyMutation.isPending}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pb-2 text-sm">
                <div className="flex items-center text-muted-foreground mb-2">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>{formatDate(anomaly.startDate)} - {formatDate(anomaly.endDate)}</span>
                </div>
                
                {anomaly.description && (
                  <p className="mb-2">{anomaly.description}</p>
                )}
                
                {anomaly.affectedCategories && anomaly.affectedCategories.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-1">Affected Categories:</p>
                    <div className="flex flex-wrap gap-1">
                      {anomaly.affectedCategories.map(category => (
                        <Badge key={category} variant="outline" className="text-xs">
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {anomaly.excludeFromRecommendations && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Excluded from recommendations during this period
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}