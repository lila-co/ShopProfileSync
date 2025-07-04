import { StoreDeal, WeeklyCircular } from './lib/types';
import { storage } from '../storage';

/**
 * Service to extract and process deals from weekly circulars
 */
export class CircularDealExtractor {
  /**
   * Extract deals from a circular and add them to the deals database
   * @param circularId ID of the circular to process
   */
  async extractDealsFromCircular(circularId: number): Promise<StoreDeal[]> {
    // 1. Get the circular data
    const circular = await this.getCircular(circularId);
    if (!circular) {
      throw new Error(`Circular with ID ${circularId} not found`);
    }

    // 2. Extract deals (would connect to OCR service in production)
    const extractedDeals = await this.processCircularImage(circular);

    // 3. Store the extracted deals
    const storedDeals = await this.storeExtractedDeals(extractedDeals, circular);

    return storedDeals;
  }

  /**
   * Get a circular by ID
   */
  private async getCircular(circularId: number): Promise<WeeklyCircular | null> {
    // In a real implementation, this would fetch from the database
    // For now using a sample circular
    return {
      id: circularId,
      retailerId: 1,
      title: 'Weekly Savings',
      description: 'Great deals this week',
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      imageUrl: 'https://example.com/circular.jpg',
      pdfUrl: 'https://example.com/circular.pdf',
      pages: 4
    };
  }

  /**
   * Process circular image to extract deals
   * In a production app, this would use OCR and image processing
   */
  private async processCircularImage(circular: WeeklyCircular): Promise<Partial<StoreDeal>[]> {
    // This would integrate with OCR service in production
    // For now, return empty array - deals should come from actual API integrations
    return [];
  }

  /**
   * Store extracted deals in the database
   */
  private async storeExtractedDeals(
    deals: Partial<StoreDeal>[], 
    circular: WeeklyCircular
  ): Promise<StoreDeal[]> {
    // In a real implementation, this would store to the database
    // For now, returning mock data with IDs
    return deals.map((deal, index) => ({
      id: 1000 + index,
      productName: deal.productName!,
      regularPrice: deal.regularPrice!,
      salePrice: deal.salePrice!,
      category: deal.category,
      startDate: deal.startDate!,
      endDate: deal.endDate!,
      retailerId: deal.retailerId!,
      circularId: circular.id,
      imageUrl: null,
      terms: null
    }));
  }

  /**
   * Find relevant deals for a shopping list
   * @param shoppingListId ID of the shopping list
   */
  async findDealsForShoppingList(shoppingListId: number): Promise<{
    itemId: number;
    productName: string;
    deals: StoreDeal[];
  }[]> {
    // 1. Get the shopping list items
    const shoppingList = await this.getShoppingListItems(shoppingListId);
    
    // 2. Get all current deals
    const allDeals = await this.getAllCurrentDeals();
    
    // 3. Match shopping list items with deals
    const result = shoppingList.map(item => {
      // Find deals for this item
      const itemDeals = allDeals.filter(deal => 
        this.isProductMatch(item.productName, deal.productName)
      ).sort((a, b) => a.salePrice - b.salePrice);
      
      return {
        itemId: item.id,
        productName: item.productName,
        deals: itemDeals
      };
    });
    
    return result;
  }

  /**
   * Get shopping list items
   */
  private async getShoppingListItems(shoppingListId: number) {
    // In a real implementation, this would fetch from the database
    // For now, return empty array to avoid mock data conflicts
    return [];
  }

  /**
   * Get all current deals from all sources (circulars, direct deals, etc.)
   */
  private async getAllCurrentDeals(): Promise<StoreDeal[]> {
    // In a real implementation, this would fetch from the database
    // Return empty array to rely on actual deal data sources
    return [];
  }

