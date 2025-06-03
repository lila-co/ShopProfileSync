
import { storage } from "../storage";
import { getRetailerAPI } from "./retailerIntegration";
import type { StoreDeal, Purchase } from "@shared/schema";

interface CacheConfig {
  dealsTTL: number; // Time to live for deals in minutes
  pricesTTL: number; // Time to live for prices in minutes
  maxCacheSize: number; // Maximum number of cached items
}

import { cacheManager } from './cacheManager';

export class DataOptimizer {
  private config: CacheConfig;

  constructor(config: CacheConfig = {
    dealsTTL: 60, // 1 hour for deals
    pricesTTL: 30, // 30 minutes for prices
    maxCacheSize: 10000
  }) {
    this.config = config;
  }

  /**
   * Get fresh price data with intelligent caching
   */
  async getOptimizedPrice(retailerId: number, productName: string): Promise<number | null> {
    const cacheKey = `price:${retailerId}:${productName.toLowerCase()}`;
    const cachedPrice = cacheManager.get(cacheKey);
    
    if (cachedPrice !== null) {
      return cachedPrice;
    }

    try {
      // Fetch fresh data from retailer API
      const retailerAPI = await getRetailerAPI(retailerId);
      const price = await retailerAPI.getProductPrice(productName);
      
      if (price !== null) {
        // Cache the fresh price
        this.priceCache.set(cacheKey, { price, timestamp: Date.now() });
        
        // Maintain cache size
        if (this.priceCache.size > this.config.maxCacheSize) {
          this.evictOldestEntries(this.priceCache, Math.floor(this.config.maxCacheSize * 0.8));
        }
      }
      
      return price;
    } catch (error) {
      console.error(`Error fetching price for ${productName} from retailer ${retailerId}:`, error);
      
      // Return cached data if API fails
      return cached?.price || null;
    }
  }

  /**
   * Get optimized deals with database + API hybrid approach
   */
  async getOptimizedDeals(retailerId?: number, category?: string): Promise<StoreDeal[]> {
    const cacheKey = `deals-${retailerId || 'all'}-${category || 'all'}`;
    const cached = this.dealCache.get(cacheKey);
    
    // Check if cached data is still fresh
    if (cached && (Date.now() - cached.timestamp) < this.config.dealsTTL * 60 * 1000) {
      return cached.deals;
    }

    try {
      // Get base deals from database (fastest)
      const dbDeals = await storage.getDeals(retailerId, category);
      
      // Filter out expired deals
      const now = new Date();
      const activeDeals = dbDeals.filter(deal => new Date(deal.endDate) > now);
      
      // For critical retailers, also fetch fresh deals from API
      if (retailerId && [1, 2, 3].includes(retailerId)) { // Major retailers
        try {
          const freshDeals = await this.fetchFreshDealsFromAPI(retailerId, category);
          
          // Merge and deduplicate deals
          const mergedDeals = this.mergeDeals(activeDeals, freshDeals);
          
          // Cache the merged results
          this.dealCache.set(cacheKey, { deals: mergedDeals, timestamp: Date.now() });
          
          return mergedDeals;
        } catch (apiError) {
          console.warn(`API fetch failed for retailer ${retailerId}, using database deals:`, apiError);
        }
      }
      
      // Cache database results
      this.dealCache.set(cacheKey, { deals: activeDeals, timestamp: Date.now() });
      
      return activeDeals;
    } catch (error) {
      console.error('Error fetching optimized deals:', error);
      return cached?.deals || [];
    }
  }

  /**
   * Batch update deals for efficiency
   */
  async batchUpdateDeals(retailerIds: number[]): Promise<void> {
    const updatePromises = retailerIds.map(async (retailerId) => {
      try {
        const retailerAPI = await getRetailerAPI(retailerId);
        
        // Fetch fresh deals from retailer API
        const freshDeals = await this.fetchFreshDealsFromAPI(retailerId);
        
        // Update database with fresh deals
        for (const deal of freshDeals) {
          await storage.createDeal({
            retailerId: deal.retailerId,
            productName: deal.productName,
            regularPrice: deal.regularPrice,
            salePrice: deal.salePrice,
            startDate: new Date(deal.startDate),
            endDate: new Date(deal.endDate),
            category: deal.category,
            dealSource: "api_sync"
          });
        }
        
        // Clear cache for this retailer to force fresh fetch
        this.clearRetailerCache(retailerId);
        
      } catch (error) {
        console.error(`Failed to update deals for retailer ${retailerId}:`, error);
      }
    });

    await Promise.allSettled(updatePromises);
  }

