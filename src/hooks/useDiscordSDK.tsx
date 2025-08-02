import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { DiscordSDK } from '@discord/embedded-app-sdk';

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
  accessToken: string | null;
  authenticated: boolean;
  status: string;
}

const DiscordContext = createContext<DiscordContextType | undefined>(undefined);

export const DiscordProvider = ({ children }: { children: ReactNode }) => {
  const [discordSdk, setDiscordSdk] = useState<DiscordSDK | null>(null);
  const [user, setUser] = useState<DiscordUser | null>(null);
  const [participants, setParticipants] = useState<DiscordUser[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [status, setStatus] = useState<string>('initializing');

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
          setAuthenticated(true);
          setStatus('authenticated');
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
        setStatus('ready');

        // Try to get user data directly (Discord SDK might handle auth automatically)
        console.log('Getting Discord user data...');
        try {
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

            console.log('=== SETTING USER ===');
            setUser(discordUser);
            setParticipants([discordUser]);
            setIsHost(true);
            setIsConnected(true);
            setAuthenticated(true);
            setStatus('authenticated');
            setError(null);
            console.log('User set successfully:', discordUser);
            return;
          }
        } catch (userError) {
          console.log('Could not get user data directly:', userError);
        }

        // Try to get connected participants
        try {
          const instanceData = await sdk.commands.getInstanceConnectedParticipants();
          console.log('Instance participants:', instanceData);
          
          if (instanceData && instanceData.participants && instanceData.participants.length > 0) {
            const participantsList = instanceData.participants.map((participant: any) => ({
              id: participant.id,
              username: participant.username,
              discriminator: participant.discriminator || '0000',
              avatar: participant.avatar,
              global_name: participant.global_name || participant.username
            }));

            setParticipants(participantsList);
            setIsConnected(true);
            setStatus('connected');
            console.log('Participants set successfully:', participantsList);
          }
        } catch (participantError) {
          console.log('Could not get participants:', participantError);
        }

        // If we still don't have user data, try authorization
        if (!user) {
          console.log('No user data available, trying authorization...');
          setStatus('authenticating');
          
          try {
            const authResult = await sdk.commands.authorize({
              client_id: CLIENT_ID,
              response_type: 'code',
              state: '',
              prompt: 'none',
              scope: ['identify']
            });
            
            console.log('Authorization result:', authResult);
            setStatus('authorized');
            
            // Try to get user data directly after authorization (without token exchange)
            console.log('=== TRYING DIRECT USER DATA AFTER AUTHORIZATION ===');
            const currentUser = await sdk.commands.getUser({ id: '@me' });
            console.log('User data after authorization:', currentUser);
            
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
              setAuthenticated(true);
              setStatus('authenticated');
              setError(null);
              console.log('User set successfully:', discordUser);
            } else {
              console.log('No user data available after authorization, trying fallback...');
              // Set a fallback user for now
              const fallbackUser = {
                id: 'auth-user',
                username: 'AuthenticatedUser',
                discriminator: '0000',
                global_name: 'Authenticated User'
              };
              setUser(fallbackUser);
              setParticipants([fallbackUser]);
              setIsHost(true);
              setIsConnected(true);
              setAuthenticated(true);
              setStatus('authenticated');
              setError(null);
              console.log('Fallback user set:', fallbackUser);
            }
          } catch (authError) {
            console.error('Authorization failed:', authError);
            setStatus('error');
            setError(authError instanceof Error ? authError.message : 'Authentication failed');
          }
        }

      } catch (err) {
        console.error('Discord SDK initialization failed:', err);
        setError(err instanceof Error ? err.message : 'Failed to connect to Discord');
        setStatus('error');
        
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
        setAuthenticated(true);
        setStatus('authenticated');
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
      status
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