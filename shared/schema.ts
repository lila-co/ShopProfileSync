import { pgTable, text, serial, integer, boolean, timestamp, json, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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

// User Schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
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
});

// Retailer Account Schema
export const retailerAccounts = pgTable("retailer_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  retailerId: integer("retailer_id").notNull(),
  accountUsername: text("account_username"),
  accountToken: text("account_token"),
  isConnected: boolean("is_connected").default(false),
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

// Purchase History Schema
export const purchases = pgTable("purchases", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  retailerId: integer("retailer_id"),
  purchaseDate: timestamp("purchase_date").notNull(),
  receiptImageUrl: text("receipt_image_url"),
  totalAmount: integer("total_amount").notNull(),
  receiptData: json("receipt_data"),
});

// Purchase Item Schema
export const purchaseItems = pgTable("purchase_items", {
  id: serial("id").primaryKey(),
  purchaseId: integer("purchase_id").notNull(),
  productId: integer("product_id"),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: integer("unit_price").notNull(),
  totalPrice: integer("total_price").notNull(),
});

// Shopping List Schema
export const shoppingLists = pgTable("shopping_lists", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  isDefault: boolean("is_default").default(false),
});

// Shopping List Item Schema
export const shoppingListItems = pgTable("shopping_list_items", {
  id: serial("id").primaryKey(),
  shoppingListId: integer("shopping_list_id").notNull(),
  productId: integer("product_id"),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull().default(1),
  isCompleted: boolean("is_completed").default(false),
  suggestedRetailerId: integer("suggested_retailer_id"),
  suggestedPrice: integer("suggested_price"),
  dueDate: timestamp("due_date"),
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

export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
export type Recommendation = typeof recommendations.$inferSelect;

export type InsertPurchaseAnomaly = z.infer<typeof insertPurchaseAnomalySchema>;
export type PurchaseAnomaly = typeof purchaseAnomalies.$inferSelect;
