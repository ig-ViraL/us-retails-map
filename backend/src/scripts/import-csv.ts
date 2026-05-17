import Database from 'better-sqlite3';
import { parse } from 'csv-parse';
import fs from 'fs';
import path from 'path';
import { config } from '../config';

const { csvPath: CSV_PATH, dbPath: DB_PATH } = config;

const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(DB_PATH);

db.exec(`
  DROP TABLE IF EXISTS stores;
  CREATE TABLE stores (
    id TEXT PRIMARY KEY,
    brand_name TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    status TEXT NOT NULL,
    state TEXT NOT NULL,
    city TEXT NOT NULL
  );
  CREATE INDEX idx_lat_lng ON stores (latitude, longitude);
  CREATE INDEX idx_state ON stores (state);
  CREATE INDEX idx_brand ON stores (brand_name);
  CREATE INDEX idx_status ON stores (status);
`);

const insert = db.prepare(
  `INSERT OR IGNORE INTO stores (id, brand_name, latitude, longitude, status, state, city)
   VALUES (@id, @brand_name, @latitude, @longitude, @status, @state, @city)`
);

const insertMany = db.transaction((rows: Record<string, string>[]) => {
  for (const row of rows) {
    insert.run({
      id: row.id,
      brand_name: row.brand_name ?? '',
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude),
      status: row.status ?? '',
      state: (row.state ?? '').toLowerCase(),
      city: row.city ?? '',
    });
  }
});

const parser = parse({ columns: true, skip_empty_lines: true });
const batch: Record<string, string>[] = [];
let total = 0;

parser.on('readable', () => {
  let record;
  while ((record = parser.read()) !== null) {
    batch.push(record);
    if (batch.length >= 5000) {
      insertMany(batch.splice(0, 5000));
      total += 5000;
      process.stdout.write(`\rImported ${total} rows...`);
    }
  }
});

parser.on('end', () => {
  if (batch.length > 0) {
    insertMany(batch);
    total += batch.length;
  }
  console.log(`\nDone. Total rows: ${total}`);
  db.close();
});

parser.on('error', (err) => {
  console.error('CSV parse error:', err);
  process.exit(1);
});

fs.createReadStream(path.resolve(CSV_PATH)).pipe(parser);
