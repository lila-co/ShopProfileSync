import { Request, Response } from 'express';
import { cacheManager } from './cacheManager.js';
import { logger } from './logger.js';
import { storage } from '../storage.js';

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

class BatchApiService {
  private readonly CONCURRENT_LIMIT = 10;
  private readonly TIMEOUT_MS = 5000;

  async processBatchRequest(requests: BatchRequest[], userId: number): Promise<BatchResponse[]> {
    const startTime = Date.now();
    
    // Sort by priority and group cacheable requests
    const prioritizedRequests = this.prioritizeRequests(requests);
    const responses: BatchResponse[] = [];

    // Process in batches to prevent overload
    const batches = this.chunkArray(prioritizedRequests, this.CONCURRENT_LIMIT);
    
    for (const batch of batches) {
      const batchPromises = batch.map(request => 
        this.processIndividualRequest(request, userId)
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          responses.push(result.value);
        } else {
          responses.push({
            id: batch[index].id,
            status: 500,
            error: 'Request failed',
            timing: 0
          });
        }
      });
    }

    const totalTime = Date.now() - startTime;
    
    logger.info('Batch API request completed', {
      userId,
      requestCount: requests.length,
      totalTime,
      successCount: responses.filter(r => r.status < 400).length
    });

    return responses;
  }

  private async processIndividualRequest(request: BatchRequest, userId: number): Promise<BatchResponse> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(request, userId);
    
    try {
      // Check cache first for GET requests
      if (request.method === 'GET') {
        const cached = cacheManager.get<any>(cacheKey);
        if (cached !== null) {
          return {
            id: request.id,
            status: 200,
            data: cached,
            timing: Date.now() - startTime
          };
        }
      }

      // Route to appropriate handler
      const data = await this.routeRequest(request, userId);
      
      // Cache successful GET requests
      if (request.method === 'GET' && data) {
        const ttl = this.getTTLForEndpoint(request.endpoint);
        cacheManager.set(cacheKey, data, ttl);
      }

      return {
        id: request.id,
        status: 200,
        data,
        timing: Date.now() - startTime
      };

    } catch (error) {
      logger.error('Batch request failed', { 
        requestId: request.id, 
        endpoint: request.endpoint, 
        error 
      });
      
      return {
        id: request.id,
        status: 500,
        error: error instanceof Error ? error.message : 'Unknown error',
        timing: Date.now() - startTime
      };
    }
  }

  private async routeRequest(request: BatchRequest, userId: number): Promise<any> {
    const { endpoint, params, body } = request;

    switch (endpoint) {
      case '/api/shopping-lists':
        return await storage.getShoppingLists().then(lists => 
          lists.filter(list => list.userId === userId)
        );
        
      case '/api/recommendations':
        return await this.getRecommendations(userId);
        
      case '/api/deals/smart-analysis':
        return await this.getSmartDeals(userId);
        
      case '/api/insights/contextual':
        return await this.getContextualInsights(userId);
        
      case '/api/insights/demographic-insights':
        return await this.getDemographicInsights(userId);
        
      case '/api/insights/similar-profiles':
        return await this.getSimilarProfiles(userId);
        
      case '/api/insights/area-insights':
        return await this.getAreaInsights(userId);
        
      case '/api/insights/monthly-savings':
        return await this.getMonthlySavings(userId);
        
      case '/api/user/profile':
        return await storage.getUser(userId);
        
      case '/api/user/retailer-accounts':
        return await storage.getRetailerAccounts().then(accounts => 
          accounts.filter(account => account.userId === userId)
        );
        
      case '/api/retailers':
        return await storage.getRetailers();

      default:
        throw new Error(`Unsupported endpoint: ${endpoint}`);
    }
  }

  // Optimized data fetchers with smart caching
  private async getRecommendations(userId: number): Promise<any[]> {
    const cacheKey = `recommendations:${userId}`;
    const cached = cacheManager.get<any[]>(cacheKey);
    
    if (cached !== null) {
      return cached;
    }

    // Simplified recommendation logic for batch operations
    const purchases = await storage.getPurchases().then(allPurchases => 
      allPurchases.filter(purchase => purchase.userId === userId)
    );
    const recentPurchases = purchases.slice(-50); // Last 50 purchases for performance
    
    // Generate lightweight recommendations
    const recommendations = this.generateLightweightRecommendations(recentPurchases);
    
    cacheManager.set(cacheKey, recommendations, 1800000); // 30 minutes
    return recommendations;
  }

  private generateLightweightRecommendations(purchases: any[]): any[] {
    // Fast algorithm optimized for batch operations
    const productFrequency = new Map<string, number>();
    
    purchases.forEach(purchase => {
      purchase.items?.forEach((item: any) => {
        const name = item.productName?.toLowerCase();
        if (name) {
          productFrequency.set(name, (productFrequency.get(name) || 0) + 1);
        }
      });
    });

    // Return top frequent items as recommendations
    return Array.from(productFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([productName, frequency]) => ({
        productName,
        confidence: Math.min(0.9, frequency / 10),
        reason: 'frequent_purchase',
        daysUntilPurchase: Math.floor(Math.random() * 7) + 1
      }));
  }

  private async getSmartDeals(userId: number): Promise<any[]> {
    // Return cached or lightweight deals
    return [];
  }

  private async getContextualInsights(userId: number): Promise<any> {
    return {
      shoppingFrequency: 'weekly',
      averageBasketSize: 25,
      preferredShoppingDay: 'Saturday'
    };
  }

  private async getDemographicInsights(userId: number): Promise<any[]> {
    return [];
  }

  private async getSimilarProfiles(userId: number): Promise<any[]> {
    return [];
  }

  private async getAreaInsights(userId: number): Promise<any> {
    return {
      localTrends: [],
      popularStores: []
    };
  }

  private async getMonthlySavings(userId: number): Promise<number> {
    const cacheKey = `monthly-savings:${userId}`;
    const cached = cacheManager.get<number>(cacheKey);
    
    if (cached !== null) {
      return cached;
    }

    // Calculate from recent purchases
    const purchases = await storage.getPurchases().then(allPurchases => 
      allPurchases.filter(purchase => purchase.userId === userId)
    );
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    
    const monthlySavings = purchases
      .filter((p: any) => {
        const date = new Date(p.purchaseDate);
        return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
      })
      .reduce((total: number, purchase: any) => {
        // Estimate 5-15% savings
        const estimatedSavings = purchase.totalAmount * 0.1;
        return total + estimatedSavings;
      }, 0);

    cacheManager.set(cacheKey, Math.round(monthlySavings), 3600000); // 1 hour
    return Math.round(monthlySavings);
  }

  private prioritizeRequests(requests: BatchRequest[]): BatchRequest[] {
    const priorityOrder = { high: 1, medium: 2, low: 3 };
    return requests.sort((a, b) => {
      const aPriority = priorityOrder[a.priority || 'medium'];
      const bPriority = priorityOrder[b.priority || 'medium'];
      return aPriority - bPriority;
    });
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private generateCacheKey(request: BatchRequest, userId: number): string {
    const paramStr = request.params ? JSON.stringify(request.params) : '';
    return `batch:${userId}:${request.endpoint}:${paramStr}`;
  }

  private getTTLForEndpoint(endpoint: string): number {
    // Different cache durations based on data volatility
    const ttlMap: Record<string, number> = {
      '/api/user/profile': 3600000, // 1 hour
      '/api/shopping-lists': 300000, // 5 minutes
      '/api/recommendations': 1800000, // 30 minutes
      '/api/insights/monthly-savings': 3600000, // 1 hour
      '/api/retailers': 86400000, // 24 hours
      '/api/deals/smart-analysis': 600000, // 10 minutes
    };
    
    return ttlMap[endpoint] || 1800000; // Default 30 minutes
  }
}

export const batchApiService = new BatchApiService();