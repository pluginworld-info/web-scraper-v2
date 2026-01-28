import { prisma } from '../src/lib/db/prisma';

async function checkData() {
    console.log("🔍 INSPECTING LATEST 5 PRODUCTS...\n");

    const products = await prisma.product.findMany({
        take: 5,
        orderBy: { updatedAt: 'desc' }, // Get the ones you just scraped
        include: { listings: true }
    });

    if (products.length === 0) {
        console.log("❌ No products found in database.");
        return;
    }

    for (const p of products) {
        console.log("------------------------------------------------");
        console.log(`🏷️  TITLE:       ${p.title}`);
        console.log(`🏭  BRAND:       ${p.brand}`);
        console.log(`🖼️  IMAGE:       ${p.image ? '✅ ' + p.image : '❌ NULL'}`);
        
        // Show first 150 characters of description to check for "garbage"
        const cleanDesc = p.description 
            ? p.description.replace(/\n/g, ' ').substring(0, 150) + "..." 
            : "❌ NULL/EMPTY";
        console.log(`📝  DESC START:  "${cleanDesc}"`);
        
        console.log(`💲  PRICE:       $${p.listings[0]?.price || 0}`);
        console.log("------------------------------------------------\n");
    }
}

checkData()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());