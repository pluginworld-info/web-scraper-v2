import { prisma } from '../../src/lib/db/prisma';

async function cleanupGhosts() {
    console.log("👻 STARTING GHOST HUNTER...");

    // 1. Find suspicious products (Known ghosts or empty data)
    const ghosts = await prisma.product.findMany({
        where: {
            OR: [
                { title: { contains: "808 STUDIO 2", mode: 'insensitive' } }, // Specific known ghost
                { title: { contains: "Unknown Title", mode: 'insensitive' } },
                { image: null }, // Often ghosts have no image
                { description: "N/A" }
            ]
        },
        include: {
            listings: true // See if they have prices attached
        }
    });

    if (ghosts.length === 0) {
        console.log("✅ No ghosts found! Database is clean.");
        return;
    }

    console.log(`⚠️ FOUND ${ghosts.length} SUSPICIOUS ITEMS:`);
    ghosts.forEach(g => {
        console.log(`   - [ID: ${g.id}] ${g.title} (Listings: ${g.listings.length})`);
    });

    // UNCOMMENT THE LINES BELOW TO ACTUALLY DELETE THEM
    /*
    console.log("\n🗑️  DELETING GHOSTS...");
    const ids = ghosts.map(g => g.id);
    
    // 1. Delete associated listings first (Foreign Key constraint)
    await prisma.priceHistory.deleteMany({
        where: { listing: { productId: { in: ids } } }
    });
    await prisma.listing.deleteMany({
        where: { productId: { in: ids } }
    });

    // 2. Delete the products
    const result = await prisma.product.deleteMany({
        where: { id: { in: ids } }
    });

    console.log(`✅ PURGED ${result.count} PRODUCTS.`);
    */

    console.log("\n🛑 SAFETY MODE: View the list above. To delete, uncomment the code block in the script.");
}

cleanupGhosts()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());