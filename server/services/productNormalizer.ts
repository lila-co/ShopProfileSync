
import { db } from '../db';
import { products, retailers } from '../../shared/schema';
import { eq, and, like, or } from 'drizzle-orm';

export interface NormalizedProduct {
  id: number;
  canonicalName: string;
  category: string;
  subcategory?: string;
  upc?: string;
  brandName?: string;
  packageSize?: string;
  unit: string;
  aliases: ProductAlias[];
  retailerVariations: RetailerVariation[];
  confidence: number;
}

export interface ProductAlias {
  alias: string;
  retailerId?: number;
  confidence: number;
  source: 'manual' | 'ai' | 'receipt' | 'api';
}

export interface RetailerVariation {
  retailerId: number;
  retailerName: string;
  productName: string;
  brandName?: string;
  sku?: string;
  upc?: string;
  packageSize?: string;
  lastSeen: Date;
  frequency: number;
}

export class ProductNormalizationService {
  private aliasCache: Map<string, NormalizedProduct> = new Map();
  private retailerMappings: Map<string, Map<string, string>> = new Map();

  constructor() {
    this.initializeCommonMappings();
  }

  private initializeCommonMappings() {
    // Common retailer naming patterns
    const walmartMappings = new Map([
      ['great value milk', 'milk'],
      ['marketside organic bananas', 'bananas'],
      ['equate body wash', 'body wash'],
      ['sam\'s choice bread', 'bread']
    ]);

    const targetMappings = new Map([
      ['good & gather milk', 'milk'],
      ['market pantry cereal', 'cereal'],
      ['simply balanced organic', 'organic'],
      ['archer farms coffee', 'coffee']
    ]);

    const krogerMappings = new Map([
      ['kroger brand milk', 'milk'],
      ['simple truth organic', 'organic'],
      ['private selection premium', 'premium']
    ]);

    this.retailerMappings.set('walmart', walmartMappings);
    this.retailerMappings.set('target', targetMappings);
    this.retailerMappings.set('kroger', krogerMappings);
  }

  /**
   * Normalize a product name across all retailers
   */
  async normalizeProduct(
    productName: string, 
    retailerId?: number, 
    additionalData?: {
      upc?: string;
      sku?: string;
      brand?: string;
      size?: string;
    }
  ): Promise<NormalizedProduct> {
    const cleanName = this.cleanProductName(productName);
    
    // Check cache first
    const cacheKey = `${cleanName}-${retailerId || 'global'}`;
    if (this.aliasCache.has(cacheKey)) {
      return this.aliasCache.get(cacheKey)!;
    }

    // Try to find existing normalized product
    let normalizedProduct = await this.findExistingNormalization(cleanName, additionalData);
    
    if (!normalizedProduct) {
      // Create new normalized product
      normalizedProduct = await this.createNormalizedProduct(cleanName, retailerId, additionalData);
    } else {
      // Update existing product with new retailer variation
      if (retailerId) {
        await this.addRetailerVariation(normalizedProduct, productName, retailerId, additionalData);
      }
    }

    // Cache the result
    this.aliasCache.set(cacheKey, normalizedProduct);
    
    return normalizedProduct;
  }

  private async findExistingNormalization(
    cleanName: string, 
    additionalData?: any
  ): Promise<NormalizedProduct | null> {
    // Try exact match first
    const exactMatch = await db.select().from(products)
      .where(eq(products.name, cleanName))
      .limit(1);

    if (exactMatch.length > 0) {
      return this.buildNormalizedProduct(exactMatch[0]);
    }

    // Try UPC match if available
    if (additionalData?.upc) {
      // Note: You'd need to add UPC field to your products table
      // This is a placeholder for UPC matching logic
    }

    // Try fuzzy matching against existing products
    const similarProducts = await db.select().from(products)
      .where(like(products.name, `%${cleanName.split(' ')[0]}%`))
      .limit(10);

    for (const product of similarProducts) {
      const similarity = this.calculateSimilarity(cleanName, product.name);
      if (similarity > 0.85) {
        return this.buildNormalizedProduct(product);
      }
    }

    return null;
  }

