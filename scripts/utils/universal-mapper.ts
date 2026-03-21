/**
 * Universal Data Mapper
 * Normalizes raw JSON/CSV feed items into a standardized Product/Listing shape.
 * * Handles:
 * 1. Missing categories (Defaults to "Plugin")
 * 2. Missing original prices (Defaults to current price to prevent 100% discount errors)
 * 3. Affiliate Tag injection
 */
export function mapProductData(rawItem: any, affiliateTag: string | null) {
  // 1. Safely extract the Base URL
  const rawUrl = rawItem.url || rawItem['Product URL'] || rawItem.link || '';

  // 2. Inject the Affiliate Tag
  let finalUrl = rawUrl;
  if (affiliateTag && rawUrl) {
    // Check if the URL already has parameters (e.g., ?source=feed) to prevent malformed URLs
    finalUrl = rawUrl.includes('?') 
      ? `${rawUrl}&${affiliateTag}` 
      : `${rawUrl}?${affiliateTag}`;
  }

  // 3. Parse Current Price (Prefers 'Price US' from CSV, falls back to 'price' from JSON)
  const currentPriceRaw = rawItem.price || rawItem['Price US'] || rawItem.salePrice || 0;
  const currentPrice = parseFloat(currentPriceRaw);

  // 4. Calculate Original Price
  // FIX: If original price is missing (like in the CSV), we set it to the current price. 
  // This prevents the UI from calculating a false "100% off" discount.
  const originalPriceRaw = rawItem.originalPrice || rawItem.msrp;
  const originalPrice = originalPriceRaw ? parseFloat(originalPriceRaw) : currentPrice;

  // 5. Construct the Normalized Object
  return {
    title: rawItem.title || rawItem['Product Name'] || rawItem.name || 'Unknown Title',
    brand: rawItem.brand || rawItem['Brand Name'] || rawItem.manufacturer || 'Unknown Brand',
    price: currentPrice,
    originalPrice: originalPrice,
    
    // FIX: Category Fallback (CSV lacks category, so we default to the schema's "Plugin")
    category: rawItem.category || 'Plugin',
    
    description: rawItem.description || null,
    
    // Image mapping (JSON vs CSV)
    image: rawItem.image || rawItem['Product Image URL'] || rawItem.imageUrl || null,
    
    // The finalized affiliate URL
    url: finalUrl
  };
}