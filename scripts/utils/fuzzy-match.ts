// scripts/utils/fuzzy-match.ts

// Normalize text: remove special chars, lowercase, remove common "filler" words
function normalize(str: string): string {
    return str
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '') // Remove symbols like - ( ) [ ]
        .replace(/\s+/g, ' ')        // Collapse spaces
        .replace(/\b(vst|plugin|software|download|edition|bundle)\b/g, '') // Remove filler
        .trim(); 
}

// Calculate Levenshtein Distance (How many edits to turn String A into String B)
function levenshteinDistance(a: string, b: string): number {
    const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));

    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,      // deletion
                matrix[i][j - 1] + 1,      // insertion
                matrix[i - 1][j - 1] + cost // substitution
            );
        }
    }
    return matrix[a.length][b.length];
}

export function getSimilarity(s1: string, s2: string): number {
    const a = normalize(s1);
    const b = normalize(s2);
    
    // FIX: Only allow partial inclusion if the shorter term is specific enough (>= 4 chars)
    // Prevents matching "Pro" with "Logic Pro" or "Go" with "Godzilla"
    const minLen = Math.min(a.length, b.length);
    
    if (minLen >= 4 && (a.includes(b) || b.includes(a))) {
        return 0.95; 
    }

    const distance = levenshteinDistance(a, b);
    const maxLength = Math.max(a.length, b.length);
    
    if (maxLength === 0) return 1.0;
    
    return 1.0 - distance / maxLength;
}