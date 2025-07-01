export interface AICategorization {
  category: string;
  confidence: number;
  aisle: string;
  section: string;
  suggestedQuantity?: number;
  suggestedUnit?: string;
  conversionReason?: string;
}

export interface CategoryCache {
  [productName: string]: {
    result: AICategorization;
    timestamp: number;
    ttl: number; // Time to live in milliseconds
  };
}

class AICategorationService {
  private cache: CategoryCache = {};
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_CACHE_SIZE = 1000;

  private categoryPatterns: Map<string, RegExp[]> = new Map([
    ['Produce', [
      /\b(apple|banana|orange|strawberry|grape|melon|berry|fruit)\b/i,
      /\b(tomato|lettuce|spinach|carrot|onion|potato|pepper|vegetable)\b/i,
      /\b(avocado|cucumber|broccoli|celery|kale|arugula)\b/i,
      /\b(organic|fresh|vine)\b.*\b(produce|fruit|vegetable)\b/i
    ]],
    ['Dairy & Eggs', [
      /\b(milk|cheese|yogurt|butter|cream|dairy)\b/i,
      /\b(egg|dozen|cheddar|mozzarella|swiss|american)\b/i,
      /\b(greek|whole|skim|2%|low fat)\b.*\b(milk|yogurt)\b/i
    ]],
    ['Meat & Seafood', [
      /\b(chicken|beef|pork|turkey|lamb|meat)\b/i,
      /\b(salmon|fish|shrimp|seafood|tuna|cod)\b/i,
      /\b(ground|breast|thigh|fillet|steak)\b/i
    ]],
    ['Pantry & Canned Goods', [
      /\b(pasta|rice|quinoa|grain|cereal|oats)\b/i,
      /\b(coffee|tea|sugar|flour|salt|spice)\b/i,
      /\b(canned|jar|bottle|sauce|oil|vinegar)\b/i,
      /\b(nuts|almonds|trail mix|granola|beans)\b/i
    ]],
    ['Bakery', [
      /\b(bread|bagel|muffin|roll|loaf|bakery)\b/i,
      /\b(whole grain|white|wheat|sourdough)\b/i
    ]],
    ['Beverages', [
      /\b(water|juice|soda|drink|beverage|sparkling)\b/i,
      /\b(coffee|tea|wine|beer|alcohol)\b/i,
      /\b(coconut|almond|oat)\b.*\bmilk\b/i
    ]],
    ['Frozen Foods', [
      /\b(frozen|ice cream|popsicle|pizza)\b/i,
      /\bfrozen\b.*\b(vegetable|fruit|meal|dinner)\b/i
    ]],
    ['Household Items', [
      /\b(paper towel|toilet paper|tissue|cleaning|detergent)\b/i,
      /\b(soap|shampoo|toothpaste|household)\b/i
    ]],
    ['Personal Care', [
      /\b(shampoo|conditioner|toothpaste|deodorant|skincare)\b/i,
      /\b(lotion|sunscreen|makeup|beauty|personal care)\b/i
    ]],
    ['Health & Wellness', [
      /\b(vitamin|supplement|medicine|health|wellness)\b/i,
      /\b(protein|fiber|probiotic|organic)\b/i
    ]]
  ]);

  private unitPatterns: Map<string, string> = new Map([
    // Weight-based
    ['banana', 'LB'],
    ['apple', 'LB'],
    ['orange', 'LB'],
    ['grape', 'LB'],
    ['potato', 'LB'],
    ['onion', 'LB'],
    ['carrot', 'LB'],
    ['meat', 'LB'],
    ['chicken', 'LB'],
    ['beef', 'LB'],
    ['salmon', 'LB'],
    ['fish', 'LB'],

    // Count-based
    ['avocado', 'COUNT'],
    ['pepper', 'COUNT'],
    ['cucumber', 'COUNT'],
    ['tomato', 'COUNT'],

    // Container-based
    ['milk', 'GALLON'],
    ['juice', 'BOTTLE'],
    ['water', 'BOTTLE'],
    ['yogurt', 'CONTAINER'],
    ['cheese', 'PACK'],
    ['egg', 'DOZEN'],

    // Package-based
    ['bread', 'LOAF'],
    ['cereal', 'BOX'],
    ['pasta', 'BOX'],
    ['rice', 'BAG'],
    ['coffee', 'BAG'],
    ['tea', 'BOX'],

    // Household
    ['paper towel', 'ROLL'],
    ['toilet paper', 'ROLL'],
    ['soap', 'BOTTLE'],
    ['shampoo', 'BOTTLE'],
    ['detergent', 'BOTTLE']
  ]);

