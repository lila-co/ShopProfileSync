// Common types used throughout the application
export interface User {
  id: number;
  username: string;
  password?: string;
  firstName: string;
  lastName: string;
  email: string;
  role?: string;
  isAdmin?: boolean;
  householdType?: string;
  householdSize?: number;
  preferNameBrand?: boolean;
  preferOrganic?: boolean;
  buyInBulk?: boolean;
  prioritizeCostSavings?: boolean;
  shoppingRadius?: number;
}

export interface Retailer {
  id: number;
  name: string;
  logoColor: string;
  apiEndpoint?: string;
  apiKey?: string;
}

export interface RetailerAccount {
  id: number;
  userId: number;
  retailerId: number;
  retailer?: Retailer;
  accountUsername?: string;
  accountToken?: string;
  isConnected: boolean;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  subcategory?: string;
  defaultUnit?: string;
  restockFrequency?: string;
  isNameBrand: boolean;
  isOrganic: boolean;
}

export interface Purchase {
  id: number;
  userId: number;
  retailerId?: number;
  retailer?: Retailer;
  purchaseDate: string;
  receiptImageUrl?: string;
  totalAmount: number;
  receiptData?: any;
  items?: PurchaseItem[];
}

export interface PurchaseItem {
  id: number;
  purchaseId: number;
  productId?: number;
  product?: Product;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ShoppingList {
  id: number;
  userId: number;
  name: string;
  isDefault: boolean;
  items?: ShoppingListItem[];
}

export interface ShoppingListItem {
  id: number;
  shoppingListId: number;
  productId?: number;
  product?: Product;
  productName: string;
  quantity: number;
  unit?: string;
  isCompleted: boolean;
  suggestedRetailerId?: number;
  suggestedRetailer?: Retailer;
  suggestedPrice?: number;
  dueDate?: string;
  category?: string;
  notes?: string;
}

export interface StoreDeal {
  id: number;
  retailerId: number;
  retailer?: Retailer;
  productName: string;
  regularPrice: number;
  salePrice: number;
  startDate: string;
  endDate: string;
  category?: string;
  dealSource?: string;
  circularId?: number;
  imageUrl?: string;
  featured?: boolean;
  dealType?: 'fixed_price' | 'spend_threshold_percentage' | 'spend_threshold_fixed' | 'buy_x_get_y';
  spendThreshold?: number | null;
  discountPercentage?: number | null;
  maxDiscountAmount?: number | null;
}

export interface WeeklyCircular {
  id: number;
  retailerId: number;
  retailer?: Retailer;
  title: string;
  startDate: string;
  endDate: string;
  imageUrl?: string;
  description?: string;
  pdfUrl?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Recommendation {
  id: number;
  userId: number;
  productId?: number;
  product?: Product;
  productName: string;
  recommendedDate: string;
  daysUntilPurchase?: number;
  suggestedRetailerId?: number;
  suggestedRetailer?: Retailer;
  suggestedPrice?: number;
  savings?: number;
  reason?: string;
}

export interface PurchasePattern {
  productName: string;
  frequency: string;
  typicalRetailer: string;
  typicalPrice: number;
}

export interface MonthlySpending {
  month: string;
  currentYear: number;
  previousYear: number;
}

export interface DealsSummary {
  retailerId: number;
  retailerName: string;
  logoColor: string;
  dealsCount: number;
  validUntil: string;
}