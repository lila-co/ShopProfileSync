// Refactored image retrieval logic to prioritize retailer-specific product images over generic stock photos.

export async function getProductImage(productName: string, retailerName?: string): Promise<string | null> {
  try {
    // Normalize product name for search
    const normalizedProduct = productName.toLowerCase().trim();
    
    // Create retailer-specific search terms
    const searchTerms = [
      `${normalizedProduct} ${retailerName || ''} product package`,
      `${normalizedProduct} grocery store package`,
      `${normalizedProduct} retail product`,
      normalizedProduct
    ].filter(term => term.trim());

    // Try each search term until we find a good image
    for (const searchTerm of searchTerms) {
      const encodedTerm = encodeURIComponent(searchTerm.trim());
      const imageUrl = `https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&h=200&fit=crop&q=80&auto=format&fm=webp&s=${encodedTerm}`;
      
      // Test if image loads successfully
      const response = await fetch(imageUrl, { method: 'HEAD' });
      if (response.ok) {
        return imageUrl;
      }
    }

    return null;
  } catch (error) {
    console.error('Error fetching product image:', error);
    return null;
  }
}

// Enhanced product image matching function
export async function getBestProductImage(
  productName: string, 
  existingImageUrl?: string, 
  category?: string,
  enableAI?: boolean,
  retailerId?: number
): Promise<string | null> {
  try {
    // First priority: Try to get image from retailer API if retailerId is provided
    if (retailerId) {
      const retailerImageUrl = await getRetailerProductImage(productName, retailerId);
      if (retailerImageUrl) {
        return retailerImageUrl;
      }
    }

    // If we have an existing image URL, try to use it next
    if (existingImageUrl && existingImageUrl.trim()) {
      try {
        const response = await fetch(existingImageUrl, { method: 'HEAD' });
        if (response.ok) {
          return existingImageUrl;
        }
      } catch (error) {
        console.log('Existing image URL failed, trying alternatives');
      }
    }

    // Generate category-specific image based on product name and category
    const categoryImageUrl = getCategorySpecificImage(productName, category);
    if (categoryImageUrl) {
      return categoryImageUrl;
    }

    // Fallback to generic product image search
    return await getProductImage(productName);
  } catch (error) {
    console.error('Error in getBestProductImage:', error);
    return null;
  }
}

// Function to get product image from retailer API
export async function getRetailerProductImage(productName: string, retailerId: number): Promise<string | null> {
  try {
    // Make API call to search for the product through retailer integration
    const response = await fetch(`/api/retailer/${retailerId}/search?query=${encodeURIComponent(productName)}`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      console.log(`Retailer API search failed for ${productName} at retailer ${retailerId}`);
      return null;
    }

    const products = await response.json();
    
    // Look for the first product that has an image URL
    for (const product of products) {
      if (product.imageUrl && product.imageUrl.trim()) {
        // Skip validation for external URLs that might have CORS issues
        // Just return the URL and let the browser handle it
        const imageUrl = product.imageUrl;
        
        // Only validate if it's a relative URL or from a trusted domain
        if (imageUrl.startsWith('/') || imageUrl.includes('unsplash.com') || imageUrl.includes('images.unsplash.com')) {
          try {
            const imageResponse = await fetch(imageUrl, { method: 'HEAD' });
            if (imageResponse.ok) {
              console.log(`Found retailer image for "${productName}": ${imageUrl}`);
              return imageUrl;
            }
          } catch (error) {
            console.log(`Retailer image URL validation failed: ${imageUrl}`);
            continue;
          }
        } else {
          // For external URLs, just return them without validation to avoid CORS issues
          console.log(`Found retailer image for "${productName}": ${imageUrl}`);
          return imageUrl;
        }
      }
    }

    console.log(`No valid retailer images found for "${productName}" at retailer ${retailerId}`);
    return null;
  } catch (error) {
    console.error(`Error fetching retailer image for "${productName}":`, error);
    return null;
  }
}

