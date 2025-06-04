import { eq, and, gte, lt, ilike, or } from "drizzle-orm";
import { db } from "./db";
import { 
  users, retailers, retailerAccounts, products, purchases, purchaseItems,
  shoppingLists, shoppingListItems, storeDeals, recommendations, purchaseAnomalies,
  weeklyCirculars, affiliatePartners, affiliateProducts, affiliateClicks, affiliateConversions,
  User, InsertUser, 
  Retailer, InsertRetailer, 
  RetailerAccount, InsertRetailerAccount,
  Product, InsertProduct,
  Purchase, InsertPurchase,
  PurchaseItem, InsertPurchaseItem,
  ShoppingList, InsertShoppingList,
  ShoppingListItem, InsertShoppingListItem,
  StoreDeal, InsertStoreDeal,
  WeeklyCircular, InsertWeeklyCircular,
  Recommendation, InsertRecommendation,
  PurchaseAnomaly, InsertPurchaseAnomaly,
  AffiliatePartner, InsertAffiliatePartner,
  AffiliateProduct, InsertAffiliateProduct,
  AffiliateClick, InsertAffiliateClick,
  AffiliateConversion, InsertAffiliateConversion
} from "@shared/schema";

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
      role: 'owner'
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
      role: 'test_user'
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

      const purchaseItem:PurchaseItem = {
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

  async createWeeklyCircular(circular: InsertWeeklyCircular): Promise<WeeklyCircular> {
    const id = this.weeklyCircularIdCounter++;
    const newCircular: WeeklyCircular = { 
      ...circular, 
      id,
      isActive: circular.isActive !== undefined ? circular.isActive : true,
      createdAt: new Date()
    };
    this.weeklyCirculars.set(id, newCircular);
    return newCircular;
  }

  async getDealsFromCircular(circularId: number): Promise<StoreDeal[]> {
    return Array.from(this.storeDeals.values())
      .filter(deal => deal.circularId === circularId);
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
            results = results.filter(purchase => purchase.userId === filters.userId);
        }
        if (filters.retailerId) {
            results = results.filter(purchase => purchase.retailerId === filters.retailerId);
        }
        if (filters.startDate) {
            const startDate = new Date(filters.startDate);
            results = results.filter(purchase => new Date(purchase.purchaseDate) >= startDate);
        }
        if (filters.endDate) {
            const endDate = new Date(filters.endDate);
            results = results.filter(purchase => new Date(purchase.purchaseDate) <= endDate);
        }
        return results;
    }

    async getUserStatistics(userId: number): Promise<any> {
        // Mock statistics for demo
        return {
            totalPurchases: 25,
            totalSpent: 125000, // $1,250.00
            averageOrderValue: 5000, // $50.00
            mostShoppedRetailer: 'Walmart',
            topCategories: [
                { category: 'Groceries', amount: 85000, percentage: 68 },
                { category: 'Household', amount: 25000, percentage: 20 },
                { category: 'Personal Care', amount: 15000, percentage: 12 }
            ],
            monthlyTrend: [
                { month: 'Jan', amount: 42000 },
                { month: 'Feb', amount: 38000 },
                { month: 'Mar', amount: 45000 }
            ],
            savingsThisMonth: 1500 // $15.00
        };
    }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.username === username);
  }

  async getPrivacyPreferences(userId: number): Promise<any> {
    // For demo, return default privacy preferences
    return {
      userId,
      allowAnalytics: true,
      allowMarketing: false,
      allowDataSharing: false,
      allowLocationTracking: true,
      allowPersonalization: true,
      gdprConsent: false,
      ccpaOptOut: false,
      dataRetentionPeriod: 2555,
      consentDate: new Date(),
      lastUpdated: new Date()
    };
  }

  async updatePrivacyPreferences(userId: number, preferences: any): Promise<any> {
    // For demo, just return the updated preferences
    const existing = await this.getPrivacyPreferences(userId);
    const updated = {
      ...existing,
      ...preferences,
      lastUpdated: new Date()
    };

    console.log(`Updated privacy preferences for user ${userId}:`, updated);
    return updated;
  }

  async exportUserData(userId: number): Promise<any> {
    const user = await this.getUser(userId);
    const purchases = await this.getPurchases();
    const userPurchases = purchases.filter(p => p.userId === userId);
    const shoppingLists = await this.getShoppingLists();
    const recommendations = await this.getRecommendations();
    const privacyPreferences = await this.getPrivacyPreferences(userId);

    return {
      user: {
        id: user?.id,
        username: user?.username,
        firstName: user?.firstName,
        lastName: user?.lastName,
        email: user?.email,
        householdType: user?.householdType,
        householdSize: user?.householdSize,
        preferences: {
          preferNameBrand: user?.preferNameBrand,
          preferOrganic: user?.preferOrganic,
          buyInBulk: user?.buyInBulk,
          prioritizeCostSavings: user?.prioritizeCostSavings,
          shoppingRadius: user?.shoppingRadius
        }
      },
      purchases: userPurchases.map(p => ({
        id: p.id,
        date: p.purchaseDate,
        retailerId: p.retailerId,
        totalAmount: p.totalAmount,
        items: p.items?.map(item => ({
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice
        }))
      })),
      shoppingLists: shoppingLists.map(list => ({
        id: list.id,
        name: list.name,
        isDefault: list.isDefault,
        items: list.items?.map(item => ({
          productName: item.productName,
          quantity: item.quantity,
          unit: item.unit,
          isCompleted: item.isCompleted
        }))
      })),
      recommendations: recommendations.map(rec => ({
        productName: rec.productName,
        recommendedDate: rec.recommendedDate,
        reason: rec.reason,
        savings: rec.savings
      })),
      privacyPreferences,
      exportDate: new Date(),
      exportType: 'gdpr_request'
    };
  }

  async deleteUserAccount(userId: number): Promise<boolean> {
    console.log(`Account deletion requested for user ${userId}`);

    // In a real implementation, this would:
    // 1. Delete all user data
    // 2. Anonymize any data that needs to be retained
    // 3. Send confirmation emails
    // 4. Log the deletion for audit purposes

    // For demo, just log the request
    const user = await this.getUser(userId);
    if (user) {
      console.log(`Deleting account for user: ${user.username} (${user.email})`);
      return true;
    }

    return false;
  }

  async updatePurchase(id: number, data: any): Promise<Purchase> {
      const purchase = this.purchases.get(id);
      if (!purchase) {
          throw new Error("Purchase not found");
      }

      const updatedPurchase: Purchase = {
          ...purchase,
          userId: data.userId || purchase.userId,
          retailerId: data.retailerId || purchase.retailerId,
          purchaseDate: data.purchaseDate || purchase.purchaseDate,
          totalAmount: data.totalAmount || purchase.totalAmount,
          receiptData: data.receiptData || purchase.receiptData,
          receiptImageUrl: data.receiptImageUrl !== undefined ? data.receiptImageUrl : purchase.receiptImageUrl
      };

      this.purchases.set(id, updatedPurchase);
      return updatedPurchase;
  }

  async deletePurchase(id: number): Promise<void> {
      this.purchases.delete(id);
  }

  async updateRetailerAccount(id: number, data: any): Promise<RetailerAccount> {
      const account = this.retailerAccounts.get(id);
      if (!account) {
          throw new Error("Retailer account not found");
      }

      const updatedAccount: RetailerAccount = {
          ...account,
          username: data.username || account.username,
          password: data.password || account.password,
          apiKey: data.apiKey || account.apiKey
      };

      this.retailerAccounts.set(id, updatedAccount);
      return updatedAccount;
  }

  async deleteRetailerAccount(id: number): Promise<boolean> {
      const existed = this.retailerAccounts.has(id);
      this.retailerAccounts.delete(id);
      return existed;
  }

  async getRetailerAccount(id: number): Promise<RetailerAccount | undefined> {
      return this.retailerAccounts.get(id);
  }
}

