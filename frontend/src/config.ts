interface FrontendConfig {
  apiBaseUrl: string;
  googleMapsApiKey: string;
}

const envConfig = {
  development: {
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '',
  },
  production: {
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '',
  },
} satisfies Record<string, FrontendConfig>;

type Env = keyof typeof envConfig;

const env = (import.meta.env.MODE ?? 'development') as Env;

export const config: FrontendConfig = envConfig[env] ?? envConfig.development;
