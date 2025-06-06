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

// Common grocery item images for fallback
const commonItemImages: Record<string, string> = {
  // Produce
  "apple": "https://images.unsplash.com/photo-1570913149827-d2ac84ab3f9a?q=80&w=200",
  "banana": "https://images.unsplash.com/photo-1528825871115-3581a5387919?q=80&w=200",
  "orange": "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab12?q=80&w=200",
  "strawberry": "https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?q=80&w=200",
  "tomato": "https://images.unsplash.com/photo-1607305387299-a3d9611cd469?q=80&w=200",
  "lettuce": "https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?q=80&w=200",
  "potato": "https://images.unsplash.com/photo-1518977676601-b53f82aba655?q=80&w=200",
  "onion": "https://images.unsplash.com/photo-1618512496248-a07c50deed9d?q=80&w=200",
  "carrot": "https://images.unsplash.com/photo-1598170845053-a6b8f347aabb?q=80&w=200",
  
  // Dairy
  "milk": "https://images.unsplash.com/photo-1563636619-e9143da7973b?q=80&w=200",
  "egg": "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?q=80&w=200",
  "cheese": "https://images.unsplash.com/photo-1625084561224-01dae12cfab1?q=80&w=200",
  "yogurt": "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?q=80&w=200",
  "butter": "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?q=80&w=200",
  
  // Meat
  "chicken": "https://images.unsplash.com/photo-1604503468506-a8da13d82791?q=80&w=200",
  "beef": "https://images.unsplash.com/photo-1603048588667-c24e94e37bf1?q=80&w=200",
  "fish": "https://images.unsplash.com/photo-1580554530778-ca36943938b2?q=80&w=200",
  "salmon": "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?q=80&w=200",
  
  // Bakery
  "bread": "https://images.unsplash.com/photo-1549931319-a545dcf3bc7c?q=80&w=200",
  "bagel": "https://images.unsplash.com/photo-1585445490387-dcf7f9512526?q=80&w=200",
  "muffin": "https://images.unsplash.com/photo-1604882406495-40baa5bf77af?q=80&w=200",
  
  // Pantry
  "pasta": "https://images.unsplash.com/photo-1551462147-ff29053bfc14?q=80&w=200",
  "rice": "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?q=80&w=200",
  "cereal": "https://images.unsplash.com/photo-1521483451569-e33803c0330c?q=80&w=200",
  "sugar": "https://images.unsplash.com/photo-1581268497089-7a975fb491a3?q=80&w=200",
  "flour": "https://images.unsplash.com/photo-1627228684601-87e0364eb159?q=80&w=200",
  
  // Beverages
  "water": "https://images.unsplash.com/photo-1523362628745-0c100150b504?q=80&w=200",
  "juice": "https://images.unsplash.com/photo-1600271886742-f049cd451bba?q=80&w=200",
  "soda": "https://images.unsplash.com/photo-1581636625402-29b2a704ef13?q=80&w=200",
  "coffee": "https://images.unsplash.com/photo-1559056961-84608fae629c?q=80&w=200",
  "ground coffee": "https://images.unsplash.com/photo-1559056961-84608fae629c?q=80&w=200",
  "coffee beans": "https://images.unsplash.com/photo-1559056961-84608fae629c?q=80&w=200",
  "instant coffee": "https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=200",
  "tea": "https://images.unsplash.com/photo-1576092768241-dec231879fc3?q=80&w=200",
  
  // Household
  "soap": "https://images.unsplash.com/photo-1584305574647-0cc949a2bb9f?q=80&w=200",
  "detergent": "https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?q=80&w=200",
  "paper": "https://images.unsplash.com/photo-1597484661643-2f5fef640dd1?q=80&w=200",
  "toilet paper": "https://images.unsplash.com/photo-1584462278633-cef4c9d0a99f?q=80&w=200"
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
 * Get an image URL for a grocery item
 * @param itemName The name of the item
 * @returns URL to an image of the item or undefined if not found
 */
export function getItemImage(itemName: string): string | undefined {
  if (!itemName) return undefined;
  
  // Normalize item name for matching
  const normalizedName = itemName.toLowerCase();
  
  // Try to find an exact match first
  if (commonItemImages[normalizedName]) {
    return commonItemImages[normalizedName];
  }
  
  // Then try partial matches with priority for longer matches
  const matches = [];
  for (const [key, url] of Object.entries(commonItemImages)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      matches.push({ key, url, score: key.length });
    }
  }
  
  // Return the match with the highest score (longest key match)
  if (matches.length > 0) {
    matches.sort((a, b) => b.score - a.score);
    return matches[0].url;
  }
  
  // Check for categories
  const categories = [
    { terms: ['fruit', 'apple', 'orange', 'banana', 'berry', 'melon', 'grape'], image: commonItemImages.apple },
    { terms: ['vegetable', 'carrot', 'broccoli', 'cucumber', 'pepper'], image: commonItemImages.tomato },
    { terms: ['meat', 'steak', 'pork', 'lamb', 'chicken', 'turkey'], image: commonItemImages.beef },
    { terms: ['fish', 'seafood', 'shrimp', 'salmon', 'tuna'], image: commonItemImages.fish },
    { terms: ['dairy', 'milk', 'cheese', 'yogurt', 'cream'], image: commonItemImages.milk },
    { terms: ['bread', 'bakery', 'muffin', 'bagel', 'roll'], image: commonItemImages.bread },
    { terms: ['cereal', 'grain', 'oat', 'rice', 'pasta'], image: commonItemImages.cereal },
    { terms: ['drink', 'beverage', 'juice', 'water', 'soda'], image: commonItemImages.water },
    { terms: ['cleaning', 'soap', 'detergent', 'paper'], image: commonItemImages.soap }
  ];
  
  for (const category of categories) {
    if (category.terms.some(term => normalizedName.includes(term))) {
      return category.image;
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
 * First tries the provided image URL, then the common items database,
 * and finally attempts to generate an AI image if OpenAI is configured
 * 
 * @param productName The name of the product
 * @param providedImageUrl Optional image URL provided by a retailer API
 * @param useAI Whether to use AI image generation as a fallback
 * @returns Promise resolving to the best available image URL
 */
export async function getBestProductImage(
  productName: string, 
  providedImageUrl?: string,
  useAI: boolean = false
): Promise<string | undefined> {
  // If a URL is provided, use it
  if (providedImageUrl) {
    return providedImageUrl;
  }
  
  // Try to find a matching common item image
  const commonImage = getItemImage(productName);
  if (commonImage) {
    return commonImage;
  }
  
  // If AI generation is enabled and we have the necessary setup, try to generate an image
  if (useAI) {
    return await generateAIProductImage(productName);
  }
  
  // Default fallback is undefined (no image available)
  return undefined;
}