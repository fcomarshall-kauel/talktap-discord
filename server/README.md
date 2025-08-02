# Discord Activity Server

This server handles Discord OAuth authentication and API calls for the Basta! Discord Activity.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment variables:**
   Copy `env.example` to `.env` and fill in your Discord application credentials:
   ```bash
   cp env.example .env
   ```

3. **Discord Application Setup:**
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Create a new application or use existing one
   - Get your `CLIENT_ID` and `CLIENT_SECRET`
   - Add redirect URI: `https://your-domain.com/api/discord/oauth`

## Development

Start the server in development mode:
```bash
npm run dev
```

The server will run on `http://localhost:3001`

## API Endpoints

- `GET /health` - Health check
- `POST /api/discord/oauth` - Discord OAuth token exchange
- `GET /api/discord/user/:userId` - Get Discord user info
- `GET /api/activity/metadata` - Activity metadata for Discord

## Production Deployment

1. Set environment variables for production
2. Build the client: `npm run build` (from root)
3. Start the server: `npm start`

The server will serve the built client files in production.

## Discord Activity Configuration

Update `activity.json` in the root directory with your domain and application ID. 