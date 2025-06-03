
import axios from 'axios';
import * as cheerio from 'cheerio';
import { storage } from '../storage';
import { circularDealExtractor } from './circularDealExtractor';

export class CircularFetcher {
  /**
   * Automatically fetch circulars for all connected retailers
   */
  async fetchAllCirculars(): Promise<void> {
    console.log('Starting automatic circular fetch...');
    
    try {
      const retailers = await storage.getRetailers();
      
      for (const retailer of retailers) {
        try {
          await this.fetchRetailerCircular(retailer.id);
        } catch (error) {
          console.error(`Failed to fetch circular for ${retailer.name}:`, error);
        }
      }
    } catch (error) {
      console.error('Error in fetchAllCirculars:', error);
    }
  }

  /**
   * Fetch circular for a specific retailer
   */
  async fetchRetailerCircular(retailerId: number, customUrl?: string): Promise<void> {
    const retailer = await storage.getRetailer(retailerId);
    if (!retailer) {
      throw new Error(`Retailer ${retailerId} not found`);
    }

    console.log(`Fetching circular for ${retailer.name}...`);

    // Check if we already have a recent circular (within last 24 hours)
    const existingCirculars = await storage.getWeeklyCirculars();
    const recentCircular = existingCirculars.find(c => 
      c.retailerId === retailerId && 
      c.isActive && 
      new Date(c.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000
    );

    if (recentCircular) {
      console.log(`Recent circular already exists for ${retailer.name}, skipping`);
      return;
    }

    try {
      const circularData = await this.scrapeRetailerCircular(retailer, customUrl);
      
      if (circularData) {
        // Create the circular in database
        const circular = await storage.createWeeklyCircular({
          retailerId: retailer.id,
          title: circularData.title,
          description: circularData.description,
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          imageUrl: circularData.imageUrl,
          pdfUrl: circularData.pdfUrl,
          pages: circularData.pages || 1,
          isActive: true
        });

        // Extract deals from the circular
        await circularDealExtractor.extractDealsFromCircular(circular.id);
        
        console.log(`Successfully fetched and processed circular for ${retailer.name}`);
      }
    } catch (error) {
      console.error(`Error fetching circular for ${retailer.name}:`, error);
    }
  }

  /**
   * Scrape circular from retailer website
   */
  private async scrapeRetailerCircular(retailer: any, customUrl?: string): Promise<{
    title: string;
    description: string;
    imageUrl?: string;
    pdfUrl?: string;
    pages?: number;
  } | null> {
    // Use custom URL if provided, otherwise use retailer configuration
    if (customUrl) {
      console.log(`Using custom circular URL for ${retailer.name}: ${customUrl}`);
      try {
        return {
          title: `${retailer.name} Weekly Circular`,
          description: `Weekly deals from ${retailer.name}`,
          imageUrl: customUrl.endsWith('.pdf') ? null : customUrl,
          pdfUrl: customUrl.endsWith('.pdf') ? customUrl : null,
          pages: 1
        };
      } catch (error) {
        console.error(`Error with custom URL for ${retailer.name}:`, error);
        // Fall through to auto-detection
      }
    }

    // Get retailer's base URL and circular patterns
    const circularConfig = this.getRetailerCircularConfig(retailer.name);
    
    if (!circularConfig) {
      console.log(`No circular configuration found for ${retailer.name}`);
      return null;
    }

    try {
      // Fetch the main page
      const response = await axios.get(circularConfig.baseUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SmartCart/1.0; +https://smartcart.app/bot)'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      
      // Find circular links
      const circularUrl = await this.findCircularUrl($, circularConfig);
      
      if (circularUrl) {
        return {
          title: `${retailer.name} Weekly Circular`,
          description: `This week's deals and specials from ${retailer.name}`,
          imageUrl: circularUrl.endsWith('.pdf') ? null : circularUrl,
          pdfUrl: circularUrl.endsWith('.pdf') ? circularUrl : null,
          pages: 1
        };
      }

      return null;
    } catch (error) {
      console.error(`Error scraping ${retailer.name} website:`, error);
      return null;
    }
  }

  /**
   * Get retailer-specific circular configuration
   */
  private getRetailerCircularConfig(retailerName: string): {
    baseUrl: string;
    selectors: string[];
    patterns: string[];
  } | null {
    const configs: Record<string, any> = {
      'Walmart': {
        baseUrl: 'https://www.walmart.com/store/weekly-ads',
        selectors: ['a[href*="weekly"]', 'a[href*="circular"]', '.weekly-ad-link'],
        patterns: ['weekly', 'circular', 'ad', 'deals']
      },
      'Target': {
        baseUrl: 'https://www.target.com/c/target-circle-offers-coupons',
        selectors: ['a[href*="weekly"]', 'a[href*="ad"]', '.deals-link'],
        patterns: ['weekly', 'ad', 'deals', 'circle']
      },
      'Kroger': {
        baseUrl: 'https://www.kroger.com/weeklyad',
        selectors: ['a[href*="weekly"]', 'a[href*="ad"]', '.weekly-ad'],
        patterns: ['weekly', 'ad', 'specials']
      },
      'Safeway': {
        baseUrl: 'https://www.safeway.com/justforu/coupons-deals.html',
        selectors: ['a[href*="weekly"]', 'a[href*="deals"]', '.deals-link'],
        patterns: ['weekly', 'deals', 'coupons']
      },
      'Whole Foods': {
        baseUrl: 'https://www.wholefoodsmarket.com/sales-flyer',
        selectors: ['a[href*="sales"]', 'a[href*="flyer"]', '.sales-link'],
        patterns: ['sales', 'flyer', 'deals']
      }
    };

    return configs[retailerName] || null;
  }

  /**
   * Find circular URL from page content
   */
  private async findCircularUrl($: cheerio.CheerioAPI, config: any): Promise<string | null> {
    // Try configured selectors first
    for (const selector of config.selectors) {
      const $link = $(selector).first();
      if ($link.length > 0) {
        const href = $link.attr('href');
        if (href) {
          return href.startsWith('http') ? href : new URL(href, config.baseUrl).toString();
        }
      }
    }

    // Look for text patterns
    for (const pattern of config.patterns) {
      const $element = $(`*:contains("${pattern}")`).first();
      if ($element.length > 0) {
        const $link = $element.find('a').first() || $element.closest('a');
        if ($link.length > 0) {
          const href = $link.attr('href');
          if (href) {
            return href.startsWith('http') ? href : new URL(href, config.baseUrl).toString();
          }
        }
      }
    }

    return null;
  }

  /**
   * Process forwarded circular email
   */
  async processForwardedEmail(emailContent: string, fromAddress: string): Promise<void> {
    console.log('Processing forwarded circular email...');
    
    try {
      // Extract retailer from email domain or content
      const retailer = await this.identifyRetailerFromEmail(emailContent, fromAddress);
      
      if (!retailer) {
        console.log('Could not identify retailer from email');
        return;
      }

      // Extract circular content
      const circularData = await this.extractCircularFromEmail(emailContent);
      
      if (circularData) {
        // Create circular in database
        const circular = await storage.createWeeklyCircular({
          retailerId: retailer.id,
          title: circularData.title || `${retailer.name} Weekly Circular`,
          description: circularData.description || `Forwarded circular from ${retailer.name}`,
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          imageUrl: circularData.imageUrl,
          pdfUrl: circularData.pdfUrl,
          pages: 1,
          isActive: true
        });

        // Extract deals
        await circularDealExtractor.extractDealsFromCircular(circular.id);
        
        console.log(`Successfully processed forwarded circular from ${retailer.name}`);
      }
    } catch (error) {
      console.error('Error processing forwarded email:', error);
    }
  }

  /**
   * Identify retailer from email content
   */
  private async identifyRetailerFromEmail(emailContent: string, fromAddress: string): Promise<any> {
    const retailers = await storage.getRetailers();
    const content = emailContent.toLowerCase();
    const from = fromAddress.toLowerCase();

    // Try to match by domain first
    for (const retailer of retailers) {
      const domain = retailer.name.toLowerCase().replace(/\s+/g, '');
      if (from.includes(domain)) {
        return retailer;
      }
    }

    // Try to match by name in content
    for (const retailer of retailers) {
      if (content.includes(retailer.name.toLowerCase())) {
        return retailer;
      }
    }

    return null;
  }

  /**
   * Extract circular data from email content
   */
  private async extractCircularFromEmail(emailContent: string): Promise<{
    title?: string;
    description?: string;
    imageUrl?: string;
    pdfUrl?: string;
  } | null> {
    // Use regex to find links to images or PDFs
    const imageRegex = /https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp)/gi;
    const pdfRegex = /https?:\/\/[^\s]+\.pdf/gi;
    
    const imageMatches = emailContent.match(imageRegex);
    const pdfMatches = emailContent.match(pdfRegex);

    const imageUrl = imageMatches?.[0];
    const pdfUrl = pdfMatches?.[0];

    if (imageUrl || pdfUrl) {
      return {
        title: this.extractTitleFromEmail(emailContent),
        description: 'Circular processed from forwarded email',
        imageUrl,
        pdfUrl
      };
    }

    return null;
  }

  /**
   * Extract title from email content
   */
  private extractTitleFromEmail(emailContent: string): string {
    // Look for subject line or title patterns
    const titlePatterns = [
      /subject:\s*(.+)/i,
      /weekly\s+ad\s*[:\-]?\s*(.+)/i,
      /this\s+week'?s?\s+deals/i,
      /special\s+offers/i
    ];

    for (const pattern of titlePatterns) {
      const match = emailContent.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return 'Weekly Circular';
  }
}

export const circularFetcher = new CircularFetcher();
