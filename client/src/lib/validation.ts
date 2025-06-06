import { z } from "zod";

// Base user schema
export const userSchema = z.object({
  id: z.string(),
  email: z.string().email("Invalid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phoneNumber: z.string().optional(),
  profilePicture: z.string().url().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Auth schemas
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phoneNumber: z.string().optional(),
});

// Profile schemas
export const profileUpdateSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phoneNumber: z.string().optional(),
  profilePicture: z.string().url().optional(),
});

// Shopping list schemas
export const shoppingListItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Item name is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unit: z.string().optional(),
  category: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  completed: z.boolean().default(false),
  notes: z.string().optional(),
});

export const shoppingListSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "List name is required"),
  items: z.array(shoppingListItemSchema),
  userId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Retailer schemas
export const retailerAccountSchema = z.object({
  id: z.string(),
  retailerName: z.string().min(1, "Retailer name is required"),
  accountId: z.string().min(1, "Account ID is required"),
  credentials: z.record(z.string()),
  isActive: z.boolean().default(true),
});

// Purchase and deal schemas
export const purchaseSchema = z.object({
  id: z.string(),
  itemName: z.string().min(1, "Item name is required"),
  quantity: z.number().min(1),
  price: z.number().min(0),
  retailer: z.string().min(1, "Retailer is required"),
  purchaseDate: z.string(),
  category: z.string().optional(),
});

export const dealSchema = z.object({
  id: z.string(),
  itemName: z.string().min(1, "Item name is required"),
  originalPrice: z.number().min(0),
  salePrice: z.number().min(0),
  discount: z.number().min(0).max(100),
  retailer: z.string().min(1, "Retailer is required"),
  validFrom: z.string(),
  validTo: z.string(),
  description: z.string().optional(),
});

// File upload schema
export const fileUploadSchema = z.object({
  file: z.instanceof(File),
  maxSize: z.number().default(5 * 1024 * 1024), // 5MB
  allowedTypes: z.array(z.string()).default(['image/jpeg', 'image/png', 'image/gif']),
});

// Search schema
export const searchSchema = z.object({
  query: z.string().min(1, "Search query is required"),
  filters: z.object({
    category: z.string().optional(),
    priceRange: z.object({
      min: z.number().min(0),
      max: z.number().min(0),
    }).optional(),
    retailer: z.string().optional(),
  }).optional(),
});

// Voice input schema
export const voiceInputSchema = z.object({
  transcript: z.string().min(1, "Voice transcript is required"),
  confidence: z.number().min(0).max(1),
  language: z.string().default("en-US"),
});

// Preferences schemas
export const privacyPreferencesSchema = z.object({
  shareAnalytics: z.boolean(),
  allowTargetedAds: z.boolean(),
  shareLocationData: z.boolean(),
  sharePurchaseHistory: z.boolean(),
});

export const notificationPreferencesSchema = z.object({
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  smsNotifications: z.boolean(),
});