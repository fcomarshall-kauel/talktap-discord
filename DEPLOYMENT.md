# 🚀 Vercel Deployment Guide

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Discord Application**: Set up at [Discord Developer Portal](https://discord.com/developers/applications)

## Step 1: Prepare Your Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Add these redirect URIs:
   - `https://basta-letter-dash.vercel.app/api/discord/oauth`
   - `https://basta-letter-dash.vercel.app`

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow the prompts:
# - Link to existing project or create new
# - Set project name
# - Confirm deployment
```

### Option B: Deploy via GitHub
1. Push your code to GitHub
2. Connect your GitHub repo to Vercel
3. Vercel will auto-deploy

## Step 3: Configure Environment Variables

In your Vercel project dashboard:

1. Go to **Settings** → **Environment Variables**
2. Add these variables:
   ```
   NEXT_PUBLIC_DISCORD_CLIENT_ID=1401020371154636841
   DISCORD_CLIENT_SECRET=your_discord_client_secret_here
   ```

## Step 4: Update URLs

After deployment, update these files with your actual Vercel URL:

1. **activity.json**: ✅ Updated with `basta-letter-dash.vercel.app`
2. **Discord Developer Portal**: Update redirect URIs with `basta-letter-dash.vercel.app`

## Step 5: Test Your Discord Activity

1. Go to a Discord voice channel
2. Click the **Activities** button
3. Look for "Basta!" in the list
4. Launch the activity

## Troubleshooting

### Common Issues:

1. **CORS Errors**: Check that your Discord redirect URIs match exactly
2. **Environment Variables**: Ensure they're set in Vercel dashboard
3. **API Routes**: Verify `/api/discord/oauth` endpoint works

### Debug Commands:
```bash
# Test API locally
curl -X POST http://localhost:3000/api/discord/oauth \
  -H "Content-Type: application/json" \
  -d '{"code":"test","client_id":"1401020371154636841"}'

# Check Vercel logs
vercel logs
```

## File Structure for Vercel

```
your-project/
├── api/                    # Serverless functions
│   ├── discord/
│   │   ├── oauth.js       # Discord OAuth
│   │   └── user/[userId].js # User info
│   └── activity/
│       └── metadata.js     # Activity metadata
├── src/                    # React app
├── vercel.json            # Vercel config
├── activity.json          # Discord Activity manifest
└── package.json
```

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_DISCORD_CLIENT_ID` | Discord Application ID | ✅ |
| `DISCORD_CLIENT_SECRET` | Discord Application Secret | ✅ |

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [Discord Activities Guide](https://discord.com/developers/docs/activities/building-an-activity)
- [Discord Developer Portal](https://discord.com/developers/applications) 