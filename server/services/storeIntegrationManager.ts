
import { storage } from "../storage";
import axios from "axios";
import * as cheerio from "cheerio";

// Define integration levels for different stores
export enum IntegrationLevel {
  FULL_API = 'full_api',           // Complete API access (transactions, deals, ordering)
  DEALS_ONLY = 'deals_only',       // Only deals/circular data available
  CIRCULAR_SCRAPING = 'circular_scraping', // Need to scrape weekly circulars
  WEBSITE_ONLY = 'website_only',   // Only basic website presence
  MANUAL_ENTRY = 'manual_entry'    // User manually enters deals/prices
}

export interface StoreIntegrationConfig {
  id: number;
  name: string;
  integrationLevel: IntegrationLevel;
  apiEndpoint?: string;
  apiKey?: string;
  circularUrl?: string;
  websiteUrl?: string;
  scrapingConfig?: {
    circularSelector?: string;
    priceSelector?: string;
    productSelector?: string;
    dealSelector?: string;
  };
  supportedFeatures: {
    priceComparison: boolean;
    dealExtraction: boolean;
    onlineOrdering: boolean;
    storeLocator: boolean;
    inventoryCheck: boolean;
  };
  lastCircularUpdate?: Date;
  circularUpdateFrequency: 'daily' | 'weekly' | 'biweekly';
}

export class StoreIntegrationManager {
  private integrationConfigs: Map<number, StoreIntegrationConfig> = new Map();

  constructor() {
    this.initializeDefaultConfigs();
  }

  private initializeDefaultConfigs() {
    // Major retailers with full API support
    this.addIntegrationConfig({
      id: 1,
      name: 'Walmart',
      integrationLevel: IntegrationLevel.FULL_API,
      apiEndpoint: 'https://api.walmart.com',
      apiKey: process.env.WALMART_API_KEY,
      websiteUrl: 'https://walmart.com',
      supportedFeatures: {
        priceComparison: true,
        dealExtraction: true,
        onlineOrdering: true,
        storeLocator: true,
        inventoryCheck: true
      },
      circularUpdateFrequency: 'weekly'
    });

    this.addIntegrationConfig({
      id: 2,
      name: 'Target',
      integrationLevel: IntegrationLevel.FULL_API,
      apiEndpoint: 'https://api.target.com',
      apiKey: process.env.TARGET_API_KEY,
      websiteUrl: 'https://target.com',
      supportedFeatures: {
        priceComparison: true,
        dealExtraction: true,
        onlineOrdering: true,
        storeLocator: true,
        inventoryCheck: true
      },
      circularUpdateFrequency: 'weekly'
    });

    // Regional stores with circular scraping
    this.addIntegrationConfig({
      id: 3,
      name: 'Local Grocery Plus',
      integrationLevel: IntegrationLevel.CIRCULAR_SCRAPING,
      websiteUrl: 'https://localgroceryplus.com',
      circularUrl: 'https://localgroceryplus.com/weekly-ads',
      scrapingConfig: {
        circularSelector: '.weekly-ad-container',
        dealSelector: '.deal-item',
        priceSelector: '.price',
        productSelector: '.product-name'
      },
      supportedFeatures: {
        priceComparison: true,
        dealExtraction: true,
        onlineOrdering: false,
        storeLocator: true,
        inventoryCheck: false
      },
      circularUpdateFrequency: 'weekly'
    });
  }

  addIntegrationConfig(config: StoreIntegrationConfig) {
    this.integrationConfigs.set(config.id, config);
  }

  async addCustomStore(storeName: string, websiteUrl?: string): Promise<StoreIntegrationConfig> {
    // First, try to detect what integration level is possible
    const detectedLevel = await this.detectIntegrationLevel(storeName, websiteUrl);
    
    // Create retailer in database
    const retailer = await storage.createRetailer({
      name: storeName,
      logoColor: 'blue'
    });

    // Create integration config based on detection
    const config: StoreIntegrationConfig = {
      id: retailer.id,
      name: storeName,
      integrationLevel: detectedLevel.level,
      websiteUrl: websiteUrl,
      circularUrl: detectedLevel.circularUrl,
      scrapingConfig: detectedLevel.scrapingConfig,
      supportedFeatures: detectedLevel.supportedFeatures,
      circularUpdateFrequency: 'weekly'
    };

    this.addIntegrationConfig(config);
    
    // Schedule initial data collection if possible
    if (config.integrationLevel !== IntegrationLevel.MANUAL_ENTRY) {
      this.scheduleDataCollection(config.id);
    }

    return config;
  }

