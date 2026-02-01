import { prisma } from '../../src/lib/db/prisma';
import { getSimilarity } from '../utils/fuzzy-match';

async function checkDatabaseHealth() {
    console.log(`🏥 STARTING DATABASE HEALTH CHECK...`);
    
    // 1. FETCH ALL PRODUCTS
    const products = await prisma.product.findMany({
        include: {
            listings: true
        }
    });

    console.log(`   📊 Total Products Scanned: ${products.length}`);
    console.log(`   -------------------------------------------------`);

    // 2. CHECK FOR DUPLICATES (Fuzzy Title Match)
    console.log(`   🔍 Scanning for Potential Duplicates...`);
    let potentialDupes = 0;
    const checkedIds = new Set<string>();

    for (let i = 0; i < products.length; i++) {
        for (let j = i + 1; j < products.length; j++) {
            const p1 = products[i];
            const p2 = products[j];

            if (checkedIds.has(p1.id) || checkedIds.has(p2.id)) continue;

            // Strict Similarity Check (Title)
            // If brands match (or are unknown) AND titles are super similar
            const brandMatch = p1.brand === p2.brand || p1.brand === "Unknown" || p2.brand === "Unknown";
            const simScore = getSimilarity(p1.title.toLowerCase(), p2.title.toLowerCase());

            if (brandMatch && simScore > 0.90) {
                console.log(`      ⚠️  POSSIBLE DUPLICATE FOUND:`);
                console.log(`          1. [${p1.id}] ${p1.title} ($${p1.listings[0]?.price || 0})`);
                console.log(`          2. [${p2.id}] ${p2.title} ($${p2.listings[0]?.price || 0})`);
                console.log(`          -> Similarity: ${(simScore * 100).toFixed(1)}%`);
                potentialDupes++;
                checkedIds.add(p1.id); // Skip checking this ID again to reduce noise
            }
        }
    }

    if (potentialDupes === 0) console.log(`      ✅ No obvious title duplicates found.`);
    console.log(`   -------------------------------------------------`);

    // 3. CHECK FOR ORPHANS (Products with NO Listings)
    console.log(`   👻 Scanning for Ghost Products (0 Listings)...`);
    const orphans = products.filter(p => p.listings.length === 0);
    
    if (orphans.length > 0) {
        console.log(`      ❌ Found ${orphans.length} Orphaned Products (No price/url linked):`);
        orphans.slice(0, 5).forEach(p => console.log(`          - ${p.title} (ID: ${p.id})`));
        if (orphans.length > 5) console.log(`          ... and ${orphans.length - 5} more.`);
    } else {
        console.log(`      ✅ All products have at least one valid listing.`);
    }
    console.log(`   -------------------------------------------------`);

    // 4. DATA QUALITY AUDIT
    console.log(`   🧠 Checking Data Quality...`);
    
    const missingBrand = products.filter(p => p.brand === "Unknown" || !p.brand);
    const missingImage = products.filter(p => !p.image);
    const badDescription = products.filter(p => !p.description || p.description === "No description available");
    const zeroPrice = products.filter(p => p.listings.some(l => l.price === 0));

    console.log(`      🏷️  Missing Brand:       ${missingBrand.length}  (${((missingBrand.length/products.length)*100).toFixed(1)}%)`);
    console.log(`      🖼️  Missing Image:       ${missingImage.length}  (${((missingImage.length/products.length)*100).toFixed(1)}%)`);
    console.log(`      📝  Bad Description:     ${badDescription.length}  (${((badDescription.length/products.length)*100).toFixed(1)}%)`);
    console.log(`      💲  Zero Price (Free?):  ${zeroPrice.length}`);

    console.log(`   -------------------------------------------------`);
    console.log(`   🏁 CHECK COMPLETE.`);
}

checkDatabaseHealth()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());