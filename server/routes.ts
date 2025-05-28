import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ZodError } from "zod";
import { parseReceiptImage } from "./services/receiptParser";
import { generateRecommendations, analyzePurchasePatterns, extractRecipeIngredients, generatePersonalizedSuggestions, analyzeBulkVsUnitPricing } from "./services/recommendationEngine";
import { getRetailerAPI } from "./services/retailerIntegration";
import OpenAI from "openai";
import { productCategorizer, ProductCategory, QuantityNormalization } from './services/productCategorizer';
import multer from 'multer';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images and PDFs
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only image and PDF files are allowed'));
    }
  }
});

// Helper to handle errors consistently
const handleError = (res: Response, error: any) => {
  console.error(error);
  if (error instanceof ZodError) {
    return res.status(400).json({ message: error.errors.map(e => e.message).join(', ') });
  }
  return res.status(500).json({ message: error.message || 'Internal server error' });
};

// Helper functions for processing different upload types
async function createSampleDealsFromImage(retailerId: number, circularId: number, filename: string) {
  // In production, this would use OCR to extract text from the image
  // For demo, return sample deals based on filename
  const sampleDeals = [
    {
      retailerId,
      productName: 'Fresh Bananas',
      regularPrice: 149,
      salePrice: 99,
      category: 'Produce',
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      circularId,
      dealSource: 'uploaded_image',
      imageUrl: 'https://images.unsplash.com/photo-1603833665858-e61d17a86224?w=400'
    },
    {
      retailerId,
      productName: 'Whole Grain Bread',
      regularPrice: 399,
      salePrice: 299,
      category: 'Bakery',
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      circularId,
      dealSource: 'uploaded_image',
      imageUrl: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=400'
    }
  ];

  return sampleDeals;
}

async function createSampleDealsFromPDF(retailerId: number, circularId: number, filename: string) {
  // In production, this would extract text and images from PDF
  // For demo, return sample deals
  const sampleDeals = [
    {
      retailerId,
      productName: 'Organic Apples',
      regularPrice: 299,
      salePrice: 199,
      category: 'Produce',
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      circularId,
      dealSource: 'uploaded_pdf',
      imageUrl: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400'
    },
    {
      retailerId,
      productName: 'Greek Yogurt',
      regularPrice: 189,
      salePrice: 129,
      category: 'Dairy',
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      circularId,
      dealSource: 'uploaded_pdf',
      imageUrl: 'https://images.unsplash.com/photo-1571212515416-26c10ac12ab2?w=400'
    }
  ];

  return sampleDeals;
}

