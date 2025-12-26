// scripts/seedAds.ts - Seed demo ads for testing
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedAds() {
  console.log('🌱 Seeding demo ads...');

  try {
    // Check if ads already exist
    const existingAds = await prisma.ad.count();
    if (existingAds > 0) {
      console.log(`✅ ${existingAds} ads already exist. Skipping seed.`);
      return;
    }

    // Create demo ads
    const ads = [
      {
        advertiser: 'DemoCorp',
        title: 'Sponsor - Boost Your Project',
        description: 'Get 2x more reach, sponsor this hack demo. Build amazing projects with our tools.',
        imageUrl: 'https://via.placeholder.com/300x200?text=DemoCorp+Ad',
        targetTags: ['dev', 'web3'],
        url: 'https://example.com',
        budget: 10.0,
        active: true,
      },
      {
        advertiser: 'Web3 Builder',
        title: 'Build on Very Chain',
        description: 'Deploy your smart contracts on Very Chain. Fast, cheap, and developer-friendly.',
        imageUrl: 'https://via.placeholder.com/300x200?text=Web3+Builder',
        targetTags: ['web3', 'blockchain'],
        url: 'https://verylabs.io',
        budget: 25.0,
        active: true,
      },
      {
        advertiser: 'DevTools Pro',
        title: 'Supercharge Your Development',
        description: 'The best tools for modern developers. Try free for 30 days.',
        imageUrl: 'https://via.placeholder.com/300x200?text=DevTools+Pro',
        targetTags: ['dev', 'tools'],
        url: 'https://example.com/devtools',
        budget: 15.0,
        active: true,
      },
    ];

    for (const adData of ads) {
      const ad = await prisma.ad.create({
        data: adData,
      });
      console.log(`✅ Created ad: ${ad.title} (${ad.id})`);
    }

    console.log(`✅ Successfully seeded ${ads.length} demo ads!`);
  } catch (error) {
    console.error('❌ Error seeding ads:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedAds()
    .then(() => {
      console.log('✅ Seed completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seed failed:', error);
      process.exit(1);
    });
}

export default seedAds;