  private async createNormalizedProduct(
    cleanName: string, 
    retailerId?: number, 
    additionalData?: any
  ): Promise<NormalizedProduct> {
    // Use your existing ProductCategorizerService for initial categorization
    const { productCategorizer } = await import('./productCategorizer');
    const category = productCategorizer.categorizeProduct(cleanName);

    // Create new product in database
    const newProduct = await db.insert(products).values({
      name: cleanName,
      category: category.category,
      subcategory: category.subcategory,
      defaultUnit: category.suggestedQuantityType,
      restockFrequency: this.estimateRestockFrequency(category.category),
      isNameBrand: this.detectNameBrand(cleanName),
      isOrganic: cleanName.toLowerCase().includes('organic')
    }).returning();

    return this.buildNormalizedProduct(newProduct[0]);
  }

  private async buildNormalizedProduct(productRow: any): Promise<NormalizedProduct> {
    // This would fetch aliases and retailer variations from additional tables
    // For now, returning a basic structure
    return {
      id: productRow.id,
      canonicalName: productRow.name,
      category: productRow.category,
      subcategory: productRow.subcategory,
      unit: productRow.defaultUnit || 'COUNT',
      aliases: [], // Would be populated from database
      retailerVariations: [], // Would be populated from database
      confidence: 0.95
    };
  }

  private async addRetailerVariation(
    product: NormalizedProduct, 
    originalName: string, 
    retailerId: number, 
    additionalData?: any
  ): Promise<void> {
    // Logic to add or update retailer-specific variation
    // This would update a retailer_product_variations table
    console.log(`Adding retailer variation: ${originalName} for product ${product.canonicalName}`);
  }