  /**
   * Check if a shopping list item matches a deal product
   * Uses fuzzy matching to handle variations in product names
   */
  private isProductMatch(shoppingListItem: string, dealProduct: string): boolean {
    const normalize = (str: string) => str.toLowerCase().trim();
    
    const item = normalize(shoppingListItem);
    const deal = normalize(dealProduct);
    
    // Direct match
    if (item === deal) return true;
    
    // Contains match
    if (deal.includes(item) || item.includes(deal)) return true;
    
    // Word match (e.g., "Whole Grain Bread" matches "Bread")
    const itemWords = item.split(' ');
    const dealWords = deal.split(' ');
    
    for (const itemWord of itemWords) {
      if (itemWord.length <= 2) continue; // Skip small words like "of", "a", etc.
      if (dealWords.includes(itemWord)) return true;
    }
    
    return false;
  }

  /**
   * Generate an optimized shopping list based on deals at various retailers
   * @param shoppingListId ID of the shopping list
   */
  async generateOptimizedShoppingPlan(shoppingListId: number): Promise<{
    totalRegularPrice: number;
    totalOptimizedPrice: number;
    savings: number;
    savingsPercentage: number;
    retailerBreakdown: {
      retailerId: number;
      retailerName: string;
      items: {
        productName: string;
        regularPrice: number;
        salePrice: number;
        savings: number;
      }[];
      totalSavings: number;
    }[];
  }> {
    // 1. Get the shopping list items with their best deals
    const itemsWithDeals = await this.findDealsForShoppingList(shoppingListId);
    
    // 2. Get retailer information
    const retailers = await this.getRetailers();
    
    // 3. Assign each item to the retailer with the best price
    const retailerMap: Record<number, {
      retailerId: number;
      retailerName: string;
      items: {
        productName: string;
        regularPrice: number;
        salePrice: number;
        savings: number;
      }[];
      totalSavings: number;
    }> = {};
    
    let totalRegularPrice = 0;
    let totalOptimizedPrice = 0;
    
    // Process each item
    itemsWithDeals.forEach(item => {
      // Default prices if no deals found
      let bestPrice = 499; // Sample default price in cents
      let regularPrice = 499;
      let bestRetailerId = 1; // Default retailer
      
      // Find the best deal for this item
      if (item.deals.length > 0) {
        const bestDeal = item.deals[0]; // Already sorted by price
        bestPrice = bestDeal.salePrice;
        regularPrice = bestDeal.regularPrice;
        bestRetailerId = bestDeal.retailerId;
      }
      
      // Initialize retailer in the map if needed
      if (!retailerMap[bestRetailerId]) {
        const retailer = retailers.find(r => r.id === bestRetailerId);
        retailerMap[bestRetailerId] = {
          retailerId: bestRetailerId,
          retailerName: retailer ? retailer.name : `Retailer ${bestRetailerId}`,
          items: [],
          totalSavings: 0
        };
      }
      
      // Add item to the retailer's list
      const savings = regularPrice - bestPrice;
      retailerMap[bestRetailerId].items.push({
        productName: item.productName,
        regularPrice,
        salePrice: bestPrice,
        savings
      });
      
      retailerMap[bestRetailerId].totalSavings += savings;
      totalRegularPrice += regularPrice;
      totalOptimizedPrice += bestPrice;
    });
    
    // 4. Create the final output
    return {
      totalRegularPrice,
      totalOptimizedPrice,
      savings: totalRegularPrice - totalOptimizedPrice,
      savingsPercentage: totalRegularPrice > 0 
        ? ((totalRegularPrice - totalOptimizedPrice) / totalRegularPrice) * 100 
        : 0,
      retailerBreakdown: Object.values(retailerMap)
    };
  }

  /**
   * Get retailer information
   */
  private async getRetailers() {
    // In a real implementation, this would fetch from the database
    return [
      { id: 1, name: 'Walmart', logoColor: 'blue' },
      { id: 2, name: 'Target', logoColor: 'red' },
      { id: 3, name: 'Kroger', logoColor: 'green' }
    ];
  }
}

export const circularDealExtractor = new CircularDealExtractor();