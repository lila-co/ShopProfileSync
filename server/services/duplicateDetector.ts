
export interface DuplicateDetectionResult {
  isDuplicate: boolean;
  confidence: number;
  reason: string;
  existingItem?: any;
  suggestedAction: 'reject' | 'merge' | 'allow';
}

export class DuplicateDetectorService {
  private brandMappings: Map<string, string[]> = new Map();
  private categoryRelationships: Map<string, string[]> = new Map();
  private genericToBrandMappings: Map<string, string[]> = new Map();

  constructor() {
    this.initializeBrandMappings();
    this.initializeCategoryRelationships();
    this.initializeGenericToBrandMappings();
  }

  private initializeBrandMappings() {
    // Cereal brands
    this.brandMappings.set('cereal', [
      'cheerios', 'frosted flakes', 'corn flakes', 'lucky charms', 'honey nut cheerios',
      'froot loops', 'special k', 'rice krispies', 'cocoa puffs', 'trix', 'cinnamon toast crunch'
    ]);

    // Bread brands
    this.brandMappings.set('bread', [
      'wonder bread', 'pepperidge farm', 'sara lee', 'dave\'s killer bread', 'oroweat'
    ]);

    // Milk brands
    this.brandMappings.set('milk', [
      'horizon organic', 'lactaid', 'fairlife', 'organic valley', 'silk', 'almond breeze'
    ]);

    // Cheese brands
    this.brandMappings.set('cheese', [
      'kraft', 'sargento', 'tillamook', 'philadelphia', 'velveeta', 'babybel'
    ]);

    // Pasta brands
    this.brandMappings.set('pasta', [
      'barilla', 'ronzoni', 'mueller\'s', 'de cecco', 'rao\'s', 'hunts'
    ]);

    // Yogurt brands
    this.brandMappings.set('yogurt', [
      'yoplait', 'dannon', 'chobani', 'oikos', 'fage', 'siggi\'s', 'two good'
    ]);

    // Soda/drinks brands
    this.brandMappings.set('soda', [
      'coca cola', 'pepsi', 'sprite', 'fanta', 'dr pepper', 'mountain dew'
    ]);
    this.brandMappings.set('water', [
      'aquafina', 'dasani', 'evian', 'fiji', 'poland spring', 'smartwater'
    ]);

    // Snack brands
    this.brandMappings.set('chips', [
      'lay\'s', 'doritos', 'cheetos', 'pringles', 'ruffles', 'fritos'
    ]);
    this.brandMappings.set('crackers', [
      'ritz', 'cheez-its', 'goldfish', 'triscuit', 'wheat thins'
    ]);

    // Cleaning brands
    this.brandMappings.set('detergent', [
      'tide', 'persil', 'arm & hammer', 'gain', 'cheer', 'all'
    ]);
    this.brandMappings.set('dish soap', [
      'dawn', 'joy', 'palmolive', 'ajax'
    ]);

    // Personal care brands
    this.brandMappings.set('shampoo', [
      'head & shoulders', 'pantene', 'tresemme', 'herbal essences', 'suave'
    ]);
    this.brandMappings.set('soap', [
      'dove', 'ivory', 'dial', 'olay', 'irish spring'
    ]);
  }

  private initializeCategoryRelationships() {
    // Products that are semantically related within categories
    this.categoryRelationships.set('breakfast', [
      'cereal', 'oatmeal', 'granola', 'breakfast bars', 'pancake mix', 'syrup'
    ]);

    this.categoryRelationships.set('dairy', [
      'milk', 'cheese', 'yogurt', 'butter', 'cream cheese', 'sour cream'
    ]);

    this.categoryRelationships.set('meat', [
      'chicken', 'beef', 'pork', 'turkey', 'ground beef', 'ground turkey', 'ground chicken'
    ]);

    this.categoryRelationships.set('cleaning', [
      'detergent', 'fabric softener', 'bleach', 'dish soap', 'all purpose cleaner'
    ]);
  }

