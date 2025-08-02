import fetch from 'node-fetch'; 


export class DiscordAuth {
  constructor() {
    this.clientSecret = process.env.DISCORD_CLIENT_SECRET;
    if (!this.clientSecret) {
      console.warn('DISCORD_CLIENT_SECRET not found, using fallback for development');
      this.clientSecret = 'YOUR_DISCORD_CLIENT_SECRET'; // This should be set in production
    }
  }

  async exchangeCodeForToken(code, clientId, redirectUri = null) {
    try {
      console.log('Exchanging Discord OAuth code for access token...');

      const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: this.clientSecret,
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri || 'https://talktap-discord.vercel.app/api/discord/oauth',
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        console.error('Token exchange failed:', errorData);
        throw new Error(`Failed to exchange code for token: ${errorData}`);
      }

      const tokenData = await tokenResponse.json();
      console.log('Token exchange successful');

      // Get user information using the access token
      const userResponse = await fetch('https://discord.com/api/users/@me', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
        },
      });

      if (!userResponse.ok) {
        const errorData = await userResponse.text();
        console.error('Failed to fetch user data:', errorData);
        throw new Error(`Failed to fetch user data: ${errorData}`);
      }

      const userData = await userResponse.json();
      console.log('User data fetched successfully:', userData.username);

      // Return both token and user data
      return {
        access_token: tokenData.access_token,
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in,
        refresh_token: tokenData.refresh_token,
        scope: tokenData.scope,
        user: {
          id: userData.id,
          username: userData.username,
          discriminator: userData.discriminator,
          avatar: userData.avatar,
          global_name: userData.global_name,
        }
      };

    } catch (error) {
      console.error('Error in Discord auth:', error);
      throw error;
    }
  }

  async getUser(userId, authorization) {
    try {
      const response = await fetch(`https://discord.com/api/users/${userId}`, {
        headers: {
          'Authorization': authorization,
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to fetch user: ${errorData}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  }

  async refreshToken(refreshToken, clientId) {
    try {
      const response = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: this.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to refresh token: ${errorData}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw error;
    }
  }
} 