// Generate category-specific images
function getCategorySpecificImage(productName: string, category?: string): string | null {
  const normalizedName = productName.toLowerCase();
  
  // Map common products to specific Unsplash photo IDs
  const productImageMap: Record<string, string> = {
    'milk': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=200&h=200&fit=crop',
    'bread': 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=200&h=200&fit=crop',
    'eggs': 'https://images.unsplash.com/photo-1518569656558-1f25e69d93d7?w=200&h=200&fit=crop',
    'bananas': 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=200&h=200&fit=crop',
    'apples': 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=200&h=200&fit=crop',
    'chicken': 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=200&h=200&fit=crop',
    'cheese': 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=200&h=200&fit=crop',
    'yogurt': 'https://images.unsplash.com/photo-1488900128323-21503983a07e?w=200&h=200&fit=crop',
    'pasta': 'https://images.unsplash.com/photo-1551892374-ecf8cc4dcd34?w=200&h=200&fit=crop',
    'rice': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200&h=200&fit=crop',
    'coffee': 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=200&h=200&fit=crop',
    'pizza': 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200&h=200&fit=crop',
    'ice cream': 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=200&h=200&fit=crop',
    'toilet paper': 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=200&h=200&fit=crop',
    'paper towels': 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=200&h=200&fit=crop',
    'shampoo': 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200&h=200&fit=crop',
    'cereal': 'https://images.unsplash.com/photo-1592490862406-1cd23fbe0d50?w=200&h=200&fit=crop',
    'salmon': 'https://images.unsplash.com/photo-1485704686097-ed47f7263ca4?w=200&h=200&fit=crop',
    'wine': 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=200&h=200&fit=crop',
    'trail mix': 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=200&h=200&fit=crop',
    'vitamin': 'https://images.unsplash.com/photo-1559059488-db1d5f23e00d?w=200&h=200&fit=crop'
  };

  // Find matching product
  for (const [key, imageUrl] of Object.entries(productImageMap)) {
    if (normalizedName.includes(key)) {
      return imageUrl;
    }
  }

  // Category-based fallbacks
  if (category) {
    const categoryImages: Record<string, string> = {
      'produce': 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop',
      'dairy': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=200&h=200&fit=crop',
      'meat': 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=200&h=200&fit=crop',
      'bakery': 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=200&h=200&fit=crop',
      'pantry': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200&h=200&fit=crop',
      'household': 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=200&h=200&fit=crop'
    };
    
    const categoryKey = category.toLowerCase();
    for (const [key, imageUrl] of Object.entries(categoryImages)) {
      if (categoryKey.includes(key)) {
        return imageUrl;
      }
    }
  }

  return null;
}

export function getCompanyLogo(companyName: string): string | undefined {
  const logoMap: Record<string, string> = {
    'Walmart': 'https://logos-world.net/wp-content/uploads/2020/09/Walmart-Logo.png',
    'Target': 'https://logos-world.net/wp-content/uploads/2020/04/Target-Logo.png',
    'Whole Foods': 'https://logos-world.net/wp-content/uploads/2020/12/Whole-Foods-Market-Logo.png',
    'Kroger': 'https://logos-world.net/wp-content/uploads/2021/01/Kroger-Logo.png',
    'Safeway': 'https://logos-world.net/wp-content/uploads/2020/12/Safeway-Logo.png',
    "Trader Joe's": 'https://logos-world.net/wp-content/uploads/2020/12/Trader-Joes-Logo.png',
    'Costco': 'https://logos-world.net/wp-content/uploads/2020/09/Costco-Logo.png',
    'Amazon': 'https://logos-world.net/wp-content/uploads/2020/04/Amazon-Logo.png'
  };

  // Try exact match first
  if (logoMap[companyName]) {
    return logoMap[companyName];
  }

  // Try case-insensitive match
  const normalizedName = companyName.toLowerCase();
  const matchedKey = Object.keys(logoMap).find(key => 
    key.toLowerCase() === normalizedName
  );

  if (matchedKey) {
    return logoMap[matchedKey];
  }

  // Fallback: return undefined so components can show fallback avatars
  return undefined;
}

// Helper function to get retailer color based on brand
export function getRetailerColor(retailerName: string): string {
  const colorMap: Record<string, string> = {
    'Walmart': '#004c91',
    'Target': '#cc0000', 
    'Whole Foods': '#00674b',
    'Kroger': '#004990',
    'Safeway': '#ed1c24',
    "Trader Joe's": '#d2691e',
    'Costco': '#005daa',
    'Amazon': '#ff9900'
  };

  return colorMap[retailerName] || '#4A7CFA';
}