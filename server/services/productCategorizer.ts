
export interface ProductCategory {
  category: string;
  subcategory?: string;
  aisle: string;
  section: string;
  confidence: number;
  suggestedQuantityType: 'COUNT' | 'LB' | 'OZ' | 'PKG' | 'BOX' | 'CAN' | 'BOTTLE' | 'JAR' | 'BUNCH' | 'ROLL';
  typicalRetailNames: string[];
  brandVariations: string[];
}

export interface QuantityNormalization {
  originalQuantity: number;
  originalUnit: string;
  normalizedQuantity: number;
  suggestedQuantity: number;
  suggestedUnit: string;
  conversionReason: string;
}

export class ProductCategorizerService {
  private productDatabase: Map<string, ProductCategory> = new Map();
  private categoryPatterns: Map<string, RegExp[]> = new Map();
  private retailNamingConventions: Map<string, string[]> = new Map();

  constructor() {
    this.initializeDatabase();
    this.initializePatterns();
    this.initializeRetailNaming();
  }

  private initializeDatabase() {
    const categories: ProductCategory[] = [
      // Produce
      {
        category: 'Produce',
        subcategory: 'Fresh Fruits',
        aisle: 'Aisle 1',
        section: 'Produce Section',
        confidence: 0.95,
        suggestedQuantityType: 'LB',
        typicalRetailNames: ['Fresh Bananas', 'Organic Bananas', 'Premium Bananas'],
        brandVariations: ['Chiquita', 'Dole', 'Del Monte', 'Organic']
      },
      {
        category: 'Produce',
        subcategory: 'Fresh Vegetables',
        aisle: 'Aisle 1',
        section: 'Produce Section',
        confidence: 0.95,
        suggestedQuantityType: 'LB',
        typicalRetailNames: ['Fresh Tomatoes', 'Vine Ripened Tomatoes', 'Roma Tomatoes', 'Cherry Tomatoes'],
        brandVariations: ['Organic', 'Greenhouse', 'Vine Ripened', 'Cherry']
      },
      
      // Dairy & Eggs
      {
        category: 'Dairy & Eggs',
        subcategory: 'Milk',
        aisle: 'Aisle 2',
        section: 'Dairy Cooler',
        confidence: 0.98,
        suggestedQuantityType: 'COUNT',
        typicalRetailNames: ['Whole Milk', '2% Reduced Fat Milk', '1% Low Fat Milk', 'Skim Milk'],
        brandVariations: ['Great Value', 'Horizon Organic', 'Lactaid', 'Fairlife']
      },
      {
        category: 'Dairy & Eggs',
        subcategory: 'Eggs',
        aisle: 'Aisle 2',
        section: 'Dairy Cooler',
        confidence: 0.98,
        suggestedQuantityType: 'COUNT',
        typicalRetailNames: ['Large Grade A Eggs', 'Extra Large Eggs', 'Organic Brown Eggs'],
        brandVariations: ['Great Value', 'Eggland\'s Best', 'Organic Valley', 'Cage Free']
      },
      
      // Meat & Seafood
      {
        category: 'Meat & Seafood',
        subcategory: 'Ground Meat',
        aisle: 'Aisle 3',
        section: 'Meat Counter',
        confidence: 0.97,
        suggestedQuantityType: 'LB',
        typicalRetailNames: ['Ground Beef 80/20', 'Ground Turkey', 'Ground Chicken', 'Lean Ground Beef'],
        brandVariations: ['Fresh', 'Organic', 'Grass Fed', 'Antibiotic Free']
      },
      
      // Pantry & Canned Goods
      {
        category: 'Pantry & Canned Goods',
        subcategory: 'Canned Goods',
        aisle: 'Aisle 4-6',
        section: 'Center Store',
        confidence: 0.90,
        suggestedQuantityType: 'CAN',
        typicalRetailNames: ['Canned Tomatoes', 'Diced Tomatoes', 'Tomato Sauce', 'Crushed Tomatoes'],
        brandVariations: ['Hunt\'s', 'Del Monte', 'Muir Glen', 'Great Value']
      },
      
      // Frozen Foods
      {
        category: 'Frozen Foods',
        subcategory: 'Frozen Vegetables',
        aisle: 'Aisle 7',
        section: 'Frozen Section',
        confidence: 0.92,
        suggestedQuantityType: 'PKG',
        typicalRetailNames: ['Frozen Vegetables', 'Frozen Mixed Vegetables', 'Frozen Broccoli'],
        brandVariations: ['Birds Eye', 'Green Giant', 'Great Value', 'Organic']
      },
      
      // Bakery
      {
        category: 'Bakery',
        subcategory: 'Bread',
        aisle: 'Aisle 8',
        section: 'Bakery',
        confidence: 0.95,
        suggestedQuantityType: 'COUNT',
        typicalRetailNames: ['White Bread', 'Whole Wheat Bread', 'Sourdough Bread', 'Artisan Bread'],
        brandVariations: ['Wonder', 'Pepperidge Farm', 'Sara Lee', 'Dave\'s Killer Bread']
      },
      
      // Personal Care
      {
        category: 'Personal Care',
        subcategory: 'Bath & Body',
        aisle: 'Aisle 9',
        section: 'Health & Beauty',
        confidence: 0.88,
        suggestedQuantityType: 'COUNT',
        typicalRetailNames: ['Body Wash', 'Shampoo', 'Conditioner', 'Bar Soap'],
        brandVariations: ['Dove', 'Olay', 'Head & Shoulders', 'Pantene']
      },
      
      // Household Items
      {
        category: 'Household Items',
        subcategory: 'Cleaning',
        aisle: 'Aisle 10',
        section: 'Household',
        confidence: 0.85,
        suggestedQuantityType: 'COUNT',
        typicalRetailNames: ['All-Purpose Cleaner', 'Dish Soap', 'Laundry Detergent', 'Paper Towels'],
        brandVariations: ['Tide', 'Dawn', 'Lysol', 'Bounty']
      }
    ];

    categories.forEach(category => {
      category.typicalRetailNames.forEach(name => {
        this.productDatabase.set(name.toLowerCase(), category);
      });
    });
  }

