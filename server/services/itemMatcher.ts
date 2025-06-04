
export interface MatchResult {
  confidence: number;
  matchType: 'exact' | 'fuzzy' | 'brand' | 'category' | 'none';
  retailerProduct: any;
  deal?: any;
  explanation: string;
}

export class ItemMatcherService {
  private brandMappings: Map<string, string[]> = new Map();
  private categoryMappings: Map<string, string[]> = new Map();
  private commonSubstitutions: Map<string, string> = new Map();

  constructor() {
    this.initializeMappings();
  }

  private initializeMappings() {
    // Brand mappings for store brands
    this.brandMappings.set('walmart', [
      'great value', 'marketside', 'equate', 'parent\'s choice', 'sam\'s choice'
    ]);
    this.brandMappings.set('target', [
      'good & gather', 'market pantry', 'simply balanced', 'archer farms', 'up & up'
    ]);
    this.brandMappings.set('kroger', [
      'kroger brand', 'simple truth', 'private selection', 'comfy', 'heritage farm'
    ]);

    // Category-based substitutions
    this.categoryMappings.set('milk', [
      'whole milk', '2% milk', 'skim milk', 'organic milk', 'lactaid milk'
    ]);
    this.categoryMappings.set('bread', [
      'white bread', 'wheat bread', 'whole grain bread', 'sourdough bread'
    ]);

    // Common substitutions
    this.commonSubstitutions.set('bananas', 'banana');
    this.commonSubstitutions.set('apples', 'apple');
    this.commonSubstitutions.set('tomatoes', 'tomato');
  }

  /**
   * Find best matches for shopping list items at a specific retailer
   */
  async findMatches(
    shoppingListItems: any[], 
    retailerId: number, 
    availableProducts: any[], 
    availableDeals: any[],
    userPreferences?: {
      preferNameBrand?: boolean;
      preferOrganic?: boolean;
      buyInBulk?: boolean;
      prioritizeCostSavings?: boolean;
    }
  ): Promise<Map<number, MatchResult>> {
    const matches = new Map<number, MatchResult>();

    for (const item of shoppingListItems) {
      const bestMatch = await this.findBestMatch(
        item, 
        retailerId, 
        availableProducts, 
        availableDeals,
        userPreferences
      );
      matches.set(item.id, bestMatch);
    }

    return matches;
  }

  /**
   * Find the best match for a single item considering user preferences
   */
  private async findBestMatch(
    shoppingListItem: any,
    retailerId: number,
    availableProducts: any[],
    availableDeals: any[],
    userPreferences?: {
      preferNameBrand?: boolean;
      preferOrganic?: boolean;
      buyInBulk?: boolean;
      prioritizeCostSavings?: boolean;
    }
  ): Promise<MatchResult> {
    const itemName = this.normalizeProductName(shoppingListItem.productName);
    
    // Get all potential matches first
    const potentialMatches = [];
    
    // 1. Exact matches
    const exactMatches = this.findAllExactMatches(itemName, availableProducts);
    exactMatches.forEach(product => {
      potentialMatches.push({
        product,
        matchType: 'exact' as const,
        confidence: 1.0,
        deal: this.findDealForProduct(product, availableDeals)
      });
    });

    // 2. Brand-aware matches
    const brandMatches = this.findAllBrandMatches(itemName, retailerId, availableProducts);
    brandMatches.forEach(match => {
      potentialMatches.push({
        product: match.product,
        matchType: 'brand' as const,
        confidence: match.confidence,
        deal: this.findDealForProduct(match.product, availableDeals)
      });
    });

    // 3. Fuzzy matches
    const fuzzyMatches = this.findAllFuzzyMatches(itemName, availableProducts);
    fuzzyMatches.filter(m => m.confidence > 0.7).forEach(match => {
      potentialMatches.push({
        product: match.product,
        matchType: 'fuzzy' as const,
        confidence: match.confidence,
        deal: this.findDealForProduct(match.product, availableDeals)
      });
    });

    // 4. Category matches
    const categoryMatches = this.findAllCategoryMatches(itemName, availableProducts);
    categoryMatches.forEach(match => {
      potentialMatches.push({
        product: match.product,
        matchType: 'category' as const,
        confidence: match.confidence,
        deal: this.findDealForProduct(match.product, availableDeals)
      });
    });

    if (potentialMatches.length === 0) {
      return {
        confidence: 0,
        matchType: 'none',
        retailerProduct: null,
        explanation: `No suitable match found for "${shoppingListItem.productName}"`
      };
    }

    // 5. Apply user preference filtering and cost optimization
    const bestMatch = this.selectBestMatchWithPreferences(potentialMatches, userPreferences);
    
    return {
      confidence: bestMatch.confidence,
      matchType: bestMatch.matchType,
      retailerProduct: bestMatch.product,
      deal: bestMatch.deal,
      explanation: bestMatch.explanation
    };
  }

  private findExactMatch(itemName: string, products: any[]): any | null {
    return products.find(product => 
      this.normalizeProductName(product.name) === itemName ||
      this.normalizeProductName(product.name).includes(itemName) ||
      itemName.includes(this.normalizeProductName(product.name))
    ) || null;
  }

  private findAllExactMatches(itemName: string, products: any[]): any[] {
    return products.filter(product => 
      this.normalizeProductName(product.name) === itemName ||
      this.normalizeProductName(product.name).includes(itemName) ||
      itemName.includes(this.normalizeProductName(product.name))
    );
  }

  private findAllBrandMatches(itemName: string, retailerId: number, products: any[]): Array<{ product: any, confidence: number }> {
    const retailerName = this.getRetailerName(retailerId);
    const storeBrands = this.brandMappings.get(retailerName) || [];
    const matches = [];
    
    for (const product of products) {
      const productName = this.normalizeProductName(product.name);
      
      for (const brand of storeBrands) {
        if (productName.includes(brand)) {
          const productWithoutBrand = productName.replace(brand, '').trim();
          const similarity = this.calculateSimilarity(itemName, productWithoutBrand);
          if (similarity > 0.8) {
            matches.push({
              product,
              confidence: 0.9
            });
          }
        }
      }
    }
    
    return matches;
  }

