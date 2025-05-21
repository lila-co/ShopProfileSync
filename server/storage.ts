import { eq } from "drizzle-orm";
import { db } from "./db";
import { 
  users, retailers, retailerAccounts, products, purchases, purchaseItems,
  shoppingLists, shoppingListItems, storeDeals, recommendations, purchaseAnomalies,
  User, InsertUser, 
  Retailer, InsertRetailer, 
  RetailerAccount, InsertRetailerAccount,
  Product, InsertProduct,
  Purchase, InsertPurchase,
  PurchaseItem, InsertPurchaseItem,
  ShoppingList, InsertShoppingList,
  ShoppingListItem, InsertShoppingListItem,
  StoreDeal, InsertStoreDeal,
  Recommendation, InsertRecommendation,
  PurchaseAnomaly, InsertPurchaseAnomaly
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
  private recommendations: Map<number, Recommendation>;
  private purchaseAnomalies: Map<number, PurchaseAnomaly>;

  private userIdCounter: number = 1;
  private retailerIdCounter: number = 1;
  private retailerAccountIdCounter: number = 1;
  private productIdCounter: number = 1;
  private purchaseIdCounter: number = 1;
  private purchaseItemIdCounter: number = 1;
  private shoppingListIdCounter: number = 1;
  private shoppingListItemIdCounter: number = 1;
  private storeDealIdCounter: number = 1;
  private recommendationIdCounter: number = 1;

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
    this.recommendations = new Map();

    // Initialize with sample data
    this.initializeData();
  }

  private initializeData() {
    // Create default user
    const defaultUser: User = {
      id: this.userIdCounter++,
      username: "johndoe",
      password: "hashed_password",
      firstName: "Jane",
      lastName: "Doe",
      email: "jane.doe@example.com",
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
      { name: "Kroger", logoColor: "yellow", apiEndpoint: "https://api.kroger.com" }
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

    // Add store deals
    const deals = [
      { retailerId: 1, productName: "Milk (Gallon)", regularPrice: 389, salePrice: 349, startDate: new Date(), endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), category: "Dairy" },
      { retailerId: 1, productName: "Cereal", regularPrice: 499, salePrice: 399, startDate: new Date(), endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), category: "Breakfast" },
      { retailerId: 2, productName: "Toilet Paper (24 pack)", regularPrice: 1999, salePrice: 1649, startDate: new Date(), endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), category: "Household" },
      { retailerId: 2, productName: "Paper Towels", regularPrice: 1299, salePrice: 1099, startDate: new Date(), endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), category: "Household" },
      { retailerId: 3, productName: "Organic Bananas", regularPrice: 129, salePrice: 99, startDate: new Date(), endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), category: "Produce" },
      { retailerId: 3, productName: "Organic Apples", regularPrice: 399, salePrice: 349, startDate: new Date(), endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), category: "Produce" },
      { retailerId: 4, productName: "Eggs (dozen)", regularPrice: 359, salePrice: 299, startDate: new Date(), endDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), category: "Dairy" },
      { retailerId: 4, productName: "Bread", regularPrice: 329, salePrice: 299, startDate: new Date(), endDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), category: "Bakery" },
    ];

    deals.forEach(deal => {
      const newDeal: StoreDeal = {
        id: this.storeDealIdCounter++,
        ...deal
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
  async getRetailers(): Promise<Retailer[]> {
    return Array.from(this.retailers.values());
  }

  async getRetailer(id: number): Promise<Retailer | undefined> {
    return this.retailers.get(id);
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
    
    // Filter by retailer if specified
    if (retailerId) {
      deals = deals.filter(deal => deal.retailerId === retailerId);
    }
    
    // Filter by category if specified
    if (category) {
      deals = deals.filter(deal => deal.category === category);
    }
    
    // Add retailer data
    return Promise.all(deals.map(async deal => {
      const retailer = await this.getRetailer(deal.retailerId);
      return { ...deal, retailer };
    }));
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
    const newDeal: StoreDeal = { ...deal, id };
    this.storeDeals.set(id, newDeal);
    return newDeal;
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
    const allRetailers = await db.select().from(retailers);
    
    if (allRetailers.length === 0) {
      // Add default retailers if none exist
      await this.createRetailer({
        name: "Walmart",
        logoColor: "blue",
        apiEndpoint: null,
        apiKey: null
      });
      
      await this.createRetailer({
        name: "Target",
        logoColor: "red",
        apiEndpoint: null,
        apiKey: null
      });
      
      await this.createRetailer({
        name: "Kroger",
        logoColor: "blue",
        apiEndpoint: null,
        apiKey: null
      });
      
      await this.createRetailer({
        name: "Costco",
        logoColor: "red",
        apiEndpoint: null,
        apiKey: null
      });
      
      return this.getRetailers();
    }
    
    return allRetailers;
  }

  async getRetailer(id: number): Promise<Retailer | undefined> {
    const [retailer] = await db.select().from(retailers).where(eq(retailers.id, id));
    return retailer || undefined;
  }

  async createRetailer(retailerData: InsertRetailer): Promise<Retailer> {
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
    // Ensure quantity defaults to 1 if not provided
    const quantity = itemData.quantity || 1;
    
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
    const [updatedItem] = await db
      .update(shoppingListItems)
      .set(updates)
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
    
    if (retailerId) {
      query = query.where(eq(storeDeals.retailerId, retailerId));
    }
    
    if (category) {
      query = query.where(eq(storeDeals.category, category));
    }
    
    const deals = await query;
    
    if (deals.length === 0) {
      // Add some default deals if none exist
      const retailers = await this.getRetailers();
      
      if (retailers.length > 0) {
        await this.createDeal({
          retailerId: retailers[0].id,
          productName: "Milk (Gallon)",
          category: "Dairy",
          regularPrice: 389,
          salePrice: 349,
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        });
        
        await this.createDeal({
          retailerId: retailers[0].id,
          productName: "Eggs (Dozen)",
          category: "Dairy",
          regularPrice: 299,
          salePrice: 249,
          startDate: new Date(),
          endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days from now
        });
        
        await this.createDeal({
          retailerId: retailers[1].id,
          productName: "Paper Towels",
          category: "Household",
          regularPrice: 799,
          salePrice: 649,
          startDate: new Date(),
          endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days from now
        });
      }
      
      return this.getDeals(retailerId, category);
    }
    
    return deals;
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

  async createDeal(dealData: InsertStoreDeal): Promise<StoreDeal> {
    const [deal] = await db.insert(storeDeals).values(dealData).returning();
    return deal;
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
}

// Use database storage for persistence
export const storage = new DatabaseStorage();
