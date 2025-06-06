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
          /\b(tomato|onion|carrot|potato|sweet\s*potato|lettuce|spinach|kale|arugula|broccoli|cauliflower|cabbage|bell\s*pepper|jalape[ñn]o|pepper|cucumber|zucchini|squash|eggplant|asparagus|celery|corn|mushroom|garlic|ginger|scallion|green\s*onion|shallot|leek)\w*/i,
          // Herbs and fresh seasonings
          /\b(basil|cilantro|parsley|dill|mint|rosemary|thyme|oregano|sage|chive)\w*/i,
          // Produce-specific descriptors
          /\b(fresh|organic|local|seasonal|ripe|bunch|head)\s+(fruit|vegetable|herb|green)\w*/i,
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
          /\b(rice|pasta|noodle|quinoa|bulgur|couscous|barley|oat|cereal|granola|oatmeal)\w*/i,
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
          // Beverages (non-dairy)
          /\b(coffee|tea|soda|juice|water|sports\s*drink|energy\s*drink|sparkling\s*water|carbonated\s*water|seltzer|mineral\s*water|flavored\s*water)\w*/i
        ]
      }
    ];

    // Score each category and find the best match
    let bestCategory = 'Pantry & Canned Goods';
    let bestConfidence = 0.3;
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

      // Boost confidence for multiple pattern matches
      const adjustedConfidence = confidence + (matchedPatterns > 1 ? 0.1 : 0);

      if (score > bestScore || (score === bestScore && adjustedConfidence > bestConfidence)) {
        bestScore = score;
        bestCategory = category;
        bestConfidence = Math.min(0.95, adjustedConfidence);
      }
    }

    // Handle special cases and edge cases
    if (bestScore === 0) {
      // Check for common misspellings or variations
      const commonMisspellings: Record<string, { category: string; confidence: number }> = {
        'tomatoe': { category: 'Produce', confidence: 0.8 },
        'potatoe': { category: 'Produce', confidence: 0.8 },
        'bannana': { category: 'Produce', confidence: 0.8 },
        'chiken': { category: 'Meat & Seafood', confidence: 0.8 },
        'beff': { category: 'Meat & Seafood', confidence: 0.8 },
        'bred': { category: 'Bakery', confidence: 0.8 },
      };

      for (const [misspelling, result] of Object.entries(commonMisspellings)) {
        if (name.includes(misspelling)) {
          return result;
        }
      }

      // Last resort: check for brand names that indicate category
      const brandCategories: Record<string, { category: string; confidence: number }> = {
        'dole': { category: 'Produce', confidence: 0.7 },
        'chiquita': { category: 'Produce', confidence: 0.7 },
        'tyson': { category: 'Meat & Seafood', confidence: 0.7 },
        'perdue': { category: 'Meat & Seafood', confidence: 0.7 },
        'wonder': { category: 'Bakery', confidence: 0.7 },
        'pepperidge': { category: 'Bakery', confidence: 0.7 },
        'tide': { category: 'Household Items', confidence: 0.7 },
        'dawn': { category: 'Household Items', confidence: 0.7 },
        'pantene': { category: 'Personal Care', confidence: 0.7 },
        'dove': { category: 'Personal Care', confidence: 0.7 },
        'kraft': { category: 'Pantry & Canned Goods', confidence: 0.7 },
        'hunts': { category: 'Pantry & Canned Goods', confidence: 0.7 },
      };

      for (const [brand, result] of Object.entries(brandCategories)) {
        if (name.includes(brand)) {
          return result;
        }
      }
    }

    // Apply count optimization suggestions
    const countOptimization = detectCountOptimization(bestCategory, name, quantity, unit);

    console.log(`Quick categorization for "${name}": category=${bestCategory}, originalUnit=${unit}, suggestedUnit=${countOptimization.suggestedUnit}`);

    return { 
      category: bestCategory, 
      confidence: bestConfidence,
      suggestedQuantity: countOptimization.suggestedQuantity || quantity,
      suggestedUnit: countOptimization.suggestedUnit || unit
    };
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

