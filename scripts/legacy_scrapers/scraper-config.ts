// scripts/scraper-config.ts

export const SITE_CONFIGS = [
  // --- THE HUB (Content Source) ---
  {
    name: "Audio Plugin Deals",
    domain: "audioplugin.deals",
    role: "MASTER", 
    // The main shop page where the grid is located
    dealsUrl: "https://audioplugin.deals/shop/",
    searchUrl: "https://audioplugin.deals/?s={QUERY}",
    
    // Selectors based on the specific Elementor/WooCommerce HTML provided
    selectors: {
      productItem: ".jet-listing-grid__item", 
      title: "h2.elementor-heading-title a",
      link: "h2.elementor-heading-title a",
      
      // Images
      image: ".elementor-widget-image img", // Grid thumbnail (low res)
      imageHighRes: ".jet-listing-dynamic-image__img", // Inner page (high res)

      // Prices (Handling the <ins> and <del> structure)
      priceContainer: ".deal-card-price-content",
      price: "ins .woocommerce-Price-amount", 
      originalPrice: "del .woocommerce-Price-amount",
      
      // Metadata
      description: ".woocommerce-product-details__short-description", // Inner page
      brand: ".product_title", // Requires parsing "Title by Brand"
      category: ".posted_in a" // Standard Woo Category
    }
  }, 

  // --- THE SPOKES (Price & Discount Checkers) ---
  // These are configured to grab Title, Price, Original Price (for discount), and Category.
  {
    name: "Plugin Boutique",
    domain: "pluginboutique.com",
    role: "PRICE_CHECKER", 
    dealsUrl: "https://www.pluginboutique.com/deals",
    searchUrl: "https://www.pluginboutique.com/search?q={QUERY}",
    selectors: {
      productItem: "div[data-controller='product-tile']", // Confirmed PB selector
      title: "[data-testid^='product-name-']",
      link: "a[data-product-tile-target='mainLink']",
      
      // Price Logic
      price: ".text-right.text-gray-900.text-base.font-semibold", 
      originalPrice: ".line-through", // Key for calculating discount
      
      // Category (Often found in breadcrumbs on inner page, or data attributes)
      category: ".breadcrumb li:nth-child(3)" 
    }
  },
  {
    name: "Sweetwater",
    domain: "sweetwater.com",
    role: "PRICE_CHECKER",
    dealsUrl: "https://www.sweetwater.com/dealzone",
    searchUrl: "https://www.sweetwater.com/store/search.php?s={QUERY}",
    selectors: {
      productItem: ".product-card",
      title: ".product-card__name",
      link: ".product-card__name a",
      price: ".product-card__price",
      originalPrice: ".product-card__old-price",
      category: ".breadcrumbs" 
    }
  },
  {
    name: "AudioDeluxe",
    domain: "audiodeluxe.com",
    role: "PRICE_CHECKER",
    dealsUrl: "https://audiodeluxe.com",
    searchUrl: "https://www.audiodeluxe.com/search/site/{QUERY}",
    selectors: {
      productItem: ".views-row",
      title: ".views-field-title a",
      link: ".views-field-title a",
      price: ".product-price",
      originalPrice: ".product-old-price",
      category: ".field--name-field-category"
    }
  },
  {
    name: "JRR Shop",
    domain: "jrrshop.com",
    role: "PRICE_CHECKER",
    dealsUrl: "https://www.jrrshop.com",
    searchUrl: "https://www.jrrshop.com/catalogsearch/result/?q={QUERY}",
    selectors: {
      productItem: ".item",
      title: ".product-name a",
      link: ".product-name a",
      price: ".price",
      originalPrice: ".old-price .price",
      category: ".cat-link"
    }
  }
];