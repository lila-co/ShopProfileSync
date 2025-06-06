import OpenAI from "openai";

// Company logo map - publicly available logos
const companyLogos: Record<string, string> = {
  "walmart": "https://corporate.walmart.com/content/dam/corporate/images/logos/walmart/walmart-logo-blue.svg",
  "target": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Target_Corporation_logo_%28vector%29.svg/1200px-Target_Corporation_logo_%28vector%29.svg.png",
  "kroger": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Kroger_logo.svg/2560px-Kroger_logo.svg.png",
  "costco": "https://upload.wikimedia.org/wikipedia/commons/5/59/Costco_Wholesale_logo_2010-10-26.svg",
  "amazon": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/2560px-Amazon_logo.svg.png",
  "wholeFoods": "https://upload.wikimedia.org/wikipedia/commons/a/a2/Whole_Foods_Market_201x_logo.svg",
  "traderjoes": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Trader_Joe%27s_logo_%282014–present%29.svg/640px-Trader_Joe%27s_logo_%282014–present%29.svg.png",
  "aldi": "https://upload.wikimedia.org/wikipedia/commons/b/b5/Aldi_Nord_201x_logo.svg",
  "publix": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Publix_logo.svg/1280px-Publix_logo.svg.png",
  "safeway": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Safeway_Logo.svg/1200px-Safeway_Logo.svg.png"
};

