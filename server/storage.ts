import { eq, and, gte, lt } from "drizzle-orm";
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
    };
    this.users.set(defaultUser.id, defaultUser);

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

    // Create a default shopping list
    const defaultList: ShoppingList = {
      id: this.shoppingListIdCounter++,
      userId: defaultUser.id,
      name: "My Shopping List",
      isDefault: true
    };
    this.shoppingLists.set(defaultList.id, defaultList);

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
    this.purchases.set(id, newPurchase);    return newPurchase;
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
    const lists = Array.from(this.shoppingLists.values());
    // Add items to each list
    return Promise.all(lists.map(async list => {
      const items = await this.getShoppingListItems(list.id);
      return { ...list, items };
    }));
  }

  async getShoppingList(id: number): Promise<ShoppingList | undefined> {
    const list = this.shoppingLists.get(id);
    if (!list) return undefined;

    const items = await this.getShoppingListItems(id);
    return { ...list, items };
  }

  async createShoppingList(list: InsertShoppingList): Promise<ShoppingList> {
    const id = this.shoppingListIdCounter++;
    const newList: ShoppingList = { ...list, id };
    this.shoppingLists.set(id, newList);
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

  async getDealsSummary(): Promise<any[]> {
    const retailers = await this.getRetailers();
    const deals = Array.from(this.storeDeals.values());

    // Group deals by retailer
    const summaryMap = new Map<number, { retailerId: number, retailerName: string, logoColor: string, dealsCount: number, validUntil: string }>();

    for (const deal of deals) {
      const retailer = retailers.find(r => r.id === deal.retailerId);
      if (!retailer) continue;

      if (!summaryMap.has(retailer.id)) {
        summaryMap.set(retailer.id, {
          retailerId: retailer.id,
          retailerName: retailer.name,
          logoColor: retailer.logoColor || 'blue',
          dealsCount: 0,
          validUntil: deal.endDate // Initialize with this deal's end date
        });
      }

      const summary = summaryMap.get(retailer.id)!;
      summary.dealsCount++;

      // Keep the latest valid until date
      if (new Date(deal.endDate) > new Date(summary.validUntil)) {
        summary.validUntil = deal.endDate;
      }
    }

    return Array.from(summaryMap.values());
  }

  async getDealCategories(): Promise<string[]> {
    const deals = Array.from(this.storeDeals.values());
    const categories = new Set<string>();

    deals.forEach(deal => {
      if (deal.category) {
        categories.add(deal.category);
      }
    });

    return Array.from(categories);
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
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async updateUser(userData: Partial<User>): Promise<User> {
    if (!userData.id) throw new Error("User ID is required for update");

    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, userData.id))
      .returning();

    if (!updatedUser) throw new Error("User not found");
    return updatedUser;
  }

  // Retailer methods
  async getRetailers(): Promise<Retailer[]> {
    return db.select().from(retailers);
  }

  async createRetailer(retailerData: {
    name: string;
    logoColor: string;
    isActive: boolean;
  }): Promise<Retailer> {
    const [retailer] = await db.insert(retailers).values(retailerData).returning();
    return retailer;
  }

  // Retailer Account methods
  async getRetailerAccounts(): Promise<RetailerAccount[]> {
    return db.select().from(retailerAccounts);
  }

  async getRetailerAccount(id: number): Promise<RetailerAccount | undefined> {
    const [account] = await db.select().from(retailerAccounts).where(eq(retailerAccounts.id, id));
    return account || undefined;
  }

  async createRetailerAccount(accountData: InsertRetailerAccount): Promise<RetailerAccount> {
    const [account] = await db.insert(retailerAccounts).values(accountData).returning();
    return account;
  }

  // Product methods
  async getProducts(): Promise<Product[]> {
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
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async createProduct(productData: InsertProduct): Promise<Product> {
    const [product] = await db.insert(products).values(productData).returning();
    return product;
  }

  // Purchase methods
  async getPurchases(): Promise<Purchase[]> {
    return db.select().from(purchases);
  }

  async getPurchase(id: number): Promise<Purchase | undefined> {
    const [purchase] = await db.select().from(purchases).where(eq(purchases.id, id));
    return purchase || undefined;
  }

  async createPurchase(purchaseData: InsertPurchase): Promise<Purchase> {
    const [purchase] = await db.insert(purchases).values(purchaseData).returning();
    return purchase;
  }

  async createPurchaseFromReceipt(receiptData: any): Promise<Purchase> {
    // In a real implementation, this would parse receipt data and create a purchase
    // For now, use demo data
    const purchase = await this.createPurchase({
      userId: 1,
      retailerId: 1,
      purchaseDate: new Date(),
      totalAmount: 2500,
      receiptData: receiptData,
      receiptImageUrl: null
    });

    return purchase;
  }

  // Purchase Item methods
  async getPurchaseItems(purchaseId: number): Promise<PurchaseItem[]> {
    return db.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, purchaseId));
  }

  async createPurchaseItem(itemData: InsertPurchaseItem): Promise<PurchaseItem> {
    const [item] = await db.insert(purchaseItems).values(itemData).returning();
    return item;
  }

  // Shopping List methods
  async getShoppingLists(): Promise<ShoppingList[]> {
    const lists = await db.select().from(shoppingLists);

    if (lists.length === 0) {
      // Create a default shopping list if none exists
      const newList = await this.createShoppingList({
        name: "My Shopping List",
        userId: 1,
        isDefault: true
      });

      return [newList];
    }

    return lists;
  }

  async getShoppingList(id: number): Promise<ShoppingList | undefined> {
    const [list] = await db.select().from(shoppingLists).where(eq(shoppingLists.id, id));

    if (list) {
      // Fetch items for the list
      const items = await this.getShoppingListItems(id);
      return { ...list, items };
    }

    return undefined;
  }

  async createShoppingList(listData: InsertShoppingList): Promise<ShoppingList> {
    const [list] = await db.insert(shoppingLists).values(listData).returning();

    // Initialize with empty items array
    return { ...list, items: [] };
  }

  // Shopping List Item methods
  async getShoppingListItems(listId: number): Promise<ShoppingListItem[]> {
    return db.select().from(shoppingListItems).where(eq(shoppingListItems.shoppingListId, listId));
  }

  async addShoppingListItem(itemData: Partial<ShoppingListItem>): Promise<ShoppingListItem> {
    // Ensure quantity defaults to 1 if not provided and is properly converted to number
    let quantity = itemData.quantity || 1;

    // Handle both string and number inputs for quantity
    quantity = typeof quantity === 'string' ? parseFloat(quantity) : Number(quantity);

    if (isNaN(quantity) || quantity < 0) {
      quantity = 1;
    }

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

      processedUpdates.quantity = quantityValue;
    }

    const [updatedItem] = await db
      .update(shoppingListItems)
      .set(processedUpdates)
      .where(eq(shoppingListItems.id, id))
      .returning();

    if (!updatedItem) throw new Error("Shopping list item not found");
    return updatedItem;
  }

  async deleteShoppingListItem(id: number): Promise<void> {
    await db.delete(shoppingListItems).where(eq(shoppingListItems.id, id));
  }

  // Deal methods
  async getDeals(retailerId?: number, category?: string): Promise<StoreDeal[]> {
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
  }

  async getDealsSummary(): Promise<any[]> {
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
  }

  async getDealCategories(): Promise<string[]> {
    const deals = await this.getDeals();
    const categories = new Set<string>();

    deals.forEach(deal => {
      if (deal.category) {
        categories.add(deal.category);
      }
    });

    return Array.from(categories);
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
    const [deal] = await db.insert(storeDeals).values(dealData).returning();
    return deal;
  }

  async getWeeklyCirculars(retailerId?: number): Promise<WeeklyCircular[]> {
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
  }

  async getWeeklyCircular(id: number): Promise<WeeklyCircular | undefined> {
    const [circular] = await db.select().from(weeklyCirculars).where(eq(weeklyCirculars.id, id));
    return circular;
  }

  async createWeeklyCircular(circularData: InsertWeeklyCircular): Promise<WeeklyCircular> {
    const [circular] = await db.insert(weeklyCirculars).values(circularData).returning();
    return circular;
  }

  async getDealsFromCircular(circularId: number): Promise<StoreDeal[]> {
    return db.select().from(storeDeals).where(eq(storeDeals.circularId, circularId));
  }

  // Recommendation methods
  async getRecommendations(): Promise<Recommendation[]> {
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
  }

  async createRecommendation(recommendationData: InsertRecommendation): Promise<Recommendation> {
    const [recommendation] = await db
      .insert(recommendations)
      .values(recommendationData)
      .returning();

    return recommendation;
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
        .select()```tool_code
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
    const anomalies = await db.select().from(purchaseAnomalies);
    return anomalies;
  }

  async getPurchaseAnomaly(id: number): Promise<PurchaseAnomaly | undefined> {
    const [anomaly] = await db
      .select()
      .from(purchaseAnomalies)
      .where(eq(purchaseAnomalies.id, id));
    return anomaly;
  }

  async createPurchaseAnomaly(anomalyData: InsertPurchaseAnomaly): Promise<PurchaseAnomaly> {
    const [anomaly] = await db
      .insert(purchaseAnomalies)
      .values(anomalyData)
      .returning();
    return anomaly;
  }

  async updatePurchaseAnomaly(id: number, updates: Partial<PurchaseAnomaly>): Promise<PurchaseAnomaly> {
    const [updatedAnomaly] = await db
      .update(purchaseAnomalies)
      .set(updates)
      .where(eq(purchaseAnomalies.id, id))
      .returning();

    if (!updatedAnomaly) {
      throw new Error(`Purchase anomaly with id ${id} not found`);
    }

    return updatedAnomaly;
  }

  async deletePurchaseAnomaly(id: number): Promise<void> {
    await db
      .delete(purchaseAnomalies)
      .where(eq(purchaseAnomalies.id, id));
  }
}

// Use database storage for persistence
export const storage = new DatabaseStorage();