// Database implementation of the storage interface

export class DatabaseStorage implements IStorage {
  // User methods
  async getDefaultUser(): Promise<User> {
    const [user] = await db.select().from(users).where(eq(users.id, 1));
    if (user) return user;

    // Create default user if it doesn't exist
    return this.createUser({
      username: "johndoe",
      password: "hashed_password",
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      householdType: "family",
      householdSize: 4,
      preferNameBrand: false,
      preferOrganic: true,
      buyInBulk: true,
      prioritizeCostSavings: true,
      shoppingRadius: 15
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user || undefined;
    } catch (error) {
      console.error("Error getting user:", error);
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return user || undefined;
    } catch (error) {
      console.error("Error getting user by username:", error);
      throw error;
    }
  }

  async getPrivacyPreferences(userId: number): Promise<any> {
    try {
      // For demo implementation, return default preferences
      // In production, this would query the dataPrivacyPreferences table
      return {
        userId,
        allowAnalytics: true,
        allowMarketing: false,
        allowDataSharing: false,
        allowLocationTracking: true,
        allowPersonalization: true,
        gdprConsent: false,
        ccpaOptOut: false,
        dataRetentionPeriod: 2555,
        consentDate: new Date(),
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error("Error getting privacy preferences:", error);
      throw error;
    }
  }

  async updatePrivacyPreferences(userId: number, preferences: any): Promise<any> {
    try {
      // For demo implementation, just return updated preferences
      // In production, this would update the dataPrivacyPreferences table
      const existing = await this.getPrivacyPreferences(userId);
      const updated = {
        ...existing,
        ...preferences,
        lastUpdated: new Date()
      };

      console.log(`Updated privacy preferences for user ${userId}:`, updated);
      return updated;
    } catch (error) {
      console.error("Error updating privacy preferences:", error);
      throw error;
    }
  }

  async getNotificationPreferences(userId: number): Promise<any> {
    try {
      // For demo implementation, return default preferences
      // In production, this would query the notificationPreferences table
      return {
        userId,
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
    } catch (error) {
      console.error("Error getting notification preferences:", error);
      throw error;
    }
  }

  async updateNotificationPreferences(userId: number, preferences: any): Promise<any> {
    try {
      // For demo implementation, just return updated preferences
      // In production, this would update the notificationPreferences table
      const existing = await this.getNotificationPreferences(userId);
      const updated = {
        ...existing,
        ...preferences,
        lastUpdated: new Date()
      };

      console.log(`Updated notification preferences for user ${userId}:`, updated);
      return updated;
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      throw error;
    }
  }

  async exportUserData(userId: number): Promise<any> {
    try {
      const user = await this.getUser(userId);
      const purchases = await this.getPurchases(userId);
      const shoppingLists = await this.getShoppingLists();
      const recommendations = await this.getRecommendations();
      const privacyPreferences = await this.getPrivacyPreferences(userId);

      return {
        user: {
          id: user?.id,
          username: user?.username,
          firstName: user?.firstName,
          lastName: user?.lastName,
          email: user?.email,
          householdType: user?.householdType,
          householdSize: user?.householdSize,
          preferences: {
            preferNameBrand: user?.preferNameBrand,
            preferOrganic: user?.preferOrganic,
            buyInBulk: user?.buyInBulk,
            prioritizeCostSavings: user?.prioritizeCostSavings,
            shoppingRadius: user?.shoppingRadius
          }
        },
        purchases: purchases.map(p => ({
          id: p.id,
          date: p.purchaseDate,
          retailerId: p.retailerId,
          totalAmount: p.totalAmount
        })),
        shoppingLists,
        recommendations,
        privacyPreferences,
        exportDate: new Date(),
        exportType: 'gdpr_request'
      };
    } catch (error) {
      console.error("Error exporting user data:", error);
      throw error;
    }
  }

  async deleteUserAccount(userId: number): Promise<boolean> {
    try {
      console.log(`Account deletion requested for user ${userId}`);

      // In a real implementation, this would:
      // 1. Delete all user data from all tables
      // 2. Anonymize any data that needs to be retained for legal/business reasons
      // 3. Send confirmation emails
      // 4. Log the deletion for audit purposes

      const user = await this.getUser(userId);
      if (user) {
        console.log(`Deleting account for user: ${user.username} (${user.email})`);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error deleting user account:", error);
      throw error;
    }
  }

  async createUser(userData: InsertUser): Promise<User> {
    try {
      const [user] = await db.insert(users).values(userData).returning();
      return user;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  async updateUser(userData: Partial<User>): Promise<User> {
    if (!userData.id) throw new Error("User ID is required for update");

    try {
const [updatedUser] = await db
        .update(users)
        .set(userData)
        .where(eq(users.id, userData.id))
        .returning();

      if (!updatedUser) throw new Error("User not found");
      return updatedUser;
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  }

  async authenticateUser(username: string, password: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(and(eq(users.username, username), eq(users.password, password)));
      return user || undefined;
    } catch (error) {
      console.error("Error authenticating user:", error);
      throw error;
    }
  }

  // Retailer methods
  async getRetailers(): Promise<Retailer[]> {
    try {
      return db.select().from(retailers);
    } catch (error) {
      console.error("Error getting retailers:", error);
      throw error;
    }
  }

  async getRetailer(id: number): Promise<Retailer | undefined> {
    try {
      const [retailer] = await db.select().from(retailers).where(eq(retailers.id, id));
      return retailer || undefined;
    } catch (error) {
      console.error("Error getting retailer:", error);
      throw error;
    }
  }

  async createRetailer(retailerData: {
    name: string;
    logoColor: string;
    isActive: boolean;
  }): Promise<Retailer> {
    try {
      const [retailer] = await db.insert(retailers).values(retailerData).returning();
      return retailer;
    } catch (error) {
      console.error("Error creating retailer:", error);
      throw error;
    }
  }

  // Retailer Account methods
  async getRetailerAccounts(): Promise<RetailerAccount[]> {
    try {
      return db.select().from(retailerAccounts);
    } catch (error) {
      console.error("Error getting retailer accounts:", error);
      throw error;
    }
  }

  async getRetailerAccount(id: number): Promise<RetailerAccount | undefined> {
    try {
      const [account] = await db.select().from(retailerAccounts).where(eq(retailerAccounts.id, id));
      return account || undefined;
    } catch (error) {
      console.error("Error getting retailer account:", error);
      throw error;
    }
  }

  async createRetailerAccount(accountData: InsertRetailerAccount): Promise<RetailerAccount> {
    try {
      const [account] = await db.insert(retailerAccounts).values(accountData).returning();
      return account;
    } catch (error) {
      console.error("Error creating retailer account:", error);
      throw error;
    }
  }

  // Product methods
  async getProducts(): Promise<Product[]> {
    try {
      const allProducts = await db.select().from(products);

      if (allProducts.length === 0) {
        // Add some default products if none exist
        await this.createProduct({
          name: "Milk (Gallon)",
          category: "Dairy",
          subcategory: null,
          defaultUnit: "gallon",
          restockFrequency: "weekly",
          isNameBrand: false,
          isOrganic: false
        });

        await this.createProduct({
          name: "Eggs (Dozen)",
          category: "Dairy",
          subcategory: null,
          defaultUnit: "dozen",
          restockFrequency: "weekly",
          isNameBrand: false,
          isOrganic: false
        });

        await this.createProduct({
          name: "Bananas",
          category: "Produce",
          subcategory: "Fruits",
          defaultUnit: "bunch",
          restockFrequency: "weekly",
          isNameBrand: false,
          isOrganic: false
        });

        return this.getProducts();
      }

      return allProducts;
    } catch (error) {
      console.error("Error getting products:", error);
      throw error;
    }
  }

  async getProduct(id: number): Promise<Product | undefined> {
    try {
      const [product] = await db.select().from(products).where(eq(products.id, id));
      return product || undefined;
    } catch (error) {
      console.error("Error getting product:", error);
      throw error;
    }
  }

  async createProduct(productData: InsertProduct): Promise<Product> {
    try {
      const [product] = await db.insert(products).values(productData).returning();
      return product;
    } catch (error) {
      console.error("Error creating product:", error);
      throw error;
    }
  }

  // Purchase methods with pagination and date filtering
  async getPurchases(userId?: number, limit: number = 50, offset: number = 0, startDate?: Date, endDate?: Date): Promise<Purchase[]> {
    try {
      let query = db.select().from(purchases);

      if (userId) {
        query = query.where(eq(purchases.userId, userId));
      }

      if (startDate && endDate) {
        query = query.where(
          and(
            gte(purchases.purchaseDate, startDate),
            lte(purchases.purchaseDate, endDate)
          )
        );
      }

      return query
        .orderBy(desc(purchases.purchaseDate))
        .limit(limit)
        .offset(offset);
    } catch (error) {
      console.error("Error getting purchases:", error);
      throw error;
    }
  }

  // Get recent purchases for analysis (last 3 months by default)
  async getRecentPurchases(userId: number, monthsBack: number = 3): Promise<Purchase[]> {
    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - monthsBack);

      return db.select()
        .from(purchases)
        .where(
          and(
            eq(purchases.userId, userId),
            gte(purchases.purchaseDate, startDate)
          )
        )
        .orderBy(desc(purchases.purchaseDate));
    } catch (error) {
      console.error("Error getting recent purchases:", error);
      throw error;
    }
  }

  async getPurchase(id: number): Promise<Purchase | undefined> {
    try {
      const [purchase] = await db.select().from(purchases).where(eq(purchases.id, id));
      return purchase || undefined;
    } catch (error) {
      console.error("Error getting purchase:", error);
      throw error;
    }
  }

  async createPurchase(purchaseData: InsertPurchase): Promise<Purchase> {
    try {
      const [purchase] = await db.insert(purchases).values(purchaseData).returning();
      return purchase;
    } catch (error) {
      console.error("Error creating purchase:", error);
      throw error;
    }
  }

  async createPurchaseFromReceipt(receiptData: any): Promise<Purchase> {
    // In a real implementation, this would parse receipt data and create a purchase
    // For now, use demo data
    try {
      const purchase = await this.createPurchase({
        userId: 1,
        retailerId: 1,
        purchaseDate: new Date(),
        totalAmount: 2500,
        receiptData: receiptData,
        receiptImageUrl: null
      });

      return purchase;
    } catch (error) {
      console.error("Error creating purchase from receipt:", error);
      throw error;
    }
  }

  // Purchase Item methods
  async getPurchaseItems(purchaseId: number): Promise<PurchaseItem[]> {
    try {
      return db.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, purchaseId));
    } catch (error) {
      console.error("Error getting purchase items:", error);
      throw error;
    }
  }

  async createPurchaseItem(itemData: InsertPurchaseItem): Promise<PurchaseItem> {
    try {
      const [item] = await db.insert(purchaseItems).values(itemData).returning();
      return item;
    } catch (error) {
      console.error("Error creating purchase item:", error);
      throw error;
    }
  }

  // Shopping List methods
  async getShoppingLists(): Promise<ShoppingList[]> {
    try {
    // Ensure we only return the master shopping list
    const result = await db.select().from(shoppingLists).where(eq(shoppingLists.isDefault, true)).limit(1);
    return result;
    } catch (error) {
      console.error("Error getting shopping lists:", error);
      throw error;
    }
  }

  async getShoppingList(id: number): Promise<ShoppingList | undefined> {
    try {
      const [list] = await db.select().from(shoppingLists).where(eq(shoppingLists.id, id));

      if (list) {
        // Fetch items for the list
        const items = await this.getShoppingListItems(id);
        return { ...list, items };
      }

      return undefined;
    } catch (error) {
      console.error("Error getting shopping list:", error);
      throw error;
    }
  }

  async createShoppingList(listData: any): Promise<ShoppingList> {
    try {
    // Check for and delete any existing default shopping lists
    await db.delete(shoppingLists).where(eq(shoppingLists.isDefault, true));

    // Set the new list as the default and insert it
    listData.isDefault = true; // Enforce default status
    const [list] = await db.insert(shoppingLists).values(listData).returning();

    // Initialize with empty items array
    return { ...list, items: [] };
    } catch (error) {
      console.error("Error creating shopping list:", error);
      throw error;
    }
  }

  // Shopping List Item methods
  async getShoppingListItems(listId: number): Promise<ShoppingListItem[]> {
    try {
      return db.select().from(shoppingListItems).where(eq(shoppingListItems.shoppingListId, listId));
    } catch (error) {
      console.error("Error getting shopping list items:", error);
      throw error;
    }
  }

  async addShoppingListItem(itemData: Partial<ShoppingListItem>): Promise<ShoppingListItem> {
    // Ensure quantity defaults to 1 if not provided and is properly converted to number
    let quantity = itemData.quantity || 1;

    // Handle both string and number inputs for quantity
    quantity = typeof quantity === 'string' ? parseFloat(quantity) : Number(quantity);

    if (isNaN(quantity) || quantity < 0) {
      quantity = 1;
    }

    try {
      const [item] = await db.insert(shoppingListItems).values({
        ...itemData,
        quantity,
        isCompleted: false,
        dueDate: null,
        productId: null,
        suggestedRetailerId: null,
        suggestedPrice: null
      } as any).returning();

      return item;
    } catch (error) {
      console.error("Error adding shopping list item:", error);
      throw error;
    }
  }

  async updateShoppingListItem(id: number, updates: Partial<ShoppingListItem>): Promise<ShoppingListItem> {
    // Ensure quantity is properly converted to a number if provided
    const processedUpdates = { ...updates };
    if (processedUpdates.quantity !== undefined) {
      // Handle both string and number inputs for quantity
      const quantityValue = typeof processedUpdates.quantity === 'string' 
        ? parseFloat(processedUpdates.quantity) 
        : Number(processedUpdates.quantity);

      if (isNaN(quantityValue) || quantityValue < 0) {
        throw new Error("Invalid quantity value");
      }

      // Ensure quantity is always an integer for database storage
      processedUpdates.quantity = Math.round(quantityValue);
    }

    try {
    const [updatedItem] = await db
      .update(shoppingListItems)
      .set(processedUpdates)
      .where(eq(shoppingListItems.id, id))
      .returning();

    if (!updatedItem) {
      throw new Error("Shopping list item not found");
    }

    return updatedItem;
    } catch (error) {
      console.error("Error updating shopping list item:", error);
      throw error;
    }
  }

  async deleteShoppingListItem(id: number): Promise<void> {
    try {
      await db.delete(shoppingListItems).where(eq(shoppingListItems.id, id));
    } catch (error) {
      console.error("Error deleting shopping list item:", error);
      throw error;
    }
  }

  // Deal methods
  async getDeals(retailerId?: number, category?: string): Promise<StoreDeal[]> {
    try {
      let query = db.select().from(storeDeals);

      // Filter out expired deals
      const now = new Date();
      query = query.where(gte(storeDeals.endDate, now));

      if (retailerId) {
        query = query.where(eq(storeDeals.retailerId, retailerId));
      }

      if (category) {
        query = query.where(eq(storeDeals.category, category));
      }

      return query;
    } catch (error) {
      console.error("Error getting deals:", error);
      throw error;
    }
  }

  async getDealCategories(): Promise<string[]> {
    const deals = await this.getDeals();
    const categories = [...new Set(deals.map(deal => deal.category).filter(Boolean))];
    return categories.sort();
  }

  async getDealsSummary(): Promise<any[]> {
    try {
      const deals = await this.getDeals();
      const retailers = await this.getRetailers();

      // Group deals by retailer
      const dealsByRetailer = {};

      retailers.forEach(retailer => {
        dealsByRetailer[retailer.id] = {
          retailerId: retailer.id,
          retailerName: retailer.name,
          dealCount: 0,
          totalSavings: 0
        };
      });

      deals.forEach(deal => {
        if (dealsByRetailer[deal.retailerId]) {
          dealsByRetailer[deal.retailerId].dealCount += 1;
          dealsByRetailer[deal.retailerId].totalSavings += deal.regularPrice - deal.salePrice;
        }
      });

      return Object.values(dealsByRetailer);
    } catch (error) {
      console.error("Error getting deals summary:", error);
      throw error;
    }
  }

  async createDeal(dealData: {
    retailerId: number;
    productName: string;
    category: string;
    regularPrice: number;
    salePrice: number;
    imageUrl?: string;
    startDate: Date;
    endDate: Date;
  }): Promise<StoreDeal> {
    try {
      const [deal] = await db.insert(storeDeals).values(dealData).returning();
      return deal;
    } catch (error) {
      console.error("Error creating deal:", error);
      throw error;
    }
  }

  async getWeeklyCirculars(retailerId?: number): Promise<WeeklyCircular[]> {
    try {
      let query = db.select().from(weeklyCirculars);

      if (retailerId) {
        query = query.where(eq(weeklyCirculars.retailerId, retailerId));
      }

      // Get active circulars by default (where end date is in the future)
      query = query.where(
        and(
          eq(weeklyCirculars.isActive, true),
          gte(weeklyCirculars.endDate, new Date())
        )
      );

      return query;
    } catch (error) {
      console.error("Error getting weekly circulars:", error);
      throw error;
    }
  }

  async getWeeklyCircular(id: number): Promise<WeeklyCircular | undefined> {
    try {
      const [circular] = await db.select().from(weeklyCirculars).where(eq(weeklyCirculars.id, id));
      return circular;
    } catch (error) {
      console.error("Error getting weekly circular:", error);
      throw error;
    }
  }

  async createWeeklyCircular(circularData: InsertWeeklyCircular): Promise<WeeklyCircular> {
    try {
      const [circular] = await db.insert(weeklyCirculars).values(circularData).returning();
      return circular;
    } catch (error) {
      console.error("Error creating weekly circular:", error);
      throw error;
    }
  }

  async getDealsFromCircular(circularId: number): Promise<StoreDeal[]> {
    try {
      return db.select().from(storeDeals).where(eq(storeDeals.circularId, circularId));
    } catch (error) {
      console.error("Error getting deals from circular:", error);
      throw error;
    }
  }

  // Recommendation methods
  async getRecommendations(): Promise<Recommendation[]> {
    try {
      // Get default user
      const user = await this.getDefaultUser();

      const result = await db
        .select()
        .from(recommendations)
        .where(eq(recommendations.userId, user.id));

      if (result.length === 0) {
        console.log("Generating recommendations for user:", user.id);

        // Create demo recommendations
        await this.createRecommendation({
          userId: user.id,
          productName: "Bananas",
          productId: null,
          recommendedDate: new Date(),
          daysUntilPurchase: 2,
          suggestedRetailerId: 1,
          suggestedPrice: 349,
          savings: 50,
          reason: "Based on your weekly purchase pattern"
        });

        await this.createRecommendation({
          userId: user.id,
          productName: "Paper Towels",
          productId: null,
          recommendedDate: new Date(),
          daysUntilPurchase: 3,
          suggestedRetailerId: 2,
          suggestedPrice: 649,
          savings: 150,
          reason: "You typically buy this every 2 weeks"
        });

        await this.createRecommendation({
          userId: user.id,
          productName: "Milk (Gallon)",
          productId: null,
          recommendedDate: new Date(),
          daysUntilPurchase: 1,
          suggestedRetailerId: 1,
          suggestedPrice: 349,
          savings: 40,
          reason: "You're almost out based on purchase history"
        });

        return db
          .select()
          .from(recommendations)
          .where(eq(recommendations.userId, user.id));
      }

      return result;
    } catch (error) {
      console.error("Error getting recommendations:", error);
      throw error;
    }
  }

  async createRecommendation(recommendationData: InsertRecommendation): Promise<Recommendation> {
    try {
      const [recommendation] = await db
        .insert(recommendations)
        .values(recommendationData)
        .returning();

      return recommendation;
    } catch (error) {
      console.error("Error creating recommendation:", error);
      throw error;
    }
  }

  // Insights methods
  async getTopPurchasedItems(): Promise<any[]> {
    // In a real implementation, this would query the database
    // For demo, return mock data
    return [
      { productName: "Bananas", frequency: 12, totalSpent: 2388 },
      { productName: "Milk (Gallon)", frequency: 8, totalSpent: 3192 },
      { productName: "Eggs (Dozen)", frequency: 6, totalSpent: 1794 },
      { productName: "Paper Towels", frequency: 4, totalSpent: 3196 },
      { productName: "Bread", frequency: 8, totalSpent: 2392 }
    ];
  }

  async getMonthlySpending(): Promise<any[]> {
    // In a real implementation, this would query the database
    // For demo, return mock data
    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;

    return [
      { month: "Jan", currentYear: 35000, previousYear: 32000 },
      { month: "Feb", currentYear: 28000, previousYear: 30000 },
      { month: "Mar", currentYear: 32000, previousYear: 29000 },
      { month: "Apr", currentYear: 30000, previousYear: 27000 },
      { month: "May", currentYear: 29000, previousYear: 28000 },
      { month: "Jun", currentYear: 31000, previousYear: 30000 },
      { month: "Jul", currentYear: 33000, previousYear: 31000 },
      { month: "Aug", currentYear: 34000, previousYear: 32000 },
      { month: "Sep", currentYear: 32000, previousYear: 33000 },
      { month: "Oct", currentYear: 31000, previousYear: 32000 },
      { month: "Nov", currentYear: 33000, previousYear: 34000 },
      { month: "Dec", currentYear: 38000, previousYear: 39000 }
    ];
  }

  async getMonthlySavings(): Promise<number> {
    // In a real implementation, this would query the database
    // For demo, return random number between 10-50
    return Math.floor(Math.random() * 40) + 10;
  }

  // Cleanup methods
  async cleanupExpiredCirculars(): Promise<number> {
    const now = new Date();

    try {
      // Delete expired circulars
      const expiredCirculars = await db
        .select()
        .from(weeklyCirculars)
        .where(
          and(
            eq(weeklyCirculars.isActive, true),
            lt(weeklyCirculars.endDate, now)
          )
        );

      if (expiredCirculars.length > 0) {
        // Mark them as inactive instead of deleting (for audit trail)
        await db
          .update(weeklyCirculars)
          .set({ isActive: false })
          .where(
            and(
              eq(weeklyCirculars.isActive, true),
              lt(weeklyCirculars.endDate, now)
            )
          );

        // Also cleanup related expired deals
        await db
          .delete(storeDeals)
          .where(lt(storeDeals.endDate, now));
      }

      console.log(`Cleaned up ${expiredCirculars.length} expired circulars`);
      return expiredCirculars.length;
    } catch (error) {
      console.error('Error cleaning up expired circulars:', error);
      return 0;
    }
  }

  // Purchase Anomaly methods
  async getPurchaseAnomalies(): Promise<PurchaseAnomaly[]> {
    try {
      const anomalies = await db.select().from(purchaseAnomalies);
      return anomalies;
    } catch (error) {
      console.error("Error getting purchase anomalies:", error);
      throw error;
    }
  }

  async getPurchaseAnomaly(id: number): Promise<PurchaseAnomaly | undefined> {
    try {
      const [anomaly] = await db
        .select()
        .from(purchaseAnomalies)
        .where(eq(purchaseAnomalies.id, id));
      return anomaly;
    } catch (error) {
      console.error("Error getting purchase anomaly:", error);
      throw error;
    }
  }

  async createPurchaseAnomaly(anomalyData: InsertPurchaseAnomaly): Promise<PurchaseAnomaly> {
    try {
      const [anomaly] = await db
        .insert(purchaseAnomalies)
        .values(anomalyData)
        .returning();
      return anomaly;
    } catch (error) {
      console.error("Error creating purchase anomaly:", error);
      throw error;
    }
  }

  async updatePurchaseAnomaly(id: number, updates: Partial<PurchaseAnomaly>): Promise<PurchaseAnomaly> {
    try {
      const [updatedAnomaly] = await db
        .update(purchaseAnomalies)
        .set(updates)
        .where(eq(purchaseAnomalies.id, id))
        .returning();

      if (!updatedAnomaly) {
        throw new Error(`Purchase anomaly with id ${id} not found`);
      }

      return updatedAnomaly;
    } catch (error) {
      console.error("Error updating purchase anomaly:", error);
      throw error;
    }
  }

  async deletePurchaseAnomaly(id: number): Promise<void> {
    try {
      await db
        .delete(purchaseAnomalies)
        .where(eq(purchaseAnomalies.id, id));
    } catch (error) {
      console.error("Error deleting purchase anomaly:", error);
      throw error;
    }
  }

  // Affiliate Partner methods
  async getAffiliatePartners(): Promise<AffiliatePartner[]> {
    try {
      return db.select().from(affiliatePartners);
    } catch (error) {
      console.error("Error getting affiliate partners:", error);
      throw error;
    }
  }

  async getAffiliatePartner(id: number): Promise<AffiliatePartner | undefined> {
    try {
      const [partner] = await db.select().from(affiliatePartners).where(eq(affiliatePartners.id, id));
      return partner || undefined;
    } catch (error) {
      console.error("Error getting affiliate partner:", error);
      throw error;
    }
  }

  async createAffiliatePartner(partnerData: InsertAffiliatePartner): Promise<AffiliatePartner> {
    try {
      const [partner] = await db.insert(affiliatePartners).values(partnerData).returning();
      return partner;
    } catch (error) {
      console.error("Error creating affiliate partner:", error);
      throw error;
    }
  }

  async updateAffiliatePartner(id: number, updates: Partial<AffiliatePartner>): Promise<AffiliatePartner> {
    try {
      const [partner] = await db
        .update(affiliatePartners)
        .set(updates)
        .where(eq(affiliatePartners.id, id))
        .returning();
      if (!partner) throw new Error("Affiliate partner not found");
      return partner;
    } catch (error) {
      console.error("Error updating affiliate partner:", error);
      throw error;
    }
  }

  async deleteAffiliatePartner(id: number): Promise<void> {
    try {
      await db.delete(affiliatePartners).where(eq(affiliatePartners.id, id));
    } catch (error) {
      console.error("Error deleting affiliate partner:", error);
      throw error;
    }
  }

  // Affiliate Product methods
  async getAffiliateProducts(partnerId?: number, category?: string): Promise<AffiliateProduct[]> {
    try {
      let query = db.select().from(affiliateProducts);

      if (partnerId) {
        query = query.where(eq(affiliateProducts.partnerId, partnerId));
      }

      if (category) {
        query = query.where(eq(affiliateProducts.category, category));
      }

      return query;
    } catch (error) {
      console.error("Error getting affiliate products:", error);
      throw error;
    }
  }

  async getAffiliateProduct(id: number): Promise<AffiliateProduct | undefined> {
    try {
      const [product] = await db.select().from(affiliateProducts).where(eq(affiliateProducts.id, id));
      return product || undefined;
    } catch (error) {
      console.error("Error getting affiliate product:", error);
      throw error;
    }
  }

  async getFeaturedAffiliateProducts(): Promise<AffiliateProduct[]> {
    try {
      return db.select().from(affiliateProducts).where(eq(affiliateProducts.isFeatured, true));
    } catch (error) {
      console.error("Error getting featured affiliate products:", error);
      throw error;
    }
  }

  async createAffiliateProduct(productData: InsertAffiliateProduct): Promise<AffiliateProduct> {
    try {
      const [product] = await db.insert(affiliateProducts).values(productData).returning();
      return product;
    } catch (error) {
      console.error("Error creating affiliate product:", error);
      throw error;
    }
  }

  async updateAffiliateProduct(id: number, updates: Partial<AffiliateProduct>): Promise<AffiliateProduct> {
    try {
      const [product] = await db
        .update(affiliateProducts)
        .set(updates)
        .where(eq(affiliateProducts.id, id))
        .returning();
      if (!product) throw new Error("Affiliate product not found");
      return product;
    } catch (error) {
      console.error("Error updating affiliate product:", error);
      throw error;
    }
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
  async recordAffiliateClick(clickData: InsertAffiliateClick): Promise<AffiliateClick> {
    try {
      const [click] = await db.insert(affiliateClicks).values(clickData).returning();
      return click;
    } catch (error) {
      console.error("Error recording affiliate click:", error);
      throw error;
    }
  }

  async getAffiliateClicks(userId?: number, productId?: number): Promise<AffiliateClick[]> {
    try {
      let query = db.select().from(affiliateClicks);

      if (userId) {
        query = query.where(eq(affiliateClicks.userId, userId));
      }

      if (productId) {
        query = query.where(eq(affiliateClicks.productId, productId));
      }

      return query;
    } catch (error) {
      console.error("Error getting affiliate clicks:", error);
      throw error;
    }
  }

  // Affiliate Conversion methods
  async recordAffiliateConversion(conversionData: InsertAffiliateConversion): Promise<AffiliateConversion> {
    try {
      const [conversion] = await db.insert(affiliateConversions).values(conversionData).returning();
      return conversion;
    } catch (error) {
      console.error("Error recording affiliate conversion:", error);
      throw error;
    }
  }

  async getAffiliateConversions(userId?: number, status?: string): Promise<AffiliateConversion[]> {
    try {
      let query = db.select().from(affiliateConversions);

      if (userId) {
        query = query.where(eq(affiliateConversions.userId, userId));
      }

      if (status) {
        query = query.where(eq(affiliateConversions.status, status));
      }

return query;
    } catch (error) {
      console.error("Error getting affiliate conversions:", error);
      throw error;
    }
  }

  async updateAffiliateConversionStatus(id: number, status: string): Promise<AffiliateConversion> {
    try {
      const [conversion]= await db
        .update(affiliateConversions)
        .set({ status })
        .where(eq(affiliateConversions.id, id))
        .returning();
      if (!conversion) throw new Error("Affiliate conversion not found");
      return conversion;
    } catch (error) {
      console.error("Error updating affiliate conversion status:", error);
      throw error;
    }
    }

  async claimDeal(dealId: number, userId: number) {
    // In a real app, you'd have a separate table for claimed deals
    // For now, just return success
    return {
      dealId,
      userId,
      claimedAt: new Date(),
      success: true
    };
  }

  async searchDeals(filters: any) {
    let query = db.select().from(storeDeals);

    // Apply filters
    if (filters.retailerId) {
      query = query.where(eq(storeDeals.retailerId, filters.retailerId));
    }

    if (filters.category) {
      query = query.where(eq(storeDeals.category, filters.category));
    }

    if (filters.maxPrice) {
      query = query.where(lte(storeDeals.salePrice, filters.maxPrice));
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.offset(filters.offset);
    }

    return query;
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

  async searchShoppingLists(query: string, userId: number) {
    return db.select()
      .from(shoppingLists)
      .where(
        and(
          eq(shoppingLists.userId, userId),
          or(
            ilike(shoppingLists.name, `%${query}%`),
            ilike(shoppingLists.description, `%${query}%`)
          )
        )
      );
  }

  async searchPurchases(filters: any) {
    let query = db.select().from(purchases);

    const conditions = [];

    if (filters.userId) {
      conditions.push(eq(purchases.userId, filters.userId));
    }

    if (filters.retailerId) {
      conditions.push(eq(purchases.retailerId, filters.retailerId));
    }

    if (filters.startDate) {
      conditions.push(gte(purchases.purchaseDate, filters.startDate));
    }

    if (filters.endDate) {
      conditions.push(lte(purchases.purchaseDate, filters.endDate));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return query;
  }

  async getUserStatistics(userId: number) {
    // Mock statistics for demo
    return {
      totalPurchases: 25,
      totalSpent: 125000, // $1,250.00
      averageOrderValue: 5000, // $50.00
      mostShoppedRetailer: 'Walmart',
      topCategories: [
        { category: 'Groceries', amount: 85000, percentage: 68 },
        { category: 'Household', amount: 25000, percentage: 20 },
        { category: 'Personal Care', amount: 15000, percentage: 12 }
      ],
      monthlyTrend: [
        { month: 'Jan', amount: 42000 },
        { month: 'Feb', amount: 38000 },
        { month: 'Mar', amount: 45000 }
      ],
      savingsThisMonth: 1500 // $15.00
    };
  }

  async getRetailer(id: number): Promise<any> {
    try {
      const [retailer] = await db.select().from(retailers).where(eq(retailers.id, id));
      return retailer || undefined;
    } catch (error) {
      console.error("Error getting retailer:", error);
      throw error;
    }
  }

  async getRetailerByName(name: string): Promise<any> {
    try {
      const [retailer] = await db.select().from(retailers).where(eq(retailers.name, name));
      return retailer || undefined;
    } catch (error) {
      console.error("Error getting retailer by name:", error);
      throw error;
    }
  }

  async getUserLoyaltyCard(userId: number, retailerId: number): Promise<any> {
    try {
      // Mock loyalty card data since we don't have a loyalty_cards table yet
      const mockLoyaltyCards: { [key: string]: any } = {
        'Walmart': {
          cardNumber: '6224981234567890',
          memberId: 'WM' + userId.toString().padStart(8, '0'),
          barcodeNumber: '6224981234567890',
          affiliateCode: 'SMARTCART_' + userId
        },
        'Target': {
          cardNumber: '1234567890123456',
          memberId: 'T' + userId.toString().padStart(9, '0'),
          barcodeNumber: '1234567890123456',
          affiliateCode: 'SMARTCART_' + userId
        },
        'Kroger': {
          cardNumber: '4135551234567890',
          memberId: 'KR' + userId.toString().padStart(8, '0'),
          barcodeNumber: '4135551234567890',
          affiliateCode: 'SMARTCART_' + userId
        }
      };

      const retailer = await this.getRetailer(retailerId);
      if (!retailer) return null;

      return mockLoyaltyCards[retailer.name] || null;
    } catch (error) {
      console.error("Error getting user loyalty card:", error);
      throw error;
    }
  }

  async addUserLoyaltyCard(userId: number, cardData: any): Promise<any> {
    // In a real implementation, you'd insert into a loyalty_cards table
    // For now, we'll return the provided data with an ID
    return {
      id: Date.now(),
      userId,
      ...cardData,
      createdAt: new Date()
    };
  }
   async cleanupShoppingLists(): Promise<void> {
        try {
            // Fetch all shopping lists, filter out the isDefault one, then delete the rest
            const allShoppingLists = await db.select().from(shoppingLists);
            const nonDefaultLists = allShoppingLists.filter(list => !list.isDefault);

            for (const list of nonDefaultLists) {
                // First delete items in shopping list
                await db.delete(shoppingListItems).where(eq(shoppingListItems.shoppingListId, list.id));

                // Delete shopping list
                await db.delete(shoppingLists).where(eq(shoppingLists.id, list.id));
            }
        } catch (error) {
            console.error('Error cleaning up shopping lists:', error);
            throw error;
        }
    }
}

// Use memory storage for demo with pre-initialized users
export const storage = new MemStorage();