
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
   * Remove expired deals from database
   */
  private async cleanupExpiredDeals(): Promise<void> {
    try {
      // Note: This would require adding a cleanup method to storage
      // For now, just log the intention
      console.log("Cleaning up expired deals...");
      
      // In a real implementation, you would:
      // await storage.deleteExpiredDeals();
    } catch (error) {
      console.error("Failed to cleanup expired deals:", error);
    }
  }
}

export const backgroundSync = new BackgroundSyncService();
