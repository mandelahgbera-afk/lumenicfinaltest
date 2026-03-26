/**
 * Telegram Bot Test Script
 * ========================
 * Run this BEFORE deploying to verify your bot works
 * 
 * Usage:
 *   TG_BOT_TOKEN=your_token TG_CHAT_ID=your_chat_id node test-bot.js
 */

const BOT_TOKEN = process.env.TG_BOT_TOKEN;
const CHAT_ID = process.env.TG_CHAT_ID;

if (!BOT_TOKEN || !CHAT_ID) {
  console.error('❌ Missing environment variables');
  console.error('');
  console.error('Usage:');
  console.error('  TG_BOT_TOKEN=your_token TG_CHAT_ID=your_chat_id node test-bot.js');
  console.error('');
  console.error('Or set them in your environment:');
  console.error('  export TG_BOT_TOKEN=your_token');
  console.error('  export TG_CHAT_ID=your_chat_id');
  process.exit(1);
}

const TELEGRAM_API = 'https://api.telegram.org';

async function test() {
  console.log('🧪 Testing Telegram Bot Configuration\n');
  
  // Test 1: Bot info
  console.log('1️⃣  Testing bot token...');
  try {
    const res = await fetch(`${TELEGRAM_API}/bot${BOT_TOKEN}/getMe`);
    const data = await res.json();
    
    if (data.ok) {
      console.log('   ✅ Bot token is valid');
      console.log(`   🤖 Bot: @${data.result.username}`);
    } else {
      console.error('   ❌ Invalid bot token');
      console.error(`   Error: ${data.description}`);
      process.exit(1);
    }
  } catch (err) {
    console.error('   ❌ Failed to connect to Telegram');
    console.error(`   Error: ${err.message}`);
    process.exit(1);
  }
  
  // Test 2: Send message
  console.log('\n2️⃣  Testing chat ID...');
  try {
    const res = await fetch(`${TELEGRAM_API}/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: '✅ <b>Test Passed!</b>\n\nYour Telegram bot is configured correctly for LumenicData applications.',
        parse_mode: 'HTML'
      })
    });
    
    const data = await res.json();
    
    if (data.ok) {
      console.log('   ✅ Chat ID is valid');
      console.log('   ✅ Test message sent');
      console.log(`   📝 Message ID: ${data.result.message_id}`);
    } else {
      console.error('   ❌ Failed to send message');
      console.error(`   Error: ${data.description}`);
      console.error('\n   Common issues:');
      console.error('   • Bot is not in the group/channel');
      console.error('   • Chat ID is incorrect (include the - for groups)');
      console.error('   • Bot was blocked');
      process.exit(1);
    }
  } catch (err) {
    console.error('   ❌ Failed to send message');
    console.error(`   Error: ${err.message}`);
    process.exit(1);
  }
  
  console.log('\n✅ All tests passed! Your bot is ready.');
  console.log('\nNext steps:');
  console.log('1. Set these environment variables in Vercel:');
  console.log(`   TG_BOT_TOKEN=${BOT_TOKEN.substring(0, 15)}...`);
  console.log(`   TG_CHAT_ID=${CHAT_ID}`);
  console.log('2. Deploy your application');
  console.log('3. Test the form submission\n');
}

test();
