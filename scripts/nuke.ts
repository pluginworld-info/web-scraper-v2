import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function wipe() {
  console.log("⚠️ INITIATING SURGICAL DATABASE WIPE...");

  try {
    const deletedHistory = await prisma.priceHistory.deleteMany({});
    console.log(`🗑️ Deleted ${deletedHistory.count} price history records.`);

    const deletedListings = await prisma.listing.deleteMany({});
    console.log(`🗑️ Deleted ${deletedListings.count} listings.`);

    const deletedProducts = await prisma.product.deleteMany({});
    console.log(`🗑️ Deleted ${deletedProducts.count} products.`);

    const deletedFeeds = await prisma.feed.deleteMany({});
    console.log(`🗑️ Deleted ${deletedFeeds.count} feeds.`);

    console.log("✅ Database wiped clean! Admin & Retailer settings were preserved.");
  } catch (error) {
    console.error("❌ Nuke Failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

wipe();