  private findAllFuzzyMatches(itemName: string, products: any[]): Array<{ product: any, confidence: number }> {
    const matches = [];
    
    for (const product of products) {
      const productName = this.normalizeProductName(product.name);
      const similarity = this.calculateSimilarity(itemName, productName);
      
      if (similarity > 0.6) {
        matches.push({ product, confidence: similarity });
      }
    }
    
    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  private findAllCategoryMatches(itemName: string, products: any[]): Array<{ product: any, confidence: number }> {
    const matches = [];
    
    for (const [category, variations] of this.categoryMappings.entries()) {
      if (itemName.includes(category)) {
        for (const variation of variations) {
          const categoryMatches = products.filter(product => 
            this.normalizeProductName(product.name).includes(variation)
          );
          categoryMatches.forEach(product => {
            matches.push({ product, confidence: 0.8 });
          });
        }
      }
    }
    
    return matches;
  }

  private selectBestMatchWithPreferences(
    potentialMatches: Array<{
      product: any;
      matchType: 'exact' | 'brand' | 'fuzzy' | 'category';
      confidence: number;
      deal: any;
    }>,
    userPreferences?: {
      preferNameBrand?: boolean;
      preferOrganic?: boolean;
      buyInBulk?: boolean;
      prioritizeCostSavings?: boolean;
    }
  ): any {
    let scoredMatches = potentialMatches.map(match => {
      let score = match.confidence * 100; // Base score from match confidence
      const product = match.product;
      const productName = product.name.toLowerCase();
      
      // Calculate cost per unit for comparison
      const basePrice = match.deal ? match.deal.salePrice : (product.price || 500);
      const quantity = product.quantity || 1;
      const costPerUnit = basePrice / quantity;
      
      // Apply user preferences
      if (userPreferences) {
        // Prefer organic products if user prefers organic
        if (userPreferences.preferOrganic && 
            (productName.includes('organic') || productName.includes('natural'))) {
          score += 20;
        }
        
        // Prefer name brand if user prefers name brand
        if (userPreferences.preferNameBrand && product.isNameBrand) {
          score += 15;
        } else if (!userPreferences.preferNameBrand && !product.isNameBrand) {
          // Prefer store brands if user doesn't prefer name brand
          score += 10;
        }
        
        // Bulk preferences
        if (userPreferences.buyInBulk && quantity > 6) {
          score += 25;
        } else if (!userPreferences.buyInBulk && quantity <= 6) {
          score += 10;
        }
        
        // Cost savings priority
        if (userPreferences.prioritizeCostSavings) {
          if (match.deal) {
            const savings = (product.price - match.deal.salePrice) / product.price;
            score += savings * 30; // Up to 30 points for good deals
          }
          // Bonus for lower cost per unit
          score += Math.max(0, 20 - (costPerUnit / 10));
        }
      }
      
      // Always factor in cost efficiency (lower cost per unit gets higher score)
      const costEfficiencyScore = Math.max(0, 50 - (costPerUnit / 5));
      score += costEfficiencyScore;
      
      // Bonus for deals regardless of user preference
      if (match.deal) {
        score += 15;
      }
      
      // Match type priority (exact > brand > fuzzy > category)
      const matchTypeBonuses = {
        'exact': 50,
        'brand': 30,
        'fuzzy': 10,
        'category': 5
      };
      score += matchTypeBonuses[match.matchType];
      
      return {
        ...match,
        score,
        costPerUnit,
        explanation: this.generateMatchExplanation(match, userPreferences, costPerUnit)
      };
    });
    
    // Sort by score (highest first)
    scoredMatches.sort((a, b) => b.score - a.score);
    
    return scoredMatches[0];
  }

  private generateMatchExplanation(
    match: any,
    userPreferences?: any,
    costPerUnit?: number
  ): string {
    const parts = [];
    
    // Match type explanation
    const matchExplanations = {
      'exact': 'Exact product match',
      'brand': 'Store brand alternative',
      'fuzzy': `Similar product (${Math.round(match.confidence * 100)}% match)`,
      'category': 'Category substitute'
    };
    parts.push(matchExplanations[match.matchType]);
    
    // Deal information
    if (match.deal) {
      const savings = ((match.product.price - match.deal.salePrice) / match.product.price * 100).toFixed(1);
      parts.push(`${savings}% off sale`);
    }
    
    // Cost per unit
    if (costPerUnit) {
      parts.push(`$${(costPerUnit / 100).toFixed(2)}/unit`);
    }
    
    // User preference alignment
    if (userPreferences) {
      const productName = match.product.name.toLowerCase();
      
      if (userPreferences.preferOrganic && productName.includes('organic')) {
        parts.push('organic as preferred');
      }
      
      if (userPreferences.buyInBulk && (match.product.quantity || 1) > 6) {
        parts.push('bulk size as preferred');
      }
      
      if (userPreferences.prioritizeCostSavings && match.deal) {
        parts.push('great value');
      }
    }
    
    return parts.join(', ');
  }

  private findBrandMatch(itemName: string, retailerId: number, products: any[]): { product: any | null, confidence: number, explanation: string } {
    const retailerName = this.getRetailerName(retailerId);
    const storeBrands = this.brandMappings.get(retailerName) || [];
    
    // Look for store brand versions of the item
    for (const product of products) {
      const productName = this.normalizeProductName(product.name);
      
      // Check if product has store brand and matches our item
      for (const brand of storeBrands) {
        if (productName.includes(brand)) {
          const productWithoutBrand = productName.replace(brand, '').trim();
          if (this.calculateSimilarity(itemName, productWithoutBrand) > 0.8) {
            return {
              product,
              confidence: 0.9,
              explanation: `Store brand version: ${product.name}`
            };
          }
        }
      }
    }

    return { product: null, confidence: 0, explanation: '' };
  }

  private findFuzzyMatch(itemName: string, products: any[]): { product: any, confidence: number } {
    let bestMatch = { product: null, confidence: 0 };

    for (const product of products) {
      const productName = this.normalizeProductName(product.name);
      const similarity = this.calculateSimilarity(itemName, productName);
      
      if (similarity > bestMatch.confidence) {
        bestMatch = { product, confidence: similarity };
      }
    }

    return bestMatch;
  }

  private findCategoryMatch(itemName: string, products: any[]): { product: any | null, confidence: number } {
    // Look for category-based substitutions
    for (const [category, variations] of this.categoryMappings.entries()) {
      if (itemName.includes(category)) {
        for (const variation of variations) {
          const match = products.find(product => 
            this.normalizeProductName(product.name).includes(variation)
          );
          if (match) {
            return { product: match, confidence: 0.8 };
          }
        }
      }
    }

    return { product: null, confidence: 0 };
  }

  private findDealForProduct(product: any, deals: any[]): any | null {
    return deals.find(deal => 
      deal.productName && product.name &&
      (this.normalizeProductName(deal.productName) === this.normalizeProductName(product.name) ||
       this.calculateSimilarity(
         this.normalizeProductName(deal.productName), 
         this.normalizeProductName(product.name)
       ) > 0.9)
    ) || null;
  }

  private normalizeProductName(name: string): string {
    if (!name) return '';
    
    return name
      .toLowerCase()
      .trim()
      // Remove common brand prefixes
      .replace(/\b(great value|market pantry|good & gather|kroger brand|simple truth|private selection)\b/gi, '')
      // Remove size indicators
      .replace(/\b\d+(\.\d+)?\s*(oz|lb|g|kg|ml|l|count|ct|pk|pack)\b/gi, '')
      // Remove organic/premium indicators for matching
      .replace(/\b(organic|premium|fresh|select|choice|natural)\b/gi, '')
      // Clean up whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null));

    for (let i = 0; i <= len1; i++) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= len2; j++) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= len2; j++) {
      for (let i = 1; i <= len1; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    const maxLength = Math.max(len1, len2);
    return maxLength === 0 ? 1 : (maxLength - matrix[len2][len1]) / maxLength;
  }

  private getRetailerName(retailerId: number): string {
    // This would typically fetch from database
    const retailers: Record<number, string> = {
      1: 'walmart',
      2: 'target', 
      3: 'kroger'
    };
    return retailers[retailerId] || 'unknown';
  }

  /**
   * Generate cart payload with proper item mapping and deals
   */
  async generateCartPayload(
    shoppingListItems: any[],
    retailerId: number,
    availableProducts: any[],
    availableDeals: any[],
    userPreferences?: {
      preferNameBrand?: boolean;
      preferOrganic?: boolean;
      buyInBulk?: boolean;
      prioritizeCostSavings?: boolean;
    }
  ): Promise<{
    items: any[];
    totalEstimatedValue: number;
    dealsSaved: number;
    unmatchedItems: any[];
    matchSummary: any;
    costAnalysis: {
      averageCostPerUnit: number;
      totalSavingsFromDeals: number;
      preferenceAlignment: number;
    };
  }> {
    const matches = await this.findMatches(shoppingListItems, retailerId, availableProducts, availableDeals, userPreferences);
    
    const cartItems = [];
    const unmatchedItems = [];
    let totalEstimatedValue = 0;
    let dealsSaved = 0;
    let totalCostPerUnit = 0;
    let totalUnits = 0;
    let preferenceAlignmentScore = 0;
    
    const matchSummary = {
      exact: 0,
      fuzzy: 0,
      brand: 0,
      category: 0,
      none: 0
    };

    for (const item of shoppingListItems) {
      const match = matches.get(item.id);
      
      if (match && match.retailerProduct && match.confidence > 0.6) {
        const price = match.deal ? match.deal.salePrice : (match.retailerProduct.price || 300);
        const regularPrice = match.retailerProduct.price || price;
        const savings = match.deal ? (regularPrice - price) : 0;
        const quantity = match.retailerProduct.quantity || 1;
        const costPerUnit = price / quantity;
        
        // Track cost analysis
        totalCostPerUnit += costPerUnit * item.quantity;
        totalUnits += item.quantity;
        
        // Calculate preference alignment
        let itemPreferenceScore = 0;
        if (userPreferences) {
          const productName = match.retailerProduct.name.toLowerCase();
          
          if (userPreferences.preferOrganic && productName.includes('organic')) {
            itemPreferenceScore += 25;
          }
          if (userPreferences.preferNameBrand && match.retailerProduct.isNameBrand) {
            itemPreferenceScore += 20;
          }
          if (userPreferences.buyInBulk && quantity > 6) {
            itemPreferenceScore += 20;
          }
          if (userPreferences.prioritizeCostSavings && match.deal) {
            itemPreferenceScore += 35;
          }
        }
        preferenceAlignmentScore += itemPreferenceScore;
        
        cartItems.push({
          shoppingListItemId: item.id,
          productName: item.productName,
          retailerProductId: match.retailerProduct.id,
          retailerProductName: match.retailerProduct.name,
          quantity: item.quantity,
          estimatedPrice: price,
          originalPrice: regularPrice,
          savings,
          costPerUnit,
          dealId: match.deal?.id,
          matchType: match.matchType,
          matchConfidence: match.confidence,
          matchExplanation: match.explanation,
          preferenceAlignment: itemPreferenceScore
        });
        
        totalEstimatedValue += price * item.quantity;
        dealsSaved += savings * item.quantity;
        matchSummary[match.matchType]++;
      } else {
        unmatchedItems.push({
          ...item,
          reason: match?.explanation || 'No match found'
        });
        matchSummary.none++;
      }
    }

    const costAnalysis = {
      averageCostPerUnit: totalUnits > 0 ? totalCostPerUnit / totalUnits : 0,
      totalSavingsFromDeals: dealsSaved,
      preferenceAlignment: cartItems.length > 0 ? preferenceAlignmentScore / cartItems.length : 0
    };

    return {
      items: cartItems,
      totalEstimatedValue,
      dealsSaved,
      unmatchedItems,
      matchSummary,
      costAnalysis
    };
  }
}

export const itemMatcher = new ItemMatcherService();
