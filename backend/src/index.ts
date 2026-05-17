import express from 'express';
import cors from 'cors';
import { config } from './config';
import { storesRouter } from './routes/stores';
import { buildClusterIndex } from './services/clusterService';
import { buildStateCountsCache } from './services/stateService';
import { getAllPoints, buildFilterOptionsCache } from './services/db';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const { port } = config;

app.use(cors());
app.use(express.json());
app.use('/api/stores', storesRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

console.log('Loading data...');
const allPoints = getAllPoints();
buildFilterOptionsCache();
buildStateCountsCache();
buildClusterIndex(allPoints);
console.log('Data ready.');

const server = app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  process.exit(1);
});
