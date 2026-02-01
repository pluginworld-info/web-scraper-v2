import { getSimilarity } from '../../scripts/utils/fuzzy-match';

// --- HELPERS ---
const extractVersion = (text: string): string | null => {
    // Finds numbers like " 5", " v3.5", " 2.0"
    const match = text.match(/\bv?(\d+(\.\d+)?)\b/);
    return match ? match[1] : null;
};

const checkVersionMismatch = (titleA: string, titleB: string): boolean => {
    const vA = extractVersion(titleA);
    const vB = extractVersion(titleB);
    // If both have versions and they differ, it's a mismatch (e.g. "Total Studio 5" != "Total Studio 3.5")
    if (vA && vB && vA !== vB) return true;
    return false;
};

const cleanTitleString = (title: string, brand: string) => {
    let clean = title.toLowerCase();
    if (brand && brand !== "Unknown") clean = clean.replace(brand.toLowerCase(), '').trim();
    return clean.replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
};

/**
 * THE 3-LAYER MATCHING LOGIC
 * 1. Exact Match
 * 2. Version Guard (Strict Barrier)
 * 3. Brand-Gated Fuzzy Match
 */
export const findBestMatch = (scrapedTitle: string, scrapedBrand: string, dbProducts: any[]) => {
    const cleanScraped = cleanTitleString(scrapedTitle, scrapedBrand);
    let bestMatch = null;
    let bestScore = 0;

    for (const p of dbProducts) {
        // 🚨 LAYER 1: VERSION GUARD
        if (checkVersionMismatch(scrapedTitle, p.title)) continue;

        const cleanDB = cleanTitleString(p.title, p.brand || "");
        
        // 🚨 LAYER 2: EXACT MATCH
        if (cleanScraped === cleanDB) return { product: p, score: 1.0, method: "Exact" };

        // 🚨 LAYER 3: BRAND-GATED FUZZY
        let isBrandSafe = false;
        if (scrapedBrand === "Unknown" || !p.brand || p.brand === "Unknown") isBrandSafe = true;
        else if (scrapedBrand.toLowerCase() === p.brand.toLowerCase()) isBrandSafe = true;

        if (isBrandSafe) {
            const fuzzyScore = getSimilarity(cleanScraped, cleanDB);
            if (fuzzyScore > bestScore) { bestScore = fuzzyScore; bestMatch = p; }
        }
    }

    if (bestScore > 0.85) return { product: bestMatch, score: bestScore, method: "Fuzzy" };
    return null;
};