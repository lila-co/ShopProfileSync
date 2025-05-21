import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ZodError } from "zod";
import { parseReceiptImage } from "./services/receiptParser";
import { generateRecommendations, analyzePurchasePatterns } from "./services/recommendationEngine";
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
      const updatedUser = await storage.updateUser(req.body);
      res.json(updatedUser);
    } catch (error) {
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
      res.json(lists);
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

      // Get purchase history to determine typical purchases
      const purchases = await storage.getPurchases();
      
      // Create a new shopping list
      const newList = await storage.createShoppingList({
        userId,
        name: "Today's Shopping List",
        isDefault: false
      });

      // Analyze purchases to find typical items
      const patterns = analyzePurchasePatterns(purchases);
      const typicalItems = patterns
        .filter(pattern => pattern.purchases.length >= 2)
        .map(pattern => ({
          productName: pattern.productName,
          quantity: Math.round(pattern.totalQuantity / pattern.purchases.length) // Average quantity
        }))
        .slice(0, 10); // Limit to 10 items

      // Add items to the shopping list
      for (const item of typicalItems) {
        await storage.addShoppingListItem({
          shoppingListId: newList.id,
          productName: item.productName,
          quantity: item.quantity
        });
      }

      // Get the complete list with items
      const completeList = await storage.getShoppingList(newList.id);
      res.json(completeList);
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

      // Generate personalized suggestions based on user profile
      const suggestions = await generatePersonalizedSuggestions(user);
      res.json(suggestions);
    } catch (error) {
      handleError(res, error);
    }
  });

  app.post('/api/shopping-list/items', async (req: Request, res: Response) => {
    try {
      const newItem = await storage.addShoppingListItem(req.body);
      res.json(newItem);
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

  const httpServer = createServer(app);
  return httpServer;
}
