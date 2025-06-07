
export interface PricePrediction {
  productName: string;
  currentPrice: number;
  predictedPrice: number;
  priceDirection: 'rising' | 'falling' | 'stable';
  confidence: number;
  bestBuyWindow: {
    start: Date;
    end: Date;
    reason: string;
  };
  dealProbability: number;
}

export class SmartPricePredictor {
  // Analyze historical price data to predict future prices
  async predictPrices(productNames: string[]): Promise<PricePrediction[]> {
    const predictions: PricePrediction[] = [];
    
    for (const productName of productNames) {
      // Simulate AI price prediction based on seasonal patterns, demand, and historical data
      const seasonality = this.getSeasonalFactor(productName);
      const demandFactor = this.getDemandFactor(productName);
      const historicalTrend = this.getHistoricalTrend(productName);
      
      const currentPrice = this.getCurrentPrice(productName);
      const predictedPrice = currentPrice * (1 + seasonality + demandFactor + historicalTrend);
      
      const prediction: PricePrediction = {
        productName,
        currentPrice,
        predictedPrice,
        priceDirection: predictedPrice > currentPrice * 1.05 ? 'rising' : 
                       predictedPrice < currentPrice * 0.95 ? 'falling' : 'stable',
        confidence: 0.75 + Math.random() * 0.2, // 75-95% confidence
        bestBuyWindow: this.calculateBestBuyWindow(productName, predictedPrice, currentPrice),
        dealProbability: this.calculateDealProbability(productName)
      };
      
      predictions.push(prediction);
    }
    
    return predictions;
  }
  
  private getSeasonalFactor(productName: string): number {
    const now = new Date();
    const month = now.getMonth();
    
    // Seasonal adjustments for common products
    if (productName.toLowerCase().includes('soup') && (month >= 10 || month <= 2)) {
      return 0.15; // 15% higher in winter
    }
    if (productName.toLowerCase().includes('ice cream') && (month >= 5 && month <= 8)) {
      return 0.12; // 12% higher in summer
    }
    if (productName.toLowerCase().includes('turkey') && month === 10) {
      return 0.25; // 25% higher before Thanksgiving
    }
    
    return 0; // No seasonal adjustment
  }
  
  private getDemandFactor(productName: string): number {
    // Simulate demand-based pricing (supply chain, popularity, etc.)
    return (Math.random() - 0.5) * 0.1; // ±5% random demand fluctuation
  }
  
  private getHistoricalTrend(productName: string): number {
    // Simulate historical price trends
    return (Math.random() - 0.5) * 0.08; // ±4% trend adjustment
  }
  
  private getCurrentPrice(productName: string): number {
    // Simulate getting current market price
    return 299 + Math.random() * 500; // $2.99 to $7.99 range
  }
  
  private calculateBestBuyWindow(productName: string, predictedPrice: number, currentPrice: number): {
    start: Date;
    end: Date;
    reason: string;
  } {
    const now = new Date();
    
    if (predictedPrice > currentPrice * 1.1) {
      // Price rising, buy soon
      return {
        start: now,
        end: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // Next 3 days
        reason: "Price expected to rise 10%+ - buy now to save"
      };
    } else if (predictedPrice < currentPrice * 0.9) {
      // Price falling, wait
      return {
        start: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // Wait 1 week
        end: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), // Buy within 2 weeks
        reason: "Price expected to drop 10%+ - wait for better deal"
      };
    } else {
      // Stable pricing
      return {
        start: now,
        end: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // Next week
        reason: "Price stable - buy when convenient"
      };
    }
  }
  
  private calculateDealProbability(productName: string): number {
    // Simulate deal probability based on product category and timing
    const category = this.categorizeProduct(productName);
    const baseProbability = {
      'Produce': 0.3,
      'Dairy & Eggs': 0.25,
      'Meat & Seafood': 0.4,
      'Pantry & Canned Goods': 0.35,
      'Frozen Foods': 0.3,
      'Household Items': 0.45
    };
    
    return baseProbability[category] || 0.3;
  }
  
  private categorizeProduct(productName: string): string {
    // Simple categorization for demo
    const name = productName.toLowerCase();
    if (name.includes('milk') || name.includes('cheese') || name.includes('egg')) return 'Dairy & Eggs';
    if (name.includes('chicken') || name.includes('beef') || name.includes('fish')) return 'Meat & Seafood';
    if (name.includes('apple') || name.includes('banana') || name.includes('lettuce')) return 'Produce';
    if (name.includes('paper') || name.includes('soap') || name.includes('detergent')) return 'Household Items';
    return 'Pantry & Canned Goods';
  }
}

export const smartPricePredictor = new SmartPricePredictor();
