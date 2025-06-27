import { and, eq, gte, lte, desc, like, sql } from "drizzle-orm";
import { db } from "./db";
import {
  users, retailers, retailerAccounts, products, purchases, purchaseItems,
  shoppingLists, shoppingListItems, storeDeals, weeklyCirculars, recommendations,
  purchaseAnomalies, affiliatePartners, affiliateProducts, affiliateClicks, affiliateConversions,
  dataPrivacyPreferences, notificationPreferences, securityAuditLog,
  type InsertUser, type User, type InsertRetailer, type Retailer, type InsertRetailerAccount, type RetailerAccount,
  type InsertProduct, type Product, type InsertPurchase, type Purchase, type InsertPurchaseItem, type PurchaseItem,
  type InsertShoppingList, type ShoppingList, type InsertShoppingListItem, type ShoppingListItem,
  type InsertStoreDeal, type StoreDeal, type InsertWeeklyCircular, type WeeklyCircular,
  type InsertRecommendation, type Recommendation, type InsertPurchaseAnomaly, type PurchaseAnomaly,
  type InsertAffiliatePartner, type AffiliatePartner, type InsertAffiliateProduct, type AffiliateProduct,
  type InsertAffiliateClick, type AffiliateClick, type AffiliateConversion, type AffiliateConversion
} from "../shared/schema";

// Interface for all storage operations
export interface IStorage {
  // User methods
  getDefaultUser(): Promise<User>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(userData: Partial<User>): Promise<User>;
  authenticateUser(username: string, password: string): Promise<User | undefined>;

  // Retailer methods
  getRetailers(): Promise<Retailer[]>;
  getRetailer(id: number): Promise<Retailer | undefined>;
  createRetailer(retailer: InsertRetailer): Promise<Retailer>;

  // Retailer Account methods
  getRetailerAccounts(): Promise<RetailerAccount[]>;
  getRetailerAccount(id: number): Promise<RetailerAccount | undefined>;
  createRetailerAccount(account: InsertRetailerAccount): Promise<RetailerAccount>;

  // Product methods
  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;

  // Purchase methods
  getPurchases(): Promise<Purchase[]>;
  getPurchase(id: number): Promise<Purchase | undefined>;
  createPurchase(purchase: InsertPurchase): Promise<Purchase>;
  createPurchaseFromReceipt(receiptData: any, userId?: number): Promise<Purchase>;

  // Purchase Item methods
  getPurchaseItems(purchaseId: number): Promise<PurchaseItem[]>;
  createPurchaseItem(item: InsertPurchaseItem): Promise<PurchaseItem>;

  // Shopping List methods
  getShoppingLists(): Promise<ShoppingList[]>;
  getShoppingListsByUserId(userId: number): Promise<ShoppingList[]>;
  getShoppingListById(id: number): Promise<ShoppingList | undefined>;
  getShoppingList(id: number): Promise<ShoppingList | undefined>;
  createShoppingList(list: InsertShoppingList): Promise<ShoppingList>;

  // Shopping List Item methods
  getShoppingListItems(listId: number): Promise<ShoppingListItem[]>;
  getShoppingListItem(id: number): Promise<ShoppingListItem | undefined>;
  addShoppingListItem(item: Partial<ShoppingListItem>): Promise<ShoppingListItem>;
  updateShoppingListItem(id: number, updates: Partial<ShoppingListItem>): Promise<ShoppingListItem>;
  deleteShoppingListItem(id: number): Promise<boolean>;

  // Deal methods
  getDeals(retailerId?: number, category?: string): Promise<StoreDeal[]>;
  getDealsSummary(): Promise<any[]>;
  getDealCategories(): Promise<string[]>;
  createDeal(deal: InsertStoreDeal): Promise<StoreDeal>;

  // Weekly Circular methods
  getWeeklyCirculars(retailerId?: number): Promise<WeeklyCircular[]>;
  getWeeklyCircular(id: number): Promise<WeeklyCircular | undefined>;
  createWeeklyCircular(circular: InsertWeeklyCircular): Promise<WeeklyCircular>;
  getDealsFromCircular(circularId: number): Promise<StoreDeal[]>;

  // Recommendation methods
  getRecommendations(): Promise<Recommendation[]>;
  createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation>;

  // Insights methods
  getTopPurchasedItems(): Promise<any[]>;
  getMonthlySpending(): Promise<any[]>;
  getMonthlySavings(): Promise<number>;

  // Purchase Anomaly methods
  getPurchaseAnomalies(): Promise<PurchaseAnomaly[]>;
  getPurchaseAnomaly(id: number): Promise<PurchaseAnomaly | undefined>;
  createPurchaseAnomaly(anomaly: InsertPurchaseAnomaly): Promise<PurchaseAnomaly>;
  updatePurchaseAnomaly(id: number, updates: Partial<PurchaseAnomaly>): Promise<PurchaseAnomaly>;
  deletePurchaseAnomaly(id: number): Promise<void>;

  // Affiliate Partner methods
  getAffiliatePartners(): Promise<AffiliatePartner[]>;
  getAffiliatePartner(id: number): Promise<AffiliatePartner | undefined>;
  createAffiliatePartner(partner: InsertAffiliatePartner): Promise<AffiliatePartner>;
  updateAffiliatePartner(id: number, updates: Partial<AffiliatePartner>): Promise<AffiliatePartner>;
  deleteAffiliatePartner(id: number): Promise<void>;

  // Affiliate Product methods
  getAffiliateProducts(partnerId?: number, category?: string): Promise<AffiliateProduct[]>;
  getAffiliateProduct(id: number): Promise<AffiliateProduct | undefined>;
  getFeaturedAffiliateProducts(): Promise<AffiliateProduct[]>;
  createAffiliateProduct(product: InsertAffiliateProduct): Promise<AffiliateProduct>;
  updateAffiliateProduct(id: number, updates: Partial<AffiliateProduct>): Promise<AffiliateProduct>;
  deleteAffiliateProduct(id: number): Promise<void>;

  // Affiliate Click methods
  recordAffiliateClick(click: InsertAffiliateClick): Promise<AffiliateClick>;
  getAffiliateClicks(userId?: number, productId?: number): Promise<AffiliateClick[]>;

  // Affiliate Conversion methods
  recordAffiliateConversion(conversion: InsertAffiliateConversion): Promise<AffiliateConversion>;
  getAffiliateConversions(userId?: number, status?: string): Promise<AffiliateConversion[]>;
  updateAffiliateConversionStatus(id: number, status: string): Promise<AffiliateConversion>;

  // Role switching methods
  switchUserRole(currentUserId: number, targetRole: string): Promise<User>;
  getAllUsers(): Promise<User[]>;

  // Privacy and data management methods
  getPrivacyPreferences(userId: number): Promise<any>;
  updatePrivacyPreferences(userId: number, preferences: any): Promise<any>;
  exportUserData(userId: number): Promise<any>;
  deleteUserAccount(userId: number): Promise<boolean>;
  getNotificationPreferences(userId: number): Promise<any>;
  updateNotificationPreferences(userId: number, preferences: any): Promise<any>;

