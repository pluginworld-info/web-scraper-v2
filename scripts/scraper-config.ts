// scripts/scraper-config.ts

export const SITE_CONFIGS = [
  // --- THE HUB (Content Source) ---
  {
    name: "Audio Plugin Deals",
    domain: "audioplugindeals.com",
    role: "MASTER", // We get images/desc from here
    searchUrl: "https://audioplugindeals.com/?s={QUERY}",
    selectors: {
      productItem: ".product-grid-item", 
      title: ".woo-loop-product__title",
      price: ".price ins .amount", // 'ins' usually denotes the sale price
      image: ".woo-loop-product__thumbnail img",
      link: "a.woocommerce-LoopProduct-link"
    }
  },

  // --- THE SPOKES (Price Only) ---
  {
    name: "Plugin Boutique",
    domain: "pluginboutique.com",
    role: "PRICE_CHECKER", // We only check prices here
    searchUrl: "https://www.pluginboutique.com/search?q={QUERY}",
    selectors: {
      productItem: ".product-list-item",
      title: "h2",
      price: ".price-amount",
      // No image/desc selectors needed - we don't touch them
    }
  },
  {
    name: "Sweetwater",
    domain: "sweetwater.com",
    role: "PRICE_CHECKER",
    searchUrl: "https://www.sweetwater.com/store/search.php?s={QUERY}",
    selectors: {
      productItem: ".product-card",
      title: ".product-card__name",
      price: ".product-card__price",
    }
  },
  {
    name: "AudioDeluxe",
    domain: "audiodeluxe.com",
    role: "PRICE_CHECKER",
    searchUrl: "https://www.audiodeluxe.com/search/site/{QUERY}",
    selectors: {
      productItem: ".views-row",
      title: ".views-field-title a",
      price: ".product-price",
    }
  },
  {
    name: "JRR Shop",
    domain: "jrrshop.com",
    role: "PRICE_CHECKER",
    searchUrl: "https://www.jrrshop.com/catalogsearch/result/?q={QUERY}",
    selectors: {
      productItem: ".item",
      title: ".product-name a",
      price: ".price",
    }
  },
  // Add other Tier-1 sites similarly...
];