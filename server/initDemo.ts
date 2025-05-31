
import { storage } from './storage';

export async function initializeDemoDatabase() {
  console.log("🚀 Initializing demo database...");
  
  try {
    // The storage constructor already initializes the demo data
    // This function can be called to verify everything is set up
    
    const users = await storage.getAllUsers();
    const retailers = await storage.getRetailers();
    const products = await storage.getProducts();
    const deals = await storage.getActiveDeals();
    
    console.log(`✅ Demo database initialized successfully!`);
    console.log(`   👥 ${users.length} sample users created`);
    console.log(`   🏪 ${retailers.length} retailers available`);
    console.log(`   📦 ${products.length} products in catalog`);
    console.log(`   💰 ${deals.length} active deals`);
    
    // Log sample data for verification
    console.log("\n📊 Sample Data Overview:");
    console.log("Sample Users:", users.slice(0, 2).map(u => ({ 
      username: u.username, 
      householdType: u.householdType,
      preferences: {
        organic: u.preferOrganic,
        nameBrand: u.preferNameBrand,
        bulk: u.buyInBulk
      }
    })));
    
    console.log("Sample Retailers:", retailers.slice(0, 3).map(r => ({
      name: r.name,
      supports: {
        ordering: r.supportsOnlineOrdering,
        pickup: r.supportsPickup,
        delivery: r.supportsDelivery
      }
    })));
    
    return {
      success: true,
      stats: {
        users: users.length,
        retailers: retailers.length,
        products: products.length,
        deals: deals.length
      }
    };
    
  } catch (error) {
    console.error("❌ Failed to initialize demo database:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Export for use in other files
export { storage };