// Helper function to detect better units and quantities
function detectCountOptimization(category: string, name: string, quantity?: number, unit?: string): { suggestedQuantity?: number; suggestedUnit?: string } {
  // Default to original values
  let suggestedQuantity = quantity;
  let suggestedUnit = unit;

  // More comprehensive unit detection patterns
  const unitPatterns = [
    // Liquids and bottles
    { patterns: ['olive oil', 'vegetable oil', 'canola oil', 'coconut oil', 'oil', 'vinegar', 'honey', 'syrup', 'vanilla', 'extract', 'shampoo', 'conditioner'], unit: 'BOTTLE' },
    // Canned goods
    { patterns: ['beans', 'black beans', 'kidney beans', 'pinto beans', 'navy beans', 'chickpeas', 'garbanzo beans', 'diced tomato', 'crushed tomato', 'tomato sauce', 'marinara', 'coconut milk', 'broth', 'stock', 'corn', 'peas', 'canned'], unit: 'CAN' },
    // Jars
    { patterns: ['jam', 'jelly', 'peanut butter', 'almond butter', 'salsa', 'pickles', 'pasta sauce', 'marinara sauce', 'alfredo'], unit: 'JAR' },
    // Bags
    { patterns: ['rice', 'brown rice', 'white rice', 'quinoa', 'flour', 'sugar', 'spinach', 'baby spinach', 'lettuce', 'salad mix', 'frozen'], unit: 'BAG' },
    // Boxes
    { patterns: ['cereal', 'crackers', 'pasta', 'baking soda', 'baking powder', 'salt', 'tea', 'granola bars'], unit: 'BOX' },
    // Loaves
    { patterns: ['bread', 'whole wheat bread', 'white bread', 'sourdough', 'loaf'], unit: 'LOAF' },
    // Gallons for milk
    { patterns: ['milk', 'almond milk', 'soy milk', 'oat milk'], unit: 'GALLON' },
    // Dozens for eggs
    { patterns: ['egg', 'eggs', 'free-range eggs', 'organic eggs'], unit: 'DOZEN' },
    // Pounds for produce and meat
    { patterns: ['banana', 'apple', 'potato', 'onion', 'yellow onion', 'red onion', 'tomato', 'roma tomato', 'carrot', 'chicken', 'chicken breast', 'beef', 'ground turkey', 'ground beef', 'salmon', 'strawberries'], unit: 'LB' },
    // Containers for dairy and others
    { patterns: ['yogurt', 'greek yogurt', 'cottage cheese', 'sour cream', 'oatmeal', 'oats', 'chicken broth', 'vegetable broth'], unit: 'CONTAINER' },
    // Blocks for cheese
    { patterns: ['cheddar cheese', 'swiss cheese', 'mozzarella cheese', 'cheese block', 'butter'], unit: 'BLOCK' },
    // Count items (vegetables, individual items)
    { patterns: ['avocado', 'bell pepper', 'red bell pepper', 'green bell pepper', 'cucumber', 'broccoli', 'cauliflower', 'lime', 'lemon', 'garlic powder', 'black pepper', 'sea salt', 'toothpaste', 'deodorant'], unit: 'COUNT' },
    // Bottles for water and beverages
    { patterns: ['sparkling water', 'bottled water', 'water bottle', 'soda', 'juice', 'apple juice', 'orange juice'], unit: 'BOTTLE' },
    // Rolls for paper products
    { patterns: ['paper towel', 'toilet paper', 'paper towels'], unit: 'ROLL' }
  ];

  // Find the best matching unit pattern
  for (const pattern of unitPatterns) {
    for (const keyword of pattern.patterns) {
      if (name.includes(keyword)) {
        suggestedUnit = pattern.unit;
        console.log(`Unit pattern match: "${keyword}" in "${name}" suggests ${pattern.unit}`);
        break;
      }
    }
    if (suggestedUnit !== unit) break;
  }

  // Pantry items that should use specific units
  if (category === 'Pantry & Canned Goods') {
    if (name.includes('rice') || name.includes('quinoa') || name.includes('oatmeal') || name.includes('flour')) {
      suggestedUnit = 'BAG';
    } else if (name.includes('honey') || name.includes('syrup') || name.includes('oil') || name.includes('vinegar')) {
      suggestedUnit = 'BOTTLE';
    } else if (name.includes('sauce') || name.includes('jam') || name.includes('jelly') || (name.includes('butter') && name.includes('peanut'))) {
      suggestedUnit = 'JAR';
    } else if (name.includes('baking soda') || name.includes('baking powder') || name.includes('salt') || name.includes('sugar')) {
      suggestedUnit = 'BOX';
    } else if (name.includes('beans') || name.includes('diced tomato') || name.includes('coconut milk') || name.includes('pasta sauce')) {
      suggestedUnit = 'CAN';
    }
  }

  // Household items
  if (category === 'Household Items') {
    if (name.includes('paper towel')) {
      suggestedUnit = 'COUNT';
      suggestedQuantity = Math.max(1, Math.min(quantity || 1, 6)); // 6-pack typical
    } else if (name.includes('toilet paper')) {
      suggestedUnit = 'COUNT';
      suggestedQuantity = Math.max(1, Math.min(quantity || 1, 12)); // 12-pack typical
    }
  }

  // Personal care
  if (category === 'Personal Care') {
    if (name.includes('shampoo') || name.includes('conditioner') || name.includes('body wash')) {
      suggestedUnit = 'BOTTLE';
    } else if (name.includes('toothpaste') || name.includes('deodorant')) {
      suggestedUnit = 'COUNT';
    }
  }

  // Produce items that should be by weight
  if (category === 'Produce') {
    if (name.includes('banana') || name.includes('apple') || name.includes('potato') || name.includes('onion') || name.includes('carrot') || name.includes('tomato')) {
      if (unit === 'COUNT' && (quantity || 1) > 3) {
        suggestedUnit = 'LB';
        suggestedQuantity = Math.max(1, Math.round((quantity || 1) * 0.3)); // Rough weight conversion
      }
    }
  }

  // Dairy items
  if (category === 'Dairy & Eggs') {
    if (name.includes('milk')) {
      suggestedUnit = 'GALLON';
      suggestedQuantity = 1;
    } else if (name.includes('yogurt')) {
      suggestedUnit = 'CONTAINER';
    } else if (name.includes('cheese') && !name.includes('cream')) {
      suggestedUnit = 'BLOCK';
    }
  }

  // Bakery items
  if (category === 'Bakery') {
    if (name.includes('bread')) {
      suggestedUnit = 'LOAF';
      suggestedQuantity = 1;
    }
  }

  return { suggestedQuantity, suggestedUnit };
}

