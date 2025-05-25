import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ZodError } from "zod";
import { parseReceiptImage } from "./services/receiptParser";
import { generateRecommendations, analyzePurchasePatterns, extractRecipeIngredients } from "./services/recommendationEngine";
import { getRetailerAPI } from "./services/retailerIntegration";
import OpenAI from "openai";

// Helper to handle errors consistently
const handleError = (res: Response, error: any) => {
  console.error(error);
  if (error instanceof ZodError) {
    return res.status(400).json({ message: error.errors.map(e => e.message).join(', ') });
  }
  return res.status(500).json({ message: error.message || 'Internal server error' });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // API Routes
  // User profile routes
  app.get('/api/user/profile', async (req: Request, res: Response) => {
    try {
      // For demo purposes, we'll return a mock user since we don't have auth
      const user = await storage.getDefaultUser();
      res.json(user);
    } catch (error) {
      handleError(res, error);
    }
  });

  app.patch('/api/user/profile', async (req: Request, res: Response) => {
    try {
      // Get the default user ID for demo purposes
      const defaultUser = await storage.getDefaultUser();
      
      // Add the ID to the request body
      const userData = {
        ...req.body,
        id: defaultUser.id
      };
      
      // Simple update via defaultUser to avoid ID issues
      const updatedUser = await storage.updateUser(userData);
      res.json(updatedUser);
    } catch (error) {
      console.error('Profile update error:', error);
      handleError(res, error);
    }
  });

  // Retailer routes
  app.get('/api/retailers', async (req: Request, res: Response) => {
    try {
      const retailers = await storage.getRetailers();
      res.json(retailers);
    } catch (error) {
      handleError(res, error);
    }
  });

  // Retailer accounts
  app.get('/api/user/retailer-accounts', async (req: Request, res: Response) => {
    try {
      const retailerAccounts = await storage.getRetailerAccounts();
      res.json(retailerAccounts);
    } catch (error) {
      handleError(res, error);
    }
  });

  app.post('/api/user/retailer-accounts', async (req: Request, res: Response) => {
    try {
      const newAccount = await storage.createRetailerAccount(req.body);
      res.json(newAccount);
    } catch (error) {
      handleError(res, error);
    }
  });

  // Receipt routes
  app.post('/api/receipts/extract', async (req: Request, res: Response) => {
    try {
      const { image } = req.body;
      if (!image) {
        return res.status(400).json({ message: 'Image data is required' });
      }
      const extractedData = await parseReceiptImage(image);
      res.json(extractedData);
    } catch (error) {
      handleError(res, error);
    }
  });

  app.post('/api/receipts', async (req: Request, res: Response) => {
    try {
      const { receiptImage, receiptData } = req.body;
      const purchase = await storage.createPurchaseFromReceipt(receiptData);
      res.json(purchase);
    } catch (error) {
      handleError(res, error);
    }
  });

  // Insights routes
  app.get('/api/insights/top-items', async (req: Request, res: Response) => {
    try {
      const topItems = await storage.getTopPurchasedItems();
      res.json(topItems);
    } catch (error) {
      handleError(res, error);
    }
  });

  app.get('/api/insights/monthly-spending', async (req: Request, res: Response) => {
    try {
      const monthlySpending = await storage.getMonthlySpending();
      res.json(monthlySpending);
    } catch (error) {
      handleError(res, error);
    }
  });

  app.get('/api/insights/monthly-savings', async (req: Request, res: Response) => {
    try {
      const savings = await storage.getMonthlySavings();
      res.json(savings);
    } catch (error) {
      handleError(res, error);
    }
  });

  // Recommendations routes
  app.get('/api/recommendations', async (req: Request, res: Response) => {
    try {
      // Get or generate recommendations based on purchase history
      let recommendations = await storage.getRecommendations();
      
      // If no recommendations exist, generate some
      if (!recommendations || recommendations.length === 0) {
        const user = await storage.getDefaultUser();
        const purchases = await storage.getPurchases();
        recommendations = await generateRecommendations(user, purchases);
        
        // Save the generated recommendations
        for (const rec of recommendations) {
          await storage.createRecommendation(rec);
        }
      }
      
      res.json(recommendations);
    } catch (error) {
      handleError(res, error);
    }
  });

  // Shopping list routes
  app.get('/api/shopping-lists', async (req: Request, res: Response) => {
    try {
      const lists = await storage.getShoppingLists();
      
      // Fetch items for each shopping list
      const listsWithItems = await Promise.all(lists.map(async (list) => {
        const items = await storage.getShoppingListItems(list.id);
        console.log(`List ${list.id} has ${items.length} items:`, items);
        return { ...list, items };
      }));
      
      res.json(listsWithItems);
    } catch (error) {
      handleError(res, error);
    }
  });
  
  // Get recent purchases to refresh shopping lists
  app.get('/api/purchases/recent', async (req: Request, res: Response) => {
    try {
      const userId = 1; // For demo purposes, use default user
      const purchases = await storage.getPurchases();
      
      // Get the 5 most recent purchases
      const recentPurchases = purchases
        .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
        .slice(0, 5);
        
      res.json(recentPurchases);
    } catch (error) {
      handleError(res, error);
    }
  });

  // Generate a shopping list from typical purchases
  app.post('/api/shopping-lists/generate', async (req: Request, res: Response) => {
    try {
      const userId = 1; // For demo purposes, use default user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // For demo purposes, provide a rich set of realistic shopping recommendations
      // with personalized insights and deal information
      const recommendedItems = [
        { 
          productName: 'Milk', 
          quantity: 1, 
          unit: 'GALLON',
          suggestedRetailerId: 1,
          suggestedPrice: 359,
          savings: 40,
          reason: "You typically buy milk weekly. On sale at Walmart today!",
          daysUntilPurchase: 2
        },
        { 
          productName: 'Eggs', 
          quantity: 1, 
          unit: 'DOZEN',
          suggestedRetailerId: 2,
          suggestedPrice: 249,
          savings: 50,
          reason: "You're running low based on your purchase pattern",
          daysUntilPurchase: 3
        },
        { 
          productName: 'Bread', 
          quantity: 1, 
          unit: 'LOAF',
          suggestedRetailerId: 3,
          suggestedPrice: 229,
          savings: 30,
          reason: "You buy this every 5 days on average",
          daysUntilPurchase: 1
        },
        { 
          productName: 'Bananas', 
          quantity: 1, 
          unit: 'BUNCH',
          suggestedRetailerId: 1,
          suggestedPrice: 129,
          savings: 20,
          reason: "Currently on special at Walmart",
          daysUntilPurchase: 4
        },
        { 
          productName: 'Ground Coffee', 
          quantity: 1, 
          unit: 'BAG',
          suggestedRetailerId: 3,
          suggestedPrice: 899,
          savings: 200,
          reason: "Running low based on your 2-week purchase cycle",
          daysUntilPurchase: 0
        },
        { 
          productName: 'Chicken Breast', 
          quantity: 1, 
          unit: 'LB',
          suggestedRetailerId: 2,
          suggestedPrice: 599,
          savings: 100,
          reason: "25% off this week at Target",
          daysUntilPurchase: 1
        },
        { 
          productName: 'Yogurt', 
          quantity: 6, 
          unit: 'CAN',
          suggestedRetailerId: 3,
          suggestedPrice: 149,
          savings: 30,
          reason: "Buy 5 get 1 free this week at Kroger",
          daysUntilPurchase: 2
        },
        { 
          productName: 'Pasta', 
          quantity: 2, 
          unit: 'BOX',
          suggestedRetailerId: 1,
          suggestedPrice: 129,
          savings: 0,
          reason: "Based on your monthly pasta purchase",
          daysUntilPurchase: 0
        },
        { 
          productName: 'Pasta Sauce', 
          quantity: 1, 
          unit: 'JAR',
          suggestedRetailerId: 1,
          suggestedPrice: 329,
          savings: 0,
          reason: "Pairs with pasta in your cart",
          daysUntilPurchase: 0
        },
        { 
          productName: 'Apples', 
          quantity: 1, 
          unit: 'BAG',
          suggestedRetailerId: 2,
          suggestedPrice: 459,
          savings: 40,
          reason: "Fresh seasonal Honeycrisp apples on sale",
          daysUntilPurchase: 3
        }
      ];
      
      // Return the recommendations directly for the preview
      // This lets the user see and confirm items before they're added to the list
      res.json({
        userId,
        items: recommendedItems,
        totalSavings: recommendedItems.reduce((sum, item) => sum + (item.savings || 0), 0)
      });
    } catch (error) {
      handleError(res, error);
    }
  });

  // Import recipe and add ingredients to shopping list
  app.post('/api/shopping-lists/recipe', async (req: Request, res: Response) => {
    try {
      const { recipeUrl, shoppingListId, servings } = req.body;
      if (!recipeUrl) {
        return res.status(400).json({ message: 'Recipe URL is required' });
      }

      // In a real app, we would scrape the recipe URL to extract ingredients
      // For demo purposes, simulate recipe extraction
      const extractedIngredients = await extractRecipeIngredients(recipeUrl, servings);
      
      // Add each ingredient to the shopping list
      const addedItems = [];
      for (const ingredient of extractedIngredients) {
        const newItem = await storage.addShoppingListItem({
          shoppingListId: shoppingListId || 1, // Default to first list if not specified
          productName: ingredient.name,
          quantity: ingredient.quantity
        });
        addedItems.push(newItem);
      }

      res.json(addedItems);
    } catch (error) {
      handleError(res, error);
    }
  });

  // Get personalized suggestions based on user profile
  app.get('/api/shopping-lists/suggestions', async (req: Request, res: Response) => {
    try {
      const userId = 1; // For demo purposes, use default user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // For demo purposes, return hardcoded suggestions based on user profile
      const suggestions = [
        {
          type: "swap",
          currentItem: "Regular pasta",
          suggestedItem: "Whole wheat pasta",
          reason: "Healthier option with more fiber and nutrients"
        },
        {
          type: "new",
          suggestedItem: "Fresh seasonal fruits",
          reason: "Based on your preference for organic products"
        },
        {
          type: "swap",
          currentItem: "Regular milk",
          suggestedItem: "Organic milk",
          reason: "Aligns with your dietary preferences"
        }
      ];
      
      res.json(suggestions);
    } catch (error) {
      handleError(res, error);
    }
  });

  app.post('/api/shopping-list/items', async (req: Request, res: Response) => {
    try {
      const { productName, quantity, unit, shoppingListId } = req.body;
      
      // If no shoppingListId provided, use the default list
      let targetListId = shoppingListId;
      if (!targetListId) {
        const lists = await storage.getShoppingLists();
        const defaultList = lists.find(list => list.isDefault) || lists[0];
        if (!defaultList) {
          return res.status(400).json({ message: 'No shopping list available' });
        }
        targetListId = defaultList.id;
      }
      
      // Get existing items to check for duplicates
      const existingItems = await storage.getShoppingListItems(targetListId);
      
      // Common item names and alternate spellings/misspellings
      const commonItemCorrections: Record<string, string[]> = {
        'banana': ['banan', 'bananna', 'bananas', 'bannana', 'banannas'],
        'apple': ['appl', 'apples', 'aple'],
        'milk': ['millk', 'milks', 'mlik'],
        'bread': ['bred', 'breads', 'loaf'],
        'egg': ['eggs', 'egss'],
        'potato': ['potatos', 'potatoe', 'potatoes'],
        'tomato': ['tomatos', 'tomatoe', 'tomatoes'],
        'cheese': ['chese', 'cheez', 'chees'],
        'chicken': ['chickn', 'checken', 'chiken'],
        'cereal': ['ceereal', 'cereals', 'cerel']
      };
      
      // Normalize the product name to lowercase for matching
      const normalizedName = productName ? productName.toLowerCase().trim() : '';
      
      // Check if this is likely a duplicate with a slightly different spelling
      let correctedName = normalizedName;
      let isDuplicate = false;
      let existingItem = null;
      
      // First check for exact matches or plurals
      existingItem = existingItems.find(item => 
        item.productName.toLowerCase() === normalizedName ||
        item.productName.toLowerCase() + 's' === normalizedName ||
        item.productName.toLowerCase() === normalizedName + 's'
      );
      
      if (existingItem) {
        isDuplicate = true;
      } else {
        // Look for corrections in common items dictionary
        for (const [correct, variations] of Object.entries(commonItemCorrections)) {
          if (normalizedName === correct || variations.includes(normalizedName)) {
            correctedName = correct;
            
            // Check if the corrected name exists in the list
            existingItem = existingItems.find(item => 
              item.productName.toLowerCase() === correctedName ||
              item.productName.toLowerCase().includes(correctedName)
            );
            
            if (existingItem) {
              isDuplicate = true;
            }
            break;
          }
        }
        
        // If no match in dictionary, use fuzzy matching for other items
        if (!isDuplicate) {
          for (const item of existingItems) {
            const itemName = item.productName.toLowerCase();
            
            // Check for contained substrings (e.g., "tomato" and "roma tomato")
            if (itemName.includes(normalizedName) || normalizedName.includes(itemName)) {
              existingItem = item;
              isDuplicate = true;
              break;
            }
            
            // Simple Levenshtein-like check for similar spellings
            // If names are very close to each other
            if (itemName.length > 3 && normalizedName.length > 3) {
              // Check if first 3 chars match and length is similar
              if (itemName.substring(0, 3) === normalizedName.substring(0, 3) && 
                  Math.abs(itemName.length - normalizedName.length) <= 2) {
                existingItem = item;
                isDuplicate = true;
                break;
              }
            }
          }
        }
      }
      
      let result;
      
      if (isDuplicate && existingItem) {
        // Update the quantity of the existing item instead of adding a new one
        const updatedItem = await storage.updateShoppingListItem(existingItem.id, {
          quantity: existingItem.quantity + quantity,
          // Keep the existing unit or update to the new one if specified
          unit: unit || existingItem.unit || 'COUNT'
        });
        
        // Add information about the merge for the client
        result = {
          ...updatedItem,
          merged: true,
          originalName: productName,
          message: `Combined with existing "${existingItem.productName}" item`
        };
      } else {
        // If it's a corrected common item, use the corrected name
        let nameToUse = productName;
        if (correctedName !== normalizedName && Object.keys(commonItemCorrections).includes(correctedName)) {
          // Capitalize first letter of corrected name
          nameToUse = correctedName.charAt(0).toUpperCase() + correctedName.slice(1);
        }
        
        // Add as new item with the specified unit (or default to COUNT)
        const newItem = await storage.addShoppingListItem({
          shoppingListId: targetListId,
          productName: nameToUse,
          quantity,
          unit: unit || 'COUNT'
        });
        
        result = {
          ...newItem,
          merged: false,
          corrected: nameToUse !== productName,
          originalName: productName
        };
      }
      
      res.json(result);
    } catch (error) {
      handleError(res, error);
    }
  });

  app.patch('/api/shopping-list/items/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updatedItem = await storage.updateShoppingListItem(id, req.body);
      res.json(updatedItem);
    } catch (error) {
      handleError(res, error);
    }
  });

  app.delete('/api/shopping-list/items/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteShoppingListItem(id);
      res.json({ success: true });
    } catch (error) {
      handleError(res, error);
    }
  });

  // Deals routes
  app.get('/api/deals', async (req: Request, res: Response) => {
    try {
      const retailerId = req.query.retailerId ? parseInt(req.query.retailerId as string) : undefined;
      const category = req.query.category as string | undefined;
      
      const deals = await storage.getDeals(retailerId, category);
      res.json(deals);
    } catch (error) {
      handleError(res, error);
    }
  });

  app.get('/api/deals/summary', async (req: Request, res: Response) => {
    try {
      const dealsSummary = await storage.getDealsSummary();
      res.json(dealsSummary);
    } catch (error) {
      handleError(res, error);
    }
  });

  app.get('/api/deals/categories', async (req: Request, res: Response) => {
    try {
      const categories = await storage.getDealCategories();
      res.json(categories);
    } catch (error) {
      handleError(res, error);
    }
  });
  
  // Internal Analytics API endpoints
  app.get('/api/internal/analytics/retailers', async (req: Request, res: Response) => {
    try {
      // Sample retailer analytics data
      const retailerAnalytics = [
        {
          id: 1,
          name: "Walmart",
          totalSales: 845000,
          orderCount: 12450,
          averageOrderValue: 67.87,
          topSellingCategories: [
            { name: "Dairy", salesValue: 125000, percentage: 14.8 },
            { name: "Produce", salesValue: 115000, percentage: 13.6 },
            { name: "Meat", salesValue: 98000, percentage: 11.6 },
            { name: "Beverages", salesValue: 92000, percentage: 10.9 },
            { name: "Snacks", salesValue: 76000, percentage: 9.0 }
          ]
        },
        {
          id: 2,
          name: "Target",
          totalSales: 623000,
          orderCount: 8750,
          averageOrderValue: 71.20,
          topSellingCategories: [
            { name: "Household", salesValue: 112000, percentage: 18.0 },
            { name: "Beauty", salesValue: 92000, percentage: 14.8 },
            { name: "Apparel", salesValue: 87000, percentage: 14.0 },
            { name: "Electronics", salesValue: 78000, percentage: 12.5 },
            { name: "Grocery", salesValue: 68000, percentage: 10.9 }
          ]
        },
        {
          id: 3,
          name: "Kroger",
          totalSales: 512000,
          orderCount: 9250,
          averageOrderValue: 55.35,
          topSellingCategories: [
            { name: "Produce", salesValue: 98000, percentage: 19.1 },
            { name: "Dairy", salesValue: 85000, percentage: 16.6 },
            { name: "Meat", salesValue: 76000, percentage: 14.8 },
            { name: "Bakery", salesValue: 63000, percentage: 12.3 },
            { name: "Frozen Foods", salesValue: 58000, percentage: 11.3 }
          ]
        }
      ];
      
      res.json(retailerAnalytics);
    } catch (error) {
      handleError(res, error);
    }
  });
  
  app.get('/api/internal/analytics/products', async (req: Request, res: Response) => {
    try {
      // Sample product analytics data
      const productAnalytics = [
        { 
          id: 101, 
          name: "Organic Milk (1 gal)", 
          category: "Dairy", 
          totalSales: 87500, 
          unitsSold: 17500, 
          averagePrice: 5.00, 
          percentageOfTotalSales: 4.2 
        },
        { 
          id: 102, 
          name: "Bananas", 
          category: "Produce", 
          totalSales: 65000, 
          unitsSold: 43333, 
          averagePrice: 1.50, 
          percentageOfTotalSales: 3.1 
        },
        { 
          id: 103, 
          name: "Whole Grain Bread", 
          category: "Bakery", 
          totalSales: 54000, 
          unitsSold: 13500, 
          averagePrice: 4.00, 
          percentageOfTotalSales: 2.6 
        },
        { 
          id: 104, 
          name: "Ground Beef (1lb)", 
          category: "Meat", 
          totalSales: 98000, 
          unitsSold: 12250, 
          averagePrice: 8.00, 
          percentageOfTotalSales: 4.7 
        },
        { 
          id: 105, 
          name: "Eggs (1 dozen)", 
          category: "Dairy", 
          totalSales: 78000, 
          unitsSold: 19500, 
          averagePrice: 4.00, 
          percentageOfTotalSales: 3.7 
        },
        { 
          id: 106, 
          name: "Chicken Breast (1lb)", 
          category: "Meat", 
          totalSales: 112000, 
          unitsSold: 16000, 
          averagePrice: 7.00, 
          percentageOfTotalSales: 5.4 
        },
        { 
          id: 107, 
          name: "Coffee (Ground, 12oz)", 
          category: "Beverages", 
          totalSales: 98000, 
          unitsSold: 8909, 
          averagePrice: 11.00, 
          percentageOfTotalSales: 4.7 
        }
      ];
      
      res.json(productAnalytics);
    } catch (error) {
      handleError(res, error);
    }
  });
  
  app.get('/api/internal/analytics/customer-segments', async (req: Request, res: Response) => {
    try {
      // Sample customer segment data
      const customerSegments = [
        {
          id: "family-households",
          name: "Family Households",
          percentage: 35,
          averageSpend: 128.50,
          count: 4250,
          topCategories: ["Groceries", "Household", "Snacks", "Beverages", "Baby"]
        },
        {
          id: "single-professionals",
          name: "Single Professionals",
          percentage: 25,
          averageSpend: 82.75,
          count: 3050,
          topCategories: ["Ready Meals", "Produce", "Beverages", "Snacks", "Health"]
        },
        {
          id: "empty-nesters",
          name: "Empty Nesters",
          percentage: 15,
          averageSpend: 95.20,
          count: 1830,
          topCategories: ["Produce", "Meat", "Bakery", "Health", "Dairy"]
        },
        {
          id: "students",
          name: "Students",
          percentage: 12,
          averageSpend: 56.80,
          count: 1465,
          topCategories: ["Snacks", "Frozen", "Beverages", "Pasta", "Canned Goods"]
        },
        {
          id: "retirees",
          name: "Retirees",
          percentage: 13,
          averageSpend: 68.35,
          count: 1585,
          topCategories: ["Health", "Produce", "Dairy", "Bakery", "Meat"]
        }
      ];
      
      res.json(customerSegments);
    } catch (error) {
      handleError(res, error);
    }
  });
  
  app.get('/api/internal/analytics/purchase-patterns', async (req: Request, res: Response) => {
    try {
      // Sample purchase pattern data
      const purchasePatterns = [
        {
          id: "pattern-1",
          name: "Weekend Stock-up",
          description: "Large grocery orders placed Friday-Sunday",
          affectedProducts: ["Meat", "Produce", "Dairy", "Beverages"],
          customerSegments: ["Family Households", "Empty Nesters"],
          statisticalSignificance: 0.92
        },
        {
          id: "pattern-2",
          name: "Meal Prep Monday",
          description: "Bulk ingredient purchases on Mondays",
          affectedProducts: ["Proteins", "Vegetables", "Grains", "Storage Containers"],
          customerSegments: ["Single Professionals", "Students"],
          statisticalSignificance: 0.85
        },
        {
          id: "pattern-3",
          name: "Payday Splurge",
          description: "Premium purchases on 1st and 15th of month",
          affectedProducts: ["Specialty Foods", "Organic Items", "Premium Meats", "Wine & Spirits"],
          customerSegments: ["Single Professionals", "Empty Nesters"],
          statisticalSignificance: 0.78
        },
        {
          id: "pattern-4",
          name: "Monthly Pantry Restock",
          description: "Bulk non-perishable purchases once monthly",
          affectedProducts: ["Canned Goods", "Pasta", "Rice", "Baking Supplies", "Cleaning Products"],
          customerSegments: ["Family Households", "Students"],
          statisticalSignificance: 0.89
        },
        {
          id: "pattern-5",
          name: "Seasonal Produce Shift",
          description: "Changing fruit/vegetable preferences by season",
          affectedProducts: ["Berries", "Stone Fruits", "Root Vegetables", "Leafy Greens"],
          customerSegments: ["All Segments"],
          statisticalSignificance: 0.95
        }
      ];
      
      res.json(purchasePatterns);
    } catch (error) {
      handleError(res, error);
    }
  });
  
  // Weekly circulars routes
  app.get('/api/circulars', async (req: Request, res: Response) => {
    try {
      const retailerId = req.query.retailerId ? parseInt(req.query.retailerId as string) : undefined;
      const circulars = await storage.getWeeklyCirculars(retailerId);
      res.json(circulars);
    } catch (error) {
      handleError(res, error);
    }
  });
  
  app.get('/api/circulars/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const circular = await storage.getWeeklyCircular(id);
      
      if (!circular) {
        return res.status(404).json({ message: 'Circular not found' });
      }
      
      res.json(circular);
    } catch (error) {
      handleError(res, error);
    }
  });
  
  app.get('/api/circulars/:id/deals', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const deals = await storage.getDealsFromCircular(id);
      res.json(deals);
    } catch (error) {
      handleError(res, error);
    }
  });

  // Analysis routes
  app.post('/api/analyze/patterns', async (req: Request, res: Response) => {
    try {
      const { purchaseHistory } = req.body;
      // This would use an ML service in a real app
      // For now, return simple frequency analysis
      const patterns = purchaseHistory.reduce((acc: any, purchase: any) => {
        purchase.items.forEach((item: any) => {
          if (!acc[item.productName]) {
            acc[item.productName] = {
              count: 0,
              totalSpent: 0,
              purchaseDates: []
            };
          }
          acc[item.productName].count += 1;
          acc[item.productName].totalSpent += item.totalPrice;
          acc[item.productName].purchaseDates.push(purchase.purchaseDate);
        });
        return acc;
      }, {});
      
      res.json(patterns);
    } catch (error) {
      handleError(res, error);
    }
  });
  
  // OCR endpoint for extracting shopping list from images
  app.post('/api/ocr/extract-list', async (req: Request, res: Response) => {
    try {
      const { image } = req.body;
      
      if (!image) {
        return res.status(400).json({ error: 'No image provided' });
      }

      // In a real implementation, you would use an OCR service like:
      // - Google Cloud Vision API
      // - Azure Computer Vision
      // - AWS Textract
      // - OpenAI Vision API
      
      // For demo purposes, we'll simulate OCR extraction
      // In production, replace this with actual OCR service call
      
      // Simulated OCR response - in reality this would be the extracted text
      const simulatedExtractedText = `
        Milk
        Bread
        Eggs
        Apples
        Chicken breast
        Rice
        Pasta
        Tomatoes
        Onions
        Cheese
      `;
      
      // Parse the extracted text into shopping list items
      const items = simulatedExtractedText
        .split('\n')
        .map(item => item.trim())
        .filter(item => item.length > 0)
        .filter(item => !item.match(/^\d+\.?\s*$/)); // Remove just numbers
      
      res.json({ 
        items,
        extractedText: simulatedExtractedText.trim(),
        confidence: 0.95 
      });
      
    } catch (error) {
      console.error('OCR extraction error:', error);
      res.status(500).json({ error: 'Failed to extract text from image' });
    }
  });

  // Upload shopping list endpoint
  app.post('/api/shopping-lists/upload', async (req: Request, res: Response) => {
    try {
      const { shoppingListId, items, source } = req.body;
      const listId = shoppingListId || 1;
      
      if (!items || !Array.isArray(items)) {
        return res.status(400).json({ error: 'Invalid items data' });
      }

      // Add each item to the shopping list
      const addedItems = [];
      for (const item of items) {
        const newItem = await storage.addShoppingListItem(listId, {
          productName: item.productName,
          quantity: item.quantity || 1,
          unit: item.unit || 'COUNT'
        });
        addedItems.push(newItem);
      }

      res.json({ 
        message: 'Shopping list uploaded successfully',
        itemsAdded: addedItems.length,
        items: addedItems,
        source
      });
      
    } catch (error) {
      console.error('Upload shopping list error:', error);
      res.status(500).json({ error: 'Failed to upload shopping list' });
    }
  });

  // Generate single store optimization plan
  app.post('/api/shopping-lists/optimize/single-store', async (req: Request, res: Response) => {
    try {
      const { shoppingListId } = req.body;
      const listId = shoppingListId || 1;
      
      const items = await storage.getShoppingListItems(listId);
      if (!items.length) {
        return res.json({ store: null, items: [], totalCost: 0, availabilityRate: 0 });
      }
      
      const retailers = await storage.getRetailers();
      
      // Find the best single store with at least 80% item availability
      let bestStore = null;
      let bestCost = Number.MAX_SAFE_INTEGER;
      let bestAvailability = 0;
      
      for (const retailer of retailers) {
        // Simulate item availability and pricing for each retailer
        let availableItems = 0;
        let totalCost = 0;
        const storeItems = [];
        
        for (const item of items) {
          // Simulate availability (85-95% chance per item for demo)
          const isAvailable = Math.random() > 0.1;
          
          if (isAvailable) {
            availableItems++;
            // Generate realistic pricing per retailer
            const basePrice = 200 + Math.floor(Math.random() * 600); // $2-$8 range
            const retailerMultiplier = 
              retailer.id === 1 ? 0.9 : // Walmart - cheaper
              retailer.id === 2 ? 1.1 : // Target - slightly more expensive  
              retailer.id === 3 ? 0.95 : // Kroger - competitive
              1.0; // Others
            
            const price = Math.round(basePrice * retailerMultiplier);
            totalCost += price * item.quantity;
            
            storeItems.push({
              id: item.id,
              productName: item.productName,
              quantity: item.quantity,
              unit: item.unit,
              price,
              isAvailable: true
            });
          } else {
            storeItems.push({
              id: item.id,
              productName: item.productName,
              quantity: item.quantity,
              unit: item.unit,
              price: 0,
              isAvailable: false
            });
          }
        }
        
        const availabilityRate = availableItems / items.length;
        
        // Only consider stores with at least 80% availability
        if (availabilityRate >= 0.8 && totalCost < bestCost) {
          bestCost = totalCost;
          bestStore = {
            retailerId: retailer.id,
            retailerName: retailer.name,
            items: storeItems,
            totalCost,
            availabilityRate,
            availableItems,
            totalItems: items.length
          };
          bestAvailability = availabilityRate;
        }
      }
      
      res.json(bestStore || { store: null, items: [], totalCost: 0, availabilityRate: 0 });
    } catch (error) {
      handleError(res, error);
    }
  });
  
  // Generate best value multi-store optimization plan
  app.post('/api/shopping-lists/optimize/best-value', async (req: Request, res: Response) => {
    try {
      const { shoppingListId } = req.body;
      const listId = shoppingListId || 1;
      
      const items = await storage.getShoppingListItems(listId);
      if (!items.length) {
        return res.json({ stores: [], totalCost: 0, totalSavings: 0 });
      }
      
      const retailers = await storage.getRetailers();
      
      // Find the best price for each item across all stores
      const optimizedPlan = { stores: {}, totalCost: 0, itemAssignments: {} };
      
      for (const item of items) {
        let bestPrice = Number.MAX_SAFE_INTEGER;
        let bestRetailer = null;
        
        for (const retailer of retailers) {
          // Generate pricing for this item at this retailer
          const basePrice = 200 + Math.floor(Math.random() * 600);
          const retailerMultiplier = 
            retailer.id === 1 ? 0.85 : // Walmart - cheapest for most items
            retailer.id === 2 ? 1.15 : // Target - premium pricing
            retailer.id === 3 ? 0.90 : // Kroger - competitive
            1.0;
          
          const price = Math.round(basePrice * retailerMultiplier);
          
          if (price < bestPrice) {
            bestPrice = price;
            bestRetailer = retailer;
          }
        }
        
        if (bestRetailer) {
          if (!optimizedPlan.stores[bestRetailer.id]) {
            optimizedPlan.stores[bestRetailer.id] = {
              retailerId: bestRetailer.id,
              retailerName: bestRetailer.name,
              items: [],
              subtotal: 0
            };
          }
          
          const itemCost = bestPrice * item.quantity;
          optimizedPlan.stores[bestRetailer.id].items.push({
            id: item.id,
            productName: item.productName,
            quantity: item.quantity,
            unit: item.unit,
            price: bestPrice,
            totalPrice: itemCost
          });
          
          optimizedPlan.stores[bestRetailer.id].subtotal += itemCost;
          optimizedPlan.totalCost += itemCost;
          optimizedPlan.itemAssignments[item.id] = bestRetailer.id;
        }
      }
      
      // Calculate savings compared to single most expensive store
      const singleStoreCosts = retailers.map(retailer => {
        let cost = 0;
        items.forEach(item => {
          const basePrice = 200 + Math.floor(Math.random() * 600);
          const multiplier = 
            retailer.id === 1 ? 0.85 :
            retailer.id === 2 ? 1.15 :
            retailer.id === 3 ? 0.90 : 1.0;
          cost += Math.round(basePrice * multiplier) * item.quantity;
        });
        return cost;
      });
      
      const mostExpensiveCost = Math.max(...singleStoreCosts);
      const totalSavings = mostExpensiveCost - optimizedPlan.totalCost;
      
      res.json({
        stores: Object.values(optimizedPlan.stores),
        totalCost: optimizedPlan.totalCost,
        totalSavings,
        savingsPercentage: Math.round((totalSavings / mostExpensiveCost) * 100)
      });
    } catch (error) {
      handleError(res, error);
    }
  });
  
  // Generate balanced optimization plan
  app.post('/api/shopping-lists/optimize/balanced', async (req: Request, res: Response) => {
    try {
      const { shoppingListId } = req.body;
      const listId = shoppingListId || 1;
      
      const items = await storage.getShoppingListItems(listId);
      if (!items.length) {
        return res.json({ stores: [], totalCost: 0, estimatedTime: 0 });
      }
      
      const retailers = await storage.getRetailers();
      
      // Balanced approach: limit to 2-3 stores, optimize for reasonable prices and convenience
      const balancedPlan = { stores: {}, totalCost: 0, storeCount: 0 };
      const maxStores = Math.min(3, retailers.length);
      
      // Select top stores based on a balance of price and convenience
      const storeScores = retailers.map(retailer => {
        let avgPrice = 0;
        let availabilityScore = 0;
        
        items.forEach(item => {
          const basePrice = 200 + Math.floor(Math.random() * 600);
          const multiplier = 
            retailer.id === 1 ? 0.90 : // Walmart - good balance
            retailer.id === 2 ? 1.05 : // Target - slightly higher but convenient
            retailer.id === 3 ? 0.95 : // Kroger - competitive
            1.0;
          
          avgPrice += Math.round(basePrice * multiplier);
          availabilityScore += 0.9; // 90% availability assumption
        });
        
        avgPrice /= items.length;
        availabilityScore /= items.length;
        
        // Convenience factor (proximity, store hours, etc.)
        const convenienceScore = 
          retailer.id === 2 ? 0.9 : // Target - convenient locations
          retailer.id === 1 ? 0.85 : // Walmart - good but can be crowded
          retailer.id === 3 ? 0.8 : // Kroger - decent
          0.7;
        
        // Balanced score: 40% price, 30% availability, 30% convenience
        const normalizedPrice = 1 - (avgPrice - 200) / 600; // Normalize to 0-1
        const score = (normalizedPrice * 0.4) + (availabilityScore * 0.3) + (convenienceScore * 0.3);
        
        return { retailer, score, avgPrice };
      });
      
      // Sort by balanced score and take top 2-3 stores
      storeScores.sort((a, b) => b.score - a.score);
      const selectedStores = storeScores.slice(0, maxStores);
      
      // Distribute items across selected stores
      const storeItemCounts = {};
      selectedStores.forEach(store => {
        storeItemCounts[store.retailer.id] = 0;
        balancedPlan.stores[store.retailer.id] = {
          retailerId: store.retailer.id,
          retailerName: store.retailer.name,
          items: [],
          subtotal: 0
        };
      });
      
      // Assign items to stores in a balanced way
      items.forEach((item, index) => {
        // Round-robin assignment with price consideration
        const storeIndex = index % selectedStores.length;
        const selectedStore = selectedStores[storeIndex];
        
        const basePrice = 200 + Math.floor(Math.random() * 600);
        const multiplier = 
          selectedStore.retailer.id === 1 ? 0.90 :
          selectedStore.retailer.id === 2 ? 1.05 :
          selectedStore.retailer.id === 3 ? 0.95 : 1.0;
        
        const price = Math.round(basePrice * multiplier);
        const itemCost = price * item.quantity;
        
        balancedPlan.stores[selectedStore.retailer.id].items.push({
          id: item.id,
          productName: item.productName,
          quantity: item.quantity,
          unit: item.unit,
          price,
          totalPrice: itemCost
        });
        
        balancedPlan.stores[selectedStore.retailer.id].subtotal += itemCost;
        balancedPlan.totalCost += itemCost;
        storeItemCounts[selectedStore.retailer.id]++;
      });
      
      // Estimate shopping time (15 min per store + 5 min per item group)
      const estimatedTime = (Object.keys(balancedPlan.stores).length * 15) + 
                           (items.length * 2); // 2 min per item average
      
      res.json({
        stores: Object.values(balancedPlan.stores),
        totalCost: balancedPlan.totalCost,
        estimatedTime,
        storeCount: Object.keys(balancedPlan.stores).length
      });
    } catch (error) {
      handleError(res, error);
    }
  });

  // Calculate shopping list costs by retailer
  app.post('/api/shopping-lists/costs', async (req: Request, res: Response) => {
    try {
      const { shoppingListId } = req.body;
      const listId = shoppingListId || 1; // Default to first list if not specified
      
      // Get shopping list
      const list = await storage.getShoppingList(listId);
      if (!list) {
        return res.status(404).json({ message: 'Shopping list not found' });
      }
      
      // Get items in the list
      const items = await storage.getShoppingListItems(listId);
      if (!items.length) {
        return res.json({ retailers: [], itemsByRetailer: {} });
      }
      
      // Get all retailers
      const retailers = await storage.getRetailers();
      
      // Get all deals to check prices at different retailers
      const allDeals = await storage.getDeals();
      
      // Calculate cost at each retailer
      const retailerCosts = retailers.map(retailer => {
        const itemsAtRetailer = items.map(item => {
          // Find best price for this item at this retailer
          const deal = allDeals.find(d => 
            d.retailerId === retailer.id && 
            d.productName.toLowerCase() === item.productName.toLowerCase()
          );
          
          // Check for bulk deals
          const bulkDeal = {
            hasBulkDeal: Math.random() > 0.7, // 30% chance of having a bulk deal for demo
            quantity: Math.floor(Math.random() * 3) + 2, // Random bulk quantity between 2-4
            bulkPrice: Math.floor(Math.random() * 500) + 200, // Random bulk price
            regularUnitPrice: Math.floor(Math.random() * 200) + 100, // Regular price per unit
          };
          
          // Calculate potential savings from the bulk deal
          const bulkSavings = bulkDeal.hasBulkDeal ? 
            (bulkDeal.regularUnitPrice * bulkDeal.quantity) - bulkDeal.bulkPrice : 0;
          
          // Use deal price if available, otherwise use a baseline price (random for demo)
          const itemPrice = deal ? deal.salePrice : Math.floor(Math.random() * 800) + 200; // Random price between $2-$10
          
          return {
            id: item.id,
            productName: item.productName,
            quantity: item.quantity,
            price: itemPrice,
            totalPrice: itemPrice * item.quantity,
            hasDeal: !!deal,
            bulkDeal: bulkDeal.hasBulkDeal ? {
              quantity: bulkDeal.quantity,
              bulkPrice: bulkDeal.bulkPrice,
              regularUnitPrice: bulkDeal.regularUnitPrice,
              savings: bulkSavings,
              recommendation: item.quantity < bulkDeal.quantity ? 
                `Add ${bulkDeal.quantity - item.quantity} more for savings of $${(bulkSavings/100).toFixed(2)}` : 
                `Bulk deal: ${bulkDeal.quantity} for $${(bulkDeal.bulkPrice/100).toFixed(2)}`
            } : null
          };
        });
        
        // Calculate total cost at this retailer
        const totalCost = itemsAtRetailer.reduce((sum, item) => sum + item.totalPrice, 0);
        
        // Generate minimum purchase incentives (for demo purposes)
        // Categories with spending thresholds for special offers
        const categories = [
          { name: "Produce", threshold: 2000, reward: 500 },
          { name: "Dairy", threshold: 1500, reward: 300 },
          { name: "Household", threshold: 5000, reward: 1000 },
          { name: "Cleaning", threshold: 3000, reward: 700 }
        ];
        
        // Randomly assign categories to items
        const categorySpending = {};
        itemsAtRetailer.forEach(item => {
          const randomIndex = Math.floor(Math.random() * categories.length);
          const category = categories[randomIndex].name;
          if (!categorySpending[category]) {
            categorySpending[category] = 0;
          }
          categorySpending[category] += item.totalPrice;
        });
        
        // Find categories that are close to minimum spending thresholds
        const incentives = categories.map(category => {
          const spent = categorySpending[category.name] || 0;
          const remaining = category.threshold - spent;
          
          if (remaining > 0 && remaining < category.threshold * 0.25) { // Within 25% of threshold
            return {
              category: category.name,
              spent,
              threshold: category.threshold,
              remaining,
              reward: category.reward,
              message: `Add $${(remaining/100).toFixed(2)} more in ${category.name} to get $${(category.reward/100).toFixed(2)} off`
            };
          }
          return null;
        }).filter(incentive => incentive !== null);
        
        return {
          retailerId: retailer.id,
          retailerName: retailer.name,
          totalCost,
          savings: Math.floor(Math.random() * 1500), // Demo savings amount
          items: itemsAtRetailer,
          missingItems: [], // In a real implementation, this would show items not available at this retailer
          incentives: incentives
        };
      });
      
      // Sort retailers by total cost
      retailerCosts.sort((a, b) => a.totalCost - b.totalCost);
      
      // Calculate multi-store optimization (for demo purposes)
      const multiStoreOptimization = {
        totalCost: 0,
        totalSavings: 0,
        retailers: [],
        itemsByRetailer: {}
      };
      
      // Find best price for each item across all retailers
      items.forEach(item => {
        let bestPrice = Number.MAX_VALUE;
        let bestRetailer = null;
        
        retailers.forEach(retailer => {
          // Find deal for this item at this retailer
          const deal = allDeals.find(d => 
            d.retailerId === retailer.id && 
            d.productName.toLowerCase() === item.productName.toLowerCase()
          );
          
          // Calculate price
          const price = deal ? deal.salePrice : Math.floor(Math.random() * 800) + 200;
          
          if (price < bestPrice) {
            bestPrice = price;
            bestRetailer = retailer;
          }
        });
        
        if (bestRetailer) {
          // Add retailer to list if not already added
          if (!multiStoreOptimization.retailers.includes(bestRetailer.id)) {
            multiStoreOptimization.retailers.push(bestRetailer.id);
            multiStoreOptimization.itemsByRetailer[bestRetailer.id] = {
              retailerName: bestRetailer.name,
              items: [],
              subtotal: 0
            };
          }
          
          // Add item to this retailer's list
          const totalPrice = bestPrice * item.quantity;
          multiStoreOptimization.itemsByRetailer[bestRetailer.id].items.push({
            id: item.id,
            productName: item.productName,
            quantity: item.quantity,
            price: bestPrice,
            totalPrice
          });
          
          // Update retailer subtotal
          multiStoreOptimization.itemsByRetailer[bestRetailer.id].subtotal += totalPrice;
          
          // Update total cost
          multiStoreOptimization.totalCost += totalPrice;
        }
      });
      
      // Calculate savings compared to most expensive retailer
      const mostExpensiveRetailer = retailerCosts[retailerCosts.length - 1];
      multiStoreOptimization.totalSavings = mostExpensiveRetailer.totalCost - multiStoreOptimization.totalCost;
      
      res.json({
        singleStore: retailerCosts,
        multiStore: multiStoreOptimization
      });
    } catch (error) {
      handleError(res, error);
    }
  });
  
  // Get optimized shopping route
  app.post('/api/shopping-route', async (req: Request, res: Response) => {
    try {
      const { retailerIds, userLocation } = req.body;
      
      if (!retailerIds || !retailerIds.length) {
        return res.status(400).json({ message: 'At least one retailer ID is required' });
      }
      
      // Get retailers
      const retailers = await storage.getRetailers();
      const selectedRetailers = retailers.filter(r => retailerIds.includes(r.id));
      
      if (selectedRetailers.length === 0) {
        return res.status(404).json({ message: 'No matching retailers found' });
      }
      
      // For demo purposes, generate mock coordinates near the user location
      const userCoords = userLocation || { lat: 37.7749, lng: -122.4194 }; // Default to San Francisco
      
      // Generate retailer locations (in a real app, these would come from the database)
      const retailersWithLocations = selectedRetailers.map((retailer, index) => {
        // Generate locations in a radius around user's location
        const angle = (index / selectedRetailers.length) * 2 * Math.PI;
        const radius = 0.01 + (Math.random() * 0.02); // 1-3km roughly
        
        return {
          id: retailer.id,
          name: retailer.name,
          location: {
            lat: userCoords.lat + (radius * Math.cos(angle)),
            lng: userCoords.lng + (radius * Math.sin(angle))
          },
          address: `${100 + index} Main St, San Francisco, CA 94105`,
          distance: (radius * 111).toFixed(1) + 'km', // Convert to approximate kilometers
          estimatedTime: Math.round(radius * 111 * 2) + ' min' // Very rough estimate
        };
      });
      
      // Calculate a simple route (for a real app, use a routing API)
      const route = {
        totalDistance: retailersWithLocations.reduce((sum, r) => sum + parseFloat(r.distance), 0),
        totalTime: retailersWithLocations.reduce((sum, r) => sum + parseInt(r.estimatedTime), 0),
        waypoints: [
          {
            name: 'Your Location',
            location: userCoords,
            address: 'Current Location'
          },
          ...retailersWithLocations.map(r => ({
            name: r.name,
            location: r.location,
            address: r.address
          }))
        ]
      };
      
      res.json({
        retailers: retailersWithLocations,
        route: route
      });
    } catch (error) {
      handleError(res, error);
    }
  });

  // Purchase Anomalies routes
  // Get all purchase anomalies
  app.get('/api/anomalies', async (req: Request, res: Response) => {
    try {
      const anomalies = await storage.getPurchaseAnomalies();
      res.json(anomalies);
    } catch (error) {
      handleError(res, error);
    }
  });

  // Get a specific anomaly by ID
  app.get('/api/anomalies/:id', async (req: Request, res: Response) => {
    try {
      const anomalyId = parseInt(req.params.id);
      const anomaly = await storage.getPurchaseAnomaly(anomalyId);
      if (!anomaly) {
        return res.status(404).json({ message: 'Purchase anomaly not found' });
      }
      res.json(anomaly);
    } catch (error) {
      handleError(res, error);
    }
  });

  // Create a new anomaly
  app.post('/api/anomalies', async (req: Request, res: Response) => {
    try {
      // For demo, hardcode userId to 1 (default user)
      const userId = 1;
      const anomalyData = { ...req.body, userId };
      const anomaly = await storage.createPurchaseAnomaly(anomalyData);
      res.status(201).json(anomaly);
    } catch (error) {
      handleError(res, error);
    }
  });

  // Update an anomaly
  app.patch('/api/anomalies/:id', async (req: Request, res: Response) => {
    try {
      const anomalyId = parseInt(req.params.id);
      const updates = req.body;
      const updatedAnomaly = await storage.updatePurchaseAnomaly(anomalyId, updates);
      res.json(updatedAnomaly);
    } catch (error) {
      handleError(res, error);
    }
  });

  // Delete an anomaly
  app.delete('/api/anomalies/:id', async (req: Request, res: Response) => {
    try {
      const anomalyId = parseInt(req.params.id);
      await storage.deletePurchaseAnomaly(anomalyId);
      res.status(204).send();
    } catch (error) {
      handleError(res, error);
    }
  });

  // Retailer API Integration Routes
  
  // Search for products at a specific retailer
  app.get('/api/retailers/:retailerId/products/search', async (req: Request, res: Response) => {
    try {
      const retailerId = parseInt(req.params.retailerId);
      const query = req.query.query as string;
      
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }
      
      // Get the retailer API client
      const retailerAPI = await getRetailerAPI(retailerId);
      
      // Search for products
      const products = await retailerAPI.searchProducts(query);
      
      res.json(products);
    } catch (error) {
      handleError(res, error);
    }
  });
  
  // Get product price from a specific retailer
  app.get('/api/retailers/:retailerId/products/price', async (req: Request, res: Response) => {
    try {
      const retailerId = parseInt(req.params.retailerId);
      const productName = req.query.productName as string;
      
      if (!productName) {
        return res.status(400).json({ message: "Product name is required" });
      }
      
      // Get the retailer API client
      const retailerAPI = await getRetailerAPI(retailerId);
      
      // Get product price
      const price = await retailerAPI.getProductPrice(productName);
      
      if (price === null) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.json({ price });
    } catch (error) {
      handleError(res, error);
    }
  });
  
  // Submit an order to a retailer
  app.post('/api/retailers/:retailerId/orders', async (req: Request, res: Response) => {
    try {
      const retailerId = parseInt(req.params.retailerId);
      const { items, mode, customerInfo, shoppingListId } = req.body;
      
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Order items are required" });
      }
      
      if (!mode || (mode !== 'pickup' && mode !== 'delivery')) {
        return res.status(400).json({ message: "Valid fulfillment mode (pickup or delivery) is required" });
      }
      
      if (!customerInfo) {
        return res.status(400).json({ message: "Customer information is required" });
      }
      
      // Get the retailer API client
      const retailerAPI = await getRetailerAPI(retailerId);
      
      // Submit the order
      const orderResponse = await retailerAPI.submitOrder(items, mode, customerInfo);
      
      // If the order was successful and a shopping list ID was provided, mark items as completed
      if (shoppingListId && orderResponse.orderId) {
        const listItems = await storage.getShoppingListItems(shoppingListId);
        const itemIds = listItems
          .filter(item => items.some((orderItem: any) => 
            orderItem.productName.toLowerCase() === item.productName.toLowerCase()
          ))
          .map(item => item.id);
        
        // Mark items as completed
        for (const itemId of itemIds) {
          await storage.updateShoppingListItem(itemId, { isCompleted: true });
        }
      }
      
      res.json(orderResponse);
    } catch (error) {
      handleError(res, error);
    }
  });
  
  // Add route to compare shopping list costs across retailers
  app.post('/api/shopping-lists/costs', async (req: Request, res: Response) => {
    try {
      const { shoppingListId } = req.body;
      
      if (!shoppingListId) {
        return res.status(400).json({ message: 'Shopping list ID is required' });
      }
      
      // Get shopping list items
      const items = await storage.getShoppingListItems(shoppingListId);
      
      if (!items || items.length === 0) {
        return res.status(404).json({ message: 'Shopping list has no items' });
      }
      
      // Get retailers to compare prices
      const retailers = await storage.getRetailers();
      
      // In a real app, we would fetch actual prices from retailer APIs
      // For demo purposes, we'll generate slightly varying prices for each retailer
      
      // Generate multi-store optimization (best price for each item)
      const multiStoreRetailers: any[] = [];
      let multiStoreTotalCost = 0;
      
      // Assign each item to the best retailer
      retailers.forEach(retailer => {
        const retailerItems: any[] = [];
        let subtotal = 0;
        
        items.forEach(item => {
          // Generate a price for this item at this retailer (in cents)
          // Base price varies by retailer with some randomness
          const basePrice = 
            retailer.id === 1 ? 350 + Math.floor(Math.random() * 100) : // Walmart
            retailer.id === 2 ? 380 + Math.floor(Math.random() * 100) : // Target
            retailer.id === 3 ? 330 + Math.floor(Math.random() * 150) : // Kroger
            400 + Math.floor(Math.random() * 100); // Other retailers
            
          const quantity = item.quantity || 1;
          const price = basePrice * quantity;
          
          // Add this item to the retailer's list only if it's the best price
          // (we'll compare later)
          retailerItems.push({
            id: item.id,
            productName: item.productName,
            quantity,
            price,
            unit: item.unit || 'COUNT'
          });
          
          subtotal += price;
        });
        
        // Add this retailer to our multi-store comparison
        multiStoreRetailers.push({
          retailerId: retailer.id,
          retailerName: retailer.name,
          items: retailerItems,
          subtotal
        });
      });
      
      // Now optimize to find best price for each item
      const optimizedRetailers: any[] = [];
      const itemAssignments: Record<number, { retailerId: number, retailerName: string, price: number }> = {};
      
      // Find best price for each item
      items.forEach(item => {
        let bestPrice = Number.MAX_SAFE_INTEGER;
        let bestRetailer = null;
        
        multiStoreRetailers.forEach(retailer => {
          const retailerItem = retailer.items.find((ri: any) => ri.id === item.id);
          if (retailerItem && retailerItem.price < bestPrice) {
            bestPrice = retailerItem.price;
            bestRetailer = {
              retailerId: retailer.retailerId,
              retailerName: retailer.retailerName
            };
          }
        });
        
        if (bestRetailer) {
          itemAssignments[item.id] = {
            retailerId: bestRetailer.retailerId,
            retailerName: bestRetailer.retailerName,
            price: bestPrice
          };
          multiStoreTotalCost += bestPrice;
        }
      });
      
      // Group items by retailer
      const retailerGroups: Record<number, { retailerId: number, retailerName: string, items: any[], subtotal: number }> = {};
      
      Object.entries(itemAssignments).forEach(([itemId, assignment]) => {
        const item = items.find(i => i.id === parseInt(itemId));
        if (!item) return;
        
        if (!retailerGroups[assignment.retailerId]) {
          retailerGroups[assignment.retailerId] = {
            retailerId: assignment.retailerId,
            retailerName: assignment.retailerName,
            items: [],
            subtotal: 0
          };
        }
        
        retailerGroups[assignment.retailerId].items.push({
          id: item.id,
          productName: item.productName,
          quantity: item.quantity || 1,
          price: assignment.price,
          unit: item.unit || 'COUNT'
        });
        
        retailerGroups[assignment.retailerId].subtotal += assignment.price;
      });
      
      // Convert to array and sort by total price
      const optimizedRetailersArray = Object.values(retailerGroups)
        .sort((a, b) => a.subtotal - b.subtotal);
      
      // Calculate single-store totals for comparison
      const singleStoreOptions = multiStoreRetailers
        .map(retailer => ({
          retailerId: retailer.retailerId,
          retailerName: retailer.retailerName,
          totalCost: retailer.subtotal,
          items: retailer.items,
          bulkDeals: Math.random() > 0.7 ? [
            {
              productName: retailer.items[0].productName,
              quantity: 3,
              savings: Math.floor(retailer.items[0].price * 0.15)
            }
          ] : []
        }))
        .sort((a, b) => a.totalCost - b.totalCost);
      
      // Calculate savings by using multiple stores versus the best single store
      const bestSingleStore = singleStoreOptions[0];
      const multiStoreSavings = bestSingleStore.totalCost - multiStoreTotalCost;
      
      res.json({
        multiStore: {
          totalCost: multiStoreTotalCost,
          savings: multiStoreSavings,
          retailers: optimizedRetailersArray
        },
        singleStore: singleStoreOptions
      });
    } catch (error) {
      handleError(res, error);
    }
  });
  
  // Get retailer integration status (API, auth, etc.)
  app.get('/api/retailers/:retailerId/integration-status', async (req: Request, res: Response) => {
    try {
      const retailerId = parseInt(req.params.retailerId);
      
      // Get the retailer from the database
      const retailer = await storage.getRetailer(retailerId);
      
      if (!retailer) {
        return res.status(404).json({ message: "Retailer not found" });
      }
      
      // Check if the retailer has the necessary API configuration
      const hasApiEndpoint = !!retailer.apiEndpoint;
      const hasApiKey = !!retailer.apiKey;
      const supportsOnlineOrdering = !!retailer.supportsOnlineOrdering;
      
      res.json({
        retailerId: retailer.id,
        retailerName: retailer.name,
        integration: {
          hasApiEndpoint,
          hasApiKey,
          supportsOnlineOrdering,
          supportsPickup: retailer.supportsPickup,
          supportsDelivery: retailer.supportsDelivery,
          requiresAuthentication: retailer.requiresAuthentication,
          authType: retailer.authType,
          status: hasApiEndpoint && hasApiKey ? 'ready' : 'not_configured'
        }
      });
    } catch (error) {
      handleError(res, error);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
