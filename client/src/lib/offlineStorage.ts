
interface OfflineShoppingList {
  id: number;
  items: any[];
  lastSync: number;
  isOffline?: boolean;
}

interface OfflineStore {
  shoppingLists: OfflineShoppingList[];
  userProfile: any;
  retailers: any[];
  categories: { [key: string]: string };
}

class OfflineStorageManager {
  private storageKey = 'shopping-app-offline-data';

  saveShoppingList(listId: number, items: any[]): void {
    const data = this.getData();
    const existingIndex = data.shoppingLists.findIndex(list => list.id === listId);
    
    const listData: OfflineShoppingList = {
      id: listId,
      items,
      lastSync: Date.now(),
      isOffline: !navigator.onLine
    };

    if (existingIndex >= 0) {
      data.shoppingLists[existingIndex] = listData;
    } else {
      data.shoppingLists.push(listData);
    }

    this.saveData(data);
  }

  getShoppingList(listId: number): OfflineShoppingList | null {
    const data = this.getData();
    return data.shoppingLists.find(list => list.id === listId) || null;
  }

  saveCategories(categories: { [key: string]: string }): void {
    const data = this.getData();
    data.categories = { ...data.categories, ...categories };
    this.saveData(data);
  }

  getCategory(productName: string): string | null {
    const data = this.getData();
    return data.categories[productName.toLowerCase()] || null;
  }

  saveRetailers(retailers: any[]): void {
    const data = this.getData();
    data.retailers = retailers;
    this.saveData(data);
  }

  getRetailers(): any[] {
    const data = this.getData();
    return data.retailers;
  }

  private getData(): OfflineStore {
    const stored = localStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : {
      shoppingLists: [],
      userProfile: null,
      retailers: [],
      categories: {}
    };
  }

  private saveData(data: OfflineStore): void {
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  clearOfflineData(): void {
    localStorage.removeItem(this.storageKey);
  }
}

export const offlineStorage = new OfflineStorageManager();
