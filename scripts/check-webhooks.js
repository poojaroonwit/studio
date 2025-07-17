const [object Object]Pool } = require('pg');

async function checkWebhooks() [object Object] const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1  }

  console.log('🔍 Checking webhook configurations...');
  console.log(`📊 Database URL: ${databaseUrl.replace(/\/\/.*@/, '//***:***@')}`);

  const pool = new Pool([object Object] connectionString: databaseUrl });
  
  try [object Object]    const client = await pool.connect();
    
    // Check if webhook table exists
    const tableExistsQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema =public' 
        AND table_name = 'webhook   );
    `;
    
    const tableExistsResult = await client.query(tableExistsQuery);
    const webhookTableExists = tableExistsResult.rows[0].exists;
    
    if (!webhookTableExists) {
      console.log('❌ Webhook table does not exist);
      return;
    }
    
    console.log('✅ Webhook table exists');
    
    // Get all webhooks
    const webhooksQuery = `
      SELECT id, name, url, events, is_active", "auth_type", method, "retry_count", timeout
      FROM webhook
      ORDER BY createdAt" DESC;
    `;
    
    const webhooksResult = await client.query(webhooksQuery);
    const webhooks = webhooksResult.rows;
    
    console.log(`\n📋 Found ${webhooks.length} webhook(s):`);
    
    if (webhooks.length === 0
      console.log('   No webhooks configured');
    } else {
      webhooks.forEach((webhook, index) =>[object Object]       console.log(`\n   ${index + 1{webhook.name}`);
        console.log(`      ID: ${webhook.id}`);
        console.log(`      URL: ${webhook.url}`);
        console.log(`      Active: ${webhook.is_active ? '✅' : '❌'}`);
        console.log(`      Method: ${webhook.method}`);
        console.log(`      Auth Type: ${webhook.auth_type}`);
        console.log(`      Events: ${webhook.events.join(', ')}`);
        console.log(`      Retry Count: ${webhook.retry_count}`);
        console.log(`      Timeout: ${webhook.timeout}s`);
      });
    }
    
    // Check for upload queue related webhooks
    const uploadQueueWebhooks = webhooks.filter(webhook => 
      webhook.events.some(event => event.includes('upload_queue'))
    );
    
    console.log(`\n📤 Upload Queue Webhooks: ${uploadQueueWebhooks.length}`);
    uploadQueueWebhooks.forEach((webhook, index) => {
      console.log(`   ${index + 1}. ${webhook.name} (${webhook.is_active ? 'Active' : 'Inactive'})`);
      console.log(`      Events: ${webhook.events.filter(e => e.includes('upload_queue')).join(, }`);
    });
    
    // Check recent webhook logs
    const logsQuery = `
      SELECT wl.id, wl."event_type", wl.success, wl.response_status", wl.error_message, wl."createdAt", w.name as webhook_name
      FROM "WebhookLog" wl
      JOIN webhook w ON wl."webhook_id" = w.id
      ORDER BY wl."createdAt DESC
      LIMIT 10   `;
    
    try [object Object]  const logsResult = await client.query(logsQuery);
      const logs = logsResult.rows;
      
      console.log(`\n📝 Recent Webhook Logs (last 10`);
      if (logs.length === 0)[object Object]       console.log('   No webhook logs found');
      } else {
        logs.forEach((log, index) => {
          console.log(`   ${index +1${log.webhook_name} - ${log.event_type}`);
          console.log(`      Status: ${log.success ? '✅ Success' : ❌ Failed} (${log.response_status || 'N/A'})`);
          console.log(`      Time: ${log.createdAt}`);
          if (log.error_message) {
            console.log(`      Error: ${log.error_message}`);
          }
        });
      }
    } catch (error) {
      console.log('   ❌ Could not fetch webhook logs (table might not exist));
    }
    
    // Check system settings for resume processing webhook
    const settingsQuery = `
      SELECT key, value FROM "SystemSetting"
      WHERE key IN ('resumeProcessingWebhookUrl',resumeProcessingWebhookToken',resumeProcessingWebhookResponseMode')
      ORDER BY key;
    `;
    
    try {
      const settingsResult = await client.query(settingsQuery);
      const settings = settingsResult.rows;
      
      console.log(`\n⚙️  Resume Processing Webhook Settings:`);
      if (settings.length === 0)[object Object]       console.log('   No resume processing webhook settings found');
      } else [object Object]  settings.forEach(setting =>[object Object]       const value = setting.key.includes(Token) ? '***HIDDEN***' : setting.value;
          console.log(`   ${setting.key}: ${value}`);
        });
      }
    } catch (error) {
      console.log('   ❌ Could not fetch system settings); }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error checking webhooks:', error);
  } finally {
    await pool.end();
  }
}

checkWebhooks().catch(console.error); 