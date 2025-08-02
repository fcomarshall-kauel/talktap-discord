import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { DiscordSDK } from '@discord/embedded-app-sdk'; //pios

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
  global_name?: string;
}

interface DiscordContextType {
  discordSdk: DiscordSDK | null;
  user: DiscordUser | null;
  participants: DiscordUser[];
  isHost: boolean;
  isConnected: boolean;
  error: string | null;
}

const DiscordContext = createContext<DiscordContextType | undefined>(undefined);

export const DiscordProvider = ({ children }: { children: ReactNode }) => {
  const [discordSdk, setDiscordSdk] = useState<DiscordSDK | null>(null);
  const [user, setUser] = useState<DiscordUser | null>(null);
  const [participants, setParticipants] = useState<DiscordUser[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeDiscord = async () => {
      try {
        console.log('=== DISCORD SDK INITIALIZATION START ===');
        console.log('Window parent check:', window.parent !== window);
        console.log('Hostname check:', window.location.hostname);
        console.log('User agent check:', window.navigator.userAgent);
        
        // Better Discord detection for Desktop client
        const isInDiscord = window.parent !== window || 
                           window.location.hostname.includes('discord.com') ||
                           window.navigator.userAgent.includes('Discord');
        
        console.log('Is in Discord?', isInDiscord);
        
        if (!isInDiscord) {
          console.log('Running in standalone mode (not in Discord iframe)');
          // Development mode - simulate Discord environment
          setUser({
            id: 'dev-user-1',
            username: 'DevUser',
            discriminator: '0000',
            global_name: 'Development User'
          });
          setParticipants([
            {
              id: 'dev-user-1',
              username: 'DevUser',
              discriminator: '0000',
              global_name: 'Development User'
            },
            {
              id: 'dev-user-2',
              username: 'TestUser',
              discriminator: '0001',
              global_name: 'Test User'
            }
          ]);
          setIsHost(true);
          setIsConnected(true);
          setError(null);
          return;
        }

        // Initialize Discord SDK
        console.log('Running in Discord iframe, initializing SDK...');
        const CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID || '1401020371154636841';
        const sdk = new DiscordSDK(CLIENT_ID);
        
        console.log('Waiting for SDK ready...');
        await sdk.ready();
        console.log('SDK ready!');
        setDiscordSdk(sdk);

        // Try to get user data without authorization first
        console.log('Getting Discord user data without authorization...');
        try {
          const currentUser = await sdk.commands.getUser({ id: '@me' });
          console.log('Discord user (no auth):', currentUser);
          
          if (currentUser) {
            const discordUser = {
              id: currentUser.id,
              username: currentUser.username,
              discriminator: currentUser.discriminator || '0000',
              avatar: currentUser.avatar,
              global_name: currentUser.global_name || currentUser.username
            };

            console.log('=== SETTING USER WITHOUT AUTH ===');
            setUser(discordUser);
            setParticipants([discordUser]);
            setIsHost(true);
            setIsConnected(true);
            setError(null);
            console.log('User set successfully:', discordUser);
            return; // Early return on successful auth
          }
        } catch (noAuthError) {
          console.log('Could not get user data without auth, trying authorization...');
        }

        // Authenticate with Discord OAuth (following Discord documentation exactly)
        console.log('=== STARTING DISCORD AUTHENTICATION ===');
        try {
          console.log('Calling sdk.commands.authorize...');
          const authResult = await sdk.commands.authorize({
            client_id: CLIENT_ID,
            response_type: 'code',
            state: '',
            prompt: 'none',
            scope: ['identify', 'guilds', 'applications.commands']
          });
          console.log('Authorization result:', authResult);
          const { code } = authResult;
          console.log('Got authorization code:', code ? 'YES' : 'NO');
          
          // Retrieve access_token from server (using relative URL like Discord docs)
          console.log('=== CALLING TOKEN EXCHANGE ===');
          const response = await fetch("/api/token", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              code,
            }),
          });
          
          console.log('Token exchange response status:', response.status);
          if (response.ok) {
            const { access_token } = await response.json();
            console.log('=== TOKEN EXCHANGE SUCCESS ===');
            console.log('Token exchange successful, got access_token:', access_token ? 'YES' : 'NO');
            
            // Authenticate with Discord client (using the access_token)
            const auth = await sdk.commands.authenticate({
              access_token,
            });
            console.log('Discord authentication result:', auth);

            if (auth == null) {
              throw new Error("Authenticate command failed");
            }

            // Now we can get real user data
            const currentUser = await sdk.commands.getUser({ id: '@me' });
            console.log('Authenticated Discord user:', currentUser);
            
            if (currentUser) {
              const discordUser = {
                id: currentUser.id,
                username: currentUser.username,
                discriminator: currentUser.discriminator || '0000',
                avatar: currentUser.avatar,
                global_name: currentUser.global_name || currentUser.username
              };

              console.log('=== SETTING AUTHENTICATED USER ===');
              setUser(discordUser);
              setParticipants([discordUser]);
              setIsHost(true);
              setIsConnected(true);
              setError(null);
              console.log('User set successfully:', discordUser);
              return; // Early return on successful auth
            }
          } else {
            console.error('=== TOKEN EXCHANGE FAILED ===');
            console.error('Token exchange failed with status:', response.status);
            try {
              const errorData = await response.json();
              console.error('Token exchange error data:', errorData);
            } catch (parseError) {
              console.error('Could not parse error response as JSON');
            }
          }
        } catch (authError) {
          console.error('=== AUTHORIZATION ERROR ===');
          console.log('Authorization failed, trying without auth:', authError);
        }

        // Get user data from Discord SDK
        console.log('Getting Discord user data...');
        try {
          // Try to get connected participants first
          try {
            const instanceData = await sdk.commands.getInstanceConnectedParticipants();
            console.log('Instance participants:', instanceData);
            
            if (instanceData?.participants && instanceData.participants.length > 0) {
              setUser(instanceData.participants[0]);
              setParticipants(instanceData.participants);
              setIsHost(true);
              setIsConnected(true);
              setError(null);
              return;
            }
          } catch (participantsError) {
            console.log('Could not get participants, trying user info:', participantsError);
          }
          
          // Fallback: try to get basic user info
          const currentUser = await sdk.commands.getUser({ id: '@me' });
          console.log('Discord user:', currentUser);
          
          if (currentUser) {
            const discordUser = {
              id: currentUser.id,
              username: currentUser.username,
              discriminator: currentUser.discriminator || '0000',
              avatar: currentUser.avatar,
              global_name: currentUser.global_name || currentUser.username
            };

            setUser(discordUser);
            setParticipants([discordUser]);
            setIsHost(true);
            setIsConnected(true);
            setError(null);
          } else {
            throw new Error('No user data available from Discord SDK');
          }
          
        } catch (userError) {
          console.error('Failed to get Discord user data:', userError);
          throw userError;
        }

      } catch (err) {
        console.error('Discord SDK initialization failed:', err);
        setError(err instanceof Error ? err.message : 'Failed to connect to Discord');
        
        // Fallback to development mode on error
        setUser({
          id: 'fallback-user',
          username: 'FallbackUser',
          discriminator: '0000',
          global_name: 'Fallback User'
        });
        setParticipants([{
          id: 'fallback-user',
          username: 'FallbackUser',
          discriminator: '0000',
          global_name: 'Fallback User'
        }]);
        setIsHost(true);
        setIsConnected(true);
      }
    };

    initializeDiscord();
  }, []);

  return (
    <DiscordContext.Provider value={{
      discordSdk,
      user,
      participants,
      isHost,
      isConnected,
      error
    }}>
      {children}
    </DiscordContext.Provider>
  );
};

export const useDiscordSDK = () => {
  const context = useContext(DiscordContext);
  if (!context) {
    throw new Error('useDiscordSDK must be used within a DiscordProvider');
  }
  return context;
};