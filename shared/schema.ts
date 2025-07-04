import { pgTable, text, serial, integer, boolean, timestamp, json, pgEnum, doublePrecision, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { and, eq, gte, lte, desc } from "drizzle-orm";

// Enums
export const householdTypeEnum = pgEnum('household_type', [
  'SINGLE', 'COUPLE', 'FAMILY_WITH_CHILDREN', 'SHARED_HOUSING', 'SENIOR_LIVING'
]);

export const frequencyEnum = pgEnum('frequency', [
  'DAILY', 'WEEKLY', 'BI_WEEKLY', 'MONTHLY', 'QUARTERLY'
]);

export const anomalyTypeEnum = pgEnum('anomaly_type', [
  'VACATION', 'SEASONAL', 'HOLIDAY', 'SICKNESS', 'GUESTS', 'OTHER'
]);

export const userRoleEnum = pgEnum('user_role', [
  'owner', 'admin', 'employee', 'test_user', 'customer'
]);

// User Schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  role: userRoleEnum("role").default("customer"),
  isAdmin: boolean("is_admin").default(false),
  householdType: text("household_type"),
  householdSize: integer("household_size"),
  preferNameBrand: boolean("prefer_name_brand").default(false),
  preferOrganic: boolean("prefer_organic").default(false),
  buyInBulk: boolean("buy_in_bulk").default(false),
  prioritizeCostSavings: boolean("prioritize_cost_savings").default(false),
  shoppingRadius: integer("shopping_radius").default(5),
});

// Retailer Schema
export const retailers = pgTable("retailers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  logoColor: text("logo_color"),
  apiEndpoint: text("api_endpoint"),
  apiKey: text("api_key"),
  apiSecret: text("api_secret"),
  authType: text("auth_type").default("api_key"), // api_key, oauth, basic
  requiresAuthentication: boolean("requires_authentication").default(false),
  supportsOnlineOrdering: boolean("supports_online_ordering").default(false),
  supportsPickup: boolean("supports_pickup").default(false),
  supportsDelivery: boolean("supports_delivery").default(false),
  apiDocumentation: text("api_documentation"),
});

// Retailer Account Schema
export const retailerAccounts = pgTable("retailer_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  retailerId: integer("retailer_id").notNull(),
  accountUsername: text("account_username"),
  accountToken: text("account_token"),
  isConnected: boolean("is_connected").default(false),
  customCircularUrl: text("custom_circular_url"),
});

// Product Schema
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  defaultUnit: text("default_unit"),
  restockFrequency: text("restock_frequency"),
  isNameBrand: boolean("is_name_brand").default(false),
  isOrganic: boolean("is_organic").default(false),
});

// Purchase History Schema with optimized indexing
export const purchases = pgTable("purchases", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  retailerId: integer("retailer_id"),
  purchaseDate: timestamp("purchase_date").notNull(),
  receiptImageUrl: text("receipt_image_url"),
  totalAmount: integer("total_amount").notNull(),
  receiptData: json("receipt_data").$type<{
    r?: number; // retailerId (compressed key)
    t?: number; // total (compressed key)  
    c?: number; // item count (compressed key)
    d?: string; // date (compressed key)
  }>(),
}, (table) => ({
  userIdIdx: index("purchases_user_id_idx").on(table.userId),
  purchaseDateIdx: index("purchases_date_idx").on(table.purchaseDate),
  userDateIdx: index("purchases_user_date_idx").on(table.userId, table.purchaseDate),
}));

// Purchase Item Schema with optimized indexing
export const purchaseItems = pgTable("purchase_items", {
  id: serial("id").primaryKey(),
  purchaseId: integer("purchase_id").notNull(),
  productId: integer("product_id"),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: integer("unit_price").notNull(),
  totalPrice: integer("total_price").notNull(),
}, (table) => ({
  purchaseIdIdx: index("purchase_items_purchase_id_idx").on(table.purchaseId),
  productNameIdx: index("purchase_items_product_name_idx").on(table.productName),
  productIdIdx: index("purchase_items_product_id_idx").on(table.productId),
}));

// Shopping List Schema
export const shoppingLists = pgTable("shopping_lists", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  isDefault: boolean("is_default").default(false),
});

