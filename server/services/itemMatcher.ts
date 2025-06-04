
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
    availableDeals: any[]
  ): Promise<Map<number, MatchResult>> {
    const matches = new Map<number, MatchResult>();

    for (const item of shoppingListItems) {
      const bestMatch = await this.findBestMatch(
        item, 
        retailerId, 
        availableProducts, 
        availableDeals
      );
      matches.set(item.id, bestMatch);
    }

    return matches;
  }

  /**
   * Find the best match for a single item
   */
  private async findBestMatch(
    shoppingListItem: any,
    retailerId: number,
    availableProducts: any[],
    availableDeals: any[]
  ): Promise<MatchResult> {
    const itemName = this.normalizeProductName(shoppingListItem.productName);
    
    // 1. Try exact match first
    let exactMatch = this.findExactMatch(itemName, availableProducts);
    if (exactMatch) {
      const deal = this.findDealForProduct(exactMatch, availableDeals);
      return {
        confidence: 1.0,
        matchType: 'exact',
        retailerProduct: exactMatch,
        deal,
        explanation: `Exact match found: ${exactMatch.name}`
      };
    }

    // 2. Try brand-aware matching
    const brandMatch = this.findBrandMatch(itemName, retailerId, availableProducts);
    if (brandMatch.product) {
      const deal = this.findDealForProduct(brandMatch.product, availableDeals);
      return {
        confidence: brandMatch.confidence,
        matchType: 'brand',
        retailerProduct: brandMatch.product,
        deal,
        explanation: `Brand match: ${brandMatch.explanation}`
      };
    }

    // 3. Try fuzzy matching
    const fuzzyMatch = this.findFuzzyMatch(itemName, availableProducts);
    if (fuzzyMatch.confidence > 0.7) {
      const deal = this.findDealForProduct(fuzzyMatch.product, availableDeals);
      return {
        confidence: fuzzyMatch.confidence,
        matchType: 'fuzzy',
        retailerProduct: fuzzyMatch.product,
        deal,
        explanation: `Fuzzy match: ${fuzzyMatch.product.name} (${Math.round(fuzzyMatch.confidence * 100)}% similarity)`
      };
    }

    // 4. Try category-based matching
    const categoryMatch = this.findCategoryMatch(itemName, availableProducts);
    if (categoryMatch.product) {
      const deal = this.findDealForProduct(categoryMatch.product, availableDeals);
      return {
        confidence: categoryMatch.confidence,
        matchType: 'category',
        retailerProduct: categoryMatch.product,
        deal,
        explanation: `Category substitute: ${categoryMatch.product.name}`
      };
    }

    // 5. No match found
    return {
      confidence: 0,
      matchType: 'none',
      retailerProduct: null,
      explanation: `No suitable match found for "${shoppingListItem.productName}"`
    };
  }

  private findExactMatch(itemName: string, products: any[]): any | null {
    return products.find(product => 
      this.normalizeProductName(product.name) === itemName ||
      this.normalizeProductName(product.name).includes(itemName) ||
      itemName.includes(this.normalizeProductName(product.name))
    ) || null;
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
    availableDeals: any[]
  ): Promise<{
    items: any[];
    totalEstimatedValue: number;
    dealsSaved: number;
    unmatchedItems: any[];
    matchSummary: any;
  }> {
    const matches = await this.findMatches(shoppingListItems, retailerId, availableProducts, availableDeals);
    
    const cartItems = [];
    const unmatchedItems = [];
    let totalEstimatedValue = 0;
    let dealsSaved = 0;
    
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
        
        cartItems.push({
          shoppingListItemId: item.id,
          productName: item.productName,
          retailerProductId: match.retailerProduct.id,
          retailerProductName: match.retailerProduct.name,
          quantity: item.quantity,
          estimatedPrice: price,
          originalPrice: regularPrice,
          savings,
          dealId: match.deal?.id,
          matchType: match.matchType,
          matchConfidence: match.confidence,
          matchExplanation: match.explanation
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

    return {
      items: cartItems,
      totalEstimatedValue,
      dealsSaved,
      unmatchedItems,
      matchSummary
    };
  }
}

export const itemMatcher = new ItemMatcherService();
