#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Setting up environment variables for Discord Activity...\n');

// Check if .env files exist
const clientEnvPath = path.join(__dirname, '.env');
const serverEnvPath = path.join(__dirname, 'server', '.env');

const clientEnvExists = fs.existsSync(clientEnvPath);
const serverEnvExists = fs.existsSync(serverEnvPath);

console.log('📁 Environment files status:');
console.log(`   Client .env: ${clientEnvExists ? '✅ Exists' : '❌ Missing'}`);
console.log(`   Server .env: ${serverEnvExists ? '✅ Exists' : '❌ Missing'}\n`);

if (!clientEnvExists) {
  console.log('📝 Creating client .env file...');
  const clientEnvContent = `# Discord Application Configuration
NEXT_PUBLIC_DISCORD_CLIENT_ID=YOUR_DISCORD_CLIENT_ID_HERE

# Server Configuration
NEXT_PUBLIC_SERVER_URL=http://localhost:3001
NEXT_PUBLIC_PRODUCTION_URL=https://your-domain.com
`;
  fs.writeFileSync(clientEnvPath, clientEnvContent);
  console.log('✅ Client .env created');
}

if (!serverEnvExists) {
  console.log('📝 Creating server .env file...');
  const serverEnvContent = `# Discord Application Configuration
DISCORD_CLIENT_ID=YOUR_DISCORD_CLIENT_ID_HERE
DISCORD_CLIENT_SECRET=YOUR_DISCORD_CLIENT_SECRET

# Server Configuration
PORT=3001
NODE_ENV=development

# Client URL (for CORS)
CLIENT_URL=http://localhost:5173

# Production URL (when deployed)
PRODUCTION_URL=https://your-domain.com
`;
  fs.writeFileSync(serverEnvPath, serverEnvContent);
  console.log('✅ Server .env created');
}

console.log('\n🎯 Next steps:');
console.log('1. Get your Discord Client ID and Secret from:');
console.log('   https://discord.com/developers/applications');
console.log('2. Update the .env files with your credentials');
console.log('3. Run: npm run dev:full');
console.log('\n📚 For more info, see:');
console.log('   - server/README.md');
console.log('   - https://discord.com/developers/docs/activities/building-an-activity'); 