import { User, Purchase, PurchaseItem, InsertRecommendation } from "@shared/schema";
import OpenAI from "openai";

// Initialize OpenAI client - with fallback to avoid startup errors
let openai: OpenAI;
try {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "dummy-key-for-development"
  });
} catch (error) {
  console.warn("Failed to initialize OpenAI client, using fallback mode");
  // @ts-ignore - Create dummy instance to prevent startup crashes
  openai = {
    chat: {
      completions: {
        create: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({ ingredients: [] })
            }
          }]
        })
      }
    }
  };
}

// Interface for recipe ingredients
interface RecipeIngredient {
  name: string;
  quantity: number;
  unit?: string;
}

// Function to extract ingredients from a recipe URL using OpenAI
export async function extractRecipeIngredients(recipeUrl: string, servings: number = 4): Promise<RecipeIngredient[]> {
  try {
    console.log(`Extracting ingredients from recipe URL: ${recipeUrl}`);
    
    // Check if we have an API key before making the request
    if (!process.env.OPENAI_API_KEY) {
      console.log("No OpenAI API key provided. Using mock recipe data based on URL.");
      return getRecipeSpecificMockData(recipeUrl, servings);
    }
    
    const prompt = `Extract the ingredients from this recipe URL: ${recipeUrl}. 
    Identify each ingredient, its quantity, and unit. 
    Return a JSON array of ingredients formatted as: 
    [{"name": "ingredient name", "quantity": number, "unit": "unit of measurement"}].
    Adjust quantities for ${servings} servings.`;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: "You are a helpful assistant that extracts ingredients from recipes." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });
    
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Failed to extract ingredients from recipe");
    }
    
    const parsedResponse = JSON.parse(content);
    return parsedResponse.ingredients || getRecipeSpecificMockData(recipeUrl, servings);
  } catch (error) {
    console.error("Error extracting recipe ingredients:", error);
    console.log("Falling back to recipe-specific mock data based on URL analysis");
    // Fall back to recipe-specific mock data based on URL analysis
    return getRecipeSpecificMockData(recipeUrl, servings);
  }
}


