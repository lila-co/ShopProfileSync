
-- Critical indexes for SmartCart performance

-- User-related queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchases_user_id_date ON purchases(userId, purchaseDate DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchase_items_purchase_id ON purchase_items(purchaseId);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shopping_lists_user_id ON shopping_lists(userId);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shopping_list_items_list_id ON shopping_list_items(shoppingListId);

-- Product and recommendation queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_name_trgm ON products USING gin(name gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recommendations_user_id_date ON recommendations(userId, recommendedDate DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_deals_retailer_date ON store_deals(retailerId, validUntil DESC) WHERE validUntil > CURRENT_DATE;

-- Performance critical composite indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchase_items_product_price ON purchase_items(productId, price) WHERE price > 0;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_retailer_accounts_user_retailer ON retailer_accounts(userId, retailerId);

-- Text search optimization
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_search ON products USING gin((name || ' ' || COALESCE(brand, '')) gin_trgm_ops);
