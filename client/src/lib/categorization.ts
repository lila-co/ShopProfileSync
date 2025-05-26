
import { apiRequest } from "./queryClient";

export interface CategorizedItem {
  originalName: string;
  standardizedName: string;
  category: string;
  subcategory?: string;
  suggestedUnit: string;
  confidence: number;
  reasoning: string;
  quantityNormalization?: {
    originalQuantity: number;
    normalizedQuantity: number;
    originalUnit: string;
    suggestedUnit: string;
    conversionReason?: string;
  };
  id?: number;
}

export interface CategorizationSummary {
  totalItems: number;
  categories: string[];
  highConfidenceItems: number;
  suggestedChanges: number;
}

export interface CategorizationResponse {
  categorizedItems: CategorizedItem[];
  summary: CategorizationSummary;
}

// Categorize all items in a shopping list
export async function categorizeShoppingList(shoppingListId: number): Promise<CategorizationResponse> {
  try {
    const response = await apiRequest("POST", "/api/shopping-lists/categorize", {
      shoppingListId
    });
    
    return await response.json();
  } catch (error) {
    console.error("Error categorizing shopping list:", error);
    throw error;
  }
}

// Categorize specific items
export async function categorizeItems(items: Array<{productName: string, quantity: number, unit: string}>): Promise<CategorizationResponse> {
  try {
    const response = await apiRequest("POST", "/api/shopping-lists/categorize", {
      items
    });
    
    return await response.json();
  } catch (error) {
    console.error("Error categorizing items:", error);
    throw error;
  }
}

// Categorize a single product
export async function categorizeSingleProduct(productName: string, quantity: number = 1, unit: string = 'COUNT'): Promise<CategorizedItem> {
  try {
    const response = await apiRequest("POST", "/api/products/categorize", {
      productName,
      quantity,
      unit
    });
    
    return await response.json();
  } catch (error) {
    console.error("Error categorizing single product:", error);
    throw error;
  }
}

// Get category color for UI
export function getCategoryColor(category: string): string {
  const colorMap: Record<string, string> = {
    'Produce': 'bg-green-100 text-green-800',
    'Dairy': 'bg-blue-100 text-blue-800',
    'Meat & Seafood': 'bg-red-100 text-red-800',
    'Pantry & Canned Goods': 'bg-yellow-100 text-yellow-800',
    'Frozen': 'bg-cyan-100 text-cyan-800',
    'Bakery': 'bg-orange-100 text-orange-800',
    'Household': 'bg-gray-100 text-gray-800',
    'Beverages': 'bg-purple-100 text-purple-800'
  };
  
  return colorMap[category] || 'bg-gray-100 text-gray-800';
}

// Get category icon
export function getCategoryIcon(category: string): string {
  const iconMap: Record<string, string> = {
    'Produce': '🥬',
    'Dairy': '🥛',
    'Meat & Seafood': '🥩',
    'Pantry & Canned Goods': '🥫',
    'Frozen': '🧊',
    'Bakery': '🍞',
    'Household': '🧽',
    'Beverages': '🥤'
  };
  
  return iconMap[category] || '📦';
}