// Enhanced grocery item images with more specific product matches
const commonItemImages: Record<string, string> = {
  // Produce
  "apple": "https://images.unsplash.com/photo-1570913149827-d2ac84ab3f9a?q=80&w=200",
  "apples": "https://images.unsplash.com/photo-1570913149827-d2ac84ab3f9a?q=80&w=200",
  "organic apples": "https://images.unsplash.com/photo-1570913149827-d2ac84ab3f9a?q=80&w=200",
  "banana": "https://images.unsplash.com/photo-1528825871115-3581a5387919?q=80&w=200",
  "bananas": "https://images.unsplash.com/photo-1528825871115-3581a5387919?q=80&w=200",
  "organic bananas": "https://images.unsplash.com/photo-1528825871115-3581a5387919?q=80&w=200",
  "orange": "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab12?q=80&w=200",
  "strawberry": "https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?q=80&w=200",
  "tomato": "https://images.unsplash.com/photo-1607305387299-a3d9611cd469?q=80&w=200",
  "lettuce": "https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?q=80&w=200",
  "potato": "https://images.unsplash.com/photo-1518977676601-b53f82aba655?q=80&w=200",
  "onion": "https://images.unsplash.com/photo-1618512496248-a07c50deed9d?q=80&w=200",
  "carrot": "https://images.unsplash.com/photo-1598170845053-a6b8f347aabb?q=80&w=200",
  "cucumber": "https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?q=80&w=200",
  "bell pepper": "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?q=80&w=200",
  "avocado": "https://images.unsplash.com/photo-1583071299210-c6c113f4ac91?q=80&w=200",
  "spinach": "https://images.unsplash.com/photo-1576045057995-568f588f82fb?q=80&w=200",
  
  // Dairy & Eggs
  "milk": "https://images.unsplash.com/photo-1563636619-e9143da7973b?q=80&w=200",
  "milk (gallon)": "https://images.unsplash.com/photo-1563636619-e9143da7973b?q=80&w=200",
  "egg": "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?q=80&w=200",
  "eggs": "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?q=80&w=200",
  "eggs (dozen)": "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?q=80&w=200",
  "dozen eggs": "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?q=80&w=200",
  "cheese": "https://images.unsplash.com/photo-1625084561224-01dae12cfab1?q=80&w=200",
  "yogurt": "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?q=80&w=200",
  "greek yogurt": "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?q=80&w=200",
  "butter": "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?q=80&w=200",
  "cheddar cheese": "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?q=80&w=200",
  
  // Meat & Seafood
  "chicken": "https://images.unsplash.com/photo-1604503468506-a8da13d82791?q=80&w=200",
  "chicken breast": "https://images.unsplash.com/photo-1604503468506-a8da13d82791?q=80&w=200",
  "beef": "https://images.unsplash.com/photo-1603048588667-c24e94e37bf1?q=80&w=200",
  "ground turkey": "https://images.unsplash.com/photo-1607623488057-2bc380e4b816?q=80&w=200",
  "fish": "https://images.unsplash.com/photo-1580554530778-ca36943938b2?q=80&w=200",
  "salmon": "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?q=80&w=200",
  "salmon fillet": "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?q=80&w=200",
  "salmon fillet (2lb)": "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?q=80&w=200",
  
  // Bakery
  "bread": "https://images.unsplash.com/photo-1549931319-a545dcf3bc7c?q=80&w=200",
  "bagel": "https://images.unsplash.com/photo-1585445490387-dcf7f9512526?q=80&w=200",
  "muffin": "https://images.unsplash.com/photo-1604882406495-40baa5bf77af?q=80&w=200",
  "whole grain bread": "https://images.unsplash.com/photo-1585478259715-876acc5be8eb?q=80&w=200",
  
  // Pantry & Canned Goods
  "pasta": "https://images.unsplash.com/photo-1551462147-ff29053bfc14?q=80&w=200",
  "organic pasta": "https://images.unsplash.com/photo-1551462147-ff29053bfc14?q=80&w=200",
  "rice": "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?q=80&w=200",
  "bulk rice": "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?q=80&w=200",
  "bulk rice (20lb)": "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?q=80&w=200",
  "quinoa": "https://images.unsplash.com/photo-1508737027454-e6454ef45afd?q=80&w=200",
  "cereal": "https://images.unsplash.com/photo-1521483451569-e33803c0330c?q=80&w=200",
  "whole grain cereal": "https://images.unsplash.com/photo-1574113270110-89b0e9ca5b46?q=80&w=200",
  "sugar": "https://images.unsplash.com/photo-1581268497089-7a975fb491a3?q=80&w=200",
  "flour": "https://images.unsplash.com/photo-1627228684601-87e0364eb159?q=80&w=200",
  "olive oil": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?q=80&w=200",
  "trail mix": "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?q=80&w=200",
  "nuts": "https://images.unsplash.com/photo-1508747703725-719777637510?q=80&w=200",
  "almonds": "https://images.unsplash.com/photo-1608797178974-15b35a64ede3?q=80&w=200",
  "almond butter": "https://images.unsplash.com/photo-1571113299013-ddb11e58f2b4?q=80&w=200",
  
  // Beverages
  "water": "https://images.unsplash.com/photo-1523362628745-0c100150b504?q=80&w=200",
  "sparkling water": "https://images.unsplash.com/photo-1570197788417-0e82375c9371?q=80&w=200",
  "juice": "https://images.unsplash.com/photo-1600271886742-f049cd451bba?q=80&w=200",
  "soda": "https://images.unsplash.com/photo-1581636625402-29b2a704ef13?q=80&w=200",
  "coffee": "https://images.unsplash.com/photo-1559827260-dc66d52bef19?q=80&w=200",
  "ground coffee": "https://images.unsplash.com/photo-1559827260-dc66d52bef19?q=80&w=200",
  "coffee beans": "https://images.unsplash.com/photo-1559056961-84608fae629c?q=80&w=200",
  "instant coffee": "https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=200",
  "tea": "https://images.unsplash.com/photo-1576092768241-dec231879fc3?q=80&w=200",
  "wine": "https://images.unsplash.com/photo-1510972527921-ce03766a1cf1?q=80&w=200",
  "organic wine": "https://images.unsplash.com/photo-1510972527921-ce03766a1cf1?q=80&w=200",
  
  // Household Items
  "soap": "https://images.unsplash.com/photo-1584305574647-0cc949a2bb9f?q=80&w=200",
  "detergent": "https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?q=80&w=200",
  "paper towels": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=200",
  "paper towel": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=200",
  "toilet paper": "https://images.unsplash.com/photo-1584462278633-cef4c9d0a99f?q=80&w=200",
  "toilet paper (24 pack)": "https://images.unsplash.com/photo-1584462278633-cef4c9d0a99f?q=80&w=200",
  "paper": "https://images.unsplash.com/photo-1597484661643-2f5fef640dd1?q=80&w=200",
  
  // Frozen Foods
  "frozen vegetables": "https://images.unsplash.com/photo-1590779033100-9f60a05a013d?q=80&w=200",
  "frozen pizza": "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?q=80&w=200",
  "ice cream": "https://images.unsplash.com/photo-1563805042-7684c019e1cb?q=80&w=200",
  
  // Personal Care
  "shampoo": "https://images.unsplash.com/photo-1631729371254-42c2892f0e6e?q=80&w=200",
  "toothpaste": "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?q=80&w=200",
  
  // Health & Wellness
  "vitamin": "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?q=80&w=200",
  "vitamin c": "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?q=80&w=200",
  "vitamins": "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?q=80&w=200"
};