  private async detectIntegrationLevel(storeName: string, websiteUrl?: string): Promise<{
    level: IntegrationLevel;
    circularUrl?: string;
    scrapingConfig?: any;
    supportedFeatures: any;
  }> {
    const defaultFeatures = {
      priceComparison: false,
      dealExtraction: false,
      onlineOrdering: false,
      storeLocator: false,
      inventoryCheck: false
    };

    if (!websiteUrl) {
      return {
        level: IntegrationLevel.MANUAL_ENTRY,
        supportedFeatures: defaultFeatures
      };
    }

    try {
      // Try to fetch the website and analyze it
      const response = await axios.get(websiteUrl, { timeout: 10000 });
      const $ = cheerio.load(response.data);

      // Look for common indicators of different integration levels
      const hasApi = this.checkForApiIndicators($, response.data);
      const circularInfo = this.findCircularSection($, websiteUrl);
      const onlineOrderingAvailable = this.checkForOnlineOrdering($);

      if (hasApi) {
        return {
          level: IntegrationLevel.DEALS_ONLY,
          supportedFeatures: {
            ...defaultFeatures,
            priceComparison: true,
            dealExtraction: true,
            onlineOrdering: onlineOrderingAvailable
          }
        };
      } else if (circularInfo.found) {
        return {
          level: IntegrationLevel.CIRCULAR_SCRAPING,
          circularUrl: circularInfo.url,
          scrapingConfig: circularInfo.scrapingConfig,
          supportedFeatures: {
            ...defaultFeatures,
            priceComparison: true,
            dealExtraction: true,
            storeLocator: true
          }
        };
      } else {
        return {
          level: IntegrationLevel.WEBSITE_ONLY,
          supportedFeatures: {
            ...defaultFeatures,
            storeLocator: true
          }
        };
      }
    } catch (error) {
      console.error(`Error analyzing website for ${storeName}:`, error);
      return {
        level: IntegrationLevel.MANUAL_ENTRY,
        supportedFeatures: defaultFeatures
      };
    }
  }

  private checkForApiIndicators($: cheerio.CheerioAPI, html: string): boolean {
    // Look for API documentation, developer links, or API endpoints
    const apiIndicators = [
      'api.', '/api/', 'developer', 'docs/api', 'swagger', 'graphql'
    ];

    return apiIndicators.some(indicator => 
      html.toLowerCase().includes(indicator) ||
      $('a[href*="' + indicator + '"]').length > 0
    );
  }

  private findCircularSection($: cheerio.CheerioAPI, baseUrl: string): {
    found: boolean;
    url?: string;
    scrapingConfig?: any;
  } {
    // Common selectors and terms for weekly ads/circulars
    const circularTerms = [
      'weekly ad', 'circular', 'weekly deals', 'specials', 'sales flyer',
      'weekly specials', 'this week', 'current deals'
    ];

    const circularSelectors = [
      'a[href*="weekly"]', 'a[href*="circular"]', 'a[href*="ad"]',
      'a[href*="deals"]', 'a[href*="specials"]', '.weekly-ad',
      '.circular', '.deals-link'
    ];

    // Try to find circular links
    for (const selector of circularSelectors) {
      const $link = $(selector).first();
      if ($link.length > 0) {
        const href = $link.attr('href');
        if (href) {
          const fullUrl = href.startsWith('http') ? href : new URL(href, baseUrl).toString();
          return {
            found: true,
            url: fullUrl,
            scrapingConfig: this.generateScrapingConfig($)
          };
        }
      }
    }

    // Check for text content mentioning circulars
    for (const term of circularTerms) {
      const $element = $(`*:contains("${term}")`).first();
      if ($element.length > 0) {
        const $link = $element.find('a').first() || $element.closest('a');
        if ($link.length > 0) {
          const href = $link.attr('href');
          if (href) {
            const fullUrl = href.startsWith('http') ? href : new URL(href, baseUrl).toString();
            return {
              found: true,
              url: fullUrl,
              scrapingConfig: this.generateScrapingConfig($)
            };
          }
        }
      }
    }

    return { found: false };
  }

  private generateScrapingConfig($: cheerio.CheerioAPI): any {
    // Generate a basic scraping configuration based on common patterns
    return {
      circularSelector: '.circular, .weekly-ad, .deals-container, .ad-container',
      dealSelector: '.deal, .product, .item, .sale-item',
      priceSelector: '.price, .cost, .amount, [class*="price"], [class*="cost"]',
      productSelector: '.product-name, .item-name, .title, h3, h4'
    };
  }

  private checkForOnlineOrdering($: cheerio.CheerioAPI): boolean {
    const orderingIndicators = [
      'add to cart', 'buy online', 'order online', 'shop online',
      'pickup', 'delivery', 'cart', 'checkout'
    ];

    return orderingIndicators.some(indicator =>
      $(`*:contains("${indicator}")`).length > 0 ||
      $(`[class*="${indicator}"], [id*="${indicator}"]`).length > 0
    );
  }

  async scheduleDataCollection(storeId: number) {
    const config = this.integrationConfigs.get(storeId);
    if (!config) return;

    try {
      switch (config.integrationLevel) {
        case IntegrationLevel.CIRCULAR_SCRAPING:
          await this.scrapeCircularDeals(config);
          break;
        case IntegrationLevel.DEALS_ONLY:
          await this.fetchDealsOnlyData(config);
          break;
        case IntegrationLevel.FULL_API:
          // Already handled by existing retailer integration
          break;
      }
    } catch (error) {
      console.error(`Error collecting data for store ${config.name}:`, error);
    }
  }

