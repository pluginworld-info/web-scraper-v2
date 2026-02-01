import { prisma } from '../src/lib/db/prisma';

async function resetDatabase() {
    console.log("☢️  INITIATING TOTAL DATABASE RESET...");
    console.log("    This will delete ALL products, listings, history, and analytics.");
    
    console.log("    Waiting 3 seconds... Press Ctrl+C to cancel.");
    await new Promise(r => setTimeout(r, 3000));

    try {
        // --- 1. DELETE CHILD TABLES (Dependencies) ---
        // We must delete these first because they point TO products/listings.
        
        console.log("   🗑️  Deleting PriceHistory...");
        await prisma.priceHistory.deleteMany({});

        console.log("   🗑️  Deleting Listings...");
        await prisma.listing.deleteMany({});

        // Analytics & User Interactions
        console.log("   🗑️  Deleting ProductViews...");
        // @ts-ignore
        if (prisma.productView) await prisma.productView.deleteMany({});
        
        console.log("   🗑️  Deleting WishlistItems...");
        // @ts-ignore
        if (prisma.wishlistItem) await prisma.wishlistItem.deleteMany({});

        console.log("   🗑️  Deleting PriceAlerts...");
        // @ts-ignore
        if (prisma.priceAlert) await prisma.priceAlert.deleteMany({});

        console.log("   🗑️  Deleting Reviews...");
        // @ts-ignore
        if (prisma.review) await prisma.review.deleteMany({});

        // --- 2. DELETE CORE DATA ---
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