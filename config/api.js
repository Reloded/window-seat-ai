// API Configuration
// Replace these with your actual API keys before use
// IMPORTANT: Never commit real API keys to version control

export const API_CONFIG = {
  claude: {
    apiKey: process.env.EXPO_PUBLIC_CLAUDE_API_KEY || 'YOUR_CLAUDE_API_KEY',
    model: 'claude-sonnet-4-20250514',
    maxTokens: 500,
  },
  elevenLabs: {
    apiKey: process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY || 'YOUR_ELEVENLABS_API_KEY',
    voiceId: 'EXAVITQu4vr4xnSDxMaL', // Default: Sarah
  },
  flightData: {
    // AeroAPI (FlightAware) - https://flightaware.com/aeroapi/
    // Sign up for API access at https://flightaware.com/commercial/aeroapi/
    apiKey: process.env.EXPO_PUBLIC_FLIGHT_API_KEY || 'YOUR_FLIGHT_API_KEY',
    provider: 'aeroapi', // Currently only aeroapi is supported
  },
};

export function isApiKeyConfigured(service) {
  const key = API_CONFIG[service]?.apiKey;
  return key && !key.startsWith('YOUR_');
}
