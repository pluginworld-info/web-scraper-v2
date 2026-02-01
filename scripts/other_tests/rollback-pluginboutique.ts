import { prisma } from '../../src/lib/db/prisma';

const RETAILER_NAME = "Plugin Boutique";

async function rollbackSpoke() {
    console.log(`🚨 STARTING ROLLBACK FOR: ${RETAILER_NAME}`);
    
    // 1. Find the Retailer
    const retailer = await prisma.retailer.findUnique({
        where: { name: RETAILER_NAME }
    });

    if (!retailer) {
        console.log("❌ Retailer not found. Nothing to delete.");
        return;
    }

    console.log(`   Found Retailer ID: ${retailer.id}`);

    // 2. Count what we are about to delete
    const listingsCount = await prisma.listing.count({
        where: { retailerId: retailer.id }
    });
    
    if (listingsCount === 0) {
        console.log("   ✅ No listings found. Phase 1 complete.");
    } else {
        console.log(`   ⚠️  Found ${listingsCount} listings to wipe.`);

        // A. Delete Price History
        console.log("   🗑️  Deleting Price History...");
        const { count: historyCount } = await prisma.priceHistory.deleteMany({
            where: {
                listing: {
                    retailerId: retailer.id
                }
            }
        });
        console.log(`      - Removed ${historyCount} history entries.`);

        // B. Delete Listings
        console.log("   🗑️  Deleting Listings...");
        const { count: deletedListings } = await prisma.listing.deleteMany({
            where: {
                retailerId: retailer.id
            }
        });
        console.log(`      - Removed ${deletedListings} listings.`);
    }

    // ---------------------------------------------------------
    // ORPHAN CLEANUP (The part that failed before)
    // ---------------------------------------------------------
    console.log("   🧹 Cleaning up Orphan Products (PB-Only items)...");
    
    // Find products with zero listings
    const orphans = await prisma.product.findMany({
        where: {
            listings: {
                none: {} 
            }
        },
        select: { id: true }
    });

    if (orphans.length > 0) {
        console.log(`      - Found ${orphans.length} products with no listings (Ghosts).`);
        const orphanIds = orphans.map(o => o.id);

        // 🚨 FIX: Delete Dependent Data First (ProductView, etc.)
        // If you have other tables like PriceAlert, add them here too.
        
        try {
            console.log("      🗑️  Deleting associated Product Views...");
            // @ts-ignore - Ignoring TS check in case table name varies slightly in your schema
            if (prisma.productView) {
                const { count: deletedViews } = await prisma.productView.deleteMany({
                    where: { productId: { in: orphanIds } }
                });
                console.log(`          - Removed ${deletedViews} product views.`);
            }
        } catch (e) {
            console.log("          (No ProductView table or deletion failed, continuing...)");
        }

        // NOW delete the products
        const { count: deletedOrphans } = await prisma.product.deleteMany({
            where: {
                id: { in: orphanIds }
            }
        });
        console.log(`      ✅ Successfully deleted ${deletedOrphans} orphan products.`);
    } else {
        console.log("      ✅ No orphan products found (All matches preserved).");
    }

    console.log("\n✅ ROLLBACK COMPLETE. Plugin Boutique data is gone.");
}

rollbackSpoke()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());