// Product Unit Enum
export const unitEnum = pgEnum('unit_type', [
  'COUNT', 'LB', 'OZ', 'G', 'KG', 'PKG', 'ROLL', 'BOX', 'CAN', 'CANS', 'BOTTLE', 'JAR', 'BUNCH', 'GALLON', 'LOAF', 
  'DOZEN', 'PINT', 'QUART', 'CUP', 'TSP', 'TBSP', 'ML', 'L', 'SLICE', 'PACK', 'BAG', 'CONTAINER', 'PIECE', 'UNIT', 'SERVING'
]);

// Shopping List Item Schema
export const shoppingListItems = pgTable("shopping_list_items", {
  id: serial("id").primaryKey(),
  shoppingListId: integer("shopping_list_id").notNull(),
  productId: integer("product_id"),
  productName: text("product_name").notNull(),
  quantity: doublePrecision("quantity").notNull().default(1),
  unit: unitEnum("unit").default("COUNT"),
  isCompleted: boolean("is_completed").default(false),
  suggestedRetailerId: integer("suggested_retailer_id"),
  suggestedPrice: integer("suggested_price"),
  dueDate: timestamp("due_date"),
  category: text("category"),
  notes: text("notes"),
});

// Store Deals Schema
export const storeDeals = pgTable("store_deals", {
  id: serial("id").primaryKey(),
  retailerId: integer("retailer_id").notNull(),
  productName: text("product_name").notNull(),
  regularPrice: integer("regular_price").notNull(),
  salePrice: integer("sale_price").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  category: text("category"),
  dealSource: text("deal_source").default("manual"),
  circularId: integer("circular_id"),
  imageUrl: text("image_url"),
  featured: boolean("featured").default(false),
});

// Weekly Circulars Schema
export const weeklyCirculars = pgTable("weekly_circulars", {
  id: serial("id").primaryKey(),
  retailerId: integer("retailer_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  imageUrl: text("image_url"),
  pdfUrl: text("pdf_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// User Recommendations Schema
export const recommendations = pgTable("recommendations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  productId: integer("product_id"),
  productName: text("product_name").notNull(),
  recommendedDate: timestamp("recommended_date").notNull(),
  daysUntilPurchase: integer("days_until_purchase"),
  suggestedRetailerId: integer("suggested_retailer_id"),
  suggestedPrice: integer("suggested_price"),
  savings: integer("savings"),
  reason: text("reason"),
});

// Purchase Anomalies Schema - for tracking special circumstances that affect shopping patterns
export const purchaseAnomalies = pgTable("purchase_anomalies", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  anomalyType: anomalyTypeEnum("anomaly_type").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  description: text("description"),
  affectedCategories: text("affected_categories").array(),
  excludeFromRecommendations: boolean("exclude_from_recommendations").default(true),
});

// Affiliate Partners Schema
export const affiliatePartners = pgTable("affiliate_partners", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  websiteUrl: text("website_url").notNull(),
  logoUrl: text("logo_url"),
  apiEndpoint: text("api_endpoint"),
  apiKey: text("api_key"),
  commissionRate: doublePrecision("commission_rate").notNull(),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Affiliate Products Schema
export const affiliateProducts = pgTable("affiliate_products", {
  id: serial("id").primaryKey(),
  partnerId: integer("partner_id").references(() => affiliatePartners.id).notNull(),
  productName: text("product_name").notNull(),
  description: text("description"),
  productUrl: text("product_url").notNull(),
  imageUrl: text("image_url"),
  price: integer("price").notNull(),
  category: text("category").notNull(),
  commission: doublePrecision("commission").notNull(),
  trackingCode: text("tracking_code").notNull(),
  active: boolean("active").default(true),
  featured: boolean("featured").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Affiliate Clicks Schema
export const affiliateClicks = pgTable("affiliate_clicks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  productId: integer("product_id").references(() => affiliateProducts.id).notNull(),
  clickDate: timestamp("click_date").defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  referrer: text("referrer"),
});

// Affiliate Conversions Schema
export const affiliateConversions = pgTable("affiliate_conversions", {
  id: serial("id").primaryKey(),
  clickId: integer("click_id").references(() => affiliateClicks.id),
  userId: integer("user_id").references(() => users.id).notNull(),
  productId: integer("product_id").references(() => affiliateProducts.id).notNull(),
  conversionDate: timestamp("conversion_date").defaultNow(),
  orderValue: integer("order_value").notNull(),
  commission: doublePrecision("commission").notNull(),
  status: text("status").default("pending"), // pending, approved, rejected
  trackingReference: text("tracking_reference"),
});

// Product Normalization Tables
export const productAliases = pgTable("product_aliases", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id).notNull(),
  alias: text("alias").notNull(),
  retailerId: integer("retailer_id").references(() => retailers.id),
  confidence: doublePrecision("confidence").notNull().default(1.0),
  source: text("source").notNull().default("manual"), // manual, ai, receipt, api
  createdAt: timestamp("created_at").defaultNow(),
});

export const retailerProductVariations = pgTable("retailer_product_variations", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id).notNull(),
  retailerId: integer("retailer_id").references(() => retailers.id).notNull(),
  retailerProductName: text("retailer_product_name").notNull(),
  retailerSku: text("retailer_sku"),
  upc: text("upc"),
  brandName: text("brand_name"),
  packageSize: text("package_size"),
  packageUnit: text("package_unit"),
  lastSeen: timestamp("last_seen").defaultNow(),
  frequency: integer("frequency").default(1),
  isActive: boolean("is_active").default(true),
});