export const aiCategorizationService = new AICategorationService();
// AI-powered categorization service for better product matching
export interface CategoryResult {
  category: string;
  confidence: number;
  suggestedUnit?: string;
}

class AICategorization {
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

  /**
   * Get a quick category for a product name using pattern matching
   */
  getQuickCategory(productName: string): CategoryResult {
    const normalizedName = productName.toLowerCase().trim();
    
    console.log(`Quick categorization for "${productName}": category=${this.getCategoryByPatterns(normalizedName)}, originalUnit=undefined, suggestedUnit=${this.getSuggestedUnit(normalizedName)}`);
    
    // Check unit patterns first for better logging
    const suggestedUnit = this.getSuggestedUnit(normalizedName);
    
    return {
      category: this.getCategoryByPatterns(normalizedName),
      confidence: 0.8,
      suggestedUnit
    };
  }

  private getCategoryByPatterns(productName: string): string {
    const normalizedName = productName.toLowerCase();
    
    // Score each category based on pattern matches
    const categoryScores: Map<string, number> = new Map();
    
    for (const [category, patterns] of this.categoryPatterns) {
      let score = 0;
      for (const pattern of patterns) {
        if (pattern.test(normalizedName)) {
          score += 1;
          // Boost score for exact word matches
          if (normalizedName.includes(pattern.source.replace(/\\b|\(|\)|\|/g, '').toLowerCase())) {
            score += 0.5;
          }
        }
      }
      if (score > 0) {
        categoryScores.set(category, score);
      }
    }
    
    // Return the category with the highest score
    if (categoryScores.size > 0) {
      const bestCategory = Array.from(categoryScores.entries())
        .sort(([,a], [,b]) => b - a)[0][0];
      return bestCategory;
    }
    
    // Fallback to Pantry & Canned Goods for unmatched items
    return 'Pantry & Canned Goods';
  }

  private getSuggestedUnit(productName: string): string | undefined {
    const normalizedName = productName.toLowerCase();
    
    // Check for specific unit patterns
    for (const [pattern, unit] of this.unitPatterns) {
      if (normalizedName.includes(pattern)) {
        console.log(`Unit pattern match: "${pattern}" in "${productName}" suggests ${unit}`);
        return unit;
      }
    }
    
    // Check for common unit indicators in the name
    if (/\b(lb|pound|lbs)\b/i.test(normalizedName)) return 'LB';
    if (/\b(gallon|gal)\b/i.test(normalizedName)) return 'GALLON';
    if (/\b(dozen|doz)\b/i.test(normalizedName)) return 'DOZEN';
    if (/\b(bottle|btl)\b/i.test(normalizedName)) return 'BOTTLE';
    if (/\b(box|pkg|package)\b/i.test(normalizedName)) return 'BOX';
    if (/\b(bag|sack)\b/i.test(normalizedName)) return 'BAG';
    if (/\b(roll|rolls)\b/i.test(normalizedName)) return 'ROLL';
    if (/\b(pack|packs)\b/i.test(normalizedName)) return 'PACK';
    if (/\b(jar|jars)\b/i.test(normalizedName)) return 'JAR';
    if (/\b(can|cans)\b/i.test(normalizedName)) return 'CAN';
    
    return undefined;
  }

  /**
   * Categorize multiple products efficiently
   */
  categorizeProducts(productNames: string[]): Map<string, CategoryResult> {
    const results = new Map<string, CategoryResult>();
    
    for (const productName of productNames) {
      results.set(productName, this.getQuickCategory(productName));
    }
    
    return results;
  }
}

// Export singleton instance
export const aiCategorizationService = new AICategorization();
