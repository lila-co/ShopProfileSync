import { useQuery } from '@tanstack/react-query';
import { apiRequest } from './lib/queryClient';

interface BatchRequest {
  id: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  params?: Record<string, any>;
  body?: any;
  priority?: 'high' | 'medium' | 'low';
}

interface BatchResponse {
  id: string;
  status: number;
  data?: any;
  error?: string;
  timing: number;
}

export function useBatchApi(requests: BatchRequest[], enabled: boolean = true) {
  return useQuery({
    queryKey: ['batch-api', requests.map(r => r.id).join(',')],
    queryFn: async () => {
      const response = await fetch('/api/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests })
      });
      
      if (!response.ok) {
        throw new Error(`Batch API failed: ${response.status}`);
      }
      
      const data = await response.json();
      return data.responses as BatchResponse[];
    },
    enabled: enabled && requests.length > 0,
    staleTime: 300000, // 5 minutes
    gcTime: 600000,   // 10 minutes
  });
}

export function useDashboardData() {
  const dashboardRequests: BatchRequest[] = [
    {
      id: 'shopping-lists',
      endpoint: '/api/shopping-lists',
      method: 'GET',
      priority: 'high'
    },
    {
      id: 'recommendations',
      endpoint: '/api/recommendations',
      method: 'GET',
      priority: 'high'
    },
    {
      id: 'user-profile',
      endpoint: '/api/user/profile',
      method: 'GET',
      priority: 'medium'
    },
    {
      id: 'retailer-accounts',
      endpoint: '/api/user/retailer-accounts',
      method: 'GET',
      priority: 'medium'
    },
    {
      id: 'monthly-savings',
      endpoint: '/api/insights/monthly-savings',
      method: 'GET',
      priority: 'low'
    },
    {
      id: 'contextual-insights',
      endpoint: '/api/insights/contextual',
      method: 'GET',
      priority: 'low'
    }
  ];

  const { data: batchResponses, isLoading, error } = useBatchApi(dashboardRequests);

  // Transform batch responses into individual data objects
  const transformedData = batchResponses?.reduce((acc, response) => {
    if (response.status < 400 && response.data) {
      acc[response.id] = response.data;
    }
    return acc;
  }, {} as Record<string, any>) || {};

  return {
    data: {
      shoppingLists: transformedData['shopping-lists'] || [],
      recommendations: transformedData['recommendations'] || [],
      userProfile: transformedData['user-profile'] || null,
      retailerAccounts: transformedData['retailer-accounts'] || [],
      monthlySavings: transformedData['monthly-savings'] || 0,
      contextualInsights: transformedData['contextual-insights'] || {}
    },
    isLoading,
    error,
    responses: batchResponses
  };
}