  // User statistics
  getUserStatistics(userId: number): Promise<any>;

  // Cleanup methods
  cleanupExpiredCirculars(): Promise<number>;
  cleanupShoppingLists(): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private retailers: Map<number, Retailer>;
  private retailerAccounts: Map<number, RetailerAccount>;
  private products: Map<number, Product>;
  private purchases: Map<number, Purchase>;
  private purchaseItems: Map<number, PurchaseItem>;
  private shoppingLists: Map<number, ShoppingList>;
  private shoppingListItems: Map<number, ShoppingListItem>;
  private storeDeals: Map<number, StoreDeal>;
  private weeklyCirculars: Map<number, WeeklyCircular>;
  private recommendations: Map<number, Recommendation>;
  private purchaseAnomalies: Map<number, PurchaseAnomaly>;
  private affiliatePartners: Map<number, AffiliatePartner>;
  private affiliateProducts: Map<number, AffiliateProduct>;
  private affiliateClicks: Map<number, AffiliateClick>;
  private affiliateConversions: Map<number, AffiliateConversion>;

  private userIdCounter: number = 1;
  private retailerIdCounter: number = 1;
  private retailerAccountIdCounter: number = 1;
  private productIdCounter: number = 1;
  private purchaseIdCounter: number = 1;
  private purchaseItemIdCounter: number = 1;
  private shoppingListIdCounter: number = 1;
  private shoppingListItemIdCounter: number = 1;
  private storeDealIdCounter: number = 1;
  private weeklyCircularIdCounter: number = 1;
  private recommendationIdCounter: number = 1;
  private purchaseAnomalyIdCounter: number = 1;
  private affiliatePartnerIdCounter: number = 1;
  private affiliateProductIdCounter: number = 1;
  private affiliateClickIdCounter: number = 1;
  private affiliateConversionIdCounter: number = 1;

  constructor() {
    this.users = new Map();
    this.retailers = new Map();
    this.retailerAccounts = new Map();
    this.products = new Map();
    this.purchases = new Map();
    this.purchaseItems = new Map();
    this.shoppingLists = new Map();
    this.shoppingListItems = new Map();
    this.storeDeals = new Map();
    this.weeklyCirculars = new Map();
    this.recommendations = new Map();
    this.purchaseAnomalies = new Map();
    this.affiliatePartners = new Map();
    this.affiliateProducts = new Map();
    this.affiliateClicks = new Map();
    this.affiliateConversions = new Map();

    // Initialize with sample data
    this.initializeData();
  }

