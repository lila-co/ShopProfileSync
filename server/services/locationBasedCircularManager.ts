
import { storage } from "../storage";
import { storeIntegrationManager, StoreIntegrationConfig } from "./storeIntegrationManager";
import { circularFetcher } from "./circularFetcher";

export interface StoreLocation {
  storeId: string;
  retailerId: number;
  address: string;
  lat: number;
  lng: number;
  circularUrl?: string;
}

export class LocationBasedCircularManager {
  /**
   * Find the nearest store location for a given retailer
   */
  findNearestStoreLocation(
    retailerId: number, 
    userLat: number, 
    userLng: number
  ): StoreLocation | null {
    const config = storeIntegrationManager.getIntegrationConfig(retailerId);
    if (!config?.storeLocations || config.storeLocations.length === 0) {
      return null;
    }

    let nearestStore: StoreLocation | null = null;
    let shortestDistance = Infinity;

    for (const location of config.storeLocations) {
      const distance = this.calculateDistance(userLat, userLng, location.lat, location.lng);
      if (distance < shortestDistance) {
        shortestDistance = distance;
        nearestStore = {
          storeId: location.storeId,
          retailerId,
          address: location.address,
          lat: location.lat,
          lng: location.lng,
          circularUrl: this.generateStoreSpecificCircularUrl(config, location.storeId)
        };
      }
    }

    return nearestStore;
  }

  /**
   * Generate store-specific circular URL
   */
  private generateStoreSpecificCircularUrl(config: StoreIntegrationConfig, storeId: string): string {
    if (config.circularUrlTemplate) {
      // Replace placeholders in template
      return config.circularUrlTemplate
        .replace('{storeId}', storeId)
        .replace('{weekCode}', this.getCurrentWeekCode())
        .replace('{date}', this.getCurrentDateCode());
    }

    // Fallback to base URL with store parameter
    const baseUrl = config.circularUrl || config.websiteUrl;
    if (baseUrl) {
      const separator = baseUrl.includes('?') ? '&' : '?';
      return `${baseUrl}${separator}store=${storeId}`;
    }

    return '';
  }

  /**
   * Get current week code (format: YYMMDD_LW_STORENAME)
   */
  private getCurrentWeekCode(): string {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    return `${year}${month}${day}_LW`;
  }

  /**
   * Get current date code for circular identification
   */
  private getCurrentDateCode(): string {
    const now = new Date();
    return now.toISOString().slice(0, 10).replace(/-/g, '');
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Fetch circulars for user's location
   */
  async fetchCircularsForLocation(
    userLat: number, 
    userLng: number, 
    maxDistance: number = 25
  ): Promise<Array<{
    retailerId: number;
    retailerName: string;
    storeLocation: StoreLocation;
    distance: number;
  }>> {
    const retailers = await storage.getRetailers();
    const nearbyStores: Array<any> = [];

    for (const retailer of retailers) {
      const nearestStore = this.findNearestStoreLocation(retailer.id, userLat, userLng);
      if (nearestStore) {
        const distance = this.calculateDistance(userLat, userLng, nearestStore.lat, nearestStore.lng);
        if (distance <= maxDistance) {
          nearbyStores.push({
            retailerId: retailer.id,
            retailerName: retailer.name,
            storeLocation: nearestStore,
            distance
          });
        }
      }
    }

    // Sort by distance
    return nearbyStores.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Fetch circular for specific store location
   */
  async fetchCircularForStore(storeLocation: StoreLocation): Promise<void> {
    if (storeLocation.circularUrl) {
      await circularFetcher.fetchRetailerCircular(
        storeLocation.retailerId, 
        storeLocation.circularUrl
      );
    }
  }

  /**
   * Add store locations for a retailer (for stores like Food King)
   */
  async addStoreLocations(retailerId: number, locations: Array<{
    storeId: string;
    address: string;
    lat: number;
    lng: number;
  }>): Promise<void> {
    const config = storeIntegrationManager.getIntegrationConfig(retailerId);
    if (config) {
      config.storeLocations = locations;
      
      // For circular-only stores, set up URL template
      if (config.name.toLowerCase().includes('food king')) {
        config.circularUrlTemplate = 'https://www.foodkingcostplus.com/circulars/Page/1/Base/1/{weekCode}_KING/?store={storeId}';
      }
    }
  }
}

export const locationBasedCircularManager = new LocationBasedCircularManager();
