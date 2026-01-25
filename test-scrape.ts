import { SweetwaterScraper } from './src/lib/scrapers/sweetwater';
import { PluginBoutiqueScraper } from './src/lib/scrapers/pluginboutique'; // <--- Import new one
import { prisma } from './src/lib/db/prisma';

async function main() {
  console.log('🧪 Starting Dual-Site Test...');
  
  // TEST 1: The One You Just Fixed (Sweetwater)
  // We can comment this out if you want to save time, or keep it to verify stability
  // const sweetwater = new SweetwaterScraper();
  // await sweetwater.scrapeURL('https://www.sweetwater.com/store/detail/SM58--shure-sm58-cardioid-dynamic-vocal-microphone');

  // TEST 2: The New Challenger (Plugin Boutique)
  console.log('\n--- Testing Plugin Boutique ---');
  const pb = new PluginBoutiqueScraper();
  const pbUrl = 'https://www.pluginboutique.com/product/2-Effects/25-Spectral-Analysis/9301-VISION-4X';
  
  await pb.scrapeURL(pbUrl);
  
  // Verify DB
  console.log('\n🔎 Verifying database for Plugin Boutique...');
  const listing = await prisma.listing.findFirst({
    where: { url: pbUrl },
    include: { retailer: true }
  });

  if (listing) {
    console.log(`✅ SUCCESS: ${listing.title} - $${listing.price} (from ${listing.retailer.name})`);
  } else {
    console.error('❌ Plugin Boutique Failed');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());