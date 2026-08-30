const { createClerkClient } = require('@clerk/backend');
const fs = require('fs');
const path = require('path');

async function testAdminBackend() {
  console.log('🧪 Testing lexino-admin backend functions...\n');

  const envPath = path.join(__dirname, '../../lexino-admin/.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ lexino-admin/.env.local missing');
    process.exit(1);
  }
  const envContent = fs.readFileSync(envPath, 'utf8');
  let clerkKey = '';
  envContent.split('\n').forEach(l => {
    if (l.startsWith('CLERK_SECRET_KEY=')) clerkKey = l.split('=')[1].trim();
  });

  const clerk = createClerkClient({ secretKey: clerkKey });
  const totalCount = await clerk.users.getCount();
  console.log('✅ lexino-admin Clerk total count:', totalCount);

  const usersListRes = await clerk.users.getUserList({ limit: 10 });
  const users = usersListRes.data || usersListRes;
  console.log('✅ lexino-admin Clerk user list count:', users.length);

  console.log('🎉 lexino-admin backend verified!');
}

testAdminBackend();