/**
 * Get a company logo URL based on company name
 * @param companyName The name of the company
 * @returns URL to the company logo or undefined if not found
 */
export function getCompanyLogo(companyName: string): string | undefined {
  if (!companyName) return undefined;
  
  // Normalize company name for matching
  const normalizedName = companyName.toLowerCase().replace(/\s+/g, '');
  
  // Try to find an exact match
  if (companyLogos[normalizedName]) {
    return companyLogos[normalizedName];
  }
  
  // Try to find a partial match
  const partialMatch = Object.keys(companyLogos).find(key => 
    normalizedName.includes(key) || key.includes(normalizedName)
  );
  
  return partialMatch ? companyLogos[partialMatch] : undefined;
}

/**
 * Get an image URL for a grocery item using enhanced AI-based matching
 * @param itemName The name of the item
 * @param category Optional category hint for better matching
 * @returns URL to an image of the item or undefined if not found
 */
export function getItemImage(itemName: string, category?: string): string | undefined {
  if (!itemName) return undefined;
  
  // Normalize item name for matching
  const normalizedName = itemName.toLowerCase();
  
  // Enhanced product matching patterns with more specific keywords
  const enhancedMatching: Record<string, string[]> = {
    // Coffee products
    "coffee": ["coffee", "espresso", "latte", "cappuccino", "mocha", "americano"],
    "ground coffee": ["ground", "grind", "medium roast", "dark roast", "light roast", "arabica", "robusta"],
    "instant coffee": ["instant", "freeze dried", "soluble"],
    
    // Cereals
    "cereal": ["cheerios", "cornflakes", "granola", "muesli", "oats", "bran", "wheat", "rice krispies"],
    
    // Trail mix and snacks
    "nuts": ["trail mix", "mixed nuts", "almonds", "cashews", "peanuts", "walnuts", "pistachios"],
    
    // Household items
    "paper towels": ["bounty", "scott", "charmin", "kleenex", "tissue"],
    "toilet paper": ["bathroom tissue", "tp", "roll"],
    "detergent": ["tide", "gain", "persil", "arm & hammer", "cleaning"],
    
    // Produce items
    "banana": ["chiquita", "dole", "organic banana", "plantain"],
    "apple": ["gala", "granny smith", "red delicious", "honeycrisp", "fuji"],
    "tomato": ["roma", "cherry", "beefsteak", "vine ripened"],
    
    // Dairy
    "milk": ["whole", "2%", "skim", "almond", "oat", "soy", "lactaid"],
    "cheese": ["cheddar", "mozzarella", "swiss", "american", "provolone"],
    
    // Meat
    "chicken": ["breast", "thigh", "wing", "drumstick", "rotisserie"],
    "beef": ["ground", "steak", "roast", "hamburger"],
    
    // Beverages
    "water": ["spring", "purified", "distilled", "sparkling", "mineral"],
    "juice": ["apple", "orange", "cranberry", "grape", "tropical"]
  };
  
  // Try exact match first
  if (commonItemImages[normalizedName]) {
    return commonItemImages[normalizedName];
  }
  
  // Enhanced matching with score-based ranking
  const matches: Array<{ key: string; url: string; score: number; matchType: string }> = [];
  
  // Check enhanced patterns first
  for (const [baseProduct, patterns] of Object.entries(enhancedMatching)) {
    for (const pattern of patterns) {
      if (normalizedName.includes(pattern)) {
        if (commonItemImages[baseProduct]) {
          matches.push({
            key: baseProduct,
            url: commonItemImages[baseProduct],
            score: pattern.length + (normalizedName === pattern ? 50 : 0), // Boost exact matches
            matchType: 'enhanced'
          });
        }
      }
    }
  }
  
  // Fallback to basic keyword matching
  for (const [key, url] of Object.entries(commonItemImages)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      matches.push({
        key,
        url,
        score: key.length,
        matchType: 'basic'
      });
    }
  }
  
  // Sort by score (enhanced matches get priority, then by length)
  matches.sort((a, b) => {
    if (a.matchType === 'enhanced' && b.matchType !== 'enhanced') return -1;
    if (b.matchType === 'enhanced' && a.matchType !== 'enhanced') return 1;
    return b.score - a.score;
  });
  
  if (matches.length > 0) {
    return matches[0].url;
  }
  
  // Category-based fallback with enhanced logic
  const categoryMapping = [
    // Food categories
    { 
      terms: ['coffee', 'espresso', 'latte', 'cappuccino', 'mocha', 'instant coffee', 'ground coffee', 'coffee beans'],
      image: commonItemImages.coffee || commonItemImages["ground coffee"],
      category: 'Beverages'
    },
    { 
      terms: ['cereal', 'granola', 'oatmeal', 'muesli', 'cornflakes', 'cheerios', 'bran', 'wheat'],
      image: commonItemImages.cereal,
      category: 'Pantry & Canned Goods'
    },
    { 
      terms: ['trail mix', 'nuts', 'almonds', 'cashews', 'peanuts', 'mixed nuts', 'nut mix'],
      image: "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?q=80&w=200",
      category: 'Pantry & Canned Goods'
    },
    { 
      terms: ['fruit', 'apple', 'orange', 'banana', 'berry', 'melon', 'grape', 'strawberry', 'blueberry'],
      image: commonItemImages.apple,
      category: 'Produce'
    },
    { 
      terms: ['vegetable', 'carrot', 'broccoli', 'cucumber', 'pepper', 'lettuce', 'spinach', 'onion'],
      image: commonItemImages.tomato,
      category: 'Produce'
    },
    { 
      terms: ['meat', 'steak', 'pork', 'lamb', 'chicken', 'turkey', 'beef', 'ground turkey'],
      image: commonItemImages.chicken,
      category: 'Meat & Seafood'
    },
    { 
      terms: ['fish', 'seafood', 'shrimp', 'salmon', 'tuna', 'cod', 'tilapia'],
      image: commonItemImages.fish,
      category: 'Meat & Seafood'
    },
    { 
      terms: ['dairy', 'milk', 'cheese', 'yogurt', 'cream', 'butter', 'eggs'],
      image: commonItemImages.milk,
      category: 'Dairy & Eggs'
    },
    { 
      terms: ['bread', 'bakery', 'muffin', 'bagel', 'roll', 'loaf', 'sandwich'],
      image: commonItemImages.bread,
      category: 'Bakery'
    },
    { 
      terms: ['pasta', 'noodle', 'spaghetti', 'macaroni', 'linguine', 'penne'],
      image: commonItemImages.pasta,
      category: 'Pantry & Canned Goods'
    },
    { 
      terms: ['rice', 'quinoa', 'grain', 'brown rice', 'wild rice', 'jasmine'],
      image: commonItemImages.rice,
      category: 'Pantry & Canned Goods'
    },
    { 
      terms: ['drink', 'beverage', 'juice', 'water', 'soda', 'sparkling', 'tea'],
      image: commonItemImages.water,
      category: 'Beverages'
    },
    { 
      terms: ['cleaning', 'soap', 'detergent', 'paper towel', 'toilet paper', 'cleaner'],
      image: commonItemImages.soap,
      category: 'Household Items'
    }
  ];
  
  // Try category matching with priority for category hint
  for (const categoryItem of categoryMapping) {
    // Give priority if category matches the hint
    const categoryMatch = category && categoryItem.category === category;
    const termMatch = categoryItem.terms.some(term => normalizedName.includes(term));
    
    if (termMatch && (categoryMatch || !category)) {
      return categoryItem.image;
    }
  }
  
  // If we have a category hint but no specific match, try category fallback
  if (category) {
    const categoryFallbacks: Record<string, string> = {
      'Produce': commonItemImages.apple,
      'Dairy & Eggs': commonItemImages.milk,
      'Meat & Seafood': commonItemImages.chicken,
      'Pantry & Canned Goods': commonItemImages.cereal,
      'Bakery': commonItemImages.bread,
      'Household Items': commonItemImages.soap,
      'Personal Care': commonItemImages.soap,
      'Beverages': commonItemImages.water,
      'Frozen Foods': "https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=200"
    };
    
    if (categoryFallbacks[category]) {
      return categoryFallbacks[category];
    }
  }
  
  return undefined;
}

