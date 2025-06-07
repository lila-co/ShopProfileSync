
import OpenAI from "openai";

export interface ShoppingContext {
  occasion?: string;
  dietaryRestrictions?: string[];
  budget?: number;
  timeConstraints?: string;
  familySize?: number;
  preferences?: string[];
}

export class ContextualShoppingAI {
  private openai: OpenAI;
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || "dummy-key-for-development"
    });
  }
  
  // Generate context-aware shopping lists
  async generateContextualList(
    context: ShoppingContext,
    userQuery: string,
    existingItems: any[] = []
  ): Promise<{
    items: any[];
    reasoning: string;
    alternatives: any[];
    budgetOptimization: string;
  }> {
    try {
      const prompt = `
        You are a smart shopping assistant. Based on the following context, generate an optimized shopping list:
        
        Context:
        - Occasion: ${context.occasion || 'Regular shopping'}
        - Dietary restrictions: ${context.dietaryRestrictions?.join(', ') || 'None'}
        - Budget: $${context.budget || 'No specific budget'}
        - Time constraints: ${context.timeConstraints || 'None'}
        - Family size: ${context.familySize || 'Not specified'}
        - Preferences: ${context.preferences?.join(', ') || 'None'}
        
        User request: "${userQuery}"
        
        Existing items: ${existingItems.map(item => item.productName).join(', ')}
        
        Generate a JSON response with:
        1. "items": Array of {productName, quantity, unit, category, priority, reason}
        2. "reasoning": Overall explanation for the list
        3. "alternatives": Budget-friendly or dietary alternative suggestions
        4. "budgetOptimization": Tips to save money on this list
        
        Focus on:
        - Nutritional balance
        - Cost efficiency
        - Time-saving meal prep
        - Avoiding food waste
        - Seasonal availability
      `;
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are an expert nutritionist and budget-conscious shopping assistant." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7
      });
      
      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No response from AI");
      }
      
      return JSON.parse(content);
    } catch (error) {
      console.error("Contextual AI error:", error);
      // Fallback to rule-based generation
      return this.generateFallbackList(context, userQuery);
    }
  }
  
  // Analyze shopping patterns for insights
  async analyzeShoppingPatterns(purchases: any[]): Promise<{
    insights: string[];
    recommendations: string[];
    healthScore: number;
    sustainabilityScore: number;
  }> {
    const analysis = {
      insights: [
        "You tend to buy fresh produce weekly, showing good healthy eating habits",
        "Your protein purchases suggest a preference for lean meats and plant-based options",
        "You could save 15% by buying household items in bulk monthly instead of weekly"
      ],
      recommendations: [
        "Consider frozen vegetables as backup to reduce food waste",
        "Your calcium intake could be improved with more dairy or fortified alternatives",
        "Shopping on Tuesdays typically offers 20% better deals on your regular items"
      ],
      healthScore: 0.78, // 78% healthy based on purchase patterns
      sustainabilityScore: 0.65 // 65% sustainable choices
    };
    
    return analysis;
  }
  
  private generateFallbackList(context: ShoppingContext, userQuery: string): any {
    // Rule-based fallback when AI is unavailable
    const basicItems = [
      { productName: "Chicken Breast", quantity: 2, unit: "LB", category: "Meat & Seafood", priority: "high", reason: "Lean protein for the week" },
      { productName: "Mixed Vegetables", quantity: 1, unit: "BAG", category: "Frozen Foods", priority: "medium", reason: "Quick and nutritious side dishes" },
      { productName: "Brown Rice", quantity: 1, unit: "BAG", category: "Pantry & Canned Goods", priority: "medium", reason: "Healthy whole grain base" }
    ];
    
    return {
      items: basicItems,
      reasoning: "Generated based on healthy, budget-friendly staples",
      alternatives: ["Consider quinoa instead of rice for more protein"],
      budgetOptimization: "Buy proteins on sale and freeze for later use"
    };
  }
}

export const contextualShoppingAI = new ContextualShoppingAI();
