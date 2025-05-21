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
      const { productName, quantity, shoppingListId } = req.body;
      
      if (!shoppingListId) {
        return res.status(400).json({ message: 'Shopping list ID is required' });
      }
      
      // Get existing items to check for duplicates
      const existingItems = await storage.getShoppingListItems(shoppingListId);
      
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
      const normalizedName = productName.toLowerCase().trim();
      
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
          quantity: existingItem.quantity + quantity
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
        
        // Add as new item
        const newItem = await storage.addShoppingListItem({
          shoppingListId,
          productName: nameToUse,
          quantity
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

  const httpServer = createServer(app);
  return httpServer;
}