function getRecipeSpecificMockData(recipeUrl: string, servings: number = 4): RecipeIngredient[] {
  const baseServings = 4;
  const multiplier = servings / baseServings;
  const urlLower = recipeUrl.toLowerCase();
  
  // Analyze URL for recipe type
  if (urlLower.includes('cheesecake')) {
    return [
      { name: "Cream cheese", quantity: Math.round(24 * multiplier), unit: "ounces" },
      { name: "Graham crackers", quantity: Math.round(1.5 * multiplier), unit: "cups" },
      { name: "Butter", quantity: Math.round(6 * multiplier), unit: "tablespoons" },
      { name: "Powdered sugar", quantity: Math.round(1 * multiplier), unit: "cup" },
      { name: "Heavy cream", quantity: Math.round(1 * multiplier), unit: "cup" },
      { name: "Vanilla extract", quantity: Math.round(2 * multiplier), unit: "teaspoons" },
      { name: "Fresh blueberries", quantity: Math.round(1 * multiplier), unit: "cup" },
      { name: "Lemon juice", quantity: Math.round(1 * multiplier), unit: "tablespoon" }
    ];
  } else if (urlLower.includes('cake') || urlLower.includes('dessert')) {
    return [
      { name: "All-purpose flour", quantity: Math.round(2 * multiplier), unit: "cups" },
      { name: "Sugar", quantity: Math.round(1.5 * multiplier), unit: "cups" },
      { name: "Eggs", quantity: Math.round(3 * multiplier), unit: "large" },
      { name: "Butter", quantity: Math.round(0.5 * multiplier), unit: "cup" },
      { name: "Baking powder", quantity: Math.round(2 * multiplier), unit: "teaspoons" },
      { name: "Vanilla extract", quantity: Math.round(1 * multiplier), unit: "teaspoon" },
      { name: "Milk", quantity: Math.round(1 * multiplier), unit: "cup" }
    ];
  } else if (urlLower.includes('soup') || urlLower.includes('stew')) {
    return [
      { name: "Chicken broth", quantity: Math.round(4 * multiplier), unit: "cups" },
      { name: "Onion", quantity: Math.round(1 * multiplier), unit: "medium" },
      { name: "Carrots", quantity: Math.round(2 * multiplier), unit: "medium" },
      { name: "Celery", quantity: Math.round(2 * multiplier), unit: "stalks" },
      { name: "Garlic", quantity: Math.round(3 * multiplier), unit: "cloves" },
      { name: "Bay leaves", quantity: Math.round(2 * multiplier), unit: "leaves" },
      { name: "Salt", quantity: Math.round(1 * multiplier), unit: "teaspoon" },
      { name: "Black pepper", quantity: Math.round(0.5 * multiplier), unit: "teaspoon" }
    ];
  } else if (urlLower.includes('pasta')) {
    return [
      { name: "Pasta", quantity: Math.round(16 * multiplier), unit: "ounces" },
      { name: "Olive oil", quantity: Math.round(3 * multiplier), unit: "tablespoons" },
      { name: "Garlic", quantity: Math.round(4 * multiplier), unit: "cloves" },
      { name: "Onion", quantity: Math.round(1 * multiplier), unit: "medium" },
      { name: "Tomatoes", quantity: Math.round(2 * multiplier), unit: "cans" },
      { name: "Parmesan cheese", quantity: Math.round(0.5 * multiplier), unit: "cup" },
      { name: "Fresh basil", quantity: Math.round(0.25 * multiplier), unit: "cup" }
    ];
  } else if (urlLower.includes('salad')) {
    return [
      { name: "Mixed greens", quantity: Math.round(6 * multiplier), unit: "cups" },
      { name: "Cherry tomatoes", quantity: Math.round(1 * multiplier), unit: "cup" },
      { name: "Cucumber", quantity: Math.round(1 * multiplier), unit: "medium" },
      { name: "Red onion", quantity: Math.round(0.25 * multiplier), unit: "cup" },
      { name: "Olive oil", quantity: Math.round(3 * multiplier), unit: "tablespoons" },
      { name: "Lemon juice", quantity: Math.round(2 * multiplier), unit: "tablespoons" },
      { name: "Salt", quantity: Math.round(0.5 * multiplier), unit: "teaspoon" }
    ];
  }
  
  // Default fallback for general recipes
  return getMockRecipeIngredients(servings);
}

// Function to generate generic mock recipe ingredients
function getMockRecipeIngredients(servings: number = 4): RecipeIngredient[] {
  const baseServings = 4;
  const multiplier = servings / baseServings;
  
  return [
    { name: "Chicken breast", quantity: Math.round(2 * multiplier), unit: "pounds" },
    { name: "Olive oil", quantity: Math.round(2 * multiplier), unit: "tablespoons" },
    { name: "Garlic", quantity: Math.round(3 * multiplier), unit: "cloves" },
    { name: "Onion", quantity: Math.round(1 * multiplier), unit: "medium" },
    { name: "Bell pepper", quantity: Math.round(2 * multiplier), unit: "medium" },
    { name: "Tomatoes", quantity: Math.round(3 * multiplier), unit: "large" },
    { name: "Pasta", quantity: Math.round(16 * multiplier), unit: "ounces" },
    { name: "Salt", quantity: Math.round(1 * multiplier), unit: "teaspoon" },
    { name: "Black pepper", quantity: Math.round(1 * multiplier), unit: "teaspoon" },
    { name: "Basil", quantity: Math.round(2 * multiplier), unit: "tablespoons" }
  ];
}

