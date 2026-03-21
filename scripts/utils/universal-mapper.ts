/**
 * Universal Data Mapper
 * Normalizes raw JSON/CSV feed items into a standardized Product/Listing shape.
 */

// ⚡ NEW: The Smart Keyword Router for missing categories
export function guessCategory(title: string): string {
  const t = title.toLowerCase();

  if (t.includes('preset') || t.includes('patch')) return 'Presets';
  if (t.includes('sample') || t.includes('loop') || t.includes('kit') || t.includes('pack')) return 'Sample Packs';
  if (t.includes('drum') || t.includes('kick') || t.includes('snare') || t.includes('cymbal')) return 'Drums';
  if (t.includes('synth') || t.includes('serum') || t.includes('massive') || t.includes('sylenth')) return 'Synths';
  if (t.includes('eq ') || t.includes('equalizer') || t.includes('compressor') || t.includes('reverb') || t.includes('delay') || t.includes('filter')) return 'Effects';
  if (t.includes('vocal') || t.includes('voice') || t.includes('choir')) return 'Vocals';
  if (t.includes('kontakt') || t.includes('instrument') || t.includes('piano') || t.includes('guitar')) return 'Virtual Instruments';
  if (t.includes('mastering') || t.includes('limiter') || t.includes('maximizer')) return 'Mastering';

  return 'Plugin'; // Fallback
}

export function mapProductData(rawItem: any, affiliateTag: string | null) {
  const rawUrl = rawItem.url || rawItem['Product URL'] || rawItem.link || '';

  let finalUrl = rawUrl;
  if (affiliateTag && rawUrl) {
    // ⚡ FIX: Strip any leading ? or & from the tag just in case the user typed it in the UI
    const cleanTag = affiliateTag.replace(/^[?&]+/, '');
    
    finalUrl = rawUrl.includes('?') 
      ? `${rawUrl}&${cleanTag}` 
      : `${rawUrl}?${cleanTag}`;
  }

  // Safely grab US Price, dropping EU Price completely
  const currentPriceRaw = rawItem.price || rawItem['Price US'] || rawItem.salePrice || 0;
  const currentPrice = parseFloat(currentPriceRaw);

  const originalPriceRaw = rawItem.originalPrice || rawItem.msrp;
  const originalPrice = originalPriceRaw ? parseFloat(originalPriceRaw) : currentPrice;

  const title = rawItem.title || rawItem['Product Name'] || rawItem.name || 'Unknown Title';

  return {
    title: title,
    brand: rawItem.brand || rawItem['Brand Name'] || rawItem.manufacturer || 'Unknown Brand',
    price: currentPrice,
    originalPrice: originalPrice,
    
    // ⚡ FIX: Uses the Keyword Router if the CSV/JSON doesn't provide a category
    category: rawItem.category || guessCategory(title),
    
    description: rawItem.description || null,
    image: rawItem.image || rawItem['Product Image URL'] || rawItem.imageUrl || null,
    url: finalUrl
  };
}