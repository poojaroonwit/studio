#!/usr/bin/env node

/**
 * Disable Problematic Webhooks
 * 
 * This script disables webhooks that are using old/incorrect URLs.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function disableProblematicWebhooks() {
  try {
    console.log('🔍 Checking for problematic webhooks...');
    
    // Find webhooks with problematic URLs
    const problematicWebhooks = await prisma.webhook.findMany({
      where: {
        OR: [
          {
            url: {
              contains: 'ncc-dify.qsncc.com'
            }
          },
          {
            url: {
              contains: 'dify.qsncc.com'
            }
          },
          {
            url: {
              contains: 'qsncc.com'
            }
          }
        ]
      }
    });

    if (problematicWebhooks.length === 0) {
      console.log('✅ No problematic webhooks found');
      return;
    }

    console.log(`⚠️  Found ${problematicWebhooks.length} problematic webhook(s):`);
    
    for (const webhook of problematicWebhooks) {
      console.log(`   - ID: ${webhook.id}`);
      console.log(`   - Name: ${webhook.name}`);
      console.log(`   - URL: ${webhook.url}`);
      console.log(`   - Active: ${webhook.is_active}`);
      console.log(`   - Events: ${webhook.events.join(', ')}`);
      console.log('');
    }

    // Disable all problematic webhooks
    const updateResult = await prisma.webhook.updateMany({
      where: {
        OR: [
          {
            url: {
              contains: 'ncc-dify.qsncc.com'
            }
          },
          {
            url: {
              contains: 'dify.qsncc.com'
            }
          },
          {
            url: {
              contains: 'qsncc.com'
            }
          }
        ]
      },
      data: {
        is_active: false
      }
    });

    console.log(`✅ Disabled ${updateResult.count} problematic webhook(s)`);
    
    // Show remaining active webhooks
    const activeWebhooks = await prisma.webhook.findMany({
      where: {
        is_active: true
      }
    });

    if (activeWebhooks.length === 0) {
      console.log('ℹ️  No active webhooks remaining');
    } else {
      console.log(`ℹ️  ${activeWebhooks.length} active webhook(s) remaining:`);
      for (const webhook of activeWebhooks) {
        console.log(`   - ${webhook.name}: ${webhook.url}`);
      }
    }

  } catch (error) {
    console.error('❌ Error disabling problematic webhooks:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
disableProblematicWebhooks(); 