import { dataOptimizer } from "./dataOptimizer";
import { storage } from "../storage";

export class BackgroundSyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Start background synchronization
   */
  start(intervalMinutes: number = 30): void {
    if (this.isRunning) {
      console.log("Background sync already running");
      return;
    }

    this.isRunning = true;
    console.log(`Starting background sync every ${intervalMinutes} minutes`);

    // Run initial sync
    this.performSync();

    // Schedule periodic syncs
    this.syncInterval = setInterval(() => {
      this.performSync();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop background synchronization
   */
  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isRunning = false;
    console.log("Background sync stopped");
  }

  /**
   * Perform a single sync operation
   */
  private async performSync(): Promise<void> {
    try {
      console.log("Starting background data sync...");

      // Get all retailers
      const retailers = await storage.getRetailers();
      const retailerIds = retailers.map(r => r.id);

      // Update deals from all major retailers
      await dataOptimizer.batchUpdateDeals(retailerIds);

      // Clean up expired deals
      await this.cleanupExpiredDeals();

      console.log("Background data sync completed successfully");
    } catch (error) {
      console.error("Background sync failed:", error);
    }
  }

  /**
   * Remove expired circulars and deals from database
   */
  private async cleanupExpiredDeals(): Promise<void> {
    try {
      console.log("Cleaning up expired circulars and deals...");

      const removedCount = await storage.cleanupExpiredCirculars();
      console.log(`Successfully cleaned up ${removedCount} expired circulars`);
    } catch (error) {
      console.error("Failed to cleanup expired circulars:", error);
    }
  }

  async syncRetailerData(): Promise<void> {
    console.log('Starting optimized background sync...');

    try {
      // Get all active retailers
      const retailers = await storage.getRetailers();
      const activeRetailers = retailers.filter(r => r.apiEndpoint);

      // Process retailers in batches of 3 to balance speed vs API limits
      const batchSize = 3;
      for (let i = 0; i < activeRetailers.length; i += batchSize) {
        const batch = activeRetailers.slice(i, i + batchSize);

        // Process batch in parallel
        await Promise.allSettled(batch.map(retailer => this.syncSingleRetailer(retailer)));
      }
    } catch (error) {
      console.error('Error during background sync:', error);
    }
  }

  private async syncSingleRetailer(retailer: any): Promise<void> {
    try {
      console.log(`Syncing retailer: ${retailer.name}`);
      // Implement your retailer syncing logic here
      // Example: await dataOptimizer.updateDeals(retailer.id);
      await dataOptimizer.batchUpdateDeals([retailer.id]); // Modified this line to batchUpdateDeals with retailer.id as an array
      console.log(`Successfully synced retailer: ${retailer.name}`);
    } catch (error) {
      console.error(`Failed to sync retailer ${retailer.name}:`, error);
    }
  }
}

export const backgroundSync = new BackgroundSyncService();