  private async scrapeCircularDeals(config: StoreIntegrationConfig) {
    if (!config.circularUrl || !config.scrapingConfig) return;

    try {
      const response = await axios.get(config.circularUrl);
      const $ = cheerio.load(response.data);

      const deals = [];
      $(config.scrapingConfig.dealSelector || '.deal').each((index, element) => {
        const $deal = $(element);
        const productName = $deal.find(config.scrapingConfig.productSelector || '.product-name').text().trim();
        const priceText = $deal.find(config.scrapingConfig.priceSelector || '.price').text().trim();
        
        if (productName && priceText) {
          const price = this.extractPriceFromText(priceText);
          if (price > 0) {
            deals.push({
              productName,
              salePrice: Math.round(price * 100), // Convert to cents
              regularPrice: Math.round(price * 1.2 * 100), // Estimate regular price
              retailerId: config.id,
              startDate: new Date(),
              endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
              category: this.categorizeProduct(productName)
            });
          }
        }
      });

      // Store the deals in database
      for (const deal of deals) {
        await storage.createStoreDeal(deal);
      }

      // Update last update time
      config.lastCircularUpdate = new Date();
      
      console.log(`Scraped ${deals.length} deals from ${config.name}`);
    } catch (error) {
      console.error(`Error scraping circular for ${config.name}:`, error);
    }
  }

  private extractPriceFromText(priceText: string): number {
    // Extract numeric price from text like "$3.99", "3.99", "$3.99/lb", etc.
    const priceMatch = priceText.match(/\$?(\d+\.?\d*)/);
    return priceMatch ? parseFloat(priceMatch[1]) : 0;
  }

  private categorizeProduct(productName: string): string {
    const categories = {
      'Produce': ['apple', 'banana', 'orange', 'lettuce', 'carrot', 'tomato', 'onion'],
      'Dairy': ['milk', 'cheese', 'yogurt', 'butter', 'cream'],
      'Meat': ['chicken', 'beef', 'pork', 'fish', 'turkey', 'ham'],
      'Bakery': ['bread', 'bagel', 'muffin', 'cake', 'pastry'],
      'Pantry': ['rice', 'pasta', 'cereal', 'soup', 'sauce']
    };

    const lowerProductName = productName.toLowerCase();
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => lowerProductName.includes(keyword))) {
        return category;
      }
    }
    return 'General';
  }

  private async fetchDealsOnlyData(config: StoreIntegrationConfig) {
    // Implementation for stores with deals-only API access
    // This would be similar to existing retailer integration but focused on deals
    console.log(`Fetching deals-only data for ${config.name}`);
  }

  getIntegrationConfig(storeId: number): StoreIntegrationConfig | undefined {
    return this.integrationConfigs.get(storeId);
  }

  getAllIntegrationConfigs(): StoreIntegrationConfig[] {
    return Array.from(this.integrationConfigs.values());
  }

  async getStoreCapabilities(storeId: number): Promise<{
    canComparePrices: boolean;
    canExtractDeals: boolean;
    canOrderOnline: boolean;
    dataFreshness: string;
    nextUpdateExpected: Date | null;
  }> {
    const config = this.integrationConfigs.get(storeId);
    if (!config) {
      return {
        canComparePrices: false,
        canExtractDeals: false,
        canOrderOnline: false,
        dataFreshness: 'No data available',
        nextUpdateExpected: null
      };
    }

    const nextUpdate = this.calculateNextUpdate(config);
    const freshness = this.calculateDataFreshness(config);

    return {
      canComparePrices: config.supportedFeatures.priceComparison,
      canExtractDeals: config.supportedFeatures.dealExtraction,
      canOrderOnline: config.supportedFeatures.onlineOrdering,
      dataFreshness: freshness,
      nextUpdateExpected: nextUpdate
    };
  }

  private calculateNextUpdate(config: StoreIntegrationConfig): Date | null {
    if (!config.lastCircularUpdate) return null;

    const intervalDays = config.circularUpdateFrequency === 'daily' ? 1 :
                        config.circularUpdateFrequency === 'weekly' ? 7 : 14;

    return new Date(config.lastCircularUpdate.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  }

  private calculateDataFreshness(config: StoreIntegrationConfig): string {
    if (!config.lastCircularUpdate) return 'Never updated';

    const hoursOld = (Date.now() - config.lastCircularUpdate.getTime()) / (1000 * 60 * 60);
    
    if (hoursOld < 24) return `Updated ${Math.round(hoursOld)} hours ago`;
    if (hoursOld < 168) return `Updated ${Math.round(hoursOld / 24)} days ago`;
    return `Updated ${Math.round(hoursOld / 168)} weeks ago`;
  }
}

export const storeIntegrationManager = new StoreIntegrationManager();
