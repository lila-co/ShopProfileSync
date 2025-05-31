import type { 
  User, 
  ShoppingList, 
  ShoppingListItem,
  Retailer,
  Deal,
  Circular,
  Purchase,
  PurchaseItem,
  Product,
  Recommendation,
  RetailerIntegration,
  AffiliatePartner,
  AffiliateProduct
} from '../shared/schema';

export interface IStorage {
  // Users
  getUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  createUser(user: Omit<User, 'id'>): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;
  deleteUser(id: number): Promise<boolean>;

  // Shopping Lists
  getShoppingLists(userId: number): Promise<ShoppingList[]>;
  getShoppingList(id: number): Promise<ShoppingList | null>;
  createShoppingList(list: Omit<ShoppingList, 'id'>): Promise<ShoppingList>;
  updateShoppingList(id: number, updates: Partial<ShoppingList>): Promise<ShoppingList>;
  deleteShoppingList(id: number): Promise<boolean>;

  // Shopping List Items
  getShoppingListItems(listId: number): Promise<ShoppingListItem[]>;
  createShoppingListItem(item: Omit<ShoppingListItem, 'id'>): Promise<ShoppingListItem>;
  updateShoppingListItem(id: number, updates: Partial<ShoppingListItem>): Promise<ShoppingListItem>;
  deleteShoppingListItem(id: number): Promise<boolean>;

  // Retailers
  getRetailers(): Promise<Retailer[]>;
  getRetailer(id: number): Promise<Retailer | null>;

  // Deals
  getDeals(): Promise<Deal[]>;
  getDealsForRetailer(retailerId: number): Promise<Deal[]>;

  // Search
  searchShoppingLists(userId: number, query: string): Promise<ShoppingList[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private shoppingLists: Map<number, ShoppingList> = new Map();
  private shoppingListItems: Map<number, ShoppingListItem> = new Map();
  private retailers: Map<number, Retailer> = new Map();
  private deals: Map<number, Deal> = new Map();
  private nextId = 1;

  constructor() {
    this.initSampleData();
  }

  private initSampleData() {
    // Sample user
    const user: User = {
      id: 1,
      username: 'demo',
      password: 'password',
      firstName: 'Demo',
      lastName: 'User',
      email: 'demo@example.com',
      role: 'customer',
      isAdmin: false,
      householdType: 'family',
      householdSize: 4,
      preferNameBrand: false,
      preferOrganic: true,
      buyInBulk: true,
      prioritizeCostSavings: true,
      shoppingRadius: 10
    };
    this.users.set(1, user);

    // Sample shopping list
    const shoppingList: ShoppingList = {
      id: 1,
      name: 'Weekly Groceries',
      userId: 1,
      isDefault: true,
      items: []
    };
    this.shoppingLists.set(1, shoppingList);

    // Sample retailers
    const retailer: Retailer = {
      id: 1,
      name: 'Fresh Market',
      logoColor: '#2563eb',
      apiEndpoint: null,
      apiKey: null,
      apiSecret: null,
      authType: null,
      requiresAuthentication: false,
      supportsOnlineOrdering: true,
      supportsPickup: true,
      supportsDelivery: true,
      apiDocumentation: null
    };
    this.retailers.set(1, retailer);

    this.nextId = 2;
  }

  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUser(id: number): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }

  async createUser(userData: Omit<User, 'id'>): Promise<User> {
    const user: User = { ...userData, id: this.nextId++ };
    this.users.set(user.id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error('User not found');
    const updated = { ...user, ...updates };
    this.users.set(id, updated);
    return updated;
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }

  async getShoppingLists(userId: number): Promise<ShoppingList[]> {
    const lists = Array.from(this.shoppingLists.values())
      .filter(list => list.userId === userId);
    
    // Add items to each list
    for (const list of lists) {
      list.items = Array.from(this.shoppingListItems.values())
        .filter(item => item.shoppingListId === list.id);
    }
    
    return lists;
  }

  async getShoppingList(id: number): Promise<ShoppingList | null> {
    const list = this.shoppingLists.get(id);
    if (!list) return null;
    
    list.items = Array.from(this.shoppingListItems.values())
      .filter(item => item.shoppingListId === id);
    
    return list;
  }

  async createShoppingList(listData: Omit<ShoppingList, 'id'>): Promise<ShoppingList> {
    const list: ShoppingList = { ...listData, id: this.nextId++, items: [] };
    this.shoppingLists.set(list.id, list);
    return list;
  }

  async updateShoppingList(id: number, updates: Partial<ShoppingList>): Promise<ShoppingList> {
    const list = this.shoppingLists.get(id);
    if (!list) throw new Error('Shopping list not found');
    const updated = { ...list, ...updates };
    this.shoppingLists.set(id, updated);
    return updated;
  }

  async deleteShoppingList(id: number): Promise<boolean> {
    return this.shoppingLists.delete(id);
  }

  async getShoppingListItems(listId: number): Promise<ShoppingListItem[]> {
    return Array.from(this.shoppingListItems.values())
      .filter(item => item.shoppingListId === listId);
  }

  async createShoppingListItem(itemData: Omit<ShoppingListItem, 'id'>): Promise<ShoppingListItem> {
    const item: ShoppingListItem = { ...itemData, id: this.nextId++ };
    this.shoppingListItems.set(item.id, item);
    return item;
  }

  async updateShoppingListItem(id: number, updates: Partial<ShoppingListItem>): Promise<ShoppingListItem> {
    const item = this.shoppingListItems.get(id);
    if (!item) throw new Error('Shopping list item not found');
    const updated = { ...item, ...updates };
    this.shoppingListItems.set(id, updated);
    return updated;
  }

  async deleteShoppingListItem(id: number): Promise<boolean> {
    return this.shoppingListItems.delete(id);
  }

  async getRetailers(): Promise<Retailer[]> {
    return Array.from(this.retailers.values());
  }

  async getRetailer(id: number): Promise<Retailer | null> {
    return this.retailers.get(id) || null;
  }

  async getDeals(): Promise<Deal[]> {
    return Array.from(this.deals.values());
  }

  async getDealsForRetailer(retailerId: number): Promise<Deal[]> {
    return Array.from(this.deals.values())
      .filter(deal => deal.retailerId === retailerId);
  }

  async searchShoppingLists(userId: number, query: string): Promise<ShoppingList[]> {
    return Array.from(this.shoppingLists.values())
      .filter(list => 
        list.userId === userId && 
        list.name.toLowerCase().includes(query.toLowerCase())
      );
  }
}

export const storage = new MemStorage();