export const productMappingFeedback = pgTable("product_mapping_feedback", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  originalName: text("original_name").notNull(),
  suggestedProductId: integer("suggested_product_id").references(() => products.id),
  correctProductId: integer("correct_product_id").references(() => products.id),
  retailerId: integer("retailer_id").references(() => retailers.id),
  feedback: text("feedback"), // correct, incorrect, partially_correct
  confidence: doublePrecision("confidence"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertRetailerSchema = createInsertSchema(retailers).omit({
  id: true,
});

export const insertRetailerAccountSchema = createInsertSchema(retailerAccounts).omit({
  id: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
});

export const insertPurchaseSchema = createInsertSchema(purchases).omit({
  id: true,
});

export const insertPurchaseItemSchema = createInsertSchema(purchaseItems).omit({
  id: true,
});

export const insertShoppingListSchema = createInsertSchema(shoppingLists).omit({
  id: true,
});

export const insertShoppingListItemSchema = createInsertSchema(shoppingListItems).omit({
  id: true,
});

export const insertStoreDealSchema = createInsertSchema(storeDeals).omit({
  id: true,
});

export const insertWeeklyCircularSchema = createInsertSchema(weeklyCirculars).omit({
  id: true,
  createdAt: true,
});

export const insertRecommendationSchema = createInsertSchema(recommendations).omit({
  id: true,
});

export const insertPurchaseAnomalySchema = createInsertSchema(purchaseAnomalies).omit({
  id: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertRetailer = z.infer<typeof insertRetailerSchema>;
export type Retailer = typeof retailers.$inferSelect;

export type InsertRetailerAccount = z.infer<typeof insertRetailerAccountSchema>;
export type RetailerAccount = typeof retailerAccounts.$inferSelect;

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
export type Purchase = typeof purchases.$inferSelect;

export type InsertPurchaseItem = z.infer<typeof insertPurchaseItemSchema>;
export type PurchaseItem = typeof purchaseItems.$inferSelect;

export type InsertShoppingList = z.infer<typeof insertShoppingListSchema>;
export type ShoppingList = typeof shoppingLists.$inferSelect;

export type InsertShoppingListItem = z.infer<typeof insertShoppingListItemSchema>;
export type ShoppingListItem = typeof shoppingListItems.$inferSelect;

export type InsertStoreDeal = z.infer<typeof insertStoreDealSchema>;
export type StoreDeal = typeof storeDeals.$inferSelect;

export type InsertWeeklyCircular = z.infer<typeof insertWeeklyCircularSchema>;
export type WeeklyCircular = typeof weeklyCirculars.$inferSelect;

export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
export type Recommendation = typeof recommendations.$inferSelect;

export type InsertPurchaseAnomaly = z.infer<typeof insertPurchaseAnomalySchema>;
export type PurchaseAnomaly = typeof purchaseAnomalies.$inferSelect;

export const insertAffiliatePartnerSchema = createInsertSchema(affiliatePartners).omit({
  id: true,
  createdAt: true,
});
export type InsertAffiliatePartner = z.infer<typeof insertAffiliatePartnerSchema>;
export type AffiliatePartner = typeof affiliatePartners.$inferSelect;

export const insertAffiliateProductSchema = createInsertSchema(affiliateProducts).omit({
  id: true,
  createdAt: true,
});
export type InsertAffiliateProduct = z.infer<typeof insertAffiliateProductSchema>;
export type AffiliateProduct = typeof affiliateProducts.$inferSelect;

export const insertAffiliateClickSchema = createInsertSchema(affiliateClicks).omit({
  id: true,
  clickDate: true,
});
export type InsertAffiliateClick = z.infer<typeof insertAffiliateClickSchema>;
export type AffiliateClick = typeof affiliateClicks.$inferSelect;

export const insertAffiliateConversionSchema = createInsertSchema(affiliateConversions).omit({
  id: true,
  conversionDate: true,
});
export type InsertAffiliateConversion = z.infer<typeof insertAffiliateConversionSchema>;
export type AffiliateConversion = typeof affiliateConversions.$inferSelect;

// Security Audit Log Schema
export const securityAuditLog = pgTable("security_audit_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(),
  details: json("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  severity: pgEnum('severity', ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])("severity").default('MEDIUM'),
  timestamp: timestamp("timestamp").defaultNow(),
  resolved: boolean("resolved").default(false),
}, (table) => ({
  userIdIdx: index("security_log_user_id_idx").on(table.userId),
  timestampIdx: index("security_log_timestamp_idx").on(table.timestamp),
  severityIdx: index("security_log_severity_idx").on(table.severity),
}));

// Data Privacy Preferences Schema
export const dataPrivacyPreferences = pgTable("data_privacy_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  allowAnalytics: boolean("allow_analytics").default(true),
  allowMarketing: boolean("allow_marketing").default(false),
  allowDataSharing: boolean("allow_data_sharing").default(false),
  dataRetentionPeriod: integer("data_retention_period").default(2555), // 7 years in days
  allowLocationTracking: boolean("allow_location_tracking").default(true),
  allowPersonalization: boolean("allow_personalization").default(true),
  gdprConsent: boolean("gdpr_consent").default(false),
  ccpaOptOut: boolean("ccpa_opt_out").default(false),
  consentDate: timestamp("consent_date").defaultNow(),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// User Sessions Schema for Security
export const userSessions = pgTable("user_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  sessionToken: text("session_token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
  lastActivity: timestamp("last_activity").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  isActive: boolean("is_active").default(true),
}, (table) => ({
  userIdIdx: index("sessions_user_id_idx").on(table.userId),
  tokenIdx: index("sessions_token_idx").on(table.sessionToken),
  expiryIdx: index("sessions_expiry_idx").on(table.expiresAt),
}));

// Encrypted User Data Schema
export const encryptedUserData = pgTable("encrypted_user_data", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  dataType: text("data_type").notNull(), // 'payment_info', 'address', 'phone', etc.
  encryptedData: text("encrypted_data").notNull(),
  encryptionIv: text("encryption_iv").notNull(),
  encryptionTag: text("encryption_tag").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  lastAccessed: timestamp("last_accessed"),
});

export const insertSecurityLogSchema = createInsertSchema(securityAuditLog).omit({
  id: true,
  timestamp: true,
});

export const insertPrivacyPreferencesSchema = createInsertSchema(dataPrivacyPreferences).omit({
  id: true,
  consentDate: true,
  lastUpdated: true,
});

export const insertSessionSchema = createInsertSchema(userSessions).omit({
  id: true,
  createdAt: true,
  lastActivity: true,
});

export type InsertSecurityLog = z.infer<typeof insertSecurityLogSchema>;
export type SecurityLog = typeof securityAuditLog.$inferSelect;

export type InsertPrivacyPreferences = z.infer<typeof insertPrivacyPreferencesSchema>;
export type PrivacyPreferences = typeof dataPrivacyPreferences.$inferSelect;

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type UserSession = typeof userSessions.$inferSelect;

// Notification Preferences Schema
export const notificationPreferences = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  dealAlerts: boolean("deal_alerts").default(true),
  priceDropAlerts: boolean("price_drop_alerts").default(true),
  weeklyDigest: boolean("weekly_digest").default(false),
  expirationAlerts: boolean("expiration_alerts").default(true),
  recommendationUpdates: boolean("recommendation_updates").default(true),
  pushNotifications: boolean("push_notifications").default(false),
  emailNotifications: boolean("email_notifications").default(true),
  smsNotifications: boolean("sms_notifications").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const insertNotificationPreferencesSchema = createInsertSchema(notificationPreferences).omit({
  id: true,
  createdAt: true,
  lastUpdated: true,
});

export type InsertNotificationPreferences = z.infer<typeof insertNotificationPreferencesSchema>;
export type NotificationPreferences = typeof notificationPreferences.$inferSelect;
