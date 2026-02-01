const axios = require('axios');

// Your Official Target List
const sites = [
    { name: 'Plugin Boutique',    domain: 'https://www.pluginboutique.com' },
    { name: 'Plugin Alliance',    domain: 'https://www.plugin-alliance.com' },
    { name: 'Sweetwater',         domain: 'https://www.sweetwater.com' },
    { name: 'AudioDeluxe',        domain: 'https://www.audiodeluxe.com' },
    { name: 'JRR Shop',           domain: 'https://www.jrrshop.com' },
    { name: 'Thomann',            domain: 'https://www.thomann.de' },
    { name: 'ADSR Sounds',        domain: 'https://www.adsrsounds.com' },
    { name: 'PluginFox',          domain: 'https://pluginfox.co' },
    { name: 'Audio Plugin Deals', domain: 'https://audioplugindeals.com' },
    { name: 'KVR Audio',          domain: 'https://www.kvraudio.com' }, // Marketplace is a subpath
    { name: 'Best Service',       domain: 'https://www.bestservice.com' },
    { name: 'VstBuzz',            domain: 'https://vstbuzz.com' }
];

async function checkRobotsTxt() {
    console.log("\n🕵️  SCANNING ROBOTS.TXT COMPLIANCE...\n");
    console.log("--------------------------------------------------------------------------------------");
    console.log(`| ${"SITE NAME".padEnd(20)} | ${"STATUS".padEnd(10)} | ${"DETAILS (Rules for '*')".padEnd(45)} |`);
    console.log("--------------------------------------------------------------------------------------");

    for (const site of sites) {
        try {
            const url = `${site.domain}/robots.txt`;
            // We use a polite User-Agent so they know we are just checking rules
            const response = await axios.get(url, {
                timeout: 8000,
                headers: { 'User-Agent': 'ComplianceCheckBot/1.0 (Checking-Permissions)' }
            });

            const rules = parseRobotsTxt(response.data);
            let statusIcon = "✅ OPEN";
            let details = "Allowed";

            // Logic to determine status
            if (rules.isFullBlock) {
                statusIcon = "❌ BLOCKED";
                details = "Disallow: / (Everything blocked)";
            } else if (rules.disallowed.length > 0) {
                statusIcon = "⚠️ MIXED";
                // Show first 2 disallowed paths
                details = `Blocked: ${rules.disallowed.slice(0, 2).join(', ')}...`;
            }

            if (rules.crawlDelay) {
                details += ` | 🐢 Delay: ${rules.crawlDelay}s`;
            }

            console.log(`| ${site.name.padEnd(20)} | ${statusIcon.padEnd(10)} | ${details.padEnd(45)} |`);

        } catch (error) {
            let errDetail = "Could not fetch robots.txt";
            if (error.response && error.response.status === 404) errDetail = "No robots.txt found (Assumed Open)";
            console.log(`| ${site.name.padEnd(20)} | ❓ ERROR   | ${errDetail.padEnd(45)} |`);
        }
    }
    console.log("--------------------------------------------------------------------------------------");
}

function parseRobotsTxt(text) {
    const lines = text.split('\n');
    let isRelevantAgent = false;
    const disallowed = [];
    let crawlDelay = null;
    let isFullBlock = false;

    for (const line of lines) {
        const cleanLine = line.trim();
        if (!cleanLine || cleanLine.startsWith('#')) continue;

        const parts = cleanLine.split(':');
        const key = parts[0].trim().toLowerCase();
        const value = parts.slice(1).join(':').trim();

        if (key === 'user-agent') {
            // Check if this block applies to ALL bots (*)
            isRelevantAgent = value === '*';
        } else if (isRelevantAgent) {
            if (key === 'disallow') {
                if (value === '/' || value === '/*') isFullBlock = true;
                if (value.length > 1) disallowed.push(value); // Ignore empty disallows
            }
            if (key === 'crawl-delay') {
                crawlDelay = value;
            }
        }
    }
    return { disallowed, crawlDelay, isFullBlock };
}

checkRobotsTxt();