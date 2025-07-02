
export interface CategoryPrediction {
  category: string;
  confidence: number;
  source: 'cache' | 'pattern' | 'ai' | 'frequency' | 'learned';
  cost: number; // in cents
  latency: number; // in ms
}

export interface CategorizationStrategy {
  preferLocal: boolean;
  maxAiCost: number; // per session
  batchSize: number;
  confidenceThreshold: number;
}

export class SmartCategorizationEngine {
  private dailyAiCost = 0;
  private readonly MAX_DAILY_AI_COST = 500; // $5 per day
  private readonly HIGH_CONFIDENCE_THRESHOLD = 0.85;
  
  // Core product database - only for high-frequency items
  private coreProductDb = new Map<string, { category: string; confidence: number; frequency: number }>();
  
  constructor() {
    this.initializeCoreDatabase();
  }

  async categorizeProducts(
    items: string[], 
    strategy: CategorizationStrategy = this.getDefaultStrategy()
  ): Promise<CategoryPrediction[]> {
    const results: CategoryPrediction[] = [];
    const aiCandidates: string[] = [];
    
    // Phase 1: Try local/cached resolution first
    for (const item of items) {
      const localResult = this.tryLocalCategorization(item);
      
      if (localResult && localResult.confidence >= strategy.confidenceThreshold) {
        results.push(localResult);
      } else {
        aiCandidates.push(item);
      }
    }
    
    // Phase 2: Batch AI calls for remaining items
    if (aiCandidates.length > 0 && this.shouldUseAI(strategy)) {
      const aiResults = await this.batchAiCategorization(aiCandidates, strategy.batchSize);
      results.push(...aiResults);
      
      // Phase 3: Learn and cache successful AI results
      this.learnFromAiResults(aiResults);
    } else {
      // Fallback to pattern matching for remaining items
      const fallbackResults = aiCandidates.map(item => this.fallbackCategorization(item));
      results.push(...fallbackResults);
    }
    
    return results;
  }
  
  private initializeCoreDatabase(): void {
    // Only store the top 10K most common grocery items
    // This covers ~80% of typical shopping lists
    const commonItems = [
      { name: 'milk', category: 'Dairy & Eggs', frequency: 10000 },
      { name: 'bread', category: 'Bakery', frequency: 9500 },
      { name: 'eggs', category: 'Dairy & Eggs', frequency: 9000 },
      { name: 'bananas', category: 'Produce', frequency: 8500 },
      { name: 'chicken breast', category: 'Meat & Seafood', frequency: 8000 },
      // ... would be populated from purchase frequency data
    ];
    
    commonItems.forEach(item => {
      this.coreProductDb.set(item.name.toLowerCase(), {
        category: item.category,
        confidence: 0.95,
        frequency: item.frequency
      });
    });
  }
  
  private tryLocalCategorization(productName: string): CategoryPrediction | null {
    const normalized = productName.toLowerCase().trim();
    
    // 1. Check core database first (fastest)
    const coreMatch = this.coreProductDb.get(normalized);
    if (coreMatch) {
      return {
        category: coreMatch.category,
        confidence: coreMatch.confidence,
        source: 'cache',
        cost: 0,
        latency: 1
      };
    }
    
    // 2. Check user learning cache
    const learnedMatch = this.checkLearnedPatterns(normalized);
    if (learnedMatch && learnedMatch.confidence > 0.8) {
      return learnedMatch;
    }
    
    // 3. Pattern matching for obvious cases
    const patternMatch = this.advancedPatternMatching(normalized);
    if (patternMatch && patternMatch.confidence > 0.8) {
      return patternMatch;
    }
    
    return null;
  }
  
  private shouldUseAI(strategy: CategorizationStrategy): boolean {
    return this.dailyAiCost < this.MAX_DAILY_AI_COST;
  }
  
  private async batchAiCategorization(items: string[], batchSize: number): Promise<CategoryPrediction[]> {
    const results: CategoryPrediction[] = [];
    
    // Process in batches to optimize API calls
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const startTime = Date.now();
      
      try {
        // Use your existing AI service but in batches
        const aiResults = await this.callExternalAI(batch);
        const latency = Date.now() - startTime;
        const cost = this.calculateAiCost(batch.length);
        
        this.dailyAiCost += cost;
        
        results.push(...aiResults.map(result => ({
          ...result,
          source: 'ai' as const,
          cost: cost / batch.length,
          latency: latency / batch.length
        })));
        
      } catch (error) {
        console.warn('AI categorization failed, using fallback:', error);
        results.push(...batch.map(item => this.fallbackCategorization(item)));
      }
    }
    
    return results;
  }
  
  private learnFromAiResults(results: CategoryPrediction[]): void {
    results.forEach(result => {
      if (result.confidence > this.HIGH_CONFIDENCE_THRESHOLD) {
        // Add to core database if it's a frequent item
        // This gradually builds your local database from AI learnings
        this.coreProductDb.set(result.category.toLowerCase(), {
          category: result.category,
          confidence: result.confidence,
          frequency: 1
        });
      }
    });
  }
  
  private advancedPatternMatching(productName: string): CategoryPrediction | null {
    // Your existing pattern matching logic but enhanced
    // This should handle 60-70% of common items
    return null; // Implement based on your existing logic
  }
  
  private checkLearnedPatterns(productName: string): CategoryPrediction | null {
    // Check your ML categorizer
    return null; // Implement based on your existing ML service
  }
  
  private fallbackCategorization(productName: string): CategoryPrediction {
    return {
      category: 'Pantry & Canned Goods',
      confidence: 0.3,
      source: 'pattern',
      cost: 0,
      latency: 5
    };
  }
  
  private async callExternalAI(items: string[]): Promise<any[]> {
    // Implement your AI API call here
    return [];
  }
  
  private calculateAiCost(itemCount: number): number {
    // Estimate based on your AI provider pricing
    return itemCount * 0.001; // $0.001 per item
  }
  
  private getDefaultStrategy(): CategorizationStrategy {
    return {
      preferLocal: true,
      maxAiCost: 100, // $1 per session
      batchSize: 10,
      confidenceThreshold: 0.75
    };
  }
  
  // Analytics for optimization
  getCostAnalytics(): {
    dailyCost: number;
    localHitRate: number;
    avgLatency: number;
    accuracy: number;
  } {
    return {
      dailyCost: this.dailyAiCost,
      localHitRate: 0.8, // Calculate from your metrics
      avgLatency: 15,
      accuracy: 0.92
    };
  }
}
