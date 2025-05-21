// In a production application, this would use a real OCR service like Google Cloud Vision
// or OpenAI's image processing capabilities to extract text from receipt images

import { InsertPurchaseItem, InsertPurchase, Purchase } from "@shared/schema";

// Function to extract text from receipt image
export async function parseReceiptImage(imageBase64: string): Promise<any> {
  console.log("Parsing receipt image...");
  
  try {
    // This is a simulated response since we don't have a real OCR service
    // In a real application, we would call an OCR API here
    // The structure mimics what would come back from a real service
    
    // Add some randomness to make it seem more realistic
    const retailers = ["Walmart", "Target", "Kroger", "Whole Foods"];
    const retailerId = Math.floor(Math.random() * 4) + 1;
    const retailerName = retailers[retailerId - 1];
    
    // Generate a random date within the last 2 weeks
    const today = new Date();
    const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
    const randomDate = new Date(
      twoWeeksAgo.getTime() + Math.random() * (today.getTime() - twoWeeksAgo.getTime())
    );
    
    // Sample product categories
    const categories = ["Dairy", "Produce", "Bakery", "Household", "Beverages", "Pantry"];
    
    // Sample products with realistic prices
    const sampleProducts = [
      { name: "Milk (Gallon)", category: "Dairy", price: 379, quantity: 1 },
      { name: "Eggs (dozen)", category: "Dairy", price: 349, quantity: 1 },
      { name: "Bread", category: "Bakery", price: 299, quantity: 1 },
      { name: "Bananas", category: "Produce", price: 149, quantity: 1 },
      { name: "Apples", category: "Produce", price: 389, quantity: 1 },
      { name: "Toilet Paper (24 pack)", category: "Household", price: 1899, quantity: 1 },
      { name: "Paper Towels", category: "Household", price: 1299, quantity: 1 },
      { name: "Laundry Detergent", category: "Household", price: 1799, quantity: 1 },
      { name: "Coffee", category: "Beverages", price: 899, quantity: 1 },
      { name: "Cereal", category: "Breakfast", price: 399, quantity: 1 },
      { name: "Pasta", category: "Pantry", price: 199, quantity: 1 },
      { name: "Pasta Sauce", category: "Pantry", price: 299, quantity: 1 },
    ];
    
    // Select 3-8 random products
    const numProducts = Math.floor(Math.random() * 6) + 3;
    const selectedProducts = [];
    const usedIndices = new Set<number>();
    
    for (let i = 0; i < numProducts; i++) {
      let randomIndex: number;
      do {
        randomIndex = Math.floor(Math.random() * sampleProducts.length);
      } while (usedIndices.has(randomIndex));
      
      usedIndices.add(randomIndex);
      
      // Randomly adjust quantity sometimes
      const product = {...sampleProducts[randomIndex]};
      if (Math.random() > 0.7) {
        product.quantity = Math.floor(Math.random() * 3) + 2;
        product.price = product.price * product.quantity;
      }
      
      selectedProducts.push(product);
    }
    
    // Calculate subtotal
    const subtotal = selectedProducts.reduce((sum, product) => sum + product.price, 0);
    
    // Calculate tax (approximately 8%)
    const tax = Math.round(subtotal * 0.08);
    
    // Calculate total
    const total = subtotal + tax;
    
    const receiptData = {
      retailerId,
      retailerName,
      date: randomDate.toISOString(),
      items: selectedProducts,
      subtotal,
      tax,
      total,
      rawText: `RECEIPT\n${retailerName}\nDate: ${randomDate.toLocaleDateString()}\n` +
               selectedProducts.map(p => `${p.name} $${(p.price/100).toFixed(2)}`).join('\n') +
               `\nSubtotal: $${(subtotal/100).toFixed(2)}\nTax: $${(tax/100).toFixed(2)}\nTotal: $${(total/100).toFixed(2)}`
    };
    
    return receiptData;
  } catch (error) {
    console.error("Error parsing receipt image:", error);
    throw new Error("Failed to parse receipt image");
  }
}

// Convert extracted receipt data to purchase data
export function receiptToPurchase(receiptData: any, userId: number): InsertPurchase {
  const purchase: InsertPurchase = {
    userId,
    retailerId: receiptData.retailerId,
    purchaseDate: receiptData.date || new Date().toISOString(),
    totalAmount: receiptData.total,
    receiptData
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
