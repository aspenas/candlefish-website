import axios, { AxiosInstance } from 'axios';

interface ConfigProfileSettings {
  [key: string]: any;
}

interface ConfigProfileMetadata {
  [key: string]: any;
}

interface ConfigProfile {
  profileId?: string;
  name: string;
  version: string;
  description?: string;
  settings?: ConfigProfileSettings;
  metadata?: ConfigProfileMetadata;
}

enum ServiceTier {
  Free = 'Free',
  Pro = 'Pro',
  Enterprise = 'Enterprise'
}

class CandlefishConfigClient {
  private static BASE_URL = 'https://api.candlefish.ai/v2.0';
  private client: AxiosInstance;

  constructor(
    private apiKey: string, 
    private tier: ServiceTier = ServiceTier.Pro
  ) {
    this.client = axios.create({
      baseURL: CandlefishConfigClient.BASE_URL,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-Tier': tier
      }
    });
  }

  /**
   * List all configuration profiles
   * @returns Promise of ConfigProfile array
   */
  async listProfiles(): Promise<ConfigProfile[]> {
    try {
      const response = await this.client.get<ConfigProfile[]>('/config/profiles');
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Create a new configuration profile
   * @param profile ConfigProfile to create
   * @returns Created ConfigProfile
   */
  async createProfile(profile: ConfigProfile): Promise<ConfigProfile> {
    try {
      const response = await this.client.post<ConfigProfile>('/config/profiles', profile);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Get a specific configuration profile
   * @param profileId Unique profile identifier
   * @returns ConfigProfile
   */
  async getProfile(profileId: string): Promise<ConfigProfile> {
    try {
      const response = await this.client.get<ConfigProfile>(`/config/profiles/${profileId}`);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Update an existing configuration profile
   * @param profile ConfigProfile with updates
   * @returns Updated ConfigProfile
   */
  async updateProfile(profile: ConfigProfile): Promise<ConfigProfile> {
    if (!profile.profileId) {
      throw new Error('Profile must have a profileId for updates');
    }

    try {
      const response = await this.client.put<ConfigProfile>(
        `/config/profiles/${profile.profileId}`, 
        profile
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * WebSocket configuration event stream
   * @param onEvent Callback for handling WebSocket events
   */
  connectToConfigEvents(onEvent: (event: any) => void): WebSocket {
    const ws = new WebSocket(`wss://api.candlefish.ai/v2.0/ws/config-events`);
    
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'authenticate', token: this.apiKey }));
    };

    ws.onmessage = (event) => {
      const parsedEvent = JSON.parse(event.data);
      onEvent(parsedEvent);
    };

    ws.onerror = (error) => {
      console.error('WebSocket Error:', error);
    };

    return ws;
  }

  /**
   * Error handler for API calls
   * @param error Axios error
   */
  private handleError(error: any): never {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || 'An unexpected error occurred';
      throw new Error(`API Error: ${message}`);
    }
    throw error;
  }
}

// Example Usage
const main = async () => {
  const client = new CandlefishConfigClient('your_api_key');

  // Create a profile
  const profile = await client.createProfile({
    name: 'Enterprise DevOps Profile',
    version: '2.0.0',
    settings: {
      languages: ['typescript', 'python'],
      tools: ['pnpm', 'poetry']
    }
  });

  console.log('Created Profile:', profile);

  // Listen to configuration events
  const ws = client.connectToConfigEvents((event) => {
    console.log('Configuration Event:', event);
  });
};

main().catch(console.error);