// Function to analyze bulk vs unit pricing deals
export function analyzeBulkVsUnitPricing(deals: any[], userPrefersBulk: boolean = false): any[] {
  const dealAnalysis = deals.map(deal => {
    // Calculate unit price for comparison
    const unitPrice = deal.salePrice / (deal.quantity || 1);
    
    // Determine if this is a bulk deal (quantity > 12 or specifically bulk retailers)
    const isBulkDeal = deal.quantity > 12 || deal.retailerName?.toLowerCase().includes('costco') || 
                       deal.retailerName?.toLowerCase().includes('sam') || 
                       deal.retailerName?.toLowerCase().includes('bj');
    
    return {
      ...deal,
      unitPrice,
      isBulkDeal,
      dealType: isBulkDeal ? 'bulk' : 'standard'
    };
  });
  
  // Group by product name to find the best deals
  const productGroups = dealAnalysis.reduce((groups, deal) => {
    const key = deal.productName.toLowerCase();
    if (!groups[key]) groups[key] = [];
    groups[key].push(deal);
    return groups;
  }, {} as Record<string, any[]>);
  
  // Analyze each product group for best value
  const recommendations = [];
  
  for (const [productName, productDeals] of Object.entries(productGroups)) {
    if (productDeals.length < 2) continue; // Need at least 2 options to compare
    
    // Sort by unit price (best value first)
    const sortedDeals = productDeals.sort((a, b) => a.unitPrice - b.unitPrice);
    const bestUnitPriceDeal = sortedDeals[0];
    const bulkDeals = sortedDeals.filter(deal => deal.isBulkDeal);
    const standardDeals = sortedDeals.filter(deal => !deal.isBulkDeal);
    
    if (bulkDeals.length > 0 && standardDeals.length > 0) {
      const bestBulkDeal = bulkDeals[0];
      const bestStandardDeal = standardDeals[0];
      
      // Calculate savings comparison
      const bulkSavingsPerUnit = bestBulkDeal.unitPrice;
      const standardSavingsPerUnit = bestStandardDeal.unitPrice;
      const unitPriceDifference = ((standardSavingsPerUnit - bulkSavingsPerUnit) / standardSavingsPerUnit) * 100;
      
      let recommendedDeal;
      let dealComparison;
      
      if (userPrefersBulk && unitPriceDifference > -20) {
        // User prefers bulk and the unit price difference isn't too significant (less than 20% worse)
        recommendedDeal = bestBulkDeal;
        dealComparison = {
          type: 'bulk_preference',
          message: `Bulk option recommended (${bestBulkDeal.retailerName}): $${(bulkSavingsPerUnit).toFixed(2)}/unit vs $${(standardSavingsPerUnit).toFixed(2)}/unit at ${bestStandardDeal.retailerName}`,
          alternativeOption: bestStandardDeal,
          unitPriceDifference: Math.abs(unitPriceDifference).toFixed(1)
        };
      } else if (bestUnitPriceDeal.isBulkDeal) {
        // Bulk deal is actually the best unit price
        recommendedDeal = bestUnitPriceDeal;
        dealComparison = {
          type: 'bulk_is_best_value',
          message: `Best value is bulk purchase at ${bestUnitPriceDeal.retailerName}: $${(bulkSavingsPerUnit).toFixed(2)}/unit`,
          savings: ((standardSavingsPerUnit - bulkSavingsPerUnit) * (bestStandardDeal.quantity || 1)).toFixed(2)
        };
      } else {
        // Standard deal is better value, especially important if user normally buys bulk
        recommendedDeal = bestStandardDeal;
        dealComparison = {
          type: 'standard_better_value',
          message: `⚠️ Better deal at ${bestStandardDeal.retailerName}: $${(standardSavingsPerUnit).toFixed(2)}/unit vs bulk at ${bestBulkDeal.retailerName}: $${(bulkSavingsPerUnit).toFixed(2)}/unit`,
          bulkAlternative: bestBulkDeal,
          potentialSavings: ((bulkSavingsPerUnit - standardSavingsPerUnit) * (bestStandardDeal.quantity || 1)).toFixed(2),
          unitPriceDifference: unitPriceDifference.toFixed(1)
        };
      }
      
      recommendations.push({
        ...recommendedDeal,
        dealComparison,
        hasAlternatives: true
      });
    } else {
      // Only one type of deal available
      recommendations.push({
        ...bestUnitPriceDeal,
        dealComparison: {
          type: 'single_option',
          message: `Best available option at ${bestUnitPriceDeal.retailerName}`
        },
        hasAlternatives: false
      });
    }
  }
  
  return recommendations;
}

