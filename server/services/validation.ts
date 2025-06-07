import { z } from 'zod';

// Server-side validation schemas with additional security checks
export const serverUserSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be no more than 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores')
    .refine(val => !['admin', 'root', 'system', 'null', 'undefined'].includes(val.toLowerCase()), 
      'Username cannot be a reserved word'),
  email: z.string()
    .email('Please enter a valid email address')
    .max(254, 'Email must be no more than 254 characters'),
  firstName: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name must be no more than 50 characters')
    .refine(val => val.trim().length > 0, 'First name cannot be only whitespace'),
  lastName: z.string()
    .max(50, 'Last name must be no more than 50 characters')
    .optional()
    .or(z.literal('')),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password must be no more than 128 characters'),
});

export const serverLoginSchema = z.object({
  username: z.string()
    .min(1, 'Username is required')
    .max(30, 'Username too long')
    .refine(val => val.trim().length > 0, 'Username cannot be only whitespace'),
  password: z.string()
    .min(1, 'Password is required')
    .max(128, 'Password too long'),
});

export const serverProfileUpdateSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be no more than 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores')
    .optional(),
  email: z.string()
    .email('Please enter a valid email address')
    .max(254, 'Email must be no more than 254 characters')
    .optional(),
  firstName: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name must be no more than 50 characters')
    .optional(),
  lastName: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be no more than 50 characters')
    .optional(),
  phone: z.string()
    .regex(/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number')
    .max(20, 'Phone number too long')
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

export const serverShoppingListSchema = z.object({
  name: z.string()
    .min(1, 'Shopping list name is required')
    .max(100, 'Shopping list name must be no more than 100 characters')
    .trim()
    .refine(val => val.length > 0, 'Shopping list name cannot be only whitespace'),
  description: z.string()
    .max(500, 'Description must be no more than 500 characters')
    .optional()
    .or(z.literal('')),
  isDefault: z.boolean().optional(),
  userId: z.number().int().positive('User ID must be a positive integer'),
});

export const serverShoppingListItemSchema = z.object({
  shoppingListId: z.number().int().positive('Shopping list ID must be a positive integer'),
  productName: z.string()
    .min(1, 'Product name is required')
    .max(200, 'Product name must be no more than 200 characters')
    .trim()
    .refine(val => val.length > 0, 'Product name cannot be only whitespace')
    .refine(val => !/<script|javascript:|data:/i.test(val), 'Product name contains invalid content'),
  quantity: z.number()
    .positive('Quantity must be greater than 0')
    .max(9999, 'Quantity must be no more than 9999')
    .refine(val => !isNaN(val) && isFinite(val), 'Quantity must be a valid number'),
  unit: z.enum(['COUNT', 'LB', 'OZ', 'G', 'KG', 'PKG', 'ROLL', 'BOX', 'CAN', 'CANS', 'BOTTLE', 'JAR', 'BUNCH', 'GALLON', 'LOAF', 'DOZEN', 'PINT', 'QUART', 'CUP', 'TSP', 'TBSP', 'ML', 'L', 'SLICE', 'PACK', 'BAG', 'CONTAINER', 'PIECE', 'UNIT', 'SERVING']).default('COUNT'),
  notes: z.string()
    .max(500, 'Notes must be no more than 500 characters')
    .optional()
    .or(z.literal('')),
});

export const serverRetailerAccountSchema = z.object({
  userId: z.number().int().positive('User ID must be a positive integer'),
  retailerId: z.number().int().positive('Retailer ID must be a positive integer'),
  accountUsername: z.string()
    .max(100, 'Account username must be no more than 100 characters')
    .optional()
    .or(z.literal('')),
  customCircularUrl: z.string()
    .url('Please enter a valid URL')
    .max(2000, 'URL too long')
    .optional()
    .or(z.literal('')),
  connectionType: z.enum(['full', 'circular']).default('full'),
});

export const serverPurchaseSchema = z.object({
  userId: z.number().int().positive('User ID must be a positive integer'),
  retailerId: z.number().int().positive('Retailer ID must be a positive integer'),
  totalAmount: z.number()
    .positive('Total amount must be greater than 0')
    .max(999999, 'Total amount must be no more than $9,999.99')
    .refine(val => !isNaN(val) && isFinite(val), 'Total amount must be a valid number'),
  purchaseDate: z.string().datetime('Please enter a valid date').or(z.date()),
  items: z.array(z.object({
    productName: z.string()
      .min(1, 'Product name is required')
      .max(200, 'Product name must be no more than 200 characters')
      .refine(val => !/<script|javascript:|data:/i.test(val), 'Product name contains invalid content'),
    quantity: z.number().positive('Quantity must be greater than 0'),
    unitPrice: z.number().positive('Unit price must be greater than 0'),
    totalPrice: z.number().positive('Total price must be greater than 0'),
  })).min(1, 'At least one item is required').max(100, 'Too many items in purchase'),
});

export const serverDealSchema = z.object({
  retailerId: z.number().int().positive('Retailer ID must be a positive integer'),
  productName: z.string()
    .min(1, 'Product name is required')
    .max(200, 'Product name must be no more than 200 characters')
    .refine(val => !/<script|javascript:|data:/i.test(val), 'Product name contains invalid content'),
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
  startDate: z.string().datetime().or(z.date()),
  endDate: z.string().datetime().or(z.date()),
}).refine(data => data.salePrice < data.regularPrice, {
  message: "Sale price must be less than regular price",
  path: ["salePrice"],
}).refine(data => new Date(data.endDate) > new Date(data.startDate), {
  message: "End date must be after start date",
  path: ["endDate"],
});

export const serverSearchSchema = z.object({
  query: z.string()
    .min(1, 'Search query is required')
    .max(200, 'Search query must be no more than 200 characters')
    .trim()
    .refine(val => val.length > 0, 'Search query cannot be only whitespace')
    .refine(val => !/<script|javascript:|data:/i.test(val), 'Search query contains invalid content'),
  filters: z.object({
    category: z.string().max(100).optional(),
    retailerId: z.number().int().positive().optional(),
    minPrice: z.number().min(0).optional(),
    maxPrice: z.number().min(0).optional(),
  }).optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

export const serverVoiceInputSchema = z.object({
  message: z.string()
    .min(1, 'Voice message is required')
    .max(1000, 'Voice message must be no more than 1000 characters')
    .trim()
    .refine(val => val.length > 0, 'Voice message cannot be only whitespace')
    .refine(val => !/<script|javascript:|data:/i.test(val), 'Voice message contains invalid content'),
  context: z.array(z.string().max(500)).max(10).optional(),
});

// ID parameter validation
export const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID must be a positive integer').transform(Number),
});

// Pagination schema
export const paginationSchema = z.object({
  limit: z.string().regex(/^\d+$/).transform(Number).refine(val => val >= 1 && val <= 100, 'Limit must be between 1 and 100').optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).refine(val => val >= 0, 'Offset must be non-negative').optional(),
});

// Request validation helper
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Validation failed: ${messages.join(', ')}`);
    }
    throw error;
  }
}

// Sanitization helpers
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}

export function sanitizeNumber(input: unknown): number {
  const num = Number(input);
  if (isNaN(num) || !isFinite(num)) {
    throw new Error('Invalid number');
  }
  return num;
}

export function sanitizeBoolean(input: unknown): boolean {
  if (typeof input === 'boolean') return input;
  if (typeof input === 'string') {
    return input.toLowerCase() === 'true';
  }
  return Boolean(input);
}