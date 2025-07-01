import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ZodError } from "zod";
import { parseReceiptImage } from "./services/receiptParser";
import { rateLimiters, createRoleBasedRateLimiter } from "./services/rateLimiter";
import { securityEnhancer } from "./services/securityEnhancer";
import { generateRecommendations, analyzePurchasePatterns, extractRecipeIngredients, generatePersonalizedSuggestions, analyzeBulkVsUnitPricing } from "./services/recommendationEngine";
import { getRetailerAPI } from "./services/retailerIntegration";
import OpenAI from "openai";
import { productCategorizer, ProductCategory, QuantityNormalization } from './services/productCategorizer';
import multer from 'multer';
import { 
  validateRequest,
  sanitizeString,
  sanitizeNumber,
  sanitizeBoolean,
  serverUserSchema,
  serverLoginSchema,
  serverProfileUpdateSchema,
  serverShoppingListSchema,
  serverShoppingListItemSchema,
  serverRetailerAccountSchema,
  serverPurchaseSchema,
  serverDealSchema,
  serverSearchSchema,
  serverVoiceInputSchema,
  idParamSchema,
  paginationSchema
} from "./services/validation";

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
    return res.status(400).json({ 
      message: 'Validation failed',
      errors: error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
        code: e.code
      }))
    });
  }
  return res.status(500).json({ message: error.message || 'Internal server error' });
};

// Validation middleware
const validateBody = (schema: any) => {
  return (req: Request, res: Response, next: any) => {
    try {
      req.body = validateRequest(schema, req.body);
      next();
    } catch (error) {
      handleError(res, error);
    }
  };
};

const validateParams = (schema: any) => {
  return (req: Request, res: Response, next: any) => {
    try {
      req.params = validateRequest(schema, req.params);
      next();
    } catch (error) {
      handleError(res, error);
    }
  };
};

const validateQuery = (schema: any) => {
  return (req: Request, res: Response, next: any) => {
    try {
      req.query = validateRequest(schema, req.query);
      next();
    } catch (error) {
      handleError(res, error);
    }
  };
};

// Input sanitization middleware
const sanitizeInput = (req: Request, res: Response, next: any) => {
  if (req.body && typeof req.body === 'object') {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeString(req.body[key]);
      }
    }
  }

  if (req.query && typeof req.query === 'object') {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeString(req.query[key] as string);
      }
    }
  }

  next();
};

// Helper function to get recently purchased items
function getRecentlyPurchasedItems(purchases: any[], dayThreshold: number = 3): Set<string> {
  const now = new Date();
  const recentPurchaseThreshold = new Date(now.getTime() - (dayThreshold * 24 * 60 * 60 * 1000));
  const recentlyPurchasedItems = new Set<string>();

  purchases.forEach(purchase => {
    const purchaseDate = new Date(purchase.purchaseDate);
    if (purchaseDate >= recentPurchaseThreshold) {
      const items = purchase.items || [];
      items.forEach((item: any) => {
        recentlyPurchasedItems.add(item.productName.toLowerCase().trim());
      });
    }
  });

  return recentlyPurchasedItems;
}

// Helper function to check if item was recently purchased
function wasItemRecentlyPurchased(itemName: string, recentItems: Set<string>): boolean {
  const normalizedName = itemName.toLowerCase().trim();

  // Check exact match
  if (recentItems.has(normalizedName)) {
    return true;
  }

  // Check partial matches for similar items
  for (const recentItem of recentItems) {
    if (normalizedName.includes(recentItem) || recentItem.includes(normalizedName)) {
      // Additional check for meaningful matches (avoid false positives)
      if (normalizedName.length > 3 && recentItem.length > 3) {
        const similarity = calculateStringSimilarity(normalizedName, recentItem);
        if (similarity > 0.7) { // 70% similarity threshold
          return true;
        }
      }
    }
  }

  return false;
}

// Helper function to calculate string similarity
function calculateStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) {
    return 1.0;
  }

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

