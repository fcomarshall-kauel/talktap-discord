import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { DiscordSDK } from '@discord/embedded-app-sdk';

// Extended Discord SDK type with instanceId for multiplayer compatibility
type ExtendedDiscordSDK = DiscordSDK & {
  instanceId?: string | null;
};

// Use official Discord SDK types
interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string | null;
  global_name?: string | null;
  bot: boolean;
  flags?: number | null;
  premium_type?: number | null;
}

interface DiscordContextType {
  discordSdk: ExtendedDiscordSDK | null;
  user: DiscordUser | null;
  participants: DiscordUser[];
  isHost: boolean;
  isConnected: boolean;
  error: string | null;
  accessToken: string | null;
  authenticated: boolean;
  status: string;
  // Add additional context for Discord-specific features
  channelId: string | null;
  guildId: string | null;
  locale: string | null;
  instanceId: string | null; // Add instance ID for multiplayer sync
}

const DiscordContext = createContext<DiscordContextType | undefined>(undefined);

export const DiscordProvider = ({ children }: { children: ReactNode }) => {
  const [discordSdk, setDiscordSdk] = useState<ExtendedDiscordSDK | null>(null);
  const [user, setUser] = useState<DiscordUser | null>(null);
  const [participants, setParticipants] = useState<DiscordUser[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [status, setStatus] = useState<string>('initializing');
  const [channelId, setChannelId] = useState<string | null>(null);
  const [guildId, setGuildId] = useState<string | null>(null);
  const [locale, setLocale] = useState<string | null>(null);
  const [instanceId, setInstanceId] = useState<string | null>(null);

  // Helper function to fetch connected participants
  const fetchConnectedParticipants = async (sdk: DiscordSDK, currentUser: DiscordUser) => {
    try {
      console.log('Fetching connected participants...');
      const instanceData = await sdk.commands.getInstanceConnectedParticipants();
      console.log('Instance participants:', instanceData);
      
      if (instanceData && instanceData.participants && instanceData.participants.length > 0) {
        const participantsList: DiscordUser[] = instanceData.participants.map((participant) => ({
          id: participant.id,
          username: participant.username,
          discriminator: participant.discriminator || '0000',
          avatar: participant.avatar,
          global_name: participant.global_name,
          bot: participant.bot,
          flags: participant.flags,
          premium_type: participant.premium_type
        }));

        setParticipants(participantsList);
        console.log('Participants updated:', participantsList);
      } else {
        // If no other participants, just set current user
        setParticipants([currentUser]);
        console.log('No other participants, setting current user only');
      }
    } catch (participantError) {
      console.log('Could not get participants:', participantError);
      // Fallback to just current user
      setParticipants([currentUser]);
    }
  };

  // Helper function to set up event listeners
  const setupEventListeners = (sdk: DiscordSDK) => {
    try {
      console.log('Setting up SDK event listeners...');
      
      // Only set up event listeners after authentication
      if (!authenticated) {
        console.log('Skipping event listeners setup - not authenticated yet');
        return;
      }
      
      // Listen for participant updates
      sdk.subscribe('ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE', (data) => {
        console.log('Participants updated:', data);
        if (data.participants) {
          const participantsList: DiscordUser[] = data.participants.map((participant) => ({
            id: participant.id,
            username: participant.username,
            discriminator: participant.discriminator || '0000',
            avatar: participant.avatar,
            global_name: participant.global_name,
            bot: participant.bot,
            flags: participant.flags,
            premium_type: participant.premium_type
          }));
          setParticipants(participantsList);
        }
      });

      // Listen for current user updates
      sdk.subscribe('CURRENT_USER_UPDATE', (data) => {
        console.log('Current user updated:', data);
        const updatedUser: DiscordUser = {
          id: data.id,
          username: data.username,
          discriminator: data.discriminator || '0000',
          avatar: data.avatar,
          global_name: data.global_name,
          bot: data.bot,
          flags: data.flags,
          premium_type: data.premium_type
        };
        setUser(updatedUser);
      });

      // Note: ERROR event is not available for subscription in the current SDK
      // Error handling is done through try-catch blocks instead
      
    } catch (eventError) {
      console.log('Could not set up event listeners:', eventError);
    }
  };

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
          const devUser: DiscordUser = {
            id: 'dev-user-1',
            username: 'DevUser',
            discriminator: '0000',
            global_name: 'Development User',
            bot: false
          };
          
          const testUser: DiscordUser = {
            id: 'dev-user-2',
            username: 'TestUser',
            discriminator: '0001',
            global_name: 'Test User',
            bot: false
          };

          setUser(devUser);
          setParticipants([devUser, testUser]);
          setIsHost(true);
          setIsConnected(true);
          setAuthenticated(true);
          setStatus('authenticated');
          setChannelId('dev-channel-1');
          setGuildId('dev-guild-1');
          setInstanceId('dev-instance-1');
          setLocale('en-US');
          setError(null);
          return;
        }

        // Initialize Discord SDK
        console.log('Running in Discord iframe, initializing SDK...');
        const CLIENT_ID = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || '1401020371154636841';
        const sdk = new DiscordSDK(CLIENT_ID);
        
        console.log('Waiting for SDK ready...');
        await sdk.ready();
        console.log('SDK ready!');
        // Create a custom SDK wrapper that includes instanceId for multiplayer compatibility
        const wrappedSdk = sdk as ExtendedDiscordSDK;
        wrappedSdk.instanceId = sdk.channelId || null; // Add instanceId property using channelId
        
        setDiscordSdk(wrappedSdk);
        setIsConnected(true);
        setStatus('ready');

        // Don't set up event listeners yet - wait for authentication

        // Get Discord context information
        if (sdk.channelId) {
          setChannelId(sdk.channelId);
          // Use channelId as the instance ID for multiplayer sync
          setInstanceId(sdk.channelId);
        }
        if (sdk.guildId) {
          setGuildId(sdk.guildId);
        }

        // Try to get user locale
        try {
          const localeData = await sdk.commands.userSettingsGetLocale();
          setLocale(localeData.locale);
        } catch (localeError) {
          console.log('Could not get user locale:', localeError);
        }

        // Proceed with authorization to get user data
        console.log('Starting authorization flow...');
        setStatus('authenticating');
        
        try {
          // For Discord embedded apps, we need to use the authenticate command directly
          // The authorization code flow is handled internally by Discord
          console.log('Starting Discord authentication...');
          setStatus('authenticating');
          
          // Try to authenticate directly without authorization code flow
          try {
            const auth = await sdk.commands.authenticate({
              access_token: null, // Let Discord handle the token internally
            });
            
            console.log('Direct authentication result:', auth);
            
            if (auth && auth.user) {
              console.log('Using user data from direct auth:', auth.user);
              const currentUser = auth.user;
              
              const discordUser: DiscordUser = {
                id: currentUser.id,
                username: currentUser.username,
                discriminator: currentUser.discriminator || '0000',
                avatar: currentUser.avatar,
                global_name: currentUser.global_name,
                bot: false,
                flags: currentUser.public_flags || 0,
                premium_type: 0
              };

              setUser(discordUser);
              setIsHost(true);
              setAuthenticated(true);
              setStatus('authenticated');
              setError(null);
              console.log('User set successfully from direct auth:', discordUser);
              
              // Now that we're authenticated, set up event listeners
              setupEventListeners(sdk);
              
              // Now that we're authenticated, get all connected participants
              await fetchConnectedParticipants(sdk, discordUser);
              
              return; // Success!
            }
          } catch (directAuthError) {
            console.log('Direct authentication failed, trying authorization code flow:', directAuthError);
          }
          
          // Fallback to authorization code flow if direct auth fails
          console.log('Trying authorization code flow...');
          const authResult = await sdk.commands.authorize({
            client_id: CLIENT_ID,
            response_type: 'code',
            state: '',
            prompt: 'none',
            scope: [
              'identify',
              'guilds',
              'rpc.activities.write',
              'rpc.voice.read'
            ]
          });
          
          console.log('Authorization result:', authResult);
          setStatus('authorized');
          
          // Exchange the authorization code for access_token
          console.log('=== EXCHANGING CODE FOR ACCESS TOKEN ===');
          try {
            const response = await fetch("/api/token", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                code: authResult.code
              }),
            });
            
            console.log('Token exchange response status:', response.status);
            if (response.ok) {
              const { access_token } = await response.json();
              console.log('=== TOKEN EXCHANGE SUCCESS ===');
              setAccessToken(access_token);
              
              // Authenticate with Discord client using the real access token
              const auth = await sdk.commands.authenticate({
                access_token,
              });
              console.log('Discord authentication result:', auth);
              
              if (auth && auth.user) {
                // Use the user data from the auth result directly
                console.log('Using user data from auth result:', auth.user);
                const currentUser = auth.user;
                
                const discordUser: DiscordUser = {
                  id: currentUser.id,
                  username: currentUser.username,
                  discriminator: currentUser.discriminator || '0000',
                  avatar: currentUser.avatar,
                  global_name: currentUser.global_name,
                  bot: false, // Default value since not provided in auth response
                  flags: currentUser.public_flags || 0, // Use public_flags if available
                  premium_type: 0 // Default value since not provided in auth response
                };

                setUser(discordUser);
                setIsHost(true);
                setAuthenticated(true);
                setStatus('authenticated');
                setError(null);
                console.log('User set successfully from auth result:', discordUser);
                
                // Now that we're authenticated, set up event listeners
                setupEventListeners(sdk);
                
                // Now that we're authenticated, get all connected participants
                await fetchConnectedParticipants(sdk, discordUser);
                
                return; // Success!
              }
            } else {
              console.error('=== TOKEN EXCHANGE FAILED ===');
              console.error('Token exchange failed with status:', response.status);
              const errorText = await response.text();
              console.error('Error details:', errorText);
            }
          } catch (tokenExchangeError) {
            console.log('Token exchange failed:', tokenExchangeError);
          }
          
          // If direct authentication failed, set fallback user
          console.log('Setting fallback authenticated user...');
          const fallbackUser: DiscordUser = {
            id: 'auth-user',
            username: 'AuthenticatedUser',
            discriminator: '0000',
            global_name: 'Authenticated User',
            bot: false
          };
          setUser(fallbackUser);
          setParticipants([fallbackUser]);
          setIsHost(true);
          setAuthenticated(true);
          setStatus('authenticated');
          setError(null);
          console.log('Fallback user set:', fallbackUser);
        } catch (authError) {
          console.error('Authorization failed:', authError);
          setStatus('error');
          setError(authError instanceof Error ? authError.message : 'Authentication failed');
        }

      } catch (err) {
        console.error('Discord SDK initialization failed:', err);
        setError(err instanceof Error ? err.message : 'Failed to connect to Discord');
        setStatus('error');
        
        // Fallback to development mode on error
        const fallbackUser: DiscordUser = {
          id: 'fallback-user',
          username: 'FallbackUser',
          discriminator: '0000',
          global_name: 'Fallback User',
          bot: false
        };
        
        setUser(fallbackUser);
        setParticipants([fallbackUser]);
        setIsHost(true);
        setIsConnected(true);
        setAuthenticated(true);
        setStatus('authenticated');
        setChannelId('fallback-channel');
        setGuildId('fallback-guild');
        setInstanceId('fallback-instance');
        setLocale('en-US');
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
      error,
      accessToken,
      authenticated,
      status,
      channelId,
      guildId,
      locale,
      instanceId
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