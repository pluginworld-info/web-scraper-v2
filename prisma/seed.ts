import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // The 12 targets you mentioned
  const retailers = [
    { name: 'Plugin Boutique', domain: 'pluginboutique.com' },
    { name: 'Plugin Alliance', domain: 'plugin-alliance.com' },
    { name: 'Sweetwater', domain: 'sweetwater.com' },
    { name: 'AudioDeluxe', domain: 'audiodeluxe.com' },
    { name: 'JRR Shop', domain: 'jrrshop.com' },
    { name: 'Thomann', domain: 'thomann.de' },
    { name: 'ADSR Sounds', domain: 'adsrsounds.com' },
    { name: 'PluginFox', domain: 'pluginfox.co' },
    { name: 'Audio Plugin Deals', domain: 'audioplugindeals.com' },
    { name: 'KVR Marketplace', domain: 'kvraudio.com' },
    { name: 'Best Service', domain: 'bestservice.com' },
    { name: 'VstBuzz', domain: 'vstbuzz.com' },
  ];

  for (const r of retailers) {
    await prisma.retailer.upsert({
      where: { name: r.name },
      update: {}, // If it exists, do nothing
      create: {
        name: r.name,
        domain: r.domain,
        scrapeDelay: 5000, // Default 5s delay for safety
        isEnabled: true,
      },
    });
  }

  console.log('✅ 12 Retailers seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });