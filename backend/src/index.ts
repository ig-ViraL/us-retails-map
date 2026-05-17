import express from 'express';
import cors from 'cors';
import { config } from './config';
import { storesRouter } from './routes/stores';
import { buildClusterIndex } from './services/clusterService';
import { buildStateCountsCache } from './services/stateService';
import { getAllPoints } from './services/db';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const { port } = config;

app.use(cors());
app.use(express.json());
app.use('/api/stores', storesRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

async function bootstrap() {
  console.log('Loading data...');
  const allPoints = getAllPoints();
  buildStateCountsCache();
  buildClusterIndex(allPoints);
  console.log('Data ready.');

  app.listen(port, () => {
    console.log(`Backend running on http://localhost:${port}`);
  });
}

bootstrap().catch((err) => {
  console.error('Startup failed:', err);
  process.exit(1);
});
