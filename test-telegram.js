/**
 * Telegram Bot Test Script
 * ========================
 * Run this to verify your Telegram bot is configured correctly
 * 
 * Usage:
 *   TG_BOT_TOKEN=your_token TG_CHAT_ID=your_chat_id node test-telegram.js
 */

const BOT_TOKEN = process.env.TG_BOT_TOKEN;
const CHAT_ID = process.env.TG_CHAT_ID;

if (!BOT_TOKEN || !CHAT_ID) {
  console.error('❌ Error: Missing environment variables');
  console.error('   Required: TG_BOT_TOKEN and TG_CHAT_ID');
  console.error('');
  console.error('   Usage:');
  console.error('   TG_BOT_TOKEN=your_token TG_CHAT_ID=your_chat_id node test-telegram.js');
  process.exit(1);
}

const TELEGRAM_API = 'https://api.telegram.org';

async function testBot() {
  console.log('Testing Telegram Bot Configuration...\n');
  
  // Test 1: Get bot info
  console.log('1. Testing bot token...');
  try {
    const response = await fetch(`${TELEGRAM_API}/bot${BOT_TOKEN}/getMe`);
    const data = await response.json();
    
    if (data.ok) {
      console.log('   ✅ Bot token is valid');
      console.log(`   Bot Name: ${data.result.first_name}`);
      console.log(`   Bot Username: @${data.result.username}`);
    } else {
      console.error('   ❌ Bot token is invalid');
      console.error(`   Error: ${data.description}`);
      process.exit(1);
    }
  } catch (err) {
    console.error('   ❌ Failed to connect to Telegram API');
    console.error(`   Error: ${err.message}`);
    process.exit(1);
  }
  
  // Test 2: Send test message
  console.log('\n2. Testing chat ID...');
  try {
    const response = await fetch(`${TELEGRAM_API}/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: '✅ <b>Test Message</b>\n\nYour Telegram bot is configured correctly for LumenicData applications!',
        parse_mode: 'HTML'
      })
    });
    
    const data = await response.json();
    
    if (data.ok) {
      console.log('   ✅ Chat ID is valid');
      console.log('   ✅ Test message sent successfully');
      console.log(`   Message ID: ${data.result.message_id}`);
    } else {
      console.error('   ❌ Failed to send message');
      console.error(`   Error: ${data.description}`);
      console.error('\n   Common issues:');
      console.error('   - Bot is not a member of the group/channel');
      console.error('   - Chat ID is incorrect (should include the - sign for groups)');
      console.error('   - Bot was blocked by user');
      process.exit(1);
    }
  } catch (err) {
    console.error('   ❌ Failed to send test message');
    console.error(`   Error: ${err.message}`);
    process.exit(1);
  }
  
  console.log('\n✅ All tests passed! Your Telegram bot is ready.');
  console.log('\nNext steps:');
  console.log('1. Set these environment variables in Vercel:');
  console.log(`   TG_BOT_TOKEN=${BOT_TOKEN.substring(0, 15)}...`);
  console.log(`   TG_CHAT_ID=${CHAT_ID}`);
  console.log('2. Deploy your application');
  console.log('3. Test the form submission');
}

testBot();