  private initializeGenericToBrandMappings() {
    // Map generic terms to their brand equivalents
    for (const [generic, brands] of this.brandMappings.entries()) {
      this.genericToBrandMappings.set(generic, brands);
    }
  }

  /**
   * Check if a new item is a duplicate of existing items
   */
  public async checkForDuplicate(
    newItemName: string, 
    existingItems: any[]
  ): Promise<DuplicateDetectionResult> {
    const normalizedNewItem = this.normalizeProductName(newItemName);

    for (const existingItem of existingItems) {
      const normalizedExisting = this.normalizeProductName(existingItem.productName);
      
      // 1. Exact match check
      const exactMatch = this.checkExactMatch(normalizedNewItem, normalizedExisting);
      if (exactMatch.isDuplicate) {
        return {
          ...exactMatch,
          existingItem,
          suggestedAction: 'reject'
        };
      }

      // 2. Brand relationship check
      const brandMatch = this.checkBrandRelationship(normalizedNewItem, normalizedExisting);
      if (brandMatch.isDuplicate) {
        return {
          ...brandMatch,
          existingItem,
          suggestedAction: brandMatch.confidence > 0.8 ? 'reject' : 'merge'
        };
      }

      // 3. Category relationship check
      const categoryMatch = this.checkCategoryRelationship(normalizedNewItem, normalizedExisting);
      if (categoryMatch.isDuplicate) {
        return {
          ...categoryMatch,
          existingItem,
          suggestedAction: 'merge'
        };
      }

      // 4. Fuzzy similarity check
      const similarityMatch = this.checkSimilarity(normalizedNewItem, normalizedExisting);
      if (similarityMatch.isDuplicate) {
        return {
          ...similarityMatch,
          existingItem,
          suggestedAction: similarityMatch.confidence > 0.9 ? 'reject' : 'allow'
        };
      }
    }

    return {
      isDuplicate: false,
      confidence: 0,
      reason: 'No duplicates found',
      suggestedAction: 'allow'
    };
  }

  private checkExactMatch(item1: string, item2: string): DuplicateDetectionResult {
    if (item1 === item2) {
      return {
        isDuplicate: true,
        confidence: 1.0,
        reason: 'Exact match found',
        suggestedAction: 'reject'
      };
    }

    // Check with plural variations
    const item1Singular = this.removePlural(item1);
    const item2Singular = this.removePlural(item2);
    
    if (item1Singular === item2Singular) {
      return {
        isDuplicate: true,
        confidence: 0.95,
        reason: 'Exact match found (accounting for plurals)',
        suggestedAction: 'reject'
      };
    }

    return { isDuplicate: false, confidence: 0, reason: '', suggestedAction: 'allow' };
  }

  private checkBrandRelationship(item1: string, item2: string): DuplicateDetectionResult {
    // Check if one is a generic term and the other is a brand
    for (const [generic, brands] of this.brandMappings.entries()) {
      const item1IsGeneric = item1.includes(generic);
      const item2IsGeneric = item2.includes(generic);
      
      const item1IsBrand = brands.some(brand => item1.includes(brand));
      const item2IsBrand = brands.some(brand => item2.includes(brand));

      // Generic vs Brand relationship
      if ((item1IsGeneric && item2IsBrand) || (item2IsGeneric && item1IsBrand)) {
        const genericItem = item1IsGeneric ? item1 : item2;
        const brandItem = item1IsBrand ? item1 : item2;
        const matchingBrand = brands.find(brand => brandItem.includes(brand));

        return {
          isDuplicate: true,
          confidence: 0.85,
          reason: `Generic "${generic}" matches brand "${matchingBrand}"`,
          suggestedAction: 'merge'
        };
      }

      // Both are brands of the same category
      if (item1IsBrand && item2IsBrand) {
        const brand1 = brands.find(brand => item1.includes(brand));
        const brand2 = brands.find(brand => item2.includes(brand));
        
        if (brand1 && brand2 && brand1 !== brand2) {
          return {
            isDuplicate: true,
            confidence: 0.75,
            reason: `Both "${brand1}" and "${brand2}" are ${generic} brands`,
            suggestedAction: 'merge'
          };
        }
      }
    }

    return { isDuplicate: false, confidence: 0, reason: '', suggestedAction: 'allow' };
  }