// OpenAI API client
let openaiClient: OpenAI | null = null;

/**
 * Initialize the OpenAI client if needed
 */
function initOpenAI() {
  if (!openaiClient && process.env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || ""
    });
  }
  return openaiClient;
}

/**
 * Generate an AI image for a product using OpenAI's DALL-E
 * @param productName The name of the product
 * @returns URL to the generated image or undefined if generation failed
 */
export async function generateAIProductImage(productName: string): Promise<string | undefined> {
  try {
    const openai = initOpenAI();
    if (!openai) {
      console.log("OpenAI client not initialized - missing API key");
      return undefined;
    }
    
    const prompt = `A photorealistic image of ${productName} on a clean white background, product photography style, high resolution`;
    
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });
    
    return response.data?.[0]?.url;
  } catch (error) {
    console.error("Error generating AI image:", error);
    return undefined;
  }
}

/**
 * Get the best available image for a product
 * First tries the provided image URL, then the common items database with category awareness,
 * and finally attempts to generate an AI image if OpenAI is configured
 * 
 * @param productName The name of the product
 * @param providedImageUrl Optional image URL provided by a retailer API
 * @param category Optional category hint for better image matching
 * @param useAI Whether to use AI image generation as a fallback
 * @returns Promise resolving to the best available image URL
 */
