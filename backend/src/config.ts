import dotenv from 'dotenv';
dotenv.config();

interface BackendConfig {
  port: number;
  dbPath: string;
  csvPath: string;
}

const envConfig = {
  development: {
    port: parseInt(process.env.PORT ?? '3001', 10),
    dbPath: process.env.DB_PATH ?? './data/stores.db',
    csvPath: process.env.CSV_PATH ?? '../my_pois.csv',
  },
  production: {
    port: parseInt(process.env.PORT ?? '3001', 10),
    dbPath: process.env.DB_PATH ?? './data/stores.db',
    csvPath: process.env.CSV_PATH ?? '../my_pois.csv',
  },
  test: {
    port: 3002,
    dbPath: ':memory:',
    csvPath: '../my_pois.csv',
  },
} satisfies Record<string, BackendConfig>;

type Env = keyof typeof envConfig;

const env = (process.env.NODE_ENV ?? 'development') as Env;

export const config: BackendConfig = envConfig[env] ?? envConfig.development;