  /**
   * Track user transactions for analytics
   */
  async trackUserTransaction(userId: number, retailerId: number, items: any[], totalAmount: number): Promise<Purchase> {
    // Store transaction in database
    const purchase = await storage.createPurchase({
      userId,
      retailerId,
      purchaseDate: new Date(),
      totalAmount,
      receiptData: { items }
    });

    // Update price cache with actual purchase prices
    for (const item of items) {
      const cacheKey = `${retailerId}-${item.productName.toLowerCase()}`;
      this.priceCache.set(cacheKey, { 
        price: item.unitPrice, 
        timestamp: Date.now() 
      });
    }

    return purchase;
  }

  /**
   * Get shopping list with optimized pricing including manual circular deals
   */
  async getOptimizedShoppingList(shoppingListId: number): Promise<any> {
    const listItems = await storage.getShoppingListItems(shoppingListId);
    const retailers = await storage.getRetailers();
    
    const optimizedItems = await Promise.all(
      listItems.map(async (item) => {
        // Get all deals for this product from database (includes manual uploads)
        const allDeals = await storage.getDeals();
        const productDeals = allDeals.filter(deal => 
          deal.productName.toLowerCase().includes(item.productName.toLowerCase()) ||
          item.productName.toLowerCase().includes(deal.productName.toLowerCase())
        );

        // Get prices from all retailers, considering both API prices and manual deals
        const pricePromises = retailers.map(async (retailer) => {
          // Check if there's a manual deal for this product at this retailer
          const manualDeal = productDeals.find(deal => 
            deal.retailerId === retailer.id && 
            new Date(deal.endDate) > new Date() // Deal is still active
          );

          let price = null;
          let dealInfo = null;

          if (manualDeal) {
            // Use the manual deal price
            price = manualDeal.salePrice;
            dealInfo = {
              isDeal: true,
              regularPrice: manualDeal.regularPrice,
              savings: manualDeal.regularPrice - manualDeal.salePrice,
              source: manualDeal.dealSource || 'manual_upload'
            };
          } else {
            // Fall back to API price
            price = await this.getOptimizedPrice(retailer.id, item.productName);
          }

          return {
            retailerId: retailer.id,
            retailerName: retailer.name,
            price,
            dealInfo
          };
        });
        
        const prices = await Promise.all(pricePromises);
        const availablePrices = prices.filter(p => p.price !== null);
        
        // Find best price, prioritizing deals from manual uploads
        const bestPrice = availablePrices.reduce((min, current) => {
          // If current has a deal and min doesn't, prefer current
          if (current.dealInfo?.isDeal && !min.dealInfo?.isDeal) {
            return current;
          }
          // If min has a deal and current doesn't, prefer min
          if (min.dealInfo?.isDeal && !current.dealInfo?.isDeal) {
            return min;
          }
          // Otherwise, compare prices
          return current.price! < min.price! ? current : min;
        }, availablePrices[0]);
        
        return {
          ...item,
          availablePrices,
          bestPrice: bestPrice || null,
          hasManualDeals: productDeals.length > 0
        };
      })
    );
    
    return optimizedItems;
  }

  private async fetchFreshDealsFromAPI(retailerId: number, category?: string): Promise<StoreDeal[]> {
    // This would integrate with actual retailer APIs
    // For now, return empty array as placeholder
    return [];
  }

  private mergeDeals(dbDeals: StoreDeal[], apiDeals: StoreDeal[]): StoreDeal[] {
    const merged = [...dbDeals];
    
    for (const apiDeal of apiDeals) {
      const exists = merged.find(deal => 
        deal.retailerId === apiDeal.retailerId && 
        deal.productName === apiDeal.productName &&
        deal.salePrice === apiDeal.salePrice
      );
      
      if (!exists) {
        merged.push(apiDeal);
      }
    }
    
    return merged;
  }

  private evictOldestEntries(cache: Map<string, any>, targetSize: number): void {
    const entries = Array.from(cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const toRemove = entries.slice(0, entries.length - targetSize);
    toRemove.forEach(([key]) => cache.delete(key));
  }

  private clearRetailerCache(retailerId: number): void {
    // Clear price cache for this retailer
    for (const [key] of this.priceCache) {
      if (key.startsWith(`${retailerId}-`)) {
        this.priceCache.delete(key);
      }
    }
    
    // Clear deal cache for this retailer
    for (const [key] of this.dealCache) {
      if (key.includes(`-${retailerId}-`)) {
        this.dealCache.delete(key);
      }
    }
  }
}

export const dataOptimizer = new DataOptimizer();
