
import OpenAI from "openai";

// Initialize OpenAI client
let openai: OpenAI;
try {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "dummy-key-for-development"
  });
} catch (error) {
  console.warn("Failed to initialize OpenAI client for categorization");
}

// Standard retail categories with typical naming conventions
export const RETAIL_CATEGORIES = {
  'Produce': {
    keywords: ['fruit', 'vegetable', 'organic', 'fresh', 'apple', 'banana', 'tomato', 'onion', 'bell pepper', 'garlic', 'basil'],
    units: ['LB', 'BUNCH', 'COUNT'],
    namingConventions: {
      'banana': 'Bananas',
      'tomato': 'Fresh Tomatoes',
      'bell pepper': 'Bell Peppers',
      'onion': 'Yellow Onions',
      'garlic': 'Fresh Garlic',
      'basil': 'Fresh Basil'
    }
  },
  'Dairy': {
    keywords: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'eggs'],
    units: ['COUNT', 'LB', 'OZ', 'G'],
    namingConventions: {
      'milk': 'Whole Milk',
      'half gallon milk': 'Milk - Half Gallon',
      'milk (gallon)': 'Milk - 1 Gallon',
      'yogurt': 'Greek Yogurt'
    }
  },
  'Meat & Seafood': {
    keywords: ['chicken', 'beef', 'pork', 'fish', 'turkey', 'meat'],
    units: ['LB', 'COUNT', 'PKG'],
    namingConventions: {
      'chicken breast': 'Boneless Chicken Breast',
      'chicken': 'Fresh Chicken'
    }
  },
  'Pantry & Canned Goods': {
    keywords: ['pasta', 'sauce', 'soup', 'can', 'jar', 'box', 'rice', 'beans', 'salt', 'pepper', 'oil'],
    units: ['BOX', 'CAN', 'JAR', 'COUNT', 'LB'],
    namingConventions: {
      'pasta': 'Pasta',
      'pasta sauce': 'Marinara Pasta Sauce',
      'marinara sauce': 'Marinara Sauce',
      'olive oil': 'Extra Virgin Olive Oil',
      'canned corn': 'Sweet Corn - Canned',
      'chicken noodle soup': 'Chicken Noodle Soup - Canned',
      'salt': 'Table Salt',
      'black pepper': 'Ground Black Pepper'
    }
  },
  'Household': {
    keywords: ['paper', 'towel', 'tissue', 'cleaner', 'detergent', 'soap'],
    units: ['COUNT', 'ROLL', 'PKG'],
    namingConventions: {
      'paper towels': 'Paper Towels'
    }
  },
  'Frozen': {
    keywords: ['frozen', 'ice cream', 'pizza'],
    units: ['BOX', 'COUNT', 'PKG'],
    namingConventions: {}
  },
  'Bakery': {
    keywords: ['bread', 'cake', 'muffin', 'bagel'],
    units: ['COUNT', 'PKG'],
    namingConventions: {}
  },
  'Beverages': {
    keywords: ['juice', 'soda', 'water', 'coffee', 'tea'],
    units: ['COUNT', 'BOTTLE', 'CAN'],
    namingConventions: {}
  }
};

export interface CategorizedItem {
  originalName: string;
  standardizedName: string;
  category: string;
  subcategory?: string;
  suggestedUnit: string;
  confidence: number;
  reasoning: string;
}

export interface QuantityNormalization {
  originalQuantity: number;
  normalizedQuantity: number;
  originalUnit: string;
  suggestedUnit: string;
  conversionReason?: string;
}

// Fuzzy matching function for product names
function fuzzyMatch(input: string, target: string): number {
  const inputLower = input.toLowerCase().trim();
  const targetLower = target.toLowerCase().trim();
  
  // Exact match
  if (inputLower === targetLower) return 1.0;
  
  // Contains match
  if (inputLower.includes(targetLower) || targetLower.includes(inputLower)) return 0.8;
  
  // Word-based matching
  const inputWords = inputLower.split(/\s+/);
  const targetWords = targetLower.split(/\s+/);
  
  let matchCount = 0;
  for (const inputWord of inputWords) {
    for (const targetWord of targetWords) {
      if (inputWord === targetWord || inputWord.includes(targetWord) || targetWord.includes(inputWord)) {
        matchCount++;
        break;
      }
    }
  }
  
  return matchCount / Math.max(inputWords.length, targetWords.length);
}

