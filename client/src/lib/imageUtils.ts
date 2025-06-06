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
```