  private checkCategoryRelationship(item1: string, item2: string): DuplicateDetectionResult {
    for (const [category, items] of this.categoryRelationships.entries()) {
      const item1InCategory = items.some(categoryItem => item1.includes(categoryItem));
      const item2InCategory = items.some(categoryItem => item2.includes(categoryItem));

      if (item1InCategory && item2InCategory) {
        const item1Match = items.find(categoryItem => item1.includes(categoryItem));
        const item2Match = items.find(categoryItem => item2.includes(categoryItem));
        
        if (item1Match !== item2Match) {
          return {
            isDuplicate: true,
            confidence: 0.6,
            reason: `Both items are in ${category} category: "${item1Match}" and "${item2Match}"`,
            suggestedAction: 'allow' // Lower confidence, let user decide
          };
        }
      }
    }

    return { isDuplicate: false, confidence: 0, reason: '', suggestedAction: 'allow' };
  }

  private checkSimilarity(item1: string, item2: string): DuplicateDetectionResult {
    const similarity = this.calculateLevenshteinSimilarity(item1, item2);
    
    if (similarity > 0.9) {
      return {
        isDuplicate: true,
        confidence: similarity,
        reason: `High similarity: ${Math.round(similarity * 100)}% match`,
        suggestedAction: 'reject'
      };
    } else if (similarity > 0.7) {
      return {
        isDuplicate: true,
        confidence: similarity,
        reason: `Moderate similarity: ${Math.round(similarity * 100)}% match`,
        suggestedAction: 'allow'
      };
    }

    return { isDuplicate: false, confidence: 0, reason: '', suggestedAction: 'allow' };
  }

  private normalizeProductName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      // Remove common modifiers
      .replace(/\b(organic|fresh|premium|select|choice|natural|free[\-\s]range|cage[\-\s]free)\b/g, '')
      // Remove size indicators
      .replace(/\b\d+(\.\d+)?\s*(oz|lb|g|kg|ml|l|count|ct|pk|pack|gallon|quart|pint)\b/gi, '')
      // Remove store brands
      .replace(/\b(great value|market pantry|good & gather|kroger brand|simple truth)\b/gi, '')
      // Clean up whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  private removePlural(word: string): string {
    if (word.endsWith('ies')) {
      return word.slice(0, -3) + 'y';
    } else if (word.endsWith('s') && !word.endsWith('ss')) {
      return word.slice(0, -1);
    }
    return word;
  }

  private calculateLevenshteinSimilarity(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i += 1) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j += 1) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j += 1) {
      for (let i = 1; i <= str1.length; i += 1) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    const maxLength = Math.max(str1.length, str2.length);
    return maxLength === 0 ? 1 : (maxLength - matrix[str2.length][str1.length]) / maxLength;
  }

  /**
   * Get suggestions for resolving duplicates
   */
  public getSuggestions(result: DuplicateDetectionResult): string[] {
    const suggestions = [];

    switch (result.suggestedAction) {
      case 'reject':
        suggestions.push('This item appears to be a duplicate');
        suggestions.push('Consider updating the quantity of the existing item instead');
        break;
      
      case 'merge':
        suggestions.push('These items might be related');
        suggestions.push('Consider consolidating into one item');
        suggestions.push('You can specify the exact brand if needed');
        break;
      
      case 'allow':
        suggestions.push('These items seem different enough to keep separate');
        if (result.confidence > 0.5) {
          suggestions.push('Double-check if you really need both items');
        }
        break;
    }

    return suggestions;
  }
}

export const duplicateDetector = new DuplicateDetectorService();