// Rule-based categorization with fuzzy logic
export function categorizeProductLocally(productName: string, quantity: number, unit: string): CategorizedItem {
  let bestCategory = 'Pantry & Canned Goods';
  let bestScore = 0;
  let reasoning = 'Default categorization';
  
  const name = productName.toLowerCase();
  
  // Check each category for keyword matches
  for (const [categoryName, categoryData] of Object.entries(RETAIL_CATEGORIES)) {
    let categoryScore = 0;
    
    // Check keyword matches
    for (const keyword of categoryData.keywords) {
      const matchScore = fuzzyMatch(name, keyword);
      if (matchScore > 0.6) {
        categoryScore += matchScore;
      }
    }
    
    // Boost score if unit matches category's typical units
    if (categoryData.units.includes(unit)) {
      categoryScore += 0.2;
    }
    
    if (categoryScore > bestScore) {
      bestScore = categoryScore;
      bestCategory = categoryName;
      reasoning = `Matched keywords: ${categoryData.keywords.filter(k => fuzzyMatch(name, k) > 0.6).join(', ')}`;
    }
  }
  
  // Get standardized name
  let standardizedName = productName;
  const categoryData = RETAIL_CATEGORIES[bestCategory as keyof typeof RETAIL_CATEGORIES];
  
  if (categoryData?.namingConventions) {
    for (const [original, standard] of Object.entries(categoryData.namingConventions)) {
      if (fuzzyMatch(name, original) > 0.7) {
        standardizedName = standard;
        break;
      }
    }
  }
  
  // Suggest appropriate unit based on category
  let suggestedUnit = unit;
  if (categoryData?.units && !categoryData.units.includes(unit)) {
    suggestedUnit = categoryData.units[0]; // Use first typical unit
  }
  
  return {
    originalName: productName,
    standardizedName,
    category: bestCategory,
    suggestedUnit,
    confidence: Math.min(bestScore, 1.0),
    reasoning
  };
}

// AI-powered categorization using OpenAI
export async function categorizeProductWithAI(productName: string, quantity: number, unit: string): Promise<CategorizedItem> {
  if (!process.env.OPENAI_API_KEY) {
    console.log("No OpenAI API key, falling back to local categorization");
    return categorizeProductLocally(productName, quantity, unit);
  }
  
  try {
    const prompt = `Categorize this shopping item and provide retail naming conventions:

Product: "${productName}"
Quantity: ${quantity}
Unit: ${unit}

Available categories: ${Object.keys(RETAIL_CATEGORIES).join(', ')}

Provide a JSON response with:
{
  "category": "category name",
  "subcategory": "specific subcategory if applicable",
  "standardizedName": "proper retail name for this product",
  "suggestedUnit": "most appropriate unit (COUNT, LB, OZ, G, KG, PKG, ROLL, BOX, CAN, BOTTLE, JAR, BUNCH)",
  "confidence": 0.95,
  "reasoning": "explanation of categorization"
}

Consider:
- Typical grocery store organization
- Standard retail naming conventions
- Quantity and unit appropriateness
- Brand-neutral naming`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a retail categorization expert. Provide accurate, consistent product categorization." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });
    
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from AI");
    }
    
    const aiResult = JSON.parse(content);
    
    return {
      originalName: productName,
      standardizedName: aiResult.standardizedName || productName,
      category: aiResult.category || 'Pantry & Canned Goods',
      subcategory: aiResult.subcategory,
      suggestedUnit: aiResult.suggestedUnit || unit,
      confidence: aiResult.confidence || 0.8,
      reasoning: aiResult.reasoning || 'AI categorization'
    };
    
  } catch (error) {
    console.error("AI categorization failed:", error);
    return categorizeProductLocally(productName, quantity, unit);
  }
}

// Normalize quantities based on typical retail packaging
export function normalizeQuantity(quantity: number, unit: string, productName: string): QuantityNormalization {
  const name = productName.toLowerCase();
  let normalizedQuantity = quantity;
  let suggestedUnit = unit;
  let conversionReason = undefined;
  
  // Handle common quantity normalizations
  if (name.includes('milk') && unit === 'COUNT') {
    if (name.includes('gallon')) {
      suggestedUnit = 'COUNT'; // Keep as count for gallons
    } else if (name.includes('half gallon')) {
      suggestedUnit = 'COUNT'; // Keep as count for half gallons
    }
  }
  
  // Pasta typically sold by weight or box
  if (name.includes('pasta') && unit === 'COUNT' && quantity > 5) {
    normalizedQuantity = Math.ceil(quantity / 16); // Assume 16oz boxes
    suggestedUnit = 'BOX';
    conversionReason = 'Converted to typical pasta box packaging';
  }
  
  // Produce items
  if ((name.includes('banana') || name.includes('basil')) && unit === 'COUNT') {
    suggestedUnit = 'BUNCH';
    conversionReason = 'Produce typically sold by bunch';
  }
  
  // Meat products
  if ((name.includes('chicken') || name.includes('meat')) && unit === 'COUNT') {
    suggestedUnit = 'LB';
    conversionReason = 'Meat typically sold by weight';
  }
  
  return {
    originalQuantity: quantity,
    normalizedQuantity,
    originalUnit: unit,
    suggestedUnit,
    conversionReason
  };
}

// Batch categorize multiple items
export async function categorizeShoppingList(items: Array<{productName: string, quantity: number, unit: string}>): Promise<CategorizedItem[]> {
  const results: CategorizedItem[] = [];
  
  for (const item of items) {
    try {
      const categorized = await categorizeProductWithAI(item.productName, item.quantity, item.unit);
      results.push(categorized);
    } catch (error) {
      console.error(`Failed to categorize ${item.productName}:`, error);
      // Fallback to local categorization
      results.push(categorizeProductLocally(item.productName, item.quantity, item.unit));
    }
  }
  
  return results;
}