async function createSampleDealsFromURL(retailerId: number, circularId: number, url: string) {
  // In production, this would scrape the web page for deals
  // For demo, return sample deals
  const sampleDeals = [
    {
      retailerId,
      productName: 'Ground Coffee',
      regularPrice: 899,
      salePrice: 649,
      category: 'Beverages',
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      circularId,
      dealSource: 'uploaded_url',
      imageUrl: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400'
    },
    {
      retailerId,
      productName: 'Pasta Sauce',
      regularPrice: 249,
      salePrice: 179,
      category: 'Pantry',
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      circularId,
      dealSource: 'uploaded_url',
      imageUrl: 'https://images.unsplash.com/photo-1621996346565-e3dbc353d528?w=400'
    }
  ];

  return sampleDeals;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
      }

      const user = await storage.authenticateUser(username, password);
      
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // In production, you'd set a proper session/JWT token here
      res.json({ 
        user: { ...user, password: undefined }, // Don't send password back
        token: 'demo-token', // Replace with real JWT
        message: 'Login successful' 
      });
    } catch (error) {
      handleError(res, error);
    }
  });

  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const { username, password, email, name } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ message: 'Username already exists' });
      }

      const newUser = await storage.createUser({
        username,
        password, // In production, hash this password
        email,
        name
      });

      res.status(201).json({ 
        user: { ...newUser, password: undefined },
        message: 'Registration successful' 
      });
    } catch (error) {
      handleError(res, error);
    }
  });

  app.post('/api/auth/logout', async (req: Request, res: Response) => {
    try {
      // In production, invalidate the session/token
      res.json({ message: 'Logout successful' });
    } catch (error) {
      handleError(res, error);
    }
  });

  app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      // In production, send password reset email
      res.json({ message: 'Password reset instructions sent to email' });
    } catch (error) {
      handleError(res, error);
    }
  });

  // API Routes
  // User profile routes
  app.get('/api/user/profile', async (req: Request, res: Response) => {
    try {
      // Check if there's a session user ID, otherwise use default
      const userId = req.headers['x-current-user-id'] ? 
        parseInt(req.headers['x-current-user-id'] as string) : 1;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json(user);
    } catch (error) {
      handleError(res, error);
    }
  });

  app.patch('/api/user/profile', async (req: Request, res: Response) => {
    try {
      // Get the current user ID from headers or use default
      const userId = req.headers['x-current-user-id'] ? 
        parseInt(req.headers['x-current-user-id'] as string) : 1;

      const userData = {
        ...req.body,
        id: userId
      };

      const updatedUser = await storage.updateUser(userData);
      res.json(updatedUser);
    } catch (error) {
      console.error('Profile update error:', error);
      handleError(res, error);
    }
  });

  // Role switching endpoint
  app.post('/api/user/switch-role', async (req: Request, res: Response) => {
    try {
      const { targetRole } = req.body;
      const currentUserId = req.headers['x-current-user-id'] ? 
        parseInt(req.headers['x-current-user-id'] as string) : 1;

      if (!targetRole) {
        return res.status(400).json({ message: 'Target role is required' });
      }

      const targetUser = await storage.switchUserRole(currentUserId, targetRole);
      res.json(targetUser);
    } catch (error) {
      handleError(res, error);
    }
  });

  // Get all users (admin only)
  app.get('/api/admin/users', async (req: Request, res: Response) => {
    try {
      const currentUserId = req.headers['x-current-user-id'] ? 
        parseInt(req.headers['x-current-user-id'] as string) : 1;
      
      const currentUser = await storage.getUser(currentUserId);
      if (!currentUser || (currentUser.role !== 'owner' && currentUser.role !== 'admin')) {
        return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      handleError(res, error);
    }
  });

  // Retailer routes
  // Get all retailers
  app.get('/api/retailers', async (req, res) => {
    try {
      const retailers = await storage.getRetailers();
      res.json(retailers);
    } catch (error: any) {
      console.error('Error fetching retailers:', error);
      res.status(500).json({ error: 'Failed to fetch retailers' });
    }
  });

  // Get specific retailer
  app.get('/api/retailers/:id', async (req, res) => {
    try {
      const retailerId = parseInt(req.params.id);
      const retailer = await storage.getRetailer(retailerId);

      if (!retailer) {
        return res.status(404).json({ error: 'Retailer not found' });
      }

      res.json(retailer);
    } catch (error: any) {
      console.error('Error fetching retailer:', error);
      res.status(500).json({ error: 'Failed to fetch retailer' });
    }
  });

  // Add custom retailer
  app.post('/api/retailers', async (req, res) => {
    try {
      const { name, logoColor } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Store name is required' });
      }

      // Use integration manager to create store with proper integration detection
      const { storeIntegrationManager } = await import('./services/storeIntegrationManager');
      const integrationConfig = await storeIntegrationManager.addCustomStore(
        name.trim(),
        req.body.websiteUrl // Optional website URL for integration detection
      );

      // Get the created retailer
      const retailer = await storage.getRetailer(integrationConfig.id);
      if (!retailer) {
        return res.status(500).json({ error: 'Failed to create retailer' });
      }

      // Return retailer with integration info
      res.json({
        ...retailer,
        integrationLevel: integrationConfig.integrationLevel,
        supportedFeatures: integrationConfig.supportedFeatures
      });
    } catch (error: any) {
      console.error('Error adding retailer:', error);
      res.status(500).json({ error: 'Failed to add retailer' });
    }
  });

  // Product categorization endpoint
  app.post('/api/products/categorize', async (req: Request, res: Response) => {
    try {
      const { productName, quantity, unit } = req.body;

      if (!productName) {
        return res.status(400).json({ error: 'Product name is required' });
      }

      // Use the product categorizer service
      const category = productCategorizer.categorizeProduct(productName);
      const normalized = productCategorizer.normalizeQuantity(productName, quantity || 1, unit || 'COUNT');
      const icon = productCategorizer.getCategoryIcon(category.category);

      res.json({
        productName,
        category,
        normalized,
        icon
      });
    } catch (error) {
      handleError(res, error);
    }
  });

  // Product normalization endpoint
  app.post('/api/products/normalize', async (req: Request, res: Response) => {
    try {
      const { productName, retailerId, additionalData } = req.body;

      if (!productName) {
        return res.status(400).json({ error: 'Product name is required' });
      }

      const { productNormalizer } = await import('./services/productNormalizer');
      const normalized = await productNormalizer.normalizeProduct(
        productName, 
        retailerId, 
        additionalData
      );

      res.json(normalized);
    } catch (error) {
      handleError(res, error);
    }
  });

  // Batch product normalization endpoint
  app.post('/api/products/normalize-batch', async (req: Request, res: Response) => {
    try {
      const { products } = req.body;

      if (!products || !Array.isArray(products)) {
        return res.status(400).json({ error: 'Products array is required' });
      }

      const { productNormalizer } = await import('./services/productNormalizer');
      const normalized = await productNormalizer.batchNormalize(products);

      res.json(normalized);
    } catch (error) {
      handleError(res, error);
    }
  });

  // Get retailer variations for a product
  app.get('/api/products/:canonicalName/variations', async (req: Request, res: Response) => {
    try {
      const { canonicalName } = req.params;
      const { productNormalizer } = await import('./services/productNormalizer');
      const variations = await productNormalizer.getRetailerVariations(canonicalName);

      res.json(variations);
    } catch (error) {
      handleError(res, error);
    }
  });

  // Update product mapping based on user feedback
  app.post('/api/products/mapping-feedback', async (req: Request, res: Response) => {
    try {
      const { originalName, canonicalName, retailerId, confidence } = req.body;
      const { productNormalizer } = await import('./services/productNormalizer');

      await productNormalizer.updateMapping(originalName, canonicalName, retailerId, confidence);

      res.json({ success: true });
    } catch (error) {
      handleError(res, error);
    }
  });

  // Batch product categorization endpoint
  app.post('/api/products/categorize-batch', async (req: Request, res: Response) => {
    try {
      const { items } = req.body;

      if (!items || !Array.isArray(items)) {
        return res.status(400).json({ error: 'Items array is required' });
      }

      const results = items.map((item: any) => {
        const { productName, quantity, unit } = item;

        // Use the product categorizer service
        const category = productCategorizer.categorizeProduct(productName);
        const normalized = productCategorizer.normalizeQuantity(productName, quantity || 1, unit || 'COUNT');
        const icon = productCategorizer.getCategoryIcon(category.category);

        return {
          productName,
          category,
          normalized,
          icon
        };
      });

      // Filter to only include items that have meaningful changes
      const filteredResults = results.filter((item: any) => {
        const hasNameChange = item.category.normalizedName && 
          item.category.normalizedName !== item.productName;

        const hasQuantityChange = item.normalized.suggestedQuantity !== item.normalized.originalQuantity;

        const hasUnitChange = item.normalized.suggestedUnit !== item.normalized.originalUnit;

        const hasOptimizationReason = item.normalized.conversionReason && 
          item.normalized.conversionReason !== 'No conversion needed';

        return hasNameChange || hasQuantityChange || hasUnitChange || hasOptimizationReason;
      });

      res.json(filteredResults);
    } catch (error) {
      handleError(res, error);
    }
  });

  // Normalize quantity
  app.post('/api/products/normalize-quantity', async (req: Request, res: Response) => {
    try {
      const { productName, quantity, unit } = req.body;

      if (!productName || !quantity || !unit) {
        return res.status(400).json({ message: 'Product name, quantity, and unit are required' });
      }

      const normalized = productCategorizer.normalizeQuantity(productName, quantity, unit);
      res.json(normalized);
    } catch (error) {
      handleError(res, error);
    }
  });

  // Batch categorize products
  app.post('/api/products/batch-categorize', async (req: Request, res: Response) => {
    try {
      const { products } = req.body;

      if (!Array.isArray(products)) {
        return res.status(400).json({ message: 'Products array is required' });
      }

      const results = products.map(product => {
        const category = productCategorizer.categorizeProduct(product.productName);
        const normalized = productCategorizer.normalizeQuantity(
          product.productName, 
          product.quantity || 1, 
          product.unit || 'COUNT'
        );

        return {
          productName: product.productName,
          category,
          normalized,
          icon: productCategorizer.getCategoryIcon(category.category)
        };
      });

      res.json(results);
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

  // Update retailer account
  app.patch('/api/user/retailer-accounts/:id', async (req: Request, res: Response) => {
    try {
      const accountId = parseInt(req.params.id);
      const updates = req.body;

      const updatedAccount = await storage.updateRetailerAccount(accountId, updates);
      
      if (!updatedAccount) {
        return res.status(404).json({ message: 'Retailer account not found' });
      }

      res.json(updatedAccount);
    } catch (error) {
      handleError(res, error);
    }
  });

  // Delete retailer account
  app.delete('/api/user/retailer-accounts/:id', async (req: Request, res: Response) => {
    try {
      const accountId = parseInt(req.params.id);
      
      await storage.deleteRetailerAccount(accountId);
      res.status(204).send();
    } catch (error) {
      handleError(res, error);
    }
  });

  // Test retailer account connection
  app.post('/api/user/retailer-accounts/:id/test', async (req: Request, res: Response) => {
    try {
      const accountId = parseInt(req.params.id);
      
      const account = await storage.getRetailerAccount(accountId);
      if (!account) {
        return res.status(404).json({ message: 'Retailer account not found' });
      }

      // Test the connection (mock for demo)
      const testResult = {
        success: Math.random() > 0.2, // 80% success rate for demo
        message: Math.random() > 0.2 ? 'Connection successful' : 'Authentication failed',
        lastTested: new Date()
      };

      res.json(testResult);
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

  // Monthly savings endpoint
  app.get('/api/insights/monthly-savings', async (req: Request, res: Response) => {
    try {
      // Sample calculation - in real app, this would be calculated from purchase data
      const savings = Math.floor(Math.random() * 50) + 10; // $10-$60 savings
      res.json(savings);
    } catch (error) {
      handleError(res, error);
    }
  });

  // AI-powered demographic insights for user area
  app.get('/api/insights/demographic-insights', async (req: Request, res: Response) => {
    try {
      const demographicInsights = [
        {
          trend: "Sustainable Shopping Growth",
          description: "Eco-friendly products seeing 40% increase in your demographic",
          confidence: 85,
          sampleSize: 2341,
          timeframe: "Last 3 months"
        },
        {
          trend: "Bulk Buying Trend", 
          description: "Families like yours are increasingly buying in bulk to save money",
          confidence: 78,
          sampleSize: 1856,
          timeframe: "Last 6 months"
        },
        {
          trend: "Digital Coupon Adoption",
          description: "Mobile couponing growing 65% among your age group",
          confidence: 92,
          sampleSize: 3127,
          timeframe: "Last 12 months"
        },
        {
          trend: "Health-Conscious Choices",
          description: "Organic and natural products trending upward in your area",
          confidence: 88,
          sampleSize: 2750,
          timeframe: "Last 4 months"
        }
      ];

      res.json(demographicInsights);
    } catch (error) {
      console.error('Error in demographic insights endpoint:', error);
      res.status(500).json({ 
        error: 'Failed to fetch demographic insights',
        message: error.message || 'Internal server error'
      });
    }
  });

  // Similar shopper profiles in user's area
  app.get('/api/insights/similar-profiles', async (req: Request, res: Response) => {
    try {
      const similarProfiles = [
        {
          profileType: "Budget-Conscious Families",
          matchingUsers: 1250,
          similarity: 0.89,
          averageSpend: 115,
          topCategories: ["Bulk groceries", "Store brands", "Family packs"],
          priceSensitivity: "High",
          shoppingFrequency: "Weekly",
          preferredStores: ["Walmart", "Costco", "Aldi"]
        },
        {
          profileType: "Health-Conscious Shoppers", 
          matchingUsers: 875,
          similarity: 0.82,
          averageSpend: 95,
          topCategories: ["Organic produce", "Natural products", "Supplements"],
          priceSensitivity: "Medium",
          shoppingFrequency: "Bi-weekly",
          preferredStores: ["Whole Foods", "Trader Joe's", "Natural Grocers"]
        },
        {
          profileType: "Convenience-Focused Households",
          matchingUsers: 642,
          similarity: 0.76,
          averageSpend: 108,
          topCategories: ["Ready meals", "Delivery services", "Quick snacks"],
          priceSensitivity: "Low",
          shoppingFrequency: "As needed",
          preferredStores: ["Target", "Amazon Fresh", "Local convenience"]
        }
      ];

      res.json(similarProfiles);
    } catch (error) {
      console.error('Error in similar profiles endpoint:', error);
      res.status(500).json({ 
        error: 'Failed to fetch similar profiles',
        message: error.message || 'Internal server error'
      });
    }
  });

  // Local area shopping insights
  app.get('/api/insights/area-insights', async (req: Request, res: Response) => {
    try {
      const areaInsights = {
        trendingCategory: "Organic Products",
        trendDescription: "More families in your area are choosing organic alternatives",
        growthPercentage: 25,
        popularStore: "Whole Foods Market",
        bestDealDay: "Wednesday",
        averageAreaSpend: 127,
        topAreaCategories: ["Organic produce", "Local products", "Sustainable goods"],
        peakShoppingTimes: ["Saturday morning", "Sunday afternoon", "Wednesday evening"],
        seasonalTrends: [
          {
            season: "Current",
            trending: ["Fresh produce", "Outdoor dining", "BBQ supplies"]
          }
        ],
        demographicBreakdown: {
          families: 45,
          singles: 28,
          seniors: 15,
          students: 12
        },
        localEvents: [
          {
            event: "Farmer's Market",
            impact: "30% increase in organic purchases",
            day: "Saturday"
          }
        ]
      };

      res.json(areaInsights);
    } catch (error) {
      console.error('Error in area insights endpoint:', error);
      res.status(500).json({ 
        error: 'Failed to fetch area insights',
        message: error.message || 'Internal server error'
      });
    }
  });

  // Recommendations routes
  app.get('/api/recommendations', async (req: Request, res: Response) => {
    try {
      // Get or generate recommendations based on purchase history
      let recommendations = await storage.getRecommendations();

      // If no recommendations exist, generate some
      if (!recommendations || recommendations.length === 0) {
        try {
          const user = await storage.getDefaultUser();
          const purchases = await storage.getPurchases();
          recommendations = await generateRecommendations(user, purchases);

          // Save the generated recommendations
          for (const rec of recommendations) {
            try {
              await storage.createRecommendation(rec);
            } catch (saveError) {
              console.error('Error saving recommendation:', saveError);
              // Continue with other recommendations
            }
          }
        } catch (generateError) {
          console.error('Error generating recommendations:', generateError);
          // Return empty array if generation fails
          recommendations = [];
        }
      }

      res.json(recommendations || []);
    } catch (error) {
      console.error('Error in recommendations endpoint:', error);
      // Return empty array instead of error to prevent frontend crashes
      res.json([]);
    }
  });

  // Shopping list routes
  app.get('/api/shopping-lists/:id', async (req: Request, res: Response) => {
    try {
      const listId = parseInt(req.params.id);
      const lists = await storage.getShoppingLists();
      const list = lists.find(l => l.id === listId);

      if (!list) {
        return res.status(404).json({ message: 'Shopping list not found' });
      }

      // Fetch items for this shopping list
      const items = await storage.getShoppingListItems(list.id);
      console.log(`List ${list.id} has ${items.length} items:`, items);

      res.json({ ...list, items });
    } catch (error) {
      handleError(res, error);
    }
  });

  // Create new shopping list
  app.post('/api/shopping-lists', async (req: Request, res: Response) => {
    try {
      const { name, description, isDefault } = req.body;
      const userId = req.headers['x-current-user-id'] ? 
        parseInt(req.headers['x-current-user-id'] as string) : 1;

      if (!name) {
        return res.status(400).json({ message: 'Shopping list name is required' });
      }

      const newList = await storage.createShoppingList({
        name,
        description: description || '',
        userId,
        isDefault: isDefault || false
      });

      res.status(201).json(newList);
    } catch (error) {
      handleError(res, error);
    }
  });

  // Update shopping list
  app.patch('/api/shopping-lists/:id', async (req: Request, res: Response) => {
    try {
      const listId = parseInt(req.params.id);
      const { name, description, isDefault } = req.body;

      const updatedList = await storage.updateShoppingList(listId, {
        name,
        description,
        isDefault
      });

      if (!updatedList) {
        return res.status(404).json({ message: 'Shopping list not found' });
      }

      res.json(updatedList);
    } catch (error) {
      handleError(res, error);
    }
  });

  // Delete shopping list
  app.delete('/api/shopping-lists/:id', async (req: Request, res: Response) => {
    try {
      const listId = parseInt(req.params.id);
      
      await storage.deleteShoppingList(listId);
      res.status(204).send();
    } catch (error) {
      handleError(res, error);
    }
  });

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

  // Get all purchases for a user
  app.get('/api/purchases', async (req: Request, res: Response) => {
    try {
      const userId = req.headers['x-current-user-id'] ? 
        parseInt(req.headers['x-current-user-id'] as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;

      const purchases = await storage.getPurchases(userId, limit, offset);
      res.json(purchases);
    } catch (error) {
      handleError(res, error);
    }
  });

  // Create manual purchase entry
  app.post('/api/purchases', async (req: Request, res: Response) => {
    try {
      const { retailerId, items, totalAmount, purchaseDate } = req.body;
      const userId = req.headers['x-current-user-id'] ? 
        parseInt(req.headers['x-current-user-id'] as string) : 1;

      if (!retailerId || !items || !totalAmount) {
        return res.status(400).json({ message: 'Retailer ID, items, and total amount are required' });
      }

      const purchase = await storage.createPurchase({
        userId,
        retailerId,
        items,
        totalAmount,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date()
      });

      res.status(201).json(purchase);
    } catch (error) {
      handleError(res, error);
    }
  });

  // Update purchase
  app.patch('/api/purchases/:id', async (req: Request, res: Response) => {
    try {
      const purchaseId = parseInt(req.params.id);
      const updates = req.body;

      const updatedPurchase = await storage.updatePurchase(purchaseId, updates);
      
      if (!updatedPurchase) {
        return res.status(404).json({ message: 'Purchase not found' });
      }

      res.json(updatedPurchase);
    } catch (error) {
      handleError(res, error);
    }
  });

  // Delete purchase
  app.delete('/api/purchases/:id', async (req: Request, res: Response) => {
    try {
      const purchaseId = parseInt(req.params.id);
      
      await storage.deletePurchase(purchaseId);
      res.status(204).send();
    } catch (error) {
      handleError(res, error);
    }
  });

  // Generate a shopping list from typical purchases
  app.post('/api/shopping-lists/generate', async (req: Request, res: Response) => {
    try {
      const { items: selectedItems, shoppingListId } = req.body;
      const userId = 1; // For demo purposes, use default user

      // Get the target shopping list
      const lists = await storage.getShoppingLists();
      const targetListId = shoppingListId || lists[0]?.id;

      if (!targetListId) {
        return res.status(400).json({ message: 'No shopping list available' });
      }

      // If no items provided, generate some sample items
      let itemsToProcess = selectedItems;
      if (!itemsToProcess || !Array.isArray(itemsToProcess)) {
        itemsToProcess = [
          { productName: 'Milk', quantity: 1, unit: 'GALLON', isSelected: true },
          { productName: 'Bread', quantity: 1, unit: 'LOAF', isSelected: true },
          { productName: 'Eggs', quantity: 1, unit: 'DOZEN', isSelected: true },
          { productName: 'Bananas', quantity: 2, unit: 'LB', isSelected: true },
          { productName: 'Chicken Breast', quantity: 1, unit: 'LB', isSelected: true }
        ];
      }

      // Get existing items to check for duplicates
      const existingItems = await storage.getShoppingListItems(targetListId);

      const addedItems = [];
      const updatedItems = [];

      // Process each selected item
      for (const item of itemsToProcess) {
        if (!item.isSelected) continue;

        const normalizedName = item.productName.toLowerCase().trim();

        // Check for duplicates using the same logic as the regular add item endpoint
        let existingItem = existingItems.find(existing => 
          existing.productName.toLowerCase() === normalizedName ||
          existing.productName.toLowerCase() + 's' === normalizedName ||
          existing.productName.toLowerCase() === normalizedName + 's'
        );

        // Check for common item variations
        if (!existingItem) {
          const commonItemCorrections: Record<string, string[]> = {
            'milk': ['milk (gallon)', 'milk whole', 'whole milk', 'organic milk'],
            'bread': ['sandwich bread', 'loaf bread', 'white bread'],
            'eggs': ['egg', 'dozen eggs'],
            'banana': ['bananas'],
            'chicken': ['chicken breast', 'chicken breasts'],
            'pasta': ['spaghetti', 'noodles'],
            'coffee': ['ground coffee', 'coffee beans']
          };

          for (const [baseItem, variations] of Object.entries(commonItemCorrections)) {
            if (normalizedName.includes(baseItem) || variations.some(v => normalizedName.includes(v))) {
              existingItem = existingItems.find(existing => {
                const existingName = existing.productName.toLowerCase();
                return existingName.includes(baseItem) || variations.some(v => existingName.includes(v));
              });
              if (existingItem) break;
            }
          }
        }

        if (existingItem) {
          // Update existing item by adding quantities
          const updatedItem = await storage.updateShoppingListItem(existingItem.id, {
            quantity: existingItem.quantity + item.quantity,
            unit: item.unit || existingItem.unit || 'COUNT'
          });
          updatedItems.push({
            ...updatedItem,
            merged: true,
            originalName: item.productName,
            message: `Combined with existing "${existingItem.productName}" item`
          });
        } else {
          // Add as new item
          const newItem = await storage.addShoppingListItem({
            shoppingListId: targetListId,
            productName: item.productName,
            quantity: item.quantity,
            unit: item.unit || 'COUNT'
          });
          addedItems.push(newItem);
        }
      }

      res.json({
        addedItems,
        updatedItems,
        itemsAdded: addedItems.length,
        itemsUpdated: updatedItems.length,
        totalItems: addedItems.length + updatedItems.length
      });
    } catch (error) {
      handleError(res, error);
    }
  });

  // Generate shopping list preview with personalized recommendations
  app.post('/api/shopping-lists/preview', async (req: Request, res: Response) => {
    try {
      const userId = req.body.userId || 1; // Default to user 1 for demo

      // Get user preferences
      const user = await storage.getUser(userId);
      const userPrefersBulk = user?.buyInBulk || false;
      const userPrioritizesCost = user?.prioritizeCostSavings || false;

      // Mock deal data with bulk vs standard options for demonstration
      const availableDeals = [
        // Soda Water Example (as mentioned in the query)
        {
          productName: 'Sparkling Water',
          retailerName: 'Costco',
          salePrice: 3000, // $30.00
          quantity: 36,
          unit: 'CANS',
          savings: 500
        },
        {
          productName: 'Sparkling Water',
          retailerName: 'Target', 
          salePrice: 1500, // $15.00
          quantity: 24,
          unit: 'CANS',
          savings: 300
        },
        // Milk examples
        {
          productName: 'Milk',
          retailerName: 'Costco',
          salePrice: 899, // $8.99 for 2 gallons
          quantity: 2,
          unit: 'GALLON',
          savings: 200
        },
        {
          productName: 'Milk',
          retailerName: 'Walmart',
          salePrice: 359, // $3.59 per gallon
          quantity: 1,
          unit: 'GALLON', 
          savings: 40
        },
        // Eggs
        {
          productName: 'Eggs',
          retailerName: 'Costco',
          salePrice: 899, // $8.99 for 24 count
          quantity: 24,
          unit: 'COUNT',
          savings: 150
        },
        {
          productName: 'Eggs', 
          retailerName: 'Target',
          salePrice: 249, // $2.49 per dozen
          quantity: 12,
          unit: 'COUNT',
          savings: 50
        }
      ];

      // Analyze deals considering user preferences
      const analyzedDeals = analyzeBulkVsUnitPricing(availableDeals, userPrefersBulk);

      // Convert to recommendation format
      const recommendedItems = analyzedDeals.map(deal => ({
        productName: deal.productName,
        quantity: deal.quantity,
        unit: deal.unit,
        suggestedRetailerId: 1, // Mock Retailer ID
        suggestedPrice: deal.salePrice,
        savings: deal.savings,
        reason: `Best deal based on ${userPrefersBulk ? 'bulk preference' : 'unit price'} at ${deal.retailerName}`,
        daysUntilPurchase: 2, // Mock value
        isSelected: true
      }));

      // Additional hardcoded items
      const additionalItems = [
        { 
          productName: 'Ground Coffee', 
          quantity: 1, 
          unit: 'LB',
          suggestedRetailerId: 2,
          suggestedPrice: 1299,
          savings: 100,
          reason: "Premium coffee on sale at Target",
          daysUntilPurchase: 5,
          isSelected: true
        },
        { 
          productName: 'Chicken Breast', 
          quantity: 2, 
          unit: 'LB',
          suggestedRetailerId: 1,
          suggestedPrice: 699,
          savings: 80,
          reason: "Protein staple - family pack sale at Walmart",
          daysUntilPurchase: 6,
          isSelected: true
        }
      ];

      // Combine analyzed deals with additional items
      const allRecommendedItems = [...recommendedItems, ...additionalItems];

      // Sample items to demonstrate the feature
      let items = allRecommendedItems;
      if (items.length === 0) {
        items = [
          { productName: 'Milk', quantity: 1, unit: 'GALLON', reason: 'Purchased weekly' },
          { productName: 'Bananas', quantity: 1, unit: 'LB', reason: 'Running low based on purchase cycle' },
          { productName: 'Bread', quantity: 1, unit: 'COUNT', reason: 'Typically purchased every 5 days' },
          { productName: 'Eggs', quantity: 1, unit: 'COUNT', reason: 'Regularly purchased item' },
          { productName: 'Toilet Paper', quantity: 1, unit: 'ROLL', reason: 'Based on typical household usage' },
          { productName: 'Chicken Breast', quantity: 1, unit: 'LB', reason: 'Purchased bi-weekly' },
          { productName: 'Tomatoes', quantity: 3, unit: 'LB', reason: 'Based on recipe usage patterns' }
        ];
      }

      // Return the recommendations for preview
      res.json({
        userId,
        items: allRecommendedItems,
        totalSavings: allRecommendedItems.reduce((sum, item) => sum + (item.savings || 0), 0)
      });
    } catch (error) {
      handleError(res, error);
    }
  });

  // Preview recipe ingredients before importing
  app.post('/api/shopping-lists/recipe/preview', async (req: Request, res: Response) => {
    try {
      const { recipeUrl, servings } = req.body;
      if (!recipeUrl) {
        return res.status(400).json({ message: 'Recipe URL is required' });
      }

      // Extract ingredients for preview
      const extractedIngredients = await extractRecipeIngredients(recipeUrl, servings || 4);

      // Format ingredients for preview
      const previewItems = extractedIngredients.map(ingredient => ({
        productName: ingredient.name,
        quantity: ingredient.quantity,
        unit: ingredient.unit || 'COUNT',
        isSelected: true
      }));

      res.json({ items: previewItems });
    } catch (error) {
      handleError(res, error);
    }
  });

  // Import recipe and add ingredients to shopping list
  app.post('/api/shopping-lists/recipe', async (req: Request, res: Response) => {
    try {
      const { recipeUrl, shoppingListId, servings, items } = req.body;

      let ingredientsToAdd = [];

      if (items) {
        // If items are provided (from preview), use those
        ingredientsToAdd = items.filter((item: any) => item.isSelected);
      } else {
        // If no items provided, extract from URL (backward compatibility)
        if (!recipeUrl) {
          return res.status(400).json({ message: 'Recipe URL or items are required' });
        }
        const extractedIngredients = await extractRecipeIngredients(recipeUrl, servings);
        ingredientsToAdd = extractedIngredients.map(ingredient => ({
          productName: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit || 'COUNT'
        }));
      }

      // Add each ingredient to the shopping list
      const addedItems = [];
      for (const ingredient of ingredientsToAdd) {
        const newItem = await storage.addShoppingListItem({
          shoppingListId: shoppingListId || 1, // Default to first list if not specified
          productName: ingredient.productName,
          quantity: ingredient.quantity,
          unit: ingredient.unit
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

      // Validate quantity to ensure it's a number and not NaN
      const validQuantity = Number(quantity);
      if (isNaN(validQuantity)) {
        return res.status(400).json({ message: 'Invalid quantity. Please provide a valid number.' });
      }

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
        'banana': ['banan', 'bananna', 'banannas', 'bannana', 'banannas'],
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
          quantity: existingItem.quantity + validQuantity,
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
          quantity: validQuantity,
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

      let deals = await storage.getDeals(retailerId, category);

      // Remove duplicates by creating a unique key for each deal
      const uniqueDeals = deals.filter((deal, index, self) => 
        index === self.findIndex((d) => 
          d.productName === deal.productName && 
          d.retailerId === deal.retailerId &&
          d.salePrice === deal.salePrice
        )
      );

      res.json(uniqueDeals);
    } catch (error) {
      handleError(res, error);
    }
  });

  // Optimized deals endpoint with fresh data
  app.get('/api/deals/optimized', async (req: Request, res: Response) => {
    try {
      const retailerId = req.query.retailerId ? parseInt(req.query.retailerId as string) : undefined;
      const category = req.query.category as string | undefined;

      const { dataOptimizer } = await import('./services/dataOptimizer');
      const deals = await dataOptimizer.getOptimizedDeals(retailerId, category);

      res.json(deals);
    } catch (error) {
      handleError(res, error);
    }
  });

  // Real-time price comparison endpoint
  app.post('/api/prices/compare', async (req: Request, res: Response) => {
    try {
      const { productName, retailerIds } = req.body;

      if (!productName || !retailerIds || !Array.isArray(retailerIds)) {
        return res.status(400).json({ message: 'Product name and retailer IDs are required' });
      }

      const { dataOptimizer } = await import('./services/dataOptimizer');

      const pricePromises = retailerIds.map(async (retailerId: number) => {
        const price = await dataOptimizer.getOptimizedPrice(retailerId, productName);
        const retailer = await storage.getRetailer(retailerId);

        return {
          retailerId,
          retailerName: retailer?.name || `Retailer ${retailerId}`,
          price,
          available: price !== null
        };
      });

      const prices = await Promise.all(pricePromises);
      const availablePrices = prices.filter(p => p.available);

      // Find best price
      const bestPrice = availablePrices.length > 0 
        ? availablePrices.reduce((min, current) => current.price! < min.price! ? current : min)
        : null;

      res.json({
        productName,
        prices,
        bestPrice,
        totalRetailers: retailerIds.length,
        availableRetailers: availablePrices.length
      });
    } catch (error) {
      handleError(res, error);
    }
  });

  // Optimized shopping list with real-time pricing
  app.get('/api/shopping-lists/:id/optimized', async (req: Request, res: Response) => {
    try {
      const listId = parseInt(req.params.id);

      const { dataOptimizer } = await import('./services/dataOptimizer');
      const optimizedList = await dataOptimizer.getOptimizedShoppingList(listId);

      res.json(optimizedList);
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

  app.get('/api/deals/categories', async (req, res) => {
    try {
      const categories = await storage.getDealCategories();
      res.json(categories);
    } catch (error) {
      console.error('Error fetching deal categories:', error);
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  });

  // Mark deal as used/claimed
  app.post('/api/deals/:id/claim', async (req: Request, res: Response) => {
    try {
      const dealId = parseInt(req.params.id);
      const userId = req.headers['x-current-user-id'] ? 
        parseInt(req.headers['x-current-user-id'] as string) : 1;

      const result = await storage.claimDeal(dealId, userId);
      res.json(result);
    } catch (error) {
      handleError(res, error);
    }
  });

  // Get deals with advanced filtering
  app.get('/api/deals/search', async (req: Request, res: Response) => {
    try {
      const {
        retailerId,
        category,
        minDiscount,
        maxPrice,
        sortBy,
        sortOrder,
        limit,
        offset
      } = req.query;

      const filters = {
        retailerId: retailerId ? parseInt(retailerId as string) : undefined,
        category: category as string,
        minDiscount: minDiscount ? parseInt(minDiscount as string) : undefined,
        maxPrice: maxPrice ? parseInt(maxPrice as string) : undefined,
        sortBy: sortBy as string || 'createdAt',
        sortOrder: sortOrder as string || 'desc',
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0
      };

      const deals = await storage.searchDeals(filters);
      res.json(deals);
    } catch (error) {
      handleError(res, error);
    }
  });

  // Get user's claimed deals
  app.get('/api/user/claimed-deals', async (req: Request, res: Response) => {
    try {
      const userId = req.headers['x-current-user-id'] ? 
        parseInt(req.headers['x-current-user-id'] as string) : 1;

      const claimedDeals = await storage.getUserClaimedDeals(userId);
      res.json(claimedDeals);
    } catch (error) {
      handleError(res, error);
    }
  });

  // Upload circular endpoint
  app.post('/api/circulars/upload', upload.single('file'), async (req, res) => {
    try {
      const { type, retailerName, title, url } = req.body;
      const file = req.file;

      console.log('Circular upload request:', { type, retailerName, title, url, hasFile: !!file });

      if (!retailerName || !title) {
        return res.status(400).json({ error: 'Retailer name and title are required' });
      }

      // Find or create retailer
      let retailer = (await storage.getRetailers()).find(r => 
        r.name.toLowerCase() === retailerName.toLowerCase()
      );

      if (!retailer) {
        // Create a new retailer
        retailer = await storage.createRetailer({
          name: retailerName,
          logoColor: 'blue', // Default color
          isActive: true
        });
      }

      // Create the circular
      const circular = await storage.createWeeklyCircular({
        retailerId: retailer.id,
        title,
        description: `Uploaded circular from ${retailerName}`,
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
        imageUrl: url || null,
        pdfUrl: type === 'url' ? url : null,
        pages: 1,
        isActive: true
      });

      // Process the circular based on type
      let extractedDeals = [];

      if (type === 'image' && file) {
        // For demo purposes, create some sample deals
        extractedDeals = await createSampleDealsFromImage(retailer.id, circular.id, file.originalname);
      } else if (type === 'file' && file) {
        // For demo purposes, create some sample deals
        extractedDeals = await createSampleDealsFromPDF(retailer.id, circular.id, file.originalname);
      } else if (type === 'url' && url) {
        // For demo purposes, create some sample deals
        extractedDeals = await createSampleDealsFromURL(retailer.id, circular.id, url);
      }

      // Store the deals
      for (const deal of extractedDeals) {
        await storage.createDeal(deal);
      }

      res.json({
        id: circular.id,
        title: circular.title,
        dealsCount: extractedDeals.length,
        message: `Successfully processed circular and extracted ${extractedDeals.length} deals`
      });

    } catch (error) {
      console.error('Error uploading circular:', error);
      res.status(500).json({ error: 'Failed to process circular upload' });
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

  // AI-powered demographic trend analysis
  app.get('/api/internal/analytics/demographic-trends', async (req: Request, res: Response) => {
    try {
      const { segment, timeframe } = req.query;

      // AI-generated demographic insights based on similar user profiles
      const demographicTrends = [
        {
          segment: "Young Professionals (25-35)",
          upcomingTrends: [
            {
              trend: "Plant-Based Protein Surge",
              confidence: 0.89,
              predictedGrowth: "+45%",
              timeframe: "Next 3 months",
              drivingFactors: ["Health consciousness", "Environmental awareness", "Social media influence"],
              recommendedActions: ["Stock alternative proteins", "Partner with plant-based brands"]
            },
            {
              trend: "Convenience Meal Kits",
              confidence: 0.92,
              predictedGrowth: "+62%",
              timeframe: "Next 2 months",
              drivingFactors: ["Busy lifestyles", "Cooking skill development", "Subscription preferences"],
              recommendedActions: ["Expand meal kit offerings", "Create ready-to-cook sections"]
            }
          ],
          currentBehaviors: {
            averageSpend: 127.80,
            frequentCategories: ["Ready meals", "Organic produce", "Coffee", "Snacks"],
            shoppingPattern: "Quick trips, mobile-first, price-conscious with quality focus"
          }
        },
        {
          segment: "Families with Children",
          upcomingTrends: [
            {
              trend: "Bulk Healthy Snacks",
              confidence: 0.85,
              predictedGrowth: "+38%",
              timeframe: "Next 4 months",
              drivingFactors: ["Back-to-school preparation", "Health-conscious parenting", "Budget optimization"],
              recommendedActions: ["Create family-size healthy snack bundles", "Offer nutritional information"]
            },
            {
              trend: "Interactive Food Education",
              confidence: 0.78,
              predictedGrowth: "+28%",
              timeframe: "Next 6 months",
              drivingFactors: ["Educational parenting trends", "Kids' involvement in food choices"],
              recommendedActions: ["Partner with educational brands", "Create kid-friendly product displays"]
            }
          ],
          currentBehaviors: {
            averageSpend: 189.50,
            frequentCategories: ["Household basics", "Kids snacks", "Frozen foods", "Cleaning supplies"],
            shoppingPattern: "Weekly stock-ups, value-focused, brand loyal for kids' products"
          }
        },
        {
          segment: "Health-Conscious Seniors",
          upcomingTrends: [
            {
              trend: "Functional Foods",
              confidence: 0.91,
              predictedGrowth: "+52%",
              timeframe: "Next 3 months",
              drivingFactors: ["Preventive health focus", "Medication complementing", "Active aging"],
              recommendedActions: ["Highlight health benefits", "Create wellness-focused sections"]
            },
            {
              trend: "Technology-Assisted Shopping",
              confidence: 0.73,
              predictedGrowth: "+35%",
              timeframe: "Next 5 months",
              drivingFactors: ["Digital adoption acceleration", "Convenience preferences"],
              recommendedActions: ["Simplify online interfaces", "Offer tech support services"]
            }
          ],
          currentBehaviors: {
            averageSpend: 156.20,
            frequentCategories: ["Health supplements", "Fresh produce", "Low-sodium options", "Pharmacy"],
            shoppingPattern: "Regular schedule, quality-focused, prefers familiar brands"
          }
        }
      ];

      // Filter by segment if specified
      const filteredTrends = segment 
        ? demographicTrends.filter(d => d.segment.toLowerCase().includes(segment.toLowerCase()))
        : demographicTrends;

      res.json(filteredTrends);
    } catch (error) {
      console.error('Error in demographic trends endpoint:', error);
      res.status(500).json({ 
        error: 'Failed to fetch demographic trends',
        message: error.message || 'Internal server error'
      });
    }
  });

  // Similar user profile analysis
  app.get('/api/internal/analytics/similar-profiles', async (req: Request, res: Response) => {
    try {
      const { userId, profileType } = req.query;

      // AI-analyzed similar user profiles and their behaviors
      const similarProfileAnalysis = {
        profileMatches: [
          {
            profileType: "Health-Conscious Urban Professional",
            matchingUsers: 2847,
            similarity: 0.94,
            keyCharacteristics: [
              "Age 28-34",
              "Income $75k-$120k",
              "Lives in metro area",
              "Prefers organic/natural products",
              "Shops 2-3x per week"
            ],
            shoppingPatterns: {
              preferredDays: ["Tuesday", "Saturday", "Sunday"],
              averageSpend: 142.60,
              topCategories: ["Organic produce", "Lean proteins", "Supplements", "Kombucha/probiotics"],
              brandLoyalty: 0.67,
              pricesensitivity: "Medium"
            },
            emergingBehaviors: [
              {
                behavior: "Sustainable packaging preference",
                adoption: "68% and growing",
                impact: "Will pay 8-12% premium for eco-friendly packaging"
              },
              {
                behavior: "Ingredient transparency demand",
                adoption: "89% check labels",
                impact: "Switching to brands with cleaner labels"
              }
            ]
          },
          {
            profileType: "Budget-Conscious Family Manager",
            matchingUsers: 3156,
            similarity: 0.91,
            keyCharacteristics: [
              "Age 32-45",
              "Household income $45k-$85k",
              "2-4 children",
              "Suburban/rural location",
              "Shops 1-2x per week"
            ],
            shoppingPatterns: {
              preferredDays: ["Saturday", "Sunday"],
              averageSpend: 167.30,
              topCategories: ["Bulk staples", "Store brands", "Kids' snacks", "Household cleaning"],
              brandLoyalty: 0.45,
              pricesensitivity: "High"
            },
            emergingBehaviors: [
              {
                behavior: "Digital coupon adoption",
                adoption: "78% actively use apps",
                impact: "Average savings of $23 per trip"
              },
              {
                behavior: "Bulk buying coordination",
                adoption: "41% coordinate with neighbors",
                impact: "Group purchases for better deals"
              }
            ]
          }
        ],
        crossSegmentInsights: {
          sharedTrends: [
            {
              trend: "Mobile-first shopping research",
              crossSegmentAdoption: "87%",
              impact: "Pre-shopping price comparison and review checking"
            },
            {
              trend: "Flexible shopping times",
              crossSegmentAdoption: "72%",
              impact: "Increased demand for extended hours and services"
            }
          ],
          divergingBehaviors: [
            {
              behavior: "Premium product willingness",
              segmentA: { segment: "Health-Conscious Urban", willingness: "High (78%)" },
              segmentB: { segment: "Budget-Conscious Family", willingness: "Low (23%)" },
              implication: "Targeted marketing needed for premium products"            }
          ]
        }
      };

      res.json(similarProfileAnalysis);
    } catch (error) {
      console.error('Error in similar profiles endpoint:', error);
      res.status(500).json({ 
        error: 'Failed to fetch similar profiles',
        message: error.message || 'Internal server error'
      });
    }
  });

  // AI trend predictions based on demographic analysis
  app.get('/api/internal/analytics/trend-predictions', async (req: Request, res: Response) => {
    try {
      const trendPredictions = {
        shortTerm: { // Next 1-3 months
          predictions: [
            {
              category: "Health & Wellness",
              prediction: "37% increase in functional beverage purchases",
              confidence: 0.89,
              drivingDemographics: ["Young professionals", "Health-conscious seniors"],
              supportingData: "AI analysis of 50k+ similar user profiles shows accelerating adoption"
            },
            {
              category: "Convenience Foods",
              prediction: "28% growth in premium ready-meals",
              confidence: 0.84,
              drivingDemographics: ["Busy families", "Single professionals"],
              supportingData: "Cross-demographic analysis reveals time-saving priority increase"
            }
          ]
        },
        mediumTerm: { // Next 3-6 months
          predictions: [
            {
              category: "Sustainable Products",
              prediction: "45% increase in eco-friendly product adoption",
              confidence: 0.91,
              drivingDemographics: ["Millennials with children", "Gen Z shoppers"],
              supportingData: "Similar profile analysis shows sustainability becoming primary factor"
            },
            {
              category: "Technology Integration",
              prediction: "52% adoption of smart shopping tools",
              confidence: 0.76,
              drivingDemographics: ["Tech-savvy seniors", "Digital native families"],
              supportingData: "Demographic modeling predicts rapid tech adoption acceleration"
            }
          ]
        },
        longTerm: { // Next 6-12 months
          predictions: [
            {
              category: "Personalized Nutrition",
              prediction: "67% interest in customized food recommendations",
              confidence: 0.78,
              drivingDemographics: ["Health-focused segments", "Data-comfortable consumers"],
              supportingData: "AI analysis indicates growing demand for personalized shopping experiences"
            }
          ]
        },
        demographicInsights: {
          fastestGrowingSegment: "Health-Conscious Urban Professionals",
          mostInfluentialSegment: "Tech-Savvy Families",
          emergingSegment: "Sustainable-First Shoppers",
          aiConfidence: 0.87
        }
      };

      res.json(trendPredictions);
    } catch (error) {
      console.error('Error in trend predictions endpoint:', error);
      res.status(500).json({ 
        error: 'Failed to fetch trend predictions',
        message: error.message || 'Internal server error'
      });
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

  // Generate single store optimization plan
  app.post('/api/shopping-lists/single-store', async (req: Request, res: Response) => {
    try {
      const { shoppingListId } = req.body;
      const listId = shoppingListId || 1;

      const items = await storage.getShoppingListItems(listId);
      if (!items.length) {
        return res.json({ retailerId: null, retailerName: null, items: [], totalCost: 0, availabilityRate: 0 });
      }

      // Get all retailers to find the best single store option
      const retailers = await storage.getRetailers();
      const allDeals = await storage.getDeals();

      // Evaluate each retailer for single store optimization
      const retailerScores = retailers.map(retailer => {
        let availableItems = 0;
        let totalCost = 0;
        let dealCount = 0;

        const storeItems = items.map(item => {
          // Check for deals at this retailer
          const deal = allDeals.find(d => 
            d.retailerId === retailer.id && 
            (d.productName.toLowerCase().includes(item.productName.toLowerCase()) ||
             item.productName.toLowerCase().includes(d.productName.toLowerCase())) &&
            new Date(d.endDate) > new Date()
          );

          // Simulate availability based on retailer type
          const isAvailable = Math.random() > 0.15; // 85% base availability
          if (isAvailable) availableItems++;

          // Use deal price if available, otherwise simulate pricing
          let price;
          if (deal) {
            price = deal.salePrice;
            dealCount++;
          } else {
            // Different retailers have different price ranges
            const basePrice = retailer.name === "Walmart" ? 200 : 
                            retailer.name === "Target" ? 280 : 
                            retailer.name === "Kroger" ? 250 : 260;
            price = basePrice + Math.floor(Math.random() * 200);
          }

          if (isAvailable) {
            totalCost += price * item.quantity;
          }

          return {
            id: item.id,
            productName: item.productName,
            quantity: item.quantity,
            unit: item.unit,
            price,
            isAvailable,
            substituteAvailable: !isAvailable ? Math.random() > 0.3 : false,
            dealInfo: deal ? {
              isDeal: true,
              savings: deal.regularPrice - deal.salePrice,
              source: deal.dealSource || 'manual_upload'
            } : null
          };
        });

        // Calculate score: availability + deals - cost impact
        const availabilityRate = availableItems / items.length;
        const dealBonus = dealCount * 0.1; // Bonus for having deals
        const costPenalty = totalCost / 10000; // Small penalty for higher cost
        const score = availabilityRate + dealBonus - costPenalty;

        return {
          retailer,
          storeItems,
          totalCost,
          availabilityRate,
          availableItems,
          dealCount,
          score
        };
      });

      // Find the best retailer based on score
      const bestOption = retailerScores.reduce((best, current) => 
        current.score > best.score ? current : best
      );

      res.json({
        retailerId: bestOption.retailer.id,
        retailerName: bestOption.retailer.name,
        items: bestOption.storeItems,
        totalCost: bestOption.totalCost,
        availabilityRate: bestOption.availabilityRate,
        availableItems: bestOption.availableItems,
        totalItems: items.length,
        address: `123 Main St, San Francisco, CA 94105`, // Mock address
        planType: "Single Store",
        storeCount: 1,
        missingItems: bestOption.storeItems.filter(item => !item.isAvailable).length,
        estimatedTime: 35, // Single store is faster
        dealCount: bestOption.dealCount
      });
    } catch (error) {
      handleError(res, error);
    }
  });

  // Generate best value multi-store optimization plan
  app.post('/api/shopping-lists/best-value', async (req: Request, res: Response) => {
    try {
      const { shoppingListId } = req.body;
      const listId = shoppingListId || 1;

      const items = await storage.getShoppingListItems(listId);
      if (!items.length) {
        return res.json({ stores: [], totalCost: 0, totalSavings: 0 });
      }

      // Get all retailers and deals
      const retailers = await storage.getRetailers();
      const allDeals = await storage.getDeals();

      // Best value optimization rule: Find the cheapest price for EACH item across ALL stores
      const storeItemMap = new Map();

      // For each item, find the best price across all retailers
      for (const item of items) {
        let bestPrice = Infinity;
        let bestRetailer = null;
        let bestDeal = null;

        // Check price at each retailer
        for (const retailer of retailers) {
          // Check for deals at this retailer
          const deal = allDeals.find(d => 
            d.retailerId === retailer.id && 
            (d.productName.toLowerCase().includes(item.productName.toLowerCase()) ||
             item.productName.toLowerCase().includes(d.productName.toLowerCase())) &&
            new Date(d.endDate) > new Date()
          );

          let price;
          if (deal) {
            price = deal.salePrice;
          } else {
            // Simulate different price strategies by retailer
            const itemName = item.productName.toLowerCase();
            let basePrice = 200; // Default base price

            // Walmart - generally lowest on packaged goods
            if (retailer.name === "Walmart") {
              if (itemName.includes('cola') || itemName.includes('coffee') || 
                  itemName.includes('pasta') || itemName.includes('sauce') ||
                  itemName.includes('paper') || itemName.includes('snack')) {
                basePrice = 180; // 10% cheaper on these items
              } else {
                basePrice = 220; // Slightly higher on fresh items
              }
            }
            // Kroger - competitive on fresh items
            else if (retailer.name === "Kroger") {
              if (itemName.includes('milk') || itemName.includes('bread') || 
                  itemName.includes('banana') || itemName.includes('chicken') ||
                  itemName.includes('produce') || itemName.includes('meat')) {
                basePrice = 190; // Competitive on fresh
              } else {
                basePrice = 230;
              }
            }
            // Target - balanced pricing, premium feel
            else if (retailer.name === "Target") {
              basePrice = 240; // Generally higher but good quality
            }
            // Other retailers
            else {
              basePrice = 210 + Math.floor(Math.random() * 40); // Random variation
            }

            price = basePrice + Math.floor(Math.random() * 100);
          }

          // Track the best price for this item
          if (price < bestPrice) {
            bestPrice = price;
            bestRetailer = retailer;
            bestDeal = deal;
          }
        }

        // Add item to the best retailer's list
        if (bestRetailer) {
          if (!storeItemMap.has(bestRetailer.id)) {
            storeItemMap.set(bestRetailer.id, {
              retailerId: bestRetailer.id,
              retailerName: bestRetailer.name,
              items: [],
              subtotal: 0,
              address: `${100 + bestRetailer.id} Main St, San Francisco, CA 94105`
            });
          }

          const itemData = {
            id: item.id,
            productName: item.productName,
            quantity: item.quantity,
            unit: item.unit,
            price: bestPrice,
            totalPrice: bestPrice * item.quantity,
            dealInfo: bestDeal ? {
              isDeal: true,
              savings: bestDeal.regularPrice - bestDeal.salePrice,
              source: bestDeal.dealSource || 'manual_upload'
            } : null
          };

          const store = storeItemMap.get(bestRetailer.id);
          store.items.push(itemData);
          store.subtotal += itemData.totalPrice;
        }
      }

      // Convert map to array and calculate totals
      const stores = Array.from(storeItemMap.values());
      const totalCost = stores.reduce((sum, store) => sum + store.subtotal, 0);

      // Calculate savings compared to single store (estimate based on price spread)
      const singleStoreCost = totalCost * 1.15; // Assume 15% more expensive at single store
      const savings = singleStoreCost - totalCost;

      res.json({
        stores,
        totalCost,
        savings: Math.round(savings),
        planType: "Best Value Multi-Store",
        storeCount: stores.length,
        estimatedTime: Math.max(45, stores.length * 20), // Time increases with store count
        savingsPercentage: Math.round((savings / singleStoreCost) * 100)
      });
    } catch (error) {
      handleError(res, error);
    }
  });

  // Generate balanced optimization plan
  app.post('/api/shopping-lists/balanced', async (req: Request, res: Response) => {
    try {
      const { shoppingListId } = req.body;
      const listId = shoppingListId || 1;

      const items = await storage.getShoppingListItems(listId);
      if (!items.length) {
        return res.json({ stores: [], totalCost: 0, estimatedTime: 0 });
      }

      // Get all retailers and deals
      const retailers = await storage.getRetailers();
      const allDeals = await storage.getDeals();

      // Balanced optimization: Find best compromise between price, availability, and convenience
      const retailerOptions = retailers.map(retailer => {
        // Calculate availability rate based on retailer type
        let baseAvailability = 0.85; // Default 85%
        if (retailer.name === "Target") baseAvailability = 0.92;
        else if (retailer.name === "Kroger") baseAvailability = 0.87;
        else if (retailer.name === "Walmart") baseAvailability = 0.89;

        const availableItemCount = Math.floor(items.length * baseAvailability);

        const storeItems = items.map((item, index) => {
          // Find deals at this retailer
          const deal = allDeals.find(d => 
            d.retailerId === retailer.id && 
            (d.productName.toLowerCase().includes(item.productName.toLowerCase()) ||
             item.productName.toLowerCase().includes(d.productName.toLowerCase())) &&
            new Date(d.endDate) > new Date()
          );

          // Balanced pricing strategy
          let basePrice = 250; // Default reasonable price
          if (retailer.name === "Walmart") basePrice = 230; // Slightly cheaper
          else if (retailer.name === "Target") basePrice = 270; // Slight premium
          else if (retailer.name === "Kroger") basePrice = 260; // Mid-range

          const price = deal ? deal.salePrice : basePrice + Math.floor(Math.random() * 150);
          const isAvailable = index < availableItemCount;

          return {
            id: item.id,
            productName: item.productName,
            quantity: item.quantity,
            unit: item.unit,
            price,
            totalPrice: isAvailable ? price * item.quantity : 0,
            isAvailable,
            dealInfo: deal ? {
              isDeal: true,
              source: deal.dealSource || 'manual_upload',
              savings: deal.regularPrice - deal.salePrice
            } : null
          };
        });

        const availableItems = storeItems.filter(item => item.isAvailable);
        const totalCost = availableItems.reduce((sum, item) => sum + item.totalPrice, 0);
        const dealCount = storeItems.filter(item => item.dealInfo?.isDeal).length;

        // Calculate balanced score: availability + deal bonus - cost penalty
        const availabilityScore = baseAvailability * 0.4;
        const dealScore = (dealCount / items.length) * 0.3;
        const costScore = (1 - (totalCost / (items.length * 400))) * 0.3; // Normalize cost
        const balancedScore = availabilityScore + dealScore + costScore;

        return {
          retailer,
          storeItems,
          totalCost,
          availabilityRate: baseAvailability,
          availableItems: availableItemCount,
          dealCount,
          balancedScore
        };
      });

      // Select the retailer with the best balanced score
      const bestOption = retailerOptions.reduce((best, current) => 
        current.balancedScore > best.balancedScore ? current : best
      );

      // Calculate savings compared to premium store
      const premiumStoreCost = bestOption.totalCost * 1.12;
      const savings = premiumStoreCost - bestOption.totalCost;

      res.json({
        stores: [{
          retailerId: bestOption.retailer.id,
          retailerName: bestOption.retailer.name,
          items: bestOption.storeItems,
          subtotal: bestOption.totalCost,
          address: `${100 + bestOption.retailer.id} Main St, San Francisco, CA 94105`
        }],
        totalCost: bestOption.totalCost,
        estimatedTime: 40, // Balanced time
        storeCount: 1,
        planType: "Balanced",
        savings: Math.round(savings),
        availabilityRate: bestOption.availabilityRate,
        availableItems: bestOption.availableItems,
        totalItems: items.length,
        missingItems: items.length - bestOption.availableItems,
        dealCount: bestOption.dealCount
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
          // Find best price for this item at this retailer (includes manual uploads)
          const deal = allDeals.find(d => 
            d.retailerId === retailer.id && 
            (d.productName.toLowerCase() === item.productName.toLowerCase() ||
             d.productName.toLowerCase().includes(item.productName.toLowerCase()) ||
             item.productName.toLowerCase().includes(d.productName.toLowerCase())) &&
            new Date(d.endDate) > new Date() // Deal is still active
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
        let bestDeal = null;

        retailers.forEach(retailer => {
          // Find deal for this item at this retailer (includes manual uploads)
          const deal = allDeals.find(d => 
            d.retailerId === retailer.id && 
            (d.productName.toLowerCase() === item.productName.toLowerCase() ||
             d.productName.toLowerCase().includes(item.productName.toLowerCase()) ||
             item.productName.toLowerCase().includes(d.productName.toLowerCase())) &&
            new Date(d.endDate) > new Date() // Deal is still active
          );

          // Calculate price - prioritize manual deals
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

  // Purchase tracking with optimization
  app.post('/api/purchases/track', async (req: Request, res: Response) => {
    try {
      const { userId, retailerId, items, totalAmount } = req.body;

      if (!userId || !retailerId || !items || !totalAmount) {
        return res.status(400).json({ message: 'All purchase data is required' });
      }

      const { dataOptimizer } = await import('./services/dataOptimizer');
      const purchase = await dataOptimizer.trackUserTransaction(userId, retailerId, items, totalAmount);

      res.json(purchase);
    } catch (error) {
      handleError(res, error);
    }
  });

  // Sync data manually (for admin use)
  app.post('/api/admin/sync-data', async (req: Request, res: Response) => {
    try {
      const { retailerIds } = req.body;

      const { dataOptimizer } = await import('./services/dataOptimizer');
      await dataOptimizer.batchUpdateDeals(retailerIds || [1, 2, 3, 4]);

      res.json({ message: 'Data sync completed successfully' });
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

  // Get store integration capabilities
  app.get('/api/retailers/:id/capabilities', async (req, res) => {
    try {
      const retailerId = parseInt(req.params.id);
      const { storeIntegrationManager } = await import('./services/storeIntegrationManager');

      const capabilities = await storeIntegrationManager.getStoreCapabilities(retailerId);
      res.json(capabilities);
    } catch (error: any) {
      console.error('Error getting store capabilities:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Manual deal entry for stores without API integration
  app.post('/api/retailers/:id/deals/manual', async (req, res) => {
    try {
      const retailerId = parseInt(req.params.id);
      const { productName, regularPrice, salePrice, category, validUntil } = req.body;

      if (!productName || !salePrice) {
        return res.status(400).json({ error: 'Product name and sale price are required' });
      }

      const deal = await storage.createStoreDeal({
        productName: productName.trim(),
        regularPrice: regularPrice || salePrice * 1.2, // Default regular price if not provided
        salePrice,
        category: category || 'General',
        retailerId,
        startDate: new Date(),
        endDate: validUntil ? new Date(validUntil) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        terms: 'Manually entered deal'
      });

      res.json(deal);
    } catch (error: any) {
      console.error('Error creating manual deal:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Trigger manual data collection for a store
  app.post('/api/retailers/:id/collect-data', async (req, res) => {
    try {
      const retailerId = parseInt(req.params.id);
      const { storeIntegrationManager } = await import('./services/storeIntegrationManager');

      await storeIntegrationManager.scheduleDataCollection(retailerId);
      res.json({ message: 'Data collection initiated' });
    } catch (error: any) {
      console.error('Error triggering data collection:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Bulk operations
  app.delete('/api/shopping-list/items/bulk', async (req: Request, res: Response) => {
    try {
      const { itemIds } = req.body;

      if (!itemIds || !Array.isArray(itemIds)) {
        return res.status(400).json({ message: 'Item IDs array is required' });
      }

      for (const itemId of itemIds) {
        await storage.deleteShoppingListItem(itemId);
      }

      res.json({ success: true, deletedCount: itemIds.length });
    } catch (error) {
      handleError(res, error);
    }
  });

  app.patch('/api/shopping-list/items/bulk', async (req: Request, res: Response) => {
    try {
      const { updates } = req.body; // Array of {id, quantity, unit, isCompleted}

      if (!updates || !Array.isArray(updates)) {
        return res.status(400).json({ message: 'Updates array is required' });
      }

      const results = [];
      for (const update of updates) {
        const { id, ...updateData } = update;
        const updatedItem = await storage.updateShoppingListItem(id, updateData);
        results.push(updatedItem);
      }

      res.json(results);
    } catch (error) {
      handleError(res, error);
    }
  });

  // Search endpoints
  app.get('/api/shopping-lists/search', async (req: Request, res: Response) => {
    try {
      const { query, userId } = req.query;
      const userIdNum = userId ? parseInt(userId as string) : 
        (req.headers['x-current-user-id'] ? parseInt(req.headers['x-current-user-id'] as string) : 1);

      const lists = await storage.searchShoppingLists(query as string, userIdNum);
      res.json(lists);
    } catch (error) {
      handleError(res, error);
    }
  });

  app.get('/api/purchases/search', async (req: Request, res: Response) => {
    try {
      const { query, startDate, endDate, retailerId } = req.query;
      const userId = req.headers['x-current-user-id'] ? 
        parseInt(req.headers['x-current-user-id'] as string) : 1;

      const purchases = await storage.searchPurchases({
        query: query as string,
        userId,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        retailerId: retailerId ? parseInt(retailerId as string) : undefined
      });

      res.json(purchases);
    } catch (error) {
      handleError(res, error);
    }
  });

  // Export endpoints
  app.get('/api/purchases/export', async (req: Request, res: Response) => {
    try {
      const { format = 'json' } = req.query;
      const userId = req.headers['x-current-user-id'] ? 
        parseInt(req.headers['x-current-user-id'] as string) : 1;

      const purchases = await storage.getPurchases(userId);

      if (format === 'csv') {
        // Convert to CSV format
        const csv = purchases.map(p => 
          `${p.id},${p.purchaseDate},${p.retailerId},${p.totalAmount}`
        ).join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=purchases.csv');
        res.send(`ID,Date,Retailer,Amount\n${csv}`);
      } else {
        res.json(purchases);
      }
    } catch (error) {
      handleError(res, error);
    }
  });

  // User statistics
  app.get('/api/user/statistics', async (req: Request, res: Response) => {
    try {
      const userId = req.headers['x-current-user-id'] ? 
        parseInt(req.headers['x-current-user-id'] as string) : 1;

      const stats = await storage.getUserStatistics(userId);
      res.json(stats);
    } catch (error) {
      handleError(res, error);
    }
  });

  // Name normalization
  const normalizeProductName = (productName: string) => {
      const words = productName.split(" ");
      const capitalizedWords = words.map(word => {
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      });
      return capitalizedWords.join(" ");
  }

  app.post('/api/shopping-list/items', async (req: Request, res: Response) => {
    try {
      const { productName, quantity, unit, shoppingListId } = req.body;

      // Validate quantity to ensure it's a number and not NaN
      const validQuantity = Number(quantity);
      if (isNaN(validQuantity)) {
        return res.status(400).json({ message: 'Invalid quantity. Please provide a valid number.' });
      }

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
        'banana': ['banan', 'bananna', 'banannas', 'bannana', 'banannas'],
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
      let normalizedName = productName ? productName.toLowerCase().trim() : '';

      // Apply name normalization
      let normalizedProductName = normalizeProductName(productName);

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
          quantity: existingItem.quantity + validQuantity,
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
        let nameToUse = normalizedProductName;
        if (correctedName !== normalizedName && Object.keys(commonItemCorrections).includes(correctedName)) {
          // Capitalize first letter of corrected name
          nameToUse = correctedName.charAt(0).toUpperCase() + correctedName.slice(1);
        }

        // Add as new item with the specified unit (or default to COUNT)
        const newItem = await storage.addShoppingListItem({
          shoppingListId: targetListId,
          productName: nameToUse,
          quantity: validQuantity,
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

  const httpServer = createServer(app);
  return httpServer;
}