  /**
   * Clean and standardize product names with Spanglish support
   */
  private cleanProductName(name: string): string {
    let cleanedName = name.toLowerCase().trim();
    
    // Handle Spanglish patterns first
    cleanedName = this.normalizeSpanglishPatterns(cleanedName);
    
    return cleanedName
      // Remove common prefixes/suffixes
      .replace(/\b(great value|market pantry|good & gather|kroger brand|simple truth)\b/gi, '')
      .replace(/\b(organic|premium|fresh|select|choice)\b/gi, '')
      // Remove size indicators
      .replace(/\b\d+(\.\d+)?\s*(oz|lb|g|kg|ml|l|count|ct|pk|pack)\b/gi, '')
      // Remove brand-specific words
      .replace(/\b(brand|store)\b/gi, '')
      // Clean up whitespace
      .replace(/\s+/g, ' ')
      .trim()
      // Capitalize properly
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Normalize Spanglish patterns to standard English
   */
  private normalizeSpanglishPatterns(name: string): string {
    // Redundant translations (Spanish + English for same item)
    const redundantTranslations: Record<string, string> = {
      'leche milk': 'milk',
      'milk leche': 'milk',
      'pollo chicken': 'chicken',
      'chicken pollo': 'chicken',
      'pan bread': 'bread',
      'bread pan': 'bread',
      'queso cheese': 'cheese',
      'cheese queso': 'cheese',
      'arroz rice': 'rice',
      'rice arroz': 'rice',
      'agua water': 'water',
      'water agua': 'water',
      'carne meat': 'meat',
      'meat carne': 'meat',
      'huevos eggs': 'eggs',
      'eggs huevos': 'eggs'
    };

    // Common phonetic misspellings
    const phoneticCorrections: Record<string, string> = {
      'chiken': 'chicken',
      'chikken': 'chicken',
      'bery': 'berry',
      'berries': 'berries',
      'tomatos': 'tomatoes',
      'begetables': 'vegetables',
      'vejetables': 'vegetables',
      'selery': 'celery',
      'apel': 'apple',
      'aple': 'apple',
      'banan': 'banana',
      'bananna': 'banana',
      'lemmon': 'lemon',
      'oneon': 'onion',
      'onyon': 'onion',
      'carrots': 'carrots',
      'carot': 'carrot',
      // Cereal phonetic spellings
      'confleis': 'cornflakes',
      'cornfleis': 'cornflakes',
      'frosfleiks': 'frosted flakes',
      'cheerios': 'cheerios',
      'cherrios': 'cheerios',
      'cheeios': 'cheerios',
      // Other breakfast items
      'otemil': 'oatmeal',
      'oatmil': 'oatmeal',
      'avena': 'oatmeal',
      'pankeiks': 'pancakes',
      'wafleis': 'waffles',
      'tost': 'toast'
    };

    // Spanish terms commonly preserved in Spanglish context
    const spanishToEnglish: Record<string, string> = {
      'frijoles negros': 'black beans',
      'frijoles rojos': 'red beans',
      'frijoles pintos': 'pinto beans',
      'carne molida': 'ground beef',
      'carne asada': 'beef steak',
      'pollo asado': 'roasted chicken',
      'agua sparkling': 'sparkling water',
      'agua mineral': 'mineral water',
      'cereal para niños': 'kids cereal',
      'leche descremada': 'skim milk',
      'leche entera': 'whole milk',
      'mantequilla': 'butter',
      'aceite oliva': 'olive oil',
      'aceite vegetal': 'vegetable oil',
      'papas': 'potatoes',
      'papitas': 'chips',
      'dulces': 'candy',
      'galletas': 'cookies',
      'tortillas': 'tortillas',
      'salsa verde': 'green salsa',
      'salsa roja': 'red salsa'
    };

    // Brand names with Spanish descriptors
    const brandSpanglishPatterns: Record<string, string> = {
      'coca cola grande': 'coca cola large',
      'pepsi grande': 'pepsi large',
      'cheerios cereal': 'cheerios',
      'campbell sopa': 'campbell soup',
      'kraft queso': 'kraft cheese',
      'tide detergente': 'tide detergent',
      'bounty toallas': 'bounty paper towels'
    };

    let normalized = name;

    // Apply redundant translation fixes
    for (const [spanglish, english] of Object.entries(redundantTranslations)) {
      const regex = new RegExp(`\\b${spanglish}\\b`, 'gi');
      normalized = normalized.replace(regex, english);
    }

    // Apply phonetic corrections
    for (const [misspelled, correct] of Object.entries(phoneticCorrections)) {
      const regex = new RegExp(`\\b${misspelled}\\b`, 'gi');
      normalized = normalized.replace(regex, correct);
    }

    // Apply Spanish to English translations
    for (const [spanish, english] of Object.entries(spanishToEnglish)) {
      const regex = new RegExp(`\\b${spanish}\\b`, 'gi');
      normalized = normalized.replace(regex, english);
    }

    // Apply brand Spanglish patterns
    for (const [spanglish, english] of Object.entries(brandSpanglishPatterns)) {
      const regex = new RegExp(`\\b${spanglish}\\b`, 'gi');
      normalized = normalized.replace(regex, english);
    }

    // Handle mixed language size descriptors
    normalized = normalized
      .replace(/\bgrande\b/gi, 'large')
      .replace(/\bmediano\b/gi, 'medium')
      .replace(/\bpequeño\b/gi, 'small')
      .replace(/\bchico\b/gi, 'small');

    return normalized.replace(/\s+/g, ' ').trim();
  }

  /**
   * Calculate string similarity using Levenshtein distance with Spanglish awareness
   */
  private calculateSimilarity(str1: string, str2: string): number {
    // First normalize both strings through Spanglish patterns
    const normalized1 = this.normalizeSpanglishPatterns(str1.toLowerCase());
    const normalized2 = this.normalizeSpanglishPatterns(str2.toLowerCase());
    
    // If normalized versions are identical, return perfect match
    if (normalized1 === normalized2) {
      return 1.0;
    }
    
    // Check for semantic equivalence (chicken vs pollo, milk vs leche)
    const semanticSimilarity = this.checkSemanticEquivalence(normalized1, normalized2);
    if (semanticSimilarity > 0) {
      return semanticSimilarity;
    }
    
    // Calculate Levenshtein distance on normalized strings
    const matrix = Array(normalized2.length + 1).fill(null).map(() => Array(normalized1.length + 1).fill(null));
    
    for (let i = 0; i <= normalized1.length; i += 1) {
      matrix[0][i] = i;
    }
    
    for (let j = 0; j <= normalized2.length; j += 1) {
      matrix[j][0] = j;
    }
    
    for (let j = 1; j <= normalized2.length; j += 1) {
      for (let i = 1; i <= normalized1.length; i += 1) {
        const indicator = normalized1[i - 1] === normalized2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    const maxLength = Math.max(normalized1.length, normalized2.length);
    return maxLength === 0 ? 1 : (maxLength - matrix[normalized2.length][normalized1.length]) / maxLength;
  }

  /**
   * Check for semantic equivalence between Spanish and English terms
   */
  private checkSemanticEquivalence(str1: string, str2: string): number {
    const semanticPairs = [
      ['chicken', 'pollo'],
      ['milk', 'leche'],
      ['bread', 'pan'],
      ['cheese', 'queso'],
      ['rice', 'arroz'],
      ['water', 'agua'],
      ['meat', 'carne'],
      ['eggs', 'huevos'],
      ['beans', 'frijoles'],
      ['potatoes', 'papas'],
      ['tomatoes', 'tomates'],
      ['onions', 'cebollas'],
      ['carrots', 'zanahorias'],
      ['butter', 'mantequilla'],
      ['oil', 'aceite'],
      ['salt', 'sal'],
      ['sugar', 'azucar'],
      ['cookies', 'galletas'],
      ['candy', 'dulces']
    ];

    for (const [english, spanish] of semanticPairs) {
      if ((str1.includes(english) && str2.includes(spanish)) || 
          (str1.includes(spanish) && str2.includes(english))) {
        return 0.95; // High similarity for semantic matches
      }
    }

    return 0;
  }

  private estimateRestockFrequency(category: string): string {
    const frequencies: Record<string, string> = {
      'Produce': 'WEEKLY',
      'Dairy & Eggs': 'WEEKLY',
      'Meat & Seafood': 'WEEKLY',
      'Bakery': 'WEEKLY',
      'Frozen Foods': 'BI_WEEKLY',
      'Pantry & Canned Goods': 'MONTHLY',
      'Personal Care': 'MONTHLY',
      'Household Items': 'MONTHLY'
    };
    
    return frequencies[category] || 'BI_WEEKLY';
  }

  private detectNameBrand(productName: string): boolean {
    const nameBrands = [
      'coca cola', 'pepsi', 'kraft', 'nestle', 'kellogg', 'general mills',
      'procter & gamble', 'unilever', 'johnson & johnson', 'tide', 'dove',
      'oreo', 'lay\'s', 'doritos', 'cheerios', 'frosted flakes'
    ];
    
    const lowerName = productName.toLowerCase();
    return nameBrands.some(brand => lowerName.includes(brand));
  }

  /**
   * Batch normalize multiple products
   */
  async batchNormalize(
    products: Array<{ 
      name: string; 
      retailerId?: number; 
      additionalData?: any 
    }>
  ): Promise<NormalizedProduct[]> {
    const results: NormalizedProduct[] = [];
    
    for (const product of products) {
      try {
        const normalized = await this.normalizeProduct(
          product.name, 
          product.retailerId, 
          product.additionalData
        );
        results.push(normalized);
      } catch (error) {
        console.error(`Failed to normalize product: ${product.name}`, error);
        // Continue with other products
      }
    }
    
    return results;
  }

  /**
   * Find all variations of a normalized product across retailers
   */
  async getRetailerVariations(canonicalName: string): Promise<RetailerVariation[]> {
    // This would query a retailer_product_variations table
    // Placeholder implementation
    return [];
  }

  /**
   * Update product mapping based on user feedback
   */
  async updateMapping(
    originalName: string, 
    canonicalName: string, 
    retailerId?: number,
    confidence: number = 1.0
  ): Promise<void> {
    // Logic to update mappings based on user corrections
    console.log(`Updating mapping: ${originalName} -> ${canonicalName}`);
  }
}

export const productNormalizer = new ProductNormalizationService();
