import express from 'express';
import cors from 'cors';
import { config } from './config';
import { storesRouter } from './routes/stores';
import { buildClusterIndex } from './services/cluster-service';
import { buildStateCountsCache } from './services/state-service';
import { getAllPoints, buildFilterOptionsCache } from './services/db';
import { errorHandler } from './middleware/error-handler';

const app = express();
const { port } = config;

// Middlewares
app.use(cors());
app.use(express.json());

// Routes Setup
app.use('/api/stores', storesRouter);
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Error Handler
app.use(errorHandler);

// Boot Time Scripts
console.log('Loading data...');
const allPoints = getAllPoints();
buildFilterOptionsCache();
buildStateCountsCache();
buildClusterIndex(allPoints);
console.log('Data ready.');

// Start Server, once all initialization done
const server = app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});

// Handling Server Level Errors
server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});

// Process level error handling, exit with code 1, as process can be in unknown state, let container handle restart 
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  process.exit(1);
});
