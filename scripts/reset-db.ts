import { prisma } from '../src/lib/db/prisma';

async function resetDatabase() {
  console.log("☢️  INITIATING TOTAL DATABASE RESET...");
  console.log("    This will delete ALL products, listings, feeds, and analytics.");
  
  console.log("    Waiting 3 seconds... Press Ctrl+C to cancel.");
  await new Promise(r => setTimeout(r, 3000));

  try {
    // --- 1. DELETE CHILD TABLES (Dependencies) ---
    console.log("   🗑️  Deleting History & Analytics...");
    await prisma.priceHistory.deleteMany({});
    await prisma.productView.deleteMany({});
    await prisma.wishlistItem.deleteMany({});
    await prisma.review.deleteMany({});
    await prisma.userEvent.deleteMany({});
    await prisma.searchLog.deleteMany({});

    // --- 2. DELETE CONFIGURATION ---
    console.log("   🗑️  Deleting Feeds...");
    // Feeds cascade delete when Retailers are deleted, but we delete explicitly to be safe
    await prisma.feed.deleteMany({});

    console.log("   🗑️  Deleting Listings...");
    await prisma.listing.deleteMany({});

    // --- 3. DELETE CORE DATA ---
    console.log("   🗑️  Deleting Products...");
    await prisma.product.deleteMany({});

    console.log("   🗑️  Deleting Retailers...");
    await prisma.retailer.deleteMany({});

    console.log("\n✅ DATABASE WIPED CLEAN.");
    console.log("   You are ready to ingest fresh data.");

  } catch (e: any) {
    console.error("❌ Error during reset:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetDatabase();