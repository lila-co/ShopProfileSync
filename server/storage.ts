Reasoning:The code edits include adding missing schema imports, SQL import, and storage methods for privacy preferences, notification preferences, security audit logs, affiliate conversion tracking, and search methods. I have merged these changes into the original code, resolving redundancies, adding missing functions, and adding missing storage methods.

</tool_code>
```replit_final_file>
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
  type InsertAffiliateClick, type AffiliateClick, type InsertAffiliateConversion, type AffiliateConversion
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
  createPurchaseFromReceipt(receiptData: any): Promise<Purchase>;

  // Purchase Item methods
  getPurchaseItems(purchaseId: number): Promise<PurchaseItem[]>;
  createPurchaseItem(item: InsertPurchaseItem): Promise<PurchaseItem>;

  // Shopping List methods
  getShoppingLists(): Promise<ShoppingList[]>;
  getShoppingList(id: number): Promise<ShoppingList | undefined>;
  createShoppingList(list: InsertShoppingList): Promise<ShoppingList>;

  // Shopping List Item methods
  getShoppingListItems(listId: number): Promise<ShoppingListItem[]>;
  addShoppingListItem(item: Partial<ShoppingListItem>): Promise<ShoppingListItem>;
  updateShoppingListItem(id: number, updates: Partial<ShoppingListItem>): Promise<ShoppingListItem>;
  deleteShoppingListItem(id: number): Promise<void>;

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
      password: "hashed_password",
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
      dealAlerts: true,
      priceDropAlerts: true,
      weeklyDigest: false,
      expirationAlerts: true,
      recommendationUpdates: true
    };
    this.users.set(defaultUser.id, defaultUser);

        // Create test user
    const testUser: User = {
      id: this.userIdCounter++,
      username: "testuser",
      password: "hashed_password",
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
      dealAlerts: true,
      priceDropAlerts: true,
      weeklyDigest: false,
      expirationAlerts: true,
      recommendationUpdates: true
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
        apiKey: `mock_api_key_${retailer.name.toLowerCase().replace(' ', '_')}`
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
        ...product
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
        description: 'Master shopping list',
        createdAt: new Date(),
        updatedAt: new Date(),
        isDefault: true
      };
      this.shoppingLists.set(defaultList.id, defaultList);

      // Add sample items to the master shopping list for demo purposes
      const sampleItems = [
        { productName: "Organic Milk (1 Gallon)", quantity: 1, unit: "GALLON" },
        { productName: "Free-Range Eggs (Dozen)", quantity: 2, unit: "DOZEN" },
        { productName: "Whole Wheat Bread", quantity: 1, unit: "LOAF" },
        { productName: "Bananas", quantity: 3, unit: "LB" },
        { productName: "Chicken Breast", quantity: 2, unit: "LB" },
        { productName: "Greek Yogurt", quantity: 4, unit: "CONTAINER" },
        { productName: "Baby Spinach", quantity: 1, unit: "BAG" },
        { productName: "Roma Tomatoes", quantity: 2, unit: "LB" },
        { productName: "Red Bell Peppers", quantity: 3, unit: "COUNT" },
        { productName: "Avocados", quantity: 4, unit: "COUNT" },
        { productName: "Ground Turkey", quantity: 1, unit: "LB" },
        { productName: "Quinoa", quantity: 1, unit: "BAG" },
        { productName: "Olive Oil", quantity: 1, unit: "BOTTLE" },
        { productName: "Cheddar Cheese", quantity: 1, unit: "BLOCK" },
        { productName: "Almond Butter", quantity: 1, unit: "JAR" },
        { productName: "Sparkling Water", quantity: 6, unit: "BOTTLES" }
      ];

      sampleItems.forEach(item => {
        const newItem: ShoppingListItem = {
          id: this.shoppingListItemIdCounter++,
          shoppingListId: defaultList.id,
          productName: item.productName,
          quantity: item.quantity,
          isCompleted: false,
          unit: item.unit,
          suggestedRetailerId: Math.floor(Math.random() * 3) + 1, // Random retailer 1-3
          suggestedPrice: Math.floor(Math.random() * 800) + 200, // Random price $2-10
          dueDate: null
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
        isActive: true,
        createdAt: new Date()
      },
      { 
        retailerId: 2, 
        title: "Target Weekly Ad", 
        description: "Check out the latest deals from Target", 
        startDate: new Date(), 
        endDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
        imageUrl: "https://corporate.target.com/_media/TargetCorp/news/2019/grocery/July%202020/Retail%20Updates_Store%20Experience_Good%20and%20Gather_Store%20Design_2019_2.jpg",
        isActive: true,
        createdAt: new Date()
      },
      { 
        retailerId: 3, 
        title: "Whole Foods Market Deals", 
        description: "This week's fresh deals and organic savings", 
        startDate: new Date(), 
        endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        imageUrl: "https://media1.popsugar-assets.com/files/thumbor/3RKvU_OxIBSMxGGhsB9kY-tI534=/fit-in/768x0/filters:format_auto():upscale()/2017/10/30/734/n/24155406/fcbbf68459f73997af2319.40139935_edit_img_cover_file_44213587_1509374304.jpg",
        isActive: true,
        createdAt: new Date()
      },
      { 
        retailerId: 4, 
        title: "Kroger Weekly Savings", 
        description: "Save on fresh produce and more",
        startDate: new Date(), 
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        imageUrl: "https://www.chsretailpartners.com/hs-fs/hubfs/Blog_assets/Kroger.jpg",
        isActive: true,
        createdAt: new Date()
      },
    ];

    circulars.forEach(circular => {
      const newCircular: WeeklyCircular = {
        id: this.weeklyCircularIdCounter++,
        ...circular
      };
      this.weeklyCirculars.set(newCircular.id, newCircular);
    });

    // Add store deals with more categories and retailers
    const deals = [
      // Walmart deals
      { retailerId: 1, productName: "Milk (Gallon)", regularPrice: 389, salePrice: 349, startDate: new Date(), endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), category: "Dairy", circularId: 1, dealSource: "circular", imageUrl: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400" },
      { retailerId: 1, productName: "Whole Grain Cereal", regularPrice: 499, salePrice: 399, startDate: new Date(), endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), category: "Breakfast", circularId: 1, dealSource: "circular", imageUrl: "https://images.unsplash.com/photo-1544962503-4d9d8eb6c07b?w=400" },
      { retailerId: 1, productName: "Ground Coffee", regularPrice: 899, salePrice: 699, startDate: new Date(), endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), category: "Beverages", circularId: 1, dealSource: "circular", imageUrl: "https://images.unsplash.com/photo-1559056961-84608fae629c?w=400" },
      { retailerId: 1, productName: "Frozen Pizza", regularPrice: 599, salePrice: 399, startDate: new Date(), endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), category: "Frozen Foods", circularId: 1, dealSource: "circular", imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400" },

      // Target deals
      { retailerId: 2, productName: "Toilet Paper (24 pack)", regularPrice: 1999, salePrice: 1649, startDate: new Date(), endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), category: "Household", circularId: 2, dealSource: "circular", imageUrl: "https://images.unsplash.com/photo-1584473457406-6240486418e9?w=400" },
      { retailerId: 2, productName: "Paper Towels", regularPrice: 1299, salePrice: 1099, startDate: new Date(), endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), category: "Household", circularId: 2, dealSource: "circular", imageUrl: "https://images.unsplash.com/photo-1584473457452-00c2f71bdff8?w=400" },
      { retailerId: 2, productName: "Greek Yogurt", regularPrice: 149, salePrice: 99, startDate: new Date(), endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), category: "Dairy", circularId: 2, dealSource: "circular", imageUrl: "https://images.unsplash.com/photo-1571212515416-26c10ac12ab2?w=400" },
      { retailerId: 2, productName: "Shampoo", regularPrice: 799, salePrice: 599, startDate: new Date(), endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), category: "Personal Care", circularId: 2, dealSource: "circular", imageUrl: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400" },

      // Whole Foods deals
      { retailerId: 3, productName: "Organic Bananas", regularPrice: 199, salePrice: 149, startDate: new Date(), endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), category: "Produce", circularId: 3, dealSource: "circular", imageUrl: "https://images.unsplash.com/photo-1603833665858-e61d17a86224?w=400" },
      { retailerId: 3, productName: "Chicken Breast", regularPrice: 799, salePrice: 599, startDate: new Date(), endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), category: "Meat", circularId: 3, dealSource: "circular", imageUrl: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400" },
      { retailerId: 3, productName: "Organic Apples", regularPrice: 399, salePrice: 349, startDate: new Date(), endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), category: "Produce", circularId: 3, dealSource: "circular", imageUrl: "https://i5.walmartimages.com/asr/cd75f189-77e3-40c4-835f-e3d503240812.7d1b3aa48083b60b2290364e6a0d050d.jpeg" },
      { retailerId: 3, productName: "Organic Pasta", regularPrice: 299, salePrice: 249, startDate: new Date(), endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), category: "Pantry", circularId: 3, dealSource: "circular", imageUrl: "https://images.unsplash.com/photo-1551462147-37ec24413113?w=400" },

      // Kroger deals
      { retailerId: 4, productName: "Eggs (dozen)", regularPrice: 359, salePrice: 299, startDate: new Date(), endDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), category: "Dairy", circularId: 4, dealSource: "circular", imageUrl: "https://i5.walmartimages.com/asr/20fe5306-1652-449c-a7a3-12fc36b8b7c9.4ccc9f0e21cd39e47dbc30fe29951cd1.jpeg" },
      { retailerId: 4, productName: "Bread", regularPrice: 329, salePrice: 299, startDate: new Date(), endDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), category: "Bakery", circularId: 4, dealSource: "circular", imageUrl: "https://scene7.samsclub.com/is/image/samsclub/0001111008737_A" },

      // Costco deals
      { retailerId: 5, productName: "Bulk Rice (20lb)", regularPrice: 1999, salePrice: 1599, startDate: new Date(), endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), category: "Pantry", circularId: null, dealSource: "manual", imageUrl: "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=400" },
      { retailerId: 5, productName: "Salmon Fillet (2lb)", regularPrice: 1599, salePrice: 1299, startDate: new Date(), endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), category: "Seafood", circularId: null, dealSource: "manual", imageUrl: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400" },

      // Safeway deals
      { retailerId: 6, productName: "Ice Cream", regularPrice: 599, salePrice: 399, startDate: new Date(), endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), category: "Frozen Foods", circularId: null, dealSource: "manual", imageUrl: "https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=400" },
      { retailerId: 6, productName: "Vitamin C", regularPrice: 1299, salePrice: 999, startDate: new Date(), endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), category: "Health & Wellness", circularId: null, dealSource: "manual", imageUrl: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400" },

      // Trader Joe's deals
      { retailerId: 7, productName: "Organic Wine", regularPrice: 799, salePrice: 699, startDate: new Date(), endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), category: "Beverages", circularId: null, dealSource: "manual", imageUrl: "https://images.unsplash.com/photo-1510972527921-ce03766a1cf1?w=400" },
      { retailerId: 7, productName: "Trail Mix", regularPrice: 499, salePrice: 399, startDate: new Date(), endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), category: "Snacks", circularId: null, dealSource: "manual", imageUrl: "https://images.unsplash.com/photo-1609501676725-7186f0544c5a?w=400" },
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
      purchaseDate: date.toISOString(),
      totalAmount: Math.floor(Math.random() * 10000) + 2000, // $20 - $120
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

      const purchaseItem:PurchaseItem ={
        id: this.purchaseItemIdCounter++,
        purchaseId: purchase.id,
        productId,
        productName: product.name,
        quantity,
        unitPrice,
        totalPrice,
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

  async createPurchaseFromReceipt(receiptData: any): Promise<Purchase> {
    // For demo purposes, create a purchase with the extracted receipt data
    const userId = 1; // Default user
    const retailerId = receiptData.retailerId || 1; // Default to Walmart if not specified
    const purchaseDate = receiptData.date ? new Date(receiptData.date).toISOString() : new Date().toISOString();

    // Calculate total from items or use the receipt total
    const totalAmount = receiptData.total || 
      receiptData.items?.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0) || 
      Math.floor(Math.random() * 10000) + 2000; // $20 - $120 as fallback

    const purchase: InsertPurchase = {
      userId,
      retailerId,
      purchaseDate,
      totalAmount,
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
          description: 'Master shopping list',
          createdAt: new Date(),
          updatedAt: new Date(),
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

  async createShoppingList(data: Omit<ShoppingList, 'id' | 'createdAt' | 'updatedAt'>): Promise<ShoppingList> {
      // Only allow one master shopping list - return existing one or update it
      const existingLists = Array.from(this.shoppingLists.values());
      const masterList = existingLists.find(list => list.isDefault);

      if (masterList) {
          // Update the existing master list with new data if provided
          const updatedList: ShoppingList = {
              ...masterList,
              name: data.name || masterList.name,
              description: data.description || masterList.description,
              updatedAt: new Date()
          };
          this.shoppingLists.set(masterList.id, updatedList);
          return updatedList;
      }

      // Create the master list if it doesn't exist
      const newList: ShoppingList = {
          id: 1,
          ...data,
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date()
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

  async addShoppingListItem(itemData: Partial<ShoppingListItem>): Promise<ShoppingListItem> {
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
      productName: itemData.productName || "New Item",
      quantity: itemData.quantity || 1,
      unit: itemData.unit || 'COUNT', // Keep the provided unit or default to COUNT
      isCompleted: itemData.isCompleted || false,
      suggestedRetailerId: itemData.suggestedRetailerId,
      suggestedPrice: itemData.suggestedPrice,
      dueDate: itemData.dueDate
    };

    this.shoppingListItems.set(id, newItem);

    // Add retailer data if available
    if (newItem.suggestedRetailerId) {
      const retailer = await this.getRetailer(newItem.suggestedRetailerId);
      return { ...newItem, suggestedRetailer: retailer };
    }

    return newItem;
  }

  async updateShoppingListItem(id: number, updates: Partial<ShoppingListItem>): Promise<ShoppingListItem> {
    try {
    const item = this.shoppingListItems.get(id);
    if (!item) {
      throw new Error("Shopping list item not found");
    }

    const updatedItem = { ...item, ...updates };
    this.shoppingListItems.set(id, updatedItem);

    // Add retailer data if available
    if (updatedItem.suggestedRetailerId) {
      const retailer = await this.getRetailer(updatedItem.suggestedRetailerId);
      return { ...updatedItem, suggestedRetailer: retailer };
    }

    return updatedItem;
    } catch (error) {
      console.error('Error updating shopping list item:', error);
      throw error;
    }
  }

  async deleteShoppingListItem(id: number): Promise<void> {
    if (!this.shoppingListItems.has(id)) {
      throw new Error("Shopping list item not found");
    }
    this.shoppingListItems.delete(id);
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
    deals.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

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
      featured: deal.featured || false
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

  async createWeeklyCircular(circular: Omit<WeeklyCircular, 'id' | 'createdAt' | 'updatedAt'>): Promise<WeeklyCircular> {
    const id = this.weeklyCircularIdCounter++;
    const now = new Date();
    const newCircular: WeeklyCircular = {
      ...circular,
      id,
      createdAt: now,
      updatedAt: now,
      isActive: circular.isActive ?? true
    };
    this.weeklyCirculars.set(id, newCircular);
    return newCircular;
  }

  async createStoreDeal(deal: any): Promise<StoreDeal> {
    return this.createDeal(deal);
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

  // Affiliate Partner methods
  async getAffiliatePartners(): Promise<AffiliatePartner[]> {
    return Array.from(this.affiliatePartners.values());
  }

  async getAffiliatePartner(id: number): Promise<AffiliatePartner | undefined> {
    return this.affiliatePartners.get(id);
  }

  async createAffiliatePartner(partner: InsertAffiliatePartner): Promise<AffiliatePartner> {
    const id = this.affiliatePartnerIdCounter++;
    const newPartner: AffiliatePartner = { ...partner, id };
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
    return Array.from(this.affiliateProducts.values()).filter(product => product.isFeatured);
  }

  async createAffiliateProduct(product: InsertAffiliateProduct): Promise<AffiliateProduct> {
    const id = this.affiliateProductIdCounter++;
    const newProduct: AffiliateProduct = { ...product, id };
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
    try {
      await db.delete(affiliateProducts).where(eq(affiliateProducts.id, id));
    } catch (error) {
      console.error("Error deleting affiliate product:", error);
      throw error;
    }
  }

  // Affiliate Click methods
  async recordAffiliateClick(click: InsertAffiliateClick): Promise<AffiliateClick> {
    const id = this.affiliateClickIdCounter++;
    const newClick: AffiliateClick = { ...click, id };
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
    const newConversion: AffiliateConversion = { ...conversion, id };
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

  async addRetailer(retailerData: { name: string; logoColor: string }): Promise<Retailer> {
    const newRetailer: Retailer = {
      id: this.retailerIdCounter++,
      name: retailerData.name,
      logoColor: retailerData.logoColor,
      apiEndpoint: null,
      apiKey: null
    };

    this.retailers.set(newRetailer.id, newRetailer);
    return newRetailer;
  }

  async createAffiliateConversion(conversionData: {
    affiliateId: string;
    retailerId: number;
    userId: number;
    planId?: string;
    trackingId: string;
    cartToken: string;
    estimatedValue: number;
    itemCount: number;
    status: string;
    metadata?: any;
  }): Promise<AffiliateConversion> {
    const newConversion: AffiliateConversion = {
      id: this.affiliateIdCounter++,
      ...conversionData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.affiliateConversions.set(newConversion.id, newConversion);
    return newConversion;
  }

  async updateShoppingList(id: number, data: any): Promise<ShoppingList> {
      const shoppingList = this.shoppingLists.get(id);
      if (!shoppingList) {
          throw new Error("Shopping list not found");
      }

      const updatedList: ShoppingList = {
          ...shoppingList,
          name: data.name || shoppingList.name,
          isDefault: data.isDefault !== undefined ? data.isDefault : shoppingList.isDefault,
          description: data.description !== undefined ? data.description : shoppingList.description
      };

      this.shoppingLists.set(id, updatedList);
      return updatedList;
  }

  async deleteShoppingList(id: number): Promise<void> {
      // Delete shopping list items first
      for (const [itemId, item] of this.shoppingListItems.entries()) {
          if (item.shoppingListId === id) {
              this.shoppingListItems.delete(itemId);
          }
      }

      this.shoppingLists.delete(id);
  }

  async authenticateUser(username: string, password: string): Promise<User | undefined> {
      for (const user of this.users.values()) {
          if (user.username === username && user.password === password) {
              return user;
          }
      }
      return undefined;
  }

  async searchDeals(filters: any): Promise<StoreDeal[]> {
      let deals = Array.from(this.storeDeals.values());

      if (filters.retailerId) {
          deals = deals.filter(deal => deal.retailerId === filters.retailerId);
      }

      if (filters.category) {
          deals = deals.filter(deal => deal.category === filters.category);
      }

      if (filters.maxPrice) {
          deals = deals.filter(deal => deal.salePrice <= filters.maxPrice);
      }

      if (filters.limit) {
          deals = deals.slice(0, filters.limit);
      }

      if (filters.offset) {
          deals = deals.slice(filters.offset);
      }

      return deals;
  }

  async getUserClaimedDeals(userId: number): Promise<any[]> {
      // Mock data for demo - in production you'd have a claimed_deals table
      return [
          {
              id: 1,
              dealId: 1,
              userId,
              claimedAt: new Date(),
              productName: 'Organic Bananas',
              savings: 50,
              retailerName: 'Walmart'
          }
      ];
  }

    async searchShoppingLists(query: string, userId: number): Promise<ShoppingList[]> {
        const results: ShoppingList[] = [];
        for (const list of this.shoppingLists.values()) {
            if (list.userId === userId && (list.name.includes(query) || (list.description && list.description.includes(query)))) {
                results.push(list);
            }
        }
        return results;
    }

    async searchPurchases(filters: any): Promise<Purchase[]> {
        let results = Array.from(this.purchases.values());

        if (filters.userId) {
            results =This file merges the changes from the change snippet into the original code, addressing redundancies and adding missing functions and storage methods.