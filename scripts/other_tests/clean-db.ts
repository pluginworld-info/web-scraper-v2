import { prisma } from '../../src/lib/db/prisma';
import { RetailerRole } from '@prisma/client';

async function cleanDatabase() {
    console.log(`🧹 STARTING DATABASE CLEANUP...`);

    // 1. Fix the Retailer Role for Audio Plugin Deals
    // This ensures the DB is perfectly in sync with your new code
    console.log(`   🔗 Updating Retailer roles...`);
    try {
        const apd = await prisma.retailer.updateMany({
            where: { name: "Audio Plugin Deals" },
            data: { role: "MASTER" as RetailerRole }
        });
        console.log(`      ✅ Updated ${apd.count} retailer(s) to MASTER role.`);
    } catch (e) {
        console.log(`      ⚠️ Could not update role (Retailer may not exist yet).`);
    }

    // 2. Remove Ghost Listings (Listings without prices or links)
    console.log(`   👻 Cleaning ghost listings...`);
    const ghostListings = await prisma.listing.deleteMany({
        where: {
            OR: [
                { price: 0, originalPrice: 0 },
                { url: "" }
            ]
        }
    });
    console.log(`      ✅ Removed ${ghostListings.count} invalid listings.`);

    // 3. Remove Orphaned Products 
    // (Products created in failed runs that have NO prices attached)
    console.log(`   📦 Cleaning orphaned products...`);
    const allProducts = await prisma.product.findMany({
        include: { listings: true }
    });

    const orphans = allProducts.filter(p => p.listings.length === 0);
    if (orphans.length > 0) {
        const orphanIds = orphans.map(o => o.id);
        const deletedOrphans = await prisma.product.deleteMany({
            where: { id: { in: orphanIds } }
        });
        console.log(`      ✅ Deleted ${deletedOrphans.count} orphaned products.`);
    } else {
        console.log(`      ✅ No orphaned products found.`);
    }

    // 4. Reset specific Retailer data if needed
    // (Uncomment the line below if you want to wipe ALL previous APD listings to start fresh)
    // await prisma.listing.deleteMany({ where: { retailer: { name: "Audio Plugin Deals" } } });

    console.log(`   🏁 CLEANUP COMPLETE. Ready for the Master Crawl.`);
}

cleanDatabase()
    .catch(e => console.error("❌ Cleanup failed:", e))
    .finally(async () => await prisma.$disconnect());