export async function getBestProductImage(
  productName: string, 
  providedImageUrl?: string,
  category?: string,
  useAI: boolean = false
): Promise<string | undefined> {
  // If a URL is provided and it's not a generic placeholder, validate and use it
  if (providedImageUrl && !isGenericPlaceholder(providedImageUrl) && isValidImageUrl(providedImageUrl)) {
    return providedImageUrl;
  }
  
  // Try to find a matching common item image with category awareness
  const commonImage = getItemImage(productName, category);
  if (commonImage) {
    return commonImage;
  }
  
  // If AI generation is enabled and we have the necessary setup, try to generate an image
  if (useAI) {
    const aiImage = await generateAIProductImage(productName);
    if (aiImage) return aiImage;
  }
  
  // Return a category-based fallback image
  return getCategoryFallbackImage(category);
}

/**
 * Check if an image URL is a generic placeholder that should be replaced
 * @param imageUrl The image URL to check
 * @returns true if the image is a generic placeholder
 */
function isGenericPlaceholder(imageUrl: string): boolean {
  const genericPatterns = [
    'placeholder',
    'default',
    'no-image',
    'coming-soon',
    'unavailable',
    'shop-front',
    'store-front',
    'open-shop'
  ];
  
  const urlLower = imageUrl.toLowerCase();
  return genericPatterns.some(pattern => urlLower.includes(pattern));
}

/**
 * Check if an image URL is valid and accessible
 * @param imageUrl The image URL to check
 * @returns true if the URL appears to be a valid image URL
 */
function isValidImageUrl(imageUrl: string): boolean {
  try {
    const url = new URL(imageUrl);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Get a fallback image based on category
 * @param category The product category
 * @returns A reliable fallback image URL
 */
function getCategoryFallbackImage(category?: string): string {
  const categoryFallbacks: Record<string, string> = {
    'Produce': 'https://images.unsplash.com/photo-1570913149827-d2ac84ab3f9a?q=80&w=200',
    'Dairy & Eggs': 'https://images.unsplash.com/photo-1563636619-e9143da7973b?q=80&w=200',
    'Meat & Seafood': 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?q=80&w=200',
    'Pantry & Canned Goods': 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?q=80&w=200',
    'Bakery': 'https://images.unsplash.com/photo-1549931319-a545dcf3bc7c?q=80&w=200',
    'Household Items': 'https://images.unsplash.com/photo-1584305574647-0cc949a2bb9f?q=80&w=200',
    'Personal Care': 'https://images.unsplash.com/photo-1631729371254-42c2892f0e6e?q=80&w=200',
    'Beverages': 'https://images.unsplash.com/photo-1523362628745-0c100150b504?q=80&w=200',
    'Frozen Foods': 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?q=80&w=200'
  };
  
  if (category && categoryFallbacks[category]) {
    return categoryFallbacks[category];
  }
  
  // Default grocery store image
  return 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop';
}