import { apiRequest } from "./queryClient";

// Function to extract text from receipt image
export async function extractTextFromReceiptImage(imageBase64: string): Promise<any> {
  try {
    const response = await apiRequest("POST", "/api/receipts/extract", {
      image: imageBase64
    });
    
    return await response.json();
  } catch (error) {
    console.error("Error extracting text from receipt image:", error);
    throw error;
  }
}

// Function to analyze purchase patterns
export async function analyzePurchasePatterns(purchaseHistory: any[]): Promise<any> {
  try {
    const response = await apiRequest("POST", "/api/analyze/patterns", {
      purchaseHistory
    });
    
    return await response.json();
  } catch (error) {
    console.error("Error analyzing purchase patterns:", error);
    throw error;
  }
}

// Function to get product recommendations
export async function getProductRecommendations(userId: number): Promise<any> {
  try {
    const response = await apiRequest("GET", `/api/recommendations/${userId}`);
    
    return await response.json();
  } catch (error) {
    console.error("Error getting product recommendations:", error);
    throw error;
  }
}