  private initializePatterns() {
    this.categoryPatterns.set('produce', [
      /\b(banana|apple|orange|grape|strawberr|blueberr|raspberr|peach|pear)\w*\b/i,
      /\b(tomato|onion|carrot|potato|lettuce|spinach|broccoli|pepper|cucumber)\w*\b/i,
      /\b(fresh|organic|ripe|seasonal)\b.*\b(fruit|vegetable)\w*\b/i
    ]);

    this.categoryPatterns.set('dairy', [
      /\b(milk|cheese|yogurt|butter|cream|sour cream)\b/i,
      /\b(egg|dozen|grade a)\w*\b/i,
      /\b(dairy|lactose|organic)\b/i
    ]);

    this.categoryPatterns.set('meat', [
      /\b(beef|chicken|pork|turkey|fish|salmon|tuna|ground)\w*\b/i,
      /\b(steak|roast|chop|fillet|breast|thigh|wing)\w*\b/i,
      /\b(fresh|lean|organic|grass fed)\b.*\b(meat|protein)\b/i
    ]);

    this.categoryPatterns.set('pantry', [
      /\b(rice|pasta|flour|sugar|salt|pepper|spice|sauce)\w*\b/i,
      /\b(can|jar|bottle|box)\w*\b/i,
      /\b(cereal|oatmeal|granola|crackers|chips)\w*\b/i
    ]);

    this.categoryPatterns.set('frozen', [
      /\b(frozen|ice cream|popsicle|dinner|entree)\w*\b/i,
      /\b(freezer|cold|arctic)\b/i
    ]);

    this.categoryPatterns.set('bakery', [
      /\b(bread|loaf|roll|bun|bagel|muffin|cake|cookie)\w*\b/i,
      /\b(wheat|white|sourdough|rye|pumpernickel)\b.*\bbread\b/i
    ]);

    this.categoryPatterns.set('personal_care', [
      /\b(shampoo|soap|toothpaste|deodorant|lotion|sunscreen)\w*\b/i,
      /\b(hygiene|beauty|skincare|haircare)\b/i
    ]);

    this.categoryPatterns.set('household', [
      /\b(cleaner|detergent|soap|towel|tissue|trash|garbage)\w*\b/i,
      /\b(cleaning|laundry|kitchen|bathroom)\b.*\b(supplies|products)\b/i
    ]);
  }

