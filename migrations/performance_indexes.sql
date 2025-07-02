
-- Performance-optimized indexes for SmartCart

-- Covering indexes for common queries (include frequently accessed columns)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchases_user_cover 
ON purchases(userId, purchaseDate DESC) 
INCLUDE (totalAmount, retailerId);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchase_items_cover 
ON purchase_items(purchaseId) 
INCLUDE (productName, quantity, totalPrice);

-- Partial indexes for filtered queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_active_shopping_lists 
ON shopping_lists(userId) 
WHERE isDefault = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_active_store_deals 
ON store_deals(retailerId, validUntil DESC) 
WHERE validUntil > CURRENT_DATE AND featured = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incomplete_list_items 
ON shopping_list_items(shoppingListId, category) 
WHERE isCompleted = false;

-- Expression indexes for computed queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recent_purchases 
ON purchases(userId, (EXTRACT(EPOCH FROM purchaseDate)::bigint)) 
WHERE purchaseDate > CURRENT_DATE - INTERVAL '90 days';

-- Multi-column indexes for complex joins
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recommendation_user_date_product 
ON recommendations(userId, recommendedDate DESC, productId) 
WHERE daysUntilPurchase IS NOT NULL;

-- Text search optimization with better weighting
DROP INDEX IF EXISTS idx_products_search;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_weighted_search 
ON products USING gin(
  setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(brand, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(category, '')), 'C')
);

-- Hash indexes for exact lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_retailer_accounts_lookup 
ON retailer_accounts USING hash(userId, retailerId) 
WHERE isConnected = true;

-- Analyze tables after index creation
ANALYZE purchases;
ANALYZE purchase_items;
ANALYZE shopping_lists;
ANALYZE shopping_list_items;
ANALYZE store_deals;
ANALYZE recommendations;
ANALYZE products;
ANALYZE retailer_accounts;
