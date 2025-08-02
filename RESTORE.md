# 🚀 Restore Environment - Talk Tap Discord

## Quick Setup After Deleting Local Files

### 1. Clone Repository
```bash
git clone https://github.com/fcomarshall-kauel/talk-tap-discord.git
cd talk-tap-discord
git checkout discord
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Create `.env` file:
```env
NEXT_PUBLIC_DISCORD_CLIENT_ID=1401020371154636841
DISCORD_CLIENT_SECRET=9dDZ-EcA-BTuI-pJety0nxr9H556AeKB
NEXT_PUBLIC_SERVER_URL=https://talktap-discord.vercel.app
```

### 4. Vercel Deployment
- Connect repository to Vercel
- Set environment variables in Vercel dashboard
- Deploy to: `talktap-discord.vercel.app`

### 5. Discord Configuration
Update Discord Developer Portal:
- Redirect URIs: `https://talktap-discord.vercel.app/api/discord/oauth`
- Activity URL: `https://talktap-discord.vercel.app`

### 6. Update activity.json
```json
{
  "url": "https://talktap-discord.vercel.app"
}
```

### 7. Run Locally
```bash
npm run dev
```

---
**Repository**: https://github.com/fcomarshall-kauel/talk-tap-discord  
**Deployment**: https://talktap-discord.vercel.app 