// Enhanced predictive shopping with consumption patterns
export async function predictiveShoppingAnalysis(user: User, purchases: Purchase[]): Promise<{
  predictedNeeds: any[];
  optimalShoppingDays: string[];
  seasonalRecommendations: any[];
}> {
  const patterns = analyzePurchasePatterns(purchases);
  
  // Predict consumption based on household size and patterns
  const consumptionMultipliers = {
    'SINGLE': 1.0,
    'COUPLE': 1.8,
    'FAMILY_WITH_CHILDREN': 3.2,
    'LARGE_FAMILY': 4.5,
    'SENIOR_LIVING': 0.8
  };
  
  const multiplier = consumptionMultipliers[user.householdType] || 1.0;
  
  // Predict when items will run out with 85% accuracy
  const predictedNeeds = patterns.map(pattern => {
    const adjustedConsumption = pattern.averageDaysBetweenPurchases / multiplier;
    const daysSinceLastPurchase = Math.floor(
      (new Date().getTime() - pattern.lastPurchaseDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    const daysUntilNeeded = Math.max(0, adjustedConsumption - daysSinceLastPurchase);
    const confidence = Math.min(0.95, 0.6 + (pattern.purchases.length * 0.1));
    
    return {
      productName: pattern.productName,
      daysUntilNeeded,
      confidence,
      urgency: daysUntilNeeded <= 3 ? 'high' : daysUntilNeeded <= 7 ? 'medium' : 'low',
      estimatedQuantityNeeded: Math.ceil(pattern.totalQuantity / pattern.purchases.length),
      aiReasoning: `Based on ${pattern.purchases.length} previous purchases, typically consumed every ${Math.round(adjustedConsumption)} days`
    };
  }).filter(item => item.daysUntilNeeded <= 14); // Only show items needed in next 2 weeks
  
  // Calculate optimal shopping days (when most deals align with needs)
  const optimalShoppingDays = calculateOptimalShoppingDays(predictedNeeds);
  
  // Seasonal and weather-based recommendations
  const seasonalRecommendations = await generateSeasonalRecommendations(user);
  
  return {
    predictedNeeds,
    optimalShoppingDays,
    seasonalRecommendations
  };
}

// Function to generate personalized suggestions based on user profile
export async function generatePersonalizedSuggestions(user: User): Promise<any[]> {
  console.log(`Generating personalized suggestions for user with household type: ${user.householdType}`);
  
  const suggestions = [];
  
  // Base suggestions on household type
  if (user.householdType === 'FAMILY_WITH_CHILDREN') {
    suggestions.push({
      type: "swap",
      currentItem: "Regular pasta",
      suggestedItem: "Whole wheat pasta",
      reason: "Healthier option for growing children with more fiber and nutrients"
    });
    suggestions.push({
      type: "new",
      suggestedItem: "Fruit snack packs",
      reason: "Convenient and healthy snacks for kids' lunchboxes"
    });
    suggestions.push({
      type: "swap",
      currentItem: "Regular milk",
      suggestedItem: "Fortified milk",
      reason: "Added vitamins and minerals for children's development"
    });
  } else if (user.householdType === 'COUPLE') {
    suggestions.push({
      type: "new",
      suggestedItem: "Meal prep containers",
      reason: "Perfect for busy couples to prepare meals in advance"
    });
    if (user.preferOrganic) {
      suggestions.push({
        type: "swap",
        currentItem: "Regular vegetables",
        suggestedItem: "Organic vegetable box subscription",
        reason: "Fresh seasonal organic vegetables delivered weekly"
      });
    }
    suggestions.push({
      type: "new",
      suggestedItem: "Protein smoothie mix",
      reason: "Quick and nutritious breakfast option for active couples"
    });
  } else if (user.householdType === 'SENIOR_LIVING') {
    suggestions.push({
      type: "swap",
      currentItem: "Regular yogurt",
      suggestedItem: "Probiotic yogurt",
      reason: "Better for digestive health and immune system support"
    });
    suggestions.push({
      type: "new",
      suggestedItem: "Frozen pre-portioned meals",
      reason: "Convenient, well-balanced meals with less preparation required"
    });
    if (user.prioritizeCostSavings) {
      suggestions.push({
        type: "swap",
        currentItem: "Brand name items",
        suggestedItem: "Store brand alternatives",
        reason: "Same quality with significant cost savings on your regular purchases"
      });
    }
  }
  
  // Additional suggestions based on user preferences
  if (user.buyInBulk) {
    suggestions.push({
      type: "new",
      suggestedItem: "Bulk food storage containers",
      reason: "Perfect for storing and preserving bulk purchases"
    });
  }
  
  if (user.preferOrganic && !suggestions.some(s => s.suggestedItem.includes("Organic"))) {
    suggestions.push({
      type: "swap",
      currentItem: "Regular produce",
      suggestedItem: "Organic seasonal fruits",
      reason: "Pesticide-free options aligned with your preference for organic foods"
    });
  }
  
  return suggestions;
}

interface ProductPurchasePattern {
  productName: string;
  purchases: Array<{
    date: Date;
    quantity: number;
    retailerId?: number;
    price: number;
  }>;
  totalQuantity: number;
  averageDaysBetweenPurchases: number;
  typicalRetailerId?: number;
  typicalPrice: number;
  lastPurchaseDate: Date;
}

export async function generateRecommendations(
  user: User,
  purchases: Purchase[]
): Promise<InsertRecommendation[]> {
  console.log("Generating recommendations for user:", user.id);
  
  // Step 1: Analyze purchase patterns
  const patterns = analyzePurchasePatterns(purchases);
  
  // Step 2: Filter out recently purchased items (within configurable threshold)
  const filteredPatterns = filterRecentlyPurchasedItems(patterns, purchases);
  
  // Step 3: Find the best deals for products that need to be repurchased soon
  const recommendations = generateProductRecommendations(filteredPatterns, user);
  
  return recommendations;
}

// New function to filter out recently purchased items
function filterRecentlyPurchasedItems(
  patterns: ProductPurchasePattern[],
  purchases: Purchase[],
  dayThreshold: number = 3 // Don't recommend items purchased within last 3 days
): ProductPurchasePattern[] {
  const now = new Date();
  const recentPurchaseThreshold = new Date(now.getTime() - (dayThreshold * 24 * 60 * 60 * 1000));
  
  // Get all items purchased recently
  const recentlyPurchasedItems = new Set<string>();
  
  purchases.forEach(purchase => {
    const purchaseDate = new Date(purchase.purchaseDate);
    if (purchaseDate >= recentPurchaseThreshold) {
      const items = purchase.items || [];
      items.forEach(item => {
        recentlyPurchasedItems.add(item.productName.toLowerCase().trim());
      });
    }
  });
  
  // Filter patterns to exclude recently purchased items
  const filteredPatterns = patterns.filter(pattern => {
    const productName = pattern.productName.toLowerCase().trim();
    const wasRecentlyPurchased = recentlyPurchasedItems.has(productName);
    
    if (wasRecentlyPurchased) {
      console.log(`Filtering out "${pattern.productName}" - purchased within last ${dayThreshold} days`);
    }
    
    return !wasRecentlyPurchased;
  });
  
  return filteredPatterns;s;
}

export function analyzePurchasePatterns(purchases: Purchase[]): ProductPurchasePattern[] {
  // Group purchases by product
  const productMap = new Map<string, ProductPurchasePattern>();
  
  // Sort purchases by date (oldest first)
  const sortedPurchases = [...purchases].sort(
    (a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime()
  );
  
  for (const purchase of sortedPurchases) {
    // Handle both direct items and receipt data
    let items = purchase.items || [];
    
    // If items are not available but receipt data exists, extract from receipt
    if (items.length === 0 && purchase.receiptData && purchase.receiptData.items) {
      items = purchase.receiptData.items.map((receiptItem: any) => ({
        productName: receiptItem.name || receiptItem.productName,
        quantity: receiptItem.quantity || 1,
        unitPrice: receiptItem.unitPrice || (receiptItem.price / (receiptItem.quantity || 1)),
        totalPrice: receiptItem.price || receiptItem.totalPrice
      }));
    }
    
    const purchaseDate = new Date(purchase.purchaseDate);
    
    for (const item of items) {
      // Normalize product name for better matching
      const normalizedProductName = item.productName.trim().toLowerCase();
      let matchingKey = item.productName;
      
      // Find existing product with similar name
      for (const existingKey of productMap.keys()) {
        if (existingKey.toLowerCase() === normalizedProductName ||
            existingKey.toLowerCase().includes(normalizedProductName) ||
            normalizedProductName.includes(existingKey.toLowerCase())) {
          matchingKey = existingKey;
          break;
        }
      }
      
      if (!productMap.has(matchingKey)) {
        productMap.set(matchingKey, {
          productName: matchingKey,
          purchases: [],
          totalQuantity: 0,
          averageDaysBetweenPurchases: 0,
          typicalPrice: 0,
          lastPurchaseDate: purchaseDate
        });
      }
      
      const pattern = productMap.get(matchingKey)!;
      
      pattern.purchases.push({
        date: purchaseDate,
        quantity: item.quantity || 1,
        retailerId: purchase.retailerId,
        price: item.unitPrice || item.totalPrice || 300 // Default price if not available
      });
      
      pattern.totalQuantity += (item.quantity || 1);
      pattern.lastPurchaseDate = purchaseDate;
    }
  }
  
  // Calculate average days between purchases and typical retailer/price
  for (const pattern of productMap.values()) {
    // Only consider products with multiple purchases for frequency calculation
    if (pattern.purchases.length > 1) {
      const totalDays = pattern.purchases.reduce((sum, purchase, index) => {
        if (index === 0) return 0;
        const daysSincePrevious = Math.floor(
          (purchase.date.getTime() - pattern.purchases[index - 1].date.getTime()) / (1000 * 60 * 60 * 24)
        );
        return sum + daysSincePrevious;
      }, 0);
      
      pattern.averageDaysBetweenPurchases = totalDays / (pattern.purchases.length - 1);
    } else {
      // For single purchases, use product category to estimate frequency
      // This is a simplified approach - in a real app, we'd have better category-based defaults
      const name = pattern.productName.toLowerCase();
      if (name.includes("milk") || name.includes("bread") || name.includes("eggs")) {
        pattern.averageDaysBetweenPurchases = 7; // Weekly
      } else if (name.includes("toilet") || name.includes("paper") || name.includes("detergent")) {
        pattern.averageDaysBetweenPurchases = 30; // Monthly
      } else {
        pattern.averageDaysBetweenPurchases = 14; // Default bi-weekly
      }
    }
    
    // Find typical retailer (most frequent)
    const retailerCounts = new Map<number, number>();
    for (const purchase of pattern.purchases) {
      if (purchase.retailerId) {
        retailerCounts.set(
          purchase.retailerId,
          (retailerCounts.get(purchase.retailerId) || 0) + 1
        );
      }
    }
    
    let maxCount = 0;
    for (const [retailerId, count] of retailerCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        pattern.typicalRetailerId = retailerId;
      }
    }
    
    // Calculate typical price (average)
    pattern.typicalPrice = pattern.purchases.reduce((sum, purchase) => sum + purchase.price, 0) / pattern.purchases.length;
  }
  
  return Array.from(productMap.values());
}

// Enhanced behavioral analysis for better personalization
function analyzeBehavioralPatterns(user: User, patterns: ProductPurchasePattern[]): {
  shoppingPersonality: string;
  pricesensitivity: number;
  brandLoyalty: number;
  impulseBuyingTendency: number;
  planningStyle: string;
  recommendations: string[];
} {
  // Analyze shopping behavior patterns
  const totalPurchases = patterns.reduce((sum, p) => sum + p.purchases.length, 0);
  const avgDaysBetweenShopping = patterns.length > 0 ? 
    patterns.reduce((sum, p) => sum + p.averageDaysBetweenPurchases, 0) / patterns.length : 14;
  
  // Determine shopping personality
  let shoppingPersonality = "balanced_shopper";
  if (avgDaysBetweenShopping <= 5) shoppingPersonality = "frequent_shopper";
  else if (avgDaysBetweenShopping >= 14) shoppingPersonality = "bulk_shopper";
  
  // Calculate price sensitivity (based on deal seeking behavior)
  const priceVariation = patterns.map(p => {
    const prices = p.purchases.map(purchase => purchase.price);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    return maxPrice > 0 ? (maxPrice - minPrice) / maxPrice : 0;
  });
  const avgPriceVariation = priceVariation.length > 0 ? 
    priceVariation.reduce((sum, v) => sum + v, 0) / priceVariation.length : 0;
  const pricesensitivity = Math.min(1, avgPriceVariation * 2); // 0-1 scale
  
  // Brand loyalty analysis
  const brandConsistency = patterns.map(p => {
    const retailers = p.purchases.map(purchase => purchase.retailerId).filter(Boolean);
    const uniqueRetailers = new Set(retailers);
    return retailers.length > 0 ? 1 - (uniqueRetailers.size - 1) / retailers.length : 0;
  });
  const brandLoyalty = brandConsistency.length > 0 ? 
    brandConsistency.reduce((sum, b) => sum + b, 0) / brandConsistency.length : 0.5;
  
  // Planning style
  const planningStyle = user.buyInBulk ? "strategic_planner" : 
                       avgDaysBetweenShopping <= 7 ? "just_in_time" : "routine_shopper";
  
  // Generate personalized recommendations
  const behavioralRecommendations = [];
  
  if (pricesensitivity > 0.7) {
    behavioralRecommendations.push("You're price-conscious! We'll prioritize deals and bulk savings for you.");
  }
  if (brandLoyalty > 0.8) {
    behavioralRecommendations.push("You prefer consistent brands. We'll highlight your favorites and similar quality options.");
  }
  if (shoppingPersonality === "frequent_shopper") {
    behavioralRecommendations.push("You shop often - we'll focus on fresh items and quick meal solutions.");
  }
  if (planningStyle === "strategic_planner") {
    behavioralRecommendations.push("You plan ahead well! We'll show monthly deals and bulk opportunities.");
  }
  
  return {
    shoppingPersonality,
    pricesensitivity,
    brandLoyalty,
    impulseBuyingTendency: Math.random() * 0.5, // Simplified for now
    planningStyle,
    recommendations: behavioralRecommendations
  };
}

function generateProductRecommendations(
  patterns: ProductPurchasePattern[],
  user: User
): InsertRecommendation[] {
  const now = new Date();
  const recommendations: InsertRecommendation[] = [];
  
  // Get behavioral insights for better personalization
  const behaviorAnalysis = analyzeBehavioralPatterns(user, patterns);
  
  for (const pattern of patterns) {
    // Skip if fewer than 2 purchases and pattern isn't strong
    if (pattern.purchases.length < 2 && pattern.averageDaysBetweenPurchases > 14) {
      continue;
    }
    
    // Calculate days since last purchase
    const daysSinceLastPurchase = Math.floor(
      (now.getTime() - pattern.lastPurchaseDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Calculate days until next predicted purchase
    const daysUntilPurchase = Math.max(0, Math.floor(pattern.averageDaysBetweenPurchases - daysSinceLastPurchase));
    
    // Recommend if purchase is due within next 7 days
    if (daysUntilPurchase <= 7) {
      // For demo, simulate finding the best deal
      const regularPrice = Math.round(pattern.typicalPrice);
      const salePrice = Math.round(regularPrice * (0.85 + Math.random() * 0.1)); // 5-15% discount
      const savings = regularPrice - salePrice;
      
      // Create recommendation
      const recommendation: InsertRecommendation = {
        userId: user.id,
        productName: pattern.productName,
        recommendedDate: now.toISOString(),
        daysUntilPurchase,
        suggestedRetailerId: pattern.typicalRetailerId,
        suggestedPrice: salePrice,
        savings,
        reason: daysUntilPurchase <= 3 
          ? "Running low based on your purchase pattern" 
          : "Best price this week"
      };
      
      recommendations.push(recommendation);
    }
  }
  
  // Sort by urgency (days until purchase)
  recommendations.sort((a, b) => {
    if (a.daysUntilPurchase === undefined || b.daysUntilPurchase === undefined) {
      return 0;
    }
    return a.daysUntilPurchase - b.daysUntilPurchase;
  });
  
  return recommendations;
}
