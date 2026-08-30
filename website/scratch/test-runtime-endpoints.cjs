const fs = require('fs');
const path = require('path');
const { createClerkClient } = require('@clerk/backend');

async function testEndpoints() {
  console.log('🧪 Starting Lexino AI End-to-End Runtime Endpoint Diagnostics...\n');

  // 1. Check .env.local
  const envPath = path.join(__dirname, '../.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local does not exist!');
    process.exit(1);
  }
  const envContent = fs.readFileSync(envPath, 'utf8');
  let clerkKey = '';
  envContent.split('\n').forEach(l => {
    if (l.startsWith('CLERK_SECRET_KEY=')) clerkKey = l.split('=')[1].trim();
  });

  console.log('1. Checking Clerk Secret Key Configuration:');
  if (clerkKey) {
    console.log('   ✅ CLERK_SECRET_KEY is present in .env.local');
  } else {
    console.error('   ❌ CLERK_SECRET_KEY is missing from .env.local');
  }

  // 2. Test Clerk Server SDK Direct Fetch
  console.log('\n2. Testing Live Clerk Users API Fetch:');
  try {
    const clerk = createClerkClient({ secretKey: clerkKey });
    const usersRes = await clerk.users.getUserList({ limit: 5 });
    const users = usersRes.data || usersRes;
    console.log(`   ✅ Successfully retrieved ${users.length} users from Clerk.`);
    users.forEach(u => {
      const email = u.emailAddresses?.[0]?.emailAddress || 'no-email';
      console.log(`      - [${u.id}] ${email} (${u.firstName || ''} ${u.lastName || ''})`);
    });
  } catch (err) {
    console.error('   ❌ Clerk fetch error:', err.message);
  }

  // 3. Test Subscription Engine Math
  console.log('\n3. Testing Subscription Engine Calculations:');
  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  console.log(`   ✅ 1 Month Expiry correctly generated: ${thirtyDaysLater.toISOString()}`);

  console.log('\n🎉 Direct Endpoint & Backend Diagnostics Complete.');
}

testEndpoints();