  private initializeData() {
    // Create default user
    const defaultUser: User = {
      id: this.userIdCounter++,
      username: "johndoe",
      password: "password123",
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      householdType: "FAMILY_WITH_CHILDREN",
      householdSize: 4,
      preferNameBrand: true,
      preferOrganic: false,
      buyInBulk: true,
      prioritizeCostSavings: true,
      shoppingRadius: 10,
      role: 'owner',
      isAdmin: true
    };
    this.users.set(defaultUser.id, defaultUser);

    // Create test user
    const testUser: User = {
      id: this.userIdCounter++,
      username: "testuser",
      password: "password123",
      firstName: "Test",
      lastName: "User",
      email: "test.user@example.com",
      householdType: "SINGLE",
      householdSize: 1,
      preferNameBrand: false,
      preferOrganic: true,
      buyInBulk: false,
      prioritizeCostSavings: false,
      shoppingRadius: 5,
      role: 'test_user',
      isAdmin: false
    };
    this.users.set(testUser.id, testUser);

    // Create retailers
    const retailers = [
      { name: "Walmart", logoColor: "blue", apiEndpoint: "https://api.walmart.com" },
      { name: "Target", logoColor: "red", apiEndpoint: "https://api.target.com" },
      { name: "Whole Foods", logoColor: "green", apiEndpoint: "https://api.wholefoods.com" },
      { name: "Kroger", logoColor: "blue", apiEndpoint: "https://api.kroger.com" },
      { name: "Costco", logoColor: "red", apiEndpoint: "https://api.costco.com" },
      { name: "Safeway", logoColor: "green", apiEndpoint: "https://api.safeway.com" },
      { name: "Trader Joe's", logoColor: "orange", apiEndpoint: "https://api.traderjoes.com" },
      { name: "Publix", logoColor: "green", apiEndpoint: "https://api.publix.com" },
      { name: "H-E-B", logoColor: "red", apiEndpoint: "https://api.heb.com" },
      { name: "Meijer", logoColor: "blue", apiEndpoint: "https://api.meijer.com" }
    ];

    retailers.forEach(retailer => {
      const newRetailer: Retailer = {
        id: this.retailerIdCounter++,
        ...retailer,
        apiKey: `mock_api_key_${retailer.name.toLowerCase().replace(' ', '_')}`,
        apiSecret: null,
        authType: "api_key",
        requiresAuthentication: false,
        supportsOnlineOrdering: false,
        supportsPickup: false,
        supportsDelivery: false,
        apiDocumentation: null
      };
      this.retailers.set(newRetailer.id, newRetailer);
    });

    // Create sample products
    const products = [
      { name: "Milk (Gallon)", category: "Dairy", restockFrequency: "WEEKLY", isNameBrand: false, isOrganic: false },
      { name: "Toilet Paper (24 pack)", category: "Household", restockFrequency: "MONTHLY", isNameBrand: true, isOrganic: false },
      { name: "Laundry Detergent", category: "Household", restockFrequency: "BI_WEEKLY", isNameBrand: true, isOrganic: false },
      { name: "Bananas", category: "Produce", restockFrequency: "WEEKLY", isNameBrand: false, isOrganic: false },
      { name: "Eggs (dozen)", category: "Dairy", restockFrequency: "WEEKLY", isNameBrand: false, isOrganic: false },
      { name: "Paper Towels", category: "Household", restockFrequency: "MONTHLY", isNameBrand: true, isOrganic: false },
      { name: "Cereal", category: "Breakfast", restockFrequency: "BI_WEEKLY", isNameBrand: true, isOrganic: false },
      { name: "Bread", category: "Bakery", restockFrequency: "WEEKLY", isNameBrand: false, isOrganic: false },
    ];

    products.forEach(product => {
      const newProduct: Product = {
        id: this.productIdCounter++,
        ...product,
        subcategory: null,
        defaultUnit: null
      };
      this.products.set(newProduct.id, newProduct);
    });

    // Ensure only one master shopping list exists
    this.cleanupShoppingLists();

    // Create or get the single master shopping list
    const existingDefaultList = Array.from(this.shoppingLists.values()).find(list => list.isDefault);

    if (!existingDefaultList) {
      const defaultList: ShoppingList = {
        id: 1,
        userId: defaultUser.id,
        name: 'My Shopping List',
        isDefault: true
      };
      this.shoppingLists.set(defaultList.id, defaultList);

      // Add sample items to the master shopping list for demo purposes
      const sampleItems = [
        { productName: "Organic Milk (1 Gallon)", quantity: 1, unit: "GALLON" as const },
        { productName: "Free-Range Eggs (Dozen)", quantity: 2, unit: "DOZEN" as const },
        { productName: "Whole Wheat Bread", quantity: 1, unit: "LOAF" as const },
        { productName: "Bananas", quantity: 3, unit: "LB" as const },
        { productName: "Chicken Breast", quantity: 2, unit: "LB" as const },
        { productName: "Greek Yogurt", quantity: 4, unit: "CONTAINER" as const },
        { productName: "Baby Spinach", quantity: 1, unit: "BAG" as const },
        { productName: "Roma Tomatoes", quantity: 2, unit: "LB" as const },
        { productName: "Red Bell Peppers", quantity: 3, unit: "COUNT" as const },
        { productName: "Avocados", quantity: 4, unit: "COUNT" as const },
        { productName: "Ground Turkey", quantity: 1, unit: "LB" as const },
        { productName: "Quinoa", quantity: 1, unit: "BAG" as const },
        { productName: "Olive Oil", quantity: 1, unit: "BOTTLE" as const },
        { productName: "Cheddar Cheese", quantity: 1, unit: "PACK" as const },
        { productName: "Almond Butter", quantity: 1, unit: "JAR" as const },
        { productName: "Sparkling Water", quantity: 6, unit: "BOTTLE" as const }
      ];

      sampleItems.forEach(item => {
        const newItem: ShoppingListItem = {
          id: this.shoppingListItemIdCounter++,
          shoppingListId: defaultList.id,
          productId: null,
          productName: item.productName,
          quantity: item.quantity,
          unit: item.unit,
          isCompleted: false,
          suggestedRetailerId: Math.floor(Math.random() * 3) + 1, // Random retailer 1-3
          suggestedPrice: Math.floor(Math.random() * 800) + 200, // Random price $2-10
          dueDate: null,
          category: null,
          notes: null
        };
        this.shoppingListItems.set(newItem.id, newItem);
      });
    }

    // Add weekly circulars
    const circulars = [
      { 
        retailerId: 1, 
        title: "Walmart Weekly Savings", 
        description: "Save big on groceries and household essentials this week!", 
        startDate: new Date(), 
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        imageUrl: "https://cdn.corporate.walmart.com/dims4/default/a5afa36/2147483647/strip/true/crop/1650x958+0+0/resize/750x435!/quality/90/?url=https%3A%2F%2Fcdn.corporate.walmart.com%2F84%2F08%2F1d10a82448e7b0b5b6102d3eb9e0%2Fbusiness-associates-on-grocery-floor.jpg",
        isActive: true
      },
      { 
        retailerId: 2, 
        title: "Target Weekly Ad", 
        description: "Check out the latest deals from Target", 
        startDate: new Date(), 
        endDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
        imageUrl: "https://corporate.target.com/_media/TargetCorp/news/2019/grocery/July%202020/Retail%20Updates_Store%20Experience_Good%20and%20Gather_Store%20Design_2019_2.jpg",
        isActive: true
      },
      { 
        retailerId: 3, 
        title: "Whole Foods Market Deals", 
        description: "This week's fresh deals and organic savings", 
        startDate: new Date(), 
        endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        imageUrl: "https://media1.popsugar-assets.com/files/thumbor/3RKvU_OxIBSMxGGhsB9kY-tI534=/fit-in/768x0/filters:format_auto():upscale()/2017/10/30/734/n/24155406/fcbbf68459f73997af2319.40139935_edit_img_cover_file_44213587_1509374304.jpg",
        isActive: true
      },
      { 
        retailerId: 4, 
        title: "Kroger Weekly Savings", 
        description: "Save on fresh produce and more",
        startDate: new Date(), 
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        imageUrl: "https://www.chsretailpartners.com/hs-fs/hubfs/Blog_assets/Kroger.jpg",
        isActive: true
      },
    ];

    circulars.forEach(circular => {
      const newCircular: WeeklyCircular = {
        id: this.weeklyCircularIdCounter++,
        ...circular,
        pdfUrl: null,
        createdAt: new Date()
      };
      this.weeklyCirculars.set(newCircular.id, newCircular);
    });

    // Add store deals with more categories and retailers
    const deals = [
      // Walmart deals
      { retailerId: 1, productName: "Greek Yogurt", regularPrice: 529, salePrice: 399, startDate: new Date(), endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), category: "Dairy & Eggs", circularId: null, dealSource: "manual", imageUrl: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400" },
      { retailerId: 1, productName: "Frozen Pizza", regularPrice: 899, salePrice: 599, startDate: new Date(), endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), category: "Frozen Foods", circularId: null, dealSource: "manual", imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400" },

      // Target deals
      { retailerId: 2, productName: "Ice Cream", regularPrice: 699, salePrice: 499, startDate: new Date(), endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), category: "Frozen Foods", circularId: null, dealSource: "manual", imageUrl: "https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=400" },
      { retailerId: 2, productName: "Organic Bananas", regularPrice: 199, salePrice: 149, startDate: new Date(), endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), category: "Produce", circularId: null, dealSource: "manual", imageUrl: "https://images.unsplash.com/photo-1528825871115-3581a5387919?w=400" },

      // Whole Foods deals
      { retailerId: 3, productName: "Shampoo", regularPrice: 1299, salePrice: 899, startDate: new Date(), endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), category: "Personal Care", circularId: null, dealSource: "manual", imageUrl: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400" },
      { retailerId: 3, productName: "Chicken Breast", regularPrice: 899, salePrice: 699, startDate: new Date(), endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), category: "Meat & Seafood", circularId: null, dealSource: "manual", imageUrl: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400" },

