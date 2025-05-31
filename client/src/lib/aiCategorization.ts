
export interface AICategorization {
  category: string;
  confidence: number;
  aisle: string;
  section: string;
  suggestedQuantity?: number;
  suggestedUnit?: string;
  conversionReason?: string;
}

export interface CategoryCache {
  [productName: string]: {
    result: AICategorization;
    timestamp: number;
    ttl: number; // Time to live in milliseconds
  };
}

class AICategorationService {
  private cache: CategoryCache = {};
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_CACHE_SIZE = 1000;

  // Clear expired cache entries
  private cleanCache(): void {
    const now = Date.now();
    Object.keys(this.cache).forEach(key => {
      if (now > this.cache[key].timestamp + this.cache[key].ttl) {
        delete this.cache[key];
      }
    });

    // If cache is still too large, remove oldest entries
    const entries = Object.entries(this.cache);
    if (entries.length > this.MAX_CACHE_SIZE) {
      entries
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .slice(0, entries.length - this.MAX_CACHE_SIZE)
        .forEach(([key]) => delete this.cache[key]);
    }
  }

  // Get categorization from cache or API
  async categorizeProduct(productName: string): Promise<AICategorization | null> {
    const normalizedName = productName.toLowerCase().trim();
    
    // Check cache first
    const cached = this.cache[normalizedName];
    if (cached && Date.now() < cached.timestamp + cached.ttl) {
      return cached.result;
    }

    try {
      const response = await fetch('/api/products/batch-categorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          items: [{ productName, quantity: 1, unit: 'COUNT' }]
        })
      });

      if (response.ok) {
        const results = await response.json();
        if (results && results.length > 0) {
          const result: AICategorization = {
            category: results[0].category.category,
            confidence: results[0].category.confidence,
            aisle: results[0].category.aisle,
            section: results[0].category.section,
            suggestedQuantity: results[0].normalized.suggestedQuantity,
            suggestedUnit: results[0].normalized.suggestedUnit,
            conversionReason: results[0].normalized.conversionReason
          };

          // Cache the result
          this.cache[normalizedName] = {
            result,
            timestamp: Date.now(),
            ttl: this.CACHE_TTL
          };

          // Clean cache periodically
          if (Math.random() < 0.1) { // 10% chance to clean cache
            this.cleanCache();
          }

          return result;
        }
      }
    } catch (error) {
      console.warn('AI categorization failed for:', productName, error);
    }

    return null;
  }

  // Batch categorize multiple items efficiently
  async categorizeProducts(items: Array<{productName: string, quantity?: number, unit?: string}>): Promise<AICategorization[]> {
    const results: AICategorization[] = [];
    const uncachedItems: typeof items = [];
    const itemIndexMap: number[] = [];

    // Check cache for each item
    items.forEach((item, index) => {
      const normalizedName = item.productName.toLowerCase().trim();
      const cached = this.cache[normalizedName];
      
      if (cached && Date.now() < cached.timestamp + cached.ttl) {
        results[index] = cached.result;
      } else {
        uncachedItems.push(item);
        itemIndexMap.push(index);
      }
    });

    // Batch API call for uncached items
    if (uncachedItems.length > 0) {
      try {
        const response = await fetch('/api/products/batch-categorize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ items: uncachedItems })
        });

        if (response.ok) {
          const apiResults = await response.json();
          
          apiResults.forEach((apiResult: any, index: number) => {
            const originalIndex = itemIndexMap[index];
            const result: AICategorization = {
              category: apiResult.category.category,
              confidence: apiResult.category.confidence,
              aisle: apiResult.category.aisle,
              section: apiResult.category.section,
              suggestedQuantity: apiResult.normalized.suggestedQuantity,
              suggestedUnit: apiResult.normalized.suggestedUnit,
              conversionReason: apiResult.normalized.conversionReason
            };

            results[originalIndex] = result;

            // Cache the result
            const normalizedName = uncachedItems[index].productName.toLowerCase().trim();
            this.cache[normalizedName] = {
              result,
              timestamp: Date.now(),
              ttl: this.CACHE_TTL
            };
          });
        }
      } catch (error) {
        console.warn('Batch AI categorization failed:', error);
      }
    }

    return results;
  }

  // Get quick fallback categorization for immediate UI response
  getQuickCategory(productName: string): { category: string; confidence: number } {
    const name = productName.toLowerCase();
    
    const patterns = [
      { 
        patterns: [/\b(banana|apple|orange|grape|strawberr|tomato|onion|carrot|potato|lettuce|spinach|broccoli|pepper|cucumber|garlic)\w*/i], 
        category: 'Produce', 
        confidence: 0.8 
      },
      { 
        patterns: [/\b(milk|cheese|yogurt|egg|butter|cream)\w*/i], 
        category: 'Dairy & Eggs', 
        confidence: 0.8 
      },
      { 
        patterns: [/\b(beef|chicken|pork|turkey|fish|meat|salmon|tuna)\w*/i], 
        category: 'Meat & Seafood', 
        confidence: 0.8 
      },
      { 
        patterns: [/\b(bread|loaf|roll|bagel|muffin|cake|cookie)\w*/i], 
        category: 'Bakery', 
        confidence: 0.8 
      },
      { 
        patterns: [/\b(frozen|ice cream|popsicle)\w*/i], 
        category: 'Frozen Foods', 
        confidence: 0.8 
      },
      { 
        patterns: [/\b(shampoo|soap|toothpaste|deodorant|lotion)\w*/i], 
        category: 'Personal Care', 
        confidence: 0.7 
      },
      { 
        patterns: [/\b(cleaner|detergent|towel|tissue|toilet paper|paper towel)\w*/i], 
        category: 'Household Items', 
        confidence: 0.7 
      }
    ];
    
    for (const { patterns, category, confidence } of patterns) {
      if (patterns.some(pattern => pattern.test(name))) {
        return { category, confidence };
      }
    }
    
    return { category: 'Pantry & Canned Goods', confidence: 0.3 };
  }

  // Clear cache manually
  clearCache(): void {
    this.cache = {};
  }

  // Get cache statistics
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: Object.keys(this.cache).length,
      hitRate: 0 // Could be implemented with hit/miss counters
    };
  }
}

export const aiCategorizationService = new AICategorationService();

