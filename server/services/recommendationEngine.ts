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
    const items = purchase.items || [];
    const purchaseDate = new Date(purchase.purchaseDate);
    
    for (const item of items) {
      if (!productMap.has(item.productName)) {
        productMap.set(item.productName, {
          productName: item.productName,
          purchases: [],
          totalQuantity: 0,
          averageDaysBetweenPurchases: 0,
          typicalPrice: 0,
          lastPurchaseDate: purchaseDate
        });
      }
      
      const pattern = productMap.get(item.productName)!;
      
      pattern.purchases.push({
        date: purchaseDate,
        quantity: item.quantity,
        retailerId: purchase.retailerId,
        price: item.unitPrice
      });
      
      pattern.totalQuantity += item.quantity;
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

function generateProductRecommendations(
  patterns: ProductPurchasePattern[],
  user: User
): InsertRecommendation[] {
  const now = new Date();
  const recommendations: InsertRecommendation[] = [];
  
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
