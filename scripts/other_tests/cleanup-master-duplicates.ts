import { prisma } from '../../src/lib/db/prisma';

async function cleanupMasterDuplicates() {
    console.log("🧹 STARTING MASTER DUPLICATE CLEANUP...");
    console.log("   (Policy: Keep NEWEST, Delete OLDEST)");

    // 1. Fetch all products (ID, Title, CreatedAt)
    const allProducts = await prisma.product.findMany({
        select: { id: true, title: true, createdAt: true }
    });

    console.log(`   🔎 Scanning ${allProducts.length} total products...`);

    // 2. Group by Title to find duplicates
    const productGroups = new Map<string, typeof allProducts>();

    for (const p of allProducts) {
        const cleanTitle = p.title.toLowerCase().trim();
        if (!productGroups.has(cleanTitle)) {
            productGroups.set(cleanTitle, []);
        }
        productGroups.get(cleanTitle)?.push(p);
    }

    // 3. Identify IDs to delete
    const idsToDelete: string[] = [];
    let duplicateSetsFound = 0;

    for (const [title, group] of productGroups) {
        if (group.length > 1) {
            duplicateSetsFound++;
            
            // SORT: Newest First (Desc by createdAt)
            // We keep index 0, delete the rest.
            group.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            const keeper = group[0];
            const trash = group.slice(1);

            console.log(`   ⚠️  Found Duplicate: "${title}"`);
            console.log(`       ✅ Keeping: [${keeper.id}] (Created: ${keeper.createdAt.toISOString()})`);
            
            for (const t of trash) {
                console.log(`       ❌ Trash:   [${t.id}] (Created: ${t.createdAt.toISOString()})`);
                idsToDelete.push(t.id);
            }
        }
    }

    if (idsToDelete.length === 0) {
        console.log("\n✅ Database is clean! No duplicates found.");
        return;
    }

    console.log(`\n🚨 FOUND ${idsToDelete.length} DUPLICATE PRODUCTS TO DELETE.`);
    console.log("   Cleaning up dependencies first...");

    // 4. EXECUTE SAFE DELETION
    
    // A. Delete ProductViews (Analytics)
    // @ts-ignore
    if (prisma.productView) {
        const { count: deletedViews } = await prisma.productView.deleteMany({
            where: { productId: { in: idsToDelete } }
        });
        console.log(`   - Deleted ${deletedViews} ProductViews`);
    }

    // B. Delete PriceHistory
    // We have to find the listings for these products first to delete their history
    const listings = await prisma.listing.findMany({
        where: { productId: { in: idsToDelete } },
        select: { id: true }
    });
    const listingIds = listings.map(l => l.id);

    if (listingIds.length > 0) {
        const { count: deletedHistory } = await prisma.priceHistory.deleteMany({
            where: { listingId: { in: listingIds } }
        });
        console.log(`   - Deleted ${deletedHistory} PriceHistory entries`);
    }

    // C. Delete Listings
    const { count: deletedListings } = await prisma.listing.deleteMany({
        where: { productId: { in: idsToDelete } }
    });
    console.log(`   - Deleted ${deletedListings} Listings`);

    // D. Delete the Products
    const { count: deletedProducts } = await prisma.product.deleteMany({
        where: { id: { in: idsToDelete } }
    });

    console.log(`\n✅ CLEANUP COMPLETE.`);
    console.log(`   - Removed ${deletedProducts} duplicate products.`);
    console.log(`   - Retained the newest version of each.`);
}

cleanupMasterDuplicates()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());