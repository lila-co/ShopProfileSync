import { z } from 'zod';

// User validation schemas
export const userSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be no more than 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores'),
  email: z.string().email('Please enter a valid email address'),
  firstName: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name must be no more than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes'),
  lastName: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be no more than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be no more than 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
});

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = userSchema.extend({
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Profile validation schemas
export const profileUpdateSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be no more than 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores'),
  email: z.string().email('Please enter a valid email address'),
  firstName: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name must be no more than 50 characters'),
  lastName: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be no more than 50 characters'),
  phone: z.string()
    .regex(/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number')
    .optional()
    .or(z.literal('')),
  zipCode: z.string()
    .regex(/^\d{5}(-\d{4})?$/, 'Please enter a valid ZIP code')
    .optional()
    .or(z.literal('')),
  householdType: z.enum(['SINGLE', 'COUPLE', 'FAMILY_WITH_CHILDREN', 'SHARED_HOUSING', 'SENIOR_LIVING']).optional(),
  householdSize: z.number()
    .int('Household size must be a whole number')
    .min(1, 'Household size must be at least 1')
    .max(20, 'Household size must be no more than 20')
    .optional(),
  preferNameBrand: z.boolean().optional(),
  preferOrganic: z.boolean().optional(),
  buyInBulk: z.boolean().optional(),
  prioritizeCostSavings: z.boolean().optional(),
  shoppingRadius: z.number()
    .min(1, 'Shopping radius must be at least 1 mile')
    .max(50, 'Shopping radius must be no more than 50 miles')
    .optional(),
});

// Shopping list validation schemas
export const shoppingListSchema = z.object({
  name: z.string()
    .min(1, 'Shopping list name is required')
    .max(100, 'Shopping list name must be no more than 100 characters')
    .trim(),
  description: z.string()
    .max(500, 'Description must be no more than 500 characters')
    .optional()
    .or(z.literal('')),
  isDefault: z.boolean().optional(),
});

export const shoppingListItemSchema = z.object({
  productName: z.string()
    .min(1, 'Product name is required')
    .max(200, 'Product name must be no more than 200 characters')
    .trim(),
  quantity: z.number()
    .positive('Quantity must be greater than 0')
    .max(9999, 'Quantity must be no more than 9999')
    .refine(val => !isNaN(val), 'Quantity must be a valid number'),
  unit: z.enum(['COUNT', 'LB', 'OZ', 'G', 'KG', 'PKG', 'ROLL', 'BOX', 'CAN', 'CANS', 'BOTTLE', 'JAR', 'BUNCH', 'GALLON', 'LOAF', 'DOZEN', 'PINT', 'QUART', 'CUP', 'TSP', 'TBSP', 'ML', 'L', 'SLICE', 'PACK', 'BAG', 'CONTAINER', 'PIECE', 'UNIT', 'SERVING']).optional(),
  notes: z.string()
    .max(500, 'Notes must be no more than 500 characters')
    .optional()
    .or(z.literal('')),
});

// Retailer validation schemas
export const retailerAccountSchema = z.object({
  retailerId: z.number().int().positive('Retailer ID must be a positive integer'),
  accountUsername: z.string()
    .min(1, 'Account username is required')
    .max(100, 'Account username must be no more than 100 characters')
    .optional()
    .or(z.literal('')),
  customCircularUrl: z.string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),
  connectionType: z.enum(['full', 'circular']).optional(),
});

// Purchase validation schemas
export const purchaseSchema = z.object({
  retailerId: z.number().int().positive('Retailer ID must be a positive integer'),
  totalAmount: z.number()
    .positive('Total amount must be greater than 0')
    .max(999999, 'Total amount must be no more than $9,999.99'),
  purchaseDate: z.string().datetime('Please enter a valid date'),
  items: z.array(z.object({
    productName: z.string()
      .min(1, 'Product name is required')
      .max(200, 'Product name must be no more than 200 characters'),
    quantity: z.number().positive('Quantity must be greater than 0'),
    unitPrice: z.number().positive('Unit price must be greater than 0'),
    totalPrice: z.number().positive('Total price must be greater than 0'),
  })).min(1, 'At least one item is required'),
});

// Deal validation schemas
export const dealSchema = z.object({
  productName: z.string()
    .min(1, 'Product name is required')
    .max(200, 'Product name must be no more than 200 characters'),
  regularPrice: z.number()
    .positive('Regular price must be greater than 0')
    .max(999999, 'Regular price must be no more than $9,999.99'),
  salePrice: z.number()
    .positive('Sale price must be greater than 0')
    .max(999999, 'Sale price must be no more than $9,999.99'),
  category: z.string()
    .max(100, 'Category must be no more than 100 characters')
    .optional()
    .or(z.literal('')),
  validUntil: z.string().datetime('Please enter a valid date'),
}).refine(data => data.salePrice < data.regularPrice, {
  message: "Sale price must be less than regular price",
  path: ["salePrice"],
});

// File upload validation
export const fileUploadSchema = z.object({
  file: z.instanceof(File)
    .refine(file => file.size <= 10 * 1024 * 1024, 'File size must be no more than 10MB')
    .refine(file => ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'].includes(file.type), 
      'File must be a JPEG, PNG, GIF, or PDF'),
});

// Search validation
export const searchSchema = z.object({
  query: z.string()
    .min(1, 'Search query is required')
    .max(200, 'Search query must be no more than 200 characters')
    .trim(),
  filters: z.object({
    category: z.string().optional(),
    retailerId: z.number().int().positive().optional(),
    minPrice: z.number().min(0).optional(),
    maxPrice: z.number().min(0).optional(),
  }).optional(),
});

// Voice input validation
export const voiceInputSchema = z.object({
  message: z.string()
    .min(1, 'Voice message is required')
    .max(1000, 'Voice message must be no more than 1000 characters')
    .trim(),
  context: z.array(z.string()).optional(),
});

// Privacy preferences validation
export const privacyPreferencesSchema = z.object({
  allowAnalytics: z.boolean(),
  allowMarketing: z.boolean(),
  allowDataSharing: z.boolean(),
  dataRetentionPeriod: z.number().int().min(30).max(3650), // 30 days to 10 years
  allowLocationTracking: z.boolean(),
  allowPersonalization: z.boolean(),
  gdprConsent: z.boolean(),
  ccpaOptOut: z.boolean(),
});

// Notification preferences validation
export const notificationPreferencesSchema = z.object({
  dealAlerts: z.boolean(),
  priceDropAlerts: z.boolean(),
  weeklyDigest: z.boolean(),
  expirationAlerts: z.boolean(),
  recommendationUpdates: z.boolean(),
  pushNotifications: z.boolean(),
  emailNotifications: z.boolean(),
  smsNotifications: z.boolean(),
});

// All schemas are already exported individually above