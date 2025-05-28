
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
}

export const backgroundSync = new BackgroundSyncService();