  // Clear expired cache entries
  private cleanCache(): void {
    const now = Date.now();
    Object.keys(this.cache).forEach(key => {
      if (now > this.cache[key].timestamp + this.cache[key].ttl) {
        delete this.cache[key];
      }
    });

    // If cache is still too large, remove oldest entries
    const entries = Object.entries(this.cache);
    if (entries.length > this.MAX_CACHE_SIZE) {
      entries
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .slice(0, entries.length - this.MAX_CACHE_SIZE)
        .forEach(([key]) => delete this.cache[key]);
    }
  }

  // Get categorization from cache or API
  async categorizeProduct(productName: string, quantity: number = 1, unit: string = 'COUNT'): Promise<AICategorization | null> {
    const normalizedName = productName.toLowerCase().trim();

    // Check cache first
    const cached = this.cache[normalizedName];
    if (cached && Date.now() < cached.timestamp + cached.ttl) {
      return cached.result;
    }

    try {
      const requestBody = {
        products: [{ productName, quantity, unit }]
      };

      const response = await fetch('/api/products/batch-categorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const results = await response.json();
        if (results && results.length > 0) {
          const result: AICategorization = {
            category: results[0].category.category,
            confidence: results[0].category.confidence,
            aisle: results[0].category.aisle,
            section: results[0].category.section,
            suggestedQuantity: results[0].normalized.suggestedQuantity,
            suggestedUnit: results[0].normalized.suggestedUnit,
            conversionReason: results[0].normalized.conversionReason
          };

          // Cache the result
          this.cache[normalizedName] = {
            result,
            timestamp: Date.now(),
            ttl: this.CACHE_TTL
          };

          // Clean cache periodically
          if (Math.random() < 0.1) { // 10% chance to clean cache
            this.cleanCache();
          }

          return result;
        }
      }
    } catch (error) {
      console.warn('AI categorization failed for:', productName, error);
        }

    return null;
  }

  // Submit user feedback for learning
  async submitCategoryFeedback(
    productName: string, 
    originalCategory: string, 
    correctedCategory: string,
    confidence: number = 1.0
  ): Promise<boolean> {
    try {
      const response = await fetch('/api/products/categorization-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          productName,
          originalCategory,
          correctedCategory,
          confidence
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Categorization feedback submitted:', result.message);
        
        // Invalidate cache for this item so it uses the new learning
        const normalizedName = productName.toLowerCase().trim();
        delete this.cache[normalizedName];
        
        return true;
      }
    } catch (error) {
      console.warn('Failed to submit categorization feedback:', error);
    }
    return false;
  }

  // Batch categorize multiple items efficiently
  async categorizeProducts(items: Array<{productName: string, quantity?: number, unit?: string}>): Promise<AICategorization[]> {
    const results: AICategorization[] = [];
    const uncachedItems: typeof items = [];
    const itemIndexMap: number[] = [];

    // Check cache for each item
    items.forEach((item, index) => {
      const normalizedName = item.productName.toLowerCase().trim();
      const cached = this.cache[normalizedName];

      if (cached && Date.now() < cached.timestamp + cached.ttl) {
        results[index] = cached.result;
      } else {
        uncachedItems.push(item);
        itemIndexMap.push(index);
      }
    });

    // Batch API call for uncached items
    if (uncachedItems.length > 0) {
      try {
        const response = await fetch('/api/products/batch-categorize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ products: uncachedItems })
        });

        if (response.ok) {
          const apiResults = await response.json();

          apiResults.forEach((apiResult: any, index: number) => {
            const originalIndex = itemIndexMap[index];
            const result: AICategorization = {
              category: apiResult.category.category,
              confidence: apiResult.category.confidence,
              aisle: apiResult.category.aisle,
              section: apiResult.category.section,
              suggestedQuantity: apiResult.normalized.suggestedQuantity,
              suggestedUnit: apiResult.normalized.suggestedUnit,
              conversionReason: apiResult.normalized.conversionReason
            };

            results[originalIndex] = result;

            // Cache the result
            const normalizedName = uncachedItems[index].productName.toLowerCase().trim();
            this.cache[normalizedName] = {
              result,
              timestamp: Date.now(),
              ttl: this.CACHE_TTL
            };
          });
        }
      } catch (error) {
        console.warn('Batch AI categorization failed:', error);
      }
    }

