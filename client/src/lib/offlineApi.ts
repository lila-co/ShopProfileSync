
import { offlineStorage } from './offlineStorage';

class OfflineApiClient {
  private isOnline(): boolean {
    return navigator.onLine;
  }

  async fetchShoppingList(listId: number): Promise<any> {
    if (this.isOnline()) {
      try {
        const response = await fetch(`/api/shopping-lists/${listId}`);
        const data = await response.json();
        
        // Cache the data for offline use
        offlineStorage.saveShoppingList(listId, data.items || []);
        
        return data;
      } catch (error) {
        console.log('Network failed, falling back to offline data');
        return this.getOfflineShoppingList(listId);
      }
    } else {
      return this.getOfflineShoppingList(listId);
    }
  }

  private getOfflineShoppingList(listId: number): any {
    const offlineList = offlineStorage.getShoppingList(listId);
    if (offlineList) {
      return {
        id: listId,
        items: offlineList.items,
        isOffline: true,
        lastSync: offlineList.lastSync
      };
    }
    throw new Error('No offline data available for this list');
  }

  async categorizeProduct(productName: string): Promise<string> {
    // Check offline cache first
    const cachedCategory = offlineStorage.getCategory(productName);
    if (cachedCategory) {
      return cachedCategory;
    }

    if (this.isOnline()) {
      try {
        const response = await fetch('/api/products/batch-categorize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ products: [{ productName }] })
        });
        
        const data = await response.json();
        const category = data[0]?.category || 'Uncategorized';
        
        // Cache for offline use
        offlineStorage.saveCategories({ [productName.toLowerCase()]: category });
        
        return category;
      } catch (error) {
        return 'Uncategorized';
      }
    } else {
      // Fallback to basic categorization rules when offline
      return this.basicCategorization(productName);
    }
  }

  private basicCategorization(productName: string): string {
    const name = productName.toLowerCase();
    
    if (name.includes('milk') || name.includes('cheese') || name.includes('yogurt') || name.includes('egg')) {
      return 'Dairy & Eggs';
    }
    if (name.includes('apple') || name.includes('banana') || name.includes('tomato') || name.includes('pepper')) {
      return 'Produce';
    }
    if (name.includes('chicken') || name.includes('beef') || name.includes('fish') || name.includes('turkey')) {
      return 'Meat & Seafood';
    }
    
    return 'Uncategorized';
  }

  async updateShoppingListItem(listId: number, itemId: number, updates: any): Promise<void> {
    // Always update offline storage immediately for responsiveness
    const offlineList = offlineStorage.getShoppingList(listId);
    if (offlineList) {
      const itemIndex = offlineList.items.findIndex(item => item.id === itemId);
      if (itemIndex >= 0) {
        offlineList.items[itemIndex] = { ...offlineList.items[itemIndex], ...updates };
        offlineStorage.saveShoppingList(listId, offlineList.items);
      }
    }

    // Sync with server when online
    if (this.isOnline()) {
      try {
        await fetch(`/api/shopping-list/items/${itemId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        });
      } catch (error) {
        console.log('Failed to sync item update, will retry when online');
      }
    }
  }
}

export const offlineApi = new OfflineApiClient();
