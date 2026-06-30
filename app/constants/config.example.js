const config = {
  // API Configuration - Production mode
  API_URL: "https://www.biteandco.id/api/v1", // Always use production API
  
  // Google Maps API Key - Replace with your actual API key
  GOOGLE_MAPS_API_KEY: "YOUR_GOOGLE_MAPS_API_KEY_HERE",
  
  // Development Configuration
  DEV_MODE: __DEV__,
  LOG_LEVEL: __DEV__ ? 'debug' : 'error',
};

export default config;