      // Costco deals
      { retailerId: 4, productName: "Vitamin C", regularPrice: 1999, salePrice: 1499, startDate: new Date(), endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), category: "Health & Wellness", circularId: null, dealSource: "manual", imageUrl: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400" },
      { retailerId: 4, productName: "Ground Coffee", regularPrice: 2999, salePrice: 1999, startDate: new Date(), endDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), category: "Beverages", circularId: null, dealSource: "manual", imageUrl: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400" },
      { retailerId: 4, productName: "Whole Grain Cereal", regularPrice: 999, salePrice: 699, startDate: new Date(), endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), category: "Pantry & Canned Goods", circularId: null, dealSource: "manual", imageUrl: "https://images.unsplash.com/photo-1521483451569-e33803c0330c?w=400" },
      { retailerId: 4, productName: "Trail Mix", regularPrice: 1499, salePrice: 999, startDate: new Date(), endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), category: "Snacks", circularId: null, dealSource: "manual", imageUrl: "https://images.unsplash.com/photo-1609501676725-7186f0544c5a?w=400" },

      // Kroger deals
      { retailerId: 5, productName: "Bulk Rice (20lb)", regularPrice: 1899, salePrice: 1399, startDate: new Date(), endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), category: "Pantry & Canned Goods", circularId: null, dealSource: "manual", imageUrl: "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=400" },
      { retailerId: 5, productName: "Salmon Fillet (2lb)", regularPrice: 1599, salePrice: 1199, startDate: new Date(), endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), category: "Meat & Seafood", circularId: null, dealSource: "manual", imageUrl: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400" },
      { retailerId: 5, productName: "Toilet Paper (24 pack)", regularPrice: 2299, salePrice: 1799, startDate: new Date(), endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), category: "Household Items", circularId: null, dealSource: "manual", imageUrl: "https://images.unsplash.com/photo-1584462278633-cef4c9d0a99f?w=400" },
      { retailerId: 5, productName: "Organic Pasta", regularPrice: 299, salePrice: 249, startDate: new Date(), endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), category: "Pantry & Canned Goods", circularId: null, dealSource: "manual", imageUrl: "https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=400" },
      { retailerId: 5, productName: "Eggs (dozen)", regularPrice: 359, salePrice: 299, startDate: new Date(), endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), category: "Dairy & Eggs", circularId: null, dealSource: "manual", imageUrl: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400" },
      { retailerId: 5, productName: "Paper Towels", regularPrice: 799, salePrice: 679, startDate: new Date(), endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), category: "Household Items", circularId: null, dealSource: "manual", imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400" },
      { retailerId: 5, productName: "Organic Apples", regularPrice: 399, salePrice: 349, startDate: new Date(), endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), category: "Produce", circularId: null, dealSource: "manual", imageUrl: "https://images.unsplash.com/photo-1570913149827-d2ac84ab3f9a?w=400" },

      // Safeway deals
      { retailerId: 6, productName: "Ice Cream", regularPrice: 599, salePrice: 399, startDate: new Date(), endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), category: "Frozen Foods", circularId: null, dealSource: "manual", imageUrl: "https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=400" },
      { retailerId: 6, productName: "Vitamin C", regularPrice: 1299, salePrice: 999, startDate: new Date(), endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), category: "Health & Wellness", circularId: null, dealSource: "manual", imageUrl: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400" },

      // Trader Joe's deals
      { retailerId: 7, productName: "Organic Wine", regularPrice: 799, salePrice: 699, startDate: new Date(), endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), category: "Beverages", circularId: null, dealSource: "manual", imageUrl: "https://images.unsplash.com/photo-1510972527921-ce03766a1cf1?w=400" },
      { retailerId: 7, productName: "Trail Mix", regularPrice: 499, salePrice: 399, startDate: new Date(), endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), category: "Snacks", circularId: null, dealSource: "manual", imageUrl: "https://images.unsplash.com/photo-1609501676725-7186f0544c5a?w=400" },

      // ALDI deals
      { retailerId: 8, productName: "Milk (Gallon)", regularPrice: 349, salePrice: 299, startDate: new Date(), endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), category: "Dairy & Eggs", circularId: null, dealSource: "manual", imageUrl: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400" },
      { retailerId: 8, productName: "Bread", regularPrice: 229, salePrice: 199, startDate: new Date(), endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), category: "Bakery", circularId: null, dealSource: "manual", imageUrl: "https://images.unsplash.com/photo-1549931319-a545dcf3bc7c?w=400" },
    ];

    deals.forEach(deal => {
      const newDeal: StoreDeal = {
        id: this.storeDealIdCounter++,
        ...deal,
        featured: true
      };
      this.storeDeals.set(newDeal.id, newDeal);
    });

    // Create sample purchase history
    const now = new Date();
    // Last month's purchases
    this.createSamplePurchase(defaultUser.id, 1, now.getFullYear(), now.getMonth() - 1, 15);
    this.createSamplePurchase(defaultUser.id, 2, now.getFullYear(), now.getMonth() - 1, 5);
    this.createSamplePurchase(defaultUser.id, 4, now.getFullYear(), now.getMonth() - 1, 22);

    // This month's purchases 
    this.createSamplePurchase(defaultUser.id, 1, now.getFullYear(), now.getMonth(), 2);
    this.createSamplePurchase(defaultUser.id, 3, now.getFullYear(), now.getMonth(), 10);
  }

  // Cleanup methods
  private cleanupShoppingLists() {
    // Find and delete any non-default shopping lists
    for (const [id, list] of this.shoppingLists.entries()) {
      if (!list.isDefault) {
        this.shoppingLists.delete(id);

        // Also delete the shopping list items associated with this list
        for (const [itemId, item] of this.shoppingListItems.entries()) {
          if (item.shoppingListId === list.id) {
            this.shoppingListItems.delete(itemId);
          }
        }
      }
    }
  }

  private createSamplePurchase(userId: number, retailerId: number, year: number, month: number, day: number) {
    const date = new Date(year, month, day);
    const purchase: Purchase = {
      id: this.purchaseIdCounter++,
      userId,
      retailerId,
      purchaseDate: date,
      totalAmount: Math.floor(Math.random() * 10000) + 2000, // $20 - $120
      receiptImageUrl: null,
      receiptData: {}
    };
    this.purchases.set(purchase.id, purchase);

    // Add 3-5 random items to the purchase
    const numItems = Math.floor(Math.random() * 3) + 3;
    const productIds = Array.from(this.products.keys());

    for (let i = 0; i < numItems; i++) {
      const productId = productIds[Math.floor(Math.random() * productIds.length)];
      const product = this.products.get(productId)!;
      const quantity = Math.floor(Math.random() * 3) + 1;
      const unitPrice = Math.floor(Math.random() * 500) + 100; // $1 - $6
      const totalPrice = unitPrice * quantity;

      const purchaseItem: PurchaseItem = {
        id: this.purchaseItemIdCounter++,
        purchaseId: purchase.id,
        productId,
        productName: product.name,
        quantity,
        unitPrice,
        totalPrice
      };
      this.purchaseItems.set(purchaseItem.id, purchaseItem);
    }
  }

  // User methods
  async getDefaultUser(): Promise<User> {
    return Array.from(this.users.values())[0];
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const newUser: User = { ...user, id };
    this.users.set(id, newUser);
    return newUser;
  }

  async updateUser(userData: Partial<User>): Promise<User> {
    const userId = 1; // Use default user for demo
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const updatedUser = { ...user, ...userData };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async switchUserRole(currentUserId: number, targetRole: string): Promise<User> {
    const currentUser = this.users.get(currentUserId);
    if (!currentUser) {
      throw new Error('Current user not found');
    }

    // Only owner can switch roles
    if (currentUser.role !== 'owner') {
      throw new Error('Only the owner can switch user roles');
    }

    // Find the target user based on role
    let targetUser: User | undefined;

    if (targetRole === 'test_user') {
      targetUser = Array.from(this.users.values()).find(u => u.role === 'test_user');
    } else if (targetRole === 'owner') {
      targetUser = Array.from(this.users.values()).find(u => u.role === 'owner');
    }

    if (!targetUser) {
      throw new Error(`No user found with role: ${targetRole}`);
    }

    return targetUser;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async authenticateUser(username: string, password: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.username === username && user.password === password) {
        return user;
      }
    }
    return undefined;
  }

  // Retailer methods
  async getRetailer(id: number): Promise<Retailer | undefined> {
    return this.retailers.get(id);
  }

  async getRetailers(): Promise<Retailer[]> {
    return Array.from(this.retailers.values());
  }

  async createRetailer(retailer: InsertRetailer): Promise<Retailer> {
    const id = this.retailerIdCounter++;
    const newRetailer: Retailer = { ...retailer, id };
    this.retailers.set(id, newRetailer);
    return newRetailer;
  }

  // Retailer Account methods
  async getRetailerAccounts(): Promise<RetailerAccount[]> {
    const accounts = Array.from(this.retailerAccounts.values());
    // Add retailer data to each account
    return Promise.all(accounts.map(async account => {
      const retailer = await this.getRetailer(account.retailerId);
      return { ...account, retailer };
    }));
  }

  async getRetailerAccount(id: number): Promise<RetailerAccount | undefined> {
    return this.retailerAccounts.get(id);
  }

  async createRetailerAccount(account: InsertRetailerAccount): Promise<RetailerAccount> {
    const id = this.retailerAccountIdCounter++;
    // For demo, always use default user
    const userId = 1;
    const newAccount: RetailerAccount = { ...account, id, userId };
    this.retailerAccounts.set(id, newAccount);
    return newAccount;
  }

  // Product methods
  async getProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const id = this.productIdCounter++;
    const newProduct: Product = { ...product, id };
    this.products.set(id, newProduct);
    return newProduct;
  }

  // Purchase methods
  async getPurchases(): Promise<Purchase[]> {
    const purchases = Array.from(this.purchases.values());
    // Add items to each purchase
    return Promise.all(purchases.map(async purchase => {
      const items = await this.getPurchaseItems(purchase.id);
      return { ...purchase, items };
    }));
  }

  async getPurchase(id: number): Promise<Purchase | undefined> {
    const purchase = this.purchases.get(id);
    if (!purchase) return undefined;

    const items = await this.getPurchaseItems(id);
    return { ...purchase, items };
  }

  async createPurchase(purchase: InsertPurchase): Promise<Purchase> {
    const id = this.purchaseIdCounter++;
    const newPurchase: Purchase = { ...purchase, id };
    this.purchases.set(id, newPurchase);
    return newPurchase;
  }

  async createPurchaseFromReceipt(receiptData: any, userId: number = 1): Promise<Purchase> {
    // For demo purposes, create a purchase with the extracted receipt data
    const retailerId = receiptData.retailerId || 1; // Default to Walmart if not specified
    const purchaseDate = receiptData.date ? new Date(receiptData.date) : new Date();

    // Calculate total from items or use the receipt total
    const totalAmount = receiptData.total || 
      receiptData.items?.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0) || 
      Math.floor(Math.random() * 10000) + 2000; // $20 - $120 as fallback

    const purchase: InsertPurchase = {
      userId,
      retailerId,
      purchaseDate,
      totalAmount,
      receiptImageUrl: null,
      receiptData
    };

    const newPurchase = await this.createPurchase(purchase);

    // Create purchase items
    if (receiptData.items && Array.isArray(receiptData.items)) {
      for (const item of receiptData.items) {
        // Check if product exists, if not create it
        let productId: number | undefined;
        const existingProducts = await this.getProducts();
        const matchingProduct = existingProducts.find(p => 
          p.name.toLowerCase() === item.name.toLowerCase() ||
          item.name.toLowerCase().includes(p.name.toLowerCase()) ||
          p.name.toLowerCase().includes(item.name.toLowerCase())
        );

        if (matchingProduct) {
          productId = matchingProduct.id;
        } else {
          // Create a new product
          const newProduct = await this.createProduct({
            name: item.name,
            category: item.category || "General",
            subcategory: null,
            defaultUnit: null,
            restockFrequency: null,
            isNameBrand: false,
            isOrganic: item.name.toLowerCase().includes("organic")
          });
          productId = newProduct.id;
        }

        // Create purchase item
        await this.createPurchaseItem({
          purchaseId: newPurchase.id,
          productId,
          productName: item.name,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || item.price,
          totalPrice: item.price
        });
      }
    }

    return this.getPurchase(newPurchase.id) as Promise<Purchase>;
  }

  // Purchase Item methods
  async getPurchaseItems(purchaseId: number): Promise<PurchaseItem[]> {
    return Array.from(this.purchaseItems.values())
      .filter(item => item.purchaseId === purchaseId);
  }

  async createPurchaseItem(item: InsertPurchaseItem): Promise<PurchaseItem> {
    const id = this.purchaseItemIdCounter++;
    const newItem: PurchaseItem = { ...item, id };
    this.purchaseItems.set(id, newItem);
    return newItem;
  }

  // Shopping List methods
  async getShoppingLists(): Promise<ShoppingList[]> {
    // Ensure we only return the master shopping list
    const lists = Array.from(this.shoppingLists.values());
    const masterList = lists.find(list => list.isDefault);

    if (masterList) {
      return [masterList];
    }

    // If no master list exists, create one
    const defaultList: ShoppingList = {
      id: 1,
      userId: 1,
      name: 'My Shopping List',
      isDefault: true
    };
    this.shoppingLists.set(defaultList.id, defaultList);

    return [defaultList];
  }

  async getShoppingList(id: number): Promise<ShoppingList | undefined> {
    const list = this.shoppingLists.get(id);
    if (!list) return undefined;

    const items = await this.getShoppingListItems(id);
    return { ...list, items };
  }

  async getShoppingListsByUserId(userId: number): Promise<ShoppingList[]> {
    const lists = Array.from(this.shoppingLists.values()).filter(list => list.userId === userId);

    // If no lists exist for this user, create a default one
    if (lists.length === 0) {
      const defaultList: ShoppingList = {
        id: this.shoppingListIdCounter++,
        userId: userId,
        name: 'My Shopping List',
        isDefault: true
      };
      this.shoppingLists.set(defaultList.id, defaultList);
      return [defaultList];
    }

    // Add items to each list
    const listsWithItems = await Promise.all(
      lists.map(async (list) => {
        const items = await this.getShoppingListItems(list.id);
        return { ...list, items };
      })
    );

    return listsWithItems;
  }

  async getShoppingListById(id: number): Promise<ShoppingList | undefined> {
    const list = this.shoppingLists.get(id);
    if (!list) return undefined;

    const items = await this.getShoppingListItems(id);
    return { ...list, items };
  }

  async createShoppingList(data: InsertShoppingList): Promise<ShoppingList> {
    // Only allow one master shopping list - return existing one or update it
    const existingLists = Array.from(this.shoppingLists.values());
    const masterList = existingLists.find(list => list.isDefault);

    if (masterList) {
      // Update the existing master list with new data if provided
      const updatedList: ShoppingList = {
        ...masterList,
        name: data.name || masterList.name,
        isDefault: data.isDefault !== undefined ? data.isDefault : masterList.isDefault
      };
      this.shoppingLists.set(masterList.id, updatedList);
      return updatedList;
    }

    // Create the master list if it doesn't exist
    const newList: ShoppingList = {
      id: 1,
      ...data,
      isDefault: true
    };

    this.shoppingLists.set(newList.id, newList);
    return newList;
  }

  // Shopping List Item methods
  async getShoppingListItems(listId: number): Promise<ShoppingListItem[]> {
    const items = Array.from(this.shoppingListItems.values())
      .filter(item => item.shoppingListId === listId);

    // Add retailer data to items with suggestedRetailerId
    return Promise.all(items.map(async item => {
      if (item.suggestedRetailerId) {
        const retailer = await this.getRetailer(item.suggestedRetailerId);
        return { ...item, suggestedRetailer: retailer };
      }
      return item;
    }));
  }

  async getShoppingListItem(id: number): Promise<ShoppingListItem | undefined> {
    const item = this.shoppingListItems.get(id);
    if (!item) {
      return undefined;
    }

    // Add retailer data if available
    if (item.suggestedRetailerId) {
      const retailer = await this.getRetailer(item.suggestedRetailerId);
      return { ...item, suggestedRetailer: retailer };
    }

    return item;
  }

  async createShoppingListItem(itemData: Partial<ShoppingListItem>): Promise<ShoppingListItem> {
    // For demo, get the default list if not specified
    let shoppingListId = itemData.shoppingListId;
    if (!shoppingListId) {
      const lists = await this.getShoppingLists();
      const defaultList = lists.find(list => list.isDefault) || lists[0];
      if (!defaultList) {
        throw new Error("No shopping list found");
      }
      shoppingListId = defaultList.id;
    }

    const id = this.shoppingListItemIdCounter++;
    const newItem: ShoppingListItem = {
      id,
      shoppingListId,
      productId: itemData.productId || null,
      productName: itemData.productName || "New Item",
      quantity: itemData.quantity || 1,
      unit: itemData.unit || 'COUNT',
      isCompleted: itemData.isCompleted || false,
      suggestedRetailerId: itemData.suggestedRetailerId || null,
      suggestedPrice: itemData.suggestedPrice || null,
      dueDate: itemData.dueDate || null,
      category: itemData.category || null,
      notes: itemData.notes || null
    };

    this.shoppingListItems.set(id, newItem);
    console.log(`Created shopping list item ${id}:`, newItem);
    return newItem;
  }

  async addShoppingListItem(itemData: Partial<ShoppingListItem>): Promise<ShoppingListItem> {
    return this.createShoppingListItem(itemData);

    // Add retailer data if available
    if (newItem.suggestedRetailerId) {
      const retailer = await this.getRetailer(newItem.suggestedRetailerId);
      return { ...newItem, suggestedRetailer: retailer };
    }

    return newItem;
  }

  // Update shopping list item
  async updateShoppingListItem(itemId: number, updates: Partial<ShoppingListItem>): Promise<ShoppingListItem> {
    const item = this.shoppingListItems.get(itemId);
    if (!item) {
      console.log(`Shopping list item ${itemId} not found for update`);
      return null;
    }

    const updatedItem = { ...item, ...updates };
    this.shoppingListItems.set(itemId, updatedItem);

    console.log(`Successfully updated shopping list item ${itemId}:`, {
      productName: updatedItem.productName,
      isCompleted: updatedItem.isCompleted,
      notes: updatedItem.notes
    });

    // If category was updated, learn from this user correction
    if (updates.category && updates.category !== item.category) {
      try {
        const { productCategorizer } = await import('./services/productCategorizer');
        productCategorizer.learnFromUserCorrection(updatedItem.productName, updates.category);
      } catch (error) {
        console.warn('Failed to update product categorizer learning:', error);
      }
    }

    return updatedItem;
  }

  async createShoppingListItem(item: Omit<ShoppingListItem, 'id'>): Promise<ShoppingListItem> {
    const newItem: ShoppingListItem = {
      ...item,
      id: this.shoppingListItemIdCounter++
    };
    this.shoppingListItems.set(newItem.id, newItem);
    return newItem;
  }

  async deleteShoppingListItem(itemId: number): Promise<boolean> {
    const exists = this.shoppingListItems.has(itemId);
    if (exists) {
      this.shoppingListItems.delete(itemId);
      console.log(`Successfully deleted shopping list item ${itemId} from storage`);
      return true;
    }
    console.log(`Shopping list item ${itemId} not found in storage`);
    return false;
  }

  // Deal methods
  async getDeals(retailerId?: number, category?: string): Promise<StoreDeal[]> {
    let deals = Array.from(this.storeDeals.values());

    // Filter out expired deals
    const now = new Date();
    deals = deals.filter(deal => new Date(deal.endDate) > now);

    if (retailerId) {
      deals = deals.filter(deal => deal.retailerId === retailerId);
    }

    if (category) {
      deals = deals.filter(deal => deal.category === category);
    }

    // Sort by upload date (newest first) so manual uploads take priority
    deals.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

    return deals;
  }

  async getDealCategories(): Promise<string[]> {
    const deals = Array.from(this.storeDeals.values());
    const categories = [...new Set(deals.map(deal => deal.category).filter(Boolean))];
    return categories.sort();
  }

  async getDealsSummary() {
    // This method is handled directly in the routes now
    // but keeping for backward compatibility
    const allDeals = await this.getDeals();
    const now = new Date();
    const activeDeals = allDeals.filter(deal => new Date(deal.endDate) > now);

    if (activeDeals.length === 0) {
      return {
        maxSavings: 0,
        topCategory: 'No deals',
        totalDeals: 0,
        retailerCount: 0
      };
    }

    let maxSavingsPercentage = 0;
    let topCategory = 'General';

    for (const deal of activeDeals) {
      const savingsPercentage = Math.round((1 - deal.salePrice / deal.regularPrice) * 100);
      if (savingsPercentage > maxSavingsPercentage) {
        maxSavingsPercentage = savingsPercentage;
        topCategory = deal.category || 'General';
      }
    }

    const uniqueRetailers = new Set(activeDeals.map(deal => deal.retailerId));

    return {
      maxSavings: maxSavingsPercentage,
      topCategory,
      totalDeals: activeDeals.length,
      retailerCount: uniqueRetailers.size
    };
  }

  async createDeal(deal: InsertStoreDeal): Promise<StoreDeal> {
    const id = this.storeDealIdCounter++;
    const newDeal: StoreDeal = { 
      ...deal, 
      id,
      dealSource: deal.dealSource || "manual",
      circularId: deal.circularId || null,
      imageUrl: deal.imageUrl || null,
      featured: deal.featured || false,
      dealType: deal.dealType || "fixed_price",
      spendThreshold: deal.spendThreshold || null,
      discountPercentage: deal.discountPercentage || null,
      maxDiscountAmount: deal.maxDiscountAmount || null
    };
    this.storeDeals.set(id, newDeal);
    return newDeal;
  }

  // Weekly Circular methods
  async getWeeklyCirculars(retailerId?: number): Promise<WeeklyCircular[]> {
    const circulars = Array.from(this.weeklyCirculars.values());

    // Filter by retailer if specified
    if (retailerId) {
      return circulars.filter(circular => circular.retailerId === retailerId);
    }

    // Only return active circulars that haven't ended
    const now = new Date();
    return circulars.filter(circular => 
      circular.isActive && new Date(circular.endDate) >= now
    );
  }

  async getWeeklyCircular(id: number): Promise<WeeklyCircular | undefined> {
    return this.weeklyCirculars.get(id);
  }

  async createWeeklyCircular(circular: InsertWeeklyCircular): Promise<WeeklyCircular> {
    const id = this.weeklyCircularIdCounter++;
    const now = new Date();
    const newCircular: WeeklyCircular = {
      ...circular,
      id,
      createdAt: now,
      isActive: circular.isActive ?? true
    };
    this.weeklyCirculars.set(id, newCircular);
    return newCircular;
  }

  async getDealsFromCircular(circularId: number): Promise<StoreDeal[]> {
    const deals = Array.from(this.storeDeals.values());
    return deals.filter(deal => deal.circularId === circularId);
  }

  // Recommendation methods
  async getRecommendations(): Promise<Recommendation[]> {
    const recommendations = Array.from(this.recommendations.values());

    // Add retailer data
    return Promise.all(recommendations.map(async rec => {
      if (rec.suggestedRetailerId) {
        const retailer = await this.getRetailer(rec.suggestedRetailerId);
        return { ...rec, suggestedRetailer: retailer };
      }
      return rec;
    }));
  }

  async createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation> {
    const id = this.recommendationIdCounter++;
    const newRecommendation: Recommendation = { ...recommendation, id };
    this.recommendations.set(id, newRecommendation);

    // Add retailer data if available
    if (newRecommendation.suggestedRetailerId) {
      const retailer = await this.getRetailer(newRecommendation.suggestedRetailerId);
      return { ...newRecommendation, suggestedRetailer: retailer };
    }

    return newRecommendation;
  }

  // Insights methods
  async getTopPurchasedItems(): Promise<any[]> {
    const purchases = await this.getPurchases();
    const productCounts = new Map<string, { 
      count: number, 
      productName: string, 
      totalSpent: number, 
      retailers: Map<number, { count: number, retailerName: string }> 
    }>();

    // Count occurrences of each product
    for (const purchase of purchases) {
      const retailer = await this.getRetailer(purchase.retailerId!);
      const retailerName = retailer?.name || "Unknown";

      for (const item of purchase.items || []) {
        if (!productCounts.has(item.productName)) {
          productCounts.set(item.productName, {
            count: 0,
            productName: item.productName,
            totalSpent: 0,
            retailers: new Map()
          });
        }

        const product = productCounts.get(item.productName)!;
        product.count += item.quantity;
        product.totalSpent += item.totalPrice;

        // Track retailer frequency
        if (!product.retailers.has(purchase.retailerId!)) {
          product.retailers.set(purchase.retailerId!, { count: 0, retailerName });
        }
        product.retailers.get(purchase.retailerId!)!.count++;
      }
    }

    // Convert to array and sort by count
    const topItems = Array.from(productCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(product => {
        // Find most frequent retailer
        let typicalRetailer = "Various retailers";
        let maxCount = 0;

        product.retailers.forEach(retailer => {
          if (retailer.count > maxCount) {
            maxCount = retailer.count;
            typicalRetailer = retailer.retailerName;
          }
        });

        // Determine frequency
        let frequency: string;
        if (product.count >= 10) {
          frequency = "Weekly";
        } else if (product.count >= 5) {
          frequency = "Bi-weekly";
        } else if (product.count >= 2) {
          frequency = "Monthly";
        } else {
          frequency = "Occasionally";
        }

        return {
          productName: product.productName,
          frequency,
          typicalRetailer,
          typicalPrice: Math.round(product.totalSpent / product.count) / 100
        };
      });

    return topItems;
  }

  async getMonthlySpending(): Promise<any[]> {
    const purchases = await this.getPurchases();
    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;

    // Initialize monthly data
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData = monthNames.map(month => ({
      month,
      currentYear: 0,
      previousYear: 0
    }));

    // Calculate spending by month
    for (const purchase of purchases) {
      const date = new Date(purchase.purchaseDate);
      const month = date.getMonth();
      const year = date.getFullYear();

      if (year === currentYear) {
        monthlyData[month].currentYear += purchase.totalAmount / 100;
      } else if (year === previousYear) {
        monthlyData[month].previousYear += purchase.totalAmount / 100;
      }
    }

    // Return only the first 6 months for display
    return monthlyData.slice(0, 6);
  }

  async getMonthlySavings(): Promise<number> {
    // In a real app, this would calculate actual savings from deals used
    // For demo, return a random amount between $5 and $50
    return Math.floor(Math.random() * 45) + 5;
  }

  async cleanupExpiredCirculars(): Promise<number> {
    const now = new Date();
    let cleanedCount = 0;

    // Clean up expired circulars from memory
    for (const [id, circular] of this.weeklyCirculars.entries()) {
      if (circular.isActive && new Date(circular.endDate) < now) {
        circular.isActive = false;
        cleanedCount++;
      }
    }

    // Clean up expired deals
    for (const [id, deal] of this.storeDeals.entries()) {
      if (new Date(deal.endDate) < now) {
        this.storeDeals.delete(id);
      }
    }

    console.log(`Cleaned up ${cleanedCount} expired circulars from memory`);
    return cleanedCount;
  }

  // Purchase Anomaly methods
  async getPurchaseAnomalies(): Promise<PurchaseAnomaly[]> {
    return Array.from(this.purchaseAnomalies.values());
  }

  async getPurchaseAnomaly(id: number): Promise<PurchaseAnomaly | undefined> {
    return this.purchaseAnomalies.get(id);
  }

  async createPurchaseAnomaly(anomaly: InsertPurchaseAnomaly): Promise<PurchaseAnomaly> {
    const id = this.purchaseAnomalyIdCounter++;
    const newAnomaly: PurchaseAnomaly = { ...anomaly, id };
    this.purchaseAnomalies.set(id, newAnomaly);
    return newAnomaly;
  }

  async updatePurchaseAnomaly(id: number, updates: Partial<PurchaseAnomaly>): Promise<PurchaseAnomaly> {
    const anomaly = this.purchaseAnomalies.get(id);
    if (!anomaly) throw new Error("Purchase anomaly not found");

    const updatedAnomaly = { ...anomaly, ...updates };
    this.purchaseAnomalies.set(id, updatedAnomaly);
    return updatedAnomaly;
  }

  async deletePurchaseAnomaly(id: number): Promise<void> {
    if (!this.purchaseAnomalies.has(id)) {
      throw new Error("Purchase anomaly not found");
    }
    this.purchaseAnomalies.delete(id);
  }

  // Affiliate Partner methods
  async getAffiliatePartners(): Promise<AffiliatePartner[]> {
    return Array.from(this.affiliatePartners.values());
  }

  async getAffiliatePartner(id: number): Promise<AffiliatePartner | undefined> {
    return this.affiliatePartners.get(id);
  }

  async createAffiliatePartner(partner: InsertAffiliatePartner): Promise<AffiliatePartner> {
    const id = this.affiliatePartnerIdCounter++;
    const newPartner: AffiliatePartner = { ...partner, id, createdAt: new Date() };
    this.affiliatePartners.set(id, newPartner);
    return newPartner;
  }

  async updateAffiliatePartner(id: number, updates: Partial<AffiliatePartner>): Promise<AffiliatePartner> {
    const partner = this.affiliatePartners.get(id);
    if (!partner) throw new Error("Affiliate partner not found");

    const updatedPartner = { ...partner, ...updates };
    this.affiliatePartners.set(id, updatedPartner);
    return updatedPartner;
  }

  async deleteAffiliatePartner(id: number): Promise<void> {
    if (!this.affiliatePartners.has(id)) {
      throw new Error("Affiliate partner not found");
    }
    this.affiliatePartners.delete(id);
  }

  // Affiliate Product methods
  async getAffiliateProducts(partnerId?: number, category?: string): Promise<AffiliateProduct[]> {
    let products = Array.from(this.affiliateProducts.values());

    if (partnerId) {
      products = products.filter(product => product.partnerId === partnerId);
    }

    if (category) {
      products = products.filter(product => product.category === category);
    }

    return products;
  }

  async getAffiliateProduct(id: number): Promise<AffiliateProduct | undefined> {
    return this.affiliateProducts.get(id);
  }

  async getFeaturedAffiliateProducts(): Promise<AffiliateProduct[]> {
    return Array.from(this.affiliateProducts.values()).filter(product => product.featured);
  }

  async createAffiliateProduct(product: InsertAffiliateProduct): Promise<AffiliateProduct> {
    const id = this.affiliateProductIdCounter++;
    const newProduct: AffiliateProduct = { ...product, id, createdAt: new Date() };
    this.affiliateProducts.set(id, newProduct);
    return newProduct;
  }

  async updateAffiliateProduct(id: number, updates: Partial<AffiliateProduct>): Promise<AffiliateProduct> {
    const product = this.affiliateProducts.get(id);
    if (!product) throw new Error("Affiliate product not found");

    const updatedProduct = { ...product, ...updates };
    this.affiliateProducts.set(id, updatedProduct);
    return updatedProduct;
  }

  async deleteAffiliateProduct(id: number): Promise<void> {
    if (!this.affiliateProducts.has(id)) {
      throw new Error("Affiliate product not found");
    }
    this.affiliateProducts.delete(id);
  }

  // Affiliate Click methods
  async recordAffiliateClick(click: InsertAffiliateClick): Promise<AffiliateClick> {
    const id = this.affiliateClickIdCounter++;
    const newClick: AffiliateClick = { ...click, id, clickDate: new Date() };
    this.affiliateClicks.set(id, newClick);
    return newClick;
  }

  async getAffiliateClicks(userId?: number, productId?: number): Promise<AffiliateClick[]> {
    let clicks = Array.from(this.affiliateClicks.values());

    if (userId) {
      clicks = clicks.filter(click => click.userId === userId);
    }

    if (productId) {
      clicks = clicks.filter(click => click.productId === productId);
    }

    return clicks;
  }

  // Affiliate Conversion methods
  async recordAffiliateConversion(conversion: InsertAffiliateConversion): Promise<AffiliateConversion> {
    const id = this.affiliateConversionIdCounter++;
    const newConversion: AffiliateConversion = { ...conversion, id, conversionDate: new Date() };
    this.affiliateConversions.set(id, newConversion);
    return newConversion;
  }

  async getAffiliateConversions(userId?: number, status?: string): Promise<AffiliateConversion[]> {
    let conversions = Array.from(this.affiliateConversions.values());

    if (userId) {
      conversions = conversions.filter(conversion => conversion.userId === userId);
    }

    if (status) {
      conversions = conversions.filter(conversion => conversion.status === status);
    }

    return conversions;
  }

  async updateAffiliateConversionStatus(id: number, status: string): Promise<AffiliateConversion> {
    const conversion = this.affiliateConversions.get(id);
    if (!conversion) throw new Error("Affiliate conversion not found");

    const updatedConversion = { ...conversion, status };
    this.affiliateConversions.set(id, updatedConversion);
    return updatedConversion;
  }

  // Privacy and data management methods
  async getPrivacyPreferences(userId: number): Promise<any> {
    // Mock privacy preferences for demo
    return {
      allowAnalytics: true,
      allowMarketing: false,
      allowDataSharing: false,
      dataRetentionPeriod: 2555,
      allowLocationTracking: true,
      allowPersonalization: true,
      gdprConsent: false,
      ccpaOptOut: false,
      consentDate: new Date(),
      lastUpdated: new Date()
    };
  }

  async updatePrivacyPreferences(userId: number, preferences: any): Promise<any> {
    // Mock update for demo
    return { ...preferences, lastUpdated: new Date() };
  }

  async exportUserData(userId: number): Promise<any> {
    // Mock user data export for demo
    const user = await this.getUser(userId);
    const purchases = await this.getPurchases();
    const userPurchases = purchases.filter(p => p.userId === userId);

    return {
      user,
      purchases: userPurchases,
      exportDate: new Date(),
      format: 'json'
    };
  }

  async deleteUserAccount(userId: number): Promise<boolean> {
    // Mock account deletion for demo
    console.log(`Would delete user account ${userId} in production`);
    return true;
  }

  async getNotificationPreferences(userId: number): Promise<any> {
    // Mock notification preferences for demo
    return {
      dealAlerts: true,
      priceDropAlerts: true,
      weeklyDigest: false,
      expirationAlerts: true,
      recommendationUpdates: true,
      pushNotifications: false,
      emailNotifications: true,
      smsNotifications: false,
      createdAt: new Date(),
      lastUpdated: new Date()
    };
  }

  async updateNotificationPreferences(userId: number, preferences: any): Promise<any> {
    // Mock update for demo
    return { ...preferences, lastUpdated: new Date() };
  }

  async getUserStatistics(userId: number): Promise<any> {
    // Mock user statistics for demo
    return {
      totalPurchases: 15,
      totalSpent: 1250.75,
      avgPurchaseAmount: 83.38,
      favoriteRetailer: 'Walmart',
      topCategory: 'Groceries',
      monthlyAverage: 416.92
    };
  }

  async addPurchaseItem(item: any): Promise<any> {
    const purchaseItem = {
      id: this.purchaseItemIdCounter++,
      ...item,
    };

    this.purchaseItems.set(purchaseItem.id, purchaseItem);
    return purchaseItem;
  }

  async updateShoppingListItem(itemId: number, updates: Partial<ShoppingListItem>): Promise<ShoppingListItem | null> {
    const item = this.shoppingListItems.get(itemId);
    if (!item) {
      console.log(`Shopping list item ${itemId} not found for update`);
      return null;
    }

    const updatedItem = { ...item, ...updates };
    this.shoppingListItems.set(itemId, updatedItem);

    console.log(`Successfully updated shopping list item ${itemId}:`, {
      productName: updatedItem.productName,
      isCompleted: updatedItem.isCompleted,
      notes: updatedItem.notes
    });

    // If category was updated, learn from this user correction
    if (updates.category && updates.category !== item.category) {
      try {
        const { productCategorizer } = await import('./services/productCategorizer');
        productCategorizer.learnFromUserCorrection(updatedItem.productName, updates.category);
      } catch (error) {
        console.warn('Failed to update product categorizer learning:', error);
      }
    }

    return updatedItem;
  }
}

// Export the storage instance
export const storage = new MemStorage();