  private initializeRetailNaming() {
    this.retailNamingConventions.set('walmart', [
      'Great Value {product}',
      'Marketside {product}',
      'Equate {product}',
      'Sam\'s Choice {product}'
    ]);

    this.retailNamingConventions.set('target', [
      'Good & Gather {product}',
      'Market Pantry {product}',
      'Simply Balanced {product}',
      'Archer Farms {product}'
    ]);

    this.retailNamingConventions.set('kroger', [
      'Kroger Brand {product}',
      'Simple Truth {product}',
      'Private Selection {product}'
    ]);
  }

  // Fuzzy string matching using Levenshtein distance
  private calculateSimilarity(str1: string, str2: string): number {
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

  // Categorize product using fuzzy logic
  public categorizeProduct(productName: string): ProductCategory {
    const normalizedName = productName.toLowerCase().trim();
    
    // Direct database lookup first
    let bestMatch = this.productDatabase.get(normalizedName);
    let bestSimilarity = 0;
    
    // Fuzzy matching against database
    if (!bestMatch) {
      for (const [dbName, category] of this.productDatabase) {
        const similarity = this.calculateSimilarity(normalizedName, dbName);
        if (similarity > bestSimilarity && similarity > 0.7) {
          bestSimilarity = similarity;
          bestMatch = category;
        }
      }
    }
    
    // Pattern matching if no direct match
    if (!bestMatch || bestSimilarity < 0.8) {
      let maxPatternScore = 0;
      let patternCategory = '';
      
      for (const [category, patterns] of this.categoryPatterns) {
        let score = 0;
        for (const pattern of patterns) {
          if (pattern.test(normalizedName)) {
            score += 1;
          }
        }
        
        if (score > maxPatternScore) {
          maxPatternScore = score;
          patternCategory = category;
        }
      }
      
      if (maxPatternScore > 0) {
        bestMatch = this.getCategoryDefaults(patternCategory);
      }
    }
    
    // Default fallback
    if (!bestMatch) {
      bestMatch = {
        category: 'Pantry & Canned Goods',
        subcategory: 'General',
        aisle: 'Aisle 4-6',
        section: 'Center Store',
        confidence: 0.3,
        suggestedQuantityType: 'COUNT',
        typicalRetailNames: [productName],
        brandVariations: ['Generic', 'Store Brand']
      };
    }
    
    const productNormalizedName = this.normalizeProductName(productName);
    
    const finalCategory = {
      ...bestMatch,
      confidence: Math.max(bestSimilarity, bestMatch.confidence * 0.8),
      typicalRetailNames: this.generateRetailNames(productName),
      brandVariations: this.generateBrandVariations(productName, bestMatch),
      normalizedName: productNormalizedName
    };
    
    return finalCategory;
  }

  private getCategoryDefaults(categoryKey: string): ProductCategory {
    const defaults: Record<string, ProductCategory> = {
      'produce': {
        category: 'Produce',
        aisle: 'Aisle 1',
        section: 'Produce Section',
        confidence: 0.8,
        suggestedQuantityType: 'LB',
        typicalRetailNames: [],
        brandVariations: []
      },
      'dairy': {
        category: 'Dairy & Eggs',
        aisle: 'Aisle 2',
        section: 'Dairy Cooler',
        confidence: 0.8,
        suggestedQuantityType: 'COUNT',
        typicalRetailNames: [],
        brandVariations: []
      },
      'meat': {
        category: 'Meat & Seafood',
        aisle: 'Aisle 3',
        section: 'Meat Counter',
        confidence: 0.8,
        suggestedQuantityType: 'LB',
        typicalRetailNames: [],
        brandVariations: []
      },
      'pantry': {
        category: 'Pantry & Canned Goods',
        aisle: 'Aisle 4-6',
        section: 'Center Store',
        confidence: 0.7,
        suggestedQuantityType: 'COUNT',
        typicalRetailNames: [],
        brandVariations: []
      },
      'frozen': {
        category: 'Frozen Foods',
        aisle: 'Aisle 7',
        section: 'Frozen Section',
        confidence: 0.8,
        suggestedQuantityType: 'PKG',
        typicalRetailNames: [],
        brandVariations: []
      },
      'bakery': {
        category: 'Bakery',
        aisle: 'Aisle 8',
        section: 'Bakery',
        confidence: 0.8,
        suggestedQuantityType: 'COUNT',
        typicalRetailNames: [],
        brandVariations: []
      },
      'personal_care': {
        category: 'Personal Care',
        aisle: 'Aisle 9',
        section: 'Health & Beauty',
        confidence: 0.7,
        suggestedQuantityType: 'COUNT',
        typicalRetailNames: [],
        brandVariations: []
      },
      'household': {
        category: 'Household Items',
        aisle: 'Aisle 10',
        section: 'Household',
        confidence: 0.7,
        suggestedQuantityType: 'COUNT',
        typicalRetailNames: [],
        brandVariations: []
      }
    };
    
    return defaults[categoryKey] || defaults['pantry'];
  }

  private generateRetailNames(productName: string): string[] {
    const names: string[] = [];
    const cleanName = this.cleanProductName(productName);
    
    // Generate variations
    names.push(cleanName);
    names.push(`Organic ${cleanName}`);
    names.push(`Premium ${cleanName}`);
    names.push(`Store Brand ${cleanName}`);
    names.push(`Great Value ${cleanName}`);
    
    return names;
  }

  private generateBrandVariations(productName: string, existingCategory?: ProductCategory): string[] {
    // Use existing category if provided to avoid circular dependency
    if (existingCategory && existingCategory.brandVariations.length > 0) {
      return existingCategory.brandVariations;
    }
    
    // Default brand variations based on product name patterns
    const name = productName.toLowerCase();
    
    if (name.includes('milk') || name.includes('dairy')) {
      return ['Great Value', 'Horizon Organic', 'Lactaid', 'Fairlife', 'Store Brand'];
    } else if (name.includes('bread') || name.includes('bakery')) {
      return ['Wonder', 'Pepperidge Farm', 'Sara Lee', 'Dave\'s Killer Bread', 'Store Brand'];
    } else if (name.includes('meat') || name.includes('beef') || name.includes('chicken')) {
      return ['Fresh', 'Organic', 'Grass Fed', 'Antibiotic Free', 'Store Brand'];
    } else if (name.includes('fruit') || name.includes('vegetable') || name.includes('produce')) {
      return ['Organic', 'Fresh', 'Local', 'Store Brand'];
    }
    
    return ['Generic', 'Store Brand', 'Name Brand'];
  }

  private cleanProductName(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/\b(organic|fresh|premium|store brand|great value)\b/gi, '')
      .trim()
      .replace(/\s+/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Normalize product names with proper brand capitalization and standardization
  public normalizeProductName(productName: string): string {
    const name = productName.trim();
    
    // Brand name mappings for proper capitalization
    const brandMappings: Record<string, string> = {
      'coca cola': 'Coca Cola',
      'pepsi': 'Pepsi',
      'dr pepper': 'Dr Pepper',
      'mountain dew': 'Mountain Dew',
      'kraft': 'Kraft',
      'heinz': 'Heinz',
      'campbell': 'Campbell\'s',
      'kellogg': 'Kellogg\'s',
      'general mills': 'General Mills',
      'quaker': 'Quaker',
      'tide': 'Tide',
      'dawn': 'Dawn',
      'bounty': 'Bounty',
      'charmin': 'Charmin',
      'kleenex': 'Kleenex',
      'lysol': 'Lysol',
      'clorox': 'Clorox',
      'oreo': 'Oreo',
      'cheerios': 'Cheerios',
      'frosted flakes': 'Frosted Flakes',
      'lucky charms': 'Lucky Charms',
      'honey nut cheerios': 'Honey Nut Cheerios',
      'doritos': 'Doritos',
      'cheetos': 'Cheetos',
      'lay\'s': 'Lay\'s',
      'pringles': 'Pringles',
      'ritz': 'Ritz',
      'philadelphia': 'Philadelphia',
      'velveeta': 'Velveeta',
      'oscar mayer': 'Oscar Mayer',
      'tyson': 'Tyson',
      'perdue': 'Perdue',
      'spam': 'SPAM',
      'hunts': 'Hunt\'s',
      'del monte': 'Del Monte',
      'green giant': 'Green Giant',
      'birds eye': 'Birds Eye',
      'stouffers': 'Stouffer\'s',
      'lean cuisine': 'Lean Cuisine',
      'hot pockets': 'Hot Pockets',
      'eggo': 'Eggo',
      'pillsbury': 'Pillsbury',
      'duncan hines': 'Duncan Hines',
      'betty crocker': 'Betty Crocker',
      'aunt jemima': 'Aunt Jemima',
      'mrs butterworth': 'Mrs. Butterworth\'s',
      'log cabin': 'Log Cabin',
      'skippy': 'Skippy',
      'jif': 'Jif',
      'planters': 'Planters',
      'welch\'s': 'Welch\'s',
      'tropicana': 'Tropicana',
      'minute maid': 'Minute Maid',
      'ocean spray': 'Ocean Spray',
      'gatorade': 'Gatorade',
      'powerade': 'Powerade',
      'red bull': 'Red Bull',
      'monster': 'Monster',
      'starbucks': 'Starbucks',
      'folgers': 'Folgers',
      'maxwell house': 'Maxwell House',
      'nescafe': 'Nescafé',
      'lipton': 'Lipton',
      'celestial seasonings': 'Celestial Seasonings'
    };

    // Product type standardizations
    const productStandardizations: Record<string, string> = {
      'milk': 'Milk',
      'bread': 'Bread',
      'eggs': 'Eggs',
      'butter': 'Butter',
      'cheese': 'Cheese',
      'yogurt': 'Yogurt',
      'chicken': 'Chicken',
      'beef': 'Beef',
      'pork': 'Pork',
      'fish': 'Fish',
      'salmon': 'Salmon',
      'tuna': 'Tuna',
      'pasta': 'Pasta',
      'rice': 'Rice',
      'flour': 'Flour',
      'sugar': 'Sugar',
      'salt': 'Salt',
      'pepper': 'Black Pepper',
      'olive oil': 'Olive Oil',
      'vegetable oil': 'Vegetable Oil',
      'tomatoes': 'Tomatoes',
      'onions': 'Onions',
      'potatoes': 'Potatoes',
      'carrots': 'Carrots',
      'bananas': 'Bananas',
      'apples': 'Apples',
      'oranges': 'Oranges',
      'strawberries': 'Strawberries',
      'blueberries': 'Blueberries',
      'lettuce': 'Lettuce',
      'spinach': 'Spinach',
      'broccoli': 'Broccoli',
      'bell pepper': 'Bell Pepper',
      'garlic': 'Garlic',
      'ginger': 'Ginger',
      'basil': 'Fresh Basil',
      'cilantro': 'Fresh Cilantro',
      'parsley': 'Fresh Parsley',
      'paper towels': 'Paper Towels',
      'toilet paper': 'Toilet Paper',
      'dish soap': 'Dish Soap',
      'laundry detergent': 'Laundry Detergent',
      'shampoo': 'Shampoo',
      'conditioner': 'Conditioner',
      'toothpaste': 'Toothpaste',
      'deodorant': 'Deodorant'
    };

    const lowerName = name.toLowerCase();
    
    // Check for exact brand matches first
    for (const [key, value] of Object.entries(brandMappings)) {
      if (lowerName.includes(key)) {
        return value;
      }
    }
    
    // Check for product standardizations
    for (const [key, value] of Object.entries(productStandardizations)) {
      if (lowerName === key || lowerName.includes(key)) {
        return value;
      }
    }
    
    // Default capitalization for unmatched items
    return name.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  // Normalize quantities using AI logic
  public normalizeQuantity(
    productName: string, 
    quantity: number, 
    unit: string
  ): QuantityNormalization {
    const category = this.categorizeProduct(productName);
    const suggestedUnit = category.suggestedQuantityType;
    
    let normalizedQuantity = quantity;
    let suggestedQuantity = quantity;
    let conversionReason = 'No conversion needed';
    
    const name = productName.toLowerCase();
    
    // Smart quantity suggestions based on category and typical purchase patterns
    if (category.category === 'Produce') {
      if (unit === 'COUNT' && suggestedUnit === 'LB') {
        // Convert count to weight for produce
        const avgWeights: Record<string, number> = {
          'banana': 0.3,
          'apple': 0.4,
          'orange': 0.5,
          'potato': 0.3,
          'onion': 0.25,
          'tomato': 0.3,
          'pepper': 0.2
        };
        
        const avgWeight = Object.keys(avgWeights).find(key => name.includes(key));
        
        if (avgWeight) {
          suggestedQuantity = Math.round((quantity * avgWeights[avgWeight]) * 100) / 100;
          conversionReason = `AI suggests ${suggestedQuantity} lbs instead of ${quantity} items (typical weight)`;
        } else {
          // Generic produce weight conversion
          suggestedQuantity = Math.round((quantity * 0.35) * 100) / 100;
          conversionReason = `AI suggests ${suggestedQuantity} lbs for better shopping accuracy`;
        }
      } else if (unit === 'LB' && quantity > 5) {
        // Large quantities might be better as COUNT
        const estimatedCount = Math.round(quantity / 0.35);
        if (estimatedCount < quantity) {
          suggestedQuantity = estimatedCount;
          conversionReason = `AI suggests ${estimatedCount} items instead of ${quantity} lbs for easier shopping`;
        }
      }
    }
    
    // Suggest typical retail quantities for different categories
    if (category.category === 'Dairy & Eggs') {
      if (name.includes('milk') && quantity === 1 && unit === 'COUNT') {
        conversionReason = 'AI suggests: Milk typically comes in gallons/half-gallons - consider quantity needed';
      } else if (name.includes('egg') && quantity < 12 && unit === 'COUNT') {
        suggestedQuantity = 12; // Suggest dozen
        conversionReason = `AI suggests 12 eggs (1 dozen) instead of ${quantity} - standard retail packaging`;
      } else if (name.includes('yogurt') && quantity === 1) {
        suggestedQuantity = 6; // Multi-pack
        conversionReason = 'AI suggests 6-pack yogurt for better value';
      }
    }
    
    if (category.category === 'Meat & Seafood') {
      if (unit === 'COUNT' && suggestedUnit === 'LB') {
        suggestedQuantity = Math.max(1, quantity);
        conversionReason = `AI suggests ${suggestedQuantity} lbs - meat typically sold by weight`;
      } else if (unit === 'LB' && quantity < 1) {
        suggestedQuantity = 1;
        conversionReason = 'AI suggests minimum 1 lb for practical shopping';
      }
    }
    
    if (category.category === 'Pantry & Canned Goods') {
      if (name.includes('can') && quantity === 1) {
        suggestedQuantity = 2;
        conversionReason = 'AI suggests 2 cans for meal planning efficiency';
      } else if (name.includes('pasta') && quantity === 1 && unit === 'COUNT') {
        suggestedQuantity = 2;
        conversionReason = 'AI suggests 2 boxes pasta for multiple meals';
      } else if (name.includes('rice') && quantity < 2) {
        suggestedQuantity = 2;
        conversionReason = 'AI suggests larger rice quantity for cost efficiency';
      }
    }
    
    if (category.category === 'Household Items') {
      if (name.includes('paper towel') && quantity < 3) {
        suggestedQuantity = 6;
        conversionReason = 'AI suggests 6-pack paper towels for better value';
      } else if (name.includes('toilet paper') && quantity < 4) {
        suggestedQuantity = 12;
        conversionReason = 'AI suggests 12-pack toilet paper for household efficiency';
      }
    }
    
    // Unit optimization suggestions
    if (unit !== suggestedUnit) {
      if (suggestedQuantity === quantity) {
        // Only unit change
        conversionReason = `AI suggests ${suggestedUnit} instead of ${unit} for better shopping accuracy`;
      }
    }
    
    // Ensure we always have a meaningful reason if we made changes
    if ((suggestedQuantity !== quantity || suggestedUnit !== unit) && conversionReason === 'No conversion needed') {
      conversionReason = 'AI optimization applied based on shopping patterns';
    }
    
    return {
      originalQuantity: Math.round(quantity),
      originalUnit: unit,
      normalizedQuantity: Math.round(normalizedQuantity),
      suggestedQuantity: Math.round(suggestedQuantity),
      suggestedUnit,
      conversionReason
    };
  }

  // Get category icon
  public getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      'Produce': '🍎',
      'Dairy & Eggs': '🥛',
      'Meat & Seafood': '🥩',
      'Pantry & Canned Goods': '🥫',
      'Frozen Foods': '❄️',
      'Bakery': '🍞',
      'Personal Care': '🧼',
      'Household Items': '🏠'
    };
    
    return icons[category] || '🛒';
  }
}

export const productCategorizer = new ProductCategorizerService();
