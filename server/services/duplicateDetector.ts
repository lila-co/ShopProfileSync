export interface DuplicateDetectionResult {
  isDuplicate: boolean;
  confidence: number;
  reason: string;
  existingItem?: any;
  suggestedAction: 'reject' | 'merge' | 'allow';
}

export class DuplicateDetectorService {
  private categoryRelationships: Map<string, string[]> = new Map();
  private genericToBrandMappings: Map<string, string[]> = new Map();

  constructor() {
    this.initializeCategoryRelationships();
    this.initializeGenericToBrandMappings();
  }

  // AI-powered brand detection service
  private async detectBrands(productName: string): Promise<{
    detectedBrands: string[];
    genericTerms: string[];
    category: string;
  }> {
    try {
      const response = await fetch('/api/ai/brand-detection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName })
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn('AI brand detection failed, falling back to pattern matching');
    }

    // Fallback to pattern-based detection
    return this.fallbackBrandDetection(productName);
  }

  private fallbackBrandDetection(productName: string): {
    detectedBrands: string[];
    genericTerms: string[];
    category: string;
  } {
    const name = productName.toLowerCase();
    const detectedBrands: string[] = [];
    const genericTerms: string[] = [];
    let category = 'generic';

    // Common brand patterns
    const brandPatterns = [
      { pattern: /\b(oreo|chips ahoy|nutter butter|keebler|pepperidge farm)\b/i, category: 'cookies' },
      { pattern: /\b(cheerios|frosted flakes|lucky charms|froot loops|special k)\b/i, category: 'cereal' },
      { pattern: /\b(coca cola|pepsi|sprite|dr pepper|mountain dew)\b/i, category: 'soda' },
      { pattern: /\b(lay\'s|doritos|cheetos|pringles|ruffles)\b/i, category: 'chips' },
      { pattern: /\b(kraft|sargento|tillamook|philadelphia)\b/i, category: 'cheese' },
      { pattern: /\b(tide|persil|gain|arm & hammer)\b/i, category: 'detergent' },
      { pattern: /\b(dawn|joy|palmolive)\b/i, category: 'dish soap' },
      { pattern: /\b(dove|ivory|dial|olay)\b/i, category: 'soap' }
    ];

    // Generic term patterns
    const genericPatterns = [
      { pattern: /\bcookies?\b/i, term: 'cookies' },
      { pattern: /\bcereal\b/i, term: 'cereal' },
      { pattern: /\bsoda|soft drink\b/i, term: 'soda' },
      { pattern: /\bchips?\b/i, term: 'chips' },
      { pattern: /\bcheese\b/i, term: 'cheese' },
      { pattern: /\bdetergent\b/i, term: 'detergent' },
      { pattern: /\bdish soap\b/i, term: 'dish soap' },
      { pattern: /\bsoap\b/i, term: 'soap' }
    ];

    // Detect brands
    for (const { pattern, category: cat } of brandPatterns) {
      const match = pattern.exec(name);
      if (match) {
        detectedBrands.push(match[1]);
        category = cat;
      }
    }

    // Detect generic terms
    for (const { pattern, term } of genericPatterns) {
      if (pattern.test(name)) {
        genericTerms.push(term);
        if (category === 'generic') category = term;
      }
    }

    return { detectedBrands, genericTerms, category };
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
    // This method might still be useful for non-AI approach or special cases
    // In the current AI setup, we might leave this empty or fill with specific overrides
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
      const brandMatch = await this.checkBrandRelationship(normalizedNewItem, normalizedExisting);
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

  private async checkBrandRelationship(item1: string, item2: string): Promise<DuplicateDetectionResult> {
    try {
      // Use AI to detect brands in both items
      const [detection1, detection2] = await Promise.all([
        this.detectBrands(item1),
        this.detectBrands(item2)
      ]);

      // Check for generic vs brand relationships
      if (detection1.genericTerms.length > 0 && detection2.detectedBrands.length > 0) {
        const sharedCategory = detection1.genericTerms.some(term => 
          detection2.category === term || detection2.genericTerms.includes(term)
        );

        if (sharedCategory) {
          return {
            isDuplicate: true,
            confidence: 0.85,
            reason: `Generic term "${detection1.genericTerms[0]}" matches brand "${detection2.detectedBrands[0]}"`,
            suggestedAction: 'merge'
          };
        }
      }

      // Check for brand vs generic relationships
      if (detection1.detectedBrands.length > 0 && detection2.genericTerms.length > 0) {
        const sharedCategory = detection2.genericTerms.some(term => 
          detection1.category === term || detection1.genericTerms.includes(term)
        );

        if (sharedCategory) {
          return {
            isDuplicate: true,
            confidence: 0.85,
            reason: `Brand "${detection1.detectedBrands[0]}" matches generic term "${detection2.genericTerms[0]}"`,
            suggestedAction: 'merge'
          };
        }
      }

      // Check for multiple brands in same category
      if (detection1.detectedBrands.length > 0 && detection2.detectedBrands.length > 0) {
        if (detection1.category === detection2.category && detection1.category !== 'generic') {
          const brand1 = detection1.detectedBrands[0];
          const brand2 = detection2.detectedBrands[0];

          if (brand1 !== brand2) {
            return {
              isDuplicate: true,
              confidence: 0.75,
              reason: `Both "${brand1}" and "${brand2}" are ${detection1.category} brands`,
              suggestedAction: 'merge'
            };
          }
        }
      }

    } catch (error) {
      console.warn('AI brand relationship check failed:', error);
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