// In a production application, this would use a real OCR service like Google Cloud Vision
// or OpenAI's image processing capabilities to extract text from receipt images

import { InsertPurchaseItem, InsertPurchase, Purchase } from "@shared/schema";

// Function to extract text from receipt image
export async function parseReceiptImage(imageBase64: string): Promise<any> {
  console.log("Parsing receipt image...");
  
  try {
    // Optimized simulated response - generate fewer items and less data
    const retailers = ["Walmart", "Target", "Kroger", "Whole Foods"];
    const retailerId = Math.floor(Math.random() * 4) + 1;
    const retailerName = retailers[retailerId - 1];
    
    // Use current date to reduce processing
    const today = new Date();
    
    // Reduced product set for faster processing
    const sampleProducts = [
      { name: "Milk", price: 379, quantity: 1 },
      { name: "Eggs", price: 349, quantity: 1 },
      { name: "Bread", price: 299, quantity: 1 },
      { name: "Bananas", price: 149, quantity: 1 },
      { name: "Chicken", price: 899, quantity: 1 },
    ];
    
    // Generate fewer items (3-5 instead of 3-8)
    const numProducts = Math.floor(Math.random() * 3) + 3;
    const selectedProducts = sampleProducts.slice(0, numProducts);
    
    // Simplified calculation
    const subtotal = selectedProducts.reduce((sum, product) => sum + product.price, 0);
    const tax = Math.round(subtotal * 0.08);
    const total = subtotal + tax;
    
    // Minimal data structure - no rawText to save space
    const receiptData = {
      retailerId,
      retailerName,
      date: today.toISOString(),
      items: selectedProducts,
      subtotal,
      tax,
      total
    };
    
    return receiptData;
  } catch (error) {
    console.error("Error parsing receipt image:", error);
    throw new Error("Failed to parse receipt image");
  }
}

// Convert extracted receipt data to purchase data with minimal storage
export function receiptToPurchase(receiptData: any, userId: number): InsertPurchase {
  // Store only essential receipt metadata, not full OCR text
  const compressedReceiptData = {
    retailerId: receiptData.retailerId,
    subtotal: receiptData.subtotal,
    tax: receiptData.tax,
    total: receiptData.total,
    // Remove rawText and redundant data to save space
    itemCount: receiptData.items?.length || 0
  };

  const purchase: InsertPurchase = {
    userId,
    retailerId: receiptData.retailerId,
    purchaseDate: receiptData.date || new Date().toISOString(),
    totalAmount: receiptData.total,
    receiptData: compressedReceiptData
  };
  
  return purchase;
}

// Extract purchase items from receipt data
export function extractPurchaseItems(receiptData: any, purchaseId: number): InsertPurchaseItem[] {
  if (!receiptData.items || !Array.isArray(receiptData.items)) {
    return [];
  }
  
  return receiptData.items.map(item => ({
    purchaseId,
    productName: item.name,
    quantity: item.quantity || 1,
    unitPrice: item.unitPrice || (item.price / (item.quantity || 1)),
    totalPrice: item.price
  }));
}