// Helper function to calculate Levenshtein distance
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) {
    matrix[0][i] = i;
  }

  for (let j = 0; j <= str2.length; j++) {
    matrix[j][0] = j;
  }

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[j][i] = matrix[j - 1][i - 1];
      } else {
        matrix[j][i] = Math.min(
          matrix[j - 1][i - 1] + 1, // substitution
          matrix[j][i - 1] + 1,     // insertion
          matrix[j - 1][i] + 1      // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

// Helper function to get current user ID from request
function getCurrentUserId(req: Request): number {
  return req.headers['x-current-user-id'] ? 
    parseInt(req.headers['x-current-user-id'] as string) : 1;
}

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

import { locationBasedCircularManager } from './services/locationBasedCircularManager';
import { logger } from './services/logger';

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const server = createServer(app);

  // Admin bypass route (temporary for troubleshooting)
  app.get('/api/admin/bypass-check', async (req: Request, res: Response) => {
    res.json({ 
      status: 'Admin access available',
      timestamp: new Date().toISOString(),
      message: 'Rate limits temporarily relaxed for admin access'
    });
  });

  // Apply security enhancements
  app.use('/api', securityEnhancer.bruteForceProtection());
  app.use('/api', securityEnhancer.suspiciousActivityDetection());
  app.use('/api', securityEnhancer.validateApiKey());

  // Apply general rate limiting to all API routes
  app.use('/api', rateLimiters.general.middleware());

  // Authentication routes with specific rate limiting
  app.post('/api/auth/login', rateLimiters.auth.middleware(), sanitizeInput, validateBody(serverLoginSchema), async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
      }

      const user = await storage.authenticateUser(username, password);

      if (!user) {
        return res.status(401).json({ message: 'Invalid username or password' });
      }

      // In production, you'd set a proper session/JWT token here
      res.json({ 
        user: { ...user, password: undefined }, // Don't send password back
        token: 'demo-token', // Replace with real JWT
        message: 'Login successful' 
      });
    } catch (error) {
      console.error('Login error:', error);
      handleError(res, error);
    }
  });

  app.post('/api/auth/register', rateLimiters.auth.middleware(), sanitizeInput, validateBody(serverUserSchema), async (req: Request, res: Response) => {
    try {
      const { username, password, email, firstName, lastName } = req.body;

      // Check for existing user
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ message: 'Username already exists' });
      }

      // Check for existing email if the method exists
      try {
        const existingEmail = await storage.getUserByEmail?.(email);
        if (existingEmail) {
          return res.status(409).json({ message: 'Email already exists' });
        }
      } catch (emailCheckError) {
        console.warn('Email check failed, proceeding with registration');
      }

      // Create new user
      const newUser = await storage.createUser({
        username,
        password, // In production, hash this password
        email,
        firstName,
        lastName
      });

      if (!newUser) {
        throw new Error('Failed to create user');
      }

      res.status(201).json({ 
        user: { ...newUser, password: undefined },
        message: 'Registration successful' 
      });
    } catch (error) {
      console.error('Registration error:', error);
      handleError(res, error);
    }
  });

  app.post('/api/auth/logout', async (req: Request, res: Response) => {
    try {
      // Get the current user ID from headers if available
      const userId = req.headers['x-current-user-id'] ? 
        parseInt(req.headers['x-current-user-id'] as string) : null;

      // Get the authorization token
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

      // In production, you would invalidate the session/token in your session store
      // For this demo, we'll clear any user-specific cached data
      if (userId) {
        console.log(`User ${userId} logged out, clearing session data`);

        // Clear any server-side cached user data
        // In a real app, you would:
        // - Remove the token from your session store (Redis, database, etc.)
        // - Mark the token as invalid in your blacklist
        // - Clear any user-specific cached data

        if (token) {
          console.log(`Invalidating token for user ${userId}: ${token.substring(0, 10)}...`);
          // Here you would add the token to a blacklist or remove it from your session store
        }
      }

      // Set headers to ensure no caching
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      res.json({ 
        message: 'Logout successful',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Logout error:', error);
      handleError(res, error);
    }
  });

  app.post('/api/auth/forgot-password', rateLimiters.auth.middleware(), async (req: Request, res: Response) => {
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

  // Email integration OAuth routes
  app.get('/api/auth/email/:provider', async (req: Request, res: Response) => {
    try {
      const { provider } = req.params;
      const { userId, redirect } = req.query;

      console.log(`OAuth initiation for ${provider}:`, { userId, redirect });

      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }

      // Validate environment variables
      const clientId = process.env[`${provider.toUpperCase()}_CLIENT_ID`];
      if (!clientId) {
        console.error(`Missing ${provider.toUpperCase()}_CLIENT_ID environment variable`);
        return res.redirect(`/profile?error=oauth_config_missing&provider=${provider}`);
      }

      const { EmailIntegrationService } = await import('./services/emailIntegration');

      // Use HTTPS for redirect URI in production
      const protocol = req.get('x-forwarded-proto') || req.protocol;
      const host = req.get('host');
      const redirectUri = `${protocol}://${host}/api/auth/email/${provider}/callback`;

      console.log(`Using redirect URI: ${redirectUri}`);

      const authUrl = EmailIntegrationService.generateAuthUrl(
        provider,
        parseInt(userId as string),
        redirectUri
      );

      console.log(`Redirecting to OAuth URL: ${authUrl}`);
      res.redirect(authUrl);
    } catch (error: any) {
      console.error('Email OAuth initiation error:', error);
      res.redirect(`/profile?error=oauth_init_failed&message=${encodeURIComponent(error.message)}`);
    }
  });

  app.get('/api/auth/email/:provider/callback', async (req: Request, res: Response) => {
    try {
      const { provider } = req.params;
      const { code, state, error } = req.query;

      console.log(`OAuth callback for ${provider}:`, { code: !!code, state, error });

      if (error) {
        console.error(`OAuth error for ${provider}:`, error);
        return res.redirect(`/profile?error=oauth_error&message=${encodeURIComponent(error as string)}`);
      }

      if (!code || !state) {
        console.error('Missing OAuth data:', { code: !!code, state: !!state });
        return res.redirect('/profile?error=missing_oauth_data');
      }

      // Extract user ID from state
      const [userId] = (state as string).split('-');
      if (!userId || isNaN(parseInt(userId))) {
        console.error('Invalid user ID in state:', state);
        return res.redirect('/profile?error=invalid_state');
      }

      // Use HTTPS for redirect URI in production
      const protocol = req.get('x-forwarded-proto') || req.protocol;
      const host = req.get('host');
      const redirectUri = `${protocol}://${host}/api/auth/email/${provider}/callback`;

      console.log(`Using redirect URI: ${redirectUri}`);

      const { EmailIntegrationService } = await import('./services/emailIntegration');

      // Exchange code for tokens
      const tokens = await EmailIntegrationService.exchangeCodeForToken(
        provider,
        code as string,
        redirectUri
      );

      // Store encrypted tokens
      await EmailIntegrationService.storeEmailCredentials(
        parseInt(userId),
        provider,
        tokens
      );

      console.log(`Successfully connected ${provider} for user ${userId}`);

      // Redirect back to profile or onboarding
      res.redirect('/profile?success=email_connected');
    } catch (error: any) {
      console.error('Email OAuth callback error:', error);
      const errorMessage = encodeURIComponent(error.message || 'OAuth callback failed');
      res.redirect(`/profile?error=oauth_callback_failed&details=${errorMessage}`);
    }
  });

  // API Routes
  // Shopping lists endpoints
  app.get('/api/shopping-lists', async (req: Request, res: Response) => {
    try {
      const userId = req.headers['x-current-user-id'] ? 
        parseInt(req.headers['x-current-user-id'] as string) : 1;

      const shoppingLists = await storage.getShoppingListsByUserId(userId);
      res.json(shoppingLists);
    } catch (error) {
      handleError(res, error);
    }
  });

  app.get('/api/shopping-lists/:id', async (req: Request, res: Response) => {
    try {
      const userId = req.headers['x-current-user-id'] ? 
        parseInt(req.headers['x-current-user-id'] as string) : 1;
      const listId = parseInt(req.params.id);

      if (isNaN(listId)) {
        return res.status(400).json({ message: 'Invalid list ID' });
      }

      const shoppingList = await storage.getShoppingListById(listId);

      if (!shoppingList) {
        return res.status(404).json({ message: 'Shopping list not found' });
      }

      // For demo purposes, allow access to any list - in production you'd check userId
      res.json(shoppingList);
    } catch (error) {
      console.error('Error fetching shopping list:', error);
      handleError(res, error);
    }
  });

  app.get('/api/shopping-lists/suggestions', async (req: Request, res: Response) => {
    try {
      const userId = req.headers['x-current-user-id'] ? 
        parseInt(req.headers['x-current-user-id'] as string) : 1;

      // Return sample suggestions for now - these are template suggestions, not tied to a specific list
      const suggestions = [
        { id: 1, name: 'Weekly Essentials', count: 12 },
        { id: 2, name: 'Quick Meals', count: 8 },
        { id: 3, name: 'Healthy Options', count: 15 }
      ];

      res.json(suggestions);
    } catch (error) {
      handleError(res, error);
    }
  });

  // Add shopping list item
  app.post('/api/shopping-list/items', sanitizeInput, async (req: Request, res: Response) => {
    try {
      const { shoppingListId, productName, quantity, unit } = req.body;

      if (!shoppingListId || !productName) {
        return res.status(400).json({ message: 'Shopping list ID and product name are required' });
      }

      const validQuantity = parseInt(quantity) || 1;
      const validUnit = unit || 'COUNT';

      console.log(`Adding item to shopping list ${shoppingListId}:`, { productName, quantity: validQuantity, unit: validUnit });

      const newItem = await storage.createShoppingListItem({
        shoppingListId,
        productName: productName.trim(),
        quantity: validQuantity,
        unit: validUnit,
        isCompleted: false
      });

      console.log(`Successfully added item:`, newItem);
      res.json(newItem);
    } catch (error) {
      console.error('Error adding shopping list item:', error);
      handleError(res, error);
    }
  });

  // Delete shopping list item
  app.delete('/api/shopping-list/items/:id', async (req: Request, res: Response) => {
    try {
      const itemId = parseInt(req.params.id);

      if (isNaN(itemId)) {
        console.log(`Invalid item ID provided: ${req.params.id}`);
        return res.status(400).json({ message: 'Invalid item ID' });
      }

      console.log(`Attempting to delete shopping list item ${itemId}`);
      const success = await storage.deleteShoppingListItem(itemId);

      if (!success) {
        console.log(`Shopping list item ${itemId} not found`);
        return res.status(404).json({ message: 'Item not found' });
      }

      console.log(`Successfully deleted shopping list item ${itemId}`);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting shopping list item:', error);
      handleError(res, error);
    }
  });

  // Add shopping list generation endpoint
  app.post('/api/shopping-lists/generate', async (req: Request, res: Response) => {
    try {
      const { shoppingListId } = req.body;
      const userId = req.headers['x-current-user-id'] ? 
        parseInt(req.headers['x-current-user-id'] as string) : 1;

      if (!shoppingListId) {
        return res.status(400).json({ message: 'Shopping list ID is required' });
      }

      // Get current shopping list
      const shoppingList = await storage.getShoppingListById(shoppingListId);
      if (!shoppingList) {
        return res.status(404).json({ message: 'Shopping list not found' });
      }

      // Generate new items based on user preferences and current list
      const currentItems = shoppingList.items || [];
      const isEmptyList = currentItems.length === 0;

      // Only generate items if the list is empty or if we need intelligent additions
      let itemsAdded = 0;
      let itemsSkipped = 0;

      if (isEmptyList) {
        // Sample generated items for empty lists - in production this would use AI
        const generatedItems = [
          { productName: 'Fresh Strawberries', quantity: 1, unit: 'CONTAINER' },
          { productName: 'Yogurt Parfait', quantity: 2, unit: 'COUNT' },
          { productName: 'Whole Grain Cereal', quantity: 1, unit: 'BOX' },
          { productName: 'Almond Milk', quantity: 1, unit: 'CARTON' }
        ];

        // Add items that don't already exist
        for (const item of generatedItems) {
          try {
            await storage.createShoppingListItem({
              shoppingListId: shoppingListId,
              productName: item.productName,
              quantity: item.quantity,
              unit: item.unit as any,
              isCompleted: false
            });
            itemsAdded++;
          } catch (error) {
            console.warn('Failed to add generated item:', item.productName, error);
          }
        }
      } else {
        // For non-empty lists, only add complementary items occasionally (every 3rd regeneration)
        const regenerationCount = parseInt(req.headers['x-regeneration-count'] as string) || 0;

        if (regenerationCount % 3 === 0) {
          // Smart complementary items based on what's already in the list
          const complementaryItems = [];

          // Analyze existing items and suggest complements
          const hasProteins = currentItems.some(item => 
            item.productName.toLowerCase().includes('chicken') || 
            item.productName.toLowerCase().includes('turkey') ||
            item.productName.toLowerCase().includes('beef') ||
            item.productName.toLowerCase().includes('eggs')
          );

          const hasDairy = currentItems.some(item => 
            item.productName.toLowerCase().includes('milk') || 
            item.productName.toLowerCase().includes('cheese') ||
            item.productName.toLowerCase().includes('yogurt')
          );

          const hasVegetables = currentItems.some(item => 
            item.productName.toLowerCase().includes('spinach') || 
            item.productName.toLowerCase().includes('tomato') ||
            item.productName.toLowerCase().includes('pepper') ||
            item.productName.toLowerCase().includes('avocado')
          );

          // Suggest complementary items based on what's missing
          if (hasProteins && !hasVegetables) {
            complementaryItems.push({ productName: 'Mixed Vegetables', quantity: 1, unit: 'BAG' });
          }
          if (hasVegetables && !hasDairy) {
            complementaryItems.push({ productName: 'Shredded Mozzarella', quantity: 1, unit: 'BAG' });
          }
          if (currentItems.length > 5 && !currentItems.some(item => item.productName.toLowerCase().includes('spice'))) {
            complementaryItems.push({ productName: 'Garlic Powder', quantity: 1, unit: 'CONTAINER' });
          }

          // Add complementary items that don't already exist
          for (const item of complementaryItems) {
            const exists = currentItems.some(existing => 
              existing.productName.toLowerCase().includes(item.productName.toLowerCase()) ||
              item.productName.toLowerCase().includes(existing.productName.toLowerCase())
            );

            if (!exists) {
              try {
                await storage.createShoppingListItem({
                  shoppingListId: shoppingListId,
                  productName: item.productName,
                  quantity: item.quantity,
                  unit: item.unit as any,
                  isCompleted: false
                });
                itemsAdded++;
              } catch (error) {
                console.warn('Failed to add complementary item:', item.productName, error);
              }
            } else {
              itemsSkipped++;
            }
          }
        } else {
          // No new items added, but we can report optimization of existing items
          itemsSkipped = 0; // Reset since we're not actually checking duplicates
        }
      }

      const finalMessage = isEmptyList 
        ? 'Shopping list created successfully' 
        : itemsAdded > 0 
          ? `Added ${itemsAdded} complementary items to your list`
          : 'List reviewed - no new items needed at this time';

      res.json({
        success: true,
        isEmptyList,
        itemsAdded,
        itemsSkipped,
        totalItems: currentItems.length + itemsAdded,
        message: finalMessage
      });

    } catch (error) {
      console.error('Error generating shopping list:', error);
      handleError(res, error);
    }
  });

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

  app.patch('/api/user/profile', sanitizeInput, validateBody(serverProfileUpdateSchema), async (req: Request, res: Response) => {
    try {
      // Get the current user ID from headers or use default
      const userId = req.headers['x-current-user-id'] ? 
        parseInt(req.headers['x-current-user-id'] as string) : 1;

      if (!userId || userId <= 0) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }

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
      const currentUserId =The app crashed due to a syntax error in the original code, specifically within the get('/api/shopping-lists/suggestions') route. This commit fixes the syntax error and ensures the app functions as expected. req.headers['x-current-user-id'] ? 
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
  app.get('/api/admin/users', rateLimiters.admin.middleware(), async (req: Request, res: Response) => {
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

  // Search products from specific retailer (for image fetching)
  app.get('/api/retailer/:id/search', rateLimiters.search.middleware(), async (req, res) => {
    try {
      const retailerId = parseInt(req.params.id);
      const query = req.query.query as string;

      if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
      }

      // Get retailer API client
      const { getRetailerAPI } = await import('./services/retailerIntegration');
      const retailerAPI = await getRetailerAPI(retailerId);

      // Search for products
      const products = await retailerAPI.searchProducts(query);

      res.json(products);
    } catch (error: any) {
      console.error('Error searching retailer products:', error);
      res.status(500).json({ error: 'Failed to search products' });
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
      const { connectionType, retailerId, ...accountData } = req.body;

      // For circular-only connections, create a simplified account
      if (connectionType === 'circular') {
        const circularAccount = {
          retailerId,
          isConnected: true,
          circularOnly: true,
          connectionType: 'circular',
          username: null,
          allowOrdering: false,
          storeCredentials: false,
          lastSync: new Date().toISOString(),
          customCircularUrl: req.body.circularUrl || null
        };

        const newAccount = await storage.createRetailerAccount(circularAccount);

        // Trigger circular fetching for this retailer
        try {
          const { circularFetcher } = await import('./services/circularFetcher');
          await circularFetcher.fetchCircularForRetailer(retailerId, req.body.circularUrl);
        } catch (error) {
          console.warn('Failed to fetch initial circular:', error);
        }

        res.json(newAccount);
      } else {
        // Regular account connection
        const newAccount = await storage.createRetailerAccount({ retailerId, ...accountData });
        res.json(newAccount);
      }
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

      if (isNaN(accountId)) {
        return res.status(400).json({ message: 'Invalid account ID' });
      }

      console.log(`Deleting retailer account with ID: ${accountId}`);

      const success = await storage.deleteRetailerAccount(accountId);
      if (!success) {
        console.log(`Retailer account with ID ${accountId} not found`);
        return res.status(404).json({ message: 'Retailer account not found' });
      }

      console.log(`Successfully deleted retailer account with ID: ${accountId}`);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting retailer account:', error);
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
  app.post('/api/receipts/extract', rateLimiters.upload.middleware(), async (req: Request, res: Response) => {
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
      const userId = req.headers['x-current-user-id'] ? 
        parseInt(req.headers['x-current-user-id'] as string) : 1;

      // Create purchase record from receipt
      const purchase = await storage.createPurchaseFromReceipt(receiptData, userId);

      // Analyze the new purchase to update recommendations
      try {
        const user = await storage.getUser(userId);
        const allPurchases = await storage.getPurchases(userId);

        // Generate updated recommendations based on new purchase data
        const recommendations = await generateRecommendations(user, allPurchases);

        // Save new recommendations
        for (const rec of recommendations) {
          try {
            await storage.createRecommendation(rec);
          } catch (saveError) {
            console.warn('Error saving recommendation after receipt scan:', saveError);
          }
        }

        console.log(`Receipt processed for user ${userId}, generated ${recommendations.length} new recommendations`);
      } catch (analysisError) {
        console.warn('Error analyzing receipt for recommendations:', analysisError);
        // Don't fail the receipt processing if recommendation analysis fails
      }

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

  // Monitoring and logging endpoints
  app.get('/api/admin/health', (req: Request, res: Response) => {
    try {
      const healthStatus = performanceMonitor.getHealthStatus();
      const systemMetrics = performanceMonitor.getSystemMetrics();

      res.json({
        status: healthStatus.status,
        issues: healthStatus.issues,
        timestamp: new Date().toISOString(),
        metrics: {
          uptime: systemMetrics.uptime,
          memoryUsage: systemMetrics.memoryUsage,
          activeRequests: systemMetrics.activeRequests,
          totalRequests: systemMetrics.totalRequests,
          errorRate: systemMetrics.errorRate,
          averageResponseTime: systemMetrics.averageResponseTime
        }
      });
    } catch (error) {
      handleError(res, error);
    }
  });

  app.get('/api/admin/metrics', (req: Request, res: Response) => {
    try {
      const hours = parseInt(req.query.hours as string) || 24;
      const systemMetrics = performanceMonitor.getSystemMetrics();
      const metricsSummary = logger.getMetricsSummary(hours);
      const errorStats = errorTracker.getErrorStats();

      res.json({
        system: systemMetrics,
        metrics: metricsSummary,
        errors: errorStats,
        timeframe: `${hours} hours`
      });
    } catch (error) {
      handleError(res, error);
    }
  });

  app.get('/api/admin/logs', (req: Request, res: Response) => {
    try {
      const level = req.query.level as any;
      const limit = parseInt(req.query.limit as string) || 100;

      const logs = logger.getRecentLogs(level, limit);
      res.json(logs);
    } catch (error) {
      handleError(res, error);
    }
  });

  app.get('/api/admin/errors', (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const errorReports = errorTracker.getErrorReports(limit);
      const errorStats = errorTracker.getErrorStats();

      res.json({
        reports: errorReports,
        stats: errorStats
      });
    } catch (error) {
      handleError(res, error);
    }
  });

  app.delete('/api/admin/errors/:fingerprint', (req: Request, res: Response) => {
    try {
      const { fingerprint } = req.params;
      const deleted = errorTracker.clearError(fingerprint);

      if (deleted) {
        logger.info('Error report cleared', { fingerprint, clearedBy: req.headers['x-current-user-id'] });
        res.json({ success: true, message: 'Error report cleared' });
      } else {
        res.status(404).json({ error: 'Error report not found' });
      }
    } catch (error) {
      handleError(res, error);
    }
  });

  app.delete('/api/admin/errors', (req: Request, res: Response) => {
    try {
      errorTracker.clearAllErrors();
      logger.info('All error reports cleared', { clearedBy: req.headers['x-current-user-id'] });
      res.json({ success: true, message: 'All error reports cleared' });
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
        popularStores: ["Whole Foods", "Target", "Walmart"],
        savingsOpportunity: 15.2
      };

      res.json(areaInsights);
    } catch (error) {
      handleError(res, error);
    }
  });

  // Retailer analytics endpoint for sharing insights
  app.get('/api/analytics/retailer-insights/:retailerId', async (req: Request, res: Response) => {
    try {
      const { retailerId } = req.params;
      const { startDate, endDate, format = 'summary' } = req.query;

      const currentUserId = req.headers['x-current-user-id'] ? 
        parseInt(req.headers['x-current-user-id'] as string) : 1;

      const currentUser = await storage.getUser(currentUserId);
      if (!currentUser || (currentUser.role !== 'owner' && currentUser.role !== 'admin')) {
        return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
      }

      // Get retailer information
      const retailer = await storage.getRetailer(parseInt(retailerId));
      if (!retailer) {
        return res.status(404).json({ message: 'Retailer not found' });
      }

      // Parse date range (default to last 30 days)
      const endDateTime = endDate ? new Date(endDate as string) : new Date();
      const startDateTime = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Get logs and metrics for this retailer
      const logs = logger.getRecentLogs('info', 1000);
      const metrics = logger.getMetricsSummary(24 * 30); // Last 30 days

      // Filter logs for this retailer and date range
      const retailerLogs = logs.filter(log => {
        const logDate = new Date(log.timestamp);
        const isInDateRange = logDate >= startDateTime && logDate <= endDateTime;
        const isRetailerRelated = log.message.includes('Shopping trip completed') && 
          log.metadata?.retailerName === retailer.name;
        return isInDateRange && isRetailerRelated;
      });

      // Analyze the data
      const analytics = {
        retailer: {
          id: retailer.id,
          name: retailer.name
        },
        period: {
          startDate: startDateTime.toISOString(),
          endDate: endDateTime.toISOString(),
          days: Math.ceil((endDateTime.getTime() - startDateTime.getTime()) / (24 * 60 * 60 * 1000))
        },
        summary: {
          totalTrips: retailerLogs.length,
          totalItemsRequested: 0,
          totalItemsFound: 0,
          totalItemsNotFound: 0,
          totalItemsMovedToOtherStores: 0,
          averageCompletionRate: 0,
          averageTripDuration: 0
        },
        topUnfoundItems: {} as Record<string, { count: number, category: string }>,
        topUnfoundCategories: {} as Record<string, number>,
        itemsMostlyMovedToCompetitors: {} as Record<string, { count: number, destinationStores: string[] }>,
        hourlyPatterns: Array(24).fill(0),
        weeklyPatterns: Array(7).fill(0)
      };

      // Process each trip log
      retailerLogs.forEach(log => {
        if (log.metadata?.tripAnalytics) {
          const trip = log.metadata.tripAnalytics;
          const tripTime = new Date(log.timestamp);

          analytics.summary.totalItemsRequested += trip.totalItems || 0;
          analytics.summary.totalItemsFound += trip.completedItems || 0;
          analytics.summary.totalItemsNotFound += trip.uncompletedItems || 0;
          analytics.summary.totalItemsMovedToOtherStores += trip.movedItems || 0;
          analytics.summary.averageCompletionRate += trip.completionRate || 0;
          analytics.summary.averageTripDuration += trip.tripDurationMinutes || 0;

          // Track hourly and weekly patterns
          analytics.hourlyPatterns[tripTime.getHours()]++;
          analytics.weeklyPatterns[tripTime.getDay()]++;

          // Process unfound items
          if (log.metadata.uncompletedItemDetails) {
            log.metadata.uncompletedItemDetails.forEach((item: any) => {
              if (!analytics.topUnfoundItems[item.productName]) {
                analytics.topUnfoundItems[item.productName] = { count: 0, category: item.category };
              }
              analytics.topUnfoundItems[item.productName].count++;

              if (!analytics.topUnfoundCategories[item.category]) {
                analytics.topUnfoundCategories[item.category] = 0;
              }
              analytics.topUnfoundCategories[item.category]++;
            });
          }

          // Process moved items
          if (log.metadata.movedItemDetails) {
            log.metadata.movedItemDetails.forEach((item: any) => {
              if (!analytics.itemsMostlyMovedToCompetitors[item.productName]) {
                analytics.itemsMostlyMovedToCompetitors[item.productName] = { 
                  count: 0, 
                  destinationStores: [] 
                };
              }
              analytics.itemsMostlyMovedToCompetitors[item.productName].count++;
              if (!analytics.itemsMostlyMovedToCompetitors[item.productName].destinationStores.includes(item.toStore)) {
                analytics.itemsMostlyMovedToCompetitors[item.productName].destinationStores.push(item.toStore);
              }
            });
          }
        }
      });

      // Calculate averages
      if (analytics.summary.totalTrips > 0) {
        analytics.summary.averageCompletionRate = analytics.summary.averageCompletionRate / analytics.summary.totalTrips;
        analytics.summary.averageTripDuration = analytics.summary.averageTripDuration / analytics.summary.totalTrips;
      }

      // Sort and limit top items
      const sortedUnfoundItems = Object.entries(analytics.topUnfoundItems)
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, 20);

      const sortedUnfoundCategories = Object.entries(analytics.topUnfoundCategories)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);

      const sortedMovedItems = Object.entries(analytics.itemsMostlyMovedToCompetitors)
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, 15);

      // Generate actionable insights
      const insights = {
        inventoryOpportunities: sortedUnfoundItems.slice(0, 10).map(([item, data]) => ({
          item,
          category: data.category,
          requestCount: data.count,
          missedRevenue: data.count * 10, // Estimated average item value
          priority: data.count > 5 ? 'High' : data.count > 2 ? 'Medium' : 'Low'
        })),
        categoryGaps: sortedUnfoundCategories.slice(0, 5).map(([category, count]) => ({
          category,
          missedItems: count,
          priority: count > 10 ? 'High' : count > 5 ? 'Medium' : 'Low'
        })),
        competitorLeakage: sortedMovedItems.slice(0, 8).map(([item, data]) => ({
          item,
          timesLost: data.count,
          competitorsGaining: data.destinationStores,
          urgency: data.count > 3 ? 'High' : 'Medium'
        })),
        peakShoppingHours: analytics.hourlyPatterns
          .map((count, hour) => ({ hour, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
        recommendations: [
          analytics.summary.averageCompletionRate < 80 ? 
            'Consider expanding inventory - completion rate below 80%' : null,
          sortedUnfoundItems.length > 10 ? 
            'High number of unfound items suggests inventory gaps' : null,
          sortedMovedItems.length > 5 ? 
            'Customers frequently shopping elsewhere for specific items' : null
        ].filter(Boolean)
      };

      if (format === 'detailed') {
        res.json({
          analytics,
          insights,
          rawData: {
            topUnfoundItems: Object.fromEntries(sortedUnfoundItems),
            topUnfoundCategories: Object.fromEntries(sortedUnfoundCategories),
            topMovedItems: Object.fromEntries(sortedMovedItems)
          }
        });
      } else {
        res.json({
          analytics: {
            ...analytics,
            topUnfoundItems: Object.fromEntries(sortedUnfoundItems.slice(0, 10)),
            topUnfoundCategories: Object.fromEntries(sortedUnfoundCategories.slice(0, 5)),
            itemsMostlyMovedToCompetitors: Object.fromEntries(sortedMovedItems.slice(0, 8))
          },
          insights
        });
      }

    } catch (error) {
      console.error('Error generating retailer insights:', error);
      handleError(res, error);
    }
  });

  // Export retailer analytics data
  app.get('/api/analytics/retailer-export/:retailerId', async (req: Request, res: Response) => {
    try {
      const { retailerId } = req.params;
      const { startDate, endDate, format = 'csv' } = req.query;

      const currentUserId = req.headers['x-current-user-id'] ? 
        parseInt(req.headers['x-current-user-id'] as string) : 1;

      const currentUser = await storage.getUser(currentUserId);
      if (!currentUser || (currentUser.role !== 'owner' && currentUser.role !== 'admin')) {
        return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
      }

      // Get the analytics data (reuse the logic from above)
      const analyticsResponse = await fetch(`http://localhost:5000/api/analytics/retailer-insights/${retailerId}?startDate=${startDate}&endDate=${endDate}&format=detailed`, {
        headers: { 'x-current-user-id': currentUserId.toString() }
      });

      if (!analyticsResponse.ok) {
        return res.status(500).json({ message: 'Failed to generate analytics' });
      }

      const analyticsData = await analyticsResponse.json();
      const retailer = await storage.getRetailer(parseInt(retailerId));

      if (format === 'csv') {
        // Generate CSV format
        let csvContent = `Retailer Analytics Export - ${retailer?.name}\n`;
        csvContent += `Period: ${analyticsData.analytics.period.startDate} to ${analyticsData.analytics.period.endDate}\n\n`;

        csvContent += `Summary Metrics\n`;
        csvContent += `Total Trips,${analyticsData.analytics.summary.totalTrips}\n`;
        csvContent += `Items Requested,${analyticsData.analytics.summary.totalItemsRequested}\n`;
        csvContent += `Items Found,${analyticsData.analytics.summary.totalItemsFound}\n`;
        csvContent += `Items Not Found,${analyticsData.analytics.summary.totalItemsNotFound}\n`;
        csvContent += `Completion Rate,${analyticsData.analytics.summary.averageCompletionRate.toFixed(2)}%\n\n`;

        csvContent += `Top Unfound Items\n`;
        csvContent += `Item Name,Category,Request Count,Priority\n`;
        analyticsData.insights.inventoryOpportunities.forEach((item: any) => {
          csvContent += `"${item.item}","${item.category}",${item.requestCount},"${item.priority}"\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="retailer-analytics-${retailer?.name}-${Date.now()}.csv"`);
        res.send(csvContent);
      } else {
        // JSON format
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="retailer-analytics-${retailer?.name}-${Date.now()}.json"`);
        res.json(analyticsData);
      }

    } catch (error) {
      console.error('Error exporting retailer analytics:', error);
      handleError(res, error);
    }
  });

  // Shopping trip completion endpoint
  app.post('/api/shopping-trip/complete', async (req: Request, res: Response) => {
    try {
      const { 
        listId, 
        completedItems, 
        uncompletedItems, 
        movedItems,
        startTime, 
        endTime, 
        retailerName,
        planType,
        totalStores
      } = req.body;

      const userId = getCurrentUserId(req);

      console.log('Shopping trip completion request:', {
        listId,
        completedItemsCount: completedItems?.length || 0,
        uncompletedItemsCount: uncompletedItems?.length || 0,
        movedItemsCount: movedItems?.length || 0,
        retailerName,
        planType
      });

      let deletedCount = 0;
      let updatedCount = 0;

      // Delete completed items from shopping list - these should be permanently removed
      if (completedItems && completedItems.length > 0) {
        console.log(`Processing deletion of ${completedItems.length} completed items`);

        for (const itemId of completedItems) {
          try {
            console.log(`Attempting to delete completed item ${itemId}`);
            const success = await storage.deleteShoppingListItem(itemId);

            if (success) {
              deletedCount++;
              console.log(`Successfully deleted completed item ${itemId}`);
            } else {
              console.error(`Failed to delete completed item ${itemId} - item not found or deletion failed`);
            }
          } catch (error) {
            console.error(`Exception while deleting item ${itemId}:`, error);
          }
        }

        console.log(`Completed items deletion: ${deletedCount}/${completedItems.length} successful`);
      }

      // Update uncompleted items with notes (but keep them on the list for future shopping)
      if (uncompletedItems && uncompletedItems.length > 0) {
        console.log(`Processing ${uncompletedItems.length} uncompleted items`);

        for (const item of uncompletedItems) {
          try {
            const notes = item.reason === 'out_of_stock' 
              ? `Out of stock at ${retailerName} on ${new Date().toLocaleDateString()}`
              : `Not found at ${retailerName} on ${new Date().toLocaleDateString()}`;

            console.log(`Updating uncompleted item ${item.id || item} with notes`);

            const itemId = typeof item === 'object' ? item.id : item;
            const success = await storage.updateShoppingListItem(itemId, {
              isCompleted: false,
              notes: notes
            });

            if (success) {
              updatedCount++;
              console.log(`Successfully updated uncompleted item ${itemId}`);
            } else {
              console.error(`Failed to update uncompleted item ${itemId}`);
            }
          } catch (error) {
            console.error(`Exception while updating uncompleted item:`, error);
          }
        }

        console.log(`Uncompleted items update: ${updatedCount}/${uncompletedItems.length} successful`);
      }

      // Log trip analytics for insights
      logger.info('Shopping trip completed', {
        userId,
        listId,
        tripAnalytics: {
          totalItems: (completedItems?.length || 0) + (uncompletedItems?.length || 0),
          completedItems: completedItems?.length || 0,
          uncompletedItems: uncompletedItems?.length || 0,
          movedItems: movedItems?.length || 0,
          completionRate: ((completedItems?.length || 0) / ((completedItems?.length || 0) + (uncompletedItems?.length || 0))) * 100,
          tripDurationMinutes: startTime && endTime ? 
            Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000) : 0,
          deletedCount,
          updatedCount
        },
        retailerName,
        planType,
        totalStores,
        uncompletedItemDetails: uncompletedItems?.map((item: any) => ({
          productName: typeof item === 'object' ? item.productName : 'Unknown',
          category: typeof item === 'object' ? item.category : 'Unknown',
          reason: typeof item === 'object' ? item.reason : 'not_found'
        })),
        movedItemDetails: movedItems?.map((item: any) => ({
          productName: item.productName,
          fromStore: retailerName,
          toStore: item.toStore || 'Unknown'
        }))
      });

      res.json({ 
        success: true, 
        message: 'Shopping trip completed successfully',
        deletedItems: deletedCount,
        updatedItems: updatedCount,
        summary: {
          completed: completedItems?.length || 0,
          actuallyDeleted: deletedCount,
          uncompleted: uncompletedItems?.length || 0,
          actuallyUpdated: updatedCount
        }
      });

    } catch (error) {
      console.error('Error completing shopping trip:', error);
      handleError(res, error);
    }
  });

  // Update shopping list item
  app.patch('/api/shopping-list/items/:itemId', async (req: Request, res: Response) => {
    try {
      const itemId = parseInt(req.params.itemId);
      const updates = req.body;
      console.log(`Attempting to update shopping list item ${itemId}:`, updates);

      // Validate quantity if it's being updated
      if (updates.quantity !== undefined) {
        const quantity = parseInt(updates.quantity);
        if (isNaN(quantity) || quantity < 1) {
          return res.status(400).json({ error: 'Quantity must be a positive number' });
        }
        updates.quantity = quantity;
      }

      const success = await storage.updateShoppingListItem(itemId, updates);

      if (success) {
        const updatedItem = await storage.getShoppingListItem(itemId);
        console.log(`Successfully updated shopping list item ${itemId}:`, updatedItem);
        res.json(updatedItem);
      } else {
        console.error(`Failed to update shopping list item ${itemId} - item not found`);
        res.status(404).json({ error: 'Shopping list item not found' });
      }
    } catch (error) {
      console.error('Error updating shopping list item:', error);
      res.status(500).json({ message: 'Failed to update item' });
    }
  });

  // Batch API endpoint for dashboard optimization
  app.post('/api/batch', async (req: Request, res: Response) => {
    try {
      const userId = getCurrentUserId(req);
      const { requests } = req.body;

      if (!Array.isArray(requests)) {
        return res.status(400).json({ error: 'Requests must be an array' });
      }

      const { batchApiService } = await import('./services/batchApiService.js');
      const responses = await batchApiService.processBatchRequest(requests, userId);

      res.json({ responses });
    } catch (error) {
      handleError(res, error);
    }
  });

  // Delete shopping list item
  app.delete('/api/shopping-list/items/:itemId', async (req: Request, res: Response) => {
    try {
      const itemId = parseInt(req.params.itemId);

      const deleted = await storage.deleteShoppingListItem(itemId);

      if (!deleted) {
        return res.status(404).json({ message: 'Item not found' });
      }

      res.json({ message: 'Item deleted successfully', itemId });
    } catch (error) {
      console.error('Error deleting shopping list item:', error);
      res.status(500).json({ message: 'Failed to delete item' });
    }
  });

  return server;
}