    return results;
  }

  // Enhanced quick categorization with research-based patterns and semantic understanding
  getQuickCategory(productName: string, quantity?: number, unit?: string): { category: string; confidence: number; suggestedUnit?: string; suggestedQuantity?: number } {
    const name = productName.toLowerCase().trim();

    // Check for household items first to prevent miscategorization
    if (/\b(toilet\s*paper|paper\s*towel|tissue|napkin)\b/i.test(name)) {
      return { 
        category: 'Household Items', 
        confidence: 0.95,
        suggestedQuantity: quantity,
        suggestedUnit: unit
      };
    }

    // Enhanced categorization patterns based on grocery industry research
    const categoryPatterns = [
      {
        category: 'Produce',
        confidence: 0.9,
        patterns: [
          // Fruits - comprehensive list with variations
          /\b(apple|banana|orange|grape|strawberr|blueberr|raspberr|blackberr|cranberr|peach|pear|plum|cherry|kiwi|mango|pineapple|watermelon|cantaloupe|honeydew|papaya|avocado|lemon|lime|grapefruit)\w*/i,
          // Vegetables - common and specialty
          /\b(tomato|onion|carrot|potato|sweet\s*potato|lettuce|spinach|kale|arugula|broccoli|cauliflower|cabbage|bell\s*pepper|red\s*bell\s*pepper|green\s*bell\s*pepper|yellow\s*bell\s*pepper|jalape[ñn]o|pepper|cucumber|zucchini|squash|eggplant|asparagus|celery|corn|mushroom|garlic|ginger|scallion|green\s*onion|shallot|leek)\w*/i,
          // Herbs and fresh seasonings
          /\b(basil|cilantro|parsley|dill|mint|rosemary|thyme|oregano|sage|chive)\w*/i,
          // Produce-specific descriptors
          /\b(fresh|organic|local|seasonal|ripe|bunch|head)\s+(fruit|vegetable|herb|green)\w*/i,
          // Specific produce items that might be missed
          /\b(red\s*bell\s*peppers?|green\s*bell\s*peppers?|yellow\s*bell\s*peppers?|avocados?)\b/i,
          // Common produce packaging terms
          /\b(bag\s+of|bunch\s+of|head\s+of|lb\s+of|pound\s+of).*(apple|banana|carrot|potato|lettuce|spinach|onion)\w*/i
        ]
      },
      {
        category: 'Dairy & Eggs',
        confidence: 0.9,
        patterns: [
          // Milk varieties
          /\b(milk|whole\s*milk|skim\s*milk|2%\s*milk|1%\s*milk|low\s*fat\s*milk|fat\s*free\s*milk|chocolate\s*milk|almond\s*milk|soy\s*milk|oat\s*milk|coconut\s*milk|rice\s*milk|lactose\s*free\s*milk)\w*/i,
          // Cheese varieties
          /\b(cheese|cheddar|mozzarella|swiss|american|provolone|gouda|brie|camembert|feta|goat\s*cheese|cream\s*cheese|cottage\s*cheese|ricotta|parmesan|romano|blue\s*cheese|string\s*cheese)\w*/i,
          // Dairy products
          /\b(yogurt|greek\s*yogurt|butter|margarine|sour\s*cream|heavy\s*cream|whipping\s*cream|half\s*and\s*half|buttermilk)\w*/i,
          // Eggs
          /\b(egg|eggs|dozen\s*egg|large\s*egg|extra\s*large\s*egg|organic\s*egg|free\s*range\s*egg|cage\s*free\s*egg|brown\s*egg|white\s*egg)\w*/i
        ]
      },
      {
        category: 'Meat & Seafood',
        confidence: 0.9,
        patterns: [
          // Beef cuts and products
          /\b(beef|ground\s*beef|steak|ribeye|sirloin|filet|tenderloin|chuck|brisket|roast|hamburger\s*meat)\w*/i,
          // Poultry
          /\b(chicken|turkey|duck|goose|cornish\s*hen|chicken\s*breast|chicken\s*thigh|chicken\s*wing|ground\s*chicken|ground\s*turkey|rotisserie\s*chicken)\w*/i,
          // Pork
          /\b(pork|ham|bacon|sausage|pork\s*chop|pork\s*loin|pork\s*shoulder|ground\s*pork|breakfast\s*sausage|italian\s*sausage)\w*/i,
          // Seafood
          /\b(fish|salmon|tuna|cod|halibut|tilapia|mahi\s*mahi|shrimp|crab|lobster|scallop|oyster|clam|mussel|catfish|trout|bass|snapper)\w*/i,
          // Deli meats
          /\b(deli\s*meat|lunch\s*meat|sliced\s*turkey|sliced\s*ham|salami|pepperoni|prosciutto|pastrami|roast\s*beef)\w*/i,
          // Meat descriptors
          /\b(fresh|frozen|organic|grass\s*fed|free\s*range|wild\s*caught|farm\s*raised|lean|boneless|bone\s*in)\s+(meat|beef|chicken|pork|fish|salmon|turkey)\w*/i
        ]
      },
      {
        category: 'Bakery',
        confidence: 0.9,
        patterns: [
          // Bread varieties
          /\b(bread|loaf|white\s*bread|wheat\s*bread|whole\s*grain\s*bread|sourdough|rye\s*bread|pumpernickel|bagel|english\s*muffin|pita|naan|tortilla|wrap)\w*/i,
          // Baked goods
          /\b(muffin|cupcake|cake|cookie|brownie|pastry|croissant|danish|donut|doughnut|pie|tart)\w*/i,
          // Bakery specific items
          /\b(dinner\s*roll|hamburger\s*bun|hot\s*dog\s*bun|sandwich\s*roll|pretzel|baguette|ciabatta)\w*/i
        ]
      },
      {
        category: 'Frozen Foods',
        confidence: 0.9,
        patterns: [
          // Frozen meals and entrees
          /\b(frozen|ice\s*cream|popsicle|frozen\s*pizza|frozen\s*dinner|frozen\s*entree|tv\s*dinner|lean\s*cuisine|stouffer|hot\s*pocket)\w*/i,
          // Frozen vegetables and fruits
          /\b(frozen\s*vegetable|frozen\s*fruit|frozen\s*berry|frozen\s*pea|frozen\s*corn|frozen\s*broccoli)\w*/i,
          // Frozen meat and seafood
          /\b(frozen\s*chicken|frozen\s*fish|frozen\s*shrimp|frozen\s*beef)\w*/i,
          // Ice cream and desserts
          /\b(sherbet|sorbet|frozen\s*yogurt|gelato|ice\s*cream\s*sandwich|ice\s*cream\s*bar)\w*/i
        ]
      },
      {
        category: 'Personal Care',
        confidence: 0.8,
        patterns: [
          // Hair care
          /\b(shampoo|conditioner|hair\s*gel|hair\s*spray|hair\s*oil|dry\s*shampoo|hair\s*mask)\w*/i,
          // Body care
          /\b(body\s*wash|soap|bar\s*soap|hand\s*soap|body\s*lotion|moisturizer|body\s*cream|sunscreen|deodorant|antiperspirant)\w*/i,
          // Oral care
          /\b(toothpaste|toothbrush|mouthwash|dental\s*floss|teeth\s*whitening)\w*/i,
          // Skincare
          /\b(face\s*wash|cleanser|toner|serum|face\s*cream|eye\s*cream|lip\s*balm|chapstick)\w*/i,
          // Feminine care
          /\b(pad|tampon|feminine\s*wash|feminine\s*care)\w*/i,
          // Men's care
          /\b(shaving\s*cream|razor|aftershave|beard\s*oil|men)\w*/i
        ]
      },
      {
        category: 'Household Items',
        confidence: 0.8,
        patterns: [
          // Cleaning supplies
          /\b(cleaner|all\s*purpose\s*cleaner|glass\s*cleaner|bathroom\s*cleaner|kitchen\s*cleaner|floor\s*cleaner|disinfectant|bleach|ammonia)\w*/i,
          // Laundry
          /\b(detergent|laundry\s*detergent|fabric\s*softener|dryer\s*sheet|stain\s*remover|bleach)\w*/i,
          // Paper products
          /\b(paper\s*towel|toilet\s*paper|tissue|napkin|paper\s*plate|paper\s*cup|aluminum\s*foil|plastic\s*wrap|parchment\s*paper)\w*/i,
          // Trash and storage
          /\b(trash\s*bag|garbage\s*bag|storage\s*bag|ziplock|tupperware|food\s*storage)\w*/i,
          // Dishware
          /\b(dish\s*soap|dishwasher\s*detergent|sponge|scrubber|dish\s*towel)\w*/i
        ]
      },
      {
        category: 'Pantry & Canned Goods',
        confidence: 0.7,
        patterns: [
          // Grains and starches
          /\b(rice|pasta|noodle|quinoa|bulgur|couscous|barley|oat|cereal|granola|oatmeal|grain|whole\s*grain)\w*/i,
          // Canned goods
          /\b(can|canned|tomato\s*sauce|marinara|pasta\s*sauce|soup|broth|stock|canned\s*bean|canned\s*corn|canned\s*tomato)\w*/i,
          // Baking supplies
          /\b(flour|sugar|brown\s*sugar|powdered\s*sugar|baking\s*powder|baking\s*soda|vanilla|salt|pepper|spice|seasoning)\w*/i,
          // Oils and vinegars
          /\b(oil|olive\s*oil|vegetable\s*oil|canola\s*oil|coconut\s*oil|vinegar|balsamic)\w*/i,
          // Condiments and sauces
          /\b(ketchup|mustard|mayonnaise|mayo|barbecue\s*sauce|soy\s*sauce|hot\s*sauce|salad\s*dressing|peanut\s*butter|jelly|jam)\w*/i,
          // Snacks
          /\b(chip|cracker|pretzel|nut|almond|peanut|cashew|walnut|granola\s*bar|protein\s*bar)\w*/i,
          // Specific grains and healthy pantry items
          /\b(quinoa|chia\s*seed|flax\s*seed|hemp\s*seed|ancient\s*grain)\w*/i,
          // Beverages (non-dairy)
          /\b(coffee|tea|soda|juice|water|sports\s*drink|energy\s*drink|sparkling\s*water|carbonated\s*water|seltzer|mineral\s*water|flavored\s*water)\w*/i
        ]
      }
    ];

    // Check for specific high-priority matches first - these should override any other patterns
    const specificMatches = [
      // Brand-specific snacks that should be in Pantry & Canned Goods
      { pattern: /\b(oreos?|oreo)\b/i, category: 'Pantry & Canned Goods', confidence: 0.98 },
      { pattern: /\b(chips\s*ahoy|chipsahoy)\b/i, category: 'Pantry & Canned Goods', confidence: 0.98 },
      { pattern: /\b(nutter\s*butter|nutterbutter)\b/i, category: 'Pantry & Canned Goods', confidence: 0.98 },
      { pattern: /\b(famous\s*amos|famousamos)\b/i, category: 'Pantry & Canned Goods', confidence: 0.98 },
      { pattern: /\b(pepperidge\s*farm|pepperidgefarm)\b/i, category: 'Pantry & Canned Goods', confidence: 0.98 },
      
      // Produce items
      { pattern: /\b(avocados?)\b/i, category: 'Produce', confidence: 0.98 },
      { pattern: /\b(red\s*bell\s*peppers?|green\s*bell\s*peppers?|yellow\s*bell\s*peppers?|bell\s*peppers?)\b/i, category: 'Produce', confidence: 0.98 },
      
      // Pantry staples
      { pattern: /\b(quinoa)\b/i, category: 'Pantry & Canned Goods', confidence: 0.98 },
      { pattern: /\b(pine\s*nuts?)\b/i, category: 'Pantry & Canned Goods', confidence: 0.98 },
      { pattern: /\b(chia\s*seeds?|flax\s*seeds?|hemp\s*seeds?)\b/i, category: 'Pantry & Canned Goods', confidence: 0.95 }
    ];

    for (const { pattern, category, confidence } of specificMatches) {
      if (pattern.test(name)) {
        console.log(`🎯 Specific pattern match: "${name}" -> "${category}" (confidence: ${confidence})`);
        return { 
          category, 
          confidence,
          suggestedQuantity: quantity,
          suggestedUnit: unit
        };
      }
    }

    // Score each category and find the best match
    let bestCategory = 'Generic';
    let bestConfidence = 0.2;
    let bestScore = 0;

    for (const { category, confidence, patterns } of categoryPatterns) {
      let score = 0;
      let matchedPatterns = 0;

      for (const pattern of patterns) {
        if (pattern.test(name)) {
          score += 1;
          matchedPatterns += 1;
        }
      }

      // Only consider it a match if at least one pattern matched
      if (score > 0) {
        // Boost confidence for multiple pattern matches
        const adjustedConfidence = confidence + (matchedPatterns > 1 ? 0.1 : 0);

        if (score > bestScore || (score === bestScore && adjustedConfidence > bestConfidence)) {
          bestScore = score;
          bestCategory = category;
          bestConfidence = Math.min(0.95, adjustedConfidence);
        }
      }
    }

    // If no patterns matched, use Generic category with low confidence
    if (bestScore === 0) {
      bestCategory = 'Generic';
      bestConfidence = 0.2;
    }

    // Apply count optimization suggestions
    const countOptimization = this.detectCountOptimization(bestCategory, name, quantity, unit);

    console.log(`Quick categorization for "${name}": category=${bestCategory}, originalUnit=${unit}, suggestedUnit=${countOptimization.suggestedUnit}`);

    return { 
      category: bestCategory, 
      confidence: bestConfidence,
      suggestedQuantity: countOptimization.suggestedQuantity || quantity,
      suggestedUnit: countOptimization.suggestedUnit || unit
    };
  }

  // Helper function to detect better units and quantities
  private detectCountOptimization(category: string, name: string, quantity?: number, unit?: string): { suggestedQuantity?: number; suggestedUnit?: string } {
    // Default to original values
    let suggestedQuantity = quantity;
    let suggestedUnit = unit;

    // Check for specific unit patterns
    for (const [pattern, unitSuggestion] of this.unitPatterns) {
      if (name.includes(pattern)) {
        suggestedUnit = unitSuggestion;
        console.log(`Unit pattern match: "${pattern}" in "${name}" suggests ${unitSuggestion}`);
        break;
      }
    }

    // Check for common unit indicators in the name
    if (!suggestedUnit || suggestedUnit === unit) {
      if (/\b(lb|pound|lbs)\b/i.test(name)) suggestedUnit = 'LB';
      else if (/\b(gallon|gal)\b/i.test(name)) suggestedUnit = 'GALLON';
      else if (/\b(dozen|doz)\b/i.test(name)) suggestedUnit = 'DOZEN';
      else if (/\b(bottle|btl)\b/i.test(name)) suggestedUnit = 'BOTTLE';
      else if (/\b(box|pkg|package)\b/i.test(name)) suggestedUnit = 'BOX';
      else if (/\b(bag|sack)\b/i.test(name)) suggestedUnit = 'BAG';
      else if (/\b(roll|rolls)\b/i.test(name)) suggestedUnit = 'ROLL';
      else if (/\b(pack|packs)\b/i.test(name)) suggestedUnit = 'PACK';
      else if (/\b(jar|jars)\b/i.test(name)) suggestedUnit = 'JAR';
      else if (/\b(can|cans)\b/i.test(name)) suggestedUnit = 'CAN';
    }

    // Category-specific optimizations
    if (category === 'Household Items') {
      if (name.includes('paper towel')) {
        suggestedUnit = 'COUNT';
        suggestedQuantity = Math.max(1, Math.min(quantity || 1, 6)); // 6-pack typical
      } else if (name.includes('toilet paper')) {
        suggestedUnit = 'COUNT';
        suggestedQuantity = Math.max(1, Math.min(quantity || 1, 12)); // 12-pack typical
      }
    }

    return { suggestedQuantity, suggestedUnit };
  }

  // Clear cache manually
  clearCache(): void {
    this.cache = {};
  }

  // Get cache statistics
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: Object.keys(this.cache).length,
      hitRate: 0 // Could be implemented with hit/miss counters
    };
  }
}

// Export singleton instance
export const aiCategorizationService = new AICategorationService();