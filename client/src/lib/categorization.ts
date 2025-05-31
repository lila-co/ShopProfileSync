
export interface ProductCategorization {
  category: string;
  subcategory?: string;
  aisle: string;
  section: string;
  confidence: number;
  suggestedQuantityType: string;
  typicalRetailNames: string[];
  brandVariations: string[];
  icon: string;
}

export interface QuantityNormalization {
  originalQuantity: number;
  originalUnit: string;
  normalizedQuantity: number;
  suggestedQuantity: number;
  suggestedUnit: string;
  conversionReason: string;
}

export interface BatchCategorizationResult {
  productName: string;
  category: ProductCategorization;
  normalized: QuantityNormalization;
  icon: string;
}

// Local fuzzy matching for immediate feedback
export function getQuickCategory(productName: string): { category: string; icon: string; confidence: number } {
  const name = productName.toLowerCase();
  
  // Quick pattern matching for immediate UI feedback
  const patterns = [
    { pattern: /\b(banana|apple|orange|grape|strawberr|tomato|onion|carrot|potato)\w*/i, category: 'Produce', icon: '🍎' },
    { pattern: /\b(milk|cheese|yogurt|egg)\w*/i, category: 'Dairy & Eggs', icon: '🥛' },
    { pattern: /\b(beef|chicken|pork|turkey|fish|meat)\w*/i, category: 'Meat & Seafood', icon: '🥩' },
    { pattern: /\b(bread|loaf|roll|bagel)\w*/i, category: 'Bakery', icon: '🍞' },
    { pattern: /\b(frozen|ice cream)\w*/i, category: 'Frozen Foods', icon: '❄️' },
    { pattern: /\b(shampoo|soap|toothpaste)\w*/i, category: 'Personal Care', icon: '🧼' },
    { pattern: /\b(cleaner|detergent|towel)\w*/i, category: 'Household Items', icon: '🏠' },
  ];
  
  for (const { pattern, category, icon } of patterns) {
    if (pattern.test(name)) {
      return { category, icon, confidence: 0.8 };
    }
  }
  
  return { category: 'Pantry & Canned Goods', icon: '🥫', confidence: 0.3 };
}

// Smart unit detection with AI logic
export function detectOptimalUnit(productName: string, currentUnit?: string): string {
  const name = productName.toLowerCase();
  
  // Weight-based items
  if (/\b(banana|apple|orange|grape|potato|onion|carrot|tomato|beef|chicken|pork|fish|meat)\w*/i.test(name)) {
    return 'LB';
  }
  
  // Volume/liquid items - differentiate between gallon items and canned beverages
  if (/\b(milk|oil|vinegar)\w*/i.test(name)) {
    return 'COUNT'; // Usually sold in containers (gallons/bottles)
  }
  
  // Canned/bottled beverages
  if (/\b(sparkling\s*water|carbonated\s*water|seltzer|soda|cola|juice|sports\s*drink|energy\s*drink)\w*/i.test(name)) {
    return 'CAN'; // Usually sold in cans or bottles
  }
  
  // Regular water can be gallon or bottles
  if (/\b(water|bottled\s*water)\w*/i.test(name) && !/\b(sparkling|carbonated|seltzer)\w*/i.test(name)) {
    return 'COUNT'; // Could be gallons or bottles
  }
  
  // Package items
  if (/\b(chip|cracker|cookie|cereal|pasta|rice)\w*/i.test(name)) {
    return 'PKG';
  }
  
  // Canned items
  if (/\b(can|sauce|soup|bean)\w*/i.test(name)) {
    return 'CAN';
  }
  
  // Bottled items
  if (/\b(bottle|jar|ketchup|mustard|dressing)\w*/i.test(name)) {
    return 'BOTTLE';
  }
  
  // Bunch items
  if (/\b(banana|herb|green onion|asparagus)\w*/i.test(name)) {
    return 'BUNCH';
  }
  
  return currentUnit || 'COUNT';
}

// Generate smart quantity suggestions
export function generateQuantitySuggestions(productName: string, category: string): number[] {
  const name = productName.toLowerCase();
  
  if (category === 'Dairy & Eggs') {
    if (name.includes('egg')) return [6, 12, 18, 24];
    if (name.includes('milk')) return [1]; // 1 gallon/half-gallon
    if (name.includes('yogurt')) return [1, 4, 6, 8];
  }
  
  if (category === 'Produce') {
    if (name.includes('banana')) return [1, 2, 3, 5]; // lbs
    if (name.includes('apple')) return [2, 3, 5]; // lbs
    return [1, 2, 3];
  }
  
  if (category === 'Meat & Seafood') {
    return [0.5, 1, 1.5, 2, 3]; // lbs
  }
  
  if (category === 'Bakery') {
    return [1, 2]; // loaves
  }
  
  return [1, 2, 3, 4, 5, 6];
}

// Retail naming suggestions
export function generateRetailNameSuggestions(productName: string, retailer?: string): string[] {
  const cleanName = productName.trim();
  const suggestions = [cleanName];
  
  const retailerPrefixes: Record<string, string[]> = {
    'walmart': ['Great Value', 'Marketside', 'Equate'],
    'target': ['Good & Gather', 'Market Pantry', 'Simply Balanced'],
    'kroger': ['Kroger Brand', 'Simple Truth', 'Private Selection'],
    'safeway': ['Signature SELECT', 'O Organics', 'Lucerne'],
  };
  
  // Add organic/premium variations
  suggestions.push(`Organic ${cleanName}`);
  suggestions.push(`Premium ${cleanName}`);
  suggestions.push(`Fresh ${cleanName}`);
  
  // Add retailer-specific names
  if (retailer && retailerPrefixes[retailer.toLowerCase()]) {
    retailerPrefixes[retailer.toLowerCase()].forEach(prefix => {
      suggestions.push(`${prefix} ${cleanName}`);
    });
  }
  
  // Add generic store brand
  suggestions.push(`Store Brand ${cleanName}`);
  
  return [...new Set(suggestions)]; // Remove duplicates
}
